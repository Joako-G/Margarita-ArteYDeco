begin;

create extension if not exists pgcrypto with schema extensions;

create type public.order_status as enum (
  'pending',
  'payment_pending',
  'paid',
  'preparing',
  'ready',
  'picked_up',
  'cancelled'
);

create type public.payment_status as enum (
  'pending',
  'paid',
  'rejected'
);

create type public.payment_method as enum (
  'cash',
  'bank_transfer'
);

create type public.inventory_movement_type as enum (
  'initial_stock',
  'manual_adjustment',
  'order_created',
  'order_cancelled'
);

create sequence public.order_number_sequence;

create table public.profiles (
  id uuid primary key references auth.users (id) on update restrict on delete restrict,
  email text not null,
  full_name text not null,
  role text not null default 'administrator',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_not_blank check (btrim(email) <> ''),
  constraint profiles_full_name_not_blank check (btrim(full_name) <> ''),
  constraint profiles_role_valid check (role = 'administrator')
);

create unique index profiles_email_unique
  on public.profiles (lower(email));

create unique index profiles_single_administrator
  on public.profiles (role)
  where role = 'administrator';

create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_sessions_token_hash_length check (octet_length(token_hash) = 32),
  constraint guest_sessions_expiry_after_creation check (expires_at > created_at),
  constraint guest_sessions_maximum_lifetime check (
    expires_at <= created_at + interval '30 days'
  ),
  constraint guest_sessions_revocation_after_creation check (
    revoked_at is null or revoked_at >= created_at
  ),
  constraint guest_sessions_last_access_after_creation check (
    last_accessed_at is null or last_accessed_at >= created_at
  ),
  constraint guest_sessions_token_hash_unique unique (token_hash)
);

create index guest_sessions_expires_at_idx
  on public.guest_sessions (expires_at);

create index guest_sessions_cleanup_idx
  on public.guest_sessions (coalesce(revoked_at, expires_at));

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  image_path text not null,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (btrim(name) <> ''),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_image_path_valid check (
    btrim(image_path) <> ''
    and image_path !~ '(^|/)\.\.?(/|$)'
    and image_path !~ '^[a-z][a-z0-9+.-]*://'
  ),
  constraint categories_display_order_nonnegative check (display_order >= 0),
  constraint categories_slug_unique unique (slug)
);

create unique index categories_name_unique
  on public.categories (lower(name));

create index categories_public_catalog_idx
  on public.categories (display_order, name)
  where is_active = true and deleted_at is null;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id)
    on update restrict on delete restrict,
  name text not null,
  slug text not null,
  description text,
  price numeric(12, 2) not null,
  stock_quantity integer not null default 0,
  image_path text not null,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank check (btrim(name) <> ''),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_image_path_valid check (
    btrim(image_path) <> ''
    and image_path !~ '(^|/)\.\.?(/|$)'
    and image_path !~ '^[a-z][a-z0-9+.-]*://'
  ),
  constraint products_price_positive check (price > 0),
  constraint products_stock_nonnegative check (stock_quantity >= 0),
  constraint products_slug_unique unique (slug)
);

create index products_category_id_idx
  on public.products (category_id);

create index products_public_catalog_idx
  on public.products (category_id, is_featured desc, created_at desc)
  where is_active = true and deleted_at is null;

create index products_low_stock_idx
  on public.products (stock_quantity)
  where is_active = true and deleted_at is null;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  phone_normalized text not null,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_first_name_not_blank check (btrim(first_name) <> ''),
  constraint customers_last_name_not_blank check (btrim(last_name) <> ''),
  constraint customers_phone_not_blank check (btrim(phone) <> ''),
  constraint customers_phone_normalized_format check (
    phone_normalized ~ '^[1-9][0-9]{7,14}$'
  ),
  constraint customers_phone_normalized_unique unique (phone_normalized)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id)
    on update restrict on delete restrict,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_phone text not null,
  customer_phone_normalized text not null,
  order_number text not null,
  status public.order_status not null,
  subtotal numeric(12, 2) not null,
  discount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  picked_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_customer_first_name_not_blank check (btrim(customer_first_name) <> ''),
  constraint orders_customer_last_name_not_blank check (btrim(customer_last_name) <> ''),
  constraint orders_customer_phone_not_blank check (btrim(customer_phone) <> ''),
  constraint orders_customer_phone_normalized_format check (
    customer_phone_normalized ~ '^[1-9][0-9]{7,14}$'
  ),
  constraint orders_order_number_format check (
    order_number ~ '^MAD-[0-9]{8}-[0-9]{6,}$'
  ),
  constraint orders_amounts_nonnegative check (
    subtotal >= 0 and discount >= 0 and total >= 0
  ),
  constraint orders_discount_not_above_subtotal check (discount <= subtotal),
  constraint orders_total_consistent check (total = subtotal - discount),
  constraint orders_items_total_positive check (total > 0),
  constraint orders_picked_up_timestamp_consistent check (
    (status = 'picked_up' and picked_up_at is not null)
    or (status <> 'picked_up' and picked_up_at is null)
  ),
  constraint orders_order_number_unique unique (order_number)
);

