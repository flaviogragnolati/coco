# A combo is a shortcut that adds products, not a priced bundle

**Status:** accepted — 2026-11-13

CoCo needs combos (#101): a named set of catalog products, each in a stated quantity, that a customer adds to the order in one action. A combo is three tables of configuration (`Combo`, `ComboItem` and its place in `HomeFeaturedItem`) and nothing else. It has no price, no discount, no stock and no line of its own in the cart or the order. "Sumar combo" adds each product as an ordinary order line at its current client terms, summed with what the order already holds, through the same additive path as "Repetir pedido" (`addItems` in `cart.service.ts`). From then on the customer edits those lines like any other. The combo total on the home card is a display sum of `calculateLineTotal` over the products available today. It is never stored, never charged and never checked against what ends up in the order.

Source: `docs/plans/qa-2026-11-wpd-combos-featured.md`. Ticket #101: "El combo no tiene precio ni stock propios: es un atajo para sumar varios productos."

## Considered options

- **A priced bundle: its own price or discount, one cart line that expands at checkout.** It is the shape combos usually take in retail, and the first change anyone will ask for ("combo con 10 % off"). Rejected because it brings back every question ADR 0008 avoided by not having a `Promotion` entity:
  - which discount wins when a product inside the combo already has an offer discount;
  - what the checkout snapshot freezes;
  - what happens to the bundle price when the customer removes one product.

  It would also add a second price source next to client terms, so the catalog, the cart and the charged amount could disagree. And it would break the customer's ability to change or remove any product, which the ticket requires.
- **A cart line grouped under the combo (lines tagged with `comboId`).** It would let the order show "Combo desayuno" as a heading. Rejected because the tag goes stale the moment the customer edits a line, it touches the checkout snapshot, operations and the tracking of each line for a label, and the ticket asks for independent lines.
- **Combos as configuration in code** (the first stage the triage proposed). Rejected by Flavio on 13/11: he loads the content himself from the admin.

## Consequences

- A product's price reaches a combo only through its client terms, so ADR 0008 holds unchanged: an offer discount on a product inside a combo shows up on the card and in the order automatically. A discount for buying the combo as such would mean superseding this ADR, not adding a column.
- The total on the card is "today's" total. Prices can change between the card and the order, and some products may be unavailable. The card shows only the available products with their sum and names the missing ones ("Esta semana no está: …"). The add skips them and says so, and nothing reconciles the card total with the order.
- Lines added by a combo add to the quantities the order already holds and are normalised to each product's minimum, step and maximum. Adding the same combo twice doubles it. The customer sees all of it in "Tu pedido" and can change it there.
- Nothing downstream of the cart (checkout, Mercado Pago preference, operations, packaging, tracking) knows that combos exist. They carry no snapshot, no audit trail per order and no sales report per combo. If "how much did combos sell" ever matters, it needs a new decision, because the data to answer it is not recorded.
- Combos reference products with `onDelete: Restrict`. A product inside a combo cannot be hard-deleted. The catalog reset script rebuilds combo items by product name, and the demo purge removes the combo items of the demo products it deletes.
