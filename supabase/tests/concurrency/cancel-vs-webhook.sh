#!/usr/bin/env bash
# Opt-in check: an administrator cancels an order while the provider approval for
# the same order arrives. ROUNDS orders race at once; each order gets one cancel
# and one approval released together. Whatever order they land in:
#   - a manually cancelled order stays cancelled, holds no stock (net movement 0)
#     and is never re-reserved, while its payment is still recorded as paid,
#   - an order whose cancel lost the race (stale updated_at) is not cancelled and
#     holds its 2 units (net movement -2),
#   - stock is returned at most once.
set -u
source "$(dirname "$0")/lib.sh"

ROUNDS="${ROUNDS:-10}"
QUANTITY=2
INITIAL_STOCK=50
GATE_SECONDS="${GATE_SECONDS:-10}"
RUN="$(date +%s)${RANDOM}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
require_container

SETUP="$(psql_db -v run="$RUN" -v n="$ROUNDS" -v qty="$QUANTITY" -v stock="$INITIAL_STOCK" <<'SQL'
insert into public.settings (
  business_name, whatsapp, address, maps_url, business_hours,
  transfer_alias, transfer_cbu, bank_name
) values (
  'Concurrency Test', '5493515550000', 'Test address',
  'https://maps.google.com/test', 'Mon-Fri', 'test.alias',
  '1234567890123456789012', 'Test bank'
) on conflict (singleton_key) do nothing;

-- Only one administrator may exist, so create one only when none is active.
with u as (
  insert into auth.users (id, email)
  select gen_random_uuid(), 'race-' || :'run' || '@example.test'
  where not exists (select 1 from public.profiles where role = 'administrator' and is_active)
  returning id, email
)
insert into public.profiles (id, email, full_name)
select id, email, 'Race Administrator' from u;

with c as (
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (gen_random_uuid(), 'Race category ' || :'run', 'race-category-' || :'run', 'test/test.webp', 'art')
  returning id
), p as (
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  select gen_random_uuid(), c.id, 'Race product ' || :'run', 'race-product-' || :'run', 100, :stock, 'test/product.webp'
  from c returning id
)
select 'PRODUCT=' || id from p
union all
select 'ACTOR=' || id from (
  select id from public.profiles where role = 'administrator' and is_active limit 1
) a;

set role service_role;
with s as (
  insert into public.guest_sessions (id, token_hash, expires_at)
  select gen_random_uuid(), decode(md5(random()::text || g) || md5(random()::text || g), 'hex'), now() + interval '1 day'
  from generate_series(1, :n) g
  returning id
), o as (
  select row_number() over () rn, id sess from s
), created as (
  select o.rn, f.order_id, f.attempt_id,
         '351' || lpad((floor(random() * 100000000))::bigint::text, 8, '0') phone
  from o,
  lateral public.create_order_with_payment_v2(
    o.sess, 'Race', 'Buyer',
    '351' || lpad(o.rn::text, 8, '0'), '351' || lpad(o.rn::text, 8, '0'),
    jsonb_build_array(jsonb_build_object(
      'product_id', (select id from public.products where slug = 'race-product-' || :'run'),
      'quantity', :qty)),
    'race-' || :'run' || '-' || o.rn, repeat('d', 64), 'sandbox', 'pickup') f
), t as (
  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version)
  select attempt_id, 'sandbox', 'race-pay-' || :'run' || '-' || rn, 200, 'ARS', 'debit_card', 'pending', 'pending', 1
  from created returning id, payment_attempt_id
)
select 'ORDER=' || created.order_id || '|' || t.id
from created join t on t.payment_attempt_id = created.attempt_id;
SQL
)" || { echo "FAIL: fixture setup failed" >&2; exit 2; }

ACTOR="$(echo "$SETUP" | sed -n 's/^ACTOR=//p')"
mapfile -t ORDERS < <(echo "$SETUP" | sed -n 's/^ORDER=//p')
[ "${#ORDERS[@]}" -eq "$ROUNDS" ] || { echo "FAIL: expected $ROUNDS orders, got ${#ORDERS[@]}" >&2; exit 2; }

