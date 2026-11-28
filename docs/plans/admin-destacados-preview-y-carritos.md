# Implementation Plan: vista previa real de Destacados y Carritos sin desborde

> **Tipo:** `implementation-plan` (escrito por `feature-grill`).
> **Origen:** pedido de Flavio del 27/11/2026:
> 1. "La vista previa de destacados tiene que ser un render real de las secciones y componentes para que vean cómo queda. De paso actualizar a los nuevos estándares, estilos y componentes de la app."
> 2. "La pantalla de carrito de admin está rota la UI, hay overflow en ancho. Actualizar a los nuevos estándares, estilos y componentes de la app."
>
> **Base:** rama `checkout-en-tu-pedido` en `653f96e`. Lleva 12 commits que `main` no tiene y que tocan el admin (notificaciones, `admin-nav`), así que esta rama sale de ahí.

## 1. Objective & outcome

- **Done means:**
  - En `/admin/home-offers`, la tarjeta "Vista previa" muestra un iframe con la banda destacada y la sección "Destacados de la semana", dibujadas con los mismos componentes del home (`HomeSpotlightBand`, `FeaturedSection`). Tiene un selector Escritorio (1280 px escalado al ancho) / Celular (390 px) y se recarga después de cada cambio guardado.
  - La página queda con la configuración arriba (Lista a la izquierda; Banda y Relleno a la derecha, desde `xl`) y la vista previa a todo el ancho abajo.
  - Las filas de la Lista muestran el estado con `StatusChip`, incluido el chip nuevo "No entra" para las entradas que quedan fuera por la cantidad de lugares.
  - `/admin/carts` no genera scroll horizontal de página a 1280 px. La tabla no tiene `<select>` por fila, usa `StatusChip` para carrito y orden, y entra sin scroll a 1280 px.
  - Ninguna página del admin con `CrudTable` desborda la página: si la tabla no entra, scrollea dentro de su tarjeta.
- **Why:** la vista previa de hoy es una lista de nombres (`"Arroz yamaní (producto, a mano)"`) y no deja ver cómo queda el home. Carritos desborda porque el `<main>` del shell no se achica (causa verificada, ver §4). Además, es la única tabla del admin con un selector de estado por fila.
- **For:** agente de IA o desarrollador.
- **Upstream design doc:** ninguno. Sigue las convenciones de `docs/plans/admin-content-ui-redesign.md` (primitivas compartidas, `StatusChip`, paleta del admin) y del commit `346854f` (primitivas de detalle).

## 2. Alignment reached

| Tema | Decisión | Fuente |
| --- | --- | --- |
| Cómo se renderiza la vista previa | Ruta propia solo para admins que dibuja `HomeSpotlightBand` + `FeaturedSection` con los datos de `getHomeContent()`, embebida en un iframe con selector Escritorio / Celular. El home usa breakpoints de viewport, así que solo un iframe reproduce el layout real en cada ancho. | user (default aceptado) |
| Alternativas descartadas | Componentes dentro de la página del admin: el layout seguiría el ancho del admin (4 columnas en lugar de 5) y no habría vista de celular. Iframe de `/#ofertas`: trae navbar y hero, y los botones Sumar escribirían en el carrito real del admin. | user |
| Interacción dentro de la vista previa | Solo lectura: el contenido se dibuja dentro de un contenedor `inert`, sin clics, foco ni navegación. El selector de combos queda en la opción inicial, como al cargar el home. | default (ADR 0012 en espíritu: una vista previa no escribe en el carrito) |
| Disposición de la página | Configuración arriba, en dos columnas desde `xl`: Lista a la izquierda; Banda y Relleno a la derecha. Vista previa a todo el ancho abajo. Debajo de `xl`, todo apilado. | user (default aceptado) |
| Qué muestra la vista previa con Relleno sin guardar | Lo guardado, que es lo que el home muestra ahora. Si el formulario de Relleno tiene cambios sin guardar, aparece un aviso arriba de la vista previa con un botón "Guardar cambios". Banda y Lista siguen publicándose al instante. | user (default aceptado) |
| Filas de la Lista | El estado pasa a `StatusChip` con presets del admin y un tooltip explicativo. Las entradas fuera de los lugares llevan el chip "No entra". Los botones quedan como íconos con tooltip. Sin datos nuevos del servidor: ni miniatura ni precio. | user (default aceptado) |
| Causa del desborde de Carritos | `SidebarInset` (el `<main>` del shell) no tiene `min-w-0`, así que crece al ancho mínimo de la tabla en lugar de dejarla scrollear. Se arregla una sola vez en el layout del admin, para todas las tablas. | código + reproducción (§4) |
| Selector de estado por fila en Carritos | Se quita. La columna Estado muestra `StatusChip` (`cartStatusConfig`). El estado se cambia desde "Ver y editar", que ya tiene el campo. | user (default aceptado) |
| Columnas de Carritos | Carrito y usuario en una sola columna; Ítems con los productos en una línea truncada; Orden / Pago con `StatusChip` de la orden y los montos formateados; Actualizado; menú ⋯. Objetivo: entrar a 1280 px sin scroll. | user (default aceptado, vista en el mockup) |
| Endpoint `quickUpdateStatus` | Queda sin uso en el cliente. No se borra en este plan (ver §3, Deferred). | default |

## 3. Scope

- **In scope:**
  - `min-w-0` en `SidebarInset` desde `src/app/admin/layout.tsx`.
  - Restyle de la tabla y la página de Carritos (`/admin/carts`): columnas, chips, quitar el selector por fila y corregir textos sin tilde o en inglés de esa página.
  - Ruta nueva de vista previa (`/admin-preview/home-offers`), el marco del iframe en la página de Destacados, la nueva disposición, las filas con chips y "No entra" y el aviso de cambios sin guardar.
  - Helper puro de ubicación de destacados con sus tests y la configuración de chips de estado de destacados.
  - Una oración en la entrada "Destacado" del glosario del admin, espejo del cambio en `CONTEXT.md`.
