# Schema Foundation Reference

This document is the first implementation reference for the application domain defined in `prisma/schema.prisma`.

Its purpose is to turn the current Prisma schema into the canonical description of:

- the design philosophy behind the model
- the responsibilities of each model and relationship
- the primary and alternate information flows
- the meaning of each status layer
- the application rules that must exist outside the database
- the current modeling limits and assumptions that implementers must treat explicitly

When this document and the schema disagree, the schema is the structural source of truth and this document is the behavioral source of truth for the application layer. If either needs to change, both should be updated together.

## Scope

This reference covers domain modeling and workflow behavior derived from the schema.

It does not define:

- UI behavior
- API route shapes
- authorization policy details beyond what the data model implies
- background job topology
- integration payload formats for suppliers, carriers, or external APIs

## Glossary

- Customer request: the user-facing demand captured by `Cart`, `CartItem`, `UserOrder`, and `UserOrderItem`
- Commercial state: the status that answers whether the customer order and payment lifecycle is pending, processing, completed, failed, cancelled, refunded, or charged back
- Operational state: the status that answers where demand is inside sourcing, packaging, shipment, and delivery
- Aggregate status: a summary status intended for user or admin display, not the only detailed operational source of truth
- Snapshot: JSON data copied at the time of a meaningful business event so later mutations do not rewrite history
- Operation: an aggregation batch for submitted customer demand
- Lot: a supplier-scoped grouping of aggregated demand inside one operation
- Lot item: a supplier-facing requested line inside a lot
- Roll over: quantity that dropped out of the current fulfillment path and must be rebatched or otherwise resolved

## Design Philosophy

### 1. Request lifecycle is separate from fulfillment lifecycle

The schema intentionally separates what the customer asked for from how the platform fulfills it.

- `CartStatus` and `CartItemStatus` describe the request lifecycle
- `CartItemFulfillmentStatus` describes the user-facing fulfillment summary
- `LotStatus`, `LotItemStatus`, `PackageStatus`, `PackageLotItemStatus`, `ShipmentStatus`, `SupplierOrderStatus`, and `CarrierOrderStatus` describe operational progress in more specific scopes

This avoids overloading one status field with commercial, operational, and exception semantics at the same time.

### 2. The system is aggregation-first

The schema models a platform that combines multiple user requests before sourcing from suppliers.

The core path is:

`CartItem -> Operation -> Lot -> LotItem -> SupplierOrder`

This means the app is not a simple one-order-per-supplier checkout system. Aggregation, MOQ logic, supplier-term selection, and rebatching are core business behavior and must live in the application layer.

### 3. Historical truth is preserved with snapshots

Mutable reference data is not trusted to preserve history.

- `UserOrder.billingAddressSnapshot`
- `UserOrder.shippingAddressSnapshot`
- `UserOrderItem.productSnapshot`
- `UserOrderItem.priceSnapshot`
- `CartItem.productSnapshot`
- `Shipment.destinationAddressSnapshot`
- `Shipment.destinationContactSnapshot`

The application must create these snapshots at the correct business moments and never recalculate old commercial or logistical records from current mutable tables.

### 4. Restrictive deletes are the default for commercial and operational history

Auth/session-style data may cascade, but commercial and operational entities generally use `onDelete: Restrict`.

This reflects a deliberate bias toward preserving business history.

- Users should not be deletable if their commercial history still depends on them
- Products, suppliers, lots, orders, and shipments should be retired through business rules, not physical deletion
- `active` and `deleted` are operational visibility flags, not substitutes for archival policy

### 5. Quantities and money are first-class business values

The schema standardizes:

- quantities on `Decimal(18,4)`
- money on `Decimal(18,2)`
- explicit `Currency`

The app must therefore use decimal-safe arithmetic everywhere that performs quantity or pricing logic. Floating-point math is not acceptable.

### 6. Roll overs are modeled explicitly, not as silent deltas

When quantity drops out of the current sourcing path, the schema creates a first-class `RollOver` record rather than hiding the event in a status jump or net quantity adjustment.

This is important because it keeps partial fulfillment, rebatched demand, and operational loss visible and auditable.

### 7. Tracking and auditing are separated by intent

- `CartItemTrackingEvent` records fulfillment lineage for a specific customer demand line
- `AuditLog` records broader entity changes and actor context across the application

The app should usually write both in meaningful operational transitions:

- a tracking event for the affected cart item lineage
- an audit log entry for the actor-driven or system-driven change itself

## Domain Map

### Identity and auth

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `User` | Core user identity | Has many `Session`, `Account`, `Cart`, `UserOrder`, `PaymentMethod`, `Address`, `AuditLog`, `CartItemTrackingEvent` | Also carries `role`, `active`, `deleted` |
| `Session` | Auth session | Belongs to `User` | Dependent auth data, safe to cascade |
| `Account` | Linked identity provider account | Belongs to `User` | Provider credentials and refresh data |
| `Verification` | Verification token/value records | Standalone | Auth support model |

