# Provider Payments Specification

## Purpose

Define a provider-neutral hosted-payment boundary and the first Mercado Pago Orders API capability without exposing provider secrets or changing existing cash and bank-transfer behavior.

## Requirements

### Requirement: Provider-neutral payment boundary

The Backend MUST expose payment contracts for creating an attempt, obtaining a hosted checkout URL, reading an authoritative provider order, cancelling a cancellable provider order, and representing idempotency and reconciliation outcomes. Domain services MUST depend on this boundary rather than Mercado Pago DTOs, SDK types, or HTTP details.

#### Scenario: Provider adapter creates an attempt

- GIVEN an eligible internal order with an active reservation
- WHEN the payment service creates a Mercado Pago attempt
- THEN the adapter sends the Backend-authoritative ARS amount, currency, opaque external reference, and stable provider idempotency key
- AND the stored attempt contains only normalized provider identifiers and public checkout data.

#### Scenario: Provider failure is isolated

- GIVEN the provider is unavailable or returns an unsupported response
- WHEN an attempt is created
- THEN the internal order and reservation remain unchanged
- AND the attempt/outbox records the retryable or manual-review outcome.

### Requirement: Gated Orders API capability

The Mercado Pago capability flag MUST be disabled by default and MUST fail closed unless the complete, environment-matched configuration is valid. When enabled, the adapter MUST use Orders API and expose only Mercado Pago balance and debit card; it MUST NOT expose credit, installments, offline methods, or shipping charges. Existing cash and bank transfer MUST remain available independently.

#### Scenario: Disabled production capability

- GIVEN the flag is absent, false, or configuration validation fails
- WHEN a client requests Mercado Pago
- THEN the Backend rejects the method without creating a provider order
- AND checkout continues to offer eligible existing methods.

#### Scenario: Allowed methods and amount

- GIVEN the flag is enabled in a validated environment
- WHEN the checkout capability is returned and an order is created
- THEN the public capability names only balance and debit card
- AND the provider amount includes products only, with no shipping charge or provider fee surcharge.

### Requirement: Atomic order and payment initialization

The Backend MUST create the order, historical snapshots, stock reservation, first payment attempt, and creation outbox item through one PostgreSQL transaction using the PostgreSQL time source. External provider calls MUST occur after that transaction commits. Reattempts on the same order MUST reuse its reservation and MUST NOT decrement stock again.

#### Scenario: Initial checkout

- GIVEN valid active products and sufficient stock
- WHEN the client confirms a Mercado Pago checkout
- THEN one atomic operation creates the order and reservation and records `reservation_expires_at` as PostgreSQL time plus 40 minutes
- AND the provider request is dispatched only after commit.

#### Scenario: Concurrent or repeated checkout

- GIVEN two requests target the same idempotency key or compete for the last unit
- WHEN both are processed
- THEN one logical order/reservation is retained and stock never becomes negative
- AND a rejected-payment retry creates an attempt without another inventory movement.

### Requirement: Hosted redirect and return contract

The Backend MUST return a hosted checkout URL and reservation expiry without returning secrets. The Frontend MUST treat success, failure, pending, and timeout redirects as informational, query the Backend for status, and show a recovery action when the result is not yet authoritative.

#### Scenario: Return after approval

- GIVEN the buyer returns with provider redirect parameters
- WHEN the return route loads
- THEN it fetches the public order status from the Backend
- AND it never marks payment approved from URL parameters alone.

### Requirement: Boundary, rollout, and legal enablement

Only the Backend MAY hold Mercado Pago credentials, webhook secrets, operational idempotency material, and Supabase secret keys. Tables MUST use RLS and deny direct public access. Documentation and legal disclosures MUST be updated and approved before enabling the flag; the account migration MUST replace environment credentials/configuration without code changes.

#### Scenario: Safe account migration

- GIVEN a client-owned seller application and buyer test account
- WHEN Preview and Production secrets, webhook URL, expected IDs, origins, and flag are migrated
- THEN the flag remains disabled until sandbox and smoke gates pass
- AND no credential is exchanged through chat, committed files, browser code, or logs.

#### Scenario: Rollback

- GIVEN a provider or legal/operational incident
- WHEN the flag is disabled and provider jobs/webhooks are stopped
- THEN cash and transfer remain usable, audit/payment history is retained, and stock is changed only through guarded RPCs.

## Research context

`external-research.md` is non-runtime-admitted context. Its source-backed claims (MP-01..15, SB-01..04, VE-01..04) and unresolved questions, including effective method exclusions, sandbox cancellation credentials, `PT40M`, signature replay tolerance, webhook delivery guarantees, quotas, and account-specific fees, MUST remain explicitly marked for validation rather than treated as runtime facts.
