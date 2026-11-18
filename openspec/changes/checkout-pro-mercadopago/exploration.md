## Exploration: checkout-pro-mercadopago

### Current State

The repository already implements the public checkout boundary as `Frontend → Vercel rewrite /api → Vercel Node.js 22/Express Backend → Supabase PostgreSQL/Storage`. The frontend uses Axios with CSRF and an idempotency key; it does not access Supabase directly. The backend creates orders through the transactional `create_order_with_stock` RPC, persists `payment_method` and `payment_status` separately from the operational order status, and currently accepts only cash or bank transfer. Shipping is manual and is not part of the payment total.

The current order model already has important foundations for Mercado Pago: atomic stock deduction, immutable order snapshots, an idempotency table for order creation, delivery constraints, guest-session access, and audited one-time stock restoration on cancellation. However, there is no Mercado Pago adapter, preference endpoint, payment-attempt model, webhook endpoint, provider reconciliation, reservation-expiry process, outbox worker, or Mercado Pago configuration in the environment schema.

The local database is feasible through the pinned Supabase CLI (`2.113.0`) and Docker Desktop. `supabase/config.toml` uses PostgreSQL 17 and enables local PostgreSQL, Auth, Storage, REST, Studio, and SMTP. There is no Docker Compose file in the repository; Docker is an implementation prerequisite for the Supabase CLI stack, not a separate application database topology. Ngrok is not configured in the repository, but a tunnel is feasible for exposing a local HTTPS webhook endpoint. Vercel test-mode webhooks are preferable when available because Mercado Pago documents separate test and production webhook URLs.

Official Mercado Pago documentation verifies that Checkout Pro is a hosted redirect flow, that test accounts are created per application, and that testing requires at least a seller and buyer test account from the same country. Test users have test credentials and simulated balance; test cards can simulate approved, pending, and rejected outcomes. Mercado Pago documents payment Webhooks as HTTP POST notifications, recommends validating their application-specific secret signature, and provides separate test and production notification URLs. By default Checkout Pro exposes several payment types; the integration must explicitly exclude disallowed types and verify the account's effective payment methods. These provider facts do not by themselves decide the client's commercial, legal, or operational policy.

`docs/MP-CHECKOUT-PRO-SDD.md` is referenced by the business, backend, database, and ADR documents but is absent. The existing documents nevertheless record approved product constraints: first release only for Mercado Pago balance and debit cards, `binary_mode = false`, a 40-minute reservation, no shipping charge in Mercado Pago, total refunds only, and the feature disabled until technical, operational, documentation, and approval gates are complete.

### Affected Areas

- `frontend/src/features/checkout/` — add a disabled-by-default Mercado Pago option, redirect/return states, authoritative payment polling, and reservation-expiry messaging without treating `back_urls` as payment truth.
- `frontend/vercel.json` — review CSP, API rewrite, private-route headers, and any future Mercado Pago return/webhook separation; the browser must never receive provider secrets.
- `backend/src/services/orders.service.ts`, `backend/src/repositories/orders.repository.ts`, `backend/src/schemas/orders.schema.ts` — extend the order/payment boundary while preserving the existing RPC and request idempotency contract.
- `backend/src/config/env.ts` and `backend/.env.example` — add environment-scoped provider credentials, webhook secret, feature flag, allowed origins, and reservation/job settings with fail-closed production validation.
- `backend/src/routes/`, `controllers/`, `services/`, `repositories/`, `types/`, and `schemas/` — introduce a provider-neutral payment application service plus a Mercado Pago adapter, preference creation, return-status query, verified webhook intake, reconciliation, retry, and refund contracts.
- `supabase/migrations/` — add payment attempts, webhook inbox/events, outbox jobs, reservation/idempotency constraints, and protected RPCs through additive migrations only.
- `docs/BUSINESS-RULES.md`, `docs/BACKEND-SDD.md`, `docs/DATABASE-SDD.md`, `docs/FRONTEND-SDD.md`, `docs/DECISIONS.md`, `docs/DELIVERY-SDD.md` — reconcile the missing referenced SDD and record provider facts separately from approved decisions and unresolved product/legal questions.
- `openspec/changes/legal-compliance-audit/` — reference only for disclosure dependencies; it is not the implementation home for payment integration.

