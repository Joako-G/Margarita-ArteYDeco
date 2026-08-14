-- ==========================================
-- Actualizar create_order_with_stock para soportar envíos
-- ==========================================

begin;

-- 1. Recrear la función base con los nuevos parámetros de entrega
DROP FUNCTION IF EXISTS public.create_order_with_stock(
    uuid,
    text,
    text,
    text,
    text,
    public.payment_method,
    jsonb,
    text
);

DROP FUNCTION IF EXISTS public.create_order_with_stock(
    uuid,
    text,
    text,
    text,
    text,
    public.payment_method,
    jsonb,
    text,
    text,
    text
);

create function public.create_order_with_stock(
  p_guest_session_id uuid,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_phone text,
  p_customer_phone_normalized text,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_delivery_method public.delivery_method,
  p_shipping_address text,
  p_notes text default null
)
returns table (
  order_id uuid,
  order_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_discount_percentage numeric(5, 2);
  v_distinct_item_count integer;
  v_items jsonb;
  v_order_id uuid;
  v_order_number text;
  v_status public.order_status;
  v_subtotal numeric(12, 2);
  v_discount numeric(12, 2);
  v_total numeric(12, 2);
  v_shipping_address text;
begin
  if nullif(btrim(p_customer_first_name), '') is null
    or nullif(btrim(p_customer_last_name), '') is null
    or nullif(btrim(p_customer_phone), '') is null then
    raise exception using
      errcode = '22023',
      message = 'Customer name and phone are required';
  end if;

  if p_customer_phone_normalized !~ '^[1-9][0-9]{7,14}$' then
    raise exception using
      errcode = '22023',
      message = 'Normalized phone is invalid';
  end if;

  if p_delivery_method is null then
    raise exception using
      errcode = '22023',
      message = 'Delivery method is required';
  end if;

  if p_delivery_method = 'pickup' then
    v_shipping_address := null;
  elsif p_delivery_method = 'shipping' then
    v_shipping_address := nullif(btrim(p_shipping_address), '');

    if v_shipping_address is null then
      raise exception using
        errcode = '22023',
        message = 'Shipping address is required';
    end if;
    if char_length(v_shipping_address) not between 10 and 300 then
      raise exception using
        errcode = '22023',
        message = 'Shipping address must contain between 10 and 300 characters';
    end if;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using
      errcode = '22023',
      message = 'At least one order item is required';
  end if;

  if p_payment_method is null then
    raise exception using
      errcode = '22023',
      message = 'Payment method is required';
  end if;

  perform 1
  from public.guest_sessions as gs
  where gs.id = p_guest_session_id
    and gs.revoked_at is null
    and gs.expires_at > now()
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Guest session is invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity bigint)
    where item.product_id is null
      or item.quantity is null
      or item.quantity <= 0
      or item.quantity > 2147483647
  ) then
    raise exception using
      errcode = '22023',
      message = 'Order items are invalid';
  end if;

  select count(distinct item.product_id)
  into v_distinct_item_count
  from jsonb_to_recordset(p_items) as item(product_id uuid, quantity bigint);

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity bigint)
    group by item.product_id
    having sum(item.quantity) > 2147483647
  ) then
    raise exception using
      errcode = '22023',
      message = 'Consolidated order item quantity is too large';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'product_id',
      consolidated.product_id,
      'quantity',
      consolidated.quantity
    )
    order by consolidated.product_id
  )
  into v_items
  from (
    select item.product_id, sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity bigint)
    group by item.product_id
    having sum(item.quantity) between 1 and 2147483647
  ) as consolidated;

  if v_items is null then
    raise exception using
      errcode = '22023',
      message = 'Order items are invalid';
  end if;

  if jsonb_array_length(v_items) <> v_distinct_item_count then
    raise exception using
      errcode = '22023',
      message = 'Order items could not be consolidated';
  end if;

  perform p.id
  from public.products as p
  join jsonb_to_recordset(v_items) as item(product_id uuid, quantity integer)
    on item.product_id = p.id
  order by p.id
  for update of p;

  if (
    select count(*)
    from public.products as p
    join jsonb_to_recordset(v_items) as item(product_id uuid, quantity integer)
      on item.product_id = p.id
    where p.is_active = true
      and p.deleted_at is null
      and p.stock_quantity >= item.quantity
  ) <> jsonb_array_length(v_items) then
    raise exception using
      errcode = 'P0001',
      message = 'One or more products are unavailable';
  end if;

  select coalesce(sum(round(p.price * item.quantity, 2)), 0)
  into v_subtotal
  from public.products as p
  join jsonb_to_recordset(v_items) as item(product_id uuid, quantity integer)
    on item.product_id = p.id;

  select s.transfer_discount
  into v_discount_percentage
  from public.settings as s
  where s.singleton_key = true;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Business settings are not configured';
  end if;

  v_discount := case
    when p_payment_method = 'bank_transfer'
      then round(v_subtotal * v_discount_percentage / 100, 2)
    else 0
  end;
  v_total := v_subtotal - v_discount;
  v_status := 'pending'::public.order_status;

  insert into public.customers (
    first_name,
    last_name,
    phone,
    phone_normalized,
    notes,
    deleted_at
  )
  values (
    btrim(p_customer_first_name),
    btrim(p_customer_last_name),
    btrim(p_customer_phone),
    p_customer_phone_normalized,
    nullif(btrim(p_notes), ''),
    null
  )
  on conflict (phone_normalized) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    notes = coalesce(excluded.notes, public.customers.notes),
    deleted_at = null
  returning id into v_customer_id;

  insert into public.orders (
    customer_id,
    customer_first_name,
    customer_last_name,
    customer_phone,
    customer_phone_normalized,
    status,
    subtotal,
    discount,
    total,
    payment_method,
    payment_status,
    delivery_method,
    shipping_address,
    notes
  )
  values (
    v_customer_id,
    btrim(p_customer_first_name),
    btrim(p_customer_last_name),
    btrim(p_customer_phone),
    p_customer_phone_normalized,
    v_status,
    v_subtotal,
    v_discount,
    v_total,
    p_payment_method,
    'pending',
    p_delivery_method,
    v_shipping_address,
    nullif(btrim(p_notes), '')
  )
  returning id, public.orders.order_number
  into v_order_id, v_order_number;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    subtotal
  )
  select
    v_order_id,
    p.id,
    p.name,
    item.quantity,
    p.price,
    round(p.price * item.quantity, 2)
  from public.products as p
  join jsonb_to_recordset(v_items) as item(product_id uuid, quantity integer)
    on item.product_id = p.id;

  insert into public.inventory_movements (
    product_id,
    order_id,
    movement_type,
    quantity_delta,
    stock_before,
    stock_after
  )
  select
    p.id,
    v_order_id,
    'order_created',
    -item.quantity,
    p.stock_quantity,
    p.stock_quantity - item.quantity
  from public.products as p
  join jsonb_to_recordset(v_items) as item(product_id uuid, quantity integer)
    on item.product_id = p.id;

  update public.products as p
  set stock_quantity = p.stock_quantity - item.quantity
  from jsonb_to_recordset(v_items) as item(product_id uuid, quantity integer)
  where p.id = item.product_id;

  insert into public.guest_session_orders (guest_session_id, order_id)
  values (p_guest_session_id, v_order_id);

  insert into public.audit_logs (action, entity_type, entity_id, metadata)
  values (
    'order_created',
    'order',
    v_order_id,
    jsonb_build_object('order_number', v_order_number, 'delivery_method', p_delivery_method)
  );

  return query select v_order_id, v_order_number;
