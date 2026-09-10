# Consumer Legal Terms Specification

## Purpose

Define clear Spanish commercial terms for public offers, payment, fulfillment, withdrawal, defects, and warranty without inventing seller identity or fiscal data.

## Requirements

### Requirement: Clear offer and transaction terms

The site MUST present essential product characteristics, price, stock or availability, offer conditions and limitations, payment conditions, and applicable pickup or delivery information consistently. User-facing terms MUST be in Spanish.

#### Scenario: Available product offer

- GIVEN an active product with a price and available stock
- WHEN a consumer views the product and checkout
- THEN both surfaces show consistent characteristics, price, availability, and applicable offer conditions

#### Scenario: Offer is unavailable

- GIVEN a product is inactive or has no stock
- WHEN the consumer attempts to purchase it
- THEN the site prevents purchase and does not present the offer as available

### Requirement: Payment, totals, discounts, and fulfillment

The terms MUST explain accepted payment methods, subtotal, configured discount, final product total, pickup or delivery modality, delivery-cost treatment, and that delivery timing and shipping cost are coordinated when applicable. Discounts MUST come from business configuration, not hardcoded legal copy.

#### Scenario: Transfer checkout

- GIVEN the configured transfer discount applies
- WHEN the consumer reviews checkout
- THEN the payment method, discount, subtotal, final total, fulfillment choice, and delivery-cost treatment are shown before confirmation

### Requirement: Changes and withdrawal

The terms MUST distinguish order changes or cancellation from statutory withdrawal. The arrepentimiento route MUST explain the ten-calendar-day trigger applicable to covered distance sales, communication steps, and return coordination without waiving rights. Product-specific exceptions or return-cost allocation MUST be finalized only after the final legal review of the applicable product facts and current law.

#### Scenario: Withdrawal request

- GIVEN a covered distance sale and a consumer within the applicable period
- WHEN the consumer submits the arrepentimiento request
- THEN the request is recorded and the site explains the next return-coordination step without treating it as discretionary goodwill

#### Scenario: Order change request

- GIVEN an order has not yet entered fulfillment
- WHEN the consumer requests a change or cancellation
- THEN the site explains whether it can be coordinated and does not describe that process as statutory withdrawal

### Requirement: Warranty and defect handling

The terms MUST state the six-month warranty for new non-consumable movable goods and the three-month period for used goods unless a longer period applies, without shortening statutory rights. They MUST provide the confirmed contact `margaritas.arteydeco.jujuy@gmail.com` and explain evidence, inspection or repair coordination, repair documentation, and statutory remedies for an unsatisfactory repair.

#### Scenario: Defect report

- GIVEN a consumer reports a suspected defect
- WHEN the report includes order evidence through the published channel
- THEN the site acknowledges coordination for inspection or repair and does not impose an unsupported exclusion
