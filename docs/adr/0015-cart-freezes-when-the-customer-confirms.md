# The cart freezes when the customer confirms, not when checkout opens

Status: accepted and implemented on 2026-11-27 (server in phase 1, order page in phase 3). Plan: `docs/plans/checkout-en-tu-pedido-y-seguimiento.md`.

Checkout stops being a screen. The customer chooses the delivery preference and the payment method, and accepts the terms, on the order page ("Tu pedido"), and the cart stays editable until they confirm. `checkout.start` only prepares the options: it still mints the per-provider payment methods, and it no longer moves the cart. `checkout.confirmAndPay` moves the cart to `atCheckout` in the same serializable transaction that creates the order and its payment attempt. So `atCheckout` now means "this cart has a live order waiting for its payment".

The freeze at entry protected nothing the server relied on. A cart mutation already released an abandoned checkout (`ensureCartMutable` in `cart.service.ts`), so its only effect was a customer who had opened `/checkout` finding their order read-only. Everything that protects a payment runs at confirmation or later and does not change: the amount must equal `expectedAmount`, confirmation is serializable, and a cart is not released under a payment in flight or a declared receipt (ADR 0010).

## Considered options

- **Keep the freeze at entry and restyle the checkout page**, as one page or as a three-step wizard (prototypes A and B in `docs/prototypes/checkout-seguimiento/`). Rejected in favour of finishing on the order page: a customer with a saved address confirms with one checkbox and one button.
- **Confirm by provider instead of by payment method id**, so that nothing at all is written before confirming. Deferred: it changes the contract of `confirmAndPay` and of the attempt-reuse rules, for a write (minting two rows per user) that is idempotent and invisible.

## Consequences

- `/checkout` redirects to `/cart`. The Mercado Pago return routes stay under `/checkout/mercadopago/*`, because the back URLs configured in the provider settings point there.
- Leave checkout ("Volver a editar el pedido") keeps its meaning and only applies after confirmation: it cancels the live order and its pending attempt.
- A cart left at `atCheckout` by the old flow, with no live order, keeps working: a mutation releases it and confirming reuses the status.
- Changing the payment method or retrying a payment is done by confirming again from the order page, which reuses the live order as before.
- The tutorial scenes that mirrored the checkout screen are replaced (ADR 0012).
