# Plan reducido: WP-B, cierre semanal y textos del home (#98, #99, #100, #104 y la línea de cierre de #107)

> **Estado:** implementado y mergeado en `main` (`c9ac7f9`); desplegado con `911bd55`. Evidencia de implementación en §13 y cierre operativo en la orquestación §13.
> Simple grill del 13/11/2026; Flavio contestó las 5 preguntas por el orquestador (eligió la opción recomendada en todas).
> **Origen:** `docs/plans/qa-open-tickets-2026-11-orchestration.md` (§2, §6 WP-B, §7, §8, §9) y `docs/plans/qa-open-tickets-2026-11-report.md` (filas #98, #99, #100, #104, #107).
> **Base:** `main` con **WP-A ya mergeado** (rama `wpa-quick-fixes`, plan `docs/plans/qa-2026-11-wpa-quick-fixes.md`). WP-A deja:
> - la marca "CoCo" en los textos (el wordmark "coco" queda en minúscula);
> - `HashSafeLink` (`src/components/hash-safe-link.tsx`) en el CTA del hero, el menú mobile, el menú de ayuda y el pie;
> - en `product-details-dialog.tsx`, el subtítulo genérico como `DialogDescription` **sr-only**;
> - `e2e/home-section-links.spec.ts` (nuevo), que hace clic en el CTA "Ver qué se puede comprar".
>
> Si al arrancar WP-A no está en `main`, frenar y avisar al orquestador.
> **Comparte archivos con:** WP-C (`product-details-dialog.tsx`, `tutorial-script.ts`) y WP-D (`home-content.ts`). El que llegue segundo rebasea sobre `main` (§8 de la orquestación).
> **Textos:** todos los marcados **(preliminar)** los redactamos nosotros porque el documento "CoCo · Tickets del recorrido" no está disponible. Son **preliminares, a revisar por Flavio en el re-test**.

## 1. Objetivo

- El cliente ve, en todas las pantallas de la tienda, cuánto falta para el próximo cierre semanal ("Cierre del pedido: faltan 4 días y 21 h").
- El home cuenta qué es CoCo, cuándo cierra y cuánto tarda, con el diagrama en "Cómo funciona", 4 pasos y un FAQ de 6 preguntas.
- La ficha del producto dice en qué cierre entra y cuándo llega.
- Día, hora y plazo de entrega se configuran en un solo lugar del admin, sin tocar código.

## 2. Alineación (decisiones de Flavio, 13/11)

| # | Tema | Decisión |
| --- | --- | --- |
| 1 | #98, alcance del cierre | **Solo informativo.** Nada de pedidos, pagos ni operaciones lee el cierre. El admin sigue lanzando la compra a mano desde Operaciones, después del cierre. |
| 2 | #98, configuración | Pantalla nueva **"Cierre semanal"** en el admin con día, hora y plazo de entrega ("7 a 10 días"). La edita **cualquier administrador** (`adminProcedure`) y cada cambio queda en `AuditLog`. Tabla singleton nueva; la migración la aplica Flavio. |
| 3 | #99, título | **"Comprar en grupo sale menos."** |
| 4 | #100 y #99, composición | El diagrama **baja a "Cómo funciona"**. El título nuevo **reemplaza al "coco" gigante** del hero como `h1`. #70 pasa a Re-test. |
| 5 | #98, ubicación del contador | **≥ 1024 px (`lg`):** en la barra, junto a "Ingresar". **< 1024 px:** en la franja de arriba, en lugar del texto fijo. |
| §2 | Entrega | El paso 4 de #100 y "¿Cómo recibo mi pedido?" se adaptan al flujo actual: la entrega se elige al confirmar el pedido (ADR 0011). |

## 3. Alcance

**Entra:**
- El modelo `WeeklyClosingSettings`, su migración, el servicio, el router y la pantalla del admin.
- Los helpers puros del cierre (`getNextClosing` y los formateadores).
- El provider y el contador cliente.
- La franja y la barra.
- El hero, "Cómo funciona", el FAQ y el subtítulo de la ficha.
- El tutorial, el glosario, el nav del admin, `docs/schema-reference.md`, `CONTEXT.md` (ya aplicado) y la nota en `home-community-redesign.md`.
- Los tests unitarios y e2e.

**No entra:**
- Cortar o mover pedidos según el cierre, o bloquear la tienda.
- Que la creación de operaciones lea el cierre.
- Avisos o notificaciones.
- #105 (entrega cuando el pedido está listo).
- Sacar la sección `#ofertas` (eso es WP-D, #101).
- La imagen 1:1 de la ficha (WP-C).
- Un contador en la barra simulada del tutorial (ver §5.8).

**No hay que romper:**
- El tutorial (ADR 0012: no lee datos ni hace requests).
- El drift test del glosario.
- El vocabulario: "pedido", nunca "carrito".
- El arreglo de #93 en los links con `#` que quedan.

## 4. Puntos de integración (hoy, sobre `main` + WP-A)

| Archivo | Hoy |
| --- | --- |
| `prisma/schema.prisma` | `HomeOfferSettings` (`:263-275`) es el único singleton de configuración. Se lee con `findUnique` en el home (`home.data.ts:134-143`) y con `upsert` en el admin (`home-offers.data.ts:81-92`). |
| `src/shared/common/date.helpers.ts:10` | `BUSINESS_TZ = "America/Argentina/Buenos_Aires"` y dayjs con `utc` y `timezone`. |
| `src/app/(storefront)/layout.tsx:11-17` | Lee la sesión, renderiza `AnnouncementBar` y `AppNavbar` y después `children`. |
| `src/components/announcement-bar.tsx:5-7` | Muestra `announcementMessage` (`home-content.ts:10-11`). |
| `src/components/app-navbar.tsx:43-77` | `div.ml-auto` con `HelpMenu`, `CartNavButton`, `UserMenu` o "Ingresar" y `MobileNavMenu`. |
| `src/features/home/_components/home-hero.tsx` | Eyebrow, `h1` "coco", "Compras comunitarias", CTA "Ver qué se puede comprar" (`HashSafeLink`, `#ofertas` o `/products`), "Mirá el catálogo sin registrarte" y `HomeSystemIllustration` a la derecha. Prop `hasOffers`. |
| `src/features/home/_components/how-it-works-section.tsx` | `SectionHeading` a la izquierda y `ol` con `howItWorksSteps` (5 strings) a la derecha. |
| `src/features/home/_components/home-system-illustration.tsx` | `<figure>` con el SVG (`<title>` accesible, ya con "CoCo") y una figcaption "CoCo junta los pedidos…". |
| `src/features/home/_components/faq-section.tsx` | Acordeón sobre `faqItems` (6, estáticos, `home-content.ts:46-76`). |
| `src/app/(storefront)/page.tsx` | Server component: `getSession` + `getHomeContent`. Pasa `hasOffers` al hero. |
| `src/app/(storefront)/products/_components/product-details-dialog.tsx` | Client. `DialogDescription` sr-only con "Información comercial vigente…". Solo lo monta `products-client.tsx`, bajo el layout de la tienda. |
| `src/features/tutorial/_components/scenes/home-scene.tsx` | `<HomeHero hasOffers={false} />` y `HowItWorksSection` dentro de `TutorialTargetSlot id="home-how-it-works"`. |
| `src/features/tutorial/tutorial-script.ts` (~`:115-121`) | El paso `howItWorks` dice "No somos una distribuidora…". |
| `src/server/services/checkout/checkout.data.ts:244-250` | Patrón para listar puntos de retiro activos (`activePickupPointWhere` de `admin/pickup-point.data.ts`). |
| `src/features/admin/shell/admin-nav.ts:76-111` | Grupo "Catálogo"; "Ofertas del home" en `:93-97`. |
| `src/features/admin/glossary/data/catalog.ts:303-312` | Entrada `entidad-configuracion-de-ofertas-del-home`: es el modelo a copiar. |

## 5. Pasos (en orden)

### 5.1 Modelo y migración

`prisma/schema.prisma`, junto a `HomeOfferSettings`:

```prisma
// Weekly closing shown to customers. Informative only: nothing in ordering or
// operations reads it. Singleton by convention (id = 1), like HomeOfferSettings.
model WeeklyClosingSettings {
  id              Int      @id @default(1)
  closingWeekday  Int      @default(3)  // 0 = domingo … 6 = sábado (Date#getDay convention)
  closingHour     Int      @default(12) // Argentina time (BUSINESS_TZ)
  closingMinute   Int      @default(0)
  deliveryDaysMin Int      @default(7)
  deliveryDaysMax Int      @default(10)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @default(now()) @updatedAt

  @@map("weekly_closing_settings")
}
```

- **Migración:** `prisma/migrations/20261113120000_weekly_closing_settings/migration.sql`.
  - Se genera con `prisma migrate dev --create-only` contra una base **local**.
  - Se le agrega a mano un CHECK, como `user_order_delivery_preference_check`:
    ```sql
    ALTER TABLE "weekly_closing_settings" ADD CONSTRAINT "weekly_closing_settings_values_check" CHECK (
      "closingWeekday" BETWEEN 0 AND 6 AND "closingHour" BETWEEN 0 AND 23 AND "closingMinute" BETWEEN 0 AND 59
      AND "deliveryDaysMin" BETWEEN 1 AND 60 AND "deliveryDaysMax" BETWEEN "deliveryDaysMin" AND 60
    );
    ```
  - **No inserta fila.** Sin fila, los lectores usan los defaults del código (miércoles 12:00, 7 a 10 días).
  - El timestamp va después de `20261113000000_qa_ticket_status_retest` (WP0).
- **La aplica Flavio** en la base compartida, antes del deploy del código. La base no tiene historial de Prisma (`pnpm db:migrate` falla con P3005), así que se aplica como script:
  `pnpm exec prisma db execute --file prisma/migrations/20261113120000_weekly_closing_settings/migration.sql`
  y se verifica con `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`, que debe dar vacío (ver `docs/README.md`).
- `docs/schema-reference.md`:
  - una fila en la tabla de modelos, junto a `HomeOfferSettings` (`:170`): "Weekly closing singleton · One row, `id = 1`; read with defaults when missing, written through an upsert; informative only";
  - una mención en la sección de singletons (`:699`).

### 5.2 Helpers puros del cierre

**Tipo compartido.** `src/shared/common/weekly-closing.ts` (nuevo, sin I/O, importable desde el cliente):

```ts
export type WeeklyClosingSchedule = {
  closingWeekday: number; // 0–6
  closingHour: number;
  closingMinute: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
};
export const DEFAULT_WEEKLY_CLOSING: WeeklyClosingSchedule = {
  closingWeekday: 3, closingHour: 12, closingMinute: 0, deliveryDaysMin: 7, deliveryDaysMax: 10,
};
```

El zod `weeklyClosingScheduleSchema` va en `src/schemas/weekly-closing.schemas.ts`, con los mismos rangos que el CHECK y un `refine` mínimo ≤ máximo con el mensaje "El máximo no puede ser menor que el mínimo".

**`getNextClosing(now: Date, schedule): Date`** va en `src/shared/common/date.helpers.ts`, como pide §6:

```ts
export function getNextClosing(now: Date, schedule: Pick<WeeklyClosingSchedule, "closingWeekday" | "closingHour" | "closingMinute">) {
  const local = dayjs(now).tz(BUSINESS_TZ);
  const daysAhead = (schedule.closingWeekday - local.day() + 7) % 7;
  const clock = `${pad2(schedule.closingHour)}:${pad2(schedule.closingMinute)}`;
  const at = (offsetDays: number) =>
    dayjs.tz(`${local.add(offsetDays, "day").format("YYYY-MM-DD")} ${clock}`, BUSINESS_TZ);
  const closing = at(daysAhead);
  return (closing.isAfter(now) ? closing : at(daysAhead + 7)).toDate();
}
```

The date of the closing day comes from the business calendar day (`local`), and the instant is built by parsing "YYYY-MM-DD HH:mm" in `BUSINESS_TZ`. Avoid chaining `.hour()` or `.minute()` onto a `.tz()` object: the dayjs timezone plugin has known offset bugs there.

- **Regla:** el instante exacto del cierre ya cuenta como cerrado. A las 12:00:00 en punto, el próximo cierre es el de la semana siguiente.
- **Nunca** usa getters locales del `Date` (`getDay`, `getHours`). Todo pasa por `BUSINESS_TZ`.
- Al construir con `dayjs.tz(fecha)` y no con `add(hours)`, no depende de que Argentina no tenga horario de verano.

**Formateadores**, en `src/shared/common/weekly-closing.ts`, todos puros y en castellano:

| Función | Ejemplo |
| --- | --- |
| `weekdayName(d)` / `weekdayPlural(d)` | "miércoles" / "miércoles"; "sábado" / "sábados"; "domingo" / "domingos" |
| `formatClosingClock(h, m)` | "12"; "18:30"; "9" |
| `formatClosingDate(date)` (en `BUSINESS_TZ`) | "miércoles 18/11 a las 12" · "sábado 21/11 a las 18:30" |
| `formatDeliveryLeadTime(s)` | "7 a 10 días"; si mínimo = máximo, "7 días" |
| `formatTimeUntilClosing(now, closing)` | ver abajo |
| `heroClosingLine(s)` | "Los pedidos cierran los miércoles al mediodía y llegan en 7 a 10 días." Solo a las 12:00 dice "al mediodía"; si no, "a las 18:30". Con mínimo = máximo, "llegan en 7 días". |
| `productClosingLine(now, s)` | "Entra en el cierre del miércoles 18/11 a las 12 · Llega en 7 a 10 días" |

**`formatTimeUntilClosing`** trabaja con los minutos enteros que faltan (`floor`) y devuelve solo la parte que va después de "Cierre del pedido: ":

| Falta | Texto |
| --- | --- |
| ≥ 24 h | "faltan 4 días y 21 h"; "falta 1 día y 3 h"; con 0 h, "faltan 2 días" o "falta 1 día" |
| 1 h a 24 h | "faltan 5 h 20 min"; con 0 min, "faltan 5 h"; "falta 1 h 5 min" |
| 1 min a 1 h | "faltan 40 min"; "falta 1 min" |
| < 1 min (o ≤ 0) | "falta menos de 1 min" |

El verbo va en singular cuando la primera cantidad es 1.

### 5.3 Lectura del lado del servidor

- `src/server/services/weekly-closing/weekly-closing.data.ts` (nuevo):
  - `findWeeklyClosingSettings(db)` hace un `findUnique({ where: { id: 1 } })` y devuelve `null` si no hay fila. **No escribe**: es una lectura pública.
- `src/server/services/weekly-closing/weekly-closing.service.ts` (nuevo, `import "server-only"`):
  - `getWeeklyClosingSchedule = cache(async () => …)`, con `cache` de React, para que el layout y la página compartan una sola query por request.
  - Devuelve la fila parseada con `weeklyClosingScheduleSchema` o `DEFAULT_WEEKLY_CLOSING`.
- `src/server/services/home/home.data.ts`:
  - `listFaqPickupPoints(db)` filtra con `activePickupPointWhere`, ordena por `name` y después `id`, y selecciona `name`, `line1`, `line2`, `city` y `hours`.

### 5.4 Admin: "Cierre semanal"

- **Schemas** (`src/schemas/admin/weekly-closing.schemas.ts`): salida = schedule + `updatedAt`. Entrada = `weeklyClosingScheduleSchema`.
- **Data** (`src/server/services/admin/weekly-closing.data.ts`): `upsertWeeklyClosingSettings(db, data = {})` sobre `id: 1`, igual que `upsertHomeOfferSettings`.
- **Servicio** (`src/server/services/admin/weekly-closing.service.ts`):
  - `getSettings(db)` hace el upsert y parsea.
  - `updateSettings(input, actor, db)` corre en una transacción: lee `before`, escribe `after` y llama a `writeAdminAuditLog` con `action: "weeklyClosingSettings.update"`, `entityType: "weeklyClosingSettings"` y `entityId: "1"`.
- **Router** (`src/server/api/routers/admin/weekly-closing.router.ts`):
  - `getSettings` y `updateSettings`, los dos con `adminProcedure` y `mapServiceError`.
  - Comentario: "Any admin edits it: it is storefront copy, not payment governance."
  - Se registra en `admin.router.ts` como `weeklyClosing`.
- **Página** (`src/app/admin/(catalog)/weekly-closing/page.tsx` con `metadata.title "Cierre semanal"`, y `_components/weekly-closing-client.tsx`). Sigue los patrones de `home-offers-client.tsx`: `CrudPageShell`, `Card`, `Field`, `toast`.

  ```
  Cierre semanal
  ┌───────────────────────────────────────────────────────────────┐
  │ Día del cierre     [ Miércoles      ▾ ]                       │
  │ Hora del cierre    [ 12:00 ]  Hora de Argentina               │
  │ Plazo de entrega   [ 7 ] a [ 10 ] días                        │
  │                                                               │
  │ Próximo cierre: miércoles 18/11 a las 12                      │
  │ Solo informa al cliente. Las compras se siguen lanzando a     │
  │ mano desde Operaciones, después del cierre.                   │
  │                                                   [ Guardar ] │
  └───────────────────────────────────────────────────────────────┘
  ```

  - Días: Select de lunes a domingo. Hora: `<Input type="time" step={60}>` ↔ `closingHour` y `closingMinute`.
  - "Próximo cierre" se recalcula en vivo con `getNextClosing(new Date(), form)` y `formatClosingDate`.
  - Los errores de validación se muestran en el campo.
  - Al guardar: toast "Cierre semanal guardado".
- **Nav** (`admin-nav.ts`, grupo "Catálogo"): ítem `{ title: "Cierre semanal", href: "/admin/weekly-closing", icon: CalendarClockIcon }` justo después de "Ofertas del home".
- **Glosario** (`src/features/admin/glossary/data/catalog.ts`), dos entradas:
  - `concepto-cierre-semanal` (concept): "Cierre semanal". Definición: "El día y la hora (de Argentina) en que, cada semana, se le dice al cliente que cierran los pedidos, junto con el plazo de entrega que se muestra desde ese cierre. Es solo informativo: ningún pedido ni operación lo lee, y la compra se sigue lanzando a mano." `href: "/admin/weekly-closing"`.
  - `entidad-cierre-semanal` (entity): "Configuración del cierre semanal". Definición: "La única fila que guarda el día, la hora y el plazo de entrega del cierre semanal. Si no existe, la tienda usa miércoles 12:00 y 7 a 10 días." `occurrences: [{ code: "WeeklyClosingSettings", db: "weekly_closing_settings" }]`, `href: "/admin/weekly-closing"`.

### 5.5 Provider y contador (cliente)

- `src/features/weekly-closing/weekly-closing-provider.tsx` (nuevo, `"use client"`):
  - Props: `{ schedule: WeeklyClosingSchedule; serverNowIso: string; children }`.
  - **Reloj compartido por minuto:**
    - El estado `now` arranca en `serverNowIso`, para que el primer render del cliente sea igual al del servidor y no haya mismatch de hidratación.
    - Al montar, calcula `skewMs = Date.parse(serverNowIso) - Date.now()` solo si `|skew| > 2 min`. Así un reloj del dispositivo mal puesto no mueve el contador.
    - Pone `now = new Date(Date.now() + skew)`.
    - Agenda un `setTimeout` al próximo cambio de minuto y después un `setInterval` de 60 s.
    - Recalcula también en `visibilitychange` cuando la pestaña vuelve a estar visible, porque los timers en segundo plano se frenan.
    - Limpia todo al desmontar.
  - Context: `{ schedule, now, nextClosing: getNextClosing(now, schedule) }`, memoizado por `now`.
  - `useWeeklyClosing()` devuelve el contexto o `null` si no hay provider. Los consumidores no renderizan nada con `null`.
- `src/features/weekly-closing/closing-countdown.tsx` (nuevo, client):

  ```tsx
  <p className={cn("whitespace-nowrap", className)}>
    Cierre del pedido:{" "}
    <time dateTime={nextClosing.toISOString()} title={formatClosingDate(nextClosing)}>
      {formatTimeUntilClosing(now, nextClosing)}
    </time>
  </p>
  ```

  - **Sin segundos y sin `aria-live`.** Un anuncio por minuto molestaría y el ticket pide que no se lea como presión de venta.
- **Layout** (`src/app/(storefront)/layout.tsx`):
  - `Promise.all([getSession(), getWeeklyClosingSchedule()])`.
  - Envuelve todo el `div[data-storefront]` (franja, barra, `children`, `CartSheet`, invitación) en `<WeeklyClosingProvider schedule={schedule} serverNowIso={new Date().toISOString()}>`.
- **Franja** (`announcement-bar.tsx`):

  ```tsx
  <div className="bg-brand-ink px-4 py-2 text-center text-brand-soft text-xs">
    <ClosingCountdown className="lg:hidden" />
    <span className="hidden lg:inline">{announcementMessage}</span>
  </div>
  ```

  - `announcementMessage = "Compras comunitarias en Ushuaia"`: sale "· Mirá el catálogo sin registrarte" (#99).
- **Barra** (`app-navbar.tsx`): primer hijo del `div.ml-auto`, antes de `HelpMenu`: `<ClosingCountdown className="hidden text-sm text-muted-foreground lg:block" />`.
  - Verificar a 1024 px, con sesión y sin sesión, que la barra no haga wrap. La búsqueda es `flex-1` y cede ancho.
  - Si a 1024 px no entra, subir el corte a `xl` y avisarlo en el registro de ejecución. No abreviar el texto.

Mockup a 1280 px y a 390 px, viernes 13/11 a las 15:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Compras comunitarias en Ushuaia                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ coco [Catálogo] [ buscar...      ]  Cierre del pedido: faltan 4 días y 21 h  ? 🛒 ⇥ │
└──────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────┐
│ Cierre del pedido: faltan 4 días y 21 h │
├────────────────────────────────────┤
│ coco                ?  🛒  ⇥  ☰    │
└────────────────────────────────────┘
```

### 5.6 Textos del home (`home-content.ts`)

`home-content.ts` deja de exportar arrays fijos para estos bloques y pasa a funciones puras:
- `announcementMessage` sigue siendo una constante.
- `getHowItWorksSteps(schedule): { title: string; body: string }[]`
- `getFaqItems(schedule, pickupPoints: FaqPickupPoint[]): { question; answer }[]`
- `heroCopy = { title, lead, cta, ctaNote }`. La línea de cierre sale de `heroClosingLine(schedule)`.

Los valores `{…}` salen del schedule. Con los defaults se leen así:

**Hero (#99):**
- `title`: "Comprar en grupo sale menos." (Flavio, 13/11).
- `lead`: "Juntamos pedidos de toda Ushuaia y compramos al por mayor. Elegís lo que necesitás; de comprarlo y traerlo nos encargamos nosotros." (texto del ticket; **preliminar**).
- Línea de cierre: "Los pedidos cierran los {miércoles} {al mediodía} y llegan en {7 a 10 días}." (**preliminar**).
- `cta`: "Ver el catálogo" → `/products`. `ctaNote`: "No hace falta registrarte para mirar".

**Leyenda del diagrama (#100):** "CoCo junta los pedidos de los vecinos, le compra al proveedor y reparte lo que llega." (texto del ticket; **preliminar**). Ya es la figcaption actual. El `<title>` del SVG no cambia.

**Cómo funciona, 4 pasos (#100) (preliminar):**
1. **Armás tu pedido.** Elegís del catálogo y sumás lo que necesitás. Tenés tiempo hasta el {miércoles a las 12}.
2. **Cerramos el {miércoles}.** Juntamos todos los pedidos y hacemos una sola compra al por mayor en Buenos Aires.
3. **Viaja a Ushuaia.** La mercadería tarda entre {7 y 10} días en llegar. En Mis pedidos ves en qué etapa está.
4. **Retirás o te lo enviamos.** Al confirmar el pedido elegís retirarlo en el punto de retiro o recibirlo en tu casa. (Adaptado al flujo actual, §2.)

Sale "No somos una distribuidora…". En el paso 3, con mínimo = máximo, dice "tarda {7} días".

**FAQ (#104), en este orden (preliminar):**
1. **¿Cuándo cierran los pedidos?** Todos los {miércoles a las 12}, hora de Argentina. Lo que confirmes y pagues hasta ese momento entra en la compra de esa semana; lo que llegue después, en la del {miércoles} siguiente. Arriba de la página ves cuánto falta para el próximo cierre.
2. **¿Cuánto tarda en llegar mi compra?** Entre {7 y 10} días desde el cierre. Hacemos una sola compra al por mayor en Buenos Aires y la mercadería viaja hasta Ushuaia: al ser una isla, el camión cruza a Chile, atraviesa el Estrecho de Magallanes en balsa, vuelve a entrar a la Argentina y cruza la cordillera. En Mis pedidos ves en qué etapa está.
3. **¿Cuándo pago mi pedido?** Al confirmarlo. Elegís cómo recibirlo y pagás con Mercado Pago o por transferencia bancaria. Si pagás por transferencia, te damos los datos al confirmar y tu pago queda registrado cuando revisamos el comprobante.
   - WP-F (#110) le suma el descuento por transferencia; no se toca acá.
4. **¿Dónde sigo mi pedido?** En Mis pedidos. Ahí ves cada pedido que pagaste y la etapa en la que está, desde el pago hasta la entrega. Si algo cambia, por ejemplo una demora o una cantidad distinta, también lo vas a ver ahí.
5. **¿Cómo recibo mi pedido?** Lo elegís al confirmar el pedido: te lo llevamos a la dirección que cargues o lo retirás en el punto de retiro, en su horario. Las dos opciones cuestan lo mismo.
   - **1 punto activo:** se agrega " El punto de retiro está en {line1}{, line2}, {city} ({hours})."
   - **2 o más:** " Los puntos de retiro son: {name}, {line1}, {city} ({hours}); {name}, …"
   - **0:** no se agrega nada.
6. **¿Por qué los precios son más bajos que en un comercio?** Porque juntamos los pedidos de muchos vecinos y hacemos una sola compra grande, directo al proveedor. Así conseguimos el precio mayorista, que comprando de a uno no se consigue, y esa diferencia se nota en lo que pagás.

Salen "¿Necesito una cuenta para ver productos?" y "¿Qué pasa después del pago?".

En `faq-section.tsx`, la descripción del `SectionHeading` pasa a: "Lo esencial sobre el cierre, el pago y la entrega de tu pedido." (**preliminar**).

### 5.7 Componentes del home

- **`home-hero.tsx`:** `HomeHero({ schedule }: { schedule: WeeklyClosingSchedule })`. Sale `hasOffers`.
  - Una sola columna: eyebrow "Ushuaia · Tierra del Fuego", `h1` con `heroCopy.title`, `p` con el lead, `p` con `heroClosingLine(schedule)`, botón `Link` a `/products` ("Ver el catálogo" + flecha) y `p` con `ctaNote` debajo.
  - Salen el `h1` "coco", "Compras comunitarias" e `HomeSystemIllustration`.
  - El `h1` mantiene la familia `font-heading font-extrabold`, con un tamaño acorde a una frase, por ejemplo `text-[clamp(40px,7vw,72px)] leading-tight`. El ancho del texto se limita con `max-w-3xl`.
  - El CTA no lleva `#`, así que puede ser `Link` directo. `HashSafeLink` también sirve.
- **`how-it-works-section.tsx`:** `HowItWorksSection({ schedule })`.
  - Columna izquierda: `SectionHeading` y `HomeSystemIllustration` debajo.
  - Columna derecha: `ol` con 4 `li`, cada uno con el número, un `<p><strong>{title}</strong> {body}</p>`, o el título en una línea y el cuerpo abajo.
  - En mobile el orden queda título → diagrama → pasos.
- **`faq-section.tsx`:** recibe `items` por props.
- **`src/app/(storefront)/page.tsx`:**
  - `Promise.all([getSession(), getHomeContent(), getWeeklyClosingSchedule(), listFaqPickupPoints()])`. Con `cache`, el schedule no repite la query del layout.
  - Pasa `schedule` a `HomeHero` y `HowItWorksSection`, e `items={getFaqItems(schedule, pickupPoints)}` a `FaqSection`.
  - Si `listFaqPickupPoints` vive en `home.data.ts`, exponerla por `home.service.ts`, que ya es `server-only`.

### 5.8 Ficha (#107, línea de cierre)

- En `product-details-dialog.tsx`, con `const closing = useWeeklyClosing();`:
  - `DialogDescription` deja de ser sr-only y muestra `productClosingLine(closing.now, closing.schedule)`: "Entra en el cierre del miércoles 18/11 a las 12 · Llega en 7 a 10 días".
  - Si `closing` es `null`, queda el texto sr-only actual. El diálogo siempre necesita una descripción.
- Clases: `text-muted-foreground text-sm`.
- Si WP-C ya está mergeado, rebasear sobre su versión del diálogo. Este paso toca solo el `DialogDescription`.

### 5.9 Tutorial (ADR 0012)

- **`tutorial-fixtures.ts`:**
  - `export const tutorialWeeklyClosing = weeklyClosingScheduleSchema.parse(DEFAULT_WEEKLY_CLOSING)`. Pasa por el zod real, como el resto de los fixtures.
  - Va en el fixture y no en datos reales, porque el tutorial no hace requests y todo en él "es de ejemplo".
- **`scenes/home-scene.tsx`:**
  - `<HomeHero schedule={tutorialWeeklyClosing} />`
  - `<HowItWorksSection schedule={tutorialWeeklyClosing} />` dentro del mismo `TutorialTargetSlot`.
  - El slot ahora incluye el diagrama: revisar que el spotlight no tape el popover en mobile.
- **`tutorial-script.ts`, paso `howItWorks`:**
  - title: "Comprás junto a otros vecinos" (queda);
  - body: "CoCo junta los pedidos de todos los vecinos y hace una sola compra al por mayor. Cerramos los miércoles y la mercadería llega en 7 a 10 días." (**preliminar**). Es texto fijo del guion, consistente con el fixture.
- `TutorialNavbar` y `TutorialModeBar` **no** muestran contador. La barra simulada es superficie de drift conocida (ADR 0012) y el tour no habla del cierre. Anotarlo en el registro de ejecución.
- No cambia la cantidad de pasos: los contadores "1 / 12" y "19 / 21" de `e2e/customer-tutorial.spec.ts` siguen igual. Correrlo igual.

### 5.10 Documentos

- `docs/plans/home-community-redesign.md`: agregar al final de la tabla de decisiones (cerca de `:27-28`) y junto a la enmienda de `:540-542`:
  > **Enmienda 2026-11-13 (WP-B, #98/#99):** se revierte "sin fecha de cierre". La franja muestra el contador del cierre semanal debajo de 1024 px y el texto "Compras comunitarias en Ushuaia" desde 1024 px; el hero, "Cómo funciona", el FAQ y la ficha citan el cierre y el plazo de `WeeklyClosingSettings`. El barrido de copy de T18 sigue vigente: los textos nuevos ("cierran los", "Cerramos el", "Entra en el cierre del") no lo violan. Ver `docs/plans/qa-2026-11-wpb-weekly-closing-home.md`.
- `CONTEXT.md`: ya tiene *Weekly closing* y *Delivery lead time*, agregados en el grill. No hay que tocarlo, salvo que cambie un nombre.
- `docs/schema-reference.md`: ver §5.1.

## 6. Casos de borde

| Caso | Comportamiento |
| --- | --- |
| Sin fila en `weekly_closing_settings` (base nueva, migración sin abrir el admin) | La tienda usa `DEFAULT_WEEKLY_CLOSING`. El admin, al abrir la pantalla, crea la fila por upsert. |
| Exactamente miércoles 12:00:00.000 ART | El próximo cierre es el miércoles siguiente. |
| Martes 23:30 ART (en UTC ya es miércoles) | Cierre del miércoles al mediodía, ese mismo día de Argentina. |
| Miércoles 21:30 ART (en UTC ya es jueves) | Cierre del miércoles siguiente. |
| Fin de año: miércoles 30/12/2026 13:00 ART | miércoles 06/01/2027 12:00. |
| Dispositivo en otra zona (Tokio, UTC) | Mismo texto. Los helpers no usan getters locales. |
| Reloj del dispositivo corrido más de 2 min | Se corrige con el offset contra la hora del servidor. |
| Pestaña en segundo plano | Recalcula al volver (`visibilitychange`). |
| El admin cambia el día con la página abierta | El cliente lo ve al recargar o al volver a renderizar el layout. Es aceptable porque el cierre es informativo. |
| Plazo mínimo = máximo | "7 días" en todos los textos. |
| Día con plural irregular | "los sábados", "los domingos"; de lunes a viernes no cambian. |
| Hora distinta de 12:00 | Hero "a las 18:30"; pasos y FAQ "a las 18:30"; ficha "a las 18:30". |
| Ningún punto de retiro activo | La respuesta 5 no menciona dirección. |
| Varios puntos de retiro activos | Se listan todos, ordenados por nombre. |
| Admin que no es superadmin | Puede ver y guardar "Cierre semanal". |
| Valores fuera de rango | El zod los rechaza con el mensaje en el campo y el CHECK de la base los rechaza como respaldo. |

## 7. Tests

**Unitarios (`pnpm test`):**
- `src/shared/common/date.helpers.test.ts`, `getNextClosing`, con instantes UTC explícitos según la convención del archivo:
  - viernes 13/11 18:00Z → `2026-11-18T15:00:00.000Z`;
  - miércoles 18/11 14:59Z → el mismo día 15:00Z;
  - 15:00:00.000Z en punto → `2026-11-25T15:00Z`;
  - 15:00:01Z → 25/11;
  - martes 17/11 23:30 ART (`2026-11-18T02:30Z`) → 18/11 15:00Z;
  - miércoles 18/11 21:30 ART (`2026-11-19T00:30Z`) → 25/11 15:00Z;
  - 30/12/2026 16:00Z → `2027-01-06T15:00Z`;
  - domingo 18:30 (`closingWeekday: 0`), desde viernes 13/11 18:00Z → `2026-11-15T21:30Z`.
  - El algoritmo de §5.2 ya se probó en un script descartable con estos 8 casos, con `TZ=UTC` y con `TZ=Asia/Tokyo`, y dio los mismos resultados.
  - Correr el archivo además con `TZ=UTC` y `TZ=Asia/Tokyo` (`TZ=Asia/Tokyo pnpm vitest run src/shared/common/date.helpers.test.ts`) y dejar la salida en el registro.
- `src/shared/common/weekly-closing.test.ts` (nuevo):
  - todas las filas de la tabla de `formatTimeUntilClosing`, incluidos los singulares, 0 h, 0 min, 30 s y 0;
  - `formatClosingDate` ("miércoles 18/11 a las 12", "sábado 21/11 a las 18:30");
  - `heroClosingLine` con los defaults (el texto exacto) y con sábado 18:30 y 7 = 7;
  - `productClosingLine`;
  - `weekdayPlural`;
  - `weeklyClosingScheduleSchema`: rechaza 7, 24 h, 60 min y mínimo > máximo.
- `src/features/home/home-content.test.ts` (se reescribe el bloque de FAQ y el de pasos):
  - `getHowItWorksSteps(DEFAULT)` tiene 4 pasos. El primero dice "hasta el miércoles a las 12". Ningún paso contiene "distribuidora". El cuarto habla de elegir al confirmar el pedido.
  - `getFaqItems(DEFAULT, [])` devuelve las 6 preguntas en el orden del ticket y "carrito" no aparece nunca (la guarda se mantiene).
  - La respuesta 5 con 0, 1 y 2 puntos.
  - "¿Necesito una cuenta…" y "¿Qué pasa después del pago?" no están.
  - `announcementMessage` no contiene "registr".
  - Los tests de WhatsApp quedan como están.
- Servicio del admin (`src/server/services/admin/weekly-closing.service.test.ts`, siguiendo los tests de servicios admin existentes, p. ej. `product.service.test.ts`): `updateSettings` escribe la fila y un `AuditLog` con before y after.
- Glosario: el drift test (`glossary.data.test.ts`) tiene que pasar con la entrada nueva y el ítem de nav.
- Tutorial: `tutorial-script.test.ts` y `tutorial-fixtures.test.ts`. Si alguno fija el texto del paso `howItWorks`, se actualiza.

**e2e (contra la base local, §9 de la orquestación):**
- `e2e/smoke.spec.ts`:
  - Test 1:
    - `h1` = "Comprar en grupo sale menos.";
    - `#como-funciona ol > li` = **4**;
    - el link "Ver el catálogo" con `href="/products"`;
    - "No hace falta registrarte para mirar" visible;
    - 6 botones en el FAQ y el primero dice "¿Cuándo cierran los pedidos?";
    - `#ofertas` sigue visible hasta WP-D.
  - Test 2:
    - el hero se busca con el `h1` nuevo y tiene 1 link, 0 botones y **0** `img`;
    - `#como-funciona` tiene el `img` con nombre `/CoCo junta los pedidos/` y la leyenda visible;
    - el resto del test (la banda del destacado) queda igual.
  - Test nuevo, contador:
    - viewport por defecto (1280): `page.getByRole("banner")` contiene `/^Cierre del pedido: falta/` y la franja muestra "Compras comunitarias en Ushuaia";
    - viewport 390 × 844: la franja muestra `/Cierre del pedido: falta/` y la barra no.
    - No fijar el número, porque depende de la hora.
- `e2e/home-section-links.spec.ts` (de WP-A): el CTA del hero ya no tiene `#`.
  - Reemplazar `heroCta` por el link del pie "Cómo funciona" (`/#como-funciona`, que usa `HashSafeLink`) y esperar un solo `#como-funciona` en la URL.
  - Sacar `skipWithoutOffers`: `#como-funciona` siempre existe.
  - En el test mobile, llegar desde `/products` por el menú → "Ofertas", hacer 3 clics en el link del pie y después el logo → `/`.
- `e2e/customer-tutorial.spec.ts`: correrlo sin cambios. Si algún selector buscaba el `h1` "coco" dentro de la escena del home, apuntarlo al `h1` nuevo.
- Opcional, si existe un spec del admin para catálogo: abrir `/admin/weekly-closing`, cambiar a jueves 18:00, guardar y ver "Próximo cierre: jueves …". Si no hay spec del admin con login, no se agrega.

**Comandos:** `pnpm typecheck`, `pnpm test`, `pnpm check` y `pnpm test:e2e e2e/smoke.spec.ts e2e/home-section-links.spec.ts e2e/customer-tutorial.spec.ts` contra la base local.

**Revisión:** `q-review-code` (dos ejes) y `q-review-comments`, por un revisor nuevo.

## 8. Supuestos

- WP-A está en `main`. WP-C puede estarlo o no; solo choca en el `DialogDescription`.
- Argentina sigue sin horario de verano. Igual, el helper construye la fecha en la zona y no suma horas.
- `0 = domingo` es la convención del `weekday` (igual que dayjs `.day()`). El admin muestra los días empezando por el lunes.
- El plazo se cuenta desde el cierre, y los textos dicen eso.
- Todos los textos marcados **(preliminar)** se aceptan para el re-test. Si Flavio los cambia, se cambian en `home-content.ts`, `weekly-closing.ts` y `tutorial-script.ts`, con sus tests.

## 9. Preguntas abiertas

Ninguna bloqueante. A revisar por Flavio en el re-test: los textos preliminares de §5.6, §5.8 y §5.9.

## 10. Aceptación

- [ ] La migración `weekly_closing_settings` existe, con CHECK y sin fila. `docs/schema-reference.md` está actualizado.
- [ ] `/admin/weekly-closing` muestra "Cierre semanal". Un admin que no es superadmin guarda día, hora y plazo, y queda un `AuditLog` `weeklyClosingSettings.update`.
- [ ] El ítem de nav y las 2 entradas del glosario están cargados y el drift test pasa.
- [ ] `getNextClosing` cubre los casos de §7 y pasa con `TZ=UTC` y con `TZ=Asia/Tokyo`.
- [ ] El contador se ve en todas las páginas de la tienda (no en `/tutorial` ni en el admin):
  - en la barra desde 1024 px y en la franja debajo de 1024 px;
  - con el texto de §5.2, sin segundos, actualizado por minuto;
  - sin warnings de hidratación en la consola.
- [ ] Hero:
  - `h1` "Comprar en grupo sale menos.", bajada y línea de cierre;
  - "Ver el catálogo" → `/products` y "No hace falta registrarte para mirar" debajo;
  - sin diagrama ni "coco" gigante.
- [ ] La franja ya no dice "Mirá el catálogo sin registrarte".
- [ ] "Cómo funciona": diagrama con la leyenda y 4 pasos. El paso 1 y el 2 usan el día y la hora configurados.
- [ ] FAQ: 6 preguntas en el orden del ticket y la dirección del punto de retiro activo en la respuesta 5.
- [ ] Ficha: "Entra en el cierre del {fecha} a las {hora} · Llega en {plazo}" visible bajo el título.
- [ ] Al cambiar en el admin el día a jueves y la hora a 18:00, después de recargar cambian el contador, la línea del hero, los pasos 1 y 2, la respuesta 1 del FAQ y la ficha.
- [ ] El tutorial muestra el hero y "Cómo funciona" nuevos con el fixture y no hace requests.
- [ ] `pnpm typecheck`, `pnpm test` y `pnpm check` en verde, y los e2e de §7 en verde contra la base local.
- [ ] Hay una nota de enmienda en `home-community-redesign.md`.

## 11. Estado de QA al terminar (lo aplica WP1 / `scripts/qa-ticket-triage.data.ts`)

**Precondiciones para el tester (no son código):**
- Flavio aplicó la migración `20261113120000_weekly_closing_settings` en la base compartida y desplegó.
- **El punto de retiro activo tiene datos de prueba** ("Coco Ushuaia · Calle Falsa 123 · Lunes a Viernes 10 a 19", `pickup_point.id = 1`). Flavio lo corrige en `/admin/pickup-points`, o lo desactiva, **antes** del re-test de #104. Si no, la respuesta "¿Cómo recibo mi pedido?" muestra "Calle Falsa 123".
- Una cuenta "Administrador" que no sea superadmin, para probar la pantalla "Cierre semanal".

**Transiciones (nota arriba, sin pisar la anterior):**

| Ticket | Estado | Nota |
| --- | --- | --- |
| #98 | Re-test | `[fecha · triage] Implementado en <commit>. Mirar: contador "Cierre del pedido: faltan …" en la barra (computadora) y en la franja (celular/tableta), sin segundos, en hora de Argentina; pantalla Admin › Catálogo › Cierre semanal (cambiar día/hora y ver que cambie todo). Es solo informativo: la compra se sigue lanzando a mano. Precondiciones: migración aplicada; cuenta Administrador.` |
| #99 | Re-test | `[fecha · triage] Implementado en <commit>. Mirar: título "Comprar en grupo sale menos.", bajada, línea de cierre, "Ver el catálogo" → /products y "No hace falta registrarte para mirar"; la franja ya no repite la frase. Textos preliminares, a revisar por Flavio.` |
| #100 | Re-test | `[fecha · triage] Implementado en <commit>. Mirar: diagrama con su leyenda en Cómo funciona y 4 pasos; el paso 4 se adaptó al flujo actual (la entrega se elige al confirmar el pedido). Textos preliminares.` |
| #104 | Re-test | `[fecha · triage] Implementado en <commit>. Mirar: 6 preguntas en el orden del ticket; "¿Cómo recibo mi pedido?" adaptada al flujo actual y con la dirección del punto de retiro activo. Respuestas preliminares, redactadas sin el documento del recorrido. Precondición: corregir el punto de retiro "Calle Falsa 123".` |
| #107 | Re-test **solo si WP-A y WP-C ya están en `main`**. Si no, Pendiente. | `[fecha · triage] Línea de cierre de la ficha implementada en <commit> ("Entra en el cierre del … · Llega en …"). <Si falta WP-C: falta la imagen 1:1 (WP-C).>` |
| #70 | Re-test | `[fecha · triage] La ilustración del sistema se movió del hero a "Cómo funciona" (#100) en <commit>. Mirar que se vea ahí y que el hero quede solo con texto y botón.` |

#71 y #75–#79 se cierran como superados por #100 y #104 en el triage del orquestador (§5 de la orquestación), no en este WP.

## 12. Definición de hecho

Se cumplen todos los ítems de §10. El registro de ejecución se agrega a este plan (commits, salida de validación y desvíos) y hay una fila en §13 de la orquestación. Las transiciones de §11 están en `scripts/qa-ticket-triage.data.ts`. La revisión está hecha y sus hallazgos corregidos o registrados.

## 13. Registro de ejecución (13/11/2026)

Rama `wpb-weekly-closing-home`. Arrancó sobre `main` `6d53286` (WP-A mergeado en `86f4f26`). Antes de cerrar se rebaseó sobre `7b97050`, que trae WP-C (`b04ebdc`), WP-G y WP0, sin conflictos. El plan coincidió con el código. Lo que cambió en `main` después del grill:
- **WP0 ya está en `main`.** Su migración es `20261113000000_qa_ticket_status_retest`, y la de WP-B (`20261113120000`) va después, como pedía §5.1.
- **WP-C se mergeó primero.** El diálogo de la ficha ya tenía su imagen, su precio y su botón. WP-B solo cambia el `DialogDescription`.

### 13.1. Commits

| Pasos | Commit | Qué se hizo |
| --- | --- | --- |
| 5.1, 5.2 | `e4e20b7` | Modelo `WeeklyClosingSettings` y migración `20261113120000_weekly_closing_settings`. La migración crea la tabla con el CHECK `weekly_closing_settings_values_check` y no inserta fila. Se generó con `prisma migrate diff --from-schema … --to-schema … --script`, sin conectarse a ninguna base, y el CHECK se agregó a mano. También entran `weeklyClosingScheduleSchema`, `getNextClosing` en `date.helpers.ts`, los formateadores en `src/shared/common/weekly-closing.ts` y sus tests. |
| 5.3, 5.4 | `1339f4c` | Lectura pública `findWeeklyClosingSettings` y `getWeeklyClosingSchedule` (`cache` de React). Del lado del admin: data, servicio con `AuditLog` `weeklyClosingSettings.update`, router `admin.weeklyClosing` con `adminProcedure` y la pantalla `/admin/weekly-closing`. Además, el ítem de nav "Cierre semanal", las 2 entradas del glosario, `listFaqPickupPoints` y el test del servicio. |
| — | `67cd3e1` | `scripts/purge-demo-data*` cuentan el modelo nuevo entre los que nunca se borran (ver §13.3). |
| 5.5 | `f1b1f9d` | `WeeklyClosingProvider`, `ClosingCountdown`, el layout de la tienda, la franja y la barra. |
| 5.6, 5.7, 5.9 | `9d0ea22` | `home-content.ts` pasa a funciones puras: `heroCopy`, `getHowItWorksSteps` y `getFaqItems`. También el hero, "Cómo funciona" con el diagrama, el FAQ por props, la home, la escena del tutorial con `tutorialWeeklyClosing`, el guion y sus tests. |
| 5.8 | `1b06a31` | Línea de cierre en el subtítulo de la ficha. |
| §7 e2e | `202c70b` | `smoke`, `home-section-links` y la aserción del subtítulo de `catalog-product-card`. |
| 5.1, 5.10 | `a3821c2` | `docs/schema-reference.md` y las dos enmiendas de `home-community-redesign.md`. |
| Revisión | `7730595` | Hallazgos de la revisión (§13.4). |
| e2e | `0cdbe33` | Reintento del clic en "Ayuda" en `customer-tutorial.spec.ts:58` (§13.3) y la fila del guion en `docs/plans/customer-tutorial.md`. |

### 13.2. Validación

| Comando | Resultado |
| --- | --- |
| `pnpm typecheck` | Sin errores. |
| `pnpm test` | 142 archivos pasan y 1 se saltea; 2084 tests pasan y 6 se saltean. |
| `pnpm check` | 898 archivos, sin cambios ni errores. |
| `TZ=UTC pnpm vitest run src/shared/common/date.helpers.test.ts src/shared/common/weekly-closing.test.ts` | 41/41. |
| `TZ=Asia/Tokyo pnpm vitest run …` (los mismos archivos) | 41/41. El revisor los corrió además con `TZ=America/Santiago`: también pasan. |
| Barrido de T18 (`grep -rniE "…cierra(n)? el|esta semana|garantizad"` sobre `src/features/home`, `src/components`, `src/features/weekly-closing` y `weekly-closing.ts`) | Vacío. |

**e2e contra la base local.** Se corrieron con el script con lock y `E2E_PREP` aplicando la migración de WP-B sobre el dump sembrado. Corrida final, con todo commiteado: **32/32**.

| Spec | Resultado |
| --- | --- |
| `smoke` | 16/16. Incluye el test nuevo del contador: barra a 1280 y franja a 390. |
| `home-section-links` | 3/3. Los tests se reescribieron sobre el link del pie "Cómo funciona". |
| `catalog-product-card` | 4/4. |
| `customer-tutorial` | 9/9 (ver `:58` en §13.3). |

**Revisión visual**, con un spec temporal de capturas que no se commiteó:
- **A 1024, 1100, 1280 y 390 px:** la barra mide 64 px, una sola fila, sin sesión. A 1024 entran el buscador (achicado), "Cierre del pedido: faltan 4 días y 23 h", ayuda, pedido e ingresar. **No hizo falta subir el corte a `xl`.**
- **Consola en `/`:** sin errores ni warnings de hidratación.
- **Ficha:** "Entra en el cierre del miércoles 18/11 a las 12 · Llega en 7 a 10 días".
- **Tutorial:** la escena del home hace 0 requests a `/api/trpc`.

**No se pudo mirar:**
- **La barra con sesión iniciada.** El avatar mide lo mismo que el ícono de ingresar (42 px).
- **La pantalla del admin.** No hay spec del admin con login, así que el e2e opcional de §7 no se agregó.
- **La respuesta 5 del FAQ con un punto de retiro.** La base sembrada no tiene puntos activos. Los tres casos (0, 1 y 2 puntos) están en `home-content.test.ts`.

### 13.3. Desvíos y decisiones

- **Migración para Flavio:** el §5.1 corregido dice que se aplica con `prisma db execute`, porque la base compartida no tiene historial (P3005), y que se verifica con `prisma migrate diff`. Corrección del orquestador.
- **Zod:** el objeto sin `refine` se exporta aparte (`weeklyClosingScheduleObjectSchema`). Así la salida del admin lo extiende con `updatedAt`, porque Zod 4 no permite `extend` sobre un esquema refinado. Los campos vacíos dan mensajes en castellano ("Completá la hora del cierre").
- **Formateadores extra**, además de los de §5.2:
  - `formatClosingTime` ("a las 12");
  - `formatClosingSlot` ("miércoles a las 12");
  - `formatDeliveryLeadTimeBetween` ("entre 7 y 10 días", o "7 días").

  Los usan los pasos y el FAQ.
- **`productClosingLine`:** recibe el `nextClosing` del contexto, no `now`, para que la ficha y el contador no puedan diferir.
- **Gramática:** 1:00 dice "a la 1". Medianoche dice "a las 0", porque la UI no lo prohíbe; se dejó así.
- **Contador:**
  - El reloj mide el desvío contra el servidor **una vez por documento**: un layout cacheado al volver atrás trae una hora vieja, y no por eso el reloj del dispositivo está mal.
  - Si falla la lectura de la tienda (tabla sin migrar o fila inválida), se usan los defaults y se loguea: la página no da 500.
- **Glosario:** los alias de `concepto-cierre-semanal` son el `_Avoid_` de `CONTEXT.md` ("Fecha límite", "Ventana de compra", "Deadline").
- **Scripts de datos:** `KEPT_MODELS` de `purge-demo-data.plan.ts` (y por herencia `RESET_PRESERVED_MODELS`) incluye `WeeklyClosingSettings`. El test de cobertura de modelos lo exigía y el plan no lo nombraba.
- **e2e `catalog-product-card`:** la aserción de WP-A "el subtítulo es sr-only" pasa a "el subtítulo visible es la línea de cierre".
- **`customer-tutorial.spec.ts:58`:**
  - **El síntoma:** en esta rama fallaba en cada corrida completa con el servidor en frío, 4 de 4. En `main` pasó 3 de 3. El clic en "Ayuda" se perdía porque `/products` se regenera por el hydration mismatch preexistente del sidebar de marcas.
  - **Lo que se descartó:** sacar el provider lo hizo pasar en una sola corrida. Sacar la actualización del reloj al montar dejó 1 de 4.
  - **La causa probable:** la tienda hidrata más tarde en frío, porque ahora carga dayjs con timezone en el cliente. No es un bug del contador.
  - **El arreglo:** el mismo reintento "clic antes de la hidratación" que usan `smoke` y `home-section-links`. Con eso, 3 de 3 en frío y la corrida final.
  - **Lo que queda pendiente:** el mismatch de `/products`, que es preexistente.
- **Tutorial:**
  - `TutorialNavbar` y `TutorialModeBar` no muestran contador (§5.9).
  - En el paso "Comprás junto a otros vecinos", el bloque destacado ahora incluye el diagrama y es más alto que la pantalla. El popover queda arriba y tapa el comienzo de la sección (el título en el celular, el paso 1 en la computadora). Sigue legible y usable, y el e2e "on a phone" pasa.
- **§13 de la orquestación y `scripts/qa-ticket-triage.data.ts`:** no se tocaron. Los carga el orquestador al mergear, como con WP-C. Las notas de QA están en §13.5.

### 13.4. Revisión

Revisor independiente, con `q-review-code` (dos ejes) y `q-review-comments`, sobre `main...wpb-weekly-closing-home`. **Sin bloqueantes.** Corregido en `7730595`:
- el desvío del reloj, que ahora se mide una vez por documento;
- los mensajes de Zod en inglés en los campos vacíos;
- el formulario del admin, que se re-sembraba en cada refetch al volver a la ventana y perdía lo que no estaba guardado; ahora solo se re-siembra con un `updatedAt` nuevo;
- el fallback de la lectura de la tienda;
- la ficha, que ahora usa `nextClosing`;
- `pad2` en un solo lugar;
- tres comentarios reescritos.

Queda registrado, sin cambio: "a las 0" a medianoche.

### 13.5. Estado de QA al terminar (las notas van arriba, sin borrar las anteriores)

Reemplazar `<commit>` por el merge de `wpb-weekly-closing-home` en `main`.

**Precondiciones para el tester:**
- **Migración.** Flavio aplicó `20261113120000_weekly_closing_settings` en la base compartida y desplegó:
  - aplicarla: `pnpm exec prisma db execute --file prisma/migrations/20261113120000_weekly_closing_settings/migration.sql`;
  - verificar: `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`, que debe dar vacío.

  Sin la migración, la tienda muestra los defaults: no se rompe.
- **Punto de retiro "Calle Falsa 123".** El único punto activo (`pickup_point.id = 1`, "Coco Ushuaia · Calle Falsa 123 · Lunes a Viernes 10 a 19") tiene datos de prueba. Flavio lo corrige en `/admin/pickup-points` o lo desactiva **antes** del re-test de #104. Si no, la respuesta "¿Cómo recibo mi pedido?" dice "El punto de retiro está en Calle Falsa 123, …".
- **Cuenta.** Hace falta una cuenta "Administrador" que no sea superadmin, para probar "Cierre semanal".

**Transiciones:**
- **#98 → Re-test.**
  > `[13/11/2026 · triage] Implementado en <commit>. Mirar: contador "Cierre del pedido: faltan …" en la barra (computadora) y en la franja (celular/tableta), sin segundos, en hora de Argentina; pantalla Admin › Catálogo › Cierre semanal (cambiar día/hora y ver que cambie todo). Es solo informativo: la compra se sigue lanzando a mano. Precondiciones: migración aplicada; cuenta Administrador.`
- **#99 → Re-test.**
  > `[13/11/2026 · triage] Implementado en <commit>. Mirar: título "Comprar en grupo sale menos.", bajada, línea de cierre, "Ver el catálogo" → /products y "No hace falta registrarte para mirar"; la franja ya no repite la frase. Textos preliminares, a revisar por Flavio.`
- **#100 → Re-test.**
  > `[13/11/2026 · triage] Implementado en <commit>. Mirar: diagrama con su leyenda en Cómo funciona y 4 pasos; el paso 4 se adaptó al flujo actual (la entrega se elige al confirmar el pedido). Textos preliminares.`
- **#104 → Re-test.**
  > `[13/11/2026 · triage] Implementado en <commit>. Mirar: 6 preguntas en el orden del ticket; "¿Cómo recibo mi pedido?" adaptada al flujo actual y con la dirección del punto de retiro activo. Respuestas preliminares, redactadas sin el documento del recorrido. Precondición: corregir el punto de retiro "Calle Falsa 123".`
- **#107 → Re-test.** WP-A y WP-C ya están en `main`, así que no queda nada pendiente.
  > `[13/11/2026 · triage] Línea de cierre de la ficha implementada en <commit> ("Entra en el cierre del … · Llega en …"). Con WP-A y WP-C ya en main, la ficha queda completa: re-testear entera.`
- **#70 → Re-test.**
  > `[13/11/2026 · triage] La ilustración del sistema se movió del hero a "Cómo funciona" (#100) en <commit>. Mirar que se vea ahí y que el hero quede solo con texto y botón.`

#71 y #75–#79 se cierran como superados por #100 y #104 en el triage del orquestador, no acá.

**Textos preliminares que revisa Flavio:**
- el hero (§5.6);
- los 4 pasos;
- las 6 respuestas del FAQ;
- la descripción del FAQ;
- la línea de la ficha;
- el paso `howItWorks` del tutorial.

Si cambian, se tocan `home-content.ts`, `weekly-closing.ts` y `tutorial-script.ts`, con sus tests.
