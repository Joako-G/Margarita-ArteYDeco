import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(
  new URL('../migrations/202610080001_mp_expiry_and_aggregate_safety.sql', import.meta.url),
  'utf8',
)
const canonicalTriggerSource = migration
const repairMigration = await readFile(
  new URL('../migrations/202610080002_fix_payment_status_enum_cross_cast.sql', import.meta.url),
  'utf8',
)
const auditMigration = await readFile(
  new URL('../migrations/202610080003_payment_attempt_transition_audit.sql', import.meta.url),
  'utf8',
)
const truthfulAuditMigration = await readFile(
  new URL('../migrations/202610080004_truthful_payment_aggregate_audit.sql', import.meta.url),
  'utf8',
)
const allocationMigration = await readFile(
  new URL('../migrations/202610080005_mp_allocation_and_replay_safety.sql', import.meta.url), 'utf8',
)
const paidGuardMigration = await readFile(
  new URL('../migrations/202610080006_admin_mp_paid_fulfillment_guard.sql', import.meta.url), 'utf8',
)
const noStockLateApprovalMigration = await readFile(
  new URL('../migrations/202610080007_fix_late_approval_manual_guard.sql', import.meta.url), 'utf8',
)
const manualLateApprovalSource = await readFile(
  new URL('../migrations/20261007192258_fix_mp_late_approval_manual.sql', import.meta.url), 'utf8',
)

test('allocation safety replacement preserves parent locks, sorted products, grants and null versions', () => {
  for (const name of ['transition_payment_attempt_v2', 'reconcile_payment_attempt_aggregate_v2']) {
    const body = functionBodyFrom(allocationMigration, name)
    assertIncreasingPositions(body, [
      /select \* into v_order[\s\S]*?for update;/i,
      /select \* into v_attempt[\s\S]*?for update;/i,
      /public\.order_inventory_allocation_released\(v_order\.id\)/i,
      /order by oi\.product_id for update of p/i,
    ], name)
    assert.match(body, /elsif not v_(?:was_released|released) and v_order\.status = 'pending' and v_order\.payment_status <> 'paid'/)
    assert.match(body, /v_order\.status = 'cancelled' and v_order\.payment_status <> 'paid'/)
    assert.match(body, /payment_provider_updated/)
  }
  assert.match(allocationMigration, /v_attempt\.provider_version is distinct from p_expected_provider_version/)
  assert.match(allocationMigration, /revoke execute on function public\.transition_payment_attempt_v2/)
  assert.match(allocationMigration, /grant execute on function public\.reconcile_payment_attempt_aggregate_v2\(uuid\) to service_role/)
  assert.doesNotMatch(allocationMigration, /pg_get_functiondef|disable trigger|session_replication_role/i)
})

