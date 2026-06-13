# Mercado Pago Checkout and Admin Payments Plan

## Context

This plan defines the first production-oriented Mercado Pago integration for
checkout, payment traceability, webhook reconciliation, and admin configuration.

Primary references:

- `CONTEXT.md`
- `docs/schema-reference.md`
- `docs/adr/0001-mercadopago-checkout-pro-reconciliation.md`
- `prisma/schema.prisma`
- `src/server/services/checkout/*`
- `src/app/checkout/_components/checkout-client.tsx`
- Mercado Pago SDK Node.js official README:
  `https://github.com/mercadopago/sdk-nodejs/blob/master/README.md`

Current checkout creates `UserOrder`, `UserOrderItem`, and `UserTransaction`
then calls a synchronous mock gateway. The new flow must keep card handling out
of the app, create a Mercado Pago Checkout Pro preference, redirect the user,
and reconcile final payment state through signed webhooks followed by a Mercado
Pago resource lookup.

## Confirmed Decisions

- Use **Payment attempt** as the domain term for a customer payment attempt.
  Do not use `Operation` for payments; `Operation` remains fulfillment demand
  aggregation.
- Use Mercado Pago Checkout Pro through the SDK `Preference` client.
- Do not implement direct card payments, Checkout API Orders, or Mercado Pago
  Bricks in V1.
- Use `UserTransaction` as the payment attempt record and extend it with
  provider references.
- Use generic provider tables:
  - `PaymentProviderConfig`
  - `PaymentProviderEvent`
- Use `PaymentProviderConfig.settings` for non-sensitive provider settings.
- Keep secrets in environment variables:
  - `MERCADOPAGO_ACCESS_TOKEN`
  - `MERCADOPAGO_WEBHOOK_SECRET`
  - `MERCADOPAGO_TIMEOUT_MS` optional
  - `MERCADOPAGO_PUBLIC_KEY` only if future frontend MercadoPago.js needs it
- Mercado Pago appears as a checkout option without requiring the user to create
  a saved payment method manually.
- Create or reuse an internal per-user `PaymentMethod` with type
  `mercadopago` and provider `mercadopago` for historical relation integrity.
- A `UserOrder` may have multiple payment attempts.
- Only one completed payment attempt should advance fulfillment.
- Preference expiration defaults to 60 minutes and is configurable from admin.
- Expired attempts detected without approved payment become `cancelled`.
- Manual reconciliation may inspect any attempt, but must not downgrade
  completed/refunded/charged-back history without stronger provider evidence.
- Webhooks are processed synchronously in V1 after being persisted.
- Invalid webhook signatures are persisted as rejected events but do not
  reconcile payment state.
- Unsigned webhooks are allowed only when:
  - `env.APP_ENV !== "production"`
  - config explicitly enables `allowUnsignedWebhooksInDevelopment`
- Use `APP_ENV` from `src/env.js`, not `NODE_ENV`, for application environment
  decisions.
- The admin can change sandbox/production mode in all environments, but only
  after explicit confirmation.
- Only `superadmin` can mutate Mercado Pago configuration.
- `admin` can inspect payment attempts, events, and configuration.
- Use provider-owned `notification_url` from our stored configuration when
  creating preferences.
- Back URLs are:
  - `/checkout/mercadopago/success`
  - `/checkout/mercadopago/failure`
  - `/checkout/mercadopago/pending`
- Back URL pages must not trust query params as payment truth.
- Admin payments live in a new top-level section: `/admin/payments`.
- V1 admin actions include:
  - reconcile attempt now
  - reprocess webhook/event
  - ignore event with required reason
- V1 does not include refunds.

## Schema Contract

The schema proposal has been applied to `prisma/schema.prisma`. Do not run
migrations automatically; migrations will be handled manually.

Expected model changes:

- Extend `UserOrderStatus` with `chargedBack`.
- Extend `UserTransactionStatus` with:
  - `inProcess`
  - `cancelled`
  - `chargedBack`
- Extend `UserTransaction` with provider mode, provider ids, status detail,
  checkout URLs, expiration and cancellation timestamps.
- Add `PaymentProviderConfig`.
- Add `PaymentProviderMode`.
- Add `PaymentProviderEvent`.
- Add `PaymentProviderEventStatus`.

Manual migration notes:

- Existing transactions can keep `providerMode = null`.
- Existing transaction statuses remain valid.
- Existing provider `mock` rows should remain supported.
- New provider id fields are nullable to preserve existing history.
- `PaymentProviderEvent.providerEventId` is nullable in schema but unique with
  provider when present; webhook ingestion must handle events with no provider
  event id by using fallback dedupe logic.

## Environment

