# Checkout Specification

## Purpose

Ensure checkout and confirmation expose the commercial information and legal routes required for an informed order confirmation.

## Requirements

### Requirement: Pre-confirmation commercial disclosure

Before confirmation, checkout MUST show the selected products and quantities, subtotal, configured discount when applicable, final product total, selected payment method, pickup or delivery modality, delivery-cost treatment, and the point at which delivery timing is coordinated. It MUST link to Spanish Terms, Privacy, and arrepentimiento content, using the confirmed general/privacy contact wherever those pages expose a contact route.

#### Scenario: Pickup confirmation review

- GIVEN a consumer selects pickup and a valid payment method
- WHEN the consumer reaches the confirmation action
- THEN the summary, total, pickup information, delivery-cost treatment, and three legal links are visible before submission

#### Scenario: Delivery coordination

- GIVEN a consumer selects delivery
- WHEN the consumer reviews the order before confirmation
- THEN the required delivery address and coordination wording are visible, and no unconfirmed delivery cost or date is presented as final

### Requirement: Confirmation traceability

The confirmation MUST preserve the same commercial totals, payment method, fulfillment modality, legal-link destinations, and delivery-coordination wording shown immediately before submission. It MUST provide access to the legal pages without claiming unsupported seller or fiscal data.

#### Scenario: Successful order

- GIVEN an order is successfully created
- WHEN the confirmation page is displayed
- THEN its commercial information matches the pre-confirmation summary and its legal links remain reachable

#### Scenario: Stale or changed configuration

- GIVEN a configured discount or product availability changes before submission
- WHEN checkout validates the order
- THEN the consumer sees the recalculated result or an actionable error before an order is confirmed
