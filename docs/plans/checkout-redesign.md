# Implementation Plan: Checkout Step-by-Step Redesign

## 1. Objective & outcome

- **Done means:** `/checkout` becomes a modern, ecommerce-standard **4-step** flow —
  **Pedido → Envío → Pago → Confirmar** — driven by a **numbered, clickable progress
  stepper** (connector line, checkmarks on completed steps, locked forward steps). Each
  step shows only its relevant information; a persistent **order summary** (sticky right
  rail on desktop, **sticky bottom bar** on mobile) is visible throughout. The user can
  **navigate to edit** via two mechanisms: clicking any completed step in the stepper, and
  per-section **"Editar"** links on the Confirmar screen. The **Pedido** step shows the
  cart items **read-only**, with an **"Editar carrito"** button that opens the global
  **mini-cart** slide-over (edits reflect instantly because items render off the live cart
  store). The whole surface uses the redesigned rounded `Card`/`Badge` system and semantic
  color tokens, mirroring the products/cart redesign. The post-confirmation screens (mock
  result panel + Mercado Pago return pages) get a **light** visual alignment. **No backend,
  schema, or tRPC contract changes.**
- **Why:** The current checkout ([checkout-client.tsx](../../src/app/checkout/_components/checkout-client.tsx))
  is a working 3-step flow (`address → payment → review`) but uses the *pre-redesign* flat
  `border` boxes, a bare 3-button "stepper" with no progress/completed states, no dedicated
  items review, and a summary that does not match the new cart styling. It does not meet
  the "componente paso a paso fácil e intuitivo" goal nor the visual language now used in
  `/products` and `/cart`.
- **For:** AI coding agent / developer.
- **Upstream design doc:** none (no `design-grill` document for this area). This is a
  self-contained, **frontend-only** feature redesign that reuses the existing checkout
  service, cart engine, and Mercado Pago integration as-is. It follows the conventions
  established by [products-page-redesign.md](./products-page-redesign.md).

## 2. Alignment reached

| Topic | Decision | Source |
| --- | --- | --- |
| Flow scope | **Restructure** the flow (not just restyle): move from 3 to 4 steps. | user |
| Step structure | **4 steps: Pedido → Envío → Pago → Confirmar.** New first step "Pedido" reviews items. | user |
| Stepper pattern | **Numbered horizontal stepper** with connector line + checkmarks on completed steps; completed steps clickable to edit; forward steps locked until prerequisites met. | user |
| Items in checkout | **Read-only.** No inline qty/remove inside checkout. | user |
| Edit items | **"Editar carrito" opens the global mini-cart** (`useCartUiStore.openMiniCart()`); items/summary render off the **live cart store**, so edits reflect instantly with no manual re-fetch. | user + code |
| Edit navigation (Confirmar) | **Both**: clickable completed steps in the stepper **and** per-section "Editar" links on the Confirmar screen. | user |
| Order summary | **Persistent**: sticky right rail on desktop, **sticky bottom bar** (total + CTA, "Ver resumen" opens a `Sheet`) on mobile. | user |
| Currency / invalid-item validation | **Keep as today** — `assertSingleCurrency` / invalid-item errors surface only at confirm. **No new early gates.** | user + code |
| Post-confirmation screens | **Light restyle** of the mock result panel + the 3 Mercado Pago return pages to match the new look. | user |
| Step logic | Extract a **pure** `checkout-steps.ts` (step model + completion/advance logic) with **`node:test`** unit tests, mirroring `catalog-filtering.ts`. | user |
| Color / styling | Reuse semantic accents (`success` for selected/completed, `info` for currency) + rounded `Card`/`Badge`; mirror `product-card`/`cart-line-row`/`cart-summary`. | code |
| Backend | **Unchanged.** `checkout.*` service/router, MP integration, cart engine, schemas, Prisma — all reused as-is. The cart stays the live source of truth until pay (`confirmAndPay` re-reads it). | code |

## 3. Scope

- **In scope:**
  - Rewrite [checkout-client.tsx](../../src/app/checkout/_components/checkout-client.tsx)
    into a 4-step orchestrator; extract the step bodies and summary into their own files.
  - New numbered, clickable **progress stepper** with completed/active/locked states.
  - New **Pedido** step: read-only item list (off the live cart store) + totals + "Editar
    carrito" → opens the mini-cart.
  - Restyle **Envío** and **Pago** steps into rounded "radio-card" selection lists with a
    `success` accent on the selected card; keep add/edit dialogs.
  - Restyle **Confirmar** step: per-section summaries with **"Editar"** links, terms accept,
    confirm/pay button.
  - Restyle **order summary** (currency badges, item rows, edit links, sticky) + add a
    **mobile sticky bottom bar** with total + CTA and a "Ver resumen" `Sheet`.
  - Extract pure `checkout-steps.ts` (+ `node:test`) for step state logic.
  - Light restyle of the mock **result panel** and the **Mercado Pago return** pages.
  - Read-only display variant for the shared `CartLineRow` (additive prop).
- **Out of scope / non-goals:**
  - **Any backend change**: `checkout.service.ts`, `checkout.router.ts`,
    `checkout.schemas.ts`, `checkout.types.ts`, `checkout.data.ts`, the payment gateway,
    Mercado Pago services/webhooks, and the cart routers/services stay **untouched**.
  - The `confirmAndPay` input/output shape and idempotency behavior.
  - **No new validation gates** (multi-currency / invalid-item errors stay at confirm).
  - **No inline item editing** inside checkout (qty/remove happen only in the mini-cart/cart).
  - No new address/payment fields, no contact-info capture, no shipping-method/tax lines
    (the model has none).
  - No changes to `/my-operations`, order detail, or admin payment screens.
  - No Prisma schema/migration changes.
