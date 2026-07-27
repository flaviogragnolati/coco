# Implementation Plan: Rediseño de shell, navegación y routing del Admin

## 1. Objective & outcome

- **Done means:** el admin es un shell propio a pantalla completa con sidebar persistente
  en tinta (`brand-ink`), navegación agrupada en 4 grupos (Operación / Pagos / Catálogo /
  Usuarios) definida en una única fuente de verdad, URLs planas de un nivel bajo
  `/admin/<seccion>` con redirects desde las rutas viejas, un dashboard liviano en
  `/admin`, y la paleta de marca aplicada al chrome (sidebar, headers, estados activos)
  sin restylear las tablas densas. Las páginas-hub de tarjetas y el dropdown multinivel
  del navbar desaparecen. Labels en español rioplatense con tildes correctas
  ("Transportistas", no "Carriers"; "Tracking" se mantiene como término de dominio).
- **Why:** hoy el admin no tiene chrome propio: la navegación son 3 páginas-hub de
  tarjetas más un dropdown del navbar, con 4 listas de links hardcodeadas e
  inconsistentes (el dropdown omite Pagos, Tracking, Lotes, Paquetes y Envíos; mobile no
  tiene sub-navegación). El naming confunde (`/admin/crud-home`, `/admin/operations/operations`,
  "CRUD Backoffice" vs "Administración", tildes inconsistentes, mezcla inglés/español) y
  el admin no usa ningún token de la paleta de marca introducida en el rediseño del home.
- **For:** AI coding agent / developer.
- **Upstream design doc:** none. Continúa el rollout de paleta diferido en
  `docs/plans/home-ui-ux-redesign.md` y respeta las decisiones ya implementadas de
  `docs/plans/admin-operational-visualizations.md`.

## 2. Alignment reached

| Topic | Decision | Source |
| --- | --- | --- |
| Modelo de navegación | Sidebar persistente propio del admin (shadcn sidebar), colapsable a icon-rail en desktop y sheet en mobile. Las páginas-hub de tarjetas se eliminan. | user (default aceptado) |
| Agrupamiento | 4 grupos: Operación (Carritos, Operaciones, Lotes, Paquetes, Envíos, Tracking) / Pagos / Catálogo (Productos, Marcas, Proveedores, Términos de producto, Transportistas, Destinos) / Usuarios (Usuarios, Direcciones). | user (default aceptado) |
| Término "Operación" | "Operación" en singular nombra el grupo de monitoreo del flujo; "Operaciones" en plural queda solo para la página de la entidad `Operation` (lote de agregación, per `CONTEXT.md`). | user + `CONTEXT.md` |
| Routing | URLs planas de un nivel: `/admin/<seccion>`, segmentos en inglés. Route groups de Next `(operation)/(catalog)/(people)` solo para organizar carpetas. Redirects viejas→nuevas en `next.config.js`. | user (default aceptado) |
| Dashboard | `/admin` es un dashboard liviano: bienvenida con marca, accesos rápidos derivados de la nav config y el buscador de trazabilidad de carritos. Sin tiles de métricas (feature futura sobre los `getStats` existentes). | user (default aceptado) |
| Profundidad de paleta | Marca en el chrome: sidebar, headers, breadcrumbs, item activo, botones primarios. Radios unificados (eliminar `rounded-none`). Tablas densas y dialogs quedan neutros. | user (default aceptado) |
| Tono del sidebar | Tinta oscura (`brand-ink`), eco del hero/contacto del home; item activo con acento ámbar (`highlight`). Se redefinen los tokens `--sidebar-*` ya presentes en `globals.css`. | user (default aceptado) |
| Labels | Español rioplatense con tildes correctas. "Carriers"→"Transportistas", "Dashboard"→"Inicio". "Tracking" se mantiene (término establecido: `tracking-architecture.md`, `CartItemTrackingEvent`). URLs siempre en inglés. | user (default aceptado) |
| Shell | Shell propio a pantalla completa: el navbar del storefront no aparece en `/admin`. Sidebar a altura completa, header fino (trigger + breadcrumb), menú de usuario + "Ver tienda" en el pie del sidebar. Requiere route group `(storefront)` con layout propio; el layout raíz queda con fonts + providers. | user (default aceptado) |
| Navbar storefront | El dropdown "Administrador" multinivel se reduce a un único link "Administrador" → `/admin` (gated por `canAccessAdmin`). Mobile ya tiene esa única entrada y se mantiene. | user (implicado por sidebar) |
| Fuente de verdad de nav | Un solo módulo de configuración de navegación consumido por sidebar, breadcrumb y accesos rápidos del dashboard. | user (default aceptado) |

## 3. Scope

- **In scope:**
  - Route group `(storefront)` con layout propio (navbar + cart sheet); layout raíz
    reducido a fonts/providers/toaster.
  - Aplanado de rutas admin a `/admin/<seccion>` con route groups y redirects.
  - Componente shadcn `sidebar` + shell admin (`AdminSidebar`, header con breadcrumb),
    nav config única, tokens `--sidebar-*` en tinta.
  - Dashboard liviano en `/admin` (bienvenida, accesos rápidos, buscador de trazabilidad).
  - Reducción del dropdown admin del navbar a un link único.
  - Eliminación de páginas-hub (`crud-home`, `operations` índice) y de los botones
    "volver" manuales de cada página.
  - `CrudPageShell` adaptado a ancho completo dentro del shell.
  - Unificación de radios: reemplazo de los `rounded-none` en paneles/tablas/timeline.
  - Corrección de labels: tildes, "Transportistas", títulos consistentes con el sidebar.
  - `metadata.title` por página admin con template en el layout.
  - Actualización de deep-links internos a las nuevas URLs.
  - Tests: unit de la nav config, e2e de redirects y gate de auth.
