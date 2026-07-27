# Fulfillment Reference

> **Status:** created 2026-07-27 from the implemented code, after the fulfillment
> series closure and ADR 0006. This is the **as-built reference** for the
> fulfillment lifecycle: what each command does, the business rules it enforces,
> and the decision record that governs it.
>
> **Companion documents:**
> - `docs/schema-reference.md` — the domain model and status architecture
> - `docs/tracking-architecture.md` — how these commands become tracking history and derived statuses
> - `docs/architecture/features/fulfillment-lifecycle-actions.md` — the living design document and per-phase as-built record (the history behind this reference)
> - `CONTEXT.md` — the domain language
> - `docs/adr/0002`–`0006` — the decisions cited throughout

## 1. The lifecycle at a glance

```
customer demand                    aggregation                     sourcing
Cart -> CartItem -> UserOrder --> Operation (draft -> executed) --> SupplierOrder -> Lot -> LotItem
                                        |                                |
                                        v                                v
                                   RollOver (pre-allocation)        CartItemLotItem (demand allocation)

goods inbound                          destination                     delivery
registerDispatch -> internal        fractionate / promote          end-user shipment (home / pickup point)
shipment + inbound package  ------> outbound packages      ------> or no shipment at all (depot pickup)
dispatch -> receive                 (leg: outbound)                confirmDelivery -> UserOrder closure
```

Every action is a command on an orchestration service following one pattern:
open transaction → load + guard via the shared transition maps → mutate +
cascade → effects handler publishes domain events in the same transaction →
audit log with effect summaries → commit → `DomainEventDispatcher.wake()`.
Status summaries are then **derived** from the records the command left behind
(ADR 0002), never set by the command itself.

Two properties hold at all times:

- **Demand conservation** (ADR 0005): every unit of paid demand is in exactly
  one active place — unallocated original demand, an open roll over, or a live
  allocation — or in an audited terminal resolution.
- **Records survive; statuses move**: cancellation never deletes and never
  zeroes quantity. The status filter is what removes a record from live
  computations.

## 2. Aggregation: draft, review, execute (ADR 0006, ADR 0005)

An operation is a group-buying aggregation batch over submitted, paid demand.
It no longer executes on creation — it is reviewed as a draft first.

| Command (`admin.operation`) | Guard | Effect |
| --- | --- | --- |
| `createDraft` | — | creates `Operation(draft)` with its parameters (`from`/`to` window, `includeRollOver` defaulted **true**, strategy, destination). Materializes nothing, **reserves nothing** |
| `review` (query) | — | recomputes the live demand the draft would batch (original demand + open roll overs), applies the stored omissions, returns rows, groups, totals and the **fingerprint** of the effective set |
| `updateDraft` | draft only | edits parameters and omissions; omissions that no longer match the window are pruned **with an explicit report**, never silently |
| `execute {id, fingerprint}` | draft only; fingerprint must match | serializable: recompute → apply omissions → **refuse `CONFLICT` if the effective demand changed since the review** (the draft survives and the diff is returned) → materialize supplier orders (`pending`), lots (`assembling`), lot items (`pending`), demand allocations, pre-allocation roll overs; consume open roll overs (`rebatched` + back-link); compute counters; freeze `summary`; stamp `reviewState.approved` |

Key rules:

- **Omissions** are stored as source keys *and* user ids on
  `Operation.reviewState`. An omission writes nothing onto the demand: the
  omitted quantity stays exactly where it was and re-enters the next
  aggregation. It is not a roll over and not a compensation.
- The **fingerprint** is `sha256` over the sorted `sourceKey:quantity` lines of
  the effective set (demand minus omissions), decimal-safe. Demand arriving for
  an already-omitted user does not block execution — it does not change what
  will run.
- Two drafts can look at the same demand; whichever executes first takes it and
  the second one's fingerprint stops matching. Safety by construction, not by
  lock.
- `includeRollOver` defaults **true** at every layer (ADR 0005): leaving paid
  demand out of a batch requires explicit opt-out.
- Operation status is technical (`draft | running | completed | failed |
  cancelled`), not a business outcome — outcomes live in the children.

**Live counters.** `assigned`/`rollOver` quantities and counts are recomputed
from records (`recomputeOperationCounters`) inside every quantity-moving
transaction — never adjusted by deltas, so they cannot drift.
`eligibleQuantity`/`eligibleItemCount` and `summary` stay frozen at execution:
a supplier cut moves quantity from `assigned` to `rollOver`, so their sum stays
balanced against the frozen eligible figure.

