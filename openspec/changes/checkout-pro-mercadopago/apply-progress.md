# Apply Progress: Checkout Pro

## Parent Local SQL Observation — Foundation Retry Scenario Ordering

- Parent reports `durable_payment_reconciliation.sql` passed 11/11, then `checkout_pro_foundation.sql` failed at `create_payment_attempt_v2` because its direct rejected→approved case had already set the order payment status to `paid`. The production refusal (`Payment reservation is not active`) is correct; the failure was test ordering.
- Corrected the fixture by keeping same-preference rejected reuse, active-attempt uniqueness, and `manual_review`-not-replaced coverage before approval on the original unpaid order. The direct rejected→approved contract now runs on a separate active-reservation order after original-order cancellation/release checks, and verifies paid payment, Pending order, no duplicate stock decrement/re-reservation, and the rejected→approved audit. The fixture explicitly verifies another attempt is rejected after payment is paid.
- This entry records fixture-source correction only; no SQL outcome is claimed for the edited test. Parent owns subsequent local SQL execution. Implementer validation is limited to the source lock-contract Node test and scoped diff check; no SQL/DB/CLI/Docker/remote operation, stage, or commit.

## Work Unit

- **Change**: `checkout-pro-mercadopago`
- **Slice**: `PR2-webhook-hmac-inbox-task-2.2`
- **Delivery**: `auto-chain`
- **Chain strategy**: `feature-branch-chain`
- **Attempt authority**: Native token was supplied by the orchestrator and remains reserved for settlement.
- **Mode**: Standard (strict TDD disabled)

## Cumulative Task Status

- [x] 1.1 Additive Checkout Pro schema, RLS/grants, retention metadata, and guarded foundation RPCs.
- [x] 1.2 PostgreSQL-authoritative 40-minute reservation policy; HTTP Webhook numeric policies explicitly deferred to PR2.
- [x] 1.3 Database concurrency/integration evidence passes in the focused local Supabase harness, including stale lease reclaim and PostgreSQL-authoritative timing.
- [x] 2.1 Provider port/types, Orders adapter boundary, balance/debit allow-list, fail-closed configuration, stable idempotency keys, and sanitized logging.

## PR1 Implementation Evidence

| Evidence | Result |
|---|---|
| Focused test command | `pnpm dlx supabase@2.113.0 db reset --local` — **passed**; `Get-Content -Raw supabase/tests/checkout_pro_foundation.sql \| docker exec -i supabase_db_margarita-app psql -v ON_ERROR_STOP=1 -U postgres -d postgres` — **passed** with `BEGIN`, three fixture inserts, initial claim, stale-lease update, reclaim, and `ROLLBACK`. Assertions cover reservation decrement, PostgreSQL-authoritative 40-minute expiry, idempotent replay, competing checkout, RLS denial, terminal rejection, exactly-once stock restoration, initial lease ownership, stale lease reclaim, and five-minute PostgreSQL-authoritative lease expiry. |
| Runtime harness | Local Docker Supabase/PostgreSQL runtime — **passed**. The focused SQL runs against the reset migration and exercises the claim RPC first under `service_role`, expires ownership using PostgreSQL `statement_timestamp()`, then reclaims the same job under `service_role`; provider HTTP and Backend runtime remain out of scope for PR1. |
| Static check | `git diff --check` — passed. |
| Rollback boundary | Revert the lease-reclaim additions in `supabase/tests/checkout_pro_foundation.sql` and the task/progress bookkeeping; migration/RPC and unrelated PR1 artifacts remain unchanged, and no Backend or Frontend files were changed. |

## Completed Foundation

The migration adds the Mercado Pago payment method, reservation expiry, payment attempts, inbox, outbox, jobs, RLS denial-by-default, service-role read access, 13-month retention metadata, unique dedupe keys, lease columns, and guarded RPCs for initial checkout, retry attempt creation, and exactly-once terminal release. No provider HTTP call exists in the transaction boundary.

## PR2 Task 2.1 Implementation Evidence

The Backend now has a provider-neutral `PaymentProvider` port and normalized domain types, an Orders-to-payment mapping boundary, and an injectable Mercado Pago Orders adapter. The adapter validates the balance/debit-only method allow-list, sends stable idempotency headers, normalizes provider responses, rejects unsupported returned methods, and never exposes credentials or provider payloads through the logging boundary. Mercado Pago configuration is disabled by default and invalid or environment-mismatched enabled configuration fails closed.

| Evidence | Result |
|---|---|
| Focused test command | `pnpm exec vitest run src/tests/payments.test.ts src/tests/env.test.ts` — **passed**; 2 test files, 14 tests passed. |
| Typecheck | `pnpm run typecheck` — **passed**. |
| Lint | `pnpm run lint` — **passed**. |
| Runtime harness | **N/A** for task 2.1: no route/worker or provider HTTP was enabled; the adapter uses an injectable Axios client and focused tests deliberately do not call Mercado Pago. |
| Rollback boundary | Revert `backend/src/payments/**`, `backend/src/tests/payments.test.ts`, the Mercado Pago fields in `backend/src/config/env.ts`, test fixture config, and example environment entries; PR1 migration/RPCs and unrelated worktree files remain untouched. |

## PR2 Scope Boundary

- Implemented only task 2.1. Routes, Webhook/HMAC inbox, reconciliation, retries/worker, frontend/admin, documentation rollout, and production enablement remain pending.
- Review mode is `auto-chain` with `feature-branch-chain`; this slice targets the previous feature-branch child, not `main`.
- Authored implementation changes remain below the 400-line review budget; no size exception is required.

