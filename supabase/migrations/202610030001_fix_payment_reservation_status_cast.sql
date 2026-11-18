create or replace function public.release_payment_reservation_v2(
  p_order_id uuid, p_provider_state text, p_reason text
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
  if p_provider_state not in ('cancelled', 'rejected', 'expired', 'manual_review')
    or nullif(btrim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'Invalid payment reservation release decision';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.reservation_expires_at is null or v_order.payment_status = 'paid' then return false; end if;
  if exists (select 1 from public.inventory_movements where order_id = p_order_id and movement_type = 'order_cancelled') then return false; end if;

  for v_attempt in select * from public.payment_attempts where order_id = p_order_id for update loop
    if v_attempt.status = 'approved' or v_attempt.provider_status = 'approved' then return false; end if;
  end loop;
  for v_item in
    select oi.product_id, oi.quantity, p.stock_quantity
    from public.order_items oi join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id order by oi.product_id for update of p
  loop
    insert into public.inventory_movements (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after, reason)
    values (v_item.product_id, p_order_id, 'order_cancelled', v_item.quantity, v_item.stock_quantity, v_item.stock_quantity + v_item.quantity, btrim(p_reason));
    update public.products set stock_quantity = stock_quantity + v_item.quantity where id = v_item.product_id;
  end loop;
  update public.orders
  set status = 'cancelled',
      payment_status = (case when p_provider_state = 'manual_review' then 'pending' else 'rejected' end)::public.payment_status,
      reservation_expires_at = null,
      picked_up_at = null
  where id = p_order_id;
  update public.payment_attempts
  set status = (case when p_provider_state = 'manual_review' then 'manual_review' else 'expired' end)::public.payment_attempt_status,
      last_error = case when p_provider_state = 'manual_review' then btrim(p_reason) else last_error end
  where order_id = p_order_id and status in ('pending', 'rejected');
  return true;
end;
$$;