- **Out of scope / non-goals:**
  - Restyling de tablas densas, dialogs, forms y badges de estado de los 18 clientes
    CRUD/operativos (más allá del reemplazo puntual de `rounded-none`).
  - Dashboard con métricas/stats agregados.
  - Cambios en routers tRPC, servicios, schemas, permisos o modelo de datos.
  - Cambios funcionales en las páginas (filtros, columnas, mutaciones, diagnósticos).
  - Dark-mode toggle; solo paridad de tokens `.dark`.
  - Renombrado masivo de archivos de componentes cliente (`*-crud-client` vs `*-client`).
  - Cambios en el storefront más allá de mover rutas al route group y reducir el
    dropdown admin del navbar.
- **Deferred:**
  - Tiles de métricas en el dashboard sobre los `getStats` existentes.
  - Restyling profundo de tablas/dialogs con paleta semántica.
  - Búsqueda global / command palette (⌘K) en el admin.
  - Breadcrumbs profundos por entidad (ej. nombre del carrito en el detalle).
- **Must not change / break:**
  - Ninguna URL del storefront (`/`, `/products`, `/cart`, `/checkout`, `/login`,
    `/my-orders`, `/profile`) — el route group no altera URLs.
  - `requireAdmin()` como gate del layout admin y los guards tRPC.
  - Los query params de tracking (`?lotId=`, `?packageId=`, `?shipmentId=`,
    `?cartItemId=`, etc.): los redirects deben preservarlos.
  - El comportamiento de carrito/mini-cart/checkout y el `CartSheet` en el storefront.
  - El contrato de `CrudEntityPage`/`use-crud-entity-page` (solo cambia el shell visual).

## 4. Current system context

- `src/app/admin/layout.tsx` solo ejecuta `requireAdmin()` y devuelve `children`; no hay
  chrome de admin. `requireAdmin()` (`src/server/auth/route-guards.ts`) devuelve la
  sesión autenticada — el layout puede pasar `user` al sidebar.
- `src/app/layout.tsx` renderiza `AppNavbar` (línea 59) y `CartSheet` para todas las
  rutas, incluidas las de admin. Fonts (`Geist`, `Nunito Sans`, `JetBrains Mono`),
  `TRPCReactProvider`, `TooltipProvider` y `Toaster` también viven ahí.
- Navegación actual: dropdown "Administrador" con dos submenús hardcodeados en
  `src/components/app-navbar.tsx:34-93`; hubs de tarjetas en `src/app/admin/page.tsx:19-38`,
  `src/app/admin/crud-home/page.tsx:22-81` y `src/app/admin/operations/page.tsx:25-71`;
  entrada única "Administrador" en `src/components/mobile-nav-menu.tsx:113-119`.
- Rutas actuales: `/admin`, `/admin/payments`, `/admin/crud-home/{suppliers,brands,
  products,product-terms,carriers,destinations,users,addresses}`,
  `/admin/operations/{user-carts,user-carts/[cartId],tracking,lots,operations,packages,
  shipments}`.
- Shell de página: `src/features/admin/crud/_components/crud-page-shell.tsx` —
  `<main>` con `max-w-7xl`; cada página usa el slot `actions` para botones "volver"
  manuales (`payments-admin-client.tsx:674`, `lots-client.tsx:154`,
  `packages-client.tsx:151`, `shipments-client.tsx:157`, `tracking-client.tsx:217`,
  `operations-client.tsx:137`, `user-carts-client.tsx:310` y
  `cart-traceability-client.tsx:101` — estos dos últimos con `<a>` crudo).
- Paleta: `src/styles/globals.css` define tokens de marca (`--brand-soft`, `--brand-warm`,
  `--brand-ink`, `--highlight`) usados por el home, y tokens `--sidebar-*`
  (líneas 108-115 light, 161-168 dark) que hoy nadie consume. No existe
  `src/components/ui/sidebar.tsx`. shadcn configurado en `components.json`
  (style `radix-luma`, alias `~/components`, `~/hooks`).
- El admin no usa ningún token de marca (solo `muted`/`foreground`) y fuerza
  `rounded-none` en: `src/features/admin/crud/_components/crud-table.tsx:54`,
  `crud-entity-page.tsx:109`, `tracking-timeline.parts.tsx:24,45,80,102`,
  `lot-detail-dialog.tsx:39` y 14 lugares de `operation-detail-dialog.tsx`.
- Deep-links a actualizar (template literals):
  `lot-detail-dialog.tsx:29,122`, `package-detail-dialog.tsx:112,222`,
  `shipment-detail-dialog.tsx:233` (→ tracking), `user-carts-client.tsx:297`,
  `cart-traceability-search-card.tsx:80` (→ carts).
- `next.config.js` no tiene `redirects()` aún. E2E: `e2e/smoke.spec.ts` no referencia
  rutas admin. `UserMenu` (`src/components/user-menu.tsx`) ya implementa sign-out con
  `authClient.signOut()` y es reutilizable en el pie del sidebar.
- Patrón a espejar para el dashboard: secciones del home con superficies de marca
  (`src/features/home/_components/home-hero.tsx`, `contact-section.tsx` usan
  `bg-brand-ink`/`bg-brand-soft`/`highlight`).

## 5. Approach & sequencing

Scaffold-then-fill en 6 fases: primero la separación estructural de layouts (route group
storefront), después el aplanado de rutas con redirects (movimientos `git mv` +
actualización mecánica de hrefs), recién entonces el shell con sidebar (que depende de
las rutas nuevas para la nav config), luego el dashboard, el pulido visual/labels y por
último tests/docs. Cada fase deja el build verde (`typecheck` + `build`); la única
ventana degradada es el fin de la Fase 2 (hubs eliminados, sidebar aún no montado —
navegación solo por URL), aceptable dentro del branch. Las regresiones de URLs se
cubren con redirects 307 y asserts e2e; la integridad de la nav config con un unit test.

