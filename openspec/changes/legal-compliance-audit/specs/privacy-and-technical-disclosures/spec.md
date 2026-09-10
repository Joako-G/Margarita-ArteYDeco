# Privacy and Technical Disclosures Specification

## Purpose

Define Spanish privacy transparency and bounded technical disclosures based on research revision 4, without unsupported consent, provider-classification, or transfer conclusions.

## Requirements

### Requirement: Privacy transparency and rights

The privacy notice MUST identify actual checkout, order, security, and technical data processed; purposes; applicable recipients or providers; consequences of providing or refusing data; access, rectification, update, and suppression rights; and the channel `margaritas.arteydeco.jujuy@gmail.com` for rights requests. User-facing content MUST be in Spanish.

#### Scenario: Rights request

- GIVEN a person uses the published privacy-rights channel
- WHEN the person requests access, rectification, update, or suppression
- THEN the notice identifies the request path and the application records it for the documented workflow

### Requirement: Necessity-based retention

Data MUST be retained only while necessary for the stated purpose or applicable legal obligations, with separate periods or deletion triggers for orders, complaint/right evidence, security and rate-limit records, temporary checkout data, and challenge data. Concrete periods and deletion triggers require accountant confirmation and final legal review.

#### Scenario: Retention review

- GIVEN a record no longer serves its stated purpose and no documented obligation applies
- WHEN the retention job or review evaluates it
- THEN the record is eligible for deletion or anonymization according to its documented trigger

### Requirement: Technical cookies and local fonts

The application MUST use only necessary technical cookies for this change and MUST NOT show a consent banner for now. It MUST NOT claim that Argentine law mandates or exempts a banner. Fonts MUST be served from local optimized WOFF2 assets; no remote Google Fonts request is required.

#### Scenario: Public browsing

- GIVEN a visitor browses without analytics, advertising, or non-essential tracking
- WHEN the visitor loads the site
- THEN only documented technical cookies are used, no consent banner is shown, and local WOFF2 fonts load

### Requirement: Security and conditional provider disclosure

The privacy notice MUST describe CSRF and rate-limit processing as security/abuse-prevention measures. Turnstile MUST remain conditionally enabled only on approved sensitive flows and MUST disclose Cloudflare, the trigger, relevant provider-described data categories, and provider-policy links. The application MUST NOT show a consent banner for now and MUST NOT assert cookie-free operation, a legal exemption, provider classification, or transfer legality. Final legal review remains required before publication.

#### Scenario: Challenge triggered

- GIVEN an approved sensitive flow triggers Turnstile
- WHEN the challenge is loaded
- THEN the privacy notice discloses the conditional Cloudflare processing before or alongside the flow

### Requirement: Documentation reconciliation

Legal, privacy, checkout, delivery, and security documentation MUST match implemented behavior and label legal requirements, provider disclosures, recommendations, remaining retention decisions, and final legal/accountant review separately.

#### Scenario: Documentation review

- GIVEN implementation behavior changes
- WHEN documentation reconciliation runs
- THEN stale claims are corrected without adding seller identity, CUIT, ARCA, Monotributo, or fiscal-regularization content
