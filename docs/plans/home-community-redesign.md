# Implementation Plan: Home "Compras comunitarias" (mockup Claude Design)

## 1. Objective & outcome

- **Done means:** `/` reproduce la estructura y la estética del mockup
  (`https://claude.ai/code/artifact/174d9d20-b4b2-4dad-b93b-ec39ade83bc2`): barra de anuncio,
  navbar con buscador, hero de marca "coco / Compras comunitarias" con los tres pasos y el
  Home spotlight, franja de confianza, bloque Problema → Solución → Resultado, grilla de
  Featured offers con "Sumar al pedido", FAQ compacta y footer de columnas. Todo usa solo
  datos existentes (Client terms, Featured offer, Home spotlight). El storefront completo
  adopta Bricolage Grotesque/Karla y la navbar nueva, sin regresiones en el catálogo, el
  carrito, el checkout ni la vista previa de producto del admin.
- **Why:** el mockup redefine la voz ("compras comunitarias", vecinos, Ushuaia) y la
  jerarquía visual del home. Además acorta la conversión: se puede sumar al carrito desde
  el home.
- **For:** AI coding agent / developer.
- **Upstream design doc:** none. Esta iteración reemplaza la composición entregada por
  `docs/plans/home-ui-ux-redesign.md`. Las decisiones de ese plan siguen vigentes salvo las
  que la tabla §2 revierte explícitamente.

## 2. Alignment reached

