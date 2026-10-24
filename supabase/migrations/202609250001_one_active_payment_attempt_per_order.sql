begin;

do $$
begin
  if exists (
    select 1
    from public.payment_attempts
    where status in ('pending', 'rejected', 'manual_review')
    group by order_id
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Active payment attempt duplicates require reconciliation before applying the invariant';
  end if;
end;
$$;

create unique index payment_attempts_one_active_per_order_idx
  on public.payment_attempts (order_id)
  where status in ('pending', 'rejected', 'manual_review');

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
  v_attempt_status public.payment_attempt_status;
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
    or v_order.status = 'cancelled'
    or v_order.payment_status = 'paid' then
    raise exception using errcode = '22023', message = 'Payment reservation is not active';
  end if;

  select id, status
  into v_attempt_id, v_attempt_status
  from public.payment_attempts
  where order_id = p_order_id
  order by created_at desc
  limit 1
  for update;

  if v_attempt_id is not null then
    if v_attempt_status in ('pending', 'rejected') then
      return v_attempt_id;
    end if;

    raise exception using errcode = '22023', message = 'Payment attempt cannot be replaced';
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

revoke execute on function public.create_payment_attempt_v2(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.create_payment_attempt_v2(uuid, text, text)
  to service_role;

commit;