## 6. Assumptions

| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |
| El componente shadcn `sidebar` está disponible para el style `radix-luma` vía `pnpm dlx shadcn@latest add sidebar` | Es un componente estándar del registry; `components.json` ya está configurado | El registry no lo resuelve o genera conflictos | Vendorear el sidebar desde ui.shadcn.com manualmente en `src/components/ui/sidebar.tsx` |
| Mover rutas a route groups no cambia URLs ni rompe `_components` co-locados | Comportamiento documentado de Next App Router | Colisión de rutas o imports relativos rotos | Ajustar imports; verificar rutas emitidas por `next build` |
| Nada fuera de los archivos enumerados linkea rutas admin viejas | Grep exhaustivo de literales `"/admin...` y template literals ya realizado | Aparece un link no detectado (ej. string construido) | El redirect 307 lo cubre en runtime; corregir el link al detectarlo |
| `TooltipProvider` en el layout raíz alcanza para los tooltips del sidebar colapsado | Ya envuelve `children` para todas las rutas | El sidebar requiere provider propio | Envolver el shell admin con su propio `TooltipProvider` |

## 7. Phased execution plan

### Fase 1 — Route group storefront y layout raíz mínimo
**Objective:** el chrome del storefront deja de renderizarse en `/admin`.
**Tasks:** T1.1, T1.2
**Dependencies:** ninguna.
**Validation / done:** `pnpm build` lista las mismas URLs de storefront; `/` muestra
navbar y cart sheet; `/admin` ya no muestra el navbar (queda sin chrome, transitorio).

### Fase 2 — Aplanado de rutas admin + redirects + deep-links
**Objective:** URLs nuevas planas funcionando, viejas redirigiendo, sin hubs.
**Tasks:** T2.1–T2.5
**Dependencies:** Fase 1 (evita mover archivos dos veces si el orden se invirtiera; no
hay dependencia dura, pero el orden fija el terreno).
**Validation / done:** cada URL nueva responde; cada URL vieja redirige preservando
query params; `pnpm typecheck` verde; grep de `/admin/crud-home` y `/admin/operations/`
sin resultados en `src` (fuera de redirects).

### Fase 3 — Shell admin: sidebar, header, nav config
**Objective:** navegación completa y persistente en todo el admin.
**Tasks:** T3.1–T3.7
**Dependencies:** Fase 2 (la nav config usa las URLs nuevas).
**Validation / done:** desde cualquier página admin se llega a cualquier otra en un
clic; item activo resaltado; mobile navega vía sheet; navbar storefront con link único
"Administrador"; botones "volver" eliminados.

### Fase 4 — Dashboard liviano
**Objective:** `/admin` útil y con marca.
**Tasks:** T4.1
**Dependencies:** Fase 3 (usa la nav config y el shell).
**Validation / done:** `/admin` muestra bienvenida con nombre del usuario, buscador de
trazabilidad funcional y accesos rápidos que navegan.

### Fase 5 — Paleta, radios y labels
**Objective:** chrome con marca consistente y lenguaje corregido.
**Tasks:** T5.1–T5.3
**Dependencies:** Fase 3.
**Validation / done:** cero `rounded-none` en `src/features/admin` y `src/app/admin`;
labels con tildes correctas; "Transportistas" en toda la UI visible; títulos de página
consistentes con el sidebar.

### Fase 6 — Tests y documentación
**Objective:** blindar redirects, gate y nav config; dejar rastro.
**Tasks:** T6.1–T6.3
**Dependencies:** Fases 1–5.
**Validation / done:** `pnpm test`, `pnpm test:e2e`, `pnpm check`, `pnpm typecheck` y
`pnpm build` verdes.

## 8. Task breakdown

### T1.1 — Crear route group `(storefront)` con layout propio
- **Files:** `src/app/(storefront)/layout.tsx` `[NEW]`; mover (`git mv`)
  `src/app/page.tsx`, `src/app/cart/`, `src/app/checkout/`, `src/app/login/`,
  `src/app/my-orders/`, `src/app/products/`, `src/app/profile/` →
  `src/app/(storefront)/...`. `src/app/api/` y `src/app/admin/` no se mueven.
- **Symbols / signatures:** `export default async function StorefrontLayout({ children })`
  — async server component; llama `getSession()` y renderiza
  `<AppNavbar session={session} />`, `{children}`, `<CartSheet …/>`.
- **Change:** el nuevo layout absorbe exactamente el JSX de navbar + cart sheet que hoy
  vive en el layout raíz (`src/app/layout.tsx:57-62`), incluida la prop
  `isAuthenticated`/`userId` de `CartSheet`.
- **Mirror this pattern:** el propio `src/app/layout.tsx` actual (traslado, no invención).
- **Depends on:** —
- **Acceptance:** `next build` emite las mismas rutas públicas; `/products` muestra
  navbar; ningún import relativo roto (`pnpm typecheck`).
- **Pitfalls:** `page.tsx` raíz debe quedar dentro del grupo (no puede haber `page.tsx`
  en `src/app/` y en `(storefront)/` a la vez); los `_components` co-locados se mueven
  con sus carpetas.

### T1.2 — Reducir el layout raíz a fonts + providers
- **Files:** `src/app/layout.tsx`
- **Symbols / signatures:** `RootLayout` deja de llamar `getSession()`.
- **Change:** eliminar `AppNavbar`, `CartSheet` y sus imports; conservar `html/body`,
  fonts, `TRPCReactProvider`, `TooltipProvider`, `Toaster`, `metadata`.
