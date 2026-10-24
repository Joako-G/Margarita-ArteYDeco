# Payment Reconciliation Specification

## Purpose

Define durable, authenticated, provider-authoritative payment processing for duplicate, out-of-order, delayed, and uncertain Mercado Pago Orders API events.

## Requirements

### Requirement: Durable signed Webhook inbox

The Webhook endpoint MUST accept only the configured method and bounded payload, validate the provider signature before side effects, and persist a minimal durable inbox record before acknowledging. Signature validation MUST use the provider manifest (`x-signature`, timestamp, `x-request-id`, and `data.id`) with HMAC-SHA-256 and constant-time comparison, while any locally chosen replay window is documented as an internal policy rather than an official provider guarantee.

#### Scenario: Valid notification

- GIVEN a valid HTTPS notification with a known application/environment
- WHEN signature and request shape validate
- THEN the inbox stores provider, environment, notification/resource identity, digest, receipt time, and processing state
- AND the endpoint acknowledges quickly without waiting for provider GET or business transitions.

#### Scenario: Invalid notification

- GIVEN a missing, malformed, mismatched, stale-by-internal-policy, or wrong-environment signature
- WHEN the endpoint receives it
- THEN it rejects the notification without inbox/business effects
- AND logs only redacted correlation data.

### Requirement: Authoritative reconciliation

Workers MUST reconcile through authenticated GET of the provider order and MUST validate expected application/user identity, environment/live mode, currency, amount, and opaque external reference before applying a conditional internal transition. Webhook bodies, redirect parameters, and delivery order MUST NOT be financial truth.

#### Scenario: Approved order

- GIVEN a queued event identifies an internal attempt
- WHEN GET returns a matching authoritative processed/approved result
- THEN the transition is applied once, the attempt ledger is updated, and the order summary becomes paid without a second stock deduction.

#### Scenario: Mismatch or unknown resource

- GIVEN GET returns mismatched amount/identity or an unrecognized provider order
- WHEN reconciliation validates it
- THEN no order or stock state is advanced
- AND the event is quarantined for manual review.

### Requirement: Layered idempotency and ordering

The system MUST independently deduplicate internal order creation, provider create/cancel operations, Webhook deliveries, reconciliation transitions, and job/outbox execution. It MUST tolerate duplicate and out-of-order notifications by applying only valid versioned transitions and retaining the audit trail.

#### Scenario: Duplicate delivery

- GIVEN the same notification is delivered repeatedly
- WHEN each delivery is processed
- THEN the inbox uniqueness rule returns the existing logical event
- AND no duplicate payment transition, refund, cancellation, or inventory movement occurs.

#### Scenario: Out-of-order event

- GIVEN a late event describes an older provider version/status
- WHEN it is reconciled
- THEN the conditional transition leaves the newer state intact
- AND the event remains auditable without regressing payment state.

### Requirement: Durable jobs, outbox, and retry policy

Creation, reconciliation, cancellation, and any future total-refund operation MUST use durable outbox/job records. Claims MUST use leases; retries MUST use bounded exponential backoff with jitter and a documented cutoff. Timeout or ambiguous provider responses MUST retry with the same logical provider idempotency key, then enter dead-letter/manual review with alerts and ownership.

#### Scenario: Provider timeout

- GIVEN a create or cancel request times out after being sent
- WHEN the operation is retried
- THEN the same stable provider key is reused and no second logical operation is created
- AND exhaustion produces manual review rather than an unverified success.

#### Scenario: Lease recovery

- GIVEN a worker fails after claiming a job
- WHEN the lease expires
- THEN another worker can reclaim the job
- AND the operation remains idempotent and traceable.

### Requirement: Public recovery and administrative visibility

The public order endpoint MUST expose only a normalized, no-store status projection through the valid anonymous session or full recovery flow. It MUST represent pending, rejected, approved, expired, and manual-review states without trusting redirects. The authenticated admin surface MUST expose reconciliation state, last provider update, reservation expiry, and available sync/review actions; it MUST NOT offer manual payment confirmation for Mercado Pago.

#### Scenario: Pending return

- GIVEN the buyer returns with pending or absent provider confirmation
- WHEN the public status is requested
- THEN it shows that verification is in progress and offers refresh/recovery
- AND it does not claim cancellation, stock release, or approval.

### Requirement: Verification, documentation, and rollback gates

Tests MUST cover Docker/local Supabase RPC concurrency, mocks/fixtures, replay/order variance, timeout, lease recovery, expiry, cancellation, and exactly-once restoration. HTTPS sandbox tests MUST use ngrok or a Vercel endpoint, separate test seller/buyer accounts, and official test balance/debit flows, including approved, pending, rejected, duplicate, excluded-method, retry, and migration cases. Legal disclosures, provider documentation, ownership, scheduler choice, retry/late-payment policy, refund scope, and unresolved research questions MUST be approved before enablement.

#### Scenario: Sandbox gate

- GIVEN local tests pass and an HTTPS sandbox is configured
- WHEN the full test matrix and client-account migration smoke tests run
- THEN only balance/debit are observable, signatures and reconciliation succeed, and evidence is retained without card numbers, CVV, passwords, or secrets.

#### Scenario: Rollback gate

- GIVEN a production incident or failed legal/operational gate
- WHEN rollout is reverted
- THEN the capability is disabled, webhook/jobs are paused safely, cash/transfer remain available, and immutable payment/audit history is retained.

## Research context

`external-research.md` remains non-runtime-admitted. Preserve its source-backed claims and unresolved questions as validation inputs; do not promote them to runtime guarantees without account-specific sandbox evidence and current approved documentation.
