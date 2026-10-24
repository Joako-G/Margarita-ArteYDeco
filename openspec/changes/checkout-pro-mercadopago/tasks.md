# Tasks: Mercado Pago Checkout Pro

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 700–1,000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 foundation/RPC; PR 2 backend/reconciliation; PR 3 frontend/admin/operations |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Add additive schema/RPC and reservation invariants | PR 1 | Local Supabase RPC tests | Docker Supabase + 1-minute host worker | Revert migration/RPC before backend wiring |
| 2 | Add provider, inbox, jobs, reconciliation, and API | PR 2 | Backend payment test suite | HTTPS sandbox + protected worker | Disable routes/worker and flag; retain records |
| 3 | Add public recovery, admin review, docs, rollout gates | PR 3 | Frontend/admin tests; `pnpm lint`; `pnpm build` | Sandbox smoke matrix | Disable UI/flag and pause claims |

## Phase 1: Foundation and Database

- [x] 1.1 Create `supabase/migrations/202609170001_checkout_pro.sql` with additive tables/enums, RLS/grants, unique dedupe keys, leases, and guarded RPCs for atomic order/reservation/attempt/outbox and exactly-once release.
- [x] 1.2 Resolve the database-required timing policy: PostgreSQL-authoritative local reservation is 24 hours from atomic creation. Webhook maximum body size and internal signature replay window remain HTTP-boundary policies; automatic refund integration is out of scope.
- [x] 1.3 Add RED/integration tests for concurrency, rollback, RLS denial, duplicate release, late approval, and lease reclaim; verify PostgreSQL time and no provider HTTP in transactions. Focused foundation coverage passes for all listed behaviors, including stale lease reclaim and PostgreSQL-authoritative reservation and lease timing.

## Phase 2: Backend Payments and Reconciliation

- [x] 2.1 Add `backend/src/payments/**` provider port/types, Orders adapter, allow-list (`account_money`, `debit_card`), fail-closed config, stable keys, and sanitized logging.
- [x] 2.2 Add `backend/src/routes/**`, `backend/src/controllers/**`, schemas, repositories, and services for checkout, POST-only bounded Webhook HMAC validation, immediate Webhook/approved-return reconciliation, authenticated GET reconciliation, transitions, jobs at 1/2/4/8/15 minutes then every 45 minutes, final pre-expiry GET with configurable margin, dead letter, and manual review.
- [x] 2.3 Add RED/unit and integration tests for disabled rollout, exclusions, amount/currency/identity mismatch, malformed/stale signatures, duplicate/out-of-order events, timeout key reuse, expiry/cancellation credentials, and no double stock movement.
- [x] 2.4 Add protected worker/scheduler claims with approximately 60-second pickup cadence, 5-minute leases, ownership, alerts within 5 minutes, and explicit scheduler/quota/HTTP-support validation plus production managed-scheduler approval gate; reject indiscriminate polling, Vercel Hobby Cron, and fire-and-forget.

## Phase 3: Public, Admin, Operations

- [x] 3.1 Modify `frontend/src/features/checkout/**` and `frontend/src/router/**` for flag-aware hosted redirect, no-store status/recovery, expiry countdown, pending/rejected/approved/expired/manual-review states, and Spanish accessible copy without localStorage secrets.
- [x] 3.2 Add the contextual payment/reconciliation card to order detail and keep Conciliation as a secondary audit surface; provide sync, retry-within-policy, review, attempts, provider update, expiry, and audit actions without manual payment confirmation.
- [x] 3.3 Update the permitted documentation with the 24-hour reservation, provider truth rules, scheduled reconciliation, late approval/re-reservation, manual refund exception, contextual administration flow, legal disclosure, ownership, and rollback.
- [ ] 3.4 Run HTTPS sandbox/evidence gates: separate seller/buyer, approved/pending/rejected, duplicate/replay, retry, excluded methods, migration, no credentials/card data; keep capability disabled until all gates pass.
- [ ] 3.5 Validate rollback: disable flag, pause Webhooks/claims safely, preserve immutable audit/payment history, retain cash/transfer, and prove stock changes remain RPC-guarded.
- [ ] 3.6 Add hybrid post-return payment UX: trigger an immediate Backend reconciliation from the approved return, poll only the Backend's status, and preserve pending/manual-review messaging without trusting browser parameters as final payment truth.

## Parent Local SQL Rerun — Shipping Fixture Follow-up

- Parent reports `durable_payment_reconciliation.sql` passed 11/11, followed by passing foundation, permissions 27/27, leases, payment aggregate correction, and expiry safety fixtures.
- `shipping_payment_methods.sql` then failed while inserting its category fixture because `categories.catalog_area` is now `NOT NULL`; the fixture supplied only `(id, name, slug, image_path)`. Added the valid existing test area `art` to that insert.
- Source search found no other category inserts in SQL tests that omit `catalog_area`.
- This is a fixture-source correction only. Parent owns rerunning this SQL test and the remaining local SQL tests; no SQL/DB/CLI/Docker/remote operation was run here. Remaining task 3.4/3.5 gates are unchanged.
