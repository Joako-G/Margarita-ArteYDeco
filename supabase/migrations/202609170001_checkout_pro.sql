-- Checkout Pro foundation. Provider HTTP is intentionally outside PostgreSQL.

alter type public.payment_method add value if not exists 'mercado_pago';

begin;

create type public.payment_attempt_status as enum (
  'pending',
  'approved',
  'rejected',
  'expired',
  'cancelled',
  'manual_review'
);

create type public.payment_inbox_status as enum (
  'received',
  'queued',
  'processed',
  'quarantined'
);

create type public.payment_outbox_operation as enum (
  'create_order',
  'reconcile_order',
  'cancel_order'
);

create type public.payment_work_status as enum (
  'pending',
  'leased',
  'succeeded',
  'dead_letter',
  'manual_review'
);

alter table public.orders
  add column reservation_expires_at timestamptz,
  add constraint orders_reservation_expiry_after_creation check (
    reservation_expires_at is null or reservation_expires_at > created_at
  );

create table public.payment_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null default 'mercado_pago',
  environment text not null,
  external_reference text not null,
  provider_order_id text,
  operation_key text not null,
  status public.payment_attempt_status not null default 'pending',
  amount numeric(12, 2) not null,
  currency text not null default 'ARS',
  reservation_expires_at timestamptz not null,
  provider_status text,
  provider_version bigint,
  provider_updated_at timestamptz,
  last_error text,
  retention_until timestamptz not null default (now() + interval '13 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_attempts_provider_check check (provider = 'mercado_pago'),
  constraint payment_attempts_environment_check check (environment in ('sandbox', 'production')),
  constraint payment_attempts_external_reference_check check (btrim(external_reference) <> ''),
  constraint payment_attempts_operation_key_check check (btrim(operation_key) <> ''),
  constraint payment_attempts_amount_positive check (amount > 0),
  constraint payment_attempts_currency_check check (currency = 'ARS'),
  constraint payment_attempts_expiry_after_creation check (reservation_expires_at > created_at),
  constraint payment_attempts_operation_key_unique unique (operation_key),
  constraint payment_attempts_external_reference_not_blank check (btrim(external_reference) <> '')
);

create index payment_attempts_order_status_idx
  on public.payment_attempts (order_id, status, created_at desc);

