begin;

create or replace function public.transition_payment_attempt_v2(
  p_attempt_id uuid,
  p_provider_status text,
  p_provider_updated_at timestamptz,
  p_provider_version bigint,
  p_expected_status public.payment_attempt_status,
  p_expected_provider_version bigint,
  p_next_status public.payment_attempt_status
)
returns table (transition_applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_action text;
  v_description text;
begin
  select o.* into v_order
  from public.orders as o
  join public.payment_attempts as pa on pa.order_id = o.id
  where pa.id = p_attempt_id
  for update of o;

  select * into v_attempt from public.payment_attempts where id = p_attempt_id for update;
  if not found
    or v_order.status = 'cancelled' and p_next_status = 'approved'
    or v_order.payment_status = 'paid' and p_next_status <> 'approved'
    or v_attempt.status <> p_expected_status
    or (p_expected_provider_version is null and v_attempt.provider_version is not null)
    or (p_expected_provider_version is not null and v_attempt.provider_version <> p_expected_provider_version)
    or (v_attempt.status = 'approved' and p_next_status <> 'approved') then
    transition_applied := false;
    return next;
    return;
  end if;

  update public.payment_attempts
  set provider_status = p_provider_status,
      provider_updated_at = p_provider_updated_at,
      provider_version = p_provider_version,
      status = p_next_status
  where id = p_attempt_id;

  if p_next_status = 'approved' then
    update public.orders set payment_status = 'paid' where id = v_order.id;
  elsif p_next_status = 'rejected' then
    update public.orders set payment_status = 'rejected' where id = v_order.id
      and payment_status <> 'paid';
  end if;

  if v_attempt.status is distinct from p_next_status then
    v_action := 'payment_status_changed';
    v_description := format(
      'Estado del pago actualizado de %s a %s.',
      v_attempt.status::text,
      p_next_status::text
    );
  else
    v_action := 'payment_provider_updated';
    v_description := format(
      'Información del proveedor actualizada; el estado permanece en %s.',
      p_next_status::text
    );
  end if;

  insert into public.audit_logs (action, entity_type, entity_id, metadata)
  values (
    v_action,
    'payment_attempt',
    p_attempt_id,
    jsonb_build_object(
      'description', v_description,
      'previous_status', v_attempt.status::text,
      'next_status', p_next_status::text,
      'provider_status', p_provider_status,
      'provider_version', p_provider_version,
      'provider_updated_at', p_provider_updated_at
    )
  );

  transition_applied := true;
  return next;
end;
$$;

revoke execute on function public.transition_payment_attempt_v2(
  uuid, text, timestamptz, bigint, public.payment_attempt_status,
  bigint, public.payment_attempt_status
) from public, anon, authenticated;
grant execute on function public.transition_payment_attempt_v2(
  uuid, text, timestamptz, bigint, public.payment_attempt_status,
  bigint, public.payment_attempt_status
) to service_role;

insert into public.audit_logs (action, entity_type, entity_id, metadata)
select
  'payment_state_recorded',
  'payment_attempt',
  pa.id,
  jsonb_build_object(
    'audit_enablement', true,
    'description', format(
      'Estado actual del intento registrado durante la habilitación de auditoría: %s.',
      pa.status::text
    ),
    'previous_status', null,
    'next_status', pa.status::text,
    'provider_status', pa.provider_status,
    'provider_version', pa.provider_version,
    'provider_updated_at', pa.provider_updated_at
  )
from public.payment_attempts as pa
where not exists (
  select 1
  from public.audit_logs as al
  where al.entity_type = 'payment_attempt'
    and al.entity_id = pa.id
    and al.action = 'payment_state_recorded'
    and al.metadata ->> 'audit_enablement' = 'true'
);

commit;