Update `src/env.js` server env with optional Mercado Pago variables:

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_TIMEOUT_MS`

Do not require Mercado Pago secrets at app boot when the provider is disabled.
Provider services should fail with typed server errors only when a Mercado Pago
operation is attempted and the required secret is missing.

Use `env.APP_ENV` for production/development/test behavior.

## Provider Configuration

Create Zod schemas for `PaymentProviderConfig.settings` when
`provider = "mercadopago"`.

Suggested settings:

```ts
type MercadoPagoSettings = {
  publicBaseUrl: string;
  notificationUrl: string;
  successBackUrl: string;
  failureBackUrl: string;
  pendingBackUrl: string;
  preferenceExpiresInMinutes: number;
  autoReturnApproved: boolean;
  binaryMode: boolean;
  excludedPaymentTypes: string[];
  excludedPaymentMethods: string[];
  statementDescriptor: string | null;
  allowUnsignedWebhooksInDevelopment: boolean;
};
```

Validation rules:

- `preferenceExpiresInMinutes` defaults to `60`.
- `preferenceExpiresInMinutes` must be positive.
- In `APP_ENV = production`, all configured URLs must be HTTPS.
- In non-production, allow HTTPS and local HTTP URLs for:
  - `localhost`
  - `127.0.0.1`
- Changing mode, disabling provider, and changing URLs requires explicit UI
  confirmation.
- Settings are editable only by `superadmin`.
- Never display secret env values. Show only boolean availability diagnostics.

## Checkout Flow

Replace the mock-capture path with a redirect-first Mercado Pago path while
keeping the existing checkout validation and snapshot rules.

Recommended service flow:

1. User starts checkout as today. Cart moves to `atCheckout`.
2. User selects address and Mercado Pago as the payment option.
3. On confirm:
   - validate cart still has valid items
   - resolve or create internal Mercado Pago `PaymentMethod`
   - create or reuse a pending `UserOrder` for the current checkout cart
   - create a new `UserTransaction` in `pending`
   - do not submit cart items yet
   - create a Mercado Pago preference with idempotency
   - update `UserTransaction` with preference id, checkout URLs, expiration,
     provider mode, and request/response snapshots
   - return a redirect URL to the client
4. Client redirects the browser to Mercado Pago.
5. Back URL pages show a pending/success/failure acknowledgement based on our
   backend state, not directly from query params.
6. Webhook or manual reconciliation updates the transaction.
7. When the attempt becomes `completed`:
   - update `UserTransaction.completedAt`
   - submit cart items
   - move cart to `submitted`
   - move `UserOrder` to `processing`
   - publish `cart.item.submittedToOrder` domain events
   - wake `DomainEventDispatcher`

Assumption for implementation:

- Use `external_reference` that uniquely identifies the payment attempt, not
  only the order, because one order can have multiple attempts. Recommended
  shape: `user_transaction:{id}`.

Important retry behavior:

- A failed, cancelled, or expired attempt does not create another `UserOrder`.
- A new retry creates a new `UserTransaction` for the same `UserOrder` while no
  completed attempt has advanced fulfillment.
- A single failed attempt should not automatically mark `UserOrder.failed` if
  retry remains possible.

## Mercado Pago SDK Usage

Use only the modern SDK class API:

```ts
import { MercadoPagoConfig, Preference, Payment, WebhookSignatureValidator } from "mercadopago";
```

Do not use old SDK v1 patterns such as:

- `mercadopago.configure(...)`
- `mercadopago.preferences.create(...)`
- `mercadopago.payment.create(...)`

Suggested modules:

- `src/lib/mercadopago/client.ts`
- `src/server/services/payments/mercadopago/mercadopago-config.service.ts`
- `src/server/services/payments/mercadopago/mercadopago-preference.service.ts`
- `src/server/services/payments/mercadopago/mercadopago-reconciliation.service.ts`
- `src/server/services/payments/payment-attempt.service.ts`
- `src/server/services/payments/payment-provider-event.service.ts`

Use idempotency keys for all provider-mutating operations.

Preference idempotency:

- Use a stable key per attempt, for example
  `mercadopago:preference:userTransaction:{id}`.

Do not log or return access tokens.

## Webhook Flow

Add route:

- `src/app/api/mercadopago/webhook/route.ts`

V1 route flow:

1. Parse headers, query, and JSON body.
2. Validate signature using `WebhookSignatureValidator`.
3. If invalid:
   - persist `PaymentProviderEvent` with `signatureValid = false`
   - set status `rejected`
   - return `401`
4. If unsigned and allowed by non-production config:
   - persist with `signatureValid = false`
   - process only because config allows it
5. If valid:
   - persist or dedupe `PaymentProviderEvent`
   - query Mercado Pago for the definitive resource
   - update the related `UserTransaction`
   - set event `processed`
   - return `200`
6. If processing fails after persistence:
   - set event `failed`
   - store `lastError`
   - return a response that allows Mercado Pago retry according to the failure
     class

Webhook bodies are signals, not final payment truth. Always fetch the provider
resource before changing payment state.

## State Mapping

Map Mercado Pago payment status to internal `UserTransactionStatus`:

- `approved` -> `completed`
- `pending` -> `pending`
- `in_process` -> `inProcess`
- `rejected` -> `failed`
- `cancelled` -> `cancelled`
- `refunded` -> `refunded`
- `charged_back` -> `chargedBack`

Store exact Mercado Pago values:

- `providerStatus`
- `providerStatusDetail`
- `failureCode`
- `failureMessage`

Commercial order state:

- A completed payment attempt can move `UserOrder` to `processing`.
- A refunded completed payment can move `UserOrder` to `refunded`.
- A charged-back completed payment can move `UserOrder` to `chargedBack`.
- Failed/cancelled attempts do not automatically fail the order while retries
  remain possible.

## Reconciliation Rules

Manual reconciliation action:

- Available from admin payment attempt detail.
- Admin can reconcile any attempt.
- Use provider ids in priority order:
  1. `providerPaymentId`
  2. related provider event resource id
  3. `providerPreferenceId` search/fallback
- Fetch provider resource and apply state mapping.
- Preserve history and snapshots.

Precedence rules:

- `chargedBack` and `refunded` may supersede `completed`.
- `completed` may supersede `pending`, `inProcess`, `failed`, or `cancelled`
  when provider evidence proves approval.
- `failed` or `cancelled` must not supersede `completed` unless provider
  evidence is a later refund, chargeback, or valid cancellation semantics.

## Admin Payments Section

Add `/admin/payments` as a new top-level admin section from `/admin`.

Recommended pages:

- `/admin/payments`
- `/admin/payments/attempts`
- `/admin/payments/events`
- `/admin/payments/config`

Use the existing admin visual style:

- `CrudPageShell`
- `CrudStatsCards`
- compact filters
- `CrudTable`
- detail dialogs
- status badges
- `CrudLoadingState`, `CrudErrorState`, `CrudEmptyState`

Do not place payments under `/admin/operations`.

### Attempts List

Minimum columns:

- `UserOrder.code`
- user name/email
- amount/currency
- internal payment status
- provider status
- provider status detail
- provider
- preference id
- payment id
- provider mode
- created at
- updated at
- action: view traceability

Detail view should show:

- order/cart links
- payment method
- idempotency key
- checkout URL and sandbox checkout URL
- expiration and completed/cancelled timestamps
- request snapshot
- response snapshot
- related events
- actions:
  - reconcile now

### Events List

Minimum columns:

- provider
- provider mode
- resource type
- resource id
- event type/action
- provider request id
- signature valid
- processing status
- retry count
- related payment attempt
- received at
- last error
- action: view payload

Detail view should show:

- headers
- query params
- payload
- processing timestamps
- linked attempt/user
- last error
- actions:
  - reprocess
  - ignore with required reason

### Config Page

Show:

- provider enabled
- provider mode
- URL settings
- preference expiration
- auto-return and binary mode settings
- excluded payment types/methods
- statement descriptor
- unsigned webhook dev/test setting
- environment diagnostics:
  - access token configured: yes/no
  - webhook secret configured: yes/no
  - `APP_ENV`

Mutations:

- `superadmin` only
- require confirmation for:
  - mode changes
  - provider disable
  - URL changes
  - unsigned webhook setting changes

## API Shape

Add schemas:

- `src/schemas/admin/payment-provider-config.schemas.ts`
- `src/schemas/admin/payment-attempt.schemas.ts`
- `src/schemas/admin/payment-provider-event.schemas.ts`

Add shared types:

- `src/shared/common/admin-crud/payment-provider-config.types.ts`
- `src/shared/common/admin-crud/payment-attempt.types.ts`
- `src/shared/common/admin-crud/payment-provider-event.types.ts`

Add routers:

- `src/server/api/routers/admin/payment.router.ts`

Mount in:

- `src/server/api/routers/admin.router.ts`

Suggested procedures:

- `admin.payment.listAttempts`
- `admin.payment.getAttemptById`
- `admin.payment.getAttemptStats`
- `admin.payment.reconcileAttempt`
- `admin.payment.listEvents`
- `admin.payment.getEventById`
- `admin.payment.reprocessEvent`
- `admin.payment.ignoreEvent`
- `admin.payment.getProviderConfig`
- `admin.payment.updateProviderConfig`

Add a `superadminProcedure` or equivalent guard for configuration mutations.

Checkout-facing procedures should remain under `checkout` unless a separate
public payment router becomes necessary.

## UI Checkout Changes

Current checkout payment form collects mock payment method details. For Mercado
Pago V1:

- show Mercado Pago as a selectable payment option
- remove the requirement to create/edit a local payment method for Mercado Pago
- confirmation button should create a preference and redirect
- after redirect, the result pages should show current backend state and link
  to the user's order
- failed/cancelled/expired attempts should allow retry while fulfillment has
  not started

Back URL pages:

- `src/app/checkout/mercadopago/success/page.tsx`
- `src/app/checkout/mercadopago/failure/page.tsx`
- `src/app/checkout/mercadopago/pending/page.tsx`

These pages can use query params to locate the attempt, but must not trust query
params to update state.

## Security Requirements

- Never expose `MERCADOPAGO_ACCESS_TOKEN`.
- Never return raw provider errors to users if they may contain sensitive data.
- Never log tokens.
- Validate user ownership before returning payment attempt detail to a customer.
- Admin pages require admin role.
- Config mutations require superadmin role.
- Webhook signature validation is mandatory in production.
- Invalid webhooks are persisted but do not mutate payment state.
- Ignore/reprocess actions must write audit logs.
- URL validation must prevent non-HTTPS production endpoints.

## Audit and Traceability

Use `AuditLog` for:

- provider config changes
- manual reconciliation
- event reprocessing
- event ignore decisions
- payment state changes caused by admin actions

Use `PaymentProviderEvent` for provider message traceability.

Use existing domain events only when payment completion moves cart items into
the submitted fulfillment path.

## Implementation Phases

### Phase 1: Types, schemas, and config foundations

- Add env schema for Mercado Pago variables.
- Add Zod schemas for provider config, attempts, and events.
- Add shared admin payment types.
- Add server helpers for config validation and URL validation.
- Add superadmin guard.

### Phase 2: Data access and provider services

- Add data modules for payment attempts, provider config, and events.
- Add Mercado Pago client module.
- Add preference creation service.
- Add reconciliation service.
- Add status mapping helpers.
- Add internal Mercado Pago payment method resolver.

### Phase 3: Checkout redirect flow

- Replace mock gateway path for Mercado Pago selection.
- Create/reuse pending `UserOrder`.
- Create new pending `UserTransaction`.
- Create preference with `external_reference`.
- Return redirect URL to client.
- Add back URL pages.

### Phase 4: Webhooks and reconciliation

- Add `/api/mercadopago/webhook`.
- Persist events.
- Validate signatures.
- Fetch provider resources.
- Apply reconciliation state transitions.
- Submit cart and publish domain events only on completed payment.

### Phase 5: Admin payments section

- Add `/admin/payments` entry.
- Add attempts page and detail dialog.
- Add events page and detail dialog.
- Add config page.
- Wire reconcile, reprocess, and ignore actions.
- Add confirmations for dangerous settings/actions.

### Phase 6: Verification and docs

- Update schema reference where needed.
- Add focused tests for mapping, config validation, reconciliation precedence,
  and webhook signature behavior.
- Run typecheck and lint/check commands.
- Manually test:
  - disabled provider
  - missing secret
  - preference creation
  - redirect URL
  - valid webhook
  - invalid webhook
  - expired attempt
  - retry after cancelled/failed attempt
  - admin reconcile
  - admin config confirmation

## Non-Goals

- No migrations are executed by the agent.
- No refunds in V1.
- No direct card tokenization.
- No Mercado Pago Bricks.
- No Checkout API Orders in V1.
- No background worker in V1.
- No exposure of Mercado Pago secrets in UI.
- No moving payment admin into fulfillment operations.
- No changing fulfillment operation eligibility away from completed payments.

## Risks and Mitigations

- **Duplicate payment completion**: webhooks and manual reconciliation may race.
  Use transactions, idempotent event handling, and state precedence rules.
- **Multiple attempts per order**: one order can have several attempts.
  Use attempt-level `external_reference`, not order-only references.
- **Cart submitted too early**: redirect does not prove payment.
  Only submit cart items after provider-confirmed completion.
- **Production URL mistakes**: bad notification/back URLs break checkout.
  Require confirmation and HTTPS validation.
- **Unsigned webhook processing**: useful in development but dangerous in prod.
  Gate on `APP_ENV !== "production"` and explicit config.
- **Provider API failures**: webhooks can fail after persistence.
  Mark events failed and expose admin reprocess.
- **Schema/code drift**: status enums must be updated across Zod schemas,
  mappers, admin filters, and display labels.

## Verification Commands

Run after implementation:

```bash
pnpm typecheck
pnpm check
```

Add targeted tests where practical and run:

```bash
pnpm exec vitest run
```

