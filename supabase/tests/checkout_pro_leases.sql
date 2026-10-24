begin;

insert into public.payment_inbox (
  id, environment, resource_type, resource_id, request_id, signature_digest
) values (
  '61000000-0000-4000-8000-000000000001',
  'sandbox',
  'order',
  'lease-test-order',
  'lease-test-request',
  decode(repeat('61', 32), 'hex')
);

insert into public.payment_jobs (id, inbox_id, operation, run_at)
values (
  '62000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  'reconcile_order',
  statement_timestamp()
);

set local role service_role;

do $$
declare
  v_job_id uuid;
  v_attempts integer;
begin
  select job_id, attempts
  into v_job_id, v_attempts
   from public.claim_payment_job_v2(interval '5 minutes', 'worker-a');

  if v_job_id <> '62000000-0000-4000-8000-000000000001'
    or v_attempts <> 1 then
    raise exception 'Initial payment job claim was not recorded';
  end if;
end;
$$;

set local role postgres;

update public.payment_jobs
   set lease_expires_at = statement_timestamp() - interval '1 second'
where id = '62000000-0000-4000-8000-000000000001';

set local role service_role;

do $$
declare
  v_job_id uuid;
  v_attempts integer;
begin
  select job_id, attempts
  into v_job_id, v_attempts
   from public.claim_payment_job_v2(interval '5 minutes', 'worker-b');

  if v_job_id <> '62000000-0000-4000-8000-000000000001'
    or v_attempts <> 2 then
    raise exception 'Expired payment job lease was not reclaimed';
  end if;
end;
$$;

do $$
declare
  v_job_id uuid;
begin
  select job_id into v_job_id
  from public.claim_payment_job_v2(interval '5 minutes', 'worker-c');
  if v_job_id is not null then
    raise exception 'An active lease was claimed by a duplicate worker';
  end if;
end;
$$;

rollback;