- **Deferred (plausibly next):** show the authenticated user's email read-only on Confirmar
  ("enviaremos la confirmación a …", needs passing `userEmail` from `page.tsx`); early
  multi-currency/invalid-item gate on the Pedido step; saved-address default selection
  heuristics; address/payment dialog visual overhaul.
- **Must not change / break:**
  - The checkout service contract and the `atCheckout → submitted` cart lifecycle.
  - Mercado Pago redirect + reconciliation flow and the `/checkout/mercadopago/{success,
    failure,pending}` routes.
  - Cart store contract, `useCartSync`/`useCartActions` semantics, single-bootstrap rule.
  - Idempotency-key handling and the failed-payment retry path.

## 4. Current system context

- **Route:** [checkout/page.tsx](../../src/app/checkout/page.tsx) (server) gates auth
  (`getSession` + `assertActiveUser`, redirects to `/login?callbackURL=/checkout`) and
  renders `<CheckoutClient userId={session.user.id} />`.
- **Client (the monolith to break up):**
  [checkout-client.tsx](../../src/app/checkout/_components/checkout-client.tsx) (~970 lines)
  holds inline `CheckoutStepper` (3 plain buttons), `AddressStep`, `PaymentStep`,
  `ReviewStep`, `CheckoutSummary`, `CheckoutResultPanel`, plus all state and mutations.
  Steps today: `"address" | "payment" | "review"`. It calls
  `useCartSync({ isAuthenticated: true, userId })` and gates `checkout.start()` on
  `hasHydrated && !isSyncing`.
- **Data (reuse, do not change):** `api.checkout.start` (mutation, flips cart to
  `atCheckout`, returns `CheckoutState { cart, addresses[], paymentMethods[], termsText }`),
  `getState` (query), `createAddress`/`updateAddress`, `createPaymentMethod`/
  `updatePaymentMethod`, `confirmAndPay` (returns `CheckoutPaymentResult` with optional
  `redirectUrl` for Mercado Pago). Shapes in
  [checkout.schemas.ts](../../src/schemas/checkout.schemas.ts), types in
  [checkout.types.ts](../../src/shared/common/checkout.types.ts).
