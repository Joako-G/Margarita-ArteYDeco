begin;

grant update (stock_quantity) on table public.products to service_role;
grant insert on table public.inventory_movements to service_role;

commit;
