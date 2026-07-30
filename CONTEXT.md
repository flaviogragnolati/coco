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

**Operation draft**:
An operation created but not executed, holding its parameters, the admin's omissions, and a fingerprint of the demand set last reviewed. It materializes nothing and therefore reserves no demand. Spanish-facing UI labels it "Borrador".
_Avoid_: Preview, simulation, pending operation

**Operation review**:
The step between choosing an operation's parameters and executing it, where an admin sees the demand that would be batched and the lots it would produce. Execution is refused if the demand changed since the review. Spanish-facing UI labels it "Revisión".
_Avoid_: Confirmation, preview screen

**Omission**:
An admin's decision to keep a demand item or a whole user out of an operation before it executes. It writes nothing onto the demand — the omitted quantity stays exactly where it was and re-enters aggregation in the next operation — so it is not a roll over and not the exclusion an operation compensation performs, which acts on demand already batched.
_Avoid_: Exclusion, skip, cancellation

**Administrative window**:
The period while every live supplier order of an operation is still pending, during which the operation can be compensated. A supplier order already cancelled through the supplier loop does not close the window.
_Avoid_: Grace period

**Operation compensation**:
The administrative undo of an executed operation: its lots, lot items and supplier orders are cancelled, the roll overs it created are cancelled, the roll overs it consumed return to open, and the demand re-enters aggregation. Records are never deleted.
_Avoid_: Rollback, reversal, revert

**Lot**:
A supplier-scoped grouping of aggregated demand inside one operation.
_Avoid_: Batch, package

**Lot item**:
A supplier-facing requested line inside a lot.
_Avoid_: Package item, customer item

**Demand allocation**:
The quantity bridge that connects a customer request to a supplier-facing lot item.
_Avoid_: CartItemLotItem, customer item

**Supplier order**:
The per-supplier commercial order that requests one or more lots from a wholesale supplier. It is the command aggregate of the supplier loop: request, confirmation, and cancellation are commanded here and cascade to lots and lot items.
_Avoid_: Purchase order, wholesale order

**Supplier dispatch**:
The announced sending of goods for a supplier order. Registering it creates an internal shipment and its consolidated inbound package; a separate action confirms the departure. A supplier order may have several dispatches.
_Avoid_: Delivery note, remito

**Receipt discrepancy**:
The gap between the quantity a dispatch declared and the quantity actually received. It is absorbed onto specific demand allocations and becomes a post-allocation roll over with a mandatory reason, never a silent delta.
_Avoid_: Faltante, merma, shortfall

**Package**:
A physical package moving sourced quantity in a single leg, at the granularity the team chooses to trace — one consolidated package per supplier order by default, split into the real bundles when the detail matters.
_Avoid_: Shipment, carrier order, logical package

**Package leg**:
The direction a package moves: inbound (supplier to destination) or outbound (destination to end user). Quantity conservation is checked per leg.
_Avoid_: Generation, direction

**Package line**:
The quantity of a lot item represented inside a package.
_Avoid_: Lot item, package allocation

**Packaged allocation**:
The quantity bridge that connects a demand allocation to a package line.
_Avoid_: PackageAllocation, package line

**Fractionation**:
The destination-side action that turns received inbound quantity into outbound packages, one per customer by default, over a selection of received inbound packages. It creates outbound records and leaves the inbound ones as arrival history; it may run in several passes as goods arrive. Spanish-facing UI labels it "Fraccionamiento".
_Avoid_: Repackaging, splitting

**Package promotion**:
Reassigning a mono-customer inbound package to the outbound leg while preserving its physical identity, used when the supplier already fractionated per customer. The package returns to ready-for-shipment: its received status recorded the inbound arrival, not the outbound one.
_Avoid_: Re-shipment

**Package split**:
Dividing one package into several so the records match the real physical bundles. It changes how quantity is grouped, never how much is packed.
_Avoid_: Fractionation, package promotion

**Shipment**:
A movement record for packages, either between internal locations or toward the end user.
_Avoid_: Package, carrier order

