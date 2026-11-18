begin;

select plan(4);

insert into public.settings (
  business_name, whatsapp, address, maps_url, business_hours,
  transfer_alias, transfer_cbu, bank_name
) values (
  'Shipping Payment Test', '5493515550000', 'Test address',
  'https://maps.google.com/test', 'Mon-Fri', 'test.alias',
  '1234567890123456789012', 'Test bank'
) on conflict (singleton_key) do nothing;

insert into public.guest_sessions (id, token_hash, expires_at)
values (
  '45000000-0000-4000-8000-000000000001',
  decode(repeat('45', 32), 'hex'),
  now() + interval '1 day'
);

insert into public.categories (id, name, slug, image_path, catalog_area)
values (
  '46000000-0000-4000-8000-000000000001',
  'Shipping Payment Test Category',
  'shipping-payment-test-category',
  'test/shipping-payment.webp',
  'art'
);

insert into public.products (
  id, category_id, name, slug, price, stock_quantity, image_path
) values (
  '47000000-0000-4000-8000-000000000001',
  '46000000-0000-4000-8000-000000000001',
  'Shipping Payment Test Product',
  'shipping-payment-test-product',
  100,
  1,
  'test/shipping-payment.webp'
);

select lives_ok(
  $$
    select *
    from public.create_order_with_stock(
      '45000000-0000-4000-8000-000000000001'::uuid,
      'Shipping'::text,
      'Buyer'::text,
      '3889999998'::text,
      '5493889999998'::text,
      'mercado_pago'::public.payment_method,
      jsonb_build_array(jsonb_build_object(
        'product_id', '47000000-0000-4000-8000-000000000001'::uuid,
        'quantity', 1
      )),
      'shipping-mercado-pago-test'::text,
      repeat('a', 64)::text,
      'shipping'::public.delivery_method,
      'Av prueba N° 123'::text,
      null::text
    )
  $$,
  'accepts Mercado Pago for shipping orders'
);

select is(
  (
    select count(*)
    from public.orders
    where customer_phone_normalized = '5493889999998'
      and payment_method = 'mercado_pago'
      and delivery_method = 'shipping'
      and shipping_address = 'Av prueba N° 123'
  ),
  1::bigint,
  'persists the accepted shipping and Mercado Pago combination'
);

select throws_ok(
  $$
    select *
    from public.create_order_with_stock(
      '45000000-0000-4000-8000-000000000001'::uuid,
      'Cash'::text,
      'Buyer'::text,
      '3889999997'::text,
      '5493889999997'::text,
      'cash'::public.payment_method,
      '[]'::jsonb,
      'shipping-cash-test'::text,
      repeat('b', 64)::text,
      'shipping'::public.delivery_method,
      'Av prueba N° 123'::text,
      null::text
    )
  $$,
  '23514',
  'Shipping orders require bank transfer payment',
  'rejects cash for shipping orders'
);

select is(
  (
    select count(*)
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_shipping_requires_transfer'
  ),
  0::bigint,
  'does not retain the contradictory shipping transfer constraint'
);

select * from finish();

rollback;
