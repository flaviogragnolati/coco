# Implementation Plan: Rediseño cliente — carrito, checkout y mis pedidos (paleta + seguimiento)

## 1. Objective & outcome

- **Done means:** (a) `/cart`, `/checkout` y `/my-orders` adoptan la guía visual del home
  con intensidad "acentos de conversión": eyebrows y CTAs de conversión en `highlight`,
  placeholders de imagen en `brand-soft`, empty states en `brand-warm`, chips de estado
  semánticos — cards y superficies neutras; (b) `/my-orders` se puede ordenar por fecha
  (toggle recientes/antiguos) y filtrar por estado con chips agrupados, todo client-side;
  (c) `/my-orders/[orderId]` es la pantalla de seguimiento del cliente: la grilla de 6
  cajas con iconos se reemplaza por el `TrackingJourneyStepper` de 6 etapas, colapsado en
  un único recorrido de pedido cuando todos los items comparten etapa y desplegado por
  item cuando divergen; (d) typecheck, biome, vitest y build pasan.
- **Why:** el funnel "se apaga" visualmente al salir del home (cero uso de la paleta de
  marca en cart/checkout); my-orders es la sección más atrasada (sin filtros, timeline en
  cajas poco amigable, único código del repo con colores crudos `emerald-*`); el stepper
  genérico creado para el admin ya está listo para reutilizarse del lado cliente.
- **For:** AI coding agent.
- **Upstream design doc:** none. Referencias:
  [home-ui-ux-redesign.md](./home-ui-ux-redesign.md) (contrato de tokens, §Deferred:
  "rollout de la paleta al resto de las rutas" — este plan lo ejecuta para el funnel),
  [checkout-redesign.md](./checkout-redesign.md) (estructura de checkout, no se toca),
  `tmp/implementation-plan-tracking-journey-modal.md` (stepper y journey admin).

## 2. Alignment reached

| Topic | Decision | Source |
| --- | --- | --- |
| Intensidad de color | "Acentos de conversión": sin bandas full-bleed tintadas; `highlight` para eyebrows y CTAs de conversión ("Ir a pagar", "Confirmar y pagar"), `brand-soft` en placeholders de imagen, `brand-warm` en empty states, cards neutras. El color guía la acción, no decora. | user |
| Estructura cart/checkout | Solo restyle: el flujo de 4 pasos, el stepper de checkout, el modelo de pasos, mutaciones y el cart engine quedan intactos. | user + code (rediseño estructural previo) |
| Pantalla de seguimiento | `/my-orders/[orderId]` evolucionado es LA pantalla de seguimiento — sin modales ni rutas nuevas. | user |
| Colapso del recorrido | Cuando TODOS los items del pedido están en la misma etapa → un único stepper resumen ("Order journey"/"Seguimiento del pedido"). Solo se muestra el recorrido por item cuando hay items en estados distintos. Objetivo: resumir sin repetir. | user |
| Regla de igualdad (default) | Colapsa si todos los items comparten `currentStageIndex` Y el mismo estado de cancelación (todos o ninguno con aviso `cancelled`). Timestamps del stepper unificado: el más reciente por etapa entre los items. | default aceptado implícitamente (ajustable, aislado en el adapter puro) |
| Data del recorrido cliente | Solo frontend sobre el payload actual de `tracking.getOrderItemTimelines`. Cero cambios en server/schemas de tracking. Sin `warning` por etapa (sin triangulitos); avisos como lista amigable DEBAJO del stepper; cancelación detectada por aviso → banner simple + recorrido congelado. | user |
| Filtro de estado | 5 chips agrupados: Todos · En curso (`pending`+`processing`) · Completados (`completed`) · Cancelados (`cancelled`+`failed`) · Reintegros (`refunded`+`chargedBack`). Sin filtro de pago separado. | user |
| Orden y estado | Toggle "Más recientes / Más antiguos" (default recientes), filtro+orden en estado local del componente, sobre la lista completa que ya devuelve `orders.listMine`. Sin cambios de server ni URL sync. | user ("mantener todo del lado del cliente") |
| Limpiezas incluidas | PageHeader compartido del storefront + voseo/tildes en cart; `SelectableTile` compartido en checkout; micro-limpiezas (borrar `cart-item-row.tsx`, label `chargedBack`, labels de estado deduplicados a módulo compartido, radios de skeletons). | user |
| Limpieza excluida | NO extraer la receta de círculos compartida entre `checkout-stepper` y `tracking-journey-stepper` — el checkout-stepper no se toca. | user (opción no seleccionada) |
| Stepper genérico | `TrackingJourneyStepper` se reutiliza tal cual; único cambio permitido: prop aditiva opcional `ariaLabel` (default actual "Recorrido del item") para que el recorrido unificado anuncie "Recorrido del pedido". | code + default |
| Vocabulario | Nuevo término en `CONTEXT.md`: **Order journey** (Seguimiento del pedido) — roll-up de los recorridos de los items de un pedido. | glosario actualizado esta sesión |
| ADR | Ninguno: decisiones de presentación reversibles (colapso, agrupación de chips, intensidad de color). Registradas acá. | default |

## 3. Scope

- **In scope:**
  - Restyle de `/cart` (página + resumen + fila de item + mini-cart en lo mínimo) con
    acentos de conversión y voseo/tildes.
  - Restyle de `/checkout` (header, CTAs de conversión, tiles → `SelectableTile`, panel
    de resultado y páginas de retorno de Mercado Pago con toque leve).
  - `PageHeader` compartido del storefront y adopción en cart/checkout/my-orders.
  - Módulo compartido de display de pedidos (labels + config de chips por estado,
    incluido `chargedBack`) reemplazando los helpers duplicados.
  - `/my-orders`: componente cliente con chips de filtro agrupados + toggle de orden +
    cards restyleadas + empty states (sin pedidos / sin resultados del filtro).
  - `/my-orders/[orderId]`: recorrido por pedido — adapter puro (colapso + mapeo al
    view-model del stepper + agregación de avisos) con tests, vista nueva que reemplaza
    `CustomerCartItemTimeline`, restyle del resto de la página.
  - Eliminación de `customer-cart-item-timeline.tsx` y `cart-item-row.tsx`.
  - Tildes en los 6 labels/descripciones de `userTrackingStageDefinitions`
    (customer-facing).
