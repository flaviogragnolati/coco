# Implementation Plan: Customer Delivery Preference and Pickup Points

> **Lifecycle:** Working · **Owner skill:** q-code-implementation-plan · **Created:** 2026-10-09
> **Source:** `docs/architecture/features/customer-delivery-preference.md` (slices S-A..S-E, scenarios S1–S12, decisions D1–D15) and `docs/adr/0011-delivery-preference-lives-on-the-order.md`. Report rows F1 and #78 of `docs/plans/qa-open-tickets-2026-10-report.md`.
> **Base:** `main` at `1ba5693`.

## 1. Objective & outcome

- **Done means:** at checkout the customer picks "A domicilio" + an address or "Punto de retiro" + an admin-managed pickup point. The order stores that preference. The end-user shipment picker groups and pre-fills from it, and the server refuses shipments that contradict it. An admin can change it only through "Cambiar entrega", which is audited and shows up in the customer's journey with the admin's reason. The FAQ and step 5 of "Cómo funciona" describe the choice.
- **Why:** today only the shipment records a delivery mode, chosen by the admin. Nothing tells fulfillment what the customer wanted, and a "pickup point" is only free text.
- **For:** AI coding agent / developer, one executor, slices in order.

## 2. Scope

- **In scope:** everything in §4 of the architecture document: the `PickupPoint` entity and its admin CRUD, the checkout "Entrega" step, the order preference and its snapshots, the "Cambiar entrega" override, shipment assembly (grouping, pre-fill, match rule, derived destination, `Shipment.pickupPointId`, retry fix), the depot handover hint, the customer display, the home copy, the glossary and the reference docs.
- **Non-goals** (architecture §4): customer self-service change after payment; delivery pricing or zones; pickup-point capacity, calendars or structured hours; carrier integration; billing address capture; changing depot pickup.
- **Deferred:** structured hours, per-point capacity, customer self-service change.
- **Must not break:**
  - `confirmAndPay` idempotency (`getExistingPaymentResult`) and the one-live-order-per-cart rule (`findLiveOrderByCartId` + `user_order_cart_live_unique`).
  - The one-cart rule for home delivery in `loadAssignablePackages`.
  - The `deliver` mode branch: a pickup arrival never cascades packages.
  - Depot pickup through `package.confirmDelivery` with no shipment.
  - Legacy orders (preference null) keep working everywhere and are exempt from the match rule.
  - The glossary drift test (`glossary.data.test.ts`).
  - `checkout-v2` terms text (D15).

## 3. Current system context (HEAD 1ba5693)

- **Schema** (`prisma/schema.prisma`):
  - `UserOrder` (562) has `billingAddressSnapshot`, `shippingAddressSnapshot`, `termsSnapshot` and no delivery fields.
  - `Shipment` (1055) has `deliveryMode DeliveryMode?` and the destination snapshots.
  - `DeliveryMode` (1085) is `homeDelivery | pickupPoint`.
  - `CartItemTrackingEventType` (529) has 21 values.
  - There is no pickup-point model. The migrations are hand-written, and CHECK constraints follow the style of `20261008200000_supplier_application`.
- **Checkout:**
  - `checkout.service.ts`: `start` and `getState` build `checkoutStateSchema`. `confirmAndPay` resolves `input.shippingAddressId`, then either returns the existing attempt for a live order with a non-spent attempt, or reuses `liveOrder ?? createLiveUserOrder(...)`. The reuse path keeps the old snapshot. That is the latent defect D13 fixes.
  - `getAddressFromSnapshot` throws when the order has no address.
  - `buildPaymentResult` requires `shippingAddress`.
  - `checkout.data.ts` `createUserOrder` copies the shipping snapshot into billing.
  - Client: `checkout-steps.ts` (pure step model, ids `order|shipping|payment|review`, label "Envío"), `checkout-client.tsx`, `checkout-address-step.tsx`, `checkout-summary.tsx`, `checkout-review-step.tsx`.
- **My orders:** `src/app/(storefront)/my-orders/[orderId]/page.tsx` shows "Envío: <address line>" through `getAddressLine`. `orderDetailSchema` (`checkout.schemas.ts`) exposes the snapshots as `unknown`.
- **Admin catalog analog:** Destination is spread over `schemas/admin/destination.schemas.ts`, `shared/common/admin-crud/destination.types.ts`, `server/services/admin/destination.{data,service}.ts`, `server/api/routers/admin/destination.router.ts`, `features/admin/crud/destination/*`, `app/admin/(catalog)/destinations/*`, plus a nav entry in `features/admin/shell/admin-nav.ts` and a glossary entity in `features/admin/glossary/data/catalog.ts`.
- **Shipment assembly:**
  - `shipment.service.ts`: `loadAssignablePackages` (1211) enforces only the one-cart rule. `createEndUser` (1254) trusts client snapshots. `addPackages` (1309) is the incremental half. `retry` (1105) drops the destination.
  - `package.data.ts` `shipmentAssignmentSelect` reaches `cartItem.cartId`.
  - `package.service.ts` `list`/`summarizePackage` builds the picker list items. `toDetail` builds the package detail, which `PackageConfirmDeliveryDialog` reads.
  - UI: `features/admin/crud/shipment/{outbound-package-picker,shipment-create-end-user-dialog,shipment-add-packages-dialog}.tsx`.