### Approaches

1. **New dedicated OpenSpec change with provider-neutral payment boundary** — create `checkout-pro-mercadopago` as an additive change, keep Mercado Pago behind a payment port/adapter, and preserve `orders.payment_status` as a summary rather than an event ledger.
   - Pros: correct scope, independently reviewable rollout, supports webhook retries/reconciliation, avoids coupling future providers to Mercado Pago DTOs, and can remain disabled until approval.
   - Cons: requires schema and operational design before UI work; more tables and test cases than a direct preference call.
   - Effort: High

2. **Reuse `legal-compliance-audit` and add payment code there** — place Checkout Pro implementation beside legal copy and disclosures.
   - Pros: superficially fewer change folders.
   - Cons: mixes content audit with financial state, provider credentials, inventory reservation, and asynchronous operations; its proposal explicitly scopes payment disclosures rather than payment processing.
   - Effort: High, with high review and rollback risk

### Recommendation

Use a new SDD change. `legal-compliance-audit` should remain a dependency for truthful privacy, provider, cookie, checkout, and refund disclosures, but it must not own payment processing. Treat the absent `docs/MP-CHECKOUT-PRO-SDD.md` as a documentation gap to resolve in this change before implementation.

Implement in phases:

1. **Contract and safety gate:** decide the final payment/order state mapping, feature-flag behavior, provider-independent interfaces, return URL semantics, refund boundary, observability, and production approval checklist. Keep cash/transfer unchanged and Mercado Pago unreachable when disabled.
2. **Database and backend foundation:** add additive migrations and protected RPCs; implement provider-neutral services and a Mercado Pago adapter behind dependency injection. Use the existing order transaction to create one stock reservation and one initial payment attempt; do not deduct stock again for retries.
3. **Backend-only verification:** before any browser E2E, run unit tests for mapping and state machines; service tests for idempotency, concurrency, replay, out-of-order events, reservation expiry, and refund isolation; API tests for auth/CSRF/feature flag; and integration tests against the local Supabase Docker stack with real migrations and RPCs. Then run sandbox contract tests with Mercado Pago test credentials and a public HTTPS webhook (Vercel test URL or ngrok). This is the recommended level: a full backend integration/contract suite, not only mocked unit tests.
4. **Frontend integration:** add the payment choice only behind a backend capability/feature flag, create the preference through the backend, redirect to Checkout Pro, and query backend state after return. Test loading, duplicate submission, rejection/retry, pending/in-process, expiry-in-review, and disabled states.
5. **Sandbox E2E and approval:** test with separate test seller/buyer users, debit test cards and simulated balance, verify webhook delivery and reconciliation, run concurrency and failure drills, update disclosures, and obtain explicit client/operational approval. Only then configure production credentials and enable the flag.

Recommended Supabase model (names are design candidates, not yet approved schema):

- `payment_attempts`: one row per preference/payment attempt, linked to an order; store provider, provider preference/payment identifiers, amount/currency snapshots, attempt number, provider status, idempotency key hash, timestamps, and a unique constraint preventing two active attempts from claiming the same order state. Never store card data or secrets.
- `payment_webhook_inbox` and append-only `payment_events`: persist a minimally redacted, signature-verified notification identity before asynchronous processing; enforce provider/event uniqueness where the provider supplies a stable event identity, retain received/processed/error state, and reconcile by querying the provider rather than trusting notification payloads.
- `payment_outbox_jobs`: durable commands for preference creation, reconciliation, expiry checks, and refunds; include deduplication key, aggregate/payment attempt, status, attempts, next-run time, lease/error metadata, and bounded payload. Network calls must remain outside PostgreSQL transactions.
- `orders`: add provider-neutral reservation fields such as `reservation_expires_at` and an explicit release/settlement guard, with checks aligned to the 40-minute approved rule. Existing unique inventory movements and cancellation logic must guarantee stock restoration exactly once.
- Idempotency: retain order-creation idempotency, add payment-operation idempotency scoped by operation/order/attempt, and use the same key plus canonical fingerprint to return the prior result or reject payload reuse. Webhook replay and job replay must be safe independently.

