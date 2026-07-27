# Implementation Plan: Restyle de contenido admin, filtros colapsables, orden por fecha y rediseño del detalle de operación

## 1. Objective & outcome

- **Done means:** el área de contenido del admin habla el mismo lenguaje visual que el
  home/my-orders (eyebrow ámbar en headers, medallones `brand-soft` en stats, empty
  states `brand-warm`, CTAs `highlight`) manteniendo tablas y datos neutros; las 6
  páginas operativas + carritos tienen filtros con fila primaria visible y avanzados
  colapsables con contador; todas las listas con fecha ordenan asc/desc (server-side en
  las paginadas, client-side en catálogo/usuarios); la lista de operaciones queda
  paginada, sin el `strategy: "fifo"` hardcodeado y con debounce; existe
  `operation-diagnostics.ts` con 6 reglas visibles en lista y detalle; y el modal de
  detalle de operación queda reescrito: header con estado y métricas, chips de
  navegación a lotes/tracking/carritos, jerarquía lotes→ítems→asignaciones con datos de
  cliente, enums traducidos, JSON técnico colapsado.
- **Why:** el rediseño del shell (`admin-shell-navigation-redesign.md`) difirió
  explícitamente el restyle del contenido; los filtros operativos (11–18 controles
  siempre visibles) y la ausencia total de ordenamiento degradan el uso diario; y el
  detalle de operación — la pantalla que conglomera más datos — hoy es una sopa de
  badges con JSON crudo, sin salidas de navegación y con enums sin traducir.
- **For:** AI coding agent / developer.
- **Upstream design doc:** none. Continúa `docs/plans/admin-shell-navigation-redesign.md`
  (ejecutado) y respeta `docs/plans/admin-operational-visualizations.md` y la guía de
  paleta de `docs/plans/home-ui-ux-redesign.md` (T1).

## 2. Alignment reached

| Topic | Decision | Source |
| --- | --- | --- |
| Alcance | Restyle vía primitivas compartidas (cascada a las 17 páginas) + trabajo dedicado en el grupo Operación (carritos, operaciones, lotes, paquetes, envíos, tracking) y Pagos. Catálogo/Usuarios reciben solo la cascada + orden client-side. | user (default aceptado) |
| Profundidad de paleta | Acentos en jerarquía, datos neutros: eyebrow ámbar en headers, medallones `brand-soft` en stats, empty states `brand-warm`, CTAs `highlight`, secciones de modales con acento. Filas/celdas de tablas neutras; semántica de `status-presets.ts` intacta (el color semántico significa estado, no decoración). | user (default aceptado) |
| Filtros colapsables | Componente compartido nuevo: fila primaria siempre visible (búsqueda + 1–2 selects clave + botón "Filtros" con contador de activos + Limpiar) y área avanzada colapsable (IDs, fechas) cerrada por defecto. El select de tamaño de página se muda a la barra de paginación. | user (default aceptado) |
| Orden por fecha | Toggle único "Más recientes ⇄ Más antiguos" (patrón my-orders). Server-side (`sortDirection` en input tRPC) en las listas paginadas (lotes, paquetes, envíos, tracking, carritos, operaciones); client-side por fecha de actualización en catálogo/usuarios. Sin headers de columna clickeables. | user (default aceptado) |
| Detalle de operación | Sigue siendo modal, reescrito: `max-w-6xl`, header con StatusChips y métricas hero, chips de links de salida a lotes/tracking filtrados por operación, accordion jerárquico lotes→ítems→asignaciones con cliente y link al carrito, enums vía StatusChip, JSON técnico degradado a accordion colapsado. | user (default aceptado) |
| Fixes de lista de operaciones | Incluidos: paginación server-side (igualar a hermanas), quitar `strategy: "fifo"` hardcodeado (agregar filtro visible de estrategia), debounce 250ms en búsqueda. | user |
| Botones deshabilitados | Se **conservan** Cancelar/Reejecutar/Eliminar deshabilitados (footer del modal, menú de fila, botón inline) como señal de roadmap, con tooltip que explica que la acción llegará más adelante. No se eliminan. | user (rechazó el default de eliminarlos) |
| Diagnósticos de operación | Se crean **ahora**: `operation-diagnostics.ts` con 6 reglas deterministas (2 critical de cantidades + 4 warning de consistencia), resumen en lista + detalle completo + filtro "Con diagnósticos" pre-paginación, siguiendo el contrato existente. Sin reglas basadas en tiempo. | user |
| Reglas de diagnóstico | `operation.quantity.balanceMismatch` (critical), `operation.quantity.assignedMismatch` (critical), `operation.completed.noLots` (warning), `operation.failed.withOutputs` (warning), `operation.lot.missingSupplierOrder` (warning), `operation.rollOver.open` (warning). | user (default aceptado) |

## 3. Scope

- **In scope:**
  - Primitivas compartidas: `CrudPageShell` con eyebrow derivado de la nav config,
    `CrudStatsCards` con medallones, `CrudEmptyState` en `brand-warm`, CTA de creación
    en `highlight`.
  - Primitivas nuevas: shadcn `collapsible`, `CrudFilterPanel`, `CrudSortToggle`,
    `CrudPaginationBar` (consolida la barra duplicada en 5 clientes + page-size).
  - Server: `sortDirection` en los 6 list inputs paginados; paginación + filtro de
    estrategia en `admin.operation.list`; `operation-diagnostics.ts` + campos de
    diagnóstico en lista/detalle de operación.
  - Adopción en clientes: lotes, paquetes, envíos, tracking, carritos, operaciones
    (filtros colapsables + orden + paginación consolidada), pagos (restyle + orden
    client-side).
  - Reescritura completa de `operation-detail-dialog.tsx`.
  - Orden client-side por fecha en las páginas CRUD de catálogo/usuarios.
  - Tests: unit de diagnósticos de operación, modelo puro de orden client-side,
    actualización de tests de servicios afectados.
- **Out of scope / non-goals:**
  - Mutaciones de operación (cancelar/reejecutar/eliminar) — los botones siguen
    deshabilitados, ahora con tooltip.
  - Headers de columna ordenables / cambios al contrato de `CrudColumn`.
  - Sincronización de filtros/orden con la URL (se mantiene el contrato actual:
    lectura inicial de `?detailId=` y params de tracking, sin escritura).
  - Cambios en el shell (sidebar, header, breadcrumbs, nav config) y en el storefront.
  - Cambios de schema de base de datos o migraciones.
  - Restyle de los form dialogs de catálogo campo por campo (solo cascada de shells).
  - Recorte del over-fetch de `operationDetailSelect` (el rediseño pasa a usar la
    mayoría de los campos hoy no renderizados: cliente, carrito, triggeredByUser,
    notes, finishedAt).
- **Deferred:**
  - Diagnóstico `operation.running.stale` (basado en tiempo).
  - Persistencia de filtros/orden en URL para el admin.
  - Paginación server-side de pagos y de páginas CRUD de catálogo.
  - Command palette y tiles de métricas del dashboard (ya diferidos por el plan de shell).
- **Must not change / break:**
  - Los códigos de diagnóstico existentes de lote/paquete/envío y su contrato
    (`withDiagnostics` aplica antes de la paginación y afecta `total/pageCount`).
  - Los query params de deep-link: `?detailId=` en operaciones/lotes/paquetes/envíos y
    los 9 params de id de `/admin/tracking` (incluido `operationId`).
  - La semántica de `status-presets.ts` (success/inProgress/attention/failed/inert).
  - `requireAdmin()` y los guards tRPC.
  - El orden por defecto de toda lista sigue siendo el actual (recientes primero;
    carritos: `deleted asc` primero) cuando el usuario no toca el toggle.
  - El flujo crear-y-ejecutar operación → apertura automática del detalle.

