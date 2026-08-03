begin;

alter table public.profiles enable row level security;
alter table public.guest_sessions enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.guest_session_orders enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke create on schema public from public;

grant usage on schema public to service_role;
revoke all on all tables in schema public from service_role;
revoke all on all sequences in schema public from service_role;
revoke all on all functions in schema public from service_role;

grant select, insert on public.profiles to service_role;
grant update (email, full_name, is_active) on public.profiles to service_role;

grant select, insert on public.guest_sessions to service_role;
grant update (
  token_hash,
  expires_at,
  revoked_at,
  last_accessed_at
) on public.guest_sessions to service_role;

grant select, insert on public.categories to service_role;
grant update (
  name,
  slug,
  image_path,
  description,
  display_order,
  is_active,
  deleted_at
) on public.categories to service_role;

grant select, insert on public.products to service_role;
grant update (
  category_id,
  name,
  slug,
  description,
  price,
  image_path,
  is_featured,
  is_active,
  deleted_at
) on public.products to service_role;

grant select on public.customers to service_role;
grant update (
  first_name,
  last_name,
  phone,
  phone_normalized,
  notes,
  deleted_at
) on public.customers to service_role;

grant select on public.orders to service_role;

grant select on public.order_items to service_role;
grant select on public.guest_session_orders to service_role;
grant select on public.inventory_movements to service_role;

grant select on public.settings to service_role;
grant update (
  business_name,
  whatsapp,
  address,
  maps_url,
  business_hours,
  transfer_alias,
  transfer_cbu,
  bank_name,
  transfer_discount,
  low_stock_threshold,
  instagram,
  facebook
) on public.settings to service_role;

grant select, insert on public.audit_logs to service_role;

grant execute on function public.create_order_with_stock(
  uuid,
  text,
  text,
  text,
  text,
  public.payment_method,
  jsonb,
  text
) to service_role;

grant execute on function public.cancel_order_with_stock(uuid, uuid, text)
  to service_role;

grant execute on function public.adjust_product_stock(uuid, integer, text, uuid)
  to service_role;

grant execute on function public.transition_order_status(
  uuid,
  public.order_status,
  public.payment_status,
  uuid
) to service_role;

grant execute on function public.link_guest_session_order(uuid, uuid)
  to service_role;

grant execute on function public.purge_guest_sessions(interval)
  to service_role;

alter default privileges in schema public
  revoke all on tables from public, anon, authenticated, service_role;

alter default privileges in schema public
  revoke all on sequences from public, anon, authenticated, service_role;

alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'products',
    'products',
    false,
    5242880,
    array['image/avif', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'categories',
    'categories',
    false,
    5242880,
    array['image/avif', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'gallery',
    'gallery',
    false,
    10485760,
    array['image/avif', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'settings',
    'settings',
    false,
    5242880,
    array['image/avif', 'image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
