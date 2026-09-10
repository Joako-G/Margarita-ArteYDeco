# Design: Legal Compliance Audit

## Technical Approach

Keep the existing React feature boundaries and public layout. Expand the existing legal components with reviewed Spanish copy, add reusable link/disclosure content to checkout and order confirmation, replace remote Google Fonts with local WOFF2 `@font-face` declarations, and reconcile documentation. Preserve conditional Turnstile behavior and describe it rather than broadening its trigger. The design implements LC-01–LC-34 without seller identity, CUIT, ARCA/Monotributo, or fiscal-regularization claims.

## Architecture Decisions

| Decision | Alternatives considered | Rationale |
|---|---|---|
| Extend `LegalSection`/`LegalList` and current page components | New CMS or a separate legal renderer | Existing legal pages already provide semantic headings, responsive CSS, settings integration, and lazy routes. |
| Use a shared disclosure/link component or constants for checkout and confirmation | Duplicate JSX in each surface | Keeps destinations and Spanish wording consistent while preserving independent page layouts. |
| Keep retention periods unresolved in copy and documentation | Invent dates or promise automatic deletion | The specs require necessity-based retention, but concrete periods/triggers await accountant and final legal review. |
| Self-host optimized WOFF2 with `font-display: swap` and preload only critical faces | Google Fonts stylesheet/preconnect | Removes unnecessary third-party font requests and matches the confirmed privacy decision. |
| Keep Turnstile configuration conditional and fail closed when required | Always render or remove protection | Existing `TurnstileChallenge` already supports approved actions; disclosure must follow actual triggers, not imply a legal classification. |
| Record privacy requests through the published mailbox, not a new application workflow | Add a new privacy-request table/API | The repository has no rights-request workflow. The email thread is the intake and tracking record, avoiding invented persistence or behavior. |

## Data Flow

`CheckoutPage` → `OrderSummary` disclosure/links → `checkoutService` → `OrderPage`/`OrderDetails` with the same server-confirmed totals, payment, fulfillment, and coordination wording. Legal pages remain static plus public settings where already used. A rights request sent to `margaritas.arteydeco.jujuy@gmail.com` is tracked in its restricted email thread: received time, request category, requester contact, verification/resolution status, resolution time, and retention-review/deletion trigger only; do not copy unnecessary order, phone, or request-body data into the app. Access is limited to the owner/authorized staff with mailbox access. The record follows the complaint/rights-evidence retention category, with period and deletion trigger unresolved pending accountant and legal review. Sensitive withdrawal/recovery flows render a disclosure block containing the privacy link and Cloudflare policy links before or alongside `TurnstileChallenge` loading; the privacy page names Cloudflare and the actual trigger.

## File Changes

