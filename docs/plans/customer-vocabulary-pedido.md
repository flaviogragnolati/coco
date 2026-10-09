# Plan: "pedido" en toda la tienda del cliente (sin "carrito")

> **Status:** Implemented 2026-10-09 (see Execution record) — simple grill 2026-10-09. Source: follow-up "ticket de vocabulario" opened by #79 in `docs/plans/qa-open-tickets-2026-10-report.md`. Decisions confirmed by Flavio.

## Objective

Use one word for what the customer builds before paying: **"pedido"** ("tu pedido"). After paying it shows up in **"Mis pedidos"** (unchanged). "Carrito" disappears from every customer-facing string. This resolves the mix between the home ("Sumar al pedido", "Ya tenés N en tu pedido") and the cart surfaces ("Tu carrito", "Abrir carrito", "Producto agregado al carrito").

## Alignment (decisions)

1. "Pedido" for everything; "Mis pedidos" keeps its name (user).
2. Catalog filter "Solo en carrito" → **"Solo en mi pedido"**; `/cart` page title **"Tu pedido"**, subtitle **"Lo que vas a pagar al confirmar"** (user).
3. Only customer-facing copy changes: routes (`/cart`), identifiers, types, enums, admin UI and admin glossary terminology stay as they are. The domain term in `CONTEXT.md` stays *Cart*; its Spanish-facing label becomes "Tu pedido".

## Scope

Customer-facing strings in: `src/app/(storefront)/**` (cart, checkout, products), `src/features/cart/**` (mini-cart, `use-cart-sync.ts` toasts, checkout start gate), `src/components/cart-nav-button.tsx`, `src/components/mobile-nav-menu.tsx` if it labels the cart, and customer-visible server messages in `checkout.service.ts`, `checkout-release.decision.ts`, `cart.service.ts`, `order-submission.service.ts`, plus customer-rendered labels in `tracking-display.ts` / `tracking-journey.ts` **only where the customer journey renders them** (check the call sites; if a label is shared with the admin, add a customer label instead of renaming the admin one).

Non-goals: admin screens (`src/app/admin/**`, `src/features/admin/**`, admin glossary data), `/cart` route, code identifiers, QA ticket texts, legal terms (`checkout-terms.ts` has no "carrito").

## Replacement guide

| Today | New |
|---|---|
| Carrito (titles, page `<title>` "Carrito \| Coco") | Tu pedido ("Tu pedido \| Coco") |
| Tu carrito / Tu carrito está vacío | Tu pedido / Tu pedido está vacío |
| Abrir carrito / Sincronizando carrito (aria) | Abrir tu pedido / Sincronizando tu pedido |
| Ver carrito completo / Ver carrito | Ver pedido completo / Ver tu pedido |
| Volver al carrito / Editar carrito | Volver a tu pedido / Editar pedido |
| Producto agregado al carrito / quitado del carrito | Producto agregado a tu pedido / quitado de tu pedido |
| Carrito vaciado / No se pudo vaciar el carrito | Pedido vaciado / No se pudo vaciar tu pedido |
| Agregar al carrito / En carrito (product detail) | Sumar al pedido / En tu pedido (matches the home card) |
| Solo en carrito | Solo en mi pedido |
| Carrito guardado en este browser | Pedido guardado en este navegador |
| …suma cantidades a tu carrito compartido (meta) | …sumá cantidades a tu pedido |
| Server messages "…carrito…" | same sentence with "tu pedido" / "el pedido" |
| `/cart` subtitle "Tu pedido mayorista compartido" | Lo que vas a pagar al confirmar |

Keep the existing voseo and accents; fix "esta" → "está" if touched. Where a sentence already contains "pedido" for the paid order (e.g. "Ya existe un pedido activo para este carrito"), rewrite it so it reads unambiguously ("Ya hay un pago en curso para tu pedido. Actualizá la página.").

## Steps

1. `CONTEXT.md`: Cart entry Spanish label (done in the grill).
2. Replace storefront and cart-feature strings per the guide; check every `grep -rni carrito src/app/(storefront) src/features/cart src/components` hit.
3. Customer-visible server messages (checkout, cart, release decision, order submission).
4. Tracking labels: only the customer path; leave admin labels.
5. Tests: update unit tests that assert the old strings (`checkout-release.decision.test.ts`, `tracking-journey.test.ts`, `home-content.test.ts` already guards the FAQ); add a guard test that customer copy modules contain no "carrito" where a natural module exists. Update e2e specs that match these strings (`e2e/**`).
6. Checks: typecheck, biome on touched files, full vitest.

## Edge cases

- Checkout files are also edited by the F1 delivery-preference work (step "Envío" → "Entrega"): implement this plan **after F1 merges** or rebase on it.
- Strings shared by admin and customer: split, don't rename the admin side.
- Screen-reader labels (aria) count as copy.

## Definition of done

`grep -rni "carrito"` over the customer scope returns no user-visible string (identifiers/comments excluded); admin unchanged; checks green; e2e specs updated.

## Execution record

**Status:** Done 2026-10-09 (q-code-implement), base `ffd231b` (F1 merged), commits `172b3b6`, `babdf33` + this record.