## 4. Current system context

- **Paleta y guía**: `src/styles/globals.css` (Tailwind v4 CSS-first, sin
  `tailwind.config`) define `--brand-soft`, `--brand-warm`, `--brand-ink`,
  `--highlight` (líneas 91-98 light / 145-152 dark) y radios escalados. `Button` y
  `Badge` (`src/components/ui/`) ya tienen variante `highlight`. El lenguaje de
  referencia: `src/components/page-header.tsx` (eyebrow ámbar + `font-heading`),
  `src/app/(storefront)/my-orders/_components/my-orders-client.tsx` (pills, medallones
  `size-8 rounded-full bg-brand-soft`, empty state `bg-brand-warm`, toggle de orden),
  `src/features/home/_components/home-hero.tsx` y `section-heading.tsx`.
- **Primitivas admin**: `src/features/admin/crud/_components/` — `crud-page-shell.tsx`
  (32 l), `crud-entity-page.tsx` (252 l, template completo de crud-home con filter bar
  propia), `crud-table.tsx`, `crud-stats-cards.tsx` (acento solo en el ícono),
  `crud-state.tsx`, `crud-status-chip.tsx`, `crud-cell-tooltips.tsx` (`IdTooltip`,
  `DateTooltip`), `operational-diagnostic-badge.tsx`, `diagnostic-detail-chip.tsx`,
  `crud-row-actions.tsx`, `crud-form-dialog-shell.tsx`. Nav config:
  `src/features/admin/shell/admin-nav.ts` (`findAdminNavItem`, prefijo más largo).
- **Filtros hoy**: bloques `rounded-2xl border p-3` siempre visibles —
  `lots-client.tsx:194-330` (13 controles), `packages-client.tsx:193-321` (12),
  `shipments-client.tsx` (12), `tracking-client.tsx:222-487` (18),
  `user-carts-client.tsx:360-571` (11), `operations-client.tsx:196-229` (2),
  `payments-admin-client.tsx:702-716` (1). No existe `collapsible.tsx` (Radix
  Collapsible no está vendoreado). `Limpiar` existe solo en
  lotes/paquetes/envíos/tracking.
- **Orden hoy**: inexistente en UI. Server fijo: `lot.data.ts:258`,
  `package.data.ts:222`, `shipment.data.ts:208`,
  `src/server/services/tracking/tracking-event.service.ts:88` (procedure
  `admin.tracking.listEvents`), `operations-cart.data.ts:419`
  (`deleted asc, updatedAt desc`), `operation.data.ts:274`. Precedente a espejar:
  `src/app/(storefront)/my-orders/_components/order-list-view.ts` (+ test) y su toggle
  ghost con `ArrowUpDownIcon`.
- **Paginación hoy**: barra artesanal duplicada textualmente en
  `lots-client.tsx:332-368`, `packages-client.tsx:324-360`, `shipments-client.tsx`,
  `tracking-client.tsx:490-519`, `user-carts-client.tsx:574-603`; page-size dentro de
  la grilla de filtros; nota "Resultados limitados a los 1000 mas recientes.".
  Operaciones y pagos: sin paginación.
- **Operación**: router `src/server/api/routers/admin/operation.router.ts` (list sin
  paginar, getById, getStats, createAndExecute); schemas
  `src/schemas/admin/operation.schemas.ts` (list output = array plano); data
  `src/server/services/admin/operation.data.ts` (`operationDetailSelect` líneas 75-185,
  árbol de 5 niveles); cliente `src/app/admin/(operation)/operations/_components/operations-client.tsx`
  (254 l, `strategy: "fifo"` hardcodeado en línea 57, sin debounce); tabla
  `src/features/admin/crud/operation/operation-table.tsx` (sin columna de
  diagnósticos); modal `src/features/admin/crud/operation/operation-detail-dialog.tsx`
  (358 l: 5 tabs, `IdRef` duplicado de `IdTooltip`, `JsonPreview` local, badges de
  asignación sin cliente, enums crudos en lote/ítem/orden/rollover, footer con 3
  botones deshabilitados sin tooltip, `isLoading` atado a `isFetching` que blanquea el
  modal en cada refetch, cero links de salida).
- **Diagnósticos existentes**: `src/server/services/admin/lot-diagnostics.ts` (patrón
  canónico: función pura, códigos `entidad.sujeto.problema`, refs, mensajes es-AR),
  `package-diagnostics.ts`, `shipment-diagnostics.ts`,
  `operational-diagnostics.types.ts` (`decimal`, `sumDecimals`),
  `operational-diagnostics.test.ts`. Los list items de lote exponen
  `diagnosticCount/highestDiagnosticSeverity/diagnosticMessages`
  (`lot.schemas.ts:189-191`) y el input `diagnosticState` (`lot.schemas.ts:164`).
- **Patrón interno de modal bien resuelto**:
  `src/features/admin/crud/tracking/tracking-detail-dialog.tsx` (banner → stepper →
  chips "Relacionados" con `adminEntityHref()` → `Accordion type="multiple"`).
- **Deep-links disponibles**: `/admin/lots?operationId=` (input
  `lot.schemas.ts:165`), `/admin/tracking?operationId=` (leído en
  `(operation)/tracking/page.tsx:27`), `/admin/carts/{cartId}` (página de
  trazabilidad).

## 5. Approach & sequencing

Primitivas-primero en 7 fases: (1) cascada visual vía primitivas compartidas — riesgo
bajo, valida la dirección estética en todo el admin de una vez; (2) primitivas nuevas
de filtros/orden/paginación sin consumidores aún; (3) todo el trabajo de servidor junto
(orden, paginación de operaciones, diagnósticos) — deja los contratos listos y
testeados antes de tocar clientes; (4) adopción página por página en el grupo
Operación + Pagos; (5) reescritura del modal de operación (depende de 3 para
diagnósticos y de 2 para primitivas); (6) orden client-side en catálogo/usuarios; (7)
tests transversales y validación. Cada fase deja `pnpm typecheck && pnpm build`
verdes. El único cambio de contrato con rotura potencial (output de
`admin.operation.list` pasa de array a objeto paginado) se hace atómicamente con su
único consumidor (`operations-client.tsx`) dentro de la Fase 3→4 sin cortar entre
T3.4 y T4.6.

## 6. Assumptions

| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |
| `pnpm dlx shadcn@latest add collapsible` funciona con el style `radix-luma` | El add de `sidebar` del plan de shell funcionó con la misma config | El registry no lo resuelve | Vendorear Radix Collapsible manualmente en `src/components/ui/collapsible.tsx` |
| `operations-client.tsx` es el único consumidor de `admin.operation.list` | Grep de la exploración; `createAndExecute` devuelve detail, no list | Aparece otro consumidor | Actualizarlo en el mismo commit del cambio de output |
| `sortDirection` con default `"desc"` es retrocompatible en los 6 list inputs | Zod `.default()` no exige el campo a los callers existentes | Algún test snapshotea el input exacto | Actualizar el test |
| Los campos hoy sobre-fetcheados del detalle de operación (cliente, carrito, triggeredByUser, notes) alcanzan para el modal nuevo sin tocar `operationDetailSelect` | `operationDetailSelect` ya trae user de cart, rollovers y triggeredByUser | Falta algún campo puntual | Agregarlo al select (aditivo, sin riesgo) |
| El cap de 1000 de las listas operativas se aplica después del `orderBy` | Patrón actual `take` sobre query ordenada | El cap se aplica antes | Reordenar en el data layer para que el cap siga la dirección elegida |

## 7. Phased execution plan