### Customer profile and payment

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `Address` | User address book entry | Belongs to `User` | Never use directly as immutable order history; always snapshot |
| `PaymentMethod` | Saved payment method | Belongs to `User`; referenced by `UserTransaction` | Historical payments remain attached even if method is later disabled |

### Catalog, commercial pricing, and sourcing inputs

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `Brand` | Product brand metadata | Has many `Product` | Optional brand association |
| `Product` | Catalog item | Optional `Brand`; optional `defaultSupplier`; has many client terms, supplier terms, and local constraints | `defaultSupplier` is a hint, not the only sourcing path |
| `Supplier` | Supplier master data | Has many `ProductSupplierTerms`, `Lot`, `SupplierOrder`; optional default relation from `Product` | Address/contact structures remain JSON for now |
| `ProductClientTerms` | Customer-facing sell terms | Belongs to `Product`; referenced by `CartItem` | Source of MOQ, step, max, price, and currency used at request time |
| `ProductSupplierTerms` | Supplier-facing buy terms | Belongs to `Product` and `Supplier`; referenced by `LotItem` | Source of sourcing MOQ and buy-side price logic |
| `ProductLocalConstraints` | Context-sensitive restrictions | Belongs to `Product` | Flexible JSON-based rule container, interpreted in app code |
| `Destination` | Internal warehouse or operational destination | Referenced by `LotItem` | Not the same as the end-user address |

### Customer request and commercial records

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `Cart` | Editable request container | Belongs to `User`; has many `CartItem`; can originate many `UserOrder` | Cart lifecycle stops at request submission |
| `CartItem` | Requested product line | Belongs to `Cart` and one `ProductClientTerms`; has many allocations, tracking events, roll overs, and `UserOrderItem` records | Keeps the initial product snapshot for request-time display and traceability |
| `UserOrder` | Commercial order record | Belongs to `User` and `Cart`; has many `UserOrderItem` and `UserTransaction` | Holds address snapshots |
| `UserOrderItem` | Commercial order line | Belongs to `UserOrder`; must reference `sourceCartItem` | Manual order lines are out of scope for now |
| `UserTransaction` | Customer payment record | Belongs to `UserOrder` and `PaymentMethod` | Payment lifecycle is separate from fulfillment lifecycle |

### Aggregation, sourcing, and rebatching

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `Operation` | Aggregation batch | Has many `Lot`, `RollOver`, and tracking events | The orchestration root for sourcing work |
| `Lot` | Supplier-scoped group inside one operation | Belongs to `Operation` and `Supplier`; optionally linked to `SupplierOrder`; has many `LotItem` | A lot summarizes supplier-facing demand |
| `LotItem` | Supplier-facing requested line | Belongs to `Lot`, `Destination`, and `ProductSupplierTerms` | The primary unit of supplier request quantity |
| `CartItemLotItem` | Quantity bridge from customer demand to supplier-facing line | Joins `CartItem` and `LotItem` with quantity | Key conservation checkpoint |
| `RollOver` | Quantity removed from current path | Belongs to `CartItem` and `Operation` | Captures pre-allocation and post-allocation dropouts |
| `SupplierOrder` | Outbound supplier request | Belongs to `Supplier`; has many `Lot` and `SupplierTransaction` | Supplier-side aggregate state, not a replacement for lot-item state |
| `SupplierTransaction` | Supplier payment record | Belongs to `SupplierOrder` | Finance and sourcing remain decoupled |

### Packaging and logistics

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `Package` | Physical or logical package | Optional `Shipment`; has many `PackageLotItem` | Package status is aggregate, line status is separate |
| `PackageLotItem` | Lot-item quantity inside a package | Joins `Package` and `LotItem`; has many `PackageAllocation` | This is the package-line scope |
| `PackageAllocation` | Quantity bridge from `CartItemLotItem` to `PackageLotItem` | Joins customer-line allocation to packaged quantity | Second conservation checkpoint |
| `Shipment` | Movement record | Optional `CarrierOrder`; has many `Package` | Supports both internal transfer and end-user delivery |
| `Carrier` | Carrier master data | Has many `CarrierOrder` | JSON address/contact remain flexible for now |
| `CarrierOrder` | Outbound carrier request | Belongs to `Carrier`; has many `Shipment` | Carrier-side aggregate state, not shipment-line truth |

### Tracking, audit, and channels

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `CartItemTrackingEvent` | Fulfillment lineage event | Must belong to `CartItem`; may point to actor, operation, lot item lineage, package, shipment, or roll over | Canonical event stream for cart-item fulfillment traceability |
| `AuditLog` | Generic audit trail | Optional relation to `User`; generic entity references | Records actor and before/after context beyond fulfillment events |
| `Channel` | Communication or outbound integration channel | Standalone today | Present in schema but not yet part of the modeled primary fulfillment path |

### Relationship chain that matters most

The critical end-to-end lineage for a fulfilled request is:

