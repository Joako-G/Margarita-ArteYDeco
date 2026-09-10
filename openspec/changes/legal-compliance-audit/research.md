# Legal Compliance Research

```yaml
artifact: gentle-ai.sdd-research/v1
revision: 4
change: legal-compliance-audit
outcome: done
accessed_at: 2026-09-09
claim_scope: closed
```

## Executive summary

The approved claim scope is closed and complete. Argentine legal requirements are stated only from admitted Argentine sources; Google Fonts and Cloudflare statements are presented separately as provider disclosures; implementation recommendations are labeled; and unsupported legal conclusions are explicitly withheld. Research is complete under the SDD contract. Proposal readiness remains subject to the separate product-decision gate.

The research excludes seller identity, CUIT, ARCA/Monotributo, and fiscal regularization from implementation scope. The ARCA source was admitted but not used to create conclusions in this scope.

## Selected questions

1. What consumer information must the public store disclose?
2. What rules apply to distance sales and arrepentimiento?
3. What warranty and defect-handling duties are supported by the admitted sources?
4. What payment and delivery information should be disclosed?
5. What data transparency, rights, consent, security, and retention requirements are supported?
6. What can be concluded about technical cookies, Google Fonts, and conditional Cloudflare Turnstile?

## Evidence admission

```yaml
capability: gentle-ai.sdd-research-capability/v1
documentation:
  - https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion
  - https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto
  - https://www.argentina.gob.ar/aaip/datospersonales/derechos
  - https://www.argentina.gob.ar/aaip/datospersonales/responsables
  - https://www.arca.gob.ar/facturacion/
  - https://developers.google.com/fonts/faq/privacy
  - https://www.cloudflare.com/privacypolicy/
  - https://www.cloudflare.com/cookie-policy/
  - https://www.argentina.gob.ar/aaip/datospersonales
open-web:
  - https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion
  - https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto
  - https://www.argentina.gob.ar/aaip/datospersonales/derechos
  - https://www.argentina.gob.ar/aaip/datospersonales/responsables
  - https://www.arca.gob.ar/facturacion/
```

Documentation evidence was sufficient for the admitted sources. The open-web grant was not needed and was not used for additional claims.

## Sources

| ID | Class | Title | Publisher | URL | Accessed | Relevant excerpt or scope |
|---|---|---|---|---|---|---|
| `AR-L24` | documentation | Ley 24.240 de Defensa del Consumidor, texto actualizado | Argentina.gob.ar / Ministerio de Justicia | https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion | 2026-09-09 | Articles 4, 7, 10, 11–17, and 34 address information, offers, transaction documents, legal warranty, repairs, and distance-sale withdrawal. |
| `AR-L25326` | documentation | Ley 25.326 de Protección de los Datos Personales | Argentina.gob.ar / Ministerio de Justicia | https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto | 2026-09-09 | Articles 4–6, 9–10, 14, and 16 address data quality, consent, prior information, security, confidentiality, access, and rectification. |
| `AAIP-RIGHTS` | documentation | Derechos de los titulares de datos personales | Agencia de Acceso a la Información Pública | https://www.argentina.gob.ar/aaip/datospersonales/derechos | 2026-09-09 | Official explanation of access, rectification, update, and suppression rights and their exercise. |
| `AAIP-RESPONSIBLES` | documentation | Responsables de bases de datos | Agencia de Acceso a la Información Pública | https://www.argentina.gob.ar/aaip/datospersonales/responsables | 2026-09-09 | Official guidance for persons responsible for personal-data databases and their obligations. |
| `ARCA-FACTURACION` | documentation | Facturación | ARCA | https://www.arca.gob.ar/facturacion/ | 2026-09-09 | Admitted for the requested source set; not used for implementation conclusions because fiscal identity and regularization are explicitly out of scope. |
| `GOOGLE-FONTS-PRIVACY` | documentation | Google Fonts FAQ: Privacy and security | Google for Developers | https://developers.google.com/fonts/faq/privacy | 2026-09-09 | Provider disclosure about Google Fonts API requests, data handling, and cookies. |
| `CF-PRIVACY` | documentation | Privacy Policy | Cloudflare | https://www.cloudflare.com/privacypolicy/ | 2026-09-09 | Provider disclosure about personal data, service/security processing, disclosures, international processing, and retention principles. |
| `CF-COOKIES` | documentation | Cookie Policy | Cloudflare | https://www.cloudflare.com/cookie-policy/ | 2026-09-09 | Provider disclosure about Cloudflare cookies and their categories/purposes. |
| `AAIP-DATA` | documentation | Protección de datos personales | Agencia de Acceso a la Información Pública | https://www.argentina.gob.ar/aaip/datospersonales | 2026-09-09 | Argentine authority overview of personal-data protection and rights context. |