- **Depends on:** T1.1
- **Acceptance:** `/admin` renderiza sin navbar del storefront; `pnpm typecheck` verde.
- **Pitfalls:** no mover los `next/font` fuera del layout raíz; `Toaster` debe quedar
  global (el admin usa toasts).

### T2.1 — Mover rutas de operación a `(operation)` con URLs planas
- **Files:** `git mv` dentro de `src/app/admin/`:
  `operations/user-carts/` → `(operation)/carts/` (incluye `[cartId]/`);
  `operations/operations/` → `(operation)/operations/`;
  `operations/lots|packages|shipments|tracking/` → `(operation)/...`;
  eliminar `operations/page.tsx`; mover
  `operations/_components/cart-traceability-search-card.tsx` →
  `src/features/admin/shell/cart-traceability-search-card.tsx` `[NEW dir]`.
- **Symbols / signatures:** sin cambios de exports; solo paths e imports.
- **Change:** movimientos de carpeta + fix de imports. El componente de búsqueda queda
  temporalmente sin consumidor (lo retoma T4.1).
- **Depends on:** Fase 1
- **Acceptance:** `/admin/carts`, `/admin/carts/[cartId]`, `/admin/operations`,
  `/admin/lots`, `/admin/packages`, `/admin/shipments`, `/admin/tracking` responden.
- **Pitfalls:** `/admin/operations` pasa de hub a página de la entidad — es intencional;
  el route group `(operation)` no debe aparecer en la URL.

### T2.2 — Mover rutas CRUD a `(catalog)` y `(people)`
- **Files:** `git mv`: `crud-home/{suppliers,brands,products,product-terms,carriers,destinations}/`
  → `(catalog)/...`; `crud-home/{users,addresses}/` → `(people)/...`;
  eliminar `crud-home/page.tsx`.
- **Change:** movimientos + fix de imports.
- **Depends on:** Fase 1
- **Acceptance:** las 8 URLs `/admin/<entidad>` responden; `pnpm typecheck` verde.
- **Pitfalls:** ninguna colisión esperada; verificar que no queden carpetas `crud-home/`
  ni `operations/` vacías.

### T2.3 — Redirects en `next.config.js`
- **Files:** `next.config.js`
- **Symbols / signatures:** `config.redirects = async () => [...]`
- **Change:** agregar (todos `permanent: false`):
  `/admin/crud-home` → `/admin`;
  `/admin/crud-home/:path*` → `/admin/:path*`;
  `/admin/operations/user-carts` → `/admin/carts`;
  `/admin/operations/user-carts/:cartId` → `/admin/carts/:cartId`;
  `/admin/operations/operations` → `/admin/operations`;
  `/admin/operations/:section(lots|packages|shipments|tracking)` → `/admin/:section`.
- **Depends on:** T2.1, T2.2
- **Acceptance:** e2e/curl: cada vieja devuelve 307 a la nueva;
  `/admin/operations/tracking?lotId=x` → `/admin/tracking?lotId=x` (query preservada).
- **Pitfalls:** no agregar redirect para `/admin/operations` exacta (ahora es página
  real); el matcher con regex `(lots|packages|shipments|tracking)` evita capturar rutas
  nuevas inexistentes.

### T2.4 — Actualizar deep-links internos a URLs nuevas
- **Files:** `src/features/admin/crud/lot/lot-detail-dialog.tsx:29,122`,
  `src/features/admin/crud/package/package-detail-dialog.tsx:112,222`,
  `src/features/admin/crud/shipment/shipment-detail-dialog.tsx:233`
  (`/admin/operations/tracking?…` → `/admin/tracking?…`);
  `src/app/admin/(operation)/carts/_components/user-carts-client.tsx:297`
  (`router.push` → `/admin/carts/${cart.id}`);
  `src/features/admin/shell/cart-traceability-search-card.tsx:80`
  (→ `/admin/carts/${cart.id}`);
  `src/app/admin/(operation)/carts/[cartId]/_components/cart-traceability-client.tsx:101`
  (→ `/admin/carts`, y reemplazar `<a>` por `next/link`).
- **Change:** solo strings de href y el reemplazo `<a>`→`<Link>` indicado.
- **Depends on:** T2.1, T2.2
- **Acceptance:** grep `-r '/admin/operations/\|/admin/crud-home'` en `src/` sin
  resultados; navegación por dialogs de lote/paquete/envío aterriza en `/admin/tracking`.
- **Pitfalls:** el link de vuelta de `user-carts-client.tsx:310` no se toca acá — lo
  elimina T3.6.

### T2.5 — Reescribir transitoriamente `/admin` como índice mínimo
- **Files:** `src/app/admin/page.tsx`
- **Change:** reemplazar las 3 tarjetas hub por una lista plana provisoria de links a
  las 15 páginas (se reescribe en T4.1); elimina referencias a `/admin/crud-home`.
- **Depends on:** T2.1, T2.2
- **Acceptance:** `/admin` compila y navega; no linkea rutas viejas.
- **Pitfalls:** no invertir esfuerzo visual: es andamiaje para mantener la Fase 2 verde.

### T3.1 — Agregar componente shadcn sidebar
- **Files:** `src/components/ui/sidebar.tsx` `[NEW]`, `src/hooks/use-mobile.ts` `[NEW]`
  (los genera `pnpm dlx shadcn@latest add sidebar`).
- **Change:** ejecutar el add; revisar que use los tokens `--sidebar-*` y los alias
  `~/components`, `~/hooks`.
