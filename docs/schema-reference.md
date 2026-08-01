# Schema Foundation Reference

> **Status:** updated 2026-07-27 against the implemented code. The original version of this
> document predated the application layer; every capability it demanded now exists. Where it
> used to prescribe, it now describes — and links the decision records that govern each rule.
>
> **Companion documents:**
> - `docs/fulfillment-reference.md` — the as-built fulfillment lifecycle: command surfaces, guards, and business rules per entity
> - `docs/tracking-architecture.md` — the event-driven tracking pipeline and status derivation
> - `CONTEXT.md` — the canonical domain language (Spanish UI labels included)
> - `docs/adr/` — the accepted architecture decision records (mapped in the final section)

This document is the implementation reference for the application domain defined in `prisma/schema.prisma`.

Its purpose is to turn the current Prisma schema into the canonical description of:

- the design philosophy behind the model
- the responsibilities of each model and relationship
- the primary and alternate information flows
- the meaning of each status layer and who owns it
- the application rules that exist outside the database, and where they are implemented
- the current modeling limits and assumptions that implementers must treat explicitly

When this document and the schema disagree, the schema is the structural source of truth and this document is the behavioral source of truth for the application layer. If either needs to change, both should be updated together.

## Scope

This reference covers domain modeling and workflow behavior derived from the schema.

It does not define:

- UI behavior
- API route shapes (see the router index in `docs/fulfillment-reference.md`)
- authorization policy details beyond what the data model implies
- background job topology (there is none in v1 — see `docs/tracking-architecture.md`)
- integration payload formats for suppliers, carriers, or external APIs

## Glossary

The authoritative glossary lives in `CONTEXT.md`. The terms used most in this document:

- Customer request: the user-facing demand captured by `Cart`, `CartItem`, `UserOrder`, and `UserOrderItem`
- Commercial state: the status that answers whether the customer order and payment lifecycle is pending, processing, completed, failed, cancelled, refunded, or charged back
- External payment: a payment attempt the platform never captures — the customer moves the money outside the app and an admin settles the attempt by hand (ADR 0010)
- Declared receipt: the transfer reference a customer reports for an external payment; a claim, not a settlement — the attempt stays pending until an admin confirms it (ADR 0010)
- Operational state: the status that answers where demand is inside sourcing, packaging, shipment, and delivery
- Aggregate status: a summary status for display, **recomputed from the live records that back it** (ADR 0002), never carried forward by events
- Snapshot: JSON data copied at the time of a meaningful business event so later mutations do not rewrite history
- Operation: an aggregation batch for submitted customer demand
- Operation draft: an operation created but not executed; holds parameters, the admin's omissions, and a fingerprint of the reviewed demand (ADR 0006). It materializes nothing and reserves no demand
- Lot: a supplier-scoped grouping of aggregated demand inside one operation
- Lot item: a supplier-facing requested line inside a lot
- Demand allocation: the `CartItemLotItem` quantity bridge from a customer request to a lot item
- Packaged allocation: the `PackageAllocation` quantity bridge from a demand allocation to a package line
- Package leg: the direction a package travels — `inbound` (supplier → destination) or `outbound` (destination → end user) (ADR 0004)
- Delivery mode: how an outbound package reaches its customer — home delivery, pickup point (both on an end-user shipment), or depot pickup (the absence of a shipment)
- Offer discount: the percentage on a client terms row that lowers what the customer actually pays; applied inside `calculateLineTotal` and nowhere else (ADR 0008)
- Offer price: the amount charged once the offer discount is applied — the same number in the catalog, the cart, the checkout snapshot and the payment, by construction
- Market price: the per-unit price other shops charge, loaded by an admin for comparison only; never billed
- Roll over: quantity that dropped out of the current fulfillment path and must be rebatched or otherwise resolved (ADR 0005)
- Demand conservation: the invariant that every unit of paid demand is always in exactly one active place or in an audited terminal resolution (ADR 0005)

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

This means the app is not a simple one-order-per-supplier checkout system. Aggregation, MOQ logic, supplier-term selection, and rebatching are core business behavior and live in the application layer (`src/server/services/operations/`, `src/server/services/admin/`).

### 3. Aggregate statuses are derived, never carried (ADR 0002)

Domain events are facts; summaries are recomputed. `CartItem.fulfillmentStatus` is derived from the item's live lineage records on every projection, and `UserOrder.status` completion/cancellation is rolled up the same way. No event "sets" a status; the records left behind justify it. This makes projection idempotent and order-independent by construction.

### 4. Demand conservation is the system invariant (ADR 0005)

Every unit of paid demand is, at all times, in exactly one active place — unallocated original demand, an open roll over, or a live allocation — or in an audited terminal resolution (cancelled / resolved). Every quantity-moving command preserves this inside its transaction; diagnostics watch it but never repair it. Quantity drops are first-class `RollOver` records, never silent deltas.

### 5. Historical truth is preserved with snapshots

Mutable reference data is not trusted to preserve history.

- `UserOrder.billingAddressSnapshot`, `UserOrder.shippingAddressSnapshot` (nullable), `UserOrder.termsSnapshot` + `acceptedTermsAt`
- `UserOrderItem.productSnapshot`, `UserOrderItem.priceSnapshot` (required)
- `CartItem.productSnapshot` (required)
- `Shipment.destinationAddressSnapshot`, `Shipment.destinationContactSnapshot` (nullable)
- `UserTransaction.requestSnapshot`, `UserTransaction.responseSnapshot` (payment gateway exchange)

The application creates these snapshots at the correct business moments and never recalculates old commercial or logistical records from current mutable tables.

### 6. Records survive; statuses move

Commercial and operational entities use `onDelete: Restrict` and are retired through status changes, not deletion. This extends beyond deletes: a cancelled lot item keeps its quantity, a fully absorbed allocation survives at quantity 0, a compensated operation cancels its outputs in place. Cancelling never zeroes quantity — the status filter is what removes a record from live computations, and the row remains as history for tracking references and diagnostics.

- Users are not deletable while their commercial history depends on them
- `active` and `deleted` are operational visibility flags, not substitutes for archival policy
- The two hard deletes in fulfillment (`operation.remove` on `failed`/`draft` childless rows, `carrierOrder.hardDelete` on `pending` childless rows) are guarded to be history-safe

### 7. Quantities and money are first-class business values

The schema standardizes:

- quantities on `Decimal(18,4)`
- money on `Decimal(18,2)`
- percentages on `Decimal(5,2)` (`ProductClientTerms.discountPercent`, constrained to `[0, 100)` by the app)
- explicit `Currency` (`ARS | USD | EUR | BRL`)

All quantity and pricing logic uses decimal-safe arithmetic (`Prisma.Decimal`). Floating-point math is not acceptable; fingerprints and event payloads serialize decimals as strings.