## Validated legal conclusions

### Consumer information and commercial terms

| ID | Conclusion | Evidence | Classification |
|---|---|---|---|
| `LC-01` | The provider must give consumers certain, clear, and detailed information about essential product or service characteristics and the conditions of commercialization. | `AR-L24`, Article 4: “El proveedor está obligado a suministrar al consumidor en forma cierta, clara y detallada todo lo relacionado con las características esenciales de los bienes y servicios que provee, y las condiciones de su comercialización.” | Legal requirement |
| `LC-02` | A public offer must state its conditions, limitations, duration, and availability as applicable; the offer binds the provider during its stated validity. | `AR-L24`, Articles 7 and 8. | Legal requirement |
| `LC-03` | Transaction documentation must identify the sold item or service and state price and payment conditions, together with the applicable delivery information required by the law. | `AR-L24`, Article 10. | Legal requirement |
| `LC-04` | Product, price, stock/availability, payment method, delivery or pickup modality, delivery-cost treatment, and material limitations should be presented consistently across catalog, checkout, confirmation, and terms. | `LC-01`–`LC-03`. | Implementation recommendation derived from legal requirements |

### Distance sales and arrepentimiento

| ID | Conclusion | Evidence | Classification |
|---|---|---|---|
| `LC-05` | For the distance-sale cases covered by the Consumer Defense Law, the consumer may revoke acceptance within ten calendar days from delivery of the good or conclusion of the contract, whichever is later, without liability; the right cannot be waived. | `AR-L24`, Article 34. | Legal requirement |
| `LC-06` | The withdrawal mechanism must be reachable and must allow the consumer to communicate the decision and make the returned good available according to the statutory process. | `AR-L24`, Article 34 and related distance-sale provisions. | Legal requirement |
| `LC-07` | The public site should maintain a visible arrepentimiento route, explain the trigger date and operational steps, preserve the request for processing, and avoid presenting the route as a discretionary commercial return policy. | `LC-05`–`LC-06`. | Implementation recommendation derived from legal requirements |
| `LC-08` | Any statutory exception or allocation of return costs must be confirmed against the exact product facts and current legal text before being published. | `AR-L24`, Article 34; source scope does not validate a product-specific exception for this project. | Legal uncertainty / risk |

### Warranty and defect handling

| ID | Conclusion | Evidence | Classification |
|---|---|---|---|
| `LC-09` | For new non-consumable movable goods, the legal warranty period is six months; for used goods, it is three months, unless a longer period is agreed. | `AR-L24`, Article 11. | Legal requirement |
| `LC-10` | The provider must ensure the technical service and supply of spare parts for the legally relevant period. | `AR-L24`, Article 12. | Legal requirement |
| `LC-11` | Manufacturers, importers, distributors, and sellers are jointly liable for compliance with the legal warranty in the circumstances established by the law. | `AR-L24`, Article 13. | Legal requirement |
| `LC-12` | A repair must be documented, and an unsatisfactory repair can activate the consumer remedies provided by the law, including replacement, refund, or a proportional reduction where the statutory conditions apply. | `AR-L24`, Articles 15 and 17. | Legal requirement |
| `LC-13` | Terms should describe a defect-reporting channel, required order evidence, inspection/repair coordination, and the consumer remedies without shortening statutory rights or inventing exclusions. | `LC-09`–`LC-12`. | Implementation recommendation derived from legal requirements |

### Payment and delivery disclosures

