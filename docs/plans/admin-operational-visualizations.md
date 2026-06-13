# Admin Operational Visualizations Plan

## Context

This plan defines the V1 admin visualizations for operational entities in the
fulfillment flow: lots, packages, and shipments.

Primary references:

- `docs/schema-reference.md`
- `docs/tracking-architecture.md`
- `CONTEXT.md`

The plan follows the domain rule that aggregate statuses are display summaries,
not proof. Detailed operational records, quantity bridges, and tracking events
remain the evidence used by admin views.

## Confirmed Decisions

- V1 is read-only.
- Navigation stays entity-based.
- `Lot` is the primary row for the lots view; `LotItem` appears in detail.
- `Package` is the primary row for the packages view; `PackageLotItem` and
  `PackageAllocation` appear in detail.
- `Shipment` is the primary row for the shipments view; packages appear in
  detail.
- Details open in modals, matching the existing admin operations pattern.
- The UI uses operational Spanish labels and keeps technical ids as secondary
  references.
- No database schema changes are planned for V1.
- New API, router, service, schema, and UI slices are expected.
- Routers are separate and singular: `admin.lot`, `admin.package`,
  `admin.shipment`.
- The existing `features/admin/crud` pattern is reused for these read-only
  admin entity views.
- Read-only diagnostics are visible, filterable, and calculated on the fly.
- Diagnostics use stable codes and severities: `warning` and `critical`.
- List responses include diagnostic summaries; detail responses include full
  diagnostics.
- Server-side pagination is required.
- The `withDiagnostics` filter applies before pagination and affects
  `total/pageCount`.
- Default ordering is recent first: `createdAt desc, id desc`.
- Stats include counts and operational quantities.
- Each detail modal shows the latest 5 related tracking events and links to
  the full tracking page.
- Tracking should accept query params for initial filters.
- Hub cards for lots, packages, and shipments should be enabled when the routes
  are implemented.

## V1 Non-Goals

- No create, update, delete, cancel, re-run, correction, or status transition
  mutations.
- No database migrations.
- No direct writes to `CartItemTrackingEvent` outside
  `src/server/services/tracking/`.
- No package or shipment workflow transitions from UI components.
- No full tracking timeline embedded in every modal.
- No deep URL synchronization for every tracking filter change; initial query
  param loading is enough.
- No weight, dimensions, inventory, stock reservation, or carrier policy logic
  unless already represented by the current schema.

Future mutation work must be implemented through orchestration services that
write domain records and publish domain events inside the same transaction, then
call `DomainEventDispatcher.wake()` after commit.

## Routes

Add these admin operation routes:

- `/admin/operations/lots`
- `/admin/operations/packages`
- `/admin/operations/shipments`

Update `/admin/operations`:

- enable the existing lots, packages, and shipments entries
- replace placeholder copy with operational descriptions
- keep icons and the dense admin layout style

## UI Pattern

Each page should use the same visual structure as existing operations pages:

- `CrudPageShell`
- actions with a back link to `/admin/operations`
- `CrudStatsCards`
- bordered filter block
- `CrudTable`
- `CrudLoadingState`, `CrudErrorState`, `CrudEmptyState`
- entity-specific detail dialog
- badges for status and diagnostics

Entity feature folders:

- `src/features/admin/crud/lot/*`
- `src/features/admin/crud/package/*`
- `src/features/admin/crud/shipment/*`

Expected component shape per entity:

- `<entity>-table.tsx`
- `<entity>-detail-dialog.tsx`
- `<entity>.mappers.ts`

Do not add form dialogs or delete dialogs in V1.

## Shared Diagnostic Contract

Create a shared diagnostic schema and type, reused by all three entity slices.

Suggested shape:

```ts
type OperationalDiagnostic = {
  code: string;
  severity: "warning" | "critical";
  message: string;
  refs?: Record<string, number | string>;
};
```

List items should include:

