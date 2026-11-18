#!/usr/bin/env bash
# Opt-in check: the same Mercado Pago approval delivered N times at once.
#  1. acknowledge_payment_webhook_v2 with one request id -> one inbox row, one job.
#  2. reconcile_payment_transaction_v1 with the same expected state -> one applied
#     transition, the rest stale; the order ends paid with stock held once.
set -u
source "$(dirname "$0")/lib.sh"

WORKERS="${WORKERS:-8}"
RUN="$(date +%s)${RANDOM}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
require_container

SETUP="$(psql_db -v run="$RUN" <<'SQL'
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
  values (gen_random_uuid(), 'Dup category ' || :'run', 'dup-category-' || :'run', 'test/test.webp', 'art')
  returning id
), p as (
  insert into public.products (id, category_id, name, slug, price, stock_quantity, image_path)
  select gen_random_uuid(), c.id, 'Dup product ' || :'run', 'dup-product-' || :'run', 100, 5, 'test/product.webp'
  from c returning id
), s as (
  insert into public.guest_sessions (id, token_hash, expires_at)
  values (gen_random_uuid(), decode(md5(random()::text) || md5(random()::text), 'hex'), now() + interval '1 day')
  returning id
)
select 'PRODUCT=' || p.id || E'\nSESSION=' || s.id from p, s;
SQL
)" || { echo "FAIL: fixture setup failed" >&2; exit 2; }
PRODUCT="$(echo "$SETUP" | sed -n 's/^PRODUCT=//p')"
SESSION="$(echo "$SETUP" | sed -n 's/^SESSION=//p')"
PHONE="$(printf '351%08d' $((RANDOM * 30)))"

# One on-time order for quantity 2 plus the pending provider transaction the
# first notification would have stored.
ORDER="$(psql_db -v sess="$SESSION" -v phone="$PHONE" -v prod="$PRODUCT" -v key="dup-$RUN" -v run="$RUN" <<'SQL'
set role service_role;
with o as (
  select order_id, attempt_id
  from public.create_order_with_payment_v2(
    :'sess'::uuid, 'Dup', 'Buyer', :'phone', :'phone',
    jsonb_build_array(jsonb_build_object('product_id', :'prod', 'quantity', 2)),
    :'key', repeat('c', 64), 'sandbox', 'pickup')
), t as (
  insert into public.payment_transactions (
    payment_attempt_id, environment, provider_payment_id, amount, currency,
    payment_type_id, status, provider_status, provider_version)
  select attempt_id, 'sandbox', 'dup-pay-' || :'run', 200, 'ARS', 'debit_card', 'pending', 'pending', 1
  from o returning id, payment_attempt_id
)
select o.order_id || '|' || o.attempt_id || '|' || t.id from o, t;
SQL
)" || { echo "FAIL: order setup failed" >&2; exit 2; }
IFS='|' read -r ORDER_ID ATTEMPT_ID TX_ID <<<"$ORDER"
STOCK_BEFORE="$(psql_db -v prod="$PRODUCT" <<<"select stock_quantity from public.products where id = :'prod'::uuid;")"

start_gate
for i in $(seq 1 "$WORKERS"); do
  # Same notification: identical request id and resource id on every delivery.
  run_worker "$WORKDIR/ack-$i.out" -v run="$RUN" <<'SQL' &
select 'ACK:' || public.acknowledge_payment_webhook_v2(
  'sandbox', 'dup-req-' || :'run', 'dup-pay-' || :'run', 'payment', decode(repeat('ab', 32), 'hex'));
SQL
  # Same approval applied from the same observed state (pending, version 1).
  run_worker "$WORKDIR/tx-$i.out" -v tx="$TX_ID" <<'SQL' &
select 'TX:' || transition_applied || ':' || aggregate_status
from public.reconcile_payment_transaction_v1(
  :'tx'::uuid, 'pending', 1, 'approved', 'approved', now(), 2, false, null);
SQL
done
wait

DUPLICATE_ACKS="$(grep -l '^ACK:true' "$WORKDIR"/ack-*.out 2>/dev/null | wc -l | tr -d ' ')"
FIRST_ACKS="$(grep -l '^ACK:false' "$WORKDIR"/ack-*.out 2>/dev/null | wc -l | tr -d ' ')"
APPLIED="$(grep -l '^TX:true' "$WORKDIR"/tx-*.out 2>/dev/null | wc -l | tr -d ' ')"
STALE="$(grep -l '^TX:false' "$WORKDIR"/tx-*.out 2>/dev/null | wc -l | tr -d ' ')"

RESULT="$(psql_db -v ord="$ORDER_ID" -v prod="$PRODUCT" -v run="$RUN" <<'SQL'
select
  (select count(*) from public.payment_inbox where resource_id = 'dup-pay-' || :'run') || '|' ||
  (select count(*) from public.payment_jobs j join public.payment_inbox i on i.id = j.inbox_id
     where i.resource_id = 'dup-pay-' || :'run') || '|' ||
  (select payment_status::text || '/' || status::text from public.orders where id = :'ord'::uuid) || '|' ||
  (select stock_quantity from public.products where id = :'prod'::uuid) || '|' ||
  (select count(*) from public.payment_transactions t
     join public.payment_attempts a on a.id = t.payment_attempt_id
     where a.order_id = :'ord'::uuid and t.status::text = 'approved');
SQL
)"
IFS='|' read -r INBOX JOBS ORDER_STATE STOCK_AFTER APPROVED <<<"$RESULT"

# A pending job left behind would be claimed by the lease suites instead of their own.
psql_db -v run="$RUN" <<'SQL' >/dev/null
delete from public.payment_jobs
where inbox_id in (select id from public.payment_inbox where resource_id = 'dup-pay-' || :'run');
delete from public.payment_inbox where resource_id = 'dup-pay-' || :'run';
SQL

echo "workers=$WORKERS first_acks=$FIRST_ACKS duplicate_acks=$DUPLICATE_ACKS inbox=$INBOX jobs=$JOBS"
echo "tx_applied=$APPLIED tx_stale=$STALE approved_tx=$APPROVED order=$ORDER_STATE stock=$STOCK_BEFORE->$STOCK_AFTER"

FAILED=0
[ "$FIRST_ACKS" -eq 1 ] || { echo "FAIL: exactly one delivery must be new, got $FIRST_ACKS"; FAILED=1; }
[ "$INBOX" -eq 1 ] || { echo "FAIL: expected one inbox row, got $INBOX"; FAILED=1; }
[ "$JOBS" -eq 1 ] || { echo "FAIL: expected one reconciliation job, got $JOBS"; FAILED=1; }
[ "$APPLIED" -eq 1 ] || { echo "FAIL: exactly one transition must apply, got $APPLIED"; FAILED=1; }
[ "$APPROVED" -eq 1 ] || { echo "FAIL: expected one approved transaction, got $APPROVED"; FAILED=1; }
[ "$ORDER_STATE" = "paid/pending" ] || { echo "FAIL: order must be paid/pending, got $ORDER_STATE"; FAILED=1; }
[ "$STOCK_AFTER" -eq "$STOCK_BEFORE" ] || { echo "FAIL: approval must not move stock again ($STOCK_BEFORE -> $STOCK_AFTER)"; FAILED=1; }
[ "$FAILED" -eq 0 ] && echo "PASS: duplicate deliveries produced one effect"
exit "$FAILED"
