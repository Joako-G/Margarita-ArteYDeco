begin;

select set_config('checkout_foundation.run_id', replace(extensions.gen_random_uuid()::text, '-', ''), true);
select set_config('checkout_foundation.inbox_id', extensions.gen_random_uuid()::text, true);
select set_config('checkout_foundation.job_id', extensions.gen_random_uuid()::text, true);
select set_config('checkout_foundation.session_id', extensions.gen_random_uuid()::text, true);
select set_config('checkout_foundation.second_session_id', extensions.gen_random_uuid()::text, true);
select set_config('checkout_foundation.category_id', extensions.gen_random_uuid()::text, true);
select set_config('checkout_foundation.product_id', extensions.gen_random_uuid()::text, true);
select set_config('checkout_foundation.retry_product_id', extensions.gen_random_uuid()::text, true);
select set_config('checkout_foundation.phone', '351' || lpad((floor(random() * 100000000))::bigint::text, 8, '0'), true);

insert into public.settings (
  business_name, whatsapp, address, maps_url, business_hours,
  transfer_alias, transfer_cbu, bank_name
) values (
  'Checkout Pro Test', '5493515550000', 'Test address',
  'https://maps.google.com/test', 'Mon-Fri', 'test.alias',
  '1234567890123456789012', 'Test bank'
) on conflict (singleton_key) do nothing;

insert into public.payment_inbox (
  id, environment, resource_type, resource_id, request_id, signature_digest
) values (
  current_setting('checkout_foundation.inbox_id')::uuid,
  'sandbox',
  'order',
  'lease-test-order-' || current_setting('checkout_foundation.run_id'),
  'lease-test-request-' || current_setting('checkout_foundation.run_id'),
  decode(current_setting('checkout_foundation.run_id') || current_setting('checkout_foundation.run_id'), 'hex')
);

insert into public.payment_jobs (id, inbox_id, operation, run_at)
values (
  current_setting('checkout_foundation.job_id')::uuid,
  current_setting('checkout_foundation.inbox_id')::uuid,
  'reconcile_order',
  statement_timestamp()
);

set local role service_role;

do $$
declare
  v_run_id text := current_setting('checkout_foundation.run_id');
  v_session uuid := current_setting('checkout_foundation.session_id')::uuid;
  v_second_session uuid := current_setting('checkout_foundation.second_session_id')::uuid;
  v_category uuid := current_setting('checkout_foundation.category_id')::uuid;
  v_job_id uuid := current_setting('checkout_foundation.job_id')::uuid;
  v_phone text := current_setting('checkout_foundation.phone');
  v_product uuid := current_setting('checkout_foundation.product_id')::uuid;
  v_retry_product uuid := current_setting('checkout_foundation.retry_product_id')::uuid;
  v_order_id uuid;
  v_attempt_id uuid;
  v_retry_order_id uuid;
  v_retry_attempt_id uuid;
  v_replay_attempt uuid;
  v_stock integer;
  v_retry_stock integer;
  v_expiry timestamptz;
  v_lease_job_id uuid;
  v_lease_attempts integer;
  v_lease_expires_at timestamptz;
  v_expired_order_id uuid;
  v_expired_attempt_id uuid;
  v_approved_order_id uuid;
  v_approved_attempt_id uuid;
  v_expiry_examined integer;
  v_expiry_released integer;
  v_expiry_approved integer;
  v_terminal_attempt_id uuid;
  v_reused_attempt_id uuid;
  v_transition_applied boolean;