## Deferred to Later PR2 Tasks

- Webhook maximum body size and internal signature replay window: these are HTTP-boundary policies and are not needed by the database contract.
- Lease-reclaim integration evidence now passes in the focused harness; provider HTTP and Backend runtime evidence remains deferred to tasks 2.2–2.4.

## PR2 Task 2.2 Partial Implementation Evidence

This work unit implements only the first checkout-creation/API-boundary slice of task 2.2. The task checkbox remains pending because Webhook HMAC/inbox acknowledgement, reconciliation, retry policy, and worker/scheduler behavior are not implemented here.

### Implemented Boundary

- Added `POST /api/checkout/mercado-pago` with origin/CSRF, strict body, and idempotency-key validation.
- Added a fail-closed checkout service and repository around `create_order_with_payment_v2`; it creates the order/reservation/attempt through PostgreSQL before any provider call.
- Added stable provider idempotency keys, Orders adapter usage, provider result persistence, and outbox completion after the provider call. The provider HTTP call remains outside the PostgreSQL transaction.
- Added a safe response containing only `checkoutUrl`, `orderNumber`, and `reservationExpiresAt`; credentials and raw provider payloads are not returned.
- Added route/schema/service tests for shipping validation, disabled rollout, boundary validation, and hosted-checkout projection. No real Mercado Pago HTTP is called.

| Evidence | Result |
|---|---|
| Focused test command | `pnpm exec vitest run src/tests/payment-checkout.test.ts src/tests/payments.test.ts` — **passed**; 2 test files, 8 tests passed. |
| Typecheck | `pnpm run typecheck` — **passed**. |
| Lint | `pnpm run lint` — **passed**. |
| Runtime harness | **N/A** for this bounded slice: the route/service uses mocked provider and repository boundaries in tests; no provider HTTP or local Supabase runtime was invoked. |
| Static check | `git diff --check` — **passed** (Git reported only existing LF-to-CRLF normalization warnings). |
| Review-line count | **Not measured**: the attempted `rg` line-count diagnostic was unavailable in the shell; no size exception is claimed. |
| Rollback boundary | Revert `backend/src/{routes/controllers/services/repositories/schemas}/payment-checkout*`, the payment route wiring, the payment database type additions, and `backend/src/tests/payment-checkout.test.ts`; retain PR1, task 2.1 provider files, and unrelated worktree changes. |

## PR2 Scope Boundary

- Current work unit: `PR2-checkout-api-boundary`, feature-branch-chain child slice.
- Task 2.2 remains incomplete. Webhook signature/inbox, authenticated provider GET reconciliation, transitions, retries/dead letters/manual review, and worker/scheduler remain deferred.
- Task 2.3 and 2.4 remain pending. No task checkbox was changed in this slice.

## PR2 Task 2.2 Webhook HMAC and Inbox Boundary Evidence

This work unit implements only the bounded Webhook boundary. The endpoint accepts POST, captures at most 16 KiB of JSON, validates the Mercado Pago `x-signature` manifest (`data.id`, `x-request-id`, and timestamp) with HMAC-SHA-256 and constant-time comparison, and applies a five-minute local replay window. The replay window is an internal policy and is not treated as a Mercado Pago delivery guarantee. Valid notifications are persisted as minimal inbox identity/digest records before acknowledgement; unique delivery conflicts return a safe duplicate acknowledgement. No provider HTTP, reconciliation transition, retry worker, or stock mutation runs in this boundary.

| Evidence | Result |
|---|---|
| Focused test command | `pnpm exec vitest run src/tests/payment-webhook.test.ts src/tests/payment-checkout.test.ts src/tests/payments.test.ts src/tests/env.test.ts` — **passed**; 4 test files, 24 tests passed. Coverage includes valid, malformed, stale, invalid, duplicate, out-of-order, POST-only, and bounded-body inputs. |
| Full backend test command | `pnpm test` — **passed**; 42 test files, 231 tests passed. Expected local rate-limit warnings were emitted because `REDIS_URL` is not configured. |
| Typecheck | `pnpm run typecheck` — **passed**. |
| Lint | `pnpm run lint` — **passed**. |
| Runtime harness | **N/A** for this bounded slice: the real route is exercised through Supertest, while inbox persistence uses a repository seam; no Mercado Pago HTTP or credentials are used. |
| Static check | `git diff --check` — **passed**; Git reported existing LF-to-CRLF normalization warnings only. |
| Rollback boundary | Revert `backend/src/{payments/webhook-signature.ts,config/dependencies.ts,app.ts,config/env.ts,controllers/payment-webhook.controller.ts,repositories/payment-inbox.repository.ts,routes/payment-webhook.routes.ts,services/payment-webhook.service.ts,tests/payment-webhook.test.ts,types/database.ts}`, the webhook secret example entry, and this progress evidence; retain the prior checkout API/provider slices and PR1 migration. |

### Current Scope Boundary

- Task 2.2 remains incomplete because authenticated provider GET reconciliation, guarded transitions, retry/dead-letter/manual-review policy, and worker/scheduler behavior are deferred.
- Task 2.3 and 2.4 remain pending. No task checkbox was changed in this slice.
- Review mode remains `auto-chain` with `feature-branch-chain`; this child slice is intentionally bounded below the 400-line review budget by behavior, not code compression.

