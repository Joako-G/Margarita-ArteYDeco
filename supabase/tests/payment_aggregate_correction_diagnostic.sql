begin;

set local role service_role;

select plan(8);

create temporary table payment_aggregate_fixture (
  session_id uuid not null,
  category_id uuid not null,
  product_id uuid not null,
  order_id uuid not null,
  attempt_id uuid not null,
  initial_stock integer not null,
  stock_after_creation integer not null,
  first_aggregate public.payment_attempt_status not null
);

-- Temporary diagnostic evidence for the failed payment aggregate assertion.
do $$
declare
  v_session uuid := '74000000-0000-4000-8000-000000000001';
  v_category uuid := '74000000-0000-4000-8000-000000000002';
  v_product uuid := '74000000-0000-4000-8000-000000000003';
  v_order_id uuid;
  v_attempt_id uuid;
  v_initial_stock integer;
  v_stock_after_creation integer;
  v_current_stock integer;
  v_order_total numeric(12, 2);
  v_aggregate public.payment_attempt_status;
  v_attempt_status public.payment_attempt_status;
  v_order_payment_status public.payment_status;
  v_order_status public.order_status;
  v_movement_count bigint;
  v_transaction record;
begin
  insert into public.guest_sessions (id, token_hash, expires_at)
  values (v_session, decode(repeat('74', 32), 'hex'), now() + interval '1 day');
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'Payment Aggregate Test', 'payment-aggregate-test', 'test/payment.webp', 'art');
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  values (v_product, v_category, 'Payment Aggregate Product', 'payment-aggregate-product', 100, 2, 'test/payment-product.webp');

  select stock_quantity
  into v_initial_stock
  from public.products
  where id = v_product;

  select order_id, attempt_id
  into v_order_id, v_attempt_id
  from public.create_order_with_payment_v2(
    v_session, 'Aggregate', 'Correction', '3516123402', '3516123402',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'aggregate-correction-key-001', repeat('f', 64), 'sandbox', 'pickup'
  );

  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version
  ) values
    (v_attempt_id, 'sandbox', 'aggregate-rejected', 100, 'ARS', 'debit_card', 'rejected', 'rejected', 1),
    (v_attempt_id, 'sandbox', 'aggregate-approved', 100, 'ARS', 'debit_card', 'approved', 'approved', 2);

  select total
  into v_order_total
  from public.orders
  where id = v_order_id;
  select stock_quantity
  into v_current_stock
  from public.products
  where id = v_product;
  v_stock_after_creation := v_current_stock;
  select status
  into v_attempt_status
  from public.payment_attempts
  where id = v_attempt_id;
  select payment_status, status
  into v_order_payment_status, v_order_status
  from public.orders
  where id = v_order_id;
  select count(*)
  into v_movement_count
  from public.inventory_movements
  where order_id = v_order_id;

  raise notice 'BEFORE reconciliation: order total=%, expected=100', v_order_total;
  raise notice 'BEFORE reconciliation: initial stock=%, current stock=%, expected current=%',
    v_initial_stock, v_current_stock, v_initial_stock - 1;
  raise notice 'BEFORE reconciliation: payment_attempt status=%, expected pending', v_attempt_status;
  raise notice 'BEFORE reconciliation: order payment_status=%, expected pending', v_order_payment_status;
  raise notice 'BEFORE reconciliation: order status=%, expected pending', v_order_status;
  raise notice 'BEFORE reconciliation: inventory movement count=%, expected 1', v_movement_count;
  for v_transaction in
    select provider_payment_id, status, amount
    from public.payment_transactions
    where payment_attempt_id = v_attempt_id
    order by provider_version, id
  loop
    raise notice 'BEFORE reconciliation: transaction provider_id=%, status=%, amount=%',
      v_transaction.provider_payment_id, v_transaction.status, v_transaction.amount;
  end loop;

  v_aggregate := public.reconcile_payment_attempt_aggregate_v2(v_attempt_id);

  select stock_quantity
  into v_current_stock
  from public.products
  where id = v_product;
  select status
  into v_attempt_status
  from public.payment_attempts
  where id = v_attempt_id;
  select payment_status, status
  into v_order_payment_status, v_order_status
  from public.orders
  where id = v_order_id;
  select count(*)
  into v_movement_count
  from public.inventory_movements
  where order_id = v_order_id;

  raise notice 'AFTER first reconciliation: aggregate function return=%, expected approved', v_aggregate;
  raise notice 'AFTER first reconciliation: order total=%, expected 100', v_order_total;
  raise notice 'AFTER first reconciliation: initial stock=%, current stock=%, expected current=%',
    v_initial_stock, v_current_stock, v_initial_stock - 1;
  raise notice 'AFTER first reconciliation: payment_attempt status=%, expected approved', v_attempt_status;
  raise notice 'AFTER first reconciliation: order payment_status=%, expected paid', v_order_payment_status;
  raise notice 'AFTER first reconciliation: order status=%, expected pending (aggregate does not change operational status)', v_order_status;
  raise notice 'AFTER first reconciliation: inventory movement count=%, expected 1', v_movement_count;
  for v_transaction in
    select provider_payment_id, status, amount
    from public.payment_transactions
    where payment_attempt_id = v_attempt_id
    order by provider_version, id
  loop
    raise notice 'AFTER first reconciliation: transaction provider_id=%, status=%, amount=%',
      v_transaction.provider_payment_id, v_transaction.status, v_transaction.amount;
  end loop;

  insert into payment_aggregate_fixture (
    session_id, category_id, product_id, order_id, attempt_id,
    initial_stock, stock_after_creation, first_aggregate
  ) values (
    v_session, v_category, v_product, v_order_id, v_attempt_id,
    v_initial_stock, v_stock_after_creation, v_aggregate
  );

  v_aggregate := public.reconcile_payment_attempt_aggregate_v2(v_attempt_id);

  select stock_quantity
  into v_current_stock
  from public.products
  where id = v_product;
  select status
  into v_attempt_status
  from public.payment_attempts
  where id = v_attempt_id;
  select payment_status, status
  into v_order_payment_status, v_order_status
  from public.orders
  where id = v_order_id;
  select count(*)
  into v_movement_count
  from public.inventory_movements
  where order_id = v_order_id;

  raise notice 'AFTER second reconciliation: aggregate function return=%, expected approved', v_aggregate;
  raise notice 'AFTER second reconciliation: order total=%, expected 100', v_order_total;
  raise notice 'AFTER second reconciliation: initial stock=%, current stock=%, expected current=%',
    v_initial_stock, v_current_stock, v_initial_stock - 1;
  raise notice 'AFTER second reconciliation: payment_attempt status=%, expected approved', v_attempt_status;
  raise notice 'AFTER second reconciliation: order payment_status=%, expected paid', v_order_payment_status;
  raise notice 'AFTER second reconciliation: order status=%, expected pending (aggregate does not change operational status)', v_order_status;
  raise notice 'AFTER second reconciliation: inventory movement count=%, expected 1', v_movement_count;
  for v_transaction in
    select provider_payment_id, status, amount
    from public.payment_transactions
    where payment_attempt_id = v_attempt_id
    order by provider_version, id
  loop
    raise notice 'AFTER second reconciliation: transaction provider_id=%, status=%, amount=%',
      v_transaction.provider_payment_id, v_transaction.status, v_transaction.amount;
  end loop;
