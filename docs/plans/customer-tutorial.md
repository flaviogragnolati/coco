# Implementation Plan: customer tutorial — guided walk-through of a purchase on example data

> **Status:** Implemented 2026-11-06 (see Execution record), commit `550a414` on `main`; migration applied. Feature grill 2026-11-06. Decisions confirmed by Flavio.

## 1. Objective & outcome

- **Done means:**
  - A navbar help icon "(?)" on every storefront page, for guests and signed-in customers on desktop and mobile, opens a menu: "Tutorial rápido · 1 min", "Tutorial completo · 3 min", "Preguntas frecuentes", "Contacto".
  - Either tutorial opens `/tutorial`, a simulated storefront fed by a fixed example dataset. A spotlight (dimmed backdrop with a rounded cut-out) highlights one element per step. A popover explains it, with step counter, "Atrás", "Siguiente" and ✕. Esc exits, ← → navigate. The tutorial walks the whole happy path: home → catalog → mini-cart → Tu pedido → checkout (4 steps) → Mercado Pago payment approved → Mis pedidos → order detail with tracking. The complete version moves the order through the 6 journey stages one per step.
  - The real cart, addresses, orders and payments are never read or written by the tutorial.
  - The first time a signed-in customer lands on a storefront page other than `/login`, `/checkout` or `/checkout/mercadopago/*`, a non-blocking **tutorial invitation** card ("¿Primera vez en Coco?") offers both versions and "Ahora no". Any answer is stored on the user and the card never shows again on any device. Existing users get it too.
- **Why:** customers can't yet live most of the process (aggregation, supplier, packaging, the trip across Chile and the Strait of Magellan, delivery). The tutorial shows them what a full purchase looks like before it happens to them.
- **For:** AI coding agent.
- **Upstream design doc:** none.

## 2. Alignment reached

| Topic | Decision | Source |
| --- | --- | --- |
| Where the tutorial runs | A **simulated scene** at its own route `/tutorial`, built from the same real presentational components with fixture props. It does **not** run on the real pages with swapped data sources ([ADR 0012](../adr/0012-tutorial-runs-in-simulated-scenes.md)). | user |
| Automatic trigger | Not an automatic tour. A **tutorial invitation** (non-blocking card) appears on the first eligible page after sign-in, and the tour starts only if the customer picks a version. | user (chose "Invitación, no tour" over auto-start) |
| Where/when the invitation shows | Never on `/login`, `/checkout` or `/checkout/mercadopago/*`. It waits for the next storefront page. Shown **once per user**: picking a version or "Ahora no" (or ✕) both settle it. Closing the tab without answering → it shows again on the next page. | user |
| Persistence | New nullable `User.tutorialInvitationAnsweredAt`. **No backfill**: existing users also get the invitation once. | user |
| Help entry point | Navbar icon "(?)" next to "Tu pedido", all breakpoints, guests and signed-in. Opens a dropdown: "Tutorial rápido · 1 min", "Tutorial completo · 3 min", separator, "Preguntas frecuentes" (`/#preguntas-frecuentes`), "Contacto" (`/#contacto`). | user |
| Two versions | **Express** ("Tutorial rápido", 12 steps, ~1 min) and **complete** ("Tutorial completo", 21 steps, ~3 min) over the same scenes and data. | user ("una versión express y una versión in depth completa") |
| Choosing a version | The customer chooses before starting, in the invitation and in the help menu. The express closing step offers "Ver el tutorial completo". No switching mid-tour. | user |
| Interaction | Tour-driven only: "Siguiente" / "Atrás" / ✕, plus ← → Esc. The simulated screen is `inert`. Each step declares its full scene state, so "Atrás" is trivial. | user |
| Engine | Built in-house on Radix (Popover with a virtual anchor) plus an SVG mask backdrop. No new dependency. Step index is React state, the single source of truth. | user |
| Reuse of real screens | Extract presentational views from the 3 data-coupled containers: mini-cart (`CartSheet`), Tu pedido (`CartClient`), order detail (`my-orders/[orderId]/page.tsx`). This is a refactor with no behavior change. Already-pure components are used as they are. | user |
| Happy path data | Home delivery to an example address + Mercado Pago approved, in both versions. Copy mentions that pickup points (same price) and external payment exist. | user |
| Route & URL | `/tutorial?version=rapido\|completo&paso=N&volver=/path`, outside the storefront route group, with its own simulated navbar and a "Modo tutorial · datos de ejemplo" bar, `noindex`. Steps update the URL with `router.replace`, so a reload keeps the step and browser Back leaves the tutorial. | default confirmed |
| Exit | ✕ / Esc / "Salir del tutorial" exits immediately, with no confirmation, to `volver` (default `/`). A click on the backdrop does nothing. | default confirmed |
| Mobile | Same scripts. Each step targets whichever element with its target id is visible at the current size (for example the checkout summary column on desktop, the checkout bottom bar on mobile). | default confirmed |
| Guests / admins | Guests can open the tutorial from the help menu but never get the invitation. Admins get the invitation like any customer, and only on storefront pages. | default confirmed |
| Accessibility | Popover is a modal dialog (focus trapped, labelled by its title), ← → Esc, no motion when `prefers-reduced-motion: reduce`. | default confirmed |
| Analytics | None. The only stored fact is the invitation answer timestamp. | default confirmed |
| UI labels | "Tutorial rápido", "Tutorial completo"; invitation titled "¿Primera vez en Coco?". The tutorial is never called "recorrido" in UI, because that word belongs to order tracking. | glossary (this session) |

Glossary terms used: **Tutorial**, **Tutorial invitation** (added to `CONTEXT.md` this session), **Cart** ("Tu pedido", never "carrito"), **Mini-cart**, **Checkout**, **Step price**, **Comparison price**, **Delivery mode**, **Pickup point**, **External payment**, **Journey stage**, **Order journey**.

## 3. Scope

- **In scope:**
  - `User.tutorialInvitationAnsweredAt` + migration, exposed on the better-auth session, plus a protected mutation that sets it.
  - Pure tutorial model: versions, step scripts with copy, scene states, target registry, URL param parsing, invitation eligibility decision.
  - Fixture dataset validated against the real zod output schemas.
  - Spotlight engine (backdrop, popover, keyboard, focus, scroll/resize tracking, reduced motion, mobile docking).
  - `/tutorial` route: player, simulated navbar, mode bar, scenes.
  - Extraction of `CartSheetView`, `CartPageView`, `OrderDetailView` (no behavior change).
  - Help menu in `AppNavbar`; tutorial invitation in the storefront layout.
  - Admin glossary dataset entries for the two new terms.
  - QA tickets for the tutorial; unit tests; one Playwright spec.
- **Out of scope / non-goals:**
  - Running the tour on the real `/products`, `/cart`, `/checkout`, `/my-orders` pages, or feeding them mock data.
  - Any write to the real cart store (`useCartStore`, localStorage key `CART_STORAGE_KEY`), the cart UI store, or any tRPC call from inside `/tutorial`.
  - A tour library dependency (driver.js, react-joyride, shepherd).
  - Click-to-advance interactions inside the scene.
  - Alternate paths in the tour (pickup point, external payment, failures, rollovers, exceptions). Copy only mentions that they exist.
  - Analytics or event logging of tutorial usage.
  - Refactoring `CheckoutClient`, `ProductsClient`, the login callback helpers, or `MobileNavMenu`.
  - Personalizing the tutorial with the customer's name or real data.
- **Deferred:**
  - Extra stops for pickup point and external payment ("Comprobante declarado") in the complete version.
  - Contextual "?" hints on individual real pages.
  - Usage metrics (started / completed / exited at step N).
  - A "Ver tutorial" entry in the mobile sheet "Explorá Coco" (the navbar icon already covers mobile).
- **Must not change / break:**
  - Mini-cart, Tu pedido and order detail render and behave exactly as today: same markup, copy, buttons, guards (merge-blocked, at-checkout disabled), links and `notFound` handling.
  - The cart bootstrap/sync (`CartNavButton`, `useCartActions`) runs only on real storefront pages.
  - `/login` → `/checkout` flow and the Mercado Pago return pages show nothing new.
  - Existing e2e specs and unit tests stay green.
  - `profile.get` / `profile.update` output shape (`profileSchema`) is unchanged.

## 4. Current system context

