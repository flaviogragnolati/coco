# Feature Architecture: Post-Execution Fulfillment Lifecycle

> **Status:** Accepted — design-grill session 2026-07-25 (escalated from feature-grill in the same session); refined 2026-07-25 by the Phase 0 feature-grill (§11 roll over overlay, §20.2 module location, §21 migration/seed policy and Phase 0 boundary). **Phase 0 implemented 2026-07-25** (§21.1), **Phase 1 implemented 2026-07-26** (§21.2), **Phase 2 implemented 2026-07-26** (§21.3) — see those sections for what landed and what the later phases inherit. Revised 2026-07-26 against the implemented code: §3 context markers, §11 counter semantics, §12 producer/router status, §15 #2 and #5, §18's serialization-retry row **corrected (the claimed retry pattern does not exist)**, §19 one-lot assumption, §20.2/§20.3 resolutions. **Revised again 2026-07-26 by the Phase 2 feature-grill**, which found that §8's compensation *as written lost demand* and replaced it: §2, §8, §11, §12, §14, §15 #11, §16.2, §17, §18, §19, §20.2/§20.3, §21 Phase 2 row and the new §21.3. **Rewritten 2026-07-26 after building Phase 2**: §21.3 is now an as-built record, and §3, §11, §12, §14, §18 and §20.2 carry its shipped markers. **Phase 3 implemented 2026-07-26** (§21.4): §11's "seeds backfilled" and §12's dispatch router ownership are **corrected** there, and §3, §5, §6.2, §9, §11, §12, §14, §15 #6/#7/#12, §18, §19, §20.3, §21 and §24 carry its shipped markers. **Phase 4 split into 4a and 4b by its feature-grill 2026-07-26** (§21.5) — that section records the split, what 4b still owes, and three latent defects the grill found in shipped code. **Phase 4a implemented 2026-07-26** (§21.6): §3, §6.2, §9, §12, §15 #6/#12, §18, §20.3, §21 and §22 carry its shipped markers, and all three of those latent defects are fixed. §12's contract-adjustment row is **corrected** there — it applies to both `shipment.endUser.*` schemas, not only `delivered`. **§21.6 also answers what 4a changed about 4b's scope**: the critical path is unchanged and re-verified item by item, two modelling questions narrowed, and three new ones appeared. **Phase 4b implemented 2026-07-26** (§21.7): the fulfillment chain now terminates — **14 of 14 `CartItemFulfillmentStatus` values reachable, zero declared-without-producer event types, `UserOrder` closure derived** — and §3, §5, §6.2, §8, §9, §10, §11, §12, §14, §15 #8/#9/#12, §16.2, §18, §19, §20.2, §20.3, §21, §22 and §24 carry its shipped markers. §8 gains four as-built delivery scenarios (home delivery, pickup point, delivery discrepancy, package recovery) and §21.7 reproduces the one deliverable that did not land — the manual end-to-end run — because its plan lives in an untracked `tmp/` file. §18's serialization-retry row is **discharged**, and both §20.2 questions that belonged to 4b are **resolved**. Two latent defects it found in shipped code are fixed: `retry` reproducing its source's type, and a resolved roll over deriving `includedInOperation` instead of terminal. **Phase 5 implemented 2026-07-26** (§21.8): `CarrierOrder` is unfrozen — a guarded ladder, fifteen procedures, its own diagnostics module and `/admin/carrier-orders` — and §3, §6.2, §6.3, §9, §12, §14, §15 #10, §20.3, §21 and §24 carry its shipped markers. It is the one service that deliberately publishes **no domain event** (§15 #10). §21.8 also carries the first **findings** table of the series to report *no* latent defect, and the first **partial verification against the real database** — Phase 5's service layer was executed, not only reviewed. **Every phase is now built, but the series is not closed**: the manual end-to-end run owed since Phase 1, the seed realignment and the migration authoring were all scoped out of Phase 5 and remain owed. **Closure audit 2026-07-27** — every owed item verified against the code and the development database, and consolidated into the new **§21.9**, the single inventory of what remains; §21.7's seed-drift paragraph and §21.8's migration line are **corrected** there, §22 and §24 point at it, and the execution plan covering Groups A (minus A3), B and C introduced **no schema change**, since migrations were decided the same day to be owner-managed out of band. **Closure executed 2026-07-27** (§21.10): the series is committed, the seed is realigned *and* expanded to every producible fulfillment state behind a verifier, the end-to-end run owed since Phase 1 is discharged by a **repeatable** harness, and all four Group C refinements shipped. §21.9's Groups A (A1, A2), B and C are struck; **Group D remains listed with its gates**, and Group E is re-armed with a sharper resolver rather than closed. Three defects the closure found in shipped code are fixed with tests: the outbound arrival branch of `packagedStage` (a pickup-point shipment derived `delivered` while its packages were still in transit), the compensated-lot/order unresolved-demand rules (`critical` on every correct compensation), and Prisma's default 5s transaction timeout (P2028 on real commands against a remote database). **The series is closed.**
> **Parent / related architecture:** `docs/schema-reference.md` (intended per-phase transitions), `docs/tracking-architecture.md` (mandatory write path)
> **Supersedes / superseded by:** none
> **Living document:** updated over the project's life. To implement a phase, run `feature-grill` (or `simple-grill`) against this document.

## 1. Purpose

Design the complete lifecycle of fulfillment **after** an operation executes: the supplier loop (request / confirm / cancel against wholesale suppliers), post-allocation roll overs, physical packages and shipments through delivery, exceptions, and operation compensation (cancel / re-run / delete). Today the entire chain is modelled but frozen read-only; this document defines the architecture that unfreezes it. It is the durable architectural source, including the high-level rollout — it is **not** an implementation plan.

## 2. Executive architectural summary