## PR2 Task 2.2 Authenticated Reconciliation Boundary Evidence

This work unit adds the server-side authenticated provider GET boundary and guarded persistence only. The provider response is normalized at the adapter boundary, then the reconciliation service validates provider order identity, opaque external reference, ARS amount, currency, and the balance/debit method allow-list before applying a monotonic transition. Mismatches enter `manual_review`; stale versions and lower-ranked states are ignored. Persistence uses conditional attempt status/version predicates and updates only the payment summary for approved/rejected outcomes, so reconciliation never moves stock.

| Evidence | Result |
|---|---|
| Focused test command | `pnpm exec vitest run src/tests/payment-reconciliation.test.ts src/tests/payments.test.ts src/tests/payment-webhook.test.ts` — **passed**; 3 test files, 16 tests passed. Coverage includes normalized approval, amount/currency/reference/method quarantine, and out-of-order monotonic protection. |
| Full backend test command | `pnpm exec vitest run` — **passed**; 43 test files, 237 tests passed. Expected local rate-limit warnings were emitted because `REDIS_URL` is not configured. |
| Typecheck | `pnpm run typecheck` — **passed**. |
| Build | `pnpm run build` — **passed**. |
| Lint | `pnpm run lint` — **passed**. |
| Runtime harness | **N/A** for this bounded slice: reconciliation uses an injectable provider port and repository seam; no real provider HTTP, credentials, worker, or local Supabase runtime was invoked. |
| Static check | `git diff --check` — **passed**; Git reported existing LF-to-CRLF normalization warnings only. |
| Rollback boundary | Revert `backend/src/payments/types.ts`, `backend/src/payments/mercado-pago-orders.adapter.ts`, `backend/src/repositories/payment-reconciliation.repository.ts`, `backend/src/services/payment-reconciliation.service.ts`, `backend/src/tests/payment-reconciliation.test.ts`, the matching database type fields, and this evidence section; retain prior checkout/Webhook/provider slices and PR1 migration. |

### Current Scope Boundary

- Task 2.2 remains incomplete because retry scheduling/backoff, dead-letter/manual operations, worker/scheduler, and public/admin UI are deferred.
- Task 2.3 and 2.4 remain pending. No task checkbox was changed in this slice.
- Review mode remains `auto-chain` with `feature-branch-chain`; this child slice remains scoped to authenticated provider GET reconciliation and guarded state persistence.

## PR2 Task 2.2 Retry, Dead-Letter, and Manual-Review Boundary Evidence

This work unit adds the bounded retry policy and durable job-operation seam only. Failures schedule at most five attempts using 1/2/4/8/15 minute delays with bounded jitter and never schedule beyond the local reservation expiry. Exhaustion is marked `dead_letter`; lease/update races are routed to `manual_review`. Review actions are limited to sanitized `acknowledge` and policy requeue `retry`; neither action confirms payment or moves stock. Worker/scheduler execution remains deferred to task 2.4.

| Evidence | Result |
|---|---|
| Focused test command | `pnpm test -- --run src/tests/payment-retry.test.ts src/tests/payment-reconciliation.test.ts src/tests/payment-webhook.test.ts` — **passed**; 3 test files, 17 tests passed. Coverage includes all backoff delays/jitter, five-attempt exhaustion, expiry cutoff, duplicate claim response, lease/update race, and sanitized manual-review routing. |
| Full backend test command | `pnpm test` — **passed**; 44 test files, 242 tests passed. Expected local rate-limit warnings were emitted because `REDIS_URL` is not configured. |
| Typecheck | `pnpm run typecheck` — **passed**. |
| Build | `pnpm run build` — **passed**. |
| Lint | `pnpm run lint` — **passed**. |
| Runtime harness | **N/A** for this bounded policy/repository seam: task 2.4 owns worker execution and no provider HTTP or scheduler process is implemented here. |
| Static check | `git diff --check` — **passed**; Git reported existing LF-to-CRLF normalization warnings only. |
| Rollback boundary | Revert `backend/src/payments/retry-policy.ts`, `backend/src/repositories/payment-jobs.repository.ts`, `backend/src/services/payment-retry.service.ts`, `backend/src/tests/payment-retry.test.ts`, and this evidence section; retain prior checkout/Webhook/reconciliation slices and PR1 migration. |

### Current Scope Boundary

- Task 2.2 remains incomplete because worker/scheduler claims, alerts, and operational ownership are deferred to task 2.4; task 2.3 remains pending.
- No task checkbox was changed. `2.2` remains unchecked because the task is not complete.
- Review mode remains `auto-chain` with `feature-branch-chain`; this child slice is scoped to retry scheduling and durable update/manual-review boundaries.

### Next Action

Pause and return to the orchestrator for independent SDD verification of this retry/dead-letter/manual-review boundary before applying task 2.4 worker/scheduler work.

## PR2 Task 2.4 Protected Worker and Scheduler Boundary Evidence

This work unit adds the protected worker endpoint and bounded scheduler boundary. Claims pass a worker identity into the five-minute PostgreSQL lease RPC; completion and failure updates require the same owner and an unexpired lease. The worker processes reconciliation jobs through the existing reconciliation and retry services, keeps provider HTTP outside database transactions, quarantines unsupported operations, and emits structured sanitized alerts for dead-letter/manual-review outcomes. The scheduler is cadence-bounded to at least one minute and suppresses overlapping runs. Configuration fails closed unless the worker secret, scheduler HTTP support, hourly quota, and managed approval gates are validated; no Vercel Hobby Cron or fire-and-forget path is accepted.

