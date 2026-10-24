begin;

alter table public.inventory_movements
  drop constraint if exists inventory_movements_order_reference_consistent,
  drop constraint if exists inventory_movements_direction_consistent;

alter table public.inventory_movements
  add constraint inventory_movements_order_reference_consistent check (
    (
      movement_type in ('order_created', 'order_cancelled', 'payment_reservation_released', 'payment_re_reserved')
      and order_id is not null
      and withdrawal_request_id is null
    )
    or (
      movement_type in ('initial_stock', 'manual_adjustment')
      and order_id is null
      and withdrawal_request_id is null
    )
    or (
      movement_type = 'consumer_withdrawal_return'
      and order_id is not null
      and withdrawal_request_id is not null
    )
  ),
  add constraint inventory_movements_direction_consistent check (
    (movement_type in ('order_created', 'payment_re_reserved') and quantity_delta < 0)
    or (movement_type in ('initial_stock', 'order_cancelled', 'consumer_withdrawal_return', 'payment_reservation_released') and quantity_delta > 0)
    or movement_type = 'manual_adjustment'
  );

create unique index if not exists inventory_movements_payment_release_unique
  on public.inventory_movements(order_id, product_id)
  where movement_type = 'payment_reservation_released';

create unique index if not exists inventory_movements_payment_re_reserved_unique
  on public.inventory_movements(order_id, product_id)
  where movement_type = 'payment_re_reserved';

