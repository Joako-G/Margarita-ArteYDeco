begin;

select plan(27);

select ok(
  has_function_privilege(
    'service_role',
    'public.release_expired_payment_reservations_v2(integer)',
    'execute'
  ),
  'service_role can execute the global payment expiry batch RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.release_expired_payment_reservations_v2(integer)',
    'execute'
  ),
  'anon cannot execute the global payment expiry batch RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.release_expired_payment_reservations_v2(integer)',
    'execute'
  ),
  'authenticated cannot execute the global payment expiry batch RPC'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.release_expired_payment_reservation_for_order_v2(uuid)',
    'execute'
  ),
  'service_role can execute the scoped payment expiry helper'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.release_expired_payment_reservation_for_order_v2(uuid)',
    'execute'
  ),
  'anon cannot execute the scoped payment expiry helper'
);

select ok(
  has_table_privilege('service_role', 'public.payment_attempts', 'select'),
  'service_role retains SELECT on public.payment_attempts'
);
select ok(
  has_table_privilege('service_role', 'public.payment_outbox', 'select'),
  'service_role retains SELECT on public.payment_outbox'
);
select ok(
  has_table_privilege('service_role', 'public.payment_jobs', 'select'),
  'service_role retains SELECT on public.payment_jobs'
);

select ok(
  has_column_privilege(
    'service_role', 'public.payment_attempts', 'provider_order_id', 'update'
  ),
  'service_role can update payment_attempts.provider_order_id'
);
select ok(
  has_column_privilege(
    'service_role', 'public.payment_attempts', 'provider_status', 'update'
  ),
  'service_role can update payment_attempts.provider_status'
);
select ok(
  has_column_privilege(
    'service_role', 'public.payment_attempts', 'last_error', 'update'
  ),
  'service_role can update payment_attempts.last_error'
);
select ok(
  has_column_privilege(
    'service_role', 'public.payment_attempts', 'provider_updated_at', 'update'
  ),
  'service_role can update payment_attempts.provider_updated_at'
);
select ok(
  has_column_privilege(
    'service_role', 'public.payment_attempts', 'provider_version', 'update'
  ),
  'service_role can update payment_attempts.provider_version'
);
select ok(
  has_column_privilege('service_role', 'public.payment_attempts', 'status', 'update'),
  'service_role can update payment_attempts.status'
);
select ok(
  has_column_privilege('service_role', 'public.payment_outbox', 'status', 'update'),
  'service_role can update payment_outbox.status'
);
select ok(
  has_column_privilege('service_role', 'public.payment_jobs', 'status', 'update'),
  'service_role can update payment_jobs.status'
);
select ok(
  has_column_privilege('service_role', 'public.payment_jobs', 'run_at', 'update'),
  'service_role can update payment_jobs.run_at'
);
select ok(
  has_column_privilege('service_role', 'public.payment_jobs', 'last_error', 'update'),
  'service_role can update payment_jobs.last_error'
);

select ok(
  not exists (
    select 1
    from pg_class as c
    cross join lateral aclexplode(
      coalesce(c.relacl, acldefault('r', c.relowner))
    ) as privilege
    join pg_roles as grantee on grantee.oid = privilege.grantee
    where c.oid = 'public.payment_attempts'::regclass
      and grantee.rolname = 'service_role'
      and privilege.privilege_type = 'UPDATE'
  ),
  'service_role has no table-wide UPDATE on public.payment_attempts'
);
select ok(
  not exists (
    select 1
    from pg_class as c
    cross join lateral aclexplode(
      coalesce(c.relacl, acldefault('r', c.relowner))
    ) as privilege
    join pg_roles as grantee on grantee.oid = privilege.grantee
    where c.oid = 'public.payment_outbox'::regclass
      and grantee.rolname = 'service_role'
      and privilege.privilege_type = 'UPDATE'
  ),
  'service_role has no table-wide UPDATE on public.payment_outbox'
);
select ok(
  not exists (
    select 1
    from pg_class as c
    cross join lateral aclexplode(
      coalesce(c.relacl, acldefault('r', c.relowner))
    ) as privilege
    join pg_roles as grantee on grantee.oid = privilege.grantee
    where c.oid = 'public.payment_jobs'::regclass
      and grantee.rolname = 'service_role'
      and privilege.privilege_type = 'UPDATE'
  ),
  'service_role has no table-wide UPDATE on public.payment_jobs'
);

select ok(
  not has_table_privilege('service_role', 'public.payment_attempts', 'insert'),
  'service_role has no INSERT on public.payment_attempts'
);
select ok(
  not has_table_privilege('service_role', 'public.payment_attempts', 'delete'),
  'service_role has no DELETE on public.payment_attempts'
);
select ok(
  not has_table_privilege('service_role', 'public.payment_outbox', 'insert'),
  'service_role has no INSERT on public.payment_outbox'
);
select ok(
  not has_table_privilege('service_role', 'public.payment_outbox', 'delete'),
  'service_role has no DELETE on public.payment_outbox'
);
select ok(
  not has_table_privilege('service_role', 'public.payment_jobs', 'insert'),
  'service_role has no INSERT on public.payment_jobs'
);
select ok(
  not has_table_privilege('service_role', 'public.payment_jobs', 'delete'),
  'service_role has no DELETE on public.payment_jobs'
);

select * from finish();

rollback;