- **Depends on:** —
- **Acceptance:** `pnpm typecheck` y `pnpm check` verdes tras el add.
- **Pitfalls:** el add puede sobrescribir `button.tsx`/`sheet.tsx` u otros existentes —
  revisar el diff y descartar cambios no relacionados.

### T3.2 — Nav config única
- **Files:** `src/features/admin/shell/admin-nav.ts` `[NEW]`
- **Symbols / signatures:**
  `type AdminNavItem = { title: string; href: string; icon: LucideIcon }`;
  `type AdminNavGroup = { label: string; items: AdminNavItem[] }`;
  `export const adminNavGroups: AdminNavGroup[]`;
  `export const adminHome: AdminNavItem` (Inicio → `/admin`);
  `export function findAdminNavItem(pathname: string): { group?: AdminNavGroup; item: AdminNavItem } | null`
  (match por prefijo más largo, para breadcrumb y estado activo).
- **Change:** grupos y labels exactos: Operación (Carritos `/admin/carts`, Operaciones
  `/admin/operations`, Lotes `/admin/lots`, Paquetes `/admin/packages`, Envíos
  `/admin/shipments`, Tracking `/admin/tracking`); Pagos (Pagos `/admin/payments`);
  Catálogo (Productos, Marcas, Proveedores, Términos de producto `/admin/product-terms`,
  Transportistas `/admin/carriers`, Destinos); Usuarios (Usuarios, Direcciones). Iconos
  lucide a criterio del ejecutor.
- **Mirror this pattern:** `src/features/home/home-content.ts` (config de nav tipada).
- **Depends on:** Fase 2
- **Acceptance:** unit test T6.1 pasa; hrefs únicos y todos con prefijo `/admin`.
- **Pitfalls:** `findAdminNavItem` debe preferir `/admin/carts` sobre `/admin` para
  `/admin/carts/xyz` (prefijo más largo, no primer match).

### T3.3 — `AdminSidebar`
- **Files:** `src/features/admin/shell/admin-sidebar.tsx` `[NEW]` (client)
- **Symbols / signatures:** `export function AdminSidebar({ user }: { user: AuthUser })`
- **Change:** `Sidebar collapsible="icon"` con header (marca "Coco · Admin" linkeando a
  `/admin`), item "Inicio" (`adminHome`), un `SidebarGroup` por `adminNavGroups` con
  `SidebarGroupLabel`, items con icono + `isActive` vía `usePathname()` +
  `findAdminNavItem`; footer con `UserMenu` (`src/components/user-menu.tsx`) y link
  "Ver tienda" → `/`.
- **Mirror this pattern:** bloques `sidebar-07` de shadcn (estructura estándar
  SidebarProvider/Sidebar/SidebarInset).
- **Depends on:** T3.1, T3.2
- **Acceptance:** navegación completa en desktop (expandido y colapsado a iconos con
  tooltips) y mobile (sheet).
- **Pitfalls:** `usePathname` exige client component; `UserMenu` ya es client — verificar
  que su dropdown no quede recortado por el footer colapsado (usar el slot de footer del
  sidebar tal como lo hacen los bloques shadcn).

### T3.4 — Header del shell con breadcrumb
- **Files:** `src/features/admin/shell/admin-header.tsx` `[NEW]` (client)
- **Symbols / signatures:** `export function AdminHeader()`
- **Change:** fila fina sticky con `SidebarTrigger`, `Separator` vertical y breadcrumb
  "Inicio / {Grupo} / {Página}" derivado de `findAdminNavItem(usePathname())`; en
  `/admin` muestra solo "Inicio"; para rutas más profundas que el item (ej.
  `/admin/carts/[cartId]`) el breadcrumb termina en el item matcheado.
- **Depends on:** T3.2
- **Acceptance:** breadcrumb correcto en las 16 páginas.
- **Pitfalls:** los crumbs intermedios de grupo no son links (los grupos no tienen URL).

### T3.5 — Montar el shell en el layout admin
- **Files:** `src/app/admin/layout.tsx`
- **Symbols / signatures:** sigue siendo async; `const session = await requireAdmin()`.
- **Change:** envolver con `SidebarProvider` → `AdminSidebar user={session.user}` +
  `SidebarInset` → `AdminHeader` + `<main className="p-4 md:p-6">{children}</main>`.
- **Depends on:** T3.3, T3.4
- **Acceptance:** todas las páginas admin renderizan dentro del shell; el gate
  `requireAdmin()` sigue redirigiendo anónimos a `/login` y no-admins a `/`.
- **Pitfalls:** NO eliminar la llamada `requireAdmin()` — es el único gate de ruta.

### T3.6 — Adaptar `CrudPageShell` y eliminar botones "volver"
- **Files:** `src/features/admin/crud/_components/crud-page-shell.tsx`;
  `payments-admin-client.tsx:674`, `lots-client.tsx:154`, `packages-client.tsx:151`,
  `shipments-client.tsx:157`, `tracking-client.tsx:217`, `operations-client.tsx:137`,
  `user-carts-client.tsx:310` (paths post-move bajo `(operation)`/`payments`).
- **Change:** `CrudPageShell` deja de ser `<main min-h-screen>` con `max-w-7xl`: pasa a
  `<div>` de ancho completo con `flex flex-col gap-5` (el `<main>` y el padding los pone
  el layout, T3.5). Quitar los botones/links "volver" del slot `actions` (los `actions`
  restantes, ej. botón crear de `CrudEntityPage`, quedan). El link "Volver a carritos"
  de `cart-traceability-client.tsx` se conserva (ya actualizado en T2.4) por ser página
  de detalle.