- **Storefront shell:** `src/app/(storefront)/layout.tsx` renders `AnnouncementBar`, `AppNavbar` (server, gets `session`), the page, and `CartSheet`, inside `<div className="font-sans" data-storefront="">`. `src/styles/globals.css` scopes the storefront fonts with `html:has([data-storefront])`, so the tutorial route must render the same wrapper.
- **Navbar:** `src/components/app-navbar.tsx`: logo, "Catálogo", `NavbarSearch`, then `ml-auto` group with `CartNavButton`, `UserMenu` or "Ingresar", and `MobileNavMenu` (`md:hidden`). There is no help button today. `isActiveUser = user.active && !user.deleted`.
- **Auth:** Google-only (`src/server/better-auth/config.ts`). User extra fields are declared in `user.additionalFields` (`role`, `document`, `taxId`, `dob`, `active`, `deleted`, all `input: false`). No `cookieCache`, so `getSession()` reads fresh user data. Sign-in is usually triggered at checkout: `CartSheet` links to `/login?callbackURL=/checkout`, and `src/app/(storefront)/checkout/page.tsx` redirects there when there is no session.
- **tRPC:** routers registered in `src/server/api/root.ts`; `protectedProcedure` in `src/server/api/trpc.ts`. `src/server/api/routers/profile.router.ts` uses `ctx.db.user` directly and is the closest pattern for a user-owned mutation.
- **Data-coupled containers (to extract):**
  - `src/features/cart/_components/cart-sheet.tsx`: `CartSheet` reads `useCartUiStore`, `useCartStore`, `useCartActions` and renders a Radix `Sheet` (modal) with `CartLineRow variant="compact"`, totals and CTAs.
  - `src/app/(storefront)/cart/_components/cart-client.tsx`: `CartClient` reads the stores and renders `PageHeader`, the merge-blocked alert, empty state, `CartLineRow variant="full"` list and `CartSummary`.
  - `src/app/(storefront)/my-orders/[orderId]/page.tsx`: server component. It fetches `api.orders.getMine` + `api.tracking.getOrderItemTimelines`, builds `buildCustomerOrderJourneyView(...)`, and inlines the header, `CustomerOrderJourney`, `ExternalPaymentPanel` and the Productos/Resumen/delivery cards, with local snapshot helpers (`getProductName`, `getLineTotal`, `getCurrency`, `getAddressLine`, …).
- **Already pure (reuse as-is):** `ProductCard`, `ProductGrid`, `CatalogToolbar`, `CatalogCategoryChips`, `CatalogFiltersSidebar` (local state only), `CartLineRow`, `CartSummary`, `CheckoutStepper`, `CheckoutOrderStep`, `CheckoutDeliveryStep`, `CheckoutPaymentStep`, `CheckoutReviewStep`, `CheckoutSummary`, `CheckoutMobileBar`, `CheckoutResultPanel`, `MyOrdersClient`, `CustomerOrderJourney`, `HowItWorksSection`, `HomeHero`, `PageHeader`, `ProductImage`. Not reusable without data: `ProductDetailsDialog` (queries `api.catalog.getProductDetail`) and the home offers (`home-offer-add-button` uses cart actions). Leave both out of the scenes.
- **Checkout orchestration to mirror (shell only):** `CheckoutClient` render block in `src/app/(storefront)/checkout/_components/checkout-client.tsx` (PageHeader + stepper + step + desktop Atrás/Continuar + `CheckoutSummary` + `CheckoutMobileBar`). Step ids/labels come from `CHECKOUT_STEPS` in `checkout-steps.ts`.
- **Types backed by zod schemas (fixture validation):** `CatalogProductListItem` ← `catalogProductListItemSchema` / `catalogProductListOutputSchema` (`src/schemas/catalog.schemas.ts`). `CartItem` / `CartSnapshot` ← `cartItemSchema` / `cartSnapshotSchema` (`src/schemas/cart.schemas.ts`). `CheckoutState`, `CheckoutPaymentResult`, `OrderListOutput`, `OrderDetail` ← `checkoutStateSchema`, `checkoutPaymentResultSchema`, `orderListOutputSchema`, `orderDetailSchema` (`src/schemas/checkout.schemas.ts`). `UserOrderItemTimeline` ← `userOrderItemTimelineSchema` / `userOrderItemTimelinesOutputSchema` (`src/schemas/tracking.schemas.ts`). Journey stages: `userTrackingStageDefinitions` in `src/shared/common/tracking-display.ts` (submitted, preparation, supplier, packaging, shipping, delivery).
- **Patterns to mirror:**
  - Pure step model: `src/app/(storefront)/checkout/_components/checkout-steps.ts` (+ `.test.ts`).
  - Pure decision: `src/features/cart/cart-bootstrap.decision.ts` (+ `.test.ts`).
  - Content module: `src/features/home/home-content.ts`.
  - Glossary entry shape: `src/features/admin/glossary/data/crosscutting.ts`, guarded by `glossary.data.test.ts` (ADR 0007).
  - QA ticket seed: `scripts/qa-tickets.data.ts` (+ `scripts/qa-tickets.data.test.ts`, which asserts the active count and code range).
  - Additive migration: `prisma/migrations/20261009000000_customer_delivery_preference/migration.sql`.
  - e2e style: `e2e/smoke.spec.ts`.
- **UI kit:** `src/components/ui/popover.tsx` exports `PopoverAnchor` (Radix Anchor accepts `virtualRef`). `src/components/ui/dropdown-menu.tsx`, `sheet.tsx` (`SheetContent` renders `SheetOverlay` at `z-50`, and `Sheet` is the Radix Dialog root, so it accepts `modal`). Navbar is `z-40`.

## 5. Approach & sequencing

Schema-first, then refactor-then-build:

1. **Persistence** (column, session field, mutation). Additive, independently deployable, invisible.
2. **Extraction refactor** of the three views with zero behavior change, validated by typecheck, the existing e2e suite and a manual pass, **before** any tutorial code depends on them.
3. **Pure core** (script, targets, params, fixtures, invitation decision), test-first. The fixture test parses everything through the real zod schemas, so a schema change breaks the build instead of silently breaking the tutorial.
4. **Engine** in isolation (spotlight + popover), driven by props.
5. **Route + scenes**, wiring the core and engine to the real components.
6. **Entry points** (help menu, invitation). These are the only changes visible on real pages, so they come last.
7. **Glossary dataset, QA tickets, e2e.**

Regressions are avoided by keeping the real pages' containers as thin wrappers around the extracted views, by never mounting `CartNavButton`/`CartSheet`/`useCartActions` under `/tutorial`, and by an e2e assertion that the real cart's localStorage entry is unchanged after a tour.

## 6. Assumptions

| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |
| Adding a field to better-auth `user.additionalFields` makes it available on `session.user` server-side | Same mechanism already exposes `active`, `deleted`, `role` | Field missing from `getSession()` result | Read it in the storefront layout with a `db.user.findUnique({ select: { tutorialInvitationAnsweredAt: true } })` when a user exists |
| Radix `PopoverAnchor` accepts `virtualRef` in the installed `radix-ui` version | Documented Popper API | Type error on `virtualRef` | Anchor an absolutely positioned invisible `<div>` sized to the target rect inside `PopoverAnchor` |
| `inert` is accepted as a boolean prop in React 19 typings | React 19 added it | Type error | Set it via `ref` (`el.inert = true`) in an effect |
| Radix Dialog with `modal={false}` renders no overlay and no focus trap | Radix `DialogOverlay` renders only when modal | Overlay or trap still present | Render the mini-cart scene with `SheetContent` replaced by a static fixed panel inside the scene, keeping the extracted inner markup |
| Every pure component listed in §4 has no hidden data hook | Grepped for `api.`, `use*Store`, `useCartActions`, `useRouter`, `useSearchParams` | A hook is found during execution | Do not mount it in a scene; recompose from its children or skip that stop and note it |
| The executor can obtain 6 product images | Current catalog images are public Vercel Blob URLs | No access or images deleted | Use `imageUrl: null` (the `ProductImage` icon fallback) and leave a note for Flavio |

## 7. Phased execution plan

### Phase 1 — Persistence
**Objective:** store and expose the invitation answer.
**Tasks:** T1, T2, T3.
**Dependencies:** none.
**Validation / done:** migration applies on a fresh DB; `pnpm typecheck` passes; calling `profile.answerTutorialInvitation` twice sets the timestamp once.

### Phase 2 — Extract the coupled views (refactor)
**Objective:** make mini-cart, Tu pedido and order detail renderable from props.
**Tasks:** T4, T5, T6.
**Dependencies:** none (parallel to Phase 1).
**Validation / done:** `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` green. Manual check: add from catalog → mini-cart identical; `/cart` identical including merge-blocked and at-checkout states; `/my-orders/[id]` identical for a Mercado Pago and an external-payment order.

### Phase 3 — Pure tutorial core
**Objective:** scripts, targets, URL params, fixtures, invitation decision, all unit-tested.
**Tasks:** T7, T8, T9.
**Dependencies:** T6 (fixtures build the journey with the same helper the order detail page uses).
**Validation / done:** `pnpm test` green with the new tests.

### Phase 4 — Spotlight engine
**Objective:** backdrop + popover component, driven by props.
**Tasks:** T10.
**Dependencies:** T7 (target registry type).
**Validation / done:** typecheck; manual check in Phase 5.

