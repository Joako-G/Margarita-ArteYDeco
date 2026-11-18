# Mercado Pago Checkout Pro Research

```yaml
artifact: gentle-ai.sdd-research/v1
revision: 2
change: checkout-pro-mercadopago
outcome: blocked
accessed_at: 2026-09-17
attempt: 2
retry: explicit_user_selection
claim_scope: empty
```

## Executive summary

External research was explicitly retried for this change, but the runtime still
did not admit any evidence grant. The requested official Mercado Pago and Supabase
questions could not be researched or validated. This artifact preserves the
selected intent and contains no source-backed claims.

## Selected questions

1. Current official Mercado Pago Checkout Pro flow for Argentina, including preference creation, redirects, return URLs, `external_reference`, expiration, allowed payment methods, and `binary_mode=false`.
2. Current official testing model, including test users, credentials, cards, public URLs, sandbox behavior, and the meaning of testing in production.
3. Current official Webhook requirements, including endpoint, signature validation, authoritative payment lookup, acknowledgement, and duplicate/out-of-order handling.
4. Official Supabase and host-infrastructure considerations for server-only secrets, service role, RLS, Postgres RPC/transaction boundaries, and safe outbox/job processing on Vercel.
5. Account switching isolation for seller credentials, Webhook configuration, URLs, identifiers, data, and deployment environments.

## Evidence admission

```yaml
capability: gentle-ai.sdd-research-capability/v1
documentation: []
open-web: []
admission: denied
reason: No exact documentation or open-web evidence grants were declared at runtime during the single recovery attempt.
```

Because admission failed, no external source access was performed and no source
claims were admitted. Official URLs, access dates for source pages, excerpts,
confidence ratings, and source-backed answers are therefore unavailable.

## Sources

None admitted.

## Validated claims

None. Unsupported or undeclared evidence classes produce no claims.

## Local project reconciliation context

The following is retained as non-authoritative project context only; it is not
external evidence and does not resolve the requested research questions:

- `docs/BUSINESS-RULES.md` records a future Checkout Pro scope with Mercado Pago balance and debit cards, `binary_mode = false`, a 40-minute reservation, and provider reconciliation before stock release.
- `docs/BACKEND-SDD.md` and `docs/DATABASE-SDD.md` require the Backend to remain the only Supabase boundary, preserve atomic PostgreSQL operations, protect sensitive tables with RLS, and keep external calls outside PostgreSQL transactions.
- `docs/DECISIONS.md` contains an older ADR stating that Mercado Pago is excluded from the MVP and later ADRs approving a gated post-MVP integration. The later decisions must not be treated as externally validated provider behavior.
- `openspec/changes/checkout-pro-mercadopago/exploration.md` identifies the missing `docs/MP-CHECKOUT-PRO-SDD.md` and lists provider integration, testing, Webhook, reservation, outbox, and account-isolation work as unresolved design scope. Its prior research statements are not re-admitted in this blocked run.

## Contradictions, uncertainty, and freshness

- Research is blocked before source collection, so no external contradiction analysis was possible.
- The project documents contain approved product constraints and unresolved technical choices, but they cannot substitute for the requested current official documentation.
- All provider behavior, account requirements, testing semantics, Webhook details, infrastructure behavior, and account-switching procedures remain unvalidated.

## Product choices

None confirmed by this research phase. Product and operational decisions remain
owned by the orchestrator and proposal/design phases.

## Readiness

```yaml
research_complete: false
claim_scope_gate: blocked
proposal_ready: false
recovery_required: true
recovery_action: Re-enter this phase only if a future run declares an exact admitted documentation or open-web grant and the authoritative source locator.
```