- **Diagnostics:** `package-diagnostics.ts` already has `package.outbound.multiCustomer`. The cart traceability page (`/admin/carts/[cartId]`, `cart-traceability.{data,assembler,service}.ts`, `order-payment-panel.tsx`) aggregates the lot, package and shipment diagnostics and lists the orders.
- **Tracking:**
  - The pipeline is publisher → outbox → `TrackingDomainEventListener` → `mapDomainEventToTrackingCommands` → `TrackingEventService.recordManyFromCommands`.
  - Command `eventKey` = `tracking:${domainEventKey}:${eventType}` and must be unique.
  - `tracking-display.ts` holds `trackingEventTypes`, `trackingEventLabelMap`, the notice-kind map, and `customerNoticeReason`, whose allow-list today is `fulfillmentException` plus the fixed rollover sentences.
  - `tracking-event.service.ts` `toUserOrderItemTimeline` builds the notices, and `features/tracking/customer-order-journey{,.ts,-view.tsx}` renders them.
- **Home copy:** `features/home/home-content.ts` (`howItWorksSteps[4]`, `faqItems`), `home-content.test.ts`, `e2e/smoke.spec.ts` (FAQ button count 5).
- **Scripts:** `scripts/fulfillment-e2e.ts` calls `shipmentService.createEndUser` with client snapshots, so it must compile after the contract change. It is never run here.
- **Commands:** `pnpm typecheck`, `pnpm check`, `pnpm vitest run <paths>`, `pnpm test`. Never run a DB-writing command; the `.env` points at a shared DB.

## 4. Approach

The slices follow architecture §15, strictly in order, with one or more commits per slice.

1. **S-A** lands the whole schema in one additive migration, so later slices never touch the database shape again. It also adds the catalog (CRUD + nav + glossary).
2. **S-B** adds the customer input and the order snapshots. The pickup option stays invisible until an active point exists.
3. **S-C** makes fulfillment consume the preference. One shared module holds the order-resolution and match logic, used by `createEndUser`, `addPackages`, the picker list and the diagnostics.
4. **S-D** adds the only post-checkout writer, the override, with its domain event and customer notice.
5. **S-E** brings copy and docs. Its home-copy change goes on a separate branch, `f1-home-copy`, created from the finished branch: it must go live only once real points exist (architecture §13, §15). Its reference-doc updates stay on the main work branch.

Single-place rules:
- `buildPickupPointSnapshot` is the only way a point becomes order or shipment data.
- `resolveCheckoutDelivery` is the only resolver of the checkout `delivery` input, used by both the create and the reuse paths.
- `findDeliveryMismatch` is the only match rule.
- `changeDeliveryPreference` is the only post-checkout writer.

## 5. Assumptions

- **A1:** A package's order is resolved package → live allocations → cart item → cart → **live** order (status not `cancelled`/`failed`). There is at most one per cart (architecture §14).
- **A2:** "Pending order" in diagnostics, the deactivation count and the override means `UserOrder.status = processing` (paid, not closed). The override is refused on any other status: before payment the customer changes the delivery in checkout (D5, D13).
- **A3:** A pickup-point end-user shipment always names its point (`pickupPointId` required when `deliveryMode = pickupPoint`). This applies to legacy-only shipments too, because the destination snapshot is derived from the point (D11).
- **A4:** A shipment may target an inactive or soft-deleted point. Deactivation stops checkout, not fulfillment of the orders that already chose it (D7, S9). The override and checkout accept only active points.
- **A5:** For a multi-order package, the list item carries `order: null` plus `orderCount`. The picker puts it under "Varios pedidos", and the server's match rule judges every order on assignment.

