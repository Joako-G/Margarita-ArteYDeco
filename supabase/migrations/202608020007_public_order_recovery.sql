begin;

create type public.recovery_limit_scope as enum ('ip', 'order_phone');

create table public.public_recovery_attempts (
  id uuid primary key default gen_random_uuid(),
  scope public.recovery_limit_scope not null,
  fingerprint bytea not null,
  window_started_at timestamptz not null,
  failed_count integer not null default 0,
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_recovery_attempts_fingerprint_length check (
    octet_length(fingerprint) = 32
  ),
  constraint public_recovery_attempts_failed_count_nonnegative check (
    failed_count >= 0
  ),
  constraint public_recovery_attempts_block_after_window check (
    blocked_until is null or blocked_until > window_started_at
  ),
  constraint public_recovery_attempts_scope_fingerprint_unique unique (
    scope,
    fingerprint
  )
);

create index guest_session_orders_session_created_at_idx
  on public.guest_session_orders (guest_session_id, created_at desc);

create index public_recovery_attempts_cleanup_idx
  on public.public_recovery_attempts (
    coalesce(blocked_until, window_started_at)
  );

alter table public.public_recovery_attempts enable row level security;

create trigger public_recovery_attempts_set_updated_at
before update on public.public_recovery_attempts
for each row execute function public.set_updated_at();

