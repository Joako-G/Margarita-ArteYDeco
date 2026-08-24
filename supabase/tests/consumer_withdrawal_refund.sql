begin;

insert into public.customers (
  id, first_name, last_name, phone, phone_normalized
) values (
  '10000000-0000-4000-8000-000000000001',
  'Prueba',
  'Reintegro',
  '3516123456',
  '3516123456'
);

insert into public.orders (
  id, customer_id, customer_first_name, customer_last_name,
  customer_phone, customer_phone_normalized, order_number, status,
  subtotal, discount, total, payment_method, payment_status, delivery_method
) values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Prueba',
  'Reintegro',
  '3516123456',
  '3516123456',
  'MAD-20991231-999999',
  'pending',
  13500,
  0,
  13500,
  'bank_transfer',
  'pending',
  'pickup'
);

update public.orders
set payment_status = 'paid'
where id = '20000000-0000-4000-8000-000000000001';

insert into public.consumer_withdrawal_requests (
  id, public_code_hash, public_code_suffix, public_code_key_version,
  order_id, order_reference_input, order_reference_unavailable,
  contact_phone_normalized, contact_fingerprint, request_status,
  return_status, refund_status, source, applicable_at
) values (
  '30000000-0000-4000-8000-000000000001',
  decode(repeat('11', 32), 'hex'),
  'TST001',
  1,
  '20000000-0000-4000-8000-000000000001',
  'MAD-20991231-999999',
  false,
  '3516123456',
  decode(repeat('22', 32), 'hex'),
  'applicable',
  'not_required',
  'manual_review',
  'web',
  now()
);

set local role service_role;

do $$
declare
  v_actor_id uuid;
  v_result boolean;
  v_refund_status public.consumer_withdrawal_refund_status;
  v_settlement_status public.consumer_withdrawal_settlement_status;
  v_total_refund numeric(12, 2);
  v_correction_count integer;
begin
  select id into v_actor_id
  from public.profiles
  where role = 'administrator' and is_active = true;

  if v_actor_id is null then
    raise exception 'The local integration test requires an active administrator profile';
  end if;

  v_result := public.record_consumer_withdrawal_settlement(
    '30000000-0000-4000-8000-000000000001',
    v_actor_id,
    1,
    13500,
    0,
    13500,
    'bank_transfer',
    repeat('33', 32),
    repeat('44', 32),
    now() + interval '1 day',
    'TEST-OP-001',
    'Prueba transaccional local',
    true
  );

  if not v_result then
    raise exception 'The settlement RPC returned false';
  end if;

  select refund_status into v_refund_status
  from public.consumer_withdrawal_requests
  where id = '30000000-0000-4000-8000-000000000001';

  select status into v_settlement_status
  from public.consumer_withdrawal_settlements
  where withdrawal_request_id = '30000000-0000-4000-8000-000000000001';

  if v_refund_status <> 'succeeded' or v_settlement_status <> 'completed' then
    raise exception 'The refund was not completed atomically';
  end if;

  v_result := public.correct_consumer_withdrawal_settlement(
    '30000000-0000-4000-8000-000000000001',
    v_actor_id,
    2,
    0,
    13500,
    'Rectificación de prueba: el gasto adicional fue cargado por error',
    repeat('55', 32),
    repeat('66', 32),
    now() + interval '1 day'
  );

  select total_refund_amount into v_total_refund
  from public.consumer_withdrawal_settlements
  where withdrawal_request_id = '30000000-0000-4000-8000-000000000001';

  select count(*) into v_correction_count
  from public.consumer_withdrawal_settlement_corrections
  where withdrawal_request_id = '30000000-0000-4000-8000-000000000001';

  if not v_result or v_total_refund <> 13500 or v_correction_count <> 1 then
    raise exception 'The refund correction did not preserve an auditable record';
  end if;
end;
$$;

rollback;