- **Out of scope / non-goals:**
  - NO tocar servicios, routers ni schemas de tracking (`src/server/services/tracking/`,
    `tracking.router.ts`, `tracking.schemas.ts`) ni de orders/checkout
    (`orders.router.ts` sigue sin input; `checkout.*` intacto).
  - NO tocar el flujo de checkout: `checkout-steps.ts`, `checkout-stepper.tsx`,
    mutaciones, redirect de Mercado Pago, `useCartSync`/`useCartActions`, stores.
  - NO warnings por etapa ni outcome server-side para el cliente.
  - NO paginación, sorting ni filtros server-side; NO URL sync de filtros.
  - NO bandas full-bleed tintadas en páginas de funnel; NO tocar home, products, navbar
    ni nada de admin (incluido el modal de tracking y su stepper salvo la prop aditiva).
  - NO cambios de Prisma ni migraciones.
- **Deferred:**
  - URL sync de filtros/orden de my-orders; paginación server-side si crecen los pedidos.
  - Hint de etapa actual en las cards del listado (requeriría timelines por pedido en la
    lista — N queries).
  - Warnings por etapa / outcome cliente vía builder server-side parametrizado.
  - Receta compartida de círculos de stepper (checkout + tracking).
  - Restyle profundo del mini-cart y de los dialogs de dirección/pago.
- **Must not change / break:**
  - Contrato visual y de props del `TrackingJourneyStepper` para el admin (solo prop
    aditiva `ariaLabel` con default igual al actual).
  - Comportamiento de `orders.listMine`/`orders.getMine` y sus schemas.
  - El ciclo `atCheckout → submitted`, idempotencia y retry de pago.
  - Los queries/schemas cliente de tracking (`getUserOrderItemTimelines` y su output).
  - `tracking-display.ts`: solo se editan strings de labels/descripciones de
    `userTrackingStageDefinitions`; keys, mapas y todo lo admin quedan intactos.

## 4. Current system context

- **Tokens y patrones** (fuente: `src/styles/globals.css`, Tailwind v4 `@theme inline`,
  sin tailwind.config): `brand-soft`, `brand-warm`, `brand-ink`, `highlight` (+
  `-foreground`), semánticos `success/warning/info`; variantes `highlight` ya existen en
  `src/components/ui/button.tsx:21` y `badge.tsx:22`. Patrones a espejar: eyebrow
  `font-semibold text-highlight text-xs uppercase tracking-wide`
  (`src/app/admin/page.tsx:21`, `contact-section.tsx:22`); placeholder tintado
  `bg-brand-soft text-brand-soft-foreground`
  (`src/features/home/_components/home-offer-card.tsx:28`); empty tintado
  `<Empty className="border bg-brand-warm text-brand-warm-foreground">`
  (`src/features/home/_components/offers-section.tsx:41`); icon chip circular
  `flex size-8 items-center justify-center rounded-full bg-brand-soft …`
  (`home-hero.tsx:66`).
- **Cart:** `src/app/(storefront)/cart/page.tsx` (RSC) → `_components/cart-client.tsx`
  (shell + header inline L45-67, empty L72, grid L89) → `_components/cart-item-row.tsx`
  (indirección pura sobre `CartLineRow`, a borrar) + `_components/cart-summary.tsx` (CTA
  checkout, voseo inconsistente L104 vs L111/131). Fila compartida:
  `src/features/cart/_components/cart-line-row.tsx:66` (`CartLineImage` L31, tile
  hand-rolled L129); mini-cart `src/features/cart/_components/cart-sheet.tsx` (skeletons
  `rounded-3xl` L66). Copy del cart en tuteo sin tildes (`cart-client.tsx:56,77,79`,
  `cart-summary.tsx:111,131`).
- **Checkout:** `src/app/(storefront)/checkout/_components/checkout-client.tsx` (header
  inline L381-403, skeletons `rounded-4xl` L62); pasos en archivos propios; tiles
  seleccionables duplicados byte a byte en `checkout-address-step.tsx:86` y
  `checkout-payment-step.tsx:113` (+ `ring-2 ring-success/40` al seleccionar); CTA
  confirmar en `checkout-review-step.tsx` (CardFooter) y `checkout-summary.tsx:177`
  (`CheckoutMobileBar`); resultado en `checkout-result-panel.tsx`; retorno MP en
  `mercadopago/_components/mercadopago-return-page.tsx` (tonos por `copyByTone` L25).
- **My-orders lista:** `src/app/(storefront)/my-orders/page.tsx` — RSC, `requireUser()` +
  `api.orders.listMine()` (server caller), helpers locales `orderStatusLabel` L28-43 /
  `paymentStatusLabel` L45-58 (duplicados en el detalle L25-40; sin caso `chargedBack` →
  cae en "Pendiente"), grid de Cards L93-141, sin filtros/orden. `orders.listMine`
  (`src/server/api/routers/orders.router.ts:10`) no acepta input; orden fijo
  `createdAt desc, id desc` en `checkout.data.ts:566`. `OrderListItem` en
  `src/shared/common/checkout.types.ts:45` (fechas `z.date()` → instancias `Date`,
  serializables RSC→client).
- **My-orders detalle:** `src/app/(storefront)/my-orders/[orderId]/page.tsx` — fetch
  paralelo `api.orders.getMine` + `api.tracking.getOrderItemTimelines` L122-125, join por
  `sourceCartItemId` L131/190, fila de item L169-193 que embebe
  `CustomerCartItemTimeline`.
- **Timeline cliente actual:** `src/features/tracking/customer-cart-item-timeline.tsx` —
  grilla `md:grid-cols-6` de cajas `rounded-none` con colores crudos
  (`border-emerald-500/40`), 2 iconos por caja, badges de avisos abajo. Único consumidor:
  el detalle de pedido. A reemplazar y borrar.
- **Stepper genérico:** `src/features/tracking/tracking-journey-stepper.tsx` —
  `"use client"`, props `{ stages: TrackingJourneyStepperStage[] }` (L25-33: `key:
  string`, `label`, `description?`, `status: completed|current|pending|skipped`,
  `warning: boolean` requerido, `timestamp?`, `noticeLabels?`), dual layout
  desktop/mobile, colores por tokens, aria-label hardcodeado "Recorrido del item" L120.
  Consumidor actual: `tracking-detail-dialog.tsx:189-208` (`JourneySection`, el template
  de mapeo de ~10 líneas).