Sell-side money has exactly one producer: `calculateLineTotal` in `src/shared/common/commerce.helpers.ts`. The offer discount is applied there, so every consumer — catalog, client cart store, cart and checkout services, the Mercado Pago preference, the admin operations cart — agrees on the charged amount without coordinating (ADR 0008).

### 8. Tracking and auditing are separated by intent

- `CartItemTrackingEvent` records fulfillment history for a specific customer demand line — written **only** by the tracking module, fed by domain events through the outbox (`docs/tracking-architecture.md`)
- `AuditLog` records broader entity changes and actor context across the application — written directly by command services

Meaningful operational transitions produce both: domain events (which become tracking history) in the mutation's transaction, and an audit entry with effect summaries.

### 9. An operation is reviewed before it executes (ADR 0006)

Operations no longer execute on creation. A draft is created with its parameters, an admin reviews the live demand it would batch, marks omissions, and executes as a separate command that refuses (`CONFLICT`) if the effective demand no longer matches the reviewed fingerprint. Drafts reserve nothing; concurrency is safe by construction because whichever draft executes first takes the demand and the second one's fingerprint stops matching.

## Domain Map

### Identity and auth

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `User` | Core user identity | Has many `Session`, `Account`, `Cart`, `UserOrder`, `PaymentMethod`, `Address`, `AuditLog`, `CartItemTrackingEvent` | Also carries `role` (`user \| admin \| superadmin`), `active`, `deleted` |
| `Session` | Auth session | Belongs to `User` | Dependent auth data, safe to cascade |
| `Account` | Linked identity provider account | Belongs to `User` | Provider credentials and refresh data |
| `Verification` | Verification token/value records | Standalone | Auth support model |

### Customer profile and payment

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `Address` | User address book entry | Belongs to `User` | Never used directly as immutable order history; always snapshotted |
| `PaymentMethod` | Saved payment method | Belongs to `User`; referenced by `UserTransaction` | Historical payments remain attached even if method is later disabled |
| `PaymentProviderConfig` | Payment provider configuration | Standalone | One row per provider, keyed by the unique `provider` string, with `enabled` gating whether checkout offers it. `mercadopago` holds its mode (`sandbox \| production`) and credentials context (ADR 0001); `external` holds the bank-transfer data customers are shown — holder, bank, CBU, alias, tax id, instructions, `expiresInHours` — in `settings`, and leaves `mode` at its default because an external payment has no sandbox (ADR 0010) |
| `PaymentProviderEvent` | Inbound payment provider notification | Standalone (references by value) | Webhook ingestion record with status `received \| processed \| failed \| ignored \| rejected`; reconciliation input (ADR 0001) |

### Catalog, commercial pricing, and sourcing inputs

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `Brand` | Product brand metadata | Has many `Product` | Optional brand association |
| `Product` | Catalog item | Optional `Brand`; optional `defaultSupplier`; has many client terms, supplier terms, and local constraints; back-relation `homeOfferSpotlightOf` | `defaultSupplier` is a hint, not the only sourcing path. `homeOfferRank` (nullable, indexed) pins the product's position in the home offers grid; null means the automatic ranking decides |
| `Supplier` | Supplier master data | Has many `ProductSupplierTerms`, `Lot`, `SupplierOrder`; optional default relation from `Product` | Address/contact structures remain JSON for now |
| `ProductClientTerms` | Customer-facing sell terms | Belongs to `Product`; referenced by `CartItem` | Source of MOQ, step, max, price, currency, and the offer discount used at request time — see the pricing columns below |
| `ProductSupplierTerms` | Supplier-facing buy terms | Belongs to `Product` and `Supplier`; referenced by `LotItem` | Source of sourcing MOQ and buy-side price logic; still carries `refPrice` (see modeling limit 11) |
| `ProductLocalConstraints` | Context-sensitive restrictions | Belongs to `Product` | Flexible JSON-based rule container, interpreted in app code |
| `Destination` | Internal warehouse or operational destination | Referenced by `LotItem` and optionally by `Operation` | Not the same as the end-user address |
| `HomeOfferSettings` | Home offers curation singleton | Optional `spotlightProduct` relation to `Product` (`onDelete: SetNull`) | One row, `id = 1`, always read and written through an upsert; holds the spotlight pick, the ranking `criterion`, and `offersLimit` (default `4`) |

#### `ProductClientTerms` pricing columns

The row carries four money columns and one percentage, and only two of them ever reach a charge:

| Column | Type | Meaning | Enters `calculateLineTotal`? |
| --- | --- | --- | --- |
| `moqPrice` | `Decimal(18,2)`, required | Price of the whole MOQ block | Yes |
| `stepPrice` | `Decimal(18,2)`, nullable | Price of one step above the MOQ; required whenever `step` is set | Yes |
| `unitPrice` | `Decimal(18,2)`, nullable | **Coco's own** per-unit price, for display and comparison. Falls back to `moqPrice / moq` when absent | No — display only |
| `marketPrice` | `Decimal(18,2)`, nullable | The per-unit price other shops charge. An unverified admin claim, used to state what a customer saves | **No, ever** (ADR 0008) |
| `discountPercent` | `Decimal(5,2)`, nullable, `[0, 100)` | Discount off Coco's own price | Yes — applied to `moqPrice` **and** `stepPrice` alike |

`unitPrice` was named `refPrice` until 2026-07-31. It always meant Coco's per-unit price; the admin label "Precio de referencia" was the lie the rename fixes, and `marketPrice` now carries the reference-price meaning. Existing values carried over unchanged.

The discount is an attribute of the terms row, not a promotion entity (ADR 0008): it has no validity window of its own, does not stack, and needs no precedence rule — it is vigente exactly while its terms row is, and ending an offer is closing those terms. Discounting `stepPrice` too is deliberate: discounting only the MOQ block would make the marginal step cost more than the minimum.

### Customer request and commercial records

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `Cart` | Editable request container | Belongs to `User`; has many `CartItem`; can originate many `UserOrder` | Cart lifecycle stops at request submission |
| `CartItem` | Requested product line | Belongs to `Cart` and one `ProductClientTerms`; has many allocations, tracking events, roll overs, and `UserOrderItem` records | The root traceability record for a customer request line; keeps the initial product snapshot |
| `UserOrder` | Commercial order record | Belongs to `User` and `Cart`; has many `UserOrderItem` and `UserTransaction` | Holds address and terms snapshots; closure is derived (ADR 0002) |
| `UserOrderItem` | Commercial order line | Belongs to `UserOrder`; must reference `sourceCartItem` | Manual order lines are out of scope |
| `UserTransaction` | Customer payment record | Belongs to `UserOrder` and `PaymentMethod` | Payment lifecycle is separate from fulfillment lifecycle; carries gateway request/response snapshots and, for external payments, the declared-receipt columns below (ADR 0010) |

#### `UserTransaction` external-payment columns

An attempt with `provider = "external"` has no gateway to ask: the customer moves the money outside the app and an admin settles the attempt by hand (ADR 0010). Two nullable columns record what the customer claims, and neither moves `status` on its own:

