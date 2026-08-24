begin;

alter type public.inventory_movement_type rename to inventory_movement_type_legacy;

create type public.inventory_movement_type as enum (
  'initial_stock',
  'manual_adjustment',
  'order_created',
  'order_cancelled',
  'consumer_withdrawal_return'
);

alter table public.inventory_movements
  drop constraint inventory_movements_order_reference_consistent,
  drop constraint inventory_movements_direction_consistent,
  drop constraint inventory_movements_manual_reason_required;

drop index public.inventory_movements_order_created_unique;
drop index public.inventory_movements_order_cancelled_unique;

alter table public.inventory_movements
  alter column movement_type type public.inventory_movement_type
  using movement_type::text::public.inventory_movement_type;

drop type public.inventory_movement_type_legacy;

alter table public.inventory_movements
  add column withdrawal_request_id uuid
    references public.consumer_withdrawal_requests(id) on delete restrict,
  add constraint inventory_movements_order_reference_consistent check (
    (
      movement_type in ('order_created', 'order_cancelled')
      and order_id is not null
      and withdrawal_request_id is null
    )
    or (
      movement_type in ('initial_stock', 'manual_adjustment')
      and order_id is null
      and withdrawal_request_id is null
    )
    or (
      movement_type = 'consumer_withdrawal_return'
      and order_id is not null
      and withdrawal_request_id is not null
    )
  ),
  add constraint inventory_movements_direction_consistent check (
    (movement_type = 'order_created' and quantity_delta < 0)
    or (
      movement_type in ('initial_stock', 'order_cancelled', 'consumer_withdrawal_return')
      and quantity_delta > 0
    )
    or movement_type = 'manual_adjustment'
  ),
  add constraint inventory_movements_manual_reason_required check (
    movement_type <> 'manual_adjustment'
    or nullif(btrim(reason), '') is not null
  );

create unique index inventory_movements_order_created_unique
  on public.inventory_movements(order_id, product_id)
  where movement_type = 'order_created';

create unique index inventory_movements_order_cancelled_unique
  on public.inventory_movements(order_id, product_id)
  where movement_type = 'order_cancelled';

create index inventory_movements_withdrawal_request_idx
  on public.inventory_movements(withdrawal_request_id, created_at, id)
  where withdrawal_request_id is not null;

create unique index inventory_movements_withdrawal_product_unique
  on public.inventory_movements(withdrawal_request_id, product_id)
  where movement_type = 'consumer_withdrawal_return';

