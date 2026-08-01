# External payments are settled by an admin, never by a gateway

Checkout offers two payment options: Mercado Pago and **external payment** (bank transfer). An external payment has no provider to ask, so `confirmAndPay` creates a `pending` attempt with `provider: "external"`, shows the customer the transfer data, and stops there — the only thing that moves the attempt to `completed` is an admin action in `/admin/payments`, which runs the same `submitOrderForCompletedPayment` transition the Mercado Pago webhook runs.

The customer may report a **declared receipt** from the order detail page. It is deliberately *not* a settlement: it writes `declaredReceiptReference`/`declaredReceiptAt` and leaves the attempt `pending`. Trusting a self-reported reference would hand out goods on an unverified claim, which is exactly what the platform already refuses to do elsewhere (the reason `UnavailableGateway` exists).

## Considered options

- **Integrate a bank API to detect incoming transfers.** Correct end state, but no provider is contracted and the reconciliation surface is larger than the whole feature.
- **Auto-approve transfers optimistically and reverse later.** Rejected: order submission cascades into aggregation, lots and supplier orders (ADR 0003, ADR 0005); reversing it is an operation compensation, not an undo.
- **Let the declared receipt settle the attempt.** Rejected for the same reason — the claim is unverified.

## Consequences

- The mock payment gateway (`MockPaymentGateway` / `UnavailableGateway`) loses its last caller from checkout and is removed along with the user-managed payment methods that fed it. Testing a rejected payment now means Mercado Pago sandbox, or the admin reject action.
- Transfer data (holder, CBU, alias, instructions, expiry) lives in the existing generic `payment_provider_config` table under `provider: "external"`, so it is admin-editable and its `enabled` flag gates whether the option appears — the same shape ADR 0001 established for Mercado Pago.
- An external attempt carries `expiresAt` from that config, so an unpaid transfer becomes a spent attempt and re-confirming mints a new one, reusing the existing `isSpentPaymentAttempt` rule.
