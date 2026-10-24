# Stock Reservations Specification

## Purpose

Define safe, auditable reservation expiry for Orders API payments while preserving the project’s atomic stock and historical-order invariants.

## Requirements

### Requirement: PostgreSQL-authoritative reservation

The system MUST persist a 40-minute local reservation beginning at atomic order creation, using PostgreSQL time rather than browser or server-process clocks. `reservation_expires_at` MUST be returned by the Backend and MUST drive the public countdown. The provider `expiration_time` MUST be treated as a validation gate and compatibility check, never as proof that local stock may be released.

#### Scenario: Reservation creation

- GIVEN an eligible order has sufficient stock
- WHEN the order transaction commits
- THEN stock is decremented once, an auditable movement is recorded, and the reservation expiry is PostgreSQL time plus 40 minutes
- AND the Frontend displays that persisted expiry.

#### Scenario: Provider expiry mismatch

- GIVEN sandbox validation rejects or changes the requested provider expiration
- WHEN the attempt is created
- THEN the local 40-minute reservation remains the domain timer
- AND the mismatch is recorded as a configuration/review event without silently changing the reservation policy.

### Requirement: Attempt window and retry semantics

The Backend MUST prevent new payment attempts after local expiry. A rejected attempt MAY be retried on the same order before expiry, creating a distinct auditable attempt and stable operation keys without another stock movement. Pending or uncertain attempts MUST remain recoverable.

#### Scenario: Rejected retry

- GIVEN an order reservation is active and its previous attempt is rejected
- WHEN the buyer retries
- THEN a new attempt is created for the same order
- AND inventory movements remain exactly those of the original reservation.

#### Scenario: Expired retry

- GIVEN local reservation expiry has passed
- WHEN the buyer requests another attempt
- THEN the Backend rejects it
- AND it does not create a provider order or alter stock.

### Requirement: Reconciled expiry release

Expiry processing MUST first block new attempts and obtain an authoritative provider order state. If cancellable, it MUST request cancellation with a stable idempotency key and verify the resulting state. Stock MAY be restored exactly once only after evidence of a terminal, non-chargeable result. Processing, timeout, non-cancellable, or contradictory states MUST remain under reconciliation/manual review.

#### Scenario: Safe cancellation and release

- GIVEN a reservation is due and the provider order is cancellable
- WHEN reconciliation cancels it and a follow-up read proves terminal non-chargeable state
- THEN one guarded RPC cancels the internal order and restores stock once
- AND a replay cannot create a second cancellation movement.

#### Scenario: Late approval or uncertainty

- GIVEN an approval appears after local expiry, or provider state cannot be proven
- WHEN expiry processing runs
- THEN stock is not restored automatically
- AND the order remains in a pending/review state until an authoritative outcome is resolved without allowing negative stock.

### Requirement: Transaction and integrity boundary

All order, reservation, cancellation, and restoration invariants MUST be enforced by additive PostgreSQL migrations/RPCs behind the Backend repository boundary. External HTTP calls MUST NOT occur inside those transactions. Payment-specific state MUST remain separate from `orders.payment_status`, which remains the historical summary.

#### Scenario: RPC failure

- GIVEN any required validation, lock, or constraint fails
- WHEN an atomic RPC runs
- THEN the entire database operation rolls back
- AND no partial order, reservation, attempt, outbox, or inventory movement remains.

#### Scenario: Direct client access

- GIVEN a browser or public Supabase role attempts to read or mutate payment/reservation tables
- WHEN RLS and grants are evaluated
- THEN access is denied
- AND only the authorized Backend path can execute the required RPCs.

### Requirement: Operational scheduler decision

The design MUST choose and document a scheduler capable of processing sub-40-minute work, with durable claiming, leases, bounded retries, backoff/jitter, dead-letter/manual-review state, retention, alerts, and ownership. Vercel Hobby daily Cron MUST NOT be accepted as sufficient; ephemeral fire-and-forget work MUST NOT be authoritative.

#### Scenario: Worker interruption

- GIVEN a claimed expiry job times out or the worker disappears
- WHEN its lease expires
- THEN another authorized worker can reclaim it without duplicating effects
- AND the attempt remains auditable.
