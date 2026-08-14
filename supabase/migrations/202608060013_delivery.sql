begin;

create type public.delivery_method as enum (
  'pickup',
  'shipping'
);

alter table public.orders
  add column delivery_method public.delivery_method not null default 'pickup',
  add column shipping_address text,
  add constraint orders_delivery_method_shipping_address_check check (
    (
      delivery_method = 'pickup'
      and shipping_address is null
    )
    or (
      delivery_method = 'shipping'
      and char_length(btrim(shipping_address)) between 10 and 300
    )
  );

comment on column public.orders.delivery_method is
  'Forma de entrega elegida por el cliente: pickup (retiro en el local) o shipping (envío coordinado por el dueño).';

comment on column public.orders.shipping_address is
  'Dirección ingresada por el cliente cuando solicita envío. Debe ser NULL para retiro en el local.';

commit;