## 6. File map

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | modify | `PickupPoint` model; `UserOrder.deliveryPreference/pickupPointId/pickupPointSnapshot`; `Shipment.pickupPointId`; `CartItemTrackingEventType.deliveryPreferenceChanged` |
| `prisma/migrations/20261009000000_customer_delivery_preference/migration.sql` | create | The single additive migration (§7.1 of the architecture) + CHECKs |
| `src/schemas/pickup-point.schemas.ts` | create | Shared (non-admin) shapes: `pickupPointDataSchema` (the snapshot body), `pickupPointSnapshotSchema`, `checkoutPickupPointSchema` |
| `src/schemas/admin/pickup-point.schemas.ts` | create | Admin CRUD inputs/outputs (Destination pattern) + `pickupPointSetActiveInputSchema` |
| `src/shared/common/admin-crud/pickup-point.types.ts` | create | Types inferred from the admin schemas |
| `src/shared/common/pickup-point-snapshot.ts` | create | `buildPickupPointSnapshot(point, source, capturedAt)`: the single point → JSON builder |
| `src/server/services/admin/pickup-point.{data,service}.ts` (+ `.service.test.ts`) | create | CRUD with audit; `listActiveForCheckout`; `pendingOrderCount`; hard delete refused while referenced |
| `src/server/api/routers/admin/pickup-point.router.ts`, `admin.router.ts` | create / modify | `admin.pickupPoint.{list,getById,getStats,create,update,setActive,softDelete,hardDelete}` |
| `src/features/admin/crud/pickup-point/{pickup-point-form-dialog,pickup-point-table,pickup-point.mappers}.tsx/ts` | create | Admin UI |
| `src/app/admin/(catalog)/pickup-points/{page.tsx,_components/pickup-point-crud-client.tsx}` | create | Page + deactivation confirmation with pending count |
| `src/features/admin/shell/admin-nav.ts` | modify | "Puntos de retiro" in Catálogo |
| `src/features/admin/glossary/data/{operation,tracking}.ts` | modify | Pickup point concept → entity with `PickupPoint` occurrence; new "Preferencia de entrega" concept; `deliveryPreferenceChanged` status |
| `src/shared/common/delivery-display.ts` (+ test) | create | Labels and formatters: `deliveryPreferenceLabelMap`, `formatAddressLine`, `describeOrderDelivery`, `describeDeliveryChoice` |
| `src/schemas/checkout.schemas.ts`, `src/shared/common/checkout.types.ts` | modify | `checkoutDeliveryInputSchema` union; `checkoutStateSchema.pickupPoints`; `orderDetailSchema.deliveryPreference/pickupPointSnapshot`; nullable `shippingAddress` in result |
| `src/server/services/checkout/checkout-delivery.ts` (+ test) | create | `resolveCheckoutDelivery`: input + records → order delivery columns |
| `src/server/services/checkout/checkout.{data,service}.ts` | modify | Read active points; write/refresh delivery columns; tolerate address-less orders |
| `src/app/(storefront)/checkout/_components/checkout-{steps,client,delivery-step,summary,review-step}.ts(x)` (+ steps test) | modify / create | "Entrega" step with mode toggle, address list or pickup list |
| `src/app/(storefront)/my-orders/[orderId]/page.tsx` | modify | "Entrega" row + footnote |
| `src/server/services/admin/order-delivery.ts` (+ test) | create | Pure: `OrderDelivery` type, `findDeliveryMismatch`, `orderDeliveryConflict`, `deriveShipmentDestination`, `deliveryPreferenceDiagnostics` |
| `src/server/services/admin/order-delivery.data.ts` | create | `findLiveOrderDeliveriesByCartIds` (one query) |
| `src/server/services/admin/shipment.{service,data}.ts` | modify | Match rule in `loadAssignablePackages`; derived destination; `pickupPointId`; retry copies destination |
| `src/schemas/admin/shipment.schemas.ts` | modify | `pickupPointId?` (required for pickup), drop client snapshots; detail gains `pickupPoint` summary |
| `src/schemas/admin/package.schemas.ts`, `src/server/services/admin/package.service.ts`, `package-diagnostics.ts` | modify | List item `order` + `orderCount`; preference conflict diagnostic |
| `src/features/admin/crud/shipment/{outbound-package-picker,shipment-create-end-user-dialog,shipment-add-packages-dialog}.tsx`, `outbound-package-groups.ts` (+ test) | modify / create | Grouped picker, pre-fill, pickup-point select |
| `src/features/admin/crud/package/package-confirm-delivery-dialog.tsx` | modify | "El cliente eligió: …" hint |
| `src/server/services/admin/cart-traceability.{data,assembler,service}.ts`, `schemas/admin/cart-traceability.schemas.ts`, `order-payment-panel.tsx` | modify | Order delivery block, `order.deliveryPreference.pointInactive` diagnostic, "Cambiar entrega" button |
| `src/features/admin/crud/operations-cart/operations-cart-detail-form.tsx` (+ data/schema select) | modify | Readable "Entrega" block instead of the raw shipping JSON |
| `src/schemas/admin/user-order.schemas.ts`, `src/server/services/admin/user-order.{data,service}.ts` (+ test), `src/server/api/routers/admin/user-order.router.ts` | create | `admin.userOrder.{deliveryOptions,changeDeliveryPreference}` |
| `src/features/admin/crud/user-order/order-delivery-change-dialog.tsx` | create | Override dialog |
| `src/schemas/domain-events.schemas.ts`, `tracking-event-mapper.ts` (+ test), `tracking-domain-event.listener.ts` | modify | `userOrder.deliveryPreferenceChanged` event → one tracking command per cart item |
| `src/shared/common/tracking-display.ts` (+ test), `src/features/admin/crud/tracking/tracking.mappers.ts`, `src/schemas/tracking.schemas.ts`, `tracking-event.service.ts`, `features/tracking/customer-order-journey{.ts,-view.tsx}` | modify | New type, label "Cambiamos tu entrega", `info` notice, verbatim reason, `detail` line "<antes> → <ahora>" |
| `scripts/fulfillment-e2e.ts`, `src/server/services/checkout/checkout.transaction-queries.test.ts` | modify | Compile against the new contracts |
| `src/features/home/home-content.ts`, `home-content.test.ts`, `e2e/smoke.spec.ts` | modify (branch `f1-home-copy`) | FAQ + step 5, FAQ count 5 → 6 |
| `docs/fulfillment-reference.md`, `docs/tracking-architecture.md`, `docs/schema-reference.md` | modify | Reference updates |

## 7. Phases and tasks

### Phase S-A: Pickup point catalog