### Fase 1 — Cascada visual vía primitivas compartidas
**Objective:** las 17 páginas reciben la paleta sin tocar clientes individuales.
**Tasks:** T1.1–T1.4
**Dependencies:** ninguna.
**Validation / done:** toda página admin muestra eyebrow con el grupo de nav, stats
con medallones, empty states `brand-warm` y botón de crear `highlight`; tablas y
chips de estado sin cambios; `pnpm typecheck && pnpm build` verdes.

### Fase 2 — Primitivas nuevas: collapsible, filtros, orden, paginación
**Objective:** componentes compartidos listos, sin consumidores todavía.
**Tasks:** T2.1–T2.4
**Dependencies:** ninguna (paralelo a Fase 1).
**Validation / done:** componentes compilan y tipan; `CrudFilterPanel` cuenta filtros
avanzados activos y abre por defecto si hay alguno activo al montar.

### Fase 3 — Server: orden, paginación de operaciones, diagnósticos
**Objective:** contratos tRPC nuevos completos y testeados.
**Tasks:** T3.1–T3.4
**Dependencies:** ninguna.
**Validation / done:** `pnpm test` verde incluyendo `operation-diagnostics.test.ts`;
`sortDirection: "asc"` invierte cada lista; `admin.operation.list` pagina y filtra por
estrategia y diagnósticos. **No cortar el trabajo entre T3.4 y T4.6** (el cliente de
operaciones queda desincronizado del output nuevo).

### Fase 4 — Adopción en páginas operativas y pagos
**Objective:** filtros colapsables + orden + paginación consolidada en uso real.
**Tasks:** T4.1–T4.7
**Dependencies:** Fases 2 y 3.
**Validation / done:** cada página filtra/ordena/pagina contra el server; contador de
filtros correcto; deep-links por query param intactos (tracking con `?operationId=`
abre con el panel avanzado abierto y el filtro aplicado).

### Fase 5 — Reescritura del modal de detalle de operación
**Objective:** el detalle más denso del admin queda navegable, completo y con marca.
**Tasks:** T5.1–T5.3
**Dependencies:** Fase 3 (diagnósticos en detail), Fase 2 (primitivas), T4.6.
**Validation / done:** modal muestra header con estado/estrategia/métricas,
diagnósticos, accordion de lotes con clientes y links, órdenes y rollovers con
StatusChip, JSON colapsado; botones deshabilitados con tooltip; sin `IdRef` local.

### Fase 6 — Orden client-side en catálogo/usuarios
**Objective:** "posibilidad de ordenar por fecha" también en las CRUD simples.
**Tasks:** T6.1–T6.2
**Dependencies:** Fase 2 (toggle/tipos).
**Validation / done:** las 8 páginas CRUD + 3 panels de product-terms ordenan por
Nombre (default) / Más recientes / Más antiguos sin regresión del filtrado.

### Fase 7 — Tests, barrido y validación final
**Objective:** blindar lo nuevo y cerrar verde.
**Tasks:** T7.1–T7.3
**Dependencies:** Fases 1–6.
**Validation / done:** `pnpm typecheck && pnpm check && pnpm test && pnpm test:e2e &&
pnpm build` verdes; checklist manual de §11.

## 8. Task breakdown

### T1.1 — `CrudPageShell` con eyebrow de grupo
- **Files:** `src/features/admin/crud/_components/crud-page-shell.tsx`;
  `src/components/page-header.tsx` (solo lectura/reuso).
- **Symbols / signatures:** `CrudPageShell({ title, description, actions, eyebrow? })`;
  pasa a client component (`"use client"`) para usar `usePathname()`.
- **Change (operational, not finished code):** renderizar el header vía el
  `PageHeader` compartido. `eyebrow` default: label del grupo de
  `findAdminNavItem(usePathname())` (`src/features/admin/shell/admin-nav.ts`), p.ej.
  "Operación" en `/admin/lots`; overridable por prop; sin eyebrow si no hay match.
- **Mirror this pattern:** `src/app/(storefront)/my-orders/_components/my-orders-client.tsx`
  (uso de `PageHeader` con eyebrow).
- **Depends on:** —
- **Acceptance:** cada página admin muestra eyebrow ámbar con su grupo; la página de
  trazabilidad de carrito muestra "Operación"; `pnpm typecheck` verde.
- **Pitfalls:** los consumidores ya son client components, pero verificar que ninguna
  page RSC importe `CrudPageShell` directamente; los panels de product-terms usan
  `copy.pageShell` en modo panel — el eyebrow aplica solo al shell standalone.

### T1.2 — `CrudStatsCards` con medallones
- **Files:** `src/features/admin/crud/_components/crud-stats-cards.tsx`
- **Symbols / signatures:** `CrudStatAccent` sin cambios.
- **Change:** el ícono pasa de `text-{accent}` suelto a medallón
  `size-8 rounded-full` — accent `default` → `bg-brand-soft text-brand-soft-foreground`;
  accents semánticos → `bg-{x}/10 text-{x}` (fórmula tint de `badge.tsx`). Valor con
  `font-heading`.
- **Mirror this pattern:** medallones de `my-orders-client.tsx` y beneficios de
  `home-hero.tsx`.
- **Depends on:** —
- **Acceptance:** stats de las 14 páginas que las usan muestran medallones; contraste
  AA; sin cambio de API.
- **Pitfalls:** no convertir el fondo de la Card a superficie de marca (decisión §2:
  datos neutros).

### T1.3 — `CrudEmptyState` en `brand-warm` y CTA `highlight`
- **Files:** `src/features/admin/crud/_components/crud-state.tsx`;
  `src/features/admin/crud/_components/crud-entity-page.tsx` (botón crear).
- **Change:** `CrudEmptyState` → `Empty` con
  `className="border bg-brand-warm text-brand-warm-foreground"`; el botón "Crear" del
  header de `CrudEntityPage` y el submit de `crud-form-dialog-shell.tsx` pasan a
  `variant="highlight"`.
- **Mirror this pattern:** empty state de `my-orders-client.tsx`.
- **Depends on:** —
- **Acceptance:** empty states cálidos en todo el admin; botones primarios ámbar;
  botones destructivos/secundarios sin cambios.
- **Pitfalls:** no tocar `CrudErrorState` (destructive es semántico).

### T1.4 — Headers de dialogs con jerarquía tipográfica
- **Files:** `src/features/admin/crud/_components/crud-form-dialog-shell.tsx`;
  `src/features/admin/crud/lot/lot-detail-dialog.tsx`,
  `src/features/admin/crud/package/package-detail-dialog.tsx`,
  `src/features/admin/crud/shipment/shipment-detail-dialog.tsx` (solo títulos de
  sección).
- **Change:** `DialogTitle` con `font-heading`; los títulos de sección internos de los
  detail dialogs (`<h3>`/labels de bloque) unificados a
  `text-xs font-semibold uppercase tracking-wide text-muted-foreground` (patrón ya
  usado en `tracking-detail-dialog.tsx`). Nada más: el rediseño profundo es solo para
  el modal de operación (T5.1).
- **Depends on:** —
- **Acceptance:** títulos consistentes; cero cambios funcionales.

### T2.1 — Agregar primitiva `collapsible`
- **Files:** `src/components/ui/collapsible.tsx` `[NEW]` (vía
  `pnpm dlx shadcn@latest add collapsible`).
- **Change:** ejecutar el add; verificar alias `~/components` y ausencia de cambios
  colaterales en otros `ui/*`.
- **Depends on:** —
- **Acceptance:** `pnpm typecheck && pnpm check` verdes tras el add.
- **Pitfalls:** igual que con `sidebar`: revisar el diff del add y descartar
  sobrescrituras no relacionadas.

