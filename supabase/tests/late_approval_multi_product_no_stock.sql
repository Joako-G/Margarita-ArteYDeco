begin;

set local role service_role;

do $$
declare
  v_session uuid := extensions.gen_random_uuid();
  v_category uuid := extensions.gen_random_uuid();
  v_product_a uuid := extensions.gen_random_uuid();
  v_product_b uuid := extensions.gen_random_uuid();
  v_run_id text := replace(extensions.gen_random_uuid()::text, '-', '');
  v_phone text := '352' || lpad((floor(random() * 100000000))::bigint::text, 8, '0');
  v_order uuid;
  v_attempt uuid;
  v_examined integer;
  v_released integer;
  v_aggregate_result text;
  v_pass integer;
begin
  insert into public.guest_sessions (id, token_hash, expires_at)
  values (v_session, decode(v_run_id || v_run_id, 'hex'), now() + interval '1 day');
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'Late Multi Test ' || v_run_id, 'late-multi-test-' || v_run_id, 'test/late-multi.webp', 'art');
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  values
    (v_product_a, v_category, 'Late Multi A ' || v_run_id, 'late-multi-a-' || v_run_id, 100, 4, 'test/late-multi-a.webp'),
    (v_product_b, v_category, 'Late Multi B ' || v_run_id, 'late-multi-b-' || v_run_id, 100, 4, 'test/late-multi-b.webp');

  -- One order with two lines: A x1 (enough stock later) and B x2 (not enough later).
  select order_id, attempt_id into v_order, v_attempt
  from public.create_order_with_payment_v2(
    v_session, 'Late', 'Multi', v_phone, v_phone,
    jsonb_build_array(
      jsonb_build_object('product_id', v_product_a, 'quantity', 1),
      jsonb_build_object('product_id', v_product_b, 'quantity', 2)
    ),
    'late-multi-' || v_run_id, repeat('b', 64), 'sandbox', 'pickup'
  );

  -- Expire the reservation through the order-scoped helper only.
  set local role postgres;
  set local session_replication_role = replica;
  update public.orders
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second'
  where id = v_order;
  update public.payment_attempts
  set created_at = statement_timestamp() - interval '2 minutes',
      reservation_expires_at = statement_timestamp() - interval '1 second'
  where id = v_attempt;
  set local session_replication_role = origin;
  set local role service_role;

  select examined_count, released_count into v_examined, v_released
  from public.release_expired_payment_reservation_for_order_v2(v_order);
  if v_examined <> 1 or v_released <> 1 then
    raise exception 'Expected the multi-product reservation to be released exactly once';
  end if;
  if (select stock_quantity from public.products where id = v_product_a) <> 4
    or (select stock_quantity from public.products where id = v_product_b) <> 4 then
    raise exception 'Expiry did not restore both reserved products';
  end if;

  -- Product A keeps enough stock; product B no longer covers its two units.
  update public.products set stock_quantity = 1 where id = v_product_b;

  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version
  ) values (
    v_attempt, 'sandbox', 'late-multi-approved-' || v_run_id, 300, 'ARS',
    'debit_card', 'approved', 'approved', null
  );

  -- First call and replay must both leave an all-or-nothing manual review.
  for v_pass in 1..2 loop
    select public.reconcile_payment_attempt_aggregate_v2(v_attempt)::text into v_aggregate_result;
    if v_aggregate_result is distinct from 'manual_review'
      or (select status::text from public.orders where id = v_order) is distinct from 'pending'
      or (select payment_status::text from public.orders where id = v_order) is distinct from 'paid'
      or (select status::text from public.payment_attempts where id = v_attempt) is distinct from 'manual_review' then
      raise exception 'Multi-product late approval without full stock was not left paid and pending (pass %)', v_pass;
    end if;
    if (select stock_quantity from public.products where id = v_product_a) is distinct from 4 then
      raise exception 'Partial reservation: product with enough stock was decremented (pass %)', v_pass;
    end if;
    if (select stock_quantity from public.products where id = v_product_b) is distinct from 1 then
      raise exception 'Partial reservation: insufficient product stock changed (pass %)', v_pass;
    end if;
    if exists (
      select 1 from public.inventory_movements
      where order_id = v_order and movement_type = 'payment_re_reserved'
    ) then
      raise exception 'Late approval wrote a re-reservation movement without full stock (pass %)', v_pass;
    end if;
  end loop;

  -- No stock for every line means no fulfillment, even from a direct owner update.
  set local role postgres;
  begin
    update public.orders set status = 'confirmed' where id = v_order;
    raise exception 'Released paid multi-product order was allowed into fulfillment';
  exception when check_violation then null;
  end;
  set local role service_role;

  -- Stock for B arrives later: the next reconciliation re-reserves every line once.
  update public.products set stock_quantity = 2 where id = v_product_b;
  for v_pass in 1..2 loop
    select public.reconcile_payment_attempt_aggregate_v2(v_attempt)::text into v_aggregate_result;
    if v_aggregate_result is distinct from 'approved'
      or (select status::text from public.orders where id = v_order) is distinct from 'confirmed'
      or (select payment_status::text from public.orders where id = v_order) is distinct from 'paid' then
      raise exception 'Restored stock did not confirm the paid multi-product order (pass %)', v_pass;
    end if;
    if (select stock_quantity from public.products where id = v_product_a) is distinct from 3
      or (select stock_quantity from public.products where id = v_product_b) is distinct from 0 then
      raise exception 'Re-reservation did not decrement every line exactly once (pass %)', v_pass;
    end if;
    if (select count(*) from public.inventory_movements
        where order_id = v_order and movement_type = 'payment_re_reserved') <> 2 then
      raise exception 'Expected exactly one re-reservation movement per line (pass %)', v_pass;
    end if;
  end loop;
end;
$$;

rollback;