create or replace function public.release_payment_reservation_v2(
  p_order_id uuid, p_provider_state text, p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_item record;
  v_is_ambiguous boolean := p_provider_state = 'manual_review';
  v_movement_type public.inventory_movement_type;
begin
  if p_provider_state not in ('cancelled', 'rejected', 'expired', 'manual_review')
    or nullif(btrim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'Invalid payment reservation release decision';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.reservation_expires_at is null or v_order.payment_status = 'paid' then return false; end if;
  if exists (
    select 1 from public.inventory_movements
    where order_id = p_order_id and movement_type in ('order_cancelled', 'payment_reservation_released')
  ) then return false; end if;

  for v_attempt in select * from public.payment_attempts where order_id = p_order_id for update loop
    if v_attempt.status = 'approved' or v_attempt.provider_status = 'approved' then return false; end if;
  end loop;

  v_movement_type := case when v_is_ambiguous
    then 'payment_reservation_released'::public.inventory_movement_type
    else 'order_cancelled'::public.inventory_movement_type end;

  for v_item in
    select oi.product_id, oi.quantity, p.stock_quantity
    from public.order_items oi join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id order by oi.product_id for update of p
  loop
    insert into public.inventory_movements (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after, reason)
    values (v_item.product_id, p_order_id, v_movement_type, v_item.quantity, v_item.stock_quantity,
      v_item.stock_quantity + v_item.quantity, btrim(p_reason));
    update public.products set stock_quantity = stock_quantity + v_item.quantity where id = v_item.product_id;
  end loop;

  if v_is_ambiguous then
    perform set_config('margarita.payment_aggregate_transition', '1', true);
    update public.orders set status = 'pending', payment_status = 'pending' where id = p_order_id;
    perform set_config('margarita.payment_aggregate_transition', '0', true);
    update public.payment_attempts
    set status = 'manual_review', last_error = btrim(p_reason)
    where order_id = p_order_id and status in ('pending', 'rejected', 'manual_review');
  else
    update public.orders
    set status = 'cancelled', payment_status = 'rejected', reservation_expires_at = null, picked_up_at = null
    where id = p_order_id;
    update public.payment_attempts
    set status = 'expired'
    where order_id = p_order_id and status in ('pending', 'rejected', 'manual_review');
  end if;
  return true;
end;
$$;

create or replace function public.release_expired_payment_reservation_for_order_v2(p_order_id uuid)
returns table (examined_count integer, released_count integer, approved_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_state text;
  v_released boolean;
begin
  if p_order_id is null then
    raise exception using errcode = '22023', message = 'Payment order ID is required';
  end if;

  examined_count := 0;
  released_count := 0;
  approved_count := 0;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found
    or v_order.payment_method <> 'mercado_pago'
    or v_order.reservation_expires_at is null
    or v_order.reservation_expires_at > statement_timestamp()
    or v_order.status = 'cancelled'
    or v_order.payment_status = 'paid'
    or exists (
      select 1 from public.inventory_movements im
      where im.order_id = p_order_id
        and im.movement_type in ('order_cancelled', 'payment_reservation_released')
    ) then
    return next;
    return;
  end if;

  examined_count := 1;
  if exists (
    select 1 from public.payment_attempts
    where order_id = p_order_id and (status = 'approved' or provider_status = 'approved')
  ) then
    approved_count := 1;
    return next;
    return;
  end if;

  select case
    when bool_or(lower(coalesce(provider_status, '')) = 'unavailable') then 'manual_review'
    when exists (
      select 1 from public.payment_attempts pa
      join public.payment_transactions pt on pt.payment_attempt_id = pa.id
      where pa.order_id = p_order_id
        and (pt.status in ('pending', 'manual_review') or pt.review_required)
    ) then 'manual_review'
    when count(*) = 0 then 'expired'
    when bool_and(provider_payment_id is null)
      and bool_and(lower(coalesce(provider_status, '')) = 'not_found')
      and not exists (
        select 1 from public.payment_attempts pa
        join public.payment_transactions pt on pt.payment_attempt_id = pa.id
        where pa.order_id = p_order_id
      ) then 'expired'
    when bool_or(status in ('rejected', 'expired') or lower(coalesce(provider_status, '')) in ('rejected', 'cancelled', 'expired'))
      and not bool_or(status = 'manual_review')
      and not bool_or(lower(coalesce(provider_status, '')) in ('pending', 'in_process', 'unavailable')) then 'rejected'
    else 'manual_review'
  end into v_state
  from public.payment_attempts where order_id = p_order_id;

  v_released := public.release_payment_reservation_v2(p_order_id, v_state, 'reservation expired: ' || v_state);
  if v_released then released_count := 1; end if;
  return next;
end;
$$;

create or replace function public.release_expired_payment_reservations_v2(p_limit integer default 10)
returns table (examined_count integer, released_count integer, approved_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_result record;
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Reservation expiry batch size is invalid';
  end if;

  examined_count := 0;
  released_count := 0;
  approved_count := 0;
  for v_order_id in
    select o.id from public.orders o
    where o.payment_method = 'mercado_pago'
      and o.reservation_expires_at <= statement_timestamp()
      and o.status <> 'cancelled'
      and o.payment_status <> 'paid'
      and not exists (
        select 1 from public.inventory_movements im
        where im.order_id = o.id
          and im.movement_type in ('order_cancelled', 'payment_reservation_released')
      )
    order by o.reservation_expires_at, o.created_at, o.id
    for update skip locked limit p_limit
  loop
    select * into v_result
    from public.release_expired_payment_reservation_for_order_v2(v_order_id);
    examined_count := examined_count + v_result.examined_count;
    released_count := released_count + v_result.released_count;
    approved_count := approved_count + v_result.approved_count;
  end loop;
  return next;
end;
$$;

create or replace function public.validate_order_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_is_aggregate_payment_change boolean := new.payment_method = 'mercado_pago'
    and current_setting('margarita.payment_aggregate_transition', true) = '1'
    and old.payment_status <> 'paid'
    and new.payment_status in ('pending', 'rejected', 'paid')
    and new.status = old.status;
  v_is_late_approval boolean := new.status = 'confirmed'
    and new.payment_status = 'paid'
    and new.payment_method = 'mercado_pago'
    and current_setting('margarita.payment_late_approval', true) = '1'
    and (
      exists (
        select 1 from public.inventory_movements im
        where im.order_id = old.id and im.movement_type in ('order_cancelled', 'payment_reservation_released')
      )
      or (
        old.reservation_expires_at <= statement_timestamp()
        and exists (
          select 1 from public.inventory_movements im
          where im.order_id = old.id and im.movement_type = 'order_created'
        )
      )
    );
  v_is_late_approval_review boolean := old.status = 'cancelled'
    and new.status = 'pending'
    and new.payment_status = 'paid'
    and new.payment_method = 'mercado_pago'
    and current_setting('margarita.payment_late_approval_review', true) = '1'
    and exists (
      select 1 from public.inventory_movements im
      where im.order_id = old.id and im.movement_type = 'order_cancelled'
    );
  v_is_late_approval_manual boolean := old.status = 'pending'
    and new.status = 'pending'
    and old.payment_status <> 'paid'
    and new.payment_status = 'paid'
    and new.payment_method = 'mercado_pago'
    and old.reservation_expires_at <= statement_timestamp()
    and current_setting('margarita.payment_late_approval_review', true) = '1'
    and exists (
      select 1 from public.inventory_movements im
      where im.order_id = old.id and im.movement_type = 'payment_reservation_released'
    );
  v_is_valid_transition boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' and new.payment_status = 'pending' then return new; end if;
    raise exception using errcode = '23514', message = 'Invalid initial order or payment status';
  end if;
  if (
    new.id, new.customer_id, new.customer_first_name, new.customer_last_name,
    new.customer_phone, new.customer_phone_normalized, new.order_number,
    new.subtotal, new.discount, new.total, new.payment_method,
    new.delivery_method, new.shipping_address, new.notes, new.created_at
  ) is distinct from (
    old.id, old.customer_id, old.customer_first_name, old.customer_last_name,
    old.customer_phone, old.customer_phone_normalized, old.order_number,
    old.subtotal, old.discount, old.total, old.payment_method,
    old.delivery_method, old.shipping_address, old.notes, old.created_at
  ) then raise exception using errcode = '55000', message = 'Historical order fields are immutable'; end if;
  if old.status in ('picked_up', 'delivered', 'cancelled') and new.status <> old.status
    and not v_is_late_approval and not v_is_late_approval_review then
    raise exception using errcode = '23514', message = 'Terminal orders cannot be reopened';
  end if;
  if old.payment_status in ('paid', 'rejected') and new.payment_status <> old.payment_status
    and not v_is_aggregate_payment_change and not v_is_late_approval and not v_is_late_approval_review then
    raise exception using errcode = '23514', message = 'Terminal payment status cannot be changed';
  end if;
  if new.payment_method = 'mercado_pago'
    and old.payment_status <> 'paid' and new.payment_status = 'paid'
    and not v_is_aggregate_payment_change and not v_is_late_approval
    and not v_is_late_approval_review and not v_is_late_approval_manual then
    raise exception using errcode = '23514', message = 'Mercado Pago payment requires provider reconciliation';
  end if;
  v_is_valid_transition := new.status = old.status
    or (old.status = 'pending' and new.status = 'confirmed')
    or (old.status = 'confirmed' and new.status = 'preparing')
    or (old.status = 'preparing' and new.status = 'ready')
    or (old.status = 'ready' and new.status = 'picked_up' and new.delivery_method = 'pickup')
    or (old.status = 'ready' and new.status = 'delivered' and new.delivery_method = 'shipping')
    or (new.status = 'cancelled' and old.status not in ('picked_up', 'delivered', 'cancelled'))
    or v_is_late_approval
    or v_is_late_approval_review;
  if not v_is_valid_transition then raise exception using errcode = '23514', message = 'Invalid order status transition'; end if;
  if new.status in ('picked_up', 'delivered') and new.payment_status <> 'paid' then
    raise exception using errcode = '23514', message = 'A completed order requires paid payment status';
  end if;
  return new;
end;
$$;

-- Reconciliation lock hierarchy: order -> attempt -> provider transaction ->
-- products in product_id order. Parent-ID discovery reads are unlocked hints;
-- relationships and expected provider state are revalidated after locking.
create or replace function public.transition_payment_attempt_v2(
  p_attempt_id uuid, p_provider_status text, p_provider_updated_at timestamptz,
  p_provider_version bigint, p_expected_status public.payment_attempt_status,
  p_expected_provider_version bigint, p_next_status public.payment_attempt_status
)
returns table (transition_applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_order_id uuid;
  v_item record;
  v_can_re_reserve boolean := true;
  v_was_released boolean := false;
  v_applied_status public.payment_attempt_status;
  v_description text;
begin
  select pa.order_id into v_order_id from public.payment_attempts pa where pa.id = p_attempt_id;
  if not found then
    transition_applied := false; return next; return;
  end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then
    transition_applied := false; return next; return;
  end if;
  select * into v_attempt from public.payment_attempts where id = p_attempt_id for update;
  if not found or v_attempt.order_id is distinct from v_order.id
    or v_attempt.status <> p_expected_status
    or (p_expected_provider_version is null and v_attempt.provider_version is not null)
    or (p_expected_provider_version is not null and v_attempt.provider_version <> p_expected_provider_version)
    or (v_order.payment_status = 'paid' and p_next_status <> 'approved') then
    transition_applied := false; return next; return;
  end if;

  if p_next_status = 'approved' then
    v_was_released := exists (
      select 1 from public.inventory_movements
      where order_id = v_order.id and movement_type in ('payment_reservation_released', 'order_cancelled')
    );
    if v_was_released and not exists (
      select 1 from public.inventory_movements where order_id = v_order.id and movement_type = 'payment_re_reserved'
    ) then
      for v_item in
        select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi
        join public.products p on p.id = oi.product_id where oi.order_id = v_order.id
        order by oi.product_id for update of p
      loop
        if v_item.stock_quantity < v_item.quantity then v_can_re_reserve := false; end if;
      end loop;
      if not v_can_re_reserve then
        update public.payment_attempts
        set status = 'manual_review', provider_status = p_provider_status,
          provider_updated_at = p_provider_updated_at, provider_version = p_provider_version,
          last_error = 'Late approval could not be re-reserved: insufficient stock'
        where id = v_attempt.id;
        perform set_config('margarita.payment_late_approval_review', '1', true);
        update public.orders set status = 'pending', payment_status = 'paid' where id = v_order.id;
        perform set_config('margarita.payment_late_approval_review', '0', true);
        insert into public.audit_logs (action, entity_type, entity_id, metadata)
        values (case when v_attempt.status is distinct from 'manual_review'::public.payment_attempt_status
          then 'payment_status_changed' else 'payment_provider_updated' end,
          'payment_attempt', v_attempt.id,
          jsonb_build_object('description', 'Late provider approval requires manual review because inventory could not be re-reserved.',
            'previous_status', v_attempt.status::text, 'next_status', 'manual_review',
            'provider_status', p_provider_status, 'provider_version', p_provider_version,
            'provider_updated_at', p_provider_updated_at));
        transition_applied := true; return next; return;
      end if;
      perform set_config('margarita.payment_late_approval', '1', true);
      for v_item in
        select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi
        join public.products p on p.id = oi.product_id where oi.order_id = v_order.id
        order by oi.product_id for update of p
      loop
        insert into public.inventory_movements (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after, reason)
        values (v_item.product_id, v_order.id, 'payment_re_reserved', -v_item.quantity,
          v_item.stock_quantity, v_item.stock_quantity - v_item.quantity, 'late payment approval');
        update public.products set stock_quantity = stock_quantity - v_item.quantity where id = v_item.product_id;
      end loop;
      update public.orders set status = 'confirmed', payment_status = 'paid' where id = v_order.id;
      perform set_config('margarita.payment_late_approval', '0', true);
    elsif v_attempt.reservation_expires_at <= statement_timestamp() then
      perform set_config('margarita.payment_late_approval', '1', true);
      update public.orders set status = 'confirmed', payment_status = 'paid' where id = v_order.id;
      perform set_config('margarita.payment_late_approval', '0', true);
    end if;
  end if;

  update public.payment_attempts set provider_status = p_provider_status,
    provider_updated_at = p_provider_updated_at, provider_version = p_provider_version, status = p_next_status
  where id = v_attempt.id;
  v_applied_status := p_next_status;
  v_description := case when v_attempt.status is distinct from v_applied_status
    then format('Payment attempt status changed from %s to %s.', v_attempt.status::text, v_applied_status::text)
    else format('Provider information updated; payment attempt status remains %s.', v_applied_status::text) end;
  insert into public.audit_logs (action, entity_type, entity_id, metadata)
  values (case when v_attempt.status is distinct from v_applied_status
      then 'payment_status_changed' else 'payment_provider_updated' end,
    'payment_attempt', v_attempt.id,
    jsonb_build_object('description', v_description,
      'previous_status', v_attempt.status::text, 'next_status', v_applied_status::text,
      'provider_status', p_provider_status, 'provider_version', p_provider_version,
      'provider_updated_at', p_provider_updated_at));
  if p_next_status = 'approved' and not v_was_released then
    perform set_config('margarita.payment_aggregate_transition', '1', true);
    update public.orders set payment_status = 'paid' where id = v_order.id and payment_status <> 'paid';
    perform set_config('margarita.payment_aggregate_transition', '0', true);
  elsif p_next_status in ('pending', 'rejected') and v_order.payment_status <> 'paid' then
    perform set_config('margarita.payment_aggregate_transition', '1', true);
    update public.orders set payment_status = p_next_status::text::public.payment_status
    where id = v_order.id and payment_status <> p_next_status::text::public.payment_status;
    perform set_config('margarita.payment_aggregate_transition', '0', true);
  end if;
  transition_applied := true;
  return next;
end;
$$;

create or replace function public.reconcile_payment_attempt_aggregate_v2(p_attempt_id uuid)
returns public.payment_attempt_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_transaction public.payment_transactions%rowtype;
  v_approved_amount numeric(12, 2);
  v_has_pending boolean;
  v_has_review boolean;
  v_aggregate public.payment_attempt_status;
  v_item record;
  v_released boolean;
  v_can_re_reserve boolean := true;
  v_order_id uuid;
  v_previous_status public.payment_attempt_status;
  v_applied_status public.payment_attempt_status;
  v_effective_provider_status text;
  v_effective_provider_version bigint;
  v_effective_provider_updated_at timestamptz;
begin
  -- Lock parents in canonical order. The unlocked attempt lookup is only a hint;
  -- verify the relationship again after taking both locks.
  select pa.order_id into v_order_id from public.payment_attempts pa where pa.id = p_attempt_id;
  if not found then return 'manual_review'; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then return 'manual_review'; end if;
  select * into v_attempt from public.payment_attempts where id = p_attempt_id for update;
  if not found or v_attempt.order_id is distinct from v_order.id then return 'manual_review'; end if;
  v_previous_status := v_attempt.status;
  select coalesce(sum(pt.amount) filter (where pt.status = 'approved'), 0),
    coalesce(bool_or(pt.status = 'pending'), false),
    coalesce(bool_or(pt.status = 'manual_review' or pt.review_required), false)
  into v_approved_amount, v_has_pending, v_has_review
  from public.payment_transactions pt where pt.payment_attempt_id = v_attempt.id;

  if v_has_review or v_approved_amount > v_order.total then v_aggregate := 'manual_review';
  elsif v_approved_amount = v_order.total then v_aggregate := 'approved';
  elsif v_has_pending then v_aggregate := 'pending';
  elsif exists (select 1 from public.payment_transactions pt where pt.payment_attempt_id = v_attempt.id and pt.status in ('rejected', 'expired')) then v_aggregate := 'rejected';
  else v_aggregate := 'manual_review'; end if;

  if v_aggregate = 'approved' then
    select * into v_transaction from public.payment_transactions
    where payment_attempt_id = v_attempt.id and status = 'approved'
    order by updated_at desc, id desc limit 1;
    v_released := exists (
      select 1 from public.inventory_movements
      where order_id = v_order.id and movement_type in ('payment_reservation_released', 'order_cancelled')
    );
    if v_released and not exists (
      select 1 from public.inventory_movements where order_id = v_order.id and movement_type = 'payment_re_reserved'
    ) then
      for v_item in
        select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi
        join public.products p on p.id = oi.product_id where oi.order_id = v_order.id
        order by oi.product_id for update of p
      loop
        if v_item.stock_quantity < v_item.quantity then v_can_re_reserve := false; end if;
      end loop;
      if not v_can_re_reserve then
        update public.payment_attempts set status = 'manual_review', provider_status = 'approved',
          last_error = 'Late approval could not be re-reserved: insufficient stock' where id = v_attempt.id;
        perform set_config('margarita.payment_late_approval_review', '1', true);
        update public.orders set status = 'pending', payment_status = 'paid' where id = v_order.id;
        perform set_config('margarita.payment_late_approval_review', '0', true);
        insert into public.audit_logs (action, entity_type, entity_id, metadata)
        values (case when v_previous_status is distinct from 'manual_review'::public.payment_attempt_status
          then 'payment_status_changed' else 'payment_provider_updated' end,
          'payment_attempt', v_attempt.id,
          jsonb_build_object('description', 'Transaction aggregate resolved to manual review because inventory could not be re-reserved.',
            'previous_status', v_previous_status::text, 'next_status', 'manual_review',
            'provider_status', coalesce(v_transaction.provider_status, 'approved'),
            'provider_version', v_transaction.provider_version,
            'provider_updated_at', v_transaction.provider_updated_at));
        return 'manual_review';
      end if;
      perform set_config('margarita.payment_late_approval', '1', true);
      for v_item in
        select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi
        join public.products p on p.id = oi.product_id where oi.order_id = v_order.id
        order by oi.product_id for update of p
      loop
        insert into public.inventory_movements (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after, reason)
        values (v_item.product_id, v_order.id, 'payment_re_reserved', -v_item.quantity,
          v_item.stock_quantity, v_item.stock_quantity - v_item.quantity, 'late payment approval');
        update public.products set stock_quantity = stock_quantity - v_item.quantity where id = v_item.product_id;
      end loop;
      update public.orders set status = 'confirmed', payment_status = 'paid' where id = v_order.id;
      perform set_config('margarita.payment_late_approval', '0', true);
    elsif v_attempt.reservation_expires_at <= statement_timestamp() then
      perform set_config('margarita.payment_late_approval', '1', true);
      update public.orders set status = 'confirmed', payment_status = 'paid' where id = v_order.id;
      perform set_config('margarita.payment_late_approval', '0', true);
    end if;
    perform set_config('margarita.payment_aggregate_transition', '1', true);
    update public.payment_attempts set provider_payment_id = v_transaction.provider_payment_id,
      provider_status = coalesce(v_transaction.provider_status, 'approved'),
      provider_updated_at = v_transaction.provider_updated_at,
      provider_version = v_transaction.provider_version,
      status = case when v_released and not v_can_re_reserve then 'manual_review'::public.payment_attempt_status
        else 'approved'::public.payment_attempt_status end,
      last_error = case when v_released and not v_can_re_reserve then last_error else null end
    where id = v_attempt.id;
    update public.orders set payment_status = 'paid' where id = v_order.id and payment_status <> 'paid';
    v_applied_status := case when v_released and not v_can_re_reserve then 'manual_review'::public.payment_attempt_status else 'approved'::public.payment_attempt_status end;
    v_effective_provider_status := coalesce(v_transaction.provider_status, 'approved');
    v_effective_provider_version := v_transaction.provider_version;
    v_effective_provider_updated_at := v_transaction.provider_updated_at;
    perform set_config('margarita.payment_aggregate_transition', '0', true);
  else
    select * into v_transaction from public.payment_transactions
    where payment_attempt_id = v_attempt.id
    order by updated_at desc, id desc limit 1;
    perform set_config('margarita.payment_aggregate_transition', '1', true);
    update public.payment_attempts set status = v_aggregate,
      provider_payment_id = coalesce(v_transaction.provider_payment_id, provider_payment_id),
      provider_status = coalesce(v_transaction.provider_status, provider_status),
      provider_updated_at = coalesce(v_transaction.provider_updated_at, provider_updated_at),
      provider_version = coalesce(v_transaction.provider_version, provider_version),
      last_error = case when v_aggregate = 'manual_review'
        then coalesce(last_error, 'Payment transaction aggregate requires review') else null end
    where id = v_attempt.id and status <> 'approved';
    select status into v_applied_status from public.payment_attempts where id = v_attempt.id;
    v_effective_provider_status := coalesce(v_transaction.provider_status, v_attempt.provider_status);
    v_effective_provider_version := coalesce(v_transaction.provider_version, v_attempt.provider_version);
    v_effective_provider_updated_at := coalesce(v_transaction.provider_updated_at, v_attempt.provider_updated_at);
    if v_aggregate in ('pending', 'rejected') and v_order.payment_status <> 'paid' then
      update public.orders set payment_status = v_aggregate::text::public.payment_status where id = v_order.id;
    end if;
    perform set_config('margarita.payment_aggregate_transition', '0', true);
  end if;
  if v_previous_status is distinct from v_applied_status then
    insert into public.audit_logs (action, entity_type, entity_id, metadata)
        values (case when v_previous_status is distinct from 'manual_review'::public.payment_attempt_status
          then 'payment_status_changed' else 'payment_provider_updated' end, 'payment_attempt', v_attempt.id,
      jsonb_build_object('description', format('Transaction aggregate changed payment attempt status from %s to %s.', v_previous_status::text, v_applied_status::text),
        'previous_status', v_previous_status::text, 'next_status', v_applied_status::text,
        'provider_status', v_effective_provider_status, 'provider_version', v_effective_provider_version,
        'provider_updated_at', v_effective_provider_updated_at));
  elsif v_aggregate = 'manual_review' then
    insert into public.audit_logs (action, entity_type, entity_id, metadata)
    values ('payment_provider_updated', 'payment_attempt', v_attempt.id,
      jsonb_build_object('description', 'Transaction aggregate requires review; the approved payment-attempt status was preserved.',
        'previous_status', v_previous_status::text, 'next_status', v_applied_status::text,
        'aggregate_status', v_aggregate::text, 'provider_status', v_effective_provider_status,
        'provider_version', v_effective_provider_version, 'provider_updated_at', v_effective_provider_updated_at));
  end if;
  return v_aggregate;
end;
$$;

create or replace function public.reconcile_payment_transaction_v1(
  p_transaction_id uuid,
  p_expected_status public.payment_attempt_status,
  p_expected_provider_version bigint,
  p_next_status public.payment_attempt_status,
  p_provider_status text,
  p_provider_updated_at timestamptz,
  p_provider_version bigint,
  p_review_required boolean,
  p_last_error text
)
returns table (transition_applied boolean, aggregate_status public.payment_attempt_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction public.payment_transactions%rowtype;
  v_attempt_id uuid;
  v_order_id uuid;
  v_order_status public.order_status;
  v_attempt_order_id uuid;
  v_can_transition boolean;
begin
  -- Parent IDs are immutable lookup hints. Acquire all mutable rows in the
  -- shared order -> attempt -> transaction order, then re-read relationships.
  select pt.payment_attempt_id into v_attempt_id
  from public.payment_transactions pt where pt.id = p_transaction_id;
  if not found then
    transition_applied := false;
    aggregate_status := 'manual_review';
    return next;
    return;
  end if;

  select pa.order_id into v_order_id
  from public.payment_attempts pa where pa.id = v_attempt_id;
  if not found then
    transition_applied := false;
    aggregate_status := 'manual_review';
    return next;
    return;
  end if;

  select o.status into v_order_status
  from public.orders o where o.id = v_order_id for update;
  if not found then
    transition_applied := false;
    aggregate_status := 'manual_review';
    return next;
    return;
  end if;

  select pa.order_id into v_attempt_order_id
  from public.payment_attempts pa where pa.id = v_attempt_id for update;
  if not found or v_attempt_order_id is distinct from v_order_id then
    transition_applied := false;
    aggregate_status := 'manual_review';
    return next;
    return;
  end if;

  select * into v_transaction from public.payment_transactions pt
  where pt.id = p_transaction_id for update;
  if not found or v_transaction.payment_attempt_id is distinct from v_attempt_id then
    transition_applied := false;
    aggregate_status := 'manual_review';
    return next;
    return;
  end if;

  -- Provider state/version are checked only after all rows have been locked.
  v_can_transition := v_transaction.status = p_expected_status
    and (p_expected_provider_version is null and v_transaction.provider_version is null
      or p_expected_provider_version is not null and v_transaction.provider_version = p_expected_provider_version)
    and not (
      v_order_status = 'cancelled'
      and p_next_status = 'approved'
      and not exists (
        select 1 from public.inventory_movements im
        where im.order_id = v_order_id and im.movement_type = 'order_cancelled'
      )
    );

  if v_can_transition then
    update public.payment_transactions
    set status = p_next_status,
        provider_status = p_provider_status,
        provider_updated_at = p_provider_updated_at,
        provider_version = p_provider_version,
        review_required = p_review_required,
        last_error = p_last_error
    where id = p_transaction_id;
    transition_applied := true;
  else
    transition_applied := false;
  end if;

  aggregate_status := public.reconcile_payment_attempt_aggregate_v2(v_attempt_id);
  return next;
end;
$$;

revoke execute on function public.release_payment_reservation_v2(uuid, text, text) from public, anon, authenticated;
grant execute on function public.release_payment_reservation_v2(uuid, text, text) to service_role;
revoke execute on function public.release_expired_payment_reservation_for_order_v2(uuid) from public, anon, authenticated;
grant execute on function public.release_expired_payment_reservation_for_order_v2(uuid) to service_role;
revoke execute on function public.release_expired_payment_reservations_v2(integer) from public, anon, authenticated;
grant execute on function public.release_expired_payment_reservations_v2(integer) to service_role;
revoke execute on function public.transition_payment_attempt_v2(uuid, text, timestamptz, bigint, public.payment_attempt_status, bigint, public.payment_attempt_status) from public, anon, authenticated;
grant execute on function public.transition_payment_attempt_v2(uuid, text, timestamptz, bigint, public.payment_attempt_status, bigint, public.payment_attempt_status) to service_role;
revoke execute on function public.reconcile_payment_attempt_aggregate_v2(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_payment_attempt_aggregate_v2(uuid) to service_role;
revoke execute on function public.reconcile_payment_transaction_v1(
  uuid, public.payment_attempt_status, bigint, public.payment_attempt_status,
  text, timestamptz, bigint, boolean, text
) from public, anon, authenticated;
grant execute on function public.reconcile_payment_transaction_v1(
  uuid, public.payment_attempt_status, bigint, public.payment_attempt_status,
  text, timestamptz, bigint, boolean, text
) to service_role;

commit;