- **Out of scope / non-goals:**
  - Cambios en el servidor de Destacados (`home-offers.service.ts`, esquemas, router) y en el home público (`src/app/(storefront)/page.tsx`, componentes de `src/features/home/_components/`). La vista previa los reutiliza tal como están.
  - Un modo borrador para Banda y Lista, o vista previa de valores sin guardar.
  - Miniaturas o precios en las filas de la Lista.
  - Submenús en `CrudRowActions`.
  - Cambios en el diálogo "Ver y editar" (`operations-cart-detail-form.tsx`) y en la página de trazabilidad `/admin/carts/[cartId]` (ya migrados en `346854f`).
  - Una vista de tarjetas para Carritos en celular: la tabla scrollea dentro de su tarjeta, como el resto del admin.
  - Textos "Baja logica" de otras páginas (por ejemplo `product-terms-crud-client.tsx`).
- **Deferred:**
  - Borrar `operationsCart.quickUpdateStatus` (router, servicio y tests) cuando se confirme que no hay otros consumidores.
  - Un e2e autenticado del admin (hoy no hay infraestructura de sesión de admin en `e2e/`).
  - Corregir "Baja logica" en las demás páginas del admin.
- **Must not change / break:**
  - El cálculo del home: la vista previa llama a `getHomeContent()` y no lo copia.
  - Las mutaciones de Destacados: Banda y Lista se publican al instante y Relleno con su botón.
  - `cartStatusConfig` y los demás `*StatusConfig` de `operations-cart.mappers.ts`.
  - Las acciones de fila de Carritos: Ver y editar, Rastrear, Enviar a papelera y Eliminar definitivamente, con sus condiciones `disabled`. También el clic en la fila, que abre "Ver y editar".
  - Los filtros, el orden, la paginación y los indicadores de `/admin/carts`.
  - El carrito real del admin: nada en la vista previa puede escribir en `useCartStore` ni llamar mutaciones `api.cart.*`.

## 4. Current system context

- **Shell del admin:** `src/app/admin/layout.tsx` renderiza `<SidebarProvider>` → `<AdminSidebar>` + `<SidebarInset>` → `<div className="flex min-w-0 flex-1 flex-col p-4 md:p-6">`. `SidebarInset` (`src/components/ui/sidebar.tsx:304`) es `relative flex w-full flex-1 flex-col` sin `min-w-0`, y es un ítem flex de la fila `group/sidebar-wrapper flex`. `Table` (`src/components/ui/table.tsx`) envuelve la tabla en `overflow-x-auto`, pero un contenedor con scroll igual aporta su ancho mínimo de contenido al `<main>`, que crece.
  - **Reproducción** (página estática con la misma estructura, Chromium a 1280 px): `scrollWidth` del documento = **1477 px** tal como está; **1280 px** con `min-width: 0` en `SidebarInset`. Coincide con el desborde de 146 px de `/admin/products` anotado en `docs/plans/home-variante-d-como-funciona.md` §16.
- **Carritos:**
  - `src/app/admin/(operation)/carts/_components/user-carts-client.tsx`: página con `CrudPageShell`, `CrudStatsCards`, `CrudFilterPanel`, `CrudPaginationBar`, `OperationsCartTable`, `OperationsCartDetailForm` y dos `CrudDeleteDialog`. Usa `api.admin.operationsCart.quickUpdateStatus` (líneas 244–253), que es el único consumidor.
  - `src/features/admin/crud/operations-cart/operations-cart-table.tsx`: 6 columnas con `min-w-36/48/56` y `w-40`, más una celda de acciones con `<Select className="w-36">` y `CrudRowActions`. `CartLifecycleBadge` usa `Badge` en lugar de `StatusChip`.
  - `src/features/admin/crud/operations-cart/operations-cart.mappers.ts`: `cartStatusConfig`, `orderStatusConfig`, `transactionStatusConfig` (presets de `src/shared/common/admin-crud/status-presets.ts`), `cartStatusLabelMap` ("Borrador", "Pendiente", "En checkout", "Enviado", …).
  - Patrón a imitar para columnas con chips: `src/features/admin/crud/lot/lot-table.tsx`, `src/features/admin/crud/package/package-table.tsx`, y `src/app/admin/(operation)/notifications/_components/notifications-client.tsx` (la página más reciente del admin).
- **Destacados:**
  - `src/app/admin/(catalog)/home-offers/_components/home-offers-client.tsx` (597 líneas): 4 `Card` apiladas (Banda, Lista, Relleno, Vista previa). Usa las queries `getSettings`, `listCandidates`, `listComboCandidates`, `listFeatured` y `preview` (solo nombres y origen), más las mutaciones `updateSettings`, `setSpotlight`, `addFeatured`, `removeFeatured` y `reorderFeatured`. `hiddenByLimit` se calcula en el cliente (líneas 213–225).
  - Estados de una entrada de la Lista: `homeFeaturedStatusSchema` en `src/schemas/admin/home-offers.schemas.ts` (`shown | noPrice | inactive | sharedCard | inBand`), con `sharedWithName`.
  - Home público: `src/app/(storefront)/page.tsx` llama `getHomeContent()` (`src/server/services/home/home.service.ts`), que es `homeContentOutputSchema.parse(composeCurrentHomeFeatured())`, y renderiza `HomeSpotlightBand` (`src/features/home/_components/home-spotlight-band.tsx`) y `FeaturedSection` (`src/features/home/_components/featured-section.tsx`) con `isAuthenticated` y `userId`.
  - Las reglas de ubicación están en `composeHomeFeatured` (`src/server/services/home/home-featured.ts:176`): la banda primero; después la lista en orden, hasta `featuredLimit`, salteando lo ya mostrado; después el ranking.
  - Layout de la tienda: `src/app/(storefront)/layout.tsx` envuelve todo en `<div className="font-sans" data-storefront="">`. Las fuentes de la tienda dependen de `html:has([data-storefront])` (`src/styles/globals.css:234`). `WeeklyClosingProvider` solo lo lee `hero-closing-timer.tsx`, que no forma parte de la banda ni de la sección.
  - Acoplamiento con el carrito: `HomeOfferCompactPurchase`, `HomeOfferAddButton` y `HomeComboAddButton` usan `useCartActions` (`src/features/cart/use-cart-sync.ts:175`), que no tiene `useEffect` y solo escribe al hacer clic, y `useCartStore` (lectura). `useCartSync`, que hace el bootstrap y puede resetear el carrito, solo lo monta `CartSheet` en el layout de la tienda.
  - Guard: `requireAdmin()` en `src/server/auth/route-guards.ts:35` redirige a `/` si no es admin. No hay middleware. `next.config.js` no manda `X-Frame-Options` ni CSP, así que un iframe del mismo origen carga sin problema.
  - Iframe existente en el admin, como referencia: `src/app/admin/(operation)/notifications/_components/notification-detail.tsx:101` (usa `srcdoc`, no URL).