- `diagnosticCount`
- `highestDiagnosticSeverity`
- `diagnosticMessages`: 1 or 2 top messages for the table

Detail payloads should include:

- `diagnostics: OperationalDiagnostic[]`
- quantities and related records used to calculate those diagnostics

Diagnostics are not persisted in V1.

## API Shape

Add schemas:

- `src/schemas/admin/operational-diagnostic.schemas.ts`
- `src/schemas/admin/lot.schemas.ts`
- `src/schemas/admin/package.schemas.ts`
- `src/schemas/admin/shipment.schemas.ts`

Add shared types:

- `src/shared/common/admin-crud/operational-diagnostic.types.ts`
- `src/shared/common/admin-crud/lot.types.ts`
- `src/shared/common/admin-crud/package.types.ts`
- `src/shared/common/admin-crud/shipment.types.ts`

Add routers:

- `src/server/api/routers/admin/lot.router.ts`
- `src/server/api/routers/admin/package.router.ts`
- `src/server/api/routers/admin/shipment.router.ts`

Mount routers in `src/server/api/routers/admin.router.ts`:

- `lot: lotRouter`
- `package: packageRouter`
- `shipment: shipmentRouter`

Each router exposes only:

- `list`
- `getById`
- `getStats`

Document the V1 read-only omission of `create/update/delete` in the plan and
keep service/router naming clear enough that future implementers do not infer a
partial CRUD oversight.

## Pagination Semantics

All list endpoints return:

```ts
{
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}
```

List procedure flow:

1. Apply normal database filters.
2. Load candidate rows with only the relations needed for list diagnostics.
3. Calculate diagnostic summaries.
4. Apply the diagnostics filter if present.
5. Preserve stable ordering by `createdAt desc, id desc`.
6. Paginate the filtered results.
7. Return `total` and `pageCount` for the filtered result set.

This is acceptable for V1. If volume becomes a problem, later work can move the
diagnostic filter into SQL aggregates or a materialized diagnostic model.

## Common Filters

All three list endpoints should support:

- `page`
- `pageSize`
- `search`
- `status`
- `createdFrom`
- `createdTo`
- `diagnosticState`: `all | withDiagnostics | withoutDiagnostics`

Direct id filters should be supported where applicable:

- `operationId`
- `lotId`
- `lotItemId`
- `packageId`
- `shipmentId`

Entity-specific filters:

- Lots: `supplierId`, `supplierOrderId`, `operationId`, `destinationId`
- Packages: `shipmentId`, `lotId`, `lotItemId`, `productId`
- Shipments: `type`, `carrierOrderId`, `carrierId`, `trackingCode`

Avoid broad customer/commercial search in these views for V1. Use direct ids or
the tracking page for deep customer-line investigation.

## Stats

Stats endpoints should include counts and operational quantities.

Lots:

- total lots
- counts by `LotStatus`
- total `LotItem.quantity`
- total demand allocation quantity from `CartItemLotItem`
- quantity pending package allocation when derivable
- count with diagnostics

Packages:

- total packages
- counts by `PackageStatus`
- total `PackageLotItem.quantity`
- total packaged allocation quantity from `PackageAllocation`
- quantity without packaged allocation
- count with diagnostics

Shipments:

- total shipments
- counts by `ShipmentStatus`
- counts by `ShipmentType`
- package count
- transported quantity from package lines or packaged allocations
- count with diagnostics

## Lots View

Primary row: `Lot`.

List columns:

- lot code and id
- operation code/id
- supplier
- supplier order
- aggregate lot status
- lot item count
- quantity summary
- diagnostic summary
- created/updated timestamps

Detail modal sections:

- lot header: operation, supplier, supplier order, status, dates
- quantity summary: lot item quantity, demand allocation quantity, packaged
  quantity if available, pending quantity
- lot items grouped under the lot
- demand allocations under each lot item
- related roll overs for the operation where applicable
- latest 5 related tracking events
- diagnostics
- collapsible JSON/metadata only where current records expose flexible JSON

