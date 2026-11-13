# The transfer discount is an attribute of the payment attempt, not of client terms

**Status:** accepted — 2026-11-13

CoCo gives a percentage off to customers who pay by bank transfer (#110). The percentage is one setting, "Descuento por transferencia (%)", in the settings JSON of the `external` row of `payment_provider_config`, edited only by a superadmin. It is applied at the moment an external payment attempt is created. The base is the products subtotal: the sum of the line totals, which already carry any offer discount. The total is rounded down to the whole peso, and the discount is the subtotal minus that total. The attempt stores the percent, the subtotal and the discount in three nullable columns next to `amount`, which stays the amount actually charged. Order lines, their price records, the cart and `calculateLineTotal` never see it. A Mercado Pago attempt never carries it.

Source: `docs/plans/qa-2026-11-wpf-transfer-discount.md`. Ticket #110: "Paso de pago: la opción transferencia muestra el total final con el descuento aplicado, no un cálculo para hacer después."

This is a deliberate exception to ADR 0008. That ADR made the offer discount the only discount, with `calculateLineTotal` as its single entry point, and rejected a second mechanism because it forces three answers: whether discounts stack, which one wins, and what the checkout record freezes. This ADR gives those answers for this one discount:
- **It stacks.** The transfer discount comes off the price that already has the offer discount. Neither replaces the other.
- **Nothing wins.** There is no precedence: the two act at different levels, the offer discount on the unit price and the transfer discount on the attempt total.
- **The attempt freezes it.** The percent in force when the customer confirms is copied onto the attempt, and a later change to the setting affects only new attempts.

## Considered options

- **A discount column on client terms, or a second factor inside `calculateLineTotal`.** It would keep ADR 0008's "one function decides the money". Rejected because the discount depends on how the customer pays, and the payment method is unknown while lines are priced. Every caller of `calculateLineTotal` would have to receive a payment method it does not have. The Mercado Pago preference would then be built from discounted line totals for a payment that must not be discounted, which breaks the preference invariant (`mercadopago-preference.decision.ts`).
- **Columns on the order** (`UserOrder.paymentDiscountPercent/Amount`, the first proposal). Rejected because the order outlives its attempts. A live order is reused when a Mercado Pago attempt fails and the customer pays by transfer, or the other way round (`confirmAndPay`). Order-level columns would have to be overwritten on every switch and would lose which attempt charged what.
- **A generic `Promotion` or payment-discount entity.** Rejected for the same reason as in ADR 0008: nothing needs campaigns, validity windows or precedence. One percentage behind one payment method fits a setting.
- **Rounding the discount instead of the total, or to the nearest peso.** Rejected by Flavio on 13/11. Rounding the total down means the customer never gets less than the advertised percentage, and the cost is at most $ 1.

## Consequences

- `UserTransaction.amount` stays the single source of "what this attempt charges". The Mercado Pago preference, the Mercado Pago reconciliation, the admin's "Monto" column and the payment sums in operations need no change. For an external attempt, `amount` is the discounted total, the money that must land in the bank.
- Order lines no longer always add up to the amount paid. Every screen that shows both the lines and the amount has to show the breakdown (subtotal, discount and total) from the attempt's columns: the "Mis pedidos" detail, the payment result and the admin attempt detail. A screen that shows only the amount (the "Mis pedidos" list, the operations cart) stays correct as it is.
- The offer price is no longer what the customer pays in every case: an external attempt may charge less. "Offer price" in `CONTEXT.md` now says so.
- The percentage is public: the product dialog, the order and the checkout show it before payment. A public read returns only the percent, and only while the external provider is enabled. The rest of the transfer settings stay admin-only until an attempt exists.
- Because the amount now depends on the payment method, `confirmAndPay` reuses an open attempt only when it has the same provider. An attempt with a different provider is cancelled and replaced when the customer may still abandon it (`isCancellablePaymentAttempt`, the rule "Volver a editar el pedido" uses). A Mercado Pago attempt in process, or a transfer with a declared receipt, is kept.
- Confirmation carries the amount the screen showed for the chosen method. A new attempt is refused when the server's amount differs, so the customer never pays a figure they did not see. A reused attempt keeps its own frozen amount.
- An old Mercado Pago attempt can still be approved after the customer switched to transfer: its preference stays payable at Mercado Pago until it expires. The completed-payment transition therefore cancels the order's other pending attempts that have no declared receipt, so no transfer data is offered for an order that is already paid.
- Refunds of a shortfall on a transfer-paid order must apply the same percentage. The checkout terms (`checkout-v4`) say so. No refund computation exists in code today, so this is a rule for the day one is built.
- Making it a per-product or per-category discount, or adding a second payment-method discount, means superseding this ADR, not adding a column.