- **Payload cliente de tracking:** `UserOrderItemTimeline`
  (`src/shared/common/tracking.types.ts:34`; schema `tracking.schemas.ts:67`) = `{
  cartItemId, stages: [{key, label, description, status: completed|current|pending,
  eventType?, quantity?, createdAt?}], notices: [{eventType, kind:
  exception|resolved|rollover|cancelled|quantity, label, quantity?, createdAt}] }`. Sin
  `warning`, sin `skipped`, sin `stageKey` en notices. Etapas y definiciones en
  `src/shared/common/tracking-display.ts`: `userTrackingStageKeys` L31 (6),
  `userTrackingStageDefinitions` L83-118 (labels sin tildes: "Preparacion", "Envio").
- **Patrón de modelo puro + test colocado:**
  `src/app/(storefront)/checkout/_components/checkout-steps.ts` + `.test.ts`.
- **Convenciones:** Biome con tabs (`npm run check`), vitest colocado (`npm run test`),
  `npm run typecheck` (tsgo), `npm run build`. Copy storefront: voseo rioplatense con
  tildes. Fechas con `formatDateTimeShort/Medium` de `~/shared/common/date.helpers`
  (BUSINESS_TZ). Iconos con `data-icon="inline-start"`.

## 5. Approach & sequencing

Fundación-primero y por sección: (1) crear los módulos compartidos que todas las pantallas
consumen — display de pedidos (labels/chips) y `PageHeader` — junto con las micro-limpiezas
que despejan el terreno; (2) restyle de cart y (3) checkout, que son cambios puramente
visuales sobre estructura estable, cada uno verificable por separado; (4) my-orders lista
con su modelo puro de filtro/orden testeado antes de la UI; (5) el recorrido del pedido —
la pieza con más lógica — como adapter puro testeado (colapso, mapeo, agregación de
avisos) y recién después la vista que lo consume, reemplazando el componente viejo; (6)
verificación integral. Las fases 2-5 son independientes entre sí (todas dependen solo de
la 1) — el orden elegido va de menor a mayor riesgo. Regresiones evitadas porque no se
toca ningún contrato de datos ni de flujo; correctitud validada con los tests de los dos
modelos puros + typecheck + build + smoke manual.

## 6. Assumptions

| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |
| La lista completa de pedidos de un usuario es chica (decenas) y filtra/ordena bien en el browser | `listMine` ya devuelve todo sin paginar y la página actual lo renderiza completo | Usuarios con cientos de pedidos | Paginación/filtros server-side (diferido); el modelo puro de filtrado se conserva |
| Pasar `Date` de RSC a client component funciona | Next serializa `Date` en props RSC→client; `OrderListItem` ya las trae como `Date` | Errores de serialización en build | Serializar a ISO en el server component y parsear en el cliente |
| La regla de colapso (misma etapa actual + misma cancelación) refleja "todos en el mismo estado" | Es la lectura literal del pedido del usuario; avisos no bloquean el colapso porque se agregan debajo | El usuario espera divergencia también por avisos distintos | Ajustar solo el predicado en el adapter puro (un lugar, testeado) |
| Un pedido con pago fallido tiene items sin eventos (todas las etapas pending) | Los items pasan a `submitted/awaitingAggregation` recién con pago aprobado | Eventos presentes en pedidos fallidos | El adapter no asume lista vacía; el banner de estado del pedido cubre ambos casos |
| Cambiar tildes en `userTrackingStageDefinitions` solo afecta UI cliente | El label viaja por el schema como string libre; único render es la pantalla cliente | Algún test/snapshot admin asserta esos strings | Ajustar el test; los literales `key` no cambian |

## 7. Phased execution plan

### Phase 1 — Fundación compartida y micro-limpiezas
**Objective:** módulos que todas las pantallas consumen + terreno despejado.
**Tasks:** T1, T2, T3.
**Dependencies:** ninguna.
**Validation / done:** typecheck limpio; `rg "cart-item-row"` sin hits; ambas páginas de my-orders consumen los labels compartidos (sin helpers locales); `chargedBack` tiene label propio.

### Phase 2 — Restyle del carrito
**Objective:** cart con acentos de conversión y voseo correcto.
**Tasks:** T4.
**Dependencies:** Phase 1.
**Validation / done:** smoke `/cart` con items, vacío y anónimo; mini-cart abre y el CTA lleva a checkout.

### Phase 3 — Restyle del checkout
**Objective:** checkout con acentos de conversión, tiles unificados, sin cambios de flujo.
**Tasks:** T5, T6.
**Dependencies:** Phase 1.
**Validation / done:** flujo completo de 4 pasos en desktop y mobile; selección de dirección/pago idéntica en comportamiento; confirmar con mock y con Mercado Pago redirige igual que hoy.

### Phase 4 — Listado de pedidos con filtros y orden
**Objective:** `/my-orders` filtrable/ordenable client-side y restyleado.
**Tasks:** T7, T8.
**Dependencies:** Phase 1 (T1 para grupos de estado y chips).
**Validation / done:** `npm run test` verde con los casos del modelo; chips filtran, toggle ordena, empty states correctos.

### Phase 5 — Recorrido del pedido (seguimiento)
**Objective:** detalle del pedido como pantalla de seguimiento con stepper colapsable.
**Tasks:** T9, T10.
**Dependencies:** Phase 1; T9 antes que T10.
**Validation / done:** tests del adapter verdes; pedido con items convergentes muestra un solo stepper, con items divergentes muestra uno por item; `customer-cart-item-timeline.tsx` eliminado sin referencias.

### Phase 6 — Verificación integral
**Objective:** calidad y regresiones.
**Tasks:** T11.
**Dependencies:** todas.
**Validation / done:** `npm run check`, `npm run typecheck`, `npm run test`, `npm run build` verdes + smoke completo.

## 8. Task breakdown

### T1 — Módulo compartido de display de pedidos
- **Files:** `src/shared/common/order-display.ts` `[NEW]`
- **Symbols / signatures:**
  - `orderStatusLabelMap: Record<OrderStatus, string>` — los 7 estados con label español
    (agrega "Contracargo" para `chargedBack`).
  - `paymentStatusLabelMap: Record<TransactionStatus, string>` — los 7 estados de pago.
  - `orderStatusChipConfigMap: Record<OrderStatus, { label; variant: BadgeVariant; icon: LucideIcon }>`
    — default: `pending`/`processing` → `info` + `Clock`; `completed` → `success` +
    `CheckCircle2`; `cancelled` → `outline` + `XCircle`; `failed` → `destructive` +
    `XCircle`; `refunded`/`chargedBack` → `warning` + `RotateCcw`.
  - `orderStatusFilterKeys = ["all","inProgress","completed","cancelled","refunded"] as const`
    + `type OrderStatusFilterKey`.
  - `orderStatusFilterGroups: Record<Exclude<OrderStatusFilterKey,"all">, { label: string; statuses: OrderStatus[] }>`
    — En curso (`pending`,`processing`) · Completados (`completed`) · Cancelados
    (`cancelled`,`failed`) · Reintegros (`refunded`,`chargedBack`); label de `all` =
    "Todos".