| Column | Type | Meaning | Written by |
| --- | --- | --- | --- |
| `declaredReceiptReference` | `Text`, nullable | The transfer reference the customer reports — a **declared receipt**, an unverified claim | The customer, from `/my-orders/[orderId]`; re-declarable while the attempt is still pending |
| `declaredReceiptAt` | `DateTime`, nullable | When that claim was last made | The same write |

They live as columns rather than inside `requestSnapshot` because a snapshot is an immutable record of creation time, and a declaration arrives later.

While the attempt is `pending`, `providerStatus` walks `awaiting_transfer → receipt_declared`, and `expiresAt` comes from the provider config's `expiresInHours`, so an unpaid transfer becomes a spent attempt that re-confirming replaces. Only the admin actions in `/admin/payments` end it, both audited: settling writes `externalTransactionId` with the verified reference, `providerStatus = settled_manually`, `completedAt` and an actor-stamped `responseSnapshot`, then runs the same `submitOrderForCompletedPayment` transition the Mercado Pago webhook runs; rejecting writes `status = failed` with `failureCode = external_rejected` and the reason, and fails the order.

### Aggregation, sourcing, and rebatching

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `Operation` | Aggregation batch | Has many `Lot`, `RollOver`, and tracking events; back-relation `rebatchedRollOvers` for roll overs it consumed | Carries live counters (`eligible/assigned/rollOver` quantities and counts, `lotCount`, `supplierOrderCount`), the immutable execution `summary`, and `reviewState` (draft omissions + approved fingerprint, ADR 0006) |
| `Lot` | Supplier-scoped group inside one operation | Belongs to `Operation` and `Supplier`; optionally linked to `SupplierOrder`; has many `LotItem` | Statuses cascade from supplier-order commands and are never edited directly (ADR 0003) |
| `LotItem` | Supplier-facing requested line | Belongs to `Lot`, `Destination`, and `ProductSupplierTerms` | The primary unit of supplier request quantity |
| `CartItemLotItem` | Demand allocation | Joins `CartItem` and `LotItem` with quantity | First conservation checkpoint; survives at quantity 0 when fully absorbed |
| `RollOver` | Quantity removed from current path | Belongs to `CartItem` and the `Operation` that created it; `rebatchedIntoOperationId` back-links the operation that consumed it | Stage `preAllocation \| postAllocation`; status ladder in ADR 0005 |
| `SupplierOrder` | Outbound supplier request | Belongs to `Supplier`; has many `Lot` and `SupplierTransaction` | The command aggregate of the supplier loop (ADR 0003); owns `externalReference` and `requestedAt/confirmedAt/cancelledAt` |
| `SupplierTransaction` | Supplier payment record | Belongs to `SupplierOrder` | Finance and sourcing remain decoupled |

### Packaging and logistics

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `Package` | Physical package | Optional `Shipment`; has many `PackageLotItem`; carries `leg` (`inbound \| outbound`) | Always represents a real physical bundle (ADR 0004); granularity is an operational choice with a consolidated default |
| `PackageLotItem` | Lot-item quantity inside a package | Joins `Package` and `LotItem`; has many `PackageAllocation` | The package-line scope; unique on `(packageId, lotItemId)` |
| `PackageAllocation` | Packaged allocation | Joins `CartItemLotItem` and `PackageLotItem` with quantity | Second conservation checkpoint, checked **per leg** (ADR 0004) |
| `Shipment` | Movement record | Optional `CarrierOrder`; has many `Package`; carries `type` and `deliveryMode` | `deliveryMode` (`homeDelivery \| pickupPoint`) is only meaningful on `endUserDelivery`; depot pickup is deliberately the absence of a shipment |
| `Carrier` | Carrier master data | Has many `CarrierOrder` | JSON address/contact remain flexible for now |
| `CarrierOrder` | Carrier booking | Belongs to `Carrier`; has many `Shipment`; soft-delete flag `deleted` | Records the contracting, never the goods; publishes no fulfillment fact of its own |

### Tracking, audit, events, and channels

| Model | Role | Key relationships | Notes |
| --- | --- | --- | --- |
| `DomainEventOutbox` | Durable domain event log | Standalone (`cuid` string PK) | The transactional outbox behind all tracking writes; unique `eventKey`, status `pending \| processing \| processed \| failed` |
| `CartItemTrackingEvent` | Fulfillment history event | Must belong to `CartItem`; may point to actor, operation, lot lineage, package, shipment, or roll over | Canonical event stream; runtime writes only through `TrackingEventService`; unique nullable `eventKey` |
| `AuditLog` | Generic audit trail | Optional relation to `User`; generic entity references | Records actor and before/after context beyond fulfillment events |
| `Channel` | Communication or outbound integration channel | Standalone | Present in schema but not part of the modeled fulfillment path |

### Relationship chain that matters most

The critical end-to-end lineage for a fulfilled request is:

`User -> Cart -> CartItem -> UserOrder -> UserOrderItem -> Operation -> Lot -> LotItem -> CartItemLotItem -> PackageAllocation -> PackageLotItem -> Package -> Shipment`

Supporting relationships that shape behavior around that chain are:

- `CartItem -> ProductClientTerms -> Product`
- `LotItem -> ProductSupplierTerms -> Supplier`
- `Lot -> SupplierOrder`
- `Shipment -> CarrierOrder -> Carrier`
- `CartItem -> RollOver` (and `RollOver -> rebatchedIntoOperation`)
- `CartItem -> CartItemTrackingEvent`
- `UserOrder -> UserTransaction -> PaymentMethod`

## Status Architecture

### Status layers

