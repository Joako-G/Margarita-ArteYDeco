-- A payment left in process at reservation expiry keeps the order pending (stock released once,
-- attempt in manual review). If the provider then rejects it definitively, the order is now
-- cancelled automatically, without moving stock again, and the cancellation is audited.
-- A rejection while the reservation is still active keeps the order pending so the customer can
-- retry. The attempt stays 'rejected', so a later approval on this cancelled order is recorded as
-- paid but does not reopen it (the owner refunds it manually). Forward-only: replaces one function.

CREATE OR REPLACE FUNCTION public.reconcile_payment_attempt_aggregate_v2(p_attempt_id uuid)
 RETURNS payment_attempt_status
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_transaction public.payment_transactions%rowtype;
  v_approved_amount numeric(12, 2);
  v_has_pending boolean;
  v_has_review boolean;
  v_aggregate public.payment_attempt_status;
  v_item record;
  v_released boolean;
  v_can_re_reserve boolean := true;
  v_order_id uuid;
  v_previous_status public.payment_attempt_status;
  v_applied_status public.payment_attempt_status;
  v_effective_provider_status text;
  v_effective_provider_version bigint;
  v_effective_provider_updated_at timestamptz;
begin
  select pa.order_id into v_order_id from public.payment_attempts pa where pa.id = p_attempt_id;
  if not found then return 'manual_review'; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then return 'manual_review'; end if;
  select * into v_attempt from public.payment_attempts where id = p_attempt_id for update;
  if not found or v_attempt.order_id is distinct from v_order.id then return 'manual_review'; end if;
  v_previous_status := v_attempt.status;
  select coalesce(sum(pt.amount) filter (where pt.status = 'approved'), 0), coalesce(bool_or(pt.status = 'pending'), false), coalesce(bool_or(pt.status = 'manual_review' or pt.review_required), false)
    into v_approved_amount, v_has_pending, v_has_review from public.payment_transactions pt where pt.payment_attempt_id = v_attempt.id;
  if v_has_review or v_approved_amount > v_order.total then v_aggregate := 'manual_review';
  elsif v_approved_amount = v_order.total then v_aggregate := 'approved';
  elsif v_has_pending then v_aggregate := 'pending';
  elsif exists (select 1 from public.payment_transactions pt where pt.payment_attempt_id = v_attempt.id and pt.status in ('rejected', 'expired')) then v_aggregate := 'rejected';
  else v_aggregate := 'manual_review'; end if;
  if v_aggregate = 'approved' then
    select * into v_transaction from public.payment_transactions where payment_attempt_id = v_attempt.id and status = 'approved' order by updated_at desc, id desc limit 1;
    v_released := public.order_inventory_allocation_released(v_order.id);
    if v_released and (v_order.status = 'pending' or (v_order.status = 'cancelled' and v_order.payment_status <> 'paid' and v_attempt.status = 'expired')) then
      for v_item in select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi join public.products p on p.id = oi.product_id where oi.order_id = v_order.id order by oi.product_id for update of p loop
        if v_item.stock_quantity < v_item.quantity then v_can_re_reserve := false; end if;
      end loop;
      if not v_can_re_reserve then
        update public.payment_attempts set status = 'manual_review', provider_status = 'approved', provider_updated_at = v_transaction.provider_updated_at, provider_version = v_transaction.provider_version, last_error = 'Late approval could not be re-reserved: insufficient stock' where id = v_attempt.id;
        perform set_config('margarita.payment_late_approval_review', '1', true);
        update public.orders set status = 'pending', payment_status = 'paid' where id = v_order.id;
        perform set_config('margarita.payment_late_approval_review', '0', true);
        insert into public.audit_logs (action, entity_type, entity_id, metadata) values (case when v_previous_status is distinct from 'manual_review'::public.payment_attempt_status then 'payment_status_changed' else 'payment_provider_updated' end, 'payment_attempt', v_attempt.id,
          jsonb_build_object('description', 'Transaction aggregate resolved to manual review because inventory could not be re-reserved.', 'previous_status', v_previous_status::text, 'next_status', 'manual_review', 'provider_status', coalesce(v_transaction.provider_status, 'approved'), 'provider_version', v_transaction.provider_version, 'provider_updated_at', v_transaction.provider_updated_at));
        return 'manual_review';
      end if;
      perform set_config('margarita.payment_late_approval', '1', true);
      for v_item in select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi join public.products p on p.id = oi.product_id where oi.order_id = v_order.id order by oi.product_id for update of p loop
        insert into public.inventory_movements (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after, reason) values (v_item.product_id, v_order.id, 'payment_re_reserved', -v_item.quantity, v_item.stock_quantity, v_item.stock_quantity - v_item.quantity, 'late payment approval');
        update public.products set stock_quantity = stock_quantity - v_item.quantity where id = v_item.product_id;
      end loop;
      update public.orders set status = 'confirmed', payment_status = 'paid' where id = v_order.id;
      perform set_config('margarita.payment_late_approval', '0', true);
    elsif not v_released and v_order.status = 'pending' and v_order.payment_status <> 'paid'
      and v_attempt.reservation_expires_at <= statement_timestamp() then
      perform set_config('margarita.payment_late_approval', '1', true);
      update public.orders set status = 'confirmed', payment_status = 'paid' where id = v_order.id;
      perform set_config('margarita.payment_late_approval', '0', true);
    end if;
    perform set_config('margarita.payment_aggregate_transition', '1', true);
    update public.payment_attempts set provider_payment_id = v_transaction.provider_payment_id, provider_status = coalesce(v_transaction.provider_status, 'approved'), provider_updated_at = v_transaction.provider_updated_at, provider_version = v_transaction.provider_version, status = 'approved', last_error = null where id = v_attempt.id;
    v_applied_status := 'approved';
    v_effective_provider_status := coalesce(v_transaction.provider_status, 'approved'); v_effective_provider_version := v_transaction.provider_version; v_effective_provider_updated_at := v_transaction.provider_updated_at;
    update public.orders set payment_status = 'paid' where id = v_order.id and payment_status <> 'paid';
    perform set_config('margarita.payment_aggregate_transition', '0', true);
  else
    select * into v_transaction from public.payment_transactions where payment_attempt_id = v_attempt.id order by updated_at desc, id desc limit 1;
    perform set_config('margarita.payment_aggregate_transition', '1', true);
    update public.payment_attempts set status = v_aggregate, provider_payment_id = coalesce(v_transaction.provider_payment_id, provider_payment_id), provider_status = coalesce(v_transaction.provider_status, provider_status), provider_updated_at = coalesce(v_transaction.provider_updated_at, provider_updated_at), provider_version = coalesce(v_transaction.provider_version, provider_version), last_error = case when v_aggregate = 'manual_review' then coalesce(last_error, 'Payment transaction aggregate requires review') else null end where id = v_attempt.id and status <> 'approved';
    select status into v_applied_status from public.payment_attempts where id = v_attempt.id;
    v_effective_provider_status := coalesce(v_transaction.provider_status, v_attempt.provider_status); v_effective_provider_version := coalesce(v_transaction.provider_version, v_attempt.provider_version); v_effective_provider_updated_at := coalesce(v_transaction.provider_updated_at, v_attempt.provider_updated_at);
    if v_aggregate in ('pending', 'rejected') and v_order.payment_status <> 'paid' then update public.orders set payment_status = v_aggregate::text::public.payment_status where id = v_order.id; end if;
    perform set_config('margarita.payment_aggregate_transition', '0', true);
  end if;
  -- A definitive rejection that arrives after the reservation expired, once its stock was
  -- already released, cancels the order. No stock moves: the units were returned once.
  if v_aggregate = 'rejected'
    and v_order.status = 'pending'
    and v_order.payment_status <> 'paid'
    and v_order.reservation_expires_at is not null
    and v_order.reservation_expires_at <= statement_timestamp()
    and exists (select 1 from public.inventory_movements im where im.order_id = v_order.id and im.movement_type = 'payment_reservation_released')
    and not exists (select 1 from public.inventory_movements im where im.order_id = v_order.id and im.movement_type in ('order_cancelled', 'payment_re_reserved'))
  then
    update public.orders set status = 'cancelled', payment_status = 'rejected', reservation_expires_at = null, picked_up_at = null where id = v_order.id;
    insert into public.audit_logs (action, entity_type, entity_id, metadata) values ('order_cancelled', 'order', v_order.id,
      jsonb_build_object('description', 'Order cancelled automatically: the provider rejected the payment after the reservation expired and its stock was already released.'));
  end if;
  if v_previous_status is distinct from v_applied_status then
    insert into public.audit_logs (action, entity_type, entity_id, metadata) values ('payment_status_changed', 'payment_attempt', v_attempt.id,
      jsonb_build_object('description', format('Transaction aggregate changed payment attempt status from %s to %s.', v_previous_status::text, v_applied_status::text), 'previous_status', v_previous_status::text, 'next_status', v_applied_status::text, 'provider_status', v_effective_provider_status, 'provider_version', v_effective_provider_version, 'provider_updated_at', v_effective_provider_updated_at));
  else
    insert into public.audit_logs (action, entity_type, entity_id, metadata) values ('payment_provider_updated', 'payment_attempt', v_attempt.id,
      jsonb_build_object('description', 'Provider aggregate evidence updated; payment-attempt status was preserved.', 'previous_status', v_previous_status::text, 'next_status', v_applied_status::text, 'aggregate_status', v_aggregate::text, 'provider_status', v_effective_provider_status, 'provider_version', v_effective_provider_version, 'provider_updated_at', v_effective_provider_updated_at));
  end if;
  return v_aggregate;
end;
$function$;