- **Versiones:** Next `^16.2.2`, React `^19` (`inert` es un prop booleano válido).

## 5. Approach & sequencing

1. **Fase 0, el shell.** Una línea que arregla el desborde de todas las tablas. Va primero porque cambia el ancho disponible con el que se miden las fases siguientes.
2. **Fase 1, Carritos.** Solo presentación en dos archivos. Se verifica a 1280 px.
3. **Fase 2, Destacados.** Primero el helper puro y los chips (con test), después la ruta de vista previa (verificable abriéndola sola en el navegador), después el marco del iframe y por último la reescritura de la página que los une.
4. **Fase 3, verificación** con sesión sobre la base **local**.

Las regresiones se evitan así: ningún cambio de servidor, el cálculo del home se reutiliza sin copiarlo, el helper nuevo tiene tests y las acciones de fila de Carritos no cambian. Un commit por fase.

## 6. Assumptions

| Supuesto | Por qué es razonable | Qué lo invalida | Qué hacer si es falso |
| --- | --- | --- | --- |
| La banda y la sección no necesitan `WeeklyClosingProvider` | Solo `hero-closing-timer.tsx` lo usa en `src/features/home` | La ruta de vista previa tira un error de contexto al renderizar | Envolver la vista previa en `WeeklyClosingProvider` con `getWeeklyClosingSchedule()`, igual que `src/app/(storefront)/layout.tsx` |
| Montar `useCartActions` dentro de `inert` no escribe nada | El hook no tiene efectos; escribe solo en `onClick`, y `inert` bloquea clics y foco | Aparecen cambios en `localStorage["…cart…"]` o requests `cart.*` en la pestaña de red al cargar la vista previa | Pasar a un slot de compra puro (patrón `noop` de `src/features/tutorial/_components/scenes/`) y abrir una pregunta |
| Una entrada `shown` de la Lista siempre ocupa un lugar mientras queden lugares | `describeFeaturedItems` ya excluye la banda (`inBand`, `sharedCard`), y `composeHomeFeatured` pone la lista antes del ranking | El chip "No entra" no coincide con lo que muestra la vista previa | Calcular "No entra" a partir de la respuesta de `preview` (entradas con `source: "list"`) y anotar la diferencia |
| 13 cards a 1280 px escalados al ~76 % se leen bien | El ancho de contenido a 1280 px de viewport es de unos 976 px | Revisión manual: texto ilegible | Bajar el ancho de escritorio de la vista previa a 1140 px o agregar "Abrir en pestaña nueva" |

## 7. Phased execution plan

### Fase 0: el shell no desborda
**Objective:** que ninguna tabla del admin empuje el ancho de la página.
**Tasks:** T0.1.
**Dependencies:** ninguna.
**Validation / done:** a 1280 px, `document.documentElement.scrollWidth === 1280` en `/admin/carts` y `/admin/products`; las tablas scrollean dentro de su tarjeta si no entran.

### Fase 1: Carritos con los estándares del admin
**Objective:** tabla sin selector por fila, con chips, que entra a 1280 px, y textos corregidos.
**Tasks:** T1.1 → T1.2.
**Dependencies:** Fase 0.
**Validation / done:** a 1280 px, la tabla de carritos no tiene scroll horizontal ni dentro de su tarjeta. Clic en la fila → "Ver y editar"; ⋯ → las 4 acciones de siempre. `pnpm typecheck` y `pnpm check` en verde.

### Fase 2: Destacados con vista previa real
**Objective:** página reordenada, filas con chips y "No entra", y vista previa en iframe con Escritorio / Celular.
**Tasks:** T2.1 → T2.2 → T2.3 → T2.4 → T2.5.
**Dependencies:** Fase 0 (el ancho con el que se escala la vista previa).
**Validation / done:** tests de T2.1 en verde. `/admin-preview/home-offers` abierta sola muestra la banda y la sección como el home. En `/admin/home-offers`, agregar, quitar o reordenar recarga la vista previa; Celular muestra 2 columnas; con 6 destacados y 4 lugares, las 2 últimas filas dicen "No entra" y la vista previa muestra 4.

### Fase 3: verificación con sesión
**Objective:** revisión manual de las dos páginas en la base local.
**Tasks:** T3.1.
**Dependencies:** Fases 0–2.
**Validation / done:** §11 completo y sesiones de prueba borradas.

## 8. Task breakdown

### T0.1: `min-w-0` en el `<main>` del shell
- **Files:** `src/app/admin/layout.tsx`
- **Symbols / signatures:** `<SidebarInset>` dentro de `AdminLayout`.
- **Change:** pasar `className="min-w-0"` a `SidebarInset`. No editar `src/components/ui/sidebar.tsx`: es un primitivo de shadcn y lo usan otros layouts.
- **Mirror this pattern:** el `div` hijo ya usa `min-w-0` (línea con `flex min-w-0 flex-1 flex-col`).
- **Depends on:** nada.
- **Acceptance:** a 1280 × 800, `scrollWidth` del documento = 1280 en `/admin/carts` y `/admin/products` (antes: 1477 en la reproducción; 1426 en products según el plan anterior).
- **Pitfalls:** no agregar `overflow-hidden` al `<main>`, porque cortaría los popovers del header y el sticky. Alcanza con `min-w-0`.

### T1.1: tabla de carritos con chips y sin selector
- **Files:** `src/features/admin/crud/operations-cart/operations-cart-table.tsx`
- **Symbols / signatures:**
  - `OperationsCartTable` pierde los props `isQuickStatusPending` y `onQuickStatusChange`. Quedan `carts`, `onEdit`, `onTrace`, `onSoftDelete` y `onHardDelete`.
  - Se borra `CartLifecycleBadge`. `PaymentSummary` se reescribe.
  - `operationsCartColumns` pasa a: `cart` ("Carrito"), `status` ("Estado"), `items` ("Ítems"), `orders` ("Orden / Pago") y `updatedAt` ("Actualizado").
