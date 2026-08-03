begin;

create or replace function public.recover_order_guest_session(
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
    on conflict on constraint guest_session_orders_session_order_unique do nothing;

    update public.guest_sessions
    set revoked_at = now()
    where id = v_previous_session_id;
  end if;

  insert into public.guest_session_orders (guest_session_id, order_id)
  values (v_new_session_id, p_order_id)
  on conflict on constraint guest_session_orders_session_order_unique do nothing;

  return query
  select v_new_session_id, p_expires_at;
end;
$$;

revoke all on function public.recover_order_guest_session(
  uuid,
  uuid,
  bytea,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.recover_order_guest_session(
  uuid,
  uuid,
  bytea,
  timestamptz
) to service_role;

commit;
