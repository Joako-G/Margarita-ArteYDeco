-- Separate the hosted Checkout Pro preference from the later payment resource.
-- Existing provider_order_id data is intentionally preserved for rollback/history.

alter table public.payment_attempts
  add column if not exists provider_preference_id text,
  add column if not exists provider_payment_id text;

create index if not exists payment_attempts_provider_payment_idx
  on public.payment_attempts (provider_payment_id)
  where provider_payment_id is not null;

create index if not exists payment_attempts_external_reference_environment_idx
  on public.payment_attempts (environment, external_reference);

grant update (
  provider_preference_id,
  provider_payment_id,
  provider_status,
  last_error,
  provider_updated_at,
  provider_version,
  status
) on public.payment_attempts to service_role;
