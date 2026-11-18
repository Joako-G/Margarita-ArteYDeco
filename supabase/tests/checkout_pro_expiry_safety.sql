begin;

set local role service_role;

do $$
declare
  v_session uuid := extensions.gen_random_uuid();
  v_category uuid := extensions.gen_random_uuid();
  v_product uuid := extensions.gen_random_uuid();
  v_run_id text := replace(extensions.gen_random_uuid()::text, '-', '');
  v_phone_prefix text := '351' || lpad((floor(random() * 100000000))::bigint::text, 8, '0');
  v_ambiguous_order uuid;
  v_ambiguous_attempt uuid;
  v_late_no_stock_order uuid;
  v_late_no_stock_attempt uuid;
  v_definitive_order uuid;
  v_definitive_attempt uuid;
  v_no_payment_order uuid;
  v_no_payment_attempt uuid;
  v_initial_stock integer;
  v_aggregate_result text;
  v_order_status text;
  v_order_payment_status text;
  v_attempt_status text;
  v_actual_stock integer;
  v_movement_count integer;
  v_examined integer;
  v_released integer;
  v_total_examined integer := 0;
  v_total_released integer := 0;
  v_fixture_order_id uuid;
  v_actor uuid;
  v_replay_status public.order_status;
  v_expected_version bigint;
  v_expected_attempt_status public.payment_attempt_status;
  v_updated_at timestamptz;
  v_cancel_result boolean;