- **Change:** módulo puro sin React (iconos lucide permitidos — precedente:
  `status-presets.ts`). Tipar `OrderStatus` desde el enum ya modelado en
  `src/schemas/checkout.schemas.ts:162` (usar el tipo inferido/exportado existente en
  `checkout.types.ts`, no duplicar literales a mano si es evitable).
- **Mirror this pattern:** `src/shared/common/tracking-display.ts` (mapas por literal) y
  `src/shared/common/admin-crud/status-presets.ts` (variant+icon).
- **Depends on:** —
- **Acceptance:** typecheck; los 7+7 estados cubiertos exhaustivamente (Record cerrado, no
  Partial); "Contracargo" visible para `chargedBack`.
- **Pitfalls:** no importar nada de `admin-crud/` (convención admin) ni de React; los
  labels van con tildes y voseo neutro ("Completado", no "Completo").

### T2 — PageHeader compartido del storefront
- **Files:** `src/components/page-header.tsx` `[NEW]`
- **Symbols / signatures:** `PageHeader({ eyebrow?, title, description?, actions? }:
  { eyebrow?: string; title: string; description?: string; actions?: ReactNode })` —
  server-compatible (sin `"use client"`).
- **Change:** semántica del header actual de cart/checkout (`<section>` con eyebrow +
  `h1 font-heading font-semibold text-3xl` + descripción muted + slot derecho), con el
  eyebrow al patrón nuevo: `font-semibold text-highlight text-xs uppercase tracking-wide`
  (espejo `src/app/admin/page.tsx:21`). Layout `flex flex-wrap items-end justify-between
  gap-4` como los headers actuales.
- **Mirror this pattern:** bloque header de `cart-client.tsx:45-67` y
  `checkout-client.tsx:381-403`; `SectionHeading`
  (`src/features/home/_components/section-heading.tsx`) solo como referencia — no
  reutilizarlo (usa `h2` + Badge, semántica de sección, no de página).
- **Depends on:** —
- **Acceptance:** typecheck; un solo `h1` por página en los tres consumidores.
- **Pitfalls:** no convertirlo en client component; `products-client.tsx` NO se migra en
  este trabajo (fuera de scope) — solo cart, checkout y my-orders.

### T3 — Micro-limpiezas
- **Files:** `src/app/(storefront)/cart/_components/cart-item-row.tsx` (delete),
  `src/app/(storefront)/cart/_components/cart-client.tsx`,
  `src/app/(storefront)/my-orders/page.tsx`,
  `src/app/(storefront)/my-orders/[orderId]/page.tsx`,
  `src/features/cart/_components/cart-sheet.tsx`,
  `src/app/(storefront)/checkout/_components/checkout-client.tsx`
- **Change:** (1) borrar `cart-item-row.tsx` y que `cart-client.tsx` mapee `CartLineRow`
  con `variant="full"` directo (como ya hacen mini-cart y checkout); (2) reemplazar los
  helpers locales `orderStatusLabel`/`paymentStatusLabel` de ambas páginas de my-orders
  por los mapas de T1; (3) unificar radios de skeletons con la superficie que suplantan:
  los del mini-cart (`cart-sheet.tsx:66`) representan filas `rounded-3xl` (quedan), los de
  checkout (`checkout-client.tsx:62`) representan Cards `rounded-4xl` (quedan) — corregir
  solo si alguno no coincide con su superficie real tras el restyle.
- **Mirror this pattern:** uso directo de `CartLineRow` en `cart-sheet.tsx`.
- **Depends on:** T1.
- **Acceptance:** `rg "cart-item-row|orderStatusLabel\(|paymentStatusLabel\("` sin hits
  fuera de `order-display.ts`; typecheck.
- **Pitfalls:** `CartLineRow` recibe callbacks con firmas específicas — copiarlas del
  `cart-item-row.tsx` borrado, no reinventarlas.

### T4 — Restyle del carrito (+ voseo)
- **Files:** `src/app/(storefront)/cart/_components/cart-client.tsx`,
  `src/app/(storefront)/cart/_components/cart-summary.tsx`,
  `src/features/cart/_components/cart-line-row.tsx`,
  `src/features/cart/_components/cart-sheet.tsx`
- **Change:**
  1. `cart-client.tsx`: header inline → `PageHeader` (eyebrow "Tu carrito" o similar,
     acción "Seguir comprando" outline). Empty state → patrón tintado
     `<Empty className="border bg-brand-warm text-brand-warm-foreground">` con CTA
     `variant="highlight"` a `/products` (espejo `offers-section.tsx:41`).
  2. Copy a voseo con tildes en todo el área: "Revisá cantidades…", "Tu carrito está
     vacío", "Agregá productos del catálogo", "Iniciá sesión…" (L56, L77, L79;
     `cart-summary.tsx` L111, L131).
  3. `cart-summary.tsx`: CTA "Ir a pagar" → `variant="highlight"`; "Vaciar carrito" queda
     outline/ghost. Chips de moneda/estado quedan como están.
  4. `cart-line-row.tsx` (`CartLineImage`, L31): placeholder sin imagen →
     `bg-brand-soft text-brand-soft-foreground` (espejo `home-offer-card.tsx:28`);
     verificar las clases actuales antes de editar. No tocar `QuantityStepper` ni la
     lógica de cantidades.
  5. `cart-sheet.tsx` (mini-cart, toque mínimo): CTA hacia checkout →
     `variant="highlight"` para consistencia de conversión. Nada más.
- **Mirror this pattern:** patrones D/E/H del home (§4).
- **Depends on:** T2, T3.
- **Acceptance:** `/cart` con items, vacío y anónimo renderiza coherente; el flujo
  agregar/editar/vaciar intacto; `CartLineRow` sigue funcionando en sus 4 consumidores
  (cart, mini-cart, order step, review step).
