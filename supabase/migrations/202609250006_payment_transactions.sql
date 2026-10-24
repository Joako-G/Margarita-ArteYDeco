begin;

create table public.payment_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  payment_attempt_id uuid not null references public.payment_attempts (id) on delete restrict,
  provider text not null default 'mercado_pago',
  environment text not null,
  provider_payment_id text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'ARS',
  payment_type_id text,
  status public.payment_attempt_status not null default 'pending',
  provider_status text,
  provider_version bigint,
  provider_updated_at timestamptz,
  review_required boolean not null default false,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_transactions_provider_check check (provider = 'mercado_pago'),
  constraint payment_transactions_environment_check check (environment in ('sandbox', 'production')),
  constraint payment_transactions_payment_id_check check (btrim(provider_payment_id) <> ''),
  constraint payment_transactions_amount_positive check (amount > 0),
  constraint payment_transactions_currency_check check (currency = 'ARS'),
  constraint payment_transactions_unique_provider_payment unique (provider, environment, provider_payment_id)
);

create index payment_transactions_attempt_idx
  on public.payment_transactions (payment_attempt_id, updated_at desc);
create index payment_transactions_status_idx
  on public.payment_transactions (status, updated_at desc);

create trigger payment_transactions_set_updated_at
before update on public.payment_transactions
for each row execute function public.set_updated_at();

insert into public.payment_transactions (
  payment_attempt_id, environment, provider_payment_id, amount, currency,
  status, provider_status, provider_version, provider_updated_at
)
select
  pa.id, pa.environment, pa.provider_payment_id, pa.amount, pa.currency,
  pa.status, pa.provider_status, pa.provider_version, pa.provider_updated_at
from public.payment_attempts as pa
where pa.provider_payment_id is not null
on conflict (provider, environment, provider_payment_id) do nothing;

alter table public.payment_transactions enable row level security;
revoke all on public.payment_transactions from public, anon, authenticated, service_role;
grant select, insert, update on public.payment_transactions to service_role;

create or replace function public.reconcile_payment_transaction_v1(
  p_transaction_id uuid,
  p_expected_status public.payment_attempt_status,
  p_expected_provider_version bigint,
  p_next_status public.payment_attempt_status,
  p_provider_status text,
  p_provider_updated_at timestamptz,
  p_provider_version bigint,
  p_review_required boolean,
  p_last_error text
)
returns table (transition_applied boolean, aggregate_status public.payment_attempt_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction public.payment_transactions%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_approved_amount numeric(12, 2);
  v_has_pending boolean;
  v_has_review boolean;
  v_has_overpayment boolean;
  v_aggregate public.payment_attempt_status;
begin
  select * into v_transaction from public.payment_transactions
  where id = p_transaction_id for update;
  if not found then
    transition_applied := false;
    aggregate_status := 'manual_review';
    return next;
  end if;

  select * into v_attempt from public.payment_attempts
  where id = v_transaction.payment_attempt_id for update;
  select * into v_order from public.orders
  where id = v_attempt.order_id for update;

  if v_transaction.status <> p_expected_status
    or (p_expected_provider_version is null and v_transaction.provider_version is not null)
    or (p_expected_provider_version is not null and v_transaction.provider_version <> p_expected_provider_version)
    or v_order.status = 'cancelled' and p_next_status = 'approved' then
    transition_applied := false;
    aggregate_status := v_attempt.status;
    return next;
  end if;

  update public.payment_transactions
  set status = p_next_status,
      provider_status = p_provider_status,
      provider_updated_at = p_provider_updated_at,
      provider_version = p_provider_version,
      review_required = p_review_required,
      last_error = p_last_error
  where id = p_transaction_id;

  select coalesce(sum(pt.amount) filter (where pt.status = 'approved'), 0),
         coalesce(bool_or(pt.status = 'pending'), false),
         coalesce(bool_or(pt.status = 'manual_review' or pt.review_required), false)
  into v_approved_amount, v_has_pending, v_has_review
  from public.payment_transactions as pt
  where pt.payment_attempt_id = v_attempt.id;
  v_has_overpayment := v_approved_amount > v_order.total;

  if v_has_review or v_has_overpayment then
    v_aggregate := 'manual_review';
  elsif v_has_pending then
    v_aggregate := 'pending';
  elsif v_approved_amount = v_order.total then
    v_aggregate := 'approved';
  elsif exists (
    select 1 from public.payment_transactions as pt
    where pt.payment_attempt_id = v_attempt.id and pt.status in ('rejected', 'expired')
  ) then
    v_aggregate := 'rejected';
  else
    v_aggregate := 'manual_review';
  end if;

  update public.payment_attempts
  set provider_payment_id = coalesce(provider_payment_id, v_transaction.provider_payment_id),
      provider_status = case when v_aggregate = 'manual_review' then 'manual_review' else p_provider_status end,
      provider_updated_at = p_provider_updated_at,
      provider_version = p_provider_version,
      status = v_aggregate,
      last_error = case when v_aggregate = 'manual_review' then coalesce(p_last_error, 'Payment transaction aggregate requires review') else null end
  where id = v_attempt.id;

  if v_aggregate = 'approved' then
    update public.orders set payment_status = 'paid' where id = v_order.id;
  elsif v_aggregate = 'rejected' then
    update public.orders set payment_status = 'rejected' where id = v_order.id and payment_status <> 'paid';
  end if;

  transition_applied := true;
  aggregate_status := v_aggregate;
  return next;
end;
$$;

revoke execute on function public.reconcile_payment_transaction_v1(
  uuid, public.payment_attempt_status, bigint, public.payment_attempt_status,
  text, timestamptz, bigint, boolean, text
) from public, anon, authenticated;
grant execute on function public.reconcile_payment_transaction_v1(
  uuid, public.payment_attempt_status, bigint, public.payment_attempt_status,
  text, timestamptz, bigint, boolean, text
) to service_role;

commit;
