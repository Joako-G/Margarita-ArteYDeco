grant update (
  provider_order_id,
  provider_status,
  last_error,
  provider_updated_at,
  provider_version,
  status
) on public.payment_attempts to service_role;

grant update (status) on public.payment_outbox to service_role;

grant update (status, run_at, last_error)
  on public.payment_jobs to service_role;