`User -> Cart -> CartItem -> UserOrder -> UserOrderItem -> Operation -> Lot -> LotItem -> CartItemLotItem -> PackageAllocation -> PackageLotItem -> Package -> Shipment`

Supporting relationships that shape behavior around that chain are:

- `CartItem -> ProductClientTerms -> Product`
- `LotItem -> ProductSupplierTerms -> Supplier`
- `Lot -> SupplierOrder`
- `Shipment -> CarrierOrder -> Carrier`
- `CartItem -> RollOver`
- `CartItem -> CartItemTrackingEvent`
- `UserOrder -> UserTransaction -> PaymentMethod`

## Status Architecture

### Status layers

| Enum | Scope | Purpose | Aggregate or detailed | Primary owner |
| --- | --- | --- | --- | --- |
| `CartStatus` | Cart | Request lifecycle from drafting through checkout submission | Aggregate commercial/request summary | Checkout application layer |
| `CartItemStatus` | Cart item | Whether the request line is still mutable, submitted, dropped, or cancelled | Detailed request state | Cart and checkout application layer |
| `CartItemFulfillmentStatus` | Cart item | User/admin-facing fulfillment summary after submission | Aggregate fulfillment summary | Fulfillment orchestration layer |
| `UserOrderStatus` | User order | Commercial summary across payment and fulfillment, including chargebacks | Aggregate commercial summary | Order orchestration layer |
| `UserTransactionStatus` | User payment | Payment processing lifecycle | Detailed payment state | Payments integration layer |
| `LotStatus` | Lot | Aggregate sourcing progress for a supplier-scoped lot | Aggregate operational summary | Sourcing orchestration layer |
| `LotItemStatus` | Lot item | Supplier-facing line progress | Detailed operational state | Sourcing orchestration layer |
| `SupplierOrderStatus` | Supplier order | Aggregate outbound supplier-order state | Aggregate operational summary | Supplier integration layer |
| `SupplierTransactionStatus` | Supplier payment | Supplier payment lifecycle | Detailed finance state | Finance integration layer |
| `PackageStatus` | Package | Aggregate packaging and package movement state | Aggregate operational summary | Packaging/logistics layer |
| `PackageLotItemStatus` | Package lot item | Line-level packaging and receipt state | Detailed operational state | Packaging layer |
| `ShipmentStatus` | Shipment | Shipment preparation and movement state | Aggregate operational summary | Logistics layer |
| `CarrierOrderStatus` | Carrier order | Aggregate outbound carrier request state | Aggregate operational summary | Carrier integration layer |
| `RollOverStage` | Roll over | Whether loss occurred before or after supplier-facing allocation | Classification value | Fulfillment orchestration layer |
| `RollOverStatus` | Roll over | Lifecycle of the roll over record itself | Detailed remediation state | Rebatching/resolution layer |

### Aggregate status clarification

Aggregate statuses are summaries. They should never be the only evidence that an operational step happened.

Required rule:

- an aggregate status change must be backed by the detailed records that justify it

Examples:

- `CartItemFulfillmentStatus.requestedFromSupplier` must correspond to lot and supplier-order state that shows supplier request creation
- `CartItemFulfillmentStatus.packaged` must correspond to package allocations and package-line/package status reaching the packaging threshold
- `CartItemFulfillmentStatus.inEndUserShipment` must correspond to an end-user `Shipment` in transit
- `UserOrderStatus.completed` must correspond to all included request lines reaching successful terminal fulfillment and no unresolved commercial failure
- `PackageStatus.received` must correspond to package-line or shipment evidence that the package reached destination

### Aggregate status source-of-truth rules

#### `CartItemFulfillmentStatus`

This is the primary user/admin summary for one requested line after submission.

- `awaitingAggregation`: the item is submitted and not yet materially placed into an active sourcing path
- `includedInOperation`: the item has been assigned to an `Operation`, but the surviving quantity is not yet fully represented by `CartItemLotItem`
- `allocatedToSupplierItem`: the surviving quantity is allocated to one or more `LotItem` rows through `CartItemLotItem`
- `requestedFromSupplier`: the corresponding lot/supplier order has been sent to the supplier
- `supplierConfirmed`: the supplier-confirmed sourcing state exists for the corresponding lot items
- `packaged`: the surviving quantity has been packaged sufficiently to leave sourcing and enter logistics
- `inInternalShipment`: quantity is in a shipment whose `type = internalTransfer` and whose state is in movement
- `atWarehouse`: internal transfer is received, and quantity is waiting for end-user shipment or local handoff
- `inEndUserShipment`: quantity is in a shipment whose `type = endUserDelivery` and whose state is in movement
- `delivered`: all surviving quantity for the item has reached successful customer delivery
- `partiallyRolledOver`: some quantity is still progressing, but some quantity has an open or resolved roll over path that prevented full same-operation fulfillment
- `rolledOver`: no quantity remains in the current successful path; the request continues only through roll over handling or later rebatched work
- `cancelled`: the customer request line was cancelled after submission or forcibly stopped
- `exception`: the item is blocked by an unresolved operational issue that should be visible to operators and possibly end users