**A1. Schema + migration.**
- `prisma/schema.prisma`:
  - Add `model PickupPoint` (`@@map("pickup_point")`) with these columns:
    - `id`, `name String @db.Text`, `line1 @db.Text`, `line2 String? @db.Text`, `city @db.Text`, `state @db.Text`, `postalCode String? @db.Text`, `country @db.Text @default("AR")`;
    - `googleMapsUrl String? @db.Text`, `hours String @db.Text`, `instructions String? @db.Text`;
    - `active @default(true)`, `deleted @default(false)`, `createdAt`, `updatedAt @updatedAt`;
    - back-relations `userOrders UserOrder[]` and `shipments Shipment[]`.
  - A comment says it is not a destination and not an address.
  - `UserOrder` gains `deliveryPreference DeliveryMode?`, `pickupPointId Int?`, `pickupPointSnapshot Json? @db.JsonB`, the relation `pickupPoint PickupPoint? @relation(fields: [pickupPointId], references: [id], onDelete: Restrict)`, and `@@index([pickupPointId])`.
  - `Shipment` gains `pickupPointId Int?` + relation (Restrict) + index.
  - `CartItemTrackingEventType` gains `deliveryPreferenceChanged`.
- Migration `20261009000000_customer_delivery_preference/migration.sql`:
  - Generate the base SQL with `prisma migrate diff` in schema-to-schema mode only (old schema from `git show 1ba5693:prisma/schema.prisma`), then hand-edit it.
  - Contents: `ALTER TYPE ... ADD VALUE`, `CREATE TABLE "pickup_point"`, `ALTER TABLE user_order/shipment ADD COLUMN`, indexes, FKs `ON DELETE RESTRICT ON UPDATE CASCADE`.
  - CHECK `user_order_delivery_preference_check`:
    - all three columns null;
    - or pickup with `pickupPointId` and `pickupPointSnapshot` non-null;
    - or home with both null and `shippingAddressSnapshot` non-null.
  - CHECK `shipment_pickup_point_check`: `pickupPointId IS NULL OR (type = 'endUserDelivery' AND deliveryMode = 'pickupPoint')`.
  - Header comment: additive, no backfill, legacy orders stay null.
- Accept: `pnpm prisma generate` runs (postinstall); the schema validates; the SQL contains no destructive statement.

**A2. Shared point contracts.**
- `src/schemas/pickup-point.schemas.ts`:
  - `pickupPointDataSchema` = `{ id, name, line1, line2|null, city, state, postalCode|null, country, googleMapsUrl|null, hours, instructions|null }`;
  - `pickupPointSnapshotSchema` = `{ source: "checkout"|"admin"|"shipment", capturedAt: string, pickupPoint: pickupPointDataSchema }`;
  - `checkoutPickupPointSchema` = `pickupPointDataSchema`.
- `src/shared/common/pickup-point-snapshot.ts` `buildPickupPointSnapshot(point, source, capturedAt = new Date())` copies exactly the data fields. Unit tests: no extra keys, nulls preserved.

**A3. Admin CRUD.**
- `schemas/admin/pickup-point.schemas.ts`:
  - Create input: `name`, `line1`, `line2` (nullish), `city`, `state`, `postalCode` (nullish), `country` (default "AR"), `googleMapsUrl` (optionalUrl), `hours` (required, "Los horarios son obligatorios"), `instructions` (nullish), `active` (default true).
  - Update = create + `id`. `setActive` = `{ id, active }`. Delete = `{ id }`. List input = `{ includeDeleted }`.
  - List item = detail + `updatedAt` + `pendingOrderCount`. Stats as Destination.
- `pickup-point.data.ts`: selects, `list` (with a `_count` of `userOrders` where `status = processing`), `findById`, `create`, `update`, `setActive`, `softDelete`, `hardDelete`, `getRelationCounts` (`userOrders`, `shipments`), `listActiveForCheckout` (`active && !deleted`, ordered by name).
- `pickup-point.service.ts`:
  - Follows the tx + audit pattern with actions `pickupPoint.create|update|setActive|softDelete|hardDelete` and entityType `pickupPoint`.
  - `update` refuses a deleted point.
  - `hardDelete` refuses (`RELATION_BLOCKED`) while any order or shipment references it. Message: `No se puede eliminar definitivamente "<name>" porque lo usan N pedido(s) y M envío(s).`
- Router `pickup-point.router.ts` (adminProcedure + `mapServiceError`), registered as `pickupPoint` in `admin.router.ts`.
- UI:
  - `features/admin/crud/pickup-point/*`: a form with fields Nombre, Dirección, Piso/depto, Ciudad, Provincia, Código postal, País, Google Maps URL, Horarios (textarea, placeholder "Lun a vie 10 a 18 h"), Instrucciones (textarea), and a "Punto activo" switch. The table shows name, address line, hours, pending orders and status, with row actions Editar / Desactivar|Activar / Enviar a papelera / Eliminar definitivamente.
  - `app/admin/(catalog)/pickup-points/*`: `CrudEntityPage`. The Desactivar confirmation (AlertDialog) states `Hay N pedidos pagos que eligieron este punto. Conservan su punto hasta que cambies su entrega; el checkout deja de ofrecerlo enseguida.`
  - Nav: `{ title: "Puntos de retiro", href: "/admin/pickup-points", icon: StoreIcon }` under Catálogo.
- Tests: `pickup-point.service.test.ts` with a mocked tx, covering the audit write per action, hard delete refused while referenced, update refused when deleted, and setActive.