| Enum | Scope | Purpose | Aggregate or detailed | Owner (as implemented) |
| --- | --- | --- | --- | --- |
| `CartStatus` | Cart | Request lifecycle from drafting through checkout submission | Aggregate request summary | Cart/checkout services (`src/server/services/{cart,checkout}/`) |
| `CartItemStatus` | Cart item | Whether the request line is still mutable, submitted, dropped, or cancelled | Detailed request state | Cart/checkout services and admin operations cart |
| `CartItemFulfillmentStatus` | Cart item | User/admin-facing fulfillment summary after submission | Aggregate fulfillment summary | **Derived** by `TrackingStatusProjector` from live lineage (ADR 0002); creation paths seed `awaitingAggregation` only |
| `UserOrderStatus` | User order | Commercial summary across payment and fulfillment | Aggregate commercial summary | Co-owned: payment services write payment outcomes; `UserOrderClosureProjector` derives `completed`/`cancelled` only from `processing` (ADR 0002) |
| `UserTransactionStatus` | User payment | Payment processing lifecycle | Detailed payment state | Mercado Pago reconciliation (ADR 0001) |
| `PaymentProviderEventStatus` | Provider webhook | Ingestion lifecycle of an inbound provider notification | Detailed integration state | Payment webhook/reconciliation services |
| `OperationStatus` | Operation | Execution lifecycle of an aggregation batch: `draft \| running \| completed \| failed \| cancelled` | Technical execution state, not business outcome | Operation service; `draft` per ADR 0006, `cancelled` = compensated |
| `LotStatus` | Lot | Aggregate sourcing progress for a supplier-scoped lot | Aggregate operational summary | Cascaded from supplier-order and packaging commands; never edited directly (ADR 0003) |
| `LotItemStatus` | Lot item | Supplier-facing line progress | Detailed operational state | Cascaded from supplier-order and packaging commands (ADR 0003) |
| `SupplierOrderStatus` | Supplier order | Outbound supplier-order state | Aggregate operational summary | `supplier-order.service.ts` commands via the shared ladder |
| `SupplierTransactionStatus` | Supplier payment | Supplier payment lifecycle | Detailed finance state | Finance layer (not yet commanded) |
| `PackageStatus` | Package | Package state across both legs | Aggregate operational summary | `package.service.ts` and shipment cascades via the shared ladder |
| `PackageLotItemStatus` | Package lot item | Line-level packaging and receipt state | Detailed operational state | Packaging/shipment commands |
| `ShipmentStatus` | Shipment | Shipment preparation and movement state | Aggregate operational summary | `shipment.service.ts` commands via the shared ladder |
| `CarrierOrderStatus` | Carrier order | Carrier booking state | Aggregate booking state | `carrier-order.service.ts` guarded ladder; nothing derives from it |
| `RollOverStage` | Roll over | Whether loss occurred before or after supplier-facing allocation | Classification value | Set at creation, immutable |
| `RollOverStatus` | Roll over | Lifecycle of the roll over record: `open \| rebatched \| resolved \| cancelled` | Detailed remediation state | Execution (`rebatched`), admin resolve, cascade cancellation (ADR 0005) |
| `PackageLeg` | Package | Direction of physical travel: `inbound \| outbound` | Classification value | Set at creation; flipped only by promotion (ADR 0004) |
| `DeliveryMode` | Shipment | `homeDelivery \| pickupPoint`; null on internal transfers | Classification value | Set at end-user shipment creation; depot pickup is deliberately not a value |
| `HomeOffersCriterion` | Home offer settings | How the automatic offers ranking sorts: `marketSaving \| discountPercent` | Configuration value, not a lifecycle | Admin, through the home offers section |
| `DomainEventOutboxStatus` | Outbox row | Dispatch lifecycle of a durable domain event | Infrastructure state | `DomainEventDispatcher` |

### Legal transitions live in one shared module

The schema stores state; the legal moves live in `src/shared/common/fulfillment-transitions.ts` as declarative ladders (`supplierOrderTransitions`, `lotTransitions`, `lotItemTransitions`, `packageTransitions`, `shipmentTransitions`, `carrierOrderTransitions`), aggregate↔lines compatibility tables, and per-entity `availableActions` matrices. The same data is consumed by:

- **services** — every status command guards with `isLegalTransition` before mutating
- **diagnostics** — the six `calculate*Diagnostics` modules monitor aggregate-vs-lines compatibility and conservation
- **UI** — list/detail responses carry server-computed `availableActions` (every command key on every call, disabled entries with a Spanish reason); the client renders them and re-derives nothing

### Status values no runtime command produces

Eight enum values are modelled but never written by any command; they exist as schema defaults or declared ladder entries only. Do not build fixtures or logic that depend on them being reachable:

- `LotStatus.pending` — execution creates lots at `assembling`
- `PackageStatus.pending`, `PackageStatus.packing` — every package factory starts at `readyForShipment`
- `PackageLotItemStatus.pending`, `PackageLotItemStatus.packing` — package lines start at `packed`
- `ShipmentStatus.pending`, `ShipmentStatus.preparing` — every shipment starts at `readyForDispatch`
- `ShipmentStatus.cancelled` — there is no `shipment.cancel` command

Note the schema `@default` values (`Package.status = pending`, `Shipment.status = pending`, `Lot.status = pending`, `Operation.status = running`) are **not** what runtime code writes — commands always pass their creation status explicitly.

### Aggregate status source-of-truth rules

Aggregate statuses are summaries. They are never the only evidence that an operational step happened: an aggregate status change must be backed by the detailed records that justify it, and for `CartItem.fulfillmentStatus` that backing is structural — the projector recomputes it from the records on every projection (ADR 0002).

#### `CartItemFulfillmentStatus`

The primary user/admin summary for one requested line after submission. Written only by:

- creation/submission seeds (`awaitingAggregation`): cart item creation, checkout submission, payment reconciliation
- `TrackingStatusProjector` for everything else, deriving from the live lineage snapshot

Derivation precedence (full detail in `docs/tracking-architecture.md`):

1. cart item deleted or `status = cancelled` → `cancelled`
2. live packaged allocation whose package **or** shipment is `delayed`/`failed` → `exception`
3. nothing live, no open roll over, ≥1 resolved roll over → `cancelled` (resolving is terminal, ADR 0005)
4. open roll over quantity with no live allocation → `rolledOver`; with live progress below `packaged` → `partiallyRolledOver`
5. otherwise the furthest stage backed by a record: `delivered` ← `inEndUserShipment` ← `atWarehouse` ← `inInternalShipment` ← `packaged` ← `supplierConfirmed` ← `requestedFromSupplier` ← `allocatedToSupplierItem` ← `includedInOperation` ← `awaitingAggregation`

Value semantics:

- `awaitingAggregation`: submitted and not yet materially placed into an active sourcing path (also the floor a fully compensated item returns to)
- `includedInOperation`: assigned to an `Operation`, surviving quantity not yet fully represented by `CartItemLotItem`
- `allocatedToSupplierItem`: surviving quantity allocated to lot items through `CartItemLotItem`
- `requestedFromSupplier`: the corresponding supplier order was requested
- `supplierConfirmed`: supplier-confirmed sourcing state exists for the corresponding lot items
- `packaged`: surviving quantity covered by live inbound package allocations, before the shipment departs
- `inInternalShipment`: quantity moving on an `internalTransfer` shipment
- `atWarehouse`: internal transfer received, or outbound package exists but has not departed
- `inEndUserShipment`: quantity moving on an `endUserDelivery` shipment — including a pickup-point shipment that already arrived but whose package was not collected yet
- `delivered`: the **package's own** `received` status records the handover (a pickup-point shipment arriving does not deliver its packages)
- `partiallyRolledOver` / `rolledOver`: open roll over overlay as above; from `packaged` onward the stage ladder outranks an open roll over, which surfaces as a journey notice and a diagnostic instead
- `cancelled`: demand cancelled, or terminally resolved without delivery
- `exception`: live delayed/failed package or shipment touching live quantity; clears by derivation when records recover

#### `UserOrderStatus`

A commercial summary co-owned by two writers:

