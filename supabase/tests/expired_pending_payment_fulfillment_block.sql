begin;

set local role service_role;

do $$
declare
  v_session uuid := extensions.gen_random_uuid();
  v_category uuid := extensions.gen_random_uuid();
  v_product uuid := extensions.gen_random_uuid();
  v_run_id text := replace(extensions.gen_random_uuid()::text, '-', '');
  v_phone text := '353' || lpad((floor(random() * 100000000))::bigint::text, 8, '0');
  v_order uuid;
  v_attempt uuid;
  v_actor uuid;
  v_examined integer;
  v_released integer;
  v_target text;
  v_updated_at timestamptz;
  v_initial_stock integer;
  v_pass integer;
begin
  select id into v_actor from public.profiles where role = 'administrator' and is_active;
  if v_actor is null then
    if exists (select 1 from public.profiles) then
      raise exception 'Fulfillment block test requires an active administrator';
    end if;
    v_actor := extensions.gen_random_uuid();
    set local role postgres;
    insert into auth.users (id, email) values (v_actor, 'block-' || v_run_id || '@example.test');
    insert into public.profiles (id, email, full_name)
    values (v_actor, 'block-' || v_run_id || '@example.test', 'Fulfillment Block Administrator');
    set local role service_role;
  end if;
  insert into public.guest_sessions (id, token_hash, expires_at)
  values (v_session, decode(v_run_id || v_run_id, 'hex'), now() + interval '1 day');
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'Block Test ' || v_run_id, 'block-test-' || v_run_id, 'test/block.webp', 'art');
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  values (v_product, v_category, 'Block Product ' || v_run_id, 'block-product-' || v_run_id, 100, 4, 'test/block-product.webp');
  select stock_quantity into v_initial_stock from public.products where id = v_product;

  select order_id, attempt_id into v_order, v_attempt
  from public.create_order_with_payment_v2(
    v_session, 'Block', 'Pending', v_phone, v_phone,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'block-' || v_run_id, repeat('a', 64), 'sandbox', 'pickup'
  );

  -- Expired reservation while the provider reports a payment still in progress.
  set local role postgres;
  set local session_replication_role = replica;
  update public.orders
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second'
  where id = v_order;
  update public.payment_attempts
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second',
      status = 'pending', provider_status = 'in_process',
      provider_payment_id = 'block-in-process-' || v_run_id
  where id = v_attempt;
  set local session_replication_role = origin;
  set local role service_role;

  select examined_count, released_count into v_examined, v_released
  from public.release_expired_payment_reservation_for_order_v2(v_order);
  if v_examined <> 1 or v_released <> 1 then
    raise exception 'Expected the unresolved reservation to be released exactly once';
  end if;
  if (select status::text from public.orders where id = v_order) is distinct from 'pending'
    or (select payment_status::text from public.orders where id = v_order) is distinct from 'pending'
    or (select status::text from public.payment_attempts where id = v_attempt) is distinct from 'manual_review'
    or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock
    or (select count(*) from public.inventory_movements
        where order_id = v_order and movement_type = 'payment_reservation_released') <> 1 then
    raise exception 'Unresolved expiry was not left pending, in manual review, with stock released once';
  end if;

  -- Repeating the expiry processing must not release again.
  for v_pass in 1..2 loop
    select examined_count, released_count into v_examined, v_released
    from public.release_expired_payment_reservation_for_order_v2(v_order);
    if v_released <> 0
      or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock
      or (select count(*) from public.inventory_movements
          where order_id = v_order and movement_type = 'payment_reservation_released') <> 1 then
      raise exception 'Expiry replay released the unresolved reservation again (pass %)', v_pass;
    end if;
  end loop;

  -- No fulfillment status may be reached by direct SQL.
  set local role postgres;
  foreach v_target in array array['confirmed', 'preparing', 'ready', 'picked_up', 'delivered'] loop
    begin
      update public.orders set status = v_target::public.order_status where id = v_order;
      raise exception 'Unresolved expired order was allowed into % by direct SQL', v_target;
    exception when check_violation then
      if sqlerrm not in ('Fulfillment requires an active inventory allocation', 'Mercado Pago fulfillment requires confirmed payment') then
        raise exception 'Direct SQL to % was rejected for the wrong reason: %', v_target, sqlerrm;
      end if;
    end;
  end loop;
  set local role service_role;

  -- Nor through the administrative RPC, with or without a paid payment status.
  select updated_at into v_updated_at from public.orders where id = v_order;
  foreach v_target in array array['confirmed', 'preparing', 'ready', 'picked_up', 'delivered'] loop
    begin
      perform public.transition_order_status(v_order, v_target::public.order_status, 'pending', v_actor, v_updated_at);
      raise exception 'Unresolved expired order was allowed into % through the admin RPC', v_target;
    exception when check_violation then
      if sqlerrm not in ('Fulfillment requires an active inventory allocation', 'Mercado Pago fulfillment requires confirmed payment') then
        raise exception 'Admin RPC to % was rejected for the wrong reason: %', v_target, sqlerrm;
      end if;
    end;
  end loop;
  begin
    perform public.transition_order_status(v_order, 'confirmed', 'paid', v_actor, v_updated_at);
    raise exception 'Admin RPC marked an unresolved MP payment as paid and confirmed';
  exception when check_violation then null;
  end;

  if (select status::text from public.orders where id = v_order) is distinct from 'pending'
    or (select payment_status::text from public.orders where id = v_order) is distinct from 'pending'
    or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock then
    raise exception 'Blocked fulfillment attempts changed order state or stock';
  end if;
end;
$$;

rollback;
