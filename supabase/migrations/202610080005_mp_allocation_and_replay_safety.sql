begin;

-- Allocation is the signed ledger balance, not the existence of an old release.
-- This also handles equal timestamps within a transaction without UUID ordering.
create or replace function public.order_inventory_allocation_released(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.inventory_movements
    where order_id = p_order_id
      and movement_type in ('order_created', 'order_cancelled', 'payment_reservation_released', 'payment_re_reserved')
    group by product_id
    having sum(quantity_delta) >= 0 and bool_or(quantity_delta > 0)
  );
$$;
revoke execute on function public.order_inventory_allocation_released(uuid) from public, anon, authenticated;
grant execute on function public.order_inventory_allocation_released(uuid) to service_role;

-- A definitive expiry and cancellation of its later re-allocation are separate
-- returns. The order lock and zero-balance cancellation trigger enforce exactly-once
-- returns per current allocation; the old lifetime-unique marker cannot model this.
drop index public.inventory_movements_order_cancelled_unique;
create index inventory_movements_order_cancelled_idx
  on public.inventory_movements(order_id, product_id)
  where movement_type = 'order_cancelled';

create or replace function public.ensure_cancelled_order_stock_restored()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' and exists (
    select 1 from public.order_items oi where oi.order_id = new.id
      and coalesce((
        select sum(im.quantity_delta) from public.inventory_movements im
        where im.order_id = new.id and im.product_id = oi.product_id
          and im.movement_type in ('order_created', 'order_cancelled', 'payment_reservation_released', 'payment_re_reserved')
      ), -oi.quantity) <> 0
  ) then
    raise exception using errcode = '23514', message = 'Order stock must be restored before cancellation';
  end if;
  return new;
end;
$$;

create or replace function public.cancel_order_with_stock(
  p_order_id uuid, p_actor_profile_id uuid, p_reason text,
  p_expected_updated_at timestamptz, p_confirm_manual_refund boolean
)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_allocated bigint;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'A cancellation reason is required';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then return false; end if;
  if v_order.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode = '40001', message = 'The order changed before cancellation';
  end if;
  if v_order.status = 'cancelled' then return false; end if;
  if v_order.status in ('picked_up', 'delivered') then
    raise exception using errcode = '23514', message = 'Fulfilled orders cannot be cancelled';
  end if;
  if v_order.payment_status = 'paid' and not p_confirm_manual_refund then
    raise exception using errcode = '23514', message = 'Paid orders require manual refund confirmation';
  end if;
  perform 1 from public.profiles where id = p_actor_profile_id and role = 'administrator' and is_active = true;
  if not found then raise exception using errcode = '42501', message = 'An active administrator is required'; end if;
  for v_item in
    select oi.product_id, oi.quantity, p.stock_quantity
    from public.order_items oi join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id order by oi.product_id for update of p
  loop
    select -coalesce(sum(quantity_delta), -v_item.quantity) into v_allocated
    from public.inventory_movements where order_id = p_order_id and product_id = v_item.product_id
      and movement_type in ('order_created', 'order_cancelled', 'payment_reservation_released', 'payment_re_reserved');
    if v_allocated < 0 or v_allocated > v_item.quantity then
      raise exception using errcode = '23514', message = 'Invalid inventory allocation balance';
    end if;
    if v_allocated > 0 then
      insert into public.inventory_movements
        (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after, reason, created_by)
      values (v_item.product_id, p_order_id, 'order_cancelled', v_allocated,
        v_item.stock_quantity, v_item.stock_quantity + v_allocated, btrim(p_reason), p_actor_profile_id);
      update public.products set stock_quantity = stock_quantity + v_allocated where id = v_item.product_id;
    end if;
  end loop;
  update public.orders set status = 'cancelled', picked_up_at = null where id = p_order_id;
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_actor_profile_id, 'order_cancelled', 'order', p_order_id, jsonb_build_object('reason', btrim(p_reason)));
  return true;