**A4. Glossary.**
- `data/operation.ts`: turn `concepto-punto-de-retiro` into an entity (`slug: "entidad-punto-de-retiro"`, `kind: "entity"`, occurrence `{ code: "PickupPoint", db: "pickup_point" }`, `href: "/admin/pickup-points"`, definition from CONTEXT.md).
- Add concept `concepto-preferencia-de-entrega` (label "Entrega", term "Delivery preference", aliases "Modo de entrega (para la elección del cliente)", "Opción de envío").
- `data/tracking.ts`: status entry `CartItemTrackingEventType.deliveryPreferenceChanged` → `cart_item_tracking_event.eventType`. This needs the label, so add the type to `trackingEventTypes`/`trackingEventLabelMap` in S-A, leaving the notice and reason logic to S-D.
- Accept: `glossary.data.test.ts` green.

### Phase S-B: Checkout and order preference

**B1. Contracts.**
- `checkout.schemas.ts`:
  - `checkoutDeliveryInputSchema = z.discriminatedUnion("mode", [{ mode: "homeDelivery", shippingAddressId }, { mode: "pickupPoint", pickupPointId }])`, and `checkoutConfirmInputSchema` replaces `shippingAddressId` with `delivery`.
  - `checkoutStateSchema.pickupPoints: z.array(checkoutPickupPointSchema)`.
  - `checkoutPaymentResultSchema.shippingAddress` becomes nullable and gains `deliveryPreference: deliveryModeSchema.nullable()` and `pickupPoint: pickupPointDataSchema.nullable()`.
  - `orderDetailSchema` gains `deliveryPreference` and `pickupPointSnapshot: pickupPointSnapshotSchema.nullable()`. Unparseable snapshot → null.
  - Import `deliveryModeSchema` from `schemas/admin/shipment.schemas.ts` or move it to a shared spot; keep one definition.

**B2. Resolver.**
- `checkout-delivery.ts` `resolveCheckoutDelivery({ delivery, address, pickupPoint, capturedAt })` returns `{ deliveryPreference, pickupPointId, pickupPointSnapshot, shippingAddressSnapshot }`.
- Home: the address snapshot (`buildAddressSnapshot` moved here); the pickup fields are null.
- Pickup: `buildPickupPointSnapshot(point, "checkout")`; `shippingAddressSnapshot` null.
- Pure; unit-tested for S1 and S2.

**B3. Data + service.**
- `checkout.data.ts`:
  - `listCheckoutPickupPoints` (active && !deleted) and `findCheckoutPickupPointById`, which returns null when inactive or deleted.
  - `createUserOrder` takes the four delivery fields and sets `billingAddressSnapshot` = shipping (null for pickup; use `Prisma.DbNull`).
  - New `updateOrderDelivery(db, id, fields)`.
  - `orderDetailSelect` gains `deliveryPreference` and `pickupPointSnapshot`.
- `checkout.service.ts`:
  - `start`/`getState` add `pickupPoints`.
  - `confirmAndPay`:
    - home → `findCheckoutAddressById` ("Seleccioná una dirección de envío válida.");
    - pickup → `findCheckoutPickupPointById` (BAD_REQUEST "El punto de retiro ya no está disponible").
    - `resolveCheckoutDelivery` feeds the create path. On **both** reuse paths (existing non-spent attempt, and spent attempt + liveOrder) call `updateOrderDelivery` before building the result (D13, S4). A live order never has a completed transaction, because a completed payment moves the cart out of `atCheckout`, so `getRequiredCheckoutCart` would have refused.
  - `getAddressFromSnapshot` returns `CheckoutAddress | null`.
  - `buildPaymentResult` takes the order's delivery.
  - `toOrderDetail` maps the new fields.
- The `Prisma.DbNull` rule applies wherever a Json column must be SQL NULL, because the CHECK compares `IS NULL`.

**B4. Client.**
- `checkout-steps.ts`: step id `shipping` → `delivery`, label "Entrega". `CheckoutSelection` = `{ hasItems, deliveryMode, addressId, pickupPointId, paymentMethodId, acceptedTerms }`; `delivery` is complete when the chosen mode has its id. Update `checkout-steps.test.ts`.
- New `checkout-delivery-step.tsx`:
  - A Card titled "¿Cómo lo recibís?" with two `SelectableTile`s, "A domicilio" and "Punto de retiro". They are hidden when `pickupPoints` is empty (S3), and the address list then renders as today.
  - Below them, either `CheckoutAddressStep` or a pickup list card titled "Elegí un punto de retiro" (name, address line, hours, instructions, "Ver en el mapa" link).
- `checkout-client.tsx`: state `deliveryMode` (default `homeDelivery`) and `selectedPickupPointId` (default first point); `handleConfirm` sends `delivery`.
- Summary row: label "Entrega"; value is the address line1 or the point name. Review section "Entrega" shows the address or the point + hours.

**B5. My orders.** In `my-orders/[orderId]/page.tsx`, when `deliveryPreference` is non-null, render the "Entrega" row through `describeOrderDelivery`:
- home: "A domicilio — <address>";
- pickup: "Punto de retiro — <name>, <address> · <hours>", then the instructions and a map link;
- footnote "¿Querés cambiarla? Escribinos." linking `/#contacto`, while `status === "processing"`.
For legacy orders (null), keep today's "Envío" row.

**B6.** Update `checkout.transaction-queries.test.ts` to the `delivery` input and stub `listCheckoutPickupPoints`.

### Phase S-C: Shipment assembly

