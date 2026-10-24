begin;

set local role service_role;

do $$
declare
  v_session uuid := extensions.gen_random_uuid();
  v_category uuid := extensions.gen_random_uuid();
  v_product uuid := extensions.gen_random_uuid();
  v_run_id text := replace(extensions.gen_random_uuid()::text, '-', '');
  v_phone_prefix text := '355' || lpad((floor(random() * 100000000))::bigint::text, 8, '0');
  v_orders uuid[] := array[]::uuid[];
  v_attempts uuid[] := array[]::uuid[];
  v_outcomes text[] := array['not_found', 'rejected', 'approved'];
  v_order uuid;
  v_attempt uuid;
  v_outcome text;
  v_index integer;
  v_order_expiry_before timestamptz;
  v_attempt_expiry_before timestamptz;
  v_order_expiry_after timestamptz;
  v_attempt_expiry_after timestamptz;
  v_status public.payment_attempt_status;
  v_version bigint;
  v_attempt_count_before integer;
  v_order_count_before integer;
begin
  insert into public.guest_sessions (id, token_hash, expires_at)
  values (v_session, decode(v_run_id || v_run_id, 'hex'), now() + interval '1 day');
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'Consult Test ' || v_run_id, 'consult-test-' || v_run_id, 'test/consult.webp', 'art');
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  values (v_product, v_category, 'Consult Product ' || v_run_id, 'consult-product-' || v_run_id, 100, 10, 'test/consult-product.webp');

  -- One expired and unresolved attempt per consultation outcome: no provider payment ID,
  -- lookup unavailable at expiry, so the order waits in manual review.
  for v_index in 1..3 loop
    select order_id, attempt_id into v_order, v_attempt
    from public.create_order_with_payment_v2(
      v_session, 'Consult', 'Outcome ' || v_index, v_phone_prefix || v_index::text, v_phone_prefix || v_index::text,
      jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
      'consult-' || v_run_id || '-' || v_index::text, repeat(v_index::text, 64), 'sandbox', 'pickup'
    );
    v_orders := v_orders || v_order;
    v_attempts := v_attempts || v_attempt;
  end loop;

  set local role postgres;
  set local session_replication_role = replica;
  update public.orders
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second'
  where id = any(v_orders);
  update public.payment_attempts
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second',
      provider_status = 'unavailable'
  where id = any(v_attempts);
  set local session_replication_role = origin;
  set local role service_role;

  foreach v_order in array v_orders loop
    perform public.release_expired_payment_reservation_for_order_v2(v_order);
  end loop;
  if exists (
    select 1 from public.payment_attempts
    where id = any(v_attempts) and status::text <> 'manual_review'
  ) then
    raise exception 'Fixture attempts must be expired and unresolved before the consultation';
  end if;

  select count(*) into v_attempt_count_before from public.payment_attempts where order_id = any(v_orders);
  select count(*) into v_order_count_before from public.orders where id = any(v_orders);

  for v_index in 1..3 loop
    v_order := v_orders[v_index];
    v_attempt := v_attempts[v_index];
    v_outcome := v_outcomes[v_index];

    select reservation_expires_at into v_order_expiry_before from public.orders where id = v_order;
    select reservation_expires_at into v_attempt_expiry_before from public.payment_attempts where id = v_attempt;

    -- Apply the consultation result through the same writes the reconciliation uses.
    if v_outcome = 'not_found' then
      update public.payment_attempts set provider_status = 'not_found'
      where id = v_attempt and provider_payment_id is null;
    else
      select status, provider_version into v_status, v_version from public.payment_attempts where id = v_attempt;
      perform public.transition_payment_attempt_v2(v_attempt, v_outcome, now(), null, v_status, v_version, v_outcome::public.payment_attempt_status);
    end if;

    select reservation_expires_at into v_order_expiry_after from public.orders where id = v_order;
    select reservation_expires_at into v_attempt_expiry_after from public.payment_attempts where id = v_attempt;

    -- The historical attempt deadline never moves.
    if v_attempt_expiry_after is distinct from v_attempt_expiry_before then
      raise exception 'Consultation outcome % changed the attempt expiry', v_outcome;
    end if;
    -- The order deadline may be cleared by a resolved payment, but never extended.
    if v_order_expiry_after is not null and v_order_expiry_after is distinct from v_order_expiry_before then
      raise exception 'Consultation outcome % extended or moved the order expiry', v_outcome;
    end if;
  end loop;

  -- A consultation never creates a charge: no new attempt and no new order.
  if (select count(*) from public.payment_attempts where order_id = any(v_orders)) <> v_attempt_count_before
    or (select count(*) from public.orders where id = any(v_orders)) <> v_order_count_before then
    raise exception 'Consultation created an additional attempt or order';
  end if;

  -- Only a real provider approval makes the order paid; absence and rejection never do.
  if (select payment_status::text from public.orders where id = v_orders[1]) is distinct from 'pending'
    or (select payment_status::text from public.orders where id = v_orders[2]) = 'paid'
    or (select payment_status::text from public.orders where id = v_orders[3]) is distinct from 'paid' then
    raise exception 'Consultation outcomes did not map to the expected payment status';
  end if;
end;
$$;

rollback;