Lot item hierarchy:

- show product, destination, quantity, and line status first
- then show demand allocations with cart, cart item, user, fulfillment status,
  and quantity
- link each customer demand line to its cart item tracking timeline

Lot diagnostics:

- `lot.supplierOrder.missing` as `warning`
  - Lot has no supplier order.
- `lot.item.noDemandAllocations` as `warning`
  - A lot item has no demand allocations.
- `lot.item.quantityMismatch` as `critical`
  - Strict check: `LotItem.quantity !== sum(CartItemLotItem.quantity)`.
- `lot.status.aggregateAheadOfLines` as `warning`
  - Lot aggregate status is ahead of its lot item statuses.
- `lot.cancelledWithActiveDemand` as `critical`
  - Lot is cancelled while active demand allocations remain without visible
    cancellation or roll over handling.

V1 compatibility table for `lot.status.aggregateAheadOfLines`:

- `requested` expects lot items not to remain `pending`
- `confirmed` expects lot items to be `confirmed`, `readyForPackaging`, or
  `completed`
- `readyForPackaging` expects lot items to be `readyForPackaging` or
  `completed`
- `completed` expects lot items to be `completed`

## Packages View

Primary row: `Package`.

List columns:

- package name and id
- tracking code
- aggregate package status
- shipment summary
- package line count
- quantity summary
- diagnostic summary
- created/updated timestamps

Detail modal sections:

- package header: status, tracking code, shipment, dates
- quantity summary: package line quantity, packaged allocation quantity,
  unallocated package quantity
- package lines by product/lot item
- packaged allocations under each package line
- related lot and shipment references
- latest 5 related tracking events
- diagnostics

Package line hierarchy:

- show package line product/lot item, quantity, and line status first
- then show packaged allocations with demand allocation, cart item, user,
  fulfillment status, and quantity
- link each customer demand line to its cart item tracking timeline

Package diagnostics:

- `package.shipment.missing` as `warning`
  - Package is `inTransit` or `received` but has no shipment.
- `package.line.noPackagedAllocations` as `warning`
  - A package line has no packaged allocations.
- `package.line.quantityMismatch` as `critical`
  - Strict check:
    `PackageLotItem.quantity !== sum(PackageAllocation.quantity)`.
- `package.allocation.exceedsDemandAllocation` as `critical`
  - A packaged allocation quantity exceeds its source demand allocation
    quantity.
- `package.status.aggregateAheadOfLines` as `warning`
  - Package aggregate status is ahead of package line statuses.

V1 compatibility table for `package.status.aggregateAheadOfLines`:

- `readyForShipment` expects package lines to be `packed`, `shipped`, or
  `received`
- `inTransit` expects package lines to be `shipped` or `received`
- `received` expects package lines to be `received`

## Shipments View

Primary row: `Shipment`.

List columns:

- internal code and id
- shipment name
- type: `internalTransfer` or `endUserDelivery`
- aggregate shipment status
- carrier order
- tracking code
- package count
- quantity summary
- diagnostic summary
- created/updated timestamps

Detail modal sections:

- shipment header: internal code, type, status, carrier order, tracking code,
  dates
- destination/contact snapshot summary where recognizable
- collapsible destination/contact JSON fallback
- packages assigned to the shipment
- package lines and packaged allocations below each package
- latest 5 related tracking events
- diagnostics

Shipment diagnostics:

- `shipment.package.missing` as `warning`
  - Shipment has no packages.
- `shipment.carrierOrder.missing` as `warning`
  - Shipment has `trackingCode` but no `carrierOrderId`.
  - Do not infer carrier requirement from `Shipment.type` in V1.
- `shipment.status.aggregateAheadOfPackages` as `critical`
  - Shipment is `inTransit` or `received` but package statuses are
    incompatible.
