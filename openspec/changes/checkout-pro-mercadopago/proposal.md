# Proposal: Mercado Pago Checkout Pro

## Intent

Introduce a disabled-by-default hosted Mercado Pago flow using Orders API, preserving backend authority over totals, orders, sessions, and inventory. Payment state remains asynchronous, auditable, provider-neutral, and recoverable.

## Scope

### In Scope
- Payment port and Orders API adapter for balance and debit card only.
- Redirect UX, verified Webhook inbox, reconciliation, payment attempts, layered idempotency, outbox/jobs, and retries.
- Atomic 40-minute reservation/expiry, additive Supabase migrations/RPCs, Vercel secret boundaries, tests, account migration, legal gates, rollout, and rollback.

### Out of Scope
- Preferences API, card data, credit/installments, offline methods, shipping charges/logistics, or browser-held secrets.
- Automatic chargebacks or partial refunds; total refunds remain separately gated through the existing refund boundary.

## Capabilities

### New Capabilities
- `provider-payments`: Provider-neutral payment contracts and Orders API attempts.
- `payment-reconciliation`: Signed notifications, authoritative reconciliation, retries, and audit state.
- `stock-reservations`: Atomic reservation expiry and exactly-once release.

### Modified Capabilities
- None in `openspec/specs/`; documented checkout contracts require explicit reconciliation.

## Approach

Preserve Frontend → Vercel rewrite → Node 22/Express Backend → Supabase. Only Backend holds provider secrets. A protected RPC atomically creates order, snapshots, reservation, attempt, and outbox item; external calls stay outside transactions. Webhooks validate, persist minimal identity, acknowledge, and enqueue reconciliation against Orders API. Redirects are never payment truth.

At expiry, block attempts, reconcile, cancel only when allowed, verify a terminal non-chargeable result, then restore stock once. Pending/uncertain states remain under review. Prefer Supabase Cron plus a protected Backend worker; cadence, leases, backoff, retention, alerts, and manual review are design decisions.

Documentation/design MUST replace Preferences/`binary_mode` language with the Orders API contract while preserving higher-priority rules: permitted methods, 40-minute reservation, no shipping charge, and disabled-until-approved rollout. Business-rule wording changes require approval. The external report is non-runtime-admitted; its credential/cancellation and `expiration_time` contradictions remain validation gates.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `frontend/src/features/checkout`, `frontend/vercel.json` | Modified | Flag, redirect/return states, expiry messaging, CSP review. |
| `backend/src/{config,routes,controllers,services,repositories,schemas,types}` | New/Modified | Port, adapter, Webhooks, reconciliation, jobs, idempotency. |
| `supabase/migrations/`, `docs/*.md` | New/Modified | Payment records/RPCs and authority-document reconciliation. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Duplicate, out-of-order, or uncertain events | High | Durable inbox, reconciliation, conditional RPCs, layered idempotency. |
| Late approval after expiry | High | Provider state proof before release; retain review on uncertainty. |
| Account/provider behavior differs | Med | Sandbox gates, credential isolation, fail-closed production checks. |

## Rollback Plan

Keep the flag off, hide the capability, retain cash/transfer, stop jobs/Webhooks, and preserve audit records. Never delete payment history or alter stock outside guarded RPCs.

## Dependencies

- Docker Desktop/pinned Supabase CLI, separate test seller/buyer accounts, public HTTPS sandbox endpoint, Vercel environment secrets, legal/operational approval.
- Open decisions: retry cutoff and late payment, refund inclusion, scheduler policy, production ownership/approver, and `expiration_time`/sandbox cancellation validation.

## Success Criteria

- [ ] Local Supabase tests prove idempotency, replay/order variance, concurrency, expiry, cancellation, and exactly-once stock restoration.
- [ ] HTTPS sandbox proves balance/debit-only exposure, approved/pending/rejected flows, signed Webhooks, reconciliation, and same-order retry without double reservation.
- [ ] Credentials, disclosures, documentation, ownership, and explicit approval are complete before enabling the flag.
