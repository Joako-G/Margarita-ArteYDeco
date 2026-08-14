-- Separa el ciclo operativo del pedido del ciclo de pago.
-- Los pedidos históricos conservan su historial: payment_pending pasa a pending
-- y paid pasa a confirmed; payment_status no se modifica.
begin;

drop function if exists public.transition_order_status(
  uuid,
  public.order_status,
  public.payment_status,
  uuid,
  timestamptz
);

drop trigger if exists orders_ensure_cancelled_stock_restored
  on public.orders;

drop trigger if exists orders_validate_change
  on public.orders;

alter table public.orders
  drop constraint orders_picked_up_timestamp_consistent;

alter table public.orders
  alter column status type text using status::text;

update public.orders
set status = case status
  when 'payment_pending' then 'pending'
  when 'paid' then 'confirmed'
  else status
end;

drop type public.order_status;

create type public.order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
  'cancelled'
);

alter table public.orders
  alter column status type public.order_status using status::public.order_status;

alter table public.orders
  add constraint orders_picked_up_timestamp_consistent check (
    (status = 'picked_up' and picked_up_at is not null)
    or (status <> 'picked_up' and picked_up_at is null)
  );

create or replace function public.validate_order_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_is_valid_transition boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' and new.payment_status = 'pending' then
      return new;
    end if;

    raise exception using
      errcode = '23514',
      message = 'Invalid initial order or payment status';
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
    new.delivery_method,
    new.shipping_address,
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
    old.delivery_method,
    old.shipping_address,
    old.notes,
    old.created_at
  ) then
    raise exception using
      errcode = '55000',
      message = 'Historical order fields are immutable';
  end if;

  if old.status in ('picked_up', 'delivered', 'cancelled')
    and new.status <> old.status then
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

  v_is_valid_transition :=
    new.status = old.status
    or (old.status = 'pending' and new.status = 'confirmed')
    or (old.status = 'confirmed' and new.status = 'preparing')
    or (old.status = 'preparing' and new.status = 'ready')
    or (
      old.status = 'ready'
      and new.status = 'picked_up'
      and new.delivery_method = 'pickup'
    )
    or (
      old.status = 'ready'
      and new.status = 'delivered'
      and new.delivery_method = 'shipping'
    )
    or (
      new.status = 'cancelled'
      and old.status not in ('picked_up', 'delivered', 'cancelled')
    );

  if not v_is_valid_transition then
    raise exception using
      errcode = '23514',
      message = 'Invalid order status transition';
  end if;

  if new.status in ('picked_up', 'delivered')
    and new.payment_status <> 'paid' then
    raise exception using
      errcode = '23514',
      message = 'A completed order requires paid payment status';
  end if;

  return new;
end;
$$;

create trigger orders_validate_change
before insert or update on public.orders
for each row execute function public.validate_order_change();

create trigger orders_ensure_cancelled_stock_restored
after update of status on public.orders
for each row execute function public.ensure_cancelled_order_stock_restored();

create or replace function public.cancel_order_with_stock(
  p_order_id uuid,
  p_actor_profile_id uuid,
  p_reason text,
  p_expected_updated_at timestamptz,
  p_confirm_manual_refund boolean
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

  if v_order.updated_at is distinct from p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = 'The order changed before cancellation';
  end if;

  if v_order.status = 'cancelled' then
    return false;
  end if;

  if v_order.status in ('picked_up', 'delivered') then
    raise exception using
      errcode = '23514',
      message = 'Fulfilled orders cannot be cancelled';
  end if;

  if v_order.payment_status = 'paid' and not p_confirm_manual_refund then
    raise exception using
      errcode = '23514',
      message = 'Paid orders require manual refund confirmation';
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
  set status = 'cancelled', picked_up_at = null
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

revoke execute on function public.cancel_order_with_stock(
  uuid,
  uuid,
  text,
  timestamptz,
  boolean
) from public, anon, authenticated, service_role;

grant execute on function public.cancel_order_with_stock(
  uuid,
  uuid,
  text,
  timestamptz,
  boolean
) to service_role;

create function public.transition_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_payment_status public.payment_status,
  p_actor_profile_id uuid,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_status public.order_status;
  v_previous_payment_status public.payment_status;
  v_updated_at timestamptz;
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

  select status, payment_status, updated_at
  into v_previous_status, v_previous_payment_status, v_updated_at
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return false;
  end if;

  if v_updated_at is distinct from p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = 'The order changed before transition';
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
      'previous_status', v_previous_status,
      'next_status', p_status,
      'previous_payment_status', v_previous_payment_status,
      'next_payment_status', p_payment_status
    )
  );

  return true;
end;
$$;

revoke execute on function public.transition_order_status(
  uuid,
  public.order_status,
  public.payment_status,
  uuid,
  timestamptz
) from public, anon, authenticated, service_role;

grant execute on function public.transition_order_status(
  uuid,
  public.order_status,
  public.payment_status,
  uuid,
  timestamptz
) to service_role;

commit;