## 3. Supplier loop (ADR 0003)

`SupplierOrder` is the command aggregate: request, confirmation, and
cancellation are commanded at order level and cascade to lots and lot items,
which are **never edited directly**. `admin.lot` is read-only by design; its
`availableActions` name the supplier order that commands each action.

| Command (`admin.supplierOrder`) | Isolation | Guard | Quantity effect |
| --- | --- | --- | --- |
| `request` | default | ladder `pending → requested`; every lot's operation `completed`; ≥1 live line | none. Writes `requestedAt`, optional `externalReference` |
| `confirm` | serializable | ladder `requested → confirmed`; payload covers **every** live line exactly once | full → statuses only; partial → cut absorbed (below), `lotItem.quantity` reduced, one post-allocation roll over per reduction; zero → line `cancelled`, full roll over, quantities kept as history |
| `cancel` | serializable | ladder allows `→ cancelled`; mandatory reason; refuses once live inbound packaged quantity exists | one roll over per live allocation at full quantity |
| `cancelLine` | serializable | line belongs to the order, not already cancelled; same packaging refusal; mandatory reason | one roll over per allocation of the line; cascades lot and order when nothing live remains |
| `registerDispatch` | serializable | status ∈ {`confirmed`, `readyForReceipt`}; per-line quantity ≤ remaining | creates the internal shipment + consolidated inbound package (§4); no counter recompute — packaging covers demand already assigned |

**Cut absorption.** A partial confirmation's shortfall is absorbed onto
specific demand allocations **LIFO by payment date** (latest payer absorbs
first; `null paidAt` sorts most recent). Manual overrides *replace* LIFO
entirely — a partially specified split would silently reintroduce the ordering
being overridden. The mirror policy, FIFO by payment date, decides packaged
coverage (§4), so the two policies never punish the same customer twice.

Roll-up on `confirm`: a lot whose every line ended `cancelled` becomes
`cancelled`, otherwise `confirmed`; same for the order (+ timestamps).

## 4. Goods inbound (ADR 0004)

Packages are **physical** and carry a **leg**: `inbound` (supplier →
destination) or `outbound` (destination → end user). Conservation is checked
per leg, which is what lets destination fractionation re-package received
quantity without double-counting.

- `supplierOrder.registerDispatch` creates the internal shipment
  (`readyForDispatch`) and one consolidated inbound package
  (`readyForShipment`, lines `packed`) with FIFO packaged coverage.
  Registration and **departure are two steps** — a one-step dispatch would make
  the `packaged` stage unobservable. Partial dispatches are first-class: a
  supplier order at `readyForReceipt` can register further dispatches.
- `shipment.dispatch` confirms departure (`→ inTransit`, packages and lines
  cascade).
- `shipment.receive` records actual per-line quantities:
  - a **receipt discrepancy** (received < declared) runs the four reductions —
    `PackageAllocation → CartItemLotItem → PackageLotItem → LotItem` — plus one
    post-allocation roll over per cut, mandatory reason, counters recomputed;
  - a line received at zero is a full shortfall, not a special case (line
    `cancelled`, quantity kept as history);
  - a supplier order **closes on its own** (`→ completed`, lots and lot items
    `→ readyForPackaging`) when nothing is outstanding and every live inbound
    line sits on a received package; `final: true` abandons an outstanding
    remainder explicitly (`finalReason` required);
  - `receive` refuses `endUserDelivery` shipments — the end-user leg closes
    with `deliver`, which moves no quantity.

## 5. Outbound packaging (ADR 0004)

| Command (`admin.package`) | Isolation | What it does |
| --- | --- | --- |
| `fractionate` | serializable | turns a selection of **received inbound** packages into one outbound package per customer (`readyForShipment`), partial and incremental. Sources are never mutated — they stay `received` as arrival history. The budget is per **demand allocation** across the whole selection, so two sources covering the same demand cannot each claim the remainder. `fractionationCandidates` computes the editable rows server-side with the same budget loop, so the dialog cannot offer what the command would refuse |
| `promote` | serializable | mono-customer inbound package flips leg and resets `received → readyForShipment`, preserving physical identity — its `received` recorded the inbound arrival, not an outbound one. Publishes no event (its deterministic key was consumed at dispatch registration) |
| `split` | serializable | re-groups quantity into sibling packages so records match the real physical bundles; moves quantity, never loses it. Siblings inherit leg, status and shipment |
| `markDelayed` / `markFailed` | default | package-level disruption, with or without a shipment; mandatory reason (§7) |