Required rule:

- `CartItemFulfillmentStatus` must be updated only by orchestration code that also writes the detailed records and tracking event causing that summary to change

#### `UserOrderStatus`

`UserOrderStatus` is a commercial summary, not a fulfillment machine.

- `pending`: the order exists but active processing has not yet started
- `processing`: payment and/or fulfillment is underway
- `completed`: the order is commercially closed and every included line is in a successful terminal outcome
- `cancelled`: the order was cancelled before successful completion
- `failed`: the order failed because commercial or orchestration prerequisites were not satisfied
- `refunded`: money was refunded after a prior commercial attempt
- `chargedBack`: a previously completed payment was disputed or externally reversed by the provider

Required rule:

- `UserOrderStatus` should be derived from customer payment state and included item fulfillment outcomes, not used as a substitute for item-level operational tracking

#### `PackageStatus`

`PackageStatus` is aggregate package state.

- It summarizes `PackageLotItemStatus` plus shipment assignment and movement
- It must not replace package-line truth
- It should not advance to transit or receipt without matching shipment evidence when the package is actually attached to a shipment

#### `SupplierOrderStatus` and `CarrierOrderStatus`

These represent external aggregate request state.

- They summarize the outbound request lifecycle for the supplier or carrier integration
- They do not replace `LotItemStatus` or `ShipmentStatus`
- A confirmed supplier order does not mean every lot item is complete
- A confirmed or in-transit carrier order does not mean every shipment is delivered

## Primary End-to-End Flow

The primary path below assumes the common successful case:

- the user selects valid sell terms
- the item is submitted
- demand is aggregated successfully
- the supplier confirms
- quantity is packaged and shipped
- final delivery succeeds

### 1. Catalog selection and request eligibility

Records in play:

- `Product`
- `ProductClientTerms`
- `ProductSupplierTerms`
- `ProductLocalConstraints`
- `Supplier`

Expected status context:

- no cart or order status is required yet
- only active, non-deleted, time-valid terms and constraints are eligible

App actions:

- resolve the active `ProductClientTerms` for the customer context
- evaluate `ProductLocalConstraints` against destination, timing, quantity, and legal context
- reject products that are inactive, deleted, out of term range, or blocked by local constraints
- calculate display price and allowed quantity increments from MOQ, step, max, and currency

Clarifications:

- `defaultSupplierId` on `Product` is only a default hint
- actual sourcing may still choose another supplier through `ProductSupplierTerms`
- overlapping active terms are allowed structurally but should be treated as an application error unless explicitly supported

### 2. Cart creation and cart-item mutation

Records created or updated:

- `Cart`
- `CartItem`

Expected status changes:

- `Cart.status = draft` while the request is being assembled without a durable checkout flow
- `Cart.status = pending` once associated with the user and ready for active review/editing
- `CartItem.status = inCart`
- `CartItem.fulfillmentStatus = awaitingAggregation` by default, but it is not operationally meaningful until submission

App actions:

- create or select the active mutable cart for the user according to product policy
- enforce quantity validity against client MOQ, step, and max
- copy enough request-time data into `CartItem.productSnapshot` for display and later comparison
- keep cart items mutable while still in request scope
- write audit entries for meaningful cart mutations when needed

Clarifications:

- the schema does not enforce one active cart per user
- the app must decide whether multiple draft or pending carts are allowed
- `CartItem.fulfillmentStatus` should not be treated as fulfillment truth while `CartItem.status = inCart`

### 3. Checkout start and order materialization

Records created or updated:

- `Cart`
- `UserOrder`
- `UserOrderItem`
- optional `UserTransaction`

Expected status changes:

- `Cart.status` moves from `pending` to `atCheckout`
- on successful submission, `Cart.status = submitted`
- each included `CartItem.status = submitted`
- `UserOrder.status = pending`
- each `CartItem.fulfillmentStatus = awaitingAggregation`

App actions:

- validate the cart is still editable and internally consistent
- resolve billing and shipping addresses and write order snapshots
- freeze commercial terms into `UserOrderItem.productSnapshot` and `UserOrderItem.priceSnapshot`
- create `UserOrderItem` rows from submitted `CartItem` rows
- create initial `UserTransaction` rows if payment is initiated at checkout
- write tracking events for submission and audit logs for checkout confirmation

Clarifications:

- `UserOrderItem.sourceCartItemId` is required, so manual order lines are currently out of scope
- the schema intentionally allows multiple `UserOrder` rows for one cart; the application should use that only for retries, recovery, or explicit multi-order policy
- only one active commercial lineage from a cart should be treated as authoritative unless business policy explicitly says otherwise

### 4. Payment gating and move into processing

Records created or updated:

- `UserTransaction`
- `UserOrder`

Expected status changes:

