create table public.consumer_withdrawal_settlement_corrections (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.consumer_withdrawal_settlements(id) on delete restrict,
  withdrawal_request_id uuid not null references public.consumer_withdrawal_requests(id) on delete restrict,
  previous_return_shipping_refund_amount numeric(12, 2) not null check (previous_return_shipping_refund_amount >= 0),
  corrected_return_shipping_refund_amount numeric(12, 2) not null check (corrected_return_shipping_refund_amount >= 0),
  previous_total_refund_amount numeric(12, 2) not null check (previous_total_refund_amount >= 0),
  corrected_total_refund_amount numeric(12, 2) not null check (corrected_total_refund_amount >= 0),
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint consumer_withdrawal_settlement_correction_changed check (
    previous_return_shipping_refund_amount <> corrected_return_shipping_refund_amount
  )
);

create index consumer_withdrawal_settlement_corrections_request_idx
  on public.consumer_withdrawal_settlement_corrections(withdrawal_request_id, created_at, id);

create trigger prevent_consumer_withdrawal_settlement_correction_mutation
before update or delete on public.consumer_withdrawal_settlement_corrections
for each row execute function public.prevent_consumer_withdrawal_event_mutation();

alter table public.consumer_withdrawal_settlement_corrections enable row level security;

revoke all on table public.consumer_withdrawal_settlement_corrections
  from public, anon, authenticated;
grant select, insert on table public.consumer_withdrawal_settlement_corrections
  to service_role;

create function public.correct_consumer_withdrawal_settlement(
  p_request_id uuid,
  p_actor_profile_id uuid,
  p_expected_version bigint,
  p_return_shipping_refund_amount numeric,
  p_confirmed_total_refund_amount numeric,
  p_reason text,
  p_idempotency_key_hash text,
  p_payload_fingerprint text,
  p_idempotency_expires_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.consumer_withdrawal_requests%rowtype;
  v_settlement public.consumer_withdrawal_settlements%rowtype;
  v_expected_total numeric(12, 2);
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
  if octet_length(v_idempotency_hash) <> 32
    or octet_length(v_payload_fingerprint) <> 32
    or p_return_shipping_refund_amount < 0
    or p_confirmed_total_refund_amount < 0
    or char_length(btrim(p_reason)) not between 3 and 1000
    or p_idempotency_expires_at <= now() then
    raise exception using errcode = '22023', message = 'Invalid settlement correction input';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(pg_catalog.encode(v_idempotency_hash, 'hex'), 0)
  );
  select withdrawal_request_id, operation, payload_fingerprint into v_existing_idempotency
  from public.consumer_withdrawal_admin_idempotency
  where idempotency_key_hash = v_idempotency_hash;
  if found then
    if v_existing_idempotency.withdrawal_request_id = p_request_id
      and v_existing_idempotency.operation = 'correct_settlement'
      and v_existing_idempotency.payload_fingerprint = v_payload_fingerprint then
      return true;
    end if;
    raise exception using errcode = '23505', message = 'Idempotency key was reused with another operation';
  end if;

  select * into v_request from public.consumer_withdrawal_requests
  where id = p_request_id for update;
  if not found then return false; end if;
  if v_request.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'The withdrawal changed before correction';
  end if;
  if v_request.refund_status <> 'succeeded' then
    raise exception using errcode = '23514', message = 'Only a completed refund can be corrected';
  end if;

  select * into v_settlement from public.consumer_withdrawal_settlements
  where withdrawal_request_id = p_request_id for update;
  if not found or v_settlement.status <> 'completed' then
    raise exception using errcode = '23514', message = 'A completed settlement is required';
  end if;

  v_expected_total := v_settlement.contract_refund_amount
    + v_settlement.original_shipping_refund_amount
    + p_return_shipping_refund_amount;
  if round(p_confirmed_total_refund_amount, 2) <> round(v_expected_total, 2) then
    raise exception using errcode = '23514', message = 'The confirmed refund total does not match the settlement breakdown';
  end if;
  if v_settlement.return_shipping_refund_amount = p_return_shipping_refund_amount then
    raise exception using errcode = '23514', message = 'The corrected amount must be different';
  end if;

  insert into public.consumer_withdrawal_settlement_corrections (
    settlement_id, withdrawal_request_id,
    previous_return_shipping_refund_amount, corrected_return_shipping_refund_amount,
    previous_total_refund_amount, corrected_total_refund_amount,
    reason, actor_profile_id
  ) values (
    v_settlement.id, p_request_id,
    v_settlement.return_shipping_refund_amount, p_return_shipping_refund_amount,
    v_settlement.total_refund_amount, v_expected_total,
    btrim(p_reason), p_actor_profile_id
  );

  update public.consumer_withdrawal_settlements set
    return_shipping_refund_amount = p_return_shipping_refund_amount
  where id = v_settlement.id;

  update public.consumer_withdrawal_requests set version = version + 1
  where id = p_request_id;

  insert into public.consumer_withdrawal_events (
    withdrawal_request_id, actor_profile_id, event_type,
    previous_status, next_status, reason, metadata
  ) values (
    p_request_id, p_actor_profile_id, 'refund_amount_corrected',
    v_request.request_status, v_request.request_status, btrim(p_reason),
    jsonb_build_object(
      'previousReturnShippingRefundAmount', v_settlement.return_shipping_refund_amount,
      'correctedReturnShippingRefundAmount', p_return_shipping_refund_amount,
      'previousTotalRefundAmount', v_settlement.total_refund_amount,
      'correctedTotalRefundAmount', v_expected_total
    )
  );

  insert into public.consumer_withdrawal_admin_idempotency (
    idempotency_key_hash, payload_fingerprint, withdrawal_request_id,
    operation, result_version, expires_at
  ) values (
    v_idempotency_hash, v_payload_fingerprint, p_request_id,
    'correct_settlement', p_expected_version + 1, p_idempotency_expires_at
  );
  return true;
end;
$$;

revoke execute on function public.correct_consumer_withdrawal_settlement(
  uuid, uuid, bigint, numeric, numeric, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.correct_consumer_withdrawal_settlement(
  uuid, uuid, bigint, numeric, numeric, text, text, text, timestamptz
) to service_role;