**C1. Order resolution + match rule** (`order-delivery.ts` pure, `order-delivery.data.ts` IO).
- `OrderDelivery = { cartId, orderId, orderCode, status, customerName, customerEmail, deliveryPreference: DeliveryMode | null, pickupPointId, pickupPointName, pickupPointActive, shippingAddressSnapshot }`.
- `findLiveOrderDeliveriesByCartIds(db, cartIds)` returns `Map<cartId, OrderDelivery>` from one `userOrder.findMany` (status not cancelled/failed, include user and pickupPoint).
- `packageCartIds(pkg)` collects the live lines' cart ids.
- `findDeliveryMismatch({ deliveryMode, pickupPointId }, orders)` returns the first `{ order, message }` or null:
  - null preference → skip;
  - home shipment + pickup order → `El pedido ${code} eligió Punto de retiro · ${name}; cambiá su entrega primero.`;
  - pickup shipment + home order → `El pedido ${code} eligió A domicilio; cambiá su entrega primero.` (S6);
  - pickup + different point → the same message with the other point's name.
- `orderDeliveryConflict(orders)` is true when two non-null preferences differ in (mode, pointId).
- `deriveShipmentDestination({ deliveryMode, point, orders })`:
  - pickup → `{ destinationAddressSnapshot: buildPickupPointSnapshot(point, "shipment"), destinationContactSnapshot: null }`;
  - home → the single order's address snapshot as `{ source: "order", capturedAt, orderId, orderCode, address }` plus contact `{ name, email }`; null when there is no live order or no address (legacy data).
- Tests: every branch, S5 and S6.

**C2. Service.**
- `shipment.schemas.ts`: `shipmentCreateEndUserInputSchema` drops both snapshot fields and adds `pickupPointId: positiveIdSchema.optional()`, refined as required iff `deliveryMode === "pickupPoint"` ("Elegí el punto de retiro").
- `loadAssignablePackages(tx, packageIds, target: { deliveryMode, pickupPointId }, alreadyOnShipment)`:
  - keeps the existing checks;
  - loads the orders for the new packages' carts;
  - refuses a package whose orders conflict (`El paquete ${name} mezcla pedidos con entregas distintas.`);
  - runs `findDeliveryMismatch` → `throwConflict(message)`;
  - returns `{ packages, orders }`.
- `createEndUser`:
  - for pickup, loads the point (`throwNotFound("Punto de retiro")`);
  - derives the destination;
  - `createShipment` gains `pickupPointId`;
  - the audit metadata gains `pickupPointId`.
- `addPackages` passes `{ record.deliveryMode, record.pickupPointId }`; the command select gains `pickupPointId`.
- `retry` copies `pickupPointId`, `destinationAddressSnapshot` and `destinationContactSnapshot` (D12); the command select gains them.
- Detail: `shipmentDetailSchema` gains `pickupPoint: { id, name } | null`. The detail dialog shows the point name next to the mode.

**C3. Picker list.**
- `packageListItemSchema` gains `order: { orderId, orderCode, customerName, deliveryPreference, pickupPointId, pickupPointName } | null` and `orderCount`.
- `package.service.ts` `list` (both branches) and `toDetail` call `findLiveOrderDeliveriesByCartIds` once per request and attach the order summary.
- `package-diagnostics.ts` gains `options.orders?: OrderDelivery[]` → warning `package.outbound.deliveryPreferenceConflict` "Los pedidos del paquete eligieron entregas distintas." whenever `orderDeliveryConflict` holds. The list path passes it.

**C4. UI.**
- `outbound-package-groups.ts` (pure, tested) `groupOutboundPackages(items)` → ordered groups:
  - `pickupPoint:<id>` "Punto de retiro · <name>";
  - `home:<orderId>` "A domicilio · <customer> · <orderCode>";
  - `none` "Sin elección";
  - `multi` "Varios pedidos".
- `OutboundPackagePicker` renders groups with a "Seleccionar grupo" button. Each row shows `#id name · customer · orderCode`. New prop `onSelectGroup(ids, group)`.
- `ShipmentCreateEndUserDialog`:
  - Pickup mode shows a select of non-deleted points (`admin.pickupPoint.list`, inactive ones labelled "(inactivo)").
  - The first selected package with a preference pre-fills the mode and point, and so does "Seleccionar grupo".
  - `onSubmit` sends `pickupPointId`.
  - The description copy states that the server checks the customer's choice.
- `ShipmentAddPackagesDialog`: the description names the point for pickup shipments.
- `shipments-client.tsx` passes the new values.

**C5. Depot hint.** `PackageConfirmDeliveryDialog` shows "El cliente eligió: <describeDeliveryChoice(order)>" or "El cliente no eligió entrega (pedido anterior)" from `pkg.order` (S10). No guard changes.

**C6. Diagnostics on the order.**
- `deliveryPreferenceDiagnostics(order)` → `order.deliveryPreference.pointInactive` (warning) for a `processing` pickup order whose point is inactive or deleted, with the message `El pedido ${code} eligió el punto de retiro "${name}", que ya no está activo; cambiá su entrega.`
- Wired into the cart traceability: the data select adds the order delivery fields and `pickupPoint { name, active, deleted }`, and the assembler builds the cart diagnostics with an `order` map.

**C7.** `scripts/fulfillment-e2e.ts`: remove the client snapshots; the pickup step creates a pickup point through `pickupPointService.create` and passes `pickupPointId` (script compiled, not run).

