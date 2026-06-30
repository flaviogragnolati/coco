# Implementation Plan: Products Page (Catalog) Redesign

## 1. Objective & outcome

- **Done means:** The `/products` page is a modern, e-commerce-standard catalog: a
  left **filter sidebar** (drawer on mobile), a **toolbar** with debounced search +
  sort + view toggle, two view modes (**cards** default and a dense **table**),
  URL-synced state, numbered pagination, clearer wholesale price presentation, and an
  add-to-cart flow that opens a **mini-cart** slide-over. The navbar cart button opens
  the same mini-cart. `/cart` gets a light visual alignment. The whole surface uses the
  existing rounded `Card`/`Badge` system and semantic color tokens, with consistent
  icons and feedback (toasts, in-cart states).
- **Why:** The current page ([products-client.tsx](../../src/app/products/_components/products-client.tsx))
  is functionally and visually thin (flat `border` boxes, top filter bar, no table view,
  no mini-cart, monochrome). It does not meet e-commerce expectations for browsing,
  filtering, and adding wholesale products with clear price/quantity information.
- **For:** AI coding agent / developer.
- **Upstream design doc:** none (no `design-grill` document for this area). This is a
  self-contained feature redesign; the data model and cart engine are reused as-is.

## 2. Alignment reached

| Topic | Decision | Source |
| --- | --- | --- |
| Data approach | Keep **client-side** filter/sort/paginate over `catalog.list` (returns full catalog). Revisit only if the catalog grows to thousands of SKUs. | user + code |
| Layout | **Sidebar of filters + content grid**. Sticky left rail on desktop; slide-over `Sheet` on mobile. | user |
| View modes | **Cards (default) + dense Table**, toggled via `ToggleGroup`; choice remembered. | user (request) |
| Cart feedback | **Mini-cart `Sheet`** (slide-over), opened on add and from the navbar; complements `/cart`. Keep nav badge + toasts. | user |
| Navbar cart button | Opens the **mini-cart** (not direct nav). "Ver carrito completo" link lives inside the sheet. | user |
| Color | **Semantic accents**: primary CTAs, `success` for in-cart state, colored info badges (MOQ, unit, currency). Neutral base. | user |
| Filters | **Marca + price range** (fixed) + **Unidad** + **"Solo en carrito"**. No currency/volume-discount filters. | user |
| Price presentation | **MOQ-block price stays the headline**; per-unit price shown as secondary. | user |
| Add-to-cart flow | "Agregar" adds at MOQ, opens the mini-cart, leaves an inline stepper for adjustment. | user |
| URL state | **Sync** search/filters/sort/view/page to query params (Next `searchParams`, no new lib). | user |
| Pagination | **Numbered** pagination + page-size selector; same for both views. | user |
| `/cart` scope | **Light restyle** to match (reuse mini-cart line row + price chips). Not a full redesign. | user |
| Newest sort | Add **"Recién agregados"** sort (requires surfacing `Product.createdAt`). | default accepted |
| Sheet component | Add `Sheet` (shadcn on radix `Dialog`); not present today. | code |

## 3. Scope

- **In scope:**
  - New layout shell for `/products`: sidebar + toolbar + content + pagination.
  - Debounced search, faceted filters (brand multi, unit multi, price min/max, in-cart toggle), active-filter chips, sort (incl. relevance + newest), numbered pagination + page size.
  - Card view (restyled) and a new dense Table view, toggled and URL-synced.
  - Global mini-cart `Sheet`; rewire navbar cart button; add-to-cart opens it.
  - Add `Sheet` UI primitive; small non-persisted cart-UI store for open state.
  - Surface `Product.createdAt` through catalog data/schema for the newest sort.
  - Semantic color accents and consistent rounded styling across the catalog + mini-cart.
  - Light visual alignment of `/cart` (shared line row + price chips).
  - Unit tests for the extracted catalog filtering/sorting/relevance helpers.
- **Out of scope / non-goals:**
  - Server-side catalog querying/pagination; no changes to `catalog.list` input signature.
  - Pricing engine, cart engine, quantity math ([commerce.helpers.ts](../../src/shared/common/commerce.helpers.ts)) — reused unchanged.
  - Checkout, auth, admin product CRUD, product image upload.
  - Prisma schema/migration changes (only the read **select** + Zod schema add `createdAt`, which already exists on the model).
  - A full `/cart` redesign (only a light restyle).
  - A Cmd+K command-palette product search (deferred).
- **Deferred (plausible next):** Cmd+K quick-search palette; price **range slider** (`Slider` primitive); volume-discount filter; facet counts that react to other active facets; "novedades"/featured ribbon; full `/cart` redesign.
- **Must not change / break:**
  - Cart store contract ([cart-store.ts](../../src/store/cart-store.ts)) and `useCartActions`/`useCartSync` behavior (local-first + server sync, toasts, MOQ/step normalization).
  - `catalog.list` / `catalog.getProductDetail` output remains a **superset** (adding `createdAt` is additive and optional-safe).
  - Existing routes, nav links, and `/cart` functionality.

## 4. Current system context

- **Page entry:** [page.tsx](../../src/app/products/page.tsx) (server) prefetches
  `api.catalog.list`, passes `isAuthenticated` + `userId` to
  [products-client.tsx](../../src/app/products/_components/products-client.tsx) (client),
  which holds all filter/sort/page state in `useState`, filters/sorts/paginates inline,
  and renders `ProductFilters` + `ProductGrid` + `ClientPagination` + `ProductDetailsDialog`.
