begin;

insert into public.customers (
  id, first_name, last_name, phone, phone_normalized
) values (
  '11000000-0000-4000-8000-000000000001',
  'Prueba',
  'Devolución',
  '3516123499',
  '3516123499'
);

insert into public.orders (
  id, customer_id, customer_first_name, customer_last_name,
  customer_phone, customer_phone_normalized, order_number, status,
  subtotal, discount, total, payment_method, payment_status,
  delivery_method, shipping_address
)
select
  '21000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  'Prueba',
  'Devolución',
  '3516123499',
  '3516123499',
  'MAD-20991231-999998',
  'pending',
  product.price * 2,
  0,
  product.price * 2,
  'bank_transfer',
  'pending',
  'shipping',
  'Calle de prueba 1234, Córdoba'
from public.products as product
where product.deleted_at is null
order by product.id
limit 1;

update public.orders
set payment_status = 'paid'
where id = '21000000-0000-4000-8000-000000000001';

update public.orders set status = 'confirmed'
where id = '21000000-0000-4000-8000-000000000001';
update public.orders set status = 'preparing'
where id = '21000000-0000-4000-8000-000000000001';
update public.orders set status = 'ready'
where id = '21000000-0000-4000-8000-000000000001';
update public.orders set status = 'delivered'
where id = '21000000-0000-4000-8000-000000000001';

insert into public.order_items (
  id, order_id, product_id, product_name, quantity, unit_price, subtotal
)
select
  '22000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000001',
  product.id,
  product.name,
  2,
  product.price,
  product.price * 2
from public.products as product
where product.deleted_at is null
order by product.id
limit 1;

insert into public.consumer_withdrawal_requests (
  id, public_code_hash, public_code_suffix, public_code_key_version,
  order_id, order_reference_input, order_reference_unavailable,
  contact_phone_normalized, contact_fingerprint, request_status,
  return_status, refund_status, source, applicable_at, return_received_at
) values (
  '31000000-0000-4000-8000-000000000001',
  decode(repeat('71', 32), 'hex'),
  'RTN001',
  1,
  '21000000-0000-4000-8000-000000000001',
  'MAD-20991231-999998',
  false,
  '3516123499',
  decode(repeat('72', 32), 'hex'),
  'applicable',
  'received',
  'not_required',
  'web',
  now(),
  now()
);

set local role service_role;

do $$
declare
  v_actor_id uuid;
  v_product_id uuid;
  v_stock_before integer;
  v_result boolean;
  v_request_version bigint;
  v_movement_count integer;
begin
  select id into v_actor_id
  from public.profiles
  where role = 'administrator' and is_active = true;

  select product_id into v_product_id
  from public.order_items
  where id = '22000000-0000-4000-8000-000000000001';

  select stock_quantity into v_stock_before
  from public.products
  where id = v_product_id;

  if v_actor_id is null or v_product_id is null then
    raise exception 'The local integration test requires an administrator and a product';
  end if;

  begin
    perform public.transition_consumer_withdrawal(
      '31000000-0000-4000-8000-000000000001',
      'inspect_return',
      v_actor_id,
      1,
      repeat('77', 32),
      repeat('78', 32),
      now() + interval '1 day',
      'Intento por la transición anterior'
    );
    raise exception 'The legacy inspection path should have been rejected';
  exception when check_violation then
    null;
  end;

  if not exists (
    select 1 from public.consumer_withdrawal_requests
    where id = '31000000-0000-4000-8000-000000000001'
      and return_status = 'received'
      and version = 1
  ) then
    raise exception 'The rejected legacy inspection changed the request';
  end if;

  v_result := public.inspect_consumer_withdrawal_return(
    '31000000-0000-4000-8000-000000000001',
    v_actor_id,
    1,
    jsonb_build_array(jsonb_build_object(
      'order_item_id', '22000000-0000-4000-8000-000000000001',
      'restockable_quantity', 1,
      'non_restockable_quantity', 1
    )),
    'Una unidad apta y una unidad dañada',
    repeat('73', 32),
    repeat('74', 32),
    now() + interval '1 day'
  );

  if not v_result then
    raise exception 'The return inspection RPC returned false';
  end if;

  select version into v_request_version
  from public.consumer_withdrawal_requests
  where id = '31000000-0000-4000-8000-000000000001'
    and return_status = 'inspected';

  if v_request_version <> 2 then
    raise exception 'The request was not inspected atomically';
  end if;

  if (select stock_quantity from public.products where id = v_product_id)
    <> v_stock_before + 1 then
    raise exception 'Only the restockable unit should return to stock';
  end if;

  select count(*) into v_movement_count
  from public.inventory_movements
  where withdrawal_request_id = '31000000-0000-4000-8000-000000000001'
    and product_id = v_product_id
    and movement_type = 'consumer_withdrawal_return'
    and quantity_delta = 1;

  if v_movement_count <> 1 then
    raise exception 'The audited return movement was not recorded exactly once';
  end if;

  v_result := public.inspect_consumer_withdrawal_return(
    '31000000-0000-4000-8000-000000000001',
    v_actor_id,
    1,
    jsonb_build_array(jsonb_build_object(
      'order_item_id', '22000000-0000-4000-8000-000000000001',
      'restockable_quantity', 1,
      'non_restockable_quantity', 1
    )),
    'Una unidad apta y una unidad dañada',
    repeat('73', 32),
    repeat('74', 32),
    now() + interval '1 day'
  );

  if not v_result
    or (select stock_quantity from public.products where id = v_product_id)
      <> v_stock_before + 1 then
    raise exception 'The idempotent replay changed stock';
  end if;

  v_result := public.transition_consumer_withdrawal(
    '31000000-0000-4000-8000-000000000001',
    'close',
    v_actor_id,
    2,
    repeat('75', 32),
    repeat('76', 32),
    now() + interval '1 day',
    'Inventario de devolución y obligaciones resueltos'
  );

  if not v_result or not exists (
    select 1 from public.consumer_withdrawal_requests
    where id = '31000000-0000-4000-8000-000000000001'
      and request_status = 'closed'
  ) then
    raise exception 'A resolved return should allow closure';
  end if;
end;
$$;

rollback;
