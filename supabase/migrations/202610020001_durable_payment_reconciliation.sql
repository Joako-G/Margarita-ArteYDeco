-- Durable 24-hour Checkout Pro reconciliation. This migration is additive and
-- replaces only the payment RPCs whose policy changed.

begin;

alter table public.inventory_movements
  drop constraint if exists inventory_movements_order_reference_consistent,
  drop constraint if exists inventory_movements_direction_consistent;

alter table public.inventory_movements
  add constraint inventory_movements_order_reference_consistent check (
    (
      movement_type in ('order_created', 'order_cancelled', 'payment_re_reserved')
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
    or (
      movement_type in ('initial_stock', 'order_cancelled', 'consumer_withdrawal_return')
      and quantity_delta > 0
    )
    or movement_type = 'manual_adjustment'
  );

create or replace function public.enqueue_payment_reconciliation_v2(
  p_attempt_id uuid,
  p_run_at timestamptz default statement_timestamp()
)
returns table (job_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(hashtext(p_attempt_id::text));
  if not exists (select 1 from public.payment_attempts where id = p_attempt_id) then
    return;
  end if;

  select id into v_job_id
  from public.payment_jobs
  where attempt_id = p_attempt_id
    and operation = 'reconcile_order'
    and status in ('pending', 'leased')
  order by created_at
  limit 1;

  if v_job_id is null then
    insert into public.payment_jobs (attempt_id, operation, run_at)
    values (p_attempt_id, 'reconcile_order', coalesce(p_run_at, statement_timestamp()))
    returning id into v_job_id;
  elsif exists (
    select 1 from public.payment_jobs
    where id = v_job_id and status = 'pending'
      and run_at > coalesce(p_run_at, statement_timestamp())
  ) then
    update public.payment_jobs
    set run_at = coalesce(p_run_at, statement_timestamp())
    where id = v_job_id;
  end if;

  job_id := v_job_id;
  return next;
end;
$$;

create or replace function public.acknowledge_payment_webhook_v2(
  p_environment text,
  p_request_id text,
  p_resource_id text,
  p_resource_type text,
  p_signature_digest bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inbox_id uuid;
  v_attempt_id uuid;
begin
  if p_environment not in ('sandbox', 'production')
    or nullif(btrim(p_request_id), '') is null
    or nullif(btrim(p_resource_id), '') is null
    or nullif(btrim(p_resource_type), '') is null
    or octet_length(p_signature_digest) <> 32 then
    raise exception using errcode = '22023', message = 'Payment webhook data is invalid';
  end if;

  insert into public.payment_inbox (environment, request_id, resource_id, resource_type, signature_digest)
  values (p_environment, p_request_id, p_resource_id, p_resource_type, p_signature_digest)
  on conflict (provider, environment, request_id, resource_id) do nothing
  returning id into v_inbox_id;
  if v_inbox_id is null then return true; end if;

  if p_resource_type = 'payment' then
    select id into v_attempt_id
    from public.payment_attempts
    where environment = p_environment and provider_payment_id = p_resource_id
    order by created_at desc limit 1;
  end if;

  if v_attempt_id is not null then
    perform public.enqueue_payment_reconciliation_v2(v_attempt_id, statement_timestamp());
  else
    insert into public.payment_jobs (inbox_id, operation, run_at)
    values (v_inbox_id, 'reconcile_order', statement_timestamp());
  end if;
  return false;
end;
$$;

-- PostgreSQL is the authority for the reservation. The value is calculated
-- from one statement timestamp inside the same atomic initialization RPC.
create or replace function public.create_order_with_payment_v2(
  p_guest_session_id uuid,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_phone text,
  p_customer_phone_normalized text,
  p_items jsonb,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_environment text,
  p_delivery_method public.delivery_method,
  p_shipping_address text default null,
  p_notes text default null
)
returns table (order_id uuid, attempt_id uuid, reservation_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_attempt_id uuid;
  v_expires_at timestamptz := statement_timestamp() + interval '24 hours';
  v_order_number text;
  v_existing_fingerprint text;
begin
  if p_environment not in ('sandbox', 'production')
    or p_idempotency_key !~ '^[A-Za-z0-9._:-]{16,128}$'
    or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Payment initialization data is invalid';
  end if;

  select k.order_id, k.request_fingerprint into v_order_id, v_existing_fingerprint
  from public.order_idempotency_keys as k
  where k.guest_session_id = p_guest_session_id
    and k.idempotency_key_hash = extensions.digest(pg_catalog.convert_to(p_idempotency_key, 'utf8'), 'sha256')
  for update;
  if v_order_id is not null then
    if v_existing_fingerprint <> p_request_fingerprint then
      raise exception using errcode = '23505', message = 'Idempotency key was already used with another request';
    end if;
    select pa.id, pa.reservation_expires_at into v_attempt_id, v_expires_at
    from public.payment_attempts as pa where pa.order_id = v_order_id order by pa.created_at limit 1;
    return query select v_order_id, v_attempt_id, v_expires_at;
    return;
  end if;

  select o.order_id, o.order_number into v_order_id, v_order_number
  from public.create_order_with_stock(
    p_guest_session_id, p_customer_first_name, p_customer_last_name,
    p_customer_phone, p_customer_phone_normalized, 'mercado_pago', p_items,
    p_idempotency_key, p_request_fingerprint, p_delivery_method,
    p_shipping_address, p_notes
  ) as o;

  update public.orders set reservation_expires_at = v_expires_at where id = v_order_id;
  insert into public.payment_attempts (
    order_id, environment, external_reference, operation_key, amount, reservation_expires_at
  )
  select v_order_id, p_environment, o.order_number, p_idempotency_key, o.total, v_expires_at
  from public.orders as o where o.id = v_order_id returning id into v_attempt_id;
  insert into public.payment_outbox (attempt_id, operation, idempotency_key, payload)
  values (v_attempt_id, 'create_order', p_idempotency_key,
    jsonb_build_object('attempt_id', v_attempt_id, 'external_reference', v_order_number));
  return query select v_order_id, v_attempt_id, v_expires_at;
end;
$$;

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
begin
  if p_provider_state not in ('cancelled', 'rejected', 'expired', 'manual_review')
    or nullif(btrim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'Invalid payment reservation release decision';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.reservation_expires_at is null or v_order.payment_status = 'paid' then return false; end if;
  if exists (select 1 from public.inventory_movements where order_id = p_order_id and movement_type = 'order_cancelled') then return false; end if;

  for v_attempt in select * from public.payment_attempts where order_id = p_order_id for update loop
    if v_attempt.status = 'approved' or v_attempt.provider_status = 'approved' then return false; end if;
  end loop;
  for v_item in
    select oi.product_id, oi.quantity, p.stock_quantity
    from public.order_items oi join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id order by oi.product_id for update of p
  loop
    insert into public.inventory_movements (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after, reason)
    values (v_item.product_id, p_order_id, 'order_cancelled', v_item.quantity, v_item.stock_quantity, v_item.stock_quantity + v_item.quantity, btrim(p_reason));
    update public.products set stock_quantity = stock_quantity + v_item.quantity where id = v_item.product_id;
  end loop;
  update public.orders set status = 'cancelled', payment_status = (case when p_provider_state = 'manual_review' then 'pending' else 'rejected' end)::public.payment_status, reservation_expires_at = null, picked_up_at = null where id = p_order_id;
  update public.payment_attempts set status = (case when p_provider_state = 'manual_review' then 'manual_review' else 'expired' end)::public.payment_attempt_status, last_error = case when p_provider_state = 'manual_review' then btrim(p_reason) else last_error end where order_id = p_order_id and status in ('pending', 'rejected');
  return true;
end;
$$;

create or replace function public.release_expired_payment_reservations_v2(p_limit integer default 10)
returns table (examined_count integer, released_count integer, approved_count integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_order_id uuid;
  v_state text;
  v_released boolean;
begin
  if p_limit < 1 or p_limit > 100 then raise exception using errcode = '22023', message = 'Reservation expiry batch size is invalid'; end if;
  examined_count := 0; released_count := 0; approved_count := 0;
  for v_order_id in
    select o.id from public.orders o
    where o.payment_method = 'mercado_pago' and o.reservation_expires_at <= statement_timestamp()
      and o.status <> 'cancelled' and o.payment_status <> 'paid'
    order by o.reservation_expires_at, o.created_at, o.id for update skip locked limit p_limit
  loop
    examined_count := examined_count + 1;
    if exists (select 1 from public.payment_attempts where order_id = v_order_id and (status = 'approved' or provider_status = 'approved')) then
      approved_count := approved_count + 1;
    else
      select case
        when count(*) = 0 or bool_and(provider_payment_id is null) then 'expired'
        when bool_or(status in ('rejected', 'expired') or lower(coalesce(provider_status, '')) in ('rejected', 'cancelled', 'expired')) and not bool_or(status in ('pending', 'manual_review')) then 'rejected'
        else 'manual_review'
      end into v_state from public.payment_attempts where order_id = v_order_id;
      v_released := public.release_payment_reservation_v2(v_order_id, v_state, 'reservation expired: ' || v_state);
      if v_released then released_count := released_count + 1; end if;
    end if;
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
  v_is_valid_transition boolean := false;
  v_is_payment_retry_approval boolean := old.payment_status = 'rejected'
    and new.payment_status = 'paid'
    and new.payment_method = 'mercado_pago'
    and current_setting('margarita.payment_aggregate_approved', true) = '1';
  v_is_late_approval boolean := old.status = 'cancelled'
    and new.status = 'confirmed'
    and new.payment_status = 'paid'
    and new.payment_method = 'mercado_pago'
    and current_setting('margarita.payment_late_approval', true) = '1';
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
  if old.status in ('picked_up', 'delivered', 'cancelled') and new.status <> old.status and not v_is_late_approval then
    raise exception using errcode = '23514', message = 'Terminal orders cannot be reopened';
  end if;
  if old.payment_status in ('paid', 'rejected') and new.payment_status <> old.payment_status
    and not v_is_payment_retry_approval and not v_is_late_approval then
    raise exception using errcode = '23514', message = 'Terminal payment status cannot be changed';
  end if;
  v_is_valid_transition := new.status = old.status
    or (old.status = 'pending' and new.status = 'confirmed')
    or (old.status = 'confirmed' and new.status = 'preparing')
    or (old.status = 'preparing' and new.status = 'ready')
    or (old.status = 'ready' and new.status = 'picked_up' and new.delivery_method = 'pickup')
    or (old.status = 'ready' and new.status = 'delivered' and new.delivery_method = 'shipping')
    or (new.status = 'cancelled' and old.status not in ('picked_up', 'delivered', 'cancelled'))
    or v_is_late_approval;
  if not v_is_valid_transition then raise exception using errcode = '23514', message = 'Invalid order status transition'; end if;
  if new.status in ('picked_up', 'delivered') and new.payment_status <> 'paid' then
    raise exception using errcode = '23514', message = 'A completed order requires paid payment status';
  end if;
  return new;
end;
$$;

-- Late approved payments serialize on the order first. After expiry the order
-- may be re-reserved only when every product is available again.
create or replace function public.transition_payment_attempt_v2(
  p_attempt_id uuid, p_provider_status text, p_provider_updated_at timestamptz,
  p_provider_version bigint, p_expected_status public.payment_attempt_status,
  p_expected_provider_version bigint, p_next_status public.payment_attempt_status
)
returns table (transition_applied boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_item record;
  v_can_re_reserve boolean := true;
begin
  select o.* into v_order from public.orders o join public.payment_attempts pa on pa.order_id = o.id where pa.id = p_attempt_id for update of o;
  select * into v_attempt from public.payment_attempts where id = p_attempt_id for update;
  if not found or v_attempt.status <> p_expected_status
    or (p_expected_provider_version is null and v_attempt.provider_version is not null)
    or (p_expected_provider_version is not null and v_attempt.provider_version <> p_expected_provider_version)
    or (v_order.payment_status = 'paid' and p_next_status <> 'approved') then
    transition_applied := false; return next; return;
  end if;

  if p_next_status = 'approved' and v_order.status = 'cancelled' then
    for v_item in select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi join public.products p on p.id = oi.product_id where oi.order_id = v_order.id order by oi.product_id for update of p loop
      if v_item.stock_quantity < v_item.quantity then v_can_re_reserve := false; end if;
    end loop;
    if not v_can_re_reserve then
      update public.payment_attempts set status = 'manual_review', provider_status = p_provider_status, provider_updated_at = p_provider_updated_at, provider_version = p_provider_version, last_error = 'Late approval could not be re-reserved: insufficient stock' where id = v_attempt.id;
      transition_applied := false; return next;
    end if;
    perform set_config('margarita.payment_late_approval', '1', true);
    for v_item in select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi join public.products p on p.id = oi.product_id where oi.order_id = v_order.id order by oi.product_id for update of p loop
      insert into public.inventory_movements (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after, reason)
      values (v_item.product_id, v_order.id, 'payment_re_reserved', -v_item.quantity, v_item.stock_quantity, v_item.stock_quantity - v_item.quantity, 'late payment approval');
      update public.products set stock_quantity = stock_quantity - v_item.quantity where id = v_item.product_id;
    end loop;
    update public.orders set status = 'confirmed', payment_status = 'paid', reservation_expires_at = null where id = v_order.id;
  end if;

  update public.payment_attempts set provider_status = p_provider_status, provider_updated_at = p_provider_updated_at, provider_version = p_provider_version, status = p_next_status where id = v_attempt.id;
  if p_next_status = 'approved' and v_order.status <> 'cancelled' then update public.orders set payment_status = 'paid' where id = v_order.id; end if;
  if p_next_status = 'rejected' then update public.orders set payment_status = 'rejected' where id = v_order.id and payment_status <> 'paid'; end if;
  transition_applied := true; return next;
end;
$$;

-- Provider-transaction aggregation is another reconciliation entry point. It
-- must use the same late-approval re-reservation rule as the direct attempt
-- transition path.
create or replace function public.reconcile_payment_attempt_aggregate_v2(p_attempt_id uuid)
returns public.payment_attempt_status
language plpgsql security definer set search_path = '' as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_transaction public.payment_transactions%rowtype;
  v_approved_amount numeric(12, 2);
  v_has_pending boolean;
  v_has_review boolean;
  v_aggregate public.payment_attempt_status;
  v_item record;
  v_can_re_reserve boolean := true;
begin
  select * into v_attempt from public.payment_attempts where id = p_attempt_id for update;
  if not found then return 'manual_review'; end if;
  select * into v_order from public.orders where id = v_attempt.order_id for update;
  if not found then return 'manual_review'; end if;
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
    if v_order.status = 'cancelled' then
      for v_item in select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi join public.products p on p.id = oi.product_id where oi.order_id = v_order.id order by oi.product_id for update of p loop
        if v_item.stock_quantity < v_item.quantity then v_can_re_reserve := false; end if;
      end loop;
      if not v_can_re_reserve then
        update public.payment_attempts set status = 'manual_review', provider_status = 'approved', last_error = 'Late approval could not be re-reserved: insufficient stock' where id = v_attempt.id;
        return 'manual_review';
      end if;
      perform set_config('margarita.payment_late_approval', '1', true);
      for v_item in select oi.product_id, oi.quantity, p.stock_quantity from public.order_items oi join public.products p on p.id = oi.product_id where oi.order_id = v_order.id order by oi.product_id for update of p loop
        insert into public.inventory_movements (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after, reason)
        values (v_item.product_id, v_order.id, 'payment_re_reserved', -v_item.quantity, v_item.stock_quantity, v_item.stock_quantity - v_item.quantity, 'late payment approval');
        update public.products set stock_quantity = stock_quantity - v_item.quantity where id = v_item.product_id;
      end loop;
      update public.orders set status = 'confirmed', payment_status = 'paid', reservation_expires_at = null where id = v_order.id;
    end if;
    perform set_config('margarita.payment_aggregate_approved', '1', true);
    update public.payment_attempts set provider_payment_id = v_transaction.provider_payment_id, provider_status = coalesce(v_transaction.provider_status, 'approved'), provider_updated_at = v_transaction.provider_updated_at, provider_version = v_transaction.provider_version, status = 'approved', last_error = null where id = v_attempt.id;
    update public.orders set payment_status = 'paid' where id = v_order.id;
  else
    update public.payment_attempts set status = v_aggregate, last_error = case when v_aggregate = 'manual_review' then coalesce(last_error, 'Payment transaction aggregate requires review') else null end where id = v_attempt.id and status <> 'approved';
    if v_aggregate = 'rejected' then update public.orders set payment_status = 'rejected' where id = v_order.id and payment_status <> 'paid'; end if;
  end if;
  return v_aggregate;
end;
$$;

revoke execute on function public.enqueue_payment_reconciliation_v2(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.enqueue_payment_reconciliation_v2(uuid, timestamptz) to service_role;
revoke execute on function public.acknowledge_payment_webhook_v2(text, text, text, text, bytea) from public, anon, authenticated;
grant execute on function public.acknowledge_payment_webhook_v2(text, text, text, text, bytea) to service_role;
revoke execute on function public.create_order_with_payment_v2(uuid, text, text, text, text, jsonb, text, text, text, public.delivery_method, text, text) from public, anon, authenticated;
grant execute on function public.create_order_with_payment_v2(uuid, text, text, text, text, jsonb, text, text, text, public.delivery_method, text, text) to service_role;
revoke execute on function public.release_payment_reservation_v2(uuid, text, text) from public, anon, authenticated;
grant execute on function public.release_payment_reservation_v2(uuid, text, text) to service_role;
revoke execute on function public.release_expired_payment_reservations_v2(integer) from public, anon, authenticated;
grant execute on function public.release_expired_payment_reservations_v2(integer) to service_role;
revoke execute on function public.transition_payment_attempt_v2(uuid, text, timestamptz, bigint, public.payment_attempt_status, bigint, public.payment_attempt_status) from public, anon, authenticated;
grant execute on function public.transition_payment_attempt_v2(uuid, text, timestamptz, bigint, public.payment_attempt_status, bigint, public.payment_attempt_status) to service_role;

commit;
