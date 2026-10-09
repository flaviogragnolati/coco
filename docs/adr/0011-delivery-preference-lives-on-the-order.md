# The delivery preference lives on the order, and shipments must match it

At checkout the customer chooses how a paid order reaches them: home delivery to an address, or a **pickup point** — a new admin-managed record, distinct from the internal `Destination` and from user-owned `Address`. The choice is stored on `UserOrder` (`deliveryPreference`, `pickupPointId`, `pickupPointSnapshot`), and it is the plan fulfillment executes: an end-user shipment may only carry packages whose order preference matches its delivery mode and pickup point. When the plan has to change, an admin runs one audited order command, "Cambiar entrega", with a reason the customer reads in their journey; shipments then follow the new preference. Depot pickup stays an internal handover that needs no change.

Source: `docs/architecture/features/customer-delivery-preference.md`.

## Considered options

- **Let each shipment differ from the preference, capturing the reason at assembly.** Rejected: an order split across partial or rolled-over shipments would re-prompt every time, and the order would never show the real plan.
- **Keep the preference as data inside `shippingAddressSnapshot`.** Rejected: no foreign key for the match rule, for deactivation impact, or for grouping in the shipment picker.
- **Reuse `Destination` as the pickup point.** Rejected: it is the internal warehouse; CONTEXT.md keeps the two apart.

## Consequences

- `UserOrder` has exactly one writer of the preference after checkout (`userOrder.changeDeliveryPreference`), and the shipment assignment rule (`loadAssignablePackages`) is the single place the match is enforced, for both create and add-packages.
- Orders paid before this change have a null preference and are exempt from the match rule.
- The shipment's destination snapshot is derived on the server from the order or the pickup point, never sent by the client.
- An override is refused while any of the order's packages is on an end-user shipment, so assembled shipments never contradict their orders.
- A deactivated pickup point keeps serving the orders that chose it through their snapshot until an admin changes them; it can't be hard-deleted while referenced.