Conservation invariant, sharper than the demand-level one: Σ live outbound
allocations of a demand allocation ≤ Σ live inbound allocations sitting on a
**received** package. You cannot package out what has not arrived
(`package.outbound.exceedsReceived`, critical).

Lot roll-up: a lot item closes (`readyForPackaging → completed`) when every
demand allocation of it is fully fractionated; a lot closes when every live
lot item is closed. This is the one lot transition driven from a package
command — lots still have no commands of their own (ADR 0003).

## 6. Delivery: three modes, one evidence

All three modes converge on the same evidence: the **package's own `received`
status** records the handover (delivery confirmation is per package).

| Mode | Shipment | Handover recorded by |
| --- | --- | --- |
| **Home delivery** (`deliveryMode: homeDelivery`) | end-user shipment, exactly one customer (one address snapshot = one cart, enforced) | `shipment.deliver` — the shipment's arrival confirms every package it carries (cascade to `received`) |
| **Pickup point** (`deliveryMode: pickupPoint`) | end-user shipment, multi-customer allowed | arrival is **not** a handover: `deliver` marks only the shipment `received` and publishes an arrival notice ("Disponible para retirar"); each customer's own `package.confirmDelivery` (`inTransit → received`) produces `delivered` |
| **Depot pickup** (no mode value) | **no shipment at all — the absence is the mode** | `package.confirmDelivery` on the never-shipped outbound package (`readyForShipment → received`) |

Commands: `shipment.createEndUser` (claims outbound `readyForShipment`
packages, creates at `readyForDispatch`, publishes nothing — nothing moved),
`shipment.addPackages` (until departure), `shipment.dispatch` (requires a
non-null mode on the end-user leg), `shipment.deliver`,
`package.confirmDelivery`.

A **delivery discrepancy** (customer received less than the package claims) is
deliberately composed, not commanded: `package.split` the missing quantity into
a sibling → `markFailed` → `writeOff` → `confirmDelivery` on the original.
Every piece is independently audited; a quantity-taking `confirmDelivery` would
be a second implementation of shortfall absorption.

**Order closure** (ADR 0002): after every projection,
`UserOrderClosureProjector` derives closure per affected order — all items
terminal (`delivered`/`cancelled`) ∧ ≥1 delivered → `completed`; all cancelled
→ `cancelled`; anything else → no write — and only ever **from `processing`**,
so it structurally cannot downgrade a payment outcome (`refunded`,
`chargedBack`, `failed`). `rolledOver` is deliberately not terminal: an open
roll over keeps its order open.

## 7. Exceptions and remediation

A fulfillment exception is a **derived condition**, not a table: demand whose
live lineage has a `delayed`/`failed` package or shipment derives `exception`,
and derivation clears it when the records recover. Disruption exists at both
levels (`shipment.markDelayed/markFailed`, `package.markDelayed/markFailed`),
with package-namespaced event keys so one lost box and its shipment record
distinct facts.

Remediation is first-class commands, never manual SQL:

- `shipment.retry` — failed shipment's packages reassigned to a **new**
  shipment (identity, type and delivery mode preserved from the source); the
  source stays `failed` and emptied.
- `package.writeOff` — terminal follow-up: the same four reductions as a
  receipt discrepancy plus a post-allocation roll over, mandatory reason; a
  fully written-off package becomes `cancelled`.
- `package.recover` — a delayed package returns to where it was; the target is
  **derived from the record**, not asked (no shipment or not departed →
  `readyForShipment`; already travelling → `inTransit`). Refused while the
  shipment itself is disrupted — recovering only the package would leave the
  item deriving `exception`, a command that appears to do nothing.

"Failed requires follow-up" is enforced as a worklist signal
(`shipment.failedWithoutFollowUp`), not a hard block — diagnostics never
mutate.

## 8. Roll overs (ADR 0005)

| Status | Meaning | Written by |
| --- | --- | --- |
| `open` | awaiting rebatch or resolution | creation (execution shortfalls, supplier cuts, discrepancies, write-offs) |
| `rebatched` | consumed by a later operation, back-linked via `rebatchedIntoOperationId` | execution only |
| `resolved` | settled outside re-aggregation, mandatory reason; records the decision, **moves no money** | `rollOver.resolve` |
| `cancelled` | terminal by cascade (demand cancelled or creating operation compensated) | never a direct action |

