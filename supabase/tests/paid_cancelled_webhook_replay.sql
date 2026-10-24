begin;

set local role service_role;

do $$
declare
  v_session uuid := extensions.gen_random_uuid();
  v_category uuid := extensions.gen_random_uuid();
  v_product uuid := extensions.gen_random_uuid();
  v_run_id text := replace(extensions.gen_random_uuid()::text, '-', '');
  v_phone text := '356' || lpad((floor(random() * 100000000))::bigint::text, 8, '0');
  v_order uuid;
  v_attempt uuid;
  v_actor uuid;
  v_initial_stock integer;
  v_updated_at timestamptz;
  v_cancel_result boolean;
  v_status public.payment_attempt_status;
  v_version bigint;
  v_pass integer;
begin
  select id into v_actor from public.profiles where role = 'administrator' and is_active;
  if v_actor is null then
    if exists (select 1 from public.profiles) then
      raise exception 'Paid cancellation replay test requires an active administrator';
    end if;
    v_actor := extensions.gen_random_uuid();
    set local role postgres;
    insert into auth.users (id, email) values (v_actor, 'paidcancel-' || v_run_id || '@example.test');
    insert into public.profiles (id, email, full_name)
    values (v_actor, 'paidcancel-' || v_run_id || '@example.test', 'Paid Cancel Administrator');
    set local role service_role;
  end if;
  insert into public.guest_sessions (id, token_hash, expires_at)
  values (v_session, decode(v_run_id || v_run_id, 'hex'), now() + interval '1 day');
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'Paid Cancel Test ' || v_run_id, 'paid-cancel-test-' || v_run_id, 'test/paid-cancel.webp', 'art');
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  values (v_product, v_category, 'Paid Cancel Product ' || v_run_id, 'paid-cancel-product-' || v_run_id, 100, 5, 'test/paid-cancel-product.webp');
  select stock_quantity into v_initial_stock from public.products where id = v_product;

  -- A plain on-time order: the reservation is still valid and the payment arrives in time.
  select order_id, attempt_id into v_order, v_attempt
  from public.create_order_with_payment_v2(
    v_session, 'Paid', 'Cancel', v_phone, v_phone,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 2)),
    'paid-cancel-' || v_run_id, repeat('9', 64), 'sandbox', 'pickup'
  );
  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version
  ) values (v_attempt, 'sandbox', 'paid-cancel-approved-' || v_run_id, 200, 'ARS',
    'debit_card', 'approved', 'approved', null);
  perform public.reconcile_payment_attempt_aggregate_v2(v_attempt);
  if (select payment_status::text from public.orders where id = v_order) is distinct from 'paid'
    or (select status::text from public.orders where id = v_order) is distinct from 'pending'
    or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock - 2 then
    raise exception 'On-time approval did not leave the order pending and paid with held stock';
  end if;

  -- The administrator cancels the paid order: stock returns once and payment stays paid.
  select updated_at into v_updated_at from public.orders where id = v_order;
  v_cancel_result := public.cancel_order_with_stock(v_order, v_actor, 'Paid order cancelled by owner', v_updated_at, true);
  if not v_cancel_result
    or (select status::text from public.orders where id = v_order) is distinct from 'cancelled'
    or (select payment_status::text from public.orders where id = v_order) is distinct from 'paid'
    or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock then
    raise exception 'Paid cancellation did not cancel the order, keep payment paid, and return stock once';
  end if;

  -- Provider notifications keep arriving after the cancellation, twice each.
  for v_pass in 1..2 loop
    select status, provider_version into v_status, v_version from public.payment_attempts where id = v_attempt;
    perform public.transition_payment_attempt_v2(v_attempt, 'approved', now(), null, v_status, v_version, 'approved');
    perform public.reconcile_payment_attempt_aggregate_v2(v_attempt);
  end loop;
  -- A different approved provider payment for the same order is also replayed.
  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version
  ) values (v_attempt, 'sandbox', 'paid-cancel-replay-' || v_run_id, 200, 'ARS',
    'debit_card', 'approved', 'approved', null);
  for v_pass in 1..2 loop
    perform public.reconcile_payment_attempt_aggregate_v2(v_attempt);
  end loop;

  if (select status::text from public.orders where id = v_order) is distinct from 'cancelled' then
    raise exception 'A provider notification reopened the paid cancelled order';
  end if;
  if (select payment_status::text from public.orders where id = v_order) is distinct from 'paid' then
    raise exception 'A provider notification changed the payment status of the paid cancelled order';
  end if;
  if (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock then
    raise exception 'A provider notification changed stock after the paid cancellation';
  end if;
  if (select count(*) from public.inventory_movements where order_id = v_order and movement_type = 'order_created') <> 1
    or (select count(*) from public.inventory_movements where order_id = v_order and movement_type = 'order_cancelled') <> 1
    or exists (select 1 from public.inventory_movements where order_id = v_order and movement_type = 'payment_re_reserved') then
    raise exception 'Provider notifications duplicated or added inventory movements after a paid cancellation';
  end if;

  -- A stale rejection (for example from an earlier attempt) arrives after the cancellation.
  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version
  ) values (v_attempt, 'sandbox', 'paid-cancel-stale-rejection-' || v_run_id, 200, 'ARS',
    'debit_card', 'rejected', 'rejected', null);
  for v_pass in 1..2 loop
    perform public.reconcile_payment_attempt_aggregate_v2(v_attempt);
    select status, provider_version into v_status, v_version from public.payment_attempts where id = v_attempt;
    perform public.transition_payment_attempt_v2(v_attempt, 'rejected', now(), null, v_status, v_version, 'rejected');
  end loop;
  if (select status::text from public.orders where id = v_order) is distinct from 'cancelled'
    or (select payment_status::text from public.orders where id = v_order) is distinct from 'paid'
    or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock
    or (select count(*) from public.inventory_movements where order_id = v_order and movement_type = 'order_cancelled') <> 1
    or exists (select 1 from public.inventory_movements where order_id = v_order and movement_type = 'payment_re_reserved') then
    raise exception 'A stale rejection after a paid cancellation changed the order, payment or inventory';
  end if;

  -- A repeated cancellation of the same order is a no-op.
  select updated_at into v_updated_at from public.orders where id = v_order;
  v_cancel_result := public.cancel_order_with_stock(v_order, v_actor, 'Repeated cancellation', v_updated_at, true);
  if v_cancel_result
    or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock then
    raise exception 'Repeated cancellation returned stock a second time';
  end if;
end;
$$;

rollback;