### T2.2 — `CrudFilterPanel` compartido
- **Files:** `src/features/admin/crud/_components/crud-filter-panel.tsx` `[NEW]`
- **Symbols / signatures:**
  `CrudFilterPanel({ primary: ReactNode, advanced?: ReactNode, activeAdvancedCount: number, onReset?: () => void, defaultOpen?: boolean })`.
- **Change:** contenedor `rounded-2xl border p-3`; fila primaria en grilla
  (`md:grid-cols-…`) con los children de `primary` + a la derecha botón "Filtros"
  (`variant="outline"`, ícono `SlidersHorizontal`, `Badge variant="highlight"` con
  `activeAdvancedCount` cuando > 0, chevron rotado según estado) + botón "Limpiar"
  (`RotateCcw`, visible si `onReset`); `advanced` dentro de
  `Collapsible`/`CollapsibleContent` con la misma grilla. Abierto inicial si
  `defaultOpen` o `activeAdvancedCount > 0` al montar. El contador cuenta **solo
  filtros avanzados** (los primarios ya se ven).
- **Mirror this pattern:** grillas de filtros existentes (`lots-client.tsx:194-330`)
  para las clases de la grilla.
- **Depends on:** T2.1
- **Acceptance:** cerrado por defecto sin filtros; badge y auto-apertura con filtros
  activos; accesible (el trigger es un botón con `aria-expanded`).
- **Pitfalls:** no desmontar el contenido avanzado con estado propio — los inputs son
  controlados por el padre, así que colapsar no pierde valores; `Limpiar` debe resetear
  también los avanzados ocultos.

### T2.3 — `CrudSortToggle` + tipo compartido
- **Files:** `src/features/admin/crud/_components/crud-sort-toggle.tsx` `[NEW]`;
  `src/shared/common/admin-crud/crud.types.ts` (agregar
  `export type CrudSortDirection = "desc" | "asc"`).
- **Symbols / signatures:**
  `CrudSortToggle({ value: CrudSortDirection, onChange, recentLabel?, oldestLabel? })`.
- **Change:** botón `variant="ghost" size="sm"` con `ArrowUpDownIcon` que alterna
  "Más recientes" ⇄ "Más antiguos"; `aria-pressed` según dirección.
- **Mirror this pattern:** el toggle de `my-orders-client.tsx:69-81`.
- **Depends on:** —
- **Acceptance:** alterna y notifica; sin estado interno.

### T2.4 — `CrudPaginationBar` compartida (absorbe page-size)
- **Files:** `src/features/admin/crud/_components/crud-pagination-bar.tsx` `[NEW]`
- **Symbols / signatures:**
  `CrudPaginationBar({ page, pageCount, total, totalLabel, truncated?, pageSize, pageSizeOptions?, onPageChange, onPageSizeChange })`.
