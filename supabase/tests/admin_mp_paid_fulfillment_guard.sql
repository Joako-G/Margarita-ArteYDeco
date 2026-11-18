begin;

insert into public.settings (
  business_name, whatsapp, address, maps_url, business_hours,
  transfer_alias, transfer_cbu, bank_name
) values (
  'Payment Guard Test', '5493515550000', 'Test address',
  'https://maps.google.com/test', 'Mon-Fri', 'test.alias',
  '1234567890123456789012', 'Test bank'
) on conflict (singleton_key) do nothing;

set local role service_role;

do $$
declare
  v_run_id text := replace(extensions.gen_random_uuid()::text, '-', '');
  v_session uuid := extensions.gen_random_uuid();
  v_category uuid := extensions.gen_random_uuid();
  v_product uuid := extensions.gen_random_uuid();
  v_actor uuid;
  v_mp_order uuid;
  v_mp_attempt uuid;
  v_late_order uuid;
  v_late_attempt uuid;
  v_cash_order uuid;
  v_transfer_order uuid;
  v_updated_at timestamptz;
  v_examined integer;
  v_released integer;
  v_result public.payment_attempt_status;
  v_order_status public.order_status;
  v_payment_status public.payment_status;
  v_allocation_released boolean;
  v_re_reserve_count bigint;
  v_approved_amount numeric(12, 2);