- Stage `preAllocation` = dropped before supplier-facing allocation (execution
  shortfall); `postAllocation` = dropped after (cuts, discrepancies,
  write-offs).
- Open roll overs re-enter aggregation **by default**.
- A resolved roll over is terminal: an item left with nothing live and only a
  resolved roll over derives `cancelled` ("Resuelto sin entrega"), letting its
  order close.
- `/admin/roll-overs` lists them; `resolved` is deliberately not hidden.

## 9. Operation compensation and re-run

The **administrative window**: an executed operation can be compensated only
while every *live* supplier order is still `pending` (an order already
cancelled through the supplier loop does not close the window). Afterwards the
real world is managed through supplier-loop actions.

- `operation.cancel` — **status-only, nothing deleted**: lot items, lots and
  supplier orders → `cancelled`; the roll overs the operation *created* →
  `cancelled`; the roll overs it *consumed* revert `rebatched → open` via the
  back-link; counters recomputed; one `operation.cartItem.excluded` per item
  carrying the same quantity its inclusion carried. Demand re-enters
  aggregation exactly — the conservation property compensation rests on.
- `operation.rerun` — one command, three paths by status, atomic: `failed`
  re-executes in place; `completed` compensates then creates and executes a new
  operation (same window rule; `includeRollOver` forced `true` so the re-run
  cannot strand what the compensation just released); `cancelled` creates and
  executes only. If execution throws, the compensation rolls back with it.
- `operation.remove` — hard delete, only for `failed` or `draft` operations
  with no children.

A cancelled operation is exempt from the standard quantity rules (its live
counters recompute to zero against a frozen `eligibleQuantity`) and carries its
own critical rule instead: `operation.cancelled.notCompensated`.

## 10. Carrier orders

`CarrierOrder` books a carrier for one or more shipments. It records the
**contracting, never the goods**: quantity, packages, and delivery evidence
stay on the shipments it groups.

- Guarded ladder (`pending → requested → confirmed → inTransit → completed`,
  plus `cancel`/`markFailed`), timestamps written by their transitions.
- `addShipments`/`removeShipment` re-point `Shipment.carrierOrderId`; detaching
  says nothing about where the goods are.
- `softDelete` requires zero live shipments; `hardDelete` requires `pending` ∧
  zero shipments (the guard is load-bearing: the FK would otherwise `SetNull`
  silently).
- **It publishes no domain event, by design** — the one fulfillment service
  with no effects handler and no dispatcher wake-up. The customer journey feeds
  from shipment states only. Its diagnostics are all warnings for the same
  reason: a booking carries no quantity and nothing derives from its status.

## 11. Cross-cutting mechanics

### One transitions module

`src/shared/common/fulfillment-transitions.ts` holds, as data: the six legal
ladders (supplier order, lot, lot item, package, shipment, carrier order), the
aggregate↔lines compatibility tables, the demand status sets, and the
per-entity `availableActions` matrices. Services guard with it, diagnostics
monitor with it, and the UI renders the server-computed actions — every command
key on every call, disabled entries carrying a Spanish reason — and re-derives
nothing.

### One write path

Domain mutation + event publish in one transaction; `wake()` after commit;
audit log always (`docs/tracking-architecture.md`). Effects handlers per source
(`cart`, `operation`, `supplierOrder`, `rollOver`, `shipment`, `package`) build
payloads in pure, unit-testable builders with deterministic, timestamp-free
event keys.

### Serializable where quantity moves

The thirteen quantity-moving commands — `operation.execute`,
`operation.cancel`, `operation.rerun`, the scripts-only `createAndExecute`,
`supplierOrder.confirm`/`cancel`/`cancelLine`/`registerDispatch`,
`shipment.receive`, `package.writeOff`/`fractionate`/`promote`/`split` — run
through `runSerializable` (`admin/_base/serializable-transaction.ts`), **the
only place `Serializable` isolation is requested**. It retries a bounded three
attempts on serialization failures (P2034 / SQLSTATE 40001) and re-throws
everything else immediately, so a guard's `CONFLICT` surfaces on the first
attempt. Callbacks read their state inside the transaction, so a retry
re-plans. Pure ladder moves use the default isolation. The interactive
transaction timeout is raised in `src/server/db.ts` — these commands issue
dozens of round trips against a remote database.

