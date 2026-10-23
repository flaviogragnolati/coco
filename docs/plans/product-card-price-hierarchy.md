# Implementation Plan: product card — step price first, compact layout, badge slots

> **Status:** Implemented 2026-10-23 (see Execution record), commit `573f722` on `main`. Feature grill 2026-10-23. Decisions confirmed by Flavio.

## 1. Objective & outcome

- **Done means:** every catalog and home product card leads with the **step price** ("$ 11.300 por 500 g"). The **comparison price** ("$ 22.600 / kg") sits below it, small and muted, and is left out when it would repeat the step price. The line total moves into the add button ("Agregar · $ 11.300") and follows the stepper. Catalog cards and home offer-grid cards use a compact layout (no description, 3:2 image, tighter spacing, one more column). Every card has a badge row over the image: the offer discount works as today, and there are slots for "Nuevo" and a favorite toggle that nothing turns on yet.
- **Why:** the card's numbers had the wrong emphasis. The step is what the customer actually adds, so its price is the useful headline. The per-kg price is only a yardstick for comparing products. The card was also too tall, and it has to make room for favorites, "new" and discount indicators that are coming.
- **For:** AI coding agent.
- **Upstream design doc:** none. Builds on the shared purchase panel (commits `7bc8a15`, `b33bc31`, `18bb23d`) and the unit-price model (#87, `docs/plans/qa-open-tickets-2026-10-11-report.md`).

## 2. Alignment reached

| Topic | Decision | Source |
| --- | --- | --- |
| Number hierarchy | Step price (#2) is the headline. The comparison price (#3) is a small muted line under it. The total (#1) goes under the stepper. ("#2 debajo del slider" was a typo for #1; "slider" means the existing − / + stepper, not a new range slider.) | user |
| Total placement | The total lives **inside the add button**: "Agregar · $ 11.300" / "Sumar al pedido · $ 11.300". The separate "Total $ X" line is removed visually and kept as a screen-reader live region. In the order, the button stays "Ver en tu pedido" with no amount. | user |
| Step = 1 kg / 1 L | When the step is exactly one kg or one litre (kg products with step 1, "bolsa 1 kg", "botella 1 L"), the comparison price equals the step price and is **not shown**. | default stated, not objected |
| Step label | Weight steps under 1 kg are written in grams ("por 500 g", not "por 0,5 kg"). A 1 kg step reads "por kg"; other weights "por 1,5 kg". Unit products read "por frasco 370 g" (step 1) or "por 6 frascos 370 g". | default stated, not objected |
| Comparison price, unit products | Parsed from the free-text presentation size when it is a number plus g/gr/kg/ml/cc/L ("370 g", "0,5 L"). Weights give "/ kg" and volumes "/ L". An unreadable size shows no comparison line. No schema change. | user |
| Compact card | Catalog grid and home offer grid: no description (it stays in the detail dialog), 3:2 image instead of 4:3, title `text-base` clamped to 2 lines, `Card size="sm"` spacing, stepper and button 40 px from `sm` up (44 px on mobile). One more column: catalog up to 4, home grid minimum column 220 px. Target height ~460 px (today ~600). | user |
| Not compacted | The home spotlight (hero) and the product detail dialog keep their size; they get the new price order only. | default stated with the compact question |
| Badges | Badge row over the image: status badges on the left ("Nuevo", then discount), favorite slot on the right. **Only the discount works** in this delivery. "Nuevo" (`isNew`) and favorites are prepared slots that no caller turns on. Favorites needs its own model, auth and API; "Nuevo" needs a criterion, because all 27 active products were created on 2026-10-16. | user |
| "Promociones" | Means the existing **offer discount** ("-15%"). No promotion concept is created. | user (glossary: Offer discount, _Avoid_ Promotion) |
| Discount display | The strikethrough shows the **undiscounted step price** next to the headline. The comparison price is the discounted one. | default (continues today's behavior on the new headline) |
| Similar products mini card | Shows the step price; the comparison price goes on a second muted line when present. | default |
| Fixed quantity (no step) | The step quantity falls back to the MOQ: "$ X por 6 frascos 370 g". The fixed-quantity line shows only the quantity, and the button carries the total. | default (no such terms in today's data) |

Glossary terms used: **Step price**, **Comparison price** (added to `CONTEXT.md` this session), **Unit price**, **Offer discount**, **Offer price**, **Presentation**, **Fixed quantity**, **MOQ**.

## 3. Scope

- **In scope:**
  - Price helpers: step price, comparison price, presentation-size parsing, step label, total amount.
  - Shared purchase panel: new price block, total in the action button, a `compact` size.
  - Compact `ProductCard` (catalog) and `HomeOfferCard` (home grid), a shared badge overlay, denser grids and a matching skeleton.
  - `ProductMiniCard` price.
  - Admin product preview (it renders the same cards).
  - Admin glossary dataset entries for the two new terms.
  - e2e specs and QA ticket texts that describe the card.
- **Out of scope / non-goals:**
  - Favorites: no model, API, toggle component or filter.
  - Any "Nuevo" criterion or admin flag; no caller passes `isNew`.
  - A promotion concept.
  - A range slider.
  - Cart, mini-cart, checkout and order views (they keep the unit price per line).
  - Any change to `calculateLineTotal`, `normalizeCartQuantity`, stepping rules, or the stored `moqPrice`/`stepPrice` columns.
  - Prisma schema, admin product form, price sheet.
  - Re-showing market saving (`SHOW_MARKET_SAVING` stays `false`).
- **Deferred:**
  - Favorites feature (fills the right slot).
  - "Nuevo" criterion (admin flag or date window, fills `isNew`).
  - A structured net-content field if parsing the presentation size proves too loose.
- **Must not change / break:**
  - What is charged: totals stay `calculateLineTotal` (offer unit price × normalized quantity, ADR 0008).
  - Adding to the order uses the stepper's quantity.
  - The in-order state ("Ya tenés … en tu pedido" + "Ver en tu pedido").
  - Image and name open the product detail.
  - Buttons of a row of cards stay aligned (`mt-auto` on the panel).
  - The home offers unit filter and `visibleCount` logic.
  - The price line keeps separate text nodes between its parts (fix `4b9348b`).

## 4. Current system context

- **Shared purchase panel:** [purchase-panel.tsx](../../src/features/catalog/_components/purchase-panel.tsx) holds `PurchasePrice`, `PurchaseActionButton`, `PurchasePanel` (sizes `default | hero`) and `usePurchaseQuantity`. Its pure logic is in [purchase-panel.ts](../../src/features/catalog/purchase-panel.ts) (`getPurchasePrice`, `getPurchasePanelMode`, `toOfferPricing`), tested in [purchase-panel.test.ts](../../src/features/catalog/purchase-panel.test.ts). Today the headline is the **unit price** ("$ 22.600 por kg"), and the stepper mode renders a visible `Total $ X` line (`getOfferTotalLabel`).
- **Formatters:** [home-formatters.ts](../../src/features/home/home-formatters.ts) — `OfferPricing` (a `Pick` of `HomeOffer` that does **not** include `step` today), `getOfferHeadlinePrice`, `getOfferStrikethroughPrice`, `getOfferDiscountLabel`, `getOfferTotalLabel`, `getOfferFixedQuantityLabel`, `getOfferInCartLabel`, `getMarketSavingLabel`. Tested in [home-formatters.test.ts](../../src/features/home/home-formatters.test.ts).
- **Pricing math:** [commerce.helpers.ts](../../src/shared/common/commerce.helpers.ts) — `getBaseUnitPrice` (undiscounted, legacy fallback `moqPrice / moq`), `getPerUnitPrice` (offer price), `calculateLineTotal` (throws `PricingConfigurationError` without a price), `formatCurrency`, `formatUnitLabel`, `formatQuantity`, `parseQuantityInput` (es-AR decimals), `isWeightUnit`, a module-level `epsilon`. Tested in [commerce.helpers.test.ts](../../src/shared/common/commerce.helpers.test.ts).
  - Important: the stored `terms.stepPrice` is **undiscounted** and may be null on legacy rows. Never display it; derive the step price from `getPerUnitPrice`.
- **Stepper:** [quantity-stepper.tsx](../../src/features/cart/_components/quantity-stepper.tsx), sizes `default` (44 px on mobile, 32 px from `sm`) and `lg` (44 px always, used by the panel).
- **Catalog card:**
  - [product-card.tsx](../../src/app/(storefront)/products/_components/product-card.tsx): `Card` with image 4:3, discount `Badge` at `absolute top-4 left-4`, brand, `h2` title (`text-lg`), 3-line description, then `CatalogProductPurchase addLabel="Agregar"`.
  - [catalog-product-purchase.tsx](../../src/app/(storefront)/products/_components/catalog-product-purchase.tsx) owns the quantity state.
  - Grid: [product-grid.tsx](../../src/app/(storefront)/products/_components/product-grid.tsx) `sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3`.
  - Skeleton: `ProductGridSkeleton` in [products-client.tsx](../../src/app/(storefront)/products/_components/products-client.tsx).
- **Detail dialog:** [product-details-dialog.tsx](../../src/app/(storefront)/products/_components/product-details-dialog.tsx) uses `CatalogProductPurchase showDiscount` (default size, default add label "Sumar al pedido").
- **Home cards:**
  - [home-offer-card.tsx](../../src/features/home/_components/home-offer-card.tsx) is a **server component** (no `"use client"`), sizes `default | hero`, same image/badge/header structure, `h3` title.
  - [home-offer-quantity.tsx](../../src/features/home/_components/home-offer-quantity.tsx) is the client quantity context plus `HomeOfferPurchasePanel`.
  - [home-offer-add-button.tsx](../../src/features/home/_components/home-offer-add-button.tsx) reads the quantity via `useHomeOfferQuantity` and renders `PurchaseActionButton`.
  - [offers-section.tsx](../../src/features/home/_components/offers-section.tsx) and [home-spotlight-band.tsx](../../src/features/home/_components/home-spotlight-band.tsx) are server components that pass `<HomeOfferAddButton>` as the `action` **element**.
  - Grid: [home-offers-grid.tsx](../../src/features/home/_components/home-offers-grid.tsx) `minmax(min(255px,100%),1fr)`.
- **Mini card:** [product-mini-card.tsx](../../src/app/(storefront)/products/_components/product-mini-card.tsx) uses `getOfferHeadlinePrice`.
- **Admin preview:** [product-preview-dialog.tsx](../../src/features/admin/crud/product/product-preview-dialog.tsx) renders `ProductCard` and `HomeOfferCard` (with a disabled `PurchaseActionButton` as action).
- **UI primitives:** `Card` has `size="sm"` (16 px spacing) in [card.tsx](../../src/components/ui/card.tsx). `Badge` variants include `highlight` and `secondary` in [badge.tsx](../../src/components/ui/badge.tsx).
- **Admin glossary:** code-owned dataset ([ADR 0007](../adr/0007-glossary-stays-code-owned.md)); catalog entries in [data/catalog.ts](../../src/features/admin/glossary/data/catalog.ts), checked by [glossary.data.test.ts](../../src/features/admin/glossary/glossary.data.test.ts).
- **Tests describing the card:** [e2e/catalog-product-card.spec.ts](../../e2e/catalog-product-card.spec.ts) and [e2e/home-offer-quantity.spec.ts](../../e2e/home-offer-quantity.spec.ts) locate `getByText(/^Total /)` and the button by exact name. QA cases "Catálogo lista solo productos vigentes", "Agregar un item al carrito" and "Producto sin step = cantidad fija" in [scripts/qa-tickets.data.ts](../../scripts/qa-tickets.data.ts) describe the "Total" line.
- **Real data (2026-10-23):** 22 kg products (MOQ = step = 0,5 or 1) and 5 piece products with presentation, all MOQ = step = 1. Sizes: botella "0,5 L" / "1 L", bolsa "1 kg", bidón "5 L", frasco "370 g". No active discounts.

## 5. Approach & sequencing

Logic first, then the shared panel, then the card shells, then tests and texts.

1. **Pure helpers + unit tests.** Every number and label is decided in tested functions before any JSX changes.
2. **Shared panel and action button.** Every surface (catalog, home, hero, detail, admin preview) changes price order and moves the total into the button in one place.
3. **Card shells.** Compact layout, badge overlay, grids. This is visual only and reuses the panel's `compact` size.
4. **Companion edits.** Admin glossary entries, e2e locators, QA ticket texts.

Regressions are avoided by keeping `calculateLineTotal` as the only source of every total (the button and the live region both call it) and by asserting in e2e that the button amount changes with the stepper and that the added quantity is the chosen one.

## 6. Assumptions

| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |
| Presentation sizes are short "number + unit" strings | All 5 current values are ("370 g", "0,5 L", "1 L", "5 L", "1 kg") | Admin enters "2 x 500 g", "pack 6" | The parser returns null → no comparison line. Acceptable; the deferred structured field fixes it |
| Step = MOQ in practice | True for all 27 products | An admin sets MOQ 1 kg, step 0,5 | The headline still says "por 500 g" and the button shows the real MOQ total. Correct, no special case |
| Cards in a row share height via the grid | CSS grid stretches items; the panel uses `mt-auto` | Varying comparison/title lines misalign steppers | Reserve the comparison line height (see T2.3) |
| `isNew` and favorite are never set in production this delivery | User chose "lugar preparado" | Someone wires them ad hoc | Out of scope; reject in review |

## 7. Phased execution plan

### Phase 1 — Price model

**Objective:** tested functions for step price, comparison price, step label and total amount.
**Tasks:** T1.1 → T1.2 → T1.3.
**Dependencies:** none.
**Validation / done:** `pnpm test` green with the new and updated cases; `pnpm typecheck` green.

### Phase 2 — Shared purchase panel

**Objective:** the new price block and the total-in-button on every surface that uses the panel.
**Tasks:** T2.1, T2.2, T2.3, T2.4, then T2.5, T2.6, T2.7.
**Dependencies:** Phase 1.
**Validation / done:**
- Typecheck green.
- On `/products`, `/` and the detail dialog, the headline is the step price.
- The button reads "Agregar · $ X" and changes with "+".
- No visible "Total" line.

### Phase 3 — Compact cards and badge slots

**Objective:** compact catalog and home-grid cards with the badge overlay; denser grids.
**Tasks:** T3.1 → T3.2, T3.3 → T3.4 → T3.5.
**Dependencies:** Phase 2 (`compact` size).
**Validation / done:**
- Visual check at 360 px, 768 px, 1280 px and 1536 px.
- Catalog card ~460 px tall at ~300 px width.
- Buttons in a row aligned.
- Hero and detail unchanged in size.

### Phase 4 — Companion edits

**Objective:** glossary dataset, e2e and QA texts match the new card.
**Tasks:** T4.1, T4.2, T4.3.
**Dependencies:** Phases 1–3.
**Validation / done:** `pnpm test`, `pnpm check`, `pnpm build`, `pnpm test:e2e` green.

## 8. Task breakdown

### T1.1 — Step and comparison price helpers

- **Files:** `src/shared/common/commerce.helpers.ts`, `src/shared/common/commerce.helpers.test.ts`
- **Symbols / signatures:**
  - `getStepQuantity(terms: Pick<CatalogClientTerms, "step" | "moq">): number` — the step when > 0, otherwise the MOQ (fixed quantity).
  - `getBaseStepPrice(terms): number | null` — `getBaseUnitPrice(terms) × getStepQuantity(terms)`.
  - `getPerStepPrice(terms): number | null` — `getPerUnitPrice(terms) × getStepQuantity(terms)`. This is the offer price.
  - `parsePresentationMeasure(size: string | null | undefined): { amount: number; measure: "kg" | "L" } | null`.
  - `getComparisonPrice(terms, unit: CatalogProductUnit, presentation?: ProductPresentation | null): { amount: number; measure: "kg" | "L" } | null`.
- **Change:**
  - `parsePresentationMeasure` accepts one number (es-AR comma or dot; reuse `parseQuantityInput`) followed by `g|gr|grs|kg|ml|cc|l|lt|lts`, case-insensitive, optional trailing dot, surrounding spaces. It converts g→kg and ml/cc→L by ÷1000. It rejects ≤ 0, multipliers ("2 x 500 g"), ranges and extra words.
  - `getComparisonPrice` computes the measure per purchase unit:
    - `kg` → 1 kg
    - `gr` → 0,001 kg
    - `lb` → 0,45359237 kg
    - `piece | box | other` → `parsePresentationMeasure(presentation?.presentationSize)`, else null.

    Comparison amount = `getPerUnitPrice(terms) ÷ measurePerUnit`. Return null when the price is null, or when `getStepQuantity × measurePerUnit` is within `epsilon` of 1 (the step already is 1 kg / 1 L).
  - Add the pair `getBaseStepPrice` / `getPerStepPrice` next to `getBaseUnitPrice` / `getPerUnitPrice`, with a one-line doc each in the file's style.
- **Mirror this pattern:** `getBaseUnitPrice` / `getPerUnitPrice` in the same file; table-style tests already in `commerce.helpers.test.ts`.
- **Depends on:** —
- **Acceptance:** tests assert:
  - $ 22.600/kg, step 0,5 → per-step 11.300, comparison {22.600, kg}.
  - kg step 1 → comparison null.
  - frasco "370 g" $ 5.150 → {13.918,9…, kg}.
  - botella "0,5 L" $ 16.900 → {33.800, L}.
  - botella "1 L" and bolsa "1 kg" (step 1) → null.
  - bidón "5 L" $ 137.400 → {27.480, L}.
  - "grande" / "2 x 500 g" / null → null.
  - 20 % discount → per-step 9.040, base step 11.300, comparison 18.080.
  - no step (fixed) → step quantity = MOQ.
- **Pitfalls:**
  - Do **not** read `terms.stepPrice`: it is undiscounted and nullable.
  - Keep the discount inside `getPerUnitPrice` (ADR 0008).

### T1.2 — Formatters: headline = step price, comparison label, total amount

- **Files:** `src/features/home/home-formatters.ts`, `src/features/home/home-formatters.test.ts`
- **Symbols / signatures:**
  - `OfferPricing` — add `"step"` to the `Pick<HomeOffer, …>`.
  - `getOfferStepLabel(offer: OfferPricing): string` — the "por …" label.
  - `getOfferHeadlinePrice(offer)` — **repurposed**: `{ amount: formatCurrency(getPerStepPrice), unitLabel: getOfferStepLabel }`.
  - `getOfferStrikethroughPrice(offer)` — strikes `getBaseStepPrice` (only when discounted).
  - `getOfferComparisonPrice(offer): { amount: string; measureLabel: string; spokenLabel: string } | null`, e.g. `{ "$ 22.600", "/ kg", "por kg" }`.
  - `getOfferTotalAmount(terms: CatalogClientTerms, quantity: string): string` — `formatCurrency(calculateLineTotal(...))`.
  - `getOfferTotalLabel` — becomes `` `Total ${getOfferTotalAmount(...)}` ``.
  - `getOfferFixedQuantityLabel` — returns only the quantity label (drop "· Total …").
- **Change:** `getOfferStepLabel` rules:
  - Weight unit `kg` with step < 1 → grams via the es-AR quantity formatter ("por 500 g", "por 250 g").
  - Step exactly 1 → `por ${formatUnitLabel(1, unit, offer)}` ("por kg", "por frasco 370 g").
  - Otherwise → `por ${formatQuantity(step, unit, offer)}` ("por 1,5 kg", "por 6 frascos 370 g", "por 250 gr").

  The step quantity comes from `getStepQuantity`. `perUnitLabel` and `getMarketSavingLabel` stay as they are (market saving is still per unit and hidden).
- **Mirror this pattern:** existing formatter functions in the same file.
- **Depends on:** T1.1
- **Acceptance:**
  - Updated tests: the headline for the kg fixture now reads the step price and label.
  - Discount strikes the undiscounted step price.
  - Comparison label cases from T1.1.
  - `getOfferTotalLabel(…, "10")` unchanged ("Total $ 11.250").
  - Fixed-quantity label has no "Total".
  - `pnpm typecheck` passes: every `OfferPricing` literal now carries `step`.
- **Pitfalls:**
  - `getOfferHeadlinePrice` is also used by `ProductMiniCard` (intended) and through `getPurchasePrice`. Grep for every caller before changing it.
  - Test fixtures that build `OfferPricing` by hand need `step` added.

### T1.3 — `getPurchasePrice` carries the comparison price

- **Files:** `src/features/catalog/purchase-panel.ts`, `src/features/catalog/purchase-panel.test.ts`
- **Symbols / signatures:** `getPurchasePrice(pricing)` → `{ amount, unitLabel, previousAmount, discount, comparison: { amount; measureLabel; spokenLabel } | null, saving }`.
- **Change:** add `comparison: getOfferComparisonPrice(pricing)`. Update the doc comment ("The single price line…") to describe the step price headline plus the comparison line.
- **Depends on:** T1.2
- **Acceptance:** the tests "the price line is…" and "a discount strikes through…" are rewritten for step price + comparison (kg 0,5 → "$ 9.750 por 500 g" with comparison "$ 19.500" "/ kg" for the 19.500 fixture; jar "370 g" $ 4.200 → comparison "$ 11.351" "/ kg").

### T2.1 — Stepper `md` size

- **Files:** `src/features/cart/_components/quantity-stepper.tsx`
- **Symbols / signatures:** `size?: "default" | "md" | "lg"`.
- **Change:** `md` = 44 px buttons and field on mobile, 40 px from `sm` (`size-11 sm:size-10`, `h-11 sm:h-10`), full width like `lg`. Update the prop's doc comment.
- **Acceptance:** typecheck; visual 44 → 40 px at the `sm` breakpoint.

### T2.2 — Total inside the action button

- **Files:** `src/features/catalog/_components/purchase-panel.tsx`
- **Symbols / signatures:** `PurchaseActionButton({ addLabel, disabled, inCart, onAdd, onViewInCart, total?: string | null, size?: "default" | "compact" })`.
- **Change:**
  - When not in cart and `total` is set, render `{addLabel}`, an `aria-hidden` " · ", and the amount (`tabular-nums`). The accessible name becomes "Agregar $ 11.300".
  - In cart → "Ver en tu pedido", no amount.
  - `compact` → `h-11 sm:h-10`; default keeps `h-11`.
- **Depends on:** T1.2
- **Acceptance:** typecheck; the button name matches `/^Agregar · \$/` visually and `/^Agregar.*\$/` by role name.

### T2.3 — Price block: step headline + comparison line + `compact` size

- **Files:** `src/features/catalog/_components/purchase-panel.tsx`
- **Symbols / signatures:** `PurchasePrice({ pricing, size?: "compact" | "default" | "hero", showDiscount })`.
- **Change:**
  - Headline paragraph as today (amount, `unitLabel`, `<del>` previous amount, optional inline discount badge). Size map: `compact` → `text-2xl`, `default` → `text-3xl`, `hero` → `text-4xl`.
  - Below it, a comparison `<p>` in `text-muted-foreground text-xs tabular-nums`: amount, then `<span aria-hidden>{measureLabel}</span><span className="sr-only">{spokenLabel}</span>`.
  - Keep `{" "}` text nodes between parts.
  - When `comparison` is null, still render the paragraph with a non-breaking placeholder and `aria-hidden`. This reserves the line so a row of cards keeps its steppers aligned.
- **Mirror this pattern:** current `PurchasePrice`, and the text-node spacing from commit `4b9348b`.
- **Depends on:** T1.3
- **Acceptance:** the kg 0,5 card shows "$ 11.300 por 500 g" / "$ 22.600 / kg". The kg step 1 card shows "$ 7.850 por kg" and an empty reserved line. A screen reader reads "22.600 pesos por kg".
- **Pitfalls:** don't reserve the line in `hero` if it looks off; the hero has no neighbours.

### T2.4 — Panel: drop the visible total, add `compact`

- **Files:** `src/features/catalog/_components/purchase-panel.tsx`
- **Symbols / signatures:** `PurchasePanelProps.size?: "compact" | "default" | "hero"`.
- **Change:**
  - Stepper mode: render `QuantityStepper size={size === "compact" ? "md" : "lg"}`. Replace the visible total with `<p aria-live="polite" className="sr-only">{getOfferTotalLabel(terms, quantity)}</p>`.
  - Fixed mode: render only `getOfferFixedQuantityLabel` (quantity).
  - In-cart mode: unchanged.
  - Gaps: `compact` → `gap-2`; others keep `gap-3`.
  - Pass `size` to `PurchasePrice`.
  - Update the component doc comment ("Price, quantity, total and action…").
- **Depends on:** T2.1, T2.3
- **Acceptance:** no visible "Total" text on any surface; the live region still updates; in-cart and fixed states render.

### T2.5 — Catalog purchase passes the total and size

- **Files:** `src/app/(storefront)/products/_components/catalog-product-purchase.tsx`
- **Change:** add a `size?` prop passed through to `PurchasePanel` and `PurchaseActionButton`. Pass `total={getOfferTotalAmount(product.terms, quantity)}`.
- **Depends on:** T2.2, T2.4
- **Acceptance:** the catalog card and the detail dialog buttons show and update the amount; the detail stays default size.

### T2.6 — Home add button passes the total and size

- **Files:** `src/features/home/_components/home-offer-add-button.tsx`, `src/features/home/_components/offers-section.tsx`
- **Change:**
  - `HomeOfferAddButton` gets `size?: "default" | "compact"`. It computes `total = getOfferTotalAmount(homeOfferTerms(offer), quantity)` from the existing `useHomeOfferQuantity(offer)` and forwards `total` and `size` to `PurchaseActionButton`.
  - `offers-section.tsx` passes `size="compact"`; the spotlight band keeps the default.
- **Depends on:** T2.2
- **Acceptance:** home grid and hero buttons read "Sumar al pedido · $ X" and follow the stepper.
- **Pitfalls:** `offers-section.tsx`, `home-spotlight-band.tsx` and `home-offer-card.tsx` are **server components** passing `action` as an element. Do **not** turn `action` into a render prop (functions can't cross into client components). The button computes its own total from the quantity context.

### T2.7 — Admin preview keeps parity

- **Files:** `src/features/admin/crud/product/product-preview-dialog.tsx`
- **Change:** the home tab's `PurchaseActionButton` gets `total={getOfferTotalAmount(homeOfferTerms(preview.homeOffer), preview.homeOffer.moq)}` and `size="compact"`. The catalog tab's `ProductCard` needs nothing extra.
- **Depends on:** T2.2
- **Acceptance:** the preview tabs "Tarjeta" and "Home" match the storefront cards.

### T3.1 — Badge overlay `[NEW]`

- **Files:** `src/features/catalog/_components/product-card-badges.tsx` `[NEW]`
- **Symbols / signatures:** `ProductCardBadges({ discount, isNew, favorite }: { discount?: string | null; isNew?: boolean; favorite?: ReactNode })`.
- **Change:**
  - Absolutely positioned overlay inside the image wrapper (`absolute inset-x-3 top-3 flex items-start justify-between pointer-events-none`).
  - Left: `flex flex-wrap gap-1.5` with `isNew` → `<Badge variant="secondary">Nuevo</Badge>`, then `discount` → `<Badge variant="highlight">{discount}</Badge>`.
  - Right: `favorite` wrapped in `pointer-events-auto`.
  - Returns `null` when nothing is set.
  - No hooks and no `"use client"`, so the server `HomeOfferCard` can render it.
  - Document on `favorite` that it is the slot for the future favorite toggle (≥ 44 px touch target, `aria-pressed`).
- **Mirror this pattern:** the current discount `Badge` placement in both cards.
- **Acceptance:** typecheck; the discount renders where it did. With `isNew` and a dummy `favorite` passed temporarily in local dev, the layout matches the mockup. Do not commit that dummy.
- **Pitfalls:** `pointer-events-none` on the overlay keeps the image link/button clickable under it.

### T3.2 — Compact catalog card

- **Files:** `src/app/(storefront)/products/_components/product-card.tsx`
- **Change:**
  - `Card size="sm" className="h-full gap-0 overflow-hidden py-0"`.
  - Image `aspect-3/2`.
  - Replace the inline discount `Badge` with `<ProductCardBadges discount={discount} />`.
  - Header `pt-4 gap-0.5`; title `text-base line-clamp-2`.
  - **Remove the description paragraph** and its fallback copy.
  - `CardContent className="flex flex-1 flex-col pt-3 pb-4"`.
  - `CatalogProductPurchase size="compact"`.
- **Depends on:** T2.5, T3.1
- **Acceptance:** ~460 px tall at ~300 px width; name and image still open the detail; in-order state still works.

### T3.3 — Compact home grid card (hero unchanged)

- **Files:** `src/features/home/_components/home-offer-card.tsx`, `src/features/home/_components/home-offer-quantity.tsx`
- **Change:**
  - In `HomeOfferCard`, `size="default"` gets the same compact shell as T3.2 (`Card size="sm"`, `aspect-3/2`, `text-base line-clamp-2` title, tighter paddings) and passes `size="compact"` to `HomeOfferPurchasePanel`.
  - `size="hero"` keeps today's shell (4:3, `text-2xl`, `shadow-xl`) and passes `"hero"`.
  - Both use `ProductCardBadges`.
  - `HomeOfferPurchasePanel.size` widens to `"compact" | "default" | "hero"`.
- **Depends on:** T2.4, T3.1
- **Acceptance:** home grid cards match the catalog card; the spotlight looks as today apart from the price block and button.

### T3.4 — Denser grids and skeleton

- **Files:** `src/app/(storefront)/products/_components/product-grid.tsx`, `src/app/(storefront)/products/_components/products-client.tsx`, `src/features/home/_components/home-offers-grid.tsx`
- **Change:**
  - Catalog grid → `sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`. Apply the same classes to `ProductGridSkeleton` and make its image `aspect-3/2`.
  - Home grid → `minmax(min(220px,100%),1fr)`.
- **Depends on:** T3.2, T3.3
- **Acceptance:** at 1024 px (with the filter sidebar) 2 columns, 1280 px 3, 1536 px 4. The stepper fits at 220 px card width without truncating "0,5 kg". The skeleton occupies the same footprint as the loaded grid.
- **Pitfalls:** `home-offers-grid.tsx` picks visible offers with `selectVisibleOffers`. Do not touch that logic, only the column template.

### T3.5 — Similar products mini card

- **Files:** `src/app/(storefront)/products/_components/product-mini-card.tsx`
- **Change:** keep `getOfferHeadlinePrice` (now the step price). Add the comparison price from `getOfferComparisonPrice` as a second muted `text-xs` line when present, with the same `aria-hidden` / `sr-only` split as T2.3. Keep the "En tu pedido" badge.
- **Depends on:** T1.2
- **Acceptance:** the detail dialog's similar products show "$ 11.300 por 500 g" and "$ 22.600 / kg".

### T4.1 — Admin glossary entries

- **Files:** `src/features/admin/glossary/data/catalog.ts`
- **Change:** add two `kind: "concept"`, `section: "catalog"` entries next to `concepto-precio-unitario`, with `href: "/admin/product-terms"`:
  - `concepto-precio-por-paso`, label "Precio por paso", term "Step price". Spanish definition mirroring `CONTEXT.md`; aliases "Precio del paso", "Precio del bloque".
  - `concepto-precio-comparativo`, label "Precio comparativo", term "Comparison price". Aliases "Precio por kg", "Precio por litro".

  Do **not** add "Precio de referencia" as an alias here; it already belongs to Unit price.
- **Mirror this pattern:** neighbouring entries in the same file (ADR 0007).
- **Acceptance:** `glossary.data.test.ts` passes (unique slugs, declared section, resolvable href).

### T4.2 — e2e specs

- **Files:** `e2e/catalog-product-card.spec.ts`, `e2e/home-offer-quantity.spec.ts`
- **Change:**
  - Replace the `getByText(/^Total /)` locator with the add button. Catalog: `getByRole("button", { name: /^Agregar.*\$/ })`. Home: `/^Sumar al pedido.*\$/`.
  - Assert that its name changes after "Aumentar cantidad".
  - Click it instead of the exact-name button.
  - Keep the price-line check. Its regex `\$ … por \S` still matches "$ 11.300 por 500 g". Keep the amount/unit spans as children 0 and 1 of the headline paragraph.
  - Add an assertion that no visible "Total" text remains.
- **Depends on:** Phases 2–3
- **Acceptance:** `pnpm test:e2e` green for both specs (skips stay as they are when the fixture lacks a steppable product).

### T4.3 — QA ticket texts

- **Files:** `scripts/qa-tickets.data.ts` (and `scripts/qa-tickets.data.test.ts` if it asserts the changed strings)
- **Change:** rewrite the expected results of "Catálogo lista solo productos vigentes", "Agregar un item al carrito" and "Producto sin step = cantidad fija" for the new card:
  - The step price as headline ("$ 11.300 por 500 g"), the comparison line ("$ 22.600 / kg"), absent when the step is 1 kg or 1 L.
  - The button with the amount ("Agregar · $ 11.300") updating with "+".
  - No description on the card.
  - No "Total" line.

  Then follow the repo's existing step for syncing QA tickets (`pnpm qa:seed`; read `scripts/qa-seed.ts` first to confirm it updates existing tickets without touching their state).
- **Depends on:** Phases 2–3
- **Acceptance:** `pnpm test` green; the texts match what the screen shows.

## 9. Cross-cutting concerns

- **Data / schema / migration / backfill:** N/A. No schema change. The comparison price is derived at render time.
- **Config / env / feature flags:** N/A. `SHOW_MARKET_SAVING` stays `false`.
- **Security / permissions:** N/A. Display only; the totals charged are untouched.
- **Observability:** N/A.

## 10. Pitfalls & gotchas (global)

- **Never display `terms.stepPrice`.** It is the undiscounted stored value and is null on legacy rows. Always derive it from `getPerUnitPrice` × step quantity.
- **Server components:** `HomeOfferCard`, `offers-section.tsx` and `home-spotlight-band.tsx` have no `"use client"`. `ProductCardBadges` must stay hook-free, and the home button computes its own total from context.
- **Every total from one function:** the button and the sr-only live region both go through `getOfferTotalAmount` / `calculateLineTotal`. Never multiply in a component.
- **`calculateLineTotal` throws** without a price (as it already does in render today). Don't add a silent fallback.
- **Row alignment:** keep `mt-auto` on the panel and the reserved comparison line, or steppers jump between cards with and without a comparison price.
- **`OfferPricing` gains `step`**: any hand-built literal (tests, admin preview mappers) must add it. `pnpm typecheck` finds them.
- **Accessible names:** the button's name now includes the amount. Any locator using `{ name: "Agregar", exact: true }` or `"Sumar al pedido"` exact breaks; grep `e2e/` and `src/` for them.
- **Glossary parity:** `CONTEXT.md` already has Step price and Comparison price; the admin dataset (T4.1) must follow (ADR 0007).

## 11. Testing & validation

- **Tests to add/update:**
  - `commerce.helpers.test.ts` — step quantity/price, parser, comparison (T1.1 cases).
  - `home-formatters.test.ts` — headline = step price, step labels ("por 500 g", "por kg", "por 1,5 kg", "por frasco 370 g", "por 6 frascos 370 g"), strikethrough on the step price, comparison label, fixed label without total.
  - `purchase-panel.test.ts` — `getPurchasePrice` with comparison.
  - `glossary.data.test.ts` — unchanged, must pass.
  - e2e catalog and home specs (T4.2).
- **Commands:** `pnpm test`, `pnpm typecheck`, `pnpm check`, `pnpm build`, `pnpm test:e2e`.
- **Manual checks / regression risks:**
  - `/products` at 360 / 768 / 1024 / 1280 / 1536 px:
    - kg 0,5 (two lines), kg 1 (one line), frasco 370 g ("/ kg"), botella 0,5 L ("/ L"), botella 1 L (one line).
    - Add → mini-cart opens with the chosen quantity → the card shows "Ya tenés … en tu pedido" + "Ver en tu pedido".
  - Home grid and spotlight.
  - Detail dialog ("Sumar al pedido · $ X", similar products).
  - Admin product preview tabs.
  - A product with a temporary discount in a dev DB: badge on the image, strikethrough of the step price, discounted comparison price.
- **Success criteria:** all commands green; manual matrix matches §2.

## 12. Rollout, migration & rollback

Single deploy, no flag. There is no data change, so rolling back means reverting the commits. Before merging, re-run the QA cases "Catálogo lista solo productos vigentes", "Agregar un item al carrito" and "Producto sin step = cantidad fija".

## 13. Documentation updates

- `scripts/qa-tickets.data.ts` QA texts (T4.3).
- **CONTEXT.md:** added **Step price** and **Comparison price** (Catalog and cart section) this session.
- **ADRs:** none. Every decision here is easy to reverse and display-only.

## 14. Risks & trade-offs

| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| Presentation-size parsing misses real inputs | No comparison line on some unit products | Medium (as the catalog grows) | Low | Parser returns null, never a wrong number; structured field deferred |
| Wrong comparison number from a misleading size ("1 kg" bag that is really 900 g) | Customers compare on a false yardstick | Low | Medium | The number comes from what the admin wrote as the presentation; the same text is already shown to customers |
| 220 px home columns too narrow for the stepper on some widths | Truncated quantity | Low | Low | Verify in T3.4; fall back to 230–240 px |
| Total only in the button is missed by some users | The total is less prominent than before | Low | Low | It is next to the action and updates live; screen readers get the live region |
| Empty badge/favorite slots invite ad-hoc wiring | Scope creep, inconsistent "Nuevo" | Medium | Low | Out of scope in §3; reviewers reject |

## 15. Open questions

- **Blocking:** none.
- **Non-blocking:**
  - Badge variant for "Nuevo": default `secondary`; revisit when the "Nuevo" criterion ticket lands.
  - Home grid minimum column: default 220 px; nudge up if the stepper truncates.
- **Optional refinements:**
  - Add a structured net-content field to Product to replace parsing.
  - Show the comparison price in the cart lines.

## 16. Definition of done

- [x] Catalog, home grid, hero and detail show the step price as headline with the correct label ("por 500 g", "por kg", "por frasco 370 g").
- [x] The comparison price shows as "$ X / kg" or "$ X / L" under the headline, and is absent when the step is 1 kg / 1 L or the size can't be read.
- [x] No visible "Total" line; the add button shows "Agregar · $ X" / "Sumar al pedido · $ X" and updates with the stepper; adding uses the chosen quantity.
- [x] Catalog and home grid cards are compact (no description, 3:2, `Card size="sm"`, 40 px controls from `sm`); hero and detail keep their size.
- [x] `ProductCardBadges` renders the discount; `isNew` and `favorite` slots exist and no production caller sets them.
- [x] Catalog grid reaches 4 columns at `2xl`; the home grid uses a 240 px minimum (fallback from 220 px, see Execution record); the skeleton matches.
- [x] Admin glossary has "Precio por paso" and "Precio comparativo".
- [x] e2e specs and QA ticket texts updated; `pnpm test`, `pnpm typecheck`, `pnpm check`, `pnpm build`, `pnpm test:e2e` green.

## 17. Instructions for the executing agent

- Use this plan as the primary source. Read first: `CONTEXT.md` (Catalog and cart section, especially Step price, Comparison price, Unit price, Offer discount), `docs/adr/0008-offer-discount-is-an-attribute-of-client-terms.md`, `docs/adr/0007-glossary-stays-code-owned.md`, and the files in §4.
- Respect these settled decisions: §2 in full. Do not change: totals math, stepping rules, schema, cart/checkout views, `SHOW_MARKET_SAVING`, hero/detail sizing (§3).
- Verify before modifying:
  - Grep every caller of `getOfferHeadlinePrice`, `getOfferStrikethroughPrice`, `getOfferFixedQuantityLabel`, `getOfferTotalLabel` and `PurchaseActionButton`.
  - Confirm `offers-section.tsx` / `home-spotlight-band.tsx` / `home-offer-card.tsx` are still server components.
  - Confirm how `pnpm qa:seed` treats existing tickets.
- Execute phases in order; honor task dependencies.
- Implement at the level specified; do not re-architect. If a blocking question appears, stop and ask. For non-blocking gaps, proceed on the stated default and note the assumption in the commit message.

## Execution record

**Status:** Done 2026-10-23 (q-code-implement), base `7568e60`, commit `573f722` pushed to `main`. `pnpm qa:seed` ran on 2026-10-23 against the Neon database in `.env`: 65 tickets updated, tracking kept.

**Change summary.**
- Price model: `getStepQuantity`, `getBaseStepPrice`, `getPerStepPrice`, `parsePresentationMeasure` and `getComparisonPrice` in `commerce.helpers.ts`. `getOfferHeadlinePrice` now returns the step price with `getOfferStepLabel`; the strikethrough uses the undiscounted step price. New: `getOfferComparisonPrice` and `getOfferTotalAmount`. `getOfferFixedQuantityLabel` returns only the quantity. `getPurchasePrice` carries `comparison`.
- Shared panel: a `compact` size, the comparison line under the headline, the total inside `PurchaseActionButton` ("Agregar · $ X", accessible name "Agregar $ X"), and the visible "Total" replaced by an `sr-only` live region. `QuantityStepper` gains `md` (44 px on mobile, 40 px from `sm`).
- Cards: the new hook-free `ProductCardBadges` overlay (discount live; `isNew` and `favorite` slots unused). `ProductCard` and the `HomeOfferCard` default are compact (`Card size="sm"`, 3:2, `text-base` 2-line title, no description). The hero keeps its shell. Catalog grid `sm:2 / xl:3 / 2xl:4` and the skeleton match it. The home grid minimum is 240 px. `ProductMiniCard` shows the comparison line.
- Wiring: catalog purchase, home add button (`size="compact"` from `offers-section.tsx`; spotlight default) and the admin preview pass `total` and `size`.
- Companion edits: glossary entries `concepto-precio-por-paso` and `concepto-precio-comparativo`. e2e catalog, home and smoke locators. QA cases 5, 6 and 8 in `scripts/qa-tickets.data.ts`, mirrored in `docs/qa/qa-ciclo-de-vida.md`.

**Acceptance.**

| Criterion (§16) | Result |
| --- | --- |
| Step price headline with the right label | Met. Unit tests cover "por 500 g", "por kg", "por 1,5 kg", "por 250 gr", "por frasco 370 g" and "por 6 frascos 370 g". Seen on `/products` and `/`. |
| Comparison "/ kg" / "/ L", absent at 1 kg / 1 L or for an unreadable size | Met. Unit tests cover the cases from T1.1. On screen: "$ 33.800 / L" (0,5 L), "$ 27.480 / L" (5 L), "$ 32.850 / kg" (500 g); none on the 1 L bottle. |
| No visible "Total"; button carries the amount and follows the stepper; adds the chosen quantity | Met. The e2e catalog and home specs check that the button name changes after "+", that the "Total" node is `sr-only`, and that the cart holds the chosen quantity. |
| Compact catalog and home-grid cards; hero and detail unchanged in size | Met. Measured card heights are 391–450 px, under the ~460 px target. Buttons in each row line up at 360, 768, 1024, 1280 and 1536 px. |
| `ProductCardBadges` discount; `isNew` and `favorite` unused | Met. No caller passes `isNew` or `favorite`. The dummy layout check was not done (no dummy committed, by design). |
| 4 catalog columns at `2xl`; home grid minimum; skeleton matches | Met, with a 240 px home minimum (see Deviations). |
| Admin glossary entries | Met. `glossary.data.test.ts` passes. |
| e2e and QA texts updated; all commands green | Met. `pnpm qa:seed` updated the ticket texts. |

**Test evidence.**
- `pnpm test`: 125 files and 1791 tests passed, 4 skipped (the skips are pre-existing).
- `pnpm typecheck` and `pnpm check` are clean.
- `pnpm build` passed with `SKIP_ENV_VALIDATION=1`, because `BETTER_AUTH_SECRET` is missing from the local env. That gap is unrelated to this change.
- `pnpm test:e2e`: all 22 specs passed. The smoke test "adding a home offer opens the mini-cart…" ran instead of skipping, because its locator now matches.
- A temporary Playwright script, not committed, measured and screenshotted cards at 360, 768, 1024, 1280 and 1536 px.

**Mini review.**
- `q-review-code`:
  - Standards: pass with findings. Two suggestions, neither applied. The `PresentationMeasure` type is exported but used only in its own module. The `md` stepper truncates presentation suffixes ("1 botella…") in ~229 px catalog columns at `2xl`, while "0,5 kg" fits.
  - Specification: pass with findings, the three deviations below.
  - Outcome: pass with findings.
- `q-review-comments`: 16 comments and docstrings in scope, all keep. Outcome: pass.

**Deviations and decisions.**
- **Home grid minimum is 240 px, not 220 px.** At ~228 px, "Sumar al pedido · $ 137.400" overflowed the button. This is the fallback from §14 and §15. At 240 px nothing overflows at any tested width.
- **The reserved comparison line applies to `compact` only, not to `default`.** Only compact cards sit in rows. The `default` size is now only the detail dialog, where an empty line would just add space.
- **`lg:grid-cols-2` was dropped from the catalog grid.** `sm:grid-cols-2` already covers it, so the result is the same.
- **The comparison's spoken label is "por litro" for L** ("por kg" for kg).
- **Extra companion edits beyond §8.** `e2e/smoke.spec.ts` matched "Sumar al pedido" by exact name; this is the hazard from §10. `docs/qa/qa-ciclo-de-vida.md` mirrors the QA texts and needed the same rewrite.

**Follow-ups.**
- Re-run QA cases 5, 6 and 8 before merging (§12).
- Manual check still pending: a product with a temporary discount in a dev DB (badge, step strikethrough, discounted comparison). Unit tests cover the logic, but the current data has no discounts.
