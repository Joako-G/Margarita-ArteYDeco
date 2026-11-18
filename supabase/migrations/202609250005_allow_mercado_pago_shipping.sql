begin;

alter table public.orders
  drop constraint if exists orders_shipping_requires_transfer;

commit;
