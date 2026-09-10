# Proposal: Legal Compliance Audit

## Intent

Add missing legal coverage and reconcile stale public content with checkout, payment, delivery, withdrawal, warranty, privacy, and security. Use research revision 4 claims, distinguishing requirements, provider disclosures, recommendations, and open decisions.

## Scope

### In Scope
- Update Terms, Privacy, cookies, and arrepentimiento content for applicable requirements.
- Disclose payment, fulfillment, delivery costs, returns, warranty, technical cookies, CSRF/rate limiting, and conditional Turnstile.
- Use `margaritas.arteydeco.jujuy@gmail.com` for general and privacy-rights contact; retain data only as necessary, with periods set with the accountant.
- Self-host optimized WOFF2 Google Fonts with appropriate loading; add legal links in checkout and confirmation.
- Reconcile documentation without inventing seller identity or legal data.

### Out of Scope
- Seller identity, CUIT, ARCA/Monotributo, and fiscal regularization.
- Legal conclusions about mandatory banners, Google Fonts/Turnstile classification, or international-transfer legality.
- Non-essential analytics, marketing cookies, consent UI, automated tracking, or unreviewed product exceptions.

## Capabilities

### New Capabilities
- `consumer-legal-terms`: Commercial terms for offers, payment, fulfillment, withdrawal, defects, repairs, and statutory remedies.
- `privacy-and-technical-disclosures`: Privacy rights, necessity-based retention, technical cookies, CSRF/rate limits, fonts, and Turnstile.

### Modified Capabilities
- `checkout`: Legal links and pre-confirmation disclosure of payment, totals, discounts, fulfillment, and delivery coordination.

## Approach

Audit legal pages, checkout, confirmation, and security behavior against `LC-01`–`LC-34`; update Spanish user-facing content while keeping this artifact in English. Keep necessary technical cookies only, with no banner for now. Load Turnstile conditionally and disclose provider processing. Recheck law and facts before publication; finalize retention periods with the accountant.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/pages` / legal content | Modified | Terms, privacy, cookies, and withdrawal. |
| `src/pages/checkout`, confirmation | Modified | Legal links and commercial disclosures. |
| `src/styles` / font assets | Modified | Local optimized WOFF2 delivery and loading. |
| `docs/` | Modified | Reconcile legal, checkout, delivery, privacy, and security docs. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Text becomes stale or overclaims compliance. | Med | Recheck sources/facts; preserve claim classifications. |
| Retention or provider disclosures remain incomplete. | Med | Accountant review and explicit conditional wording. |

## Rollback Plan

Revert content, links, font-loading, and disclosure commits independently; restore prior legal pages and documentation without changing business data or order behavior.

## Dependencies

- Accountant confirmation of retention periods and deletion triggers.
- Final legal/product review of current law and product facts.

## Success Criteria

- [ ] Legal surfaces and checkout cover in-scope requirements and recommendations without invented legal data.
- [ ] Contact, necessity-based retention, technical-cookie position, local fonts, and Turnstile disclosure match decisions.
- [ ] Documentation matches behavior and tracks decisions.
