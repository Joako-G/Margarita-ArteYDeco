create type public.consumer_withdrawal_request_status as enum (
  'received',
  'verification_pending',
  'under_review',
  'applicable',
  'not_applicable',
  'closed'
);

create type public.consumer_withdrawal_return_status as enum (
  'not_required',
  'pending',
  'received',
  'inspected'
);

create type public.consumer_withdrawal_refund_status as enum (
  'not_required',
  'pending',
  'processing',
  'succeeded',
  'failed',
  'manual_review'
);

create type public.consumer_withdrawal_source as enum (
  'web',
  'admin_whatsapp_contingency'
);

create type public.consumer_withdrawal_legal_time_status as enum (
  'unknown',
  'apparently_in_time',
  'review_required'
);

create type public.consumer_withdrawal_legal_time_basis as enum (
  'contract_concluded_at',
  'picked_up_at',
  'delivered_at',
  'right_not_properly_informed',
  'manual_review'
);

create type public.consumer_withdrawal_settlement_method as enum (
  'cash',
  'bank_transfer'
);

create type public.consumer_withdrawal_settlement_status as enum (
  'pending',
  'completed'
);

create type public.consumer_withdrawal_limit_scope as enum (
  'ip',
  'contact'
);

alter table public.orders
  add column contract_concluded_at timestamptz,
  add column withdrawal_right_informed_at timestamptz,
  add column withdrawal_right_notice_version text,
  add column delivered_at timestamptz;

create function public.set_order_consumer_right_evidence()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.withdrawal_right_informed_at := coalesce(new.withdrawal_right_informed_at, now());
    new.withdrawal_right_notice_version := coalesce(
      nullif(btrim(new.withdrawal_right_notice_version), ''),
      'consumer-withdrawal-2026-08-19-v1'
    );
  elsif tg_op = 'UPDATE' then
    if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
      new.contract_concluded_at := coalesce(new.contract_concluded_at, now());
    end if;

    if new.status = 'delivered' and old.status is distinct from 'delivered' then
      new.delivered_at := coalesce(new.delivered_at, now());
    end if;
  end if;

  return new;
end;
$$;

create trigger set_order_consumer_right_evidence_on_insert
before insert on public.orders
for each row execute function public.set_order_consumer_right_evidence();

create trigger set_order_consumer_right_evidence_on_update
before update of status on public.orders
for each row execute function public.set_order_consumer_right_evidence();

create table public.consumer_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  public_code_hash bytea not null unique check (octet_length(public_code_hash) = 32),
  public_code_suffix text not null check (char_length(public_code_suffix) between 4 and 8),
  public_code_key_version smallint not null check (public_code_key_version > 0),
  order_id uuid references public.orders(id) on delete restrict,
  order_reference_input text,
  order_reference_unavailable boolean not null,
  contact_phone_normalized text not null check (char_length(contact_phone_normalized) between 8 and 20),
  contact_fingerprint bytea not null check (octet_length(contact_fingerprint) = 32),
  request_status public.consumer_withdrawal_request_status not null default 'received',
  return_status public.consumer_withdrawal_return_status not null default 'not_required',
  refund_status public.consumer_withdrawal_refund_status not null default 'not_required',
  version bigint not null default 1 check (version > 0),
  customer_comment text check (customer_comment is null or char_length(customer_comment) <= 1000),
  resolution_reason text check (resolution_reason is null or char_length(resolution_reason) <= 2000),
  public_resolution_explanation text check (
    public_resolution_explanation is null
    or char_length(public_resolution_explanation) between 10 and 1000
  ),
  source public.consumer_withdrawal_source not null,
  submitted_at timestamptz not null default now(),
  acknowledgement_issued_at timestamptz not null default now(),
  acknowledgement_due_at timestamptz not null default (now() + interval '24 hours'),
  owner_notified_at timestamptz,
  legal_time_status public.consumer_withdrawal_legal_time_status not null default 'unknown',
  legal_time_basis public.consumer_withdrawal_legal_time_basis,
  legal_deadline_at timestamptz,
  contract_concluded_at_snapshot timestamptz,
  right_informed_at_snapshot timestamptz,
  right_notice_version_snapshot text,
  deadline_reviewed_at timestamptz,
  return_received_at timestamptz,
  inspection_due_at timestamptz,
  inspected_at timestamptz,
  first_review_due_at timestamptz not null default (now() + interval '1 day'),
  first_reviewed_at timestamptz,
  applicable_at timestamptz,
  not_applicable_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consumer_withdrawal_order_reference_xor check (
    (order_reference_unavailable and order_reference_input is null)
    or (
      not order_reference_unavailable
      and nullif(btrim(order_reference_input), '') is not null
    )
  ),
  constraint consumer_withdrawal_acknowledgement_dates check (
    acknowledgement_issued_at >= submitted_at
  ),
  constraint consumer_withdrawal_resolution_explanation check (
    request_status <> 'not_applicable'
    or public_resolution_explanation is not null
  )
);