- the payment domain (checkout, Mercado Pago reconciliation) writes `pending`, `processing`, `failed`, `refunded`, `chargedBack`
- `UserOrderClosureProjector` derives closure **only from `processing`**: all items terminal (`delivered`/`cancelled`) ∧ ≥1 delivered → `completed`; all cancelled → `cancelled`; anything else → no write. `rolledOver` is deliberately not terminal

The `processing`-only gate is enforced in the pure rule and in the SQL `where`, so the roll-up is structurally unable to downgrade a payment outcome.

#### `PackageStatus` and `ShipmentStatus`

Aggregate movement state, commanded through the shared ladders. They must not contradict their lines: the compatibility tables in `fulfillment-transitions.ts` define which line statuses each aggregate status tolerates, and diagnostics report violations. A delivered `pickupPoint` shipment legitimately holds `inTransit` packages until each customer collects — that shape is exempted from the received-row diagnostics and reported as `shipment.pickupPoint.pendingCollection` instead.

#### `SupplierOrderStatus` and `CarrierOrderStatus`

External aggregate request state.

- They summarize the outbound request lifecycle for the supplier or carrier relationship
- They do not replace `LotItemStatus` or `ShipmentStatus`
- A confirmed supplier order does not mean every lot item is complete
- A carrier order records the contracting only; no customer-facing state derives from it, which is why its rules are warnings and it publishes no domain events

## Primary End-to-End Flow

The primary path below is the common successful case, as implemented. Every step names its commands; guards and quantity semantics are detailed in `docs/fulfillment-reference.md`.

### 1. Catalog selection and request eligibility

Records in play: `Product`, `ProductClientTerms`, `ProductSupplierTerms`, `ProductLocalConstraints`, `Supplier`, `HomeOfferSettings`.

App behavior (`src/server/services/catalog/`, `src/server/services/home/`):

- resolve the active `ProductClientTerms` for the customer context (active, non-deleted, time-valid)
- evaluate `ProductLocalConstraints` against destination, timing, quantity, and legal context
- calculate display price and allowed quantity increments from MOQ, step, max, and currency, with `discountPercent` already applied
- compose the home: products pinned by `Product.homeOfferRank` first, the rest ordered by the `HomeOfferSettings.criterion` ranking, the spotlight lifted out of the grid, truncated to `offersLimit`

Clarifications:

- `defaultSupplierId` on `Product` is only a hint; sourcing chooses through `ProductSupplierTerms`
- overlapping active terms are structurally possible and treated as an application error
- a pinned product whose terms are no longer current renders nothing; composition skips it silently and the ranking fills the slot
- the market comparison is presented separately from the struck-through pre-discount price — `marketPrice` is a claim about another shop, never a price Coco charged

### 2. Cart creation and cart-item mutation

Records: `Cart`, `CartItem` (`src/server/services/cart/`).

- `Cart.status = draft` → `pending` once associated with the user and active
- `CartItem.status = inCart`, `fulfillmentStatus = awaitingAggregation` (not operationally meaningful until submission)
- quantity validity enforced against client MOQ, step, and max
- `CartItem.productSnapshot` written at creation

### 3. Checkout start and order materialization

Records: `Cart`, `UserOrder`, `UserOrderItem`, `UserTransaction` (`src/server/services/checkout/`).

- `Cart.status` moves `pending → atCheckout`
- checkout start creates `UserOrder(pending)` with billing/shipping/terms snapshots, `UserOrderItem` rows frozen from cart items, and the payment attempt
- `confirmAndPay` creates the Mercado Pago Checkout Pro preference and redirects (ADR 0001)
- with the external payment option, `confirmAndPay` instead leaves the attempt `pending` with `provider = "external"` and an `expiresAt`, and returns the transfer instructions — no redirect, no gateway call (ADR 0010)

### 4. Payment reconciliation gates fulfillment (ADR 0001)

Records: `UserTransaction`, `UserOrder`, `PaymentProviderEvent`, `Cart`, `CartItem`.

The final payment result is reconciled through signed webhooks followed by a Mercado Pago resource lookup — redirect query parameters are never payment truth. On approval, in one transaction:

- `UserTransaction.status = completed`
- `CartItem.status = submitted`, `fulfillmentStatus` seeded `awaitingAggregation`
- `Cart.status = submitted`
- `UserOrder.status = processing`
- one `cart.item.submittedToOrder` domain event per cart item; `DomainEventDispatcher.wake()` after commit

Payment-before-fulfillment is therefore explicit: demand only becomes aggregable once its submission events exist.

An external payment reaches that same transaction through the admin settle action instead of a webhook — the transition, the events and the `DomainEventDispatcher.wake()` after commit are identical, only the trigger is administrative (ADR 0010). A declared receipt is not that trigger.

### 5. Aggregation: draft, review, execute (ADR 0006)

Records: `Operation`, then on execution `Lot`, `LotItem`, `CartItemLotItem`, `RollOver`, `SupplierOrder`.

Commands (`admin.operation`):

- `createDraft` — creates `Operation(status = draft)` with its parameters (`from`/`to` window, `includeRollOver` defaulting `true` per ADR 0005, strategy, destination). Drafts materialize nothing and reserve no demand
- `review` — recomputes the live demand the draft would batch (original demand plus open roll overs), applies the stored omissions, and returns rows, groups, totals, and the **fingerprint** of the effective set (sha256 over sorted `sourceKey:quantity` lines)
- `updateDraft` — edits parameters and omissions; omissions are stored as source keys **and** user ids in `Operation.reviewState`, and pruned (with an explicit report) when the window changes
- `execute {id, fingerprint}` — in one serializable transaction: recompute demand, apply omissions, **refuse with `CONFLICT` if the fingerprint no longer matches** (the draft survives untouched and the diff is handed back), otherwise materialize:
  - `SupplierOrder(pending)` per supplier, `Lot(assembling)`, `LotItem(pending)` — one lot per supplier order in the executed shape
  - `CartItemLotItem` allocations for assignable quantity
  - `RollOver(preAllocation, open)` for demand that could not be assigned
  - consumed open roll overs marked `rebatched` with the `rebatchedIntoOperationId` back-link
  - live counters computed; `summary` frozen; `reviewState.approved` stamped
  - events `operation.cartItem.included`, `operation.cartItem.allocatedToLotItem`, `rollover.preAllocation.created`; `wake()` after commit

Cart items derive `includedInOperation` → `allocatedToSupplierItem`. An omission writes nothing onto the demand — omitted quantity stays exactly where it was and re-enters the next aggregation (conservation holds without a compensating record).

### 6. Supplier loop: request and confirmation (ADR 0003)

Records: `SupplierOrder`, `Lot`, `LotItem`, `RollOver` (`admin.supplierOrder`).