- **Key backend behavior found (informs the UI, not changed):**
  - The cart is the **live source of truth until pay**: `start()` flips status to
    `atCheckout` but does **not** snapshot; `confirmAndPay` re-reads the live cart and only
    then snapshots into the order
    ([checkout.service.ts:589-641](../../src/server/services/checkout/checkout.service.ts#L589-L641)).
    → Driving the Pedido/summary off the **live cart store** is consistent with what gets
    charged.
  - Checkout requires a **single-currency** cart (`assertSingleCurrency`,
    [checkout.service.ts:221-239](../../src/server/services/checkout/checkout.service.ts#L221-L239))
    and rejects invalid/expired items — both **only at confirm**. Per §2 we keep this; the
    UI surfaces it via the confirm error toast/alert.
  - `confirmAndPay` may return `redirectUrl` (Mercado Pago Checkout Pro) → the client does
    `window.location.assign(redirectUrl)`; otherwise it returns a mock
    `CheckoutPaymentResult` rendered inline.
- **Live cart access:** `useCartStore(selectCartSnapshot)` and `hasHydrated` from
  [cart-store.ts](../../src/store/cart-store.ts); `useCartActions` (from
  [use-cart-sync.ts](../../src/features/cart/use-cart-sync.ts)) also returns `cart`. The
  **single bootstrap** site is the navbar's `CartNavButton` (per the cart redesign).
- **Mini-cart:** global `<CartSheet/>` mounted in
  [layout.tsx:56-59](../../src/app/layout.tsx#L56-L59); open via
  `useCartUiStore().openMiniCart()`
  ([cart-ui-store.ts](../../src/store/cart-ui-store.ts)).
- **Design system to mirror:** rounded `Card` (`rounded-4xl shadow-md ring-1
  ring-foreground/5`), `Badge` variants `success | info | warning | secondary | destructive`
  ([badge.tsx](../../src/components/ui/badge.tsx)), semantic tokens `--success/--info/
  --warning` (+ `-foreground`) in `src/styles/globals.css`. In-cart/selected accent pattern:
  `ring-2 ring-success/40` + `<Badge variant="success">` (see
  [product-card.tsx:51-66](../../src/app/products/_components/product-card.tsx#L51-L66)).
  Item row: [cart-line-row.tsx](../../src/features/cart/_components/cart-line-row.tsx)
  (`compact`/`full`). Summary: [cart-summary.tsx](../../src/app/cart/_components/cart-summary.tsx)
  (currency `Badge variant="info"`, per-currency totals). Header:
  [section-heading.tsx](../../src/features/home/_components/section-heading.tsx). Icons:
  **lucide-react** with `data-icon="inline-start|inline-end"`.
- **Primitives available** ([src/components/ui](../../src/components/ui)): `card`, `badge`,
  `button`, `separator`, `switch`, `alert`, `empty`, `skeleton`, `tooltip`, `dialog`,
  **`sheet`** (present, used for mobile summary), `field`, `input`, `select`. No `Stepper`
  primitive (build a local checkout-specific one).
- **Tests:** Node built-in runner (`node:test` + `node:assert/strict`) via `tsx`, pure
  functions only — see
  [catalog-filtering.test.ts](../../src/app/products/_components/catalog-filtering.test.ts)
  and [operational-diagnostics.test.ts](../../src/server/services/admin/operational-diagnostics.test.ts).
  No React Testing Library.

## 5. Approach & sequencing

**Scaffold-then-fill, behavior-preserving, bottom-up.** Extract the pure step logic and the
read-only line variant first (no visual change), then introduce the stepper + 4-step
orchestration (re-wiring the existing step bodies under the new shell), then restyle each
step, then the summary + mobile bar, then the post-confirmation screens, then a11y/polish.

- **Why this order:** `checkout-steps.ts` is pure and unit-testable in isolation, so the
  step model is locked and tested before any component depends on it. The orchestration
  rewrite (Phase 2) keeps the existing step *bodies* working under the new stepper/summary,
  so the flow is verifiable before the cosmetic restyle (Phase 3-4). Post-confirmation
  screens (Phase 5) are independent and low-risk.
- **Avoiding regressions:** keep all tRPC calls and the confirm/idempotency/retry logic
  byte-for-byte; only the presentation, the step set, and the items data source change.
  Drive item display off the live cart store so mini-cart edits and the server's
  confirm-time re-read stay consistent (no snapshot drift). Resolve the single-bootstrap
  question explicitly (verify the navbar bootstraps; drop the duplicate `useCartSync` only
  if so).
- **Validation:** `pnpm typecheck` + `pnpm check` (biome) after each phase; `tsx --test`
  for `checkout-steps.test.ts`; manual click-through of the flows in §11; `pnpm build`.

## 6. Assumptions

| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |
| The global navbar `CartNavButton` already bootstraps cart sync on every route (incl. `/checkout`). | Single-bootstrap rule from the cart redesign; navbar is mounted in `layout.tsx`. | Navbar bootstrap is conditional/absent on `/checkout`. | Keep `CheckoutClient`'s own `useCartSync` (current behavior) instead of dropping it; still read display off the live snapshot. |
| Reading items/summary off the live cart store matches what `confirmAndPay` charges. | `confirmAndPay` re-reads the live cart server-side before snapshotting. | Backend starts snapshotting at `start()`. | Re-fetch `checkout.getState` after mini-cart close and render off that snapshot instead. |
| `CheckoutState.cart` from `start()` and the live store refer to the same cart. | Both resolve the user's single active cart. | A user has multiple active carts. | Prefer the live store for items; use `start()` only for `cart.code`/addresses/methods. |
| Keeping items read-only avoids MOQ/step/multi-currency edge cases inside checkout. | Editing is delegated to the proven mini-cart/cart UI. | Product wants inline editing later. | Add an editable Pedido variant reusing `CartLineRow` `full` + `useCartActions` (deferred). |
| The mock result panel + MP return pages need only cosmetic alignment. | Their logic is correct; only styling is dated. | Copy/links must change. | Treat as a follow-up; this plan only restyles. |

## 7. Phased execution plan

### Phase 1 — Foundations (pure logic, no flow change)
**Objective:** Lock and test the 4-step model; add a read-only line variant. No visible flow change yet.
**Tasks:** T1.1 `checkout-steps.ts` · T1.2 `checkout-steps.test.ts` · T1.3 `CartLineRow` read-only variant.
**Dependencies:** none.
**Validation:** `tsx --test` green for `checkout-steps.test.ts`; typecheck + biome pass; `/cart` and `/checkout` render unchanged.

### Phase 2 — Stepper + 4-step orchestration
**Objective:** New numbered clickable stepper; introduce the Pedido step; rewrite the client into a 4-step orchestrator driving items off the live cart and opening the mini-cart to edit. Step bodies reused as-is (restyle comes next).
**Tasks:** T2.1 `checkout-stepper.tsx` · T2.2 `checkout-order-step.tsx` · T2.3 `checkout-client.tsx` rewrite.
**Dependencies:** T1.1, T1.3.
**Validation:** all 4 steps reachable per the lock rules; completed steps clickable; Pedido shows live items; "Editar carrito" opens the mini-cart and edits reflect instantly; confirm/redirect/retry still work; nav badge + totals correct.

### Phase 3 — Step restyle (selection cards + edit links)
**Objective:** Restyle Envío, Pago, and Confirmar to the new design; add per-section "Editar" links on Confirmar.
**Tasks:** T3.1 `checkout-address-step.tsx` · T3.2 `checkout-payment-step.tsx` · T3.3 `checkout-review-step.tsx`.
**Dependencies:** Phase 2.
**Validation:** selected address/payment cards show the `success` accent + check; Confirmar shows item/address/payment sections each with a working "Editar" link that jumps to its step; terms toggle gates confirm.

### Phase 4 — Summary + mobile bottom bar
**Objective:** Restyle the persistent summary; add the mobile sticky bottom bar with total + CTA + "Ver resumen" sheet.
**Tasks:** T4.1 `checkout-summary.tsx` · T4.2 mobile bottom bar.
**Dependencies:** Phase 2 (orchestrator props), T1.3.
**Validation:** desktop sticky summary matches `cart-summary` styling (currency badges, items); mobile shows a fixed bottom bar with the right CTA per step; "Ver resumen" opens the full summary in a `Sheet`.

### Phase 5 — Post-confirmation light restyle
**Objective:** Align the mock result panel and the MP return pages to the new look.
**Tasks:** T5.1 `checkout-result-panel.tsx` · T5.2 `mercadopago-return-page.tsx`.
**Dependencies:** Phase 3 (shared chips/section patterns).
**Validation:** success/failure/pending states render with rounded cards + semantic chips; links unchanged and working.

### Phase 6 — Accessibility, polish & validation
**Objective:** a11y for the stepper/sheets, optional dialog alignment, final validation.
**Tasks:** T6.1 a11y pass · T6.2 (optional) form-dialog alignment · T6.3 full validation.
**Dependencies:** Phases 2-5.
**Validation:** keyboard-only run-through (navigate steps → edit → confirm) works; `pnpm typecheck`, `pnpm check`, `tsx --test`, `pnpm build` all green.

## 8. Task breakdown

### T1.1 — Pure step model & logic
- **Files:** `src/app/checkout/_components/checkout-steps.ts` `[NEW]`
- **Symbols / signatures:**
  `CheckoutStepId = "order" | "shipping" | "payment" | "review"`;
  `CHECKOUT_STEPS: { id: CheckoutStepId; label: string; shortLabel: string }[]`;
  `CheckoutSelection = { hasItems: boolean; addressId: number | null; paymentMethodId: number | null; acceptedTerms: boolean }`;
  `isStepComplete(step, sel): boolean`; `isStepReachable(step, sel): boolean`;
  `nextStep(current, sel): CheckoutStepId | null`; `prevStep(current): CheckoutStepId | null`;
  `canConfirm(sel): boolean`.
- **Change (operational):** Encode the lock rules as pure functions —
  `order` complete ⇔ `hasItems`; `shipping` complete ⇔ `addressId != null`; `payment`
  complete ⇔ `paymentMethodId != null`; `review` is terminal (`isStepComplete` ⇒ `false`).
  Reachability: `order` always; `shipping` ⇔ order complete; `payment` ⇔ shipping complete;
  `review` ⇔ shipping && payment complete. `nextStep` returns the next reachable forward
  step (or `null`). `canConfirm` ⇔ `hasItems && addressId && paymentMethodId && acceptedTerms`.
  No React, no I/O.
- **Mirror this pattern:** [catalog-filtering.ts](../../src/app/products/_components/catalog-filtering.ts) (pure-helper shape).
- **Depends on:** none.
- **Acceptance:** types compile; functions are total over all `CheckoutStepId` values.
- **Pitfalls:** keep `review` non-complete so the stepper never renders the final step as a
  green checkmark mid-flow; gate "advance" on reachability of the *next* step, not on the
  current step's completeness alone.

### T1.2 — Step logic unit tests
- **Files:** `src/app/checkout/_components/checkout-steps.test.ts` `[NEW]`
- **Change (operational):** `node:test` + `node:assert/strict`. Cover: empty selection
  (only `order` reachable); address-only (payment reachable, review not); address+payment
  (review reachable, `canConfirm` false until `acceptedTerms`); full selection (`canConfirm`
  true); `nextStep`/`prevStep` transitions across all steps; `hasItems=false` blocks
  everything past `order`.
- **Mirror this pattern:** [catalog-filtering.test.ts](../../src/app/products/_components/catalog-filtering.test.ts).
- **Depends on:** T1.1.
- **Acceptance:** `tsx --test src/app/checkout/_components/checkout-steps.test.ts` passes
  (or `node --import tsx --test`).
- **Pitfalls:** assert reachability **and** completeness separately — they differ for `review`.

### T1.3 — Read-only variant for `CartLineRow`
- **Files:** [cart-line-row.tsx](../../src/features/cart/_components/cart-line-row.tsx)
- **Symbols:** add `readOnly?: boolean` to `CartLineRowProps`; make `onIncrement`/
  `onDecrement`/`onQuantityCommit`/`onRemove` optional when `readOnly`.
- **Change (operational):** When `readOnly`, render the **quantity as text**
  (`formatQuantity(item.quantity, item.product.unit)`) instead of `QuantityStepper`, and
  hide the remove button. Keep the `compact` layout/spacing. Used by the Pedido step and the
  Confirmar item list.
- **Mirror this pattern:** existing `compact` branch in the same file.
- **Depends on:** none.
- **Acceptance:** `<CartLineRow readOnly variant="compact" item={…} />` renders with no
  interactive controls and no callback props required; existing call sites (mini-cart, cart
  page) keep working unchanged.
- **Pitfalls:** keep `productClientTermsId` as the React key; don't make the editing
  callbacks required (would break the read-only call sites and is a type regression).

### T2.1 — Numbered progress stepper
- **Files:** `src/app/checkout/_components/checkout-stepper.tsx` `[NEW]`
- **Symbols:** `CheckoutStepper({ steps, currentStep, selection, onStepChange })` where
  `steps = CHECKOUT_STEPS`, `selection: CheckoutSelection`, `onStepChange(id)`.
- **Change (operational):** Render an ordered row of numbered circles joined by a connector
  line. Per step compute state from `checkout-steps`: **completed** (`isStepComplete`) →
  `success` fill + `CheckCircle2Icon`/check; **active** (`id === currentStep`) → primary
  ring/border; **reachable** (`isStepReachable` && not active) → clickable, muted;
  **locked** (`!isStepReachable`) → disabled, muted. Clicking a reachable step calls
  `onStepChange`. Desktop: circles + labels + connectors (`sm:` and up). Mobile: compact
  circles row + a `Paso {n} de {total} · {label}` line. Use `data-icon` lucide icons and
  semantic tokens.
- **Mirror this pattern:** state/accent from
  [product-card.tsx:51-66](../../src/app/products/_components/product-card.tsx#L51-L66)
  (`ring-2 ring-success/40`, `Badge variant="success"`); button/icon idioms from the current
  inline `CheckoutStepper`.
- **Depends on:** T1.1.
- **Acceptance:** completed steps show a check and are clickable; the active step is visually
  distinct; locked steps are not clickable; `aria-current="step"` on the active circle.
- **Pitfalls:** don't let a click jump *forward* past a locked step (guard with
  `isStepReachable`); ensure the connector line doesn't overflow on mobile (wrap/scroll).

### T2.2 — Pedido (order) step
- **Files:** `src/app/checkout/_components/checkout-order-step.tsx` `[NEW]`
- **Symbols:** `CheckoutOrderStep({ cart, onEditCart })` where `cart: CartSnapshot` (live
  store snapshot), `onEditCart(): void`.
- **Change (operational):** A `Card` titled "Tu pedido" listing items as
  `<CartLineRow readOnly variant="compact" />`, per-currency totals (mirror
  `cart-summary` chips), item count / accumulated units, and a primary **"Editar carrito"**
  button calling `onEditCart` (which opens the mini-cart). Empty state via
  [Empty](../../src/components/ui/empty.tsx) if `cart.items.length === 0` (offer "Ver
  productos"). Read-only — no steppers, no remove.
- **Mirror this pattern:** [cart-summary.tsx](../../src/app/cart/_components/cart-summary.tsx)
  (totals/chips) + [cart-line-row.tsx](../../src/features/cart/_components/cart-line-row.tsx).
- **Depends on:** T1.3.
- **Acceptance:** items render read-only from the passed live cart; "Editar carrito" opens
  the mini-cart; editing there updates this list without a manual refresh.
- **Pitfalls:** render off the **live** snapshot prop, not `checkout.cart` from `start()`
  (otherwise edits won't reflect); show multi-currency totals as-is (no gate per §2).

### T2.3 — Rewrite `checkout-client` into the 4-step orchestrator
- **Files:** [checkout-client.tsx](../../src/app/checkout/_components/checkout-client.tsx)
- **Symbols:** `CheckoutClient({ userId })`; internal `currentStep: CheckoutStepId`.
- **Change (operational):**
  - Replace the `"address"|"payment"|"review"` step union with `CheckoutStepId`
    (`order|shipping|payment|review`); default `currentStep = "order"`.
  - **Live cart:** read the snapshot via `useCartStore(selectCartSnapshot)` +
    `hasHydrated` for the items/summary/Pedido. **Verify** whether the navbar already
    bootstraps `useCartSync` (single-bootstrap rule): if yes, **drop** this component's own
    `useCartSync` and gate `start()` on store `hasHydrated`; if no, keep the existing
    `useCartSync` call. Either way, items render off the live snapshot.
  - Build `selection: CheckoutSelection` from `{ hasItems: liveCart.items.length>0,
    addressId: selectedAddressId, paymentMethodId: selectedPaymentMethodId, acceptedTerms }`
    and pass it to `CheckoutStepper`.
  - Render `<CheckoutStepper steps={CHECKOUT_STEPS} currentStep onStepChange={…} />`;
    `onStepChange` only sets the step if `isStepReachable`.
  - Render the active step: `order` → `CheckoutOrderStep` (with
    `onEditCart={() => openMiniCart()}` from `useCartUiStore`); `shipping` →
    `CheckoutAddressStep`; `payment` → `CheckoutPaymentStep`; `review` →
    `CheckoutReviewStep`.
  - Bottom nav (Atrás / Continuar) uses `prevStep`/`nextStep`; "Continuar" disabled unless
    the next step is reachable; on `review` show no "Continuar" (the confirm button lives in
    the review step + mobile bar).
  - Keep **all** existing mutations and handlers verbatim: `start`, `createAddress`,
    `updateAddress`, `createPaymentMethod`, `updatePaymentMethod`, `confirmAndPay`
    (incl. `redirectUrl` → `window.location.assign`, `clearCart` on success, idempotency key,
    retry → set step to `review` + new key). Keep the address/payment form dialogs.
  - Render `<CheckoutSummary/>` (desktop sticky + mobile bar) with the live cart, selected
    address/payment, and an `onEditStep(stepId)` that sets `currentStep`.
- **Mirror this pattern:** container/header from the current client + `cart-client.tsx`;
  `section-heading.tsx` for the page header.
- **Depends on:** T1.1, T2.1, T2.2, and (consumes) T3.1-T3.3, T4.1.
- **Acceptance:** the 4-step flow works end-to-end with the new stepper; editing the cart
  via the mini-cart updates Pedido + summary; confirm + Mercado Pago redirect + mock result
  + failed-payment retry all behave as before; no double cart-sync.
- **Pitfalls:** **single bootstrap** — do not run two `useCartSync` instances; derive
  `selection` (don't mirror it into extra state); reset `acceptedTerms` appropriately on
  retry; keep `paymentAttemptKey` regeneration on retry; guard the empty-live-cart case
  (user empties cart via mini-cart) with a friendly state, since `start()` already ran.

### T3.1 — Envío (address) step restyle
- **Files:** `src/app/checkout/_components/checkout-address-step.tsx` `[NEW]` (extracted from
  the inline `AddressStep`)
- **Symbols:** `CheckoutAddressStep({ addresses, selectedAddressId, onAdd, onEdit, onSelect })`.
- **Change (operational):** Move the inline `AddressStep` here and restyle each address into
  a rounded **radio-card** (`rounded-3xl bg-card p-3 shadow-sm ring-1 ring-foreground/5`);
  the selected card gets `ring-2 ring-success/40` + a `<Badge variant="success">Seleccionada</Badge>`
  + `CheckCircle2Icon`. Keep "Nueva"/"Editar" → dialogs, and the empty state. Behavior
  identical to today.
- **Mirror this pattern:** in-cart accent in
  [product-card.tsx](../../src/app/products/_components/product-card.tsx); current
  `AddressStep` in [checkout-client.tsx](../../src/app/checkout/_components/checkout-client.tsx).
- **Depends on:** T2.3 (wiring).
- **Acceptance:** selecting a card updates selection + accent; add/edit dialogs work; empty
  state offers "Agregar dirección".
- **Pitfalls:** keep `onSelect(address.id)`; preserve keyboard selectability of the card.

### T3.2 — Pago (payment) step restyle
- **Files:** `src/app/checkout/_components/checkout-payment-step.tsx` `[NEW]` (extracted from
  inline `PaymentStep`)
- **Symbols:** `CheckoutPaymentStep({ paymentMethods, selectedPaymentMethodId, onAdd, onEdit, onSelect })`.
- **Change (operational):** Same radio-card restyle as T3.1 for payment methods; keep the
  `paymentTypeLabel` mapping, the "Pago externo / Mercado Pago" `Alert`, add/edit dialogs,
  and the empty state. Selected → `success` accent + badge.
- **Mirror this pattern:** T3.1; current `PaymentStep`.
- **Depends on:** T2.3.
- **Acceptance:** selecting a method updates selection + accent; the Mercado Pago method
  appears when enabled (unchanged source); dialogs work.
- **Pitfalls:** don't alter the Mercado Pago method injection (comes from `start()` state);
  keep `details`/`provider` display.

### T3.3 — Confirmar (review) step restyle + edit links
- **Files:** `src/app/checkout/_components/checkout-review-step.tsx` `[NEW]` (extracted from
  inline `ReviewStep`)
- **Symbols:** `CheckoutReviewStep({ cart, shippingAddress, paymentMethod, termsText, acceptedTerms, isSubmitting, onAcceptedTermsChange, onConfirm, onEditStep })`.
- **Change (operational):** Three rounded summary sections — **Pedido** (items via
  `<CartLineRow readOnly variant="compact" />` + totals), **Envío** (selected address),
  **Pago** (selected method) — each with a header **"Editar"** `Button`/link calling
  `onEditStep("order"|"shipping"|"payment")`. Then the terms `Alert` + accept `Switch` +
  the **"Confirmar y pagar"** button (disabled unless `acceptedTerms && !isSubmitting`).
  Use the live `cart` prop for items/totals.
- **Mirror this pattern:** current `ReviewStep`; chips from `cart-summary`.
- **Depends on:** T2.3, T1.3.
- **Acceptance:** each "Editar" link jumps to the right step; confirm fires the existing
  `confirmAndPay` path; terms gate the button.
- **Pitfalls:** keep `onConfirm` wired to the **unchanged** `confirmAndPay.mutate({
  acceptedTerms: true, idempotencyKey, paymentMethodId, shippingAddressId })`; render items
  from the live cart, not the `start()` snapshot.

### T4.1 — Order summary restyle (sticky)
- **Files:** `src/app/checkout/_components/checkout-summary.tsx` `[NEW]` (extracted from
  inline `CheckoutSummary`)
- **Symbols:** `CheckoutSummary({ cart, selectedAddress, selectedPaymentMethod, currentStep, onEditStep })`.
- **Change (operational):** Restyle to match [cart-summary.tsx](../../src/app/cart/_components/cart-summary.tsx):
  per-currency totals with `<Badge variant="info">{currency}</Badge>`, item count /
  accumulated units, a compact item peek (optional), and **Dirección / Pago** rows each with
  a small "Editar" affordance (`onEditStep`). Desktop: `lg:sticky lg:top-20`. Drive off the
  live `cart`.
- **Mirror this pattern:** [cart-summary.tsx](../../src/app/cart/_components/cart-summary.tsx).
- **Depends on:** T2.3.
- **Acceptance:** totals/badges match the cart styling; edit affordances jump to steps;
  values update live with cart edits.
- **Pitfalls:** keep it presentational; don't duplicate the confirm logic here (confirm
  lives in the review step + mobile bar).

### T4.2 — Mobile sticky bottom bar
- **Files:** `src/app/checkout/_components/checkout-summary.tsx` (same file, mobile variant)
  or `checkout-mobile-bar.tsx` `[NEW]`
- **Symbols:** `CheckoutMobileBar({ cart, currentStep, canContinue, canConfirm, isSubmitting, onPrimary, onOpenSummary })`.
- **Change (operational):** A `lg:hidden` fixed bottom bar showing the primary total and a
  primary CTA whose label depends on the step (`order|shipping|payment` → "Continuar",
  disabled unless `canContinue`; `review` → "Confirmar y pagar", disabled unless
  `canConfirm`). A "Ver resumen" control opens the full `CheckoutSummary` in a
  `Sheet side="bottom"` (reuse [sheet.tsx](../../src/components/ui/sheet.tsx)). Add
  `pb-[env(safe-area-inset-bottom)]` and bottom padding on the page so content isn't hidden.
- **Mirror this pattern:** [sheet.tsx](../../src/components/ui/sheet.tsx) usage in the
  mini-cart; button idioms from the current bottom nav.
- **Depends on:** T2.3, T4.1.
- **Acceptance:** on mobile the bar shows the right CTA per step and the correct total;
  "Ver resumen" opens the summary sheet; the CTA mirrors the desktop Continuar/Confirmar
  enablement.
- **Pitfalls:** don't let the bar and the global mini-cart `Sheet` fight for focus (only one
  open at a time); ensure the page reserves bottom space so the bar never overlaps the last
  control.

### T5.1 — Result panel restyle
- **Files:** `src/app/checkout/_components/checkout-result-panel.tsx` `[NEW]` (extracted from
  inline `CheckoutResultPanel`)
- **Symbols:** `CheckoutResultPanel({ result, onRetry })`.
- **Change (operational):** Move it out of the client and restyle to the rounded system:
  success/failure chips (`Badge` semantic variants), order/transaction/amount/payment in
  rounded sub-cards (replace flat `border` boxes), keep the failed-payment `Alert` and all
  links ("Volver al inicio", "Ver mi pedido", "Intentar de nuevo"). Behavior unchanged.
- **Mirror this pattern:** current `CheckoutResultPanel`; chip styling from `cart-summary`.
- **Depends on:** T3.x (shared section/chip patterns).
- **Acceptance:** both success and failed states render with the new look; `onRetry` still
  resets to the review step with a fresh idempotency key.
- **Pitfalls:** keep the `orderStatusLabel` mapping and the `/my-operations/{id}` link.

### T5.2 — Mercado Pago return pages restyle
- **Files:** [mercadopago-return-page.tsx](../../src/app/checkout/mercadopago/_components/mercadopago-return-page.tsx)
- **Change (operational):** Light restyle of the shared `MercadoPagoReturnPage` (success/
  failure/pending tones) to the rounded `Card` + semantic chips, mirroring the result panel.
  Keep the copy, the "estado sujeto a reconciliación" `Alert`, and both links. The three
  thin page wrappers (`success/`, `failure/`, `pending/`) are unchanged.
- **Mirror this pattern:** T5.1.
- **Depends on:** T5.1.
- **Acceptance:** all three tones render consistently with the new look; links unchanged.
- **Pitfalls:** keep the reconciliation messaging (do not imply the page confirms payment).

### T6.1 — Accessibility & polish
- **Files:** all new checkout components.
- **Change (operational):** `aria-current="step"` on the active stepper circle and
  `aria-label`s on icon-only buttons; focus management for the mobile summary `Sheet`;
  keyboard activation of selection cards (`role="radio"`/button semantics);
  contrast check on `success`/`info` accents; tooltips on locked steps explaining the
  prerequisite.
- **Depends on:** Phases 2-5.
- **Acceptance:** keyboard-only run-through (navigate steps → edit via stepper/links → open
  mini-cart → confirm) works; no obvious a11y gaps.
- **Pitfalls:** don't trap focus between the mobile summary sheet and the mini-cart sheet.

### T6.2 — (Optional) form-dialog alignment
- **Files:** [address-form-dialog.tsx](../../src/app/checkout/_components/address-form-dialog.tsx),
  [payment-method-form-dialog.tsx](../../src/app/checkout/_components/payment-method-form-dialog.tsx)
- **Change (operational):** Light visual touch-ups only (spacing/chips) to match; no field
  or schema changes. Skip if time-boxed.
- **Depends on:** Phase 3.
- **Acceptance:** dialogs visually consistent; forms behave identically.
- **Pitfalls:** do **not** touch the Zod schemas or the safe-payment-text validation.

## 9. Cross-cutting concerns

- **Data / schema / migration:** **None.** No Prisma, no Zod, no tRPC contract changes. The
  redesign consumes the existing `CheckoutState` + live cart store.
- **Config / env / feature flags:** None. Ship directly (single PR or stacked by phase).
- **Security / permissions:** Unchanged — `/checkout` stays auth-gated in `page.tsx`; the
  safe-payment-text rules and idempotency handling are untouched.
- **Observability:** Existing `sonner` toasts remain the feedback channel; no new logging.
- **State:** Display reads from the **live** cart store (`selectCartSnapshot`); `start()`
  supplies addresses/payment methods/`termsText`/`cart.code`. Ephemeral mini-cart open state
  via the existing `useCartUiStore`. Selection (`addressId`/`paymentMethodId`/`acceptedTerms`)
  stays local React state.

## 10. Pitfalls & gotchas (global)

- **Single bootstrap:** verify the navbar bootstraps cart sync before dropping
  `CheckoutClient`'s `useCartSync`; never run two `useCartSync` instances (double
  sync/merge). When in doubt, keep the existing call and just add live-snapshot reads.
- **Live vs snapshot:** Pedido, Confirmar items, and the summary must read the **live**
  cart store so mini-cart edits reflect and stay consistent with `confirmAndPay`'s
  re-read. Do not render those off `checkout.cart` (the `start()` snapshot).
- **Stepper locking:** clicks must respect `isStepReachable`; `review` is reachable but
  never "complete" (no premature green check). Advancing depends on the *next* step's
  reachability.
- **Confirm path untouched:** preserve `confirmAndPay` input, idempotency key lifecycle,
  `redirectUrl` redirect, `clearCart()` on success, and the retry → review + new-key flow.
- **Multi-currency:** per §2 there is **no early gate**; show per-currency totals and let
  the existing confirm-time `CONFLICT` surface as the error alert/toast. Don't silently hide
  multi-currency carts.
- **Empty cart mid-checkout:** the user can empty the cart via the mini-cart after `start()`;
  render a friendly empty/guard state rather than a broken summary.
- **Two sheets:** the mobile summary `Sheet` and the global mini-cart `Sheet` must not be
  open simultaneously.
- **Mobile bottom bar overlap:** reserve page bottom padding + safe-area inset so the bar
  never covers the last control.
- **Read-only line:** `CartLineRow readOnly` must not require the editing callbacks (type
  regression for existing call sites otherwise).

## 11. Testing & validation

- **Unit tests (add):** `src/app/checkout/_components/checkout-steps.test.ts` — completeness,
  reachability, `nextStep`/`prevStep`, `canConfirm`, `hasItems=false` lockout. Mirror
  [catalog-filtering.test.ts](../../src/app/products/_components/catalog-filtering.test.ts).
- **Commands:** `pnpm typecheck` · `pnpm check` (biome) ·
  `tsx --test src/app/checkout/_components/checkout-steps.test.ts` (or
  `node --import tsx --test`) · `pnpm build` · `pnpm madge` (no new cycles).
- **Manual checks / regression risks:**
  - 4-step navigation: forward locked until prerequisites; completed steps clickable; Atrás/
    Continuar correct; "Editar" links on Confirmar jump to the right steps.
  - Pedido shows live items; "Editar carrito" opens the mini-cart; add/remove/qty there
    update Pedido + summary instantly; emptying the cart shows the guard state.
  - Address/payment selection shows the `success` accent; add/edit dialogs still work; the
    Mercado Pago method appears when enabled.
  - Confirm: terms gate; mock success clears the cart and shows the restyled result panel;
    **Mercado Pago** path redirects; failed payment → retry returns to review with a new key.
  - Multi-currency cart still errors **at confirm** (no new gate); invalid/expired item
    likewise.
  - Mobile: sticky bottom bar shows the right CTA + total per step; "Ver resumen" opens the
    summary sheet; bar never overlaps content.
  - Desktop sticky summary matches the cart styling.
- **Success criteria:** all commands green; manual flows pass; no console/hydration
  warnings; visual consistency with the rounded/semantic system; the checkout service and MP
  flow behave exactly as before.

## 12. Rollout, migration & rollback

- **Rollout:** Single PR (or stacked by phase). No migration, no env, no flag — merge ships
  it. Phases are independently mergeable; Phase 1 is invisible, Phases 5-6 are low-risk.
- **Compatibility:** Frontend-only; the checkout service, schemas, and Mercado Pago flow are
  byte-for-byte unchanged, so server, webhooks, and in-flight orders are unaffected.
- **Rollback:** Revert the PR (or the offending phase commit). No data or backend changes to
  unwind.
- **Post-release:** Watch for cart-sync/hydration warnings on `/checkout` and that the
  Mercado Pago redirect + failed-payment retry still behave.

## 13. Documentation updates

- **CONTEXT.md:** Add **Checkout** under "Catalog and cart (customer-facing)" — the
  customer-facing flow that turns an `atCheckout` cart into a submitted order + payment
  attempt (single-currency, snapshotted at confirm). Done this session.
- **ADRs:** None. No decision here clears the hard-to-reverse + surprising + real-trade-off
  bar; all choices are reversible UI/flow decisions. (ADR 0001 already covers Mercado Pago
  reconciliation and is untouched.)
- **Other:** this plan documents the work; `docs/plans/products-page-redesign.md` is the
  sibling reference.

## 14. Risks & trade-offs

| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| Dropping `useCartSync` in checkout breaks bootstrap if the navbar doesn't cover it | Empty/stale cart on `/checkout` | Med | High | Verify navbar bootstrap first; keep the existing `useCartSync` if unsure (T2.3 branch). |
| Live-store display diverges from `start()` snapshot | Confusing totals | Low | Med | `confirmAndPay` re-reads live cart, so live display is the source of truth; use `start()` only for addresses/methods/code. |
| Client rewrite regresses confirm/redirect/retry | Core purchase path | Med | High | Keep all mutations/handlers verbatim; phase-gate; manual regression of all confirm branches. |
| No early multi-currency gate surprises users at confirm | Late error | Med (by design) | Low | Show per-currency totals throughout so a multi-currency cart is visible before confirm. |
| Mobile bar + mini-cart sheet focus conflict | a11y/UX bug | Low | Med | Mutually exclusive open state; a11y pass (T6.1). |
| Stepper lock rules wrong (jump past prerequisites) | Invalid state at confirm | Low | Med | Pure, unit-tested `checkout-steps.ts`; guard `onStepChange` on `isStepReachable`. |

## 15. Open questions

- **Blocking (resolve before execution):** none — all design decisions are settled in §2.
- **Non-blocking (resolve during execution):**
  - Single-bootstrap verification (T2.3): confirm the navbar bootstraps `useCartSync` on
    `/checkout`; default — keep the existing call if unconfirmed.
  - Mobile bar "Ver resumen": `Sheet side="bottom"` (default) vs an inline expand.
  - Whether the desktop summary includes a compact item peek (default: yes, condensed).
- **Optional refinements (deferred):** show the authenticated email read-only on Confirmar
  (pass `userEmail` from `page.tsx`); early multi-currency/invalid-item gate on Pedido;
  address/payment dialog visual overhaul.

## 16. Definition of done

- [ ] `/checkout` renders the 4 steps (Pedido → Envío → Pago → Confirmar) with a numbered,
      clickable progress stepper (checkmarks, active, locked states).
- [ ] Completed steps are clickable in the stepper; Confirmar has per-section "Editar" links
      that jump to the right step.
- [ ] Pedido shows the cart items read-only; "Editar carrito" opens the mini-cart and edits
      reflect instantly in Pedido + summary.
- [ ] Envío/Pago use rounded radio-cards with a `success` accent on the selected card; add/
      edit dialogs and the Mercado Pago method behave as before.
- [ ] A persistent summary is sticky on desktop and a sticky bottom bar (total + step-aware
      CTA + "Ver resumen" sheet) on mobile.
- [ ] Confirm, Mercado Pago redirect, mock result panel, and failed-payment retry all behave
      exactly as before; multi-currency still errors at confirm.
- [ ] Result panel + Mercado Pago return pages lightly restyled to the new look.
- [ ] `checkout-steps.ts` extracted with passing `node:test`; `CONTEXT.md` updated; `pnpm
      typecheck`, `pnpm check`, the unit test, and `pnpm build` are green; no backend/schema
      changes.

## 17. Instructions for the executing agent

- Use this plan as the primary source. Read first:
  [checkout-client.tsx](../../src/app/checkout/_components/checkout-client.tsx),
  [checkout.service.ts](../../src/server/services/checkout/checkout.service.ts),
  [checkout.schemas.ts](../../src/schemas/checkout.schemas.ts),
  [cart-line-row.tsx](../../src/features/cart/_components/cart-line-row.tsx),
  [cart-summary.tsx](../../src/app/cart/_components/cart-summary.tsx),
  [cart-store.ts](../../src/store/cart-store.ts),
  [use-cart-sync.ts](../../src/features/cart/use-cart-sync.ts),
  [cart-ui-store.ts](../../src/store/cart-ui-store.ts),
  [product-card.tsx](../../src/app/products/_components/product-card.tsx),
  [section-heading.tsx](../../src/features/home/_components/section-heading.tsx),
  [sheet.tsx](../../src/components/ui/sheet.tsx), `CONTEXT.md`,
  [products-page-redesign.md](./products-page-redesign.md).
- Respect these settled decisions (§2): 4 steps Pedido→Envío→Pago→Confirmar; numbered
  clickable stepper; read-only items; edit via the global mini-cart; both edit mechanisms on
  Confirmar; sticky desktop summary + mobile bottom bar; **no** new currency/validity gates;
  light post-confirmation restyle; pure tested `checkout-steps.ts`. Do **not** change: the
  checkout service/router/schemas, the Mercado Pago flow, the cart engine, the confirm input,
  or idempotency/retry logic.
- Verify before modifying: whether the navbar already bootstraps `useCartSync` (single
  bootstrap) before dropping it from `CheckoutClient`; that the live snapshot
  (`selectCartSnapshot`) is the right source for items/totals.
- Execute phases in order; honor task dependencies. Extract + test `checkout-steps.ts`
  before wiring it in.
- Implement at the level specified — write the code the tasks describe; do not re-architect
  or touch the backend. If a blocking question arises, stop and ask; for non-blocking gaps
  (§15), proceed on the stated default and note the assumption.