- `UserTransaction.status` moves through `pending`, `inProcess`, `completed`, `failed`, `cancelled`, `refunded`, or `chargedBack`
- `UserOrder.status` typically moves from `pending` to `processing` once payment or fulfillment handling begins

App actions:

- decide whether fulfillment may begin before payment capture, after authorization, or only after completed payment
- persist payment gateway references outside or alongside the schema as needed
- promote the order into processing when commercial prerequisites are satisfied
- hold, cancel, or fail the order if payment prerequisites are not met

Clarifications:

- the schema does not enforce payment-before-fulfillment
- that gating rule must be explicit in the application layer and documented in payment orchestration code

### 5. Aggregate submitted demand into operations and lots

Records created or updated:

- `Operation`
- `Lot`
- `LotItem`
- `CartItemLotItem`
- `CartItemTrackingEvent`

Expected status changes:

- `CartItem.fulfillmentStatus` moves from `awaitingAggregation` to `includedInOperation` and then `allocatedToSupplierItem`
- `Lot.status` moves from `pending` to `assembling`
- `LotItem.status = pending`

App actions:

- select or create an `Operation` for the submitted demand
- group demand into supplier-scoped `Lot` records
- choose `ProductSupplierTerms` based on supplier strategy, MOQ, locality, and availability
- create `LotItem` rows for supplier-facing request lines
- allocate `CartItem` quantity into `CartItemLotItem` rows
- write tracking events for inclusion and allocation

Clarifications:

- allocation policy is not in the schema
- the app must decide whether to append to an existing open lot or create a new lot
- quantity may be split across multiple lot items if business rules allow it

### 6. Request the supplier and capture supplier confirmation

Records created or updated:

- `SupplierOrder`
- `Lot`
- `LotItem`
- `CartItemTrackingEvent`
- optional `SupplierTransaction`

Expected status changes:

- `SupplierOrder.status` moves from `pending` to `requested`, then `confirmed`
- `Lot.status` moves from `assembling` to `requested`, then `confirmed`
- `LotItem.status` moves from `pending` to `requested`, then `confirmed`
- `CartItem.fulfillmentStatus` moves from `allocatedToSupplierItem` to `requestedFromSupplier`, then `supplierConfirmed`

App actions:

- create or update the supplier order that owns the lot set
- send the outbound supplier request and persist `externalReference` if applicable
- reconcile supplier responses at lot and lot-item granularity
- create supplier payment records if the commercial model requires them
- write tracking events for supplier request and confirmation

Clarifications:

- `SupplierOrderStatus` is not fine-grained enough to replace `LotItemStatus`
- partial supplier confirmation must be handled at lot-item or allocation scope and reflected back into cart-item summaries

### 7. Package confirmed quantity

Records created or updated:

- `Package`
- `PackageLotItem`
- `PackageAllocation`
- `CartItemTrackingEvent`

Expected status changes:

- `Lot.status` and `LotItem.status` eventually reach `readyForPackaging`
- `Package.status` moves from `pending` to `packing` and later `readyForShipment`
- `PackageLotItem.status` moves from `pending` to `packing` to `packed`
- `CartItem.fulfillmentStatus = packaged` once the surviving quantity is sufficiently packaged for shipment

App actions:

- create packages for confirmed lot-item quantity
- split or consolidate `LotItem` quantity into `PackageLotItem` rows
- bridge customer demand to packaged quantity through `PackageAllocation`
- enforce that packaging does not create or destroy quantity
- write tracking events when packaging becomes operationally meaningful

Clarifications:

- `Package.status` is aggregate
- package-line truth lives on `PackageLotItem.status`
- full traceability from customer request to package requires both `CartItemLotItem` and `PackageAllocation`

### 8. Dispatch internal transfer when required

Records created or updated:

- `Shipment`
- `Package`
- `CarrierOrder` when a carrier is involved
- `CartItemTrackingEvent`

Expected status changes:

- `Shipment.type = internalTransfer`
- `Shipment.status` moves from `pending` to `preparing`, then `readyForDispatch`, then `inTransit`, then `received`
- `Package.status` moves into shipment-related states
- `CartItem.fulfillmentStatus` moves to `inInternalShipment`, then `atWarehouse`

App actions:

- decide whether internal transfer is required from constraints, packaging policy, or network topology
- create the internal-transfer shipment and assign packages
- create carrier order records if an external carrier handles the internal movement
- write shipment snapshots for destination/contact context where appropriate
- mark warehouse receipt before moving to end-user dispatch

Clarifications:

- `Destination` on `LotItem` is the operational internal destination
- `Shipment.destinationAddressSnapshot` is the shipment-time location snapshot
- not every flow requires this phase

### 9. Dispatch end-user shipment

Records created or updated:

- `Shipment`
- `CarrierOrder`
- `Package`
- `CartItemTrackingEvent`

Expected status changes:

- `Shipment.type = endUserDelivery`
- `Shipment.status` moves from `pending` to `preparing`, `readyForDispatch`, `inTransit`, and `received`
- `Package.status` moves from `readyForShipment` to `inTransit`, then `received`
- `PackageLotItem.status` moves from `packed` to `shipped`, then `received`
- `CartItem.fulfillmentStatus = inEndUserShipment`