create table public.consumer_withdrawal_events (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null references public.consumer_withdrawal_requests(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete restrict,
  event_type text not null check (char_length(event_type) between 3 and 80),
  previous_status public.consumer_withdrawal_request_status,
  next_status public.consumer_withdrawal_request_status,
  reason text check (reason is null or char_length(reason) <= 2000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.consumer_withdrawal_settlements (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null unique references public.consumer_withdrawal_requests(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  currency text not null default 'ARS' check (currency = 'ARS'),
  order_total_snapshot numeric(12, 2) not null check (order_total_snapshot >= 0),
  captured_amount_snapshot numeric(12, 2) not null check (captured_amount_snapshot >= 0),
  contract_refund_amount numeric(12, 2) not null check (contract_refund_amount >= 0),
  original_shipping_refund_amount numeric(12, 2) not null default 0 check (original_shipping_refund_amount >= 0),
  return_shipping_refund_amount numeric(12, 2) not null default 0 check (return_shipping_refund_amount >= 0),
  total_refund_amount numeric(12, 2) generated always as (
    contract_refund_amount + original_shipping_refund_amount + return_shipping_refund_amount
  ) stored,
  method public.consumer_withdrawal_settlement_method not null,
  status public.consumer_withdrawal_settlement_status not null default 'pending',
  reference text check (reference is null or char_length(reference) <= 120),
  notes text check (notes is null or char_length(notes) <= 1000),
  completed_by_profile_id uuid references public.profiles(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consumer_withdrawal_settlement_completion check (
    (status = 'pending' and completed_by_profile_id is null and completed_at is null)
    or (status = 'completed' and completed_by_profile_id is not null and completed_at is not null)
  ),
  constraint consumer_withdrawal_settlement_maximum check (
    contract_refund_amount + original_shipping_refund_amount <= captured_amount_snapshot
  )
);

create table public.consumer_withdrawal_idempotency (
  id uuid primary key default gen_random_uuid(),
  idempotency_key_hash bytea not null unique check (octet_length(idempotency_key_hash) = 32),
  payload_fingerprint bytea not null check (octet_length(payload_fingerprint) = 32),
  withdrawal_request_id uuid not null references public.consumer_withdrawal_requests(id) on delete restrict,
  code_key_version smallint not null check (code_key_version > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.consumer_withdrawal_admin_idempotency (
  id uuid primary key default gen_random_uuid(),
  idempotency_key_hash bytea not null unique check (octet_length(idempotency_key_hash) = 32),
  payload_fingerprint bytea not null check (octet_length(payload_fingerprint) = 32),
  withdrawal_request_id uuid not null references public.consumer_withdrawal_requests(id) on delete restrict,
  operation text not null check (char_length(operation) between 3 and 80),
  result_version bigint not null check (result_version > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.consumer_withdrawal_limits (
  id uuid primary key default gen_random_uuid(),
  scope public.consumer_withdrawal_limit_scope not null,
  fingerprint bytea not null check (octet_length(fingerprint) = 32),
  failed_count integer not null default 0 check (failed_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, fingerprint)
);

create index consumer_withdrawal_requests_status_submitted_idx
  on public.consumer_withdrawal_requests(request_status, submitted_at desc);
create index consumer_withdrawal_requests_open_review_idx
  on public.consumer_withdrawal_requests(first_review_due_at)
  where request_status not in ('not_applicable', 'closed');
create index consumer_withdrawal_requests_legal_review_idx
  on public.consumer_withdrawal_requests(submitted_at)
  where legal_time_status = 'review_required' and deadline_reviewed_at is null;
create index consumer_withdrawal_requests_order_idx
  on public.consumer_withdrawal_requests(order_id)
  where order_id is not null;
create index consumer_withdrawal_requests_contact_idx
  on public.consumer_withdrawal_requests(contact_fingerprint, submitted_at desc);
create index consumer_withdrawal_events_request_idx
  on public.consumer_withdrawal_events(withdrawal_request_id, created_at, id);
create index consumer_withdrawal_idempotency_expiry_idx
  on public.consumer_withdrawal_idempotency(expires_at);
create index consumer_withdrawal_admin_idempotency_expiry_idx
  on public.consumer_withdrawal_admin_idempotency(expires_at);
create index consumer_withdrawal_limits_expiry_idx
  on public.consumer_withdrawal_limits(expires_at);

create function public.prevent_consumer_withdrawal_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = 'Consumer withdrawal events are append-only';
end;
$$;

create trigger prevent_consumer_withdrawal_event_mutation
before update or delete on public.consumer_withdrawal_events
for each row execute function public.prevent_consumer_withdrawal_event_mutation();

create function public.set_consumer_withdrawal_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_consumer_withdrawal_request_updated_at
before update on public.consumer_withdrawal_requests
for each row execute function public.set_consumer_withdrawal_updated_at();

create trigger set_consumer_withdrawal_settlement_updated_at
before update on public.consumer_withdrawal_settlements
for each row execute function public.set_consumer_withdrawal_updated_at();

create trigger set_consumer_withdrawal_limit_updated_at
before update on public.consumer_withdrawal_limits
for each row execute function public.set_consumer_withdrawal_updated_at();

alter table public.consumer_withdrawal_requests enable row level security;
alter table public.consumer_withdrawal_events enable row level security;
alter table public.consumer_withdrawal_settlements enable row level security;
alter table public.consumer_withdrawal_idempotency enable row level security;
alter table public.consumer_withdrawal_admin_idempotency enable row level security;
alter table public.consumer_withdrawal_limits enable row level security;

revoke all on table public.consumer_withdrawal_requests from public, anon, authenticated;
revoke all on table public.consumer_withdrawal_events from public, anon, authenticated;
revoke all on table public.consumer_withdrawal_settlements from public, anon, authenticated;
revoke all on table public.consumer_withdrawal_idempotency from public, anon, authenticated;
revoke all on table public.consumer_withdrawal_admin_idempotency from public, anon, authenticated;
revoke all on table public.consumer_withdrawal_limits from public, anon, authenticated;

grant select, insert, update on table public.consumer_withdrawal_requests to service_role;
grant select, insert on table public.consumer_withdrawal_events to service_role;
grant select, insert, update on table public.consumer_withdrawal_settlements to service_role;
grant select, insert, delete on table public.consumer_withdrawal_idempotency to service_role;
grant select, insert, delete on table public.consumer_withdrawal_admin_idempotency to service_role;
grant select, insert, update, delete on table public.consumer_withdrawal_limits to service_role;

revoke execute on function public.set_order_consumer_right_evidence() from public, anon, authenticated;
revoke execute on function public.prevent_consumer_withdrawal_event_mutation() from public, anon, authenticated;
revoke execute on function public.set_consumer_withdrawal_updated_at() from public, anon, authenticated;

create function public.create_consumer_withdrawal(
  p_public_code_hash text,
  p_public_code_suffix text,
  p_public_code_key_version smallint,
  p_idempotency_key_hash text,
  p_payload_fingerprint text,
  p_order_reference_input text,
  p_order_reference_unavailable boolean,
  p_contact_phone_normalized text,
  p_contact_fingerprint text,
  p_customer_comment text,
  p_source public.consumer_withdrawal_source,
  p_idempotency_expires_at timestamptz,
  p_actor_profile_id uuid default null,
  p_submitted_at timestamptz default null
)
returns table (
  withdrawal_request_id uuid,
  request_status public.consumer_withdrawal_request_status,
  submitted_at timestamptz,
  acknowledgement_issued_at timestamptz,
  created boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_code_hash bytea;
  v_idempotency_hash bytea;
  v_payload_fingerprint bytea;
  v_contact_fingerprint bytea;
  v_existing record;
  v_order public.orders%rowtype;
  v_request_id uuid;
  v_request_status public.consumer_withdrawal_request_status;
  v_submitted_at timestamptz;
  v_deadline_at timestamptz;
  v_time_status public.consumer_withdrawal_legal_time_status :=
    'review_required'::public.consumer_withdrawal_legal_time_status;
  v_time_basis public.consumer_withdrawal_legal_time_basis :=
    'manual_review'::public.consumer_withdrawal_legal_time_basis;
  v_time_base timestamptz;
begin
  if p_order_reference_unavailable = (nullif(btrim(p_order_reference_input), '') is not null) then
    raise exception using errcode = '22023', message = 'Exactly one order reference option is required';
  end if;

  if p_source = 'web' and (p_actor_profile_id is not null or p_submitted_at is not null) then
    raise exception using errcode = '22023', message = 'Web requests cannot provide an actor or submission time';
  end if;

  if p_source = 'admin_whatsapp_contingency' then
    perform 1 from public.profiles
    where id = p_actor_profile_id and role = 'administrator' and is_active = true;
    if not found then
      raise exception using errcode = '42501', message = 'An active administrator is required';
    end if;
    if p_submitted_at is null or p_submitted_at > now() then
      raise exception using errcode = '22023', message = 'A valid contingency reception time is required';
    end if;
  end if;

  begin
    v_code_hash := decode(p_public_code_hash, 'hex');
    v_idempotency_hash := decode(p_idempotency_key_hash, 'hex');
    v_payload_fingerprint := decode(p_payload_fingerprint, 'hex');
    v_contact_fingerprint := decode(p_contact_fingerprint, 'hex');
  exception when others then
    raise exception using errcode = '22023', message = 'Invalid security fingerprint';
  end;

  if octet_length(v_code_hash) <> 32
    or octet_length(v_idempotency_hash) <> 32
    or octet_length(v_payload_fingerprint) <> 32
    or octet_length(v_contact_fingerprint) <> 32 then
    raise exception using errcode = '22023', message = 'Invalid security fingerprint length';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(pg_catalog.encode(v_idempotency_hash, 'hex'), 0)
  );

  select i.payload_fingerprint, i.withdrawal_request_id, r.request_status,
    r.submitted_at, r.acknowledgement_issued_at
  into v_existing
  from public.consumer_withdrawal_idempotency as i
  join public.consumer_withdrawal_requests as r on r.id = i.withdrawal_request_id
  where i.idempotency_key_hash = v_idempotency_hash;

  if found then
    if v_existing.payload_fingerprint <> v_payload_fingerprint then
      raise exception using errcode = '23505', message = 'Idempotency key was reused with another payload';
    end if;
    return query select v_existing.withdrawal_request_id, v_existing.request_status,
      v_existing.submitted_at, v_existing.acknowledgement_issued_at, false;
    return;
  end if;

  if not p_order_reference_unavailable then
    select * into v_order
    from public.orders
    where upper(order_number) = upper(btrim(p_order_reference_input))
      and customer_phone_normalized = p_contact_phone_normalized
    limit 1;
  end if;

  v_request_status := case
    when p_order_reference_unavailable or v_order.id is null
      then 'verification_pending'::public.consumer_withdrawal_request_status
    else 'received'::public.consumer_withdrawal_request_status
  end;
  v_submitted_at := coalesce(p_submitted_at, now());

  if v_order.id is not null then
    if v_order.withdrawal_right_informed_at is null then
      v_time_basis := 'right_not_properly_informed'::public.consumer_withdrawal_legal_time_basis;
    else
      v_time_base := greatest(
        v_order.contract_concluded_at,
        v_order.picked_up_at,
        v_order.delivered_at
      );
      if v_time_base is not null then
        v_time_basis := case
          when v_time_base = v_order.delivered_at
            then 'delivered_at'::public.consumer_withdrawal_legal_time_basis
          when v_time_base = v_order.picked_up_at
            then 'picked_up_at'::public.consumer_withdrawal_legal_time_basis
          else 'contract_concluded_at'::public.consumer_withdrawal_legal_time_basis
        end;
        v_deadline_at := v_time_base + interval '10 days';
        v_deadline_at := case extract(isodow from v_deadline_at)
          when 6 then v_deadline_at + interval '2 days'
          when 7 then v_deadline_at + interval '1 day'
          else v_deadline_at
        end;
        v_time_status := case
          when v_submitted_at <= v_deadline_at
            then 'apparently_in_time'::public.consumer_withdrawal_legal_time_status
          else 'review_required'::public.consumer_withdrawal_legal_time_status
        end;
      end if;
    end if;
  end if;

  insert into public.consumer_withdrawal_requests (
    public_code_hash,
    public_code_suffix,
    public_code_key_version,
    order_id,
    order_reference_input,
    order_reference_unavailable,
    contact_phone_normalized,
    contact_fingerprint,
    request_status,
    customer_comment,
    source,
    submitted_at,
    acknowledgement_issued_at,
    acknowledgement_due_at,
    legal_time_status,
    legal_time_basis,
    legal_deadline_at,
    contract_concluded_at_snapshot,
    right_informed_at_snapshot,
    right_notice_version_snapshot,
    first_review_due_at
  ) values (
    v_code_hash,
    upper(btrim(p_public_code_suffix)),
    p_public_code_key_version,
    v_order.id,
    case when p_order_reference_unavailable then null else upper(btrim(p_order_reference_input)) end,
    p_order_reference_unavailable,
    p_contact_phone_normalized,
    v_contact_fingerprint,
    v_request_status,
    nullif(btrim(p_customer_comment), ''),
    p_source,
    v_submitted_at,
    now(),
    v_submitted_at + interval '24 hours',
    v_time_status,
    v_time_basis,
    v_deadline_at,
    v_order.contract_concluded_at,
    v_order.withdrawal_right_informed_at,
    v_order.withdrawal_right_notice_version,
    v_submitted_at + interval '1 day'
  ) returning id into v_request_id;

  insert into public.consumer_withdrawal_idempotency (
    idempotency_key_hash,
    payload_fingerprint,
    withdrawal_request_id,
    code_key_version,
    expires_at
  ) values (
    v_idempotency_hash,
    v_payload_fingerprint,
    v_request_id,
    p_public_code_key_version,
    p_idempotency_expires_at
  );

  insert into public.consumer_withdrawal_events (
    withdrawal_request_id, actor_profile_id, event_type, next_status, metadata, created_at
  ) values
    (v_request_id, p_actor_profile_id, 'withdrawal_submitted', v_request_status,
      jsonb_build_object('source', p_source), v_submitted_at),
    (v_request_id, p_actor_profile_id, 'acknowledgement_issued', v_request_status,
      '{}'::jsonb, now());

  if p_source = 'admin_whatsapp_contingency' then
    insert into public.consumer_withdrawal_events (
      withdrawal_request_id, actor_profile_id, event_type, next_status, metadata
    ) values (
      v_request_id, p_actor_profile_id, 'contingency_request_registered',
      v_request_status, '{}'::jsonb
    );
  end if;

  return query select v_request_id, v_request_status, v_submitted_at, now(), true;
end;
$$;

create function public.transition_consumer_withdrawal(
  p_request_id uuid,
  p_action text,
  p_actor_profile_id uuid,
  p_expected_version bigint,
  p_idempotency_key_hash text,
  p_payload_fingerprint text,
  p_idempotency_expires_at timestamptz,
  p_reason text default null,
  p_public_explanation text default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.consumer_withdrawal_requests%rowtype;
  v_order public.orders%rowtype;
  v_previous_status public.consumer_withdrawal_request_status;
  v_event_type text;
  v_idempotency_hash bytea;
  v_payload_fingerprint bytea;
  v_existing record;
begin
  perform 1 from public.profiles
  where id = p_actor_profile_id and role = 'administrator' and is_active = true;
  if not found then
    raise exception using errcode = '42501', message = 'An active administrator is required';
  end if;

  begin
    v_idempotency_hash := decode(p_idempotency_key_hash, 'hex');
    v_payload_fingerprint := decode(p_payload_fingerprint, 'hex');
  exception when others then
    raise exception using errcode = '22023', message = 'Invalid idempotency fingerprint';
  end;
  if octet_length(v_idempotency_hash) <> 32 or octet_length(v_payload_fingerprint) <> 32 then
    raise exception using errcode = '22023', message = 'Invalid idempotency fingerprint length';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(pg_catalog.encode(v_idempotency_hash, 'hex'), 0)
  );
  select withdrawal_request_id, operation, payload_fingerprint into v_existing
  from public.consumer_withdrawal_admin_idempotency
  where idempotency_key_hash = v_idempotency_hash;
  if found then
    if v_existing.withdrawal_request_id = p_request_id
      and v_existing.operation = 'transition:' || p_action
      and v_existing.payload_fingerprint = v_payload_fingerprint then
      return true;
    end if;
    raise exception using errcode = '23505', message = 'Idempotency key was reused with another operation';
  end if;

  select * into v_request
  from public.consumer_withdrawal_requests
  where id = p_request_id
  for update;
  if not found then return false; end if;
  if v_request.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'The withdrawal changed before transition';
  end if;

  v_previous_status := v_request.request_status;

  case p_action
    when 'request_verification' then
      if v_request.request_status <> 'received' then
        raise exception using errcode = '23514', message = 'Verification is not available';
      end if;
      v_request.request_status := 'verification_pending';
      v_event_type := 'verification_requested';
    when 'start_review' then
      if v_request.request_status not in ('received', 'verification_pending') then
        raise exception using errcode = '23514', message = 'Review is not available';
      end if;
      v_request.request_status := 'under_review';
      v_request.first_reviewed_at := coalesce(v_request.first_reviewed_at, now());
      v_event_type := 'review_started';
    when 'determine_applicable' then
      if v_request.request_status <> 'under_review' or v_request.order_id is null then
        raise exception using errcode = '23514', message = 'Applicability cannot be determined yet';
      end if;
      select * into v_order
      from public.orders
      where id = v_request.order_id;
      if not found then
        raise exception using errcode = '23503', message = 'Linked order was not found';
      end if;
      if v_order.status not in ('cancelled', 'picked_up', 'delivered') then
        perform public.cancel_order_with_stock(
          v_order.id,
          p_actor_profile_id,
          coalesce(nullif(btrim(p_reason), ''), 'Arrepentimiento determinado como aplicable'),
          v_order.updated_at,
          v_order.payment_status = 'paid'
        );
      end if;
      v_request.request_status := 'applicable';
      v_request.applicable_at := now();
      select
        case when o.status in ('picked_up', 'delivered')
          then 'pending'::public.consumer_withdrawal_return_status
          else 'not_required'::public.consumer_withdrawal_return_status end,
        case when o.payment_status = 'paid'
          then 'pending'::public.consumer_withdrawal_refund_status
          else 'not_required'::public.consumer_withdrawal_refund_status end
      into v_request.return_status, v_request.refund_status
      from public.orders as o where o.id = v_request.order_id;
      v_event_type := 'withdrawal_determined_applicable';
    when 'determine_not_applicable' then
      if v_request.request_status <> 'under_review'
        or nullif(btrim(p_reason), '') is null
        or nullif(btrim(p_public_explanation), '') is null then
        raise exception using errcode = '23514', message = 'A legal reason and public explanation are required';
      end if;
      v_request.request_status := 'not_applicable';
      v_request.not_applicable_at := now();
      v_request.public_resolution_explanation := btrim(p_public_explanation);
      v_event_type := 'withdrawal_determined_not_applicable';
    when 'record_return_received' then
      if v_request.request_status <> 'applicable' or v_request.return_status <> 'pending' then
        raise exception using errcode = '23514', message = 'Return reception is not available';
      end if;
      v_request.return_status := 'received';
      v_request.return_received_at := now();
      v_request.inspection_due_at := now() + interval '2 days';
      v_event_type := 'return_received';
    when 'inspect_return' then
      if v_request.request_status <> 'applicable' or v_request.return_status <> 'received' then
        raise exception using errcode = '23514', message = 'Return inspection is not available';
      end if;
      v_request.return_status := 'inspected';
      v_request.inspected_at := now();
      v_event_type := 'return_inspected';
    when 'mark_refund_processing' then
      if v_request.request_status <> 'applicable' or v_request.refund_status <> 'pending' then
        raise exception using errcode = '23514', message = 'Refund processing is not available';
      end if;
      v_request.refund_status := 'processing';
      v_event_type := 'refund_processing';
    when 'mark_refund_manual_review' then
      if v_request.request_status <> 'applicable'
        or v_request.refund_status not in ('pending', 'processing', 'failed') then
        raise exception using errcode = '23514', message = 'Manual refund review is not available';
      end if;
      v_request.refund_status := 'manual_review';
      v_event_type := 'refund_manual_review_required';
    when 'close' then
      if v_request.request_status <> 'applicable'
        or v_request.return_status not in ('not_required', 'inspected')
        or v_request.refund_status not in ('not_required', 'succeeded') then
        raise exception using errcode = '23514', message = 'Outstanding obligations prevent closure';
      end if;
      v_request.request_status := 'closed';
      v_request.closed_at := now();
      v_event_type := 'withdrawal_closed';
    else
      raise exception using errcode = '22023', message = 'Unknown withdrawal action';
  end case;

  update public.consumer_withdrawal_requests set
    request_status = v_request.request_status,
    return_status = v_request.return_status,
    refund_status = v_request.refund_status,
    resolution_reason = case
      when p_action in ('determine_applicable', 'determine_not_applicable')
      then nullif(btrim(p_reason), '')
      else resolution_reason
    end,
    public_resolution_explanation = v_request.public_resolution_explanation,
    first_reviewed_at = v_request.first_reviewed_at,
    return_received_at = v_request.return_received_at,
    inspection_due_at = v_request.inspection_due_at,
    inspected_at = v_request.inspected_at,
    applicable_at = v_request.applicable_at,
    not_applicable_at = v_request.not_applicable_at,
    closed_at = v_request.closed_at,
    version = version + 1
  where id = p_request_id;

  insert into public.consumer_withdrawal_events (
    withdrawal_request_id, actor_profile_id, event_type,
    previous_status, next_status, reason, metadata
  ) values (
    p_request_id, p_actor_profile_id, v_event_type,
    v_previous_status, v_request.request_status, nullif(btrim(p_reason), ''), '{}'::jsonb
  );

  insert into public.consumer_withdrawal_admin_idempotency (
    idempotency_key_hash, payload_fingerprint, withdrawal_request_id,
    operation, result_version, expires_at
  ) values (
    v_idempotency_hash, v_payload_fingerprint, p_request_id,
    'transition:' || p_action, p_expected_version + 1, p_idempotency_expires_at
  );

  return true;
end;
$$;

create function public.link_consumer_withdrawal_order(
  p_request_id uuid,
  p_order_id uuid,
  p_actor_profile_id uuid,
  p_expected_version bigint,
  p_reason text,
  p_idempotency_key_hash text,
  p_payload_fingerprint text,
  p_idempotency_expires_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.consumer_withdrawal_requests%rowtype;
  v_order public.orders%rowtype;
  v_event_type text;
  v_idempotency_hash bytea;
  v_payload_fingerprint bytea;
  v_existing record;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'A verification note is required';
  end if;
  perform 1 from public.profiles
  where id = p_actor_profile_id and role = 'administrator' and is_active = true;
  if not found then
    raise exception using errcode = '42501', message = 'An active administrator is required';
  end if;

  begin
    v_idempotency_hash := decode(p_idempotency_key_hash, 'hex');
    v_payload_fingerprint := decode(p_payload_fingerprint, 'hex');
  exception when others then
    raise exception using errcode = '22023', message = 'Invalid idempotency fingerprint';
  end;
  if octet_length(v_idempotency_hash) <> 32 or octet_length(v_payload_fingerprint) <> 32 then
    raise exception using errcode = '22023', message = 'Invalid idempotency fingerprint length';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(pg_catalog.encode(v_idempotency_hash, 'hex'), 0)
  );
  select withdrawal_request_id, operation, payload_fingerprint into v_existing
  from public.consumer_withdrawal_admin_idempotency
  where idempotency_key_hash = v_idempotency_hash;
  if found then
    if v_existing.withdrawal_request_id = p_request_id
      and v_existing.operation = 'link_order'
      and v_existing.payload_fingerprint = v_payload_fingerprint then
      return true;
    end if;
    raise exception using errcode = '23505', message = 'Idempotency key was reused with another operation';
  end if;

  select * into v_request from public.consumer_withdrawal_requests
  where id = p_request_id for update;
  if not found then return false; end if;
  if v_request.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'The withdrawal changed before linking';
  end if;
  if v_request.request_status in ('applicable', 'not_applicable', 'closed') then
    raise exception using errcode = '23514', message = 'A terminal determination cannot be relinked';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then return false; end if;
  v_event_type := case when v_request.order_id is null then 'order_linked' else 'order_link_corrected' end;

  update public.consumer_withdrawal_requests set
    order_id = p_order_id,
    contract_concluded_at_snapshot = v_order.contract_concluded_at,
    right_informed_at_snapshot = v_order.withdrawal_right_informed_at,
    right_notice_version_snapshot = v_order.withdrawal_right_notice_version,
    legal_time_status = 'review_required'::public.consumer_withdrawal_legal_time_status,
    legal_time_basis = case
      when v_order.withdrawal_right_informed_at is null
        then 'right_not_properly_informed'::public.consumer_withdrawal_legal_time_basis
      else 'manual_review'::public.consumer_withdrawal_legal_time_basis
    end,
    version = version + 1
  where id = p_request_id;

  insert into public.consumer_withdrawal_events (
    withdrawal_request_id, actor_profile_id, event_type, previous_status,
    next_status, reason, metadata
  ) values (
    p_request_id, p_actor_profile_id, v_event_type, v_request.request_status,
    v_request.request_status, btrim(p_reason),
    jsonb_build_object('previous_order_id', v_request.order_id, 'next_order_id', p_order_id)
  );
  insert into public.consumer_withdrawal_admin_idempotency (
    idempotency_key_hash, payload_fingerprint, withdrawal_request_id,
    operation, result_version, expires_at
  ) values (
    v_idempotency_hash, v_payload_fingerprint, p_request_id,
    'link_order', p_expected_version + 1, p_idempotency_expires_at
  );
  return true;
end;
$$;

create function public.record_consumer_withdrawal_settlement(
  p_request_id uuid,
  p_actor_profile_id uuid,
  p_expected_version bigint,
  p_contract_refund_amount numeric,
  p_original_shipping_refund_amount numeric,
  p_return_shipping_refund_amount numeric,
  p_method public.consumer_withdrawal_settlement_method,
  p_idempotency_key_hash text,
  p_payload_fingerprint text,
  p_idempotency_expires_at timestamptz,
  p_reference text default null,
  p_notes text default null,
  p_complete boolean default false
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.consumer_withdrawal_requests%rowtype;
  v_order public.orders%rowtype;
  v_existing public.consumer_withdrawal_settlements%rowtype;
  v_idempotency_hash bytea;
  v_payload_fingerprint bytea;
  v_existing_idempotency record;
begin
  perform 1 from public.profiles
  where id = p_actor_profile_id and role = 'administrator' and is_active = true;
  if not found then
    raise exception using errcode = '42501', message = 'An active administrator is required';
  end if;

  begin
    v_idempotency_hash := decode(p_idempotency_key_hash, 'hex');
    v_payload_fingerprint := decode(p_payload_fingerprint, 'hex');
  exception when others then
    raise exception using errcode = '22023', message = 'Invalid idempotency fingerprint';
  end;
  if octet_length(v_idempotency_hash) <> 32 or octet_length(v_payload_fingerprint) <> 32 then
    raise exception using errcode = '22023', message = 'Invalid idempotency fingerprint length';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(pg_catalog.encode(v_idempotency_hash, 'hex'), 0)
  );
  select withdrawal_request_id, operation, payload_fingerprint into v_existing_idempotency
  from public.consumer_withdrawal_admin_idempotency
  where idempotency_key_hash = v_idempotency_hash;
  if found then
    if v_existing_idempotency.withdrawal_request_id = p_request_id
      and v_existing_idempotency.operation = 'record_settlement'
      and v_existing_idempotency.payload_fingerprint = v_payload_fingerprint then
      return true;
    end if;
    raise exception using errcode = '23505', message = 'Idempotency key was reused with another operation';
  end if;

  select * into v_request from public.consumer_withdrawal_requests
  where id = p_request_id for update;
  if not found then return false; end if;
  if v_request.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'The withdrawal changed before settlement';
  end if;
  if v_request.request_status <> 'applicable' or v_request.order_id is null then
    raise exception using errcode = '23514', message = 'Settlement requires an applicable linked request';
  end if;

  select * into v_order from public.orders where id = v_request.order_id for update;
  if v_order.payment_status <> 'paid' then
    raise exception using errcode = '23514', message = 'The order has no captured amount to refund';
  end if;

  select * into v_existing from public.consumer_withdrawal_settlements
  where withdrawal_request_id = p_request_id for update;
  if found and v_existing.status = 'completed' then
    if p_complete
      and v_existing.contract_refund_amount = p_contract_refund_amount
      and v_existing.original_shipping_refund_amount = p_original_shipping_refund_amount
      and v_existing.return_shipping_refund_amount = p_return_shipping_refund_amount
      and v_existing.method = p_method then
      return true;
    end if;
    raise exception using errcode = '23505', message = 'Settlement was already completed';
  end if;

  insert into public.consumer_withdrawal_settlements (
    withdrawal_request_id, order_id, order_total_snapshot, captured_amount_snapshot,
    contract_refund_amount, original_shipping_refund_amount,
    return_shipping_refund_amount, method, status, reference, notes,
    completed_by_profile_id, completed_at
  ) values (
    p_request_id, v_order.id, v_order.total, v_order.total,
    p_contract_refund_amount, p_original_shipping_refund_amount,
    p_return_shipping_refund_amount, p_method,
    case when p_complete
      then 'completed'::public.consumer_withdrawal_settlement_status
      else 'pending'::public.consumer_withdrawal_settlement_status end,
    nullif(btrim(p_reference), ''), nullif(btrim(p_notes), ''),
    case when p_complete then p_actor_profile_id else null end,
    case when p_complete then now() else null end
  )
  on conflict (withdrawal_request_id) do update set
    contract_refund_amount = excluded.contract_refund_amount,
    original_shipping_refund_amount = excluded.original_shipping_refund_amount,
    return_shipping_refund_amount = excluded.return_shipping_refund_amount,
    method = excluded.method,
    status = excluded.status,
    reference = excluded.reference,
    notes = excluded.notes,
    completed_by_profile_id = excluded.completed_by_profile_id,
    completed_at = excluded.completed_at;

  update public.consumer_withdrawal_requests set
    refund_status = case when p_complete
      then 'succeeded'::public.consumer_withdrawal_refund_status
      else 'pending'::public.consumer_withdrawal_refund_status end,
    version = version + 1
  where id = p_request_id;

  insert into public.consumer_withdrawal_events (
    withdrawal_request_id, actor_profile_id, event_type,
    previous_status, next_status, reason, metadata
  ) values (
    p_request_id, p_actor_profile_id,
    case when p_complete then 'refund_confirmed_manual' else 'refund_requested' end,
    v_request.request_status, v_request.request_status, nullif(btrim(p_notes), ''),
    jsonb_build_object('method', p_method, 'completed', p_complete)
  );
  insert into public.consumer_withdrawal_admin_idempotency (
    idempotency_key_hash, payload_fingerprint, withdrawal_request_id,
    operation, result_version, expires_at
  ) values (
    v_idempotency_hash, v_payload_fingerprint, p_request_id,
    'record_settlement', p_expected_version + 1, p_idempotency_expires_at
  );
  return true;
end;
$$;

create function public.purge_consumer_withdrawal_security_data()
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted bigint := 0;
  v_count bigint;
begin
  delete from public.consumer_withdrawal_idempotency where expires_at <= now();
  get diagnostics v_count = row_count;
  v_deleted := v_deleted + v_count;
  delete from public.consumer_withdrawal_admin_idempotency where expires_at <= now();
  get diagnostics v_count = row_count;
  v_deleted := v_deleted + v_count;
  delete from public.consumer_withdrawal_limits where expires_at <= now();
  get diagnostics v_count = row_count;
  return v_deleted + v_count;
end;
$$;

create function public.register_consumer_withdrawal_attempt(
  p_ip_fingerprint text,
  p_contact_fingerprint text,
  p_window interval,
  p_max_attempts integer,
  p_captcha_threshold integer,
  p_block_duration interval,
  p_expires_at timestamptz
)
returns table (
  is_blocked boolean,
  captcha_required boolean,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ip_fingerprint bytea;
  v_contact_fingerprint bytea;
  v_fingerprint bytea;
  v_scope public.consumer_withdrawal_limit_scope;
begin
  begin
    v_ip_fingerprint := decode(p_ip_fingerprint, 'hex');
    v_contact_fingerprint := decode(p_contact_fingerprint, 'hex');
  exception when others then
    raise exception using errcode = '22023', message = 'Invalid withdrawal limit fingerprint';
  end;
  if octet_length(v_ip_fingerprint) <> 32
    or octet_length(v_contact_fingerprint) <> 32
    or p_window < interval '1 minute'
    or p_max_attempts < 1
    or p_captcha_threshold < 1
    or p_captcha_threshold > p_max_attempts
    or p_block_duration < interval '1 minute'
    or p_expires_at <= now() then
    raise exception using errcode = '22023', message = 'Invalid withdrawal limit parameters';
  end if;

  for v_scope, v_fingerprint in
    select input.scope, input.fingerprint
    from (values
      ('ip'::public.consumer_withdrawal_limit_scope, v_ip_fingerprint),
      ('contact'::public.consumer_withdrawal_limit_scope, v_contact_fingerprint)
    ) as input(scope, fingerprint)
    order by input.scope
  loop
    insert into public.consumer_withdrawal_limits (
      scope, fingerprint, failed_count, window_started_at, blocked_until, expires_at
    ) values (
      v_scope, v_fingerprint, 1, now(),
      case when p_max_attempts <= 1 then now() + p_block_duration else null end,
      p_expires_at
    )
    on conflict (scope, fingerprint) do update set
      window_started_at = case
        when public.consumer_withdrawal_limits.window_started_at <= now() - p_window then now()
        else public.consumer_withdrawal_limits.window_started_at
      end,
      failed_count = case
        when public.consumer_withdrawal_limits.window_started_at <= now() - p_window then 1
        else public.consumer_withdrawal_limits.failed_count + 1
      end,
      blocked_until = case
        when public.consumer_withdrawal_limits.blocked_until > now()
          then public.consumer_withdrawal_limits.blocked_until
        when (
          case
            when public.consumer_withdrawal_limits.window_started_at <= now() - p_window then 1
            else public.consumer_withdrawal_limits.failed_count + 1
          end
        ) >= p_max_attempts then now() + p_block_duration
        else null
      end,
      expires_at = greatest(public.consumer_withdrawal_limits.expires_at, excluded.expires_at);
  end loop;

  return query
  select
    coalesce(bool_or(limit_row.blocked_until > now()), false),
    coalesce(bool_or(limit_row.failed_count >= p_captcha_threshold), false),
    coalesce(max(greatest(0, ceil(extract(epoch from limit_row.blocked_until - now())))::integer), 0)
  from public.consumer_withdrawal_limits as limit_row
  where (limit_row.scope, limit_row.fingerprint) in (
    ('ip'::public.consumer_withdrawal_limit_scope, v_ip_fingerprint),
    ('contact'::public.consumer_withdrawal_limit_scope, v_contact_fingerprint)
  );
end;
$$;

revoke execute on function public.create_consumer_withdrawal(
  text, text, smallint, text, text, text, boolean, text, text, text,
  public.consumer_withdrawal_source, timestamptz, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_consumer_withdrawal(
  text, text, smallint, text, text, text, boolean, text, text, text,
  public.consumer_withdrawal_source, timestamptz, uuid, timestamptz
) to service_role;

revoke execute on function public.transition_consumer_withdrawal(
  uuid, text, uuid, bigint, text, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.transition_consumer_withdrawal(
  uuid, text, uuid, bigint, text, text, timestamptz, text, text
) to service_role;

revoke execute on function public.link_consumer_withdrawal_order(
  uuid, uuid, uuid, bigint, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.link_consumer_withdrawal_order(
  uuid, uuid, uuid, bigint, text, text, text, timestamptz
) to service_role;

revoke execute on function public.record_consumer_withdrawal_settlement(
  uuid, uuid, bigint, numeric, numeric, numeric,
  public.consumer_withdrawal_settlement_method, text, text, timestamptz,
  text, text, boolean
) from public, anon, authenticated;
grant execute on function public.record_consumer_withdrawal_settlement(
  uuid, uuid, bigint, numeric, numeric, numeric,
  public.consumer_withdrawal_settlement_method, text, text, timestamptz,
  text, text, boolean
) to service_role;

revoke execute on function public.purge_consumer_withdrawal_security_data()
  from public, anon, authenticated;
grant execute on function public.purge_consumer_withdrawal_security_data()
  to service_role;

revoke execute on function public.register_consumer_withdrawal_attempt(
  text, text, interval, integer, integer, interval, timestamptz
) from public, anon, authenticated;
grant execute on function public.register_consumer_withdrawal_attempt(
  text, text, interval, integer, integer, interval, timestamptz
) to service_role;