- `shipment.packageLine.statusMismatch` as `critical`
  - Shipment is `inTransit` or `received` but package line statuses are
    incompatible.
- `shipment.trackingEvents.missing` as `warning`
  - Shipment is `inTransit` or `received` but no tracking events exist with
    the shipment id.

V1 compatibility table:

- `Shipment.status = inTransit`
  - packages should be `inTransit` or `received`
  - package lines should be `shipped` or `received`
- `Shipment.status = received`
  - packages should be `received`
  - package lines should be `received`

Track missing events separately because the V1 dispatcher is
operation-triggered and may lag until another application operation wakes it.

## Related Tracking Events

Each detail modal includes the latest 5 related tracking events:

- Lot detail: events with the lot id or any related lot item id
- Package detail: events with the package id
- Shipment detail: events with the shipment id

Each event summary should show:

- timestamp
- label
- source
- cart item
- quantity when present

Add a link to `/admin/operations/tracking` with query params:

- `lotId`
- `lotItemId`
- `packageId`
- `shipmentId`
- `cartItemId` where useful

Tracking page update:

- initialize filter state from query params on mount
- no full two-way URL synchronization required in V1

## Data And Service Layer

Add data files:

- `src/server/services/admin/lot.data.ts`
- `src/server/services/admin/package.data.ts`
- `src/server/services/admin/shipment.data.ts`

Add service files:

- `src/server/services/admin/lot.service.ts`
- `src/server/services/admin/package.service.ts`
- `src/server/services/admin/shipment.service.ts`

Recommended supporting diagnostic modules:

- `src/server/services/admin/operational-diagnostics.types.ts`
- `src/server/services/admin/lot-diagnostics.ts`
- `src/server/services/admin/package-diagnostics.ts`
- `src/server/services/admin/shipment-diagnostics.ts`

Keep raw Prisma reads in `*.data.ts`. Keep Zod parsing, diagnostic calculation,
pagination shaping, and read-only business rules in `*.service.ts`.

Service functions should remain transport-agnostic. Routers map service errors
to `TRPCError` only when needed.

## Build Order

1. Add shared operational diagnostic schema and type.
2. Add lot schemas/types, data layer, service, router, feature table/detail
   components, page client, and route.
3. Add package schemas/types, data layer, service, router, feature table/detail
   components, page client, and route.
4. Add shipment schemas/types, data layer, service, router, feature table/detail
   components, page client, and route.
5. Mount all routers in `admin.router.ts`.
6. Add query-param initialization to the tracking page.
7. Enable lots, packages, and shipments in `/admin/operations`.
8. Add unit tests for diagnostic calculators and service pagination semantics.
9. Run typecheck and focused tests.

## Tests

Add unit tests for diagnostic calculators:

- lot quantity conservation
- package quantity conservation
- packaged allocation exceeding demand allocation
- aggregate status compatibility for package and shipment
- missing shipment/package/tracking evidence
- warning vs critical classification

Add service-level tests where practical for:

- `withDiagnostics` filtering before pagination
- `total/pageCount` after diagnostic filtering
- stable ordering by `createdAt desc, id desc`

Suggested focused verification:

```txt
pnpm exec vitest run <diagnostic-test-files>
pnpm check-types
```

## Implementation Notes

- Use decimal-safe comparisons for all quantity checks.
- Preserve operational labels in UI and technical ids as secondary references.
- For package-related TypeScript variables, avoid bare `package` identifiers
  where they reduce readability; use names such as `packageRecord` or
  `packageItem`.
- Do not treat `Package.status`, `Shipment.status`, `Lot.status`, or
  `CartItem.fulfillmentStatus` as proof without lower-level evidence.
- When detail payloads include flexible JSON snapshots or metadata, show a
  human-readable summary where possible and a collapsible JSON fallback.
- If a diagnostic rule cannot be computed cheaply for the list, include only
  its summary in the list and compute full refs/messages in `getById`.