### Phase 5 — Tutorial route and scenes
**Objective:** `/tutorial` plays both versions end to end on desktop and mobile.
**Tasks:** T11, T12, T13, T14.
**Dependencies:** Phases 2–4.
**Validation / done:** manual run of both versions at 1280 px and 375 px. Every step highlights a visible element; reload keeps the step; Esc returns to `volver`; the real cart is untouched.

### Phase 6 — Entry points on real pages
**Objective:** help menu and tutorial invitation.
**Tasks:** T15, T16.
**Dependencies:** Phase 1 (mutation, session field), T8 (decision), Phase 5 (route exists).
**Validation / done:** a fresh user sees the invitation on `/` and not on `/checkout`, and never again after answering; the help menu works for guests.

### Phase 7 — Glossary, QA, e2e
**Objective:** durable references and coverage.
**Tasks:** T17, T18, T19.
**Dependencies:** Phases 5–6.
**Validation / done:** `pnpm test`, `pnpm test:e2e`, `pnpm check` green.

## 8. Task breakdown

### T1 — `User.tutorialInvitationAnsweredAt` column
- **Files:** `prisma/schema.prisma`; `prisma/migrations/20261106000000_user_tutorial_invitation/migration.sql` `[NEW]`
- **Symbols / signatures:** `model User { … tutorialInvitationAnsweredAt DateTime? }`
- **Change:** add the nullable field after `deleted` (no `@map`, consistent with `createdAt`). Migration: a single `ALTER TABLE "user" ADD COLUMN "tutorialInvitationAnsweredAt" TIMESTAMP(3);`, with a header comment in the style of the delivery-preference migration: additive, no backfill on purpose, so existing users get the invitation once.
- **Mirror this pattern:** `prisma/migrations/20261009000000_customer_delivery_preference/migration.sql`
- **Depends on:** —
- **Acceptance:** `pnpm db:migrate-dev` applies cleanly; `pnpm db:generate` regenerates the client; the column is null for all existing rows.
- **Pitfalls:** do not add a default; `NULL` means "not answered yet".

### T2 — Expose the field on the session
- **Files:** `src/server/better-auth/config.ts`
- **Symbols / signatures:** `user.additionalFields.tutorialInvitationAnsweredAt: { type: "date", required: false, input: false }`
- **Change:** declare the field beside `dob`. `input: false` so clients cannot set it through better-auth endpoints.
- **Depends on:** T1
- **Acceptance:** `pnpm typecheck` passes and `Session["user"]` has `tutorialInvitationAnsweredAt?: Date | null`.
- **Pitfalls:** don't add it to `profileSelect` / `profileSchema` in `profile.router.ts`; the profile output must not change.

### T3 — Mutation `profile.answerTutorialInvitation`
- **Files:** `src/server/api/routers/profile.router.ts`
- **Symbols / signatures:** `answerTutorialInvitation: protectedProcedure.mutation(async ({ ctx }) => …)`, no input, returns `void` (or `{ ok: true }`).
- **Change:** `ctx.db.user.updateMany({ where: { id: ctx.session.user.id, tutorialInvitationAnsweredAt: null }, data: { tutorialInvitationAnsweredAt: new Date() } })`. Idempotent: a second call (another device, double click) changes nothing and doesn't throw.
- **Mirror this pattern:** `profile.update` in the same file.
- **Depends on:** T1
- **Acceptance:** two calls leave the first timestamp intact; an unauthenticated call is rejected by `protectedProcedure`.
- **Pitfalls:** only the caller's own row; no input means no way to target another user.

### T4 — Extract `CartSheetView`
- **Files:** `src/features/cart/_components/cart-sheet-view.tsx` `[NEW]`; `src/features/cart/_components/cart-sheet.tsx`
- **Symbols / signatures:** `export function CartSheetView(props: { open: boolean; onOpenChange: (open: boolean) => void; modal?: boolean /* default true */; inert?: boolean; hasHydrated: boolean; cart: CartSnapshot; isAuthenticated: boolean; mergeBlocked: boolean; isPending: boolean; onDecrement, onIncrement, onQuantityCommit, onRemove /* CartLineRow handler types */; onNavigate: () => void /* today closeMiniCart */ })`
- **Change:** move the whole `<Sheet>…</Sheet>` JSX verbatim into the view. `modal` is passed to `Sheet`, and `inert` is applied to `SheetContent`. `CartSheet` keeps its store/hook reads and renders `<CartSheetView … />`.
- **Depends on:** —
- **Acceptance:** markup and behavior identical on real pages (manual check + `e2e/catalog-product-card.spec.ts`, `e2e/home-offer-quantity.spec.ts` green).
- **Pitfalls:** `SheetTitle`/`SheetDescription` need the Dialog context, so keep the `Sheet` root inside the view rather than extracting only the body. The `Link` CTAs keep `onClick={onNavigate}`.

### T5 — Extract `CartPageView`
- **Files:** `src/app/(storefront)/cart/_components/cart-page-view.tsx` `[NEW]`; `src/app/(storefront)/cart/_components/cart-client.tsx`
- **Symbols / signatures:** `export function CartPageView(props: { hasHydrated: boolean; cart: CartSnapshot; isAuthenticated: boolean; isPending: boolean; mergeBlocked: boolean; mergeBlockedMessage: string | null; onDecrement, onIncrement, onQuantityCommit, onRemove, onClear, onLeaveCheckout; onDiscardPendingGuestItems: () => void })`
- **Change:** move the `<main>…</main>` JSX verbatim, including `CartLoadingState` usage, the empty state and the disabled rule (`isPending || cart.status === "atCheckout" || mergeBlocked`). `CartClient` passes `discardPendingGuestItems`.
- **Depends on:** —
- **Acceptance:** `/cart` identical in empty, filled, merge-blocked and at-checkout states.
- **Pitfalls:** `CartLoadingState` is local to `cart-client.tsx`; move it with the view.

### T6 — Extract `OrderDetailView` and the journey input builder
- **Files:** `src/app/(storefront)/my-orders/[orderId]/_components/order-detail-view.tsx` `[NEW]`; `src/app/(storefront)/my-orders/[orderId]/page.tsx`
- **Symbols / signatures:**
  - `export function OrderDetailView(props: { order: OrderDetail; journeyView: CustomerOrderJourneyView; externalPaymentSlot?: React.ReactNode })`
  - `export function toOrderJourneyItemInputs(order: OrderDetail, itemTimelines: UserOrderItemTimeline[]): CustomerOrderJourneyItemInput[]`
- **Change:** move the returned `<main>` JSX and the snapshot helpers (`asRecord`, `getNestedRecord`, `getString`, `getProductName`, `getLineTotal`, `getCurrency`, `getAddressLine`, `itemQuantityLabel`, …) into the view module. The page keeps `requireUser`, id parsing, `notFound`, the two `api` calls, builds `journeyView = buildCustomerOrderJourneyView(toOrderJourneyItemInputs(order, itemTimelines))`, and passes `<ExternalPaymentPanel … />` as `externalPaymentSlot` when `order.externalPayment` is set.
- **Depends on:** —
- **Acceptance:** `/my-orders/[id]` identical for Mercado Pago and external-payment orders; invalid id still 404s.
- **Pitfalls:** the view file must not import `~/trpc/server`, `~/server/*` or anything `server-only`, because the tutorial imports it from a client tree. No `"use client"` directive is needed; it has no hooks.

### T7 — Tutorial script, scenes, targets and URL params
- **Files:** `src/features/tutorial/tutorial-script.ts` `[NEW]`; `src/features/tutorial/tutorial-script.test.ts` `[NEW]`
- **Symbols / signatures:**
  - `export type TutorialVersion = "rapido" | "completo"`
  - `export const TUTORIAL_TARGETS = [ "home-how-it-works", "catalog-categories", "product-card", "product-purchase", "mini-cart", "cart-lines", "cart-summary", "checkout-stepper", "checkout-delivery", "checkout-payment", "checkout-review", "checkout-result", "my-orders-list", "order-journey" ] as const;` `export type TutorialTargetId = (typeof TUTORIAL_TARGETS)[number]`
  - `export function tutorialTarget(id: TutorialTargetId): { "data-tutorial-target": TutorialTargetId }`
  - `export type TutorialScene = { id: "home" } | { id: "catalog"; added: boolean /* Almendra in cart + mini-cart open */ } | { id: "cart" } | { id: "checkout"; step: CheckoutStepId } | { id: "checkoutResult" } | { id: "myOrders" } | { id: "orderDetail"; journey: UserTrackingStageKey | "delivered" }`
  - `export type TutorialStep = { id: string; scene: TutorialScene; target: TutorialTargetId | null; title: string; body: string; closing?: true }`
  - `export const tutorialScripts: Record<TutorialVersion, TutorialStep[]>`
  - `export const tutorialVersionMeta: Record<TutorialVersion, { label: string; duration: string }>` with `{ rapido: { label: "Tutorial rápido", duration: "1 min" }, completo: { label: "Tutorial completo", duration: "3 min" } }`
  - `export function parseTutorialParams(params: { version?: string | string[]; paso?: string | string[]; volver?: string | string[] }): { version: TutorialVersion; stepIndex: number /* 0-based, clamped */; returnTo: string }`
  - `export function tutorialHref(input: { version: TutorialVersion; stepIndex?: number; returnTo?: string }): string`