create function public.get_public_recovery_limit(
  p_ip_fingerprint bytea,
  p_order_fingerprint bytea,
  p_window interval,
  p_captcha_threshold integer
)
returns table (
  is_blocked boolean,
  captcha_required boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if octet_length(p_ip_fingerprint) <> 32
    or octet_length(p_order_fingerprint) <> 32
    or p_window < interval '1 minute'
    or p_captcha_threshold < 1 then
    raise exception using
      errcode = '22023',
      message = 'Recovery limit parameters are invalid';
  end if;

  return query
  select
    coalesce(bool_or(attempt.blocked_until > now()), false),
    coalesce(bool_or(
      attempt.window_started_at > now() - p_window
      and attempt.failed_count >= p_captcha_threshold
    ), false),
    coalesce(max(
      greatest(
        0,
        ceil(extract(epoch from attempt.blocked_until - now()))::integer
      )
    ), 0)
  from public.public_recovery_attempts as attempt
  where (attempt.scope, attempt.fingerprint) in (
    ('ip'::public.recovery_limit_scope, p_ip_fingerprint),
    ('order_phone'::public.recovery_limit_scope, p_order_fingerprint)
  );
end;
$$;

create function public.register_public_recovery_failure(
  p_ip_fingerprint bytea,
  p_order_fingerprint bytea,
  p_window interval,
  p_max_attempts integer,
  p_block_duration interval,
  p_captcha_threshold integer
)
returns table (
  is_blocked boolean,
  captcha_required boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fingerprint bytea;
  v_scope public.recovery_limit_scope;
begin
  if octet_length(p_ip_fingerprint) <> 32
    or octet_length(p_order_fingerprint) <> 32
    or p_window < interval '1 minute'
    or p_max_attempts < 1
    or p_block_duration < interval '1 minute'
    or p_captcha_threshold < 1
    or p_captcha_threshold > p_max_attempts then
    raise exception using
      errcode = '22023',
      message = 'Recovery limit parameters are invalid';
  end if;

  for v_scope, v_fingerprint in
    select input.scope, input.fingerprint
    from (
      values
        ('ip'::public.recovery_limit_scope, p_ip_fingerprint),
        ('order_phone'::public.recovery_limit_scope, p_order_fingerprint)
    ) as input(scope, fingerprint)
    order by input.scope
  loop
    insert into public.public_recovery_attempts (
      scope,
      fingerprint,
      window_started_at,
      failed_count
    )
    values (v_scope, v_fingerprint, now(), 1)
    on conflict (scope, fingerprint) do update
    set
      window_started_at = case
        when public.public_recovery_attempts.window_started_at <= now() - p_window
          then now()
        else public.public_recovery_attempts.window_started_at
      end,
      failed_count = case
        when public.public_recovery_attempts.window_started_at <= now() - p_window
          then 1
        else public.public_recovery_attempts.failed_count + 1
      end,
      blocked_until = case
        when public.public_recovery_attempts.blocked_until > now()
          then public.public_recovery_attempts.blocked_until
        when (
          case
            when public.public_recovery_attempts.window_started_at <= now() - p_window
              then 1
            else public.public_recovery_attempts.failed_count + 1
          end
        ) >= p_max_attempts
          then now() + p_block_duration
        else null
      end;
  end loop;

  return query
  select *
  from public.get_public_recovery_limit(
    p_ip_fingerprint,
    p_order_fingerprint,
    p_window,
    p_captcha_threshold
  );
end;
$$;

create function public.clear_public_recovery_failures(
  p_ip_fingerprint bytea,
  p_order_fingerprint bytea
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted bigint;
begin
  if octet_length(p_ip_fingerprint) <> 32
    or octet_length(p_order_fingerprint) <> 32 then
    raise exception using
      errcode = '22023',
      message = 'Recovery fingerprints are invalid';
  end if;

  delete from public.public_recovery_attempts as attempt
  where (attempt.scope, attempt.fingerprint) in (
    ('ip'::public.recovery_limit_scope, p_ip_fingerprint),
    ('order_phone'::public.recovery_limit_scope, p_order_fingerprint)
  );

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create function public.recover_order_guest_session(
  p_current_session_id uuid,
  p_order_id uuid,
  p_token_hash bytea,
  p_expires_at timestamptz
)
returns table (
  guest_session_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_session_id uuid;
  v_previous_session_id uuid;
begin
  if octet_length(p_token_hash) <> 32
    or p_expires_at <= now()
    or p_expires_at > now() + interval '30 days' then
    raise exception using
      errcode = '22023',
      message = 'Guest session recovery parameters are invalid';
  end if;

  perform 1
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Order is invalid';
  end if;

  if p_current_session_id is not null then
    select session.id
    into v_previous_session_id
    from public.guest_sessions as session
    where session.id = p_current_session_id
      and session.revoked_at is null
      and session.expires_at > now()
    for update;
  end if;

  insert into public.guest_sessions (
    token_hash,
    expires_at,
    last_accessed_at
  )
  values (p_token_hash, p_expires_at, now())
  returning id into v_new_session_id;

  if v_previous_session_id is not null then
    insert into public.guest_session_orders (guest_session_id, order_id)
    select v_new_session_id, relation.order_id
    from public.guest_session_orders as relation
    where relation.guest_session_id = v_previous_session_id
    on conflict (guest_session_id, order_id) do nothing;

    update public.guest_sessions
    set revoked_at = now()
    where id = v_previous_session_id;
  end if;

  insert into public.guest_session_orders (guest_session_id, order_id)
  values (v_new_session_id, p_order_id)
  on conflict (guest_session_id, order_id) do nothing;

  return query
  select v_new_session_id, p_expires_at;
end;
$$;

create function public.touch_guest_session(p_guest_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.guest_sessions
  set last_accessed_at = now()
  where id = p_guest_session_id
    and revoked_at is null
    and expires_at > now();

  return found;
end;
$$;

create function public.revoke_guest_session(p_guest_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.guest_sessions
  set revoked_at = coalesce(revoked_at, now())
  where id = p_guest_session_id;

  return found;
end;
$$;

create function public.purge_public_security_data(
  p_guest_session_retention interval default interval '7 days',
  p_recovery_attempt_retention interval default interval '7 days'
)
returns table (
  guest_sessions_deleted bigint,
  recovery_attempts_deleted bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest_sessions_deleted bigint;
  v_recovery_attempts_deleted bigint;
begin
  if p_guest_session_retention < interval '0 seconds'
    or p_recovery_attempt_retention < interval '0 seconds' then
    raise exception using
      errcode = '22023',
      message = 'Security data retention cannot be negative';
  end if;

  select public.purge_guest_sessions(p_guest_session_retention)
  into v_guest_sessions_deleted;

  delete from public.public_recovery_attempts
  where coalesce(blocked_until, window_started_at)
    < now() - p_recovery_attempt_retention;

  get diagnostics v_recovery_attempts_deleted = row_count;

  return query
  select v_guest_sessions_deleted, v_recovery_attempts_deleted;
end;
$$;

revoke all on public.public_recovery_attempts
  from public, anon, authenticated, service_role;

revoke all on function public.get_public_recovery_limit(
  bytea,
  bytea,
  interval,
  integer
) from public, anon, authenticated;

revoke all on function public.register_public_recovery_failure(
  bytea,
  bytea,
  interval,
  integer,
  interval,
  integer
) from public, anon, authenticated;

revoke all on function public.clear_public_recovery_failures(bytea, bytea)
  from public, anon, authenticated;

revoke all on function public.recover_order_guest_session(
  uuid,
  uuid,
  bytea,
  timestamptz
) from public, anon, authenticated;

revoke all on function public.touch_guest_session(uuid)
  from public, anon, authenticated;

revoke all on function public.revoke_guest_session(uuid)
  from public, anon, authenticated;

revoke all on function public.purge_public_security_data(interval, interval)
  from public, anon, authenticated, service_role;

grant execute on function public.get_public_recovery_limit(
  bytea,
  bytea,
  interval,
  integer
) to service_role;

grant execute on function public.register_public_recovery_failure(
  bytea,
  bytea,
  interval,
  integer,
  interval,
  integer
) to service_role;

grant execute on function public.clear_public_recovery_failures(bytea, bytea)
  to service_role;

grant execute on function public.recover_order_guest_session(
  uuid,
  uuid,
  bytea,
  timestamptz
) to service_role;

grant execute on function public.touch_guest_session(uuid)
  to service_role;

grant execute on function public.revoke_guest_session(uuid)
  to service_role;

create extension if not exists pg_cron;

select cron.schedule(
  'margarita-purge-public-security-data',
  '23 3 * * *',
  'select public.purge_public_security_data();'
);

commit;