- **Change:**
  - **Carrito:** `cart.code` (font-medium) y debajo `cart.user.name` y `cart.user.email` en `text-xs text-muted-foreground`, con `truncate` y un ancho máximo (por ejemplo `max-w-56`). Si `cart.user.deleted`, la línea "Usuario eliminado" en `text-destructive`. El `#id` sale de la celda: ya está en "Ver y editar" y en la trazabilidad.
  - **Estado:** `<StatusChip config={cartStatusConfig[cart.status]} />`, más el `Badge variant="destructive"` "Eliminado" si `cart.deleted`.
  - **Ítems:** primera línea `"{itemCount} ítem(s) · {totalQuantity}"`. Segunda línea: los nombres de `cart.products` unidos con ", ", en una sola línea con `line-clamp-1` y `title` con la lista completa. "Sin productos activos" si está vacía.
  - **Orden / Pago:** si `cart.latestOrderStatus`, `<StatusChip config={orderStatusConfig[...]}>`; si no, "Sin orden" en muted. Debajo, `"{n} pago(s)"` o "Sin pagos". Si hay pagos y `paymentSummary.currencies.length === 1`, mostrar `"Cobrado {formatCurrency(completedAmount, currency)} · Pendiente {formatCurrency(pendingAmount, currency)}"`; con 0 o más de una moneda, el número crudo, como hoy.
  - **Actualizado:** `formatDateTimeShort(cart.updatedAt)` con `whitespace-nowrap`.
  - **Acciones:** solo `<CrudRowActions actions={actions} item={cart} />`, sin `Select`. Se mantienen las 4 acciones con sus `disabled`/`destructive`, `onRowClick={onEdit}`, `isRowClickDisabled`, `getRowClassName` y `getRowAriaLabel`.
  - Quitar los `min-w-*` heredados de las columnas. Ancho objetivo total: ≤ 960 px.
- **Mirror this pattern:** `src/features/admin/crud/lot/lot-table.tsx` (columna de chip) y `src/features/admin/crud/package/package-table.tsx`.
- **Depends on:** T0.1.
- **Acceptance:** `pnpm typecheck` en verde. A 1280 px de viewport con la barra lateral abierta, la tabla entra sin scroll interno. Los imports de `Select`, `Badge` (si queda sin uso) y `cartStatusOptions` se borran si quedan sin uso (`pnpm check` sin warnings).
- **Pitfalls:** `formatCurrency` está en `~/shared/common/commerce.helpers` y espera un `CatalogCurrency`; los valores de `currencies` vienen de `currencySchema`, así que hay que comprobar que el tipo sea compatible antes de castear. `orderStatusConfig` tiene `chargedBack`, que no está en `orderStatusLabelMap`, y ya está etiquetado ahí, así que se usa `orderStatusConfig` y no el label map.

### T1.2: página de carritos sin el atajo de estado y con textos corregidos
- **Files:** `src/app/admin/(operation)/carts/_components/user-carts-client.tsx`
- **Symbols / signatures:** `UserCartsClient`.
- **Change:**
  - Borrar `quickStatusMutation` y los props que se pasaban a `OperationsCartTable` (`isQuickStatusPending`, `onQuickStatusChange`).
  - Textos: indicador "Abiertos" → descripción "Borrador, pendientes o en checkout"; "Eliminados" → "Baja lógica aplicada"; diálogo de baja → `El carrito "{code}" quedará eliminado lógicamente.` y título "Confirmar baja lógica"; diálogo definitivo → `Escribí "{code}" para confirmar`; estado vacío → "Ajustá los filtros para revisar otros carritos."; filtro "Estado item" → "Estado del ítem".
- **Mirror this pattern:** el voseo y los textos de `notifications-client.tsx`.
- **Depends on:** T1.1.
- **Acceptance:** `pnpm typecheck` y `pnpm check` en verde. `grep -n "quickUpdateStatus" src/app` no devuelve nada.
- **Pitfalls:** no tocar `invalidateCartQueries` ni las demás mutaciones. `quickUpdateStatus` sigue existiendo en `src/server/api/routers/admin/operations-cart.router.ts`, a propósito (Deferred).

### T2.1: ubicación de destacados y chips de estado (puro + tests)
- **Files:**
  - `src/features/admin/crud/home-offers/home-offers-placement.ts` `[NEW]`
  - `src/features/admin/crud/home-offers/home-offers-placement.test.ts` `[NEW]`
  - `src/features/admin/crud/home-offers/home-offers.mappers.ts` `[NEW]`
- **Symbols / signatures:**
  - `findOverflowingFeatured(items: HomeFeaturedListItem[], places: number): Set<number>`: devuelve los `id` de las entradas con `status === "shown"` cuyo orden entre las `shown` es `>= places`. Las demás (`noPrice`, `inactive`, `sharedCard`, `inBand`) no ocupan lugar ni entran en el resultado.
  - `featuredStatusChipConfig(item: HomeFeaturedListItem, overflowing: boolean, places: number): StatusConfig | null`, con presets de `statusPresets`:
    - `shown` y no overflow → `success`, "En la sección"
    - overflow → `attention`, "No entra", hint `"La sección muestra {places} lugares. Sumá lugares en Relleno o quitá otro de arriba."`
    - `inBand` → `inProgress`, "En la banda", hint "Va en la banda; la sección no lo repite."
    - `noPrice` → `failed`, "Sin precio vigente", hint "El home lo saltea hasta que tenga términos vigentes."
    - `inactive` → `attention`, "Inactivo", hint "Activalo en Combos para que se muestre."
    - `sharedCard` → `inert`, `"En la tarjeta de {sharedWithName}"`, hint "Su grupo ya se muestra en otra tarjeta."
- **Change:** las dos funciones son puras y sin React. El mapper importa `statusPresets` de `~/shared/common/admin-crud/status-presets` y el tipo `StatusConfig` de `~/shared/common/admin-crud/status-config`.
- **Mirror this pattern:** `cartStatusConfig` en `src/features/admin/crud/operations-cart/operations-cart.mappers.ts`; tests puros como `src/features/home/home-formatters.test.ts`.
- **Depends on:** nada (puede ir en paralelo con la Fase 1).
- **Acceptance:** `pnpm test src/features/admin/crud/home-offers` en verde, con casos para: lista vacía; menos `shown` que lugares; exactamente igual; 6 `shown` con 4 lugares (devuelve los ids 5.º y 6.º); `noPrice`, `sharedCard` e `inBand` intercalados (no consumen lugar); `places = 1`.
- **Pitfalls:** no recalcular la banda en el cliente. El estado que viene del servidor (`describeFeaturedItems`) ya la excluye, y el `spotlightValue` que filtraba `home-offers-client.tsx` era redundante. Si un test muestra lo contrario, se aplica el supuesto 3 de §6.