### Cumulative Task Status

- [x] 1.1 Additive Checkout Pro schema, RLS/grants, retention metadata, and guarded foundation RPCs.
- [x] 1.2 PostgreSQL-authoritative 40-minute reservation policy; HTTP Webhook numeric policies explicitly deferred to PR2.
- [x] 1.3 Database concurrency/integration evidence passes in the focused local Supabase harness, including stale lease reclaim and PostgreSQL-authoritative timing.
- [x] 2.1 Provider port/types, Orders adapter boundary, balance/debit allow-list, fail-closed configuration, stable idempotency keys, and sanitized logging.
- [ ] 2.2 Backend checkout/Webhook/reconciliation/retry boundary remains incomplete pending the remaining API and operational slices.
- [ ] 2.3 RED/unit and integration coverage for the full payment boundary remains pending.
- [x] 2.4 Protected worker/scheduler claims, ownership, lease recovery, alerts, cadence/quota gates, and managed-scheduler approval boundary.

| Evidence | Result |
|---|---|
| Focused test command | `pnpm exec vitest run src/tests/payment-worker.test.ts src/tests/payment-retry.test.ts src/tests/payment-reconciliation.test.ts src/tests/payment-webhook.test.ts` — **passed**; 4 files, 21 tests passed. |
| Full backend test command | `pnpm test` — **passed**; 45 test files, 246 tests passed. Expected local rate-limit warnings were emitted because `REDIS_URL` is not configured. |
| Runtime harness | `pnpm dlx supabase@2.113.0 db reset --local` — **passed**; Docker `psql` execution of `supabase/tests/checkout_pro_foundation.sql` and `supabase/tests/checkout_pro_leases.sql` — **passed**. The lease fixture proves initial ownership, active-lease duplicate claim rejection, expired-lease reclaim by another worker, and attempt increment. |
| Typecheck/build/lint | `pnpm run typecheck` — **passed**; `pnpm run build` — **passed**; `pnpm run lint` — **passed**. |
| Static check | `git diff --check` — **passed**; only existing LF-to-CRLF normalization warnings were reported. |
| Rollback boundary | Revert `backend/src/{controllers/payment-worker.controller.ts,routes/payment-worker.routes.ts,services/payment-worker.service.ts,services/payment-worker-scheduler.service.ts,services/payment-scheduler-policy.ts}`, the worker wiring/config/repository ownership changes, `supabase/migrations/202609170001_checkout_pro.sql` worker ownership/completion additions, `supabase/tests/checkout_pro_leases.sql`, `backend/src/tests/payment-worker.test.ts`, and this evidence section; retain prior checkout/Webhook/reconciliation/retry slices and the foundation lease RPC. |

### Current Scope Boundary

- Task 2.4 is complete for the protected worker/scheduler boundary. Production scheduler deployment and account-plan approval remain go-live gates, not runtime enablement.
- Tasks 2.2 and 2.3 remain incomplete; frontend/admin, production managed scheduler deployment, and unrelated cleanup were not implemented.
- Review mode remains `auto-chain` with `feature-branch-chain`; this child slice is intended to target the preceding feature-branch child, never `main` directly.

### Next Action

Pause and return to the orchestrator for independent SDD verification. Do not acquire or settle another native attempt.

## PR3 Task 3.4 Sandbox and Migration Gate Evidence

This work unit attempted only the task 3.4 evidence gates. The Mercado Pago capability remains disabled; no credentials, tokens, card data, personal data, private URLs, or external provider calls were used or persisted. Task 3.4 remains pending because the required HTTPS sandbox evidence cannot be produced without the external prerequisites below.

### Gate Matrix

| Gate | Evidence status | Bounded result |
|---|---|---|
| Separate seller and buyer accounts | **Blocked** | No sandbox seller/buyer accounts were available to this run. |
| HTTPS sandbox endpoint and Webhook delivery | **Blocked** | No approved public HTTPS sandbox endpoint was available; no Webhook delivery was attempted. |
| Approved, pending, and rejected flows | **Blocked** | Requires the unavailable seller/buyer sandbox and HTTPS endpoint; no provider outcome was invented. |
| Duplicate/replay behavior | **Local pass / sandbox blocked** | Backend Webhook/reconciliation tests passed locally; provider delivery replay was not attempted without sandbox access. |
| Retry behavior | **Local pass / sandbox blocked** | Backend checkout/retry/worker tests passed locally; same-order provider retry was not attempted without sandbox access. |
| Excluded methods | **Local pass / sandbox blocked** | Local allow-list tests pass for balance/debit-only behavior; sandbox observability of excluded methods was not attempted. |
| Account/configuration migration | **Blocked** | No client-owned sandbox credentials, account IDs, approved HTTPS URL, or migration operator were available. No environment files were changed. |
| No credentials/card data exposure | **Local pass** | Tests and builds ran without real provider credentials or card data; the source flag remains opt-in (`VITE_MERCADO_PAGO_ENABLED === 'true'`) and backend provider wiring remains configuration-gated. |
| Local migration/RPC evidence | **Blocked by environment** | `pnpm dlx supabase@2.113.0 db reset --local` could not start because Docker Desktop's Linux engine was unavailable. The local SQL migration harness therefore was not claimed as passed. |

### Checks