create table public.payment_inbox (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null default 'mercado_pago',
  environment text not null,
  resource_type text not null,
  resource_id text not null,
  request_id text not null,
  signature_digest bytea not null,
  received_at timestamptz not null default now(),
  status public.payment_inbox_status not null default 'received',
  processed_at timestamptz,
  retention_until timestamptz not null default (now() + interval '13 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_inbox_provider_check check (provider = 'mercado_pago'),
  constraint payment_inbox_environment_check check (environment in ('sandbox', 'production')),
  constraint payment_inbox_identity_check check (btrim(resource_type) <> '' and btrim(resource_id) <> ''),
  constraint payment_inbox_request_id_check check (btrim(request_id) <> ''),
  constraint payment_inbox_digest_length check (octet_length(signature_digest) = 32),
  constraint payment_inbox_delivery_unique unique (provider, environment, request_id, resource_id)
);

create index payment_inbox_processing_idx
  on public.payment_inbox (status, received_at);

create table public.payment_outbox (
  id uuid primary key default extensions.gen_random_uuid(),
  attempt_id uuid not null references public.payment_attempts (id) on delete restrict,
  operation public.payment_outbox_operation not null,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.payment_work_status not null default 'pending',
  available_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  retention_until timestamptz not null default (now() + interval '13 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_outbox_key_check check (btrim(idempotency_key) <> ''),
  constraint payment_outbox_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint payment_outbox_attempts_nonnegative check (attempts >= 0),
  constraint payment_outbox_operation_unique unique (attempt_id, operation),
  constraint payment_outbox_key_unique unique (idempotency_key)
);

create index payment_outbox_claim_idx
  on public.payment_outbox (status, available_at, lease_expires_at);

create table public.payment_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  attempt_id uuid references public.payment_attempts (id) on delete restrict,
  inbox_id uuid references public.payment_inbox (id) on delete restrict,
  operation public.payment_outbox_operation not null,
  status public.payment_work_status not null default 'pending',
  run_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  lease_owner text,
  attempts integer not null default 0,
  last_error text,
  retention_until timestamptz not null default (now() + interval '13 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_jobs_source_check check (attempt_id is not null or inbox_id is not null),
  constraint payment_jobs_attempts_nonnegative check (attempts >= 0)
);

create index payment_jobs_claim_idx
  on public.payment_jobs (status, run_at, lease_expires_at);

create unique index payment_jobs_inbox_operation_unique
  on public.payment_jobs (inbox_id, operation)
  where inbox_id is not null;

create trigger payment_attempts_set_updated_at
before update on public.payment_attempts
for each row execute function public.set_updated_at();

create trigger payment_inbox_set_updated_at
before update on public.payment_inbox
for each row execute function public.set_updated_at();

create trigger payment_outbox_set_updated_at
before update on public.payment_outbox
for each row execute function public.set_updated_at();

create trigger payment_jobs_set_updated_at
before update on public.payment_jobs
for each row execute function public.set_updated_at();

create or replace function public.acknowledge_payment_webhook_v2(
  p_environment text,
  p_request_id text,
  p_resource_id text,
  p_resource_type text,
  p_signature_digest bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inbox_id uuid;
begin
  if p_environment not in ('sandbox', 'production')
    or nullif(btrim(p_request_id), '') is null
    or nullif(btrim(p_resource_id), '') is null
    or nullif(btrim(p_resource_type), '') is null
    or octet_length(p_signature_digest) <> 32 then
    raise exception using errcode = '22023', message = 'Payment webhook data is invalid';
  end if;

  insert into public.payment_inbox (
    environment, request_id, resource_id, resource_type, signature_digest
  ) values (
    p_environment, p_request_id, p_resource_id, p_resource_type, p_signature_digest
  )
  on conflict (provider, environment, request_id, resource_id) do nothing
  returning id into v_inbox_id;

  if v_inbox_id is null then
    return true;
  end if;

  insert into public.payment_jobs (inbox_id, operation)
  values (v_inbox_id, 'reconcile_order');
  return false;
end;
$$;

alter table public.payment_attempts enable row level security;
alter table public.payment_inbox enable row level security;
alter table public.payment_outbox enable row level security;
alter table public.payment_jobs enable row level security;

revoke all on public.payment_attempts, public.payment_inbox,
  public.payment_outbox, public.payment_jobs
  from public, anon, authenticated;

revoke all on public.payment_attempts, public.payment_inbox,
  public.payment_outbox, public.payment_jobs
  from service_role;

grant select on public.payment_attempts, public.payment_inbox,
  public.payment_outbox, public.payment_jobs to service_role;

create or replace function public.create_order_with_payment_v2(
  p_guest_session_id uuid,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_phone text,
  p_customer_phone_normalized text,
  p_items jsonb,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_environment text,
  p_delivery_method public.delivery_method,
  p_shipping_address text default null,
  p_notes text default null
)
returns table (order_id uuid, attempt_id uuid, reservation_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_attempt_id uuid;
  v_expires_at timestamptz;
  v_order_number text;
  v_existing_fingerprint text;
begin
  if p_environment not in ('sandbox', 'production')
    or p_idempotency_key !~ '^[A-Za-z0-9._:-]{16,128}$'
    or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Payment initialization data is invalid';
  end if;

  select k.order_id, k.request_fingerprint
  into v_order_id, v_existing_fingerprint
  from public.order_idempotency_keys as k
  where k.guest_session_id = p_guest_session_id
    and k.idempotency_key_hash = extensions.digest(pg_catalog.convert_to(p_idempotency_key, 'utf8'), 'sha256')
  for update;

  if v_order_id is not null then
    if v_existing_fingerprint <> p_request_fingerprint then
      raise exception using errcode = '23505', message = 'Idempotency key was already used with another request';
    end if;
    select pa.id, pa.reservation_expires_at
    into v_attempt_id, v_expires_at
    from public.payment_attempts as pa
    where pa.order_id = v_order_id
    order by pa.created_at
    limit 1;
    return query select v_order_id, v_attempt_id, v_expires_at;
    return;
  end if;

  select o.order_id, o.order_number
  into v_order_id, v_order_number
  from public.create_order_with_stock(
    p_guest_session_id, p_customer_first_name, p_customer_last_name,
    p_customer_phone, p_customer_phone_normalized, 'mercado_pago', p_items,
    p_idempotency_key, p_request_fingerprint, p_delivery_method,
    p_shipping_address, p_notes
  ) as o;

  v_expires_at := statement_timestamp() + interval '40 minutes';
  update public.orders
  set reservation_expires_at = v_expires_at
  where id = v_order_id;

  insert into public.payment_attempts (
    order_id, environment, external_reference, operation_key,
    amount, reservation_expires_at
  )
  select v_order_id, p_environment, o.order_number, p_idempotency_key,
    o.total, v_expires_at
  from public.orders as o
  where o.id = v_order_id
  returning id into v_attempt_id;

  insert into public.payment_outbox (
    attempt_id, operation, idempotency_key, payload
  ) values (
    v_attempt_id, 'create_order', p_idempotency_key,
    jsonb_build_object('attempt_id', v_attempt_id, 'external_reference', v_order_number)
  );

  return query select v_order_id, v_attempt_id, v_expires_at;
end;
$$;

create or replace function public.create_payment_attempt_v2(
  p_order_id uuid,
  p_operation_key text,
  p_environment text default 'production'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid;
  v_order public.orders%rowtype;
begin
  if p_environment not in ('sandbox', 'production')
    or p_operation_key !~ '^[A-Za-z0-9._:-]{16,128}$' then
    raise exception using errcode = '22023', message = 'Payment attempt data is invalid';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.payment_method <> 'mercado_pago'
    or v_order.reservation_expires_at is null
    or v_order.reservation_expires_at <= statement_timestamp()
    or v_order.status = 'cancelled' then
    raise exception using errcode = '22023', message = 'Payment reservation is not active';
  end if;

  insert into public.payment_attempts (
    order_id, environment, external_reference, operation_key,
    amount, reservation_expires_at
  ) values (
    p_order_id, p_environment, v_order.order_number, p_operation_key,
    v_order.total, v_order.reservation_expires_at
  ) returning id into v_attempt_id;

  insert into public.payment_outbox (attempt_id, operation, idempotency_key, payload)
  values (v_attempt_id, 'create_order', p_operation_key,
    jsonb_build_object('attempt_id', v_attempt_id, 'external_reference', v_order.order_number));
  return v_attempt_id;
end;
$$;

create or replace function public.release_payment_reservation_v2(
  p_order_id uuid,
  p_provider_state text,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if p_provider_state not in ('cancelled', 'rejected', 'expired')
    or nullif(btrim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'A terminal non-chargeable provider result is required';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.reservation_expires_at is null then
    return false;
  end if;
  if v_order.status = 'cancelled' then
    return false;
  end if;

  for v_item in
    select oi.product_id, oi.quantity, p.stock_quantity
    from public.order_items as oi
    join public.products as p on p.id = oi.product_id
    where oi.order_id = p_order_id
    order by oi.product_id
    for update of p
  loop
    insert into public.inventory_movements (
      product_id, order_id, movement_type, quantity_delta,
      stock_before, stock_after, reason
    ) values (
      v_item.product_id, p_order_id, 'order_cancelled', v_item.quantity,
      v_item.stock_quantity, v_item.stock_quantity + v_item.quantity, btrim(p_reason)
    );
    update public.products set stock_quantity = stock_quantity + v_item.quantity
    where id = v_item.product_id;
  end loop;

  update public.orders set status = 'cancelled', reservation_expires_at = null,
    picked_up_at = null where id = p_order_id;
  update public.payment_attempts set status = 'expired'
  where order_id = p_order_id and status in ('pending', 'rejected');
  return true;
end;
$$;

create or replace function public.claim_payment_job_v2(
  p_lease interval default interval '5 minutes',
  p_worker_id text default 'legacy-worker'
)
returns table (job_id uuid, attempt_id uuid, inbox_id uuid, operation public.payment_outbox_operation, attempts integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lease <= interval '0 seconds' or nullif(btrim(p_worker_id), '') is null then
    raise exception using errcode = '22023', message = 'Lease must be positive';
  end if;

  return query
  update public.payment_jobs as job
   set status = 'leased', lease_expires_at = statement_timestamp() + p_lease,
       lease_owner = p_worker_id,
      attempts = job.attempts + 1
  where job.id = (
    select candidate.id
    from public.payment_jobs as candidate
    where candidate.status in ('pending', 'leased')
      and candidate.run_at <= statement_timestamp()
      and (candidate.lease_expires_at is null or candidate.lease_expires_at <= statement_timestamp())
    order by candidate.run_at, candidate.created_at
    for update skip locked
    limit 1
  )
   returning job.id, job.attempt_id, job.inbox_id, job.operation, job.attempts;
end;
$$;

create or replace function public.complete_payment_job_v2(
  p_job_id uuid,
  p_worker_id text,
  p_status public.payment_work_status,
  p_run_at timestamptz default null,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('pending', 'succeeded', 'dead_letter', 'manual_review')
    or nullif(btrim(p_worker_id), '') is null then
    raise exception using errcode = '22023', message = 'Payment job completion data is invalid';
  end if;

  update public.payment_jobs
  set status = p_status,
      run_at = coalesce(p_run_at, run_at),
      lease_expires_at = null,
      lease_owner = null,
      last_error = nullif(left(coalesce(p_error, ''), 500), '')
  where id = p_job_id
    and status = 'leased'
    and lease_owner = p_worker_id
    and lease_expires_at > statement_timestamp();
  return found;
end;
$$;

revoke execute on function public.create_order_with_payment_v2(
  uuid, text, text, text, text, jsonb, text, text, text,
  public.delivery_method, text, text
) from public, anon, authenticated;
grant execute on function public.create_order_with_payment_v2(
  uuid, text, text, text, text, jsonb, text, text, text,
  public.delivery_method, text, text
) to service_role;

revoke execute on function public.create_payment_attempt_v2(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.create_payment_attempt_v2(uuid, text, text)
  to service_role;

revoke execute on function public.release_payment_reservation_v2(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.release_payment_reservation_v2(uuid, text, text)
  to service_role;

revoke execute on function public.claim_payment_job_v2(interval, text)
  from public, anon, authenticated;
grant execute on function public.claim_payment_job_v2(interval, text)
  to service_role;

revoke execute on function public.acknowledge_payment_webhook_v2(text, text, text, text, bytea)
  from public, anon, authenticated;
grant execute on function public.acknowledge_payment_webhook_v2(text, text, text, text, bytea)
  to service_role;

revoke execute on function public.complete_payment_job_v2(uuid, text, public.payment_work_status, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.complete_payment_job_v2(uuid, text, public.payment_work_status, timestamptz, text)
  to service_role;

commit;