### T2.2: ruta de vista previa del home
- **Files:**
  - `src/app/admin-preview/home-offers/page.tsx` `[NEW]`
  - `src/app/admin-preview/home-offers/_components/preview-height-reporter.tsx` `[NEW]`
- **Symbols / signatures:**
  - `export const metadata: Metadata = { title: "Vista previa de destacados", robots: { index: false, follow: false } }`
  - `export default async function HomeOffersPreviewPage()`
  - `PreviewHeightReporter()`, componente cliente sin props.
  - Mensaje: `{ type: "coco:home-offers-preview-height", height: number }`.
- **Change:**
  - La ruta va **fuera** de `src/app/admin/` para no heredar el shell (sidebar, header, FAB). La página llama `await requireAdmin()` primero y después `getHomeContent()`.
  - Renderiza `<div className="font-sans" data-storefront="">` → `<main inert className="flex flex-col">` → `{spotlight ? <HomeSpotlightBand feature={spotlight} isAuthenticated={false} userId={null} /> : null}` + `<FeaturedSection featured={featured} isAuthenticated={false} userId={null} />`. `<PreviewHeightReporter />` va fuera del `main` inerte.
  - `PreviewHeightReporter`: en un `useEffect`, un `ResizeObserver` sobre `document.documentElement` que hace `window.parent.postMessage({ type, height: documentElement.scrollHeight }, window.location.origin)`. También manda la altura una vez al montar. Si `window.parent === window`, no hace nada.
- **Mirror this pattern:** `src/app/(storefront)/page.tsx` (cómo se llama `getHomeContent` y se renderizan las dos piezas) y `src/app/(storefront)/layout.tsx` (el atributo `data-storefront`).
- **Depends on:** nada (en paralelo con T2.1).
- **Acceptance:** abierta sola en el navegador con sesión de admin, `/admin-preview/home-offers` se ve igual que la banda y la sección de `/` (mismas fuentes, colores y columnas). Sin sesión o con usuario no admin, redirige. Al hacer clic en "Sumar" no pasa nada, y `localStorage` del carrito y la pestaña de red no cambian.
- **Pitfalls:**
  - No montar `CartSheet`, `useCartSync` ni `AppNavbar`: `useCartSync` con `isAuthenticated=false` puede resetear el carrito local del admin (`resetForNewSession`).
  - Si no se pone `data-storefront`, la vista previa sale con las fuentes del admin.
  - `inert` en React 19 es booleano: `inert` o `inert={true}`, no `inert=""`.
  - No agregar `export const dynamic`: `requireAdmin()` lee cookies y eso ya la hace dinámica.

### T2.3: marco del iframe
- **Files:** `src/app/admin/(catalog)/home-offers/_components/home-preview-frame.tsx` `[NEW]`
- **Symbols / signatures:** `HomePreviewFrame({ version }: { version: number })`, componente cliente. Constantes `PREVIEW_PATH = "/admin-preview/home-offers"`, `DESKTOP_WIDTH = 1280`, `PHONE_WIDTH = 390`.
- **Change:**
  - Estado `viewport: "desktop" | "phone"`, que se controla con un `ToggleGroup` (`variant="outline"`, ítems "Escritorio" y "Celular") dentro del componente.
  - Estados `contentHeight: number | null` (de los mensajes) y `containerWidth` (de un `ResizeObserver` sobre el contenedor).
  - `<iframe title="Vista previa del home" src={`${PREVIEW_PATH}?v=${version}`} tabIndex={-1} />`.
    - Escritorio: `width: 1280px`, `transform: scale(containerWidth / 1280)`, `transform-origin: top left`, y el contenedor con `height = contentHeight * scale` y `overflow-hidden`.
    - Celular: `width: 390px`, sin escala, centrado, con borde redondeado (`rounded-3xl border`), y alto `contentHeight`.
  - Listener de `message`: acepta solo si `event.origin === window.location.origin`, `event.source === iframeRef.current?.contentWindow` y `data.type === "coco:home-offers-preview-height"`.
  - Hasta el primer mensaje, `<Skeleton className="h-96 w-full" />` superpuesto. Cambiar `version` o `viewport` vuelve a mostrar el skeleton hasta la nueva altura.
- **Mirror this pattern:** `ToggleGroup` como en el criterio de Relleno de `home-offers-client.tsx`; el iframe de `notification-detail.tsx` (título y borde).
- **Depends on:** T2.2.
- **Acceptance:** en Escritorio, el render ocupa todo el ancho de la tarjeta sin scroll interno ni recorte. En Celular, la grilla muestra 2 columnas (`grid-cols-2`, breakpoint de viewport). Al cambiar `version`, el iframe se recarga.
- **Pitfalls:** escalar con `transform` no cambia la caja de layout, así que el alto del contenedor tiene que fijarse a mano (`contentHeight * scale`) o queda un hueco enorme. En Celular, `PreviewHeightReporter` mide el documento ya reflujado a 390 px, que es más alto, así que se usa el mensaje que llega después del cambio.