App actions:

- create the final-mile shipment using order or handoff snapshots
- assign packages to the shipment
- create or update the carrier order and external references
- consume external carrier updates without losing local state traceability
- write shipment and delivery tracking events

Clarifications:

- a carrier order is an external request aggregate, not the shipment itself
- multiple shipments may exist for one order or one cart lineage if the app permits splits

### 10. Delivery completion and commercial closure

Records created or updated:

- `Shipment`
- `Package`
- `PackageLotItem`
- `CartItem`
- `UserOrder`
- `CartItemTrackingEvent`
- `AuditLog`

Expected status changes:

- `Shipment.status = received`
- `Package.status = received`
- `PackageLotItem.status = received`
- `CartItem.fulfillmentStatus = delivered` when all surviving quantity is delivered
- `UserOrder.status = completed` when all included lines are successfully closed and no unresolved commercial issue remains

App actions:

- confirm delivery at shipment, package, and item-summary layers
- write final tracking events for delivery
- derive order completion from included items and commercial reconciliation state
- write audit entries for final completion or notable exceptions

Clarifications:

- `UserOrder.status = completed` is a commercial close state, not a detailed proof of fulfillment
- item and shipment lineage remain the operational source of truth even after order completion

## Normal Alternate Flows

### Cart is abandoned before checkout

Typical status changes:

- `Cart.status = abandoned`
- `CartItem.status` usually remains `inCart` until cleanup policy removes or archives it

App actions:

- detect inactivity according to product policy
- stop treating the cart as the active mutable cart
- decide whether cart items remain visible, restorable, or archived

### Cart or checkout is cancelled before submission

Typical status changes:

- `Cart.status = cancelled` or `aborted`
- affected `CartItem.status = dropped` if they never became submitted request lines

App actions:

- prevent `UserOrder` creation if submission did not happen
- release any temporary checkout reservations or payment intents
- write audit entries when cancellation is actor-driven or system-forced

### Payment fails before fulfillment starts

Typical status changes:

- `UserTransaction.status = failed`
- `UserOrder.status = failed` or remains `pending` if retry is allowed before failure is finalized
- `Cart.status` may remain `submitted` if the app supports retry against the same request lineage

App actions:

- decide whether the order may be retried, replaced, or cancelled
- prevent operational sourcing from starting if payment is a hard prerequisite
- ensure any retry does not duplicate `UserOrderItem` or fulfillment state accidentally

### Payment fails after some fulfillment work exists

Typical status changes:

- `UserTransaction.status = failed`
- `UserOrder.status = failed` or `cancelled` depending on business policy
- related `CartItem.fulfillmentStatus` may move to `cancelled` or `exception` depending on whether rollback is still possible

App actions:

- decide whether to halt future fulfillment only, or unwind active sourcing and logistics
- create audit records for the failure and operator decision
- if a refund or reversal is required later, create the corresponding financial state change rather than overwriting history

### Supplier rejects or cancels demand before packaging

Typical status changes:

- affected `LotItem.status = cancelled` or remains unresolved until reassigned
- `Lot.status` may remain active if other lines continue, or become `cancelled` if the whole lot is lost
- `CartItem.fulfillmentStatus` becomes `exception`, `partiallyRolledOver`, or `rolledOver` depending on remaining quantity

App actions:

- create `RollOver` records for lost quantity where the demand should continue later
- optionally create replacement lot allocation under a new or existing operation
- write tracking events that distinguish rejection from rebatched continuation

### Pre-allocation roll over

Definition:

- quantity drops out before it is allocated into `CartItemLotItem`

Typical status changes:

- create `RollOver(stage = preAllocation)`
- `RollOver.status = open`
- `CartItem.fulfillmentStatus = partiallyRolledOver` or `rolledOver`

App actions:

- record the dropped quantity explicitly
- keep remaining quantity in the current aggregation flow if only partial loss occurred
- rebatch or resolve the roll over through dedicated orchestration, not silent quantity mutation

### Post-allocation roll over

Definition:

- quantity drops out after it was already represented in supplier-facing allocation

Typical status changes:

- create `RollOver(stage = postAllocation)`
- reduce or cancel the affected allocation path according to app logic
- move the cart-item summary into `partiallyRolledOver`, `rolledOver`, or `exception`

App actions:

- preserve the original allocation history
- create new replacement allocations if rebatched
- avoid mutating old tracking lineage in place without a compensating event

### Partial fulfillment

Typical status changes:

- some quantity reaches `delivered`
- some quantity remains in `partiallyRolledOver`, `exception`, or later rebatched processing

App actions:

- compute summary state from quantity outcomes, not line existence alone
- keep quantity accounting explicit so operators can see how much was delivered versus deferred or lost
- do not mark the whole order complete until business policy for partial completion is satisfied

### Direct end-user delivery without warehouse stop