- `request` — `pending → requested` (+ `requestedAt`, optional `externalReference`), cascading lots `assembling → requested` and lot items `pending → requested`; requires every lot's operation `completed`. Items derive `requestedFromSupplier`
- `confirm` — `requested → confirmed`, with per-line confirmed quantities covering **every** live line exactly once:
  - full confirmation: statuses only
  - partial: the cut is absorbed onto specific demand allocations, LIFO by payment date (manual overrides replace LIFO entirely); `LotItem.quantity` reduced; one `RollOver(postAllocation, open)` per reduction
  - zero: line `cancelled`, full roll over, quantities kept as history
  - operation live counters recomputed in-transaction; cut items derive `partiallyRolledOver`/`rolledOver`, surviving quantity `supplierConfirmed`

### 7. Goods inbound: dispatch registration and receipt (ADR 0004)

Records: `Shipment(internalTransfer)`, `Package(leg = inbound)`, `PackageLotItem`, `PackageAllocation`, `RollOver`.

- `supplierOrder.registerDispatch` — from `confirmed` or `readyForReceipt` (partial dispatches are first-class): creates the internal shipment at `readyForDispatch` and one consolidated inbound package at `readyForShipment`, with lines at `packed` and FIFO-by-payment-date packaged coverage. Items derive `packaged`. Registration and departure are deliberately two steps
- `shipment.dispatch` — `readyForDispatch → inTransit`, packages → `inTransit`, lines → `shipped`; items derive `inInternalShipment`
- `shipment.receive` — records actual per-line quantities:
  - full: statuses to `received`
  - shortfall (receipt discrepancy): four reductions (`PackageAllocation → CartItemLotItem → PackageLotItem → LotItem`) plus a `RollOver(postAllocation)` per cut, mandatory reason
  - a supplier order closes (→ `completed`, lots/lot items → `readyForPackaging`) when nothing is outstanding and every live inbound line sits on a received package; `final: true` abandons a remainder explicitly
  - items derive `atWarehouse`

### 8. Outbound packaging: fractionation (ADR 0004)

Records: `Package(leg = outbound)`, `PackageLotItem`, `PackageAllocation` (`admin.package`).

- `fractionate` — over a selection of received inbound packages, creates one outbound package per customer (`readyForShipment`), partial and incremental; sources are never mutated — they stay `received` as arrival history. Conservation is per leg: outbound allocations may never exceed received inbound coverage of the same demand
- `promote` — a mono-customer inbound package flips leg and resets `received → readyForShipment`, preserving physical identity
- `split` — re-groups quantity across sibling packages so records match real bundles; moves quantity, never loses it
- lot roll-up: lot items and lots reach `completed` when every demand allocation is fully fractionated
- items still derive `atWarehouse` — nothing is delivered before it leaves

### 9. Delivery: three modes

Records: `Shipment(endUserDelivery, deliveryMode)`, `Package`, `CarrierOrder` optionally (`admin.shipment`, `admin.package`).

- **Home delivery** — `shipment.createEndUser({deliveryMode: homeDelivery})` claims outbound packages (exactly one customer per shipment); `dispatch` → items derive `inEndUserShipment`; `deliver` cascades shipment, packages, and lines to `received` → `delivered`
- **Pickup point** — same construction with `pickupPoint`, multi-customer allowed; `deliver` marks **only the shipment** `received` (arrival is not a handover — packages stay `inTransit`, items stay `inEndUserShipment` with a "Disponible para retirar" notice) and each customer's `package.confirmDelivery` produces `delivered`
- **Depot pickup** — no shipment at all (that absence *is* the mode): `package.confirmDelivery` on the never-shipped outbound package moves `readyForShipment → received` → `delivered`

Delivery confirmation is per package: automatic only for home delivery, explicit for the other two modes.

### 10. Commercial closure (ADR 0002)

After every projection, `UserOrderClosureProjector` re-derives closure per affected order: all items terminal ∧ ≥1 delivered → `completed`; all cancelled → `cancelled`; otherwise no write, and only ever from `processing`. Item and shipment lineage remain the operational source of truth after closure.

## Normal Alternate Flows

### Cart is abandoned or cancelled before submission

- `Cart.status = abandoned` (inactivity) or `cancelled`/`aborted`; items not submitted become `dropped`
- no `UserOrder` processing continues; payment intents are not reconciled into submission

### Payment fails, is refunded, or charged back

- `UserTransaction.status = failed | refunded | chargedBack`, mirrored on `UserOrder` by the payment services
- fulfillment never starts for unpaid demand (step 4 gates it); post-fulfillment refund/chargeback is a commercial state change that preserves fulfillment history
- the closure projector cannot touch these outcomes — its source set is `processing` only

### External payment waits for an admin decision

- the attempt stays `pending` with `provider = "external"` and its `expiresAt` while the customer transfers the money; the order stays `pending` and the cart stays `atCheckout`
- the customer may declare a receipt reference (and correct it) from the order detail; nothing about the attempt's status changes
- the admin settles (order → `processing`, demand submitted) or rejects (attempt and order → `failed`) from `/admin/payments`; leaving checkout is refused once a receipt has been declared (ADR 0010)
- an expired attempt nobody settled is simply spent: re-confirming mints a new one

### Supplier cuts or cancels demand (post-allocation roll over)

- `supplierOrder.confirm` with partial/zero lines, `cancel`, or `cancelLine` (both refuse once live inbound packaged quantity exists — write-off is the way out)
- every cut is a `RollOver(postAllocation, open)` with a mandatory reason; affected items derive `partiallyRolledOver`, `rolledOver`, or keep progressing on the surviving quantity
- open roll overs re-enter the next aggregation by default (`includeRollOver: true`, ADR 0005)

### Receipt discrepancy

- `shipment.receive` with received < declared: the shortfall is absorbed onto specific demand allocations and becomes a post-allocation roll over — never a silent delta

### Disruption, retry, write-off, recovery

- `markDelayed`/`markFailed` exist at both shipment and package level; affected items derive `exception`
- a failed shipment's follow-up is `retry` (packages reassigned to a new shipment, identity preserved) or `package.writeOff` (the four reductions + roll over; a fully written-off package becomes `cancelled`)
- a delayed package that turns up is `package.recover` — the target is derived from the record (not departed → `readyForShipment`; travelling → `inTransit`); refused while the shipment itself is disrupted
- exceptions are a derived condition, not a table: derivation clears them when the records recover

### Roll over resolution

- `rollOver.resolve` (mandatory reason) settles an open roll over outside re-aggregation: terminal, moves no money (ADR 0005)
- an item left with nothing live, no open roll over, and a resolved one derives `cancelled` ("Resuelto sin entrega"), which lets its order close

### Operation compensation and re-run

- `operation.cancel` exists only inside the **administrative window** (every live supplier order still `pending`). Compensation is status-only, nothing is deleted: lot items/lots/supplier orders → `cancelled`, own open roll overs → `cancelled`, consumed roll overs revert `rebatched → open` via the back-link, counters recomputed, one `operation.cartItem.excluded` per item carrying the same quantity its inclusion carried. Demand re-enters aggregation exactly (ADR 0005)
- `operation.rerun` — one command, three paths by status: `failed` re-executes in place; `completed` compensates then creates and executes a new operation (same window rule); `cancelled` creates and executes only. Atomic: a failed re-run rolls back its compensation
- `operation.remove` — hard delete for `failed` or `draft` operations with no children