### T2.4: página de Destacados reordenada
- **Files:** `src/app/admin/(catalog)/home-offers/_components/home-offers-client.tsx`
- **Symbols / signatures:** `HomeOffersClient`; nuevo estado `previewVersion: number`; derivados `isSettingsDirty: boolean` y `overflowingIds = findOverflowingFeatured(featured, placeCount)`.
- **Change:**
  - **Disposición:** dentro de `CrudPageShell`, un `div` con `grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]`. A la izquierda, la Card "Lista de destacados". A la derecha, una columna `flex flex-col gap-5` con "Banda destacada" y "Relleno". Debajo, a todo el ancho, la Card "Vista previa".
  - **Lista:** `<ol>` de filas `flex items-center gap-3 rounded-2xl border p-3`, con: posición (`font-mono text-xs text-muted-foreground`), `Badge variant="outline"` "Combo"/"Producto", el nombre (`min-w-0 flex-1 truncate`), `StatusChip` con `featuredStatusChipConfig(item, overflowingIds.has(item.id), placeCount)`, y tres `Button size="icon" variant="ghost"` (ArrowUp, ArrowDown, X) con `Tooltip` y el mismo `aria-label` de hoy. Se borra `FeaturedStatus`. El `Alert` "Hay más destacados que lugares" queda, con `overflowingIds.size` en lugar de `hiddenByLimit`. El `Field` "Agregar combo o producto" pasa a ancho completo de la Card.
  - **Relleno:** "Guardar configuración" con `disabled={!isSettingsDirty || updateSettingsMutation.isPending}`. `isSettingsDirty` compara el estado local `criterion`, `offersLimit` y `fillWithRanking` contra `settingsQuery.data`.
  - **Vista previa:** `CardHeader` con el título "Vista previa", la descripción "Lo que el home muestra ahora." y un resumen de una línea desde `previewQuery.data`: `"Banda: {nombre} (elegida | del ranking) · Sección: {n} de la lista y {m} del ranking"`, o "Sin banda" / "La sección queda vacía". Si `isSettingsDirty`, un `Alert` antes del marco: "Hay cambios sin guardar en Relleno. La vista previa muestra lo que el home muestra ahora." con `Button variant="highlight"` "Guardar cambios", que llama la misma mutación. Después, `<HomePreviewFrame version={previewVersion} />`.
  - **Recarga:** `invalidateHomeOffers` hace `setPreviewVersion((v) => v + 1)` después de `utils.admin.homeOffers.invalidate()`, y así cubre las 5 mutaciones, incluido el `onError` de `reorderFeatured`.
  - Se borran `hiddenByLimit`, `placedFromList` y `showableListCount`, que reemplaza `findOverflowingFeatured`.
- **Mirror this pattern:** el resto del archivo (queries, mutaciones y combobox) no cambia.
- **Depends on:** T2.1, T2.3.
- **Acceptance:** `pnpm typecheck` y `pnpm check` en verde. Manual (§11): agregar, quitar, subir o bajar recarga la vista previa; cambiar Lugares sin guardar muestra el aviso y deja el render igual; guardar lo actualiza; con más `shown` que lugares, los últimos dicen "No entra" y la vista previa muestra exactamente `places` cards.
- **Pitfalls:**
  - `placeCount` tiene que salir de `settingsQuery.data.offersLimit` (lo guardado), no del input local, porque si no "No entra" contradice la vista previa mientras hay cambios sin guardar.
  - `offersLimit` es un string en el estado local, así que hay que comparar con `Number(offersLimit)`.
  - No quitar `previewQuery`: alimenta el resumen.

### T2.5: glosario del admin, espejo de `CONTEXT.md`
- **Files:** `src/features/admin/glossary/data/catalog.ts` (entrada "Destacado", línea 27).
- **Change:** después de "…se saltean.", agregar: "La sección tiene tantos lugares como fija el administrador; las entradas de la lista que pasan ese número no se muestran hasta que se sumen lugares o se quiten otras de arriba, y el admin las marca \"No entra\"."
- **Mirror this pattern:** ADR 0007 (el glosario es código; `CONTEXT.md` es canónico).
- **Depends on:** nada.
- **Acceptance:** `pnpm test src/features/admin/glossary` en verde.
- **Pitfalls:** respetar el formato de comillas del archivo.

### T3.1: verificación con sesión en la base local
- **Files:** ninguno; el resultado se anota en §16 de este plan como registro de ejecución.
- **Change:** levantar un `next dev` en otro puerto con `DATABASE_URL` apuntando al Postgres local y `APP_ENV=development`. Usar el usuario admin del seed, revisar §11 a 1280 y 390 px, y borrar las sesiones de prueba.
- **Depends on:** Fases 0–2.
- **Acceptance:** los checks manuales de §11 pasan; capturas en `output/` o `tmp/`, no commiteadas.
- **Pitfalls:** **el `.env` apunta a la base Neon de producción (`APP_ENV="production"`) y el `next dev` que suele estar corriendo en :3000 la usa.** No crear sesiones ni datos ahí.

## 9. Cross-cutting concerns

- **Data / schema / migration / backfill:** N/A. No hay cambios en Prisma, esquemas zod de servidor ni routers.
- **Config / env / feature flags:** N/A.
- **Security / permissions:** `/admin-preview/home-offers` queda fuera del layout del admin, así que **tiene que** llamar `requireAdmin()` en la página. No hay middleware que la proteja. Los datos que expone son los mismos del home público, así que el riesgo de fuga es bajo, pero el guard evita que la ruta quede como página pública suelta. `postMessage` usa `targetOrigin` del mismo origen y el receptor valida `origin` y `source`. La ruta es `noindex`.
- **Observability:** N/A.

## 10. Pitfalls & gotchas (global)

- La base de `.env` es producción (ver T3.1). La verificación con sesión solo se hace en la base local.
- `min-w-0` va en el layout del admin, no en `src/components/ui/sidebar.tsx`.
- La vista previa no puede montar `CartSheet` ni `useCartSync`. Montar `useCartActions` dentro de `inert` es seguro porque no tiene efectos.
- Las fuentes de la tienda dependen de `data-storefront` en el DOM de la vista previa.
- Si el carrito local del admin (en ese navegador) ya tiene un producto destacado, su card en la vista previa muestra el stepper en lugar de "Sumar", porque lee el `useCartStore` compartido por origen. Es aceptable y queda anotado en §14.
- Los imports que quedan sin uso tras T1.1 y T1.2 (`Select`, `cartStatusOptions`, `Badge`) los marca `pnpm check`; hay que borrarlos.

## 11. Testing & validation

- **Tests to add/update:**
  - `src/features/admin/crud/home-offers/home-offers-placement.test.ts` `[NEW]`: casos de T2.1 para `findOverflowingFeatured` y una tabla de `featuredStatusChipConfig` (label y variant por estado, overflow con prioridad sobre `shown`).
  - Glosario: el test existente (`glossary.data.test.ts`) sigue en verde tras T2.5.