Typical status changes:

- no internal transfer shipment is created
- `CartItem.fulfillmentStatus` moves from `packaged` directly to `inEndUserShipment`, then `delivered`

App actions:

- explicitly evaluate whether local constraints or operational policy require warehouse routing
- create only the end-user shipment path when direct delivery is allowed

### Shipment or package is delayed or fails

Typical status changes:

- `Package.status = delayed` or `failed`
- `Shipment.status = delayed` or `failed`
- `CartItem.fulfillmentStatus = exception` unless a more specific summary is immediately derivable

App actions:

- write tracking events for the disruption
- decide whether to retry, replace, reroute, or roll over affected quantity
- preserve the failed path as history; do not overwrite it as if it never existed

### Refund after commercial failure or post-delivery issue

Typical status changes:

- `UserTransaction.status = refunded`
- `UserOrder.status = refunded`

App actions:

- record the refund as a separate state transition
- decide whether fulfillment history remains successful while the commercial result becomes refunded
- write audit entries for the refund decision and actor

### Chargeback after completed payment

Typical status changes:

- `UserTransaction.status = chargedBack`
- `UserOrder.status = chargedBack`

App actions:

- preserve the original completed payment attempt and record the chargeback as a separate state transition
- decide whether fulfillment continues, is halted, or requires an operator exception
- write audit entries for the chargeback evidence and operator decision

### Exception is resolved

Typical status changes:

- `CartItemTrackingEvent.eventType = exceptionResolved`
- `CartItem.fulfillmentStatus` returns to the summary implied by current detailed records

App actions:

- resolve the underlying operational cause first
- derive the new summary from actual lot, package, shipment, or rollover state
- avoid treating `exceptionResolved` as an endpoint by itself

## App-Layer Validation, Restrictions, and Required Invariants

This section is normative. The database alone does not enforce these rules.

### 1. Active and valid records must be filtered consistently

Required rules:

- every user-facing product query must filter out `deleted = true` records
- every operational selection of products, suppliers, carriers, brands, addresses, and terms must respect `active` flags where present
- temporal term selection must enforce `fromDate <= now` and `(toDate is null or toDate >= now)`
- overlapping active terms or constraints for the same scope must either be forbidden by application validation or resolved by explicit precedence rules

### 2. Quantity validity must be checked before persistence

Required rules:

- requested quantity must satisfy sell-side MOQ, step, and max rules from `ProductClientTerms`
- sourcing quantity must satisfy buy-side MOQ and supplier-term rules from `ProductSupplierTerms`
- quantity comparisons and arithmetic must use decimal-safe helpers
- zero or negative effective quantity must never be persisted in request, allocation, package, or roll-over rows unless a future schema change explicitly models that concept

### 3. Quantity conservation must hold across the whole lineage

Required rules:

- submitted `CartItem.quantity` is the starting requested quantity
- the surviving quantity represented by `CartItemLotItem` plus resolved cancellations and roll overs must never exceed the original request quantity
- the quantity represented by `PackageAllocation` must never exceed the quantity represented by its source `CartItemLotItem`
- the quantity represented by `PackageLotItem` allocations must never exceed the lot-item quantity that actually exists for packaging
- every compensation path must be explicit through new rows and events, not silent mutation that destroys historical traceability

Recommended implementation stance:

- enforce these checks inside transactional application services, not scattered controller code

### 4. Status transitions must be guarded

Required rules:

- statuses may only move through allowed workflow transitions
- terminal states must not become mutable again without an explicit compensating workflow
- aggregate statuses must not advance unless the detailed records justifying them already exist in the same transaction or guaranteed follow-up unit of work
- request-scope statuses and operational statuses must not be used interchangeably

Minimum transition expectations:

- `CartItem.status` should not move back from `submitted` to `inCart`
- `Cart.status` should not move from `submitted` back to editable states without an explicit recovery workflow
- `LotItem.status` should not reach `confirmed` unless the supplier-facing request exists
- `PackageLotItem.status` should not reach `shipped` without package-to-shipment assignment
- `CartItem.fulfillmentStatus = delivered` requires final shipment receipt evidence for the surviving quantity

### 5. Snapshots are mandatory at business boundaries

Required rules:

- checkout must snapshot billing and shipping address data into `UserOrder`
- order item creation must snapshot product and commercial pricing context into `UserOrderItem`
- cart creation or update must write enough product information into `CartItem.productSnapshot` for later user-facing continuity
- shipment creation must snapshot shipment destination/contact information if fulfillment depends on time-sensitive delivery context

### 6. Deletion and mutability must be controlled by the app

Required rules:

- do not physically delete historical commercial or operational records to represent cancellation
- use status changes, `active`, and `deleted` flags as the normal business-level visibility tools
- after a cart item is submitted, the original request row should become immutable except for allowed orchestration fields and summary updates
- after supplier confirmation, lot content should be treated as immutable except through explicit correction workflows

### 7. Payment and fulfillment gating must be explicit