begin
  insert into public.guest_sessions (id, token_hash, expires_at)
  values (v_session, decode(v_run_id || v_run_id, 'hex'), now() + interval '1 day');
  insert into public.guest_sessions (id, token_hash, expires_at)
  values (v_second_session, decode(v_run_id || translate(v_run_id, '0123456789abcdef', 'fedcba9876543210'), 'hex'), now() + interval '1 day');
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (v_category, 'Checkout Pro Test Category ' || v_run_id, 'checkout-pro-test-' || v_run_id, 'test/test.webp', 'art');
  insert into public.products (
    id, category_id, name, slug, price, stock_quantity, image_path
  ) values (
    v_product, v_category, 'Test product ' || v_run_id,
    'test-product-' || v_run_id, 100, 1, 'test/product.webp'
  );
  insert into public.products (
    id, category_id, name, slug, price, stock_quantity, image_path
  ) values (
    v_retry_product, v_category, 'Retry test product ' || v_run_id,
    'retry-test-product-' || v_run_id, 100, 1, 'test/retry-product.webp'
  );

  select stock_quantity into v_stock from public.products where id = v_product;
  select order_id, attempt_id, reservation_expires_at
  into v_order_id, v_attempt_id, v_expiry
  from public.create_order_with_payment_v2(
    v_session, 'Test', 'Buyer', v_phone, v_phone,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'foundation-' || v_run_id || '-001', repeat('a', 64), 'sandbox', 'pickup'
  );

  if v_expiry <= statement_timestamp() + interval '23 hours 59 minutes'
    or v_expiry > statement_timestamp() + interval '24 hours 1 minute' then
    raise exception 'Reservation is not based on PostgreSQL time plus 24 hours';
  end if;

  select job_id
  into v_lease_job_id
  from public.claim_payment_job_v2(interval '5 minutes');
  select attempts, lease_expires_at
  into v_lease_attempts, v_lease_expires_at
  from public.payment_jobs
  where id = v_lease_job_id;
  if v_lease_job_id <> v_job_id
    or v_lease_attempts <> 1
    or v_lease_expires_at <= statement_timestamp() + interval '4 minutes'
    or v_lease_expires_at > statement_timestamp() + interval '6 minutes' then
    raise exception 'Initial lease claim did not use PostgreSQL time';
  end if;
  if (select stock_quantity from public.products where id = v_product) <> v_stock - 1 then
    raise exception 'The reservation did not decrement stock once';
  end if;

  select transition_applied
  into v_transition_applied
  from public.transition_payment_attempt_v2(
    v_attempt_id,
    'in_process',
    statement_timestamp(),
    1,
    'pending',
    null,
    'pending'
  );
  if not v_transition_applied
    or (select count(*) from public.audit_logs
        where entity_type = 'payment_attempt'
          and entity_id = v_attempt_id
          and action = 'payment_provider_updated') <> 1
    or (select metadata ->> 'previous_status' from public.audit_logs
        where entity_type = 'payment_attempt'
          and entity_id = v_attempt_id
          and action = 'payment_provider_updated'
        order by created_at desc limit 1) <> 'pending'
    or (select metadata ->> 'next_status' from public.audit_logs
        where entity_type = 'payment_attempt'
          and entity_id = v_attempt_id
          and action = 'payment_provider_updated'
        order by created_at desc limit 1) <> 'pending' then
    raise exception 'An applied provider transition was not audited truthfully';
  end if;

  select transition_applied into v_transition_applied
  from public.transition_payment_attempt_v2(
    v_attempt_id, 'rejected', statement_timestamp(), 2, 'pending', 1, 'rejected'
  );
  if not v_transition_applied
    or (select payment_status from public.orders where id = v_order_id) <> 'rejected' then
    raise exception 'The active reservation retry fixture could not enter rejected state';
  end if;
  set local role postgres;
  begin
    update public.orders set payment_status = 'paid' where id = v_order_id;
    raise exception 'An unrelated order update used the aggregate transition guard';
  exception when check_violation then
    null;
  end;
  set local role service_role;
  select public.create_payment_attempt_v2(v_order_id, 'second-' || v_run_id || '-001', 'sandbox')
  into v_reused_attempt_id;
  if v_reused_attempt_id <> v_attempt_id
    or (select count(*) from public.payment_attempts where order_id = v_order_id and status in ('pending', 'rejected', 'manual_review')) <> 1 then
    raise exception 'A resumable payment attempt was replaced';
  end if;

  set local role postgres;
  update public.payment_attempts set status = 'rejected'
  where id = v_attempt_id;
  set local role service_role;
  if public.create_payment_attempt_v2(v_order_id, 'rejected-' || v_run_id || '-001', 'sandbox') <> v_attempt_id then
    raise exception 'A rejected payment attempt was replaced';
  end if;

  set local role postgres;
  insert into public.payment_attempts (
    order_id, environment, external_reference, operation_key,
    status, amount, reservation_expires_at
  ) values (
    v_order_id, 'sandbox', 'terminal-' || v_run_id, 'terminal-' || v_run_id || '-001',
    'approved', 100, v_expiry
  ) returning id into v_terminal_attempt_id;
  set local role service_role;

  set local role postgres;
  begin
    insert into public.payment_attempts (
      order_id, environment, external_reference, operation_key,
      amount, reservation_expires_at
    ) values (
      v_order_id, 'sandbox', 'duplicate-' || v_run_id, 'duplicate-' || v_run_id || '-001',
      100, v_expiry
    );
    raise exception 'The active-attempt invariant allowed a duplicate';
  exception when unique_violation then
    null;
  end;

  delete from public.payment_attempts where id = v_terminal_attempt_id;
  update public.payment_attempts set status = 'manual_review'
  where id = v_attempt_id;
  set local role service_role;
  begin
    perform public.create_payment_attempt_v2(v_order_id, 'manual-' || v_run_id || '-001', 'sandbox');
    raise exception 'Manual review was silently replaced';
  exception when sqlstate '22023' then
    null;
  end;
  set local role postgres;
  update public.payment_attempts set status = 'pending'
  where id = v_attempt_id;
  set local role service_role;

  select attempt_id into v_replay_attempt
  from public.create_order_with_payment_v2(
    v_session, 'Test', 'Buyer', v_phone, v_phone,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
    'foundation-' || v_run_id || '-001', repeat('a', 64), 'sandbox', 'pickup'
  );
  if v_replay_attempt <> v_attempt_id
    or (select count(*) from public.payment_attempts where order_id = v_order_id) <> 1 then
    raise exception 'Idempotent checkout created a second attempt';
  end if;

  begin
    perform public.create_order_with_payment_v2(
      v_second_session, 'Second', 'Buyer', v_phone || '1', v_phone || '1',
      jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
      'foundation-' || v_run_id || '-002', repeat('b', 64), 'sandbox', 'pickup'
    );
    raise exception 'A competing checkout should not reserve unavailable stock';
  exception when others then
    null;
  end;
  if (select stock_quantity from public.products where id = v_product) <> v_stock - 1 then
    raise exception 'A rejected concurrent checkout changed stock';
  end if;

  begin
    perform public.release_payment_reservation_v2(v_order_id, 'approved', 'late approval');
    raise exception 'An approved provider state must not release stock';
  exception when sqlstate '22023' then
    null;
  end;

  if not public.release_payment_reservation_v2(v_order_id, 'rejected', 'test release') then
    raise exception 'Terminal release did not complete';
  end if;
  if (select stock_quantity from public.products where id = v_product) <> v_stock then
    raise exception 'Terminal release did not restore stock';
  end if;
  if public.release_payment_reservation_v2(v_order_id, 'rejected', 'replay') then
    raise exception 'Duplicate release should be a no-op';
  end if;
  if (select count(*) from public.inventory_movements
      where order_id = v_order_id and movement_type = 'order_cancelled') <> 1 then
    raise exception 'Stock restoration was not exactly once';
  end if;

  select stock_quantity into v_retry_stock from public.products where id = v_retry_product;
  select order_id, attempt_id into v_retry_order_id, v_retry_attempt_id
  from public.create_order_with_payment_v2(
    v_second_session, 'Retry', 'Buyer', v_phone || '3', v_phone || '3',
    jsonb_build_array(jsonb_build_object('product_id', v_retry_product, 'quantity', 1)),
    'retry-' || v_run_id || '-001', repeat('e', 64), 'sandbox', 'pickup'
  );
  select transition_applied into v_transition_applied
  from public.transition_payment_attempt_v2(
    v_retry_attempt_id, 'rejected', statement_timestamp(), 1, 'pending', null, 'rejected'
  );
  if not v_transition_applied
    or public.create_payment_attempt_v2(v_retry_order_id, 'retry-same-' || v_run_id || '-001', 'sandbox') <> v_retry_attempt_id then
    raise exception 'Rejected same-preference retry was not reused before approval';
  end if;
  select transition_applied into v_transition_applied
  from public.transition_payment_attempt_v2(
    v_retry_attempt_id, 'approved', statement_timestamp(), 2, 'rejected', 1, 'approved'
  );
  if not v_transition_applied
    or (select payment_status from public.orders where id = v_retry_order_id) <> 'paid'
    or (select status from public.orders where id = v_retry_order_id) <> 'pending'
    or (select stock_quantity from public.products where id = v_retry_product) <> v_retry_stock - 1
    or (select stock_quantity from public.products where id = v_product) <> v_stock
    or (select count(*) from public.inventory_movements
        where order_id = v_retry_order_id and movement_type = 'order_created') <> 1
    or (select count(*) from public.inventory_movements
        where order_id = v_retry_order_id and movement_type = 'payment_re_reserved') <> 0
    or (select count(*) from public.audit_logs where entity_type = 'payment_attempt'
        and entity_id = v_retry_attempt_id and action = 'payment_status_changed'
        and metadata ->> 'previous_status' = 'rejected'
        and metadata ->> 'next_status' = 'approved') <> 1 then
    raise exception 'An active-reservation retry approval failed its payment, isolated stock, restored primary stock, order, or audit contract';
  end if;
  begin
    perform public.create_payment_attempt_v2(v_retry_order_id, 'after-paid-' || v_run_id || '-001', 'sandbox');
    raise exception 'A paid order must reject another payment attempt';
  exception when sqlstate '22023' then
    null;
  end;

  select order_id, attempt_id into v_expired_order_id, v_expired_attempt_id
  from public.create_order_with_payment_v2(
    v_second_session, 'Expired', 'Buyer', v_phone || '2', v_phone || '2',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
     'expiry-' || v_run_id || '-001', repeat('c', 64), 'sandbox', 'pickup'
  );
  set local role postgres;
  set local session_replication_role = replica;
  update public.orders set created_at = statement_timestamp() - interval '2 minutes', reservation_expires_at = statement_timestamp() - interval '1 second'
  where id = v_expired_order_id;
  update public.payment_attempts set created_at = statement_timestamp() - interval '2 minutes', reservation_expires_at = statement_timestamp() - interval '1 second', provider_status = 'not_found', provider_payment_id = null
  where id = v_expired_attempt_id;
  if exists (
    select 1 from public.payment_transactions
    where payment_attempt_id = v_expired_attempt_id
  ) then
    raise exception 'The definitive no-payment fixture unexpectedly has provider transactions';
  end if;
  set local session_replication_role = origin;
  set local role service_role;

  select examined_count, released_count, approved_count
  into v_expiry_examined, v_expiry_released, v_expiry_approved
  from public.release_expired_payment_reservation_for_order_v2(v_expired_order_id);
  if v_expiry_examined <> 1 or v_expiry_released <> 1 or v_expiry_approved <> 0
     or (select status from public.orders where id = v_expired_order_id) <> 'cancelled'
     or (select payment_status from public.orders where id = v_expired_order_id) <> 'rejected'
     or (select stock_quantity from public.products where id = v_product) <> v_stock then
     raise exception 'Expired reservation was not cancelled and rejected exactly once';
  end if;
  select released_count into v_expiry_released
  from public.release_expired_payment_reservation_for_order_v2(v_expired_order_id);
  if v_expiry_released <> 0
    or (select count(*) from public.inventory_movements
        where order_id = v_expired_order_id and movement_type = 'order_cancelled') <> 1 then
    raise exception 'Expired reservation replay changed stock';
  end if;

  select order_id, attempt_id into v_approved_order_id, v_approved_attempt_id
  from public.create_order_with_payment_v2(
    v_session, 'Approved', 'Buyer', v_phone, v_phone,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1)),
     'expiry-' || v_run_id || '-002', repeat('d', 64), 'sandbox', 'pickup'
  );
  set local role postgres;
  set local session_replication_role = replica;
   update public.orders set created_at = statement_timestamp() - interval '2 minutes', reservation_expires_at = statement_timestamp() - interval '1 second', payment_status = 'pending'
  where id = v_approved_order_id;
  update public.payment_attempts set created_at = statement_timestamp() - interval '2 minutes', reservation_expires_at = statement_timestamp() - interval '1 second', status = 'approved'
  where id = v_approved_attempt_id;
  set local session_replication_role = origin;
  set local role service_role;
   select approved_count, released_count into v_expiry_approved, v_expiry_released
   from public.release_expired_payment_reservation_for_order_v2(v_approved_order_id);
   if v_expiry_approved <> 1 or v_expiry_released <> 0
     or (select status from public.orders where id = v_approved_order_id) <> 'pending'
     or (select payment_status from public.orders where id = v_approved_order_id) <> 'pending'
     or (select reservation_expires_at from public.orders where id = v_approved_order_id) is null
     or (select stock_quantity from public.products where id = v_product) <> v_stock - 1 then
     raise exception 'Approved reservation was released';
   end if;

   set local role postgres;
   set local session_replication_role = replica;
   update public.orders set payment_status = 'paid'
   where id = v_approved_order_id;
   set local session_replication_role = origin;
   set local role service_role;
   if public.release_payment_reservation_v2(v_approved_order_id, 'expired', 'paid replay') then
     raise exception 'A paid reservation must not be released';
   end if;
   if (select status from public.orders where id = v_approved_order_id) <> 'pending'
     or (select payment_status from public.orders where id = v_approved_order_id) <> 'paid'
     or (select reservation_expires_at from public.orders where id = v_approved_order_id) is null
     or (select stock_quantity from public.products where id = v_product) <> v_stock - 1 then
     raise exception 'Paid reservation was changed';
   end if;

  if has_table_privilege('anon', 'public.payment_attempts', 'select')
    or has_table_privilege('authenticated', 'public.payment_outbox', 'select')
    or has_function_privilege('anon', 'public.release_payment_reservation_v2(uuid,text,text)', 'execute') then
    raise exception 'Public Supabase roles must not access payment foundation';
  end if;
end;
$$;

set local role postgres;

update public.payment_jobs
set lease_expires_at = statement_timestamp() - interval '1 second'
  where id = current_setting('checkout_foundation.job_id')::uuid;

set local role service_role;

do $$
declare
  v_lease_job_id uuid;
  v_lease_attempts integer;
  v_lease_expires_at timestamptz;
begin
  select job_id
  into v_lease_job_id
  from public.claim_payment_job_v2(interval '5 minutes');
  select attempts, lease_expires_at
  into v_lease_attempts, v_lease_expires_at
  from public.payment_jobs
  where id = v_lease_job_id;
  if v_lease_job_id <> current_setting('checkout_foundation.job_id')::uuid
    or v_lease_attempts <> 2
    or v_lease_expires_at <= statement_timestamp() + interval '4 minutes'
    or v_lease_expires_at > statement_timestamp() + interval '6 minutes' then
    raise exception 'Expired payment job lease was not reclaimed with PostgreSQL time';
  end if;
end;
$$;

rollback;