create index orders_customer_id_idx
  on public.orders (customer_id);

create index orders_customer_phone_normalized_idx
  on public.orders (customer_phone_normalized);

create index orders_created_at_idx
  on public.orders (created_at desc);

create index orders_status_created_at_idx
  on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id)
    on update restrict on delete restrict,
  product_id uuid not null references public.products (id)
    on update restrict on delete restrict,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  subtotal numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_product_name_not_blank check (btrim(product_name) <> ''),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_unit_price_positive check (unit_price > 0),
  constraint order_items_subtotal_consistent check (
    subtotal = round(unit_price * quantity, 2)
  ),
  constraint order_items_order_product_unique unique (order_id, product_id)
);

create index order_items_product_id_idx
  on public.order_items (product_id);

create table public.guest_session_orders (
  id uuid primary key default gen_random_uuid(),
  guest_session_id uuid not null references public.guest_sessions (id)
    on update restrict on delete cascade,
  order_id uuid not null references public.orders (id)
    on update restrict on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_session_orders_session_order_unique unique (
    guest_session_id,
    order_id
  )
);

create index guest_session_orders_order_id_idx
  on public.guest_session_orders (order_id);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id)
    on update restrict on delete restrict,
  order_id uuid references public.orders (id)
    on update restrict on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity_delta integer not null,
  stock_before integer not null,
  stock_after integer not null,
  reason text,
  created_by uuid references public.profiles (id)
    on update restrict on delete restrict,
  created_at timestamptz not null default now(),
  constraint inventory_movements_delta_nonzero check (quantity_delta <> 0),
  constraint inventory_movements_stock_nonnegative check (
    stock_before >= 0 and stock_after >= 0
  ),
  constraint inventory_movements_stock_consistent check (
    stock_after = stock_before + quantity_delta
  ),
  constraint inventory_movements_order_reference_consistent check (
    (
      movement_type in ('order_created', 'order_cancelled')
      and order_id is not null
    )
    or (
      movement_type in ('initial_stock', 'manual_adjustment')
      and order_id is null
    )
  ),
  constraint inventory_movements_direction_consistent check (
    (movement_type = 'order_created' and quantity_delta < 0)
    or (movement_type in ('initial_stock', 'order_cancelled') and quantity_delta > 0)
    or (movement_type = 'manual_adjustment')
  ),
  constraint inventory_movements_manual_reason_required check (
    movement_type <> 'manual_adjustment'
    or nullif(btrim(reason), '') is not null
  )
);

create index inventory_movements_product_id_created_at_idx
  on public.inventory_movements (product_id, created_at desc);

create index inventory_movements_order_id_idx
  on public.inventory_movements (order_id)
  where order_id is not null;

create unique index inventory_movements_order_created_unique
  on public.inventory_movements (order_id, product_id)
  where movement_type = 'order_created';

create unique index inventory_movements_order_cancelled_unique
  on public.inventory_movements (order_id, product_id)
  where movement_type = 'order_cancelled';

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key boolean not null default true,
  business_name text not null,
  whatsapp text not null,
  address text not null,
  maps_url text not null,
  business_hours text not null,
  transfer_alias text not null,
  transfer_cbu text not null,
  bank_name text not null,
  transfer_discount numeric(5, 2) not null default 0,
  low_stock_threshold integer not null default 0,
  instagram text,
  facebook text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settings_singleton_key_true check (singleton_key = true),
  constraint settings_singleton unique (singleton_key),
  constraint settings_business_name_not_blank check (btrim(business_name) <> ''),
  constraint settings_whatsapp_format check (whatsapp ~ '^[1-9][0-9]{7,14}$'),
  constraint settings_address_not_blank check (btrim(address) <> ''),
  constraint settings_maps_url_https check (maps_url ~ '^https://'),
  constraint settings_business_hours_not_blank check (btrim(business_hours) <> ''),
  constraint settings_transfer_alias_not_blank check (btrim(transfer_alias) <> ''),
  constraint settings_transfer_cbu_format check (transfer_cbu ~ '^[0-9]{22}$'),
  constraint settings_bank_name_not_blank check (btrim(bank_name) <> ''),
  constraint settings_transfer_discount_range check (
    transfer_discount between 0 and 100
  ),
  constraint settings_low_stock_threshold_nonnegative check (
    low_stock_threshold >= 0
  ),
  constraint settings_instagram_https check (
    instagram is null or instagram ~ '^https://'
  ),
  constraint settings_facebook_https check (
    facebook is null or facebook ~ '^https://'
  )
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles (id)
    on update restrict on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_format check (
    action ~ '^[a-z][a-z0-9_]{1,63}$'
  ),
  constraint audit_logs_entity_type_format check (
    entity_type ~ '^[a-z][a-z0-9_]{1,63}$'
  ),
  constraint audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

create index audit_logs_actor_created_at_idx
  on public.audit_logs (actor_profile_id, created_at desc)
  where actor_profile_id is not null;

commit;