### Partial fulfillment

- summary state is computed from quantity outcomes, not line existence: some quantity can be `delivered` while the cut remainder lives in an open or resolved roll over
- from `packaged` onward the stage ladder outranks an open roll over, so a partially cut order can still reach `delivered` and close; the open roll over stays visible as a notice and a diagnostic

### Direct delivery without warehouse stop

The modeled flow always passes through the inbound leg (supplier dispatch → receipt → fractionation/promotion). Depot pickup and promotion cover the "supplier already packed per customer" case; a true supplier-to-customer drop shipment is not modeled.

## App-Layer Validation, Restrictions, and Required Invariants

This section is normative, and each rule now names its implementation. The database alone does not enforce these rules.

### 1. Active and valid records are filtered consistently

- user-facing queries filter `deleted = true` and respect `active` flags
- temporal term selection enforces `fromDate <= now` and `(toDate is null or toDate >= now)`
- implemented by the shared helpers in `src/server/services/_base/terms-validity.ts` and the query builders per service

### 2. Quantity validity is checked before persistence

- sell-side MOQ/step/max from `ProductClientTerms` at cart time; buy-side rules from `ProductSupplierTerms` at aggregation time
- decimal-safe helpers everywhere (`Prisma.Decimal`); zero or negative effective quantity is never persisted as live state (quantity-0 allocations survive only as absorbed history)
- sell-side line money — offer discount included — is produced only by `calculateLineTotal`; no caller re-applies the discount and no caller builds its own terms literal (ADR 0008)
- `discountPercent` is validated into `[0, 100)` by the admin Zod schema; the database only constrains its precision

### 3. Quantity conservation holds across the whole lineage (ADR 0005)

- surviving allocated quantity plus roll overs and terminal resolutions never exceeds the original request
- packaged allocations never exceed their demand allocation, **checked per leg** (ADR 0004); outbound coverage never exceeds received inbound coverage
- every compensation path is explicit rows and events, never silent mutation
- implemented inside the transactional commands via the pure planners (`supplier-order-absorption.ts`, `package-allocation-planner.ts`, `packaged-shortfall.ts`, `package-fractionation.ts`, `operation-compensation.ts`); watched by the diagnostics modules; asserted end-to-end by `pnpm fulfillment:e2e` and `pnpm db:seed-verify`

### 4. Status transitions are guarded

- statuses move only through the declarative ladders in `src/shared/common/fulfillment-transitions.ts`; terminal states do not become mutable again without an explicit compensating workflow
- aggregate statuses never advance without the backing records in the same transaction — and `CartItem.fulfillmentStatus` cannot, because it is derived (ADR 0002)
- `CartItem.status` never moves back from `submitted` to `inCart`; submitted carts do not silently become editable

### 5. Snapshots are mandatory at business boundaries

- checkout snapshots billing/shipping addresses and accepted terms into `UserOrder`; order items freeze product and price; cart items freeze request-time product data; shipments snapshot destination/contact
- payment attempts persist gateway request/response snapshots (ADR 0001)

### 6. Deletion and mutability are controlled by the app

- cancellation is a status change; records survive with their quantities as history
- after submission the request row is immutable except through admin operations-cart commands, which publish compensating events
- after supplier confirmation lot content changes only through explicit commands (cuts, discrepancies, write-offs) that mint roll overs

### 7. Payment and fulfillment gating is explicit

- sourcing starts only after payment reconciliation submits the demand (step 4); for an external payment the submitting act is the admin settlement, never the customer's declared receipt (ADR 0010)
- packaging starts only from `confirmed`/`readyForReceipt` supplier orders; requesting requires the operation `completed`
- gates live in the command guards, not in status coincidence

### 8. Concurrency and idempotency are required concerns

- the thirteen quantity-moving commands run through `runSerializable` (`admin/_base/serializable-transaction.ts`) — the only place `Serializable` isolation is requested — with a bounded retry on serialization failures (P2034 / SQLSTATE 40001); callbacks read their state inside the transaction so a retry re-plans
- external callbacks (payment webhooks) are idempotent through `PaymentProviderEvent` and deterministic reconciliation
- domain events and tracking rows are idempotent by deterministic `eventKey` at both layers
- draft execution is safe under concurrency by fingerprint refusal, not by locks (ADR 0006)
- the interactive-transaction timeout is raised in `src/server/db.ts` — the default 5s aborted real multi-round-trip commands against a remote database

### 9. Tracking and audit writes are not optional side effects

- every meaningful fulfillment transition publishes domain events in the mutation's transaction; the tracking module derives history and status from them (`docs/tracking-architecture.md`)
- every admin command writes an audit entry with effect summaries (`writeAdminAuditLog`)
- the one deliberate exception: `carrier-order.service.ts` publishes nothing — a booking records contracting, never goods

### 10. Address, contact, and locale validation live in application code

- postal/region/country structure, shipment contact completeness, and destination compatibility with local constraints are app-layer validations

## Schema Modeling Limits and Implicit Assumptions

### 1. Some business structures intentionally remain flexible JSON

Supplier/carrier address and contact info, product local constraint values, snapshots, tracking metadata, audit payloads, `CarrierOrder.metadata`, and `Operation.reviewState`. The app defines Zod schemas for the structures it owns (`operationReviewStateSchema`, domain event payloads); the `TODO`s on `Carrier.address`/`contactInfo` foresee structured schemas later.

### 2. The schema does not implement a state machine — the shared transitions module does

The database stores state and enforces nothing about legal moves. The dedicated layer the original version of this document demanded exists: `src/shared/common/fulfillment-transitions.ts` (data) + the command services (enforcement) + diagnostics (monitoring). Any new status value starts there.

### 3. Foreign keys do not enforce workflow order

A relation existing does not mean the workflow is in a valid stage; orchestration code enforces sequencing through guards. Diagnostics detect hand-edited or drifted shapes (e.g. `supplierOrder.readyForReceipt.noPackages`).

### 4. Aggregate statuses are derived, not self-validating

For `CartItem.fulfillmentStatus` and `UserOrder` closure this is now structural (ADR 0002). For the operational aggregates (lot, package, shipment, supplier order, carrier order) the compatibility tables plus diagnostics are the check — the UI shows the summary, the diagnostics prove it.

### 5. The schema allows overlapping commercial history shapes the app constrains

Many carts per user, many user orders per cart, overlapping term windows: structurally possible, constrained by application policy. Only one active commercial lineage from a cart is treated as authoritative.

### 6. Manual order entry is intentionally out of scope

`UserOrderItem.sourceCartItemId` is required; every commercial line originates from a cart item.

### 7. Inventory and stock reservation are not modeled directly

Availability is inferred from sourcing/packaging state. Operation drafts deliberately reserve nothing (ADR 0006) — there is no reservation model to lean on, and the fingerprint refusal replaces a lock.

