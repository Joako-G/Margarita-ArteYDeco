-- The settlement RPC only reads the linked order. Locking that row with
-- FOR UPDATE required broader UPDATE privileges on orders for service_role.
-- The request and settlement rows already serialize this operation, while a
-- captured payment is immutable in the order lifecycle, so keep least privilege.
create or replace function public.record_consumer_withdrawal_settlement(
  p_request_id uuid,
  p_actor_profile_id uuid,
  p_expected_version bigint,
  p_contract_refund_amount numeric,
  p_original_shipping_refund_amount numeric,
  p_return_shipping_refund_amount numeric,
  p_method public.consumer_withdrawal_settlement_method,
  p_idempotency_key_hash text,
  p_payload_fingerprint text,
  p_idempotency_expires_at timestamptz,
  p_reference text default null,
  p_notes text default null,
  p_complete boolean default false
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.consumer_withdrawal_requests%rowtype;
  v_order public.orders%rowtype;
  v_existing public.consumer_withdrawal_settlements%rowtype;
  v_idempotency_hash bytea;
  v_payload_fingerprint bytea;
  v_existing_idempotency record;
begin
  perform 1 from public.profiles
  where id = p_actor_profile_id and role = 'administrator' and is_active = true;
  if not found then
    raise exception using errcode = '42501', message = 'An active administrator is required';
  end if;

  begin
    v_idempotency_hash := decode(p_idempotency_key_hash, 'hex');
    v_payload_fingerprint := decode(p_payload_fingerprint, 'hex');
  exception when others then
    raise exception using errcode = '22023', message = 'Invalid idempotency fingerprint';
  end;
  if octet_length(v_idempotency_hash) <> 32 or octet_length(v_payload_fingerprint) <> 32 then
    raise exception using errcode = '22023', message = 'Invalid idempotency fingerprint length';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(pg_catalog.encode(v_idempotency_hash, 'hex'), 0)
  );
  select withdrawal_request_id, operation, payload_fingerprint into v_existing_idempotency
  from public.consumer_withdrawal_admin_idempotency
  where idempotency_key_hash = v_idempotency_hash;
  if found then
    if v_existing_idempotency.withdrawal_request_id = p_request_id
      and v_existing_idempotency.operation = 'record_settlement'
      and v_existing_idempotency.payload_fingerprint = v_payload_fingerprint then
      return true;
    end if;
    raise exception using errcode = '23505', message = 'Idempotency key was reused with another operation';
  end if;

  select * into v_request from public.consumer_withdrawal_requests
  where id = p_request_id for update;
  if not found then return false; end if;
  if v_request.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'The withdrawal changed before settlement';
  end if;
  if v_request.request_status <> 'applicable' or v_request.order_id is null then
    raise exception using errcode = '23514', message = 'Settlement requires an applicable linked request';
  end if;

  select * into v_order from public.orders where id = v_request.order_id;
  if not found then return false; end if;
  if v_order.payment_status <> 'paid' then
    raise exception using errcode = '23514', message = 'The order has no captured amount to refund';
  end if;

  select * into v_existing from public.consumer_withdrawal_settlements
  where withdrawal_request_id = p_request_id for update;
  if found and v_existing.status = 'completed' then
    if p_complete
      and v_existing.contract_refund_amount = p_contract_refund_amount
      and v_existing.original_shipping_refund_amount = p_original_shipping_refund_amount
      and v_existing.return_shipping_refund_amount = p_return_shipping_refund_amount
      and v_existing.method = p_method then
      return true;
    end if;
    raise exception using errcode = '23505', message = 'Settlement was already completed';
  end if;

  insert into public.consumer_withdrawal_settlements (
    withdrawal_request_id, order_id, order_total_snapshot, captured_amount_snapshot,
    contract_refund_amount, original_shipping_refund_amount,
    return_shipping_refund_amount, method, status, reference, notes,
    completed_by_profile_id, completed_at
  ) values (
    p_request_id, v_order.id, v_order.total, v_order.total,
    p_contract_refund_amount, p_original_shipping_refund_amount,
    p_return_shipping_refund_amount, p_method,
    case when p_complete
      then 'completed'::public.consumer_withdrawal_settlement_status
      else 'pending'::public.consumer_withdrawal_settlement_status end,
    nullif(btrim(p_reference), ''), nullif(btrim(p_notes), ''),
    case when p_complete then p_actor_profile_id else null end,
    case when p_complete then now() else null end
  )
  on conflict (withdrawal_request_id) do update set
    contract_refund_amount = excluded.contract_refund_amount,
    original_shipping_refund_amount = excluded.original_shipping_refund_amount,
    return_shipping_refund_amount = excluded.return_shipping_refund_amount,
    method = excluded.method,
    status = excluded.status,
    reference = excluded.reference,
    notes = excluded.notes,
    completed_by_profile_id = excluded.completed_by_profile_id,
    completed_at = excluded.completed_at;

  update public.consumer_withdrawal_requests set
    refund_status = case when p_complete
      then 'succeeded'::public.consumer_withdrawal_refund_status
      else 'pending'::public.consumer_withdrawal_refund_status end,
    version = version + 1
  where id = p_request_id;

  insert into public.consumer_withdrawal_events (
    withdrawal_request_id, actor_profile_id, event_type,
    previous_status, next_status, reason, metadata
  ) values (
    p_request_id, p_actor_profile_id,
    case when p_complete then 'refund_confirmed_manual' else 'refund_requested' end,
    v_request.request_status, v_request.request_status, nullif(btrim(p_notes), ''),
    jsonb_build_object('method', p_method, 'completed', p_complete)
  );
  insert into public.consumer_withdrawal_admin_idempotency (
    idempotency_key_hash, payload_fingerprint, withdrawal_request_id,
    operation, result_version, expires_at
  ) values (
    v_idempotency_hash, v_payload_fingerprint, p_request_id,
    'record_settlement', p_expected_version + 1, p_idempotency_expires_at
  );
  return true;
end;
$$;

revoke execute on function public.record_consumer_withdrawal_settlement(
  uuid, uuid, bigint, numeric, numeric, numeric,
  public.consumer_withdrawal_settlement_method, text, text, timestamptz,
  text, text, boolean
) from public, anon, authenticated;

grant execute on function public.record_consumer_withdrawal_settlement(
  uuid, uuid, bigint, numeric, numeric, numeric,
  public.consumer_withdrawal_settlement_method, text, text, timestamptz,
  text, text, boolean
) to service_role;