- **Depends on:** T3.5
- **Acceptance:** sin dobles `<main>` anidados (grep `<main` en `src/features/admin` y
  `src/app/admin`); tablas ocupan el ancho del inset; cero botones "volver" en páginas
  de primer nivel.
- **Pitfalls:** `src/app/admin/page.tsx` transitorio (T2.5) también debe dejar de
  declarar su propio `<main>` cuando T4.1 lo reescriba.

### T3.7 — Reducir el dropdown admin del navbar
- **Files:** `src/components/app-navbar.tsx`
- **Change:** eliminar `adminDashboardLink`, `adminCrudLinks`, `adminOperationsLinks`
  (líneas 34-93) y el `DropdownMenu` multinivel (127-183); dejar un único
  `Button variant` link "Administrador" → `/admin`, gated por `canAccessAdmin`.
  `mobile-nav-menu.tsx` no cambia.
- **Depends on:** Fase 2 (para no linkear rutas muertas)
- **Acceptance:** storefront muestra el link solo a admins; `pnpm check` sin imports
  muertos.
- **Pitfalls:** conservar `canAccessAdmin`/`isActiveUser` para el resto del navbar.

### T4.1 — Dashboard liviano en `/admin`
- **Files:** `src/app/admin/page.tsx` (reescritura);
  usa `src/features/admin/shell/cart-traceability-search-card.tsx`.
- **Symbols / signatures:** server component async; obtiene el nombre vía
  `requireAdmin()`… ya garantizado por el layout — usar `getSession()` o recibir nada y
  leer sesión con `getSession()` de `~/server/better-auth/server` (no duplicar guard).
- **Change:** banda de bienvenida sobre `bg-brand-ink text-brand-ink-foreground` con
  saludo ("Hola, {nombre}") y bajada "Panel de administración de Coco" (espejar
  composición de `home-hero.tsx`/`contact-section.tsx`); debajo, el
  `CartTraceabilitySearchCard`; debajo, "Accesos rápidos" en grilla generada desde
  `adminNavGroups` (título + icono por item, agrupados). `metadata.title = "Inicio"`.
- **Mirror this pattern:** `src/features/home/_components/contact-section.tsx` (banda
  ink) y `src/app/admin/crud-home/page.tsx` previo (grilla de cards, versión reducida).
- **Depends on:** T3.2, T3.5, T2.1 (search card movido)
- **Acceptance:** buscar un carrito navega a `/admin/carts/{id}`; accesos rápidos
  navegan; sin llamadas a endpoints de stats.
- **Pitfalls:** el search card es client — el page puede seguir siendo server component
  que lo compone.

### T5.1 — Tokens `--sidebar-*` en tinta
- **Files:** `src/styles/globals.css` (líneas 108-115 `:root` y 161-168 `.dark`)
- **Change:** redefinir en ambos bloques (paridad):
  `--sidebar: var(--brand-ink)` → en `:root` equivale a `oklch(0.235 0.045 215)`;
  `--sidebar-foreground: var(--brand-ink-foreground)`;
  `--sidebar-primary: var(--highlight)` y
  `--sidebar-primary-foreground: var(--highlight-foreground)` (item activo ámbar);
  `--sidebar-accent: oklch(0.30 0.05 215)` (hover, tinta más clara) con
  `--sidebar-accent-foreground: var(--brand-ink-foreground)`;
  `--sidebar-border: oklch(0.32 0.045 215)`; `--sidebar-ring: var(--ring)`.
  Valores de partida — ajustar a ojo si el contraste AA lo pide.
- **Depends on:** T3.1
- **Acceptance:** sidebar tinta con texto marfil, activo ámbar con texto oscuro, hover
  perceptible; contraste AA en labels de grupo (subir opacidad si hace falta).
- **Pitfalls:** en `.dark` los mismos valores (la tinta ya es oscura); no tocar los
  tokens no-sidebar.

### T5.2 — Unificar radios (eliminar `rounded-none`)
- **Files:** `src/features/admin/crud/_components/crud-table.tsx:54`,
  `crud-entity-page.tsx:109`,
  `src/features/admin/crud/tracking/tracking-timeline.parts.tsx:24,45,80,102`,
  `src/features/admin/crud/lot/lot-detail-dialog.tsx:39`,
  `src/features/admin/crud/operation/operation-detail-dialog.tsx` (14 ocurrencias).
- **Change:** contenedores externos (tablas, paneles): `rounded-none` → `rounded-2xl`
  (+ `overflow-hidden` donde el header de tabla pinte fondo); elementos internos de
  timeline/listas: → `rounded-lg`.
- **Depends on:** —
- **Acceptance:** grep `rounded-none` en `src/features/admin` + `src/app/admin` vacío;
  sin esquinas sangrando en tablas con scroll.
- **Pitfalls:** en contenedores con `overflow-x-auto` el radio requiere
  `overflow-hidden` en el wrapper externo, no en el scrollable.

### T5.3 — Corrección de labels y títulos + metadata
- **Files:** `src/features/admin/crud/carrier/*` y su client
  (`(catalog)/carriers/_components/carrier-crud-client.tsx`): "Carriers" →
  "Transportistas" en título, descripciones y copy visible;
  `product-terms-crud-client.tsx:591` → "Términos y restricciones de producto";
  `shipments-client.tsx:164` → "Envíos"; `tracking-client.tsx:224` → "Tracking";
  `user-carts-client.tsx:314` → "Carritos"; barrido de tildes en descripciones de
  páginas admin ("lineas"→"líneas", "logisticos"→"logísticos", "Depositos"→"Depósitos",
  "Revision"→"Revisión", etc.); `src/features/admin/crud/_lib/crud-entity-copy.ts` si
  contiene copy visible. Agregar en `src/app/admin/layout.tsx`
  `export const metadata = { title: { template: "%s · Coco Admin", default: "Coco Admin" } }`
  y `metadata.title` por página igual al label del sidebar.
