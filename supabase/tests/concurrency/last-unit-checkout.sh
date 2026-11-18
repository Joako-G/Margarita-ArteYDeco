#!/usr/bin/env bash
# Opt-in check: N buyers race for the last unit of one product through
# create_order_with_payment_v2, each on its own database connection.
# Runs only against the LOCAL Supabase container; it leaves fixtures behind,
# so use a disposable database (supabase db reset --local cleans it).
set -u
source "$(dirname "$0")/lib.sh"

WORKERS="${WORKERS:-8}"
RUN="$(date +%s)${RANDOM}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
require_container

# --- fixtures: one product with stock 1 and one guest session per buyer
SETUP="$(psql_db -v run="$RUN" -v n="$WORKERS" <<'SQL'
insert into public.settings (
  business_name, whatsapp, address, maps_url, business_hours,
  transfer_alias, transfer_cbu, bank_name
) values (
  'Concurrency Test', '5493515550000', 'Test address',
  'https://maps.google.com/test', 'Mon-Fri', 'test.alias',
  '1234567890123456789012', 'Test bank'
) on conflict (singleton_key) do nothing;

with c as (
  insert into public.categories (id, name, slug, image_path, catalog_area)
  values (gen_random_uuid(), 'Conc category ' || :'run', 'conc-category-' || :'run', 'test/test.webp', 'art')
  returning id
), p as (
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  select gen_random_uuid(), c.id, 'Conc product ' || :'run', 'conc-product-' || :'run', 100, 1, 'test/product.webp'
  from c returning id
)
select 'PRODUCT=' || id from p;

with s as (
  insert into public.guest_sessions (id, token_hash, expires_at)
  select gen_random_uuid(),
         decode(md5(random()::text || g) || md5(random()::text || g), 'hex'),
         now() + interval '1 day'
  from generate_series(1, :n) g
  returning id
)
select 'SESSION=' || id from s;
SQL
)" || { echo "FAIL: fixture setup failed" >&2; exit 2; }

PRODUCT="$(echo "$SETUP" | sed -n 's/^PRODUCT=//p')"
mapfile -t SESSIONS < <(echo "$SETUP" | sed -n 's/^SESSION=//p')

start_gate

PHONES=()
for i in "${!SESSIONS[@]}"; do
  PHONE="$(printf '351%06d%02d' $((RANDOM * 30 % 1000000)) "$i")"
  PHONES+=("$PHONE")
  run_worker "$WORKDIR/worker-$i.out" -v sess="${SESSIONS[$i]}" -v phone="$PHONE" -v prod="$PRODUCT" -v key="conc-$RUN-$i" <<'SQL' &
select 'OK:' || order_id
from public.create_order_with_payment_v2(
  :'sess'::uuid, 'Conc', 'Buyer', :'phone', :'phone',
  jsonb_build_array(jsonb_build_object('product_id', :'prod', 'quantity', 1)),
  :'key', repeat('a', 64), 'sandbox', 'pickup'
);
SQL
done
wait

PHONE_LIST="$(IFS=,; echo "${PHONES[*]}")"
SUCCESS="$(grep -l '^OK:' "$WORKDIR"/worker-*.out 2>/dev/null | wc -l | tr -d ' ')"
REJECTED=$((WORKERS - SUCCESS))

RESULT="$(psql_db -v prod="$PRODUCT" -v phones="$PHONE_LIST" <<'SQL'
select
  (select stock_quantity from public.products where id = :'prod'::uuid) || '|' ||
  (select count(*) from public.orders
    where customer_phone_normalized = any(string_to_array(:'phones', ','))) || '|' ||
  (select count(*) from public.payment_attempts a
    join public.orders o on o.id = a.order_id
    where o.customer_phone_normalized = any(string_to_array(:'phones', ',')));
SQL
)"
IFS='|' read -r STOCK ORDERS ATTEMPTS <<<"$RESULT"

echo "buyers=$WORKERS success=$SUCCESS rejected=$REJECTED stock=$STOCK orders=$ORDERS attempts=$ATTEMPTS"
echo "sample rejection: $(grep -hv '^OK:' "$WORKDIR"/worker-*.out | grep -m1 -iE 'error|stock|exception' | cut -c1-160)"

FAILED=0
[ "$SUCCESS" -eq 1 ] || { echo "FAIL: expected exactly 1 successful checkout"; FAILED=1; }
[ "$STOCK" -eq 0 ] || { echo "FAIL: stock must end at 0, got $STOCK"; FAILED=1; }
[ "$ORDERS" -eq 1 ] || { echo "FAIL: expected exactly 1 order, got $ORDERS"; FAILED=1; }
[ "$ATTEMPTS" -eq 1 ] || { echo "FAIL: expected exactly 1 payment attempt, got $ATTEMPTS"; FAILED=1; }
[ "$FAILED" -eq 0 ] && echo "PASS: last-unit race produced one order and no negative stock"
exit "$FAILED"