begin
  select id into v_actor from public.profiles where role = 'administrator' and is_active;
  if v_actor is null then
    if exists (select 1 from public.profiles) then
      raise exception 'Expiry safety requires an active administrator for cancellation checks';
    end if;
    v_actor := extensions.gen_random_uuid();
    set local role postgres;
    insert into auth.users (id, email) values (v_actor, 'expiry-' || v_run_id || '@example.test');
    insert into public.profiles (id, email, full_name)
    values (v_actor, 'expiry-' || v_run_id || '@example.test', 'Expiry Safety Administrator');
    set local role service_role;
  end if;
  insert into public.guest_sessions (id, token_hash, expires_at)
  values (v_session, decode(v_run_id || v_run_id, 'hex'), now() + interval '1 day');
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'Expiry Safety Test ' || v_run_id, 'expiry-safety-test-' || v_run_id, 'test/expiry.webp', 'art');
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  values (v_product, v_category, 'Expiry Safety Product ' || v_run_id, 'expiry-safety-product-' || v_run_id, 100, 4, 'test/expiry-product.webp');

  select stock_quantity into v_initial_stock from public.products where id = v_product;

  select order_id, attempt_id into v_ambiguous_order, v_ambiguous_attempt
  from public.create_order_with_payment_v2(
    v_session, 'Expiry', 'Ambiguous', v_phone_prefix || '1', v_phone_prefix || '1',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'expiry-safety-' || v_run_id || '-001', repeat('e', 64), 'sandbox', 'pickup'
  );
  select order_id, attempt_id into v_late_no_stock_order, v_late_no_stock_attempt
  from public.create_order_with_payment_v2(
    v_session, 'Expiry', 'Late No Stock', v_phone_prefix || '2', v_phone_prefix || '2',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'expiry-safety-' || v_run_id || '-003', repeat('d', 64), 'sandbox', 'shipping', 'Test address 123'
  );
  select order_id, attempt_id into v_no_payment_order, v_no_payment_attempt
  from public.create_order_with_payment_v2(
    v_session, 'Expiry', 'No Payment', v_phone_prefix || '3', v_phone_prefix || '3',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'expiry-safety-' || v_run_id || '-002', repeat('f', 64), 'sandbox', 'pickup'
  );
  select order_id, attempt_id into v_definitive_order, v_definitive_attempt
  from public.create_order_with_payment_v2(
    v_session, 'Expiry', 'Definitive Rejection', v_phone_prefix || '4', v_phone_prefix || '4',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'expiry-safety-' || v_run_id || '-004', repeat('c', 64), 'sandbox', 'pickup'
  );

  set local role postgres;
  set local session_replication_role = replica;
  update public.orders
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second'
  where id in (v_ambiguous_order, v_late_no_stock_order, v_no_payment_order, v_definitive_order);
  update public.payment_attempts
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second',
      provider_status = 'not_found'
  where id = v_no_payment_attempt;
  update public.payment_attempts
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second',
      status = 'rejected', provider_status = 'rejected', provider_payment_id = 'definitively-rejected-' || v_run_id
  where id = v_definitive_attempt;
  update public.payment_attempts
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second',
      status = 'pending', provider_status = 'pending', provider_payment_id = 'unknown-provider-' || v_run_id
  where id = v_ambiguous_attempt;
  set local session_replication_role = origin;
  set local role service_role;

  -- Call the order-scoped worker helper only for fixtures created by this test.
  -- Do not run the global batch RPC: a shared database may contain unrelated
  -- expired orders that must not be locked or mutated by this fixture.
  for v_fixture_order_id in
    select fixture.order_id
    from unnest(array[v_ambiguous_order, v_late_no_stock_order, v_no_payment_order, v_definitive_order]) as fixture(order_id)
  loop
    select examined_count, released_count into v_examined, v_released
    from public.release_expired_payment_reservation_for_order_v2(v_fixture_order_id);
    if v_examined <> 1 or v_released <> 1 then
      raise exception 'Expected fixture reservation % to be released exactly once', v_fixture_order_id;
    end if;
    v_total_examined := v_total_examined + v_examined;
    v_total_released := v_total_released + v_released;
  end loop;
  if v_total_examined <> 4 or v_total_released <> 4 then
    raise exception 'Expected all four test-owned reservations to be released exactly once';
  end if;
  if (select stock_quantity from public.products where id = v_product) <> v_initial_stock then
    raise exception 'Expiry did not restore the reserved stock';
  end if;
  if (select count(*) from public.inventory_movements where order_id in (v_ambiguous_order, v_late_no_stock_order) and movement_type = 'payment_reservation_released') <> 2
    or (select count(*) from public.inventory_movements where order_id in (v_no_payment_order, v_definitive_order) and movement_type = 'order_cancelled') <> 2 then
    raise exception 'Expiry did not write the expected distinct release movements';
  end if;
  if (select status from public.orders where id = v_ambiguous_order) <> 'pending'
    or (select status from public.orders where id = v_late_no_stock_order) <> 'pending'
    or (select status from public.orders where id = v_no_payment_order) <> 'cancelled'
    or (select status from public.orders where id = v_definitive_order) <> 'cancelled' then
    raise exception 'Expiry did not distinguish unresolved orders from definitive no-payment';
  end if;
  if (select payment_status from public.orders where id = v_ambiguous_order) <> 'pending'
    or (select status from public.payment_attempts where id = v_ambiguous_attempt) <> 'manual_review'
    or (select payment_status from public.orders where id = v_late_no_stock_order) <> 'pending'
    or (select status from public.payment_attempts where id = v_late_no_stock_attempt) <> 'manual_review' then
    raise exception 'Unknown provider payment was not retained as pending manual review';
  end if;
  if (select payment_status from public.orders where id = v_no_payment_order) <> 'rejected'
    or (select status from public.payment_attempts where id = v_no_payment_attempt) <> 'expired'
    or (select payment_status from public.orders where id = v_definitive_order) <> 'rejected'
    or (select status from public.payment_attempts where id = v_definitive_attempt) <> 'expired' then
    raise exception 'No-payment expiry did not follow the cancellation policy';
  end if;

  v_total_examined := 0;
  v_total_released := 0;
  for v_fixture_order_id in
    select fixture.order_id
    from unnest(array[v_ambiguous_order, v_late_no_stock_order, v_no_payment_order, v_definitive_order]) as fixture(order_id)
  loop
    select examined_count, released_count into v_examined, v_released
    from public.release_expired_payment_reservation_for_order_v2(v_fixture_order_id);
    if v_examined <> 0 or v_released <> 0 then
      raise exception 'Repeated expiry helper call changed fixture %', v_fixture_order_id;
    end if;
    v_total_examined := v_total_examined + v_examined;
    v_total_released := v_total_released + v_released;
  end loop;
  if v_total_examined <> 0 or v_total_released <> 0
    or (select stock_quantity from public.products where id = v_product) <> v_initial_stock
    or (select count(*) from public.inventory_movements where order_id in (v_ambiguous_order, v_late_no_stock_order) and movement_type = 'payment_reservation_released') <> 2
    or (select count(*) from public.inventory_movements where order_id in (v_no_payment_order, v_definitive_order) and movement_type = 'order_cancelled') <> 2 then
    raise exception 'Repeated expiry processing duplicated stock restoration';
  end if;

  begin
    select updated_at into v_updated_at from public.orders where id = v_late_no_stock_order;
    v_cancel_result := public.cancel_order_with_stock(v_late_no_stock_order, v_actor, 'Cancel unresolved released reservation', v_updated_at, false);
    if not v_cancel_result or (select stock_quantity from public.products where id = v_product) <> v_initial_stock
      or exists (select 1 from public.inventory_movements where order_id = v_late_no_stock_order and movement_type = 'order_cancelled') then
      raise exception 'Unresolved cancellation returned an already released reservation';
    end if;
    raise exception using errcode = 'P0002', message = 'Rollback unresolved cancellation scenario';
  exception when no_data_found then null;
  end;

  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version
  ) values (
    v_ambiguous_attempt, 'sandbox', 'expiry-late-approved-' || v_run_id, 100, 'ARS',
    'debit_card', 'approved', 'approved', null
  );
  select public.reconcile_payment_attempt_aggregate_v2(v_ambiguous_attempt)::text
  into v_aggregate_result;
  select (select status::text from public.orders where id = v_ambiguous_order),
         (select payment_status::text from public.orders where id = v_ambiguous_order),
         (select status::text from public.payment_attempts where id = v_ambiguous_attempt),
         (select stock_quantity from public.products where id = v_product),
         (select count(*) from public.inventory_movements
          where order_id = v_ambiguous_order and movement_type = 'payment_re_reserved')
  into v_order_status, v_order_payment_status, v_attempt_status, v_actual_stock, v_movement_count;
  if v_aggregate_result is distinct from 'approved'
    or v_order_status is distinct from 'confirmed'
    or v_order_payment_status is distinct from 'paid'
    or v_attempt_status is distinct from 'approved'
    or v_actual_stock is distinct from v_initial_stock - 1
    or v_movement_count <> 1 then
    raise exception 'Late approval with available stock did not re-reserve and confirm exactly once';
  end if;

  select public.reconcile_payment_attempt_aggregate_v2(v_ambiguous_attempt)::text
  into v_aggregate_result;
  select (select status::text from public.orders where id = v_ambiguous_order),
         (select payment_status::text from public.orders where id = v_ambiguous_order),
         (select status::text from public.payment_attempts where id = v_ambiguous_attempt),
         (select stock_quantity from public.products where id = v_product),
         (select count(*) from public.inventory_movements
          where order_id = v_ambiguous_order and movement_type = 'payment_re_reserved')
  into v_order_status, v_order_payment_status, v_attempt_status, v_actual_stock, v_movement_count;
  if v_aggregate_result is distinct from 'approved'
    or v_order_status is distinct from 'confirmed'
    or v_order_payment_status is distinct from 'paid'
    or v_attempt_status is distinct from 'approved'
    or v_actual_stock is distinct from v_initial_stock - 1
    or v_movement_count <> 1 then
    raise exception 'Repeated late approval changed approved state or duplicated the stock decrement';
  end if;

  update public.products set stock_quantity = 0 where id = v_product;
  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version
  ) values (
    v_late_no_stock_attempt, 'sandbox', 'expiry-late-approved-no-stock-' || v_run_id, 100, 'ARS',
    'debit_card', 'approved', 'approved', null
  );
  select public.reconcile_payment_attempt_aggregate_v2(v_late_no_stock_attempt)::text
  into v_aggregate_result;
  select (select status::text from public.orders where id = v_late_no_stock_order),
         (select payment_status::text from public.orders where id = v_late_no_stock_order),
         (select status::text from public.payment_attempts where id = v_late_no_stock_attempt),
         (select stock_quantity from public.products where id = v_product),
         (select count(*) from public.inventory_movements
          where order_id = v_late_no_stock_order and movement_type = 'payment_re_reserved')
  into v_order_status, v_order_payment_status, v_attempt_status, v_actual_stock, v_movement_count;
  if v_aggregate_result is distinct from 'manual_review'
    or v_order_status is distinct from 'pending'
    or v_order_payment_status is distinct from 'paid'
    or v_attempt_status is distinct from 'manual_review'
    or v_actual_stock is distinct from 0
    or v_movement_count <> 0 then
    raise exception 'Late approval without stock was not recorded as paid and pending for owner action';
  end if;

  select public.reconcile_payment_attempt_aggregate_v2(v_late_no_stock_attempt)::text
  into v_aggregate_result;
  select (select status::text from public.orders where id = v_late_no_stock_order),
         (select payment_status::text from public.orders where id = v_late_no_stock_order),
         (select status::text from public.payment_attempts where id = v_late_no_stock_attempt),
         (select stock_quantity from public.products where id = v_product),
         (select count(*) from public.inventory_movements
          where order_id = v_late_no_stock_order and movement_type = 'payment_re_reserved')
  into v_order_status, v_order_payment_status, v_attempt_status, v_actual_stock, v_movement_count;
  if v_aggregate_result is distinct from 'manual_review'
    or v_order_status is distinct from 'pending'
    or v_order_payment_status is distinct from 'paid'
    or v_attempt_status is distinct from 'manual_review'
    or v_actual_stock is distinct from 0
    or v_movement_count <> 0 then
    raise exception 'Repeated late approval without stock changed manual-review state or reserved unavailable stock';
  end if;

  -- No stock means no confirmation, including a direct owner update.
  set local role postgres;
  begin
    update public.orders set status = 'confirmed' where id = v_late_no_stock_order;
    raise exception 'Released paid inventory was allowed into fulfillment';
  exception when check_violation then null;
  end;
  set local role service_role;

  -- Check cancellation in a subtransaction, then roll it back to test recovery
  -- of this same insufficient-stock allocation after stock becomes available.
  begin
    select updated_at into v_updated_at from public.orders where id = v_late_no_stock_order;
    v_cancel_result := public.cancel_order_with_stock(v_late_no_stock_order, v_actor, 'Unresolved allocation cancellation', v_updated_at, true);
    if not v_cancel_result or (select stock_quantity from public.products where id = v_product) <> 0
      or exists (select 1 from public.inventory_movements where order_id = v_late_no_stock_order and movement_type = 'order_cancelled') then
      raise exception 'Cancellation returned an already released allocation twice';
    end if;
    raise exception using errcode = 'P0002', message = 'Rollback cancellation scenario';
  exception when no_data_found then null;
  end;

  -- A null provider version must not be used as a replay detector. Both RPC
  -- entry points preserve fulfillment and inventory after the deadline.
  foreach v_replay_status in array array['preparing', 'ready', 'picked_up']::public.order_status[] loop
    set local role postgres;
    update public.orders set status = v_replay_status,
      picked_up_at = case when v_replay_status = 'picked_up' then now() else null end
    where id = v_ambiguous_order;
    set local role service_role;
    perform public.reconcile_payment_attempt_aggregate_v2(v_ambiguous_attempt);
    select status, provider_version into v_expected_attempt_status, v_expected_version
    from public.payment_attempts where id = v_ambiguous_attempt;
    perform public.transition_payment_attempt_v2(v_ambiguous_attempt, 'approved', now(), null,
      v_expected_attempt_status, v_expected_version, 'approved');
    if (select status from public.orders where id = v_ambiguous_order) <> v_replay_status
      or (select stock_quantity from public.products where id = v_product) <> 0
      or (select count(*) from public.inventory_movements where order_id = v_ambiguous_order and movement_type = 'payment_re_reserved') <> 1 then
      raise exception 'Approved replay regressed pickup fulfillment % or inventory', v_replay_status;
    end if;
    if v_replay_status = 'picked_up' then
      set local role postgres;
      perform set_config('margarita.payment_late_approval', '1', true);
      begin
        update public.orders set status = 'confirmed', picked_up_at = null where id = v_ambiguous_order;
        raise exception 'Late-approval guard reopened a completed pickup';
      exception when check_violation then null;
      end;
      perform set_config('margarita.payment_late_approval', '0', true);
      set local role service_role;
    end if;
  end loop;

  update public.products set stock_quantity = 3 where id = v_product;
  v_aggregate_result := public.reconcile_payment_attempt_aggregate_v2(v_late_no_stock_attempt)::text;
  if v_aggregate_result <> 'approved' or (select status from public.orders where id = v_late_no_stock_order) <> 'confirmed'
    or (select stock_quantity from public.products where id = v_product) <> 2 then
    raise exception 'Later stock availability did not recover the released paid allocation';
  end if;
  foreach v_replay_status in array array['preparing', 'ready', 'delivered']::public.order_status[] loop
    set local role postgres;
    update public.orders set status = v_replay_status,
      delivered_at = case when v_replay_status = 'delivered' then now() else null end
    where id = v_late_no_stock_order;
    set local role service_role;
    perform public.reconcile_payment_attempt_aggregate_v2(v_late_no_stock_attempt);
    select status, provider_version into v_expected_attempt_status, v_expected_version
    from public.payment_attempts where id = v_late_no_stock_attempt;
    perform public.transition_payment_attempt_v2(v_late_no_stock_attempt, 'approved', now(), null,
      v_expected_attempt_status, v_expected_version, 'approved');
    if (select status from public.orders where id = v_late_no_stock_order) <> v_replay_status
      or (select stock_quantity from public.products where id = v_product) <> 2
      or (select count(*) from public.inventory_movements where order_id = v_late_no_stock_order and movement_type = 'payment_re_reserved') <> 1 then
      raise exception 'Approved replay regressed shipping fulfillment % or inventory', v_replay_status;
    end if;
    if v_replay_status = 'delivered' then
      set local role postgres;
      perform set_config('margarita.payment_late_approval', '1', true);
      begin
        update public.orders set status = 'confirmed', delivered_at = null where id = v_late_no_stock_order;
        raise exception 'Late-approval guard reopened a completed delivery';
      exception when check_violation then null;
      end;
      perform set_config('margarita.payment_late_approval', '0', true);
      set local role service_role;
    end if;
  end loop;

  -- Definitive expiry already wrote order_cancelled. Its later allocation can
  -- be cancelled once, producing a second legitimate return for that product.
  select status, provider_version into v_expected_attempt_status, v_expected_version
  from public.payment_attempts where id = v_definitive_attempt;
  perform public.transition_payment_attempt_v2(v_definitive_attempt, 'approved', now(), null,
    v_expected_attempt_status, v_expected_version, 'approved');
  if (select stock_quantity from public.products where id = v_product) <> 1 then
    raise exception 'Direct late approval did not reserve the definitive-expiry allocation';
  end if;
  select updated_at into v_updated_at from public.orders where id = v_definitive_order;
  v_cancel_result := public.cancel_order_with_stock(v_definitive_order, v_actor, 'Cancel re-reserved allocation', v_updated_at, true);
  if not v_cancel_result or (select stock_quantity from public.products where id = v_product) <> 2
    or (select count(*) from public.inventory_movements where order_id = v_definitive_order and movement_type = 'order_cancelled') <> 2 then
    raise exception 'Cancellation did not return the new allocation exactly once';
  end if;
  select updated_at into v_updated_at from public.orders where id = v_definitive_order;
  v_cancel_result := public.cancel_order_with_stock(v_definitive_order, v_actor, 'Repeated cancellation', v_updated_at, true);
  select status, provider_version into v_expected_attempt_status, v_expected_version
  from public.payment_attempts where id = v_definitive_attempt;
  perform public.transition_payment_attempt_v2(v_definitive_attempt, 'approved', now(), null,
    v_expected_attempt_status, v_expected_version, 'approved');
  if v_cancel_result or (select status from public.orders where id = v_definitive_order) <> 'cancelled'
    or (select stock_quantity from public.products where id = v_product) <> 2 then
    raise exception 'Paid cancellation was reopened or returned stock twice';
  end if;
  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version
  ) values (v_definitive_attempt, 'sandbox', 'cancelled-approved-replay-' || v_run_id,
    100, 'ARS', 'debit_card', 'approved', 'approved', null);
  perform public.reconcile_payment_attempt_aggregate_v2(v_definitive_attempt);
  if (select status from public.orders where id = v_definitive_order) <> 'cancelled'
    or (select stock_quantity from public.products where id = v_product) <> 2
    or (select count(*) from public.inventory_movements where order_id = v_definitive_order and movement_type = 'order_cancelled') <> 2 then
    raise exception 'Aggregate approval replay reopened a paid cancellation or changed inventory';
  end if;
end;
$$;

rollback;