**Delivery mode**:
How an outbound package reaches its customer: home delivery and pickup point both travel on an end-user shipment and are distinguished by the shipment's recorded mode, while depot pickup is the absence of a shipment. Spanish-facing UI labels it "Modo de entrega".
_Avoid_: Shipping method, delivery type

**Pickup point**:
A shared address an end-user shipment travels to, where each customer collects their own package afterwards. Its arrival is not a handover, so every package on it still needs its own delivery confirmation. Spanish-facing UI labels it "Punto de retiro".
_Avoid_: Depot, warehouse, destination

**Package recovery**:
Returning a delayed package to the state it was in before the disruption — waiting at the destination if it had not left, moving if its shipment already departed. Spanish-facing UI labels it "Recuperar".
_Avoid_: Retry, un-delay

**Carrier**:
A logistics provider that moves shipments. Code, URLs, and data keep `carrier`; Spanish-facing UI labels it "Transportista".
_Avoid_: Courier, shipping company

**Carrier order**:
The booking of a carrier to move one or more shipments, carrying the carrier's own reference. It records the contracting, never the goods: quantity, packages and delivery evidence stay on the shipments it groups, and it publishes no fulfillment fact of its own. Spanish-facing UI labels it "Orden de transporte".
_Avoid_: Freight order, carrier booking, shipment

**Delivery confirmation**:
The per-package action recording the physical handover of an outbound package to its customer. Automatic for home delivery, where the shipment's arrival confirms every package it carries; explicit for depot pickup and pickup point, where each customer collects separately. Spanish-facing UI labels it "Confirmar entrega".
_Avoid_: Proof of delivery

**Order closure**:
The derived commercial close of a user order: completed once every one of its items reached a terminal fulfillment state and at least one was delivered, cancelled when all of them ended cancelled. It is never set by hand and never overrides a state the payment domain owns.
_Avoid_: Order completion, manual close

**Roll over**:
Quantity that dropped out of the current fulfillment path and must be rebatched or otherwise resolved.
_Avoid_: Remainder, leftover, silent quantity delta

**Demand conservation**:
The invariant that every unit of paid demand is always in exactly one active place — unallocated original demand, an open roll over, or a live allocation — or in an audited terminal resolution.
_Avoid_: Quantity balance

**Cut absorption**:
The reassignment of a supplier's shortfall onto specific demand allocations, LIFO by payment date by default and manually adjustable per allocation.
_Avoid_: Prorating, reallocation

**Write-off**:
The terminal follow-up of a failed package or shipment that converts the affected quantity into a post-allocation roll over with a reason. Spanish-facing UI labels it "Dar de baja".
_Avoid_: Loss, shrinkage

**Fulfillment lineage**:
The traceable path of a customer request through aggregation, sourcing, packaging, shipment, and delivery. Concretely: rollovers, lot-item allocations, and order items. Tracking events are **history, not lineage** — an item added and then removed by an admin carries an `addedToCart` event and has no lineage at all. Encoded in `hasFulfillmentLineage` (`operations-cart.data.ts`).
_Avoid_: Order status, shipment status, tracking events

**Operational state**:
The state that answers where demand is inside sourcing, packaging, shipment, and delivery.
_Avoid_: Commercial state, request state

**Operational diagnostic**:
A read-only signal with a stable code and severity that compares operational records, quantities, and statuses to reveal missing evidence or inconsistent fulfillment lineage.
_Avoid_: Correction, mutation, action

**Fulfillment exception**:
A derived condition: demand whose lineage has a delayed or failed package or shipment touching live quantity. It clears automatically when the records recover or the quantity is rerouted.
_Avoid_: Incident, error state

**Aggregate status**:
A summary status intended for display, recomputed from the live operational records that back it instead of being carried forward by the events that moved it.
_Avoid_: Source of truth, proof, event-carried status

**Fulfillment journey**:
The staged, display-oriented progression of a customer request through fulfillment, computed from tracking events (history). Stages read completed, current, pending, or skipped; deviations surface as notices and a terminal outcome, never as stages. Spanish-facing UI labels it "Recorrido".
_Avoid_: Timeline, event log, fulfillment lineage

