begin;

create table public.order_idempotency_keys (
  id uuid primary key default extensions.gen_random_uuid(),
  guest_session_id uuid not null references public.guest_sessions(id) on delete cascade,
  idempotency_key_hash bytea not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  order_id uuid references public.orders(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (guest_session_id, idempotency_key_hash)
);

create index order_idempotency_keys_created_at_idx
  on public.order_idempotency_keys (created_at);

alter table public.order_idempotency_keys enable row level security;

revoke all on public.order_idempotency_keys from public, anon, authenticated;

create function public.create_order_with_stock(
  p_guest_session_id uuid,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_phone text,
  p_customer_phone_normalized text,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_notes text default null
)
returns table (
  order_id uuid,
  order_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_order_id uuid;
  v_existing_order_number text;
  v_existing_fingerprint text;
  v_idempotency_key_hash bytea;
  v_inserted_count integer;
begin
  if p_idempotency_key !~ '^[A-Za-z0-9._:-]{16,128}$'
    or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'Idempotency data is invalid';
  end if;

  v_idempotency_key_hash := extensions.digest(
    pg_catalog.convert_to(p_idempotency_key, 'utf8'),
    'sha256'
  );

  insert into public.order_idempotency_keys (
    guest_session_id,
    idempotency_key_hash,
    request_fingerprint
  )
  values (
    p_guest_session_id,
    v_idempotency_key_hash,
    p_request_fingerprint
  )
  on conflict (guest_session_id, idempotency_key_hash) do nothing;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 0 then
    select idempotency_key.request_fingerprint, idempotency_key.order_id
    into v_existing_fingerprint, v_existing_order_id
    from public.order_idempotency_keys as idempotency_key
    where idempotency_key.guest_session_id = p_guest_session_id
      and idempotency_key.idempotency_key_hash = v_idempotency_key_hash
    for update;

    if v_existing_fingerprint <> p_request_fingerprint then
      raise exception using
        errcode = '23505',
        message = 'Idempotency key was already used with another request';
    end if;

    if v_existing_order_id is null then
      raise exception using
        errcode = '40001',
        message = 'Idempotent order is not finalized';
    end if;

    select o.order_number
    into v_existing_order_number
    from public.orders as o
    where o.id = v_existing_order_id;

    if v_existing_order_number is null then
      raise exception using
        errcode = 'P0001',
        message = 'Idempotent order could not be found';
    end if;

    return query select v_existing_order_id, v_existing_order_number;
    return;
  end if;

  select *
  into v_existing_order_id, v_existing_order_number
  from public.create_order_with_stock(
    p_guest_session_id,
    p_customer_first_name,
    p_customer_last_name,
    p_customer_phone,
    p_customer_phone_normalized,
    p_payment_method,
    p_items,
    p_notes
  );

  update public.order_idempotency_keys as idempotency_key
  set order_id = v_existing_order_id
  where idempotency_key.guest_session_id = p_guest_session_id
    and idempotency_key.idempotency_key_hash = v_idempotency_key_hash;

  return query select v_existing_order_id, v_existing_order_number;
end;
$$;

revoke execute on function public.create_order_with_stock(
  uuid,
  text,
  text,
  text,
  text,
  public.payment_method,
  jsonb,
  text,
  text,
  text
) from public, anon, authenticated, service_role;

grant execute on function public.create_order_with_stock(
  uuid,
  text,
  text,
  text,
  text,
  public.payment_method,
  jsonb,
  text,
  text,
  text
) to service_role;

revoke execute on function public.create_order_with_stock(
  uuid,
  text,
  text,
  text,
  text,
  public.payment_method,
  jsonb,
  text
) from service_role;

commit;