- **SupplierOrder commands the supplier loop**; Lot/LotItem statuses cascade and are never edited directly (ADR 0003).
- **`CartItem.fulfillmentStatus` is derived from live lineage records** on every projection; domain events are facts, not status carriers. `UserOrder.status = completed` rolls up the same way (ADR 0002).
- **Demand conservation is the system invariant**; roll overs re-enter aggregation by default (`includeRollOver: true`, open-only exclusion — fixes review #33/#34) (ADR 0005).
- **Packages are physical, carry an inbound/outbound leg, and their granularity is an operational choice** with an automatic consolidated default (ADR 0004).
- **Valid transitions live in shared declarative maps** consumed by services (enforcement), diagnostics (monitoring), and UI (available actions).
- **Exceptions are a derived condition**, not a table; `delayed`/`failed` transitions publish exception events and derivation clears them.
- **Operation cancel exists only inside the administrative window** (every *live* supplier order still `pending`); afterwards the real world is managed through supplier-loop actions. Compensation moves statuses only — it deletes nothing (§8, revised by the Phase 2 grill).
- **Non-goals:** external supplier/carrier API integrations; automatic money movement (refunds) on resolution; a persistent exception workflow entity; customer-facing mutations.

## 3. Current system context

Verified against code during this session:

- `operation.createAndExecute` is the only fulfillment mutation. It materializes SupplierOrders (`pending`), Lots (`assembling`), LotItems (`pending`), allocations, and roll overs in one Serializable transaction (`src/server/services/operations/operation-execution.service.ts`), then nothing can ever move them: there are **zero write sites** for Lot/LotItem/SupplierOrder/Package/Shipment/CarrierOrder statuses in `src/`. **Partly resolved by Phase 1** — `supplier-order.service.ts` now writes SupplierOrder, Lot and LotItem statuses (§21.2). **Phase 3 unfroze Package and Shipment** (§21.4): `registerDispatch` creates both, and `dispatch`/`receive`/`markDelayed`/`markFailed`/`retry`/`writeOff` move them. ~~**CarrierOrder is the last frozen entity**~~ **Resolved by Phase 5** (§21.8): `carrier-order.service.ts` creates carrier orders and walks them through `request`/`confirm`/`markInTransit`/`complete`/`cancel`/`markFailed`. **No entity in `src/` is modelled-but-unreachable any more.**
- ~~Packages, Shipments, and CarrierOrders are **never created at runtime** — seed only~~ **Resolved for Package and Shipment by Phase 3**: `supplierOrder.registerDispatch` creates an internal shipment and a consolidated inbound package in one transaction. ~~CarrierOrder is still seed-only.~~ **Resolved for CarrierOrder by Phase 5** (§21.8): `carrierOrder.create` builds one and optionally claims shipments in the same transaction.
- The only working status action is the operations cart (`src/server/services/admin/operations-cart.service.ts:329-372`), which is the **reference pattern**: tx → guard → mutate → effects handler publishes domain events in-tx (`src/server/services/admin/operations-effects/`) → audit log → `DomainEventDispatcher.wake()` after commit. **Superseded by Phase 1** — the supplier-order commands are a second, richer instance of the same pattern (guards from the shared ladders, in-transaction counter recompute) and are the closer bar for Phases 2–3 (§21.2).
- The tracking pipeline is complete but starving: 17 domain event types are declared (`src/schemas/domain-events.schemas.ts`), registered (`src/server/services/tracking/tracking-domain-event.listener.ts`) and mapped (`tracking-event-mapper.ts`), but **8 are never published**. The `includedInSupplierOrder` tracking type has no producing domain event at all — admin journey stage 4 ("Pedido al proveedor") is structurally unreachable. Only 5 of 14 `CartItemFulfillmentStatus` values are reachable. **Partly resolved by Phase 1** — verified 2026-07-26: **19 declared, 7 still never published** (`fulfillment.exception.created/resolved`, `package.cartItem.packaged`, the four `shipment.*`). `includedInSupplierOrder` and `supplierConfirmed` gained producers, so journey stages 4–5 are reachable at runtime, and **8 of 14** `CartItemFulfillmentStatus` values are now reachable — the six that remain (`packaged`, `inInternalShipment`, `atWarehouse`, `inEndUserShipment`, `delivered`, `exception`) need Phases 3–4. **Phase 2 adds a 20th type with a producer** (`operation.cartItem.excluded`), leaving the same 7 unpublished; it reaches no new `CartItemFulfillmentStatus` value because compensation *returns* an item to `awaitingAggregation` rather than advancing it. **Phase 3 gave producers to five of the seven** (`package.cartItem.packaged`, `shipment.internal.dispatched`, `shipment.internal.received`, `fulfillment.exception.created/resolved`), leaving **only the two `shipment.endUser.*`** unpublished, and made `packaged`, `inInternalShipment`, `atWarehouse` and `exception` reachable at runtime — **12 of 14** `CartItemFulfillmentStatus` values, with only `inEndUserShipment` and `delivered` waiting on Phase 4. **Phase 4a added second producers** for `package.cartItem.packaged` (fractionation, on the outbound leg) and `fulfillment.exception.created` (package-level disruption) and reaches **no new status value** — a fractionated item still reads `atWarehouse`, which is the phase's exit condition. The last two stay 4b's. **Phase 4b closed the gap**: `shipment.endUser.dispatched` and `shipment.endUser.delivered` gained producers, a 21st type (`shipment.endUser.arrivedAtPickupPoint`) was added *with* one, and `inEndUserShipment` and `delivered` became reachable — **21 declared, 0 unpublished, 14 of 14** `CartItemFulfillmentStatus` values reachable (§21.7).
- The projector (`src/server/services/tracking/tracking-status-projector.ts`) was last-event-wins with per-event evidence gates; review findings #12 (regression on retry, `exception` dead end) and #14 (derivation) applied. **Resolved by Phase 0** — it now loads lineage and derives (§21.1).
- ~~Operation UI actions Cancelar/Reejecutar/Eliminar are stubs~~ **Resolved by Phase 2** — all three are real commands on `admin.operation`, rendered from the server's `availableActions` in both the row menu and the detail footer (§21.3).
- Diagnostics (`src/server/services/admin/{lot,package,shipment,operation}-diagnostics.ts`) encode aggregate-vs-lines compatibility tables and quantity conservation checks — these were duplicated per file. **Resolved by Phase 0** — they read `src/shared/common/fulfillment-transitions.ts` (§21.1).

## 4. Documents, code, and references consulted

### 4.1 Internal sources

| Source | Type | Relevance | Status |
| --- | --- | --- | --- |
| `docs/schema-reference.md` §6–§10 | docs | Intended per-phase transitions; "aggregate status must be backed by detail records" | source of truth |
| `docs/tracking-architecture.md` | docs | Mandatory write path (events in-tx → wake → listener → projector); read-only v1 tracking | constraint |
| `docs/code-review-codebase-2026-07-22.md` #12/#14/#31/#33/#34 | docs | Defects this design must fix | constraint |
| `tmp/grilling-handoff-operaciones-asignacion-lotes.md` | docs | Operation status is technical (`running/completed/failed`), not business outcome; supplier integrations deferred | constraint |
| `prisma/schema.prisma` | schema | All entities and status enums already modelled | source of truth |
| `src/server/services/operations/operation-execution.service.ts` | code | Materialization semantics, counters, roll over creation | source of truth |
| `src/server/services/admin/operations-cart.service.ts` + `operations-effects/` | code | Reference mutation pattern and effects extension point | reference implementation |
| `src/server/services/tracking/*` | code | Event mapping, projection, evidence gates | reference implementation |
| `src/server/services/admin/*-diagnostics.ts` | code | Invariants transitions must maintain | constraint |
| `CONTEXT.md` | docs | Domain language (updated this session) | source of truth |

### 4.2 External sources

None required.

## 5. Domain language and terminology

Canonicalized this session (durable glossary in `CONTEXT.md`): **Supplier order**, **Supplier dispatch**, **Package** (redefined: always physical), **Package leg**, **Fractionation**, **Package promotion**, **Delivery confirmation**, **Demand conservation**, **Administrative window**, **Write-off**, **Fulfillment exception**.

Added by the Phase 2 grill (2026-07-26): **Operation compensation**. **Administrative window** was tightened in the same pass to "every *live* supplier order still pending" — an order already cancelled through the supplier loop does not close it.

Added by the Phase 3 grill (2026-07-26): **Receipt discrepancy**. **Supplier dispatch** was tightened in the same pass to "the *announced* sending of goods … a separate action confirms the departure" — the previous wording implied the goods were already moving at registration time, which the two-step dispatch makes false.

Added by the Phase 4b grill (2026-07-26): **Delivery mode**, **Pickup point**, **Package recovery**, **Order closure**. **Delivery confirmation** was tightened in the same pass: it is per *package* and only **automatic for home delivery**, where the shipment's arrival confirms every package it carries. The previous wording called per-customer confirmation "optional", which is false for depot pickup and pickup point — there it is the only way the handover is ever recorded.

## 6. Scope

### 6.1 Designed now (in scope for this document)
- Supplier loop: request / confirm (full & partial with LIFO+override cut absorption) / cancel, at supplier-order and line level, with cascades and events.
- Roll over lifecycle: post-allocation creation, resolution, cascade cancellation, re-aggregation defaults (fixes #33/#34).
- Projector re-architecture: derivation from lineage; order-level completion roll-up (fixes #12/#14).
- Shared transition maps + diagnostics refactor to consume them.
- Package model: physical, legged, flexible granularity; dispatch registration; split/consolidate; fractionation; promotion.
- Shipments: internal and end-user; three delivery modes (home delivery, depot pickup, group pickup point); delivery confirmation.
- Exceptions: derived condition; `delayed`/`failed` with retry or write-off follow-up; receipt discrepancies.
- Operation compensation: cancel (administrative window), re-run, delete.
- CarrierOrder contract (manual CRUD, no events) — **as built it is CRUD *plus* a guarded ladder** (§21.8); see §15 #10.

### 6.2 Implemented
- Phase 0 foundations, Phase 1 supplier loop, Phase 2 operation compensation, Phase 3 goods inbound, Phase 4a outbound packaging, **Phase 4b delivery** and **Phase 5 carrier orders** (see §21). **Every phase is built**; §21.8 lists what the series still owes.

### 6.3 Deferred (designed, not now)
- ~~CarrierOrder implementation (Phase 5)~~ **implemented 2026-07-26** (§21.8): the carrier-hiring frequency gate was met by the need to stop `CarrierOrder` being the last unreachable entity.
- Persistent `FulfillmentException` workflow entity (assignee, notes) — add only if diagnostics-as-worklist proves insufficient.

### 6.4 Out of scope (permanent, for this design)
- External supplier / carrier API integrations (`externalReference` stays manual).
- Automatic refunds or any money movement from fulfillment actions (roll over resolution records the decision only).
- Customer-facing mutations; tracking remains read-only for customers.
- New aggregation strategies beyond FIFO.

## 7. Architectural principles and design philosophy

- **Demand conservation above all** (ADR 0005): no command may create or destroy paid quantity silently.
- **Aggregate status never leads its lines**; both follow the detail records (`docs/schema-reference.md`).
- **Events are facts; summaries are derived** (ADR 0002). History is append-only; corrections are compensating events, never deletions of history.
- **One write path**: domain mutation + events in one transaction, `wake()` after commit, audit log always.
- **Automatic defaults, manual refinement**: consolidation, fractionation, delivery, and cut absorption all work with zero input and accept manual detail when it matters.
- **Operation status describes execution, not business outcome**; outcomes live in children.

## 8. Main use cases and scenarios

### Scenario: Request from supplier
**Actor / trigger:** admin, after reviewing an executed operation's lots.
**Flow:** command on SupplierOrder (`pending → requested`, `requestedAt`, optional `externalReference`) cascades Lots (`assembling → requested`) and LotItems (`pending → requested`); per-cart-item events feed journey stage 4.
**Edge cases:** operation not completed → CONFLICT; already requested → CONFLICT via transition map.

### Scenario: Partial supplier confirmation
**Actor / trigger:** admin records the wholesaler's response.
**Flow:** command on SupplierOrder with per-line confirmed quantities. Per line, in one tx: LotItem quantity reduced to confirmed, absorbing allocations reduced (LIFO by payment date; optional manual redistribution), `RollOver(postAllocation, open)` per cut, operation live counters adjusted, `supplier.lotItem.confirmed` + `rollover.postAllocation.created` published. Zero-confirmed line → `cancelled` + full roll over.
**Expected outcome:** balance diagnostics stay green; cut customers derive `partiallyRolledOver`/`rolledOver`.

### Scenario: Bulk receipt with discrepancy
**Flow:** supplier dispatch was registered (internal shipment + consolidated inbound package); on receipt the admin records actual quantities; shortfall/damage generates post-allocation roll overs directly (reason mandatory), affected journey shows roll over notice. Fractionation then produces outbound packages from what actually arrived.

### Scenario: Depot pickup — ✅ **as built, Phase 4b**
**Flow:** fractionation creates the customer's outbound package at the destination; **no shipment record is ever created** — that absence *is* the mode; `package.confirmDelivery` marks the handover (`readyForShipment → received`, a rung 4b added); derivation reads outbound package received → `delivered`; when the last order item is terminal, `UserOrder → completed`.
**As built:** the delivery event carries `packageId` and **omits `shipmentId` entirely** — the exact case §12's contract adjustment exists for. The command never writes a shipment, because there is none.

### Scenario: Home delivery — ✅ **as built, Phase 4b**
**Actor / trigger:** admin, after fractionation has produced one outbound package per customer.
**Flow:** `shipment.createEndUser` with `deliveryMode: homeDelivery` claims the packages and creates the shipment at `readyForDispatch` (no event — nothing moved); `shipment.addPackages` can extend it while it has not left; `shipment.dispatch` cascades shipment → `inTransit`, packages → `inTransit`, lines → `shipped` and publishes `shipment.endUser.dispatched` (**the point `inEndUserShipment` becomes reachable**); `shipment.deliver` cascades shipment, packages and lines to `received` and publishes `shipment.endUser.delivered`.
**Edge cases:** a home delivery must carry **exactly one distinct cart** — `destinationAddressSnapshot` is a single address, so one address means one customer (`CONFLICT` otherwise, re-evaluated over existing + new packages on `addPackages`). Dispatching or delivering without a `deliveryMode` → `CONFLICT`. A delivery from `delayed` also publishes `fulfillment.exception.resolved`.

### Scenario: Pickup point — ✅ **as built, Phase 4b**
**Actor / trigger:** admin sending several customers' packages to one collection point.
**Flow:** same construction and dispatch as home delivery, with `deliveryMode: pickupPoint`. `shipment.deliver` then marks **only the shipment** `received` and publishes `shipment.endUser.arrivedAtPickupPoint` per affected cart item — a journey notice ("Disponible para retirar"), never a stage. **The packages and their lines stay `inTransit`**: arrival at the point is not a handover. Each customer's own `package.confirmDelivery` (`inTransit → received`) is what produces `delivered`.
**Why the asymmetry is deliberate:** it is the entire reason the column exists. The branch is written so the pickup path physically cannot reach the package cascade; letting it cascade would claim deliveries that did not happen.
**Monitoring:** a delivered pickup-point shipment is exempted from all three `received`-row diagnostics (its packages are correctly behind it) and instead reports `shipment.pickupPoint.pendingCollection` (warning) — the operator's worklist for the mode. The exemption is scoped to `pickupPoint` only.

### Scenario: Delivery discrepancy — ✅ **as built, Phase 4b (composed, not commanded)**
**Flow:** the customer receives less than the package claims. **No dedicated command exists, deliberately**: `package.split` the missing quantity into a sibling → `markFailed` on the sibling → `writeOff` (which already runs the four reductions and mints the post-allocation roll over) → `confirmDelivery` on the original.
**Why:** every piece already existed and each is independently audited. A `confirmDelivery` that took per-line quantities would be a second implementation of shortfall absorption — the dual-truth problem the shared modules exist to end. **The consequence is that 4b added zero `Serializable` commands and zero counter recomputes: it is a status-only phase.**

### Scenario: Failed end-user shipment — ✅ **as built, Phase 4b**
**Flow:** shipment marked `failed` → `fulfillment.exception.created` per affected item; admin chooses **retry** (reassign packages to a new shipment; identity preserved) or **write-off** (post-allocation roll over + package lines cancelled). Derivation clears the exception either way.
**Defect fixed in 4b:** `retry` called `createInternalShipment` unconditionally, so retrying a failed *end-user* shipment silently produced an `internalTransfer` replacement. Unreachable until end-user shipments became creatable; live the moment they did. `createShipment` now takes `type` and `deliveryMode` explicitly and `retry` reproduces both from its source.

### Scenario: Package recovery — ✅ **as built, Phase 4b**
**Actor / trigger:** a delayed package turns up.
**Flow:** `package.recover` returns it to where it was, with the target **derived from the record rather than asked**: no shipment or a shipment that has not departed → `readyForShipment` (lines `packed`); a shipment already travelling → `inTransit` (lines `shipped`). Publishes `fulfillment.exception.resolved` per affected cart item.
**Edge case:** it refuses (`CONFLICT`) while the shipment is itself `delayed`/`failed`. `isDisrupted` reads **both** levels, so recovering only the package would leave the item deriving `exception` anyway — a command that appears to do nothing. Recovering the shipment first is the supported order.

### Scenario: Cancel an operation (administrative window)

> **Revised by the Phase 2 grill (2026-07-26).** The original flow — "allocation bridge rows deleted … original demand re-enters the pool with no query changes" — **loses demand** and is superseded by what follows. Counter-example: a cart item of 10 where the operation assigns 8 and opens a `preAllocation` roll over of 2. Deleting the bridge while leaving that roll over `open` means `listOriginalDemand` still excludes the cart item (it excludes anything carrying an open roll over), so only the 2 comes back and the 8 is stranded permanently. Deleting the bridge also nulls `CartItemTrackingEvent.cartItemLotItemId` (optional relation, so `SetNull`), which is exactly what Phase 1 refused to do (§21.2).

**Preconditions:** every **live** supplier order still `pending`. An order already `cancelled` through the supplier loop does not close the window — its lines are already `cancelled` and compensation skips them.
**Flow (status-only, nothing is deleted):** lot items / lots / supplier orders → `cancelled`; the roll overs this operation **created** (own `open` roll overs) → `cancelled`; the roll overs it **consumed** revert `rebatched → open` via the new `RollOver.rebatchedIntoOperationId` back-link; counters recomputed; `operation.status → cancelled`; one `operation.cartItem.excluded` per affected cart item, carrying the same quantity its `operation.cartItem.included` carried (journey notice).
**Why demand returns:** `listOriginalDemand` is narrowed to exclude only *live* allocations rather than any bridge row. A cart item enters an operation either as original demand **or** as roll over demand, never both — the query already excludes anything with an open roll over — and that mutual exclusion makes compensation exact without per-source attribution. Original-demand case: afterwards the item has no live allocation and no open roll over, so its full `userOrderItem` quantity is aggregable again. Roll-over case: the reverted roll overs sum to exactly what was consumed, and their being `open` keeps the item out of the original-demand query.
**Edge case:** any live order already `requested` → CONFLICT; manage through supplier-loop cancellation instead.

### Scenario: Re-run an operation
**Flow:** one command, operator-editable parameters (preloaded from the source operation, `includeRollOver` forced to default `true`), three paths by status — `failed` updates the same row and re-executes in place; `completed` compensates as above and then creates and executes a new operation; `cancelled` creates and executes only. All of it in one `Serializable` transaction: if execution throws, the compensation rolls back with it and no `failed` row survives, deliberately unlike `createAndExecute`.
**Edge case:** a `completed` source must satisfy the same administrative window as cancel, since its first step *is* a compensation. A re-run that cloned `includeRollOver: false` would produce an empty operation and strand everything the compensation just released — hence the forced default.

## 9. Affected modules and system boundaries

| Module / Context | Change | Notes |
| --- | --- | --- |
| `src/server/services/admin/` (lot, package, shipment services) | gain orchestration mutations mirroring the operations-cart pattern | services stay the transaction owners — **`shipment.service.ts` and `package.service.ts` gained commands in Phase 3** (§21.4), and `package.service.ts` gained four more in Phase 4a (§21.6); `lot.service.ts` is **still read-only**, and deliberately so: lot statuses cascade and are never driven directly (ADR 0003) — 4a's `readyForPackaging → completed` roll-up lives inside `fractionate`, not in a lot command |
| `src/server/services/admin/operations-effects/` | new effect handlers per source (`lot`, `package`, `shipment` already declared in `AdminOperationsMutationSource`) | established extension point — **`supplierOrder` and `rollOver` shipped in Phase 1**, `operation` in Phase 2, **`shipment` and `package` in Phase 3** (§21.4, with the payload builders split into a pure `fulfillment-event-builders.ts` so they are testable without the `server-only` publisher); **`lot` remains declared and unconsumed** |
| **[NEW]** supplier-order service/router; carrier-order service/router | full command surface | no service exists today — **supplier-order service + router shipped in Phase 1** (§21.2), plus an unplanned-at-design-time `admin.rollOver` router for `resolve`; **the shipment and package routers gained their command surface in Phase 3**; **carrier-order service + router shipped in Phase 5** (§21.8) — the only command service with no effects handler, by design (§15 #10) |
| **[NEW]** shared transition-map module | declarative per-entity maps + cross-entity guards | consumed by services, diagnostics, UI — **complete**: compatibility tables in Phase 0, the supplier-order/lot/lot-item ladders + `availableActions` in Phase 1, `operationAvailableActions` in Phase 2, **the `package` and `shipment` ladders + their `availableActions` in Phase 3**, and **the `carrierOrder` ladder, compatibility table and eleven-key matrix in Phase 5**. Every entity that has commands has a ladder, and every entity that is modelled has commands |
| `src/server/services/tracking/` | projector becomes derivation; mapper/listener gain new event types; order-level roll-up step | ADR 0002 — **complete**: derivation in Phase 0, event types through Phases 1–4b, and **the order-level roll-up in Phase 4b** (`UserOrderClosureProjector`, run after the per-cart-item projection and deduped per order; §21.7) |
| `src/server/services/operations/operation-execution.service.ts` | demand queries per ADR 0005; compensation/re-run entry points | conservation invariant |
| `src/server/services/admin/*-diagnostics.ts` | consume shared maps; leg-scoped conservation; `package.shipment.missing` restricted to `inTransit` | monitoring only, never repair — **all three shipped**: shared maps in Phase 0, the `inTransit` restriction in Phase 0, **per-leg conservation (`package.leg.overAllocated`) in Phase 3** (§21.4) |
| `src/schemas/domain-events.schemas.ts`, `src/schemas/admin/*` | new event types and command schemas | contracts in §12 |
| Admin UI (`src/features/admin/crud/*`, `src/app/admin/(operation)/*`) | row/detail actions driven by server-computed available transitions | `CrudRowAction` already supports disabled+hint. In practice the operational entities render their commands in the **detail footer**, not a row menu — none of these tables ever had one. Phase 3 extracted the shared `CrudAvailableAction` button (label in, `aria-disabled` + Spanish-reason tooltip out) from its third and fourth copy |
| `prisma/schema.prisma` | additive migrations only (§11) | |

Boundary rule: fulfillment actions never write payment records; the payment domain (transactions, refunds) is referenced read-only.

## 10. Proposed architecture

**Collaboration model** — every action is a command on an orchestration service following the reference pattern (`operations-cart.service.ts`): open tx → load + guard via transition maps → mutate + cascade → effects handler publishes domain events in the same tx → audit log with effect summaries → commit → `wake()`. Quantity-moving commands (partial confirmation, discrepancies, compensation) run Serializable like `executeOperation`; pure ladder moves use the default isolation. **Since Phase 4b that isolation is requested in exactly one place** — `runSerializable` in `_base/serializable-transaction.ts`, which wraps the twelve quantity-moving commands and retries a bounded three attempts on a serialization failure (P2034 / SQLSTATE 40001), re-throwing anything else on the first attempt so a guard's `CONFLICT` still surfaces immediately. The callbacks are idempotent under retry by construction: all twelve read their state *inside* the transaction, and `wake()` is always called after commit.

**Ownership** — SupplierOrder owns the supplier loop (ADR 0003). Packages/shipments are owned by the logistics services; fractionation and dispatch registration are their orchestration commands. The projector exclusively owns `fulfillmentStatus` and the order completion roll-up. **Both halves are real since Phase 4b**: `TrackingStatusProjector` writes `cartItem.fulfillmentStatus` and `UserOrderClosureProjector` writes `UserOrder.status`, the second running after the per-cart-item loop and deduped per *order* rather than per item. Its ownership is **partial by design and that is the safety property**: `UserOrder.status` is co-owned with the payment domain (`mercadopago-reconciliation.service.ts`, `checkout.data.ts`), so the roll-up only ever writes *from* `processing` — enforced in the pure rule and again in the SQL `where`, because the read and the write are separated by the derivation.

**Control flow of a status action**

```
UI (availableActions from server)
  → router (admin procedure, zod command schema)
    → orchestration service [tx]
        transition map guard → mutation + cascades → effects handler → DomainEventPublisher → audit log
    → commit → DomainEventDispatcher.wake()
        → tracking listener → tracking events (history)
            → derivation projector (fulfillmentStatus, per cart item)
            → closure projector (UserOrder.status, per order, only from `processing`)
```

**Extension points** — cut-absorption policy is a strategy (LIFO default, manual override input; future policies plug in like `OperationStrategy`); transition maps are data; effects handlers per source.

## 11. Data and state model

**Schema changes (all additive):**
- `Package.leg` enum `inbound | outbound` (ADR 0004), `@default(inbound)` with `@@index([leg])`. — **shipped in Phase 3**, applied with `db:generate` + `db:push`, no migration file. **Correction:** the seeds were **not** backfilled — the §21 rollout policy forbids editing `prisma/seed.ts`, so pre-existing packages take the default and the resulting drift is enumerated in §21.4 instead.
- `OperationStatus` gains `cancelled`. — **shipped in Phase 2**.
- `CartItemTrackingEventType` gains `excludedFromOperation` (operation compensation notice). — **shipped in Phase 2**.
- `RollOver` gains `rebatchedIntoOperationId Int?` + named relation `RollOverRebatchedInto` — the operation that *consumed* the roll over, written by execution wherever it marks one `rebatched`. — **shipped in Phase 2**, added by that phase's grill: `RollOver.operationId` records only the operation that *created* it, and `groupAssignments` merges original and roll-over demand for the same cart item into one bridge row, so without this column the consumed roll overs can only be recovered by re-reading `metadata.sourceRollOverId` out of the event log. Built with `onDelete: SetNull` so `operation.remove` cannot be blocked by a back-link.
- `CartItemTrackingEventType` gains `rollOverResolved` (roll over resolution notice) — **shipped in Phase 1**, applied with `db:generate` + `db:push`, no migration file.
- `Shipment.deliveryMode` + `DeliveryMode` enum (`homeDelivery | pickupPoint`, nullable) — **shipped in Phase 4b** (§21.7), applied with `db:generate` + `db:push`, no migration file. Null on `internalTransfer` by construction; **depot pickup is deliberately not a value** — it is the absence of a shipment. Prisma cannot express the conditional NOT NULL, so `shipment.endUser.noDeliveryMode` (critical) is the enforcement.
- `CartItemTrackingEventType` gains `arrivedAtPickupPoint` (pickup-point arrival notice) — **shipped in Phase 4b**, rendered as a journey notice and deliberately absent from both stage maps.
- No new tables.

**Status semantics** — ladders as commented in `prisma/schema.prisma`, transitions enforced by the shared maps. Notable rules: `Package received → inTransit` is legal only via reassignment to a new shipment (promotion / retry); `readyForShipment` also covers "ready for pickup"; SupplierOrder timestamps (`requestedAt/confirmedAt/cancelledAt`) are written by their transitions.

**Operation counters** — `eligible/assigned/rollOver` quantities and counts become **live aggregates** maintained by every post-execution quantity move; the `summary` JSON stays the immutable execution snapshot. Balance diagnostics stay valid at all times. **Implemented in Phase 1** with one refinement worth carrying forward: "maintained" means **recomputed from live records** inside the same transaction (`recomputeOperationCounters`), never adjusted by deltas — a recompute cannot drift. Only the six live counters are written; `eligibleQuantity` and `eligibleItemCount` are **never** recomputed post-execution, which is precisely what keeps the balance rule true across a cut (a cut moves quantity from `assigned` to `rollOver`, so their sum is invariant).

**Derivation (ADR 0002)** — precedence: `cancelled` (demand cancelled) > `exception` (live delayed/failed lineage) > roll over overlay > furthest stage backed by records (delivered ← outbound received ← in end-user shipment ← at warehouse ← in internal shipment ← packaged ← supplierConfirmed ← requestedFromSupplier ← allocated ← included ← awaiting). Roll over overlay (resolved in the Phase 0 grill): open roll over quantity with **no** live allocation left → `rolledOver`; open roll over quantity while the live part is still **below** `packaged` → `partiallyRolledOver`; once the live part reaches `packaged` or beyond the ladder wins and the open roll over is communicated as a journey notice plus a diagnostic — so a partially cut order can still reach `delivered` and close its `UserOrder`. Derivation is total: an item with no backing record floors at `awaitingAggregation`, which is what lets it clear a stale `exception`. **Correction applied in Phase 2:** the `includedInOperation` floor in `deriveStage` counted roll overs regardless of status, so a compensated item — whose roll overs are all `cancelled` — stuck at `includedInOperation` instead of falling to `awaitingAggregation`. The floor now counts non-`cancelled` roll overs only. **Phase 3 made `Package.leg` the authoritative leg source**, replacing the shipment-type inference: `packagedStage` picks the branch by leg and the distance by package/shipment status (`packaged` before departure → `inInternalShipment`/`inEndUserShipment` once departed → `atWarehouse`/`delivered` once arrived), and `deriveStage` takes the **max rank** over the live packaged allocations rather than the first branch that matches. `UserOrder → completed` when all items are terminal and ≥1 delivered; all-cancelled orders → `cancelled`. **Implemented in Phase 4b** (§21.7) as `deriveUserOrderClosure` + `UserOrderClosureProjector`, resolving §20.2: terminal = `{delivered, cancelled}` (`rolledOver` is **not** terminal), and the roll-up only ever writes **from `processing`** — enforced in the pure function *and* in the SQL predicate — which makes it structurally unable to downgrade a payment outcome. **Phase 4b also corrected the precedence chain**: an item with nothing live, no `open` roll over and ≥1 `resolved` one now derives `cancelled` (resolving is terminal and moves no money, ADR 0005) instead of falling through to the `includedInOperation` floor, which regressed it from `rolledOver` and left its order permanently uncloseable. The branch sits after the `exception` short-circuit and before the roll over overlay.

**Conservation (ADR 0005)** — per-leg package conservation: Σ packaged allocations of a leg ≤ demand allocation quantity; demand-level invariant as defined in the ADR.

**Idempotency** — event keys keep the existing deterministic scheme; derivation makes projection retries harmless by construction.

## 12. API, event, and integration contracts

**Domain events activated (already declared, gaining producers):** `supplier.lotItem.confirmed` ✅ **Phase 1**, `rollover.postAllocation.created` ✅ **Phase 1**, `package.cartItem.packaged` (emitted when demand quantity is first covered by inbound package allocations at dispatch registration), `shipment.internal.dispatched`, `shipment.internal.received`, `shipment.endUser.dispatched`, `shipment.endUser.delivered`, `fulfillment.exception.created`, `fulfillment.exception.resolved` — of which `package.cartItem.packaged`, `shipment.internal.dispatched`, `shipment.internal.received` and `fulfillment.exception.created/resolved` gained producers ✅ **Phase 3**, leaving only the two `shipment.endUser.*` unpublished (§3) — **and those gained producers in Phase 4b** (`shipment.dispatch` on the outbound path, `shipment.deliver` on `homeDelivery`, and `package.confirmDelivery` for depot pickup and pickup-point collection). **No declared type is unpublished any more.**

**New domain events:** `supplier.cartItem.requested` (per affected cart item, mirrors `operation.cartItem.included`; maps to the orphan `includedInSupplierOrder` tracking type — makes journey stage 4 reachable), `rollover.resolved` (an operator closed an open roll over with a mandatory reason; maps to a new `rollOverResolved` tracking type rendered as a journey notice, not a stage) and `operation.cartItem.excluded` (compensation; maps to new `excludedFromOperation` tracking type rendered as a journey notice, not a stage). The first two shipped in Phase 1 (§21.2), the third in Phase 2 (§21.3) — all three published. **Phase 4b adds a fourth**, `shipment.endUser.arrivedAtPickupPoint` (a `pickupPoint` shipment reached its collection point; maps to the new `arrivedAtPickupPoint` tracking type, rendered as a notice and never a stage — the arrival is not the handover).

**Contract adjustments:** the end-user delivery event anchors on the **package** (`packageId` required, `shipmentId` optional) so depot pickup emits the same fact without a shipment. **Still owed — re-verified 2026-07-26 after Phase 4a:** `shipmentEndUserDeliveredEventSchema` **and `shipmentEndUserDispatchedEventSchema`** both continue to require `shipmentId` and carry `packageId` as optional — the adjustment applies to **both**, not only the delivered one as originally written here. **Applied in Phase 4b** (§21.7): both schemas now require `packageId` and make `shipmentId` optional. `aggregateType` stays `"Shipment"` deliberately — the aggregate is still the movement, and changing it would churn the outbox for no gain.

**Router surface:** new `admin.supplierOrder` router (request / confirm / cancel / line-cancel / **register-dispatch**) ✅ **Phase 1 + Phase 3**, extended `admin.package`/`admin.shipment` routers — **corrected by Phase 3**: dispatch registration lives on `admin.supplierOrder`, not on `admin.lot`/`admin.package`/`admin.shipment`, because the supplier order commands it and the shipment plus package are its outputs (ADR 0003). `admin.shipment` gained `dispatch` / `receive` / `markDelayed` / `markFailed` / `retry` and `admin.package` gained `writeOff` ✅ **Phase 3**; `admin.package` gained `fractionate` / `promote` / `split` / `markDelayed` / `markFailed` ✅ **Phase 4a** (§21.6) — `fractionate` outputs `{ createdPackageIds, sourcePackageIds }` and `split` outputs `{ sourcePackageId, createdPackageIds }` rather than a detail, following `operation.remove`'s precedent, because neither has a single result row. `admin.shipment` gained `createEndUser` / `addPackages` / `deliver` and `admin.package` gained `confirmDelivery` / `recover` ✅ **Phase 4b** (§21.7) — `createEndUser` returns the **new** shipment's detail, so the client follows the result id, as `retry` and `operation.rerun` already require; `consolidate` stays deferred, extended `admin.operation` (`cancel` / `rerun` / `remove`) ✅ **Phase 2** — `rerun` is **one** procedure carrying the create parameters plus the source id, branching internally by status, and it may return a *different* operation than the one it was called on; `remove` outputs `{ id }` rather than a detail, since the row is gone. Roll over resolve on `admin.operation` or its own router — resolved to its **own `admin.rollOver` router** ✅ **Phase 1** (§20.2). All list/getById responses gain `availableActions` computed from the transition maps — **`admin.supplierOrder`, `admin.operation`, `admin.shipment` and `admin.package` do** (the last two ✅ **Phase 3**, `package`'s grown from one key to six ✅ **Phase 4a**, then to eight and `shipment`'s to seven ✅ **Phase 4b**); **`lot` computes them too since Phase 4b** — every supplier-order key, all disabled, each naming the order that commands it (ADR 0003). `admin.rollOver` gained `list` + `getStats` and a page at `/admin/roll-overs` ✅ **Phase 4b**. ~~CarrierOrder router deferred (Phase 5)~~ **`admin.carrierOrder` shipped ✅ Phase 5** (§21.8) with fifteen procedures — `list` / `getById` / `getStats`, `create` / `update` / `softDelete` / `hardDelete`, the six ladder commands, and `addShipments` / `removeShipment`; its list items carry `availableActions` too, since its table is one of the two with a row menu (`operation`'s is the other). Manual CRUD **plus a guarded ladder**, and **no domain events** — the customer journey feeds from shipment states only. The two deletes output `{ id }` rather than a detail, following `carrier`'s precedent.

Compatibility: no external consumers; internal listener registration must grow in lockstep with the schema unions (the 10-step recipe in `docs/tracking-architecture.md`).

## 13. Security, permissions, and compliance

All commands are admin-only through the existing admin router guard; every mutation writes `writeAdminAuditLog` with effect summaries (established pattern). No new sensitive data classes; address/contact snapshots on shipments already exist. Abuse surface is internal misuse — mitigated by transition maps (no illegal jumps), mandatory reasons on destructive paths (write-off, resolve, discrepancy, compensation), and append-only history.

## 14. Operational model

- **Monitoring = diagnostics**: each phase's correctness is observable on the existing diagnostics surfaces; they gained leg scoping (**shipped Phase 3**: `package.leg.overAllocated`, `package.leg.missingShipment`, plus `shipment.failedWithoutFollowUp`, `shipment.received.linesNotReceived` and two new `supplierOrder.*` rules), cancelled-record scoping (**shipped Phase 1**, plus four new `supplierOrder.*` rules, **extended to the package and shipment rules in Phase 3**), and a "roll over open older than N operations" signal (**shipped Phase 0**). **Phase 4b added the delivery rules** (§21.7): `shipment.endUser.noDeliveryMode` (critical), `shipment.pickupPoint.pendingCollection` (warning), and a severity refinement on `package.outbound.multiCustomer` — warning on a pickup point, critical on a home delivery. It also **exempts a delivered `pickupPoint` shipment from all three `received`-row rules**, because its packages correctly stay `inTransit` until collected; the exemption is scoped to that mode only, and `pendingCollection` replaces the signal rather than removing it. **Phase 5 added its own module** (§21.8) with four `carrierOrder.*` rules, all `warning`: `status.aggregateAheadOfShipments`, `noShipments`, `closedWithLiveShipments` and `shipment.disrupted` — the aggregate rule exempts disrupted shipments and hands them to the disruption rule, which is itself silent on a `cancelled`/`failed` booking. It is `warning` rather than `critical` on purpose: a booking carries no quantity and nothing derives from its status. Diagnostics never mutate.
- **A cancelled operation is exempt from every existing operation rule** (**shipped Phase 2**) and carries one of its own, `operation.cancelled.notCompensated` (critical), which fires when a live lot item or an own `open` roll over survives the compensation. The exemption is not tidiness: after compensating, the live counters recompute to zero while `eligibleQuantity` stays the frozen execution snapshot (§11), so `operation.quantity.balanceMismatch` would fire on every cancelled operation by construction. Recomputing `eligibleQuantity` to "fix" it is the wrong repair — it is what keeps the balance rule true across a supplier cut.
- **Remediation paths are first-class actions** (retry, write-off, resolve, discrepancy) — no manual SQL runbooks.
- **Outbox retries** are safe by derivation; `trackingStatusProjectionSkipped` warnings remain the signal for missing evidence.
- **Performance**: derivation adds one bounded lineage query per projected item inside the listener tx; acceptable at current scale (single-digit admins, batch sizes bounded by operation size).

## 15. Architectural decisions made

| # | Decision | Status | Rationale | Alternatives | ADR |
| --- | --- | --- | --- | --- | --- |
| 1 | SupplierOrder commands the supplier loop; cascades to Lot/LotItem | accepted | commercial artifact owns the invariant | Lot-level; LotItem-level | 0003 |
| 2 | Partial-confirmation cut absorbed LIFO by payment date, optional manual override per allocation | accepted — **implemented Phase 1** (`supplier-order-absorption.ts`); overrides *replace* LIFO rather than seeding it | mirrors FIFO fairness; zero-friction default | pure LIFO; pro-rata; always manual | — (strategy point, §10) |
| 3 | Demand conservation invariant; open-only exclusion; `includeRollOver` default true; resolve/cancel semantics | accepted | fixes #33/#34; paid demand never strands | keep opt-in default | 0005 |
| 4 | fulfillmentStatus derived from lineage; order completion rolled up | accepted | idempotent, kills #12/#14 | lookup + monotonic guard; hybrid | 0002 |
| 5 | Shared declarative transition maps + cross-entity guards; consumed by services/diagnostics/UI | accepted — **fully realized in Phase 1**: diagnostics (Phase 0), service guards and server-computed `availableActions` (Phase 1); the UI renders them and re-derives nothing | one truth, ends duplication | ad hoc; xstate | no — reversible mechanism |
| 6 | Packages physical, legged, flexible granularity, auto-consolidated default, split/fractionate/promote actions | accepted — **fully implemented**: the leg, the auto-consolidated inbound package and per-leg conservation in Phase 3; **`split`, fractionation and promotion in Phase 4a** (§21.6), split at quantity granularity rather than whole-lines-only. **`consolidate` stays deferred**, because 4a's fractionation groups by customer in one step and removes its main use case | represents real bundles; receipt control | logical-first per-customer; outbound-only | 0004 |
| 7 | Dispatch registration creates shipment + consolidated package in one action; N dispatches per supplier order | accepted — **implemented Phase 3** (§21.4) with one correction: registration and *departure* are **two** commands (`registerDispatch` then `shipment.dispatch`), because a single step would make the `packaged` stage unobservable on the inbound leg. N dispatches per order works by accepting `readyForReceipt` as a second entry point, which is deliberately not a ladder move | partial supplier deliveries first-class | separate manual steps; one-step dispatch | no |
| 8 | Three delivery modes converging on package-received evidence; delivery auto by default, per-customer confirmation optional | accepted — **implemented Phase 4b** (§21.7) with one sharpening: **two modes are stored and one is derived**. `Shipment.deliveryMode` holds `homeDelivery \| pickupPoint`; depot pickup is the *absence* of a shipment. "Auto by default" is true only of `homeDelivery`, where `shipment.deliver` cascades its packages to `received`; a `pickupPoint` arrival is **not** a handover, so its packages stay `inTransit` and each customer confirms with `package.confirmDelivery` | flexibility principle | always-manual delivery | no |
| 9 | `UserOrder.completed` derived, never manual | accepted — **implemented Phase 4b** (§21.7): `UserOrderClosureProjector` runs after the per-cart-item projection, deduped per order, and writes only from `processing`. That gate — in the pure function and in the `where` clause both — is what keeps it from fighting the payment domain | single writer, no human forgetting | manual close action | covered by 0002 |
| 10 | CarrierOrder: contract designed, implementation deferred, no domain events | accepted — **implemented Phase 5** (§21.8) with one refinement: the design said "manual CRUD" and what shipped is CRUD **plus a guarded ladder**, because #5 governs every status in the system and a free `<Select>` would have been the first un-guarded status write in fulfillment. **"No domain events" held exactly as written** — it is the single service with no effects handler, no dispatcher wake-up and no `AdminOperationsMutationSource` entry | nothing upstream depends on it | implement now; drop | no |
| 11 | Operation cancel only in administrative window (measured over **live** supplier orders); compensation is **status-only — nothing is deleted**: created roll overs → `cancelled`, consumed roll overs → `open` via `rebatchedIntoOperationId`, `listOriginalDemand` narrowed to live allocations; compensating events; re-run = one command, three paths (retry in place for `failed`, compensate+new for `completed`, new only for `cancelled`), parameters operator-editable with `includeRollOver` defaulted true; delete = `failed` ∧ childless only | accepted — revised by the Phase 2 grill 2026-07-26 (the original "allocations bridge deleted" form lost demand, §8) and **implemented as revised, Phase 2, §21.3** | admin undo vs commercial undo kept apart; conforms to ADR 0005 rather than amending it; keeps Phase 1's "records survive, statuses move" rule | deep cascade cancel; delete the bridge; compensating roll over per allocation (§17) | no — ADR 0005 already governs it, §16.2 |
| 12 | Exceptions derived from delayed/failed lineage; failed requires retry-or-write-off; discrepancies go straight to roll over | accepted — **implemented for the internal leg in Phase 3** (§21.4): `markDelayed`/`markFailed` publish the exception per cart item and derivation clears it on `receive`, `retry` or `writeOff`. "Requires retry-or-write-off" is enforced as a **worklist signal** (`shipment.failedWithoutFollowUp`), not a hard block — diagnostics never mutate (§14). **Phase 4a added the package level** (§21.6): `package.markDelayed`/`markFailed` on any live package, with or without a shipment, plus `shipment.package.disrupted` so one lost box does not fail its whole shipment's critical rule. **Phase 4b shipped recovery** as `package.recover` (§21.7), with the target *derived from the record* rather than asked: no shipment or not departed → `readyForShipment`, already travelling → `inTransit`. It refuses while the shipment is itself disrupted, because `isDisrupted` reads both levels and recovering only the package would leave the item at `exception` — a command that appears to do nothing | consistent with derivation; no new lifecycle | exception table; rollover-only | no |

## 16. ADRs

### 16.1 ADRs created
| ADR | Path | Decision summary |
| --- | --- | --- |
| 0002 | `docs/adr/0002-fulfillment-status-derived-from-lineage.md` | events are facts; status derived from lineage |
| 0003 | `docs/adr/0003-supplier-order-commands-the-supplier-loop.md` | SupplierOrder is the command aggregate |
| 0004 | `docs/adr/0004-physical-packages-with-legs.md` | physical packages, inbound/outbound leg, per-leg conservation |
| 0005 | `docs/adr/0005-demand-conservation-and-rollover-reaggregation.md` | conservation invariant; re-aggregation by default |

### 16.2 ADR candidates not created
| Decision | Why no ADR | Captured where |
| --- | --- | --- |
| Administrative-window compensation (status-only, no deletion) | ADR 0005 already governs the roll over semantics it turns on, and the Phase 2 grill **conformed the design to that ADR instead of amending it** — there was no new decision left to record. The earlier "deleting the allocation bridge" framing was withdrawn, not deferred | §8, §15 #11, ADR 0005 |
| Shared transition maps | mechanism, cheaply reversible | §15 #5 |
| Derived exceptions without a table | additive to introduce a table later | §15 #12 |
| The `Shipment.deliveryMode` column and its two-values-plus-an-absence shape | a cheaply reversible mechanism: an additive nullable column, droppable without touching the domain rules. It implements §15 #8 rather than deciding anything new | §11, §15 #8, §21.7 |
| The `UserOrder` closure matrix and its `processing`-only gate | implements ADR 0002's "order completion rolled up" clause; the gate is a mechanism, not a decision about the domain | §11, §15 #9, §20.2, §21.7 |
| A resolved roll over deriving `cancelled` | ADR 0005 already states that resolving is a terminal decision moving no money — the previous behaviour was a **defect** against it, not an alternative reading | §11, §21.7, ADR 0005 |

### 16.3 ADRs to revisit later
- External supplier/carrier integration pattern, if/when APIs replace manual `externalReference`.

## 17. Alternatives rejected

| Alternative | Why attractive | Why rejected | Reconsider if |
| --- | --- | --- | --- |
| Logical-first per-customer package riding both legs | one identity end-to-end, simplest conservation | packages must represent the supplier's real physical bundles; a package must not predate physical existence | never — contradicts operator's model |
| Monotonic-rank projector guard (keep lookup) | minimal diff | keeps dual truth; per-event maintenance grows with 9+ new producers | n/a — superseded by derivation |
| Deep operation cancel (cascade through requested supplier orders) | one powerful button | mixes administrative undo with commercial undo; race-prone | if operators demand it after Phase 2 experience |
| Compensation by minting a post-allocation roll over per live allocation | simplest to build — reuses Phase 1's `persistRollOvers` verbatim, needs no new column and no query change | double-counts against ADR 0005: reverting a consumed roll over *and* minting a compensating one returns 10 units for 5 paid. Would only work by *not* reverting, which contradicts the ADR's stated consequence | only alongside a deliberate ADR 0005 amendment |
| Deleting the allocation bridge on compensation (the original §8 wording) | no query change; original demand returns as original demand | loses the assigned quantity of any partially rolled-over cart item (§8 counter-example), and nulls `CartItemTrackingEvent.cartItemLotItemId` — the same history damage Phase 1 refused | never — superseded by the narrowed demand query |
| Persistent FulfillmentException entity | explicit worklist, assignees | over-engineering now; diagnostics are the worklist | operators outgrow diagnostics |
| xstate / FSM framework | formal rigor | fights the mandated transactional write path; overkill for linear ladders | never for this scale |

## 18. Risks and trade-offs

| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| Derivation precedence subtly wrong | wrong customer-facing status | medium | medium | property-style tests per lineage fixture; diagnostics cross-check |
| Live counters drift from records | balance diagnostics red / silent imbalance | medium | high | **retired by Phase 1's choice of recompute-from-records** — counters are recomputed inside the same tx as the quantity move, so there is no delta to drift; the diagnostic remains an independent check and shares its predicate with the computation |
| LIFO cut surprises a customer | support burden | medium | low | journey notice + audit reason; manual override exists. Phase 1 also surfaces the absorption order (`absorptionOrder`, `paidAt`) in the detail dialog *before* confirming |
| Serializable contention on big confirmations | latency/retries | low | low | operation-scoped writes, short txs. **Correction (verified 2026-07-26): no retry-on-serialization-failure wrapper exists in the repo** — this row previously claimed "pattern exists" and was wrong. `executeOperation` and Phase 1's three `Serializable` commands all surface a raw Prisma error under contention; **Phase 2 adds two more** (`operation.cancel`, `operation.rerun`), and `rerun`'s transaction is the longest in the system since it holds a compensation *and* a full execution. **Phase 3 adds three more** (`supplierOrder.registerDispatch`, `shipment.receive`, `package.writeOff`), taking the total to **nine**, and **Phase 4a added three more** (`package.fractionate`, `package.promote`, `package.split`) for **twelve** ✅ **as predicted**. **✅ Discharged in Phase 4b** (§21.7): `runSerializable` in `_base/serializable-transaction.ts` is now the only place `Serializable` is requested, retrying a bounded 3 attempts on P2034 (and defensively on a raw `40001`) and re-throwing everything else on the first attempt. All twelve call sites go through it; 4b adds no thirteenth, because it moves no quantity. Each callback was verified to read its state *inside* the transaction, so a retry re-reads and re-plans |
| `includeRollOver: true` default pulls old demand into a themed operation | operator surprise | medium | low | visible flag at creation; diagnostic for stale open roll overs |
| ~~Compensation deletes allocation rows another admin is viewing~~ **retired by the Phase 2 grill** | — | — | — | compensation deletes nothing; rows survive with `cancelled` statuses |
| The narrowed `listOriginalDemand` double-counts a Phase 1 supplier-cancelled item | paid demand aggregated twice | low | high | the `rollOvers: { none: { status: "open" } }` clause is untouched and always covers that path, because supplier-loop cancellation always mints an open roll over. Never weaken the two clauses together |
| A re-run clones `includeRollOver: false` and strands what the compensation just released | demand silently parked in open roll overs | medium | high | the re-run dialog defaults the flag to `true` regardless of the source; `operation.rollOver.stale` catches survivors |

## 19. Assumptions

| Assumption | Why reasonable | What could invalidate it | What to do if false |
| --- | --- | --- | --- |
| No production deployment yet; no data backfill beyond seeds | repo shows sandbox-enablement still in planning (`docs/plans/mercadopago-checkout-pro-sandbox-enablement.md`) | a live deployment exists | add data migration + flagging strategy to §21 |
| Admin team is small and trusted; no per-action RBAC needed | current admin guard is binary | role separation requirement | permission matrix per command family |
| One lot per supplier order remains the executed shape | `operation-execution.service.ts` creates 1:1 | multi-lot supplier orders | ADR 0003 already commands at order level — cascades unaffected. **Phase 1 does not depend on it**: the commands iterate `order.lots` and recompute counters per *distinct* operation id, so a multi-lot order touches more rows and needs no code change. **Phase 2 does depend on the narrower shape** — compensation cancels a supplier order wholesale, so it must refuse (CONFLICT) any order holding lots outside the operation being compensated. **Phase 3 does not depend on it either**: `registerDispatch` iterates `order.lots`, and `receive` groups its closing rule by supplier order and recomputes counters per *distinct* operation id, so a multi-lot order touches more rows and needs no code change |
| A `failed` operation has no lots or roll overs | `executeOperation`'s transaction is atomic, so a failure leaves nothing behind | seeded or hand-edited rows — `operation.failed.withOutputs` exists for exactly this | Phase 2's `rerun` and `remove` guards check the outputs explicitly, not just the status |
| Refunds handled outside fulfillment | user accepted resolve-without-money | business wants integrated refunds | separate design-grill touching the payment context |
| A `homeDelivery` shipment serves exactly one customer | `Shipment.destinationAddressSnapshot` is a single JSON blob, so one address means one customer | multi-stop delivery routes become real | drop the one-cart guard in `loadAssignablePackages` and move the address to the package — a schema change and its own grill. The guard is a command rule, not a constraint, so dropping it is a one-line change plus flipping `package.outbound.multiCustomer` back to a uniform warning (§21.7) |
| P2034 is Prisma's code for a serialization failure on Postgres | Prisma maps SQLSTATE 40001 to P2034 | a Prisma major upgrade changes the mapping | `runSerializable` also matches a raw `40001` in the message of a `PrismaClientUnknownRequestError`, defensively; the unit test pins both paths (§21.7) |

## 20. Open questions

### 20.1 Blocking (resolve before a phase enters a feature/execution plan)
| Question | Why it matters | Recommended default | Resolver |
| --- | --- | --- | --- |
| — none — | all blocking decisions were resolved in-session | | |

### 20.2 Non-blocking
| Question | Why it matters | Recommended default | Resolver |
| --- | --- | --- | --- |
| ~~Exact UserOrder terminal matrix (mixes of delivered/cancelled/resolved items)~~ **resolved (Phase 4b)** | order closure semantics | terminal = `{delivered, cancelled}`; all terminal ∧ ≥1 delivered → `completed`; all cancelled → `cancelled`; anything else → **no write**. `rolledOver` is deliberately **not** terminal. The payment domain is protected structurally rather than by a deny-list: the roll-up only ever writes *from* `processing`, so `refunded`/`chargedBack`/`failed`/`completed`/`cancelled` are all outside its source set. Implemented as `deriveUserOrderClosure` (§21.7) | — |
| ~~LIFO tiebreaker for equal `paidAt`~~ **resolved (Phase 1)** | determinism | latest `orderItemCreatedAt`, then highest `cartItemId`; a `null` `paidAt` sorts as most recent so it absorbs first. Implemented in `orderCandidatesLifo` (`src/server/services/admin/supplier-order-absorption.ts`) | — |
| ~~Where the roll over resolve action lives (operation router vs own router)~~ **resolved (Phase 1)** | API tidiness | own small `admin.rollOver` router with a single `resolve` mutation; reachable from the operation detail dialog, which already renders the roll over cards | — |
| ~~Naming/location of the transition-map module~~ **resolved (Phase 0 grill)** | consistency | `src/shared/common/fulfillment-transitions.ts` — pure data next to `tracking-display.ts`; carries the aggregate↔lines compatibility tables and the entity-status→stage maps. Legal per-entity ladders are deferred to Phase 1, where the first guard exercises them | — |
| ~~Whether multi-customer outbound packages need per-customer journey notices before individual confirmation~~ **resolved (Phase 4b)** | customer comms fidelity | a **shipment-level arrival notice**, not per-customer ones: `arrivedAtPickupPoint` is published per affected cart item when a `pickupPoint` shipment is delivered, rendered as a journey notice and never a stage. Arrival is not the handover — `delivered` still comes from each customer's own `package.confirmDelivery` (§21.7) | — |
| Whether `operation.rollOver.open` should keep firing on the operation that *owns* a reverted roll over | list noise vs worklist fidelity | keep firing — a reverted roll over genuinely needs a new operation, which is exactly what the rule is for | **still open, with a sharper resolver (2026-07-27).** The closure's end-to-end run (§21.10) discharged A1 but **did not exercise this shape**: §21.7's twelve steps contain no compensation, so no roll over was ever reverted to `open` during it. The seed now carries both ingredients separately — a `rebatched` roll over with a live `rebatchedIntoOperationId` back-link, and a compensated operation with its own roll overs `cancelled` — but not the composition. **Resolver:** run `operation.cancel` on an operation that has *consumed* another's roll over (aggregate with `includeRollOver: true` so the back-link is written, then compensate), and judge whether the owning operation's re-fired `operation.rollOver.open` reads as useful or as noise on the operations list. Do not close it without that |
| ~~Whether `Operation` deserves a `cancelledAt` column~~ **resolved (Phase 2)** | UI wants to show when compensation happened | no column: `updatedAt` plus the `operation.cancel` audit entry cover it, and the detail view shows neither. Revisit only if an operator asks when a compensation happened without opening the audit log | — |

### 20.3 Optional refinements
- ~~`availableActions` could include disabled-with-reason entries for better UI hints.~~ **Adopted in Phase 1** and made the norm: `supplierOrderAvailableActions` returns every command key on every call, disabled entries carrying a Spanish reason, and the UI renders them as `aria-disabled` buttons with the reason in a tooltip. Later phases should follow the same shape.
- A diagnostics code for "active fulfillment exception" as an explicit worklist row. **More useful since Phase 3**, which made `exception` reachable at runtime; `shipment.failedWithoutFollowUp` covers the failed-shipment half of it already.
- A `dispatch.notReceived after N days` diagnostics code, complementing `operation.rollOver.stale` (raised during the Phase 3 grill, not built), its `package.received.notFractionated after N days` sibling (raised during the Phase 4a grill, not built), and a `package.outbound.notCollected after N days` sibling for pickup points (raised during the Phase 4b grill, not built).
- A "receive everything in full" one-click path on the receive dialog, distinct from submitting the pre-filled form (raised during the Phase 3 grill; the form already defaults to full, so this is convenience only). The Phase 4a grill made the same call for the fractionate dialog, which also defaults to full.
- A multi-select on the packages list feeding `package.fractionate`'s `sourcePackageIds`. The command already takes a list and groups by cart across the whole selection; the UI built in Phase 4a only ever sends the open package (§21.6).
- Delegating `lotAvailableActions` to `supplierOrderAvailableActions` for real enablement rather than a uniformly-disabled list. It needs order-wide inputs (live line count and dispatchable quantity across *all* the order's lots) that a lot record does not carry, so it needs a wider lot select (raised and deferred during the Phase 4b grill; §21.7).
- A diagnostics code for "supplier order requested more than N days ago without confirmation", complementing `operation.rollOver.stale` (raised during the Phase 1 grill, not built). Its carrier-side sibling, `carrierOrder.requestedNotConfirmed after N days`, was raised during the Phase 5 grill and is also not built (§21.8).
- **Carrier-order refinements raised during the Phase 5 grill and deliberately not built** (§21.8): promoting `carrierOrder.status.aggregateAheadOfShipments` from `warning` to `critical`, *only* if a consumer ever derives from booking status — today nothing does, which is the whole argument for `warning`; a `carrierOrder.deletedWithLiveShipments` rule, currently unreachable by command because `softDelete` refuses while live shipments hang off the order; a `restore` command for soft-deleted bookings, withheld for parity with `carrier`, which has none either; a "sin orden de transporte" filter on the shipments page, pairing with the existing `shipment.carrierOrder.missing` rule; and a structured zod schema for `CarrierOrder.metadata`, as the `TODO`s on `Carrier.address`/`contactInfo` already foresee for that entity.
- ~~A `list` procedure on `admin.rollOver` and a dedicated roll overs page~~ **shipped in Phase 4b** (§21.7): `admin.rollOver.list` + `getStats` behind `/admin/roll-overs`, with status/stage/operation/cart-item/date filters and the existing resolve dialog reused. It deliberately does **not** hide `resolved` by default, because 4b made those terminal.

## 21. Rollout and implementation stages (high-level)

> Broad strokes only — a later `feature-grill` turns one phase into an execution plan.

### Phasing

| Phase | Delivers (capability level) | Why sequenced here | High-level entry/exit |
| --- | --- | --- | --- |
| **0 — Foundations** ✅ **done (2026-07-25)** | Derivation projector (kills #12/#14); shared transition maps consumed by diagnostics; re-aggregation fixes (#34) | everything else stands on these; verifiable with the 9 existing event producers before any new ones exist | entry: none · exit: derivation unit-tested against fixtures mirroring every seed lineage; diagnostics behaviour unchanged except the two intended semantic fixes. Extending the effects framework to `lot`/`package`/`shipment` moved to Phase 1, where the first real command shapes its change set — **exit met, see §21.1** |
| **1 — Supplier loop** ✅ **done (2026-07-26)** | Request / confirm (full & partial) / cancel on SupplierOrder with cascades; post-allocation roll overs (#33); roll over resolve; live operation counters; journey stages 4–5 reachable | the frozen chain's first business value | entry: Phase 0 · exit: a real supplier order can be driven pending→confirmed with partial cuts conserving demand — **exit met, see §21.2** |
| **2 — Operation compensation** ✅ **done (2026-07-26)** | Cancel (administrative window) / re-run / delete; `cancelled` status; `rebatchedIntoOperationId` back-link; narrowed demand query; compensating events | window semantics become real once orders can leave `pending` | entry: Phase 1 · exit: the three stub buttons work per §8 **as revised**, and demand conservation holds across a compensate-then-re-aggregate cycle — **code exit met, see §21.3; the manual re-aggregation run is still owed** |
| **3 — Goods inbound** ✅ **done (2026-07-26)** | Dispatch registration (internal shipment + consolidated inbound package); receipt with discrepancies → roll over; internal-leg delayed/failed with retry or write-off; journey stages 6–8; the `cancel`-after-packaging guard. **split/consolidate moved to Phase 4** | only confirmed goods dispatch | entry: Phase 1 (2 independent) · exit: bulk receipt with shortfall conserves demand end-to-end — **code exit met, see §21.4; the manual run is still owed** |
| **4a — Outbound packaging** ✅ **done (2026-07-26)** | Fractionation (N received inbound packages → one outbound package per customer, partial allowed); promotion; **package split** (inherited from Phase 3); package-level `markDelayed`/`markFailed`; lot/lot-item `readyForPackaging → completed`; outbound-before-departure derives `atWarehouse` | the outbound records must exist before anything can deliver them; needs no schema change at all | entry: Phase 3 · exit: received goods become outbound packages, per-leg conservation green, nothing derives `delivered` before it leaves — **code exit met, see §21.6; the manual run is still owed** |
| **4b — Delivery** ✅ **done (2026-07-26)** | End-user shipments; the three delivery modes (home delivery, depot pickup, group pickup point); delivery confirmation; the two `shipment.endUser.*` producers and their contract adjustment; derived `UserOrder` completion; journey stages 9–10; package recovery; `package.consolidate` if it earns its place | window semantics and order closure only become real once outbound packages exist | entry: 4a · exit: full happy path order→delivered→completed on a real flow — **code exit met, see §21.7: 14 of 14 statuses reachable, zero unpublished event types, `UserOrder` closure derived. The manual run is still owed and is the one item of 4b's scope that did not land** |
| **5 — CarrierOrder** ✅ **done (2026-07-26)** | Carrier order CRUD **plus a guarded ladder** + shipment linking; soft and hard delete; its own diagnostics module; `/admin/carrier-orders`. **No domain events** (§15 #10) | nothing depends on it | entry: 4b · exit: shipments groupable under a carrier booking, and no modelled entity left unreachable — **code exit met, see §21.8; the series debt (manual run, seed realignment, migration authoring) was scoped out and is still owed** |

### 21.1 Phase 0 as built (2026-07-25)

Executed from `tmp/implementation-plan-fulfillment-phase-0-foundations.md`; remediation log in `docs/code-review-codebase-2026-07-22.md` §15.

**Artifacts Phase 1 inherits:**

| Artifact | What it is | How Phase 1 extends it |
| --- | --- | --- |
| `src/shared/common/fulfillment-transitions.ts` | the four aggregate↔lines compatibility tables, `activeDemandFulfillmentStatuses`, `fulfillmentStageRank`/`isStageAtOrAfter` (indexed off `adminTrackingStageKeys`), `stageByLotItemStatus`, `stageBySupplierOrderStatus` | **add the legal per-entity ladders here** — the module was designed additive and this is where the supplier-loop guards read from |
| `src/server/services/tracking/fulfillment-lineage.data.ts` | `FulfillmentLineageSnapshot` + `loadFulfillmentLineageSnapshot(tx, cartItemId)`, one nested `findUnique` | widen the select when a new capability adds evidence (`Package.leg` in Phase 3 replaces the shipment-type leg inference) |
| `src/server/services/tracking/fulfillment-status.derivation.ts` | pure `deriveFulfillmentStatus(snapshot)`, the §11 precedence in full including the branches no runtime path reaches yet | nothing to add for Phase 1's ladder moves — `supplier.cartItem.requested` and partial confirmation already derive; new *stages* extend `deriveStage` |
| `TrackingStatusProjector.project(tx, { cartItemId, eventKey?, eventType? })` | load → derive → write; no event-type table, no per-event evidence gate | a new domain event needs a mapper entry only — no target status to register |
| `TrackingEventService.recordManyFromCommands` | rows in input order, projection deduped per distinct cart item | partial confirmation emits many commands per item and pays for one projection |
| `findStaleOpenRollOverThreshold` + `operation.rollOver.stale` | the §14 "roll over open older than N operations" signal, one query per request, `STALE_ROLLOVER_OPERATION_LAG = 2` | raise the lag if Phase 1's real roll overs make it noisy |

**Settled while building, worth not re-litigating:** the write carries no monotonic guard (`where: { fulfillmentStatus: { not: derived } }` avoids a pointless write, nothing more); derivation is total with an `awaitingAggregation` floor, which is what clears a stale `exception`; `trackingStatusProjectionSkipped` keeps its name and level with a derivation-shaped trigger; the customer journey stays history-derived and is *allowed* to diverge from the column.

**Deliberately not done, and still owed:** #33 (post-allocation roll over on cancellation) is Phase 1's. The legal transition ladders do not exist yet. No migration file was written for `Operation.includeRollOver`'s flipped default, `prisma/seed.ts` was not realigned (the arroz fixture reads `partiallyRolledOver` where derivation now returns `atWarehouse`), and no backfill or recompute script exists — existing rows converge when their next tracking event arrives. `AdminOperationsSideEffects` still handles `cart` sources only.

### 21.2 Phase 1 as built (2026-07-26)

Executed from `tmp/implementation-plan-fulfillment-phase-1-supplier-loop.md`; remediation log in `docs/code-review-codebase-2026-07-22.md` §16.

**Artifacts Phases 2 and 3 inherit:**

| Artifact | What it is | How later phases extend it |
| --- | --- | --- |
| `src/shared/common/fulfillment-transitions.ts` (extended) | the legal ladders `supplierOrderTransitions` / `lotTransitions` / `lotItemTransitions` + `isLegalTransition`, `supplierOrderStatusLineCompatibility`, `unresolvedDemandFulfillmentStatuses`, and `supplierOrderAvailableActions` returning `AvailableAction<K>[]` (every key every time, disabled entries carrying a Spanish reason) | the ladders already declare `readyForReceipt`/`completed` and `readyForPackaging`/`completed`; Phase 3 ships the commands that walk them. Copy the `supplierOrderAvailableActions` shape for `lot`/`package`/`shipment`/`operation` |
| `src/server/services/admin/supplier-order-absorption.ts` | pure `orderCandidatesLifo` + `planCutAbsorption({candidates, cut, overrides?})`, conserving quantity exactly and throwing `AdminCrudError("CONFLICT")` on any invalid override set | Phase 3's receipt-with-shortfall is the same arithmetic on a different trigger — reuse it rather than re-deriving |
| `src/server/services/operations/operation-counters.ts` | pure `computeOperationCounters` + `recomputeOperationCounters(tx, operationId)`, and the `isLiveLotItem` predicate that `calculateOperationDiagnostics` now shares | call the recompute inside every future quantity-moving command, in-transaction, after mutation and before publishing |
| `AdminOperationsSideEffects` (extended) | `supplierOrder` and `rollOver` sources with `SupplierOrderEffects` / `RollOverEffects`, alongside `cart` | `lot`/`package`/`shipment` remain declared and unconsumed; add handlers the same way |
| `src/server/services/admin/supplier-order.{data,service}.ts` + `supplier-order-diagnostics.ts` | the reference implementation of a command aggregate: one transaction, ladder guard, mutation, effects publish in-tx, audit log with effect summaries, `wake()` after commit | Phase 2's operation compensation and Phase 3's inbound commands follow this shape exactly |
| `/admin/supplier-orders` + `RollOverResolveDialog` | list/filters/stats/detail, footer actions rendered straight from the server's `availableActions`, confirm dialog with LIFO preview and per-allocation override editor | reuse the `availableActions`-driven footer for every future command surface |

**Settled while building, worth not re-litigating:**

- **Confirm must cover every live line.** A partial `lines` payload is rejected, not implicitly full-confirmed — an operator who forgets a line would otherwise confirm quantity the supplier never confirmed.
- **A cancelled record keeps its quantity.** Neither `cancel`, `cancelLine`, nor a zero-confirmed line zeroes `lotItem.quantity` or its allocation quantities; the status filter is the only mechanism that removes them from the counters. This keeps `lot.item.quantityMismatch` true for the line's own history.
- **A fully absorbed allocation survives at quantity 0.** `CartItemTrackingEvent.cartItemLotItemId` and `PackageAllocation.cartItemLotItemId` reference it through optional relations, so a delete would silently null historical references.
- **Overrides replace LIFO entirely** rather than seeding it — a partially specified split would silently reintroduce the ordering the operator was overriding. The client preview is advisory; the server replans from its own candidates.
- **`resolve` does not recompute counters.** `rollOverQuantity` counts every non-cancelled roll over (open, rebatched and resolved alike), so resolving one does not move it.
- **`eligibleQuantity`, `eligibleItemCount` and `summary` stay frozen.** Only the six live counters are rewritten, which is what keeps `operation.quantity.balanceMismatch` true across a cut.
- **Cancelled records reached runtime for the first time**, so three existing rules were corrected in the same phase: `lot.status.aggregateAheadOfLines` and the two per-line lot rules now skip cancelled lines; `lot.cancelledWithActiveDemand` reads `unresolvedDemandFulfillmentStatuses` (which excludes `rolledOver`, precisely what a correct cancellation produces); `operation.quantity.assignedMismatch` shares `isLiveLotItem` with the counter computation so the two can never disagree.

**Command surface as built:**

| Command | Isolation | Guard | Quantity effect |
| --- | --- | --- | --- |
| `supplierOrder.request` | default | ladder `pending → requested`, every lot's operation `completed`, ≥1 live line | none |
| `supplierOrder.confirm` | `Serializable` | ladder `requested → confirmed`, payload covers **every** live line exactly once | per line: full → no change; partial → cut absorbed, `lotItem.quantity` reduced, roll over per reduction; zero → line `cancelled`, full roll over, quantities untouched |
| `supplierOrder.cancel` | `Serializable` | ladder allows `→ cancelled` (i.e. status ∈ pending/requested/confirmed), mandatory reason | one roll over per live allocation, at full quantity |
| `supplierOrder.cancelLine` | `Serializable` | same ladder check, line belongs to the order and is not already cancelled, mandatory reason | one roll over per allocation of that line; cascades lot then order when nothing live remains |
| `rollOver.resolve` | default | status must be `open`, mandatory reason | none — records a decision only (ADR 0005) |

Order/lot roll-up on `confirm`: a lot whose every line ended `cancelled` becomes `cancelled`, otherwise `confirmed`; an order whose every line ended `cancelled` becomes `cancelled` + `cancelledAt`, otherwise `confirmed` + `confirmedAt`.

**Gates (2026-07-26):** `pnpm test` (312 passing across 30 files), `pnpm typecheck`, `pnpm build`, and `pnpm biome check` over all 48 touched files are clean. Repo-wide `pnpm check` still reports findings that predate this phase, in files it did not touch (`tsconfig.json`, `package.json`, `src/components/ui/*`, `src/lib/utils.ts`, `.vscode/*`).

New test coverage: the ladders and the `availableActions` matrix; absorption (LIFO order, tie-breaks, `null paidAt`, conservation as a property over several cuts, every invalid override shape); counter computation (executed shape reproduces the executed numbers, cancelled records excluded, resolved roll overs still counted); supplier-order diagnostics; and the corrected lot and operation diagnostics. Every pre-existing case in `operation-diagnostics.test.ts` still passes unmodified.

**Not verified:** no end-to-end run against a seeded database was performed. The suite is `environment: "node"` with no DB fixture harness, so the transactional paths — cascades, roll over creation, in-transaction counter recompute, and projection after `wake()` — are covered by the pure cores and by review, **not by execution**. The manual flow in the plan's §11 is still owed, and per the rollout policy below this phase is not fully signed off until a realistic flow leaves every diagnostics surface clean. Note that the seeded operations cannot serve that run as-is (see the drift table).

**Deliberately still owed:**

- No retry-on-serialization-failure wrapper exists for the three `Serializable` commands. §18's risk row claimed "pattern exists"; that claim was verified false this session and the row is now corrected. Under contention the operator sees a raw Prisma error. Deferred until concurrency actually bites (Phase 2 or 3).
- `SupplierOrder → readyForReceipt → completed` and `Lot/LotItem → readyForPackaging → completed` are declared in the ladders but have no commands — Phase 3.
- `admin.rollOver` exposes only `resolve`; there is no `list` and no dedicated roll overs page. Reverting a `rebatched` roll over to `open` belongs to operation compensation (Phase 2, ADR 0005).
- `availableActions` was added to `admin.supplierOrder` only; `lot`, `package`, `shipment` and `operation` still compute nothing.
- No migration file was written (per the rollout policy below); `CartItemTrackingEventType.rollOverResolved` was applied with `db:push`.

**Seed drift Phase 1 introduces or inherits** (enumerated, not fixed — `prisma/seed.ts` is untouched):

| Fixture | Drift | Why it is left alone |
| --- | --- | --- |
| `OP-SEED-2026-05-AGG`, `OP-SEED-2026-06-REBATCH` | both sit at the `running` default while carrying materialized lots, lines and allocations | Phase 1's `request` guard requires every lot's operation to be `completed`, so both seeded orders show `request` disabled with "La operación de origen no está completada". No seeded order can be driven through the loop without first completing its operation |
| same two operations | all six live counters are at their `0` defaults against non-zero lot lines | `operation.quantity.assignedMismatch` fires on seeded data today; the first Phase 1 command to touch either operation rewrites the counters from records and clears it |
| `SORD-SEED-VEG-REQ` (`requested`) | consistent with the ladder, but reached without a `requestedAt`-producing command on a `running` operation | the status combination itself is legal; only its provenance is unreachable |
| `SORD-SEED-DAIRY-COMP` (`completed`), `SORD-SEED-FRUIT-READY` (`readyForReceipt`) | both sit past `confirmed`, which no Phase 1 command can produce | the ladders declare the path; Phase 3 ships the commands. Compatible with `supplierOrderStatusLineCompatibility`, so no diagnostic fires |
| `LITEM-SEED-ARROZ-PARTIAL` | already noted in §21.1 — reads `partiallyRolledOver` where derivation returns `atWarehouse` | Phase 0's drift, unchanged by Phase 1 |
| — | no fixture carries a `cancelled` supplier order, lot or lot item, and none carries a `postAllocation` roll over | so the T14 diagnostics corrections and the absorption path have no seeded coverage; they are covered by unit tests instead |

### 21.3 Phase 2 as built (2026-07-26)

Grilled and then executed 2026-07-26 from `tmp/implementation-plan-fulfillment-phase-2-operation-compensation.md` (21 tasks in 6 phases: schema/contracts → shared pure core → tracking → execution → commands → UI); remediation log in `docs/code-review-codebase-2026-07-22.md` §17.

**The finding that reshaped the phase, before any code:** §8's compensation, as originally written, loses demand — see the counter-example there. Two independent problems compounded it: deleting the bridge nulls historical tracking references (`SetNull` on an optional relation), and the consumed roll overs are not recoverable from the schema at all, only from `metadata.sourceRollOverId` in the event log. What shipped fixes both.

**Artifacts Phase 3 inherits:**

| Artifact | What it is | How later phases extend it |
| --- | --- | --- |
| `operationAvailableActions` in `src/shared/common/fulfillment-transitions.ts` | the `cancel` / `rerun` / `delete` matrix over `{ status, liveSupplierOrderStatuses, lotCount, rollOverCount }`, same shape as `supplierOrderAvailableActions` — every key on every call, disabled entries carrying a Spanish reason | third instance of the shape; `lot`/`package`/`shipment` are the remaining three |
| `src/server/services/admin/operation-compensation.ts` | pure `planOperationCompensation` + `assertCompensable`: what to cancel, and how much demand each cart item gets back, with the administrative window and the one-operation-per-supplier-order rule enforced as thrown `CONFLICT`s | Phase 3's receipt paths need no compensation, but the "aggregate per cart item, skip quantity-0 allocations" arithmetic is the same |
| `runOperationExecution(tx, input)` | the execution body, extracted verbatim out of `executeOperation`'s `Serializable` callback and callable inside a caller's transaction | any future compound command that must execute and do something else atomically |
| `applyOperationCompensation` in `operation.data.ts` | the status-only write: lines, lots and orders to `cancelled`, own open roll overs to `cancelled`, and the `rebatchedIntoOperationId`-driven `updateMany` that returns consumed roll overs to `open` | the back-link is now the only supported way to find what an operation consumed |
| `OperationEffects` + `AdminOperationsMutationSource: "operation"` | the fourth effects source, publishing `operation.cartItem.excluded` per affected cart item with key `operation:{id}:cartItem:{id}:excluded` | `lot`/`package`/`shipment` remain declared and unconsumed |
| The three operation dialogs + `availableActions`-driven row menu and detail footer | `OperationCancelDialog` (mandatory reason), `OperationRerunDialog` (parameters preloaded from the source, `includeRollOver` forced to `true`), `OperationDeleteDialog` | reuse for every future command surface, as Phase 1 established |

**Settled while building, worth not re-litigating:**

- **Nothing is deleted by a compensation.** It moves statuses and mints no roll overs, keeping Phase 1's rule that records survive (§21.2). No `lotItem.quantity` and no allocation quantity is touched.
- **Conform to ADR 0005, do not amend it.** Minting a compensating roll over per live allocation and skipping the revert was rejected as double-counting (§17). ADR 0005 stands unchanged; no ADR was created.
- **The administrative window is measured over live supplier orders**, and the *caller* filters cancelled orders out — `operationAvailableActions` deliberately does not, so its parameter means what its name says. `operation.data.ts` and the planner apply the same filter (lot not cancelled ∧ order not cancelled), so the button and the command can never disagree.
- **A supplier order holding lots of another operation is refused** with `CONFLICT` rather than partially cancelled (§19's one-lot assumption made explicit and enforced).
- **`rerun` is one command with three internal paths**, atomic in one `Serializable` transaction: `failed` updates the same row and re-executes in place; `completed` compensates and then creates and executes a new operation; `cancelled` creates and executes only. If execution throws, the compensation rolls back with it — deliberately unlike `createAndExecute`, which persists a `failed` row outside its transaction. Execution errors are wrapped as `CONFLICT` with the underlying message.
- **`rerun` returns a different entity than it received** on the `completed` and `cancelled` paths. The router output, the cache invalidation and the client's `selectedOperationId` all follow the result id.
- **`remove` is `failed` ∧ childless only**, a hard delete. `Lot.operationId` is `onDelete: Restrict`, so the guard exists to produce a readable message rather than a raw foreign-key error; the audit entry is written *before* the delete.
- **Cancelled operations are exempt from every existing operation rule** and carry `operation.cancelled.notCompensated` (critical) instead — §14 explains why the exemption is structural, not cosmetic.
- **Counters are recomputed, never adjusted**, inside the transaction after the mutations and before publishing. The operations that *own* a reverted roll over are deliberately not recomputed: `computeOperationCounters` counts `open` and `rebatched` alike, so nothing moved.
- **Compensation events carry the included quantity.** Per cart item: live allocation quantity plus the operation's own open roll overs. A supplier cut only moves quantity between those two buckets, so the sum is invariant — that is the conservation property the planner's tests encode.

**Latent defects fixed on the way through:**

| Where | Defect | Fix |
| --- | --- | --- |
| `fulfillment-status.derivation.ts` (`deriveStage`) | the `includedInOperation` floor counted roll overs of any status | counts non-`cancelled` roll overs only, so a compensated item falls to `awaitingAggregation` |
| `operation-diagnostics.ts` | quantity rules assumed live counters and a frozen `eligibleQuantity` agree | cancelled operations return early into their own rule |
| `src/schemas/admin/operation.schemas.ts` | `operationCreateInputSchema` is a `ZodEffects`, so `rerun` could not `.extend` it | object body extracted as `operationCreateFieldsSchema`; both create and rerun apply the same date-order refinement |
| `src/schemas/admin/{lot,supplier-order}.schemas.ts` | their embedded operation summaries hard-coded `["running","completed","failed"]` | `cancelled` added; without it the lot list and supplier-order detail would fail to parse the moment an operation is compensated |

**Riskiest edit, as predicted:** `listOriginalDemand` narrowed from `cartItemLotItems: { none: {} }` to live allocations only. The `rollOvers: { none: { status: "open" } }` clause is untouched and carries the whole safety argument for Phase 1's supplier-cancelled items. Both clauses now carry a comment saying so.

**Gates (2026-07-26):** `pnpm test` (332 passing across 31 files), `pnpm typecheck`, `pnpm build`, and `pnpm biome check` over all 59 touched files are clean. Repo-wide `pnpm check` still reports findings that predate this phase in files it did not touch.

New test coverage: the full `operationAvailableActions` matrix (including a window-open case with an already-cancelled supplier order and a window-closed case with a `requested` one); the compensation planner (per-cart-item aggregation across lot items, quantity-0 allocations skipped, resolved/cancelled roll overs excluded, both refusal paths, and the conservation property over several fixtures); the cancelled-operation diagnostics exemption and the new rule, with every pre-existing case passing unmodified; and two derivation cases — a fully compensated lineage deriving `awaitingAggregation`, a reverted (`open`) roll over deriving `rolledOver`.

**Not verified:** as in Phase 1, no end-to-end run against a seeded database was performed — the suite is `environment: "node"` with no DB fixture harness, so the transactional paths (compensation writes, the rebatch revert, `rerun`'s compound transaction, projection after `wake()`) are covered by the pure cores and by review, **not by execution**. The manual flow in the plan's §11 — compensate, confirm every surface is clean, then re-aggregate and confirm no unit was created or lost — is still owed.

**Deliberately still owed:**

- No retry-on-serialization-failure wrapper; the count of `Serializable` commands is now six, and `rerun`'s transaction is the longest in the system.
- `admin.rollOver` still exposes only `resolve` — no list, no dedicated page, so a reverted roll over is visible only inside its owning operation's detail dialog.
- `availableActions` exists on `admin.supplierOrder` and `admin.operation`; `lot`, `package` and `shipment` still compute nothing.
- No `Operation.cancelledAt` column (§20.2, resolved as "not needed").
- **No migration file was written**; the three schema changes were applied with `pnpm db:generate` + `pnpm db:push`, per the rollout policy below.
- **No backfill.** Pre-existing `rebatched` roll overs keep a null `rebatchedIntoOperationId` and would not be reverted by a compensation — verified on the development database 2026-07-26: both `rebatched` rows carry a null back-link.

**Seed drift Phase 2 introduces or inherits** (enumerated, not fixed — `prisma/seed.ts` is untouched):

| Fixture | Drift | Why it is left alone |
| --- | --- | --- |
| `OP-SEED-2026-05-AGG`, `OP-SEED-2026-06-REBATCH` | still at `running` with zero counters (Phase 1's drift, unchanged) | a `running` operation admits no command, so neither can be compensated without first completing |
| `OP-SEED-2026-06-REBATCH`'s rebatched roll overs | null `rebatchedIntoOperationId` — they predate the column | they would survive a compensation as `rebatched` instead of returning to `open`; harmless without production data, and the seeds are reset on demand |
| — | no fixture carries a `cancelled` operation or an `excludedFromOperation` tracking event | the compensation path has no seeded coverage; it is covered by unit tests over the planner, the transitions and the diagnostics instead |

### 21.4 Phase 3 as built (2026-07-26)

Grilled and then executed 2026-07-26 from `tmp/implementation-plan-fulfillment-phase-3-goods-inbound.md` (29 tasks in 7 phases: schema/pure core → derivation → effects/data → commands → diagnostics → UI → docs).

**Artifacts Phase 4 inherits:**

| Artifact | What it is | How later phases extend it |
| --- | --- | --- |
| `packageTransitions` / `shipmentTransitions` + `shipmentAvailableActions` / `packageAvailableActions` in `src/shared/common/fulfillment-transitions.ts` | the last two legal ladders and the fourth and fifth `availableActions` matrices, same shape as the three before them | every entity now has both; Phase 4's outbound commands walk the same `packageTransitions` rungs (`received → inTransit` is promotion) |
| `src/server/services/admin/package-allocation-planner.ts` | pure `planPackagedCoverage` (FIFO by payment date — the mirror of LIFO absorption) + `planPackagedShortfall` (delegates to `planCutAbsorption`, re-attaching the `PackageAllocation` id) | fractionation covers outbound demand with the same coverage arithmetic; a delivery discrepancy is the same shortfall |
| `src/server/services/admin/packaged-shortfall.ts` | `applyPackagedShortfall`: the four reductions (`PackageAllocation` → `CartItemLotItem` → `PackageLotItem` → `LotItem`) plus the roll over rows, shared by `shipment.receive` and `package.writeOff` | any future path that loses packaged quantity calls this rather than re-deriving it |
| `Package.leg` + leg-aware `deriveStage` | `packagedStage(p)` picks the branch by leg and the distance by package/shipment status (`packaged` → departed → arrived) | outbound stages already derive; Phase 4 only has to create outbound packages |
| `ShipmentEffects` / `PackageEffects` + `fulfillment-event-builders.ts` | the fifth and sixth effects sources; the builders live in a separate **pure** module so payloads and deterministic keys are unit-testable without `DomainEventPublisher` (`server-only`) | `shipment.endUser.*` are the last two unpublished events; add builders beside the existing ones |
| `roll-over.data.ts` owns `createPostAllocationRollOvers` | moved out of `supplier-order.data.ts`; three consumers now (supplier order, shipment, package) | the roll over entity owns its own writes |
| `CrudAvailableAction` in `_components/` | the `availableActions` footer button extracted from its third and fourth copy — label in, `aria-disabled` + tooltip out | reuse for every future command surface |
| `packagedQuantity` / `remainingQuantity` in `supplier-order.data.ts` | derived dispatched and outstanding quantity per lot line, read by the dispatch guard, the `cancel` guard, the detail output and two diagnostics | one definition, so the button and the command can never disagree |

**Settled while building, worth not re-litigating:**

- **The dispatch is a supplier-order command** (`admin.supplierOrder.registerDispatch`), not a package or shipment one — the shipment and the inbound package are its *outputs*. This **corrects §12**, which had put it on `admin.lot`/`admin.package`/`admin.shipment`.
- **Two steps, deliberately.** `registerDispatch` creates the shipment at `readyForDispatch` and the package at `readyForShipment`; `shipment.dispatch` confirms departure. One step would make `packaged` unobservable on the inbound leg.
- **`readyForReceipt` is not a ladder gate for a second dispatch.** `registerDispatch` accepts `confirmed` **or** `readyForReceipt` and does not consult `isLegalTransition`: dispatching the remainder is not a status move.
- **Dispatched quantity is derived**, never stored: Σ of a line's live *inbound* package lines. Only the inbound leg counts, or fractionation would double-charge the same quantity.
- **Coverage is FIFO by payment date**, the mirror image of LIFO cut absorption, so the two policies never punish the same customer twice. Implemented by reversing `orderCandidatesLifo`'s **array** rather than inverting its comparator, which keeps tied candidates deterministic.
- **`cancel` / `cancelLine` refuse a line holding live inbound packaged quantity** (`CONFLICT`, naming write-off as the way out). Without this the phase would ship a silent conservation break — see the latent-defects table.
- **A line received at zero is a full shortfall**, not a special case: the same four reductions run, and only the `PackageLotItem` differs — status `cancelled`, quantity untouched as history (Phase 1's rule). That is what keeps it from rolling over twice on a `final: true` receipt.
- **`final` is a shipment-level flag that closes supplier orders.** A shipment carrying lines from two orders closes both. The orders are re-read *after* the shortfall writes so every remainder reflects what actually arrived.
- **An order closes on its own** when every live line has nothing outstanding and every live inbound package line sits on a `received` package — `final` is only needed to *abandon* an outstanding remainder.
- **`retry` returns a different entity than it received**, like `operation.rerun`. The router output, the cache invalidation and the client's `selectedShipmentId` all follow the result id.
- **A fully written-off package becomes `cancelled`.** Leaving it `failed` would keep it on the `shipment.failedWithoutFollowUp` worklist forever.
- **A write-off's `fulfillment.exception.resolved` is a journey notice, not a status decision.** Whether the item still reads `exception` depends on the rest of its lineage, and that question belongs to derivation (ADR 0002).
- **No counter recompute where no quantity moves.** `registerDispatch`, `dispatch`, `markDelayed`, `markFailed` and `retry` recompute nothing; `receive` and `writeOff` recompute per distinct operation id, in-transaction.

**Command surface as built:**

| Command | Isolation | Guard | Quantity effect |
| --- | --- | --- | --- |
| `supplierOrder.registerDispatch` | `Serializable` | status ∈ {`confirmed`, `readyForReceipt`} (**not** `isLegalTransition`), every submitted line live and belonging to the order, each quantity ≤ that line's `remainingQuantity`, ≥1 positive quantity | none — packaging covers demand that is already `assigned`, so **no counter recompute**. Creates the shipment, the inbound package, one `PackageLotItem` per dispatched line and the `PackageAllocation` rows its FIFO coverage plans |
| `shipment.dispatch` | default | ladder `→ inTransit`, `type === internalTransfer`, ≥1 live package | none |
| `shipment.receive` | `Serializable` | ladder `→ received`, payload covers **every** live line of every live package exactly once, `receivedQuantity ≤ line.quantity`, a shortfall needs a reason, `final` with a remainder needs `finalReason` | per line: full → statuses only; short → the four reductions + a roll over per reduction; zero → line `cancelled`, quantity kept as history, full roll over. `final: true` additionally absorbs each live line's undispatched remainder. Recomputes per distinct operation |
| `shipment.markDelayed` / `markFailed` | default | ladder `→ delayed` / `→ failed`, mandatory reason | none — one shared implementation parameterized by target status |
| `shipment.retry` | default | status `failed`, ≥1 live package | none. Creates a new shipment, reassigns the live packages to it (ids intact), returns the **new** shipment's detail; the source stays `failed` and emptied |
| `package.writeOff` | `Serializable` | ≥1 live line, package **or** its shipment ∈ {`delayed`, `failed`}, mandatory reason, each quantity ≤ the line's | the same four reductions `receive` applies, plus a roll over per reduction; fully written-off lines → `cancelled`, and a package with nothing live left → `cancelled`. Recomputes per distinct operation |

Order/lot roll-up on `receive`: an order closes (→ `completed`, lot and lot items → `readyForPackaging`) when every live lot item has `remainingQuantity === 0` **and** every live inbound package line of the order sits on a `received` package; otherwise it stays `readyForReceipt` waiting for the next dispatch. `readyForPackaging → completed` stays uncommanded until Phase 4, exactly as Phase 1 left `readyForReceipt` for this phase.

**Latent defects fixed on the way through:**

| Where | Defect | Fix |
| --- | --- | --- |
| `supplier-order.service.ts` (`cancel`, `cancelLine`) | both mint a roll over per live allocation *at full quantity*. Once inbound packages exist that double-counts against ADR 0005, and **no diagnostic catches it**: `assigned + rollOver` still sums correctly because packaged quantity is not a separate counter | `assertNothingPackaged` throws `CONFLICT` when the affected line holds live inbound packaged quantity |
| `fulfillment-transitions.ts` (`supplierOrderStatusLineCompatibility`) | `readyForReceipt` accepted only `{readyForPackaging, completed}`, written when the status was unreachable. Since `registerDispatch` moves **only** the order, **every dispatched order** would have reported `supplierOrder.status.aggregateAheadOfLines` | `confirmed` added, with the reason in a comment and a test pinning it |
| `package-diagnostics.ts` | `package.line.noPackagedAllocations` and `package.line.quantityMismatch` iterated every line, so every written-off or zero-received line fired by construction | both read a `liveLines` filter, as `lot-diagnostics.ts` does |
| `shipment-diagnostics.ts` | `shipment.package.missing` fired on every correct `retry` (which empties the source shipment); the two compatibility rules fired on cancelled packages and lines | `failed`/`cancelled` exempted from the first; the other two filter cancelled records — the G5 sweep the plan asked for |

**Riskiest edit, as predicted:** switching the leg source. `FulfillmentPackagedAllocationSnapshot.shipmentType` was replaced by `leg`, which broke the build on purpose until `deriveStage` was rewritten. The rewrite also replaced the old outbound/inbound partition with a max-rank walk over `packagedStage`, so a half-received lineage reads as the furthest stage it actually reached rather than the first branch that matched.

**Gates (2026-07-26):** `pnpm test` (451 passing across 35 files), `pnpm typecheck`, `pnpm build` and `pnpm biome check` over every touched file are clean. Repo-wide `pnpm check` still reports findings that predate this phase in files it did not touch.

New test coverage: both new ladders in full (every rung, terminal statuses empty, no self- or out-of-enum target) and both new `availableActions` matrices; the two planners (earliest-payer-first, exact mirror of the LIFO order, Σ covered = dispatched and Σ removed = shortfall as properties over several fixtures, over-coverage refused, override shapes); seven leg/status derivation cases plus mixed-leg max-rank and the departed-outranks-roll-over overlay; every event builder validated against `domainEventSchema` with collision-free keys; new `package-diagnostics.test.ts` and `shipment-diagnostics.test.ts`; two new `supplierOrder.*` rules; and the G2 case asserting the administrative window is already closed at `readyForReceipt`.

**Not verified:** as in Phases 1 and 2, no end-to-end run against a seeded database was performed — the suite is `environment: "node"` with no DB fixture harness, so the transactional paths (dispatch creation and coverage, the four shortfall reductions, order closing, the retry reassignment, projection after `wake()`) are covered by the pure cores and by review, **not by execution**. The manual flow in the plan's §11.3 — which is also the run owed since Phase 1 — is still owed.

**Deliberately still owed:**

- `package.split` / `package.consolidate` slipped to Phase 4, where fractionation needs the same package-editing machinery (§15 #6).
- Package-level `markDelayed` / `markFailed` — Phase 4, when a package can exist without a shipment.
- No retry-on-serialization-failure wrapper; the count of `Serializable` commands is now **nine** (`registerDispatch`, `receive` and `writeOff` added). The plan predicted ten because it counted `receive`'s `final` path separately; it shares `receive`'s transaction, which is what makes the shortfall and the remainder roll over atomically.
- `admin.rollOver` still exposes only `resolve` — no list, no dedicated page.
- `availableActions` now exists on `supplierOrder`, `operation`, `shipment` and `package`; **`lot` still computes nothing**.
- A `dispatch.notReceived after N days` diagnostic, complementing `operation.rollOver.stale`.
- **No migration file**; `PackageLeg` and `Package.leg` were applied with `pnpm db:generate` + `pnpm db:push`. **No backfill** — pre-existing packages silently take `leg: inbound` from the column default.

**Seed drift Phase 3 introduces or inherits** (enumerated, not fixed — `prisma/seed.ts` is untouched):

| Fixture | Drift | Why it is left alone |
| --- | --- | --- |
| `packageFinal` (on the `endUserDelivery` shipment) | takes `leg: inbound` from the default, so its demand derives `atWarehouse` instead of `delivered` | the §21 policy forbids editing `prisma/seed.ts`; the seeds are reset on demand and Phase 4 realigns them |
| every seeded inbound package with no shipment | now also reports `package.leg.missingShipment` alongside whatever it reported before | the rule is correct; the fixtures are what predate it |
| `SORD-SEED-FRUIT-READY` (`readyForReceipt`) | carries no inbound package line, so it reports `supplierOrder.readyForReceipt.noPackages` | reachable only by hand-editing, which is exactly what the seed does; the rule earns its keep on real data |
| — | no fixture carries an inbound package created by `registerDispatch`, a `received` shipment produced by a command, or a receipt-discrepancy roll over | the whole inbound chain has no seeded coverage; it is covered by the unit tests over the planners, the ladders and the diagnostics, and by the §11.3 manual run |

### 21.5 Phase 4 split into 4a and 4b (grill 2026-07-26)

Grilled 2026-07-26. Phase 4 as originally scoped was larger than Phase 3 (29 tasks), so it was cut in two at the point where records stop being created and start being delivered. 4a's plan lives at `tmp/implementation-plan-fulfillment-phase-4a-outbound-packaging.md` (23 tasks in 7 phases) and **was executed the same day — see §21.6**; 4b gets its own grill.

**Where the cut falls:** 4a produces outbound packages and stops. It creates no delivery evidence, closes no `UserOrder`, and emits no `shipment.endUser.*`. Its exit condition is that a fractionated item still derives `atWarehouse` — deliberately *not* further.

**Decisions 4a settled that 4b inherits:**

- **Fractionation creates new outbound rows** (`Package` / `PackageLotItem` / `PackageAllocation`) over the same `LotItem` / `CartItemLotItem`, and never mutates the source. The inbound package stays `received` as arrival history — it is the only evidence the goods arrived, and `closeReachableSupplierOrders`, `packagedQuantity` and `deriveStage`'s `atWarehouse` branch all read it. Safe because ADR 0004 checks conservation **per leg**.
- **The batch is a selection of received inbound packages**, grouped by cart across the whole selection: one outbound package per customer, not per (customer × source package). Partial and incremental, mirroring Phase 3's multiple dispatches.
- **New invariant, sharper than ADR 0004's:** Σ live outbound allocations of a demand allocation ≤ Σ live inbound allocations of that demand sitting on a **`received`** package. You cannot package out what has not arrived. Monitored by the new `package.outbound.exceedsReceived` (critical).
- **Promotion flips `leg` *and* resets `received → readyForShipment`** (new `packageTransitions` rung). The `received` status recorded the *inbound* arrival; carrying it onto the outbound leg claims an arrival that has not happened.
- **The customer is derived from allocations, not stored.** No `Package.cartId`; `package.outbound.multiCustomer` (warning) replaces the missing constraint, deliberately not critical because 4b's group pickup point is legitimately multi-customer.
- **Split is quantity-level**, reusing `planPackagedShortfall`'s arithmetic through a `planPackagedSplit` wrapper. It re-groups quantity and must **never** call `applyPackagedShortfall`, whose four reductions reach `LotItem` and would destroy demand.
- **4a needs no schema change and no counter recompute.** Every status, event type and tracking type it uses exists; no command moves quantity between `assigned` and `rollOver`.

**Latent defects in shipped code the grill found, fixed by 4a:**

| Where | Defect | Fix |
| --- | --- | --- |
| `fulfillment-status.derivation.ts` (`packagedStage`) | the outbound branch reads `hasArrived` off the package status, so a promoted package — `received` from its inbound arrival, leg flipped — derives **`delivered`** while still sitting in the depot | the outbound branch returns `atWarehouse` when the package has not departed; `packaged` is the inbound-before-departure stage. **This must land before the promotion command**, or promotion marks demand delivered the instant it runs |
| `fulfillment-transitions.ts` (`supplierOrderStatusLineCompatibility`) | `completed` accepts only `completed` lines, but `closeReachableSupplierOrders` sets the **order** to `completed` while promoting its lines to `readyForPackaging`. **Every supplier order closed by a receipt reports `supplierOrder.status.aggregateAheadOfLines` today** — the exact twin of the `readyForReceipt` defect Phase 3 fixed one row above | `readyForPackaging` added to the `completed` set; the lines reach `completed` when 4a's fractionation packages them out |
| `shipment-diagnostics.ts` | `shipment.status.aggregateAheadOfPackages` is **critical** and `shipmentStatusPackageCompatibility.inTransit` excludes `delayed`/`failed`, so 4a's package-level exceptions would make a single lost box fail its whole shipment's diagnostic | disrupted packages exempted from the compatibility filter, with a dedicated `shipment.package.disrupted` (warning) keeping the signal at the right name and severity |

**Deliberately owed to 4b** — written before 4a was built and re-verified against the code after it landed. **Every structural item below was discharged by Phase 4b on 2026-07-26 (§21.7); the list is kept as the durable record of what 4b's grill inherited, not as an open worklist.** The two exceptions are `package.consolidate` (still deferred) and the manual end-to-end run (still owed). **§21.6's "How 4a changed 4b's scope" carries the delta** (what narrowed, what grew, what 4b had to answer):

- **End-user shipments.** No command creates a `ShipmentType.endUserDelivery` record; `createInternalShipment` is the only constructor. `shipment.dispatch` guards `type === "internalTransfer"` and must gain the outbound path.
- **The two unpublished domain events.** `shipment.endUser.dispatched` and `shipment.endUser.delivered` are the last two of the original 17 without producers; the mapper and listener entries already exist.
- **The §12 contract adjustment, never applied.** `shipmentEndUserDeliveredEventSchema` **and `shipmentEndUserDispatchedEventSchema`** both still require `shipmentId` (re-verified 2026-07-26; §12 named only the first). Both must anchor on the **package** (`packageId` required, `shipmentId` optional) so depot pickup emits the same fact without a shipment — and 4a made that shape real, since every package it creates has no shipment.
- **The three delivery modes.** Nothing in the schema models them. Home delivery = outbound package on an `endUserDelivery` shipment; depot pickup = outbound package with no shipment; group pickup point is unmodelled. Whether a column is needed is 4b's first question. **Narrowed by 4a**: the depot-pickup shape is no longer merely *assumed* by a diagnostic and a test — `createOutboundPackage` produces exactly it, so 4b inherits the record and owes only the confirmation command (§21.6).
- **Delivery confirmation.** `packageTransitions` has no `readyForShipment → received` rung, so a depot-pickup package cannot be marked handed over. 4b adds the rung and the command.
- **Derived `UserOrder` completion** (ADR 0002, §15 #9). `TrackingStatusProjector.project` writes only `cartItem.fulfillmentStatus`; the order roll-up step does not exist. It must not fight the payment domain — `mercadopago-reconciliation.service.ts` and `checkout.data.ts` write `UserOrder.status`, and a roll-up must never downgrade `refunded` or `chargedBack`. **Constrained by 4a**: `split` can leave one customer holding several outbound packages, and confirmation is per package, so the roll-up must tolerate a **partially delivered** customer (§21.6).
- **Journey stages 9–10.** `inEndUserShipment` and `delivered` stay the only two `CartItemFulfillmentStatus` values unreachable at runtime (12 of 14 reachable after Phase 3; 4a adds none, since a fractionated item still reads `atWarehouse`).
- **Package recovery** (`delayed → readyForShipment`). In 4a a disrupted package exits only through `writeOff` or `cancelled`; recovery pairs naturally with delivery confirmation. **Refined by 4a**: there are now **two** ways into `delayed` — before departure (`readyForShipment → delayed`, new in 4a) and in transit — so recovery has to decide which status it returns to (§21.6).
- **`package.consolidate`** — deferred, not cancelled (§15 #6). Fractionation's per-customer grouping removed its main use case; un-defer only with a concrete operator case.
- **A `dispatch.notReceived after N days` diagnostic** and a `package.received.notFractionated after N days` sibling, both raised and not built.
- **The `Serializable` retry wrapper**, owed since Phase 1. 4a took the count from nine to **twelve** (`fractionate`, `promote`, `split`) — as predicted.
- **The manual end-to-end run**, owed since Phase 1 and still not performed for Phases 1, 2, 3 or 4a.

**§20.2 questions that belong to 4b, not 4a:** the exact `UserOrder` terminal matrix, and whether multi-customer outbound packages need per-customer journey notices before individual confirmation. 4a creates no delivery evidence and closes no order, so neither is reachable from it. **Both resolved by Phase 4b** (§20.2, §21.7): the matrix is `{delivered, cancelled}` terminal with a `processing`-only write gate, and the notice is **shipment-level** (`arrivedAtPickupPoint`), not per-customer.

### 21.6 Phase 4a as built (2026-07-26)

Executed 2026-07-26 from `tmp/implementation-plan-fulfillment-phase-4a-outbound-packaging.md` (23 tasks in 7 phases: pure core → derivation → contracts/data → commands → diagnostics → UI → docs). Every decision §21.5 recorded held; nothing was re-litigated.

**Artifacts Phase 4b inherits:**

| Artifact | What it is | How 4b extends it |
| --- | --- | --- |
| `src/server/services/admin/package-fractionation.ts` | pure `planFractionation`: candidates in, one group per cart out, merged on `(cartId, lotItemId)`, ordered by ascending cart then lot item so the same selection always writes the same rows | any future outbound grouping (a group pickup point batches several carts) plans through it |
| `planPackagedSplit` in `package-allocation-planner.ts` | a documented delegation to `planPackagedShortfall` — same arithmetic, opposite meaning: what leaves is **created** on the destination, not lost | a delivery discrepancy is a shortfall again, not a split |
| `outboundPackagedQuantity` / `receivedInboundQuantity` / `fractionableQuantity` / `packagedAllocationFractionableQuantity` / `packageFractionableQuantity` in `package.data.ts` | the outbound-leg mirror of `packagedQuantity`, plus the per-allocation and per-package roll-ups the guard, the action matrix and the dialog all read | one definition, so the button, the command and the diagnostic can never disagree |
| `packagedStage`'s corrected outbound branch | outbound-not-departed derives `atWarehouse`; `packaged` is now unambiguously the inbound-before-departure stage | 4b only has to make `inEndUserShipment` and `delivered` reachable; the branch is already right |
| `buildPackagedEvents(ctx, changeSet, metadata)` | generalized to take its metadata explicitly, with `buildShipmentPackagedEvents` and `buildFractionationEvents` as the two thin callers | a third producer passes its own metadata rather than growing a change-set union |
| `buildPackageExceptionEvents` + `PackageEffects.onPackageDisrupted` / `.onPackageFractionated` | package-namespaced exception keys (`package:{id}:cartItem:{id}:exception:{status}`), distinct from the shipment ones for the same cart item | delivery confirmation resolves them the same way `writeOff` already does |
| `closePackagedLotItems` in `package.service.ts` | the `readyForPackaging → completed` roll-up for lot items and their lots, evaluated on a **re-read after the writes** | the last uncommanded rung of `lotTransitions` / `lotItemTransitions` is now driven; 4b touches neither |
| `packageAvailableActions` with six keys | `fractionate` / `promote` / `split` / `markDelayed` / `markFailed` / `writeOff`, every key on every call, disabled entries carrying a Spanish reason | delivery confirmation and package recovery are the seventh and eighth keys |

**Settled while building, worth not re-litigating:**

- **The fractionation budget is per demand allocation, not per packaged allocation.** The plan's `min(own quantity, fractionableQuantity)` is necessary but not sufficient: two selected sources covering the same `CartItemLotItem` after a partial first pass would each claim the whole remainder. `fractionate` therefore carries a running budget keyed on the demand allocation and decrements it as it builds candidates.
- **`promote` reuses `findPackagesForFractionation`,** not `findPackageForCommand`: its guard needs the same `fractionableQuantity` the fractionation candidates need, and re-deriving it from a second read shape would be a second definition.
- **`split` reads a live remainder per source allocation** across targets. Two targets taking from one line plan against what the previous target left, never against the original quantity — otherwise the second target would over-draw a line the first already emptied.
- **A line may appear in several split targets; the *sum* is validated, not each entry.** Within one target a line may appear once, because `PackageLotItem` is unique on `(packageId, lotItemId)`.
- **`shipment.package.disrupted` fires only when the shipment itself is healthy.** A `failed` shipment cascades its status to every package, so without that condition the new warning would duplicate `shipment.failedWithoutFollowUp` on every correct failure.
- **`packageAllocationSchema` gained `fractionableQuantity`** (beyond the plan's package-level field). The fractionate dialog defaults each row to what that allocation can still contribute, and re-deriving it client-side would be the dual-truth problem the shared modules exist to end.
- **No diagnostic-code label map was added.** The repo renders the raw code in `DiagnosticDetailChip` and takes the Spanish text from the server's `message`; the two new rules carry theirs there.

**Command surface as built:**

| Command | Isolation | Guard | Quantity effect |
| --- | --- | --- | --- |
| `package.fractionate` | `Serializable` | every source exists, is `leg: inbound` **and** `status: received`; ≥1 planned group; every requested quantity ≤ its candidate's budget | creates one outbound package per cart with its lines and allocations. **The sources are not touched at all.** Publishes `package.cartItem.packaged` per created allocation, then runs the lot roll-up. No counter recompute |
| `package.promote` | `Serializable` | `leg: inbound` ∧ `status: received` ∧ ladder `received → readyForShipment` ∧ exactly one distinct cart ∧ nothing fractionated yet | none — `leg` flips to `outbound`, status resets to `readyForShipment`, optional rename. **Publishes no domain event**: the `packagedKey` for this row is already taken by `registerDispatch`, so a re-emit would be deduped into silence |
| `package.split` | `Serializable` | status ∈ {`pending`, `packing`, `readyForShipment`, `received`}, ≥1 live line, every target line live and belonging to the source, no repeat within a target, per-line sum across targets ≤ that line's quantity | moves quantity, loses none: source allocations reduced to `remainingPackagedQuantity`, destination allocations created at `removedQuantity`. Siblings inherit the source's leg, status **and shipment**. An emptied line → `cancelled` with its quantity as history; a package with nothing live left → `cancelled` |
| `package.markDelayed` / `markFailed` | default | ladder `→ delayed` / `→ failed`, mandatory reason | none — one implementation parameterized by target status. Package **line** statuses are untouched: there is no `PackageLotItemStatus` for disruption, and the package status alone is what `isDisrupted` reads |

Lot roll-up on `fractionate`: a lot item closes (`readyForPackaging → completed`) when every demand allocation of it has `fractionableQuantity === 0`; a lot closes when every live lot item of it is `completed`. Both predicates run on a re-read **after** the outbound rows exist — on the pre-write snapshot neither would ever hold.

**Latent defects fixed on the way through:** the three §21.5 predicted, exactly as predicted — `packagedStage`'s outbound branch, `supplierOrderStatusLineCompatibility.completed`, and the shipment compatibility rules' treatment of disrupted packages. The third needed one refinement not in the plan (the healthy-shipment condition above).

**Riskiest edit, as predicted:** `packagedStage`. It landed in its own phase before any command could produce an outbound package, and it moved outbound-not-departed from rank 5 to rank 7 — across the threshold `deriveFulfillmentStatus` compares against for the roll over overlay. A partially rolled-over item with an outbound package now reads `atWarehouse` instead of `partiallyRolledOver`; that is the intended rule ("once the live part reaches `packaged` or beyond the ladder wins") and it has its own test rather than being left to surface later.

**Gates (2026-07-26):** `pnpm test` (503 passing across 37 files), `pnpm typecheck`, `pnpm build` and `pnpm biome check` over every touched file are clean. Repo-wide `pnpm check` still reports findings that predate this phase in files it did not touch.

New test coverage: both new `packageTransitions` rungs and the two deliberately-refused ones (`received → delayed|failed`); the full six-key `packageAvailableActions` matrix plus `PackageCommandKey` ↔ `packageCommandKeySchema` exhaustiveness; a new `package-fractionation.test.ts` (grouping, merging on `(cart, lot item)`, conservation as a property over several request shapes, every invalid request, empty input); `planPackagedSplit`'s conservation property and override equivalence; a new `package.data.test.ts` for the three derived quantities; three derivation cases including the promoted-package one and the roll over overlay shift; the fractionation and package-exception event builders validated against `domainEventSchema` with keys proven distinct from the shipment ones; four new `package-diagnostics` cases; the two corrected diagnostics cases.

**Not verified:** as in Phases 1–3, no end-to-end run against a seeded database was performed — the suite is `environment: "node"` with no DB fixture harness, so every transactional path (candidate building, group creation, the split's read-modify-write over allocations, the lot roll-up, projection after `wake()`) is covered by the pure cores and by review, **not by execution**. The plan's §11 manual run — which is also the run owed since Phase 1 — is still owed.

**Deliberately still owed, not attributable to 4b:**

- ~~The `Serializable` retry wrapper. The count is now **twelve**, as predicted.~~ **Shipped in Phase 4b** (§21.7); the count stayed at twelve.
- ~~`admin.rollOver` still exposes only `resolve`; `lot` still computes no `availableActions`.~~ **Both shipped in Phase 4b.**
- Batch fractionation across several source packages is implemented in the **command** (`sourcePackageIds` is a list) but the **UI** only ever sends the package whose detail is open. A multi-select on the packages list is the natural follow-up.
- The two diagnostics raised and not built: `dispatch.notReceived after N days` and `package.received.notFractionated after N days`.

#### How 4a changed 4b's scope

§21.5's owed list was written before 4a was built. It is **still substantially correct** — every structural gap on 4b's critical path is still open, and each was re-verified against the code on 2026-07-26 rather than carried forward on trust. What follows is the delta.

**Verified still open, unchanged by 4a** (the core of 4b):

| Owed item | Evidence re-checked |
| --- | --- |
| No end-user shipment can be created | `createInternalShipment` (`shipment.data.ts:419`) is still the only `shipment.create` call site, used by `registerDispatch` and `retry` |
| `shipment.dispatch` refuses the outbound path | still guards `record.type !== "internalTransfer"` (`shipment.service.ts:389`) |
| The two `shipment.endUser.*` events have no producers | listener and mapper entries exist; no builder, no publish site |
| The §12 contract adjustment is unapplied | both `shipmentEndUserDispatchedEventSchema` **and** `...DeliveredEventSchema` still require `shipmentId` with `packageId` optional — §12 named only the second; the adjustment applies to **both** |
| No delivery confirmation | `packageTransitions.readyForShipment` is `{inTransit, delayed, failed, cancelled}` — 4a added the two disruption rungs but **not** `→ received` |
| `UserOrder` roll-up does not exist | `TrackingStatusProjector.project` still writes only `cartItem.fulfillmentStatus` |
| Stages 9–10 unreachable | 4a reaches no new `CartItemFulfillmentStatus` value, by design |

**Narrowed — 4a did work 4b would otherwise have carried:**

- **Depot pickup's record shape now exists and is produced.** §21.5 could only say the shape was *assumed* by a diagnostic and a test. `createOutboundPackage` writes exactly it — outbound leg, `readyForShipment`, `shipmentId: null` — and both fractionation and promotion produce it. 4b inherits the record and owes only the confirmation command, not the modelling.
- **Group pickup has its guard rail pre-placed.** `package.outbound.multiCustomer` is a **warning** precisely so a legitimately multi-customer outbound package does not read as a defect. 4b can model group pickup without first weakening a diagnostic.
- **The outbound derivation is finished.** `packagedStage` already resolves all three outbound distances (`atWarehouse` → `inEndUserShipment` → `delivered`). 4b makes stages 9–10 reachable by moving statuses; it does not touch the derivation.
- **Package-level `markDelayed`/`markFailed` are off the list.** §21.4 deferred them to Phase 4 "when a package can exist without a shipment"; 4a shipped them for both legs, and `shipment.package.disrupted` already accommodates a disrupted package under a healthy end-user shipment.

**Grew — three things 4a created that 4b must now answer:**

1. **Recovery has two entry points, not one.** §21.5 scoped it as `delayed → readyForShipment`. 4a added `readyForShipment → delayed|failed`, so a package can now be disrupted **before** departure as well as in transit. Recovery has to decide which status it returns to, and whether a pre-departure delay is the same fact as an in-transit one.
2. **Delivery confirmation must handle sibling packages for one customer.** `split` can leave a customer holding N outbound packages on the same shipment or on none. Confirmation is per package, so a single customer's order can be **partly** delivered — which makes §20.2's "per-customer journey notices" question reachable from a *single*-customer case, not only the multi-customer one it was raised for. 4b's `UserOrder` roll-up must tolerate a partially-confirmed customer.
3. **The two producers of outbound packages leave different journey feeds.** Fractionation writes a fresh `package.cartItem.packaged` row; **promotion writes none**, because the deterministic key `package:{id}:line:{id}:cartItem:{id}:packaged` was already consumed by `registerDispatch` for that same row. Derivation is unaffected (status comes from lineage, not events — ADR 0002), but the customer-visible event list genuinely differs between the two paths. 4b should decide whether the delivery journey needs to level that, and it is *not* fixable by re-emitting — the key is taken.

**Unchanged in size overall:** 4b neither grew nor shrank materially. It lost one command (package-level exceptions) and two modelling questions (depot-pickup shape, group-pickup diagnostic tolerance); it gained one refinement (recovery's second entry point) and two questions it must now answer rather than assume (partial per-customer delivery, the promotion event gap). **Its critical path — end-user shipments, the two producers, the contract adjustment, confirmation, the `UserOrder` roll-up — is exactly as §21.5 left it.**

**Seed drift:** 4a adds none of its own — it introduces no schema change, and no fixture depends on the new rungs. Every drift enumerated in §21.4 carries over, including `packageFinal` taking `leg: inbound` from the column default. **No seeded fixture exercises fractionation, promotion or split**; the coverage is the unit tests plus the owed §11 run.

### 21.7 Phase 4b as built (2026-07-26)

Executed 2026-07-26 from `tmp/implementation-plan-fulfillment-phase-4b-delivery.md` (32 tasks in 8 phases: schema/contracts/pure core → derivation & projection → data/effects/mapping → commands → diagnostics → UI → series debt → docs). Every §2 decision the grill settled held; nothing was re-litigated.

**The chain now terminates.** `inEndUserShipment` and `delivered` are reachable at runtime, taking `CartItemFulfillmentStatus` to **14 of 14**, and every declared domain event type has a producer — the count of unpublished types is **zero**, closing the gap §3 had tracked since Phase 0.

**Artifacts a later phase inherits:**

| Artifact | What it is |
| --- | --- |
| `Shipment.deliveryMode` + `DeliveryMode` enum | `homeDelivery \| pickupPoint`, null on `internalTransfer`. **Depot pickup is deliberately not a value** — it is the *absence* of a shipment, the shape `createOutboundPackage` already produces. Two modes stored, one derived; the asymmetry is intentional |
| `src/shared/common/user-order-closure.ts` | pure `deriveUserOrderClosure` + `terminalFulfillmentStatuses`. The `processing`-only gate is the whole safety argument against fighting the payment domain |
| `packageRecoveryTarget` in `fulfillment-transitions.ts` | one definition of where a recovered package goes, read by the command, the detail's `recoveryTarget` field and the dialog copy |
| `runSerializable` in `_base/serializable-transaction.ts` | the only place `Serializable` is requested, with a bounded P2034 retry. **The debt owed since Phase 1 is discharged** |
| `buildMovementEvents(ctx, changeSet, movement, leg)` | generalized over the leg; the internal key shape is byte-identical and the end-user leg adds a segment, so the two can never collide |
| `buildPackageDeliveryEvents` / `buildPackageRecoveredEvents` / `buildPickupArrivalEvents` | the outbound-leg builders, all package-anchored |
| `admin.rollOver.list` + `/admin/roll-overs` | the page owed since Phase 2. Does **not** hide `resolved` by default — finding them is now the point |
| `lotAvailableActions` | every supplier-order key, all disabled, each naming the order. States ADR 0003 at the surface an operator looks at |

**Where the code lives** (new files only; the rest are edits to existing modules):

| File | Role |
| --- | --- |
| `src/shared/common/user-order-closure.ts` (+ `.test.ts`) | the pure closure rule; client-reachable, Prisma enums as types only |
| `src/server/services/tracking/user-order-closure.data.ts` | `findUserOrderIdsForCartItems` (distinct) + `loadUserOrderClosureSnapshot` |
| `src/server/services/tracking/user-order-closure.projector.ts` | `server-only`, static-only, load → derive → guarded write |
| `src/server/services/admin/_base/serializable-transaction.ts` (+ `.test.ts`) | `runSerializable`. **No `server-only` import**, unlike the tracking data modules — it would break the vitest suite, and no other `admin/` service uses it |
| `src/features/admin/crud/shipment/outbound-package-picker.tsx` | shared by the create and add-packages dialogs, so both offer the same candidates |
| `src/features/admin/crud/shipment/shipment-{create-end-user,add-packages,deliver}-dialog.tsx` | the three shipment dialogs |
| `src/features/admin/crud/package/package-{confirm-delivery,recover}-dialog.tsx` | the two package dialogs |
| `src/features/admin/crud/roll-over/` + `src/app/admin/(operation)/roll-overs/` | the roll-overs list, table and page |

**Settled while building, worth not re-litigating:**

- **`shipment.receive` now refuses `endUserDelivery`.** Not in the plan, but end-user shipments became creatable in this phase and `receive` runs the inbound absorption path (shortfalls, roll overs, closing supplier orders). The end-user leg closes with `deliver`, which moves no quantity. Guarded in both the matrix and the command.
- **The end-user movement key carries a leg segment.** The plan proposed reusing `movementKey` unchanged, arguing a package travels one leg per shipment — but its own acceptance criterion required the two keys to differ. The internal shape is untouched (those keys are already in the outbox); the end-user leg inserts `endUser:` before the movement word.
- **`packageAvailableActions` did not gain `shipmentDeparted`.** The recover gate reads `shipmentStatus` directly, and the *target* rule — the thing that genuinely needed one definition — lives in `packageRecoveryTarget`, consumed by the command and the detail alike. An unused matrix parameter would have been the hidden rule it was meant to prevent.
- **`lotAvailableActionSchema` is declared in `lot.schemas.ts`, not imported.** `supplier-order.schemas.ts` already imports `lot.schemas.ts` for the lot enums; importing back closes a cycle that fails the Next build at page-data collection with `Cannot access 'R' before initialization`. The two shapes are structurally identical and a comment says why.
- **`RollOverResolveDialog` gained one line.** It now also invalidates `admin.rollOver`, because it is reachable from the new list, which shows the status it changes.
- **`userTrackingNoticeKinds` gained `info`.** The five existing kinds all signal a deviation; a pickup-point arrival is neutral-good and `resolved` means "an exception was resolved". It deliberately does **not** join `warningNoticeKinds`.

**Command surface as built:**

| Command | Isolation | Guard | Effect |
| --- | --- | --- | --- |
| `shipment.createEndUser` | default | ≥1 package; each `leg: outbound` ∧ `readyForShipment` ∧ unassigned; `homeDelivery` ⇒ exactly one distinct cart | creates the shipment at `readyForDispatch` with its mode and assigns the packages. **Publishes no domain event** — nothing moved. Returns the **new** shipment's detail |
| `shipment.addPackages` | default | `endUserDelivery` ∧ not yet departed ∧ the same per-package rules, with the one-cart rule re-evaluated over existing + new | assigns further packages. No event |
| `shipment.dispatch` (extended) | default | ladder `→ inTransit`; end-user additionally requires a non-null mode | identical cascade on both legs; publishes `shipment.endUser.dispatched` instead of `shipment.internal.dispatched`. **First point `inEndUserShipment` becomes reachable** |
| `shipment.deliver` | default | `endUserDelivery` ∧ ladder `→ received` ∧ non-null mode ∧ ≥1 live package | **always** shipment → `received`. `homeDelivery`: packages → `received`, lines → `received`, publishes `shipment.endUser.delivered` (+ `fulfillment.exception.resolved` when it was `delayed`). `pickupPoint`: packages and lines **untouched**, publishes `shipment.endUser.arrivedAtPickupPoint` per cart item. The branch is written so the pickup path cannot reach the package cascade |
| `package.confirmDelivery` | default | `leg: outbound` ∧ ladder `→ received` ∧ ≥1 live line | package → `received`, lines → `received`. Publishes `shipment.endUser.delivered` with `packageId` required and `shipmentId` **omitted when there is none**. **Never writes the shipment** |
| `package.recover` | default | `status: delayed` ∧ the shipment (if any) not itself `delayed`/`failed` | target derived from the record, not asked: no shipment or not departed → `readyForShipment` (lines `packed`), otherwise → `inTransit` (lines `shipped`). Publishes `fulfillment.exception.resolved` |

**4b moved no quantity.** No command creates or destroys packaged quantity, so every conservation test stayed valid unmodified and the `Serializable` count stayed at exactly twelve. A delivery discrepancy is composed from `package.split` + `markFailed` + `writeOff`, all of which already existed.

**Latent defects fixed on the way through:**

| Where | Defect | Fix |
| --- | --- | --- |
| `shipment.service.ts` (`retry`) | called `createInternalShipment` unconditionally, so retrying a failed **end-user** shipment would silently produce an `internalTransfer` replacement — unreachable before this phase, live the moment `createEndUser` landed | `createShipment` takes `type`, `deliveryMode` and `status` explicitly; `retry` reproduces both from its source |
| `fulfillment-status.derivation.ts` | an item with no live allocation, no `open` roll over and ≥1 `resolved` one derived `includedInOperation` — silently regressing from `rolledOver` and making its order permanently uncloseable | a branch after the `exception` short-circuit and before the roll over overlay returns `cancelled`. Resolving is terminal and moves no money (ADR 0005) |
| `tracking-journey.ts` (`resolveOutcome`) | the terminal outcome read `CartItemStatus` for cancellation, so the items above would carry a terminal badge above a journey with **no outcome at all** | new `resolved` outcome ("Resuelto sin entrega"), gated on `fulfillmentStatus === "cancelled"` ∧ a `rollOverResolved` event ∧ no `cartItemCancelled`. A genuine cancellation still wins, because its branch runs first |

**Riskiest edit, as predicted:** the derivation change. It alters what *existing* lineages derive — any item with a resolved roll over and nothing live flips from `includedInOperation` to `cancelled` on its next projection. That is the fix, not a regression, and it carries four dedicated tests including "a delivered lineage with an earlier resolved roll over is still delivered" and "a disrupted one is an exception first".

**Diagnostics:** the pickup-point exemption is scoped to `deliveryMode === "pickupPoint"` only — all three `received`-row rules, not the two the plan named, since `shipment.received.linesNotReceived` fires on the same correct state. `shipment.pickupPoint.pendingCollection` (warning) replaces the signal rather than removing it, and is the operator's worklist for the mode. `shipment.endUser.noDeliveryMode` (critical) is the enforcement Prisma cannot express. `package.outbound.multiCustomer` stays a warning on a pickup point and rises to **critical** on a home delivery, where the commands make the shape unreachable.

**Gates (2026-07-26):** `pnpm test` (543 passing across 39 files), `pnpm typecheck`, `pnpm build` and `pnpm biome check` over every touched file are clean. Repo-wide `pnpm check` still reports findings that predate this phase in files it did not touch.

New test coverage: the two new `packageTransitions` rungs with `received → delayed|failed` still refused; the full seven-key `shipmentAvailableActions` matrix across status × type × mode and the eight-key `packageAvailableActions` matrix, both with `CommandKey` ↔ zod-enum exhaustiveness; `packageRecoveryTarget`; `lotAvailableActions`; a new `user-order-closure.test.ts` (all eight closure cases including every payment status); four derivation cases for the resolved-roll-over rule; three journey cases (`resolved` outcome, cancellation still winning, the arrival as a non-warning notice); five effects cases (leg-distinct keys, the pickup key, depot pickup with no `shipmentId`, collection with both, recovery vs write-off resolution); five shipment-diagnostics and two package-diagnostics cases; a new `serializable-transaction.test.ts` (retry, raw 40001, immediate re-throw, exhaustion, configurable attempts).

**Not verified:** as in Phases 1–4a, **no end-to-end run against a seeded database was performed.** The suite is `environment: "node"` with no DB fixture harness, so every transactional path (the assignment guard, the two `deliver` branches, the closure projection's guarded write, the retry wrapper under real contention) is covered by the pure cores and by review, **not by execution**. The plan's §11.3 run — which is also the run owed since Phase 1 — **is still owed and is the one item of 4b's scope that did not land.**

**The owed manual run, reproduced here** — its plan lives in an untracked `tmp/` file, and this is the last outstanding deliverable of the whole series, so the steps belong in the durable record. Against a freshly seeded database, in order, confirming each diagnostics surface is clean before moving on:

1. Create and execute an operation over real cart demand → items `allocatedToSupplierItem`.
2. `supplierOrder.request` → `requestedFromSupplier`. `supplierOrder.confirm` with **one partial line** → a cut, a post-allocation roll over, `supplierConfirmed` on the rest.
3. `supplierOrder.registerDispatch` → internal shipment + inbound package → `packaged`.
4. `shipment.dispatch` → `inInternalShipment`. `shipment.receive` with a **shortfall on one line** → roll over → `atWarehouse`.
5. `package.fractionate` over the received package → one outbound package per customer. Items stay `atWarehouse` (4a's exit condition, re-confirmed).
6. **Depot pickup:** `package.confirmDelivery` on one customer's package → `delivered`.
7. **Home delivery:** `shipment.createEndUser` with `homeDelivery` and one customer's package → `dispatch` → `inEndUserShipment` → `deliver` → `delivered`.
8. **Pickup point:** `shipment.createEndUser` with `pickupPoint` and two customers' packages → `dispatch` → `deliver`. Confirm items stay `inEndUserShipment`, each journey shows "Disponible para retirar", and `shipment.pickupPoint.pendingCollection` fires. Then `package.confirmDelivery` per customer → `delivered`.
9. **Disruption:** `package.markDelayed` on a package before departure → `exception`; `package.recover` → back to `readyForShipment`, exception cleared.
10. **Closure:** confirm each `UserOrder` whose items are all terminal with ≥1 delivered flipped to `completed`, and that an order with an outstanding roll over did **not**.
11. **Resolved roll over:** `rollOver.resolve` the remaining open roll over → that item derives `cancelled`, its journey shows "Resuelto sin entrega", and its order closes.
12. Final sweep: operations, lots, supplier orders, packages, shipments and roll overs all report zero critical diagnostics.

**Two things the run must be prepared for.** The seeded operations sit at `running` with zero counters (§21.2's drift table), so **no seeded fixture can start it** — step 1 has to create a fresh operation from real cart demand. And step 11 is the first live exercise of the derivation change, so check the fixtures for a pre-existing resolved roll over before starting: any such item flips from `includedInOperation` to `cancelled` on its next projection, which is the fix, not a regression.

**Deliberately still owed:**

- **The manual end-to-end run**, reproduced above. It needs a running app and a seeded database driven through the admin UI, which is outside what this session could execute. It is 4b's exit criterion and the only part of its scope that did not land.
- Delegating `lotAvailableActions` to `supplierOrderAvailableActions` for real enablement (needs a wider lot select; §15.3 of the plan).
- `dispatch.notReceived after N days`, `package.received.notFractionated after N days`, and a `package.outbound.notCollected after N days` sibling for pickup points.
- Multi-select on the packages list feeding `package.fractionate`'s `sourcePackageIds`.
- `package.consolidate`, still deferred (§15 #6).
- Group-pickup-point **routing** (which customers belong to which point). 4b models the shipment, not the point registry.

**Settled decisions recorded, not open items:**

- **The promotion event gap is not levelled.** Fractionation writes a `package.cartItem.packaged`; promotion writes none, because its deterministic key was consumed by `registerDispatch`. The stage axis is identical either way and derivation is indifferent (ADR 0002); only the raw event list differs. Closes §21.6's third question.
- **§20.2's multi-customer journey-notice question is answered** by a shipment-level arrival notice (`arrivedAtPickupPoint`, rendered as a notice and never a stage), not per-customer ones.
- **The `UserOrder` closure matrix**: terminal = `{delivered, cancelled}`; all terminal ∧ ≥1 delivered → `completed`; all cancelled → `cancelled`; anything else → no write. `rolledOver` is **not** terminal.

**Seed drift:** every drift §21.4 enumerated carries over. 4b adds one: `prisma/seed.ts`'s `endUserDelivery` shipments take a **null `deliveryMode`**, which `shipment.endUser.noDeliveryMode` correctly reports as critical until the seed realignment the §21 policy defers. **Corrected 2026-07-27 (§21.9 A2): there are two such shipments** (`SHIP-SEED-ENDUSER-001` and `SHIP-SEED-ENDUSER-002`), not one, so the seed carries **two** live criticals. No seeded fixture exercises any 4b command.

### 21.8 Phase 5 as built (2026-07-26)

Executed 2026-07-26 from `tmp/implementation-plan-fulfillment-phase-5-carrier-order.md` (20 tasks in 6 phases: contracts/pure core → data → diagnostics → service & router → UI → docs & gates). Every §2 decision of the plan held; nothing was re-litigated.

**`CarrierOrder` is no longer frozen.** It has a guarded ladder, a full command surface, its own diagnostics module and a page at `/admin/carrier-orders`. **`src/` now contains zero entities that are modelled but unreachable** — the property §3 had tracked since Phase 0.

**Phase 5 did *not* discharge the series debt.** The manual end-to-end run, the seed realignment and the migration authoring were all explicitly scoped out of its plan and remain owed (see "Owed across the whole series" below).

**Artifacts a later phase inherits:**

| Artifact | What it is |
| --- | --- |
| `CarrierOrder.deleted` | additive, defaulted `false`, applied with `db:push`. No migration file, no backfill, `prisma/seed.ts` untouched (§21 policy) |
| `carrierOrderTransitions` | the ladder. **`failed` is terminal here**, unlike `shipmentTransitions.failed → cancelled`: a shipment needs that rung because `retry` empties its source, and a booking has no retry command |
| `carrierOrderStatusShipmentCompatibility` | only `inTransit → {inTransit, received}` and `completed → {received}`. The other five statuses are absent, i.e. unchecked — the convention `supplierOrderStatusLineCompatibility` already uses |
| `carrierOrderAvailableActions` + `carrierOrderCommandKeys` | eleven keys, always all eleven, in a fixed order. On a `deleted` row every key comes back disabled — **except `hardDelete`, which keeps its own guard**, because purging a hidden row is the natural follow-up |
| `findShipmentsForCarrierOrderAssignment` / `reassignShipmentsToCarrierOrder` | on `shipment.data.ts`, not on the carrier order's: the assigned entity's data module owns its own FK (`reassignPackagesToShipment`'s precedent) |
| `shipmentListInputSchema.unassigned` | the carrier-order-side mirror of the package filter 4b added; what the shipment picker selects from |

**Where the code lives** (new files only; the rest are edits):

| File | Role |
| --- | --- |
| `src/schemas/admin/carrier-order.schemas.ts` | imports **from** `shipment.schemas.ts` and never the reverse — the direction that avoids the cycle §21.7 records |
| `src/shared/common/admin-crud/carrier-order.types.ts` | type-only aliases |
| `src/server/services/admin/carrier-order.data.ts` | selects, where builder, stats, the five writers |
| `src/server/services/admin/carrier-order-diagnostics.ts` (+ `.test.ts`) | the four rules |
| `src/server/services/admin/carrier-order.service.ts` | reads, CRUD, the six ladder commands via one `moveStatus`, the two linking commands |
| `src/server/api/routers/admin/carrier-order.router.ts` | the fifteen procedures |
| `src/features/admin/crud/carrier-order/` | mappers, table, form dialog, detail dialog, status dialog, shipment picker, add-shipments dialog |
| `src/app/admin/(operation)/carrier-orders/` | page + client |

**Settled while building, worth not re-litigating:**

- **No domain event of any kind**, as §15 #10 says: no effects handler, no `AdminOperationsMutationSource` entry, no dispatcher wake-up, no event builder, no tracking event type, no mapper entry. This is the single place the series departs from the reference pattern, and the service's header comment says so in full.
- **`create` is not a matrix key.** There is no row to compute it from, so the page carries it as its own dialog state alongside the eleven server-computed keys rather than inventing a twelfth.
- **`removeShipment` renders on the Envíos tab, not in the footer.** It needs a target row; the tab and the (absent) footer button read the same server entry, so nothing is re-derived.
- **`update` clears `metadata` when the textarea is emptied** (`Prisma.DbNull`), which is the semantics an edit form implies. `create` leaves the column unset instead.
- **The nav route is `/admin/carrier-orders`, not `/admin/carriers/orders`** — the latter would resolve to "Transportistas" under `matchesPath`'s longest-prefix rule.

**Command surface as built:**

| Command | Isolation | Guard | Effect |
| --- | --- | --- | --- |
| `carrierOrder.create` | default | optional `shipmentIds` each non-`cancelled` ∧ unassigned; `P2002` on `code` → `CONFLICT` | creates at `pending` and claims the shipments. No event |
| `carrierOrder.update` | default | not `deleted`; `P2002` on `code` | writes the four identity fields only — **never `status`, never a timestamp** |
| `carrierOrder.request` / `.confirm` / `.markInTransit` / `.complete` / `.cancel` / `.markFailed` | default | not `deleted` ∧ `isLegalTransition`; `markInTransit` additionally needs `liveShipmentCount > 0`; `cancel`/`markFailed` require a reason | one `moveStatus` parameterized by target. `requested → requestedAt`, `confirmed → confirmedAt`, `cancelled → cancelledAt`; the other three write **no timestamp** (no column exists; `updatedAt` plus the audit entry cover it, the call `Operation.cancelledAt` already made) |
| `carrierOrder.addShipments` | default | not `deleted` ∧ status ∉ `{completed, cancelled, failed}` ∧ the shared `loadAssignableShipments` | re-points `Shipment.carrierOrderId`. Re-adding a shipment the booking already holds is a harmless no-op, because the owner check compares against *this* order |
| `carrierOrder.removeShipment` | default | same, plus the shipment must currently belong to **this** order | detaches. **Does not touch the shipment's status** — detaching says nothing about where the goods are |
| `carrierOrder.softDelete` | default | not already `deleted` ∧ **zero live shipments** | flips `deleted`. Stricter than `carrier.softDelete`, deliberately: a hidden row owning live shipments would make `shipment.carrierOrder` render a booking the list cannot show |
| `carrierOrder.hardDelete` | default | `status === "pending"` ∧ **zero shipments** (`RELATION_BLOCKED` otherwise) | purges. `Shipment.carrierOrderId` has no explicit `onDelete`, so Prisma's `SetNull` default applies — this guard is the only thing preventing a silent unlink, and the audit entry is written **before** the delete |

**Phase 5 moved no quantity.** No `PackageAllocation`, `CartItemLotItem`, `LotItem` or roll over write; no `recomputeOperationCounters`; `runSerializable` is not called and the `Serializable` count stays at **exactly one hit**, inside the wrapper.

**Diagnostics:** four rules, all `warning`. `carrierOrder.status.aggregateAheadOfShipments` is deliberately **not `critical`** — every critical rule in the repo guards demand conservation or a broken command precondition, and a booking carries no quantity while nothing downstream derives from its status, so an inconsistent one misleads an operator without endangering data (it matches `supplierOrder.status.aggregateAheadOfLines`). Disrupted shipments are **exempted** from that rule and reported under `carrierOrder.shipment.disrupted` instead, the fix §21.5 found for the package/shipment pair; the disruption rule is itself gated on a booking that is not `cancelled`/`failed`, the refinement §21.6 records. `carrierOrder.noShipments` fires from `inTransit` onward; `carrierOrder.closedWithLiveShipments` fires when a closed booking keeps shipments outside `{cancelled, received}`.

**Findings — what building it and running it surfaced** (as opposed to the decisions above, which were taken):

| Where | Finding | Consequence |
| --- | --- | --- |
| shipped code | **No latent defect found — a first for the series.** Phases 3, 4a and 4b each tripped over one or more while mirroring existing patterns (§21.5's three, `retry`'s type, the derivation regression) | Phase 5 changed no existing behavior. Every edit to live code is purely additive — a defaulted column, two new helpers plus one `where` clause on `shipment.data.ts`, one optional field on `shipmentListInputSchema`, one router registration, one nav entry, three new exports on `fulfillment-transitions.ts` — so the shipment read surface, `shipment.carrierOrder.missing` and every pre-existing transition export are unchanged in shape and behavior |
| the new diagnostics on the seeded data | A freshly seeded database now reports **one live `warning` it did not report before**: `CORD-SEED-ENDUSER-DELAY` is `inTransit` over a `delayed` shipment, so `carrierOrder.shipment.disrupted` fires | correct behavior of a rule that did not exist until this phase, but "a fresh seed shows no diagnostics" is no longer true for carrier orders. It belongs to the seed realignment, not to a bug |
| `prisma/seed.ts` | **Every seeded shipment already carries a carrier order**, so `shipment.list({ unassigned: true })` returns empty on a fresh seed | the create form's picker and the add-shipments dialog render their empty state until a shipment is created or detached, and **the successful attach path is unreachable from seed alone** — which is exactly why the live run below could only exercise the refusal |
| `prisma/seed.ts` | Two of the three seeded orders are `completed`, i.e. terminal | only `edit` is enabled on them; the single `inTransit` one is the only commandable fixture, and **no seeded row can exercise `request` or `confirm`**. Any manual run has to create its own booking first |
| `Shipment.carrierOrderId` | Confirmed to still carry **no explicit `onDelete`** | Prisma's optional-relation `SetNull` default stands, so `hardDelete`'s childless guard is load-bearing rather than cosmetic. Do not relax it to a warning |

**A method finding worth carrying forward.** The series has treated "the suite is `environment: "node"` with no DB fixture harness" as meaning transactional paths cannot be executed at all. That is not quite right: a throwaway `tsx --env-file=.env` script importing the service module directly reaches the real database in seconds, and it caught nothing wrong here only because there was nothing wrong. It is not a substitute for a fixture harness — it writes to the shared dev database and has to clean up after itself — but for a phase whose commands are cheap and reversible it converts "reviewed" into "executed". The next phase, and the owed series-wide run, should consider it before assuming execution is out of reach.

**Gates (2026-07-26):** `pnpm test` (**577 passing across 40 files**, up from 543/39), `pnpm typecheck`, `pnpm build` and `pnpm biome check` over every touched file are clean. `grep -rn "TransactionIsolationLevel.Serializable" src/` returns **exactly one hit**; the carrier order service contains no dispatcher wake-up, no side-effects import and no domain-event reference. Sixteen files touched: five edits (`prisma/schema.prisma`, `shipment.schemas.ts`, `shipment.data.ts`, `admin.router.ts`, `admin-nav.ts`), two extended (`fulfillment-transitions.ts` + its test), and eleven new modules plus the page and its client. Repo-wide `pnpm check` still reports findings that predate this phase in files it did not touch.

New test coverage: every `carrierOrderTransitions` rung asserted explicitly, the three terminal sets empty, no self-transition, no out-of-enum target, seven named illegal jumps refused (`pending → completed`, `pending → failed`, `inTransit → cancelled`, `failed → requested`…); the full `carrierOrderAvailableActions` matrix over status × `deleted` × three shipment-count shapes, asserting **eleven entries in a fixed order every time**; `markInTransit` disabled at `confirmed` with zero live shipments; `softDelete` disabled with a live shipment and enabled with only cancelled ones; `hardDelete` enabled only at `pending` ∧ childless **and still evaluated on a deleted row**; `CarrierOrderCommandKey` ↔ `carrierOrderCommandKeySchema` exhaustiveness; and a new `carrier-order-diagnostics.test.ts` with one case per rule plus the negatives — a healthy order in all seven statuses, cancelled shipments never making an aggregate look ahead, and the delayed-shipment case producing **only** the disruption rule.

**Partly verified against the real database — a first for the series.** The suite is still `environment: "node"` with no DB fixture harness, but Phase 5's service layer was driven directly against the seeded Neon database by a throwaway `tsx` script (created a booking, walked `pending → requested → confirmed`, exercised the refusals, cancelled it, soft-deleted it, then restored and purged it; the record and its audit rows were removed and the seeded three were left untouched). What that **executed**, not merely reviewed:

- **The read path on real rows.** All three seeded orders list, page, and produce `availableActions`: the two `completed` ones offer only `edit`; the `inTransit` one offers `complete`, `markFailed`, `addShipments`, `removeShipment`, `edit`. `getStats` returns a complete `byStatus` (`inTransit: 1`, `completed: 2`), and the `diagnosticState: "withDiagnostics"` path returns exactly the one order.
- **The disrupted-shipment exemption, live.** `CORD-SEED-ENDUSER-DELAY` is `inTransit` over a `delayed` shipment. Its compatibility entry is `{inTransit, received}`, so without the exemption it would report the aggregate rule *and* the disruption rule; it reports **only** `carrierOrder.shipment.disrupted`. The two `completed` orders over `received` shipments report nothing.
- **The ladder and its guards.** `requestedAt` and `confirmedAt` written on their own rungs and `cancelledAt` only on `cancel`; `markInTransit` refused with "no tiene envíos activos"; `confirmed → completed` refused as an illegal jump; a duplicate `code` mapped to `CONFLICT`; attaching a shipment already on another booking refused by name.
- **Both delete guards.** `hardDelete` refused on a `cancelled` order; `softDelete` succeeded on a childless one and the row vanished from the default list; a `deleted` row came back with **zero** enabled actions; `hardDelete` succeeded on a `pending` childless one.

**Still not verified by execution:** the admin UI itself, and the successful attach/detach path (only the refusal was exercised — no unassigned seeded shipment exists to claim). Those, plus the eight manual checks in §11 of Phase 5's plan and the series-wide run owed since Phase 1, remain owed.

**Deliberately still owed — Phase 5 did not close the series:**

- **The manual end-to-end run**, owed since Phase 1 and reproduced as twelve steps in §21.7. Phase 5's plan scoped it out explicitly.
- **Seed realignment** (`prisma/seed.ts`) — see the seed-drift paragraph below for what Phase 5 adds to it.
- **Migration authoring.** `prisma/migrations/` still holds exactly one file; everything from Phases 0–5 was applied with `db:push`, and the §21 policy authors the migrations manually once the phases land. That is now. **Sharpened 2026-07-27 (§21.9 A3): that one file is not applied either** — `prisma migrate status` finds no `_prisma_migrations` baseline, so the work is to baseline the whole schema, not to author a per-phase delta.
- Phase 5's own eight manual checks (in §11 of its plan), **minus what the service-level run above already executed**: what is left is the admin UI itself and a successful attach-then-detach against a real unassigned shipment.
- `package.consolidate` (§15 #6); the three `after N days` diagnostics plus a `carrierOrder.requestedNotConfirmed after N days` sibling; multi-select fractionation; group-pickup-point routing.

**Optional refinements raised and not built** (also folded into §20.3): promoting `aggregateAheadOfShipments` to `critical` if operators start treating booking status as authoritative; a `carrierOrder.deletedWithLiveShipments` rule (currently unreachable by command, thanks to `softDelete`'s guard); a `restore` command (`carrier` has none either, so parity says no); a "sin orden de transporte" filter on the shipments page pairing with `shipment.carrierOrder.missing`; a structured zod schema for `CarrierOrder.metadata`.

**Seed drift:** every drift §21.2, §21.4 and §21.7 enumerated carries over unfixed, including the seeded `endUserDelivery` shipment with a null `deliveryMode` (still a live `critical`). Phase 5 **edits nothing in `prisma/seed.ts`** (§21 policy) and adds observations of its own, all detailed in the findings table above: the three seeded carrier orders take `deleted: false` correctly and are now reachable and commandable as-is — which is correct behavior, not drift — but two of them are terminal, none can exercise `request`/`confirm`, every seeded shipment is already claimed so the assignment pickers start empty, and the `inTransit` order over a `delayed` shipment now raises a standing `carrierOrder.shipment.disrupted` warning. A realigned seed should add at least one unassigned shipment and one `pending` booking so the attach path and the lower ladder rungs have a fixture.

### Rollout & migration strategy

No production deployment exists (assumption §19): no feature flags, no parallel-run. Schema changes are additive per phase (Package leg, OperationStatus.cancelled, tracking event type), but **no phase writes a migration file and no phase performs data migration or backfill** (decided in the Phase 0 grill): each phase edits `prisma/schema.prisma` and regenerates the client, the database is wiped and reseeded on demand during development, and every migration is authored and applied manually once the phases land. For the same reason **seed realignment is deferred until after all phases** — a phase may knowingly leave seeded fixture values that its own logic would no longer produce, and must enumerate them instead of editing `prisma/seed.ts`. Post-phase monitoring = the diagnostics surfaces; a phase is not done while its diagnostics show red on realistic flows. Rollback = revert the phase's code.

### Deferred
- ~~Phase 5 CarrierOrder~~ **done (§21.8)**. FulfillmentException entity remains deferred (gate: diagnostics insufficient as worklist).

### Handing a phase to execution
Every phase is done: Phase 0 (§21.1), Phase 1 (§21.2), Phase 2 (§21.3), Phase 3 (§21.4), Phase 4a (§21.6), Phase 4b (§21.7) and Phase 5 (§21.8). **The series is not closed, though.** The complete inventory of what remains — series debt, repository hygiene, designed-but-unbuilt refinements, decisions deferred behind a gate, and the one open question — is §21.9. It is not a phase and needs no grill, only execution.

The `Serializable` retry wrapper, `admin.rollOver`'s `list` and page, and `lot`'s `availableActions` were discharged by Phase 4b.

### 21.9 Closure inventory — everything still owed (audited 2026-07-27)

Every row below was **verified against the code and against the development database on 2026-07-27**, not carried forward on trust. The audit also confirmed the shipped claims: 21 declared domain event types with 21 producers, exactly one `TransactionIsolationLevel.Serializable` hit behind twelve `runSerializable` call sites, every §11 schema change present, `pnpm test` at **577 passing across 40 files**, `pnpm typecheck` and `pnpm build` clean — numbers identical to §21.8's gate, i.e. **nothing has changed since Phase 5 landed**.

**Group A — Series debt (blocks closure).** Deferred by the §21 rollout policy, now due.

| # | Item | Verified state 2026-07-27 |
| --- | --- | --- |
| ~~A1~~ | ~~**The end-to-end run**, owed since Phase 1 and never performed for 1, 2, 3, 4a, 4b or 5. Its twelve steps are in §21.7~~ | **Discharged 2026-07-27 by `scripts/fulfillment-e2e.ts` (§21.10)** — a repeatable harness driving the twelve steps through the real service layer, not a one-off click-through. The two ad-hoc operations this row recorded (`OP-1781289532189-…`, `OP-1784998903848-…`) were removed |
| ~~A2~~ | ~~**Seed realignment** (`prisma/seed.ts`)~~ | **Discharged 2026-07-27 (§21.10)**, and widened from realignment to full state coverage. `pnpm db:seed-verify` now asserts stored-equals-derived for every seeded cart item, stored-equals-computed counters, zero `critical` across all six calculators, and that every enum value is covered except the eight no command can produce |
| A3 | **Migration authoring** — **owner-managed, out of band** | **Materially worse than §21.8 records.** `prisma/migrations/` holds one folder whose `migration.sql` is a single `ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'user'`, and `prisma migrate status` reports it as **not yet applied** — there is no `_prisma_migrations` baseline in the database at all. The task is therefore not "author the migrations for Phases 0–5" but **baseline the entire schema and adopt migration-based flow**. The one piece of good news: `prisma migrate diff --from-config-datasource --to-schema` reports **"No difference detected"**, so the live database and `schema.prisma` are in sync and the baseline can be taken from either. **Decided 2026-07-27: migrations are authored and applied manually by the repository owner, before the closure plan runs, and are excluded from it** — the closure plan therefore introduces no schema change and starts from an aligned database |

**Group B — Repository hygiene (not previously tracked anywhere).**

| # | Item | Verified state 2026-07-27 |
| --- | --- | --- |
| ~~B1~~ | ~~**The entire series is uncommitted.** Phases 0–5 — roughly 57 modified and 90 untracked files — live in the working tree~~ | **Discharged 2026-07-27**: ten reviewable commits — the design record, the schema, one per phase, and the supporting docs — so the documented per-phase rollback is real. A retro-split, so intermediate commits are not individually buildable; the tree is green at the end |
| ~~B2~~ | ~~**The remediation log stops at Phase 2.**~~ | **Discharged 2026-07-27**: §18–§21 added for Phases 3, 4a, 4b and 5, each marked as written after the fact and sourced from §21.4–§21.8, plus §22 for the closure itself |

**Group C — Designed, not built, and in scope for closure.** Each was raised by a phase grill and recorded in §20.3; none exists in `src/` (verified by `grep`).

| # | Item | Where it was raised | Notes for the builder |
| --- | --- | --- | --- |
| ~~C1~~ | ~~The four `after N days` diagnostics: `dispatch.notReceived`, `package.received.notFractionated`, `package.outbound.notCollected`, `carrierOrder.requestedNotConfirmed`~~ | §20.3, Phase 3/4a/4b/5 grills | **Shipped 2026-07-27 (§21.10)**, following the `operation.rollOver.stale` precedent exactly: a threshold computed once per request in the data layer and passed into a **pure** rule via an options argument. All four are `warning`; the three logistics rules anchor on `updatedAt` at 7 days, `carrierOrder.requestedNotConfirmed` on the real `requestedAt` column at 3 |
| ~~C2~~ | ~~A **"sin orden de transporte"** filter on the shipments page~~ | §20.3, Phase 5 grill | **Shipped 2026-07-27 (§21.10)** as a two-option select on the shipments filter panel. It sends `unassigned: true` or `undefined`, never `false` — the `where` builder only adds a clause when the value is `true`, so `false` would mean "only assigned" |
| ~~C3~~ | ~~**Multi-select fractionation** on the packages list feeding `package.fractionate`'s `sourcePackageIds`~~ | §20.3, §21.6 | **Shipped 2026-07-27 (§21.10)**: `admin.package.fractionationCandidates` computes the editable rows server-side across the whole selection — sharing the command's own budget loop, so the dialog cannot offer a total the command would refuse — and `InboundPackagePicker` adds sibling received sources to the dialog |
| ~~C4~~ | ~~Delegating `lotAvailableActions` to `supplierOrderAvailableActions` for real enablement~~ | §20.3, §21.7 | **Shipped 2026-07-27 (§21.10)**: the matrix delegates when given the order-wide facts and stays uniformly disabled without them. `lot.service.ts` reads those facts once per **distinct supplier order** across the page (`findSupplierOrderActionInputs`) rather than widening `lotSummarySelect`, which would have added a nested read per row |

**Group D — Deferred by decision, with their gates. Not part of closure.** Listing them here is what makes closure honest: they are closed *as deferred*, not forgotten.

| Item | Gate that would un-defer it | Decision record |
| --- | --- | --- |
| `package.consolidate` | a concrete operator case that fractionation's per-customer grouping does not already cover | §15 #6, §21.7 |
| Persistent `FulfillmentException` entity (assignee, notes) | operators outgrow diagnostics-as-worklist | §6.3, §15 #12, §17 |
| Group-pickup-point **routing** (which customers belong to which point) | a point registry becomes a real operational need; 4b models the shipment, not the registry | §21.7 |
| `carrierOrder.restore` for soft-deleted bookings | withheld for parity — `carrier` has none either | §20.3, §21.8 |
| `carrierOrder.deletedWithLiveShipments` rule | currently **unreachable by command**, because `softDelete` refuses while live shipments hang off the order | §20.3, §21.8 |
| Promoting `carrierOrder.status.aggregateAheadOfShipments` to `critical` | only if a consumer ever derives from booking status; today nothing does | §14, §20.3, §21.8 |
| A structured zod schema for `CarrierOrder.metadata` | the same call the `TODO`s on `Carrier.address`/`contactInfo` already foresee. Currently `jsonTextareaSchema` in, `z.unknown().nullable()` out | §20.3, §21.8 |
| External supplier/carrier API integrations; automatic refunds; customer-facing mutations; new aggregation strategies | permanently out of scope for this design | §6.4 |

**Group E — Open decisions.**

| Question | State |
| --- | --- |
| Whether `operation.rollOver.open` should keep firing on the operation that *owns* a roll over reverted by a compensation | The only entry left in §20.2. Resolved provisionally as **keep firing**, with "revisit after Phase 2 runs on real data" as the resolver — and that real-data run is A1. **It is therefore parked behind A1, not independently answerable**, and closure should re-read it once A1 has run |

Everything else in §20.1 and §20.2 is resolved; §20.1 has been empty since the design session.

### 21.10 Closure as built (2026-07-27)

Executed 2026-07-27 from the closure plan (five phases: commit the series →
realign and expand the seed → end-to-end harness → Group C refinements →
re-verify and close). **It is not a phase**: every architectural decision behind
it was already taken, and it introduces no schema change — migrations are
owner-managed out of band (§21.9 A3).

**What the series now has that it did not:**

| Artifact | What it is |
| --- | --- |
| Ten commits | the design record, the schema, one per phase (0, 1, 2, 3, 4a, 4b, 5) and the supporting docs. The per-phase rollback the rollout strategy has claimed since the design session is real for the first time |
| `scripts/fulfillment-e2e.ts` (`pnpm fulfillment:e2e`) | §21.7's twelve steps through the real service layer, **repeatably**. `E2E-`-prefixed rows, teardown in a `finally` — deliberately not `*-SEED-*`, so `resetDemoTransactionalData` will not clean up after it |
| `scripts/seed-verify.ts` (`pnpm db:seed-verify`) | stored-equals-derived for every seeded cart item, stored-equals-`computeOperationCounters`, zero `critical` across all six calculators with the warnings listed, per-enum coverage, and a guard that aggregable demand survives |
| `scripts/lib/diagnostics-sweep.ts` | one pass of all six calculators, shared by both scripts, so "the sweep is clean" cannot mean two things |
| A seed that demonstrates the whole lifecycle | fifteen scenarios covering **every value of every fulfillment enum** except the eight no command can produce |

**Seed state coverage — a durable property, not a one-time push.** A fresh seed
now carries a `postAllocation` roll over, a `resolved` one, a `rebatched` one
with a live back-link, a cancelled operation with its outputs cancelled, a
written-off package, a failed outbound package, an emptied failed shipment, one
fixture per delivery mode, and the full carrier-order ladder. `pnpm db:seed-verify`
asserts the coverage, so a later seed edit that drops a state fails loudly rather
than silently narrowing what the admin screens can show.

**The eight statuses deliberately left uncovered**, because **no command writes
them** — a fixture for them would be drift, not coverage: `Lot.pending`
(execution creates lots at `assembling`), `Package.pending` / `Package.packing`
(every package factory starts at `readyForShipment`), `PackageLotItem.pending` /
`PackageLotItem.packing` (`createPackageLines` starts at `packed`), and
`Shipment.pending` / `Shipment.preparing` / `Shipment.cancelled` (every
`createShipment` call site passes `readyForDispatch`, and there is no
`shipment.cancel`). **This corrects the closure plan's list of six**: it named
`Shipment.preparing` but not `pending` or `cancelled`, which the same rule
excludes.

**Three defects the closure found in shipped code**, each fixed with a test
rather than worked around:

| Where | Defect | Why review missed it |
| --- | --- | --- |
| `fulfillment-status.derivation.ts` (`packagedStage`) | the outbound branch read a `received` **shipment** as an arrival, so a pickup-point shipment derived `delivered` while its packages were still `inTransit` — the exact opposite of the asymmetry Phase 4b exists for (§8). Now only the package's own `received` is a handover; home delivery and depot pickup both cascade the package, so nothing else changes | no fixture and no test had a pickup-point shipment: every outbound derivation case set package and shipment to `received` together |
| `lot-diagnostics.ts`, `supplier-order-diagnostics.ts` | `lot.cancelledWithActiveDemand` and `supplierOrder.cancelledWithActiveDemand` fired **`critical` on every correct compensation**. Compensation is status-only and returns its cart items to `awaitingAggregation`, which both rules read as unresolved demand. Both now exempt a cancelled operation, mirroring the operation-level exemption §14 already establishes | §21.3 recorded that no fixture carried a cancelled operation; the rules were written for the supplier loop, which mints roll overs instead |
| `src/server/db.ts` | Prisma's default 5s interactive-transaction timeout aborted real commands with P2028. These transactions issue dozens of sequential round trips, so against a managed Postgres a few hundred kilometres away `supplierOrder.request` and `shipment.receive` both blew it | unreachable without executing the service layer against a remote database — which is precisely what A1 owed |

**Two more, recorded and not fixed** — both outside the post-execution scope this
document owns, both surfaced by running the chain rather than reading it:

- `listOriginalDemand` excludes only `open` roll overs, so a cart item whose roll
  over was **resolved** — terminal by ADR 0005 — is aggregable again. Its derived
  status is `cancelled` while the query treats it as owed. Not touched here: the
  closure plan's §2.4 makes those two exclusion clauses a guardrail, and the fix
  is a third clause with its own conservation argument.
- **Aggregation applies the supplier MOQ per cart item, not to pooled demand.**
  `calculateAssignableQuantity` is called once per `DemandItem`, so a customer
  ordering below the supplier's minimum rolls over pre-allocation *however many
  other customers ordered the same product in the same operation*. Building the
  harness's fixtures made this visible: four carts ordering the same two products
  produced allocations for only two of them. Whether that is intended — the
  operation is a group-buying batch, and pooling to reach a supplier minimum is
  arguably its purpose — is a **pre-execution** question this document does not
  own (§6.4). It is recorded here because the closure is where it was found.

Both belong to a `simple-grill` of their own, not to closure.

**Method findings, correcting §21.8.** §21.8 concluded that a plain `tsx` script
can reach the service layer; that generalizes **only** with
`--conditions=react-server`, which resolves `server-only` to its empty export.
Without the flag `carrier-order.service.ts` is the one importable command service
— which is why Phase 5's script worked and nothing else would have. Both new
scripts carry the flag and the reason in their header.

**Gates:** `pnpm test` (592 passing across 40 files — the 577 pre-existing
unmodified, plus 15 new cases), `pnpm typecheck`, `pnpm build` and `pnpm biome
check` over every touched file, all clean. `grep -rn
"TransactionIsolationLevel.Serializable" src/` returns **exactly one hit**, and
`git diff prisma/schema.prisma` is **empty** — the closure introduced no schema
change, as designed.

**Residual, and deliberately so:** the admin UI itself is unverified by
automation — the shipments filter, the multi-source fractionate dialog, the
lot detail's newly-enabled buttons, and Phase 5's attach-then-detach against the
now-existing unassigned shipment are a manual pass. The seed makes that pass far
more valuable than before: every screen now has real rows in every state.

## 22. Suggested next skills

| Skill | When to invoke | Inputs | Expected output |
| --- | --- | --- | --- |
| `implementation-plan` | **the closure itself** — §21.9 Groups A (**minus A3**, which is owner-managed out of band), B and C, which need no grill because every decision behind them is already taken | this document + §21.9 | execution plan authored 2026-07-27: five phases (commit the series → realign and expand the seed → end-to-end harness → Group C refinements → re-verify and close), no schema change. Executed 2026-07-27; §21.10 is its as-built record. The plan itself lived in the gitignored `tmp/` working directory and is deliberately not linked — §21.x is the durable record |
| `simple-grill` | a single small slice pulled out of §21.9 Group C on its own | this document + the item | reduced plan |
| `feature-grill` | any §21.9 Group D item whose gate has been met (`FulfillmentException`, `package.consolidate`, pickup-point routing) | this document + the item + the evidence its gate is met | feature-scale implementation plan |

## 23. Redactions and sensitivity notes

No secrets, PII, or PHI were encountered; the session dealt with schema, services, and design decisions only.

## 24. Final instruction to the next agent

Use this document as the primary architectural source. **The supplier-order commands (`src/server/services/admin/supplier-order.service.ts` + `operations-effects/supplier-order-effects.ts`) remain the behavioral bar for every new command**, now joined by `shipment.service.ts`'s `receive` — the richest quantity-moving command in the system, and the closest model for a Phase 4 delivery discrepancy — the operations-cart pattern plus ladder guards, in-transaction counter recompute, and server-computed `availableActions`; read them before writing a new command, together with `operation.service.ts`, which is the same pattern extended to a compound, all-or-nothing command, and `package.service.ts`'s `fractionate` — the only command that creates rows for several customers in one transaction and rolls a lot up afterwards. **Phases 0–5 are all built and the series is closed** (§21.10, 2026-07-27). **§21.9 remains the audited inventory**: Groups A (A1, A2), B and C are struck through with what discharged each, A3 is owner-managed out of band, **Group D is the live list — deferred by decision, each behind a stated gate**, and Group E is the one open question, re-armed with a concrete resolver rather than closed. Do not re-derive the owed list from the per-phase "Deliberately still owed" paragraphs: they are historical and §21.9 supersedes them. **Two commands are now the closure's guards**: `pnpm db:seed-verify` (stored-equals-derived, counters, zero criticals, per-enum coverage) and `pnpm fulfillment:e2e` (§21.7's twelve steps through the real service layer). Both need `--conditions=react-server`; run them after any change to derivation, diagnostics, the ladders or the seed. Two of §21.9's rows **correct** earlier text — the seed carries two null-`deliveryMode` shipments rather than one, and the migrations directory has no applied baseline at all. §21.7 is the as-built record of 4b and §21.8 of 5; §21.5 and §21.6 remain the durable record of what the 4a/4b split settled — every structural item they owed is now discharged. **Every quantity-moving command must go through `runSerializable`**; `grep -rn "TransactionIsolationLevel.Serializable" src/` should return exactly one hit, inside the wrapper — **Phase 5 moved no quantity and did not add a thirteenth caller**. `carrier-order.service.ts` is the one command service that deliberately publishes **nothing** (§15 #10): do not "complete" it by wiring an effects handler while mirroring its siblings. §8's compensation reads as revised; the pre-revision wording survives there only as a marked counter-example. Read §4.1 sources before planning. Do not re-litigate §15 decisions unless repository evidence contradicts them; §20.1 is empty and §20.2 holds one non-blocking question, none of which gate anything now that every phase has landed. **What comes next is not a phase**: it is the three owed items above, plus whatever §6.3 or §20.3 gets un-deferred — §22 routes each to the right skill. Keep this document updated: bump the status header when a session revises it, and record invalidated assumptions rather than leaving them stale.