- **Pitfalls:** `CartLineRow` es compartido — cualquier cambio ahí impacta checkout y
  mini-cart; limitarse al placeholder de imagen. El copy de `tracking-display.ts` NO se
  toca en esta tarea.

### T5 — SelectableTile compartido
- **Files:** `src/app/(storefront)/checkout/_components/selectable-tile.tsx` `[NEW]`,
  `src/app/(storefront)/checkout/_components/checkout-address-step.tsx`,
  `src/app/(storefront)/checkout/_components/checkout-payment-step.tsx`
- **Symbols / signatures:** `SelectableTile({ selected, onSelect, children, className? }:
  { selected: boolean; onSelect: () => void; children: ReactNode; className?: string })`
  — renderiza el `<button type="button">` con el string hoy duplicado
  (`flex flex-col gap-3 rounded-3xl bg-card p-3 shadow-sm ring-1 ring-foreground/5
  transition-all md:flex-row … dark:ring-foreground/10` + `selected && "ring-2
  ring-success/40"` + focus ring `focus-visible:ring-3 focus-visible:ring-ring/30`).
- **Change:** extraer sin alterar una sola clase; los dos steps lo consumen pasando su
  contenido actual como children.
- **Mirror this pattern:** las clases exactas de `checkout-address-step.tsx:86` /
  `checkout-payment-step.tsx:113`.
- **Depends on:** —
- **Acceptance:** diff visual nulo en los pasos Envío y Pago; selección por teclado y
  `aria`/roles como hoy.
- **Pitfalls:** conservar atributos de accesibilidad/`aria-pressed` si existen en los
  botones actuales; verificar contra el código antes de extraer.

### T6 — Restyle del checkout
- **Files:** `src/app/(storefront)/checkout/_components/checkout-client.tsx`,
  `src/app/(storefront)/checkout/_components/checkout-review-step.tsx`,
  `src/app/(storefront)/checkout/_components/checkout-summary.tsx`,
  `src/app/(storefront)/checkout/_components/checkout-result-panel.tsx`,
  `src/app/(storefront)/checkout/mercadopago/_components/mercadopago-return-page.tsx`
- **Change:**
  1. `checkout-client.tsx`: header inline → `PageHeader`. Skeleton/estados de error sin
     cambios de comportamiento.
  2. CTA de conversión → `variant="highlight"`: botón "Confirmar y pagar" del
     `CardFooter` en `checkout-review-step.tsx` y el CTA del `CheckoutMobileBar`
     (`checkout-summary.tsx:177+`). Los botones "Continuar"/"Atrás" intermedios quedan
     `default`/`outline` (el ámbar señala solo el momento de pago).
  3. `checkout-result-panel.tsx` y `mercadopago-return-page.tsx`: toque leve — icon chip
     circular del resultado sobre fondo tintado (patrón C: `size-12 rounded-full` con
     `bg-success/10 text-success` / `bg-destructive/10 text-destructive` /
     `bg-warning/10 text-warning` según tono) y CTA principal ("Ver mis pedidos" o
     equivalente) → `highlight`. Sin cambios de copy ni de navegación.
  4. `checkout-stepper.tsx` NO se toca.
- **Mirror this pattern:** patrón C/G del home (§4); tonos existentes de `copyByTone`
  (`mercadopago-return-page.tsx:25`).
- **Depends on:** T2, T5.
- **Acceptance:** flujo de 4 pasos completo sin cambios funcionales; mobile bar visible y
  con CTA ámbar; retorno MP en los tres tonos renderiza coherente.
- **Pitfalls:** el `CheckoutMobileBar` es `fixed` con safe-area — no alterar su layout;
  `window.location.assign(redirectUrl)` y la invalidación de `orders.listMine` no se
  tocan.

### T7 — Modelo puro de filtro/orden del listado
- **Files:** `src/app/(storefront)/my-orders/_components/order-list-view.ts` `[NEW]`,
  `src/app/(storefront)/my-orders/_components/order-list-view.test.ts` `[NEW]`
- **Symbols / signatures:**
  ```ts
  export type OrderListSort = "newest" | "oldest";
  export type OrderListViewInput = { filter: OrderStatusFilterKey; sort: OrderListSort };
  export function applyOrderListView(orders: OrderListItem[], view: OrderListViewInput): OrderListItem[];
  export function countOrdersByFilter(orders: OrderListItem[]): Record<OrderStatusFilterKey, number>;
  ```
- **Change:** filtrar por pertenencia del `status` al grupo (`all` = sin filtro), ordenar
  por `createdAt` con desempate por `id` (estable, espejo del orden server), sin mutar el
  array de entrada. `countOrdersByFilter` alimenta los contadores de los chips.
- **Tests (mínimo):** `all` conserva todo; cada grupo filtra exactamente sus estados
  (incluye `chargedBack` → Reintegros y `failed` → Cancelados); `newest`/`oldest`
  invierten; desempate por `id`; lista vacía; inmutabilidad del input.
- **Mirror this pattern:** `checkout-steps.ts` + `checkout-steps.test.ts` (modelo puro
  colocado, tests `test()` planos).
- **Depends on:** T1.
- **Acceptance:** `npm run test` verde con los casos listados.
- **Pitfalls:** comparar `createdAt` como `Date` (`getTime()`), no como string; no usar
  `Date.now()` en el modelo.

### T8 — Listado de pedidos: client component + restyle
- **Files:** `src/app/(storefront)/my-orders/page.tsx`,
  `src/app/(storefront)/my-orders/_components/my-orders-client.tsx` `[NEW]`
- **Symbols / signatures:** `MyOrdersClient({ orders }: { orders: OrderListOutput })` con
  `"use client"`; `useState` para `filter` (default `"all"`) y `sort` (default
  `"newest"`).