| File | Action | Description |
|---|---|---|
| `frontend/src/features/legal/components/TermsAndConditions.tsx` | Modify | Add offer, payment/totals, delivery, withdrawal distinction, warranty/defect handling, confirmed contact, and bounded non-claims. |
| `frontend/src/features/legal/components/PrivacyPolicy.tsx` | Modify | Add actual checkout/order/security data, rights contact, CSRF/rate limits, technical cookies, local fonts, conditional Turnstile, providers, and retention categories with unresolved periods. |
| `frontend/src/features/legal/components/LegalSection.tsx`, `LegalList.tsx`, `legal.css` | Modify | Support readable disclosure blocks, links, wrapping, and accessible responsive presentation without new design tokens. |
| `frontend/src/features/checkout/CheckoutPage.tsx`, `components/OrderSummary.tsx`, `components/CheckoutTermsAcceptance.tsx`, `components/CheckoutForm.tsx` | Modify | Show pre-confirmation commercial disclosures and three legal links; keep RHF/Zod acceptance and settings-driven totals. |
| `frontend/src/features/public-orders/components/OrderDetails.tsx` | Modify | Preserve and expose confirmation legal links and matching commercial/fulfillment disclosures. |
| `frontend/src/pages/ConsumerWithdrawal/index.tsx`, `frontend/src/features/public-orders/RecoverOrderPage.tsx` | Modify | Place the privacy/Turnstile disclosure and privacy-policy link before or alongside each conditional challenge; do not load the challenge before that disclosure is rendered. |
| `frontend/index.html`, `frontend/src/styles/globals.css`, `frontend/src/styles/variables.css`, `frontend/src/assets/fonts/*.woff2` | Modify/Create | Remove Google Fonts requests; define local optimized Cormorant Garamond/Poppins faces, preload critical font, retain existing tokens. |
| `frontend/src/config/env.ts`, `frontend/src/features/public-orders/components/TurnstileChallenge.tsx`, `backend/src/services/turnstile.service.ts`, `backend/src/middlewares/security.middleware.ts`, `backend/src/config/rate-limit-store.ts` | Inspect/configure only | Align disclosure text and deployment configuration with existing behavior. Do not expand or alter CSRF validation, rate-limit limits/stores, approved challenge actions, fail-closed handling, hostname validation, or security contracts; backend changes are limited to inspection, configuration, or disclosure alignment. |
| `docs/PRIVACIDAD-SDD.md`, `CONDICIONES-SDD.md`, `CHECKBOX-SDD.md`, `DELIVERY-SDD.md`, `BACKEND-SDD.md`, `BUSINESS-RULES.md`, `FRONTEND-SDD.md`, `DECISIONS.md` | Modify | Reconcile behavior and explicitly separate requirements, provider disclosures, recommendations, unresolved retention, and final review. |

## Interfaces / Contracts

Use existing `routes`, `IPublicSettings`, `IOrderConfirmation`, and `TurnstileChallenge` contracts. Do not add legal data, privacy-request persistence, or a rights-request API to the order/backend contracts. Any shared disclosure helper accepts rendered `ReactNode` so internal links remain `Link` components. The conditional challenge contract is unchanged: disclosure markup renders first or in the same UI transaction as challenge loading. Copy MUST never interpolate unknown seller/fiscal identity or unconfirmed delivery prices/dates.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Legal sections, link destinations, retention/provider wording, font references | Existing frontend test style plus static assertions; ensure excluded claims are absent. |
| Integration | Checkout summary/acceptance and confirmation traceability; conditional Turnstile disclosure timing | Render with existing settings/order fixtures; verify pickup/shipping and transfer/cash variants, and assert the privacy/provider disclosure precedes or accompanies challenge loading in withdrawal and recovery. Backend security tests are regression-only and must confirm unchanged CSRF, rate-limit, and challenge behavior. |
| E2E/manual | Keyboard/focus, responsive legal pages, no remote font request, technical cookies only, challenge-trigger path | Browser network/storage checks and `pnpm lint`/`pnpm build`; backend security suites remain regression gates. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and RED test |
|---|---|---|
| Documentation-like paths | N/A — no executable documentation | No execution/classification change. |
| Git repository selection | N/A — no Git automation | No repository selection logic. |
| Commit state | N/A — no commit automation | No index/worktree behavior. |
| Push state | N/A — no push automation | No refspec behavior. |
| PR commands | N/A — no PR automation | No command composition. |

## Migration / Rollout

No data migration. Deploy copy, links, fonts, and docs as independently revertible commits; rollback removes local font preload/face declarations and restores prior content without changing orders or security behavior. Publish only after accountant confirms retention periods/triggers and final legal/product review rechecks facts and current law.

## Risks

Stale or overbroad copy, font weight/subset mismatch, accidental third-party font fallback, disclosure shown after a sensitive flow begins, mailbox access/retention mistakes, and checkout/confirmation drift. Mitigate with copy exclusion tests, network checks, shared link/content contracts, explicit mailbox metadata minimization, restricted access, and rendered-flow verification.

## Open Questions

- [ ] Accountant and final legal review must define concrete retention periods and deletion/anonymization triggers for orders, rights/complaint evidence, security/rate-limit records, temporary checkout data, and challenge data.
- [ ] Confirm exact local font files/weights and which face is critical enough to preload before implementation.
- [ ] Confirm final Spanish legal copy and product-specific withdrawal exceptions from actual product facts.
