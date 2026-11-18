begin;

create index if not exists orders_payment_reservation_expiry_idx
  on public.orders (reservation_expires_at)
  where reservation_expires_at is not null;

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
  v_attempt public.payment_attempts%rowtype;
  v_item record;
begin
  if p_provider_state not in ('cancelled', 'rejected', 'expired')
    or nullif(btrim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'A terminal non-chargeable provider result is required';
  end if;

  -- The order is the first lock in every payment mutation. This makes expiry
  -- and late provider approval serialize on the same row.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.reservation_expires_at is null
    or v_order.status = 'cancelled' or v_order.payment_status = 'paid' then
    return false;
  end if;
  if exists (
    select 1 from public.inventory_movements
    where order_id = p_order_id and movement_type = 'order_cancelled'
  ) then
    return false;
  end if;

  for v_attempt in
    select * from public.payment_attempts where order_id = p_order_id for update
  loop
    if v_attempt.status = 'approved' or v_attempt.provider_status = 'approved' then
      return false;
    end if;
  end loop;

  for v_item in
    select oi.product_id, oi.quantity, p.stock_quantity
    from public.order_items as oi
    join public.products as p on p.id = oi.product_id
    where oi.order_id = p_order_id
    order by oi.product_id
    for update of p
  loop
    -- The partial unique index makes this insert an additional database-level
    -- guard against a future caller bypassing the cancelled-order guard.
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

create or replace function public.release_expired_payment_reservations_v2(
  p_limit integer default 10
)
returns table (examined_count integer, released_count integer, approved_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_released boolean;
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Reservation expiry batch size is invalid';
  end if;

  examined_count := 0;
  released_count := 0;
  approved_count := 0;
  for v_order_id in
    select o.id
    from public.orders as o
    where o.payment_method = 'mercado_pago'
      and o.reservation_expires_at <= statement_timestamp()
      and o.status <> 'cancelled'
      and o.payment_status <> 'paid'
    order by o.reservation_expires_at, o.created_at, o.id
    for update skip locked
    limit p_limit
  loop
    examined_count := examined_count + 1;
    -- release_payment_reservation_v2 locks the same order row first and then
    -- all attempts. An approved attempt therefore wins this race.
    v_released := public.release_payment_reservation_v2(
      v_order_id, 'expired', 'reservation expired'
    );
    if v_released then
      released_count := released_count + 1;
    else
      approved_count := approved_count + 1;
    end if;
  end loop;
  return next;
end;
$$;

create or replace function public.transition_payment_attempt_v2(
  p_attempt_id uuid,
  p_provider_status text,
  p_provider_updated_at timestamptz,
  p_provider_version bigint,
  p_expected_status public.payment_attempt_status,
  p_expected_provider_version bigint,
  p_next_status public.payment_attempt_status
)
returns table (transition_applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
begin
  select o.* into v_order
  from public.orders as o
  join public.payment_attempts as pa on pa.order_id = o.id
  where pa.id = p_attempt_id
  for update of o;

  select * into v_attempt from public.payment_attempts where id = p_attempt_id for update;
  if not found
    or v_order.status = 'cancelled' and p_next_status = 'approved'
    or v_order.payment_status = 'paid' and p_next_status <> 'approved'
    or v_attempt.status <> p_expected_status
    or (p_expected_provider_version is null and v_attempt.provider_version is not null)
    or (p_expected_provider_version is not null and v_attempt.provider_version <> p_expected_provider_version)
    or (v_attempt.status = 'approved' and p_next_status <> 'approved') then
    transition_applied := false;
    return next;
    return;
  end if;

  update public.payment_attempts
  set provider_status = p_provider_status,
      provider_updated_at = p_provider_updated_at,
      provider_version = p_provider_version,
      status = p_next_status
  where id = p_attempt_id;

  if p_next_status = 'approved' then
    update public.orders set payment_status = 'paid' where id = v_order.id;
  elsif p_next_status = 'rejected' then
    update public.orders set payment_status = 'rejected' where id = v_order.id
      and payment_status <> 'paid';
  end if;

  transition_applied := true;
  return next;
end;
$$;

revoke execute on function public.release_expired_payment_reservations_v2(integer)
  from public, anon, authenticated;
grant execute on function public.release_expired_payment_reservations_v2(integer)
  to service_role;

revoke execute on function public.transition_payment_attempt_v2(
  uuid, text, timestamptz, bigint, public.payment_attempt_status,
  bigint, public.payment_attempt_status
) from public, anon, authenticated;
grant execute on function public.transition_payment_attempt_v2(
  uuid, text, timestamptz, bigint, public.payment_attempt_status,
  bigint, public.payment_attempt_status
) to service_role;

commit;