| Topic | Decision | Source |
| --- | --- | --- |
| Alcance | Rediseño visual con datos existentes. **No** se crean categorías, ventana/cierre de pedidos ni contadores de participantes. Sus slots en el mockup se omiten o se llenan con datos reales. | user |
| Barra de anuncio | Se mantiene con copy estático en `home-content.ts`, sin fecha de cierre (p. ej. "Compras comunitarias en Ushuaia · Mirá el catálogo sin registrarte"). | user |
| Plazos y garantías | Se eliminan "esta semana", "cierran el viernes", "~10 días" y "garantizada". El copy promete solo lo que el sistema cumple: pago al confirmar, aviso de cada avance en Mis pedidos, posible Roll over explicado en la FAQ. | user + `CONTEXT.md` (Roll over) |
| Ciudad | Ushuaia · Tierra del Fuego es la ciudad real; va como copy estático. | user (asumido en la opción aceptada) |
| Navbar | `AppNavbar` global del storefront: wordmark "coco", píldora "Catálogo" (→ `/products`) en lugar de "Categorías", buscador que envía a `/products?q=…`, carrito con badge, cuenta/login. El acceso admin pasa al `UserMenu`. Los anclas públicos quedan en el menú mobile y el footer. | user |
| Buscador en `/products` | La navbar oculta su buscador en `/products`, porque el toolbar del catálogo ya tiene búsqueda en vivo sobre `q`. | default (no bloqueante) |
| CTA de tarjetas | "Sumar al pedido" agrega el MOQ al carrito y abre el Mini-cart (mismo flujo que "Agregar" en el catálogo). Si el producto ya está en el carrito, pasa a "Ver en tu pedido" y abre el Mini-cart. La imagen y el nombre enlazan a `/products?product=<id>`. **Revierte** "Ver producto" del plan anterior. | user |
| Contenido de tarjeta | Precio grande = Unit price de oferta + unidad ("por caja"), o el precio del MOQ si no hay unit price. Debajo: "Mínimo: 3 cajas". Píldora menta = Market saving ("Ahorrás $X por caja vs. góndola"), oculta sin dato. Línea gris = "Total del mínimo: $X" (Offer price del bloque MOQ). Badge sobre la imagen = descuento ("-15%") con precio tachado, oculto sin descuento. | user |
| Lenguaje prohibido en UI | Nada de "Pedido abierto", "Total operación", "personas en este pedido", "vecinos sumaron" ni "cierra el viernes". | user + `CONTEXT.md` |
| Estructura | Barra → navbar → hero (con 3 pasos) → franja de confianza → Problema/Solución/Resultado (`#como-funciona`) → grilla (`#ofertas`) → FAQ (`#preguntas-frecuentes`) → footer (`#contacto`). | user |
| Secciones eliminadas | `HowItWorksSection` y `ContactSection` dejan de existir. Email y WhatsApp pasan a una columna del footer. | user |
| Links sin destino | No se renderizan los links a páginas inexistentes (filosofía, sé proveedor, tiempos de entrega, legales, botón de arrepentimiento). Quedan diferidos. | user |
| Tipografía | Bricolage Grotesque (títulos) + Karla (cuerpo) en todo el storefront, vía wrapper en `(storefront)/layout.tsx`. El admin conserva Geist/Nunito. | user |
| Paleta | Se reajustan los valores light de `--brand-ink`, `--brand-soft`, `--brand-warm` y `--highlight` a los hex del mockup (#0F2A30, #C9F0E6, #FBF1DF, #F5833E). Se mantiene la paridad `.dark`. No se crean tokens nuevos salvo que falte uno. | default (no bloqueante) |
| CTA del hero | "Ver qué se puede comprar" hace scroll a `#ofertas`, o va a `/products` si no hay ofertas. **Revierte** "el CTA del hero siempre va a `/products`". | user |
| Claim "Directo del productor" | Se suaviza a "Precio mayorista: compramos en volumen y con menos intermediarios". | user |
| Franja menta bajo el spotlight ("14 vecinos…") | Se elimina (era social proof sin dato real). | default (deriva del alcance) |
| Vista previa admin | `HomeOfferCard` sigue en `product-preview-dialog.tsx`. Pasa a ser presentacional con un slot de acción; en el admin la acción es inerte. | code |

## 3. Scope

- **In scope:**
  - Recomposición de `/` según §2 y copy nuevo en `home-content.ts`.
  - Barra de anuncio estática `[NEW]`.
  - Rediseño global de `AppNavbar` + `MobileNavMenu` + link admin en `UserMenu`.
  - Buscador de navbar (GET a `/products?q=`).
  - Hero nuevo, franja de confianza `[NEW]`, sección Problema/Solución/Resultado `[NEW]`.
  - `HomeOfferCard` rediseñada, con slot de acción + isla client `HomeOfferAddButton` `[NEW]`.
  - Extensión de `homeOfferSchema` con los campos de Client terms que el carrito necesita.
  - Mapper `homeOfferToCartItem` `[NEW]`.
  - Footer de columnas (Nosotros / Información / Mi cuenta / Contacto) solo con destinos existentes.
  - Fuentes y reajuste de tokens.
  - Actualización de tests unitarios y E2E.
- **Out of scope / non-goals:**
  - Modelo de categorías, filtros de categoría o chips de categoría (en navbar ni en la grilla).
  - Ventana de cierre, countdown o badge "Cierra el viernes".
  - Contadores de participantes o de vecinos, y cualquier query de demanda para el home.
  - Barra de anuncio editable desde el admin.
  - Páginas nuevas (filosofía, sé proveedor, tiempos de entrega, FAQ standalone) y
    documentos legales (ADR 0009 sigue sin implementar; no es parte de este trabajo).
  - Cambios en el checkout, los pagos, las operaciones, el ranking de ofertas o `HomeOfferSettings`.
  - Tipografía o rediseño del admin.
  - Imágenes nuevas en el repo.
- **Deferred:**
  - Categorías de catálogo, que requieren un design-grill (schema + admin + filtros).
  - Concepto de ventana o cierre de pedidos y su barra dinámica.
  - Contadores de participantes a partir de la demanda pagada no agregada.
  - Páginas de footer pendientes y **botón de arrepentimiento**: obligatorio para e-commerce
    en Argentina (Res. 424/2020). Tiene que priorizarse aparte.
  - Badge "Nuevo" por `fromDate` reciente.
- **Must not change / break:**
  - Contrato y comportamiento del carrito: `useCartActions`, `useCartStore`, Mini-cart y
    `CartSheet`. Agregar desde el home debe dar exactamente el mismo `CartItem` que agregar
    desde el catálogo.
  - Query params del catálogo (`q`, `brand`, `unit`, `min`, `max`, `product`, `page`) y el
    deep link `/products?product=<id>`.
  - Selección de Featured offers y Home spotlight (`home-ranking.ts`, `HomeOfferSettings`).
  - Precios: todo precio mostrado sale de `commerce.helpers.ts` (Offer price, ADR 0008). La
    Market price nunca se muestra como precio tachado.
  - Acceso a `/admin` para roles admin (solo cambia de lugar).
  - Vista previa de producto del admin: sigue renderizando la tarjeta del home.

## 4. Current system context

- **Página:** `src/app/(storefront)/page.tsx` compone `HomeHero`, `HowItWorksSection`,
  `OffersSection`, `FaqSection`, `ContactSection` y `HomeFooter`, y obtiene `session` y
  `getHomeContent()` en paralelo.
- **Layout:** `src/app/(storefront)/layout.tsx` monta `AppNavbar` y `CartSheet`
  (`isAuthenticated`, `userId`).
- **Componentes del home:** `src/features/home/_components/*`. El copy vive en
  `src/features/home/home-content.ts` (`homeNavLinks`, `howItWorksSteps`, `heroBenefits`,
  `faqItems`, `contactItems`). Los formatters están en `src/features/home/home-formatters.ts`
  (`getOfferBlockPrice`, `getOfferMinimumLabel`, `getOfferUnitReference`,
  `getOfferStrikethroughPrice`, `getOfferDiscountLabel`, `getMarketComparison`) y se testean
  en `home-formatters.test.ts`.
- **Datos:** `src/server/services/home/home.service.ts` (`mapHomeOffer`, `getHomeContent`),
  `home.data.ts` (`currentTermsSelect`, que hoy no selecciona `step`, `stepPrice`, `max`,
  `toDate` ni `product.description`), `home-ranking.ts`. El schema está en
  `src/schemas/home.schemas.ts` (`homeOfferSchema`) y los tipos en `src/shared/common/home.types.ts`.
- **Segundo productor de `HomeOffer`:** `mapPreviewHomeOffer` en
  `src/server/services/admin/product.service.ts:103` (desde un `CatalogProductDetail`, que ya
  trae `terms` completos). Lo consume `src/features/admin/crud/product/product-preview-dialog.tsx:238`
  (`<HomeOfferCard offer={preview.homeOffer} />`). El schema admin es
  `src/schemas/admin/product.schemas.ts:121`.
- **Carrito (patrón a espejar):**
  `src/app/(storefront)/products/_components/products-client.tsx:137` hace
  `handleAdd = cartActions.setItem(catalogProductToCartItem(product)); openMiniCart();`.
  `catalogProductToCartItem` está en `src/features/cart/cart-mappers.ts`; `useCartActions({ isAuthenticated, userId })`
  en `src/features/cart/use-cart-sync.ts:148` (expone `setItem`, `isPending`);
  `useCartUiStore().openMiniCart` en `src/store/cart-ui-store.ts`. Los ítems en
  `useCartStore().items` están indexados por `productClientTermsId`.
- **Precio:** `src/shared/common/commerce.helpers.ts`: `getOfferMoqPrice`, `getPerUnitPrice`,
  `getMarketSaving` (`perUnit`, `perBlock`, `percent`), `formatCurrency`, `formatQuantity`,
  `productUnitLabelMap`, `calculateLineTotal`, `normalizeCartQuantity`. El schema de términos
  es `catalogClientTermsSchema` en `src/schemas/catalog.schemas.ts:20`.
- **Navbar:** `src/components/app-navbar.tsx` (server), `mobile-nav-menu.tsx` (client; su
  array `navIcons` está alineado por índice con `homeNavLinks`), `user-menu.tsx` (hoy solo tiene
  Perfil y Mis pedidos), `cart-nav-button.tsx` (el badge ya existe).
- **Catálogo:** `use-catalog-params.ts` lee `q` y lo espeja con debounce; el toolbar
  (`catalog-toolbar.tsx`) tiene su propio `Input` de búsqueda.
- **Estilos:** `src/styles/globals.css` (tokens `--brand-*` y `--highlight`, con paridad
  `.dark`). Las fuentes se cargan en `src/app/layout.tsx` con `next/font/google` (`--font-heading`
  = Geist, `--font-sans` = Nunito Sans). La UI usa primitivas shadcn en `src/components/ui/*`,
  con variantes `highlight` e `inverse` en `Button` y `Badge`.
- **Tests:** `e2e/smoke.spec.ts` asserta el h1 actual, `#contacto`, el link "Ver ofertas" → `/products`,
  "Ver producto" y el menú mobile ("Explorá Coco", "Comprar").
- **Glosario en código (ADR 0007):** `src/features/admin/glossary/data/catalog.ts` espeja
  `CONTEXT.md` (campo `aliases`).

## 5. Approach & sequencing

Primero el contrato de datos, después las piezas y al final el ensamblado:

1. **Datos primero:** se extiende `HomeOffer` y los dos productores (home y preview admin)
   y se agrega el mapper puro al carrito, con test. Todo compila sin tocar la UI.
2. **Fundación visual:** fuentes del storefront y reajuste de tokens. Es un cambio global
   pequeño y fácil de revisar en aislamiento.
3. **Chrome global:** barra de anuncio, navbar, menú mobile, `UserMenu` y footer. Se valida en
   `/products` y `/checkout` además de `/`.
4. **Secciones del home:** tarjeta + isla de acción, hero, franja, Problema/Solución/Resultado,
   grilla y FAQ. Después se ensambla `page.tsx` y se borran las piezas muertas.
5. **Tests y limpieza:** formatters, E2E y glosario en código.

Las regresiones se evitan así: la tarjeta sigue siendo server-compatible (solo el botón es
client) y el `CartItem` se construye con los mismos helpers que el catálogo, lo que se
verifica con un test de equivalencia. Los cambios de navbar se prueban en rutas fuera del home.

## 6. Assumptions

| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |
| `useCartActions().setItem` acepta un `CartItem` completo y resuelve sola la sincronización local o servidor según `isAuthenticated`. | Así lo usa `products-client.tsx:138`. | Que `setItem` requiera contexto que solo existe en el catálogo. | Extraer un hook `useAddCatalogItem` compartido y usarlo en ambos lugares. |
| `CartSheet` (montado en el layout) escucha `openMiniCart` también en `/`. | Está en `(storefront)/layout.tsx`, que envuelve el home. | Que el Mini-cart no se abra en el home. | Revisar el montaje de `CartSheet`; no duplicarlo. |
| Los hex del mockup se pueden expresar en OKLCH cerca de los valores actuales sin romper el contraste AA del admin (sidebar usa `brand-ink`/`highlight`). | Los valores actuales ya son casi idénticos. | Contraste < 4.5:1 de `highlight-foreground` sobre `highlight`. | Ajustar solo `--highlight-foreground`. |
| Bricolage Grotesque y Karla están disponibles en `next/font/google`. | Ambas son Google Fonts. | Error de build por el nombre del export. | Usar los nombres exactos del export (`Bricolage_Grotesque`, `Karla`). |
| Ushuaia es la única ciudad de entrega hoy. | Aceptado por el user en la pregunta de copy. | Que se sumen ciudades. | El copy vive en `home-content.ts`; se edita en un solo lugar. |

## 7. Phased execution plan

### Phase 1 — Contrato de datos para "Sumar al pedido"

**Objective:** que `HomeOffer` alcance para construir un `CartItem` idéntico al del catálogo.
**Tasks:** T1, T2, T3.
**Dependencies:** ninguna.
**Validation / done:** `pnpm typecheck` y `pnpm test` en verde; el test de equivalencia de T3 pasa.

### Phase 2 — Fundación visual del storefront

**Objective:** tipografías y tokens del mockup.
**Tasks:** T4, T5.
**Dependencies:** ninguna (puede ir en paralelo con la fase 1).
**Validation / done:** `/`, `/products` y `/checkout` renderizan con las fuentes nuevas;
`/admin` conserva Geist/Nunito; `pnpm build` en verde.

### Phase 3 — Chrome global: anuncio, navbar y footer

**Objective:** navbar y footer nuevos en todo el storefront.
**Tasks:** T6, T7, T8, T9, T10.
**Dependencies:** fase 2 (fuentes y tokens).
**Validation / done:** en `/`, `/products`, `/cart` y `/my-orders` la navbar muestra wordmark,
Catálogo, buscador (salvo en `/products`), carrito y cuenta. Un admin ve "Administrador" en el
`UserMenu`. El menú mobile a 360px expone los anclas y el catálogo.

### Phase 4 — Secciones del home

**Objective:** hero, franja, Problema/Solución/Resultado, grilla con tarjeta nueva y FAQ; ensamblado.
**Tasks:** T11, T12, T13, T14, T15, T16, T17, T18.
**Dependencies:** fases 1 y 3.
**Validation / done:** `/` coincide con el orden de §2. "Sumar al pedido" agrega el MOQ y abre
el Mini-cart; un segundo clic muestra "Ver en tu pedido". La vista previa del admin renderiza
la tarjeta sin botón activo. No aparece ningún texto de la lista prohibida de §2.

### Phase 5 — Tests, glosario y limpieza

**Objective:** cubrir el comportamiento nuevo y dejar el repo sin piezas muertas.
**Tasks:** T19, T20, T21.
**Dependencies:** fase 4.
**Validation / done:** `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` y `pnpm build` en verde.

## 8. Task breakdown

### T1 — Extender `homeOfferSchema` con los campos de Client terms que faltan

- **Files:** `src/schemas/home.schemas.ts`
- **Symbols / signatures:** `homeOfferSchema`. Agrega `productDescription: z.string().nullable()`,
  `step`, `stepPrice`, `max` (`decimalOutputSchema.nullable()`), `fromDate: z.date()` y
  `toDate: z.date().nullable()`.
- **Change:** dejar el shape de modo que `HomeOffer` contenga todos los campos de
  `catalogClientTermsSchema` (con `productClientTermsId` como `id`) + los de producto que usa
  `CartItem.product`.
- **Mirror this pattern:** `catalogClientTermsSchema` (`src/schemas/catalog.schemas.ts:20`).
- **Depends on:** —
- **Acceptance:** `pnpm typecheck` marca los dos productores de T2 como incompletos (esperado hasta T2).
- **Pitfalls:** `RankableHomeOffer` ya lleva `fromDate` como campo de ranking que el schema
  "stripea" (comentario en `home.service.ts`). Al pasar `fromDate` al schema público deja de
  stripearse; actualizar ese comentario.

### T2 — Poblar los campos nuevos en ambos productores de `HomeOffer`

- **Files:** `src/server/services/home/home.data.ts`, `src/server/services/home/home.service.ts`,
  `src/server/services/admin/product.service.ts`
- **Symbols / signatures:** `currentTermsSelect` (agregar `step`, `stepPrice`, `max`, `toDate`),
  `homeOfferProductSelect` (agregar `description`), `mapHomeOffer`, `mapPreviewHomeOffer`.
- **Change:** seleccionar y mapear los campos nuevos (Decimals con `.toString()` o `null`, igual
  que los existentes). `mapPreviewHomeOffer` los toma de `product.terms` y `product.description`.
- **Mirror this pattern:** el mapeo actual de `unitPrice`/`marketPrice` en `mapHomeOffer`.
- **Depends on:** T1.
- **Acceptance:** `pnpm typecheck` en verde; `home-ranking.test.ts` sigue pasando (actualizar
  sus fixtures si el tipo lo exige).
- **Pitfalls:** `homeContentOutputSchema.parse` falla en runtime si falta un campo. Revisar
  también los fixtures de `home-ranking.test.ts`.

### T3 — Mapper puro `homeOfferToCartItem`

- **Files:** `src/features/cart/cart-mappers.ts`, `src/features/cart/cart-mappers.test.ts` `[NEW]`
- **Symbols / signatures:** `homeOfferToCartItem(offer: HomeOffer, quantity = offer.moq): CartItem`
  y un helper interno `homeOfferTerms(offer): CatalogClientTerms`.
- **Change:** construir `terms` desde los campos planos (`id` = `productClientTermsId`) y
  `product` (`id`, `name`, `description`, `unit`, `brandName`, `imageUrl`). Normalizar con
  `normalizeCartQuantity` y calcular `lineTotal` con `calculateLineTotal`, igual que
  `catalogProductToCartItem`.
- **Mirror this pattern:** `catalogProductToCartItem` en el mismo archivo.
- **Depends on:** T1.
- **Acceptance:** el test construye un `CatalogProductListItem` y el `HomeOffer` equivalente y
  verifica `expect(homeOfferToCartItem(offer)).toEqual(catalogProductToCartItem(product))`,
  con y sin descuento y con `step`.
- **Pitfalls:** `cart-mappers.ts` tiene `"use client"`. El test de Vitest no lo necesita, pero
  no hay que importarlo desde código server.

### T4 — Fuentes del storefront

- **Files:** `src/app/(storefront)/layout.tsx`, `src/features/home/fonts.ts` `[NEW]` (o
  `src/styles/storefront-fonts.ts` `[NEW]`)
- **Symbols / signatures:** `bricolage = Bricolage_Grotesque({ subsets: ["latin","latin-ext"], weight: ["500","600","700"], variable: "--font-heading" })`
  y `karla = Karla({ subsets: ["latin","latin-ext"], weight: ["400","500","600","700"], variable: "--font-sans" })`.
- **Change:** envolver el contenido del layout en un `<div className={cn(bricolage.variable, karla.variable, "font-sans")}>`
  para que las variables se redefinan dentro del storefront sin tocar `src/app/layout.tsx`.
- **Mirror this pattern:** la carga de fuentes en `src/app/layout.tsx`.
- **Depends on:** —
- **Acceptance:** en DevTools, `h1` del home usa Bricolage Grotesque y `body` del storefront usa
  Karla. `/admin` sigue con Geist/Nunito.
- **Pitfalls:** los portales de Radix (`Sheet`, `Dialog`, Mini-cart) se renderizan en `body`,
  **fuera** del wrapper, y heredarían Geist/Nunito. Para cubrirlos: aplicar las variables también
  en el `SheetContent` del `CartSheet`/`MobileNavMenu` o, si es más simple, exponer las variables
  en `<html>` desde el root layout y asignar `font-sans` por segmento. Verificar el Mini-cart y
  el diálogo de producto.

### T5 — Reajuste de tokens de marca

- **Files:** `src/styles/globals.css`
- **Symbols / signatures:** en `:root`, `--brand-ink` (#0F2A30), `--brand-soft` (#C9F0E6),
  `--brand-warm` (#FBF1DF), `--highlight` (#F5833E) y sus `-foreground` si el contraste lo pide;
  opcionalmente `--foreground` ≈ #14232A.
- **Change:** convertir los hex a OKLCH y reemplazar solo los valores light. Revisar que los
  valores `.dark` sigan siendo coherentes (sin cambios salvo que el contraste falle).
- **Depends on:** —
- **Acceptance:** contraste AA (≥ 4.5:1) de texto sobre `highlight`, `brand-ink` y `brand-soft`.
  El sidebar del admin se ve correcto.
- **Pitfalls:** el sidebar del admin usa `--brand-ink`/`--highlight`, así que el cambio llega
  al admin a propósito, aunque de forma leve. No crear tokens con hex crudos en componentes.

### T6 — Copy y links del chrome en `home-content.ts`

- **Files:** `src/features/home/home-content.ts`
- **Symbols / signatures:** `announcementMessage: string` `[NEW]`; `homeNavLinks` (anclas
  `/#como-funciona`, `/#ofertas`, `/#preguntas-frecuentes`, `/#contacto`); `footerColumns`
  `[NEW]` (`Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }>`);
  `contactItems` (sin cambios de valores).
- **Change:** definir el copy de la barra, sin plazos. Definir las columnas del footer **solo con
  destinos existentes**: Nosotros → Cómo funciona (`/#como-funciona`); Información → Preguntas
  frecuentes (`/#preguntas-frecuentes`); Mi cuenta → Ingresar (`/login`), Mis pedidos (`/my-orders`),
  Perfil (`/profile`); Contacto → `contactItems`. Borrar `heroBenefits` y `howItWorksSteps` en
  T18, cuando dejen de usarse.
- **Depends on:** —
- **Acceptance:** typecheck en verde; ningún `href` apunta a una ruta inexistente.
- **Pitfalls:** `mobile-nav-menu.tsx` alinea `navIcons` por índice con `homeNavLinks`; si
  cambia el orden o la cantidad, hay que ajustarlo (T8).

### T7 — `AnnouncementBar` y `NavbarSearch`

- **Files:** `src/components/announcement-bar.tsx` `[NEW]`, `src/components/navbar-search.tsx` `[NEW]`
- **Symbols / signatures:** `AnnouncementBar()` (server), `NavbarSearch({ className?: string })` (client).
- **Change:** `AnnouncementBar` renderiza `announcementMessage` sobre `bg-brand-ink
  text-brand-soft`, texto chico y centrado. `NavbarSearch` es un `<form role="search"
  action="/products" method="get">` con `<input type="search" name="q">`, placeholder
  "¿Con qué producto querés ahorrar?" y `aria-label="Buscar productos"`. Devuelve `null`
  cuando `usePathname()` empieza con `/products`.
- **Mirror this pattern:** estilos de píldora con `bg-brand-warm` y `rounded-full`, usando las primitivas `Input` existentes.
- **Depends on:** T6.
- **Acceptance:** enviar "yerba" desde `/` navega a `/products?q=yerba` y el catálogo filtra.
  En `/products` no aparece el buscador de la navbar.
- **Pitfalls:** no usar `router.push` si el form nativo alcanza (funciona sin JS). Un `q`
  vacío no debe agregar `?q=`: si está vacío, hacer `preventDefault` y navegar a `/products`.

### T8 — Rediseño de `AppNavbar`, `MobileNavMenu` y `UserMenu`

- **Files:** `src/components/app-navbar.tsx`, `src/components/mobile-nav-menu.tsx`,
  `src/components/user-menu.tsx`, `src/app/(storefront)/layout.tsx`
- **Symbols / signatures:** `AppNavbar({ session })`, `MobileNavMenu({ isActiveUser, canAccessAdmin })`,
  `UserMenu({ user, canAccessAdmin?: boolean })`.
- **Change:**
  - `AppNavbar`: sticky, `bg-background`, borde inferior sutil. Orden: wordmark "coco"
    (font-heading, bold) → píldora "Catálogo" (→ `/products`, icono de menú) → `NavbarSearch`
    (`flex-1 max-w-[460px]`, oculto en mobile) → carrito y cuenta a la derecha (botones redondos
    42px). Se quitan los anclas desktop y el botón "Comprar".
  - `UserMenu` agrega el ítem "Administrador" (`/admin`) cuando `canAccessAdmin`.
  - `MobileNavMenu`: conserva los anclas y agrega "Catálogo" y el buscador dentro del sheet.
    El admin sigue en el sheet.
  - El layout renderiza `<AnnouncementBar />` antes de `<AppNavbar />`.
- **Mirror this pattern:** la estructura actual de `AppNavbar` (cálculo de `isActiveUser` y `canAccessAdmin`).
- **Depends on:** T6, T7.
- **Acceptance:** en desktop no hay scroll horizontal a 1024px. A 360px, el menú mobile abre
  y muestra anclas, Catálogo y el buscador. Un admin llega a `/admin` desde el `UserMenu`.
  El badge del carrito sigue funcionando.
- **Pitfalls:** la barra de anuncio no es sticky; solo la navbar. Revisar `scroll-mt-*` de las
  secciones para que los anclas no queden bajo la navbar. El título del sheet "Explorá Coco"
  lo asserta el E2E (T20).

### T9 — Footer de columnas

- **Files:** `src/features/home/_components/home-footer.tsx`
- **Symbols / signatures:** `HomeFooter()`; recibe `id="contacto"` en el `<footer>`.
- **Change:** fondo `bg-brand-ink`, grid `auto-fit minmax(190px,1fr)`: bloque de marca ("coco"
  + "Compras comunitarias en Ushuaia. Nos juntamos para comprar mejor.") + columnas de
  `footerColumns`. La columna Contacto renderiza `contactItems` como links (mailto y
  `wa.me` externo). Línea final: `© {year} Coco. Todos los derechos reservados.`, sin
  mencionar la empresa madre, que está pendiente.
- **Mirror this pattern:** el mapeo actual de `contactItems` en `contact-section.tsx`.
- **Depends on:** T6.
- **Acceptance:** `/#contacto` hace scroll al footer y email y WhatsApp son clickeables.
- **Pitfalls:** `HomeFooter` hoy solo se renderiza en `/`; se mantiene así (no moverlo al layout).

### T10 — Verificación del chrome en rutas no-home

- **Files:** — (solo verificación manual)
- **Change:** recorrer `/products`, `/products?product=<id>`, `/cart`, `/checkout`, `/my-orders`
  y `/login` en desktop y 360px.
- **Depends on:** T8.
- **Acceptance:** sin solapamientos con headers sticky propios de esas páginas y sin buscador
  duplicado en `/products`.
- **Pitfalls:** revisar si el toolbar sticky del catálogo depende de la altura de la navbar
  (`top-16` o similar), porque la barra de anuncio suma altura.

### T11 — Formatters de tarjeta

- **Files:** `src/features/home/home-formatters.ts`, `src/features/home/home-formatters.test.ts`
- **Symbols / signatures:** `getOfferHeadlinePrice(offer): { amount: string; unitLabel: string }` `[NEW]`
  (Unit price de oferta + "por {unidad}", o el precio del MOQ + "por {cantidad mínima}");
  `getOfferMinimumLabel` (copy → `Mínimo: 3 cajas`); `getOfferMinimumTotal(offer): string` `[NEW]`
  (`Total del mínimo: {getOfferBlockPrice}`); `getMarketSavingLabel(offer): string | null` `[NEW]`
  (`Ahorrás {perUnit} por {unidad} vs. góndola`, `null` si `getMarketSaving` es `null`).
  Se mantienen `getOfferDiscountLabel` y `getOfferStrikethroughPrice`, esta última ahora sobre el
  precio titular sin descuento (ver pitfall).
- **Change:** agregar los helpers y eliminar `getMarketComparison` y `getOfferUnitReference` si
  quedan sin uso tras T12 (verificar con grep).
- **Depends on:** T1.
- **Acceptance:** los tests cubren: con/sin `unitPrice`, con/sin descuento, `marketPrice` que no
  mejora el precio (→ `null`) y moneda USD.
- **Pitfalls:** el tachado debe corresponder al **mismo** precio que se muestra grande. Si el
  precio titular es el unit price, el tachado es el unit price sin descuento, no el `moqPrice`.
  Nunca tachar la Market price (ADR 0008; comentario existente en el archivo).

### T12 — `HomeOfferCard` presentacional con slot de acción

- **Files:** `src/features/home/_components/home-offer-card.tsx`,
  `src/features/admin/crud/product/product-preview-dialog.tsx`
- **Symbols / signatures:** `HomeOfferCard({ offer, action, size?: "default" | "hero" }: { offer: HomeOffer; action?: ReactNode; size?: ... })`.
- **Change:** rehacer la tarjeta según el mockup: imagen (`ProductImage`) con badge de descuento
  opcional arriba a la izquierda, marca en mayúsculas, nombre (h3, o h2 en `hero`), precio
  titular + unidad, tachado opcional, "Mínimo: …", píldora menta de ahorro opcional, "Total del
  mínimo" y `action` al pie. Imagen y nombre envueltos en `Link` a `/products?product=<id>`.
  La variante `hero` agranda la tipografía y la sombra. En la vista previa admin, pasar
  `action={<Button disabled className="w-full">Sumar al pedido</Button>}`.
- **Mirror this pattern:** la versión actual (uso de `ProductImage` y de `Card`).
- **Depends on:** T11.
- **Acceptance:** sigue siendo un Server Component (sin `"use client"`). La vista previa admin
  compila y renderiza.
- **Pitfalls:** no anidar el `Link` de imagen/nombre con el botón de acción (no puede haber un
  `<button>` dentro de un `<a>`).

### T13 — Isla `HomeOfferAddButton`

- **Files:** `src/features/home/_components/home-offer-add-button.tsx` `[NEW]`
- **Symbols / signatures:** `"use client"`; `HomeOfferAddButton({ offer, isAuthenticated, userId }: { offer: HomeOffer; isAuthenticated: boolean; userId: string | null })`.
- **Change:** `useCartActions({ isAuthenticated, userId })`, `useCartUiStore(s => s.openMiniCart)`,
  y `inCart` derivado de `useCartStore(s => s.items)` por `offer.productClientTermsId`. Al hacer
  clic: si no está en el carrito, `setItem(homeOfferToCartItem(offer))` y después `openMiniCart()`;
  si está, solo `openMiniCart()`. El label es "Sumar al pedido" o "Ver en tu pedido", y el botón
  queda `disabled` mientras `isPending`.
- **Mirror this pattern:** `handleAdd` en `products-client.tsx:137`.
- **Depends on:** T3, T12.
- **Acceptance:** anónimo: agrega localmente y el badge del carrito sube. Logueado: sincroniza
  con el servidor sin error de toast. Un segundo clic no duplica ni incrementa la cantidad.
- **Pitfalls:** hidratación. `useCartStore` persiste en `localStorage`, así que hay que usar
  `hasHydrated` (existe en el store) para no renderizar "Ver en tu pedido" en SSR y cambiarlo
  en el cliente con mismatch. Mientras no hidrate, mostrar "Sumar al pedido".

### T14 — Hero nuevo

- **Files:** `src/features/home/_components/home-hero.tsx`, `src/features/home/home-content.ts`
- **Symbols / signatures:** `HomeHero({ spotlightOffer, hasOffers, isAuthenticated, userId })`; `heroSteps` `[NEW]` en `home-content.ts`.
- **Change:** fondo `bg-brand-ink`, grid de 2 columnas. A la izquierda: chip "Ushuaia · Tierra del
  Fuego" (menta), `h1` "coco" (Bricolage, `clamp(76px,13vw,132px)`), subtítulo "Compras
  comunitarias" (menta), lista ordenada de 3 pasos con iconos lucide en círculos menta ("Sumate
  al pedido de otros vecinos." / "Entre todos acceden a tarifas mayoristas." / "Coco lo entrega
  en tu ciudad."), CTA highlight "Ver qué se puede comprar" → `#ofertas` (o `/products` si
  `!hasOffers`) y la nota "Mirá el catálogo sin registrarte". A la derecha:
  `<HomeOfferCard size="hero" offer={spotlightOffer} action={<HomeOfferAddButton …/>} />`,
  o el fallback gráfico actual si no hay spotlight.
- **Mirror this pattern:** el fallback actual de `HomeHero`.
- **Depends on:** T12, T13.
- **Acceptance:** con spotlight muestra la tarjeta con la acción activa; sin spotlight, el fallback.
  No aparece el copy "esta semana".
- **Pitfalls:** un `h1` "coco" es pobre para SEO. Mantener el `metadata.title/description` de
  `page.tsx` actualizado (T18) y dejar "Compras comunitarias" pegado al h1.

### T15 — `TrustStrip` `[NEW]`

- **Files:** `src/features/home/_components/trust-strip.tsx` `[NEW]`, `src/features/home/home-content.ts` (`trustItems` `[NEW]`)
- **Change:** franja `bg-brand-soft` con 3 ítems (icono en cuadrado blanco + título + texto):
  "Pedido a la vista" (→ "Seguís cada etapa de tu compra en Mis pedidos, desde el pago hasta la
  entrega."), "Pago seguro" ("Pagás al confirmar tu pedido, sin sorpresas después.") y "Precio
  mayorista" ("Compramos en volumen y con menos intermediarios.").
- **Depends on:** T6.
- **Acceptance:** sin "cuánto falta para cerrar" ni "directo del productor".

### T16 — `ProblemSolutionSection` `[NEW]`

- **Files:** `src/features/home/_components/problem-solution-section.tsx` `[NEW]`, `src/features/home/home-content.ts` (`problemSolutionCards` `[NEW]`)
- **Change:** sección `bg-brand-warm`, `id="como-funciona"`, eyebrow "Cómo lo resuelve coco" en
  highlight, h2 "Comprar entre muchos, sin el esfuerzo de coordinar.", y 3 tarjetas: El problema
  (blanca), La solución (`brand-ink`) y El resultado (blanca). El resultado se reescribe sin
  plazo ni garantía, p. ej. "Precio mayorista, sin coordinar nada. Pagás al confirmar y te
  avisamos cada avance hasta que tu compra llega a la ciudad."
- **Depends on:** T6.
- **Acceptance:** `#como-funciona` apunta a esta sección; no aparecen "~10 días" ni "garantizada".

### T17 — Grilla y FAQ

- **Files:** `src/features/home/_components/offers-section.tsx`, `src/features/home/_components/faq-section.tsx`, `src/features/home/home-content.ts` (`faqItems`)
- **Change:**
  - `OffersSection({ offers, isAuthenticated, userId })`: eyebrow "Ofertas destacadas", h2 "Lo
    que se está juntando ahora" (sin "esta semana"), botón outline "Ver todo el catálogo →" y
    grid `auto-fill minmax(255px,1fr)` de `HomeOfferCard` con `HomeOfferAddButton`. El empty
    state se conserva, con CTA a `/#contacto` (footer).
  - `FaqSection`: se compacta visualmente con los nuevos tokens. Se conservan las 6 preguntas;
    se agrega "¿Cuánto tarda en llegar mi compra?", respondida sin plazo fijo ("Depende del
    proveedor y de cuándo se consolida la demanda; vas a ver cada avance en Mis pedidos"), hasta
    un máximo de 7.
- **Depends on:** T12, T13.
- **Acceptance:** `#ofertas` y `#preguntas-frecuentes` existen; la FAQ conserva la pregunta de Roll over.

### T18 — Ensamblado de `page.tsx` y borrado de piezas muertas

- **Files:** `src/app/(storefront)/page.tsx`; se borran `src/features/home/_components/how-it-works-section.tsx`
  y `src/features/home/_components/contact-section.tsx`; `section-heading.tsx` se adapta o se borra según el uso.
- **Change:** orden `HomeHero` → `TrustStrip` → `ProblemSolutionSection` → `OffersSection` →
  `FaqSection` → `HomeFooter`. Pasar `isAuthenticated = Boolean(user)` y `userId`. Actualizar
  `metadata` ("Coco | Compras comunitarias en Ushuaia" + descripción sin plazos). Borrar
  `heroBenefits` y `howItWorksSteps`, y los formatters sin uso.
- **Depends on:** T9, T14–T17.
- **Acceptance:** `pnpm check` sin imports muertos; `pnpm madge:c` sin ciclos nuevos.
- **Pitfalls:** `isActiveUser` ya no lo usa nadie en el home (lo usaba `ContactSection`); quitarlo.

### T19 — Glosario en código

- **Files:** `src/features/admin/glossary/data/catalog.ts`
- **Change:** agregar "Pedido abierto" a `aliases` de "Oferta destacada" y "Total operación" a
  `aliases` de "Precio oferta". Agregar una entrada "Ahorro" (`Market saving`) si el drift test
  (`glossary.data.test.ts`) lo permite sin tocar el schema; si no, dejarla solo en `CONTEXT.md`.
- **Depends on:** —
- **Acceptance:** `pnpm test` (incluido el drift test del glosario) en verde.

### T20 — E2E

- **Files:** `e2e/smoke.spec.ts`
- **Change:** reemplazar los asserts del h1 anterior por `heading level 1 "coco"`. Assertar
  `#como-funciona`, `#ofertas`, `#preguntas-frecuentes` y `#contacto` (footer). El CTA del hero
  apunta a `#ofertas` (o a `/products` sin ofertas). Nuevo test: "Sumar al pedido" abre el
  Mini-cart y el botón cambia a "Ver en tu pedido" (con `skip` si no hay ofertas, como el test
  actual). Nuevo test: el buscador de la navbar navega a `/products?q=`. Ajustar el test mobile
  ("Catálogo" en lugar de "Comprar", si cambia). Reemplazar el test "Ver producto" por un clic
  en el nombre del producto, que lleva a `/products?product=<id>`.
- **Depends on:** T18.
- **Acceptance:** `pnpm test:e2e` en verde.

### T21 — Barrido de copy prohibido

- **Files:** `src/features/home/**`, `src/components/**`
- **Change:** `grep -rniE "pedido abierto|total operaci|personas en este|vecinos (ya )?sumaron|cierra(n)? el|esta semana|10 d[ií]as|garantizad"`
  sobre esas rutas debe devolver vacío.
- **Depends on:** T18.
- **Acceptance:** grep vacío.

## 9. Cross-cutting concerns

- **Data / schema / migration / backfill:** sin migración Prisma. Solo se amplían los selects y
  el schema Zod de salida `homeOfferSchema`, que también consume la vista previa admin
  (`productPreviewSchema`).
- **Config / env / feature flags:** N/A. El copy es estático en `home-content.ts`.
- **Security / permissions:** "Sumar al pedido" usa el mismo camino que el catálogo
  (`useCartActions`), con las validaciones de servidor existentes. El link admin del `UserMenu`
  se muestra solo con `canAccessAdmin`, y las rutas `/admin` conservan su guard. Buscador:
  el `q` viaja por URL y el catálogo ya lo normaliza; no se renderiza como HTML.
- **Observability:** N/A (no hay analítica en scope).

## 10. Pitfalls & gotchas (global)

- **Dos productores de `HomeOffer`:** el home y `mapPreviewHomeOffer` en el admin. Cualquier
  cambio de schema tiene que tocar ambos, o el parse del preview falla en runtime.
- **Portales fuera del wrapper de fuentes** (T4): el Mini-cart, los sheets y los diálogos se
  montan en `body`.
- **Hidratación del carrito** (T13): el estado "en carrito" depende de `localStorage`.
- **`navIcons` indexado** en `mobile-nav-menu.tsx`: queda desalineado si cambia `homeNavLinks`.
- **Altura del chrome:** la barra de anuncio suma altura; revisar `scroll-mt-*` de las secciones
  y cualquier `top-*` sticky en `/products`.
- **Precio tachado coherente** con el precio titular (T11), y nunca la Market price (ADR 0008).
- **El glosario vive en dos lugares** (ADR 0007): `CONTEXT.md` ya se actualizó en esta sesión;
  el dataset en código es T19.
- **Cambios ajenos en el working tree:** al momento de planificar, `src/server/services/checkout/checkout.service.ts`
  tiene modificaciones sin commitear que no pertenecen a este trabajo. No hay que incluirlas en
  los commits de este plan.

## 11. Testing & validation

- **Tests to add/update:**
  - `src/features/cart/cart-mappers.test.ts` `[NEW]`: equivalencia `homeOfferToCartItem` ↔
    `catalogProductToCartItem` (sin descuento, con descuento, con step).
  - `src/features/home/home-formatters.test.ts`: `getOfferHeadlinePrice`, `getOfferMinimumTotal`,
    `getMarketSavingLabel` y el tachado coherente.
  - `src/server/services/home/home-ranking.test.ts`: fixtures con los campos nuevos.
  - `e2e/smoke.spec.ts`: ver T20.
- **Commands:** `pnpm test`, `pnpm check`, `pnpm typecheck`, `pnpm build`, `pnpm test:e2e`.
- **Manual checks / regression risks:**
  - `/` a 1280px y a 360px contra el mockup.
  - Agregar desde el home como anónimo y después loguearse: el carrito se conserva.
  - Agregar desde el home y abrir `/products`: la tarjeta del catálogo muestra la cantidad correcta.
  - Vista previa de producto del admin.
  - Mini-cart y diálogo de producto con la tipografía nueva.
  - Sidebar del admin tras el reajuste de tokens.
- **Success criteria:** todos los comandos en verde, checks manuales sin regresiones y grep de T21 vacío.

## 12. Rollout, migration & rollback

Sin migración de datos ni feature flag: es un cambio de presentación y de un schema de salida.
Se despliega como un PR (o dos: fases 1–3 y fases 4–5). El rollback es un revert del PR; no
deja estado persistido incompatible, porque los ítems de carrito agregados desde el home son
`CartItem` normales. Después del deploy, revisar el home en producción (Vercel) en mobile y
desktop, y confirmar que el preview admin abre.

## 13. Documentation updates

- `docs/plans/home-ui-ux-redesign.md`: agregar al inicio una nota "Superseded en parte por
  `docs/plans/home-community-redesign.md`" (revierte el CTA "Ver producto" y el destino del CTA
  del hero, y elimina Contacto como sección).
- **CONTEXT.md:** actualizado en esta sesión. Se agregó "pedido abierto" a *Avoid* de
  **Featured offer**, "total operación" a *Avoid* de **Offer price** y el término nuevo
  **Market saving** ("Ahorro").
- **ADRs:** ninguno. Las decisiones son reversibles y de presentación.

## 14. Risks & trade-offs

| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| La voz "comunitaria" (vecinos, sumate al pedido) sugiere una compra grupal visible que el sistema no muestra. | Expectativa de ver "cuántos somos" o un cierre. | Media | Medio | La FAQ explica la consolidación; los contadores quedan diferidos como feature propia. |
| El cambio global de navbar y fuentes afecta el checkout. | Es el flujo de conversión y pago. | Media | Alto | T10 más un recorrido manual del checkout completo en sandbox. |
| El `CartItem` desde el home difiere del catálogo. | Precio o cantidad inconsistentes en el carrito. | Baja | Alto | Test de equivalencia (T3). |
| Faltan páginas legales y el botón de arrepentimiento. | Cumplimiento normativo (AR). | Alta (ya ocurre) | Alto | Fuera de scope, pero registrado como diferido prioritario. |
| El h1 "coco" rinde menos en SEO. | Descubribilidad. | Media | Bajo | Metadata descriptiva y subtítulo inmediato. |

## 15. Open questions

- **Blocking:** ninguna.
- **Non-blocking (resolve during execution):**
  - Copy exacto de la barra de anuncio. Default: "Compras comunitarias en Ushuaia · Mirá el
    catálogo sin registrarte".
  - Valor definitivo de WhatsApp (sigue el mock `+54 9 11 0000-0000`). Default: sin cambios.
  - Si el drift test impide agregar "Ahorro" al glosario en código. Default: dejarlo solo en `CONTEXT.md`.
- **Optional refinements:**
  - Badge "Nuevo" por `fromDate` reciente.
  - Autocompletado en el buscador de la navbar.

## 16. Definition of done

- [ ] `/` muestra, en orden: barra, navbar, hero con 3 pasos y spotlight, franja de confianza,
      Problema/Solución/Resultado (`#como-funciona`), grilla (`#ofertas`), FAQ
      (`#preguntas-frecuentes`) y footer (`#contacto`).
- [ ] "Sumar al pedido" agrega el MOQ y abre el Mini-cart; el segundo clic muestra "Ver en tu pedido".
- [ ] El `CartItem` del home es igual al del catálogo (test T3 en verde).
- [ ] El buscador de la navbar lleva a `/products?q=…` y no aparece en `/products`.
- [ ] El storefront usa Bricolage Grotesque/Karla, incluidos el Mini-cart y los diálogos; el admin no cambia de fuente.
- [ ] Un admin accede a `/admin` desde el `UserMenu`.
- [ ] La vista previa de producto del admin renderiza la tarjeta nueva sin acción activa.
- [ ] El grep de copy prohibido (T21) da vacío.
- [ ] `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` y `pnpm build` en verde.

## 17. Instructions for the executing agent

- Usá este plan como fuente principal. Leé primero: `CONTEXT.md` (sección *Catalog and cart*),
  `docs/adr/0008-offer-discount-is-an-attribute-of-client-terms.md`,
  `docs/adr/0007-glossary-stays-code-owned.md`, `src/features/home/**`,
  `src/features/cart/cart-mappers.ts`, `src/features/cart/use-cart-sync.ts`,
  `src/app/(storefront)/products/_components/products-client.tsx` y el mockup (el HTML se
  desempaqueta del bundle: la sección `__bundler/template`).
- Respetá las decisiones de §2 y no toques lo listado en §3 *Must not change*. No crees
  categorías, contadores ni ventanas de cierre, aunque el mockup las muestre.
- Antes de modificar, verificá: la firma real de `useCartActions` y `setItem`; el flag
  `hasHydrated` de `useCartStore`; que `glossary.data.test.ts` acepte el cambio de T19; y
  cualquier `top-*` sticky en `/products`.
- Ejecutá las fases en orden (la 1 y la 2 pueden ir en paralelo) y respetá las dependencias
  entre tareas.
- Implementá al nivel especificado, sin re-arquitecturar. Para los huecos no bloqueantes, seguí
  el default de §15 y dejá registrado el supuesto. No commitees cambios ajenos
  (`checkout.service.ts`).
