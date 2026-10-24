-- Make the existing preference outbox claimable by the payment worker.

alter table public.payment_outbox
  add column if not exists lease_owner text;

grant update (
  status,
  available_at,
  lease_expires_at,
  lease_owner,
  attempts,
  last_error
) on public.payment_outbox to service_role;

create or replace function public.claim_payment_outbox_v2(
  p_lease interval default interval '5 minutes',
  p_worker_id text default 'legacy-worker'
)
returns table (
  outbox_id uuid,
  attempt_id uuid,
  operation public.payment_outbox_operation,
  idempotency_key text,
  payload jsonb,
  attempts integer,
  available_at timestamptz,
  lease_expires_at timestamptz,
  lease_owner text,
  reservation_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lease <= interval '0 seconds' or nullif(btrim(p_worker_id), '') is null then
    raise exception using errcode = '22023', message = 'Lease must be positive';
  end if;

  return query
  update public.payment_outbox as operation
  set status = 'leased',
      lease_expires_at = statement_timestamp() + p_lease,
      lease_owner = p_worker_id,
      attempts = operation.attempts + 1
  where operation.id = (
    select candidate.id
    from public.payment_outbox as candidate
    where candidate.operation = 'create_order'
      and candidate.status in ('pending', 'leased')
      and candidate.available_at <= statement_timestamp()
      and (candidate.lease_expires_at is null or candidate.lease_expires_at <= statement_timestamp())
    order by candidate.available_at, candidate.created_at
    for update skip locked
    limit 1
  )
  returning operation.id, operation.attempt_id, operation.operation,
    operation.idempotency_key, operation.payload, operation.attempts,
    operation.available_at, operation.lease_expires_at, operation.lease_owner,
    (select pa.reservation_expires_at from public.payment_attempts as pa where pa.id = operation.attempt_id);
end;
$$;

create or replace function public.complete_payment_outbox_v2(
  p_outbox_id uuid,
  p_worker_id text,
  p_status public.payment_work_status,
  p_run_at timestamptz default null,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('pending', 'succeeded', 'dead_letter', 'manual_review')
    or nullif(btrim(p_worker_id), '') is null then
    raise exception using errcode = '22023', message = 'Payment outbox completion data is invalid';
  end if;

  update public.payment_outbox
  set status = p_status,
      available_at = coalesce(p_run_at, available_at),
      lease_expires_at = null,
      lease_owner = null,
      last_error = nullif(left(coalesce(p_error, ''), 500), '')
  where id = p_outbox_id
    and status = 'leased'
    and lease_owner = p_worker_id
    and lease_expires_at > statement_timestamp();
  return found;
end;
$$;

revoke execute on function public.claim_payment_outbox_v2(interval, text)
  from public, anon, authenticated;
grant execute on function public.claim_payment_outbox_v2(interval, text) to service_role;

revoke execute on function public.complete_payment_outbox_v2(uuid, text, public.payment_work_status, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.complete_payment_outbox_v2(uuid, text, public.payment_work_status, timestamptz, text) to service_role;