Required rules:

- define whether sourcing can start before customer payment is completed
- define whether packaging can start before supplier confirmation is fully complete
- define whether end-user shipment can start before supplier-side finance is reconciled
- enforce those gates in orchestration services rather than assuming status coincidence will prevent invalid transitions

### 8. Concurrency and idempotency are required concerns

Required rules:

- checkout submission must be protected against duplicate order creation
- external callbacks from payment gateways, suppliers, and carriers must be idempotent
- allocation and rebatching logic must handle concurrent workers without double-allocating quantity
- only one authoritative workflow should advance the same aggregate status at a time

Recommended implementation stance:

- centralize status mutation in application services under `src/server/services/`
- use transaction boundaries around allocation, packaging, and status derivation

### 9. Tracking and audit writes are not optional side effects

Required rules:

- every meaningful cart-item fulfillment transition must create a `CartItemTrackingEvent`
- events must carry the actor source and actor reference where known
- `AuditLog` should capture before/after or at least actor/entity context for material state changes, especially actor-driven overrides and exception handling
- tracking and audit writes should happen in the same unit of work as the state transition when feasible

### 10. Address, contact, and locale validation live in application code

Required rules:

- validate postal code, region, and country structure in the app layer
- validate shipment contact completeness before dispatch
- validate that requested destination context is compatible with local constraints and delivery topology

## Schema Modeling Limits and Implicit Assumptions

These are current boundaries of the model and should be treated as explicit implementation considerations.

### 1. Some business structures intentionally remain flexible JSON

Current JSONB fields include:

- supplier address and contact information
- carrier address and contact information
- product local constraint value and scope
- snapshots across orders and shipments
- tracking metadata
- audit before/after payloads

Implication:

- the app must define validation schemas and versioning expectations around these structures

### 2. The schema does not implement a state machine

The schema stores state, but it does not enforce legal transitions.

Implication:

- a dedicated workflow or state-transition layer is required in `src/server/services/`

### 3. Foreign keys do not enforce workflow order

A relation existing does not mean the workflow is in a valid stage.

Examples:

- a shipment row can exist before packaging is complete
- a supplier transaction can exist before supplier confirmation
- a user transaction can exist without successful payment completion

Implication:

- orchestration code must enforce sequencing

### 4. Aggregate statuses are derived, not self-validating

Fields such as `CartItem.fulfillmentStatus`, `UserOrder.status`, `Package.status`, `Shipment.status`, `SupplierOrder.status`, and `CarrierOrder.status` summarize state but do not independently prove it.

Implication:

- implementers must always identify the lower-level records that justify the summary shown in the UI

### 5. The schema allows overlapping commercial history shapes the app must constrain

Examples:

- many carts per user are structurally possible
- many user orders per cart are structurally possible
- overlapping active term windows are structurally possible

Implication:

- the app must define acceptable multiplicity and reject unsupported overlaps

### 6. Manual order entry is intentionally out of scope

`UserOrderItem.sourceCartItemId` is required.

Implication:

- every commercial line must originate from a cart item under the current model

### 7. Inventory and stock reservation are not modeled directly

There is no standalone inventory, stock ledger, or reservation model in the current schema.

Implication:

- availability and reservation logic must either be inferred from sourcing/packaging state or added later as a new domain model

### 8. External integration lifecycle details are not fully modeled

`externalReference` exists for supplier and carrier orders, but retry history, sync timestamps, payload versions, and reconciliation state are not separately modeled.

Implication:

- the app must implement idempotent integration handling and decide where richer sync metadata lives

## First Implementation Checklist

The first application layer should implement these capabilities before feature work spreads across routes and components.

1. A central status-transition and orchestration layer under `src/server/services/`
2. Decimal-safe helpers for quantity and money comparisons
3. Shared query helpers for active, non-deleted, time-valid products and terms
4. Checkout submission service that creates `UserOrder`, `UserOrderItem`, snapshots, and initial tracking/audit records atomically
5. Allocation service for `Operation`, `Lot`, `LotItem`, and `CartItemLotItem`
6. Supplier request service that manages `SupplierOrder`, confirmation reconciliation, and supplier-side tracking
7. Packaging service that enforces quantity conservation across `PackageLotItem` and `PackageAllocation`
8. Shipment service for internal transfer and end-user delivery paths
9. Roll-over and rebatching service that preserves history instead of mutating it away
10. Tracking-event and audit-log writer utilities used by all orchestrators
11. Validation schemas for addresses, contact snapshots, local constraints, and integration payload metadata

## Implementation Stance to Keep Stable Early

Until the project adopts a more formal ADR process, the app should treat the following as stable working rules:

- one cart item stays the root traceability record for a customer request line
- aggregate statuses summarize state but never replace detailed lineage
- history is preserved through snapshots, tracking events, and explicit compensation records
- retries and recovery should create new records or explicit transitions, not rewrite the old path into invisibility
- fulfillment orchestration belongs in server-side services, not in controllers or UI code