- **Change:** encode the two scripts from the table below (the copy is a draft; keep it in this file so it is reviewable in one place). Invalid/missing `version` → `"rapido"`. `paso` is 1-based in the URL; NaN/≤0 → first step, too large → last. `returnTo` accepts only paths starting with `/`, not `//`, without `://`, and not starting with `/tutorial`; otherwise `/`. These are the same rules as `getSafeCallbackURL` in `src/app/(storefront)/login/page.tsx`, re-implemented here rather than refactoring login.
- **Mirror this pattern:** `src/app/(storefront)/checkout/_components/checkout-steps.ts`
- **Depends on:** —
- **Acceptance (tests):** express has 12 steps and complete 21; ids are unique per script; the first step has `target: null` and the last has `closing: true`; every non-closing middle step has a target; the complete script visits `orderDetail` once per stage key, in `userTrackingStageDefinitions` order; params parsing covers `paso=0`, `paso=99`, `paso=abc`, `version=xyz`, `volver=//evil.com`, `volver=https://x`, `volver=/tutorial`, `volver=/products` (accepted).
- **Pitfalls:** copy must follow the glossary: "Tu pedido" (never "carrito"), "Mis pedidos", "punto de retiro", "pago externo". The tutorial is "tutorial", never "recorrido".

**Draft scripts.** Express = rows marked **E**, complete = rows marked **C**. A row marked E+C appears in both.

| # E / # C | Scene | Target | Title | Body |
| --- | --- | --- | --- | --- |
| 1 / 1 | home | — | Así es una compra en Coco | Te mostramos una compra completa, desde el catálogo hasta la entrega. Todo es de ejemplo: no se compra ni se guarda nada. |
| 2 / 2 | home | home-how-it-works | Comprás junto a otros vecinos | CoCo junta los pedidos de todos los vecinos y hace una sola compra al por mayor. Cerramos los miércoles y la mercadería llega en 7 a 10 días. |
| — / 3 | catalog | catalog-categories | Encontrá lo que buscás | Usá el buscador o las categorías para recorrer el catálogo. |
| 3 / 4 | catalog | product-card | Precio por paso | $ 11.300 es lo que pagás por 500 g, el paso en que se vende. El precio por kg de abajo te sirve para comparar productos. |
| — / 5 | catalog | product-purchase | Cantidad de a pasos | Con Sumar agregás el mínimo, 500 g. Después, con − y + cambiás la cantidad de a 500 g, y el tachito lo saca de tu pedido. |
| 4 / 6 | catalog (added) | mini-cart | Tu pedido se arma acá | Al agregar, se abre Tu pedido. Podés cambiar cantidades, seguir comprando o ver el pedido completo. |
| — / 7 | cart | cart-lines | Cambiá lo que quieras | Hasta que empezás a pagar, podés cambiar cantidades o sacar productos. Para el ejemplo sumamos dos productos más. |
| 5 / 8 | cart | cart-summary | Listo para pagar | Acá ves el total estimado. Para pagar te pedimos ingresar con tu cuenta de Google. |
| 6 / 9 | checkout (order) | checkout-stepper | Cuatro pasos | Pedido, Entrega, Pago y Confirmar. Podés volver a cualquier paso antes de confirmar. |
| 7 / 10 | checkout (delivery) | checkout-delivery | Cómo lo recibís | Te lo llevamos a tu dirección o lo retirás en un punto de retiro. Las dos opciones cuestan lo mismo. |
| 8 / 11 | checkout (payment) | checkout-payment | Cómo pagás | Con Mercado Pago pagás con tarjeta, dinero en cuenta o efectivo. Si preferís transferir, elegí pago externo y te damos los datos. |
| — / 12 | checkout (review) | checkout-review | Confirmás y pagás | Revisás todo, aceptás los términos y pagás. Al confirmar, los precios y las cantidades quedan fijos. |
| 9 / 13 | checkoutResult | checkout-result | Pago aprobado | Tu pedido quedó confirmado. Desde ahora lo seguís en Mis pedidos. |
| 10 / 14 | myOrders | my-orders-list | Mis pedidos | Acá están todos tus pedidos con su estado. |
| 11 / — | orderDetail (shipping) | order-journey | Seguís cada etapa | Tu pedido pasa por seis etapas, de la confirmación a la entrega, y te avisamos cada cambio. Suele tardar entre 7 y 10 días desde la preparación. |
| — / 15 | orderDetail (submitted) | order-journey | Pedido confirmado | Tu pedido quedó registrado junto al de otros vecinos. |
| — / 16 | orderDetail (preparation) | order-journey | Preparación | CoCo agrupa los pedidos de todos para armar una sola compra grande. |
| — / 17 | orderDetail (supplier) | order-journey | Proveedor | Le compramos al proveedor la cantidad total. El pedido sale desde origen, muchas veces desde otra provincia. |
| — / 18 | orderDetail (packaging) | order-journey | Empaque | Se arma el paquete con tus productos, listo para viajar. |
| — / 19 | orderDetail (shipping) | order-journey | Envío | El camión cruza a Chile, atraviesa el Estrecho de Magallanes en balsa, vuelve a la Argentina y cruza la cordillera hasta Ushuaia. |
| — / 20 | orderDetail (delivery) | order-journey | Entrega | Te lo llevamos a tu dirección. Si elegiste un punto de retiro, lo buscás en el horario indicado. |
| 12 / 21 | orderDetail (delivered) | — | ¡Listo! | E: "Así es una compra en Coco. ¿Querés ver cada etapa en detalle?" — actions [Ver el tutorial completo] [Terminar]. C: "Ya viste todo el camino de una compra. Cuando quieras, armá tu pedido." — actions [Ir al catálogo] [Terminar]. |

### T8 — Tutorial invitation decision
- **Files:** `src/features/tutorial/tutorial-invitation.decision.ts` `[NEW]`; `src/features/tutorial/tutorial-invitation.decision.test.ts` `[NEW]`
- **Symbols / signatures:** `export function isTutorialInvitationEligible(user: { active: boolean; deleted: boolean; tutorialInvitationAnsweredAt?: Date | null } | null | undefined): boolean` and `export function shouldShowTutorialInvitation(input: { eligible: boolean; answeredLocally: boolean; pathname: string }): boolean`
- **Change:** eligible = user exists, `active`, not `deleted`, `tutorialInvitationAnsweredAt == null`. Show = eligible, not answered locally, and pathname not excluded. Excluded: `/login` and `/login/*`, `/checkout` and `/checkout/*` (covers `/checkout/mercadopago/success|failure|pending`).
- **Mirror this pattern:** `src/features/cart/cart-bootstrap.decision.ts`
- **Depends on:** T2 (type of the session field)
- **Acceptance (tests):** guest → false; inactive or deleted → false; answered → false; `/`, `/products`, `/my-orders`, `/cart` → true; `/login`, `/checkout`, `/checkout/mercadopago/success` → false; `/checkoutx` → true (prefix check by segment).
- **Pitfalls:** match by path segment, not `startsWith("/checkout")` alone.

### T9 — Fixture dataset
- **Files:** `src/features/tutorial/tutorial-fixtures.ts` `[NEW]`; `src/features/tutorial/tutorial-fixtures.test.ts` `[NEW]`; `public/tutorial/*.webp` `[NEW]` (see open question)
- **Symbols / signatures:** `export function buildTutorialFixtures(now: Date): TutorialFixtures` returning `{ catalogProducts: CatalogProductListItem[]; cartAfterFirstAdd: CartSnapshot; cart: CartSnapshot; checkoutState: CheckoutState; deliverySelection: CheckoutDeliverySelection; paymentMethod: CheckoutPaymentMethod; paymentResult: CheckoutPaymentResult; orderList: OrderListOutput; orderDetail(journey: UserTrackingStageKey | "delivered"): { order: OrderDetail; timelines: UserOrderItemTimeline[] } }`.
- **Change:** example data, all ids negative or clearly fake, prices fixed:
  - Categories: Frutos secos, Frutas secas, Almacén. Products (unit price → step price): Almendra Non Pareil $ 22.600/kg, step 0,5 → $ 11.300 por 500 g; Nuez mariposa extra light $ 19.600/kg → $ 9.800; Castaña de cajú tostada sin sal $ 24.800/kg → $ 12.400; Dátil Medjool $ 29.800/kg → $ 14.900; Mix de frutos secos deportivo $ 17.400/kg → $ 8.700; Miel pura, presentation frasco "500 g", $ 6.500 por frasco (comparison $ 13.000 / kg). No offer discounts.
  - `cartAfterFirstAdd`: Almendra 0,5 kg. `cart`: Almendra 0,5 kg + Dátil 0,5 kg + Mix 0,5 kg → total $ 34.900.
  - `checkoutState`: one address "Av. San Martín 1234, Ushuaia, Tierra del Fuego, 9410", one pickup point "Punto de retiro Centro (ejemplo)", payment methods Mercado Pago + Pago externo (providers `mercadopago` and `external`, so `PAYMENT_PROVIDER_COPY` renders the real copy), and a short example terms text. The delivery selection is home delivery to that address, and the payment method is Mercado Pago.
  - `paymentResult`: `status: "succeeded"`. `orderList`: one order with code `EJEMPLO`, created `now − 1 day`.
  - `orderDetail(journey)`: order status `processing` (or `completed` for `"delivered"`), home delivery, Mercado Pago transaction approved. Timelines for the 3 items have stages before `journey` `completed`, `journey` `current`, and later stages `pending` (all `completed` for `"delivered"`). Stage dates step back from `now` by one day each, no notices.
