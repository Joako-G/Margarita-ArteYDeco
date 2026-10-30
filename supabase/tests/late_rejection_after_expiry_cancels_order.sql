begin;

set local role service_role;

do $$
declare
  v_run_id text := replace(extensions.gen_random_uuid()::text, '-', '');
  v_category uuid := extensions.gen_random_uuid();
  v_product uuid := extensions.gen_random_uuid();
  v_initial_stock integer := 5;
  v_session uuid;
  v_order uuid;
  v_attempt uuid;
  v_transaction uuid;
  v_case integer;
begin
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'Late Rejection ' || v_run_id, 'late-rejection-' || v_run_id, 'test/late-rejection.webp', 'art');
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  values (v_product, v_category, 'Late Rejection Product ' || v_run_id, 'late-rejection-product-' || v_run_id, 100, v_initial_stock, 'test/late-rejection-product.webp');

  -- Case 1: the payment is still in process at expiry, then the provider rejects it. The order must end cancelled.
  -- Case 2: the provider rejects BEFORE the reservation expires. The order stays pending and the customer may retry.
  -- Case 3: the provider rejects after expiry but before the expiry release ran. The release cancels it, returning the stock once.
  -- Case 4: after the case 1 cancellation, another payment is approved. The order stays cancelled and paid (refund by hand).
  -- Case 5: part of the amount was approved and the remainder is rejected after expiry. The order is NOT cancelled
  --         automatically, so the captured money is never hidden.
  -- Case 6: the payment is still in process at expiry (flagged for review), then the provider approves it. The late
  --         approval clears the flag and re-reserves the stock exactly once, so the order ends confirmed and paid.
  for v_case in 1..6 loop
    v_session := extensions.gen_random_uuid();
    insert into public.guest_sessions (id, token_hash, expires_at)
    values (v_session, decode(md5(v_run_id || v_case::text) || md5(v_run_id || v_case::text), 'hex'), now() + interval '1 day');
    select order_id, attempt_id into v_order, v_attempt
    from public.create_order_with_payment_v2(
      v_session, 'Late', 'Rejection', '3510001' || lpad(v_case::text, 4, '0'), '3510001' || lpad(v_case::text, 4, '0'),
      jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
      'late-rejection-' || v_run_id || '-' || v_case, repeat('c', 64), 'sandbox', 'pickup');
    insert into public.payment_transactions (
      payment_attempt_id, environment, provider_payment_id, amount, currency,
      payment_type_id, status, provider_status, provider_version
    ) values (v_attempt, 'sandbox', 'late-rejection-' || v_run_id || '-' || v_case, 100, 'ARS',
      'debit_card', 'pending', 'in_process', 1)
    returning id into v_transaction;

    if v_case <> 2 then
      -- Age the order so its 24-hour reservation is already over.
      set local role postgres;
      set local session_replication_role = replica;
      update public.orders set created_at = now() - interval '25 hours', reservation_expires_at = now() - interval '1 hour' where id = v_order;
      update public.payment_attempts set created_at = now() - interval '25 hours', reservation_expires_at = now() - interval '1 hour' where id = v_attempt;
      set local session_replication_role = origin;
      set local role service_role;
    end if;

    if v_case in (1, 4) then
      perform public.release_expired_payment_reservation_for_order_v2(v_order);
      if (select status::text from public.payment_attempts where id = v_attempt) is distinct from 'manual_review'
        or (select status::text from public.orders where id = v_order) is distinct from 'pending'
        or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock then
        raise exception 'Case %: an unresolved payment at expiry must release the stock once and stay pending in manual review', v_case;
      end if;
      -- The backend flags the still-unresolved transaction after expiry; the review must survive.
      perform public.reconcile_payment_transaction_v1(v_transaction, 'pending', 1, 'pending', 'in_process', now(), 2, true, null);
      if (select status::text from public.payment_attempts where id = v_attempt) is distinct from 'manual_review' then
        raise exception 'Case %: a flagged in-process transaction must keep the attempt in manual review', v_case;
      end if;
      perform public.reconcile_payment_transaction_v1(v_transaction, 'pending', 2, 'rejected', 'rejected', now(), 3, false, null);

      if (select status::text from public.orders where id = v_order) is distinct from 'cancelled'
        or (select payment_status::text from public.orders where id = v_order) is distinct from 'rejected'
        or (select reservation_expires_at from public.orders where id = v_order) is not null then
        raise exception 'Case %: a rejection after expiry must cancel the order with the payment rejected', v_case;
      end if;
      if (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock
        or (select count(*) from public.inventory_movements where order_id = v_order) <> 2
        or exists (select 1 from public.inventory_movements where order_id = v_order and movement_type = 'order_cancelled') then
        raise exception 'Case %: the automatic cancellation must not move stock again', v_case;
      end if;
      if (select count(*) from public.audit_logs where entity_id = v_order and action = 'order_cancelled') <> 1 then
        raise exception 'Case %: the automatic cancellation must leave exactly one audit row', v_case;
      end if;

      -- Replaying the expiry release and the same rejection changes nothing.
      perform public.release_expired_payment_reservation_for_order_v2(v_order);
      perform public.reconcile_payment_attempt_aggregate_v2(v_attempt);
      if (select status::text from public.orders where id = v_order) is distinct from 'cancelled'
        or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock
        or (select count(*) from public.inventory_movements where order_id = v_order) <> 2
        or (select count(*) from public.audit_logs where entity_id = v_order and action = 'order_cancelled') <> 1 then
        raise exception 'Case %: replays must not cancel twice or move stock', v_case;
      end if;
    end if;

    if v_case = 2 then
      perform public.reconcile_payment_transaction_v1(v_transaction, 'pending', 1, 'rejected', 'rejected', now(), 2, false, null);
      if (select status::text from public.orders where id = v_order) is distinct from 'pending'
        or (select payment_status::text from public.orders where id = v_order) is distinct from 'rejected'
        or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock - 1 then
        raise exception 'Case 2: a rejection while the reservation is active must keep the order pending with its stock held';
      end if;
    end if;

    if v_case = 3 then
      perform public.reconcile_payment_transaction_v1(v_transaction, 'pending', 1, 'rejected', 'rejected', now(), 2, false, null);
      if (select status::text from public.orders where id = v_order) is distinct from 'pending'
        or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock - 1 then
        raise exception 'Case 3: without a prior stock release the rejection alone must not cancel the order';
      end if;
      perform public.release_expired_payment_reservation_for_order_v2(v_order);
      if (select status::text from public.orders where id = v_order) is distinct from 'cancelled'
        or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock
        or (select count(*) from public.inventory_movements where order_id = v_order and movement_type = 'order_cancelled') <> 1 then
        raise exception 'Case 3: the expiry release must cancel the order and return the stock exactly once';
      end if;
    end if;

    if v_case = 4 then
      insert into public.payment_transactions (
        payment_attempt_id, environment, provider_payment_id, amount, currency,
        payment_type_id, status, provider_status, provider_version
      ) values (v_attempt, 'sandbox', 'late-rejection-approved-' || v_run_id, 100, 'ARS',
        'debit_card', 'approved', 'approved', null);
      perform public.reconcile_payment_attempt_aggregate_v2(v_attempt);
      if (select status::text from public.orders where id = v_order) is distinct from 'cancelled'
        or (select payment_status::text from public.orders where id = v_order) is distinct from 'paid'
        or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock
        or exists (select 1 from public.inventory_movements where order_id = v_order and movement_type = 'payment_re_reserved') then
        raise exception 'Case 4: an approval after the automatic cancellation must stay cancelled, paid, with no re-reservation';
      end if;
    end if;

    if v_case = 5 then
      insert into public.payment_transactions (
        payment_attempt_id, environment, provider_payment_id, amount, currency,
        payment_type_id, status, provider_status, provider_version
      ) values (v_attempt, 'sandbox', 'late-rejection-partial-' || v_run_id, 40, 'ARS',
        'debit_card', 'approved', 'approved', null);
      perform public.release_expired_payment_reservation_for_order_v2(v_order);
      perform public.reconcile_payment_transaction_v1(v_transaction, 'pending', 1, 'rejected', 'rejected', now(), 2, false, null);
      if (select status::text from public.orders where id = v_order) is distinct from 'pending'
        or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock
        or (select count(*) from public.inventory_movements where order_id = v_order) <> 2
        or exists (select 1 from public.audit_logs where entity_id = v_order and action = 'order_cancelled') then
        raise exception 'Case 5: a partially approved order must not be cancelled automatically after a late rejection';
      end if;
    end if;

    if v_case = 6 then
      perform public.release_expired_payment_reservation_for_order_v2(v_order);
      perform public.reconcile_payment_transaction_v1(v_transaction, 'pending', 1, 'pending', 'in_process', now(), 2, true, null);
      if (select status::text from public.payment_attempts where id = v_attempt) is distinct from 'manual_review' then
        raise exception 'Case 6: the flagged in-process payment must keep the attempt in manual review before the approval';
      end if;
      perform public.reconcile_payment_transaction_v1(v_transaction, 'pending', 2, 'approved', 'approved', now(), 3, false, null);
      if (select status::text from public.orders where id = v_order) is distinct from 'confirmed'
        or (select payment_status::text from public.orders where id = v_order) is distinct from 'paid'
        or (select status::text from public.payment_attempts where id = v_attempt) is distinct from 'approved'
        or (select stock_quantity from public.products where id = v_product) is distinct from v_initial_stock - 1
        or (select count(*) from public.inventory_movements where order_id = v_order and movement_type = 'payment_re_reserved') <> 1
        or exists (select 1 from public.audit_logs where entity_id = v_order and action = 'order_cancelled') then
        raise exception 'Case 6: a late approval of a flagged payment must confirm the order and re-reserve the stock exactly once';
      end if;
    end if;

    -- Leave the shared product at its initial stock for the next case.
    update public.products set stock_quantity = v_initial_stock where id = v_product;
  end loop;
end;
$$;

rollback;