- **Commands:** `pnpm test`, `pnpm typecheck`, `pnpm check`, `pnpm build`.
- **Manual checks (base local, sesión de admin, 1280 y 390 px):**
  1. `/admin/carts`: sin scroll de página a 1280; tabla sin scroll interno a 1280 con la barra lateral abierta; a 390, la tabla scrollea dentro de su tarjeta y la página no.
  2. `/admin/carts`: clic en la fila abre "Ver y editar"; cambiar el estado ahí funciona; ⋯ muestra las 4 acciones con sus condiciones.
  3. `/admin/products`: sin scroll de página a 1280 (regresión del desborde de 146 px).
  4. `/admin/home-offers` a 1280: Lista a la izquierda, Banda y Relleno a la derecha; vista previa abajo, a todo el ancho, legible.
  5. Escritorio / Celular cambia el render (5 columnas, o 2 en celular).
  6. Agregar, quitar y reordenar recargan la vista previa. Cambiar la banda la recarga y la banda nueva aparece arriba.
  7. Cambiar Lugares sin guardar muestra el aviso; "Guardar cambios" lo publica y la vista previa cambia.
  8. Con más destacados que lugares, el chip "No entra" coincide con lo que falta en la vista previa.
  9. Clic en "Sumar" y en una card dentro de la vista previa: no pasa nada; `localStorage` del carrito sin cambios.
  10. `/admin-preview/home-offers` sin sesión redirige.
- **Regresiones a vigilar:** el home público (`/`) no cambia; el resto de las tablas del admin, tras T0.1, se ven igual o mejor.
- **Success criteria:** los 4 comandos en verde y los 10 checks manuales pasan.

## 12. Rollout, migration & rollback

Un commit por fase en una rama nueva desde `653f96e` (por ejemplo `admin-destacados-carritos`). No hay migraciones ni flags. Para volver atrás se revierten los commits; ninguna fase deja datos. Después del deploy, abrir `/admin/home-offers` en producción una vez y confirmar que la vista previa carga, porque es la primera vez que un iframe del mismo origen corre detrás del proxy de Vercel.

## 13. Documentation updates

- Este plan: completar §16 (registro de ejecución) al terminar.
- `docs/plans/home-variante-d-como-funciona.md` §16: anotar que el desborde de `/admin/products` a 1280 px quedó resuelto por T0.1 (con el hash del commit).
- **CONTEXT.md:** se agregó a **Featured item** (en esta sesión) la regla de los lugares: las entradas de la lista que pasan los lugares no se muestran y el admin las marca "No entra".
- **ADRs:** ninguno. La ruta de vista previa en iframe es reversible y local a una página, así que no cumple los tres criterios.

## 14. Risks & trade-offs

| Riesgo | Por qué importa | Prob. | Impacto | Mitigación |
| --- | --- | --- | --- | --- |
| La vista previa y el home se separan | Si alguien cambia el home sin tocar la ruta de vista previa | Baja | Media | La ruta llama a `getHomeContent()` y renderiza los mismos componentes. Lo único que se repite es la composición `banda + sección`, de dos líneas |
| El estado del carrito del admin se cuela en las cards | Una card muestra stepper en lugar de "Sumar" | Media | Baja | Aceptado. Si molesta, se pasa a un slot de compra puro (supuesto 2) |
| Escalar 1280 → ~976 px deja la letra chica | Es lo que el usuario quiere mirar | Baja | Media | Supuesto 4: bajar el ancho o agregar "Abrir en pestaña nueva" |
| `min-w-0` cambia el ancho de páginas que dependían del desborde | Todas las páginas del admin | Baja | Baja | Revisión manual de 3 páginas (§11.1, .3, .4). El cambio solo deja de desbordar |
| `quickUpdateStatus` queda sin uso | Código muerto con permisos de admin | Alta | Baja | Deferred con nombre propio en §3 |

## 15. Open questions

- **Blocking:** ninguna.
- **Non-blocking:**
  - ¿El resumen "n de la lista y m del ranking" debe contar los combos aparte? Default: no, una card es un lugar.
  - ¿Se borra `quickUpdateStatus` ahora? Default: no (Deferred).
- **Optional refinements:**
  - Botón "Abrir en pestaña nueva" para la vista previa, a ancho real.
  - Resaltar dentro de la vista previa (con un contorno) la card de la fila que tiene el mouse en la Lista. Requiere `data-*` en las cards del home y más mensajes; queda fuera por ahora.

## 16. Definition of done

**Estado:** implementado en la rama `admin-destacados-carritos`, que sale de `checkout-en-tu-pedido` en `4d2588e`. Commits: Fase 0 `71f8bd6`, Fase 1 `e808c0b`, Fase 2 `a25f995`; este registro va en el commit de cierre.

- [x] T0.1: a 1280 px, `/admin/carts` y `/admin/products` no tienen scroll de página.
- [x] T1.1–T1.2: la tabla de Carritos no tiene `<select>`, usa `StatusChip` para carrito y orden y entra a 1280 px; los textos de §T1.2 están corregidos.
- [x] T2.1: `home-offers-placement.test.ts` en verde.
- [x] T2.2: `/admin-preview/home-offers` renderiza la banda y la sección del home, es inerte y exige admin.
- [x] T2.3–T2.4: la vista previa con Escritorio / Celular se recarga tras cada mutación; aviso de Relleno sin guardar; filas con chips y "No entra".
- [x] T2.5: glosario actualizado y su test en verde.
- [x] `pnpm test`, `pnpm typecheck`, `pnpm check`, `pnpm build` en verde.
- [x] Los 10 checks manuales de §11 hechos en la base local; sesiones de prueba borradas.
- [x] §13 completado (anotación en el plan de variante D, con el hash `71f8bd6`).

### Registro de ejecución (27/11/2026)

**Cambios:**

- `src/app/admin/layout.tsx`: `min-w-0` en `SidebarInset`.
- `operations-cart-table.tsx` y `user-carts-client.tsx`:
  - 5 columnas con `StatusChip` y menú ⋯, sin selector por fila.
  - Se quitó `quickStatusMutation` y se corrigieron los 7 textos.
- `src/features/admin/crud/home-offers/`:
  - Archivos nuevos: `home-offers-placement.ts`, `home-offers.mappers.ts` y `home-offers-preview.ts` (la ruta, el tipo de mensaje y su guard), cada uno con su test.
- `src/app/admin-preview/home-offers/`:
  - Ruta nueva con `requireAdmin()`, `data-storefront` y `<main inert>`.
  - `PreviewHeightReporter`.
- `home-preview-frame.tsx` (nuevo):
  - Selector Escritorio / Celular y escala.
  - Validación de `origin`, `source` y `type`.
  - Skeleton y estado de error.
- `home-offers-client.tsx`:
  - Grilla `xl` con la vista previa abajo y filas con chips y "No entra".
  - `isSettingsDirty` con su aviso, y `previewVersion` en `invalidateHomeOffers`.
- `src/features/admin/glossary/data/catalog.ts`: la oración de T2.5.

