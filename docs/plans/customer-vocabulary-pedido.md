# Plan: "pedido" en toda la tienda del cliente (sin "carrito")

> **Status:** Working — simple grill 2026-10-09. Source: follow-up "ticket de vocabulario" opened by #79 in `docs/plans/qa-open-tickets-2026-10-report.md`. Decisions confirmed by Flavio.

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