- **Change:** consolidar la barra duplicada de los 5 clientes: contador
  "{total} {totalLabel}", nota de truncado en copy neutral de dirección ("Resultados
  limitados a 1000."), botones Anterior/Siguiente outline, "Página {page} de
  {pageCount}", y el Select de tamaño de página (options `[10,25,50,100]`) que hoy
  vive en la grilla de filtros.
- **Mirror this pattern:** `lots-client.tsx:332-368` (comportamiento actual a
  preservar).
- **Depends on:** —
- **Acceptance:** paridad funcional con la barra actual; cambiar page-size resetea a
  página 1 (responsabilidad del callback del padre — documentarlo en el TSDoc del
  prop).
- **Pitfalls:** el copy actual "los 1000 mas recientes" deja de ser cierto con orden
  ascendente — usar el copy neutral.

### T3.1 — `sortDirection` en los list inputs paginados
- **Files:** `src/schemas/admin/lot.schemas.ts` (input línea 157),
  `src/schemas/admin/package.schemas.ts`, `src/schemas/admin/shipment.schemas.ts`,
  `src/schemas/admin/operations-cart.schemas.ts`, `src/schemas/tracking.schemas.ts`
  (input de `listEvents`), `src/schemas/admin/operation.schemas.ts`.
- **Symbols / signatures:**
  `sortDirection: z.enum(["desc", "asc"]).default("desc")` en cada list input.
- **Change:** agregar el campo; exportar el tipo si el cliente lo necesita.
- **Depends on:** —
- **Acceptance:** `pnpm typecheck` verde sin tocar callers (default cubre).

### T3.2 — Aplicar `sortDirection` en los data layers
- **Files:** `src/server/services/admin/lot.data.ts` (list, hoy `:258`),
  `src/server/services/admin/package.data.ts` (`:222`),
  `src/server/services/admin/shipment.data.ts` (`:208`),
  `src/server/services/tracking/tracking-event.service.ts` (`:88`),
  `src/server/services/admin/operations-cart.data.ts` (`:419`),
  `src/server/services/admin/operation.data.ts` (`:274`).
- **Change:** el `orderBy` de la **query de lista** pasa a
  `[{ createdAt: dir }, { id: dir }]` con `dir = input.sortDirection`; carritos
  conserva `{ deleted: "asc" }` como primer criterio y aplica `dir` a
  `updatedAt`/`id`; el cap de 1000 (`take`) queda después del `orderBy`.
- **Depends on:** T3.1
- **Acceptance:** tests de servicio (donde existan) + verificación manual: `asc`
  invierte la primera página.
- **Pitfalls:** cada data file tiene varios `orderBy` (sub-relaciones de detalle en
  `asc`, últimas actividades en `desc`) — tocar **solo** el de la query de lista;
  identificarla por la función que usa `skip/take` con el input de list.

### T3.3 — Paginación y filtro de estrategia en `admin.operation.list`
- **Files:** `src/schemas/admin/operation.schemas.ts`,
  `src/server/services/admin/operation.data.ts`,
  `src/server/services/admin/operation.service.ts`,
  `src/server/api/routers/admin/operation.router.ts`.
- **Symbols / signatures:** input: agregar `page`/`pageSize` (mismos defaults que
  `lotListInputSchema:158-159`); output: `operationListOutputSchema` `[NEW]` con
  `{ items, page, pageSize, total, pageCount, truncated }` espejando
  `lotListOutputSchema` (`lot.schemas.ts:203-210`); `strategy` ya existe en el input —
  queda como filtro opcional real.
- **Change:** el data layer pagina con `skip/take` + `count` y cap 1000 como las
  hermanas; el router referencia el output nuevo.
- **Mirror this pattern:** `lot.data.ts` list + `lot.router.ts`.
- **Depends on:** T3.1
- **Acceptance:** procedure devuelve la forma paginada; una operación con
  `strategy: "other"` aparece cuando no se filtra estrategia (hoy es invisible).
- **Pitfalls:** **cambio de contrato**: el cliente se actualiza en T4.6 — no cortar
  entre ambas tareas; `getStats` no cambia.

### T3.4 — `operation-diagnostics.ts` + campos en lista/detalle
- **Files:** `src/server/services/admin/operation-diagnostics.ts` `[NEW]`;
  `src/server/services/admin/operation-diagnostics.test.ts` `[NEW]`;
  `src/schemas/admin/operation.schemas.ts`;
  `src/server/services/admin/operation.data.ts`,
  `src/server/services/admin/operation.service.ts`.
- **Symbols / signatures:**
  `calculateOperationDiagnostics(operation: OperationDetailRecord): OperationalDiagnostic[]`
  con las 6 reglas de §2 (códigos exactos acordados); list item extendido con
  `diagnosticCount`, `highestDiagnosticSeverity`, `diagnosticMessages`
  (espejo de `lot.schemas.ts:189-191`); input con `diagnosticState`
  (espejo de `lot.schemas.ts:164`); detail extendido con
  `diagnostics: OperationalDiagnostic[]`.
- **Change:** función pura sobre el registro de detalle usando `decimal`/`sumDecimals`
  de `operational-diagnostics.types.ts`; mensajes es-AR con el mismo tono que
  `lot-diagnostics.ts`; `refs` con `operationId` (+ `lotId`/`rollOverId` según regla).
  El data layer calcula diagnósticos para lista (resumen) y detalle (completo), y
  aplica `diagnosticState` **antes** de la paginación (afecta `total/pageCount`,
  contrato establecido).
- **Mirror this pattern:** `lot-diagnostics.ts` + su ensamblado en `lot.data.ts`.
- **Depends on:** T3.3 (misma pasada sobre data/schemas evita conflictos).
- **Acceptance:** test unitario cubre cada regla (caso que dispara y caso limpio) +
  `highestDiagnosticSeverity`; `pnpm test` verde.
- **Pitfalls:** la regla `operation.lot.missingSupplierOrder` es roll-up: un solo
  diagnóstico con el conteo de lotes afectados en `refs`, no uno por lote (evita
  inundar el resumen); calcular diagnósticos de lista requiere las relaciones — reusar
  el select de detalle para la lista sería carísimo: derivar las reglas de lista de los
  agregados ya presentes en el list select (cantidades, conteos, `status`) y de un
  select liviano adicional de `lots { supplierOrderId }` y `rollOvers { status }` si
  hace falta; documentar en el TSDoc qué reglas se evalúan en lista vs solo en detalle
  **solo si** difieren — si difieren, el resumen de lista debe seguir siendo un
  subconjunto honesto (nunca inventar count sin regla evaluada).

### T4.1 — Lotes: adopción de filtros/orden/paginación
- **Files:** `src/app/admin/(operation)/lots/_components/lots-client.tsx`
- **Change:** reemplazar el bloque de filtros por `CrudFilterPanel` — primaria:
  búsqueda, Estado, Diagnósticos; avanzada: los 6 inputs de ID + Desde/Hasta.
  `CrudSortToggle` alineado a la derecha de la fila primaria (o junto al contador de
  resultados) manejando `sortDirection` del list input. Barra inferior →
  `CrudPaginationBar` (absorbe el select de page-size). `Limpiar` resetea todo
  incluido `sortDirection`.
- **Depends on:** T2.2–T2.4, T3.1–T3.2
- **Acceptance:** paridad de filtrado con hoy; avanzados colapsados por defecto;
  contador correcto; orden asc/desc real contra server; página resetea a 1 al cambiar
  cualquier filtro (comportamiento `updateFilter` existente se conserva).
- **Pitfalls:** `?detailId=` sigue abriendo el modal — no tocar esa lectura.

### T4.2 — Paquetes: ídem
- **Files:** `src/app/admin/(operation)/packages/_components/packages-client.tsx`
- **Change:** igual a T4.1 — primaria: búsqueda, Estado, Diagnósticos; avanzada: 5 IDs
  + fechas.
- **Depends on:** T2.2–T2.4, T3.1–T3.2
- **Acceptance:** ídem T4.1.

### T4.3 — Envíos: ídem
- **Files:** `src/app/admin/(operation)/shipments/_components/shipments-client.tsx`
- **Change:** primaria: búsqueda, Estado, Tipo; avanzada: IDs, código de tracking del
  transportista, fechas, Diagnósticos… (Diagnósticos puede ir en primaria si entra en
  la grilla — criterio: máx. 3 controles + botones en la fila primaria).
- **Depends on:** T2.2–T2.4, T3.1–T3.2
- **Acceptance:** ídem T4.1.

### T4.4 — Tracking: ídem + params iniciales
- **Files:** `src/app/admin/(operation)/tracking/_components/tracking-client.tsx`
- **Change:** primaria: búsqueda, Evento, Fuente; avanzada: selects de
  usuario-carrito/actor, los 9 inputs de ID, Desde/Hasta. `defaultOpen` del panel si
  algún param de ID llegó por URL (los deep-links de los modales de lote/paquete/envío
  aterrizan acá con filtros aplicados — deben quedar visibles). Sort toggle +
  `CrudPaginationBar`. Conservar el caption "Filtros: Server-side"? — eliminarlo (ruido
  técnico para el usuario).
- **Depends on:** T2.2–T2.4, T3.1–T3.2
- **Acceptance:** `/admin/tracking?lotId=x` abre con panel avanzado abierto, badge
  contando 1 y el filtro aplicado; paridad del resto.
- **Pitfalls:** este cliente tiene 18 controles — la migración es la más mecánica pero
  la más larga; no renombrar handlers para minimizar el diff.

### T4.5 — Carritos: ídem con orden por actualización
- **Files:** `src/app/admin/(operation)/carts/_components/user-carts-client.tsx`
- **Change:** primaria: búsqueda, combobox Usuario, Estado de carrito; avanzada:
  comboboxes Producto/Términos, los otros 4 selects de estado, switch "Mostrar
  eliminados". Sort toggle sobre `updatedAt` (labels "Actualizados recientes" ⇄ "Más
  antiguos" vía props de T2.3). `CrudPaginationBar`. Agregar botón Limpiar (hoy no
  existe acá).
- **Depends on:** T2.2–T2.4, T3.1–T3.2
- **Acceptance:** paridad + orden funcional; `deleted asc` se preserva como primer
  criterio en ambas direcciones.
- **Pitfalls:** los comboboxes tienen debounce y queries propias — no tocar su lógica,
  solo su ubicación.

### T4.6 — Operaciones: paginación, estrategia, debounce, diagnósticos en tabla
- **Files:** `src/app/admin/(operation)/operations/_components/operations-client.tsx`;
  `src/features/admin/crud/operation/operation-table.tsx`;
  `src/features/admin/crud/operation/operation.mappers.ts`.
- **Change:** adaptar al output paginado de T3.3 (`data.items`, `CrudPaginationBar`);
  quitar `strategy: "fifo"` hardcodeado (línea 57) y agregar select de Estrategia
  (FIFO / Otra / Todas) en la fila primaria junto a búsqueda y Estado + select de
  Diagnósticos; búsqueda con `use-debounced-value` (250ms, patrón de
  `user-carts-client`); sort toggle. En la tabla: columna "Diagnósticos" con
  `OperationalDiagnosticBadge` (espejo de `lot-table.tsx:76`); los ítems del menú de
  fila deshabilitados ganan tooltip "Disponible próximamente" (decisión §2), ídem el
  botón inline "Reejecutar".
- **Depends on:** T3.3, T3.4, T2.2–T2.4
- **Acceptance:** lista paginada; operaciones `strategy: "other"` visibles; tipeo no
  dispara una query por tecla; badge de diagnósticos en filas con findings.
- **Pitfalls:** el flujo crear→abrir detalle (`createAndExecute` → set
  `selectedOperationId`) no debe romperse con la paginación (el detalle va por
  `getById`, independiente de la página visible).

### T4.7 — Pagos: restyle + orden client-side
- **Files:** `src/app/admin/payments/_components/payments-admin-client.tsx`
- **Change:** header vía `CrudPageShell`/`PageHeader` con eyebrow (cascada T1.1 si ya
  lo usa; si no, adoptarlo); stats con medallones (cascada T1.2); `CrudSortToggle`
  client-side por `createdAt` en las tablas de Intentos y Eventos (listas completas en
  memoria — ordenar en un memo). Sin cambios de filtros (un solo search) ni de
  paginación (diferido §3).
- **Depends on:** T1.1–T1.2, T2.3
- **Acceptance:** ambas tabs ordenan asc/desc; tab Config intacta.

