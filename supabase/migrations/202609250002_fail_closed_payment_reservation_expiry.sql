begin;

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
  v_authoritative_terminal boolean := false;
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
    -- manual_review is an explicit quarantine state. It never becomes
    -- releasable merely because the reservation clock elapsed.
    if v_attempt.status = 'manual_review' then
      return false;
    end if;
    if v_attempt.status = 'approved' or v_attempt.provider_status = 'approved' then
      return false;
    end if;
    if v_attempt.status in ('rejected', 'expired')
      and v_attempt.provider_status in ('cancelled', 'rejected', 'expired')
      and (p_provider_state = 'expired' or v_attempt.provider_status = p_provider_state) then
      v_authoritative_terminal := true;
    else
      -- Any pending, ambiguous, or provider-unreconciled attempt fails closed.
      return false;
    end if;
  end loop;

  if not v_authoritative_terminal then
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

  update public.orders set status = 'cancelled', payment_status = 'rejected',
    reservation_expires_at = null, picked_up_at = null where id = p_order_id;
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
    -- This function only releases after reconciliation has persisted an
    -- authoritative terminal provider result. Otherwise it fails closed.
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

revoke execute on function public.release_payment_reservation_v2(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.release_payment_reservation_v2(uuid, text, text)
  to service_role;

revoke execute on function public.release_expired_payment_reservations_v2(integer)
  from public, anon, authenticated;
grant execute on function public.release_expired_payment_reservations_v2(integer)
  to service_role;

commit;
