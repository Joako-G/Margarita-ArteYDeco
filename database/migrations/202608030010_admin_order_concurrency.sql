drop function if exists public.cancel_order_with_stock(uuid, uuid, text);

create function public.cancel_order_with_stock(
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

  if v_order.status = 'picked_up' then
    raise exception using
      errcode = '23514',
      message = 'Picked up orders cannot be cancelled';
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
) from public, anon, authenticated;
grant execute on function public.cancel_order_with_stock(
  uuid,
  uuid,
  text,
  timestamptz,
  boolean
) to service_role;

drop function if exists public.transition_order_status(
  uuid,
  public.order_status,
  public.payment_status,
  uuid
);

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
    picked_up_at = case when p_status = 'picked_up' then now() else null end
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
) from public, anon, authenticated;
grant execute on function public.transition_order_status(
  uuid,
  public.order_status,
  public.payment_status,
  uuid,
  timestamptz
) to service_role;