**Desvíos (justificados):**

- **T2.2, medición del alto.** `PreviewHeightReporter` mide el contenedor `[data-storefront]` y no `documentElement.scrollHeight`. El `body` tiene `min-h-screen`, así que el documento nunca es más bajo que el iframe y el iframe no podría achicarse, por ejemplo al volver de Celular a Escritorio.
- **T2.3, constantes compartidas.** La ruta y el tipo de mensaje viven en `src/features/admin/crud/home-offers/home-offers-preview.ts`, compartidos por el marco y la ruta, con un guard `isPreviewHeightMessage`. Además:
  - El iframe se monta con `key={version}`, así que un mensaje tardío del documento anterior no pasa la validación de `source`.
  - La escala se limita a 1, para no agrandar la vista previa en pantallas anchas.
  - En Celular, el iframe lleva un borde real de 1 px por fuera de los 390 px.
- **T2.3, estado de error (de la mini revisión).** Si el iframe carga y no reporta en 4 s, se muestra "No se pudo cargar la vista previa". Pasa, por ejemplo, con una sesión vencida que redirige.
- **T1.1, montos.** "Cobrado …" y "Pendiente …" van en dos líneas, no en una. En una sola línea, la tabla medía 1038 px contra 974 px disponibles. Ítems pasó a `max-w-52`. Con eso mide 974 px y entra sin scroll.
- **T2.4, aviso de cambios sin guardar.** Usa `AlertTitle` + `AlertDescription` con el mismo texto. Los plurales del aviso y del hint de "No entra" contemplan el caso de 1 lugar.
- **T2.5, comillas.** «No entra» va con comillas angulares, como el resto del glosario.
- **T2.4, resumen de la vista previa.** Si falla `previewQuery`, el resumen muestra un error.

**Pruebas:**

- `pnpm test`: 2568 OK.
- `pnpm typecheck` y `pnpm check`: limpios.
- `pnpm build`: OK, con `/admin-preview/home-offers` dinámica. Como `env.js` exige `APP_ENV=production` en el build, corrió con `APP_ENV=production` y `DATABASE_URL` de la base local.

**Checks manuales (§11):**

- Corrieron con Playwright sobre `next dev -p 3100`, con `DATABASE_URL` del Postgres local `coco-e2e-postgres` (5433), `APP_ENV=development` y la sesión del admin del seed creada en esa base.
- Pasaron los 18 checks, que cubren los 10 de §11:
  - **Desborde:** `scrollWidth` es 1280 en carritos, productos y destacados, y 390 en carritos con el ancho de celular. La tabla de carritos mide 974 de 974 px.
  - **Carritos:** el clic en la fila abre el diálogo, y ⋯ muestra las 4 acciones.
  - **Disposición de Destacados:** Lista a la izquierda, Banda y Relleno a la derecha y la vista previa abajo.
  - **Vista previa:** 5 columnas en Escritorio y 2 en Celular.
  - **Recarga:** agregar y reordenar recargan la vista previa.
  - **Cambios sin guardar:** el aviso aparece y el iframe no cambia mientras hay cambios sin guardar.
  - **"No entra":** con 1 lugar, la vista previa muestra 1 card y hay 3 filas con "No entra".
  - **Solo lectura:** el clic dentro de la vista previa no hace requests `cart.*` ni cambia `localStorage`.
  - **Sin sesión:** `/admin-preview/home-offers` redirige a `/login`.
- Se probó también el estado de error de la vista previa, interceptando la ruta.
- Las sesiones de prueba se borraron, y la Lista y Lugares quedaron como estaban.
- Las capturas quedaron fuera del repo.

**Mini revisión:**

- **`q-review-code`, eje estándares:** *pass with findings*, sin bloqueantes, con 5 sugerencias:
  - Aplicadas: el estado de error de la vista previa, el test del guard de mensajes y los plurales con 1.
  - El comentario sobre el carrito ya estaba reescrito.
  - `quickUpdateStatus` sigue diferido (§3).
- **`q-review-code`, eje especificación:** *pass with findings*, sin bloqueantes. Las 6 observaciones son los desvíos de arriba.
- **`q-review-comments`:** *pass with findings*. De 15 bloques de comentario, se reescribió 1 (el de "Signed out on purpose"), sin bloqueantes.

**Riesgo residual:**

- Las cards de la vista previa leen el carrito local del admin (§14, aceptado).
- Después del deploy, hay que confirmar una vez que el iframe carga detrás del proxy de Vercel (§12).

**Pendientes:**

- **Commits.** Hechos con autorización: un commit por fase en `admin-destacados-carritos`. La rama base había avanzado a `4d2588e`, después del `653f96e` del plan. Falta push y PR.
- **Diferidos de §3.** Siguen igual.

## 17. Instructions for the executing agent

- Usá este plan como fuente principal. Leé primero: `src/app/admin/layout.tsx`, `src/features/admin/crud/operations-cart/operations-cart-table.tsx`, `src/app/admin/(operation)/carts/_components/user-carts-client.tsx`, `src/app/admin/(catalog)/home-offers/_components/home-offers-client.tsx`, `src/app/(storefront)/page.tsx`, `src/app/(storefront)/layout.tsx`, `src/server/services/home/home-featured.ts` (`composeHomeFeatured`), `src/shared/common/admin-crud/status-presets.ts` y `docs/adr/0012-tutorial-runs-in-simulated-scenes.md`.
- Decisiones cerradas (§2): iframe de una ruta propia; configuración arriba y vista previa abajo; vista previa = lo guardado + aviso; chips + "No entra" sin datos nuevos; sin selector de estado por fila; `min-w-0` en el shell.
- No cambies (§3): el servidor de Destacados, los componentes del home, el diálogo "Ver y editar", la trazabilidad del carrito ni `quickUpdateStatus` en el servidor.
- Antes de tocar nada, verificá que `SidebarInset` siga sin `min-w-0` y que `useCartActions` siga sin `useEffect`.
- Ejecutá las fases en orden (T2.1 y T2.2 pueden ir en paralelo con la Fase 1), con un commit por fase.
- Escribí el código que describen las tareas, sin rediseñar la arquitectura. Si un supuesto de §6 resulta falso, aplicá su columna "Qué hacer"; si eso cambia una decisión de §2, pará y preguntá.
- **Nunca** verifiques con sesión contra la base de `.env` (Neon, producción).