test('cancellation uses current ledger allocation rather than an old release marker', () => {
  const body = functionBodyFrom(allocationMigration, 'cancel_order_with_stock')
  assertIncreasingPositions(body, [
    /select \* into v_order[\s\S]*?for update;/i,
    /order by oi\.product_id for update of p/i,
    /select -coalesce\(sum\(quantity_delta\)/i,
    /if v_allocated > 0 then/i,
    /insert into public\.inventory_movements/i,
    /update public\.orders set status = 'cancelled'/i,
  ], 'Cancellation')
  assert.match(functionBodyFrom(allocationMigration, 'ensure_cancelled_order_stock_restored'), /sum\(im\.quantity_delta\)[\s\S]*?<> 0/)
  assert.match(allocationMigration, /drop index public\.inventory_movements_order_cancelled_unique/)
  assert.match(allocationMigration, /having sum\(quantity_delta\) >= 0 and bool_or\(quantity_delta > 0\)/)
})

test('fulfillment requires allocation and terminal exceptions cannot reopen delivered orders', () => {
  const body = functionBodyFrom(allocationMigration, 'validate_order_change')
  assert.match(body, /v_is_late_approval boolean := old\.status in \('pending', 'cancelled'\)/)
  assert.match(body, /Fulfillment requires an active inventory allocation/)
  assert.match(body, /coalesce\(current_setting\('margarita\.payment_late_approval', true\), '0'\)/)
})

test('admin UI renders only backend-projected actions and keeps cancellation independent', async () => {
  const ui = await readFile(new URL('../../frontend/src/pages/Admin/Orders/Detail/index.tsx', import.meta.url), 'utf8')
  const service = await readFile(new URL('../../backend/src/services/admin-orders.service.ts', import.meta.url), 'utf8')
  assert.match(ui, /order\.availableActions\.map\(\(action\)/)
  assert.match(ui, /order\.canCancel \?/)
  assert.match(service, /order\.paymentMethod === 'mercado_pago'[\s\S]*?order\.inventoryAllocationActive === false \|\| order\.persistedPaymentStatus !== 'paid'/)
})

test('forward-only MP payment guard preserves the exact preceding trigger contract', async () => {
  const replacement = functionBodyFrom(noStockLateApprovalMigration, 'validate_order_change')
  assert.match(noStockLateApprovalMigration, /returns trigger language plpgsql set search_path = ''/)
  assert.match(replacement, /v_is_late_approval_manual boolean := old\.status = 'pending'[\s\S]*?new\.status = 'pending'[\s\S]*?new\.payment_status = 'paid'[\s\S]*?old\.reservation_expires_at <= statement_timestamp\(\)[\s\S]*?public\.order_inventory_allocation_released\(old\.id\)/)
  assert.match(replacement, /not v_is_late_approval_manual then[\s\S]*?Mercado Pago payment requires provider reconciliation/)
  assert.doesNotMatch(replacement, /or v_is_late_approval_review or v_is_late_approval_manual/)

  const fixture = await readFile(new URL('./admin_mp_paid_fulfillment_guard.sql', import.meta.url), 'utf8')
  assert.match(fixture, /^begin;[\s\S]*rollback;\s*$/)
  assert.match(fixture, /public\.transition_order_status\(v_mp_order, 'confirmed', 'pending'/)
  assert.match(fixture, /public\.transition_order_status\(v_mp_order, 'confirmed', 'paid'/)
  assert.match(fixture, /public\.transition_order_status\(v_mp_order, 'pending', 'paid'/)
  assert.match(fixture, /select public\.reconcile_payment_attempt_aggregate_v2\(v_mp_attempt\) into v_result;/)
  assert.match(fixture, /select public\.reconcile_payment_attempt_aggregate_v2\(v_late_attempt\) into v_result;/)
  assert.doesNotMatch(fixture, /if public\.reconcile_payment_attempt_aggregate_v2\(/)
})

test('no-stock late approval records paid while preserving pending fulfillment state', async () => {
  for (const source of [canonicalTriggerSource, paidGuardMigration, noStockLateApprovalMigration, manualLateApprovalSource]) {
    const body = functionBodyFrom(source, 'validate_order_change')
    assert.match(body, /v_is_late_approval_manual boolean := old\.status = 'pending'[\s\S]*?new\.status = 'pending'[\s\S]*?new\.payment_status = 'paid'[\s\S]*?old\.reservation_expires_at <= statement_timestamp\(\)/)
    assert.match(body, /(?:public\.order_inventory_allocation_released\(old\.id\)|im\.movement_type = 'payment_reservation_released')/)
    assert.match(body, /(?:current_setting\('margarita\.payment_late_approval_review', true\)|coalesce\(current_setting\('margarita\.payment_late_approval_review', true\), '0'\)) = '1'/)
    assert.match(body, /not v_is_late_approval_manual then[\s\S]*?Mercado Pago payment requires provider reconciliation/)
    assert.doesNotMatch(body, /or v_is_late_approval_review or v_is_late_approval_manual/)
    const allocationGuard = body.match(/if new\.payment_method = 'mercado_pago'\s+and new\.status in \('confirmed', 'preparing', 'ready', 'picked_up', 'delivered'\)[\s\S]*?Fulfillment requires an active inventory allocation';\s*end if;/)
    if (allocationGuard) assert.doesNotMatch(allocationGuard[0], /v_is_late_approval_manual/)
  }

  assert.match(allocationMigration, /set_config\('margarita\.payment_late_approval_review', '1', true\)[\s\S]*?update public\.orders set status = 'pending', payment_status = 'paid'[\s\S]*?set_config\('margarita\.payment_late_approval_review', '0', true\)/)

  const expiryFixture = await readFile(new URL('./checkout_pro_expiry_safety.sql', import.meta.url), 'utf8')
  const noStockScenario = expiryFixture.slice(expiryFixture.indexOf("v_late_no_stock_attempt"))
  assert.match(noStockScenario, /v_order_status is distinct from 'pending'[\s\S]*?v_order_payment_status is distinct from 'paid'[\s\S]*?v_attempt_status is distinct from 'manual_review'/)
  assert.match(noStockScenario, /No stock means no confirmation/)
})

test('expiry guard probes update orders as postgres with validators active and restore service_role for RPCs', async () => {
  const fixture = await readFile(new URL('./checkout_pro_expiry_safety.sql', import.meta.url), 'utf8')
  const probes = fixture.slice(fixture.indexOf('-- No stock means no confirmation'))
  assert.ok(probes.length > 0)
  assert.doesNotMatch(probes, /session_replication_role|disable trigger|insufficient_privilege/i)
  assert.equal([...probes.matchAll(/exception when check_violation then null;/g)].length, 3)
  let role = 'service_role'
  let directUpdates = 0
  let rpcCalls = 0
  const operations = /set local role (postgres|service_role);|update public\.orders|public\.(?:cancel_order_with_stock|transition_payment_attempt_v2|reconcile_payment_attempt_aggregate_v2)\(/g
  for (const operation of probes.matchAll(operations)) {
    if (operation[1] !== undefined) role = operation[1]
    else if (operation[0] === 'update public.orders') {
      assert.equal(role, 'postgres', 'Direct order mutations must reach the validator, not fail on privileges')
      directUpdates += 1
    } else {
      assert.equal(role, 'service_role', 'RPC regressions must exercise the authorized application role')
      rpcCalls += 1
    }
  }
  assert.equal(directUpdates, 5)
  assert.ok(rpcCalls >= 8)
  assert.equal(role, 'service_role')
})

function functionBodyFrom(source, name) {
  const declaration = new RegExp(
    `create or replace function public\\.${name}\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`,
    'i',
  )
  const match = source.match(declaration)
  assert.ok(match, `Expected ${name} definition in the forward migration`)
  return match[1]
}

function functionBody(name) {
  return functionBodyFrom(migration, name)
}

function assertIncreasingPositions(body, patterns, label) {
  const positions = patterns.map((pattern) => body.search(pattern))
  assert.ok(positions.every((position) => position >= 0), `${label}: expected every lock/state marker`)
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `${label}: lock/state markers are out of order`)
}

test('transaction reconciliation follows the static order-attempt-transaction lock contract', () => {
  const body = functionBody('reconcile_payment_transaction_v1')
  assertIncreasingPositions(body, [
    /select pt\.payment_attempt_id[\s\S]*?where pt\.id = p_transaction_id;/i,
    /select pa\.order_id[\s\S]*?where pa\.id = v_attempt_id;/i,
    /select o\.status[\s\S]*?where o\.id = v_order_id for update;/i,
    /select pa\.order_id into v_attempt_order_id[\s\S]*?where pa\.id = v_attempt_id for update;/i,
    /select \* into v_transaction[\s\S]*?where pt\.id = p_transaction_id for update;/i,
    /v_transaction\.status = p_expected_status/i,
    /update public\.payment_transactions/i,
    /public\.reconcile_payment_attempt_aggregate_v2\(v_attempt_id\)/i,
  ], 'Transaction reconciliation')
})

test('aggregate and direct attempt reconciliation lock parents before deterministic product locks', () => {
  const aggregate = functionBody('reconcile_payment_attempt_aggregate_v2')
  assertIncreasingPositions(aggregate, [
    /select \* into v_order[\s\S]*?where id = v_order_id for update;/i,
    /select \* into v_attempt[\s\S]*?where id = p_attempt_id for update;/i,
    /v_attempt\.order_id is distinct from v_order\.id/i,
    /from public\.payment_transactions pt where pt\.payment_attempt_id = v_attempt\.id;/i,
    /order by oi\.product_id for update of p/i,
  ], 'Aggregate reconciliation')

  const direct = functionBody('transition_payment_attempt_v2')
  assertIncreasingPositions(direct, [
    /select pa\.order_id[\s\S]*?where pa\.id = p_attempt_id;/i,
    /select \* into v_order[\s\S]*?where id = v_order_id for update;/i,
    /select \* into v_attempt[\s\S]*?where id = p_attempt_id for update;/i,
    /v_attempt\.order_id is distinct from v_order\.id/i,
    /order by oi\.product_id for update of p/i,
  ], 'Direct attempt reconciliation')
})

test('reservation release follows order, attempt, then product lock order', () => {
  const body = functionBody('release_payment_reservation_v2')
  assertIncreasingPositions(body, [
    /select \* into v_order[\s\S]*?where id = p_order_id for update;/i,
    /select \* from public\.payment_attempts where order_id = p_order_id for update loop/i,
    /order by oi\.product_id for update of p/i,
  ], 'Reservation release')
})

test('scoped expiry helper validates one order and delegates through canonical locks', () => {
  const body = functionBody('release_expired_payment_reservation_for_order_v2')
  assertIncreasingPositions(body, [
    /select \* into v_order[\s\S]*?where id = p_order_id for update;/i,
    /select 1 from public\.payment_attempts[\s\S]*?where order_id = p_order_id/i,
    /public\.release_payment_reservation_v2\(p_order_id/i,
  ], 'Scoped expiry helper')
})

test('expiry worker holds the order lock before delegating reservation release', () => {
  const body = functionBody('release_expired_payment_reservations_v2')
  assertIncreasingPositions(body, [
    /where o\.payment_method = 'mercado_pago'/i,
    /o\.reservation_expires_at <= statement_timestamp\(\)/i,
    /o\.status <> 'cancelled'/i,
    /o\.payment_status <> 'paid'/i,
    /movement_type in \('order_cancelled', 'payment_reservation_released'\)/i,
    /order by o\.reservation_expires_at, o\.created_at, o\.id/i,
    /for update skip locked limit p_limit/i,
    /public\.release_expired_payment_reservation_for_order_v2\(v_order_id/i,
  ], 'Expiry worker')
})

test('attempt status conversions use text between distinct PostgreSQL enums', () => {
  for (const [label, source] of [['chain source', migration], ['forward repair', repairMigration]]) {
    assert.match(source, /p_next_status::text::public\.payment_status/i, `${label}: direct pending/rejected summary`)
    assert.match(source, /v_aggregate::text::public\.payment_status/i, `${label}: aggregate pending/rejected summary`)
    assert.doesNotMatch(source, /(?:p_next_status|v_aggregate)::public\.payment_status/i, `${label}: unsafe enum cross-cast`)
  }
})

test('direct and aggregate transitions audit the applied status and provider evidence transactionally', () => {
  for (const [label, source] of [['canonical', migration], ['repair', repairMigration], ['forward audit repair', auditMigration]]) {
    const direct = functionBodyFrom(source, 'transition_payment_attempt_v2')
    assert.match(direct, /v_applied_status := p_next_status/i, `${label}: captures actual direct-transition status`)
    assert.match(direct, /case when v_attempt\.status is distinct from v_applied_status\s+then 'payment_status_changed'\s+else 'payment_provider_updated'/i, `${label}: classifies only real status changes as transitions`)
    const appliedUpdate = direct.indexOf('update public.payment_attempts set provider_status')
    const normalAudit = direct.indexOf('insert into public.audit_logs', appliedUpdate)
    const orderProjection = direct.indexOf("if p_next_status = 'approved'", normalAudit)
    assert.ok(appliedUpdate >= 0 && normalAudit > appliedUpdate && orderProjection > normalAudit, `${label}: normal audit follows the state update before order projection`)
    assert.match(direct.slice(normalAudit), /'previous_status'[\s\S]*?'next_status'[\s\S]*?'provider_status'[\s\S]*?'provider_version'[\s\S]*?'provider_updated_at'/i, `${label}: direct audit includes actual status and provider evidence`)
    assert.match(direct, /v_applied_status[\s\S]*?manual_review/i, `${label}: applied manual-review status is represented`)
    assert.match(source, /revoke execute on function public\.transition_payment_attempt_v2/i, `${label}: direct RPC grants remain narrow`)
    assert.match(source, /set search_path = ''/i, `${label}: SECURITY DEFINER search path remains pinned`)
  }
  assert.match(auditMigration, /insert into public\.audit_logs[\s\S]*?Transaction aggregate changed payment attempt status/i)
})

test('direct approved retry narrowly guards only its active-reservation payment projection', async () => {
  for (const [label, source] of [['canonical', migration], ['080002', repairMigration], ['080003', auditMigration]]) {
    const direct = functionBodyFrom(source, 'transition_payment_attempt_v2')
    assert.match(direct, /if p_next_status = 'approved' and not v_was_released then[\s\S]*?set_config\('margarita\.payment_aggregate_transition', '1', true\)[\s\S]*?update public\.orders set payment_status = 'paid'[\s\S]*?set_config\('margarita\.payment_aggregate_transition', '0', true\)/i, `${label}: direct approved retry brackets only its paid projection`)
  }
  const fixture = await readFile(new URL('./checkout_pro_foundation.sql', import.meta.url), 'utf8')
  assert.match(fixture, /transition_payment_attempt_v2\([\s\S]*?'rejected'[\s\S]*?An unrelated order update used the aggregate transition guard[\s\S]*?transition_payment_attempt_v2\([\s\S]*?'approved'[\s\S]*?'rejected'[\s\S]*?'approved'[\s\S]*?payment_status from public\.orders[\s\S]*?<> 'paid'[\s\S]*?stock_quantity[\s\S]*?payment_status_changed/i)
})

test('aggregate audit reads persisted status and reports review without fabricating a transition', () => {
  for (const [label, source] of [['chain', migration], ['080002', repairMigration], ['080003', auditMigration]]) {
    assert.match(source, /select status into v_applied_status from public\.payment_attempts where id = v_attempt\.id/i, `${label}: reads actual persisted status`)
    assert.match(source, /elsif v_aggregate = 'manual_review'[\s\S]*?payment_provider_updated[\s\S]*?aggregate_status/i, `${label}: review-only event preserves current attempt status`)
  }
  assert.match(truthfulAuditMigration, /create or replace function public\.reconcile_payment_attempt_aggregate_v2\(p_attempt_id uuid\)/i)
  assert.doesNotMatch(truthfulAuditMigration, /pg_get_functiondef|execute v_definition/i)
  assert.match(truthfulAuditMigration, /select status into v_applied_status[\s\S]*?payment_attempts where id = v_attempt\.id/i)
  assert.match(truthfulAuditMigration, /approved payment-attempt status was preserved/i)
  assert.match(truthfulAuditMigration, /revoke execute on function public\.reconcile_payment_attempt_aggregate_v2/i)
  assert.match(truthfulAuditMigration, /set search_path = ''/i)
  assert.match(truthfulAuditMigration, /order by oi\.product_id for update of p/i)
  assert.match(truthfulAuditMigration, /v_aggregate::text::public\.payment_status/i)
})

test('insufficient-stock late approval audits same-status manual review as a provider update', () => {
  const sources = [
    ['chain', migration],
    ['080002', repairMigration],
    ['080003', auditMigration],
    ['080004', truthfulAuditMigration],
  ]

  for (const [label, source] of sources) {
    const direct = source.includes('transition_payment_attempt_v2')
      ? functionBodyFrom(source, 'transition_payment_attempt_v2')
      : null
    const aggregate = functionBodyFrom(source, 'reconcile_payment_attempt_aggregate_v2')

    if (direct) {
      const branch = direct.match(/if not v_can_re_reserve then[\s\S]*?transition_applied := true; return next; return;/i)?.[0]
      assert.ok(branch, `${label}: direct insufficient-stock branch exists`)
      assert.match(branch, /case when v_attempt\.status is distinct from 'manual_review'::public\.payment_attempt_status[\s\S]*?payment_status_changed[\s\S]*?payment_provider_updated/i, `${label}: direct same-status review is not a status transition`)
    }
    if (aggregate) {
      const branch = aggregate.match(/if not v_can_re_reserve then[\s\S]*?return 'manual_review';/i)?.[0]
      assert.ok(branch, `${label}: aggregate insufficient-stock branch exists`)
      assert.match(branch, /case when v_previous_status is distinct from 'manual_review'::public\.payment_attempt_status[\s\S]*?payment_status_changed[\s\S]*?payment_provider_updated/i, `${label}: aggregate same-status review is not a status transition`)
      assert.match(branch, /'previous_status', v_previous_status::text[\s\S]*?'next_status', 'manual_review'[\s\S]*?'provider_status', coalesce\(v_transaction\.provider_status, 'approved'\)[\s\S]*?'provider_version',[\s\S]*?'provider_updated_at'/i, `${label}: aggregate provider evidence and truthful statuses are retained`)
    }
  }
})