| Check | Result |
|---|---|
| Focused Backend payment matrix | `pnpm exec vitest run src/tests/payment-checkout.test.ts src/tests/payment-reconciliation.test.ts src/tests/payment-webhook.test.ts src/tests/payment-retry.test.ts src/tests/payment-worker.test.ts src/tests/payments.test.ts src/tests/env.test.ts` — **passed**, 7 files / 44 tests. |
| Backend typecheck | `pnpm run typecheck` — **passed**. |
| Backend lint | `pnpm run lint` — **passed**. |
| Frontend tests | `pnpm test` — **passed**, 112 tests. |
| Frontend lint/build | `pnpm run lint` — **passed**; `pnpm run build` — **passed**. |
| Local Supabase migration harness | **Blocked** — Docker API unavailable; primary failure is environment availability, so migration verification could not be completed. |
| Frontend focused Vitest command | **Not applicable** — frontend package has Node's built-in test runner, not Vitest; the attempted `pnpm exec vitest ...` failed because Vitest is not installed in `frontend`. This is a secondary check limitation, not evidence of a product failure. |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Backend payment matrix passed: 7 files, 44 tests. Frontend suite passed: 112 tests. |
| Runtime harness command/scenario and exact result | `pnpm dlx supabase@2.113.0 db reset --local` — **blocked** before runtime startup because Docker Desktop Linux engine was unavailable. HTTPS sandbox runtime is **blocked** by missing seller/buyer accounts and approved public endpoint. |
| Rollback boundary | Revert only this evidence section and task/progress bookkeeping. No application, migration, environment, flag, credential, or runtime files were changed. |

### Gate Decision and Prerequisites

- **Gate decision: NOT PASSED.** The capability must remain disabled until real HTTPS evidence exists for every required sandbox case and local migration evidence passes.
- Required before rerun: separate Mercado Pago sandbox seller and buyer accounts, approved public HTTPS endpoint capable of receiving signed Webhooks, non-secret account/environment mapping, and Docker Desktop with its Linux engine running for local Supabase migration tests.
- Task 3.5 rollback validation was intentionally not run.
- Native attempt: `sha256:816bc983a76e13483bab8fa38141b5cf6535e7aa4577eb552481dddb787888d5`, request `apply-sandbox-34-20260920-1`, work unit `sandbox-task-3.4`; no additional attempt was acquired. Settlement could not be performed from the available tools and remains for the native dispatcher/orchestrator.

### Current Scope Boundary

- Task 3.4 remains unchecked because required external sandbox and local migration gates lack complete real evidence.
- Task 3.5 remains unchecked and was not implemented or validated.
- No production capability was enabled; cash and transfer behavior was not changed.

### Next Action

Return to the orchestrator as **blocked**. Obtain the exact prerequisites above, rerun task 3.4 evidence only, and keep the flag disabled until all gates pass.

## PR3 Task 3.3 Documentation and Rollout Contract Evidence

Updated the four authoritative project documents with the Checkout Pro Orders terminology, PostgreSQL-authoritative PT40M reservation expiry, Mercado Pago method exclusions, cancellation credentials, legal disclosure, operational ownership, refund scope, and rollback procedure. No application code or runtime behavior changed in this work unit.

### Cumulative Task Status

- [x] 1.1 Additive Checkout Pro schema, RLS/grants, retention metadata, and guarded foundation RPCs.
- [x] 1.2 PostgreSQL-authoritative 40-minute reservation policy; HTTP Webhook numeric policies explicitly deferred to PR2.
- [x] 1.3 Database concurrency/integration evidence passes in the focused local Supabase harness, including stale lease reclaim and PostgreSQL-authoritative timing.
- [x] 2.1 Provider port/types, Orders adapter boundary, balance/debit allow-list, fail-closed configuration, stable idempotency keys, and sanitized logging.
- [x] 2.2 Backend checkout/Webhook/reconciliation/retry boundary, including atomic inbox-to-reconciliation-job acknowledgement wiring.
- [x] 2.3 RED/unit and integration coverage for the assigned payment boundary matrix.
- [x] 2.4 Protected worker/scheduler claims, ownership, lease recovery, alerts, cadence/quota gates, and managed-scheduler approval boundary.
- [x] 3.1 Flag-aware hosted redirect, no-store payment status/recovery, reservation countdown, terminal/manual-review states, and accessible Spanish copy.
- [x] 3.2 Authenticated admin reconciliation views/actions, bounded retry/review actions, provider state, expiry, attempts, and audit timeline.
- [x] 3.3 Documentation and rollout-contract updates.
- [ ] 3.4 HTTPS sandbox and migration evidence gates.
- [ ] 3.5 Rollback validation.

| Evidence | Result |
|---|---|
| Documentation files | `docs/BUSINESS-RULES.md`, `docs/DATABASE-SDD.md`, `docs/BACKEND-SDD.md`, and `docs/FRONTEND-SDD.md` updated; **passed** |
| Structural checks | `git diff --check` — **passed**; forbidden legacy terms check — **passed** |
| Review budget | 130 insertions, 39 deletions; below the 400-line budget |
| Runtime harness | **N/A** for documentation-only work; HTTPS sandbox and migration evidence remain task 3.4 |
| Rollback boundary | Revert only the four documentation files and this task/progress bookkeeping; retain implementation and database changes |

### Current Scope Boundary

- Task 3.3 is complete. HTTPS sandbox evidence and rollback validation remain pending.
- No application code, provider credentials, runtime configuration, or payment behavior changed in this work unit.
- The native attempt settled successfully with evidence revision `sha256:3d67e94c52398b8af732552147a523827a7edd7dd499a5d17d88da067e542134`.