### T5.1 — Reescritura de `operation-detail-dialog.tsx`
- **Files:** `src/features/admin/crud/operation/operation-detail-dialog.tsx`
  (reescritura); `src/features/admin/crud/operation/operation.mappers.ts` (agregar
  `StatusConfig` maps faltantes).
- **Symbols / signatures:** mismas props
  (`{ open, operation?, isLoading?, errorMessage?, onOpenChange }` +
  `operation.diagnostics` del contrato nuevo). `DialogContent` pasa a `sm:max-w-6xl`.
- **Change:** estructura nueva (espejo del patrón `tracking-detail-dialog.tsx`):
  1. **Header**: código + `StatusChip` de estado + `StatusChip` de estrategia;
     sub-línea con creada/finalizada (`DateTooltip`), destino, "por
     {triggeredByUser.name}", `IdTooltip`; `notes` visible si existe;
     `failureReason` como `Alert` destructive.
  2. **Métricas hero**: 4 tiles (Elegible / Asignada / Rollover / Salidas) con valor
     `font-heading` y sub-texto de conteos — grid propio, no `CrudStatsCards`.
  3. **Diagnósticos**: lista de `DiagnosticDetailChip` (si hay).
  4. **Chips "Relacionados"**: `Link` a `/admin/lots?operationId={id}`,
     `/admin/tracking?operationId={id}` (patrón `adminEntityHref` de
     `tracking-detail-dialog.tsx:47-58`).
  5. **Secciones** en `Accordion type="multiple"` (reemplaza los 5 tabs): "Lotes (n)"
     — por lote: código + proveedor + `StatusChip` + link a orden; ítems como filas
     (producto, cantidad, `StatusChip`); asignaciones como sub-filas con **nombre del
     cliente, código de carrito con `Link` a `/admin/carts/{cartId}` y cantidad** (fin
     de la sopa de badges); "Órdenes de proveedor (n)" con `StatusChip`; "Rollovers
     (n)" con `StatusChip` de estado + etapa traducida + motivo; "Datos técnicos" —
     colapsado por defecto — con el `JsonPreview` compartido (T5.2).
  6. **Footer**: Cancelar/Reejecutar/Eliminar **se conservan deshabilitados** con
     `Tooltip` "Disponible próximamente" + Cerrar.
  Todos los enums pasan por `StatusConfig` maps: crear en `operation.mappers.ts` los
  de estado de lote/ítem/orden de proveedor/rollover (o importar de
  `lot.mappers.ts` si ya existen — verificar antes de duplicar), compuestos desde
  `status-presets.ts`.
- **Mirror this pattern:** `tracking-detail-dialog.tsx` (estructura),
  `lot-detail-dialog.tsx` (links de salida).
- **Depends on:** T3.4, T2.1, T4.6
- **Acceptance:** toda la información del modal viejo sigue accesible (ningún dato se
  pierde, incluido el JSON); asignaciones muestran cliente + carrito linkeado; cero
  enums crudos; los deep-links respetan los query params soportados.
- **Pitfalls:** los `Link` dentro del Dialog deben cerrar el modal al navegar (o abrir
  la ruta con el dialog cerrándose solo — verificar comportamiento; los dialogs
  hermanos ya navegan así: espejar `lot-detail-dialog.tsx:122`); accordion de lotes
  abierto por defecto (`defaultValue` con los ids de lote) porque es el contenido
  principal; "Datos técnicos" cerrado.

### T5.2 — Extraer `JsonPreview` compartido y eliminar `IdRef`
- **Files:** `src/features/admin/crud/_components/crud-json-preview.tsx` `[NEW]`;
  `src/features/admin/crud/operation/operation-detail-dialog.tsx`;
  `src/features/admin/crud/shipment/shipment-detail-dialog.tsx` (líneas 25-34,
  reemplazar copia local).
- **Change:** un solo `JsonPreview` compartido; en el modal de operación reemplazar el
  `IdRef` local (líneas 32-45 previas) por el `IdTooltip` compartido de
  `crud-cell-tooltips.tsx` (cierra el residuo del finding #40 del code review
  2026-07-22).
- **Depends on:** T5.1 (misma pasada)
- **Acceptance:** grep de `IdRef` y de `JsonPreview` locales sin resultados en
  `src/features/admin`.

### T5.3 — El modal no se blanquea en refetch
- **Files:** `src/app/admin/(operation)/operations/_components/operations-client.tsx`
- **Change:** `isLoading` del dialog pasa de `detailQuery.isFetching` a
  `detailQuery.isPending` (skeleton solo en la primera carga; los refetch por
  invalidación mantienen el contenido visible).
- **Depends on:** T4.6
- **Acceptance:** invalidar tras `createAndExecute` no blanquea el modal abierto.

### T6.1 — Orden client-side en `CrudEntityPage`
- **Files:** `src/features/admin/crud/_lib/use-crud-entity-page.ts`;
  `src/features/admin/crud/_lib/crud-list-sort.ts` `[NEW]` +
  `crud-list-sort.test.ts` `[NEW]`;
  `src/features/admin/crud/_components/crud-entity-page.tsx`.
- **Symbols / signatures:**
  `type CrudListSort = "default" | "newest" | "oldest"`;
  `applyCrudListSort<T extends { updatedAt: Date }>(items: T[], sort: CrudListSort): T[]`
  (puro: `newest/oldest` por `updatedAt` con desempate por `id`; `default` devuelve el
  orden del server).
- **Change:** select "Orden" (Por nombre / Más recientes / Más antiguos) en la filter
  bar de `crud-entity-page.tsx:108-158`; el memo de filtrado de
  `use-crud-entity-page.ts` aplica el sort al final.
- **Mirror this pattern:** `order-list-view.ts` + `order-list-view.test.ts` de
  my-orders.
- **Depends on:** —
- **Acceptance:** unit test del modelo puro; las 8 páginas CRUD y los 3 panels de
  product-terms ordenan sin romper búsqueda/estado/eliminados.
- **Pitfalls:** los items de user usan id string — el desempate por `id` debe soportar
  `CrudEntityId` (number | string): comparar con `String(id).localeCompare`.

### T6.2 — Barrido de cascada
- **Files:** verificación visual, sin archivos nuevos.
- **Change:** recorrer las 17 páginas confirmando eyebrow correcto, medallones, empty
  states y CTAs; los panels de product-terms sin eyebrow duplicado; ajustar los casos
  donde el grupo de nav no matchee.
- **Depends on:** Fases 1–6
- **Acceptance:** checklist manual de §11 sin hallazgos.

### T7.1 — Tests unit
- **Files:** `src/server/services/admin/operation-diagnostics.test.ts` (T3.4),
  `src/features/admin/crud/_lib/crud-list-sort.test.ts` (T6.1); actualizar los tests
  de servicios que asserten inputs/outputs de list si los hay
  (`operational-diagnostics.test.ts` no cambia).
- **Acceptance:** `pnpm test` verde.

### T7.2 — E2E
- **Files:** `e2e/smoke.spec.ts` (extender solo si ya cubre páginas admin logueadas;
  los redirects existentes no cambian).
- **Change:** ninguna URL cambia en este plan — verificar que el smoke existente pase
  sin edición; no agregar cobertura e2e nueva salvo rotura.
- **Acceptance:** `pnpm test:e2e` verde.