### Phase S-D: Override "Cambiar entrega"

**D1. Contracts.**
- `schemas/admin/user-order.schemas.ts`: `userOrderChangeDeliveryInputSchema`:
  - `orderId`;
  - `delivery`: a union of `{ mode: "homeDelivery", address: { addressId } | { snapshot: checkoutAddressFieldsSchema } }` and `{ mode: "pickupPoint", pickupPointId }`;
  - `reason`: trimmed, 1–500, "El motivo es obligatorio".
- `userOrderDeliveryOptionsSchema` = `{ orderId, current, addresses: CheckoutAddress[], pickupPoints: pickupPointData[], blockedReason: string | null }`.

**D2. Event.**
- `domain-events.schemas.ts`: `userOrderDeliveryPreferenceChangedEventSchema`, with type `userOrder.deliveryPreferenceChanged` and aggregateType `UserOrder`. Payload:
  - `orderId`, `cartItemIds: string[]` (min 1);
  - `before: { mode: DeliveryMode | null, pickupPointName? }`, `after: { mode, pickupPointName? }`;
  - `reason`.
  Add it to the union and to `domainEventTypeSchema`.
- `tracking-event-mapper.ts` returns one command per cart item, eventType `deliveryPreferenceChanged`, eventKey `tracking:${key}:deliveryPreferenceChanged:${cartItemId}` (unique per item), refs `{ orderId }`, metadata `{ reason, before, after }`.
- The listener's supported set adds the type. Mapper test included.

**D3. Display.**
- `tracking-display.ts`:
  - `userTrackingNoticeKindByEventType.deliveryPreferenceChanged = "info"`;
  - `customerNoticeReason` returns the trimmed `metadata.reason` for `deliveryPreferenceChanged` as well (verbatim allow-list);
  - new `customerNoticeDetail(eventType, metadata)` returns `"<antes> → <ahora>"` through `describeDeliveryChoice`, or just `<ahora>` when before is null.
- `userTrackingTimelineNoticeSchema.detail?`; `toUserOrderItemTimeline` fills it; the customer journey view model and view render the detail line before the reason.
- Admin `trackingEventTypeConfig.deliveryPreferenceChanged` uses `statusPresets.inProgress` with a `MapPin` icon.
- Tests: reason verbatim, detail text, and that `rollOverResolved` stays without a reason.

**D4. Service.**
- `user-order.data.ts`: `findOrderForDeliveryChange` (status, userId, delivery fields, items with cart item id/status, pickupPoint name) and `countOrderPackagesBlockingDeliveryChange(db, cartItemIds)`. The latter counts outbound packages with a live line allocated to those cart items and either `shipmentId != null` or `status = received`.
- `updateOrderDeliveryPreference` writes the new columns (`Prisma.DbNull` for cleared JSON).
- `user-order.service.ts` `changeDeliveryPreference(input, actor, db)`:
  - tx: load → guard;
    - status must be `processing` ("Solo se puede cambiar la entrega de un pedido pago en curso");
    - no blocking packages ("Quitá primero los paquetes del pedido de su envío");
    - home: the address belongs to the order's user and is live, or the snapshot is valid;
    - pickup: the point is active;
    - a no-op is refused ("La entrega ya es esa").
  - mutate: snapshots with source `admin`.
  - effects: `DomainEventPublisher.publish` with cartItemIds = order items whose cart item `status === "submitted"`; skipped when there are none.
  - audit `userOrder.changeDeliveryPreference`: before/after = preference + snapshots, metadata `{ reason }`, entityType `userOrder`.
  - After commit, `DomainEventDispatcher.wake()`.
  - Returns the updated `CartTraceabilityOrder`-compatible delivery summary.
- `deliveryOptions(orderId)` returns the current delivery, the customer's live addresses, the active points and `blockedReason` (the same guard, read-only).
- Tests, against a mocked tx: guard refusals (status, blocking packages, no-op, inactive point, foreign address); event payload (cartItemIds, before/after names); audit metadata reason.

**D5. Router + UI.**
- `admin/user-order.router.ts` (`deliveryOptions` query, `changeDeliveryPreference` mutation), registered as `userOrder`.
- `order-delivery-change-dialog.tsx`:
  - mode select;
  - home: a radio list of the customer's saved addresses plus "Otra dirección" fields (S8);
  - pickup: a select of active points;
  - a "Motivo" textarea with the warning "El cliente va a leer este motivo tal cual en el seguimiento de su pedido.";
  - submit disabled while `blockedReason` is set, with the reason shown.
- `order-payment-panel.tsx` `OrderCard` shows the "Entrega" block (`describeOrderDelivery`, or "Sin elección (pedido anterior)") and a "Cambiar entrega" button for `processing` orders. `CartTraceabilityClient` invalidates `getCartTraceability` on success.
- `operations-cart-detail-form.tsx` replaces the shipping JSON with the same readable block.

### Phase S-E: Copy and reference docs

**E1 (main work branch). Reference docs.**
- `docs/fulfillment-reference.md` §6: customer preference, match rule, pickup-point entity, override, retry keeps destination.
- `docs/tracking-architecture.md`: the event contract, producer (admin user order), mapping row, notice reason allow-list, and the per-item eventKey note.
- `docs/schema-reference.md`: `PickupPoint`, the `UserOrder`/`Shipment` fields, the CHECKs and the new tracking type.