### Diagnostics: monitor, never repair

Six read-only calculators (`operation`, `lot`, `supplier-order`, `package`,
`shipment`, `carrier-order` diagnostics) compare records, quantities, and
statuses against the shared maps. Severity philosophy: **critical** guards
demand conservation or a broken command precondition;
**warning** flags operator worklist items (stale open roll overs, pending
pickup-point collections, disrupted bookings, the four `after N days` rules).
Correct compensations and pickup-point arrivals are explicitly exempted from
the rules they would otherwise trip. Diagnostics never mutate; remediation is
always a command.

## 12. Command surface index

| Router | Procedures |
| --- | --- |
| `admin.operation` | list, getById, getStats, createDraft, review, updateDraft, execute, cancel, rerun, remove |
| `admin.supplierOrder` | list, getById, getStats, request, confirm, cancel, cancelLine, registerDispatch |
| `admin.lot` | list, getById, getStats (read-only — ADR 0003; actions delegate to the supplier order) |
| `admin.package` | list, getById, getStats, fractionationCandidates, fractionate, promote, split, writeOff, markDelayed, markFailed, confirmDelivery, recover |
| `admin.shipment` | list, getById, getStats, dispatch, receive, deliver, createEndUser, addPackages, retry, markDelayed, markFailed |
| `admin.carrierOrder` | list, getById, getStats, create, update, softDelete, hardDelete, request, confirm, markInTransit, complete, cancel, markFailed, addShipments, removeShipment |
| `admin.rollOver` | list, getStats, resolve |
| `admin.tracking` | listEvents, getCartTimeline, getCartItemTimeline, getCartItemTimelineDetail |
| `admin.operationsCart` | list, getById, getStats, update, quickUpdateStatus, softDelete, hardDelete |
| `tracking` (customer) | getOrderTimeline, getOrderItemTimelines (redacted, six-stage journey) |

Commands returning a **different entity** than they were called on —
`operation.rerun`, `shipment.retry`, `shipment.createEndUser` — return the new
record's detail; clients follow the result id.

## 13. Verification

- `pnpm fulfillment:e2e` — the twelve-step end-to-end run through the real
  service layer against a freshly seeded database: aggregation, partial
  confirmation with a LIFO cut, dispatch and receipt with a shortfall,
  fractionation, all three delivery modes (including the pickup-point
  asymmetry asserted positively), disruption and recovery, order closure
  including the negative case, roll-over resolution, and a final sweep with
  zero criticals. Repeatable: `E2E-`-prefixed rows, teardown in `finally`.
- `pnpm db:seed-verify` — stored-equals-derived for every seeded cart item,
  stored-equals-computed counters, zero critical diagnostics, and per-enum
  state coverage (every producible fulfillment state has a fixture; the eight
  no command can produce are deliberately uncovered — see
  `docs/schema-reference.md`).

Both scripts need `--conditions=react-server` (wired into the `pnpm` scripts)
to resolve `server-only` imports outside Next. Run them after any change to
derivation, diagnostics, the ladders, or the seed.

## 14. ADR map and open items

| ADR | Decision | Sections here |
| --- | --- | --- |
| 0002 | fulfillment status derived from lineage; order closure rolled up | §1, §6, and everything `docs/tracking-architecture.md` details |
| 0003 | SupplierOrder commands the supplier loop; lots/lot items cascade | §3, §5 (lot roll-up), §12 (`admin.lot` read-only) |
| 0004 | physical packages with legs; per-leg conservation; consolidated default | §4, §5 |
| 0005 | demand conservation; roll over ladder; re-aggregation by default | §2, §3, §8, §9 |
| 0006 | operation draft, review with omissions, fingerprint-guarded execute | §2 |

(ADR 0001, Mercado Pago reconciliation, gates the *entry* into fulfillment —
see `docs/schema-reference.md` flow steps 3–4.)

**Deferred by decision, each behind a stated gate** (architecture doc §21.9
Group D): `package.consolidate`; a persistent `FulfillmentException` entity;
group-pickup-point routing; `carrierOrder.restore`; promoting the carrier
aggregate rule to critical; a structured `CarrierOrder.metadata` schema.

**Recorded findings owned by future work** (architecture doc §21.10): the
`listOriginalDemand` treatment of resolved roll overs, and the supplier MOQ
being applied per cart item rather than to pooled demand. Both are
pre-execution behavior outside this reference's scope.