**Change summary.** Every customer-facing "carrito" now reads "pedido" per the replacement guide: mini-cart and navbar button (incl. aria/tooltip), `/cart` page (`<title>` "Tu pedido | Coco", h1 "Tu pedido", description "Lo que vas a pagar al confirmar."), cart summary, checkout client and order step ("Volver a tu pedido", "Editar pedido", empty states), catalog ("Solo en mi pedido", "En tu pedido", detail CTA "Sumar al pedido", `/products` meta), "Mis pedidos" empty state and order detail, `use-cart-sync.ts` toasts, the local-cart schema message, and customer-visible server messages in `cart.service.ts`, `checkout.service.ts`, `checkout-release.decision.ts`, `order-submission.service.ts`. The F1 "Entrega" components (`checkout-delivery-step.tsx`, `checkout-review-step.tsx`, `checkout-summary.tsx`, `selectable-tile.tsx`) had no "carrito" and needed no change. `CONTEXT.md` Leave checkout label is now "Volver a editar el pedido".

**Tracking split.** `trackingEventLabelMap.addedToCart` ("Producto agregado al carrito") is shared: admin timelines read it, and the customer `tracking.getOrderTimeline` returns it (no customer screen renders it today). A `customerTrackingEventLabelMap` (`tracking-display.ts`) overrides it with "Producto agregado a tu pedido" and `tracking-event.service.ts` uses it for the customer timeline and customer notices; the admin map is unchanged. `tracking-journey.ts` `dropped: "Item eliminado del carrito"` is only built by `buildAdminTrackingJourney` (admin cart-item detail) and stays.

**Acceptance.**

| Criterion | Result |
|---|---|
| No user-visible "carrito" in customer scope | Met. `grep -rni carrito "src/app/(storefront)" src/features/cart src/components` → 0 hits. Wider customer grep (also `src/features/{home,catalog,tracking}`, cart/checkout schemas, `src/server/services/{cart,checkout,payments,tracking}`, `src/shared/common`) leaves only admin-only labels (`trackingEventLabelMap`, admin journey outcome, admin cart-item "No encontramos ese item de carrito."), guard tests and one doc comment. |
| Admin unchanged | Met. No file under `src/app/admin/**`, `src/features/admin/**` or admin services touched. |
| Routes, identifiers, QA ticket texts unchanged | Met (`/cart`, `CART-…` codes, `scripts/qa-tickets.data.ts`, `docs/qa/**` untouched). |
| Unit tests updated + guard tests | Met. `checkout-release.decision.test.ts` asserts the new wording and "never says carrito"; `tracking-display.test.ts` guards the customer label map and pins the admin label. |
| e2e specs updated | No spec matched a changed string (`e2e/**` uses "Sumar al pedido" on the home only); nothing to update. Not run. |

**Test evidence.** `pnpm typecheck` clean; `pnpm vitest run` focused (3 files, 26 tests) and full `pnpm test` 99 files / 1522 tests passed; `biome check src` reports only pre-existing findings in untouched files (`src/components/ui/field.tsx`, `domain-event-publisher.ts`, `audit-log.service.ts`, `order-delivery-change-dialog.tsx`); touched files formatted.

**Mini review.**
- `q-review-code` — standards: pass with findings (1 suggestion: test titles "…is unchanged" and their note no longer described the pinned wording; applied). Specification: pass with findings (QA case texts now quote the old copy, kept by rule → follow-up; `/cart` header deviation below). Outcome: pass with findings.
- `q-review-comments` — 4 comments in scope: 3 keep (customer label map docstring; the two updated quotes of the checkout-start server message, ticket reference dropped), 1 blocker rewrite (stale "QA traces tickets 3 and 10 by quoting these strings; they are contract." in `checkout-release.decision.test.ts` → "Customer-facing wording: a change here is a copy decision, not a refactor."). Applied; outcome after fix: pass.

**Deviations and decisions.**
- `/cart` header: h1 "Tu pedido", description "Lo que vas a pagar al confirmar."; the "Carrito" eyebrow is dropped (it would repeat the title) and the old description "Revisá cantidades, subtotales estimados…" is replaced.
- Cart code label: cart summary "Carrito {code}" and order detail "Carrito de origen {cartCode}" both read "Código de armado {code}", so the pre-payment code is never called "Pedido" next to the paid order's own "Pedido ORD-…".
- "Ya existe un pedido activo para este carrito." → "Ya hay un pago en curso para tu pedido. Actualizá la página." (as the plan prescribes); release message "…antes de volver al carrito." → "…antes de volver a editarlo."
- Fixed while touched: "esta" → "está" (`cart.service.ts`), "browser" → "navegador", voseo in the `/products` meta.

**Follow-ups.**
- QA case texts still quote the old copy (tickets 6, 10, 11, 13, 19, 20, 29 in `scripts/qa-tickets.data.ts` and `docs/qa/qa-ciclo-de-vida.md`, e.g. "Tu carrito está vacío", "Vaciar carrito", "En carrito", "No encontramos un carrito activo…", "…solo permite carritos con una moneda.", "carrito de origen"). Out of scope by decision; the orchestrator should update them and rerun `pnpm qa:seed` after deploy.
- `/cart` metadata description still says "Revisa" (no voseo); untouched.
