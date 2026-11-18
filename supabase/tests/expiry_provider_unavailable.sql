begin;

set local role service_role;

do $$
declare
  v_session uuid := extensions.gen_random_uuid();
  v_category uuid := extensions.gen_random_uuid();
  v_product uuid := extensions.gen_random_uuid();
  v_run_id text := replace(extensions.gen_random_uuid()::text, '-', '');
  v_phone_prefix text := '354' || lpad((floor(random() * 100000000))::bigint::text, 8, '0');
  v_order_no_id uuid;
  v_attempt_no_id uuid;
  v_order_with_id uuid;
  v_attempt_with_id uuid;
  v_order uuid;
  v_examined integer;
  v_released integer;
  v_initial_stock integer;
  v_pass integer;
begin
  insert into public.guest_sessions (id, token_hash, expires_at)
  values (v_session, decode(v_run_id || v_run_id, 'hex'), now() + interval '1 day');
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'Unavailable Test ' || v_run_id, 'unavailable-test-' || v_run_id, 'test/unavailable.webp', 'art');
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  values (v_product, v_category, 'Unavailable Product ' || v_run_id, 'unavailable-product-' || v_run_id, 100, 4, 'test/unavailable-product.webp');
  select stock_quantity into v_initial_stock from public.products where id = v_product;

  -- Fixture 1: the provider lookup failed and no provider payment ID is stored.
  select order_id, attempt_id into v_order_no_id, v_attempt_no_id
  from public.create_order_with_payment_v2(
    v_session, 'Unavailable', 'No Id', v_phone_prefix || '1', v_phone_prefix || '1',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'unavailable-' || v_run_id || '-001', repeat('a', 64), 'sandbox', 'pickup'
  );
  -- Fixture 2: the provider lookup failed but a provider payment ID is known.
  select order_id, attempt_id into v_order_with_id, v_attempt_with_id
  from public.create_order_with_payment_v2(
    v_session, 'Unavailable', 'With Id', v_phone_prefix || '2', v_phone_prefix || '2',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'unavailable-' || v_run_id || '-002', repeat('b', 64), 'sandbox', 'pickup'
  );

  set local role postgres;
  set local session_replication_role = replica;
  update public.orders
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second'
  where id in (v_order_no_id, v_order_with_id);
  update public.payment_attempts
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second',
      provider_status = 'unavailable'
  where id = v_attempt_no_id;
  update public.payment_attempts
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second',
      provider_status = 'unavailable', provider_payment_id = 'unavailable-known-' || v_run_id
  where id = v_attempt_with_id;
  set local session_replication_role = origin;
  set local role service_role;

  -- Order-scoped helper only: never the global batch, which could touch unrelated rows.
  foreach v_order in array array[v_order_no_id, v_order_with_id] loop
    select examined_count, released_count into v_examined, v_released
    from public.release_expired_payment_reservation_for_order_v2(v_order);
    if v_examined <> 1 or v_released <> 1 then
      raise exception 'Expected the unavailable-provider reservation % to be released exactly once', v_order;
    end if;
  end loop;

  -- A failed lookup is neither a rejection nor proof of no payment.
  if exists (
    select 1 from public.orders
    where id in (v_order_no_id, v_order_with_id)
      and (status::text <> 'pending' or payment_status::text <> 'pending')
  ) then
    raise exception 'Provider failure was treated as cancellation or rejection';
  end if;
  if exists (
    select 1 from public.payment_attempts
    where id in (v_attempt_no_id, v_attempt_with_id) and status::text <> 'manual_review'
  ) then
    raise exception 'Provider failure did not leave the attempt in manual review';
  end if;

  -- The reservation is released once, as a release movement and not a cancellation.
  if (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock
    or (select count(*) from public.inventory_movements
        where order_id in (v_order_no_id, v_order_with_id)
          and movement_type = 'payment_reservation_released') <> 2
    or exists (
      select 1 from public.inventory_movements
      where order_id in (v_order_no_id, v_order_with_id) and movement_type = 'order_cancelled'
    ) then
    raise exception 'Provider failure did not release stock exactly once as a reservation release';
  end if;

  -- Replays must not duplicate movements or return units again.
  for v_pass in 1..2 loop
    foreach v_order in array array[v_order_no_id, v_order_with_id] loop
      select examined_count, released_count into v_examined, v_released
      from public.release_expired_payment_reservation_for_order_v2(v_order);
      if v_released <> 0 then
        raise exception 'Expiry replay released an unavailable-provider order again (pass %)', v_pass;
      end if;
    end loop;
    if (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock
      or (select count(*) from public.inventory_movements
          where order_id in (v_order_no_id, v_order_with_id)) <> 4 then
      raise exception 'Expiry replay duplicated inventory movements (pass %)', v_pass;
    end if;
  end loop;
end;
$$;

rollback;