- **Change:** solo strings visibles y metadata; no tocar identifiers, rutas ni enums.
- **Depends on:** Fase 2 (paths finales)
- **Acceptance:** títulos h1 == labels del sidebar (salvo detalle de carrito
  "Trazabilidad de carrito"); pestañas del navegador muestran "Lotes · Coco Admin".
- **Pitfalls:** no traducir valores de datos ni códigos de diagnóstico; "Tracking" queda.

### T6.1 — Unit test de la nav config
- **Files:** `src/features/admin/shell/admin-nav.test.ts` `[NEW]`
- **Change:** asserts: hrefs únicos; todos empiezan con `/admin`; sin trailing slash;
  `findAdminNavItem("/admin/carts/abc")` → Carritos;
  `findAdminNavItem("/admin")` → Inicio; `findAdminNavItem("/products")` → null.
- **Depends on:** T3.2
- **Acceptance:** `pnpm test` verde.

### T6.2 — E2E de redirects y gate
- **Files:** `e2e/smoke.spec.ts` (extender)
- **Change:** asserts anónimos: `/admin` → termina en `/login`;
  `/admin/crud-home/products` → redirige a `/admin/products` (y de ahí a `/login` por el
  gate — assert de la cadena o del `Location` del 307 con `request` API);
  `/admin/operations/tracking?lotId=x` → `Location: /admin/tracking?lotId=x`.
- **Depends on:** T2.3, T3.5
- **Acceptance:** `pnpm test:e2e` verde.
- **Pitfalls:** usar `page.request.get(url, { maxRedirects: 0 })` para assertar el 307
  sin depender de sesión.

### T6.3 — Documentación
- **Files:** `docs/plans/admin-shell-navigation-redesign.md` (este plan, marcar
  ejecución si el repo lo acostumbra); `CONTEXT.md` ya actualizado (término Carrier).
- **Change:** ninguna doc adicional; el `README.md` no documenta rutas admin.
- **Depends on:** —
- **Acceptance:** N/A.

## 9. Cross-cutting concerns

- **Data / schema / migration / backfill:** N/A — cero cambios de datos.
- **Config / env / feature flags:** solo `redirects()` en `next.config.js`; sin envs.
- **Security / permissions:** `requireAdmin()` permanece como único gate de ruta en
  `src/app/admin/layout.tsx`; los guards tRPC (`adminProcedure`) no se tocan. El link
  "Administrador" del navbar sigue gated por `canAccessAdmin` (es solo visibilidad, la
  seguridad real es el guard).
- **Observability (logs / metrics / tracing):** N/A.

## 10. Pitfalls & gotchas (global)

- **Los route groups no cambian URLs, pero un `page.tsx` duplicado sí rompe el build**:
  tras cada `git mv`, correr `pnpm build` y comparar el listado de rutas emitido.
- **Orden Fase 2 → Fase 3**: entre el borrado de hubs y el montaje del sidebar el admin
  no tiene navegación visual; no cortar el trabajo en ese punto.
- **`/admin/operations` cambia de significado** (hub → página de la entidad Operation):
  no agregar redirect para esa URL exacta o se rompe la página nueva.
- **Query params en redirects**: Next los preserva por defecto — no escribir
  `destination` con query hardcodeada.
- **`shadcn add sidebar` puede tocar componentes ui existentes**: revisar el diff y
  revertir cambios colaterales a `button.tsx`, `sheet.tsx`, etc.
- **Imports `~/...` sobreviven a los `git mv`, los relativos no**: los `_components`
  usan mayormente alias, pero verificar con `pnpm typecheck` tras cada lote de moves.
- **Grep final obligatorio**: `/admin/crud-home` y `/admin/operations/` no deben quedar
  en `src/` (los matches de `services/admin/`, `routers/admin/` son import paths, no
  URLs — no confundirlos).
- **Doble `<main>`**: el layout admin pasa a poseer el `<main>`; `CrudPageShell` y el
  dashboard deben dejar de declararlo.

## 11. Testing & validation

- **Tests to add/update:** `src/features/admin/shell/admin-nav.test.ts` (integridad de
  nav config, T6.1); `e2e/smoke.spec.ts` (redirects 307 con query preservada, gate
  anónimo → `/login`, T6.2).
- **Commands:** `pnpm typecheck`, `pnpm check`, `pnpm test`, `pnpm test:e2e`,
  `pnpm build`.
- **Manual checks / regression risks:** navegar las 16 páginas desde el sidebar
  (desktop expandido, colapsado a iconos, mobile sheet); deep-links de dialogs de
  lote/paquete/envío a `/admin/tracking?…` con filtros aplicados; buscador de
  trazabilidad → detalle de carrito → "Volver a carritos"; storefront intacto
  (navbar, cart sheet, anclas, checkout); login/logout desde el pie del sidebar.
- **Success criteria:** todos los comandos verdes + checklist manual sin regresiones.

## 12. Rollout, migration & rollback

Un solo PR (o PRs por fase en el orden dado); sin flags. Los redirects 307 cubren
bookmarks y links históricos indefinidamente — no hay ventana de rotura. Rollback:
revertir el merge; no hay migraciones ni estado persistente involucrado. Post-release:
verificar en producción una URL vieja de cada familia (`crud-home/products`,
`operations/tracking?lotId=…`, `operations/user-carts/{id}`).

## 13. Documentation updates

- **CONTEXT.md:** término **Carrier** agregado (label UI "Transportista") — hecho en
  esta sesión.