end;
$$;

select is(
  (select total from public.orders where id = payment_aggregate_fixture.order_id),
  100::numeric,
  'aggregate fixture order total is 100'
)
from payment_aggregate_fixture;

select is(
  initial_stock,
  2,
  'aggregate fixture initial stock is 2'
)
from payment_aggregate_fixture;

select is(
  stock_after_creation,
  1,
  'current stock is 1 after order creation'
)
from payment_aggregate_fixture;

select is(
  first_aggregate,
  'approved'::public.payment_attempt_status,
  'first aggregate reconciliation returns approved'
)
from payment_aggregate_fixture;

select is(
  (select status from public.payment_attempts where id = payment_aggregate_fixture.attempt_id),
  'approved'::public.payment_attempt_status,
  'payment attempt status is approved'
)
from payment_aggregate_fixture;

select is(
  (select payment_status from public.orders where id = payment_aggregate_fixture.order_id),
  'paid'::public.payment_status,
  'order payment status is paid'
)
from payment_aggregate_fixture;

select is(
  (select stock_quantity from public.products where id = payment_aggregate_fixture.product_id),
  1,
  'stock remains 1 after second reconciliation'
)
from payment_aggregate_fixture;

select is(
  (select count(*) from public.inventory_movements where order_id = payment_aggregate_fixture.order_id),
  1::bigint,
  'inventory movement count remains 1'
)
from payment_aggregate_fixture;

select * from finish();

rollback;