### 8. External integration lifecycle details are minimally modeled

`externalReference` on supplier and carrier orders stays manual. Payment is the exception: `PaymentProviderEvent` + `PaymentProviderConfig` model webhook ingestion and reconciliation for Mercado Pago (ADR 0001). Supplier/carrier API integrations remain out of scope by decision.

### 9. Migration history is not a schema source

`prisma/migrations/` holds a single unapplied baseline artifact; the schema has been applied with `db:push` during development and migration baselining is owner-managed out of band. Read `prisma/schema.prisma`, never the migrations directory, for structure.

Statements `db push` cannot express safely are hand-applied and recorded under `prisma/sql/` — `2026-07-product-client-terms-rename-ref-price.sql` (the `refPrice → unitPrice` rename, which push would otherwise implement as drop-and-create) and `2026-07-user-order-live-cart-unique.sql`. They are a record of what was run, not a replayable migration chain.

### 10. Two recorded pre-execution findings

Documented in the architecture doc's closure (§21.10), owned by future work, not by this reference:

- `listOriginalDemand` excludes only `open` roll overs, so demand whose roll over was **resolved** (terminal) is aggregable again while its derived status is `cancelled`
- the supplier MOQ is applied per cart item, not to pooled demand — arguably contrary to the purpose of a group-buying operation

### 11. The two terms models disagree on the unit-price column name

`ProductClientTerms.unitPrice` was renamed; `ProductSupplierTerms.refPrice` deliberately was not — the sell side needed the rename to stop an admin loading a competitor's price into it, and the buy side has no such surface. Renaming the supplier mirror is a recommended follow-up, not a pending obligation. Until it happens, `refPrice` in the codebase always means supplier terms.

### 12. `HomeOfferSettings` is a singleton by convention, not by constraint

The database allows more than one row; `id Int @id @default(1)` and an upsert on `id: 1` in the data layer are what keep there being exactly one. Anything reading the settings must go through that upsert so a fresh database returns the defaults instead of nothing. Curation is split on purpose: the spotlight, criterion and grid size live on this row, while a pinned position lives on the product it pins (`Product.homeOfferRank`).

## Implementation Map

Where each capability the original checklist demanded now lives:

| Capability | Implementation |
| --- | --- |
| Status-transition and orchestration layer | `src/shared/common/fulfillment-transitions.ts` + command services under `src/server/services/admin/` and `src/server/services/operations/` |
| Decimal-safe quantity/money helpers | `Prisma.Decimal` throughout; pure planners under `src/server/services/admin/` |
| Sell-side pricing and the offer discount | `calculateLineTotal` and its display helpers in `src/shared/common/commerce.helpers.ts` (ADR 0008) |
| Home offers curation and ranking | `src/server/services/home/` (composition and the pure ranking) + `src/server/services/admin/home-offers.{data,service}.ts` (settings, pins, spotlight) |
| Active/valid record query helpers | `src/server/services/_base/terms-validity.ts` |
| Checkout submission service | `src/server/services/checkout/checkout.service.ts` + `mercadopago-reconciliation.service.ts` (ADR 0001) |
| Aggregation service (draft/review/execute) | `src/server/services/admin/operation.service.ts` + `src/server/services/operations/{operation-execution.service,operation-review,operation-counters}.ts` (ADR 0006) |
| Supplier request service | `src/server/services/admin/supplier-order.service.ts` + `supplier-order-absorption.ts` (ADR 0003) |
| Packaging service with per-leg conservation | `src/server/services/admin/package.service.ts` + `package-allocation-planner.ts`, `package-fractionation.ts`, `packaged-shortfall.ts` (ADR 0004) |
| Shipment service (internal + end-user) | `src/server/services/admin/shipment.service.ts` |
| Roll-over and rebatching service | `src/server/services/admin/roll-over.service.ts` + compensation in `operation-compensation.ts` (ADR 0005) |
| Carrier booking service | `src/server/services/admin/carrier-order.service.ts` (deliberately event-free) |
| Tracking-event and audit writers | `src/server/services/tracking/` + `src/server/services/audit/` behind the outbox (`docs/tracking-architecture.md`) |
| Status projection | `TrackingStatusProjector` (cart items) + `UserOrderClosureProjector` (orders) (ADR 0002) |
| Operational diagnostics | six `calculate*Diagnostics` modules under `src/server/services/admin/` |
| End-to-end verification | `pnpm fulfillment:e2e` (twelve-step run through the real service layer) and `pnpm db:seed-verify` (stored-equals-derived, counters, zero criticals, per-enum coverage) |

## ADR Map

| ADR | Decision | Where it binds this document |
| --- | --- | --- |
| `0001-mercadopago-checkout-pro-reconciliation` | Checkout Pro preferences + webhook reconciliation; redirect params are never payment truth | Flow steps 3–4; `PaymentProviderConfig`/`PaymentProviderEvent`; invariant 7 |
| `0002-fulfillment-status-derived-from-lineage` | Events are facts; `fulfillmentStatus` and order closure derived from live lineage | Design philosophy 3; status architecture; flow step 10; invariant 4 |
| `0003-supplier-order-commands-the-supplier-loop` | SupplierOrder is the command aggregate; lot/lot-item statuses cascade, never edited directly | Domain map; status ownership; flow step 6 |
| `0004-physical-packages-with-legs` | Packages are physical, carry a leg, conservation checked per leg; consolidated default, fractionation/promotion | Domain map; flow steps 7–8; invariant 3 |
| `0005-demand-conservation-and-rollover-reaggregation` | Conservation invariant; roll over status ladder; re-aggregation by default (`includeRollOver: true`) | Design philosophy 4; alternate flows; invariant 3 |
| `0006-operation-draft-and-reviewed-fingerprint` | Draft → review (omissions) → execute with fingerprint refusal; drafts reserve nothing | Design philosophy 9; flow step 5; modeling limit 7 |
| `0008-offer-discount-is-an-attribute-of-client-terms` | The discount is two columns on `ProductClientTerms`, applied inside `calculateLineTotal`; no promotion entity, no stacking, no precedence | Design philosophy 7; domain map (`ProductClientTerms` pricing columns); flow step 1; invariant 2 |
| `0010-external-payments-are-admin-settled` | An external payment is settled only by an admin; the declared receipt is a claim, not a settlement; transfer data lives in `payment_provider_config` under `provider: "external"` | Domain map (`PaymentProviderConfig`, `UserTransaction` external-payment columns); flow steps 3–4; alternate flows; invariant 7 |

Stable working rules that predate the ADRs and still hold:

- one cart item stays the root traceability record for a customer request line
- aggregate statuses summarize state but never replace detailed lineage
- history is preserved through snapshots, tracking events, and explicit compensation records
- retries and recovery create new records or explicit transitions, never rewrite the old path into invisibility
- fulfillment orchestration belongs in server-side services, not in controllers or UI code