- **ADRs:** None — las decisiones (sidebar, URLs planas, shell propio) son reversibles
  y quedan registradas en §2; ninguna cumple el umbral de ADR.
- Otros docs: ninguno; `docs/plans/admin-operational-visualizations.md` menciona "hub
  cards" ya obsoletas — no se edita (es un plan histórico ya ejecutado).

## 14. Risks & trade-offs

| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| El add de shadcn sidebar no calza con el style `radix-luma` | Bloquearía la Fase 3 | Baja | Medio | Vendorear el componente manualmente; los tokens ya existen |
| Links a rutas viejas no detectados (strings construidos dinámicamente) | 404s silenciosos | Baja | Bajo | Redirects 307 los absorben; e2e cubre las familias |
| Route group move rompe algún import relativo profundo | Build rojo | Media | Bajo | `pnpm typecheck` tras cada lote de `git mv` |
| Contraste insuficiente de labels/hover sobre tinta | Accesibilidad del chrome | Media | Bajo | Valores de partida en T5.1 + ajuste manual AA |
| `/admin/operations` re-significada confunde a usuarios con bookmarks | UX puntual | Baja | Bajo | La página nueva es la entidad homónima; breadcrumb y h1 lo aclaran |

## 15. Open questions

- **Blocking (resolve before execution):** ninguna.
- **Non-blocking (resolve during execution):**
  - Ajuste fino de los valores oklch de `--sidebar-accent`/`--sidebar-border` — default:
    los de T5.1, retocar por contraste.
  - Iconos lucide por item — default: elección del ejecutor, consistentes en stroke.
- **Optional refinements:**
  - Renombrar `user-carts-client.tsx` → `carts-client.tsx` (su carpeta ya se llama
    `carts/`); fuera de alcance el renombrado masivo de clients.
  - Command palette (⌘K) sobre `adminNavGroups` — diferido.
  - Tiles de métricas en el dashboard sobre los `getStats` existentes — diferido.

## 16. Definition of done

- [x] `/admin` sin navbar del storefront; storefront con URLs y chrome intactos.
- [x] Sidebar tinta persistente con 4 grupos + Inicio, activo resaltado, colapsable y
      funcional en mobile; usuario + "Ver tienda" en el pie.
- [x] Las 16 URLs nuevas planas responden; las 15 viejas redirigen 307 preservando query.
- [x] Dropdown del navbar reducido a link único "Administrador".
- [x] Hubs y botones "volver" eliminados; breadcrumb correcto en todas las páginas.
- [x] Dashboard liviano con bienvenida ink, buscador de trazabilidad y accesos rápidos.
- [x] Cero `rounded-none` y cero tokens sin marca en el chrome admin; labels con tildes,
      "Transportistas" y títulos alineados al sidebar; `metadata.title` por página.
- [x] Nav config única consumida por sidebar, breadcrumb y dashboard; unit test verde.
- [x] `pnpm typecheck && pnpm check && pnpm test && pnpm test:e2e && pnpm build` verdes.

### Desvíos de ejecución

- **`<main>` del shell:** `SidebarInset` de shadcn ya renderiza un `<main>`, así que
  T3.5 lo usa como el `<main>` de la página y el padding va en un `<div>` interno, en
  vez de agregar un `<main>` propio (habría quedado anidado).
- **Estado activo ámbar:** en el style `radix-luma` el `SidebarMenuButton` pinta hover y
  activo con `--sidebar-accent`. `AdminSidebar` agrega clases `data-active:*` sobre
  `--sidebar-primary` para el ámbar; el componente `ui/sidebar.tsx` queda sin tocar.
- **`ui/breadcrumb.tsx`:** se quitó `role="link"`/`aria-disabled` del `BreadcrumbPage`
  generado (página actual no interactiva) para no sumar findings de a11y en biome.
- **Persistencia del rail:** el layout lee la cookie `sidebar_state` que el propio
  sidebar escribe, para que el estado colapsado sobreviva a un full page load.
- **`pnpm check`:** quedan 19 findings de biome preexistentes en `HEAD`; esta rama no
  agrega ninguno (verificado por diff contra el baseline).

## 17. Instructions for the executing agent

- Use this plan as the primary source; read first: `CONTEXT.md`,
  `docs/plans/home-ui-ux-redesign.md` (§2 y paleta), `src/styles/globals.css`,
  `src/app/layout.tsx`, `src/app/admin/layout.tsx`, `src/components/app-navbar.tsx`,
  `src/features/admin/crud/_components/crud-page-shell.tsx`.
- Respect these settled decisions (§2): sidebar tinta con 4 grupos, URLs planas,
  shell propio sin navbar storefront, chrome-only palette, "Tracking" sin traducir.
  Do not change: guards de auth, routers/servicios tRPC, comportamiento funcional de
  las páginas, URLs del storefront, contrato de `CrudEntityPage`.
- Verify before modifying: rutas emitidas por `next build` tras cada lote de moves; que
  los matches de grep `/admin/` sean URLs y no import paths.
- Execute phases in order; honor task dependencies. No cortar entre Fase 2 y Fase 3.
- Implement at the level specified — write the code the tasks describe; do not
  re-architect. If a blocking question is unresolved, stop and ask; for non-blocking
  gaps, proceed on the stated default and note the assumption.
- Keep code self-explanatory: do not add comments that restate what the code does. Use
  inline or block comments only for non-obvious rationale, invariants, constraints,
  workarounds, subtle behavior, or decisions; link the relevant ADR or design document
  when applicable. Preserve or update structured JSDoc/TSDoc according to repository
  conventions. Remove comments in touched code that become stale or redundant, but do
  not perform unrelated comment cleanup. Keep required directives and suppression
  comments narrowly scoped and explain why they are necessary.