| ID | Conclusion | Evidence | Classification |
|---|---|---|---|
| `LC-14` | Payment conditions and delivery information are part of the transaction information that must be made clear to the consumer. | `AR-L24`, Articles 4 and 10. | Legal requirement |
| `LC-15` | The checkout and confirmation should disclose the selected payment method, product subtotal, applicable configured discount, final product total, pickup or delivery modality, delivery-cost treatment, and the point at which delivery timing is coordinated. | `LC-01`, `LC-03`, and `LC-14`. | Implementation recommendation derived from legal requirements |
| `LC-16` | A manual WhatsApp coordination flow does not remove the need to state the commercial conditions and delivery-cost treatment clearly before the consumer confirms. | `LC-01`, `LC-03`, and `LC-14`. | Implementation recommendation derived from legal requirements |

### Personal-data transparency, rights, consent, security, and retention

| ID | Conclusion | Evidence | Classification |
|---|---|---|---|
| `LC-17` | Personal data must be collected for lawful, specific purposes, be adequate and not excessive, and be accurate and up to date; data that is no longer necessary or relevant should be destroyed. | `AR-L25326`, Article 4. | Legal requirement |
| `LC-18` | Consent must be free, express, and informed, and must be provided through information that is clear and understandable, subject to the statutory exceptions. | `AR-L25326`, Article 5. | Legal requirement |
| `LC-19` | Before collecting personal data, the responsible party must inform the data subject about the purpose, consequences of providing or refusing the data, and the existence of the database and applicable rights. | `AR-L25326`, Article 6. | Legal requirement |
| `LC-20` | Personal-data processing must use appropriate technical and organizational measures to preserve security and confidentiality and prevent unauthorized access, alteration, or loss. | `AR-L25326`, Articles 9 and 10. | Legal requirement |
| `LC-21` | Data subjects have access and rectification/update rights under the law; the AAIP explains access, rectification, update, and suppression rights and their exercise. | `AR-L25326`, Articles 14 and 16; `AAIP-RIGHTS`. | Legal requirement |
| `LC-22` | The privacy notice should enumerate checkout, order, security, and technical data actually processed; state purposes, recipients/providers where applicable, rights, contact route, and a retention rule tied to necessity and legal obligations. | `LC-17`–`LC-21`; `AAIP-RIGHTS`; `AAIP-RESPONSIBLES`. | Implementation recommendation derived from legal requirements |
| `LC-23` | Retention should be separated by purpose: operational order records, rights/complaint evidence, security/rate-limit records, and temporary checkout or challenge data should each have a documented necessity-based period or deletion trigger. | `LC-17`, `LC-20`, and `LC-22`. | Implementation recommendation derived from legal requirements |

### Technical cookies, Google Fonts, Cloudflare, and Turnstile

| ID | Conclusion | Evidence | Classification |
|---|---|---|---|
| `LC-24` | Google Fonts documentation describes the Google Fonts API as a remote-font delivery service; loading a font from the API sends a request to Google rather than serving the font solely from the application origin. | `GOOGLE-FONTS-PRIVACY`. | Provider disclosure |
| `LC-25` | The Google Fonts privacy FAQ states that the API does not set cookies for font delivery and describes limited request-data handling for service operation. This source does not establish an Argentine consent exemption or a complete legal classification for the application. | `GOOGLE-FONTS-PRIVACY`. | Provider disclosure; legal classification unsupported |
| `LC-26` | Cloudflare states that it processes information in connection with its services, including security and abuse-prevention functions, and that processing can involve information received from websites using Cloudflare services. | `CF-PRIVACY`. | Provider disclosure |
| `LC-27` | Cloudflare's Cookie Policy documents cookies and similar technologies by category and purpose. Cloudflare's provider disclosure must not be treated as a statement of Argentine law. | `CF-COOKIES`. | Provider disclosure |
| `LC-28` | Cloudflare's privacy materials describe global processing and transfers according to the safeguards and mechanisms stated in its policy. The sources support disclosing the provider and the possibility of international processing; they do not determine whether a transfer is lawful for this specific implementation. | `CF-PRIVACY`. | Provider disclosure; implementation/legal review required |
| `LC-29` | A conditional Turnstile integration should be disclosed as a third-party security/anti-abuse service, including the trigger for loading it, the provider, the relevant request/data categories described by the provider, and a link to the provider policy. | `CF-PRIVACY`, `CF-COOKIES`. | Implementation recommendation based on provider disclosures |
| `LC-30` | The admitted provider sources do not establish that Turnstile is cookie-free in every mode, that it never processes personal data, or that its use is exempt from any consent requirement under Argentine law. | `CF-PRIVACY`, `CF-COOKIES`; no admitted Argentine source establishes the contrary or a specific exemption. | Unsupported boundary |

