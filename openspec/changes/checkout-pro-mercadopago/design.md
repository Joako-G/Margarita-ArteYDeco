# Design: Mercado Pago Checkout Pro

## Technical Approach

Keep `POST /api/orders` authoritative, add disabled-by-default Mercado Pago Checkout Pro Preferences API behind a provider port, and retain cash/transfer. One PostgreSQL RPC creates the order, snapshots, 24-hour local reservation, attempt, and outbox; PostgreSQL is the reservation clock and all provider calls occur after commit. Verified Webhooks and approved returns trigger immediate reconciliation; redirects are signals only. `external-research.md` is non-runtime-admitted context.

## Architecture Decisions

| Decision | Choice and rationale |
|---|---|
| Provider boundary | `PaymentProvider` plus `MercadoPagoPreferencesAdapter`; domain code never depends on provider DTOs. |
| Methods | Explicit allow-list `account_money` and `debit_card`; every other type/id (credit, installments, prepaid, offline, cash, and any future method) is excluded and rejected if returned. No shipping charge. |
| Truth and expiry | PostgreSQL time and 24 hours govern the local reservation. Authenticated Payments API GET governs provider state. The provider preference expiry is not the local clock. |
| Reconciliation | A protected worker claims jobs approximately every 60 seconds; it does not poll indiscriminately. `pending`/`in_process` jobs run at minutes 1, 2, 4, 8, and 15, then every 45 minutes, with a final explicit GET before `reservation_expires_at` and configurable margin. |
| Expiry and late approval | No payment/payment ID cancels and releases stock; `approved` confirms; `rejected`, `cancelled`, or `expired` cancel and release; unresolved pending/in-process or undeterminable provider state releases stock and marks `manual_review` without assuming rejection. A later approval attempts atomic re-reservation; no stock means no confirmation or delivery and manual intervention. |

## Data Flow and Contracts

`Checkout → create_order_with_payment_v2 → outbox → protected worker → Checkout Pro preference/payment GET → guarded transition RPC`

`Webhook → bounded-body/signature validation → minimal inbox → dedupe job → Orders GET → transition`

Tables remain additive: `payment_attempts`, `payment_inbox`, `payment_outbox`, `payment_jobs`, with RLS, unique dedupe keys, leases, version guards, and Backend-only RPCs. `orders.payment_status` remains a summary. Internal dedupe is independent at order, create/cancel key, inbox delivery/resource, transition, and job levels; it is our policy, not a Mercado Pago delivery guarantee. The Webhook accepts only POST and a bounded body, validates HMAC before effects, stores redacted identity/digest only, acknowledges after inbox persistence, and never waits for provider GET. The local timestamp replay window is an internal policy, not an official provider guarantee.

```ts
interface PaymentProvider {
  createPreference(input: CreatePaymentPreference): Promise<CreatedPaymentPreference>
  getPayment(id: string): Promise<ProviderPayment>
  getPreferenceCheckoutUrl(id: string): Promise<string>
}
```

Public contract: `GET /api/public/orders/:orderNumber/payment-status` returns `Cache-Control: no-store` and a normalized projection only. A valid anonymous order session sees its order; full recovery requires order number plus the same phone, with indistinguishable failures and rate limiting. States include `pending`, `in_process`, `rejected`, `approved`, `expired`, and `manual_review`; status includes reservation expiry and next safe action. Refresh/recovery re-queries the Backend, never localStorage or redirect data. URL parameters can select a UI message but can never approve, cancel, or release stock.

Admin contract: the order detail renders a contextual payment/reconciliation card with provider state, internal state, last provider update, reservation expiry, attempts, exception and audit timeline. A secondary reconciliation surface may audit pending, dead-lettered, mismatched, expired, and manual-review records. Sync/retry/review actions queue work or record a decision; no route or view may manually confirm a Mercado Pago payment. Approval can only come from verified provider reconciliation.

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/src/payments/**`, `backend/src/routes/**`, `backend/src/controllers/**` | Create/Modify | Port, adapter, public/admin/Webhook/worker routes, reconciliation and retry policy. |
| `frontend/src/features/checkout/**`, `frontend/src/router/**` | Modify | Return, no-store status, recovery, expiry, and manual-review UX. |
| `supabase/migrations/202609170001_checkout_pro.sql` | Create | Payment tables, RLS, leases, enums, and guarded RPCs. |
| `docs/{BUSINESS-RULES,DATABASE-SDD,BACKEND-SDD,FRONTEND-SDD}.md` | Modify | Orders API wording, approvals, and operational gates. |

## Testing Strategy

Unit: method allow-list, HMAC, bounded payload, dedupe, transitions, retry cutoff, and admin authorization. Integration: Docker Supabase concurrency, leases, replay/order variance, late approval, expiry, cancellation, and exactly-once restoration. E2E: HTTPS sandbox approved/pending/rejected, recovery, excluded methods, retries, and migration evidence.

## Threat Matrix

| Boundary | Applicability | Design response / RED test |
|---|---|---|
| Documentation-like paths | N/A — no executable-document classification | None |
| Git repository selection | N/A — no VCS automation | None |
| Commit state | N/A — no commit automation | None |
| Push state | N/A — no push automation | None |
| PR commands | N/A — no PR automation | None |

## Migration / Rollout

Local Docker: a host/Compose scheduler invokes the protected worker every minute; it is for integration tests, not production ownership. Supabase Free: `pg_cron` claims due work and invokes the Backend HTTP worker every minute only after verifying the account plan, HTTP support, cadence, and quotas; no provider HTTP runs in SQL. Production: an owned managed scheduler/queue invokes the same endpoint every minute with 5-minute leases; Payments On-Call owns alerts and dead letters. These plan/cadence facts remain go-live gates. Vercel Hobby Cron and fire-and-forget Functions are insufficient. Deploy flag-off, migrate client secrets without code changes, pass sandbox/legal/ownership gates, and roll back by disabling capability and pausing claims safely.

## Open Questions

- [ ] Validate effective payment-method exclusions, Webhook replay tolerance, quotas, late-approval behavior, and provider status mapping without assuming `expired` for unpaid orders.
- [ ] Verify scheduler cadence/ownership and approve retention/legal wording. Automatic Mercado Pago refunds are explicitly out of scope; document the manual exception process.