**E2 (branch `f1-home-copy`, created from the finished work branch).**
- `home-content.ts`:
  - insert after "¿Cuánto tarda en llegar mi compra?" the FAQ "¿Cómo retiro mi pedido o lo recibo en casa?" with the §11 answer;
  - step 5 becomes "Al llegar, lo retirás en el punto de retiro que elegiste o te lo llevamos a tu dirección.".
- `home-content.test.ts`: assert the new FAQ follows the delivery-time one and that step 5 mentions "punto de retiro que elegiste".
- `e2e/smoke.spec.ts`: FAQ button count 5 → 6.

## 8. Cross-cutting concerns

- **Security:**
  - All admin procedures use `adminProcedure`.
  - Checkout validates the point server-side (active, not deleted).
  - The override reason is customer-facing: the dialog says so, and only `deliveryPreferenceChanged` and `fulfillmentException` reasons are shown verbatim.
- **Audit:** every pickup-point mutation and the override write `writeAdminAuditLog`, and `shipment.createEndUser` metadata gains `pickupPointId`.
- **Events:** the override publishes in the transaction and wakes after commit (tracking-architecture boundary checklist). The command eventKeys are deterministic.
- **Observability:** the new package and order diagnostics; no new logs.

## 9. Pitfalls

- **JSON null versus SQL NULL:** clearing a `Json?` column with `null` in Prisma writes JSON `null` and breaks the CHECK. Use `Prisma.DbNull`.
- **Tracking `eventKey` uniqueness:** the default `tracking:${key}:${type}` collides across cart items, so append the cart item id.
- `ALTER TYPE ... ADD VALUE` cannot be used in the same transaction that inserts the value. No migration inserts it, so this is safe.
- `glossary.data.test.ts` requires exactly one status occurrence per enum value. Keep `DeliveryMode.*` mapped to `shipment.deliveryMode` and do not add a second occurrence for `user_order.deliveryPreference`.
- The `confirmAndPay` "existing attempt" branch returns early. The delivery refresh must happen before that return.
- `checkout-steps` id rename: grep every `"shipping"` step reference (summary, review, mobile bar).
- The package list `diagnosticState !== "all"` branch scans up to 1000 packages, so attach the orders with one query over all scanned cart ids, never per package.

## 10. Testing

- **Unit (vitest):**
  - `pickup-point-snapshot`, `delivery-display`, `checkout-delivery`, `checkout-steps`;
  - `order-delivery` (match rule, conflict, destination);
  - `outbound-package-groups`, `package-diagnostics` (conflict);
  - `pickup-point.service`, `user-order.service` (guard, event, audit);
  - `tracking-event-mapper` (one command per item, unique keys);
  - `tracking-display` (notice kind, reason, detail), `customer-order-journey` (detail passthrough);
  - `glossary.data`, `home-content` (on `f1-home-copy`).
- **Existing suites to keep green:** `checkout.transaction-queries`, `fulfillment-effects`, `shipment-diagnostics`, `package-diagnostics`, `cart-traceability.service`, `tracking-display`.
- **e2e:** update `smoke.spec.ts` (FAQ count) on `f1-home-copy`. Not run.
- **Commands:** `pnpm typecheck`, `pnpm check`, focused `pnpm vitest run <paths>`, then `pnpm test`.

## 11. Rollout and rollback

Architecture §15:
1. Merge the main work branch (S-A..S-E docs) and deploy.
2. Apply `20261009000000_customer_delivery_preference` (`pnpm db:migrate` by the user; never from this run).
3. Create the real pickup points in `/admin/pickup-points`.
4. Merge `f1-home-copy`.

The checkout pickup option is invisible until step 3.

Rollback:
- Code: revert the branch. The migration is additive, and the old code ignores the new nullable columns, but **only while no pickup order exists**: the old `getAddressFromSnapshot` throws on an address-less order.
- After real pickup orders exist, roll forward instead of rolling back.

## 12. Documentation

- The S-E reference docs.
- This plan's execution record.
- CONTEXT.md already defines the terms (no change unless implementation reveals a gap).

## 13. Risks

| Risk | Mitigation |
|---|---|
| Multi-hop package → order resolution | One `findMany` per request (`findLiveOrderDeliveriesByCartIds`), tested pure logic |
| Checkout shipped before admin side | Pickup option renders only with an active point; points are created after deploy |
| Old code reading a pickup order after rollback | Roll forward once pickup orders exist (§11) |
| Override reason leaks internals | Dialog warning; same contract as exceptions |

## 14. Open questions

None blocking. A2–A5 are technical readings of the architecture, recorded so a reviewer can challenge them.

## 15. Definition of done

- S1–S12 traced in the execution record.
- Migration hand-written with CHECKs.
- Checks green (`typecheck`, `check`, `test`).
- `q-review-code` and `q-review-comments` run, with blockers fixed.
- Commits per slice on the work branch; `f1-home-copy` branch carries only the home copy commit(s).
- Execution record + `stage_result` sidecar written.

## 16. Executor instructions

- Never run a DB-writing command.
- Use Spanish UI copy from architecture §11 and the CONTEXT.md labels; English identifiers; Biome tabs.
- Comments only for intent, invariants or hazards.
- Commit at the end of each slice, with conventional commits ending in the Co-Authored-By trailer.
