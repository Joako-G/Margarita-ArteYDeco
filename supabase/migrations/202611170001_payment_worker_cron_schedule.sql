-- Brings the payment worker schedule under version control. The job already runs in the live
-- database, where it was created by hand, so this migration records it rather than changing it:
-- `database/README.md` states the schema is managed exclusively through the versioned files in
-- `supabase/migrations/`, and an environment rebuilt from those files had no clock for the
-- worker. Without it, webhooks keep enqueuing jobs in `payment_jobs` that nobody drains, and
-- payments approved at Mercado Pago never reach `paid` here. The failure is silent, which is
-- what makes it worth versioning.
--
-- This is a faithful capture of the live job: same name, same every-minute schedule, same
-- command, same Vault secret names, same headers, same body. Nothing is tuned or corrected
-- here on purpose, so applying this file to the current database changes nothing.
--
-- The schedule is created only when it is absent. An existing job is left exactly as it is,
-- including a hand-edited one, because silently replacing a running schedule would hide drift
-- instead of recording it. To adopt a changed definition, unschedule it first and re-run this
-- migration:
--
--   select cron.unschedule('margarita-payment-worker-every-minute');
--
-- The endpoint and the bearer secret stay in Supabase Vault under `margarita_payment_worker_url`
-- and `margarita_payment_worker_secret`. They are never committed and this file never reads
-- their values: it only references them by name, exactly as the live command does. A fresh
-- environment creates both with `vault.create_secret` before the worker can authenticate.
--
-- `net.http_post` only enqueues the request and returns its id, so no provider HTTP call ever
-- runs inside a SQL transaction. Responses land in `net._http_response` for debugging.
--
-- Forward-only: adds three extensions, which are already installed, and one schedule. No table,
-- column, enum or function is created or changed, and no order, payment or inventory row is
-- touched.

begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

do $migration$
begin
  if exists (
    select 1 from cron.job where jobname = 'margarita-payment-worker-every-minute'
  ) then
    raise notice 'margarita-payment-worker-every-minute already scheduled; leaving it unchanged';
    return;
  end if;

  perform cron.schedule(
    'margarita-payment-worker-every-minute',
    '* * * * *',
    $job$select net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name = 'margarita_payment_worker_url'), headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'margarita_payment_worker_secret'), 'X-Worker-Id', 'supabase-cron'), body := '{}'::jsonb) as request_id;$job$
  );
end;
$migration$;

commit;