### Next Action

Return to the orchestrator for the next ordered implementation task, 3.4 HTTPS sandbox and migration evidence gates.

## PR3 Task 3.2 Authenticated Admin Reconciliation Evidence

This work unit extends the tracked administrative orders surface with an authenticated reconciliation view. It consumes the Backend reconciliation projection, exposes provider state, provider update time, reservation expiry, attempt count, retry eligibility, and an expandable append-only audit timeline. Sync and retry actions call their protected endpoints through the existing CSRF/Axios boundary. Review records an acknowledgement note only; there is no Mercado Pago manual-confirmation action.

### Cumulative Task Status

- [x] 1.1 Additive Checkout Pro schema, RLS/grants, retention metadata, and guarded foundation RPCs.
- [x] 1.2 PostgreSQL-authoritative 40-minute reservation policy; HTTP Webhook numeric policies explicitly deferred to PR2.
- [x] 1.3 Database concurrency/integration evidence passes in the focused local Supabase harness, including stale lease reclaim and PostgreSQL-authoritative timing.
- [x] 2.1 Provider port/types, Orders adapter boundary, balance/debit allow-list, fail-closed configuration, stable idempotency keys, and sanitized logging.
- [x] 2.2 Backend checkout/Webhook/reconciliation/retry boundary, including atomic inbox-to-reconciliation-job acknowledgement wiring.
- [x] 2.3 RED/unit and integration coverage for the assigned payment boundary matrix.
- [x] 2.4 Protected worker/scheduler claims, ownership, lease recovery, alerts, cadence/quota gates, and managed-scheduler approval boundary.
- [x] 3.1 Flag-aware hosted redirect, no-store payment status/recovery, reservation countdown, terminal/manual-review states, and accessible Spanish copy.
- [x] 3.2 Authenticated admin reconciliation views/actions; provider sync, bounded retry, review note, attempts, expiry, provider update, and audit timeline without manual payment confirmation.
- [ ] 3.3 Documentation and rollout-gate updates.
- [ ] 3.4 HTTPS sandbox and migration evidence gates.
- [ ] 3.5 Rollback validation.

| Evidence | Result |
|---|---|
| Focused test command | `pnpm test` — **passed**; 112 tests passed, 0 failed. |
| Typecheck/build | `pnpm build` — **passed**; TypeScript compilation and Vite production build completed. |
| Lint | `pnpm lint` — **passed**. |
| Runtime harness | **N/A** for this frontend-only slice: the authenticated Backend reconciliation endpoints are consumed through Axios but no provider credentials or HTTPS sandbox are available; task 3.4 owns that runtime evidence. |
| Static check | `git diff --check` — **passed**; existing LF-to-CRLF normalization warnings only. |
| Rollback boundary | Revert the reconciliation additions in `frontend/src/pages/Admin/Orders/index.tsx`, `frontend/src/features/admin-orders/{types,services,hooks,admin-orders.css,index.ts}`, the Mercado Pago filter/navigation additions, and this task/progress bookkeeping; retain task 3.1 and all Backend/Supabase work. |

### Scope and Review Boundary

- Task 3.2 is complete. Tasks 3.3–3.5 were not implemented.
- The view remains protected by the existing `/admin` route guard and uses the existing authenticated Axios/CSRF services.
- Manual Mercado Pago confirmation is intentionally absent; only provider sync, policy-bounded retry, and review acknowledgement are offered.
- Review mode remains `auto-chain` with `feature-branch-chain`; this slice targets the preceding feature-branch child, never `main` directly.
- Authored frontend changes are approximately 472 added lines, exceeding the 400-line native review ceiling because the cohesive responsive view, audit timeline, action wiring, and documented state presentation could not be reduced without removing required behavior. Native settlement requires a maintainer-approved `size:exception` or a further chain boundary.

### Next Action

Return to the orchestrator for independent SDD verification of task 3.2. Do not implement tasks 3.3–3.5 in this work unit.

## PR3 Task 3.1 Frontend Checkout Pro Boundary Evidence

This work unit adds the disabled-by-default frontend Mercado Pago option, a hosted-checkout redirect using the Backend response, and a no-store payment-status route. The status route re-queries the Backend through TanStack Query, never trusts redirect parameters, shows the persisted reservation expiry countdown, and provides Spanish accessible states for pending, rejected, approved, expired, and manual review. No credentials, payment data, or provider response is persisted in localStorage; the existing order-number navigation hint remains the only allowed local persistence.

### Cumulative Task Status

- [x] 1.1 Additive Checkout Pro schema, RLS/grants, retention metadata, and guarded foundation RPCs.
- [x] 1.2 PostgreSQL-authoritative 40-minute reservation policy; HTTP Webhook numeric policies explicitly deferred to PR2.
- [x] 1.3 Database concurrency/integration evidence passes in the focused local Supabase harness, including stale lease reclaim and PostgreSQL-authoritative timing.
- [x] 2.1 Provider port/types, Orders adapter boundary, balance/debit allow-list, fail-closed configuration, stable idempotency keys, and sanitized logging.
- [x] 2.2 Backend checkout/Webhook/reconciliation/retry boundary, including atomic inbox-to-reconciliation-job acknowledgement wiring.
- [x] 2.3 RED/unit and integration coverage for the assigned payment boundary matrix.
- [x] 2.4 Protected worker/scheduler claims, ownership, lease recovery, alerts, cadence/quota gates, and managed-scheduler approval boundary.
- [x] 3.1 Flag-aware hosted redirect, no-store payment status/recovery, reservation countdown, terminal/manual-review states, and accessible Spanish copy.
- [ ] 3.2 Authenticated admin reconciliation views/actions.
- [ ] 3.3 Documentation and rollout-gate updates.
- [ ] 3.4 HTTPS sandbox and migration evidence gates.
- [ ] 3.5 Rollback validation.

