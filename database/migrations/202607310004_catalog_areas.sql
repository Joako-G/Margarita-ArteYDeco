begin;

alter table public.categories
  add column catalog_area text;

update public.categories
set catalog_area = case
  when slug = 'deco' then 'decoration'
  else 'art'
end;

update public.categories
set
  name = 'Decoración para el hogar',
  slug = 'decoracion-para-el-hogar',
  description = 'Piezas terminadas para sumar calidez y personalidad a distintos espacios.',
  display_order = 0
where slug = 'deco';

alter table public.categories
  alter column catalog_area set not null,
  add constraint categories_catalog_area_valid
    check (catalog_area in ('art', 'decoration'));

drop index public.categories_public_catalog_idx;

create index categories_public_catalog_idx
  on public.categories (catalog_area, display_order, name)
  where is_active = true and deleted_at is null;

create or replace function public.prevent_category_area_change_with_products()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.catalog_area is distinct from new.catalog_area
    and exists (
      select 1
      from public.products
      where category_id = old.id
    )
  then
    raise exception 'Cannot change the catalog area of a category with associated products.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger categories_prevent_area_change_with_products
before update of catalog_area on public.categories
for each row
execute function public.prevent_category_area_change_with_products();

grant update (catalog_area) on public.categories to service_role;

revoke all on function public.prevent_category_area_change_with_products() from public;
revoke all on function public.prevent_category_area_change_with_products() from anon;
revoke all on function public.prevent_category_area_change_with_products() from authenticated;

commit;