end;
$$;
revoke execute on function public.cancel_order_with_stock(uuid, uuid, text, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.cancel_order_with_stock(uuid, uuid, text, timestamptz, boolean) to service_role;

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

create or replace function public.transition_payment_attempt_v2(
  p_attempt_id uuid, p_provider_status text, p_provider_updated_at timestamptz,
  p_provider_version bigint, p_expected_status public.payment_attempt_status,
  p_expected_provider_version bigint, p_next_status public.payment_attempt_status
)
returns table (transition_applied boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_order_id uuid;
  v_item record;
  v_can_re_reserve boolean := true;
  v_was_released boolean := false;
  v_applied_status public.payment_attempt_status;
  v_description text;
begin
  select pa.order_id into v_order_id from public.payment_attempts pa where pa.id = p_attempt_id;
  if not found then transition_applied := false; return next; return; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then transition_applied := false; return next; return; end if;
  select * into v_attempt from public.payment_attempts where id = p_attempt_id for update;
  if not found or v_attempt.order_id is distinct from v_order.id
    or v_attempt.status <> p_expected_status
    or v_attempt.provider_version is distinct from p_expected_provider_version
    or (v_order.payment_status = 'paid' and p_next_status <> 'approved') then
    transition_applied := false; return next; return;
  end if;
  if p_next_status = 'approved' then
    v_was_released := public.order_inventory_allocation_released(v_order.id);
    if v_was_released and (v_order.status = 'pending' or (v_order.status = 'cancelled' and v_order.payment_status <> 'paid')) then
      for v_item in select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi join public.products p on p.id = oi.product_id where oi.order_id = v_order.id order by oi.product_id for update of p loop
        if v_item.stock_quantity < v_item.quantity then v_can_re_reserve := false; end if;
      end loop;
      if not v_can_re_reserve then
        update public.payment_attempts set status = 'manual_review', provider_status = p_provider_status, provider_updated_at = p_provider_updated_at, provider_version = p_provider_version, last_error = 'Late approval could not be re-reserved: insufficient stock' where id = v_attempt.id;
        perform set_config('margarita.payment_late_approval_review', '1', true);
        update public.orders set status = 'pending', payment_status = 'paid' where id = v_order.id;
        perform set_config('margarita.payment_late_approval_review', '0', true);
        insert into public.audit_logs (action, entity_type, entity_id, metadata) values (case when v_attempt.status is distinct from 'manual_review'::public.payment_attempt_status then 'payment_status_changed' else 'payment_provider_updated' end, 'payment_attempt', v_attempt.id,
          jsonb_build_object('description', 'Late provider approval requires manual review because inventory could not be re-reserved.', 'previous_status', v_attempt.status::text, 'next_status', 'manual_review', 'provider_status', p_provider_status, 'provider_version', p_provider_version, 'provider_updated_at', p_provider_updated_at));
        transition_applied := true; return next; return;
      end if;
      perform set_config('margarita.payment_late_approval', '1', true);
      for v_item in select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi join public.products p on p.id = oi.product_id where oi.order_id = v_order.id order by oi.product_id for update of p loop
        insert into public.inventory_movements (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after, reason) values (v_item.product_id, v_order.id, 'payment_re_reserved', -v_item.quantity, v_item.stock_quantity, v_item.stock_quantity - v_item.quantity, 'late payment approval');
        update public.products set stock_quantity = stock_quantity - v_item.quantity where id = v_item.product_id;
      end loop;
      update public.orders set status = 'confirmed', payment_status = 'paid' where id = v_order.id;
      perform set_config('margarita.payment_late_approval', '0', true);
    elsif not v_was_released and v_order.status = 'pending' and v_order.payment_status <> 'paid'
      and v_attempt.reservation_expires_at <= statement_timestamp() then
      perform set_config('margarita.payment_late_approval', '1', true);
      update public.orders set status = 'confirmed', payment_status = 'paid' where id = v_order.id;
      perform set_config('margarita.payment_late_approval', '0', true);
    end if;
  end if;
  update public.payment_attempts set provider_status = p_provider_status, provider_updated_at = p_provider_updated_at, provider_version = p_provider_version, status = p_next_status where id = v_attempt.id;
  v_applied_status := p_next_status;
  v_description := case when v_attempt.status is distinct from v_applied_status then format('Payment attempt status changed from %s to %s.', v_attempt.status::text, v_applied_status::text) else format('Provider information updated; payment attempt status remains %s.', v_applied_status::text) end;
  insert into public.audit_logs (action, entity_type, entity_id, metadata)
  values (case when v_attempt.status is distinct from v_applied_status then 'payment_status_changed' else 'payment_provider_updated' end, 'payment_attempt', v_attempt.id,
    jsonb_build_object('description', v_description, 'previous_status', v_attempt.status::text, 'next_status', v_applied_status::text, 'provider_status', p_provider_status, 'provider_version', p_provider_version, 'provider_updated_at', p_provider_updated_at));
  if p_next_status = 'approved' then
    perform set_config('margarita.payment_aggregate_transition', '1', true);
    update public.orders set payment_status = 'paid' where id = v_order.id and payment_status <> 'paid';
    perform set_config('margarita.payment_aggregate_transition', '0', true);
  elsif p_next_status in ('pending', 'rejected') and v_order.payment_status <> 'paid' then
    perform set_config('margarita.payment_aggregate_transition', '1', true);
    update public.orders set payment_status = p_next_status::text::public.payment_status where id = v_order.id and payment_status <> p_next_status::text::public.payment_status;
    perform set_config('margarita.payment_aggregate_transition', '0', true);
  end if;
  transition_applied := true; return next;
end;
$$;

create or replace function public.reconcile_payment_attempt_aggregate_v2(p_attempt_id uuid)
returns public.payment_attempt_status
language plpgsql security definer set search_path = ''
as $$
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
    if v_released and (v_order.status = 'pending' or (v_order.status = 'cancelled' and v_order.payment_status <> 'paid')) then
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
  if v_previous_status is distinct from v_applied_status then
    insert into public.audit_logs (action, entity_type, entity_id, metadata) values ('payment_status_changed', 'payment_attempt', v_attempt.id,
      jsonb_build_object('description', format('Transaction aggregate changed payment attempt status from %s to %s.', v_previous_status::text, v_applied_status::text), 'previous_status', v_previous_status::text, 'next_status', v_applied_status::text, 'provider_status', v_effective_provider_status, 'provider_version', v_effective_provider_version, 'provider_updated_at', v_effective_provider_updated_at));
  else
    insert into public.audit_logs (action, entity_type, entity_id, metadata) values ('payment_provider_updated', 'payment_attempt', v_attempt.id,
      jsonb_build_object('description', 'Provider aggregate evidence updated; payment-attempt status was preserved.', 'previous_status', v_previous_status::text, 'next_status', v_applied_status::text, 'aggregate_status', v_aggregate::text, 'provider_status', v_effective_provider_status, 'provider_version', v_effective_provider_version, 'provider_updated_at', v_effective_provider_updated_at));
  end if;
  return v_aggregate;
end;
$$;
revoke execute on function public.transition_payment_attempt_v2(uuid, text, timestamptz, bigint, public.payment_attempt_status, bigint, public.payment_attempt_status) from public, anon, authenticated;
grant execute on function public.transition_payment_attempt_v2(uuid, text, timestamptz, bigint, public.payment_attempt_status, bigint, public.payment_attempt_status) to service_role;
revoke execute on function public.reconcile_payment_attempt_aggregate_v2(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_payment_attempt_aggregate_v2(uuid) to service_role;

commit;