| Evidence | Result |
|---|---|
| Focused test command | `pnpm test` — **passed**; 112 tests passed, 0 failed. The checkout-focused command also passed all 5 checkout tests. |
| Runtime harness | **N/A** for this frontend-only slice: hosted redirect and payment status depend on the Backend/API and the real HTTPS sandbox is explicitly task 3.4. Build output exercised route compilation but no provider credentials or external payment flow. |
| Required checks | `pnpm run lint` — **passed**; `pnpm run build` — **passed**. Full `pnpm run format:check` remains blocked by 129 pre-existing repository formatting findings; focused Prettier checks passed before restoring existing file formatting to avoid unrelated churn. |
| Rollback boundary | Revert the Checkout Pro additions in `frontend/src/features/checkout/**`, the payment-status route in `frontend/src/router/public.routes.tsx`, and this task/progress bookkeeping; retain all Backend, Supabase, and unrelated worktree changes. |

The native 400-line ceiling is exceeded when the new status surface and the existing checkout/schema/test edits are counted together (approximately 476 authored additions before artifact bookkeeping). The slice is cohesive and was not compressed or restyled further; a `size:exception` or maintainer-approved next chain boundary is required for native settlement.

### Current Scope Boundary

- Task 3.1 is complete. Admin operations, documentation, sandbox gates, and rollback validation were not implemented.
- The feature flag is read from `VITE_MERCADO_PAGO_ENABLED` and remains off unless explicitly set to `true`.
- Review mode remains `auto-chain` with `feature-branch-chain`; this slice is limited to frontend checkout and routing.
- Native attempt token `sha256:420a7ba335094fb72bfc89e7142b65bce99aa9d88b91cbe1cbf2a90310b8bd` remained bound to `frontend-task-3.1`; no second attempt was acquired. Settlement must be performed by the native dispatcher because no settlement primitive was exposed to this writer.

### Next Action

Return to the orchestrator for independent SDD verification of task 3.1. Do not implement tasks 3.2–3.5 in this work unit.

## PR2 Task 2.2 Completion Audit Evidence

The cumulative PR2 implementation now satisfies task 2.2. The audit identified one missing runtime wiring detail: a valid Webhook was persisted in `payment_inbox` but did not enqueue the reconciliation job consumed by the protected worker. The new guarded `acknowledge_payment_webhook_v2` RPC inserts the inbox record and one `reconcile_order` job atomically, returning duplicate acknowledgement without creating a second job. No unrelated behavior was changed.

### Requirement Audit

| Requirement | Evidence | Result |
|---|---|---|
| Checkout API | `POST /api/checkout/mercado-pago`, strict schema, CSRF/origin/idempotency validation, atomic reservation initialization, provider call after commit, safe hosted-checkout projection | **Pass** |
| Webhook boundary | POST-only route, 16 KiB raw body limit, provider manifest HMAC-SHA-256, constant-time comparison, five-minute internal replay policy, malformed/stale/invalid rejection | **Pass** |
| Inbox acknowledgement | `acknowledge_payment_webhook_v2` atomically persists minimal inbox identity/digest and exactly one reconciliation job; duplicate deliveries acknowledge without duplication | **Pass** |
| Authenticated GET reconciliation | Backend-only authenticated Orders GET adapter, normalized provider response, strict identity/reference/amount/currency/method checks | **Pass** |
| Guarded transitions | Conditional status/version persistence, monotonic ordering, stale duplicate protection, manual-review quarantine, no stock mutation during reconciliation | **Pass** |
| Retry policy | 1/2/4/8/15-minute delays, bounded jitter, maximum five attempts, reservation-expiry cutoff | **Pass** |
| Dead letter/manual review | Exhaustion produces `dead_letter`; lease/update races and mismatches produce `manual_review`; review actions are sanitized and cannot approve or move stock | **Pass** |

| Evidence | Result |
|---|---|
| Focused test command | `pnpm exec vitest run src/tests/payment-webhook.test.ts src/tests/payment-worker.test.ts src/tests/payment-retry.test.ts src/tests/payment-reconciliation.test.ts src/tests/payment-checkout.test.ts src/tests/payments.test.ts` — **passed**; 6 files, 34 tests passed. |
| Full backend test command | `pnpm test` — **passed**; 45 files, 251 tests passed. Expected local rate-limit warnings were emitted because `REDIS_URL` is not configured. |
| Runtime harness | `pnpm dlx supabase@2.113.0 db reset --local` — **passed**; Docker PostgreSQL assertion called the new RPC twice and observed `false`, then `true`, with exactly one inbox row and one reconciliation job before rollback. |
| Typecheck/build/lint | `pnpm run typecheck` — **passed**; `pnpm run build` — **passed**; `pnpm run lint` — **passed**. |
| Static check | `git diff --check` — **passed**; only existing LF-to-CRLF normalization warnings were reported. |
| Rollback boundary | Revert `backend/src/repositories/payment-inbox.repository.ts`, the Webhook enqueue assertion in `backend/src/tests/payment-webhook.test.ts`, `backend/src/types/database.ts`, the `acknowledge_payment_webhook_v2` migration/grant, and this completion bookkeeping; retain all prior checkout, Webhook, reconciliation, retry, worker, task 2.3, and foundation work. |

