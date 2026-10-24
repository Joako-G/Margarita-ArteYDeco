begin;

set local role service_role;

do $$
declare
  v_session uuid := '74000000-0000-4000-8000-000000000001';
  v_category uuid := '74000000-0000-4000-8000-000000000002';
  v_product uuid := '74000000-0000-4000-8000-000000000003';
  v_order_id uuid;
  v_attempt_id uuid;
  v_replay_order_id uuid;
  v_replay_attempt_id uuid;
  v_initial_stock integer;
  v_aggregate_result text;
  v_order_payment_status text;
  v_order_status text;
  v_attempt_status text;
  v_actual_stock integer;
  v_status_audit_count integer;
  v_provider_review_audit_count integer;
begin
  insert into public.guest_sessions (id, token_hash, expires_at)
  values (v_session, decode(repeat('74', 32), 'hex'), now() + interval '1 day');
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'Payment Aggregate Test', 'payment-aggregate-test', 'test/payment.webp', 'art');
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  values (v_product, v_category, 'Payment Aggregate Product', 'payment-aggregate-product', 100, 2, 'test/payment-product.webp');

  select stock_quantity into v_initial_stock from public.products where id = v_product;
  select order_id, attempt_id into v_order_id, v_attempt_id
  from public.create_order_with_payment_v2(
    v_session, 'Aggregate', 'Correction', '3516123402', '3516123402',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'aggregate-correction-key-001', repeat('f', 64), 'sandbox', 'pickup'
  );

  select order_id, attempt_id into v_replay_order_id, v_replay_attempt_id
  from public.create_order_with_payment_v2(
    v_session, 'Aggregate', 'Correction', '3516123402', '3516123402',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'aggregate-correction-key-001', repeat('f', 64), 'sandbox', 'pickup'
  );
  if v_replay_order_id <> v_order_id or v_replay_attempt_id <> v_attempt_id
    or (select count(*) from public.orders where id = v_order_id) <> 1
    or (select stock_quantity from public.products where id = v_product) <> v_initial_stock - 1 then
    raise exception 'A repeated checkout created another order or reserved stock twice';
  end if;

  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version
  ) values
    (v_attempt_id, 'sandbox', 'aggregate-rejected', 100, 'ARS', 'debit_card', 'rejected', 'rejected', 1);

  select public.reconcile_payment_attempt_aggregate_v2(v_attempt_id)::text
  into v_aggregate_result;
  select payment_status::text, status::text
  into v_order_payment_status, v_order_status
  from public.orders
  where id = v_order_id;
  select stock_quantity
  into v_actual_stock
  from public.products
  where id = v_product;
  if v_aggregate_result is distinct from 'rejected'
    or v_order_payment_status is distinct from 'rejected'
    or v_order_status is distinct from 'pending'
    or v_actual_stock is distinct from v_initial_stock - 1 then
    raise exception 'Provider rejection state mismatch: aggregate=%, payment_status=%, order_status=%, stock=%, expected_stock=%',
      v_aggregate_result, v_order_payment_status, v_order_status, v_actual_stock, v_initial_stock - 1;
  end if;

  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version
  ) values
    (v_attempt_id, 'sandbox', 'aggregate-approved', 100, 'ARS', 'debit_card', 'approved', 'approved', 2);

  select public.reconcile_payment_attempt_aggregate_v2(v_attempt_id)::text
  into v_aggregate_result;
  select payment_status::text, status::text
  into v_order_payment_status, v_order_status
  from public.orders
  where id = v_order_id;
  select status::text
  into v_attempt_status
  from public.payment_attempts
  where id = v_attempt_id;
  select stock_quantity
  into v_actual_stock
  from public.products
  where id = v_product;
  select count(*)
  into v_status_audit_count
  from public.audit_logs
  where entity_type = 'payment_attempt'
    and entity_id = v_attempt_id
    and action = 'payment_status_changed'
    and metadata ->> 'previous_status' = 'rejected'
    and metadata ->> 'next_status' = 'approved';
  if v_aggregate_result is distinct from 'approved'
    or v_attempt_status is distinct from 'approved'
    or v_order_payment_status is distinct from 'paid'
    or v_order_status is distinct from 'pending'
    or v_actual_stock is distinct from v_initial_stock - 1
    or v_status_audit_count <> 1 then
    raise exception 'Approved transaction did not win the aggregate or owner confirmation was bypassed';
  end if;

  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version
  ) values
    (v_attempt_id, 'sandbox', 'aggregate-later-rejected', 100, 'ARS', 'debit_card', 'rejected', 'rejected', 3);

  select public.reconcile_payment_attempt_aggregate_v2(v_attempt_id)::text
  into v_aggregate_result;
  select payment_status::text, status::text
  into v_order_payment_status, v_order_status
  from public.orders
  where id = v_order_id;
  select status::text
  into v_attempt_status
  from public.payment_attempts
  where id = v_attempt_id;
  select stock_quantity
  into v_actual_stock
  from public.products
  where id = v_product;
  select count(*)
  into v_status_audit_count
  from public.audit_logs
  where entity_type = 'payment_attempt'
    and entity_id = v_attempt_id
    and action = 'payment_status_changed'
    and metadata ->> 'next_status' = 'rejected';
  if v_aggregate_result is distinct from 'approved'
    or v_order_payment_status is distinct from 'paid'
    or v_order_status is distinct from 'pending'
    or v_attempt_status is distinct from 'approved'
    or v_actual_stock is distinct from v_initial_stock - 1
    or v_status_audit_count <> 1 then
    raise exception 'A later rejected transaction downgraded a full approved payment';
  end if;

  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version, review_required
  ) values
    (v_attempt_id, 'sandbox', 'aggregate-overpayment-review', 1, 'ARS', 'debit_card', 'approved', 'approved', 4, true);

  select public.reconcile_payment_attempt_aggregate_v2(v_attempt_id)::text
  into v_aggregate_result;
  select payment_status::text, status::text
  into v_order_payment_status, v_order_status
  from public.orders
  where id = v_order_id;
  select status::text
  into v_attempt_status
  from public.payment_attempts
  where id = v_attempt_id;
  select stock_quantity
  into v_actual_stock
  from public.products
  where id = v_product;
  select count(*)
  into v_status_audit_count
  from public.audit_logs
  where entity_type = 'payment_attempt'
    and entity_id = v_attempt_id
    and action = 'payment_status_changed'
    and metadata ->> 'next_status' = 'manual_review';
  select count(*)
  into v_provider_review_audit_count
  from public.audit_logs
  where entity_type = 'payment_attempt'
    and entity_id = v_attempt_id
    and action = 'payment_provider_updated'
    and metadata ->> 'previous_status' = 'approved'
    and metadata ->> 'next_status' = 'approved'
    and metadata ->> 'aggregate_status' = 'manual_review';
  if v_aggregate_result is distinct from 'manual_review'
    or v_attempt_status is distinct from 'approved'
    or v_order_payment_status is distinct from 'paid'
    or v_order_status is distinct from 'pending'
    or v_actual_stock is distinct from v_initial_stock - 1
    or v_status_audit_count <> 0
    or v_provider_review_audit_count < 1 then
    raise exception 'Review-required aggregate falsified attempt status or downgraded paid state';
  end if;

  select public.reconcile_payment_attempt_aggregate_v2(v_attempt_id)::text
  into v_aggregate_result;
  select stock_quantity
  into v_actual_stock
  from public.products
  where id = v_product;
  select count(*)
  into v_status_audit_count
  from public.inventory_movements
  where order_id = v_order_id;
  if v_aggregate_result is distinct from 'manual_review'
    or v_actual_stock is distinct from v_initial_stock - 1
    or v_status_audit_count <> 1 then
    raise exception 'Payment aggregate reconciliation changed stock more than once';
  end if;
end;
$$;

rollback;