end;
$$;

revoke execute on function public.create_order_with_stock(
  uuid,
  text,
  text,
  text,
  text,
  public.payment_method,
  jsonb,
  public.delivery_method,
  text,
  text
) from public, anon, authenticated, service_role;

grant execute on function public.create_order_with_stock(
  uuid,
  text,
  text,
  text,
  text,
  public.payment_method,
  jsonb,
  public.delivery_method,
  text,
  text
) to service_role;

-- 2. Recrear el wrapper de idempotencia con la nueva firma
DROP FUNCTION IF EXISTS public.create_order_with_stock(
    uuid,
    text,
    text,
    text,
    text,
    public.payment_method,
    jsonb,
    text,
    text,
    text
);

create function public.create_order_with_stock(
  p_guest_session_id uuid,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_phone text,
  p_customer_phone_normalized text,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_delivery_method public.delivery_method,
  p_shipping_address text default null,
  p_notes text default null
)
returns table (
  order_id uuid,
  order_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_order_id uuid;
  v_existing_order_number text;
  v_existing_fingerprint text;
  v_idempotency_key_hash bytea;
  v_inserted_count integer;
begin
  if p_idempotency_key !~ '^[A-Za-z0-9._:-]{16,128}$'
    or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'Idempotency data is invalid';
  end if;

  v_idempotency_key_hash := extensions.digest(
    pg_catalog.convert_to(p_idempotency_key, 'utf8'),
    'sha256'
  );

  insert into public.order_idempotency_keys (
    guest_session_id,
    idempotency_key_hash,
    request_fingerprint
  )
  values (
    p_guest_session_id,
    v_idempotency_key_hash,
    p_request_fingerprint
  )
  on conflict (guest_session_id, idempotency_key_hash) do nothing;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 0 then
    select idempotency_key.request_fingerprint, idempotency_key.order_id
    into v_existing_fingerprint, v_existing_order_id
    from public.order_idempotency_keys as idempotency_key
    where idempotency_key.guest_session_id = p_guest_session_id
      and idempotency_key.idempotency_key_hash = v_idempotency_key_hash
    for update;

    if v_existing_fingerprint <> p_request_fingerprint then
      raise exception using
        errcode = '23505',
        message = 'Idempotency key was already used with another request';
    end if;

    if v_existing_order_id is null then
      raise exception using
        errcode = '40001',
        message = 'Idempotent order is not finalized';
    end if;

    select o.order_number
    into v_existing_order_number
    from public.orders as o
    where o.id = v_existing_order_id;

    if v_existing_order_number is null then
      raise exception using
        errcode = 'P0001',
        message = 'Idempotent order could not be found';
    end if;

    return query select v_existing_order_id, v_existing_order_number;
    return;
  end if;

  select *
  into v_existing_order_id, v_existing_order_number
  from public.create_order_with_stock(
    p_guest_session_id,
    p_customer_first_name,
    p_customer_last_name,
    p_customer_phone,
    p_customer_phone_normalized,
    p_payment_method,
    p_items,
    p_delivery_method,
    p_shipping_address,
    p_notes
  );

  update public.order_idempotency_keys as idempotency_key
  set order_id = v_existing_order_id
  where idempotency_key.guest_session_id = p_guest_session_id
    and idempotency_key.idempotency_key_hash = v_idempotency_key_hash;

  return query select v_existing_order_id, v_existing_order_number;
end;
$$;

revoke execute on function public.create_order_with_stock(
  uuid,
  text,
  text,
  text,
  text,
  public.payment_method,
  jsonb,
  text,
  text,
  public.delivery_method,
  text,
  text
) from public, anon, authenticated, service_role;

grant execute on function public.create_order_with_stock(
  uuid,
  text,
  text,
  text,
  text,
  public.payment_method,
  jsonb,
  text,
  text,
  public.delivery_method,
  text,
  text
) to service_role;

commit;
