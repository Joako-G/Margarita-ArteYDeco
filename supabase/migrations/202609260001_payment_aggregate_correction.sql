begin;

-- Rebuild the attempt and order projection from every provider transaction. An
-- approved transaction for the full order amount is authoritative over older
-- rejected transactions, while overpayments and review flags remain manual.
create or replace function public.reconcile_payment_attempt_aggregate_v2(
  p_attempt_id uuid
)
returns public.payment_attempt_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_approved_amount numeric(12, 2);
  v_has_pending boolean;
  v_has_review boolean;
  v_aggregate public.payment_attempt_status;
  v_provider_transaction public.payment_transactions%rowtype;
begin
  select * into v_attempt
  from public.payment_attempts
  where id = p_attempt_id
  for update;
  if not found then return 'manual_review';
  end if;

  select * into v_order from public.orders where id = v_attempt.order_id for update;
  if not found then return 'manual_review';
  end if;

  select
    coalesce(sum(pt.amount) filter (where pt.status = 'approved'), 0),
    coalesce(bool_or(pt.status = 'pending'), false),
    coalesce(bool_or(pt.status = 'manual_review' or pt.review_required), false)
  into v_approved_amount, v_has_pending, v_has_review
  from public.payment_transactions as pt
  where pt.payment_attempt_id = v_attempt.id;

  if v_has_review or v_approved_amount > v_order.total then
    v_aggregate := 'manual_review';
  elsif v_approved_amount = v_order.total then
    v_aggregate := 'approved';
  elsif v_has_pending then
    v_aggregate := 'pending';
  elsif exists (
    select 1 from public.payment_transactions as pt
    where pt.payment_attempt_id = v_attempt.id
      and pt.status in ('rejected', 'expired')
  ) then
    v_aggregate := 'rejected';
  else
    v_aggregate := 'manual_review';
  end if;

  if v_aggregate = 'approved' then
    select * into v_provider_transaction
    from public.payment_transactions
    where payment_attempt_id = v_attempt.id and status = 'approved'
    order by updated_at desc, id desc
    limit 1;

    perform set_config('margarita.payment_aggregate_approved', '1', true);
    update public.payment_attempts
    set provider_payment_id = v_provider_transaction.provider_payment_id,
        provider_status = coalesce(v_provider_transaction.provider_status, 'approved'),
        provider_updated_at = v_provider_transaction.provider_updated_at,
        provider_version = v_provider_transaction.provider_version,
        status = 'approved',
        last_error = null
    where id = v_attempt.id;
    update public.orders set payment_status = 'paid' where id = v_order.id;
  else
    update public.payment_attempts
    set status = v_aggregate,
        last_error = case when v_aggregate = 'manual_review'
          then coalesce(last_error, 'Payment transaction aggregate requires review')
          else null end
    where id = v_attempt.id
      and status <> 'approved';
    if v_aggregate = 'rejected' then
      update public.orders set payment_status = 'rejected'
      where id = v_order.id and payment_status <> 'paid';
    end if;
  end if;

  return v_aggregate;
end;
$$;

-- The original order trigger treated rejected as terminal. Mercado Pago
-- retries are the explicit exception: only this transaction-local marker,
-- written by the aggregate function above, may move a rejected order to paid.
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
  ) then
    raise exception using errcode = '55000', message = 'Historical order fields are immutable';
  end if;

  if old.status in ('picked_up', 'delivered', 'cancelled') and new.status <> old.status then
    raise exception using errcode = '23514', message = 'Terminal orders cannot be reopened';
  end if;
  if old.payment_status in ('paid', 'rejected')
    and new.payment_status <> old.payment_status
    and not v_is_payment_retry_approval then
    raise exception using errcode = '23514', message = 'Terminal payment status cannot be changed';
  end if;

  v_is_valid_transition := new.status = old.status
    or (old.status = 'pending' and new.status = 'confirmed')
    or (old.status = 'confirmed' and new.status = 'preparing')
    or (old.status = 'preparing' and new.status = 'ready')
    or (old.status = 'ready' and new.status = 'picked_up' and new.delivery_method = 'pickup')
    or (old.status = 'ready' and new.status = 'delivered' and new.delivery_method = 'shipping')
    or (new.status = 'cancelled' and old.status not in ('picked_up', 'delivered', 'cancelled'));
  if not v_is_valid_transition then
    raise exception using errcode = '23514', message = 'Invalid order status transition';
  end if;
  if new.status in ('picked_up', 'delivered') and new.payment_status <> 'paid' then
    raise exception using errcode = '23514', message = 'A completed order requires paid payment status';
  end if;
  return new;
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
  v_can_transition boolean;
begin
  select * into v_transaction from public.payment_transactions
  where id = p_transaction_id for update;
  if not found then
    transition_applied := false;
    aggregate_status := 'manual_review';
    return next;
  end if;

  select pa.id, pa.order_id into v_attempt_id, v_order_id
  from public.payment_attempts as pa
  join public.orders as o on o.id = pa.order_id
  where pa.id = v_transaction.payment_attempt_id
  for update of pa, o;

  v_can_transition := v_transaction.status = p_expected_status
    and (p_expected_provider_version is null and v_transaction.provider_version is null
      or p_expected_provider_version is not null and v_transaction.provider_version = p_expected_provider_version)
    and not exists (
      select 1 from public.orders as o
      where o.id = v_order_id and o.status = 'cancelled' and p_next_status = 'approved'
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

-- Repair historical attempts whose transaction ledger was already correct but
-- whose denormalized attempt/order projection was left behind by the old RPC.
do $$
declare
  v_attempt_id uuid;
begin
  for v_attempt_id in
    select distinct payment_attempt_id
    from public.payment_transactions
  loop
    perform public.reconcile_payment_attempt_aggregate_v2(v_attempt_id);
  end loop;
end;
$$;

revoke execute on function public.reconcile_payment_attempt_aggregate_v2(uuid)
  from public, anon, authenticated;
grant execute on function public.reconcile_payment_attempt_aggregate_v2(uuid)
  to service_role;

revoke execute on function public.reconcile_payment_transaction_v1(
  uuid, public.payment_attempt_status, bigint, public.payment_attempt_status,
  text, timestamptz, bigint, boolean, text
) from public, anon, authenticated;
grant execute on function public.reconcile_payment_transaction_v1(
  uuid, public.payment_attempt_status, bigint, public.payment_attempt_status,
  text, timestamptz, bigint, boolean, text
) to service_role;

commit;