begin
  select id into v_actor from public.profiles where role = 'administrator' and is_active;
  if v_actor is null then
    if exists (select 1 from public.profiles) then
      raise exception 'Payment guard fixture requires an active administrator';
    end if;
    v_actor := extensions.gen_random_uuid();
    set local role postgres;
    insert into auth.users (id, email) values (v_actor, 'payment-guard-' || v_run_id || '@example.test');
    insert into public.profiles (id, email, full_name)
    values (v_actor, 'payment-guard-' || v_run_id || '@example.test', 'Payment Guard Administrator');
    set local role service_role;
  end if;

  insert into public.guest_sessions (id, token_hash, expires_at)
  values (v_session, decode(v_run_id || v_run_id, 'hex'), statement_timestamp() + interval '1 day');
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'Payment Guard ' || v_run_id, 'payment-guard-' || v_run_id, 'test/guard.webp', 'art');
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  values (v_product, v_category, 'Payment Guard Product ' || v_run_id, 'payment-guard-product-' || v_run_id, 100, 8, 'test/product.webp');

  select order_id, attempt_id into v_mp_order, v_mp_attempt
  from public.create_order_with_payment_v2(
    v_session, 'Payment', 'Guard', '35155590001', '35155590001',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'guard-' || v_run_id || '-001', repeat('a', 64), 'sandbox', 'pickup'
  );

  -- Both direct SQL and the admin RPC must reject unpaid MP with held stock.
  set local role postgres;
  begin
    update public.orders set status = 'confirmed' where id = v_mp_order;
    raise exception 'Unpaid MP order was confirmed by direct SQL';
  exception when check_violation then null;
  end;
  set local role service_role;
  select updated_at into v_updated_at from public.orders where id = v_mp_order;
  begin
    perform public.transition_order_status(v_mp_order, 'confirmed', 'pending', v_actor, v_updated_at);
    raise exception 'Unpaid MP order was confirmed through the admin RPC';
  exception when check_violation then null;
  end;
  if (select status from public.orders where id = v_mp_order) <> 'pending' then
    raise exception 'Rejected MP transitions changed the order';
  end if;

  -- Set only this test-owned order's historical status to probe every later edge.
  set local role postgres;
  set local session_replication_role = replica;
  update public.orders set status = 'confirmed' where id = v_mp_order;
  set local session_replication_role = origin;
  begin
    update public.orders set status = 'preparing' where id = v_mp_order;
    raise exception 'Unpaid MP order started preparation';
  exception when check_violation then null;
  end;
  set local session_replication_role = replica;
  update public.orders set status = 'preparing' where id = v_mp_order;
  set local session_replication_role = origin;
  begin
    update public.orders set status = 'ready' where id = v_mp_order;
    raise exception 'Unpaid MP order became ready';
  exception when check_violation then null;
  end;
  set local session_replication_role = replica;
  update public.orders set status = 'ready' where id = v_mp_order;
  set local session_replication_role = origin;
  begin
    update public.orders set status = 'picked_up', picked_up_at = statement_timestamp()
    where id = v_mp_order;
    raise exception 'Unpaid MP order was picked up';
  exception when check_violation then null;
  end;
  set local session_replication_role = replica;
  update public.orders set status = 'pending' where id = v_mp_order;
  set local session_replication_role = origin;
  set local role service_role;

  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status
  ) values (v_mp_attempt, 'sandbox', 'guard-paid-' || v_run_id, 100, 'ARS', 'debit_card', 'approved', 'approved');
  select coalesce(sum(amount), 0) into v_approved_amount
  from public.payment_transactions where payment_attempt_id = v_mp_attempt and status = 'approved';
  select status, payment_status, public.order_inventory_allocation_released(id)
  into v_order_status, v_payment_status, v_allocation_released
  from public.orders where id = v_mp_order;
  if v_approved_amount is distinct from 100
    or v_order_status is distinct from 'pending' or v_payment_status is distinct from 'pending'
    or v_allocation_released is distinct from false then
    raise exception 'The approved-total MP fixture must remain persisted unpaid with held stock';
  end if;
  set local role postgres;
  begin
    update public.orders set status = 'confirmed', payment_status = 'paid' where id = v_mp_order;
    raise exception 'Unreconciled MP order was paid and confirmed by direct SQL';
  exception when check_violation then null;
  end;
  set local role service_role;
  select updated_at into v_updated_at from public.orders where id = v_mp_order;
  begin
    perform public.transition_order_status(v_mp_order, 'confirmed', 'paid', v_actor, v_updated_at);
    raise exception 'Unreconciled MP order was paid and confirmed through the admin RPC';
  exception when check_violation then null;
  end;
  begin
    perform public.transition_order_status(v_mp_order, 'pending', 'paid', v_actor, v_updated_at);
    raise exception 'Admin RPC marked an unreconciled MP payment as paid';
  exception when check_violation then null;
  end;
  select status, payment_status into v_order_status, v_payment_status
  from public.orders where id = v_mp_order;
  if v_order_status is distinct from 'pending' or v_payment_status is distinct from 'pending' then
    raise exception 'Unreconciled MP guard changed persisted order state';
  end if;

  select public.reconcile_payment_attempt_aggregate_v2(v_mp_attempt) into v_result;
  select status, payment_status, public.order_inventory_allocation_released(id)
  into v_order_status, v_payment_status, v_allocation_released
  from public.orders where id = v_mp_order;
  select count(*) into v_re_reserve_count from public.inventory_movements
    where order_id = v_mp_order and movement_type = 'payment_re_reserved';
  if v_result is distinct from 'approved'
    or v_payment_status is distinct from 'paid'
    or v_order_status is distinct from 'pending'
    or v_allocation_released is distinct from false
    or v_re_reserve_count <> 0 then
    raise exception 'On-time MP payment did not leave owner confirmation available';
  end if;
  select updated_at into v_updated_at from public.orders where id = v_mp_order;
  if not public.transition_order_status(v_mp_order, 'confirmed', 'paid', v_actor, v_updated_at) then
    raise exception 'Paid MP order could not be confirmed by its owner';
  end if;
  set local role postgres;
  update public.orders set status = 'preparing' where id = v_mp_order;
  update public.orders set status = 'ready' where id = v_mp_order;
  update public.orders set status = 'picked_up', picked_up_at = statement_timestamp() where id = v_mp_order;
  if (select status from public.orders where id = v_mp_order) <> 'picked_up' then
    raise exception 'Paid MP fulfillment progression failed';
  end if;
  set local role service_role;

  select order_id, attempt_id into v_late_order, v_late_attempt
  from public.create_order_with_payment_v2(
    v_session, 'Late', 'Approval', '35155590002', '35155590002',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'guard-' || v_run_id || '-002', repeat('b', 64), 'sandbox', 'shipping', 'Test delivery address 123'
  );
  set local role postgres;
  set local session_replication_role = replica;
  update public.orders set status = 'ready' where id = v_late_order;
  set local session_replication_role = origin;
  begin
    update public.orders set status = 'delivered', delivered_at = statement_timestamp()
    where id = v_late_order;
    raise exception 'Unpaid MP shipping order was delivered';
  exception when check_violation then null;
  end;
  set local session_replication_role = replica;
  update public.orders set created_at = statement_timestamp() - interval '2 minutes',
    status = 'pending', reservation_expires_at = statement_timestamp() - interval '1 second' where id = v_late_order;
  update public.payment_attempts set created_at = statement_timestamp() - interval '2 minutes',
    reservation_expires_at = statement_timestamp() - interval '1 second',
    provider_status = 'pending', provider_payment_id = 'guard-late-' || v_run_id
    where id = v_late_attempt;
  set local session_replication_role = origin;
  set local role service_role;
  select examined_count, released_count into v_examined, v_released
  from public.release_expired_payment_reservation_for_order_v2(v_late_order);
  if v_examined <> 1 or v_released <> 1 then
    raise exception 'Late MP fixture was not released for review';
  end if;
  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status
  ) values (v_late_attempt, 'sandbox', 'guard-late-paid-' || v_run_id, 100, 'ARS', 'debit_card', 'approved', 'approved');
  select public.reconcile_payment_attempt_aggregate_v2(v_late_attempt) into v_result;
  select status, payment_status, public.order_inventory_allocation_released(id)
  into v_order_status, v_payment_status, v_allocation_released
  from public.orders where id = v_late_order;
  select count(*) into v_re_reserve_count from public.inventory_movements
    where order_id = v_late_order and movement_type = 'payment_re_reserved';
  if v_result is distinct from 'approved'
    or v_order_status is distinct from 'confirmed'
    or v_payment_status is distinct from 'paid'
    or v_allocation_released is distinct from false
    or v_re_reserve_count <> 1 then
    raise exception 'Late paid MP approval failed to re-reserve and auto-confirm atomically';
  end if;

  select order_id into v_cash_order from public.create_order_with_stock(
    v_session, 'Cash', 'Guard', '35155590003', '35155590003', 'cash',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'guard-' || v_run_id || '-003', repeat('c', 64), 'pickup'
  );
  select order_id into v_transfer_order from public.create_order_with_stock(
    v_session, 'Transfer', 'Guard', '35155590004', '35155590004', 'bank_transfer',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'guard-' || v_run_id || '-004', repeat('d', 64), 'pickup'
  );
  set local role postgres;
  update public.orders set status = 'confirmed' where id in (v_cash_order, v_transfer_order);
  if (select count(*) from public.orders where id in (v_cash_order, v_transfer_order)
      and status = 'confirmed' and payment_status = 'pending') <> 2 then
    raise exception 'Cash or transfer confirmation changed under the MP-only guard';
  end if;
  set local role service_role;
end;
$$;

rollback;