- **Change:**
  1. `page.tsx` queda RSC: `requireUser()` + `api.orders.listMine()` + `PageHeader` +
     `<MyOrdersClient orders={orders} />`; el empty state global "sin pedidos" puede
     quedar en el RSC (antes de montar el cliente). Agregar `md:px-6` al shell (hoy
     falta, L65).
  2. Chips de filtro: fila `flex flex-wrap gap-2` de `Button size="sm"
     className="rounded-full"` — activo `variant="default"`, inactivo `"secondary"` —
     con label + contador de `countOrdersByFilter` ("Todos (12)"). Toggle de orden a la
     derecha: `Button variant="ghost" size="sm"` con `ArrowUpDownIcon` alternando "Más
     recientes"/"Más antiguos".
  3. Cards restyleadas: mantener estructura actual (código, fecha, items/pago/monto,
     CTA), reemplazando el Badge genérico por el chip de `orderStatusChipConfigMap`
     (variant + icono con `data-icon="inline-start"`) y el `ShoppingBagIcon` del título
     por icon chip circular `bg-brand-soft` (patrón C). Pago con
     `paymentStatusLabelMap`.
  4. Empty del filtro (hay pedidos pero ninguno matchea): `Empty` chico neutro con CTA
     "Ver todos" que resetea el filtro. El empty global sin pedidos → patrón
     `brand-warm` + CTA highlight a `/products`.
- **Mirror this pattern:** grid actual de `page.tsx:93-141`; chips → no hay precedente de
  chips en el repo, mantenerse en primitivas `Button`.
- **Depends on:** T1, T2, T7.
- **Acceptance:** filtrar y ordenar funciona sin recargar; contadores correctos; con 0
  pedidos no se montan chips; `Date` llega bien al cliente (sin warning de
  serialización).
- **Pitfalls:** no llamar `api.orders.listMine` desde el cliente (queda server-fetch +
  props); los contadores se calculan sobre la lista completa, no la filtrada; keys de
  React por `order.id`.

### T9 — Adapter puro del recorrido del pedido
- **Files:** `src/features/tracking/customer-order-journey.ts` `[NEW]`,
  `src/features/tracking/customer-order-journey.test.ts` `[NEW]`,
  `src/shared/common/tracking-display.ts` (solo tildes)
- **Symbols / signatures:**
  ```ts
  export type CustomerOrderJourneyItemInput = {
    cartItemId: number;
    productName: string;
    quantityLabel: string;            // ya formateada por el caller
    timeline: UserOrderItemTimeline | undefined;
  };
  export type CustomerJourneyNoticeView = {
    label: string;                    // label del aviso, prefijado con productName en modo unificado con >1 item
    kind: UserTrackingNoticeKind;
    createdAt: string;
  };
  export type CustomerItemJourneyView = {
    cartItemId: number;
    productName: string;
    quantityLabel: string;
    stages: TrackingJourneyStepperStage[];   // warning siempre false; sin "skipped"
    notices: CustomerJourneyNoticeView[];
    cancelled: boolean;               // tiene aviso kind "cancelled"
    currentStageLabel: string | null;
  };
  export type CustomerOrderJourneyView =
    | { mode: "empty" }                                        // sin items con timeline
    | { mode: "unified"; stages: TrackingJourneyStepperStage[];
        notices: CustomerJourneyNoticeView[]; cancelled: boolean }
    | { mode: "perItem"; items: CustomerItemJourneyView[] };
  export function buildCustomerOrderJourneyView(items: CustomerOrderJourneyItemInput[]): CustomerOrderJourneyView;
  ```
- **Change (algoritmo):**
  1. Por item: mapear `timeline.stages` al view-model del stepper (`key`, `label`,
     `description`, `status` tal cual — el fold cliente nunca produce `skipped` —,
     `warning: false`, `timestamp: createdAt`); `cancelled` = existe notice kind
     `cancelled`; `currentStageLabel` = label de la etapa `current` (null si ninguna).
  2. Colapso: unificado ⟺ todos los items tienen el mismo índice de etapa `current`
     (incluido "ninguna": todas pending) Y el mismo valor de `cancelled`. Si no,
     `perItem`.
  3. En modo unificado: `stages` toma por etapa el `timestamp` más reciente entre los
     items (la evidencia más nueva); `notices` = concatenación de todos los avisos
     ordenados por `createdAt` asc, con `label` prefijado `"{productName}: "` solo cuando
     hay más de un item.
  4. Items sin timeline (`undefined`) cuentan como "todas pending" para el predicado de
     colapso.
  5. Tildes en `userTrackingStageDefinitions` (labels y descriptions de las 6 etapas:
     "Preparación", "Envío", "Entrega", etc.) — sin tocar keys ni ningún otro mapa del
     archivo.
- **Tests (mínimo):** un solo item → unificado; dos items misma etapa → unificado con
  timestamp máximo por etapa y avisos prefijados; dos items en etapas distintas →
  `perItem`; uno cancelado y otro activo → `perItem`; todos cancelados en la misma etapa
  → unificado con `cancelled: true`; items sin eventos → unificado todo pending; avisos
  ordenados por fecha; sin items → `empty`.
- **Mirror this pattern:** `checkout-steps.ts` (modelo puro colocado);
  `tracking-detail-dialog.tsx:189-208` para el mapeo al view-model del stepper.
- **Depends on:** — (T10 lo consume).
- **Acceptance:** `npm run test` verde; typecheck; el output valida estructuralmente
  contra `TrackingJourneyStepperStage`.
- **Pitfalls:** comparar etapas por índice en `userTrackingStageKeys`, no por label; no
  reordenar `stages` (vienen en orden canónico del server); ISO strings comparan bien
  lexicográficamente pero usar el mismo criterio en todo el módulo.

### T10 — Vista del recorrido + detalle del pedido restyleado
- **Files:** `src/features/tracking/customer-order-journey-view.tsx` `[NEW]`,
  `src/features/tracking/tracking-journey-stepper.tsx` (prop aditiva),
  `src/app/(storefront)/my-orders/[orderId]/page.tsx`,
  `src/features/tracking/customer-cart-item-timeline.tsx` (delete)
- **Symbols / signatures:**
  - `CustomerOrderJourney({ view }: { view: CustomerOrderJourneyView })` — presentacional.
  - `TrackingJourneyStepper`: agregar `ariaLabel?: string` con default `"Recorrido del
    item"` (cambio aditivo; el admin no pasa la prop).