# The administrator looked at the order before the race, so the cancel carries
# the updated_at it saw (optimistic lock); an approval that lands first makes it stale.
declare -a ORDER_IDS TX_IDS SEEN_AT
for i in "${!ORDERS[@]}"; do
  IFS='|' read -r ORDER_IDS[$i] TX_IDS[$i] <<<"${ORDERS[$i]}"
  SEEN_AT[$i]="$(psql_db -v ord="${ORDER_IDS[$i]}" <<<"select updated_at from public.orders where id = :'ord'::uuid;")"
done

start_gate
for i in "${!ORDER_IDS[@]}"; do
  run_worker "$WORKDIR/cancel-$i.out" -v ord="${ORDER_IDS[$i]}" -v actor="$ACTOR" -v seen="${SEEN_AT[$i]}" <<'SQL' &
select 'CANCEL:' || public.cancel_order_with_stock(
  :'ord'::uuid, :'actor'::uuid, 'Race cancellation', :'seen'::timestamptz, true);
SQL
  run_worker "$WORKDIR/approve-$i.out" -v tx="${TX_IDS[$i]}" <<'SQL' &
select 'APPROVE:' || transition_applied
from public.reconcile_payment_transaction_v1(
  :'tx'::uuid, 'pending', 1, 'approved', 'approved', now(), 2, false, null);
SQL
done
wait

CANCEL_OK="$(grep -l '^CANCEL:true' "$WORKDIR"/cancel-*.out 2>/dev/null | wc -l | tr -d ' ')"
APPROVE_OK="$(grep -l '^APPROVE:true' "$WORKDIR"/approve-*.out 2>/dev/null | wc -l | tr -d ' ')"
ORDER_LIST="$(IFS=,; echo "${ORDER_IDS[*]}")"

echo "rounds=$ROUNDS cancel_applied=$CANCEL_OK approval_applied=$APPROVE_OK"
echo "outcomes (order/payment, net stock per order, cancels, re-reserves):"
psql_db -v orders="$ORDER_LIST" <<'SQL'
with m as (
  select o.id, o.status::text st, o.payment_status::text ps,
         coalesce(sum(im.quantity_delta), 0) net,
         count(*) filter (where im.movement_type::text = 'order_cancelled') cancels,
         count(*) filter (where im.movement_type::text = 'payment_re_reserved') rereserves
  from public.orders o
  left join public.inventory_movements im on im.order_id = o.id
  where o.id = any(string_to_array(:'orders', ',')::uuid[])
  group by o.id
)
select '  ' || st || '/' || ps || ' net=' || net || ' cancels=' || cancels || ' rereserves=' || rereserves || '  x' || count(*)
from m group by st, ps, net, cancels, rereserves order by 1;
SQL

VIOLATIONS="$(psql_db -v orders="$ORDER_LIST" -v qty="$QUANTITY" <<'SQL'
with m as (
  select o.status::text st, o.payment_status::text ps,
         coalesce(sum(im.quantity_delta), 0) net,
         count(*) filter (where im.movement_type::text = 'order_cancelled') cancels,
         count(*) filter (where im.movement_type::text = 'payment_re_reserved') rereserves
  from public.orders o
  left join public.inventory_movements im on im.order_id = o.id
  where o.id = any(string_to_array(:'orders', ',')::uuid[])
  group by o.id, o.status, o.payment_status
)
select count(*) from m
where (st = 'cancelled' and net <> 0)
   or (st <> 'cancelled' and net <> -:qty)
   or cancels > 1
   -- A manual cancellation is final: no re-reservation and no reopening.
   or rereserves > 0
   or (cancels = 1 and st <> 'cancelled')
   -- The approval is still recorded, so the owner can see the refund is due.
   or ps <> 'paid';
SQL
)"
LEDGER="$(psql_db -v orders="$ORDER_LIST" -v stock="$INITIAL_STOCK" -v run="$RUN" <<'SQL'
select (select stock_quantity from public.products where slug = 'race-product-' || :'run')
     - (:stock + coalesce((select sum(quantity_delta) from public.inventory_movements
                           where order_id = any(string_to_array(:'orders', ',')::uuid[])), 0));
SQL
)"

FAILED=0
[ "$VIOLATIONS" -eq 0 ] || { echo "FAIL: $VIOLATIONS order(s) with an inconsistent inventory ledger"; FAILED=1; }
[ "$LEDGER" -eq 0 ] || { echo "FAIL: product stock differs from its movement ledger by $LEDGER"; FAILED=1; }
[ "$FAILED" -eq 0 ] && echo "PASS: every cancel/approval race left a consistent inventory ledger"
exit "$FAILED"