### Retention, notice, and consent boundaries

| ID | Conclusion | Evidence | Classification |
|---|---|---|---|
| `LC-31` | Provider policies describe retention or deletion at a policy/practical level, but they do not supply the application's legally sufficient retention schedule for checkout drafts, order hints, CSRF data, rate-limit records, or challenge data. | `GOOGLE-FONTS-PRIVACY`, `CF-PRIVACY`, `CF-COOKIES`, `AR-L25326` Article 4. | Legal/product boundary |
| `LC-32` | The privacy notice should identify Google and Cloudflare when their services are used, explain the purpose and conditional trigger, identify the relevant technical/request data categories supported by the provider policies, and link to the provider policies. | `LC-19`–`LC-22`, `LC-24`–`LC-29`, `AAIP-DATA`. | Implementation recommendation |
| `LC-33` | No admitted Argentine source establishes a mandatory consent banner for strictly technical cookies, Google Fonts requests, or conditional Turnstile. The research therefore makes no such legal claim. | `AR-L25326`, `AAIP-DATA`, `GOOGLE-FONTS-PRIVACY`, `CF-PRIVACY`, `CF-COOKIES`. | Unsupported legal conclusion intentionally withheld |
| `LC-34` | Consent wording, if selected as a product safeguard, must not state that Argentine law mandates a banner unless additional admitted Argentine authority supports that statement. | `LC-18`, `LC-33`. | Implementation recommendation |

## Explicitly withheld claims and unresolved decisions

The following are explicit non-claims, not negative legal conclusions:

- No general Argentine mandatory cookie-banner requirement is claimed.
- No definitive legal classification of Google Fonts or Cloudflare Turnstile is claimed.
- No definitive legality of international transfers is claimed.

The following remain explicitly unresolved client/product decisions:

- Retention periods or deletion triggers for checkout drafts, `lastOrderNumber`, CSRF data, rate-limit records, and Turnstile challenge data.
- The operational privacy-rights contact and response workflow.
- Whether to self-host Google Fonts or load them remotely.
- Whether and when to conditionally load Turnstile.
- Whether to adopt a consent UI as a product safeguard, without describing it as generally mandated by Argentine law.

Whether the current implementation satisfies the cited duties requires a separate code and legal review. Provider disclosures are not Argentine legal authority, and Argentine legal requirements are not inferred from provider policies.

## Reconciliation with exploration Observation 55

Observation 55 remains non-authoritative implementation context. The admitted evidence supports its identified need to reconcile terms with actual payment, delivery, withdrawal, warranty, and data-processing behavior. Its provider-specific references to Google Fonts, Cloudflare Turnstile, CSRF, storage, and retention are treated as implementation review targets, not legal conclusions.

## Contradictions, uncertainty, and freshness

- No contradiction was found among the admitted official sources for the conclusions above.
- The current legal text and AAIP pages should be rechecked immediately before publication because legal and administrative guidance can change.
- The second grant resolves the approved provider-disclosure scope but does not resolve Argentine legal classification, mandatory consent, international-transfer legality, or implementation compliance.
- This artifact is legal research support, not a legal opinion and not proof of compliance.

## Product choices

None confirmed. The unresolved decisions are listed above. Seller identity, CUIT, ARCA/Monotributo, and fiscal regularization remain excluded from implementation scope.

## Readiness

```yaml
research_complete: true
claim_scope_gate: passed
proposal_ready: false
reason: product decisions remain pending; the research claim-scope condition is satisfied
```