- **Mirror this pattern:** none; validate against the schemas listed in §4.
- **Depends on:** T6 (`toOrderJourneyItemInputs`)
- **Acceptance (tests, with a fixed `now`):** each fixture parses with its zod output schema (`catalogProductListOutputSchema`, `cartSnapshotSchema`, `checkoutStateSchema`, `checkoutPaymentResultSchema`, `orderListOutputSchema`, `orderDetailSchema`, `userOrderItemTimelinesOutputSchema`). Cart line totals and the cart total agree with the shared price helpers (no hand-typed totals that disagree with what `CartLineRow` computes). For every stage key, `buildCustomerOrderJourneyView(toOrderJourneyItemInputs(...))` returns `mode: "unified"` with exactly that stage current. For `"delivered"` it returns no current stage and the order status `completed`. The step price label for Almendra renders "$ 11.300" / "por 500 g" through the existing helper.
- **Pitfalls:** derive every amount through the same helpers the cart uses, so fixtures never contradict the UI. Product and price snapshots in `OrderDetail` must use the shape the snapshot readers expect (`productSnapshot.product.name`, `priceSnapshot.lineTotal` / `currency`, `readSnapshotQuantityUnit`), otherwise the view renders "-" silently. Dates come from `now`, never `new Date()` inside the module.

### T10 — Spotlight engine
- **Files:** `src/features/tutorial/_components/tutorial-spotlight.tsx` `[NEW]`
- **Symbols / signatures:** `export function TutorialSpotlight(props: { stepKey: string; targetId: TutorialTargetId | null; title: string; body: string; position: { index: number; total: number }; canGoBack: boolean; onBack: () => void; onNext: () => void; onExit: () => void; actions?: Array<{ label: string; onSelect: () => void; variant?: "default" | "outline" }> /* closing step */ })`
- **Change:**
  - Find the target with `document.querySelectorAll('[data-tutorial-target="…"]')` and pick the first element with `getClientRects().length > 0`. That is how mobile/desktop duplicates resolve.
  - After the scene commits (`useLayoutEffect` keyed on `stepKey`), `scrollIntoView({ block: "center" })` (smooth unless reduced motion). Then measure the rect, and re-measure on `resize`, capture-phase `scroll`, a `ResizeObserver` on the target, and for ~400 ms after the step change to absorb the sheet's open animation.
  - Backdrop: a fixed full-viewport `<svg>` at `z-[60]` with a mask that cuts a rounded rect (8 px padding, 16 px radius) around the target. It is full dim when there is no target. It intercepts clicks and does nothing with them.
  - Popover: `Popover open modal` with `PopoverAnchor virtualRef` returning the measured rect, `PopoverContent` at `z-[70]`, `role="dialog"`, `aria-labelledby` the title and `aria-describedby` the body. `onInteractOutside` → `preventDefault`. `onEscapeKeyDown` → `preventDefault` + `onExit`. `onOpenAutoFocus` → focus "Siguiente" (or the first closing action).
  - Content: "N / total" plus a thin progress bar, title, body, ✕ (aria-label "Salir del tutorial"), "Atrás" (hidden when `!canGoBack`), "Siguiente", or `actions` on the closing step.
  - Without a target, render the content as a centered dialog.
  - Below `md`, dock the content to the bottom edge, or to the top when the target's center is in the lower half of the viewport, instead of anchoring.
  - ← / → on `keydown` call `onBack` / `onNext`.
  - Transitions only under `motion-safe:`.
