# Plan: home "variante D", página "Cómo funciona" y base visual compartida

> **Estado:** `Working`. Implementado el 20/11/2026 en la rama `home-variante-d` (desde `dev` en `346854f`, que trae `Eyebrow`), un commit por fase (`e2d93c2`…`00af1c3`). Falta: decidir P1/P2. Resultado en §16.
> **Tipo:** `implementation-plan` (escrito por `q-code-grill-feature`, modo standalone).
> **Origen:** pedido de Flavio del 20/11/2026 (`REQ-HOME-VARIANTE-D-20261120`) y el prototipo aprobado en `docs/prototypes/home-modernizacion/` (`variante-d.html`, `como-funciona.html`, `variante-d.css`, `shared.css`, `shared.js`).
> **Base:** `main` en `f3bf376`.
> **Planes anteriores que este enmienda:** `docs/plans/home-community-redesign.md` (estructura de la home) y `docs/plans/qa-2026-11-wpb-weekly-closing-home.md` (fila 4: el diagrama bajó a "Cómo funciona" y el hero quedó solo con texto y botón, QA #100 y #70).

## 1. Objetivo y resultado

Llevar a la home real el diseño de la variante D y dejar una base visual compartida para que el resto del storefront la adopte después.

Lo que el cliente ve al terminar:

1. **Hero:** el texto actual, con "sale menos." en naranja, un contador chico del próximo cierre y el recorrido Buenos Aires → Ushuaia en cinco paradas.
2. **Cómo funciona (home):** una sola línea de tiempo de cuatro pasos. Cada paso lleva arriba una escena del diagrama "muchos pedidos, una compra". Reemplaza al diagrama actual más las cuatro tarjetas. Un botón lleva a la página nueva.
3. **Destacado:** la banda muestra la foto a la izquierda y la compra a la derecha, sin la mitad vacía de hoy.
4. **Página nueva `/como-funciona`:** la idea, el calendario de un pedido día por día y el detalle de cada paso.
5. **Rótulos y títulos de sección** iguales en la home y en las páginas del storefront que ya usan `PageHeader`.

## 2. Alcance

### Entra

- Home: hero, "Cómo funciona", banda del destacado, encabezado de Destacados, FAQ y footer.
- Página `/como-funciona`.
- Base compartida: componente `Eyebrow`, `SectionHeading`, `PageHeader` con tono de storefront, un token de color y dos animaciones en `globals.css`.
- Tests unitarios y e2e de lo anterior. Enmiendas en los planes anteriores.

### No entra

- Restilo de catálogo, pedido, checkout, Mis pedidos, perfil, login y proveedores. Solo reciben el rótulo y el título nuevos a través de `PageHeader`.
- `src/components/ui/card.tsx`, `button.tsx` y `badge.tsx`. Los usa también el admin; no se tocan.
- La tarjeta compacta de producto y `ProductCardGrid` (WP-J, #117 y #118). No cambian.
- El admin. `PageHeader` conserva su aspecto actual por defecto.
- Datos, esquema, servicios y reglas de compra. No hay migraciones.

### Diferido

- **Estandarización del resto del storefront.** Es transversal. Conviene abrirla con `q-plan-design-system` (hoy `design_system_ref` es `null`) para fijar radios, bordes y sombras como contrato, y después un plan por página.
- Unificar radios y sombras de `ui/card.tsx` entre storefront y admin.
- La ilustración de trazo fino en el tutorial y en el seguimiento de pedidos.

## 3. Decisiones alineadas

| # | Tema | Decisión | Origen |
| --- | --- | --- | --- |
| D1 | Alcance | Home, página nueva y base compartida. El resto del storefront va en un plan siguiente. | Flavio, 20/11 |
| D2 | Hero | Lleva la ruta y el contador. **Revierte** la parte de QA #100 que dejó el hero "solo con texto y botón". | Flavio, 20/11 |
| D3 | Enlaces "Cómo funciona" | El menú móvil y el footer siguen bajando a `/#como-funciona`. A la página nueva se llega por el botón de la sección y por un enlace nuevo del footer. | Flavio, 20/11 |
| D4 | Contador | Recuadro menta con dígitos en tinta y un punto naranja. Menta y no naranja, para no competir con "Ver el catálogo". | Flavio, 20/11 (prototipo) |
| D5 | Diagrama de C + pasos de A | El diagrama se parte en cuatro escenas, una por paso, sobre la línea de tiempo. | Flavio, 20/11 (prototipo) |
| D6 | Calendario | Va solo en `/como-funciona`, no en la home. | Flavio, 20/11 |

### Opciones descartadas

- Hero solo con contador y la ruta en `/como-funciona`.
- Menú y footer apuntando a `/como-funciona`: obligaba a reescribir `e2e/home-section-links.spec.ts`.
- Un solo plan para todo el storefront: demasiado riesgo de regresiones en e2e.
- Estilo de la variante C (contorno grueso y sombra dura) y contador grande de la variante B.

### Valores por defecto que tomé (no bloquean; revisar al validar)

| Tema | Valor por defecto | Por qué |
| --- | --- | --- |
| Ruta en el hero | Lista `<ol>` con texto real e íconos `aria-hidden`, sin `role="img"`. | Es más accesible y mantiene verde la aserción de `e2e/smoke.spec.ts` que exige cero imágenes en el hero. |
| Leyenda de QA #100 | "CoCo junta los pedidos de los vecinos, le compra al proveedor y reparte lo que llega." queda visible debajo de las escenas. | Es texto pedido por el ticket. |
| Textos de los pasos en la home | Se conservan completos los de `getHowItWorksSteps`. El prototipo los acortó; la app no. | No cambiar copy aprobado en WP-B. |
| Calendario | Se calcula del `WeeklyClosingSchedule`. Nada de "miércoles" ni "7 a 10" fijos. | El cierre es configurable por el admin (`CONTEXT.md`, "Cierre semanal"). |
| Contador | Resolución de un minuto, sin `aria-live`. | Regla ya escrita en `closing-countdown.tsx`: un anuncio por minuto se lee como presión de venta. |
| Punto del contador y punto que recorre la ruta | Animados, apagados con `prefers-reduced-motion`. | Aprobados en el prototipo. Ver riesgo R3. |
| Enlace nuevo del footer | Texto "Paso a paso de un pedido", en la columna Información. | No puede contener "Cómo funciona". Ver trampa T1. |
| Textos nuevos de `/como-funciona` | Quedan marcados **preliminares**, como en WP-B. | Tres frases no salen del FAQ. Ver §9. |

## 4. Contexto actual

- **Home:** `src/app/(storefront)/page.tsx` arma `HomeHero`, `HowItWorksSection`, `HomeSpotlightBand`, `FeaturedSection`, `FaqSection` y `HomeFooter`, todos en `src/features/home/_components/`.
- **Copy:** `src/features/home/home-content.ts` (`heroCopy`, `getHowItWorksSteps`, `getFaqItems`, `footerColumns`, `homeNavLinks`), con tests en `home-content.test.ts` y `wholesale-wording.test.ts`.
- **Cierre semanal:** `WeeklyClosingProvider` (`src/features/weekly-closing/`) está montado en `src/app/(storefront)/layout.tsx` y da `now` y `nextClosing` con resolución de un minuto. `useWeeklyClosing()` devuelve `null` sin provider. Los formateadores están en `src/shared/common/weekly-closing.ts`.
- **Tutorial:** `src/features/tutorial/_components/scenes/home-scene.tsx` renderiza `HomeHero` y `HowItWorksSection` con `tutorialWeeklyClosing`, **sin** provider (ADR 0012).
- **Encabezados:** `SectionHeading` (home, rótulo con `Badge`) y `PageHeader` (`src/components/page-header.tsx`, rótulo naranja). `PageHeader` lo usan pedido, checkout, Mis pedidos, proveedores, dos escenas del tutorial y `crud-page-shell.tsx` del admin.
- **Destacado:** `HomeSpotlightBand` → `HomeFeatureCard size="hero"` → `HomeOfferCard` o `HomeComboCard`. `HomeOfferCard` también se usa en `src/features/admin/crud/product/product-preview-dialog.tsx`.
- **Tokens:** `src/styles/globals.css`. Tipografías del storefront: Bricolage Grotesque (`font-heading`) y Karla.
- **e2e que tocan la home:** `e2e/smoke.spec.ts`, `e2e/home-section-links.spec.ts`, `e2e/home-combo.spec.ts`, `e2e/home-offer-quantity.spec.ts`.
- **Vitest** corre en entorno `node`: no hay tests de render con DOM. La lógica nueva va en funciones puras.

## 5. Enfoque

1. Primero la base compartida, sin cambio visible fuera del rótulo.
2. Después la lógica pura con tests (copy, calendario).
3. Después las piezas visuales de la home, de arriba abajo.
4. Al final la página nueva, los e2e y la documentación.

Cada fase deja `pnpm typecheck`, `pnpm check` y `pnpm test` en verde y se puede commitear sola.

La referencia visual es el prototipo. Se traduce a Tailwind con los tokens existentes; no se copia su CSS.

| Prototipo | App |
| --- | --- |
| `--ink`, `--ink-fg` | `brand-ink`, `brand-ink-foreground` |
| `--soft`, `--soft-fg` | `brand-soft`, `brand-soft-foreground` |
| `--warm`, `--warm-fg` | `brand-warm`, `brand-warm-foreground` |
| `--highlight`, `--highlight-fg` | `highlight`, `highlight-foreground` |
| `--ink-2` | token nuevo `brand-ink-muted` (tarea 0.1) |
| `--r-card: 22px` | `rounded-3xl` |

## 6. Mapa de archivos

### Crear

| Archivo | Responsabilidad |
| --- | --- |
| `src/components/eyebrow.tsx` | Rótulo de sección: punto naranja y texto en mayúsculas. |
| `src/features/home/order-calendar.ts` | `getOrderCalendar(schedule)`: columnas y barras del calendario. Función pura. |
| `src/features/home/order-calendar.test.ts` | Tests de la anterior. |
| `src/features/home/how-it-works-detail.ts` | Copy de `/como-funciona`: `howItWorksIdea` y `getHowItWorksDetail(schedule)`. |
| `src/features/home/how-it-works-detail.test.ts` | Tests del copy. |
| `src/features/home/_components/route-diagram.tsx` | Recorrido de cinco paradas del hero. |
| `src/features/home/_components/flow-scene.tsx` | Las cuatro escenas SVG: `FlowScene({ step })`. |
| `src/features/home/_components/hero-closing-timer.tsx` | Contador chico del hero. Componente cliente. |
| `src/features/home/_components/order-calendar.tsx` | Dibuja el resultado de `getOrderCalendar`. |
| `src/app/(storefront)/como-funciona/page.tsx` | Página nueva. |
| `e2e/como-funciona.spec.ts` | e2e de la página nueva. |

### Modificar

| Archivo | Cambio |
| --- | --- |
| `src/styles/globals.css` | Token `--brand-ink-muted` (claro y oscuro) y animaciones `route-travel` y `closing-pulse`. |
| `src/components/page-header.tsx` | Prop `tone`. |
| `src/features/home/_components/section-heading.tsx` | `Eyebrow` en lugar de `Badge`; título más grande. |
| `src/features/home/home-content.ts` | `heroCopy.titleAccent`, `when` en cada paso, enlace nuevo del footer. |
| `src/features/home/home-content.test.ts` | Tests de lo anterior. |
| `src/features/home/_components/home-hero.tsx` | Rótulo, acento del título, contador y ruta. |
| `src/features/home/_components/how-it-works-section.tsx` | Línea de tiempo con escenas, leyenda y botón. |
| `src/features/home/_components/home-spotlight-band.tsx` | Composición horizontal. |
| `src/features/home/_components/home-offer-card.tsx` | Tamaño `hero` horizontal. |
| `src/features/home/_components/home-combo-card.tsx` | Tamaño `hero` horizontal. |
| `src/features/home/_components/faq-section.tsx` | Acordeón sin caja. |
| `src/features/home/_components/home-footer.tsx` | Títulos de columna con el estilo del rótulo. |
| Llamadas a `PageHeader` del storefront y del tutorial | `tone="storefront"`: `cart-page-view.tsx`, `checkout-client.tsx`, `my-orders/page.tsx`, `proveedores/page.tsx`, `checkout-scene.tsx`, `my-orders-scene.tsx`. |
| `e2e/smoke.spec.ts` | Aserciones de "Cómo funciona". |
| `docs/plans/home-community-redesign.md`, `docs/plans/qa-2026-11-wpb-weekly-closing-home.md` | Nota de enmienda. |

### Borrar

| Archivo | Motivo |
| --- | --- |
| `src/features/home/_components/home-system-illustration.tsx` | Lo reemplazan las escenas. Antes de borrar, confirmar con `grep` que solo lo importa `how-it-works-section.tsx`. |

## 7. Fases y tareas

### Fase 0: base compartida

**0.1 Token y animaciones** (`globals.css`)
- Agregar `--brand-ink-muted: oklch(0.32 0.045 215)` en `:root` y `oklch(0.26 0.04 215)` en `.dark`, y `--color-brand-ink-muted` en `@theme inline`.
- Agregar `@keyframes route-travel` (de `left: 10%` a `left: 90%`) y `@keyframes closing-pulse` (anillo que crece y se desvanece), y exponerlas como `--animate-route-travel` (10 s, lineal, infinita) y `--animate-closing-pulse` (2 s, infinita) en `@theme`.
- Dentro del `@media (prefers-reduced-motion: reduce)` existente, apagar las dos.
- *Criterio:* `pnpm build` compila y existen las clases `bg-brand-ink-muted`, `border-brand-ink-muted`, `animate-route-travel` y `animate-closing-pulse`.

**0.2 `Eyebrow`** (`src/components/eyebrow.tsx`)
- Firma: `Eyebrow({ children, className }: { children: ReactNode; className?: string })`. Renderiza un `<span>`.
- Estilo: `inline-flex items-center gap-2.5 font-bold text-xs uppercase tracking-[0.12em]`, con un punto `size-2 rounded-full bg-highlight` y anillo `ring-4 ring-highlight/25` antes del texto. El punto es `aria-hidden`.
- Hereda el color del texto del contenedor.

**0.3 `SectionHeading`**
- Reemplazar el `Badge` por `Eyebrow`. Quitar el import de `Badge`.
- `h2`: `font-heading font-bold text-[clamp(28px,4vw,44px)] leading-[1.08] tracking-tight text-balance`.
- La API no cambia.

**0.4 `PageHeader`**
- Agregar `tone?: "default" | "storefront"`, con `"default"` por defecto.
- Con `"default"` el marcado y las clases quedan **idénticos** a hoy. El admin no cambia.
- Con `"storefront"`: el rótulo usa `Eyebrow` y el `h1` pasa a `font-bold text-[clamp(28px,4vw,40px)] leading-tight tracking-tight`.
- Pasar `tone="storefront"` en las seis llamadas del mapa de archivos.
- Actualizar el comentario del componente: ya no dice que `SectionHeading` usa un Badge.
- *Criterio:* `/admin/products` se ve igual que antes; `/my-orders` muestra el rótulo con punto.

### Fase 1: contenido y lógica pura (con tests primero)

**1.1 `home-content.ts`**
- `heroCopy.titleAccent = "sale menos."`. `heroCopy.title` no cambia. Test: `heroCopy.title.endsWith(heroCopy.titleAccent)`.
- `HomeStep` pasa a `{ when: string; title: string; body: string }`. Valores de `when`:
  1. `Hasta el ${formatClosingSlot(schedule)}`
  2. `weekdayName(schedule.closingWeekday)` con mayúscula inicial (usar el `capitalize` que ya existe en el archivo)
  3. `formatDeliveryLeadTime(schedule)`
  4. `"Cuando llega"`
- `title` y `body` no cambian. Tests: los cuatro `when` con `DEFAULT_WEEKLY_CLOSING` y con un cierre movido, como el test existente de la línea 159.
- `footerColumns`, columna Información: agregar `{ label: "Paso a paso de un pedido", href: "/como-funciona" }`. Test: ninguna etiqueta nueva del footer contiene "cómo funciona" (ver T1).

**1.2 `order-calendar.ts`**

```ts
export type OrderCalendarBar = {
	kind: "order" | "closing" | "trip" | "window" | "arrival";
	/** Columnas 1-based, ambas inclusive. */
	from: number;
	to: number;
};
export type OrderCalendar = {
	/** Una entrada por columna: abreviatura del día y si es día de cierre. */
	days: { label: string; isClosingDay: boolean }[];
	rows: { step: 1 | 2 | 3 | 4; bars: OrderCalendarBar[] }[];
};
export function getOrderCalendar(schedule: WeeklyClosingSchedule): OrderCalendar;
```

- Columnas: los 6 días anteriores al cierre, el día de cierre (columna 7) y `deliveryDaysMax` días después. Total `7 + deliveryDaysMax`. El día `k` después del cierre es la columna `7 + k`.
- Abreviaturas: `["Do","Lu","Ma","Mi","Ju","Vi","Sá"]`, a partir de `closingWeekday`.
- Filas:
  1. `order` de 1 a 7.
  2. `closing` de 7 a 7.
  3. `trip` de 8 a `7 + deliveryDaysMin`. Si `deliveryDaysMax > deliveryDaysMin`, además `window` de `7 + deliveryDaysMin + 1` a `7 + deliveryDaysMax`.
  4. `arrival` de `7 + deliveryDaysMin` a `7 + deliveryDaysMax`.
- Tests: con `DEFAULT_WEEKLY_CLOSING` da 17 columnas, la primera "Ju", cierre en las columnas 7 y 14, `trip` 8–14, `window` 15–17 y `arrival` 14–17. Con `min === max` no hay `window`. Con otro día de cierre cambian las abreviaturas.
- Antes de escribirla, leer los límites de `weeklyClosingScheduleSchema`. Si admite un máximo que deja más de 24 columnas, ver T4.

**1.3 `how-it-works-detail.ts`**
- `howItWorksIdea: string[]`: los tres párrafos de "La idea" del prototipo.
- `getHowItWorksDetail(schedule): { when: string; title: string; paragraphs: string[] }[]`: cuatro entradas. `when` y `title` salen de `getHowItWorksSteps(schedule)`; no se duplican.
- Los párrafos son los de `como-funciona.html`, con el día, la hora y el plazo tomados de los formateadores (`weekdayPlural`, `formatClosingTime`, `formatDeliveryLeadTimeBetween`, `weekdayName`). Ningún "miércoles", "12" ni "7 y 10" escrito a mano.
- Tests: con un cierre movido no aparece "miércoles"; los textos pasan las mismas reglas de vocabulario que `wholesale-wording.test.ts` (leer ese test y sumar los textos nuevos a lo que revisa).

### Fase 2: hero

**2.1 `RouteDiagram`** (componente de servidor)
- `<figure>` con `<figcaption>`: "El viaje de tu pedido" a la izquierda y `${formatDeliveryLeadTime(schedule)} desde el cierre` a la derecha. Recibe `schedule`.
- `<ol>` con cinco `<li>`. Datos en una constante del archivo:

  | Parada | Bajada | Tramo siguiente |
  | --- | --- | --- |
  | Buenos Aires | Una sola compra al por mayor | ruta |
  | Cruce a Chile | El camión sale de la Argentina | ruta |
  | Estrecho de Magallanes | Cruza en balsa | agua |
  | Cordillera | Vuelve a entrar y la cruza | ruta |
  | Ushuaia | Retirás o te lo llevamos | — |

- Íconos: SVG en línea de 24 px, trazo 1.75, `aria-hidden`. Copiar los `path` de `variante-a.html`.
- Desde `md`: cinco columnas iguales, texto centrado. Línea punteada entre paradas; el tramo de agua es una onda. Un punto naranja recorre la línea con `animate-route-travel`. La última parada va con fondo `highlight`.
- Debajo de `md`: una columna, ícono a la izquierda, línea vertical y sin punto animado.
- Colores sobre `brand-ink`: texto `brand-ink-foreground`, bajadas e íconos `brand-soft`, borde superior `brand-ink-muted`.
- Las paradas salen de la respuesta "¿Cuánto tarda en llegar mi compra?" del FAQ. Ver §9.

**2.2 `HeroClosingTimer`** (`"use client"`)
- `const closing = useWeeklyClosing(); if (!closing) return null;`
- Calcula días, horas y minutos con la misma cuenta que `formatTimeUntilClosing` (minutos enteros, redondeo hacia abajo). Extraer de `weekly-closing.ts` un helper `splitTimeUntilClosing(now, closing): { days: number; hours: number; minutes: number }`, usarlo en `formatTimeUntilClosing` y cubrirlo con un test.
- Marcado: `<aside aria-label="Próximo cierre">` con el rótulo "Próximo cierre" y el punto (`animate-closing-pulse`); una línea `4 d 21 h 11 min` con los números en `font-heading font-extrabold text-3xl tabular-nums`; y `<time dateTime={nextClosing.toISOString()}>` con `formatClosingDate(nextClosing)`.
- Sin `aria-live`.
- Estilo: `rounded-2xl bg-brand-soft text-brand-soft-foreground px-5 py-4`, ancho mínimo de 250 px.

**2.3 `HomeHero`**
- Rótulo: `Eyebrow` con "Ushuaia · Tierra del Fuego" en `text-brand-soft`. Reemplaza la píldora.
- `h1`: el texto de `heroCopy.title`, con la parte `heroCopy.titleAccent` dentro de un `<span className="text-highlight">`. El nombre accesible sigue siendo "Comprar en grupo sale menos.". Tamaño `text-[clamp(42px,7.4vw,84px)] leading-[0.98]`.
- Bloque superior en grilla de dos columnas desde `md`: texto y botón a la izquierda; `HeroClosingTimer` a la derecha, alineado abajo. Debajo de `md`, el contador va después del botón.
- La nota "No hace falta registrarte para mirar" pasa al costado del botón.
- `RouteDiagram` debajo, separado por un borde superior.
- El botón sigue siendo un `Link` a `/products`.
- *Criterio:* en el hero hay un solo enlace, ningún botón y ningún elemento con `role="img"`.

### Fase 3: "Cómo funciona" en la home

**3.1 `FlowScene`**
- `FlowScene({ step }: { step: 1 | 2 | 3 | 4 })`: un `<svg viewBox="0 0 240 100" role="img" aria-label="…">`.
- Geometría y etiquetas: las del arreglo `scenes` de `docs/prototypes/home-modernizacion/shared.js`.
- Colores con clases de Tailwind sobre tokens (`stroke-brand-ink`, `fill-card`, `fill-highlight`, `fill-brand-soft`, `fill-brand-ink`). Ningún color literal.
- Cada SVG define su `<marker>` con un `id` único hecho con `useId()`.
- "coco" va en `font-heading`, igual que el logo.

**3.2 `HowItWorksSection`**
- Conserva `id="como-funciona"`, `scroll-mt-20`, el fondo `brand-warm` y el `SectionHeading` con su título actual.
- `<ol>` con cuatro `<li>`, hijos directos. Cada uno: `FlowScene`, fila con el número sobre la línea, `when`, `title` en un `<h3>` y `body`.
- Desde `lg`: cuatro columnas con una línea horizontal que une los números. Debajo: una columna, número a la izquierda y línea vertical.
- El último número va en `highlight`.
- Debajo del `<ol>`: la leyenda de QA #100 en un `<p>`, y el botón `variant="outline"` "Ver cómo funciona en detalle" con `Link` a `/como-funciona`.
- Borrar `home-system-illustration.tsx`.
- *Criterio:* `#como-funciona ol > li` sigue dando 4.

### Fase 4: destacado, FAQ y footer

**4.1 Banda del destacado**
- `HomeSpotlightBand`: se va la columna de texto suelta. El `Badge` "Destacado" y el texto de `bandTextByKind` pasan adentro de la composición, arriba del título.
- `HomeOfferCard` con `size="hero"`: dos columnas desde `md` (foto 1:1 a la izquierda con `rounded-3xl`; marca, título, texto y compra a la derecha). Sin `Card`, sin sombra y con fondo transparente sobre la banda. Debajo de `md`, una columna.
- `HomeComboCard` con `size="hero"`: la misma composición, con el mosaico a la izquierda.
- El tamaño `default` de las dos tarjetas no cambia.
- La sección conserva `aria-label="Destacado"`. Los nombres accesibles de los botones no cambian.
- Abrir `product-preview-dialog.tsx` y revisar qué tamaño usa. Si usa `hero`, comprobar que la vista previa del admin se vea bien en su ancho.

**4.2 FAQ**
- El `Accordion` pierde `rounded-3xl bg-card px-6`. Los ítems se separan con una línea sobre `brand-warm`.
- Pregunta en `font-heading font-semibold`.

**4.3 Footer**
- Títulos de columna: `font-bold text-xs uppercase tracking-[0.12em] text-brand-soft`.
- El enlace nuevo aparece solo porque sale de `footerColumns`.
- `Separator` con `bg-brand-ink-muted`.

### Fase 5: página `/como-funciona`

**5.1 `page.tsx`** (componente de servidor)
- `metadata`: título "Cómo funciona | CoCo" y una descripción de una oración.
- Lee `getWeeklyClosingSchedule()`.
- Secciones, de arriba abajo:
  1. **Cabecera** sobre `brand-ink`: miga "Inicio / Cómo funciona", `h1` "Una compra grande entre todos, paso a paso." y una bajada.
  2. **La idea:** `SectionHeading` (rótulo "La idea", título "Por qué comprar juntos sale menos.") y los párrafos de `howItWorksIdea`.
  3. **El calendario** sobre `brand-warm`, con `id="calendario"`: `SectionHeading` (rótulo "El calendario", título "Un pedido, día por día.") y `OrderCalendar`.
  4. **El detalle:** `<ol>` con las cuatro entradas de `getHowItWorksDetail`, cada una con su número, su `FlowScene` y sus párrafos.
  5. **Cierre** sobre `brand-ink`: enlace a `/#preguntas-frecuentes` con `HashSafeLink` y botón `variant="highlight"` "Ver el catálogo" a `/products`.
  6. `HomeFooter`.

**5.2 `OrderCalendar`** (componente de servidor; recibe el resultado de `getOrderCalendar` y los títulos de los pasos)
- Grilla CSS con `grid-template-columns: repeat(N, 1fr)`, con `N = days.length`.
- Fila de encabezado con las abreviaturas; el día de cierre lleva un punto naranja.
- Una fila por paso: título a la izquierda (arriba en el celular) y la pista con sus barras ubicadas con `grid-column: from / to + 1`.
- Barras: `order` menta con borde tinta; `closing` naranja; `trip` tinta; `window` rayado tinta; `arrival` con borde punteado.
- El conjunto lleva `role="img"` y un `aria-label` armado con el día de cierre y el plazo del `schedule`.
- Leyenda debajo con cierre, viaje y ventana de llegada.

### Fase 6: e2e, tutorial y documentación

**6.1 `e2e/smoke.spec.ts`**
- Reemplazar la aserción `howItWorks.getByRole("img", { name: /CoCo junta los pedidos/ })` por: hay cuatro imágenes en `#como-funciona` y la leyenda sigue visible con `getByText`.
- Las aserciones del hero no se tocan y tienen que seguir pasando.
- Agregar: en `#como-funciona`, el enlace "Ver cómo funciona en detalle" apunta a `/como-funciona`.

**6.2 `e2e/como-funciona.spec.ts`**
- La página responde OK y muestra el `h1`.
- El calendario existe (`#calendario` con `role="img"`).
- Hay cuatro pasos en el detalle.
- "Ver el catálogo" apunta a `/products`.
- En la home, el enlace del footer "Paso a paso de un pedido" lleva a `/como-funciona`.

**6.3 Tutorial**
- Abrir `/tutorial` y revisar la escena de la home: se ve la ruta, no se ve el contador (no hay provider) y el objetivo `home-how-it-works` sigue marcando la sección.
- Correr `e2e/customer-tutorial.spec.ts`. Los contadores de pasos no deberían cambiar.

**6.4 Documentación**
- `docs/plans/home-community-redesign.md`: nota "Enmienda 2026-11" con la estructura nueva y la referencia a este plan.
- `docs/plans/qa-2026-11-wpb-weekly-closing-home.md`, fila 4: nota de que el hero vuelve a llevar un diagrama (D2).
- `CONTEXT.md`: sin cambios. No hay términos nuevos de dominio.
- QA: ver §11, pregunta abierta P1.

## 8. Temas transversales

- **Accesibilidad:** un solo `h1` por página; orden `h1` → `h2` → `h3`; íconos decorativos con `aria-hidden`; escenas con `aria-label`; foco visible en el botón y los enlaces nuevos; contraste de texto sobre `brand-soft` y `brand-ink` revisado con los tokens.
- **Movimiento:** las dos animaciones se apagan con `prefers-reduced-motion`.
- **Modo oscuro:** todo usa tokens que ya tienen valor en `.dark`. El token nuevo trae los dos valores.
- **Hidratación:** el contador usa el `now` del provider, que en el primer render reusa el instante del servidor. No usar `Date.now()` en el render.
- **Rendimiento:** todo es de servidor salvo `HeroClosingTimer`. No hay dependencias nuevas.
- **SEO:** `metadata` en la página nueva.

## 9. Supuestos

- **Recorrido del camión.** Las cinco paradas salen del texto del FAQ. Si el recorrido real es otro, se corrige la constante de `route-diagram.tsx` y el FAQ juntos.
- **Tres frases nuevas, preliminares:**
  1. El párrafo sobre el proveedor mayorista de "La idea".
  2. "No hace falta registrarte para mirar; sí para confirmar."
  3. "Lo que llegue después del cierre no se pierde: entra en la compra del [día] siguiente."
- La home no tiene tests de render con DOM y este plan no los agrega.

## 10. Trampas

- **T1. Nombres de enlace en los e2e.** `e2e/home-section-links.spec.ts` busca en el footer `getByRole("link", { name: "Cómo funciona" })`. Playwright compara por subcadena y sin distinguir mayúsculas. Cualquier otro enlace del footer o del menú móvil que contenga "cómo funciona" rompe el test por modo estricto. Por eso el enlace nuevo dice "Paso a paso de un pedido".
- **T2. `PageHeader` y el admin.** El valor por defecto de `tone` conserva el aspecto actual. No cambiar el valor por defecto.
- **T3. Tutorial sin provider.** `HeroClosingTimer` tiene que devolver `null` cuando `useWeeklyClosing()` es `null`, igual que `ClosingCountdown`.
- **T4. Plazos largos.** Si el admin configura un máximo de entrega grande, el calendario tiene muchas columnas. Con más de 24, mostrar una abreviatura cada dos columnas en el celular.
- **T5. `id` duplicados en SVG.** Hay hasta ocho escenas por página. Los `marker` necesitan `id` únicos.
- **T6. `id="como-funciona"`.** Tiene que existir solo en la sección de la home. La página nueva no lo usa.
- **T7. Vista previa del admin.** `HomeOfferCard` se reusa ahí; el cambio del tamaño `hero` puede afectarla.
- **T8. Texto del `h1`.** El `<span>` del acento no puede cambiar el texto: los e2e buscan "Comprar en grupo sale menos.".

## 11. Riesgos y preguntas abiertas

| # | Riesgo | Mitigación |
| --- | --- | --- |
| R1 | Regresión en los e2e de la home. | Correr los cuatro specs de la home al cerrar las fases 2, 3 y 4. |
| R2 | El hero queda alto en el celular (texto, contador y cinco paradas). | Revisar a 390 px. Si el botón queda muy abajo, compactar las paradas en el celular. |
| R3 | El punto animado se lee como presión de venta, contra el criterio de `closing-countdown.tsx`. | Es solo visual, sin anuncios. Si en QA molesta, se deja fijo cambiando una clase. |
| R4 | `design_system_ref` es `null`: la base compartida se define acá sin un contrato de sistema de diseño. | El alcance es chico (un rótulo, un token, dos encabezados). La estandarización completa va por `q-plan-design-system`. |

**Preguntas abiertas (no bloquean el inicio):**

- **P1.** ¿Se agrega un caso de QA para la home nueva y `/como-funciona`, y se anotan #70 y #100 con la enmienda? Escribe en la base compartida de tickets (`pnpm qa:triage`), así que necesita tu visto bueno.
- **P2.** Validar las tres frases preliminares de §9 y el recorrido del camión.

## 12. Pruebas

| Qué | Comando |
| --- | --- |
| Unitarios | `pnpm test` |
| Tipos | `pnpm typecheck` |
| Lint y formato | `pnpm check` |
| Build | `pnpm build` |
| e2e de la home y la página | `pnpm test:e2e e2e/smoke.spec.ts e2e/home-section-links.spec.ts e2e/home-combo.spec.ts e2e/home-offer-quantity.spec.ts e2e/como-funciona.spec.ts e2e/customer-tutorial.spec.ts` |

Los e2e necesitan la base local con el seed de pruebas (`pnpm db:seed:test`).

Revisión manual, a 390 px y 1280 px: home, `/como-funciona`, `/my-orders`, `/cart`, `/proveedores`, `/tutorial` y `/admin/products`.

## 13. Despliegue y vuelta atrás

- Sin migraciones, sin cambios de datos y sin variables de entorno.
- Un commit por fase, en una rama propia.
- Vuelta atrás: revertir los commits. La fase 0 se puede dejar aunque se reviertan las demás.

## 14. Definición de terminado

- [x] La home muestra hero con contador y ruta, línea de tiempo con escenas, destacado horizontal, FAQ y footer nuevos.
- [x] `/como-funciona` existe, con idea, calendario calculado del cierre configurado, detalle y cierre.
- [x] Menú móvil y footer siguen bajando a `/#como-funciona`.
- [x] Con otro día de cierre o plazo en el admin, cambian la home, el calendario y los textos de la página (cubierto por tests unitarios; no probado cambiando el admin).
- [x] El admin conserva su escala de título; el rótulo con punto en el admin es intencional (`346854f`, enmienda a T2).
- [x] `pnpm test`, `pnpm typecheck`, `pnpm check` y `pnpm build` en verde para el código de la app (ver §16 sobre `docs/prototypes/`).
- [x] Los seis specs de §12 en verde: 35 de 35 sobre la base local con el seed de e2e (ver §16).
- [x] Revisión manual de §12 hecha en los dos anchos, incluidas `/my-orders` y `/admin/products` con sesión sobre la base local (ver §16).
- [x] Enmiendas escritas en los dos planes anteriores.
- [x] Revisión con `q-review-code` y `q-review-comments`.

## 15. Instrucciones para quien ejecute

1. Ejecutar con `q-code-implement`, en el orden de las fases.
2. Pedir autorización explícita antes de crear la rama, commitear o pushear. Este plan no autoriza ninguna operación de Git.
3. En las fases 1 y 2.2, escribir primero el test (`q-code-tdd`).
4. Abrir el prototipo en el navegador como referencia visual. No copiar su CSS ni importar nada de `docs/prototypes/`.
5. No tocar `ui/card.tsx`, `ui/button.tsx`, `ui/badge.tsx`, `ProductCardGrid` ni la tarjeta compacta.
6. No escribir en la base de tickets de QA sin el visto bueno de P1.
7. Si aparece la necesidad de un patrón reutilizable nuevo fuera de los de este plan, frenar y derivarlo a `q-plan-design-system`.
8. No llevar un diario de ejecución en este archivo.

## 16. Resultado de la ejecución (20/11/2026)

**Alcance entregado:** fases 0 a 6 en la rama `home-variante-d`, desde `dev` (`346854f`), con un commit por fase: `e2d93c2` (0), `e8bf886` (1), `a09de85` (2), `ffe5163` (3), `cacbf70` (4), `7a89e68` (5), `00af1c3` (6). Aparte: `f1245d6` excluye `docs/prototypes` de `tsconfig` y Biome, y `f2016c8` formatea los JSON de la validación de Mercado Pago.

**Desvíos y decisiones tomadas al ejecutar:**

- La bajada de Buenos Aires en la ruta dice "Una sola compra grande", no "al por mayor": `wholesale-wording.test.ts` prohíbe ese vocabulario en el hero, y es la frase ya aprobada de `heroCopy.lead`.
- `smoke.spec.ts`: la aserción del ancho de la tarjeta de la banda (≤ 401 px) ya no aplicaba porque el tamaño `hero` no lleva `Card`. Se reemplazó por "la foto queda a la izquierda del título" a 1280 px, y se cambió el título del test.
- Componente extra `step-number.tsx`: el número de paso que comparten la home y la página.
- El `h2` del cierre de `/como-funciona` reusa `heroClosingLine(schedule)`; el plan no fijaba ese texto.
- La leyenda y el `aria-label` del calendario son funciones puras de `how-it-works-detail.ts` (`getOrderCalendarLegend`, `orderCalendarLabel`), con tests.
- `how-it-works-detail.ts` entra en `ALLOWED_MATCHES` de `wholesale-wording.test.ts` con 4 apariciones, y un test nuevo limita el vocabulario a la explicación de la página.
- T4: con más de 24 columnas, el celular muestra una abreviatura cada dos, sin ocultar nunca los días de cierre.
- Contraste: el texto `muted-foreground` sobre la banda menta y sobre el FAQ, ahora sin tarjeta, quedaba por debajo de AA. Se redefine `--muted-foreground` solo dentro de esas dos secciones.
- T7 no aplica: `product-preview-dialog.tsx` usa el tamaño `default`.

**Pruebas:** `pnpm test` da 2355 OK. `pnpm typecheck` y `pnpm check`: 0 errores en el código de la app. `pnpm build` OK con `docs/prototypes/` apartado. e2e (los seis specs): 35 de 35 en verde sobre el Postgres local `coco-e2e-postgres` (puerto 5433), con el esquema al día (`prisma db push`) y `pnpm db:seed:test`, pasando `DATABASE_URL` y `APP_ENV=development` solo en esos comandos. El log del servidor muestra un error de hidratación previo en `/products` (`catalog-filters-sidebar.tsx`), ajeno a este cambio. Capturas a 390 y 1280 px sin scroll horizontal.

**Mini revisión:** `q-review-code` dio *pass with findings*: un bloqueante de contraste (corregido) y la falta de las enmiendas de 6.4 (escritas). `q-review-comments` dio *pass with findings*: 25 comentarios, 3 sugerencias aplicadas y ningún bloqueante.

**Bloqueos:**

- ~~El prototipo rompía `typecheck`, `check` y `build`~~: resuelto en `f1245d6`.
- ~~El tono `default` de `PageHeader` usa `Eyebrow` en el admin~~: es intencional, viene de `346854f` (Flavio). Enmienda a T2 y al criterio 0.4.
- `.env` apunta a una base remota de Neon con `APP_ENV=production`. La primera corrida de e2e y las capturas usaron esa base (solo flujos de invitado; el carrito vive en `localStorage`). Los e2e tienen que correr con `DATABASE_URL` apuntando al contenedor local y `APP_ENV=development`.

**Revisión con sesión (base local, usuarios del seed):** `/my-orders` muestra el rótulo con punto y el título de storefront, sin scroll horizontal a 390 ni a 1280 px. `/admin/products` muestra el rótulo y el título del admin. A 1280 px desborda 146 px, pero lo causa la tabla del CRUD y no `PageHeader` (ocultando la tabla el desborde desaparece); `crud-table.tsx` cambió por última vez en `346854f`, fuera de este plan. Las sesiones de prueba se borraron.

**Pendientes:** P1 y P2 de §11 (siguen abiertas). Fuera de alcance: el desborde de la tabla en `/admin/products` a 1280 px.