**Journey stage**:
One step on a journey's fixed axis. The admin journey has ten stages mapped 1:1 to happy-path fulfillment statuses; the customer journey groups them into six. Spanish-facing UI labels it "Etapa".
_Avoid_: Status, operational state

**Journey notice**:
A deviation or annotation attached to the journey stage that was current when it happened — rollover, exception, cancellation, or quantity change. Spanish-facing UI labels it "Aviso".
_Avoid_: Warning event, error

**Order journey**:
The customer-facing roll-up of one submitted order's item journeys. When every item shares the same current stage it collapses into a single six-stage journey; otherwise each item shows its own. Spanish-facing UI labels it "Seguimiento del pedido".
_Avoid_: Order timeline, tracking screen

### Catalog and cart (customer-facing)

**Catalog**:
The customer-facing set of purchasable products, each surfaced with its current client terms. Distinct from the internal admin Product record.
_Avoid_: Store, product list

**Featured offer**:
A current catalog product surfaced automatically on the home page from its active client terms. It does not imply a promotion, discount, or open aggregation operation.
_Avoid_: Promotion, discount, operation

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
The customer-facing flow that turns an at-checkout cart into a submitted order plus a payment attempt: review the order, choose shipping address and payment method, accept terms, and pay. Single-currency, with prices and quantities snapshotted at confirmation. The cart is the live source of truth up to the moment checkout starts; from then on it is frozen against edits, because the order snapshot references it.
_Avoid_: Order placement, purchase flow

**Leave checkout**:
The explicit way back from a frozen at-checkout cart to an editable one: it cancels the live order and its pending payment attempt and returns the cart to pending. It is the only exit from at-checkout other than a completed payment, which is why editing the cart mid-checkout is offered as leaving rather than as a direct edit. Blocked while a payment is in process. Spanish-facing UI labels it "Volver a editar el carrito".
_Avoid_: Cancel checkout, abort checkout, unfreeze

### Internal QA tracking

**QA ticket**:
The tracked record of one manual QA test case: its steps, its expected result, the state it reached, who took it, and the finding. It merges the specification and the work item into one record — there is no separate test-case entity. Spanish-facing UI labels it "Ticket de QA".
_Avoid_: Caso de prueba, test, bug, issue

**QA pass**:
One sweep of the QA tickets by a tester. It is deliberately not a record: a ticket carries a single live state that the next pass overwrites, and the history of who changed what lives in the audit log. Spanish-facing UI labels it "Pasada de QA".
_Avoid_: Run, execution, ciclo

**Regression path**:
The subset of QA tickets that form the end-to-end happy path, marked on the ticket so a tester can run the short sweep instead of all of them. It is a property of the ticket, not a separate suite.
_Avoid_: Smoke suite, happy path suite

### Admin reference and shell

**Glossary**:
The in-app reference that answers, for one domain word, what the UI calls it, what the code calls it, and what the database calls it. It is a read-only view over hand-curated data, not the canonical source of the language — this file is. Spanish-facing UI labels it "Glosario".
_Avoid_: Diccionario, ayuda, documentación

**Glossary entry**:
One consultable unit of the glossary: a domain concept, an entity, or a status value, carrying its Spanish label, its definition, its occurrences in code and database, and the synonyms this project avoids. A single entry may cover several occurrences when the same label and meaning repeat across entities.
_Avoid_: Término, definición, fila

**Occurrence**:
One concrete place where a glossary entry materializes — a Prisma model and its table, or an enum value and the column that stores it. It is what makes an entry actionable in a SQL console; the entry itself is the meaning.
_Avoid_: Referencia, ubicación, mapeo

**Quick action**:
An admin shortcut reachable from the floating button regardless of the page in view. Today the only one opens the glossary. Spanish-facing UI labels it "Acción rápida".
_Avoid_: Atajo, herramienta, shortcut