For Vercel, do not rely on a continuously running in-process worker. Webhook handlers should authenticate, record the inbox item, enqueue/mark work, and acknowledge quickly; scheduled processing should use an explicitly chosen scheduler (for example a Vercel Cron-triggered protected endpoint or an approved Supabase scheduling mechanism). The exact scheduler, retry limits, retention, and alerting remain design decisions.

Mercado Pago test/production separation should use a dedicated test application and test seller/buyer accounts for development and sandbox validation. Store test and production Access Tokens, application IDs, webhook secrets, allowed return origins, and webhook URLs in separate Vercel environments and local `.env.local` files; never commit them or copy test credentials into production. The backend should select one complete credential set from a validated environment profile, fail closed on mixed credentials, expose only a boolean capability to the frontend, and require an explicit production feature flag/approval gate. Switching accounts should be a deployment/configuration change plus webhook reconfiguration and smoke test, not a code edit.

### Risks

- The absent `docs/MP-CHECKOUT-PRO-SDD.md` leaves contracts, migrations, scheduler behavior, and acceptance criteria under-specified; implementing before replacing that gap risks contradicting higher-priority documents.
- Mercado Pago notifications are asynchronous, duplicated, and potentially out of order; treating redirects or a single webhook as authoritative can mark an unpaid order as paid or release stock incorrectly.
- The current order/payment enums and admin transitions only model cash and bank transfer. Extending them without a separate attempt/provider state can conflate payment truth, order operations, refunds, and reconciliation.
- A 40-minute timer is not proof that funds were not captured. Expiry must reconcile provider state before cancellation or stock restoration.
- Vercel serverless execution does not provide a durable background process; an outbox without an external scheduler/lease strategy will leave jobs stranded.
- Local Supabase requires Docker Desktop and the pinned CLI; local integration proves database behavior but not provider redirect, account, or webhook behavior. Ngrok adds a useful tunnel but is not a substitute for signature, replay, and retry tests.
- Mercado Pago's documented default payment methods are broader than the approved first release. Exclusion configuration must be verified against the test and production accounts, and the result must fail closed rather than silently offering credit, installments, or offline methods.
- Test seller/buyer identities, country, simulated balance, test cards, and production credentials can be mixed accidentally; environment isolation and a preflight credential fingerprint check are required.
- Legal/compliance claims, retention periods, fee/settlement timing, refund operations, chargebacks, and customer-facing copy require explicit product/operational/legal decisions. No provider documentation should be presented as a legal conclusion.

Open product decisions for the proposal/design phase:

- Whether the initial provider API remains Checkout Pro Preferences API and which SDK/API version is approved.
- Exact payment status mapping into existing `payment_status` plus the provider-specific attempt/event state machine.
- Whether rejected attempts may be retried through the same order and the precise cutoff behavior when an attempt is in process at expiry.
- Scheduler choice, retry/backoff/lease limits, event/job retention, alerting, and manual-review workflow.
- Whether Mercado Pago refunds are in this change or a separately gated change, despite the existing future-compatible refund interface.
- Production seller ownership, account country, settlement/fee confirmation, webhook ownership, and explicit go-live approver.
- Whether the local webhook path uses ngrok, a Vercel preview/test deployment, or both.

### Ready for Proposal

Yes — as a new OpenSpec change, not as reuse of `legal-compliance-audit`. The next phase should resolve the missing Mercado Pago SDD, confirm the open product/operational decisions above, and produce the proposal/design with a disabled-by-default rollout and backend integration testing as a mandatory gate before E2E.
