begin;

alter table public.products
  alter column image_path drop not null;

commit;
