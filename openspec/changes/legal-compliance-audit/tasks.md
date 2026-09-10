# Tasks: Legal Compliance Audit

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–650 authored lines plus font binaries |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 legal/privacy → PR 2 checkout/fonts → PR 3 docs/gates |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Legal/privacy copy, mailbox workflow, disclosures | PR 1 | `pnpm --dir frontend test` | Browse legal, withdrawal, recovery; verify disclosure timing | Revert legal/styles/disclosure files only |
| 2 | Checkout/confirmation and local WOFF2 | PR 2 | `pnpm --dir frontend test` | Pickup/shipping cash/transfer flow; inspect network | Revert checkout/order/index/font files only |
| 3 | Docs and release gate | PR 3 | lint/build/backend test | Browser accessibility/network/storage audit; no backend workflow | Revert listed docs and verification corrections |

### Chained PR Boundaries

- **PR 1 — legal/privacy foundation:** Base = feature/tracker branch. Contains Phase 1 only; finishes with Spanish legal/privacy surfaces, mailbox workflow documentation, and accessible disclosure primitives. Rollback is limited to those legal, privacy, withdrawal/recovery disclosure, and legal-style files.
- **PR 2 — checkout, confirmation, and fonts:** Base = PR 1 branch. Contains Phase 2 only; finishes with traceable checkout/confirmation disclosures and local WOFF2 delivery. Rollback is limited to checkout/order disclosure files, font-loading files, and font assets.
- **PR 3 — reconciliation and release gate:** Base = PR 2 branch. Contains Phase 3 only; finishes with reconciled documentation and lint/build/accessibility/network/storage/security verification. Rollback is limited to documentation and verification corrections.

The feature branch accumulates final integration: PR #1 targets the tracker branch, later child PRs target the immediate previous PR branch, and only the tracker branch merges to main. The `chained-pr` skill is required for `sdd-tasks` and `sdd-apply`; keep each child diff clean by retargeting or rebasing when necessary.

## Phase 1: Legal and Technical Foundation

- [x] 1.1 Update `frontend/src/features/legal/components/TermsAndConditions.tsx` and `frontend/src/pages/ConsumerWithdrawal/index.tsx` with reviewed Spanish offers, payment/totals, fulfillment, changes vs. ten-calendar-day arrepentimiento, warranty/defects, contact, and bounded exceptions; exclude seller identity/CUIT/ARCA/Monotributo/fiscal claims.
- [x] 1.2 Update `frontend/src/features/legal/components/PrivacyPolicy.tsx` with actual data/purposes/recipients/consequences, rights mailbox `margaritas.arteydeco.jujuy@gmail.com`, technical-cookie-only wording, local fonts, CSRF/rate limits, and conditional Cloudflare disclosure; retain unresolved periods/triggers and final review.
- [x] 1.3 Document restricted mailbox-thread intake (time/category/contact/status/resolution), access, minimization, and unresolved retention in `frontend/src/features/legal/components/PrivacyPolicy.tsx` and `docs/PRIVACIDAD-SDD.md`; add no table, API, or backend persistence.
- [x] 1.4 Extend `frontend/src/features/legal/components/LegalSection.tsx`, `frontend/src/features/legal/components/LegalList.tsx`, and `frontend/src/features/legal/components/legal.css` for accessible linked/disclosure blocks without new tokens.

## Phase 2: Checkout, Confirmation, and Fonts

- [x] 2.1 Add shared Spanish legal destinations/disclosures in `frontend/src/features/checkout/utils/checkout-links.ts`, `CheckoutTermsAcceptance.tsx`, `OrderSummary.tsx`, and `CheckoutPage.tsx`; preserve RHF/Zod, configured discount, totals, pickup, and shipping coordination without invented cost/date.
- [x] 2.2 Update `frontend/src/features/public-orders/components/OrderDetails.tsx` to trace confirmed totals/payment/fulfillment, coordination wording, and legal links; add no unsupported identity/fiscal data.
- [x] 2.3 Render privacy/provider disclosure before or alongside `TurnstileChallenge` in `frontend/src/features/public-orders/RecoverOrderPage.tsx`, `frontend/src/pages/ConsumerWithdrawal/index.tsx`, and `frontend/src/pages/ConsumerWithdrawal/Status/index.tsx`; inspect `frontend/src/features/public-orders/components/TurnstileChallenge.tsx` (read-only), `frontend/src/config/env.ts` (read-only), `backend/src/services/turnstile.service.ts` (read-only), `backend/src/middlewares/security.middleware.ts` (read-only), and `backend/src/config/rate-limit-store.ts` (read-only), changing no behavior.
- [x] 2.4 Replace remote links in `frontend/index.html`, `frontend/src/styles/globals.css`, and `frontend/src/styles/variables.css` with confirmed local Cormorant Garamond/Poppins WOFF2 under `frontend/src/assets/fonts/`, `font-display: swap`, and justified preload.

## Phase 3: Tests and Documentation

- [x] 3.1 Add `frontend/src/features/legal/utils/legal-content.test.mjs` and assertions in `frontend/src/features/checkout/utils/checkout.test.mjs` for excluded claims, mailbox/no-persistence, technical cookies/no banner, providers, links, and pickup/shipping cash/transfer scenarios.
- [x] 3.2 Add disclosure-timing and unchanged-security regression coverage in `frontend/src/features/public-orders/utils/public-orders.test.mjs`; run `pnpm --dir frontend test` and `pnpm --dir backend test`.
- [x] 3.3 Reconcile `docs/PRIVACIDAD-SDD.md`, `docs/CONDICIONES-SDD.md`, `docs/CHECKBOX-SDD.md`, `docs/DELIVERY-SDD.md`, `docs/BACKEND-SDD.md`, `docs/BUSINESS-RULES.md`, `docs/FRONTEND-SDD.md`, and `docs/DECISIONS.md`, separating requirements/providers/recommendations and preserving unresolved retention plus final legal/accountant review.
- [x] 3.4 Run `pnpm --dir frontend lint` and `pnpm --dir frontend build`; browser-check keyboard/focus/contrast/responsive behavior, no remote fonts, technical cookies only, no unexpected storage, challenge disclosure, and all threat rows N/A.
