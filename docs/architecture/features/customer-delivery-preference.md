# Feature Architecture: Customer Delivery Preference and Pickup Points

> **Status:** Working — design grill 2026-10-08 (F1 and ticket #78 from `docs/plans/qa-open-tickets-2026-10-report.md`). Product decisions confirmed by Flavio in the same session; technical decisions in §8 taken by the grill and open to review. Durable decision: [ADR 0011](../../adr/0011-delivery-preference-lives-on-the-order.md).

## 1. Purpose

Let the customer choose at checkout how a paid order reaches them — **home delivery** or **a pickup point** they select — and make that choice drive fulfillment: the admin's end-user shipment groups and pre-fills from it, and any admin change to it is an audited, customer-visible act. Publish the matching home copy (FAQ #78 and the final step 5 of "Cómo funciona") with it.

## 2. Sources

- Report row F1 and #78, `docs/plans/qa-open-tickets-2026-10-report.md` (settled: two options, depot pickup stays internal, Pickup point entity with admin CRUD, preference stored on the order, override audited and visible in the journey, same price).
- `CONTEXT.md`: Delivery mode, Pickup point, Delivery preference, Delivery confirmation, Package, Shipment, Journey notice, Checkout.
- ADR 0002 (status derived from lineage), ADR 0004 (physical packages with legs; multi-customer packages allowed for pickup points; depot pickup = outbound package received with no shipment), ADR 0007 (glossary code-owned).
- `docs/architecture/features/fulfillment-lifecycle-actions.md` §8 delivery scenarios; `docs/fulfillment-reference.md` §6; `docs/tracking-architecture.md` (event producers, customer notice reasons).
- Code (HEAD 784a763): `prisma/schema.prisma` (`DeliveryMode` 1082, `Shipment` 1055, `UserOrder` 562, `Address` 149, `Destination` 287); checkout (`checkout-steps.ts`, `checkout-client.tsx`, `checkout-address-step.tsx`, `checkout.service.ts` `confirmAndPay`, `checkout.data.ts:341`); admin shipment (`shipment-create-end-user-dialog.tsx`, `outbound-package-picker.tsx`, `shipment.service.ts` `loadAssignablePackages`/`createEndUser`/`addPackages`/`retry`); depot handover (`package.service.ts` `confirmDelivery`); tracking (`tracking-display.ts` `customerNoticeReason`, `tracking-event.service.ts` `toUserOrderItemTimeline`, `tracking-event-mapper.ts`, `tracking-domain-event.listener.ts`); admin audit (`admin/_base/admin-audit.ts`); Destination CRUD as the closest analog.

## 3. Current context

- `DeliveryMode` already has `homeDelivery | pickupPoint`, but only the **shipment** records it, chosen by the admin in the end-user shipment dialog (default `homeDelivery`). There is **no Pickup point record**: a pickup point is whatever free-form `destinationAddressSnapshot` the shipment carries, and the dialog never sends one.
- The customer only picks an address; `UserOrder` stores `shippingAddressSnapshot` and copies it into `billingAddressSnapshot`. Nothing tells fulfillment what the customer wanted.
- The package picker shows `#id name · lines · qty` with no customer, order or preference; `loadAssignablePackages` only enforces "home delivery = one cart".
- `shipment.retry` copies `type` and `deliveryMode` but drops the destination snapshots (latent defect).
- `confirmAndPay`'s live-order reuse path keeps the first snapshot even if the customer changed the selection before paying (latent defect for the address, and would be for the preference).
- The customer journey has an `arrivedAtPickupPoint` "Disponible para retirar" notice; My orders shows only "Envío: <address line>".

## 4. Scope

In scope:
1. `PickupPoint` entity and its admin CRUD (catalog-style, like Destination).
2. Checkout "Entrega" step: mode choice, then an address (home) or a pickup point (pickup). Pickup option only when at least one active pickup point exists.
3. `UserOrder` delivery preference (mode, pickup point, snapshots) written by `confirmAndPay`, including the reuse path.
4. Admin "Cambiar entrega" order command (override): reason required, audited, customer-visible journey notice.
5. End-user shipment: picker grouped by preference, mode/pickup point pre-filled, server-side match validation, destination snapshot derived server-side, `pickupPointId` on the shipment, `retry` keeps destination.
6. Depot handover dialog shows the customer's preference (no override needed).
7. Customer display: My orders "Entrega" row with mode and address or pickup point (name, address, hours, instructions); override notice in the journey.
8. Home copy: FAQ #78 and final step 5; glossary, CONTEXT.md and reference docs.

Non-goals: customer self-service change after payment (decided: contact → admin override); delivery pricing or zones (same price); pickup-point capacity, opening calendars or structured hours; carrier integration; billing address capture; changing how depot pickup works.

## 5. Scenarios

| # | Scenario | Expected behaviour |
|---|---|---|
| S1 | Customer picks "A domicilio" + address | Order: `deliveryPreference=homeDelivery`, address snapshots as today. |
| S2 | Customer picks "Punto de retiro" + a point | Order: `deliveryPreference=pickupPoint`, `pickupPointId`, `pickupPointSnapshot`; **no address asked**, address snapshots null. |
| S3 | No active pickup points | Checkout shows only home delivery (the toggle is hidden); behaves exactly as today. |
| S4 | Customer goes back and changes the choice before paying | The reused live order gets the new delivery snapshots (no completed transaction yet). |
| S5 | Admin creates a pickup-point end-user shipment | Picker shows a "Punto de retiro · Centro" group with every ready package whose order chose Centro; selecting it fills mode + point; server snapshots the point as destination. |
| S6 | Admin tries to put a home-preference package on a pickup shipment | Server rejects: "El pedido ORD-… eligió A domicilio; cambiá su entrega primero." |
| S7 | Admin changes an order's delivery ("Cambiar entrega") | Requires reason (shown to customer); allowed only while none of the order's packages sit on an end-user shipment; audited; one journey notice per affected cart item. |
| S8 | Admin overrides pickup → home on an order with no address | Admin picks one of the customer's saved addresses or types one (stored only as the order snapshot). |
| S9 | Admin deactivates a point with pending orders | Allowed; confirmation shows the count; orders keep their snapshot until overridden; checkout stops offering it immediately. Hard delete is refused while referenced. |
| S10 | Depot handover of a package whose order chose home/pickup | Allowed as today; the dialog shows "El cliente eligió: …". No override, no notice beyond the delivery itself. |
| S11 | Legacy order (paid before F1, preference null) | Picker shows it under "Sin elección"; no match validation; My orders keeps today's address row. |
| S12 | Pickup point arrives | Unchanged "Disponible para retirar" notice; My orders shows where and when to collect. |

## 6. Proposed architecture

### 6.1 Modules

- **Pickup point catalog** (new; admin catalog area, Destination pattern): CRUD, `listActiveForCheckout()`, `snapshotOf(point)`. The snapshot builder is the single place a pickup point becomes order/shipment data.
- **Checkout delivery** (inside the checkout service): one input, a discriminated union `delivery: { mode: "homeDelivery", shippingAddressId } | { mode: "pickupPoint", pickupPointId }`, resolved to `{ deliveryPreference, pickupPointId, pickupPointSnapshot, shippingAddressSnapshot }` by one function used by both the create and the reuse paths.
- **Order delivery command** (new admin command `userOrder.changeDeliveryPreference`, following the tx → guard → mutate → effects → audit → wake pattern): the only writer of the preference after checkout.
- **End-user shipment assignment** (extends `loadAssignablePackages`): resolves each package's order and preference (package → allocations → cart item → cart → live order), and is the single place the match rule lives, so `createEndUser` and `addPackages` share it. `createEndUser` derives `pickupPointId` and `destinationAddressSnapshot`/`destinationContactSnapshot` from the orders; the client stops sending them.
- **Tracking**: one new domain event and tracking type; the customer notice reason allow-list gains it.

### 6.2 Match rule (end-user shipment)

For every package on an end-user shipment whose order has a non-null preference:
- `homeDelivery` shipment ⇒ the order's preference is `homeDelivery` (plus the existing one-cart rule);
- `pickupPoint` shipment ⇒ the order's preference is `pickupPoint` **with the same `pickupPointId`** as the shipment.
Packages whose order preference is null (legacy) are exempt. A multi-customer outbound package whose orders disagree cannot be assigned (it raises a diagnostic; today's multi-customer warning already covers the shape).

### 6.3 Override guard

`changeDeliveryPreference(orderId, delivery, reason)` is refused when any outbound package carrying the order's demand is on an end-user shipment (any status) or already delivered; the admin first removes it from the shipment. Reason: 1–500 chars, required, rendered verbatim to the customer (the dialog says so, like fulfillment exceptions). A no-op change (same mode and point/address) is refused.

## 7. Data and contracts

### 7.1 Schema (one additive migration)

- `PickupPoint` (`pickup_point`): `id`, `name`, `line1`, `line2?`, `city`, `state`, `postalCode?`, `country` (default `AR`), `googleMapsUrl?`, `hours` (Text, free text, e.g. "Lun a vie 10 a 18 h"), `instructions?` (Text), `active` (default true), `deleted` (default false), timestamps. Separate from `Destination` (CONTEXT.md: a pickup point is not a destination or a depot).
- `UserOrder`: `deliveryPreference DeliveryMode?` (null = legacy), `pickupPointId Int?` → `PickupPoint` (`onDelete: Restrict`), `pickupPointSnapshot Json?` (`{ source: "checkout" | "admin", capturedAt, pickupPoint: { id, name, line1, line2, city, state, postalCode, country, googleMapsUrl, hours, instructions } }`). CHECK: `deliveryPreference = 'pickupPoint'` ⇔ `pickupPointId IS NOT NULL AND pickupPointSnapshot IS NOT NULL`; `deliveryPreference = 'homeDelivery'` ⇒ `shippingAddressSnapshot IS NOT NULL`.
- `Shipment`: `pickupPointId Int?` → `PickupPoint` (`onDelete: Restrict`); only set on `endUserDelivery` + `pickupPoint`.
- `CartItemTrackingEventType`: add `deliveryPreferenceChanged`.
- Pickup orders store no address: `shippingAddressSnapshot` and `billingAddressSnapshot` stay null (billing is unused today).

### 7.2 Contracts

- `checkoutConfirmInputSchema`: replace `shippingAddressId` with `delivery` (union above). `checkoutStateSchema` gains `pickupPoints` (active only). `orderDetailSchema` gains `deliveryPreference` and `pickupPointSnapshot`.
- Admin: `pickupPoint.{list,create,update,setActive,softDelete,hardDelete}`; `userOrder.changeDeliveryPreference({ orderId, delivery: { mode: "homeDelivery", address: { addressId } | { snapshot } } | { mode: "pickupPoint", pickupPointId }, reason })`; package list item gains `order: { orderId, orderCode, customerName, deliveryPreference, pickupPointId, pickupPointName } | null`; `shipmentCreateEndUserInputSchema` adds `pickupPointId?` and drops the client-sent destination snapshots.
- Domain event `userOrder.deliveryPreferenceChanged` `{ orderId, cartItemIds, before: { mode, pickupPointName? }, after: { mode, pickupPointName? }, reason }` → one `deliveryPreferenceChanged` tracking event per cart item, notice kind `info`, label "Cambiamos tu entrega", reason shown verbatim (allow-list entry next to `fulfillmentException`).
- Audit actions: `pickupPoint.create|update|setActive|softDelete|hardDelete`, `userOrder.changeDeliveryPreference` (before/after = preference + snapshots, metadata = reason). Existing `shipment.createEndUser` audit gains `pickupPointId`.

## 8. Decisions

| # | Decision | By | Why |
|---|---|---|---|
| D1 | Options are home delivery or a pickup point; depot pickup stays admin-only | Report (user) | Settled. |
| D2 | Pickup point is a new entity, not `Destination` and not `Address` | Report + grill | CONTEXT.md forbids "destination"/"depot"; `Address` is user-owned. |
| D3 | Choosing a pickup point asks for no address | User | Less friction; billing address is unused. |
| D4 | Override reason is admin text shown verbatim | User | Same contract as fulfillment exceptions. |
| D5 | No customer change after payment; changes go through contact + override | User | MVP; avoids races with shipment assembly. |
| D6 | Override lives on the order ("Cambiar entrega"); shipments must match the current preference | User | One writer; later partial/rolled-over shipments follow the change. |
| D7 | Deactivating a point is allowed with a warning; orders keep their snapshot | User | Operations keep moving; hard delete refused while referenced. |
| D8 | Depot handover needs no override; dialog shows the customer's choice | User | It is the customer collecting in person. |
| D9 | FAQ #78 and step 5 use copy A (§11) | User | — |
| D10 | Preference = columns on `UserOrder` + snapshot JSON, not a separate table | Grill | 1:1 with the order; snapshot follows the existing address-snapshot pattern. |
| D11 | Destination snapshot is derived server-side at shipment creation | Grill | Removes a client-trusted field; fills the today-empty destination. |
| D12 | `retry` copies `pickupPointId` and destination snapshots | Grill | Fixes the latent drop. |
| D13 | Reuse path refreshes delivery snapshots while no transaction completed | Grill | Fixes S4 for both address and preference. |
| D14 | Hours are free text | Grill | No calendar requirement; structured hours deferred. |
| D15 | Checkout terms text unchanged (`checkout-v2` already says "o en el punto de retiro indicado") | Grill | No version bump needed. |

## 9. Security and permissions

Pickup point CRUD and the override are admin procedures (`adminProcedure`, same as Destination). Checkout reads only active, non-deleted points and validates the chosen id server-side (inactive/deleted → BAD_REQUEST "El punto de retiro ya no está disponible"). The override reason is customer-facing text: the dialog warns about it; it never carries admin-only data. Snapshots contain no customer PII beyond what the order already has.

## 10. Operations

- Migration is additive; old orders keep `deliveryPreference = null`.
- Diagnostics: add `order.deliveryPreference.pointInactive` (pending order whose point is inactive/deleted) and keep the multi-customer package warning, extended to "orders disagree on delivery".
- Admin order detail stops showing raw JSON for the delivery: a readable "Entrega" block.

## 11. Copy

- FAQ, inserted after "¿Cuánto tarda en llegar mi compra?": **"¿Cómo retiro mi pedido o lo recibo en casa?"** — "Lo elegís al confirmar tu pedido: te lo llevamos a la dirección que cargues o lo retirás en uno de nuestros puntos de retiro, en el horario que indicamos. Las dos opciones cuestan lo mismo."
- "Cómo funciona" step 5: "Al llegar, lo retirás en el punto de retiro que elegiste o te lo llevamos a tu dirección."
- Checkout step label "Envío" → "Entrega"; title "¿Cómo lo recibís?"; options "A domicilio" / "Punto de retiro"; list title "Elegí un punto de retiro".
- My orders summary row "Entrega": "A domicilio — <address>" or "Punto de retiro — <name>, <address> · <hours>" + instructions; footnote "¿Querés cambiarla? Escribinos."
- Journey notice: "Cambiamos tu entrega" + "<before> → <after>" + admin reason.

## 12. Alternatives rejected

- **Override per shipment** (shipment may differ from the preference, reason captured at assembly): rejected by the user; every later shipment of the same order would re-prompt, and the order would never reflect the real plan.
- **Reuse `Destination` as pickup point**: conflates the internal warehouse with a customer-facing place; CONTEXT.md `_Avoid_`.
- **Store the preference only as JSON in `shippingAddressSnapshot`**: no FK for the match rule or the deactivation count.
- **Ask an address for pickup orders as a fallback**: rejected by the user (friction).
- **Customer self-service change until dispatch**: rejected for the MVP.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Package → order resolution in the picker is a multi-hop query over 50 packages | One batched query in the package list data layer; covered by tests. |
| A pickup order cannot be home-delivered without an address | Override lets the admin pick a saved address or type one. |
| Shipping the checkout before the admin side would create preferences fulfillment ignores | Pickup option appears only when an active point exists; points are created after all slices are deployed (§15). |
| Legacy orders bypass the match rule | Explicit "Sin elección" group; they drain naturally. |
| Override reason may leak internal detail | Dialog warning + same contract as exceptions. |

## 14. Assumptions and open questions

Assumptions: one live order per cart (existing partial unique index); every outbound package's demand belongs to orders reachable through allocations; Ushuaia only (no zones). Open: none blocking. Deferred: structured hours, customer self-service change, per-point capacity.

## 15. Rollout (high-level stages)

1. **S-A Pickup point catalog** — model + migration (all §7.1 schema changes at once), admin CRUD, glossary entries. No customer impact.
2. **S-B Checkout + order preference** — "Entrega" step, `delivery` input, snapshots, reuse-path refresh, My orders "Entrega" row. Invisible pickup option until a point exists.
3. **S-C Shipment assembly** — picker grouping, pre-fill, server match rule, derived destination, `Shipment.pickupPointId`, retry fix, depot dialog hint, diagnostics.
4. **S-D Override** — `userOrder.changeDeliveryPreference`, domain event, tracking type, notice, admin dialog.
5. **Go-live** — deploy S-A..S-D, apply the migration, create the real pickup points, then ship **S-E copy** (FAQ #78, step 5, e2e counts 5→6, glossary/CONTEXT/reference docs).

Next: `q-code-implementation-plan` over this document (all slices; S-A and S-B can run in parallel after the migration lands).