create table public.consumer_withdrawal_return_items (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null
    references public.consumer_withdrawal_requests(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  ordered_quantity integer not null check (ordered_quantity > 0),
  restockable_quantity integer not null check (restockable_quantity >= 0),
  non_restockable_quantity integer not null check (non_restockable_quantity >= 0),
  inspection_note text not null check (char_length(btrim(inspection_note)) between 3 and 1000),
  inspected_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint consumer_withdrawal_return_item_quantities check (
    restockable_quantity + non_restockable_quantity = ordered_quantity
  ),
  constraint consumer_withdrawal_return_item_order_unique unique (
    withdrawal_request_id,
    order_item_id
  ),
  constraint consumer_withdrawal_return_item_product_unique unique (
    withdrawal_request_id,
    product_id
  )
);

create index consumer_withdrawal_return_items_request_idx
  on public.consumer_withdrawal_return_items(withdrawal_request_id, created_at, id);

alter table public.consumer_withdrawal_return_items enable row level security;

revoke all on table public.consumer_withdrawal_return_items
  from public, anon, authenticated;
grant select, insert on table public.consumer_withdrawal_return_items to service_role;

create function public.prevent_consumer_withdrawal_return_item_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'Consumer withdrawal return items are append-only';
end;
$$;

create trigger prevent_consumer_withdrawal_return_item_mutation
before update or delete on public.consumer_withdrawal_return_items
for each row execute function public.prevent_consumer_withdrawal_return_item_mutation();

create function public.ensure_consumer_withdrawal_return_resolution()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_item_count integer;
  v_resolved_item_count integer;
begin
  if (
    new.return_status = 'inspected'
    and old.return_status is distinct from 'inspected'
  ) or (
    new.request_status = 'closed'
    and old.request_status is distinct from 'closed'
    and new.return_status = 'inspected'
  ) then
    if new.order_id is null then
      raise exception using
        errcode = '23514',
        message = 'A linked order is required to resolve returned stock';
    end if;

    select count(*) into v_order_item_count
    from public.order_items
    where order_id = new.order_id;

    select count(*) into v_resolved_item_count
    from public.consumer_withdrawal_return_items
    where withdrawal_request_id = new.id;

    if v_order_item_count = 0 or v_resolved_item_count <> v_order_item_count then
      raise exception using
        errcode = '23514',
        message = 'Returned stock must be resolved before inspection or closure';
    end if;
  end if;

  return new;
end;
$$;

create trigger ensure_consumer_withdrawal_return_resolution
before update of request_status, return_status on public.consumer_withdrawal_requests
for each row execute function public.ensure_consumer_withdrawal_return_resolution();

create function public.inspect_consumer_withdrawal_return(
  p_request_id uuid,
  p_actor_profile_id uuid,
  p_expected_version bigint,
  p_items jsonb,
  p_reason text,
  p_idempotency_key_hash text,
  p_payload_fingerprint text,
  p_idempotency_expires_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.consumer_withdrawal_requests%rowtype;
  v_order_item record;
  v_payload_item record;
  v_idempotency_hash bytea;
  v_payload_fingerprint bytea;
  v_existing record;
  v_order_item_count integer;
  v_payload_item_count integer;
  v_distinct_payload_item_count integer;
  v_stock_before integer;
  v_total_restockable integer := 0;
  v_total_non_restockable integer := 0;
begin
  perform 1 from public.profiles
  where id = p_actor_profile_id and role = 'administrator' and is_active = true;
  if not found then
    raise exception using errcode = '42501', message = 'An active administrator is required';
  end if;

  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'A valid inspection note is required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'Return items are required';
  end if;

  begin
    v_idempotency_hash := decode(p_idempotency_key_hash, 'hex');
    v_payload_fingerprint := decode(p_payload_fingerprint, 'hex');
  exception when others then
    raise exception using errcode = '22023', message = 'Invalid idempotency fingerprint';
  end;
  if octet_length(v_idempotency_hash) <> 32 or octet_length(v_payload_fingerprint) <> 32 then
    raise exception using errcode = '22023', message = 'Invalid idempotency fingerprint length';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(pg_catalog.encode(v_idempotency_hash, 'hex'), 0)
  );

  select withdrawal_request_id, operation, payload_fingerprint into v_existing
  from public.consumer_withdrawal_admin_idempotency
  where idempotency_key_hash = v_idempotency_hash;
  if found then
    if v_existing.withdrawal_request_id = p_request_id
      and v_existing.operation = 'inspect_return'
      and v_existing.payload_fingerprint = v_payload_fingerprint then
      return true;
    end if;
    raise exception using errcode = '23505', message = 'Idempotency key was reused with another operation';
  end if;

  select * into v_request
  from public.consumer_withdrawal_requests
  where id = p_request_id
  for update;
  if not found then return false; end if;
  if v_request.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'The withdrawal changed before inspection';
  end if;
  if v_request.request_status <> 'applicable'
    or v_request.return_status <> 'received'
    or v_request.order_id is null then
    raise exception using errcode = '23514', message = 'Return inspection is not available';
  end if;

  select count(*) into v_order_item_count
  from public.order_items
  where order_id = v_request.order_id;

  select count(*), count(distinct item.order_item_id)
  into v_payload_item_count, v_distinct_payload_item_count
  from jsonb_to_recordset(p_items) as item(
    order_item_id uuid,
    restockable_quantity integer,
    non_restockable_quantity integer
  );

  if v_order_item_count = 0
    or v_payload_item_count <> v_order_item_count
    or v_distinct_payload_item_count <> v_payload_item_count then
    raise exception using errcode = '23514', message = 'Every order item must be resolved exactly once';
  end if;

  perform 1
  from public.products as product
  join public.order_items as order_item on order_item.product_id = product.id
  where order_item.order_id = v_request.order_id
  order by product.id
  for update of product;

  for v_order_item in
    select id, product_id, product_name, quantity
    from public.order_items
    where order_id = v_request.order_id
    order by product_id
  loop
    select * into v_payload_item
    from jsonb_to_recordset(p_items) as item(
      order_item_id uuid,
      restockable_quantity integer,
      non_restockable_quantity integer
    )
    where item.order_item_id = v_order_item.id;

    if not found
      or v_payload_item.restockable_quantity is null
      or v_payload_item.non_restockable_quantity is null
      or v_payload_item.restockable_quantity < 0
      or v_payload_item.non_restockable_quantity < 0
      or v_payload_item.restockable_quantity + v_payload_item.non_restockable_quantity
        <> v_order_item.quantity then
      raise exception using errcode = '23514', message = 'Returned quantities do not match the order';
    end if;

    insert into public.consumer_withdrawal_return_items (
      withdrawal_request_id,
      order_item_id,
      product_id,
      ordered_quantity,
      restockable_quantity,
      non_restockable_quantity,
      inspection_note,
      inspected_by_profile_id
    ) values (
      p_request_id,
      v_order_item.id,
      v_order_item.product_id,
      v_order_item.quantity,
      v_payload_item.restockable_quantity,
      v_payload_item.non_restockable_quantity,
      btrim(p_reason),
      p_actor_profile_id
    );

    if v_payload_item.restockable_quantity > 0 then
      select stock_quantity into v_stock_before
      from public.products
      where id = v_order_item.product_id;

      update public.products
      set stock_quantity = stock_quantity + v_payload_item.restockable_quantity
      where id = v_order_item.product_id;

      insert into public.inventory_movements (
        product_id,
        order_id,
        withdrawal_request_id,
        movement_type,
        quantity_delta,
        stock_before,
        stock_after,
        reason,
        created_by
      ) values (
        v_order_item.product_id,
        v_request.order_id,
        p_request_id,
        'consumer_withdrawal_return',
        v_payload_item.restockable_quantity,
        v_stock_before,
        v_stock_before + v_payload_item.restockable_quantity,
        btrim(p_reason),
        p_actor_profile_id
      );
    end if;

    v_total_restockable := v_total_restockable + v_payload_item.restockable_quantity;
    v_total_non_restockable := v_total_non_restockable
      + v_payload_item.non_restockable_quantity;
  end loop;

  update public.consumer_withdrawal_requests
  set return_status = 'inspected',
    inspected_at = now(),
    version = version + 1
  where id = p_request_id;

  insert into public.consumer_withdrawal_events (
    withdrawal_request_id,
    actor_profile_id,
    event_type,
    previous_status,
    next_status,
    reason,
    metadata
  ) values (
    p_request_id,
    p_actor_profile_id,
    'return_inspected',
    v_request.request_status,
    v_request.request_status,
    btrim(p_reason),
    jsonb_build_object(
      'restockable_quantity', v_total_restockable,
      'non_restockable_quantity', v_total_non_restockable,
      'item_count', v_order_item_count
    )
  );

  insert into public.consumer_withdrawal_admin_idempotency (
    idempotency_key_hash,
    payload_fingerprint,
    withdrawal_request_id,
    operation,
    result_version,
    expires_at
  ) values (
    v_idempotency_hash,
    v_payload_fingerprint,
    p_request_id,
    'inspect_return',
    p_expected_version + 1,
    p_idempotency_expires_at
  );

  return true;
end;
$$;

revoke execute on function public.prevent_consumer_withdrawal_return_item_mutation()
  from public, anon, authenticated;
revoke execute on function public.ensure_consumer_withdrawal_return_resolution()
  from public, anon, authenticated;
revoke execute on function public.inspect_consumer_withdrawal_return(
  uuid, uuid, bigint, jsonb, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.inspect_consumer_withdrawal_return(
  uuid, uuid, bigint, jsonb, text, text, text, timestamptz
) to service_role;

commit;