### Final Cumulative Task Status

- [x] 1.1 Additive Checkout Pro schema, RLS/grants, retention metadata, and guarded foundation RPCs.
- [x] 1.2 PostgreSQL-authoritative 40-minute reservation policy; HTTP Webhook numeric policies explicitly deferred to PR2.
- [x] 1.3 Database concurrency/integration evidence passes in the focused local Supabase harness, including stale lease reclaim and PostgreSQL-authoritative timing.
- [x] 2.1 Provider port/types, Orders adapter boundary, balance/debit allow-list, fail-closed configuration, stable idempotency keys, and sanitized logging.
- [x] 2.2 Backend checkout/Webhook/reconciliation/retry boundary, including atomic inbox-to-reconciliation-job acknowledgement wiring.
- [x] 2.3 RED/unit and integration coverage for the assigned payment boundary matrix.
- [x] 2.4 Protected worker/scheduler claims, ownership, lease recovery, alerts, cadence/quota gates, and managed-scheduler approval boundary.

### Current Scope Boundary

- Task 2.2 is complete. This work unit did not implement frontend/admin, production rollout, HTTPS sandbox gates, or any new task 3.x behavior.
- Task 2.3 and 2.4 remain complete as previously recorded; their independent verification remains the orchestrator's responsibility.
- Review mode remains `auto-chain` with `feature-branch-chain`; this completion slice stays within the 400-line review budget and contains no commit, push, PR, or Git index operation.

### Next Action

Pause and return to the orchestrator for independent SDD verification. Do not acquire or settle another native attempt.

## PR2 Task 2.3 Payment Test Matrix Evidence

This work unit completes the payment RED/unit/integration coverage without changing production behavior. The focused matrix now covers disabled rollout, balance/debit allow-list exclusions, product-only ARS amounts, amount/currency/reference/method mismatches, malformed/invalid/stale Webhook signatures, duplicate and out-of-order notifications, timeout idempotency-key reuse, backend credentials and stable cancellation keys, retry/dead-letter and lease boundaries, and exactly-once transition/stock-movement behavior. Existing local Docker/Supabase fixtures provide the integration evidence for reservation release replay, late approval protection, PostgreSQL-authoritative expiry, and lease reclaim.

### Cumulative Task Status

- [x] 1.1 Additive Checkout Pro schema, RLS/grants, retention metadata, and guarded foundation RPCs.
- [x] 1.2 PostgreSQL-authoritative 40-minute reservation policy; HTTP Webhook numeric policies explicitly deferred to PR2.
- [x] 1.3 Database concurrency/integration evidence passes in the focused local Supabase harness, including stale lease reclaim and PostgreSQL-authoritative timing.
- [x] 2.1 Provider port/types, Orders adapter boundary, balance/debit allow-list, fail-closed configuration, stable idempotency keys, and sanitized logging.
- [ ] 2.2 Backend checkout/Webhook/reconciliation/retry boundary remains incomplete pending the remaining API and operational slices.
- [x] 2.3 RED/unit and integration coverage for the assigned payment boundary matrix.
- [x] 2.4 Protected worker/scheduler claims, ownership, lease recovery, alerts, cadence/quota gates, and managed-scheduler approval boundary.

| Evidence | Result |
|---|---|
| Focused test command | `pnpm exec vitest run src/tests/payment-checkout.test.ts src/tests/payment-reconciliation.test.ts src/tests/payment-webhook.test.ts src/tests/payment-retry.test.ts src/tests/payment-worker.test.ts src/tests/payments.test.ts` — **passed**; 6 files, 33 tests passed. |
| Full backend test command | `pnpm test` — **passed**; 45 test files, 250 tests passed. Expected local rate-limit warnings were emitted because `REDIS_URL` is not configured. |
| Runtime harness | `pnpm dlx supabase@2.113.0 db reset --local` — **passed**; Docker `psql` execution of `supabase/tests/checkout_pro_foundation.sql` and `supabase/tests/checkout_pro_leases.sql` — **passed**. The fixtures prove terminal cancellation release, duplicate release no-op/no double stock movement, late approval protection, PostgreSQL-authoritative expiry, active lease protection, and stale lease reclaim. |
| Typecheck/build/lint | `pnpm run typecheck` — **passed**; `pnpm run build` — **passed**; `pnpm run lint` — **passed**. |
| Static check | `git diff --check` — **passed**; only existing LF-to-CRLF normalization warnings were reported. |
| Rollback boundary | Revert only the added assertions in `backend/src/tests/payment-checkout.test.ts`, `backend/src/tests/payment-reconciliation.test.ts`, `backend/src/tests/payments.test.ts`, and this evidence/task bookkeeping; retain all production payment behavior and prior test slices. |

### Current Scope Boundary

- Task 2.3 is complete. No production behavior, frontend/admin code, rollout, or documentation was changed.
- Task 2.2 remains incomplete; task 3.x and production HTTPS sandbox gates remain pending.
- Review mode remains `auto-chain` with `feature-branch-chain`; this bounded child slice stays below the 400-line review budget.

### Next Action

Pause and return to the orchestrator for independent SDD verification. Do not acquire or settle another native attempt.
