begin;

-- Allow verified late approval to record payment while keeping the order pending
-- when the released inventory cannot be re-reserved. This never authorizes fulfillment.
create or replace function public.validate_order_change()
returns trigger language plpgsql set search_path = ''
as $$
declare
  v_is_aggregate_payment_change boolean := new.payment_method = 'mercado_pago'
    and coalesce(current_setting('margarita.payment_aggregate_transition', true), '0') = '1'
    and old.payment_status <> 'paid' and new.payment_status in ('pending', 'rejected', 'paid')
    and new.status = old.status;
  v_is_late_approval boolean := old.status in ('pending', 'cancelled')
    and (old.status <> 'cancelled' or old.payment_status <> 'paid')
    and new.status = 'confirmed' and new.payment_status = 'paid' and new.payment_method = 'mercado_pago'
    and coalesce(current_setting('margarita.payment_late_approval', true), '0') = '1'
    and not public.order_inventory_allocation_released(old.id);
  v_is_late_approval_review boolean := old.status = 'cancelled' and old.payment_status <> 'paid'
    and new.status = 'pending' and new.payment_status = 'paid' and new.payment_method = 'mercado_pago'
    and coalesce(current_setting('margarita.payment_late_approval_review', true), '0') = '1'
    and public.order_inventory_allocation_released(old.id);
  v_is_late_approval_manual boolean := old.status = 'pending'
    and new.status = 'pending'
    and old.payment_status <> 'paid'
    and new.payment_status = 'paid'
    and new.payment_method = 'mercado_pago'
    and old.reservation_expires_at <= statement_timestamp()
    and coalesce(current_setting('margarita.payment_late_approval_review', true), '0') = '1'
    and public.order_inventory_allocation_released(old.id);
  v_is_valid_transition boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' and new.payment_status = 'pending' then return new; end if;
    raise exception using errcode = '23514', message = 'Invalid initial order or payment status';
  end if;
  if (new.id, new.customer_id, new.customer_first_name, new.customer_last_name,
    new.customer_phone, new.customer_phone_normalized, new.order_number, new.subtotal,
    new.discount, new.total, new.payment_method, new.delivery_method, new.shipping_address, new.notes, new.created_at)
    is distinct from (old.id, old.customer_id, old.customer_first_name, old.customer_last_name,
    old.customer_phone, old.customer_phone_normalized, old.order_number, old.subtotal,
    old.discount, old.total, old.payment_method, old.delivery_method, old.shipping_address, old.notes, old.created_at) then
    raise exception using errcode = '55000', message = 'Historical order fields are immutable';
  end if;
  if old.status in ('picked_up', 'delivered', 'cancelled') and new.status <> old.status
    and not v_is_late_approval and not v_is_late_approval_review then
    raise exception using errcode = '23514', message = 'Terminal orders cannot be reopened';
  end if;
  if old.payment_status in ('paid', 'rejected') and new.payment_status <> old.payment_status
    and not v_is_aggregate_payment_change and not v_is_late_approval and not v_is_late_approval_review then
    raise exception using errcode = '23514', message = 'Terminal payment status cannot be changed';
  end if;
  if new.payment_method = 'mercado_pago'
    and old.payment_status <> 'paid' and new.payment_status = 'paid'
    and not v_is_aggregate_payment_change and not v_is_late_approval
    and not v_is_late_approval_review and not v_is_late_approval_manual then
    raise exception using errcode = '23514', message = 'Mercado Pago payment requires provider reconciliation';
  end if;
  if new.payment_method = 'mercado_pago'
    and new.status in ('confirmed', 'preparing', 'ready', 'picked_up', 'delivered')
    and new.status <> old.status
    and (new.payment_status <> 'paid' or (old.payment_status <> 'paid' and not v_is_late_approval)) then
    raise exception using errcode = '23514', message = 'Mercado Pago fulfillment requires confirmed payment';
  end if;
  if new.payment_method = 'mercado_pago'
    and new.status in ('confirmed', 'preparing', 'ready', 'picked_up', 'delivered')
    and new.status <> old.status and public.order_inventory_allocation_released(new.id) then
    raise exception using errcode = '23514', message = 'Fulfillment requires an active inventory allocation';
  end if;
  v_is_valid_transition := new.status = old.status
    or (old.status = 'pending' and new.status = 'confirmed')
    or (old.status = 'confirmed' and new.status = 'preparing')
    or (old.status = 'preparing' and new.status = 'ready')
    or (old.status = 'ready' and new.status = 'picked_up' and new.delivery_method = 'pickup')
    or (old.status = 'ready' and new.status = 'delivered' and new.delivery_method = 'shipping')
    or (new.status = 'cancelled' and old.status not in ('picked_up', 'delivered', 'cancelled'))
    or v_is_late_approval or v_is_late_approval_review;
  if not v_is_valid_transition then raise exception using errcode = '23514', message = 'Invalid order status transition'; end if;
  if new.status in ('picked_up', 'delivered') and new.payment_status <> 'paid' then
    raise exception using errcode = '23514', message = 'A completed order requires paid payment status';
  end if;
  return new;
end;
$$;

commit;
