begin;

select plan(8);

select lives_ok(
  $$
    update public.products
    set discount_percentage = 12.50
    where deleted_at is null
  $$,
  'accepts a valid product discount'
);

select is(
  (
    select count(*)
    from public.products
    where deleted_at is null
      and sale_price <> round(price * 0.875, 2)
  ),
  0::bigint,
  'calculates every generated sale price with two-decimal rounding'
);

select throws_ok(
  $$
    update public.products
    set discount_percentage = 100
    where id = (
      select id
      from public.products
      where deleted_at is null
      order by id
      limit 1
    )
  $$,
  '23514',
  'new row for relation "products" violates check constraint "products_discount_percentage_range"',
  'rejects a one-hundred-percent discount'
);

select is(
  (
    select count(*)
    from public.order_items
    where list_unit_price is null
      or product_discount_percentage is null
      or unit_price <> round(
        list_unit_price * (100 - product_discount_percentage) / 100,
        2
      )
  ),
  0::bigint,
  'keeps every order item price snapshot consistent'
);

select lives_ok(
  $$
    insert into public.guest_sessions (id, token_hash, expires_at)
    values (
      '41000000-0000-4000-8000-000000000001',
      decode(repeat('81', 32), 'hex'),
      now() + interval '1 day'
    )
  $$,
  'creates a guest session for the transactional order test'
);

select lives_ok(
  $$
    select *
    from public.create_order_with_stock(
      '41000000-0000-4000-8000-000000000001'::uuid,
      'Prueba'::text,
      'Descuento'::text,
      '3889999999'::text,
      '5493889999999'::text,
      'cash'::public.payment_method,
      jsonb_build_array(jsonb_build_object(
        'product_id', (
          select id
          from public.products
          where is_active = true
            and deleted_at is null
            and stock_quantity > 0
          order by id
          limit 1
        ),
        'quantity', 1
      ))::jsonb,
      'pickup'::public.delivery_method,
      null::text,
      null::text
    )
  $$,
  'creates an order with a discounted product'
);

select throws_ok(
  $$
    select *
    from public.create_order_with_stock(
      '41000000-0000-4000-8000-000000000001'::uuid,
      'Prueba'::text,
      'Envío'::text,
      '3889999999'::text,
      '5493889999999'::text,
      'cash'::public.payment_method,
      '[]'::jsonb,
      'shipping'::public.delivery_method,
      'Belgrano 607, Jujuy'::text,
      null::text
    )
  $$,
  '23514',
  'Shipping orders require bank transfer payment',
  'rejects cash payment for shipping orders in the RPC'
);

select is(
  (
    select count(*)
    from public.order_items as oi
    join public.orders as o on o.id = oi.order_id
    join public.products as p on p.id = oi.product_id
    where o.customer_phone_normalized = '5493889999999'
      and oi.list_unit_price = p.price
      and oi.product_discount_percentage = 12.50
      and oi.unit_price = p.sale_price
      and oi.subtotal = p.sale_price * oi.quantity
  ),
  1::bigint,
  'persists list price, discount and charged price snapshots in a new order'
);

select * from finish();

rollback;