- **Depends on:** T7
- **Acceptance:** typecheck. Behavior is verified in Phase 5 and the e2e spec.
- **Pitfalls:** Radix modal popover sets `pointer-events: none` on `body`, so anything that must stay clickable (the mode bar's exit) needs `pointer-events-auto`. A missing target (typo, element hidden at this breakpoint) must not crash: fall back to the centered layout and `console.warn` in development.

### T11 — Tutorial route and player
- **Files:** `src/app/tutorial/page.tsx` `[NEW]`; `src/features/tutorial/_components/tutorial-player.tsx` `[NEW]` (`"use client"`)
- **Symbols / signatures:** `export default async function TutorialPage({ searchParams }: { searchParams: Promise<{ version?: string | string[]; paso?: string | string[]; volver?: string | string[] }> })`; `export const metadata: Metadata = { title: "Tutorial | Coco", robots: { index: false, follow: false } }`; `export function TutorialPlayer(props: { version: TutorialVersion; initialStepIndex: number; returnTo: string; nowIso: string })`
- **Change:**
  - Page: `parseTutorialParams(await searchParams)` and render `<div className="font-sans" data-storefront=""><TutorialPlayer nowIso={new Date().toISOString()} … /></div>`. No session read, no tRPC.
  - Player: `useMemo(() => buildTutorialFixtures(new Date(nowIso)))`. Keep `stepIndex` in state. On change, `router.replace(tutorialHref(...), { scroll: false })`. Render `TutorialModeBar`, `TutorialNavbar` (cart count from the scene), `<div inert>{<TutorialScene …/>}</div>` and `TutorialSpotlight`.
  - Exit: `router.replace(returnTo)`. Express closing "Ver el tutorial completo": state reset to `completo`, step 0, URL replaced. Complete closing "Ir al catálogo": `router.replace("/products")`. "Terminar" = exit.
- **Depends on:** T7, T9, T10, T12, T13
- **Acceptance:** `/tutorial` (no params) starts the express at 1/12; `/tutorial?version=completo&paso=19` opens "Envío"; reload keeps the step; browser Back from step 5 returns to the page before the tutorial.
- **Pitfalls:** pass `now` from the server as a string to avoid hydration mismatches. Do not use `useSearchParams` (it would need a Suspense boundary); initial values come from the server. The route lives outside `(storefront)`, so `AnnouncementBar`, `AppNavbar`, `CartSheet` and the cart bootstrap never mount here. Keep it that way.

### T12 — Mode bar and simulated navbar
- **Files:** `src/features/tutorial/_components/tutorial-mode-bar.tsx` `[NEW]`; `src/features/tutorial/_components/tutorial-navbar.tsx` `[NEW]`
- **Symbols / signatures:** `TutorialModeBar({ onExit })`; `TutorialNavbar({ cartCount: number })`
- **Change:** the mode bar replaces the announcement bar: `bg-brand-ink`-style strip "Modo tutorial · datos de ejemplo" with a "Salir del tutorial" button, positioned above the backdrop (`relative z-[65]`, `pointer-events-auto`). The navbar is a static replica of `AppNavbar`'s layout (logo, "Catálogo", a non-functional search field, help icon, cart button with `cartCount` badge, generic avatar, mobile menu icon), all inside the inert area.
- **Mirror this pattern:** `src/components/app-navbar.tsx`, `src/components/announcement-bar.tsx`
- **Depends on:** —
- **Acceptance:** visually matches the real navbar at 1280 px and 375 px.
- **Pitfalls:** don't import `CartNavButton`, `UserMenu`, `NavbarSearch` or `MobileNavMenu`; they read stores, the router or the session.

### T13 — Scenes
- **Files:** `src/features/tutorial/_components/tutorial-scene.tsx` `[NEW]` plus `src/features/tutorial/_components/scenes/` `[NEW]`: `home-scene.tsx`, `catalog-scene.tsx`, `cart-scene.tsx`, `checkout-scene.tsx`, `checkout-result-scene.tsx`, `my-orders-scene.tsx`, `order-detail-scene.tsx`
- **Symbols / signatures:** `TutorialScene({ scene: TutorialScene; fixtures: TutorialFixtures })` switching on `scene.id`; each scene takes the fixture slice it needs.
- **Change:** every handler is a no-op. Wrap targets with `{...tutorialTarget(id)}` on a wrapping `div` around the real component.
  - home: `HomeHero hasOffers={false}` + `HowItWorksSection` (target `home-how-it-works`).
  - catalog: the `ProductsClient` layout recomposed from `CatalogToolbar`, `CatalogCategoryChips` (target `catalog-categories`), the desktop `CatalogFiltersSidebar` and `ProductGrid` with the 6 products. `inCartQuantity` for Almendra when `added`. Wrap the Almendra card with `product-card`; target its purchase block with `product-purchase` (wrap from the scene if `ProductGrid` can't be split; otherwise render that card separately). When `added`: `<CartSheetView open modal={false} inert onOpenChange={noop} cart={cartAfterFirstAdd} isAuthenticated hasHydrated …/>`, with `mini-cart` on its content.
  - cart: `CartPageView` with `cart`; `cart-lines` on the list and `cart-summary` on `CartSummary`. If wrapping inside the view isn't possible, add an optional `targets?: { lines?: object; summary?: object }` spread prop to `CartPageView`, which is the only allowed tutorial hook in a real view.
  - checkout: the `CheckoutClient` render shell with `CheckoutStepper` (`checkout-stepper`), the current step component (`checkout-delivery` / `checkout-payment` / `checkout-review`), `CheckoutSummary` and `CheckoutMobileBar` (rendered for fidelity, not targets).
  - checkoutResult: `CheckoutResultPanel` with `paymentResult` (`checkout-result`).
  - myOrders: `PageHeader` "Mis pedidos" + `MyOrdersClient` with `orderList` (`my-orders-list`).
  - orderDetail: `OrderDetailView` with the fixture order and `buildCustomerOrderJourneyView(toOrderJourneyItemInputs(...))`, with `order-journey` on the journey section, exposed the same way as in the cart scene if needed.
- **Depends on:** T4, T5, T6, T7, T9
- **Acceptance:** each target id from `TUTORIAL_TARGETS` is rendered by the scene its steps use (covered by the e2e spec walking every step); no tRPC request and no write to the cart's localStorage key while playing (verified in e2e).
- **Pitfalls:** the mini-cart `Sheet` portals to `body`, outside the inert wrapper, which is why `inert` goes on `SheetContent` itself. `MyOrdersClient` and other views render real `Link`s; inert prevents navigation, so don't remove the attribute "to make hover work". Layering: navbar `z-40` < sheet `z-50` < backdrop `z-[60]` < mode bar `z-[65]` < popover `z-[70]`.

### T14 — Scene/target wiring check
- **Files:** `src/features/tutorial/tutorial-script.test.ts`
- **Symbols / signatures:** an extra test block.
- **Change:** assert that each step's `(scene.id, target)` pair belongs to an explicit `targetsByScene` map exported from `tutorial-script.ts` (for example `checkout → ["checkout-stepper", "checkout-delivery", "checkout-payment", "checkout-review"]`), which the scenes also use to pick wrappers. This keeps script and scenes from drifting.
- **Depends on:** T7, T13
- **Acceptance:** test green; a step pointing at a target its scene doesn't render fails.

### T15 — Help menu in the navbar
- **Files:** `src/components/help-menu.tsx` `[NEW]` (`"use client"`); `src/components/app-navbar.tsx`
- **Symbols / signatures:** `export function HelpMenu()`
- **Change:** a `DropdownMenu` triggered by a ghost icon button `size-[42px] rounded-full` with `HelpCircleIcon` and `aria-label="Ayuda"`, matching the `UserMenu` trigger. Items:
  - "Tutorial rápido · 1 min" and "Tutorial completo · 3 min" → `Link` to `tutorialHref({ version, returnTo: usePathname() })`.
  - Separator.
  - "Preguntas frecuentes" → `/#preguntas-frecuentes`, "Contacto" → `/#contacto`.

  Mount it in `AppNavbar` as the first child of the `ml-auto` group, before `CartNavButton`, visible at all sizes.
- **Mirror this pattern:** `src/components/user-menu.tsx`
- **Depends on:** T7, T11
- **Acceptance:** guest and signed-in users see the icon on desktop and at 375 px without the navbar wrapping; the items navigate correctly; `volver` equals the current path.
- **Pitfalls:** use `usePathname` only (no `useSearchParams` in the layout tree). Check the 360 px width: logo + 4 icons must fit.

### T16 — Tutorial invitation
- **Files:** `src/features/tutorial/_components/tutorial-invitation.tsx` `[NEW]` (`"use client"`); `src/app/(storefront)/layout.tsx`
- **Symbols / signatures:** `export function TutorialInvitation({ eligible }: { eligible: boolean })`
- **Change:**
  - Layout: compute `eligible = isTutorialInvitationEligible(user)` and render `<TutorialInvitation eligible={eligible} />` after `CartSheet`.
  - Component: local `answered` state, `usePathname`, and render only when `shouldShowTutorialInvitation({ eligible, answeredLocally: answered, pathname })`. A fixed card, bottom-right on desktop (`max-w-sm`), bottom with side margins on mobile, `z-30`, `role="region"`, `aria-labelledby` its title.
  - Copy: title "¿Primera vez en Coco?", body "Te mostramos cómo es una compra en Coco, de punta a punta, con datos de ejemplo." Buttons: "Tutorial rápido · 1 min", "Tutorial completo · 3 min", "Ahora no", plus ✕ (= "Ahora no").
  - On any answer: set `answered`, call `api.profile.answerTutorialInvitation.useMutation()`. For the version buttons, `await mutateAsync()` (navigate anyway on error), then `router.push(tutorialHref({ version, returnTo: pathname }))`.
- **Depends on:** T2, T3, T8, T11
- **Acceptance:** a user with a null timestamp sees it on `/` and `/products`, not on `/checkout` or the MP return pages. After "Ahora no" it disappears and never returns, including on another browser. After picking a version it opens the tutorial and doesn't return. Guests never see it.
- **Pitfalls:** don't show it inside `/tutorial` (structurally guaranteed: different layout). It must not cover the mini-cart CTAs; the sheet's `z-50` is above it.

### T17 — Admin glossary entries
- **Files:** `src/features/admin/glossary/data/crosscutting.ts`
- **Symbols / signatures:** two `GlossaryEntry` objects: `concepto-tutorial` (label "Tutorial", term "Tutorial", aliases ["Onboarding", "Tour", "Demo", "Recorrido"]) and `concepto-invitacion-al-tutorial` (label "Invitación al tutorial", term "Tutorial invitation", aliases ["Popup de bienvenida"]), `kind: "concept"`, `section: "crosscutting"`.
- **Change:** Spanish definitions equivalent to the `CONTEXT.md` entries (§ Customer help).
- **Mirror this pattern:** `concepto-accion-rapida` in the same file.
- **Depends on:** —
- **Acceptance:** `src/features/admin/glossary/glossary.data.test.ts` green.
- **Pitfalls:** follow whatever constraints the data test imposes (slug format, required fields, `href`). Read it first.

### T18 — QA tickets
- **Files:** `scripts/qa-tickets.data.ts`; `scripts/qa-tickets.data.test.ts`
- **Symbols / signatures:** new `SECTION_L = "L. Tutorial del cliente"`; entries `code: 68` (help menu → Tutorial rápido: Siguiente/Atrás/✕/Esc/←→, reload keeps step, exit returns to origin), `69` (Tutorial completo: six tracking stages one by one, closing CTA "Ir al catálogo", real Tu pedido untouched), `70` (Tutorial invitation: first sign-in via checkout shows nothing on `/checkout` and MP return, shows on the next page, "Ahora no" never returns even on another browser). All `isRegressionPath: false`.
- **Change:** follow the file's step and precondition conventions. Update the count/range assertion in the data test (today "65 active tests with codes 1-67" → 68 with codes 1–70).
- **Depends on:** Phase 6
- **Acceptance:** `pnpm test` green.

### T19 — e2e spec
- **Files:** `e2e/customer-tutorial.spec.ts` `[NEW]`
- **Change:** as a guest:
  - Open `/products` → "Ayuda" → "Tutorial rápido". Expect a dialog "1 / 12". Siguiente → "2 / 12". Atrás → "1 / 12". ArrowRight → URL has `paso=2`. Reload → still "2 / 12". Escape → back on `/products`.
  - Walk the complete version with Siguiente to the end, asserting each step's dialog is visible and the highlighted target exists (`[data-tutorial-target]` visible). The last step shows "Ir al catálogo".
  - Before and after the walk, `localStorage.getItem(<CART_STORAGE_KEY>)` is unchanged.
  - Repeat the express walk at a 375 px viewport.
- **Mirror this pattern:** `e2e/smoke.spec.ts`
- **Depends on:** Phases 5–6
- **Acceptance:** `pnpm test:e2e` green.
- **Pitfalls:** the invitation needs a signed-in user and Google OAuth isn't automatable here. It is covered by the T8 unit tests and QA ticket 70, not e2e.

## 9. Cross-cutting concerns

- **Data / schema / migration / backfill:** one nullable column on `user`, additive, intentionally no backfill. No data migration.
- **Config / env / feature flags:** none. The invitation goes live for every eligible user on deploy (accepted).
- **Security / permissions:** `/tutorial` is public and touches no data. The mutation only writes the caller's row and takes no input. `volver` is validated as a same-origin path that isn't `/tutorial`. `tutorialInvitationAnsweredAt` is `input: false` in better-auth.
- **Observability (logs / metrics / tracing):** none by decision. A development-only `console.warn` when a step's target isn't found.

## 10. Pitfalls & gotchas (global)

- **Radix modal stacking.** A modal `Sheet` in the tutorial would trap focus and disable pointer events, fighting the popover. Always `modal={false}` + `inert` for the scene's mini-cart. The tutorial popover is the only modal layer.
- **Portals escape `inert`.** Anything a scene renders through a portal (Sheet) needs `inert` on the portaled content itself.
- **Never mount the real cart machinery under `/tutorial`** (`CartNavButton`, `CartSheet`, `useCartActions`, `useCartStore` writers). They bootstrap and sync the real cart with the server.
- **Hydration.** Fixture dates come from the server-provided `nowIso`; no `Date.now()` in render paths.
- **`useSearchParams` in layouts** forces a Suspense boundary; the help menu and invitation use `usePathname` only.
- **`data-storefront` wrapper** is required on `/tutorial` or the storefront fonts don't apply (including portals).
- **Extraction must be verbatim.** T4–T6 move JSX; any visual or copy change there is a regression. Review those diffs as moves.
- **Glossary language in copy.** "Tu pedido", never "carrito"; the tutorial is not a "recorrido".
- **Companion edits:** `pnpm db:generate` after T1; the mutation lives on the existing `profileRouter` (no `root.ts` change); the QA data test count; the glossary data test.

## 11. Testing & validation

- **Tests to add/update:**
  - `src/features/tutorial/tutorial-script.test.ts`: script shape, ids, targets per scene, params parsing, `returnTo` safety.
  - `src/features/tutorial/tutorial-invitation.decision.test.ts`: eligibility and path exclusions.
  - `src/features/tutorial/tutorial-fixtures.test.ts`: schema parsing, totals, journey per stage.
  - `e2e/customer-tutorial.spec.ts`: navigation, keyboard, reload, exit, mobile, real cart untouched.
  - `scripts/qa-tickets.data.test.ts`: updated count.
- **Commands:** `pnpm test`, `pnpm check`, `pnpm typecheck`, `pnpm test:e2e`, `pnpm build` (locally may need `SKIP_ENV_VALIDATION=1`, as in previous deliveries).
- **Manual checks / regression risks:** mini-cart, `/cart` (empty, filled, merge-blocked, at-checkout) and `/my-orders/[id]` (MP and external payment) unchanged after T4–T6. Both tutorial versions at 1280 px and 375 px. Invitation with a fresh user: sign in through checkout, no card on `/checkout` or the MP return page, card on the next page, gone after answering, gone on a second browser.
- **Success criteria:** all commands green and every Definition of done box checked.

## 12. Rollout, migration & rollback

- **Sequence:** apply the migration (`pnpm db:migrate`, as with previous migrations) before or with the deploy; the column is unused until the code ships. Deploy everything at once; no flag.
- **Compatibility:** old code ignores the column; new code treats `NULL` as "not answered".
- **Rollback:** revert the code. The column can stay (harmless) or be dropped later. Answers recorded before the rollback stay valid if the feature returns.
- **Post-release:** run QA tickets 68–70 on the deployed environment.

## 13. Documentation updates

- This plan: record execution (commit, deviations) in a final "Execution record" section and flip the status, as in `docs/plans/product-card-price-hierarchy.md`.
- **CONTEXT.md:** added section "Customer help" with **Tutorial** and **Tutorial invitation** (this session).
- **ADRs:** [ADR 0012](../adr/0012-tutorial-runs-in-simulated-scenes.md) "The tutorial plays in simulated scenes over example data, never on the real pages" (accepted 2026-11-06), indexed in `docs/README.md`.

## 14. Risks & trade-offs

| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| Recomposed shells (navbar, catalog layout, checkout shell) drift from the real pages | The tutorial shows an outdated UI | Medium | Low–medium | Shared views for the 3 coupled screens; pure leaves reused; e2e walks every step; drift review when those pages change |
| Fixtures stop matching the schemas | Tutorial renders "-" or crashes | Low | Medium | Fixture test parses everything through the real zod schemas |
| Popover hides the target on small screens | Step is unreadable | Medium | Medium | Bottom/top docking below `md`; manual 375 px pass; e2e at 375 px |
| Copy states facts that change (delivery times, route) | Misleads customers | Medium | Low | All copy in `tutorial-script.ts`; times match the FAQ in `home-content.ts` |
| Invitation feels intrusive | Bad first impression | Low | Low | Non-blocking, once per user, never on checkout |
| Extraction refactor regresses a real page | Customer-facing bug | Low | High | Verbatim moves, e2e + manual pass before Phase 3 |

## 15. Open questions

- **Blocking:** none.
- **Non-blocking (resolve during execution):**
  - Product images for the 6 example products. Default: copy the current catalog images of the matching products into `public/tutorial/` (WebP, ≤ 80 KB each). If they can't be obtained, use `imageUrl: null` (icon placeholder) and flag it in the execution record for Flavio to supply.
  - Final copy review. Default: ship the draft in T7; Flavio edits `tutorial-script.ts` afterwards.
- **Optional refinements:**
  - "Ver tutorial" entry in the mobile sheet "Explorá Coco".
  - Usage metrics, and the pickup point / external payment stops in the complete version.

## 16. Definition of done

- [x] `User.tutorialInvitationAnsweredAt` exists, migration applied, field on `session.user`.
- [x] `profile.answerTutorialInvitation` is idempotent and protected.
- [x] `CartSheetView`, `CartPageView`, `OrderDetailView` extracted; real mini-cart, `/cart` and `/my-orders/[id]` unchanged. *(Verified as moves and by e2e; the signed-in manual pass is still open.)*
- [x] `/tutorial` plays the express (12 steps) and complete (21 steps) versions with Siguiente/Atrás/✕, ← → Esc, at 1280 px and 375 px.
- [x] Reload keeps the step; browser Back and exit return to the origin page.
- [x] Playing the tutorial makes no tRPC request and leaves the real cart's localStorage entry unchanged.
- [x] Help icon with the 4-item menu on every storefront page, guests included.
- [ ] Invitation shown once per user, never on `/login`, `/checkout`, `/checkout/mercadopago/*`; any answer persists across devices. *(Implemented and unit-tested; the signed-in run is QA ticket 70, after the migration.)*
- [x] Glossary dataset entries added; `CONTEXT.md` updated.
- [x] QA tickets 68–70 added and the data test updated.
- [x] `pnpm test`, `pnpm check`, `pnpm typecheck`, `pnpm test:e2e`, `pnpm build` pass. *(See the notes on `check` and `build` in the Execution record.)*

## 17. Instructions for the executing agent

- Use this plan as the primary source. Read first: `docs/adr/0012-tutorial-runs-in-simulated-scenes.md`, `CONTEXT.md` (§ Catalog and cart, § Customer help), `src/app/(storefront)/layout.tsx`, `src/components/app-navbar.tsx`, `src/features/cart/_components/cart-sheet.tsx`, `src/app/(storefront)/cart/_components/cart-client.tsx`, `src/app/(storefront)/my-orders/[orderId]/page.tsx`, `src/app/(storefront)/checkout/_components/checkout-client.tsx`, `src/app/(storefront)/checkout/_components/checkout-steps.ts`, `src/features/tracking/customer-order-journey.ts`, `src/schemas/{catalog,cart,checkout,tracking}.schemas.ts`.
- Respect these settled decisions: simulated scenes over fixtures at `/tutorial`; invitation instead of auto-start, once per user, never on login/checkout/MP return; no backfill; help icon with menu; two versions chosen up front; tour-driven interaction only; in-house engine on Radix; extract exactly the three coupled views; home delivery + Mercado Pago only.
- Do not change: anything listed under "Must not change / break" (§3). No tour library. No tRPC or cart-store usage under `/tutorial`.
- Verify before modifying: that each "pure" component in §4 still has no data hook; the better-auth `additionalFields` date type; `PopoverAnchor` `virtualRef` support; the constraints in `glossary.data.test.ts` and `qa-tickets.data.test.ts`.
- Execute phases in order; Phases 1 and 2 may run in parallel. Honor task dependencies.
- Implement at the level specified. If a blocking question appears, stop and ask; for non-blocking gaps, proceed on the stated default and record it in the execution record.

## Execution record

**Status:** Done 2026-11-06 (q-code-implement), base `624389e`, commit `550a414` pushed to `main`. Flavio applied the migration on 2026-11-06 to the Neon database in `.env`. `migrate deploy` fails with P3005 there (no migration history), so it ran as a script with `prisma db execute`; the column was then checked in `information_schema` (nullable `timestamp`).

**Change summary.**
- **Persistence.**
  - `User.tutorialInvitationAnsweredAt` plus the migration `20261106000000_user_tutorial_invitation`: nullable, no default, no backfill.
  - The field is declared in better-auth `additionalFields` (`input: false`).
  - `profile.answerTutorialInvitation` is a protected, inputless `updateMany` guarded on `null`, so the first answer wins. Covered by `profile.router.test.ts`.
- **Extractions (verbatim moves).**
  - `CartSheetView` (`cart-sheet-view.tsx`, adds optional `modal` and `inert`), `CartPageView` (`cart-page-view.tsx`) and `OrderDetailView` + `toOrderJourneyItemInputs` (`my-orders/[orderId]/_components/order-detail-view.tsx`).
  - The three containers now read their stores or queries and render the views.
  - Each view takes an optional `targets` prop of `data-*` attributes. Without it, the markup is identical to before.
- **Pure core** (`src/features/tutorial/`):
  - `tutorial-script.ts`: versions, the 12- and 21-step scripts with the draft copy, scenes, `targetsByScene`, URL parsing and `tutorialHref`.
  - `tutorial-invitation.decision.ts`.
  - `tutorial-fixtures.ts`: built with the cart's own helpers and validated against the real zod output schemas.
- **Engine.** `tutorial-spotlight.tsx`:
  - SVG mask backdrop with a cut-out, over a Radix modal `Popover` anchored by `virtualRef`.
  - Window-capture keys (← → Esc), focus moves to the primary action, and motion is reduced when the user asks for it.
  - The popover takes the first side of the target with room for it. On phones, or when no side has room, it docks to the viewport edge away from the target.
  - Targets are measured through `display: contents` wrappers, and the window is scrolled by the measured rect.
- **Route.**
  - `src/app/tutorial/page.tsx` sits outside `(storefront)`, with `noindex`, no session and no API calls.
  - It renders `TutorialPlayer`, `TutorialModeBar`, `TutorialNavbar` (a still picture of the navbar) and the scenes under `inert`.
- **Entry points.**
  - `HelpMenu` is mounted first in the `AppNavbar` right group.
  - `TutorialInvitation` is mounted in the storefront layout.
- **Companions.**
  - Glossary entries `concepto-tutorial` and `concepto-invitacion-al-tutorial`.
  - QA tickets 68–70 (section L) in `scripts/qa-tickets.data.ts`, mirrored in `docs/qa/qa-ciclo-de-vida.md`, with the data test now asserting 68 tickets, codes 1–70.
  - Five product images (WebP, 20–30 KB) in `public/tutorial/`.
  - `e2e/customer-tutorial.spec.ts`.

**Acceptance.**

| Criterion (§16) | Result |
| --- | --- |
| Column, migration, session field | Met. The migration is applied and the column verified; the typecheck shows the field reaching `isTutorialInvitationEligible(user)`. |
| Mutation idempotent and protected | Met (unit test). |
| Three views extracted, real pages unchanged | Met. The views were checked as moves against `HEAD`, and the e2e catalog, home and smoke specs pass. The manual signed-in checks are still open: merge-blocked and at-checkout on `/cart`, and external payment on `/my-orders/[id]`. |
| Both versions with keys, at 1280 px and 375 px | Met. The e2e walks the 21 complete steps at desktop size and the 12 express steps at 375 px. On every targeted step it asserts that the cut-out exists and lies inside the viewport. Every step was also screenshotted at both sizes. |
| Reload keeps the step; Back and exit return to origin | Met (e2e). |
| No tRPC; real cart's localStorage unchanged | Met (e2e records `/api/trpc` requests and compares `coco.cart.v1`). |
| Help icon, 4 items, guests, 360 px | Met (e2e). |
| Invitation once per user, never on login, checkout or the payment return | Implemented, and the decision is unit-tested. The signed-in run is QA ticket 70, after the migration. |
| Glossary entries, `CONTEXT.md` | Met. Flavio wrote the `CONTEXT.md` entries in a parallel session. |
| QA tickets 68–70 | Met. |
| All commands green | Met, with the notes under Test evidence. |

**Test evidence.**
- `pnpm test`: 130 files, 1919 tests passed, 4 skipped (the skips are pre-existing). This includes:
  - the script, decision and fixture tests;
  - a server-render test that every step's scene renders its target (mutation-checked);
  - the profile router test.
- `pnpm typecheck` is clean.
- `biome check src scripts e2e prisma docs` is clean. Plain `pnpm check` fails only on the untracked `output/` folder, which predates this change.
- `pnpm test:e2e`: 30/30 passed. That is the 8 new tutorial specs plus the existing suite, which covers the mini-cart and the cart.
- `pnpm build` passes with `NODE_ENV=production SKIP_ENV_VALIDATION=1`. The local shell exports `NODE_ENV=development`, which breaks prerendering of Next's `/_global-error`; that is unrelated to this change.

**Mini review.**
- **`q-review-code`, standards: fail, now resolved.**
  - Blocker: open redirect through `volver`. `"/\t/evil.com"` passed the string checks, and the URL parser strips the tab, so the exit landed on `evil.com` (reproduced). `safeTutorialReturnTo` now also resolves the path against a probe origin, rejects anything off that origin, and returns the normalized path. Unit cases for tab, LF and CR were added, plus an e2e test with `%09`.
  - Applied: the closing actions are memoised; the cut-out also sets SVG geometry attributes (CSS geometry on `<rect>` may not work in WebKit); the invitation's ✕ is labelled "Cerrar invitación"; the navbar e2e asserts a real box.
  - Not applied:
    - The mode bar's exit is hidden from assistive tech while the modal popover is open (✕ and Esc remain).
    - After "Atrás", focus lands on "Siguiente".
    - The e2e cart check compares an empty guest cart.
    - `TutorialInvitation` has no component test.
- **`q-review-code`, specification: fail, now resolved.**
  - Blocker: `scrollIntoView` does nothing on `display: contents` wrappers, so on a phone some targets stayed off screen (How it works, the cart summary). The window now scrolls by the measured rect, and the e2e asserts the cut-out is on screen.
  - Applied:
    - The T14 check is now a scene render test (the mini-cart and the purchase block exist only in the browser and are covered by e2e).
    - The glossary definition no longer calls the tutorial "recorrido".
  - Recorded rather than changed: deviations 1–9 below were judged acceptable; the migration was applied afterwards.
- **`q-review-comments`:** about 56 comments in scope; 1 remove (narration on the seeds) and 1 rewrite (the invitation's failure note), both applied. Outcome: pass with findings.

**Deviations and decisions.**
1. **The URL syncs with `window.history.replaceState`, not `router.replace`.** Next's App Router integrates native history calls. Reload keeps the step and Back leaves the tutorial, as the plan asks. `router.replace` would make a server render on every step, re-rendering the page with a new `now`.
2. **Fixture ids are 990001 and up, not negative.** The zod output schemas require positive ids.
3. **The mini-cart and cart scenes are a guest's.** Their CTA reads "Registrarme o iniciar sesión", which matches the step copy "Para pagar te pedimos ingresar…". The simulated navbar shows the sign-in icon until checkout and a generic avatar from checkout on.
4. **The views take an optional `targets` prop.** It is needed on `CartSheetView` too, because the mini-cart portals. `CartPageView` and `OrderDetailView` wrap a `display: contents` div only when given targets.
5. **The `product-purchase` target is tagged at runtime** with a ref callback on the featured card's `[data-slot=card-content]`. `ProductCard` is unchanged.
6. **The T14 wiring check** is `targetsByScene` in the script test plus a server-render test of every step's scene.
7. **Product images:** the current catalog covers from `output/product-covers/2026-11-06/` were downscaled into `public/tutorial/` for Almendra, Nuez, Castaña de cajú, Dátil and Mix deportivo. **Miel pura has no cover, so it shows the icon placeholder. Flavio can supply one.**
8. **`volver` checks go beyond the login rules:** backslash, and resolution against a probe origin (see the mini review).
9. **The popover side is chosen by available room**, with edge docking when no side fits. The mini-cart is as tall as the viewport, and Radix only flips to the opposite side.

**Blockers.** None.

**Follow-ups.**
- Run QA tickets 68–70 once deployed. In ticket 70, also check the invitation after a browser Back from `/tutorial`. A reviewer suspects the cached storefront layout could show it again until a reload; this is unverified because it needs a signed-in user.
- Optional:
  - offset the scene's mini-cart below the mode bar (the bar covers its header);
  - restore focus to "Atrás" after going back;
  - seed one product before the e2e cart comparison;
  - harden the login callback with the same origin check (`login/page.tsx`, `login-form.tsx` have the same tab gap, outside this change's scope);
  - check the cut-out on Safari/iOS.
- Run `pnpm qa:seed` to load tickets 68–70 into `/admin/qa-tickets`.