### T7.3 — Documentación
- **Files:** este plan (marcar desvíos de ejecución al final, convención del repo).
- **Change:** `CONTEXT.md` sin cambios (no surgieron términos nuevos — "Operational
  diagnostic" ya cubre los diagnósticos de operación); sin ADRs.
- **Acceptance:** N/A.

## 9. Cross-cutting concerns

- **Data / schema / migration / backfill:** N/A — cero cambios de base de datos; solo
  contratos tRPC (aditivos salvo el output de `admin.operation.list`, cuyo único
  consumidor se actualiza en el mismo cambio).
- **Config / env / feature flags:** ninguno.
- **Security / permissions:** todos los procedures siguen `adminProcedure`; los datos
  de cliente (nombre, carrito) que el modal nuevo muestra ya se exponen en el mismo
  payload y en la página de carritos — sin superficie nueva.
- **Observability:** N/A.

## 10. Pitfalls & gotchas (global)

- **Contrato de `admin.operation.list`**: array → objeto paginado. T3.3 y T4.6 son un
  solo cambio lógico; no dejar la rama entre ambos.
- **`withDiagnostics` pre-paginación**: el contrato establecido dice que el filtro de
  diagnósticos afecta `total/pageCount`. Los diagnósticos de operación deben respetarlo
  aunque encarezca la query (igual que lotes).
- **Cap de 1000 + orden ascendente**: el `take` debe aplicarse sobre la query ya
  ordenada en la dirección elegida; el copy de truncado pasa a ser neutral.
- **`orderBy` múltiples por data file**: solo se toca el de la query de lista; las
  sub-relaciones de detalle (asc) y los "últimos eventos" (desc) quedan como están.
- **Carritos ordena por `updatedAt`, no `createdAt`**, con `deleted asc` primero — el
  toggle invierte solo `updatedAt/id`.
- **Colapsable sin pérdida de estado**: los inputs avanzados son controlados por el
  padre; `CollapsibleContent` no debe desmontar con `forceMount` si Radix desmonta por
  defecto y eso causara pérdida de foco/valores — verificar y fijar.
- **Deep-links que aterrizan en filtros avanzados** (tracking): el panel debe abrir
  solo cuando hay filtros avanzados activos al montar, no en cada render.
- **Semántica de color**: `highlight` es acento de marca (CTAs, eyebrow, badge del
  contador); nunca usar `warning` como decoración ni `highlight` para severidades —
  los diagnósticos siguen en `warning`/`destructive`.
- **`CrudPageShell` pasa a client component**: verificar que ningún RSC lo importe
  directamente (hoy lo consumen los clients).
- **Tooltips sobre botones `disabled`**: un botón deshabilitado no dispara eventos de
  puntero — envolver en `<span tabIndex={0}>` o usar el patrón que el repo ya use para
  tooltips sobre disabled; verificar accesibilidad con teclado.
- **No renombrar handlers/estado en los clients migrados** (tracking tiene 18
  controles): la migración a `CrudFilterPanel` debe ser un cambio de layout, no un
  refactor — minimiza diff y riesgo de regresión.

## 11. Testing & validation

- **Tests to add/update:** `operation-diagnostics.test.ts` (cada regla dispara y no
  dispara; `highestDiagnosticSeverity`), `crud-list-sort.test.ts` (newest/oldest/
  default, desempate por id string y number). Verificar que los tests existentes de
  servicios admin sigan verdes con los inputs extendidos.
- **Commands:** `pnpm typecheck`, `pnpm check`, `pnpm test`, `pnpm test:e2e`,
  `pnpm build`.
- **Manual checks / regression risks:**
  - Por cada página operativa: filtrar desde la fila primaria, abrir avanzados,
    aplicar un ID, colapsar (el filtro sigue aplicado y el badge lo cuenta), Limpiar,
    ordenar asc/desc, paginar, cambiar page-size (resetea a página 1).
  - Deep-links: `/admin/tracking?operationId=x` (panel abierto, filtro visible),
    `/admin/lots?operationId=x`, `?detailId=` en las 4 páginas con modal.
  - Operaciones: crear → modal abre solo; buscar con debounce; operación `other`
    visible; fila con diagnósticos muestra badge.
  - Modal de operación: todos los datos del modal viejo localizables; links a
    carrito/lotes/tracking navegan; JSON accesible en "Datos técnicos"; botones
    deshabilitados muestran tooltip; refetch no blanquea.
  - Catálogo: ordenar por recientes/antiguos + búsqueda simultánea.
  - Dark mode: paridad de medallones/empty states (tokens ya tienen par `.dark`).
- **Success criteria:** comandos verdes + checklist sin regresiones.

## 12. Rollout, migration & rollback

Un solo branch/PR (o PRs por fase respetando §5); sin flags ni migraciones. Ninguna
URL cambia. Rollback = revert del merge. El único punto sin rollback parcial limpio es
el par T3.3+T4.6 (contrato de list), que viaja junto. Post-release: verificar en
producción una lista con `sortDirection=asc`, la paginación de operaciones y el modal
de una operación con muchos lotes.

## 13. Documentation updates

- **CONTEXT.md:** None — no surgieron términos nuevos ("Operational diagnostic" ya
  cubre las reglas de operación).
- **ADRs:** None — decisiones visuales/UX reversibles; los diagnósticos siguen el
  patrón existente (que deliberadamente no tiene ADR). Todo queda registrado en §2.
- Otros: este plan en `docs/plans/` según convención del repo.

## 14. Risks & trade-offs

| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| Diagnósticos de lista encarecen `admin.operation.list` | La lista pasa de query plana a evaluar reglas | Media | Medio | Derivar reglas de lista de agregados + select liviano; el patrón de lotes ya paga este costo y es aceptable |
| La migración de tracking (18 controles) introduce una regresión de filtro | Página más compleja del admin | Media | Medio | Cambio de layout sin refactor de handlers + checklist manual dedicada |
| El accordion del modal con operaciones enormes (cientos de asignaciones) rinde mal | El detalle es unbounded | Baja–Media | Medio | Secciones colapsadas salvo Lotes; si un lote supera ~50 asignaciones, mostrar las primeras N con "Ver todas ({n})" expandible local — decidir en ejecución (no requiere server) |
| `CrudPageShell` client-side rompe algún import RSC | Build rojo | Baja | Bajo | Grep de imports antes del cambio |
| El eyebrow automático confunde en páginas de detalle (`/admin/carts/[cartId]`) | UX menor | Baja | Bajo | `findAdminNavItem` matchea "Carritos"/grupo Operación — correcto; overridable por prop |
| Tooltip sobre botones disabled no accesible | A11y | Media | Bajo | Patrón wrapper con `tabIndex` + verificación teclado |

## 15. Open questions

- **Blocking (resolve before execution):** ninguna.
- **Non-blocking (resolve during execution):**
  - Composición exacta de la fila primaria por página — default: la especificada en
    T4.1–T4.5; ajustar si la grilla no respira en `xl`.
  - Cap de asignaciones visibles por lote en el modal antes de "Ver todas" — default:
    sin cap salvo problema de rendimiento evidente; si hace falta, N=50.
  - Labels del toggle de orden en carritos — default: "Actualizados recientes" ⇄
    "Más antiguos".
  - Si `lot.mappers.ts` ya exporta configs de estado reutilizables para lote/ítem —
    verificar antes de crear duplicados en `operation.mappers.ts`.
- **Optional refinements:**
  - Persistir `sortDirection` y filtros en URL (diferido §3).
  - `ClientPagination` numerada del storefront como upgrade futuro de
    `CrudPaginationBar`.
  - Diagnóstico `operation.running.stale` con umbral configurable (diferido).

## 16. Definition of done

- [ ] Las 17 páginas admin muestran eyebrow de grupo, medallones en stats, empty
      states `brand-warm` y CTAs `highlight`; tablas y chips de estado sin cambios de
      semántica.
- [ ] Lotes, paquetes, envíos, tracking y carritos usan `CrudFilterPanel` (primaria
      visible, avanzados colapsables con contador y auto-apertura por deep-link),
      `CrudSortToggle` server-side y `CrudPaginationBar` con page-size.
- [ ] `admin.operation.list` paginado, con filtro de estrategia visible (adiós
      `fifo` hardcodeado), búsqueda con debounce y columna de diagnósticos.
- [ ] `operation-diagnostics.ts` con las 6 reglas acordadas, testeado, con resumen en
      lista, detalle completo y filtro pre-paginación.
- [ ] Modal de operación reescrito: header con estado/estrategia/métricas,
      diagnósticos, chips a lotes/tracking, accordion lotes→ítems→asignaciones con
      cliente y link a carrito, órdenes/rollovers con StatusChip, JSON en accordion
      colapsado, botones deshabilitados con tooltip, sin `IdRef` local, sin blanqueo
      en refetch.
- [ ] Catálogo/usuarios ordenan client-side por fecha (modelo puro testeado).
- [ ] Pagos con restyle y orden client-side en Intentos/Eventos.
- [ ] `pnpm typecheck && pnpm check && pnpm test && pnpm test:e2e && pnpm build`
      verdes.

## 17. Instructions for the executing agent

- Use this plan as the primary source; read first: `CONTEXT.md`,
  `docs/plans/admin-shell-navigation-redesign.md` (§2 y desvíos),
  `docs/plans/home-ui-ux-redesign.md` (T1, paleta), `src/styles/globals.css`,
  `src/features/admin/crud/_components/` completo,
  `src/features/admin/crud/tracking/tracking-detail-dialog.tsx` (patrón a espejar),
  `src/server/services/admin/lot-diagnostics.ts` y `lot.data.ts` (patrón de
  diagnósticos y paginación), `src/app/(storefront)/my-orders/_components/`
  (lenguaje visual y modelo de orden).
- Respect these settled decisions (§2): acentos en jerarquía con datos neutros; los
  botones Cancelar/Reejecutar/Eliminar se conservan deshabilitados con tooltip (el
  usuario lo decidió explícitamente — no eliminarlos); las 6 reglas de diagnóstico con
  sus códigos exactos; el modal sigue siendo modal. Do not change: códigos de
  diagnóstico existentes, semántica de `status-presets`, query params de deep-link,
  guards, orden por defecto de cada lista.
- Verify before modifying: qué `orderBy` corresponde a la query de lista en cada data
  file; que `operations-client.tsx` sea el único consumidor de `admin.operation.list`;
  si `lot.mappers.ts` ya exporta configs de estado reutilizables.
- Execute phases in order; honor task dependencies. T3.3+T4.6 viajan juntos. No cortar
  entre Fase 3 y Fase 4 con el contrato de operaciones a medio migrar.
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

---

## 18. Desvíos de ejecución

Registrados según la convención del repo. Ninguno cambia el alcance ni las
decisiones de §2; son ajustes tomados durante la implementación.

### Primitivas (Fase 2)

- **`CrudPaginationBar.totalLabel`** es `{ singular, plural }` en vez de un
  `string`. El copy actual pluraliza (`${total} lote${total === 1 ? "" : "s"}`)
  y la barra debía preservarlo; con un solo string se perdía. La barra también
  recibe `isLoading` (no listado en T2.4) para conservar el deshabilitado de
  Anterior/Siguiente durante la carga.
- **`CrudFilterPanel` tiene un slot opcional `actions`**, a la derecha de la
  fila primaria junto a "Filtros"/"Limpiar". Es donde vive `CrudSortToggle`,
  que T4.1 pedía "alineado a la derecha de la fila primaria".
- **`crud-list-sort.ts` (T6.1) también exporta `sortByDate`**, la primitiva
  sobre la que se apoya `applyCrudListSort`. Pagos (T4.7) la usa directamente
  porque ordena por `createdAt`/`receivedAt`, no por `updatedAt`.

### Servidor (Fase 3)

- **`sortDirection` vive en `sortDirectionSchema`** (`_crud-schema-helpers.ts`)
  y los 6 list inputs lo referencian, en vez de repetir el `z.enum` seis veces.
- **`calculateOperationDiagnostics` recibe `OperationSummaryRecord`**, no
  `OperationDetailRecord`. `operationSummarySelect` = list select + un select
  fino de `lots { id, code, supplierOrder { id }, lotItems { id, quantity } }` y
  `rollOvers { id, status }`; `operationDetailSelect` es un superconjunto
  estructural, así que ambos alimentan la misma función. Consecuencia buscada:
  **las 6 reglas se evalúan igual en lista y en detalle**, sin el subconjunto
  honesto que T3.4 contemplaba como alternativa.
- **Los diagnósticos se calculan en `operation.service.ts`**, no en el data
  layer (T3.4 decía data layer). Espeja `lot.service.ts` y evita un ciclo de
  imports `operation.data ↔ operation-diagnostics`. El data layer expone
  `toOperationListItem(record, diagnostics)` y `toOperationDetail(record,
  diagnostics)`.
- **Las dos reglas de cantidad no llevan guarda por estado.** Una operación
  recibe sus cantidades sólo al completarse (`dbOperationComplete`, dentro de la
  transacción serializable de `operation-execution.service.ts`), así que las
  `running`/`failed` quedan en cero y balancean solas. Documentado en el TSDoc.
- **`markOperationFailed` y `findOperationById` devuelven el registro crudo**;
  el service los mapea. Antes `findOperationById` mapeaba y `markOperationFailed`
  no, lo que ya era asimétrico y ahora rompería el parse (falta `diagnostics`).

### Botones deshabilitados (§2, decisión del usuario)

Los tres botones se **conservan deshabilitados**, como se decidió. La forma de
explicar el porqué se partió en dos según lo que el control admite:

- **Botones** (Reejecutar inline de la fila, y Cancelar/Reejecutar/Eliminar del
  footer del modal): `aria-disabled` + `Tooltip` "Disponible próximamente". Con
  el atributo `disabled` nativo el botón no dispara eventos de puntero ni recibe
  foco, así que el tooltip nunca aparecería; `aria-disabled` mantiene ambos y
  anuncia el estado. El `onClick` hace `preventDefault()`.
- **Ítems del menú de fila**: `CrudRowAction` gana `hint?: string`, que se
  renderiza como texto muted a la derecha del label cuando el ítem está
  deshabilitado. Un `DropdownMenuItem` deshabilitado de Radix no toma punteros
  **ni** foco, de modo que un tooltip no llegaría a ningún usuario; el texto
  inline sí. Se descartó el wrapper `<span tabIndex={0}>` de §10 porque rompe la
  navegación por teclado del menú (roving tabindex) y biome lo rechaza
  (`noNoninteractiveTabindex`).

### JsonPreview (T5.2)

La consolidación absorbió **cuatro** copias, no dos: además de operación y envío
(nombradas en T5.2), las de `tracking-timeline.parts.tsx` y
`operations-cart-detail-form.tsx`, para que el grep de aceptación quede limpio.
`JsonPreview` toma `emptyLabel` para conservar los textos vacíos de cada sitio
("Sin resumen", "Sin snapshot", "Sin metadata").

### Pagos (T4.7)

La tabla de **Eventos ordena por `receivedAt`** (su campo de fecha; no tiene
`createdAt`); Intentos por `createdAt`. Un único toggle gobierna ambas tabs.

### Estado de los comandos

`pnpm typecheck`, `pnpm test` (208), `pnpm test:e2e` (11) y `pnpm build` quedan
verdes. **`pnpm check` queda rojo por hallazgos preexistentes** en archivos que
este plan no toca: `src/components/ui/field.tsx`, `src/components/ui/input.tsx`,
`src/server/events/domain-event-publisher.ts` y
`src/server/services/audit/audit-log.service.ts` (HEAD tenía 21 errores; el
branch tiene los mismos menos los de archivos tocados). No se arreglaron por
disciplina de alcance.
