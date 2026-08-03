begin;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.generate_order_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select
    'MAD-'
    || to_char(current_date, 'YYYYMMDD')
    || '-'
    || lpad(nextval('public.order_number_sequence')::text, 6, '0');
$$;

alter table public.orders
  alter column order_number set default public.generate_order_number();

create function public.prevent_immutable_record_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I records are immutable', tg_table_name);
end;
$$;

create function public.validate_order_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_is_valid_transition boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.payment_method = 'cash' then
      v_is_valid_transition :=
        new.status = 'pending' and new.payment_status = 'pending';
    elsif new.payment_method = 'bank_transfer' then
      v_is_valid_transition :=
        new.status = 'payment_pending' and new.payment_status = 'pending';
    end if;

    if not v_is_valid_transition then
      raise exception using
        errcode = '23514',
        message = 'Invalid initial order or payment status';
    end if;

    return new;
  end if;

  if (
    new.id,
    new.customer_id,
    new.customer_first_name,
    new.customer_last_name,
    new.customer_phone,
    new.customer_phone_normalized,
    new.order_number,
    new.subtotal,
    new.discount,
    new.total,
    new.payment_method,
    new.notes,
    new.created_at
  ) is distinct from (
    old.id,
    old.customer_id,
    old.customer_first_name,
    old.customer_last_name,
    old.customer_phone,
    old.customer_phone_normalized,
    old.order_number,
    old.subtotal,
    old.discount,
    old.total,
    old.payment_method,
    old.notes,
    old.created_at
  ) then
    raise exception using
      errcode = '55000',
      message = 'Historical order fields are immutable';
  end if;

  if old.status in ('picked_up', 'cancelled') and new.status <> old.status then
    raise exception using
      errcode = '23514',
      message = 'Terminal orders cannot be reopened';
  end if;

  if old.payment_status in ('paid', 'rejected')
    and new.payment_status <> old.payment_status then
    raise exception using
      errcode = '23514',
      message = 'Terminal payment status cannot be changed';
  end if;

  if new.status = old.status then
    v_is_valid_transition := true;
  elsif new.status = 'cancelled' and old.status not in ('picked_up', 'cancelled') then
    v_is_valid_transition := true;
  elsif new.payment_method = 'bank_transfer' then
    v_is_valid_transition :=
      (old.status = 'payment_pending' and new.status = 'paid')
      or (old.status = 'paid' and new.status = 'preparing')
      or (old.status = 'preparing' and new.status = 'ready')
      or (old.status = 'ready' and new.status = 'picked_up');
  elsif new.payment_method = 'cash' then
    v_is_valid_transition :=
      (old.status = 'pending' and new.status = 'preparing')
      or (old.status = 'preparing' and new.status = 'ready')
      or (old.status = 'ready' and new.status = 'paid')
      or (old.status = 'paid' and new.status = 'picked_up');
  end if;

  if not v_is_valid_transition then
    raise exception using
      errcode = '23514',
      message = 'Invalid order status transition';
  end if;

  if new.status <> 'cancelled' then
    if new.payment_method = 'bank_transfer' then
      if new.status = 'payment_pending' and new.payment_status not in ('pending', 'rejected') then
        raise exception using
          errcode = '23514',
          message = 'Invalid transfer payment status';
      end if;

      if new.status in ('paid', 'preparing', 'ready', 'picked_up')
        and new.payment_status <> 'paid' then
        raise exception using
          errcode = '23514',
          message = 'A confirmed transfer requires paid payment status';
      end if;
    elsif new.payment_method = 'cash' then
      if new.status in ('pending', 'preparing', 'ready')
        and new.payment_status <> 'pending' then
        raise exception using
          errcode = '23514',
          message = 'Cash remains pending until pickup payment is confirmed';
      end if;

      if new.status in ('paid', 'picked_up') and new.payment_status <> 'paid' then
        raise exception using
          errcode = '23514',
          message = 'Paid cash orders require paid payment status';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create function public.ensure_cancelled_order_stock_restored()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' and exists (
    select 1
    from public.order_items as oi
    where oi.order_id = new.id
      and not exists (
        select 1
        from public.inventory_movements as im
        where im.order_id = new.id
          and im.product_id = oi.product_id
          and im.movement_type = 'order_cancelled'
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'Order stock must be restored before cancellation';
  end if;

  return new;
end;
$$;

create function public.record_initial_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stock_quantity > 0 then
    insert into public.inventory_movements (
      product_id,
      movement_type,
      quantity_delta,
      stock_before,
      stock_after,
      reason
    )
    values (
      new.id,
      'initial_stock',
      new.stock_quantity,
      0,
      new.stock_quantity,
      'Stock inicial'
    );
  end if;

  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger guest_sessions_set_updated_at
before update on public.guest_sessions
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger products_record_initial_stock
after insert on public.products
for each row execute function public.record_initial_stock();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger order_items_set_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

create trigger guest_session_orders_set_updated_at
before update on public.guest_session_orders
for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

create trigger orders_validate_change
before insert or update on public.orders
for each row execute function public.validate_order_change();

create trigger orders_ensure_cancelled_stock_restored
after update of status on public.orders
for each row execute function public.ensure_cancelled_order_stock_restored();

create trigger order_items_prevent_update
before update or delete on public.order_items
for each row execute function public.prevent_immutable_record_change();

create trigger inventory_movements_prevent_change
before update or delete on public.inventory_movements
for each row execute function public.prevent_immutable_record_change();

create trigger audit_logs_prevent_change
before update or delete on public.audit_logs
for each row execute function public.prevent_immutable_record_change();

create function public.create_order_with_stock(
  p_guest_session_id uuid,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_phone text,
  p_customer_phone_normalized text,
  p_payment_method public.payment_method,
  p_items jsonb,
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
  v_status := case
    when p_payment_method = 'bank_transfer' then 'payment_pending'::public.order_status
    else 'pending'::public.order_status
  end;

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
    jsonb_build_object('order_number', v_order_number)
  );

  return query select v_order_id, v_order_number;
end;
$$;

create function public.cancel_order_with_stock(
  p_order_id uuid,
  p_actor_profile_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception using
      errcode = '22023',
      message = 'A cancellation reason is required';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return false;
  end if;

  if v_order.status = 'cancelled' then
    return false;
  end if;

  if v_order.status = 'picked_up' then
    raise exception using
      errcode = '23514',
      message = 'Picked up orders cannot be cancelled';
  end if;

  perform 1
  from public.profiles
  where id = p_actor_profile_id
    and role = 'administrator'
    and is_active = true;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'An active administrator is required';
  end if;

  for v_item in
    select oi.product_id, oi.quantity, p.stock_quantity
    from public.order_items as oi
    join public.products as p on p.id = oi.product_id
    where oi.order_id = p_order_id
    order by oi.product_id
    for update of p
  loop
    insert into public.inventory_movements (
      product_id,
      order_id,
      movement_type,
      quantity_delta,
      stock_before,
      stock_after,
      reason,
      created_by
    )
    values (
      v_item.product_id,
      p_order_id,
      'order_cancelled',
      v_item.quantity,
      v_item.stock_quantity,
      v_item.stock_quantity + v_item.quantity,
      btrim(p_reason),
      p_actor_profile_id
    );

    update public.products
    set stock_quantity = stock_quantity + v_item.quantity
    where id = v_item.product_id;
  end loop;

  update public.orders
  set
    status = 'cancelled',
    picked_up_at = null
  where id = p_order_id;

  insert into public.audit_logs (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_actor_profile_id,
    'order_cancelled',
    'order',
    p_order_id,
    jsonb_build_object('reason', btrim(p_reason))
  );

  return true;
end;
$$;

create function public.adjust_product_stock(
  p_product_id uuid,
  p_quantity_delta integer,
  p_reason text,
  p_actor_profile_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock_before integer;
  v_stock_after integer;
begin
  if p_quantity_delta = 0 or nullif(btrim(p_reason), '') is null then
    raise exception using
      errcode = '22023',
      message = 'A non-zero quantity and reason are required';
  end if;

  perform 1
  from public.profiles
  where id = p_actor_profile_id
    and role = 'administrator'
    and is_active = true;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'An active administrator is required';
  end if;

  select stock_quantity
  into v_stock_before
  from public.products
  where id = p_product_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Product was not found';
  end if;

  v_stock_after := v_stock_before + p_quantity_delta;

  if v_stock_after < 0 then
    raise exception using
      errcode = '23514',
      message = 'Stock cannot become negative';
  end if;

  insert into public.inventory_movements (
    product_id,
    movement_type,
    quantity_delta,
    stock_before,
    stock_after,
    reason,
    created_by
  )
  values (
    p_product_id,
    'manual_adjustment',
    p_quantity_delta,
    v_stock_before,
    v_stock_after,
    btrim(p_reason),
    p_actor_profile_id
  );

  update public.products
  set stock_quantity = v_stock_after
  where id = p_product_id;

  insert into public.audit_logs (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_actor_profile_id,
    'stock_adjusted',
    'product',
    p_product_id,
    jsonb_build_object(
      'quantity_delta',
      p_quantity_delta,
      'reason',
      btrim(p_reason)
    )
  );

  return v_stock_after;
end;
$$;

create function public.transition_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_payment_status public.payment_status,
  p_actor_profile_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_status public.order_status;
  v_previous_payment_status public.payment_status;
begin
  if p_status = 'cancelled' then
    raise exception using
      errcode = '22023',
      message = 'Cancellations must use cancel_order_with_stock';
  end if;

  perform 1
  from public.profiles
  where id = p_actor_profile_id
    and role = 'administrator'
    and is_active = true;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'An active administrator is required';
  end if;

  select status, payment_status
  into v_previous_status, v_previous_payment_status
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return false;
  end if;

  if (
    v_previous_status,
    v_previous_payment_status
  ) is not distinct from (
    p_status,
    p_payment_status
  ) then
    return true;
  end if;

  update public.orders
  set
    status = p_status,
    payment_status = p_payment_status,
    picked_up_at = case
      when p_status = 'picked_up' then now()
      else null
    end
  where id = p_order_id;

  insert into public.audit_logs (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_actor_profile_id,
    'order_status_changed',
    'order',
    p_order_id,
    jsonb_build_object(
      'previous_status',
      v_previous_status,
      'next_status',
      p_status,
      'previous_payment_status',
      v_previous_payment_status,
      'next_payment_status',
      p_payment_status
    )
  );

  return true;
end;
$$;

create function public.link_guest_session_order(
  p_guest_session_id uuid,
  p_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted_count bigint;
begin
  perform 1
  from public.guest_sessions
  where id = p_guest_session_id
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Guest session is invalid';
  end if;

  perform 1
  from public.orders
  where id = p_order_id;

  if not found then
    return false;
  end if;

  insert into public.guest_session_orders (guest_session_id, order_id)
  values (p_guest_session_id, p_order_id)
  on conflict (guest_session_id, order_id) do nothing;

  get diagnostics v_inserted_count = row_count;
  return v_inserted_count > 0;
end;
$$;

create function public.purge_guest_sessions(
  p_retention interval default interval '7 days'
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted bigint;
begin
  if p_retention < interval '0 seconds' then
    raise exception using
      errcode = '22023',
      message = 'Retention cannot be negative';
  end if;

  delete from public.guest_sessions
  where coalesce(revoked_at, expires_at) < now() - p_retention;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

commit;
