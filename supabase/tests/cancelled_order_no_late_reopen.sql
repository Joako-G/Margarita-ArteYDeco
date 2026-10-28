begin;

set local role service_role;

do $$
declare
  v_run_id text := replace(extensions.gen_random_uuid()::text, '-', '');
  v_category uuid := extensions.gen_random_uuid();
  v_product uuid := extensions.gen_random_uuid();
  v_actor uuid;
  v_initial_stock integer := 10;
  v_session uuid;
  v_order uuid;
  v_attempt uuid;
  v_transaction uuid;
  v_updated_at timestamptz;
  v_status public.payment_attempt_status;
  v_version bigint;
  v_case integer;
begin
  select id into v_actor from public.profiles where role = 'administrator' and is_active;
  if v_actor is null then
    if exists (select 1 from public.profiles) then
      raise exception 'Cancelled order reopen test requires an active administrator';
    end if;
    v_actor := extensions.gen_random_uuid();
    set local role postgres;
    insert into auth.users (id, email) values (v_actor, 'noreopen-' || v_run_id || '@example.test');
    insert into public.profiles (id, email, full_name)
    values (v_actor, 'noreopen-' || v_run_id || '@example.test', 'No Reopen Administrator');
    set local role service_role;
  end if;
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'No Reopen Test ' || v_run_id, 'no-reopen-test-' || v_run_id, 'test/no-reopen.webp', 'art');
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  values (v_product, v_category, 'No Reopen Product ' || v_run_id, 'no-reopen-product-' || v_run_id, 100, v_initial_stock, 'test/no-reopen-product.webp');

  -- Case 1: the owner cancels an unpaid order, then the provider approval arrives through the transaction path.
  -- Case 2: same, through the attempt transition path.
  -- Case 3 (control): the system cancels at definitive expiry, then a late approval still re-reserves stock.
  for v_case in 1..3 loop
    v_session := extensions.gen_random_uuid();
    insert into public.guest_sessions (id, token_hash, expires_at)
    values (v_session, decode(md5(v_run_id || v_case::text) || md5(v_run_id || v_case::text), 'hex'), now() + interval '1 day');
    select order_id, attempt_id into v_order, v_attempt
    from public.create_order_with_payment_v2(
      v_session, 'No', 'Reopen', '3510000' || lpad(v_case::text, 4, '0'), '3510000' || lpad(v_case::text, 4, '0'),
      jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 2)),
      'no-reopen-' || v_run_id || '-' || v_case, repeat('b', 64), 'sandbox', 'pickup');

    if v_case < 3 then
      select updated_at into v_updated_at from public.orders where id = v_order;
      perform public.cancel_order_with_stock(v_order, v_actor, 'Cancelled by owner', v_updated_at, false);
      if (select status::text from public.payment_attempts where id = v_attempt) = 'expired' then
        raise exception 'Case %: a manual cancellation must not mark the attempt as expired', v_case;
      end if;
    else
      perform public.release_payment_reservation_v2(v_order, 'expired', 'definitive expiry');
      if (select status::text from public.payment_attempts where id = v_attempt) is distinct from 'expired' then
        raise exception 'Case 3: definitive expiry must leave the attempt expired';
      end if;
    end if;
    if (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock then
      raise exception 'Case %: stock must be fully returned after cancellation', v_case;
    end if;

    if v_case = 2 then
      select status, provider_version into v_status, v_version from public.payment_attempts where id = v_attempt;
      perform public.transition_payment_attempt_v2(v_attempt, 'approved', now(), null, v_status, v_version, 'approved');
    else
      insert into public.payment_transactions (
        payment_attempt_id, environment, provider_payment_id, amount, currency,
        payment_type_id, status, provider_status, provider_version
      ) values (v_attempt, 'sandbox', 'no-reopen-' || v_run_id || '-' || v_case, 200, 'ARS',
        'debit_card', 'pending', 'pending', 1)
      returning id into v_transaction;
      perform public.reconcile_payment_transaction_v1(
        v_transaction, 'pending', 1, 'approved', 'approved', now(), 2, false, null);
    end if;

    if v_case < 3 then
      if (select status::text from public.orders where id = v_order) is distinct from 'cancelled' then
        raise exception 'Case %: an approval reopened an order cancelled by the owner', v_case;
      end if;
      if (select payment_status::text from public.orders where id = v_order) is distinct from 'paid' then
        raise exception 'Case %: the approval must still be recorded as paid for the refund', v_case;
      end if;
      if (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock
        or exists (select 1 from public.inventory_movements where order_id = v_order and movement_type = 'payment_re_reserved') then
        raise exception 'Case %: an approval re-reserved stock for an order cancelled by the owner', v_case;
      end if;
    else
      if (select status::text from public.orders where id = v_order) is distinct from 'confirmed'
        or (select payment_status::text from public.orders where id = v_order) is distinct from 'paid'
        or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock - 2
        or (select count(*) from public.inventory_movements where order_id = v_order and movement_type = 'payment_re_reserved') <> 1 then
        raise exception 'Case 3: a late approval after system expiry must still re-reserve stock exactly once';
      end if;
    end if;
  end loop;
end;
$$;

rollback;
