# Coco Fulfillment Context

This context describes the language for the customer-facing catalog and cart, plus customer demand aggregation, sourcing, packaging, shipping, and fulfillment traceability.

## Language

### Fulfillment and operations

**Customer request**:
The customer-facing demand captured before and during order submission.
_Avoid_: Order line, purchase line

**Payment attempt**:
A customer payment attempt tied to a commercial order. It can be pending, in process, completed, failed, cancelled, refunded, or charged back, and it is not an aggregation batch for fulfillment.
_Avoid_: Operation, payment operation

**Chargeback**:
A disputed or externally reversed customer payment after a completed payment attempt. It is distinct from a refund because it is not the platform's ordinary refund path.
_Avoid_: Refund, payment failure

**Operation**:
An aggregation batch for submitted customer demand.
_Avoid_: Job, run

**Lot**:
A supplier-scoped grouping of aggregated demand inside one operation.
_Avoid_: Batch, package

**Lot item**:
A supplier-facing requested line inside a lot.
_Avoid_: Package item, customer item

**Demand allocation**:
The quantity bridge that connects a customer request to a supplier-facing lot item.
_Avoid_: CartItemLotItem, customer item

**Package**:
A physical or logical package containing sourced quantity prepared for movement.
_Avoid_: Shipment, carrier order

**Package line**:
The quantity of a lot item represented inside a package.
_Avoid_: Lot item, package allocation

**Packaged allocation**:
The quantity bridge that connects a demand allocation to a package line.
_Avoid_: PackageAllocation, package line

**Shipment**:
A movement record for packages, either between internal locations or toward the end user.
_Avoid_: Package, carrier order

**Roll over**:
Quantity that dropped out of the current fulfillment path and must be rebatched or otherwise resolved.
_Avoid_: Remainder, leftover, silent quantity delta

**Fulfillment lineage**:
The traceable path of a customer request through aggregation, sourcing, packaging, shipment, and delivery.
_Avoid_: Order status, shipment status

**Operational state**:
The state that answers where demand is inside sourcing, packaging, shipment, and delivery.
_Avoid_: Commercial state, request state

**Operational diagnostic**:
A read-only signal with a stable code and severity that compares operational records, quantities, and statuses to reveal missing evidence or inconsistent fulfillment lineage.
_Avoid_: Correction, mutation, action

**Aggregate status**:
A summary status intended for display, backed by more detailed operational records.
_Avoid_: Source of truth, proof

### Catalog and cart (customer-facing)

**Catalog**:
The customer-facing set of purchasable products, each surfaced with its current client terms. Distinct from the internal admin Product record.
_Avoid_: Store, product list

**Client terms**:
The active customer-facing commercial terms for a product: minimum order quantity and its price, optional step and step price, optional reference price, currency, and validity window. The single price source for catalog and cart.
_Avoid_: Pricing, price terms

**MOQ (minimum order quantity)**:
The smallest purchasable quantity of a product and the unit in which demand is added; priced as a block by the client terms, with optional step increments above it.
_Avoid_: Minimum, batch size

**Mini-cart**:
The slide-over cart preview opened from the navbar and when adding a product. A quick view that complements, and never replaces, the full cart page.
_Avoid_: Cart drawer, cart popover

**Checkout**:
The customer-facing flow that turns an at-checkout cart into a submitted order plus a payment attempt: review the order, choose shipping address and payment method, accept terms, and pay. Single-currency, with prices and quantities snapshotted at confirmation while the cart stays the live source of truth until then.
_Avoid_: Order placement, purchase flow