- **Inline catalog logic to extract:** `normalizeSearch`, `productMatchesSearch`,
  `productPrice`, `filterProducts`, `sortProducts` currently live inside
  [products-client.tsx:38-97](../../src/app/products/_components/products-client.tsx#L38-L97).
- **Card:** [product-card.tsx](../../src/app/products/_components/product-card.tsx) uses
  `Card` (rounded-4xl) + [product-price-block.tsx](../../src/app/products/_components/product-price-block.tsx)
  (flat `border` box) + [QuantityStepper](../../src/features/cart/_components/quantity-stepper.tsx).
- **Data:** `catalog.list` ([catalog.router.ts](../../src/server/api/routers/catalog.router.ts))
  returns the full `CatalogProductListItem[]` (no input). Shape defined in
  [catalog.schemas.ts](../../src/schemas/catalog.schemas.ts); mapped in
  [catalog.service.ts](../../src/server/services/catalog/catalog.service.ts) from
  [catalog.data.ts](../../src/server/services/catalog/catalog.data.ts). `Product.createdAt`
  exists ([Product.ts:52](../../generated/prisma/models/Product.ts#L52)) but is **not** in
  the catalog select/schema yet.
- **Pricing model (reuse, do not change):** each product has one active **Client terms**
  (`moq`, `moqPrice`, `step`, `stepPrice`, `max`, `refPrice`, `currency`, validity). Cart
  lines keyed by `productClientTermsId`. Multi-currency carts → totals grouped by currency.
- **Cart engine:** [use-cart-sync.ts](../../src/features/cart/use-cart-sync.ts)
  (`useCartActions`: `setItem`, `updateQuantity`, `increment`, `decrement`, `removeItem`,
  `clear`, `cart`, `isPending`), store [cart-store.ts](../../src/store/cart-store.ts),
  mapper [cart-mappers.ts](../../src/features/cart/cart-mappers.ts) (`catalogProductToCartItem`
  adds at MOQ).
- **Navbar:** [app-navbar.tsx](../../src/components/app-navbar.tsx) (sticky) renders
  [cart-nav-button.tsx](../../src/components/cart-nav-button.tsx) — currently a `<Link href="/cart">`
  with a count `Badge` + `useCartSync` bootstrap. Mounted from [layout.tsx](../../src/app/layout.tsx).
- **Cart page:** [cart-client.tsx](../../src/app/cart/_components/cart-client.tsx),
  [cart-item-row.tsx](../../src/app/cart/_components/cart-item-row.tsx),
  [cart-summary.tsx](../../src/app/cart/_components/cart-summary.tsx).
- **Design system:** Tailwind v4, OKLCH tokens in `src/styles/globals.css`. `--radius: 0.875rem`;
  `Card` = `rounded-4xl shadow-md ring-1 ring-foreground/5`; `Button` pill (`rounded-4xl`);
  `Badge` `rounded-3xl`. Semantic tokens available but underused: `--success`, `--warning`,
  `--info`, `chart-1..5`. Icons: **lucide-react** with `data-icon="inline-start|inline-end"`.
- **Available primitives** ([src/components/ui](../../src/components/ui)): `card`, `badge`,
  `button`, `select` (native), `switch`, `toggle-group`, `tooltip`, `popover`, `separator`,
  `skeleton`, `empty`, `alert`, `table`, `tabs`, `field`, `input`, `combobox`, `command`,
  `dialog`. **No `sheet`** (to be added). `radix-ui` exposes `Dialog` (basis for `Sheet`).
- **Reference patterns to mirror:** section header in
  [section-heading.tsx](../../src/features/home/_components/section-heading.tsx); `ToggleGroup`
  single-select usage at
  [product-crud-client.tsx:300-311](../../src/app/admin/crud-home/products/_components/product-crud-client.tsx#L300-L311);
  table primitives in [table.tsx](../../src/components/ui/table.tsx); page container
  `mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6`.
- **Tests:** Node built-in runner (`node:test` + `node:assert/strict`) via `tsx`, pure
  functions only — see [operational-diagnostics.test.ts](../../src/server/services/admin/operational-diagnostics.test.ts).
  No React Testing Library.

## 5. Approach & sequencing

**Scaffold-then-fill, bottom-up, behavior-preserving.** Build foundations first
(primitives, UI store, extracted pure helpers, additive data field) so nothing visual
breaks; then the mini-cart (independent, immediately useful); then the catalog state
layer (URL params) and shell; then filters/toolbar; then the two views and visual polish;
finally the details dialog, the light `/cart` restyle, cleanup, and validation.

- **Why this order:** the mini-cart depends only on the new `Sheet` + cart-UI store and
  the existing cart engine, so it can land and be verified before the larger catalog
  rewrite. The catalog shell depends on the extracted `catalog-filtering.ts` and the
  `use-catalog-params` hook, which are pure/independent and unit-testable first.
- **Avoiding regressions:** extract the existing inline filter/sort logic verbatim into
  `catalog-filtering.ts` (with tests) **before** changing behavior, so the rewrite swaps
  implementation, not semantics. Keep `catalog.list` output additive. Keep `useCartActions`
  call sites semantically identical (add only an `onAdd` that also opens the mini-cart).
- **Validation:** `pnpm typecheck` + `pnpm check` (biome) after each phase; `tsx --test`
  for the helper unit tests; manual click-through of the flows in §11.

## 6. Assumptions

| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |
| Catalog is modest (≤ ~hundreds of SKUs) so client-side filter/sort/paginate is fine. | `catalog.list` already returns everything and filters in-browser today. | Thousands of SKUs / slow render. | Move filter/sort/paginate into `catalog.data.ts` with a new `catalog.list` input; the `catalog-filtering.ts` helpers map 1:1 to a Prisma `where`/`orderBy`. |
| `Product.createdAt` is populated for catalog products. | Field exists on the model and is set on create. | Many null `createdAt`. | Newest sort falls back to `id desc`; keep nullable handling in the comparator. |
| Adding `createdAt` to the catalog output breaks no consumer. | Output is additive; consumers read by key. | A strict consumer rejects extra keys. | Output schema is a superset; Zod `.parse` keeps known keys — safe. |
| `radix-ui` `Dialog` is sufficient to build `Sheet`. | Confirmed `Dialog` is exported; shadcn `Sheet` is a styled `Dialog`. | Version mismatch. | Pin shadcn `sheet` to the installed `radix-ui` API. |
| Mounting a global `<CartSheet/>` won't double-bootstrap cart sync. | `useCartSync` (bootstrap) lives only in `CartNavButton`; `CartSheet` uses `useCartActions` (no bootstrap). | A second `useCartSync` is added. | Ensure `CartSheet` uses `useCartActions` only. |

## 7. Phased execution plan

### Phase 1 — Foundations (no visible change)
**Objective:** Add primitives and pure logic the rest depends on, without changing UI.
**Tasks:** T1.1 Sheet primitive · T1.2 cart-UI store · T1.3 extract `catalog-filtering.ts` (+tests) · T1.4 surface `createdAt`.
**Dependencies:** none.
**Validation:** typecheck + biome pass; `tsx --test` passes for `catalog-filtering.test.ts`; existing pages render unchanged.

### Phase 2 — Mini-cart
**Objective:** Global slide-over mini-cart; navbar opens it; add-to-cart opens it.
**Tasks:** T2.1 shared `cart-line-row` · T2.2 `cart-sheet` · T2.3 mount in layout · T2.4 rewire `cart-nav-button`.
**Dependencies:** T1.1, T1.2.
**Validation:** clicking the navbar cart opens the sheet anywhere; items, per-currency totals, remove, and links work; nav badge still reflects count.

### Phase 3 — Catalog state + shell
**Objective:** URL-synced state and the new page skeleton (sidebar + toolbar + content + pagination), wired to extracted helpers; behavior parity with today plus URL persistence.
**Tasks:** T3.1 `use-catalog-params` · T3.2 `products-client` rewrite to shell · T3.3 numbered pagination + page size.
**Dependencies:** T1.3.
**Validation:** filters/sort/page reflected in URL; refresh/back restore state; results match pre-rewrite for the same inputs.

### Phase 4 — Filters & toolbar
**Objective:** Faceted sidebar (brand multi, unit multi, price, in-cart), toolbar (search, sort, view toggle, page size, mobile "Filtros"), active-filter chips.
**Tasks:** T4.1 `catalog-filters-sidebar` · T4.2 `catalog-toolbar` · T4.3 `catalog-active-filters` · T4.4 mobile filter `Sheet` · T4.5 sort additions (relevance, newest).
**Dependencies:** Phase 3.
**Validation:** every facet narrows results and updates URL + chips; mobile drawer works; relevance is default when searching, newest sorts by `createdAt`.

### Phase 5 — Views & visual polish
**Objective:** Restyled card view + new dense table view; clearer price chips; semantic color + in-cart states; add opens mini-cart.
**Tasks:** T5.1 price block restyle · T5.2 card restyle + add→mini-cart · T5.3 card grid · T5.4 `catalog-table` · T5.5 skeletons/empty/error.
**Dependencies:** Phase 3 (state), Phase 2 (mini-cart open), T1.3.
**Validation:** toggle switches views and persists; both views add/edit/remove correctly and open the mini-cart on add; in-cart items visually distinct.

### Phase 6 — Details dialog, `/cart` light restyle, cleanup
**Objective:** Align the details dialog + `/cart` with the new look; remove dead code; final a11y/polish.
**Tasks:** T6.1 details dialog restyle + add→mini-cart · T6.2 `/cart` light restyle (reuse line row + chips) · T6.3 remove `product-filters.tsx` · T6.4 a11y/polish pass.
**Dependencies:** Phase 5.
**Validation:** dialog + `/cart` visually consistent; no orphan imports; keyboard/aria checks pass; full validation suite green.

## 8. Task breakdown

### T1.1 — Add `Sheet` UI primitive
- **Files:** `src/components/ui/sheet.tsx` `[NEW]`
- **Symbols:** `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent` (prop `side?: "top"|"right"|"bottom"|"left"`, default `"right"`), `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`.
- **Change:** Add the shadcn `Sheet` built on `radix-ui` `Dialog` (`import { Dialog as SheetPrimitive } from "radix-ui"`). Match local conventions: `cn` from `~/lib/utils`, `data-slot` attrs, rounded/overlay styling consistent with [dialog.tsx](../../src/components/ui/dialog.tsx). Support `side` variants via `class-variance-authority`.
- **Mirror this pattern:** [dialog.tsx](../../src/components/ui/dialog.tsx) (overlay, portal, close button, animation classes).
- **Depends on:** none.
- **Acceptance:** imports typecheck; a throwaway `<Sheet>` opens from right and (with `side="left"`) from left; `Esc`/overlay close work.
- **Pitfalls:** Confirm the installed `radix-ui` unified-package import path for `Dialog`; reuse the same `tw-animate-css` classes as `dialog.tsx` so animations match.

### T1.2 — Cart-UI store (mini-cart open state)
- **Files:** `src/store/cart-ui-store.ts` `[NEW]`
- **Symbols:** `useCartUiStore` with `{ isMiniCartOpen: boolean; openMiniCart(): void; closeMiniCart(): void; setMiniCartOpen(open: boolean): void }`.
- **Change:** Tiny **non-persisted** zustand store (plain `create`, no `persist`) for ephemeral UI state, mirroring the zustand setup in [cart-store.ts](../../src/store/cart-store.ts) minus persistence.
- **Depends on:** none.
- **Acceptance:** `openMiniCart()` flips `isMiniCartOpen` to true; selector subscriptions update.
- **Pitfalls:** Do **not** add this to the persisted cart store (open state must not survive reloads). Keep it separate from `cart-store.ts`.

### T1.3 — Extract catalog filtering/sorting/relevance helpers (+ tests)
- **Files:** `src/app/products/_components/catalog-filtering.ts` `[NEW]`, `src/app/products/_components/catalog-filtering.test.ts` `[NEW]`
- **Symbols:** `normalizeSearch(s)`, `productPrice(p)`, `matchScore(p, q): number`, `filterCatalog(products, filters, { inCartTermsIds })`, `sortCatalog(products, sort, q)`, `computeBrandFacets(products)`, `computeUnitFacets(products)`. `CatalogSort = "relevance"|"name-asc"|"name-desc"|"price-asc"|"price-desc"|"newest"`. `CatalogFilters = { search; brandIds: number[]; units: CatalogProductUnit[]; minPrice: string; maxPrice: string; inCartOnly: boolean }`.
- **Change:** Move the inline logic from [products-client.tsx:38-97](../../src/app/products/_components/products-client.tsx#L38-L97) **verbatim** first (parity), then extend: brand → `brandIds` array membership; add `units` membership; add `inCartOnly`; add `matchScore` (name `startsWith` > name `includes` > brand `includes` > description `includes`); `sortCatalog` handles `relevance` (by score, requires `q`) and `newest` (by `createdAt` desc, null-safe → `id` desc). Facet helpers return `{ id|unit, label, count }[]` over the full catalog.
- **Mirror this pattern:** existing comparators in [products-client.tsx](../../src/app/products/_components/products-client.tsx); test style of [operational-diagnostics.test.ts](../../src/server/services/admin/operational-diagnostics.test.ts).
- **Depends on:** T1.4 (the `createdAt` field on the type) for the newest comparator typing.
- **Acceptance:** `tsx --test src/app/products/_components/catalog-filtering.test.ts` passes; covers search normalization (accents/case), brand+unit+price+inCart filtering, each sort, relevance ordering, and facet counts.
- **Pitfalls:** Preserve the accent/locale normalization (`NFD` + diacritic strip, `localeCompare(..., "es")`). Keep price via `getDisplayPrice`/`toNumber` from [commerce.helpers.ts](../../src/shared/common/commerce.helpers.ts) — do not reimplement money math.

### T1.4 — Surface `Product.createdAt` for the newest sort
- **Files:** [catalog.data.ts](../../src/server/services/catalog/catalog.data.ts), [catalog.schemas.ts](../../src/schemas/catalog.schemas.ts), [catalog.service.ts](../../src/server/services/catalog/catalog.service.ts)
- **Symbols:** `catalogProductBaseSelect` (+ `createdAt: true`); `catalogProductListItemSchema` (+ `createdAt: z.date()`); `mapListItem` (+ `createdAt: record.createdAt`).
- **Change:** Add `createdAt` to the read select, the Zod list-item schema (so `CatalogProductListItem`/`CatalogProductDetail` gain it), and the service mapper. Additive only.
- **Depends on:** none.
- **Acceptance:** `catalog.list` returns `createdAt`; `pnpm typecheck` passes; `CatalogProductListItem` has `createdAt: Date`.
- **Pitfalls:** `createdAt` is nullable on the model ([Product.ts:52](../../generated/prisma/models/Product.ts#L52)) — either coerce `?? record.updatedAt` in the mapper or make the schema `z.date().nullable()` and handle null in `sortCatalog`. Pick one and keep the comparator null-safe.

### T2.1 — Shared cart line row
- **Files:** `src/features/cart/_components/cart-line-row.tsx` `[NEW]`
- **Symbols:** `CartLineRow({ item, disabled, variant?: "compact"|"full", onIncrement, onDecrement, onQuantityCommit, onRemove })`.
- **Change:** Generalize [cart-item-row.tsx](../../src/app/cart/_components/cart-item-row.tsx) into a reusable line (image, name+brand, MOQ/step chips, `QuantityStepper`, line total, remove). `compact` = mini-cart density; `full` = cart page.
- **Mirror this pattern:** [cart-item-row.tsx](../../src/app/cart/_components/cart-item-row.tsx).
- **Depends on:** none.
- **Acceptance:** renders a cart line in both variants; stepper/remove fire callbacks; line total via `formatCurrency`.
- **Pitfalls:** Keep `productClientTermsId` as the React key and callback id (not product id).

### T2.2 — Mini-cart sheet
- **Files:** `src/features/cart/_components/cart-sheet.tsx` `[NEW]`
- **Symbols:** `CartSheet({ isAuthenticated, userId })`.
- **Change:** `Sheet` (`side="right"`) bound to `useCartUiStore` open state; data via `useCartActions({ isAuthenticated, userId })`. Lists `CartLineRow variant="compact"`; shows item count, per-currency totals (mirror [cart-summary.tsx](../../src/app/cart/_components/cart-summary.tsx) totals), empty state ([Empty](../../src/components/ui/empty.tsx)); footer CTAs: "Ver carrito completo" → `/cart`, and checkout/login (mirror cart-summary logic). Close on navigate.
- **Mirror this pattern:** [cart-summary.tsx](../../src/app/cart/_components/cart-summary.tsx) + [cart-client.tsx](../../src/app/cart/_components/cart-client.tsx).
- **Depends on:** T1.1, T1.2, T2.1.
- **Acceptance:** opening shows current items + totals; remove/stepper update live; CTA links navigate and close the sheet.
- **Pitfalls:** Use `useCartActions` only (no `useCartSync` — avoid a second bootstrap). Guard against rendering before `hasHydrated`.

### T2.3 — Mount mini-cart globally
- **Files:** [layout.tsx](../../src/app/layout.tsx)
- **Symbols:** render `<CartSheet isAuthenticated={…} userId={…} />` alongside `AppNavbar`.
- **Change:** Pass the same session-derived props already used for the navbar into a globally-mounted `CartSheet` so it works on every route.
- **Depends on:** T2.2.
- **Acceptance:** mini-cart opens on any route; no hydration warnings.
- **Pitfalls:** `CartSheet` is a client component; keep `layout.tsx` a server component and pass primitive props. Confirm how the navbar currently receives session and reuse that exact source.

### T2.4 — Rewire navbar cart button to open mini-cart
- **Files:** [cart-nav-button.tsx](../../src/components/cart-nav-button.tsx)
- **Symbols:** `CartNavButton` — replace `<Link href="/cart">` with a `<button>` calling `useCartUiStore().openMiniCart()`.
- **Change:** Keep the count `Badge`, tooltip, and `useCartSync` bootstrap. Swap navigation for opening the sheet. Update `aria-label`/tooltip to "Abrir carrito".
- **Depends on:** T1.2 (T2.2 for end-to-end).
- **Acceptance:** clicking opens the mini-cart; badge count unchanged; tooltip still shows sync state.
- **Pitfalls:** Keep `useCartSync` here (it is the single bootstrap site). Don't remove it when removing the `Link`.

### T3.1 — Catalog URL-params hook
- **Files:** `src/app/products/_components/use-catalog-params.ts` `[NEW]`
- **Symbols:** `useCatalogParams()` → `{ filters: CatalogFilters; sort: CatalogSort; view: "cards"|"table"; page: number; perPage: number; setX setters; reset() }`. Keys: `q, brand` (csv), `unit` (csv), `min, max, inCart, sort, view, page, perPage`.
- **Change:** Parse from `useSearchParams`; write via `useRouter().replace(\`${pathname}?${qs}\`, { scroll: false })`. **Debounce** `q` (~250ms) with a local input mirror. Default `view` from `localStorage` when absent; persist on change. Default sort = `relevance` when `q` present else `name-asc`. Reset `page` to 1 when filters/sort change.
- **Mirror this pattern:** Next App Router `next/navigation` hooks (already used elsewhere in the app).
- **Depends on:** T1.3 (types).
- **Acceptance:** changing any value updates the URL without scroll jump; refresh restores state; back/forward navigations restore prior states.
- **Pitfalls:** Avoid render loops — derive state from `searchParams`, don't mirror into `useState` except the debounced search input. Coerce/validate numeric + enum params (clamp `page`, whitelist `sort`/`view`/`unit`).

### T3.2 — Rewrite `products-client` into the new shell
- **Files:** [products-client.tsx](../../src/app/products/_components/products-client.tsx)
- **Symbols:** `ProductsClient({ isAuthenticated, userId })`.
- **Change:** Replace inline state/logic with `useCatalogParams()` + `catalog-filtering.ts`. Compute `cartItemsByTermsId` (as today) and `inCartTermsIds`. Layout: section header (mirror [section-heading.tsx](../../src/features/home/_components/section-heading.tsx)) → grid `lg:grid-cols-[16rem_1fr]` with `CatalogFiltersSidebar` (desktop, sticky) + a right column of `CatalogToolbar` → `CatalogActiveFilters` → result count → (`ProductGrid` | `CatalogTable`) → pagination. Wire `onAdd = (product) => { cartActions.setItem(catalogProductToCartItem(product)); openMiniCart(); }`. Keep `ProductDetailsDialog`.
- **Mirror this pattern:** container + header from [cart-client.tsx](../../src/app/cart/_components/cart-client.tsx) and [section-heading.tsx](../../src/features/home/_components/section-heading.tsx).
- **Depends on:** T3.1, T1.3, T2.2 (`openMiniCart`).
- **Acceptance:** parity results vs. pre-rewrite for identical inputs; sidebar + toolbar + content render; add opens mini-cart.
- **Pitfalls:** Memoize derived lists (`useMemo`) keyed on `[products, filters, sort]`; paginate after filter+sort. Don't regress the loading/error/empty branches.

### T3.3 — Numbered pagination + page size
- **Files:** [client-pagination.tsx](../../src/app/products/_components/client-pagination.tsx)
- **Symbols:** extend to `{ page, pageCount, perPage, total, onPageChange, onPerPageChange }`; render numbered page buttons (with ellipsis), prev/next, a range label ("1–12 de 47"), and a per-page `Select` (e.g. 12/24/48).
- **Change:** Replace prev/next-only with numbered controls + page size; values flow through `useCatalogParams`.
- **Mirror this pattern:** existing prev/next in [client-pagination.tsx](../../src/app/products/_components/client-pagination.tsx); `Select` usage in [product-sort-select.tsx](../../src/app/products/_components/product-sort-select.tsx).
- **Depends on:** T3.1.
- **Acceptance:** page/perPage change update URL + list; range label correct; disabled at bounds.
- **Pitfalls:** Clamp `page` to `[1, pageCount]` after filters shrink the set; reset to 1 on `perPage` change.

### T4.1 — Filters sidebar (facets)
- **Files:** `src/app/products/_components/catalog-filters-sidebar.tsx` `[NEW]`
- **Symbols:** `CatalogFiltersSidebar({ brands, units, filters, onChange, onReset })`.
- **Change:** Sections: **Marca** (checkbox list with counts, scrollable; for many brands include a small search box), **Unidad** (checkbox list / `ToggleGroup` multiple, with counts and `productUnitLabelMap` labels), **Precio** (min/max `Input`, `inputMode="decimal"`), **Solo en carrito** (`Switch`). "Limpiar filtros" button. Section titles + counts use muted styling.
- **Mirror this pattern:** `Field`/`FieldLabel` from [product-filters.tsx](../../src/app/products/_components/product-filters.tsx); `Switch` + `ToggleGroup` usage in [product-crud-client.tsx](../../src/app/admin/crud-home/products/_components/product-crud-client.tsx).
- **Depends on:** Phase 3.
- **Acceptance:** toggling any facet calls `onChange` with the new `CatalogFilters` and updates results + URL.
- **Pitfalls:** Brand/unit are **multi-select** now (arrays), not the old single `brandId`. Use `productUnitLabelMap` from [commerce.helpers.ts](../../src/shared/common/commerce.helpers.ts) for unit labels.

### T4.2 — Toolbar
- **Files:** `src/app/products/_components/catalog-toolbar.tsx` `[NEW]`
- **Symbols:** `CatalogToolbar({ search, onSearchChange, sort, onSortChange, view, onViewChange, perPage, onPerPageChange, total, onOpenFilters })`.
- **Change:** Debounced search `Input` with leading `SearchIcon` + clear `X`; result count; sort `Select` (relevance shown only when searching); view `ToggleGroup` (`type="single"`, cards/table icons `LayoutGridIcon`/`TableIcon`); mobile-only "Filtros" `Button` (opens the sidebar `Sheet`). Sticky under the page header on desktop.
- **Mirror this pattern:** search input from [product-filters.tsx:35-46](../../src/app/products/_components/product-filters.tsx#L35-L46); `ToggleGroup` single-select from [product-crud-client.tsx:300-311](../../src/app/admin/crud-home/products/_components/product-crud-client.tsx#L300-L311).
- **Depends on:** T4.5 (sort options).
- **Acceptance:** typing filters with debounce; clear resets; toggling view swaps content + URL; mobile shows "Filtros".
- **Pitfalls:** The debounced input keeps local state but the URL is the source of truth — sync when `search` prop changes (e.g., on reset/back).

### T4.3 — Active filter chips
- **Files:** `src/app/products/_components/catalog-active-filters.tsx` `[NEW]`
- **Symbols:** `CatalogActiveFilters({ filters, brands, onRemove, onClearAll })`.
- **Change:** Render a removable `Badge` per active facet (each brand, each unit, price range, in-cart, search term) with an `X`; "Limpiar todo" when any active. Hidden when none.
- **Mirror this pattern:** `Badge` usage across the app; remove-button pattern from [cart-item-row.tsx](../../src/app/cart/_components/cart-item-row.tsx).
- **Depends on:** Phase 3.
- **Acceptance:** removing a chip clears just that facet and updates results/URL.
- **Pitfalls:** Map brand ids → names for labels; keep chip order stable.

### T4.4 — Mobile filters in a Sheet
- **Files:** [products-client.tsx](../../src/app/products/_components/products-client.tsx) (wiring), reuse `CatalogFiltersSidebar`.
- **Symbols:** local `filtersOpen` state; `Sheet side="left"` (or `"bottom"`) wrapping `CatalogFiltersSidebar` on small screens.
- **Change:** Desktop renders the sidebar inline (`hidden lg:block`); mobile renders the "Filtros" toolbar button that opens the same component inside a `Sheet`.
- **Depends on:** T1.1, T4.1, T4.2.
- **Acceptance:** on mobile, "Filtros" opens the drawer; applying updates the list; desktop unchanged.
- **Pitfalls:** Render one `CatalogFiltersSidebar` instance per breakpoint to avoid duplicate `id`s; close the sheet on "Limpiar"/apply if desired.

### T4.5 — Sort additions
- **Files:** [product-sort-select.tsx](../../src/app/products/_components/product-sort-select.tsx)
- **Symbols:** widen `ProductSortValue` → `CatalogSort`; add options "Relevancia" (only when `q`) and "Recién agregados".
- **Change:** Update the `Select` options + the union; sorting handled by `sortCatalog`.
- **Depends on:** T1.3, T1.4.
- **Acceptance:** newest orders by `createdAt`; relevance appears only when searching and is the default then.
- **Pitfalls:** Keep the `ProductSortValue` type re-exported or update all imports (it's imported by `products-client`).

### T5.1 — Price block restyle (MOQ headline)
- **Files:** [product-price-block.tsx](../../src/app/products/_components/product-price-block.tsx)
- **Symbols:** `ProductPriceBlock({ product, variant?: "card"|"table"|"detail" })`.
- **Change:** Per the decision, **MOQ-block price is the headline**: large `formatCurrency(moqPrice, currency)` with sub-label "MOQ {moq} {unit}"; secondary muted line "≈ {perUnit} / {unit}" where `perUnit = refPrice ?? moqPrice/moq`. Use rounded chip styling + semantic color (e.g., `info`/`secondary` badges for MOQ/max); replace the flat `border` box. Add a `table` variant (single-line compact).
- **Mirror this pattern:** chip/badge styling from [featured-product-card.tsx](../../src/features/home/_components/featured-product-card.tsx); helpers `formatCurrency`/`formatQuantity` from [commerce.helpers.ts](../../src/shared/common/commerce.helpers.ts).
- **Depends on:** none (used by T5.2/T5.4/T6.1).
- **Acceptance:** card/detail/table all show MOQ price headline + per-unit secondary consistently.
- **Pitfalls:** Don't change money math; only presentation. Guard divide-by-zero for `moqPrice/moq` (fall back to `refPrice`).

### T5.2 — Card restyle + add→mini-cart + in-cart state
- **Files:** [product-card.tsx](../../src/app/products/_components/product-card.tsx)
- **Symbols:** `ProductCard({ product, cartItem, disabled, onAdd, onDetails, onIncrement, onDecrement, onQuantityCommit, onRemove })`.
- **Change:** Use the rounded `Card`; in-cart cards get a `success` accent (ring/badge "En carrito"). Replace the add button's behavior to call `onAdd(product)` (adds + opens mini-cart). Keep inline `QuantityStepper` + line total when in cart; add a remove affordance. Restyled `ProductPriceBlock`. Keep "Ver detalles".
- **Mirror this pattern:** current [product-card.tsx](../../src/app/products/_components/product-card.tsx); `success` token usage.
- **Depends on:** T5.1, T2.2.
- **Acceptance:** add → toast + mini-cart opens + card shows in-cart state; stepper edits update line total; remove clears state.
- **Pitfalls:** Stepper increment/decrement must **not** open the mini-cart (only explicit add). Keep `onAdd` distinct from `onQuantityCommit`.

### T5.3 — Card grid
- **Files:** [product-grid.tsx](../../src/app/products/_components/product-grid.tsx)
- **Change:** Thread the new `onAdd`/`onRemove` props; keep `grid gap-3 sm:grid-cols-2 xl:grid-cols-3` (sidebar reduces width, so verify columns still look right — consider `lg:grid-cols-2 2xl:grid-cols-3`).
- **Depends on:** T5.2.
- **Acceptance:** grid renders restyled cards; responsive columns look balanced next to the sidebar.
- **Pitfalls:** Column count interacts with the new sidebar width — eyeball at `lg`/`xl`/`2xl`.

### T5.4 — Table (dense) view
- **Files:** `src/app/products/_components/catalog-table.tsx` `[NEW]`
- **Symbols:** `CatalogTable({ products, cartItemsByTermsId, disabled, onAdd, onDetails, onIncrement, onDecrement, onQuantityCommit, onRemove })`.
- **Change:** Build with [table.tsx](../../src/components/ui/table.tsx) primitives. Columns: thumbnail (`ProductImage`), Producto (name + brand + unit), Precio (`ProductPriceBlock variant="table"`), MOQ badge, Cantidad (`QuantityStepper` when in cart else "Agregar"), Subtotal (line total or "—"), acción (details/remove). In-cart rows get a `success`-tinted row. Sticky header; horizontal scroll on mobile (the `Table` container already scrolls).
- **Mirror this pattern:** [product-table.tsx](../../src/features/admin/crud/product/product-table.tsx) and [table.tsx](../../src/components/ui/table.tsx).
- **Depends on:** T5.1, T2.2.
- **Acceptance:** table lists products; add/edit/remove work and open the mini-cart on add; in-cart rows distinct; header sticks.
- **Pitfalls:** Product name cell needs `whitespace-normal` (cells default to `whitespace-nowrap`). Keep the stepper compact within a row.

### T5.5 — Skeletons / empty / error
- **Files:** [products-client.tsx](../../src/app/products/_components/products-client.tsx) (skeleton block), reuse `Empty`/`Alert`.
- **Change:** Update `ProductGridSkeleton` to match the new card; add a table skeleton; keep `Empty` (no results → offer "Limpiar filtros") and `Alert` (error) but restyled to the rounded system.
- **Depends on:** T5.2, T5.4.
- **Acceptance:** loading shows the right skeleton per view; empty offers a clear reset; error renders.
- **Pitfalls:** Skeleton layout must mirror the active view to avoid layout shift.

### T6.1 — Details dialog restyle + add→mini-cart
- **Files:** [product-details-dialog.tsx](../../src/app/products/_components/product-details-dialog.tsx)
- **Change:** Use restyled `ProductPriceBlock`; make "Agregar al carrito" also call the add→mini-cart flow; align chips/colors. Keep gallery + terms table.
- **Depends on:** T5.1, T2.2.
- **Acceptance:** dialog matches the new look; add from dialog opens the mini-cart.
- **Pitfalls:** The dialog fetches its own detail (`catalog.getProductDetail`); keep that query and the MOQ/step/max table.

### T6.2 — `/cart` light restyle
- **Files:** [cart-item-row.tsx](../../src/app/cart/_components/cart-item-row.tsx), [cart-summary.tsx](../../src/app/cart/_components/cart-summary.tsx)
- **Change:** Refactor `CartItemRow` to render the shared `CartLineRow variant="full"` (or align its styles to it); apply the new price chips/colors to `CartSummary`. No behavior change.
- **Depends on:** T2.1, T5.1.
- **Acceptance:** `/cart` visually consistent with the mini-cart; all existing actions still work.
- **Pitfalls:** Keep the responsive grid in `CartItemRow` (mobile vs sm) intact, or verify the shared row covers both.

### T6.3 — Remove superseded filter component
- **Files:** [product-filters.tsx](../../src/app/products/_components/product-filters.tsx) (delete)
- **Change:** Delete once `CatalogFiltersSidebar` + `CatalogToolbar` fully replace it; remove its imports/usages.
- **Depends on:** Phase 4 complete.
- **Acceptance:** no references remain; `pnpm typecheck` + `pnpm check` clean; `pnpm madge` shows no dangling import.
- **Pitfalls:** `ProductFilterState` type was exported from here — ensure it's no longer imported anywhere (replaced by `CatalogFilters`).

### T6.4 — Accessibility & polish pass
- **Files:** all new components.
- **Change:** Labels/`aria-label`s on icon-only buttons, `aria-pressed` on view toggle, focus management for `Sheet`s, keyboard for steppers, color-contrast check on semantic accents, `Tooltip`s where useful.
- **Depends on:** Phases 4–6.
- **Acceptance:** keyboard-only run-through of search→filter→add→mini-cart→checkout works; no obvious a11y gaps.
- **Pitfalls:** Don't trap focus between the mobile filter sheet and the mini-cart sheet (only one open at a time).

## 9. Cross-cutting concerns

- **Data / schema / migration:** No Prisma migration. Only additive read changes (T1.4): catalog **select** + Zod schema + mapper gain `createdAt`. `catalog.list` stays input-less (client-side filtering).
- **Config / env / feature flags:** None. No new env vars; no flag (ship directly).
- **Security / permissions:** Catalog is `publicProcedure` (unchanged). Mini-cart respects existing auth gating (guest cart local; checkout/login CTA mirrors `CartSummary`). No new data exposure.
- **Observability:** Existing `sonner` toasts remain the feedback channel; no new logging/metrics.
- **State:** New ephemeral `useCartUiStore` (non-persisted). Catalog state lives in the URL (shareable). Cart state unchanged (persisted store + server sync).

## 10. Pitfalls & gotchas (global)

- **Companion edits that are easy to miss:** mount `<CartSheet/>` in [layout.tsx](../../src/app/layout.tsx) (T2.3); the navbar bootstrap (`useCartSync`) must remain in `CartNavButton` after removing its `Link` (T2.4); update every importer of `ProductSortValue`/`ProductFilterState` when those types change/move (T4.5, T6.3).
- **Single bootstrap:** only `CartNavButton` runs `useCartSync`; `CartSheet` and `ProductsClient` use `useCartActions` only — a second bootstrap causes double sync/merge.
- **URL-state render loops:** derive from `searchParams`; debounce only the search input; never echo URL → state → URL.
- **Multi-select migration:** brand/unit move from scalars to arrays — update filter type, sidebar, chips, and serialization together.
- **Table cell wrapping:** `TableCell`/`TableHead` default to `whitespace-nowrap`; override for the product-name column.
- **Decimal/money:** all price/quantity math stays in [commerce.helpers.ts](../../src/shared/common/commerce.helpers.ts); components format only.
- **Two sheets:** ensure the mobile filter sheet and the mini-cart aren't open simultaneously fighting for focus.
- **Pagination bounds:** clamp `page` after filters shrink results; reset on filter/sort/perPage change.

## 11. Testing & validation

- **Unit tests (add):** `src/app/products/_components/catalog-filtering.test.ts` — search normalization (accents/case), brand+unit+price+in-cart filtering, all sort modes, relevance ordering, facet counts. Mirror [operational-diagnostics.test.ts](../../src/server/services/admin/operational-diagnostics.test.ts) (`node:test` + `node:assert/strict`).
- **Commands:** `pnpm typecheck` · `pnpm check` (biome) · `tsx --test src/app/products/_components/catalog-filtering.test.ts` (or `node --import tsx --test`) · `pnpm build` · `pnpm madge` (no new cycles).
- **Manual checks / regression risks:**
  - Search debounce + clear; each facet narrows results; chips remove facets; "Limpiar todo" resets — all reflected in the URL; refresh + back/forward restore state.
  - Cards ↔ table toggle persists (URL + localStorage); both views add/edit/remove and open the mini-cart on add.
  - Mini-cart opens from navbar on any route and on add; per-currency totals correct; "Ver carrito completo" + checkout/login work; nav badge count matches.
  - Guest vs authenticated parity (local cart vs server sync); multi-currency cart totals.
  - Mobile: filter drawer; horizontal table scroll; sticky toolbar.
  - `/cart` still fully functional after the restyle.
- **Success criteria:** all commands green; manual flows pass; no console/hydration warnings; visual consistency with the rounded/semantic system.

## 12. Rollout, migration & rollback

- **Rollout:** Single PR (or stacked by phase). No migration, no env, no flag — merge ships it. Phases 1–2 are independently mergeable (mini-cart works before the catalog rewrite).
- **Compatibility:** `catalog.list` output is a superset; older cached clients keep working. Cart storage key/version unchanged.
- **Rollback:** Revert the PR. The only non-UI change (T1.4 additive `createdAt`) is safe to leave or revert independently. No data backfill.
- **Post-release:** Watch for cart-sync toasts/errors and any hydration warnings from the global `CartSheet`.

## 13. Documentation updates

- **CONTEXT.md:** Added customer-facing terms — **Catalog**, **Client terms**, **MOQ**, **Mini-cart** — under a new "Catalog and cart (customer-facing)" subheading (and grouped the existing terms under "Fulfillment and operations"). Done this session.
- **ADRs:** None. (No decision here clears the hard-to-reverse + surprising + real-trade-off bar; the client-side-filtering boundary is captured in §2/§6.)
- **Other:** none required; this plan documents the work.

## 14. Risks & trade-offs

| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| Client-side filtering doesn't scale to large catalogs | Slow render / big payload | Low (modest catalog) | Med | §6 fallback: push filter/sort/paginate into `catalog.data.ts` using the same helper semantics. |
| `products-client` rewrite regresses behavior | Core browsing flow | Med | High | Extract logic with tests first (T1.3); verify result parity before/after; phase gates. |
| Global `CartSheet` causes double cart sync | Wrong totals / extra requests | Low | High | Single `useCartSync` site (navbar); sheet uses `useCartActions` only. |
| Two slide-overs (filters + mini-cart) conflict on mobile | Focus/UX bugs | Low | Med | Mutually exclusive open state; a11y pass (T6.4). |
| URL-state loops / history spam | Janky navigation | Med | Med | `router.replace` (not push) for filters; debounce search; derive-don't-mirror. |
| Brand/unit scalar→array migration misses a site | Type/runtime errors | Med | Med | Centralize in `CatalogFilters`; update sidebar+chips+serializer together; typecheck. |

## 15. Open questions

- **Blocking (resolve before execution):** none — all design decisions are settled in §2.
- **Non-blocking (resolve during execution):**
  - Exact card grid columns next to the sidebar (default `lg:grid-cols-2 2xl:grid-cols-3`; tune visually).
  - Page-size options (default `12 / 24 / 48`, default `12`).
  - Mobile filter sheet side (default `left`; `bottom` acceptable).
  - `createdAt` null handling (default: fall back to `updatedAt`/`id` in the comparator).
- **Optional refinements (deferred):** Cmd+K product palette (`Command` exists); price range slider (`Slider` primitive); facet counts reactive to other facets; volume-discount filter; full `/cart` redesign.

## 16. Definition of done

- [ ] `/products` renders the sidebar + toolbar + content + numbered pagination shell; state is URL-synced and survives refresh/back.
- [ ] Search (debounced + clear), brand (multi), unit (multi), price range, and "solo en carrito" all filter; active-filter chips remove facets; "Limpiar todo" resets.
- [ ] Sort includes relevance (default when searching), name, price, and newest (`createdAt`).
- [ ] Cards (default) and dense table views toggle, persist, and both add/edit/remove correctly.
- [ ] Adding a product opens the mini-cart; the navbar cart button opens the mini-cart on any route; per-currency totals + CTAs correct; nav badge matches.
- [ ] Price shows the MOQ-block headline + per-unit secondary, consistently across card/table/detail/cart.
- [ ] Semantic color accents + in-cart states applied; rounded/`Card` system used throughout; lucide icons consistent.
- [ ] `/cart` lightly restyled and still fully functional.
- [ ] `CONTEXT.md` updated (done); `pnpm typecheck`, `pnpm check`, the helper unit tests, and `pnpm build` are green; `product-filters.tsx` removed with no dangling imports.

## 17. Instructions for the executing agent

- Use this plan as the primary source. Read first: [products-client.tsx](../../src/app/products/_components/products-client.tsx), [commerce.helpers.ts](../../src/shared/common/commerce.helpers.ts), [use-cart-sync.ts](../../src/features/cart/use-cart-sync.ts), [cart-store.ts](../../src/store/cart-store.ts), [catalog.schemas.ts](../../src/schemas/catalog.schemas.ts), [catalog.service.ts](../../src/server/services/catalog/catalog.service.ts), [catalog.data.ts](../../src/server/services/catalog/catalog.data.ts), [dialog.tsx](../../src/components/ui/dialog.tsx), [table.tsx](../../src/components/ui/table.tsx), `CONTEXT.md`.
- Respect these settled decisions (§2): client-side data, sidebar+grid layout, cards-default + table, mini-cart Sheet, navbar opens mini-cart, semantic color, the chosen filter set, MOQ-headline price, add-at-MOQ→open-mini-cart, URL state, numbered pagination, light `/cart` restyle. Do **not** change: the cart engine, pricing/quantity math, `catalog.list` input signature, or routes/schema beyond the additive `createdAt`.
- Verify before modifying: how the navbar receives session (reuse it for `CartSheet`), the installed `radix-ui` `Dialog` import path (for `Sheet`), and every importer of `ProductSortValue`/`ProductFilterState`.
- Execute phases in order; honor task dependencies. Extract + test `catalog-filtering.ts` before swapping it in.
- Implement at the level specified — write the code the tasks describe; do not re-architect. If a blocking question arises, stop and ask; for non-blocking gaps (§15), proceed on the stated default and note the assumption.