- **Change:**
  1. `CustomerOrderJourney`: `mode: "unified"` → un solo
     `TrackingJourneyStepper ariaLabel="Recorrido del pedido"` en una Card/section
     "Seguimiento del pedido"; `mode: "perItem"` → por item un bloque con nombre del
     producto + cantidad + chip de etapa actual (`Badge variant="info"` con
     `currentStageLabel`) + su stepper; `mode: "empty"` → hint amigable ("El seguimiento
     comienza cuando se acredita el pago") en caja muted.
  2. Avisos: debajo del stepper, lista de `Badge`s (`destructive` para
     `exception`/`cancelled`, `warning` para `rollover`, `outline` para
     `resolved`/`quantity`) con icono + label + fecha corta — reemplaza los badges
     actuales del componente viejo, mismo criterio de tono.
  3. Cancelación: si `cancelled` (unificado o por item), `Alert variant="destructive"`
     compacto ("Este producto fue cancelado" / "Este pedido fue cancelado") encima del
     stepper congelado.
  4. `[orderId]/page.tsx`: reemplazar el render por-item de `CustomerCartItemTimeline`
     (L169-193) por un único `<CustomerOrderJourney view={...}/>` como sección
     "Seguimiento" arriba de la card "Productos" (la lista de productos queda solo
     comercial: nombre, cantidad, total). Construir el input del adapter con
     `getProductName`/`formatQuantity` ya presentes en la página. Restyle del resto:
     chip de estado del pedido con `orderStatusChipConfigMap`, chip de pago con
     `paymentStatusLabelMap`, icon chip `bg-brand-soft` para dirección (MapPin),
     `md:px-6` en el shell.
  5. Borrar `customer-cart-item-timeline.tsx`.
- **Mirror this pattern:** `JourneySection`/`OutcomeBanner` de
  `tracking-detail-dialog.tsx:153-208` (simplificados); patrones C del home.
- **Depends on:** T1, T9.
- **Acceptance:** pedido con items convergentes → un stepper; divergentes → uno por item
  con nombre y chip; item cancelado → banner + recorrido congelado; pedido con pago
  fallido → banner de estado + hint/stepper pending; `rg "CustomerCartItemTimeline"` sin
  hits; el modal admin sigue renderizando su stepper igual.
- **Pitfalls:** `TrackingJourneyStepper` es `"use client"` — embebido desde el RSC del
  detalle funciona porque las props son serializables; no pasar funciones. El default de
  `ariaLabel` debe quedar exactamente `"Recorrido del item"` para no alterar el admin.
  No tocar nada más del stepper (colores, layout, tooltips).

### T11 — Verificación integral
- **Files:** —
- **Change:** correr `npm run check:write`, `npm run typecheck`, `npm run test`,
  `npm run build`. Smoke manual (con `npm run db:seed` si hace falta data): (a) `/cart`
  items/vacío/anónimo + mini-cart; (b) `/checkout` flujo completo desktop y mobile,
  retorno MP en tres tonos; (c) `/my-orders` chips + orden + empty de filtro; (d)
  `/my-orders/[orderId]` convergente, divergente, cancelado y pago fallido; (e) admin:
  `/admin/tracking` → modal → stepper intacto; (f) home y `/products` sin regresión
  (PageHeader no los toca, pero `CartLineRow` sí toca mini-cart).
- **Depends on:** T1–T10.
- **Acceptance:** cuatro comandos verdes + smoke completo.
- **Pitfalls:** Biome con tabs; el build corre `prisma generate` (sin DB alcanza para
  build, no para el smoke).

## 9. Cross-cutting concerns

- **Data / schema / migration / backfill:** N/A — cero cambios de Prisma, tRPC o Zod;
  todo se deriva de payloads existentes.
- **Config / env / feature flags:** N/A.
- **Security / permissions:** sin cambios — `requireUser()`/`protectedProcedure` ya
  cubren my-orders; no se expone ningún dato nuevo.
- **Observability:** N/A.

## 10. Pitfalls & gotchas (global)

- Las rutas viven bajo el route group `(storefront)` — escapar paréntesis en comandos de
  shell y no mover archivos entre groups.
- `CartLineRow` tiene 4 consumidores (cart, mini-cart, order step, review step): el único
  cambio permitido es el placeholder de imagen.
- `TrackingJourneyStepper` tiene 2 consumidores tras este trabajo (modal admin + detalle
  cliente): solo la prop aditiva `ariaLabel`; cualquier otro cambio rompe el admin.
- `highlight` es acento de conversión, no de estado: nunca usarlo para estados
  (ahí van `success/warning/info/destructive`), y no usar `warning` como decoración
  (decisión del plan del home).
- El fold cliente (`toUserOrderItemTimeline`) marca `completed` las etapas anteriores a
  la actual aunque no tengan evento — no existe `skipped` del lado cliente y está bien
  así (el cliente no debe ver "sin evidencia"). No "corregirlo".
- Los labels de `userTrackingStageDefinitions` pasan por el schema como strings libres:
  cambiar tildes es seguro, cambiar `key`s no (romperían `z.enum(userTrackingStageKeys)`).
- `orders.listMine` devuelve `Date` reales (Zod `z.date()`); mantener el fetch en RSC y
  pasar por props — no duplicar el fetch con `useQuery` en el cliente.
- Los contadores de chips se calculan sobre la lista completa; el filtro nunca debe
  afectar los contadores ni el empty global.
- Copy nuevo: voseo rioplatense con tildes (como checkout/home); no imitar el estilo sin
  tildes del cart viejo ni de `tracking-display.ts` histórico.
- No hay precedente de "chips de filtro" en el repo — construirlos con `Button`
  existentes, no agregar dependencias ni nuevos primitives de ui/.

## 11. Testing & validation

- **Tests to add/update:**
  - `src/app/(storefront)/my-orders/_components/order-list-view.test.ts` `[NEW]` — los
    casos de T7.
  - `src/features/tracking/customer-order-journey.test.ts` `[NEW]` — los casos de T9.
- **Commands:** `npm run test`, `npm run check`, `npm run typecheck`, `npm run build`.
- **Manual checks / regression risks:** los 6 escenarios de T11; especial atención a: el
  modal de tracking admin (stepper compartido), el mini-cart (CartLineRow compartido), y
  el flujo de pago Mercado Pago (solo restyle, cero lógica).
- **Success criteria:** todo verde; el cliente entiende de un vistazo dónde está su
  pedido; un pedido con todos los items juntos muestra UN solo recorrido; los tres
  funnels usan la paleta nueva sin bandas tintadas.

## 12. Rollout, migration & rollback

N/A en sustancia: cambios de presentación + dos modelos puros nuevos, sin flags, sin
migraciones, sin cambios de API. Rollback = revert del merge. El único archivo compartido
con el admin que cambia (`tracking-journey-stepper.tsx`) recibe solo una prop opcional
con default idéntico al comportamiento actual.

## 13. Documentation updates

- `docs/plans/customer-funnel-order-tracking-redesign.md`: este plan.
- **CONTEXT.md:** agregado esta sesión — **Order journey** (Seguimiento del pedido).
- **ADRs:** None — decisiones de presentación reversibles; registradas en §2.

## 14. Risks & trade-offs

| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| La regla de colapso no coincide con la intuición del usuario en algún caso borde (avisos distintos con misma etapa) | El resumen podría ocultar una diferencia que el cliente quería ver | Media | Bajo | Los avisos se agregan siempre debajo (prefijados por producto); la regla vive en un predicado puro testeado, cambiarla es un diff mínimo |
| Restyle del CartLineRow o del mini-cart rompe checkout visualmente | Componente 4-veces compartido | Baja | Medio | Cambio limitado al placeholder; smoke de los 4 consumidores en T11 |
| El ámbar `highlight` en "Confirmar y pagar" se percibe como advertencia | Es el CTA más crítico del funnel | Baja | Medio | Precedente del home (highlight = conversión); revertir a `default` es un cambio de una palabra |
| Cliente con muchísimos pedidos nota lentitud del filtro client-side | Sin paginación | Baja | Bajo | Diferido explícito: paginación/filtros server-side; el modelo puro se conserva |
| Tildes en labels de etapas rompen algún assert | Strings compartidos vía schema | Baja | Bajo | `rg` de los literales viejos antes de cambiar; ajustar tests si aparecen |

## 15. Open questions

- **Blocking (resolve before execution):** ninguna.
- **Non-blocking (resolve during execution):**
  - ¿Contadores en los chips ("Todos (12)")? — **Default: sí** (ya calculados por
    `countOrdersByFilter`).
  - ¿El detalle del pedido usa `PageHeader` o conserva su header con back-link? —
    **Default: conserva el back-link** (semántica de subpágina), solo adopta chips y
    espaciados nuevos.
  - Timestamps del stepper unificado: ¿más reciente por etapa o del primer item? —
    **Default: más reciente** (la evidencia más nueva).
  - ¿El hint de pedido sin eventos menciona el pago? — **Default: sí** ("El seguimiento
    comienza cuando se acredita el pago") salvo para pedidos `completed` (no debería
    darse).
- **Optional refinements:**
  - URL sync de filtro/orden (`?estado=`, `?orden=`) para deep-links.
  - Chip de etapa actual en las cards del listado (requiere data adicional).
  - Migrar `products-client.tsx` al `PageHeader` compartido.
  - Warnings por etapa del lado cliente vía builder server parametrizado.

## 16. Definition of done

- [ ] Cart, checkout y my-orders usan `PageHeader` con eyebrow `highlight`; un solo `h1`
      por página.
- [ ] CTAs de conversión ("Ir a pagar" en cart y mini-cart, "Confirmar y pagar" en review
      y mobile bar) en `variant="highlight"`; "Continuar"/"Atrás" sin cambio.
- [ ] Empty states de cart y my-orders en patrón `brand-warm` + CTA highlight;
      placeholders de imagen del cart en `brand-soft`.
- [ ] Cart en voseo con tildes; `cart-item-row.tsx` eliminado.
- [ ] Tiles de Envío y Pago renderizan vía `SelectableTile` con diff visual nulo.
- [ ] `/my-orders` filtra con 5 chips agrupados (con contadores) y ordena con toggle,
      todo client-side; `chargedBack` muestra "Contracargo".
- [ ] `/my-orders/[orderId]` muestra un único stepper cuando todos los items comparten
      etapa y steppers por item cuando divergen; avisos debajo; cancelaciones con banner.
- [ ] `customer-cart-item-timeline.tsx` eliminado; cero colores crudos `emerald-*` en el
      repo storefront.
- [ ] El modal de tracking admin renderiza idéntico (solo default de `ariaLabel`).
- [ ] `order-list-view.test.ts` y `customer-order-journey.test.ts` verdes.
- [ ] `npm run check`, `npm run typecheck`, `npm run test`, `npm run build` verdes.

## 17. Instructions for the executing agent

- Fuente primaria: este plan. Leer antes de codear: `CONTEXT.md` (términos journey),
  `src/features/tracking/tracking-journey-stepper.tsx`,
  `src/features/tracking/customer-cart-item-timeline.tsx` (lo que se reemplaza),
  `src/app/(storefront)/my-orders/[orderId]/page.tsx`,
  `src/shared/common/tracking-display.ts` (bloque `userTracking*`),
  `src/features/admin/crud/tracking/tracking-detail-dialog.tsx:189-208` (template de
  mapeo), `src/app/(storefront)/checkout/_components/checkout-steps.ts` + test (patrón de
  modelo puro), y los headers actuales de `cart-client.tsx`/`checkout-client.tsx`.
- Decisiones cerradas (no re-decidir): acentos de conversión sin bandas tintadas;
  seguimiento en el detalle del pedido sin modales; colapso a recorrido único cuando
  todos los items comparten etapa; solo frontend sobre el payload actual de tracking;
  5 chips agrupados + toggle de orden en estado local; checkout-stepper intacto; sin
  extracción de la receta de círculos.
- No cambiar: nada de server (services/routers/schemas); `checkout-steps.ts`;
  `checkout-stepper.tsx`; stores y hooks del carrito; el stepper genérico salvo
  `ariaLabel`; páginas admin; home/products/navbar.
- Verificar contra el código antes de modificar: clases actuales de `CartLineImage`;
  atributos de accesibilidad de los tiles de checkout antes de extraer `SelectableTile`;
  que `OrderListItem` expone el tipo de status reutilizable desde `checkout.types.ts`;
  consumidores de `userTrackingStageDefinitions` antes de las tildes.
- Ejecutar fases en orden (2–5 son independientes entre sí; si conviene, 4 y 5 pueden
  adelantarse tras la 1); honrar dependencias de tareas.
- Implementar al nivel especificado; ante un gap no bloqueante, aplicar el default de
  §15 y dejar registro. No re-arquitecturar.
- Comentarios: código autoexplicativo; comentar solo rationale no obvio (p.ej. por qué
  el predicado de colapso compara índice de etapa y cancelación — un comentario breve en
  `buildCustomerOrderJourneyView` enlazando este plan está justificado; ídem el default
  de `ariaLabel` que protege al admin). Mantener JSDoc existente; limpiar comentarios
  obsoletos en archivos tocados, sin cleanups no relacionados.
