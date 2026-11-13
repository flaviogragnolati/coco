# Plan: WP-D, combos y destacados (#101)

> **Estado:** Working. Feature grill del 13/11/2026. Flavio contestó las 6 preguntas por el orquestador. En la P1 y la P5 eligió distinto de lo recomendado; ver §2.
> **Origen:**
> - `docs/plans/qa-open-tickets-2026-11-orchestration.md`: §2, §6 WP-D, §7 y §8.
> - La fila #101 de `docs/plans/qa-open-tickets-2026-11-report.md`.
> - Los tickets #101 y #72; #101 supera a #72.
>
> **ADR:** `docs/adr/0014-combo-is-a-shortcut-not-a-priced-bundle.md` (nuevo).
> **Base:** `main` con **WP-A, WP-C y WP-G ya mergeados**.
> - WP-A deja el id `ofertas` y la marca "CoCo".
> - WP-C deja las tarjetas en 1:1, el botón "Sumar al pedido" sin monto y el destacado con `max-w-100`.
> - WP-G deja en el pedido `addItems`, `addItemsInTransaction`, `planCartAdditions`, `mergeCartItems`, la acción `addItems` del store y `describeRepeatOutcome`.
>
> Si al arrancar falta alguno de los tres en `main`, frenar y avisar al orquestador. Si WP-B ya entró, rebasear sobre él (§12).
> **Contenido:** no se siembra ningún combo real. Flavio los carga desde el admin cuando esto esté desplegado. El único combo que crea el código es un fixture de e2e en `prisma/seed.ts`, que nunca corre contra la base compartida.

## 1. Objetivo y resultado

**Lo que ve el cliente en el home:**
- La sección `#ofertas` pasa a llamarse **"Destacados"** y su título queda fijo: "Destacados de la semana".
- Salen los chips Todos / kg / unidad.
- La sección muestra, en el orden que eligió el admin, **combos y productos**. Si quedan lugares y el admin no lo apagó, el ranking de siempre los completa con productos.
- Cada combo es una tarjeta con:
  - un mosaico con las fotos de hasta 4 de sus productos;
  - el nombre y la descripción;
  - un selector **[1 persona] [2 personas]** cuando el combo tiene hermanos de grupo, o "Para 2 personas" cuando está solo y declara personas;
  - sus productos con la cantidad y el precio de hoy;
  - "Esta semana no está: …" cuando falta algún producto;
  - "Total hoy $ X";
  - el botón **"Sumar combo"**.
- "Sumar combo" agrega cada producto disponible como una línea más del pedido, sumando a lo que ya había, y abre "Tu pedido".
- La banda grande arriba de la sección pasa a decir **"Destacado"** y puede mostrar un producto o un combo.

**Lo que ve el admin:**
- Un ABM nuevo, **"Combos"**, con nombre, descripción, personas, grupo, activo y la lista de productos con sus cantidades.
- La pantalla "Ofertas del home" pasa a llamarse **"Destacados"** y tiene cuatro partes:
  - la banda: un producto o un combo;
  - la lista a mano de combos y productos;
  - el relleno con el ranking, que se puede apagar;
  - una vista previa calculada en el servidor.

**Lo que no cambia:** lo que se cobra. El combo no tiene precio, ni stock, ni línea propia (ADR 0014).

## 2. Decisiones (registro de alineación)

| Tema | Decisión | Fuente |
| --- | --- | --- |
| Entidad *Combo* con ABM. Destacados ortogonales, que pueden ser productos o combos. Una línea por producto a su precio vigente, editable. Salen los chips. Sin precio ni stock propios. | Ya decidido; no se volvió a preguntar. | §2 de la orquestación |
| Contenido de los combos | Lo carga Flavio desde el admin. El plan no siembra combos reales. | Flavio, 13/11 |
| **P1, modelo** | **No hay entidad "tamaño".** Un `Combo` es nombre, descripción (opcional), personas (número opcional) y su lista de `{producto, cantidad}`. | Flavio, 13/11 (respuesta libre; **no** fue la opción recomendada, que eran tamaños con nombre) |
| **P1, cómo se ve "personas"** | Los combos **del mismo grupo** se muestran en una sola tarjeta con el selector [1 persona][2 personas]. Un combo sin hermanos no muestra selector; si declara personas, la tarjeta dice "Para N personas". | Flavio, 13/11 ("Agrupar en la tarjeta") |
| **Criterio de agrupación** | **Un campo explícito "Grupo"** (`Combo.groupName`, texto opcional). Se compara sin distinguir mayúsculas y con los espacios normalizados. El admin elige un grupo existente o escribe uno nuevo en un combobox. **Regla:** dentro de un grupo, todos los combos no borrados tienen personas, y no hay dos con el mismo número. Se valida al guardar. | Grill, 13/11 (pedido del orquestador: que lo decida el plan) |
| Destacar un combo agrupado | **Se destaca el combo y arrastra a su grupo.** La lista guarda `comboId`. La tarjeta muestra todos los hermanos visibles, abierta en el combo destacado. Si dos hermanos están en la lista, gana el primero y el segundo no ocupa lugar. En el admin, el segundo aparece con "Se muestra en la tarjeta de {nombre}". | Grill, 13/11 |
| **P2, contenido de la sección** | Lista a mano de combos y productos, en el orden del admin. El ranking completa los lugares libres **solo con productos**, con una casilla "Completar con productos del ranking" para apagarlo. "Ofertas del home" pasa a "Destacados". El título de la sección queda fijo. | Flavio, 13/11 (recomendada) |
| **P3, imagen** | Mosaico automático con las fotos de hasta 4 productos **del combo elegido en el selector**. No se sube ninguna foto. | Flavio, 13/11 (recomendada) |
| **P4, producto no disponible** | Se muestra lo disponible con su total y "Esta semana no está: …". "Sumar combo" suma solo eso. El combo se oculta si no queda nada. El admin ve el aviso. Las cantidades se validan contra el mínimo y el paso al guardar. | Flavio, 13/11 (recomendada) |
| **P5, banda grande** | **Puede ser un producto o un combo.** El badge dice "Destacado" y el combo se ve en su tarjeta grande, con el selector si tiene hermanos. | Flavio, 13/11 (**no** fue la opción recomendada) |
| **P6, dónde se ven los combos** | Solo en el home, en Destacados o en la banda. En la lista de combos del admin, los activos que no se ven en ningún lado llevan la marca "No se ve en el home". | Flavio, 13/11 (recomendada) |
| Banda sin elección | Si el admin no eligió nada y el relleno está prendido, va el primero del ranking **entre los productos que no están en la lista**. Con el relleno apagado y sin elección, no hay banda. | Grill, 13/11 |
| Lo que ya está en el pedido | **Se suma**, con la misma regla que WP-G (`planCartAdditions`). Sumar dos veces el mismo combo lo duplica. | Grill, sobre la decisión de WP-G (P2) y el texto del ticket ("los productos se suman al pedido") |
| Reuso del pedido | `cart.addCombo({ comboId })`. El servidor lee los productos del combo y llama a `addItems` de WP-G. Para invitados, la acción `addItems` del store con los `CartItem` de la tarjeta. | Orquestador, 13/11 |
| `Product.homeOfferRank` | **Se mantiene, deprecado**, y nada lo lee. La migración copia los fijados a `home_featured_item`. La columna se borra en una migración posterior (§3, diferido). | Grill: la migración se aplica **antes** del deploy (§9 de la orquestación), así que borrar la columna rompería el código que está corriendo. |
| Ruta del admin | Se queda en `/admin/home-offers`; solo cambian los textos. El router `admin.homeOffers` conserva el nombre. | Grill: evita romper enlaces y reduce el diff |
| Vista previa del admin | Se calcula en el servidor con la misma función que arma el home (`admin.homeOffers.preview`). Se borra el cálculo del cliente (`home-offers-preview.ts`). | Grill: una sola fuente de verdad |
| Términos del glosario | *Featured offer* pasa a *Featured item* ("Destacado") y entra *Combo group* ("Grupo"). Los **slugs** del glosario no cambian, porque las propuestas de cambio los referencian. | Grill, 13/11 (cambio de terminología que dura) |

**Opciones rechazadas:**
- P1: tamaños con nombre, dos columnas fijas y "×2" automático.
- Agrupar por nombre exacto (frágil).
- Vincular a un "combo base", porque obliga a manejar cadenas y huérfanos.
- P2: solo lista a mano.
- P3: foto propia y sin imagen.
- P4: ocultar ante cualquier faltante, o avisar recién al sumar.
- P5: banda solo de productos.
- P6: fila de combos en `/products` y "Está en el Combo…" en la ficha.
- Combo con precio o descuento, y líneas del pedido etiquetadas con el combo (ADR 0014).

## 3. Alcance

**Entra:**
- El modelo `Combo`, `ComboItem` y `HomeFeaturedItem`, las columnas nuevas de `HomeOfferSettings` y la migración con la copia de los fijados.
- El ABM `/admin/combos`.
- La pantalla "Destacados" (`/admin/home-offers`) con banda, lista, relleno y vista previa.
- El armado del home (`home-featured.ts`), la sección "Destacados", la tarjeta de combo y la banda "Destacado".
- `cart.addCombo` y `addCombo` en `useCartActions`.
- `scripts/reset-initial-catalog*` y `scripts/purge-demo-data*`, que tienen que clasificar los modelos nuevos.
- El fixture de e2e en `prisma/seed.ts`.
- Companions:
  - `CONTEXT.md` (ya aplicado);
  - el ADR 0014 (ya escrito);
  - el glosario y la navegación del admin;
  - `docs/schema-reference.md`;
  - el e2e;
  - el estado de QA.

**No entra:**
- Precio, descuento o stock del combo (ADR 0014).
- Combos en `/products`, en la ficha o en el tutorial.
- Línea de pedido agrupada por combo.
- Reportes de ventas por combo.
- Foto propia del combo.
- Cambios a `calculateLineTotal`, al checkout o a "Mis pedidos".
- El texto de WP-B en el hero, la franja y las preguntas frecuentes.

**Diferido:**
- Migración de contracción: `DROP COLUMN "homeOfferRank"` y su índice en `product`. Va después de una pasada de QA con WP-D desplegado. Hay que anotarla en §13 de la orquestación.

**No hay que romper:**
- `ensureCartMutable` sigue siendo la única puerta para modificar el pedido. `cart.addCombo` pasa por `addItemsInTransaction`.
- La regla de un pedido vivo por carrito y la idempotencia de `confirmAndPay`.
- La tarjeta de producto del home (`HomeOfferCard`) y la vista previa "Home" del admin de productos (`product-preview-dialog.tsx`), que la reusa.
- El tutorial (ADR 0012). `home-scene.tsx` no monta la sección y no cambia.
- El drift test del glosario, los tests de navegación del admin y los tests de clasificación de modelos de `purge-demo-data.plan.test.ts` y `reset-initial-catalog.plan.test.ts`.
- `qa:seed`, que no toca nada de esto.

## 4. Contexto actual (lo que hay hoy)

| Archivo | Hoy |
| --- | --- |
| `prisma/schema.prisma:225,240` | `Product.homeOfferRank Int?` con índice: la posición fijada en la grilla. |
| `prisma/schema.prisma:263-281` | `HomeOfferSettings`, singleton `id = 1`: `spotlightProductId`, `criterion` y `offersLimit` (4 por defecto). Enum `HomeOffersCriterion`. |
| `src/server/services/home/home-ranking.ts` | `rankHomeOffers` (fijados primero, después el criterio), `compareRankedOffers` (también lo usa el admin), `composeHomeContent` (banda + pool de 24) y `HOME_OFFERS_POOL_SIZE`. |
| `src/server/services/home/home.data.ts` | `listCurrentHomeOffers` (términos vigentes de productos activos, sin `take`), `countPaidOrdersByProduct` y `getHomeOfferCuration` (sin fila, defaults). |
| `src/server/services/home/home.service.ts` | `getHomeContent()` → `homeContentOutputSchema` (`spotlight`, `offers`, `offersLimit`, `offersCriterion`). |
| `src/schemas/home.schemas.ts` | `homeOfferSchema` (lo reusa la tarjeta) y `homeContentOutputSchema`. |
| `src/features/home/_components/offers-section.tsx` | `id="ofertas"`, eyebrow "Ofertas", título según el criterio (`:20-24`), `HomeOffersGrid` y el estado vacío. |
| `src/features/home/_components/home-offers-grid.tsx` + `home-offers-filter.ts` (+ test) | Los chips Todos / kg / unidad (`:40-56`) y el recorte a `visibleCount`. |
| `src/features/home/_components/home-spotlight-band.tsx` | `aria-label` y badge "Producto destacado", y un `HomeOfferCard` en tamaño hero. |
| `src/app/(storefront)/page.tsx` | `getHomeContent()`, `HomeSpotlightBand` y `OffersSection`. |
| `src/app/admin/(catalog)/home-offers/*` | "Ofertas del home": banda (`:362`), criterio (`:390`), cantidad (`:415`), "Ofertas fijadas" con ↑ ↓ y desfijar (`:449`), "Completa el ranking" (`:573`) y la vista previa en el cliente (`home-offers-preview.ts`). |
| `src/server/services/admin/home-offers.{data,service}.ts`, `routers/admin/home-offers.router.ts`, `schemas/admin/home-offers.schemas.ts`, `shared/common/admin-crud/home-offers.types.ts` | `getSettings`, `listCandidates`, `updateSettings`, `setSpotlight` y `setPinnedRank` (el ranking por producto). |
| Patrón de ABM | `category.router.ts`, `category.service.ts` (+ test), `category.data.ts`, `schemas/admin/category.schemas.ts`, `admin-crud/category.types.ts`, `features/admin/crud/category/{category-form-dialog,category-table,category.mappers}.tsx`, `app/admin/(catalog)/categories/{page.tsx,_components/category-crud-client.tsx}`. |
| Pedido (después de WP-G) | `cart.service.ts`: `addItemsInTransaction(tx, userId, items: CartAddItemRequest[], now)`, `addItems(userId, items)` → `CartAddItemsOutput { cart, lines }`, `CartAddItemRequest = { productId, quantity, name? }`. `cart-store.ts`: `addItems(items: CartItem[])` aditiva (`mergeCartItems`). `features/cart/repeat-order.messages.ts`: `describeRepeatOutcome(lines)`. |
| Scripts | `scripts/lib/reset-initial-catalog.ts:242-290` guarda y restaura `homeOfferRank` y el spotlight por nombre de producto. `scripts/purge-demo-data{,.plan}.ts` lee `homeOfferRank`, `KEPT_MODELS` y `CATALOG_DELETE_ORDER`. Sus tests exigen que **cada modelo** esté clasificado. |
| Glosario y navegación | `glossary/data/catalog.ts:21-56` (conceptos) y `:304-312` (entidad de configuración). `shell/admin-nav.ts:95` ("Ofertas del home", `SparklesIcon`). |
| e2e | `e2e/smoke.spec.ts:17` (`#ofertas`) y `:31-61` (banda `region` "Producto destacado"). `e2e/home-offer-quantity.spec.ts` usa `#ofertas [data-slot='card']`. |

## 5. Enfoque

### 5.1. Modelo

```prisma
model Combo {
  id          Int      @id @default(autoincrement())
  name        String
  description String?  @db.Text
  people      Int? // how many people it serves; required and unique within a group
  groupName   String? // combos sharing it (trimmed, case-insensitive) show on one home card
  active      Boolean  @default(true)
  deleted     Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @default(now()) @updatedAt

  items            ComboItem[]
  featuredItems    HomeFeaturedItem[]
  homeSpotlightOf  HomeOfferSettings[]

  @@index([groupName])
  @@map("combo")
}

model ComboItem {
  id        Int     @id @default(autoincrement())
  comboId   Int
  productId Int
  quantity  Decimal @db.Decimal(18, 4) // in the product's unit, a valid cart quantity when saved
  sortOrder Int

  combo   Combo   @relation(fields: [comboId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@unique([comboId, productId])
  @@index([productId])
  @@map("combo_item")
}

// One entry of the home featured list: exactly one of productId / comboId (CHECK in SQL).
model HomeFeaturedItem {
  id        Int      @id @default(autoincrement())
  position  Int
  productId Int?     @unique
  comboId   Int?     @unique
  createdAt DateTime @default(now())

  product Product? @relation(fields: [productId], references: [id], onDelete: Cascade)
  combo   Combo?   @relation(fields: [comboId], references: [id], onDelete: Cascade)

  @@index([position])
  @@map("home_featured_item")
}
```

**`HomeOfferSettings` suma:**
- `spotlightComboId Int?`, con `spotlightCombo Combo? @relation(..., onDelete: SetNull)` y `@@index([spotlightComboId])`;
- `fillWithRanking Boolean @default(true)`.
- Comentario: a lo sumo uno de `spotlightProductId` y `spotlightComboId`, con un CHECK en SQL.

**`Product` suma:**
- las relaciones `comboItems ComboItem[]` y `homeFeaturedItems HomeFeaturedItem[]`;
- el comentario de `homeOfferRank` cambia a `// deprecated (WP-D): replaced by HomeFeaturedItem; nothing reads it; dropped in a later migration`.

**Decisiones físicas** (análisis de migración del grill, transitorio):
- **`position` no es único.** Reordenar reescribe 1..n dentro de una transacción, y un único simple fallaría en los intercambios intermedios. Se ordena por `position, id`.
- **Los dos `@unique` nullable** (`productId` y `comboId`) evitan que la misma cosa esté dos veces. Postgres admite varios NULL.
- **Las FK no crean índice:** `combo_item.productId` lleva índice explícito (lo usan los bloqueos de borrado de producto y el reset). `home_featured_item` queda cubierto por sus únicos.
- **`ComboItem.product` es `Restrict`:** un producto que está en un combo no se puede borrar definitivamente. `product.service.ts` lo informa (§7.4, paso 22).

### 5.2. Armado del home: función pura `composeHomeFeatured`

Va en `src/server/services/home/home-featured.ts`, sin `server-only`, con los tipos y la lógica pura.

**Tipos:**
```ts
type FeaturedTarget = { kind: "product"; productId: number } | { kind: "combo"; comboId: number };
type HomeFeaturedCuration = {
  spotlight: FeaturedTarget | null;
  criterion: HomeOffersCriterion;
  featuredLimit: number;        // = offersLimit
  fillWithRanking: boolean;
  list: FeaturedTarget[];       // position order
};
type HomeComboRecord = {
  id: number; name: string; description: string | null; people: number | null; groupName: string | null;
  items: { productId: number; productName: string; quantity: string }[]; // sortOrder
};
composeHomeFeatured(offers: RankableHomeOffer[], combos: HomeComboRecord[], curation): { spotlight: HomeFeature | null; featured: HomeFeature[] }
```

**Reglas, en este orden:**
1. **Oferta disponible.** `available = dedupeHomeOffersByProduct(offers)`, indexado por `productId`. El mismo criterio de hoy: productos activos con términos vigentes.
2. **Opción de combo.** Para cada combo (activo y no borrado; el data layer ya filtra):
   - `items` = los productos que están en `available`, cada uno con `{ offer, quantity, lineTotal: calculateLineTotal(homeOfferTerms(offer), quantity) }`;
   - `unavailableNames` = el resto;
   - `total` = la suma.
   - Si `items` queda vacío, la opción no existe.
   - Si las monedas de los productos no coinciden, la opción tampoco existe; el admin lo ve como aviso.
3. **Tarjeta de grupo.** La clave es `normalizeComboGroup(groupName)` (trim, espacios colapsados, `toLocaleLowerCase("es")`), o `combo:{id}` si no tiene grupo.
   - `options` = las opciones existentes del grupo, ordenadas por `people` (los nulos al final) y después por `id`.
   - La tarjeta existe si tiene al menos una opción.
   - `initialComboId` = el combo destacado, si está entre las opciones; si no, `options[0]`.
4. **Banda:**
   - `spotlight` de tipo producto disponible → ese producto.
   - De tipo combo con tarjeta → esa tarjeta, abierta en ese combo.
   - Si no se cumple ninguno y `fillWithRanking` está prendido → el primero de `rankHomeOffers` entre los productos que no están en `list`.
   - Si no, `null`.
5. **Sección.** Se recorre `list` en orden:
   - producto disponible → tarjeta de producto;
   - combo con tarjeta → tarjeta de grupo.
   - Se salta todo lo que ya se mostró: el mismo producto, la misma clave de grupo o lo que está en la banda.
   - Después, si `fillWithRanking` está prendido, `rankHomeOffers(criterio)` sobre los productos que todavía no aparecieron.
   - Se corta en `featuredLimit`. Una tarjeta de combo cuenta como 1.

**`home-ranking.ts`:**
- `RankableHomeOffer` pierde `homeOfferRank`.
- `rankHomeOffers(offers, criterion)` ordena solo por el criterio.
- Se van `isPinned`, `composeHomeContent` y `HOME_OFFERS_POOL_SIZE`.
- `compareRankedOffers` y `dedupeHomeOffersByProduct` quedan.

**Contrato público** (`src/schemas/home.schemas.ts`):
```ts
homeComboItemSchema   = z.object({ offer: homeOfferSchema, quantity: decimalOutputSchema, lineTotal: decimalOutputSchema })
homeComboOptionSchema = z.object({ comboId, name, description: z.string().nullable(), people: z.number().int().positive().nullable(),
                                   items: z.array(homeComboItemSchema).min(1), unavailableNames: z.array(z.string()),
                                   total: decimalOutputSchema, currency: catalogCurrencySchema })
homeComboCardSchema   = z.object({ key: z.string(), initialComboId, options: z.array(homeComboOptionSchema).min(1) })
homeFeatureSchema     = z.discriminatedUnion("kind", [
                          z.object({ kind: z.literal("product"), offer: homeOfferSchema }),
                          z.object({ kind: z.literal("combo"), combo: homeComboCardSchema }) ])
homeContentOutputSchema = z.object({ spotlight: homeFeatureSchema.nullable(), featured: z.array(homeFeatureSchema) })
```

Salen `offers`, `offersLimit` y `offersCriterion`. Ya no hay pool para el filtro ni título según el criterio.

### 5.3. "Sumar combo"

- **Con sesión:** `cart.addCombo({ comboId })` → `combo-cart.service.addCombo(userId, comboId)`.
  - Lee el combo (activo y no borrado) con sus `items` (producto, nombre y cantidad).
  - Si no existe: `NOT_FOUND`, "Ese combo ya no está disponible."
  - Si existe: `addItems(userId, items.map(...))`.
  - Salida: `cartAddItemsOutputSchema` (de WP-G).
  - El servidor no confía en la lista del cliente: siempre usa la configuración y los términos de hoy.
- **Invitado:** `useCartStore.addItems(option.items.map((item) => homeOfferToCartItem(item.offer, item.quantity)))`. La acción ya normaliza y suma.
- **Avisos:**
  - se reusa `describeRepeatOutcome(lines)` de WP-G ("Sumamos 3 productos a tu pedido.", "Ajustamos la cantidad de …", "… ya no está disponible.");
  - para el invitado, las líneas se arman con `added` en los disponibles y `unavailable` en `unavailableNames`.
- Después se abre el mini-carrito (`openMiniCart`), igual que con un producto.

### 5.4. Admin

- **Combos**, en `/admin/combos`, con el patrón de categorías.
  - **Lista:** nombre, grupo, personas, cantidad de productos, estado y avisos ("Sin precio vigente: …" y "No se ve en el home").
  - **Formulario:**
    - Nombre.
    - Descripción.
    - Personas.
    - Grupo: combobox con los grupos existentes, que admite uno nuevo. Ayuda: "Los combos del mismo grupo se muestran en una sola tarjeta, con un selector de personas".
    - Activo.
    - Productos: una fila por producto con el combobox de productos con precio vigente, la cantidad y la ayuda "Mínimo 1 kg, de a 1 kg". Botón "Agregar producto" y botón "Quitar".
- **Destacados**, en `/admin/home-offers`:
  - **Banda destacada:** combobox con dos grupos, "Productos" y "Combos", más "Sin elección".
  - **Lista de destacados:** ↑ ↓ y "Quitar" en cada fila, el badge Combo o Producto, y los avisos "Sin precio vigente", "Inactivo" y "Se muestra en la tarjeta de {nombre}". Combobox "Agregar combo o producto…".
  - **Relleno:** casilla "Completar con productos del ranking", el criterio (deshabilitado con la casilla apagada), "Lugares en la sección" (1 a 12) y el botón "Guardar".
  - **Vista previa:** la banda y la sección en orden, marcando "a mano" o "ranking".

## 6. Mapa de archivos

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `prisma/schema.prisma` | Modificar | Modelos y columnas de §5.1. |
| `prisma/migrations/<ts>_combos_home_featured/migration.sql` | Nuevo | DDL, CHECKs y copia de los fijados (§7.1). |
| `src/server/services/home/home-featured.ts` (+ `.test.ts`) | Nuevo | `composeHomeFeatured`, `normalizeComboGroup`, `resolveComboOption`. |
| `src/server/services/home/home-ranking.ts` (+ test) | Modificar | Sin fijados; sale `composeHomeContent`. |
| `src/server/services/home/home.data.ts` | Modificar | `listHomeCombos`, `listHomeFeaturedList` y la curaduría con los campos nuevos. |
| `src/server/services/home/home.service.ts` | Modificar | `getHomeContent()` con `composeHomeFeatured`. |
| `src/schemas/home.schemas.ts`, `src/shared/common/home.types.ts` | Modificar | El contrato de §5.2 y los tipos `HomeFeature`, `HomeComboCard` y `HomeComboOption`. |
| `src/schemas/admin/combo.schemas.ts`, `src/shared/common/admin-crud/combo.types.ts` | Nuevo | Entradas y salidas del ABM. |
| `src/server/services/admin/combo.decision.ts` (+ test) | Nuevo | Validación pura de los productos y del grupo. |
| `src/server/services/admin/combo.data.ts`, `combo.service.ts` (+ test) | Nuevo | El ABM y los avisos. |
| `src/server/api/routers/admin/combo.router.ts`, `admin.router.ts` | Nuevo / Modificar | `admin.combo.*`. |
| `src/features/admin/crud/combo/{combo-form-dialog,combo-table}.tsx`, `combo.mappers.ts` | Nuevo | La UI del ABM. |
| `src/app/admin/(catalog)/combos/{page.tsx,_components/combo-crud-client.tsx}` | Nuevo | La página. |
| `src/schemas/admin/home-offers.schemas.ts`, `admin-crud/home-offers.types.ts`, `services/admin/home-offers.{data,service}.ts` (+ test nuevo), `routers/admin/home-offers.router.ts` | Modificar | Banda producto/combo, lista, relleno y vista previa. Sale `setPinnedRank`. |
| `src/app/admin/(catalog)/home-offers/{page.tsx,_components/home-offers-client.tsx}` | Modificar | "Destacados". |
| `src/app/admin/(catalog)/home-offers/_components/home-offers-preview{,.test}.ts` | Borrar | La vista previa pasa al servidor. |
| `src/server/services/admin/product.service.ts`, `product.data.ts` | Modificar | Bloqueo del borrado definitivo por combos. |
| `src/schemas/cart.schemas.ts`, `src/server/services/cart/combo-cart.service.ts` (+ test), `src/server/services/cart/cart.data.ts`, `src/server/api/routers/cart.router.ts` | Modificar / Nuevo | `cart.addCombo`. |
| `src/features/cart/use-cart-sync.ts` | Modificar | `addCombo` en `useCartActions`. |
| `src/features/home/home-formatters.ts` (+ test) | Modificar | `formatPeopleLabel`, `formatComboForPeople`, `formatComboItemQuantity` y `selectComboMosaicImages`. |
| `src/features/home/_components/featured-section.tsx` | Nuevo (reemplaza `offers-section.tsx`) | La sección "Destacados". |
| `src/features/home/_components/home-feature-card.tsx` | Nuevo | Elige entre la tarjeta de producto y la de combo. |
| `src/features/home/_components/home-combo-card.tsx`, `home-combo-mosaic.tsx`, `home-combo-add-button.tsx` | Nuevo | La tarjeta de combo. |
| `src/features/home/_components/home-spotlight-band.tsx` | Modificar | "Destacado", con producto o combo. |
| `src/features/home/_components/{offers-section,home-offers-grid}.tsx`, `src/features/home/home-offers-filter{,.test}.ts` | Borrar | Los chips y el pool. |
| `src/app/(storefront)/page.tsx` | Modificar | El contrato nuevo. |
| `scripts/purge-demo-data.plan.ts` (+ test), `scripts/purge-demo-data.ts` | Modificar | Clasificar `Combo`, `ComboItem` y `HomeFeaturedItem`. |
| `scripts/reset-initial-catalog.plan.ts` (+ test), `scripts/lib/reset-initial-catalog.ts`, `scripts/reset-initial-catalog.integration.test.ts` | Modificar | Guardar y restaurar por nombre de producto. |
| `prisma/seed.ts` | Modificar | Fixture de e2e: grupo "Desayuno (e2e)". |
| `src/features/admin/glossary/data/catalog.ts`, `src/features/admin/shell/admin-nav.ts` | Modificar | Glosario y navegación. |
| `docs/schema-reference.md` | Modificar | Filas y relato del home. |
| `e2e/smoke.spec.ts`, `e2e/home-combo.spec.ts` (nuevo) | Modificar / Nuevo | e2e. |
| `CONTEXT.md`, `docs/adr/0014-…` | Ya aplicados | Solo verificar. |

## 7. Pasos (en orden)

### 7.1. Modelo y migración

1. **`prisma/schema.prisma`:** los modelos y columnas de §5.1. Correr `pnpm prisma generate` (o el script del repo que lo haga) y `pnpm typecheck`; tiene que fallar solo donde se lee `homeOfferRank` o `composeHomeContent`.
2. **Migración.**
   - Generarla contra la **DB local** (§9 y §10 de la orquestación) con `prisma migrate dev --create-only --name combos_home_featured`. Revisar que el timestamp quede **después** de la última migración de `main` (WP0 usa `20261113000000`; WP-B puede sumar otra).
   - Agregar a mano, al final del SQL:
     ```sql
     ALTER TABLE "combo_item" ADD CONSTRAINT "combo_item_quantity_positive" CHECK ("quantity" > 0);
     ALTER TABLE "combo" ADD CONSTRAINT "combo_people_positive" CHECK ("people" IS NULL OR "people" > 0);
     ALTER TABLE "home_featured_item" ADD CONSTRAINT "home_featured_item_one_target"
       CHECK (num_nonnulls("productId", "comboId") = 1);
     ALTER TABLE "home_offer_settings" ADD CONSTRAINT "home_offer_settings_one_spotlight"
       CHECK (num_nonnulls("spotlightProductId", "spotlightComboId") <= 1);
     -- Expand only: carry today's pins over; product."homeOfferRank" stays until the contract migration.
     INSERT INTO "home_featured_item" ("position", "productId")
     SELECT ROW_NUMBER() OVER (ORDER BY "homeOfferRank", "id"), "id"
     FROM "product"
     WHERE "homeOfferRank" IS NOT NULL AND "deleted" = false;
     ```
   - Verificar en local: `pnpm db:migrate` sobre una base con 2 productos fijados (rangos 2 y 5) deja las posiciones 1 y 2. Un INSERT con los dos destinos, o con ninguno, falla.
   - **Riesgo de bloqueos:** las tablas son nuevas y `home_offer_settings` tiene una fila. `ADD COLUMN` con un default constante no reescribe la tabla.

### 7.2. Lógica pura (tests primero)

3. **`home-featured.ts` + `home-featured.test.ts`.** Construir los datos con el helper `offer()` de `home-ranking.test.ts`; extraerlo a un `home-test-fixtures.ts` si hace falta. Casos:
   - la lista respeta el orden y mezcla combo y producto;
   - el ranking completa hasta `featuredLimit`, sin repetir lo que ya está en la lista;
   - con `fillWithRanking: false`, solo la lista, y sin banda si no hay elección;
   - un producto de la lista sin términos vigentes se salta y su lugar lo completa el ranking;
   - **combos con disponibilidad parcial:**
     - un combo con 3 productos y 1 sin términos tiene 2 `items`, `unavailableNames` con el nombre que falta y el total de esos 2;
     - un combo con 0 disponibles no aparece;
   - el total con descuento usa `calculateLineTotal` (granola $ 14.450 × 1 + pasta de maní $ 5.150 × 1 + pasa $ 7.850 × 1 = 27.450);
   - **grupos:**
     - dos combos con `groupName` "Desayuno" y "  desayuno " forman **una** tarjeta con opciones ordenadas 1 y 2;
     - `initialComboId` es el de la lista;
     - si el hermano también está en la lista, no ocupa un segundo lugar;
     - un combo sin grupo forma su propia tarjeta;
   - **banda:**
     - con un combo elegido, la banda es la tarjeta de su grupo y ese grupo no aparece en la sección;
     - con un producto elegido sin términos y el relleno prendido, va el primero del ranking que no está en la lista;
   - las monedas mezcladas dejan la opción afuera;
   - una tarjeta de combo cuenta 1 en el límite.
4. **`home-ranking.ts` y su test.**
   - Sacar los fijados (`isPinned` y `homeOfferRank`), `composeHomeContent` y `HOME_OFFERS_POOL_SIZE`.
   - Los tests de fijados pasan a `home-featured.test.ts`, y los de criterio y desempate quedan.
5. **`combo.decision.ts` + test.**
   - `validateComboItems(items: { productId; quantity: string }[], termsByProductId: Map<number, { name; unit; presentationContainer; presentationSize; terms: CatalogClientTerms }>)` → `string[]` de errores en castellano:
     - producto repetido: "{nombre} está dos veces.";
     - sin términos: "{nombre} no tiene precio vigente.";
     - cantidad inválida: `!quantitiesEqual(normalizeCartQuantity(q, terms), q)` → "La cantidad de {nombre} tiene que ser {formatQuantity(moq)} o más, de a {formatQuantity(step ?? moq)}" (si hay tope, se agrega ", hasta {max}"; si la cantidad es fija, "La cantidad de {nombre} es fija: {moq}");
     - monedas distintas: "Todos los productos tienen que tener la misma moneda.";
     - lista vacía: "Agregá al menos un producto.".
   - `validateComboGroup({ id?, groupName, people }, siblings: { id; people }[])` → error o `null`:
     - con grupo y sin personas: "Un combo con grupo necesita la cantidad de personas.";
     - personas repetidas en el grupo: "En el grupo {grupo} ya hay un combo para {N} personas ({nombre}).".
   - `normalizeComboGroupName(raw)`: trim + espacios colapsados, o `null` si queda vacío. Para comparar se usa `normalizeComboGroup` de `home-featured.ts`.
   - Tests:
     - kg con mínimo y paso de 0,5 (0,7 es inválido, 1 vale);
     - frasco de paso 1;
     - tope;
     - cantidad fija;
     - sin términos;
     - producto repetido;
     - grupo sin personas;
     - personas repetidas;
     - edición del mismo combo (no choca consigo mismo).
6. **`home-formatters.ts` + test:**
   - `formatPeopleLabel(1)` → "1 persona"; `formatPeopleLabel(2)` → "2 personas";
   - `formatComboForPeople(n)` → "Para 1 persona" o "Para 2 personas";
   - `formatComboItemQuantity({ quantity, offer })`:
     - peso → `formatQuantity(quantity, unit)` ("1 kg", "0,5 kg");
     - el resto → `formatQuantity(quantity, unit, { presentationContainer, presentationSize: null })` ("1 frasco", "2 frascos"), con el mismo criterio que WP-C;
   - `selectComboMosaicImages(items)` → las primeras 4 `imageUrl` no nulas.

### 7.3. Servidor del home

7. **`home.data.ts`:**
   - `listHomeCombos(database)`: `combo.findMany({ where: { active: true, deleted: false }, select: { id, name, description, people, groupName, items: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { productId, quantity, product: { select: { name } } } } } })`.
   - `listHomeFeaturedList(database)`: `homeFeaturedItem.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }], select: { productId, comboId } })`.
   - `getHomeOfferCuration`: suma `spotlightComboId` y `fillWithRanking` al select y a los defaults (`fillWithRanking: true`), y arma `spotlight` como `FeaturedTarget | null`.
   - Sacar `homeOfferRank` del select de producto.
8. **`home.service.ts`:**
   - `getHomeContent()` hace `Promise.all` de ofertas, combos, lista y curaduría.
   - `countPaidOrdersByProduct` solo corre si el criterio es `orderVolume` **y** el relleno o la banda automática lo necesitan, es decir, si `fillWithRanking` está prendido.
   - Mapea los combos a `HomeComboRecord` (cantidades con `toString()`).
   - Corre `composeHomeFeatured` y parsea con `homeContentOutputSchema`.
   - El mapeo de `RankableHomeOffer` ya no lleva `homeOfferRank`.
9. **`home.schemas.ts` y `home.types.ts`:** el contrato de §5.2. Exportar `HomeFeature`, `HomeComboCard`, `HomeComboOption` y `HomeComboItem`.

### 7.4. Admin: ABM de combos

10. **`combo.schemas.ts`**, con las convenciones de `category.schemas.ts` y `_crud-schema-helpers.ts`:
    - `comboItemInputSchema = { productId, quantity: <decimal positivo como string> }`. Reusar o exportar el `positiveDecimalStringSchema` de `cart.schemas.ts`.
    - `comboCreateInputSchema = { name: trim 1..80, description: trim ≤ 500 nullable, people: int 1..20 nullable, groupName: trim ≤ 60 nullable, active: boolean, items: comboItemInputSchema[] (1..20) }`.
    - `comboUpdateInputSchema` = el de creación + `id`.
    - `comboDeleteInputSchema` y `comboListInputSchema` (`includeDeleted`).
    - `comboListItemSchema = { id, name, description, people, groupName, active, deleted, itemCount, unavailableProductNames: string[], shownOnHome: boolean, updatedAt }`.
    - `comboDetailSchema` = el ítem de la lista + `items: { productId, productName, quantity, unit, presentationContainer, presentationSize }[]`.
    - `comboStatsSchema = { total, active, notShown }`.
    - `comboProductOptionSchema = { productId, name, unit, presentationContainer, presentationSize, moq, step, max, currency }`.
    - `comboGroupOptionsSchema = string[]`.
11. **`combo.data.ts`:**
    - `listCombos`, `findComboById` (con los ítems y el producto), `createCombo` (con `items.create` y `sortOrder` = índice) y `updateCombo` (en una transacción: `deleteMany` de los ítems y `createMany`);
    - `softDeleteCombo`, `hardDeleteCombo`, `listComboGroupNames` (distinct, no borrados);
    - `listGroupSiblings(tx, normalizedGroup)`: filtra en memoria con `normalizeComboGroup`, porque son pocas filas;
    - `listCurrentTermsForProducts(tx, productIds, now)` con `currentTermsWhere(now)` y productos activos, quedándose con el primero por producto, igual que `listCurrentClientTermsByProductIds` de WP-G (reusarlo si se puede importar sin ciclo);
    - `getHomeVisibility(tx)` → `{ featuredComboIds, spotlightComboId }`.
12. **`combo.service.ts`:**
    - `list`, `getById`, `getStats`, `create`, `update`, `softDelete`, `hardDelete`, `listProductOptions` y `listGroupNames`.
    - `create` y `update`, dentro de `$transaction`:
      - normalizan el grupo;
      - corren `validateComboGroup` con los hermanos y `validateComboItems` con los términos de hoy;
      - si hay errores, `throwConflict(errors.join(" "))` (el patrón de `admin-crud.errors`);
      - escriben;
      - registran `writeAdminAuditLog` con la entidad `combo` y las acciones `combo.create` o `combo.update`.
    - `softDelete`: marca `deleted`, **borra sus `HomeFeaturedItem`** y pone en `null` `spotlightComboId` si apuntaba a él, todo en la misma transacción y con auditoría.
    - `hardDelete`: borra; la cascada se lleva los ítems y los destacados, y el `SetNull` limpia la banda.
    - **Avisos de la lista:**
      - `unavailableProductNames` = los ítems sin términos vigentes;
      - `shownOnHome` = está activo, tiene al menos 1 producto disponible y **él o algún hermano de grupo** está en la lista o en la banda.
    - `combo.service.test.ts`, con mocks de `combo.data` al estilo de `category.service.test.ts`:
      - error de grupo;
      - error de cantidad;
      - la edición reemplaza los ítems;
      - el soft delete limpia los destacados y la banda;
      - `shownOnHome` con un hermano destacado.
13. **`combo.router.ts`** (`adminProcedure`, igual que `category.router.ts`, con `mapServiceError`): `list`, `getById`, `getStats`, `create`, `update`, `softDelete`, `hardDelete`, `productOptions` y `groupNames`. Se registra como `combo` en `admin.router.ts`.
14. **UI:**
    - `app/admin/(catalog)/combos/page.tsx` (`metadata.title "Combos"`) + `_components/combo-crud-client.tsx`, copiando a `category-crud-client.tsx`.
    - `features/admin/crud/combo/combo-table.tsx`:
      - columnas Nombre, Grupo, Personas, Productos y Estado (Activo, Inactivo o Eliminado, con `status-presets`);
      - avisos con `TriangleAlertIcon`: "Sin precio vigente: Pasta de maní Entre Nuts 370 g" y "No se ve en el home" (este último con un enlace a `/admin/home-offers`).
    - `combo-form-dialog.tsx`:
      - campos de §5.4;
      - la fila de producto usa `Combobox` (`productOptions`) y un `Input` de cantidad con `inputMode="decimal"`;
      - debajo, la ayuda `formatQuantity(moq)` "o más, de a" `formatQuantity(step ?? moq)`;
      - los errores del servidor van en un `Alert` arriba del pie;
      - el grupo usa el `Combobox` con opción "Crear «{texto}»" si el componente lo admite; si no, un `Input` con `datalist`;
      - la ayuda de personas: "Para la tarjeta del home: '1 persona', '2 personas'. Obligatorio si el combo tiene grupo."
    - `combo.mappers.ts`: estados y etiquetas.
15. **`product.service.ts` y `product.data.ts`:**
    - `comboItems` se suma al `_count` (`product.data.ts:94`) y a `buildRelationBlockMessage` como "{n} combos";
    - el chequeo de bloqueo (`:525-532`) lo incluye.

### 7.5. Admin: pantalla "Destacados"

16. **`home-offers.schemas.ts` y `home-offers.types.ts`:**
    - `featuredTargetSchema = z.discriminatedUnion("kind", [{ kind: "product", productId }, { kind: "combo", comboId }])`;
    - `homeOfferSettingsSchema = { spotlight: featuredTargetSchema.nullable(), criterion, offersLimit, fillWithRanking, updatedAt }`;
    - `homeOfferSettingsUpdateInputSchema = { criterion, offersLimit (1..12), fillWithRanking }`;
    - `homeOfferSetSpotlightInputSchema = { target: featuredTargetSchema.nullable() }`;
    - `homeFeaturedListItemSchema = { id, position, target, name, status: z.enum(["shown", "noPrice", "inactive", "sharedCard"]), sharedWithName: z.string().nullable() }`;
    - `homeFeaturedAddInputSchema = { target }`, `homeFeaturedRemoveInputSchema = { id }` y `homeFeaturedReorderInputSchema = { ids: int[] (1..50) }`;
    - `homeComboCandidateSchema = { comboId, name, people, groupName, active }`;
    - `homeFeaturedPreviewSchema = { spotlight: { kind, name } | null, featured: { kind, name, source: "list" | "ranking" }[] }`;
    - se va `homeOfferSetPinnedRankInputSchema`.
17. **`home-offers.data.ts`:**
    - `upsertHomeOfferSettings` acepta `spotlightProductId`, `spotlightComboId` y `fillWithRanking`;
    - `listFeaturedItems` (con el nombre del producto o del combo y `active`/`deleted`), `createFeaturedItem` (`position = max + 1`), `deleteFeaturedItem` y `rewriteFeaturedPositions(tx, ids)` (un update por id, 1..n);
    - `listComboCandidates`.
    - Se van `setProductHomeOfferRank` y `listPinnedProducts`.
18. **`home-offers.service.ts`**, siempre con `writeAdminAuditLog`:
    - `getSettings`;
    - `updateSettings`;
    - `setSpotlight`:
      - producto → `assertOfferable`;
      - combo → activo y no borrado;
      - escribe uno y pone el otro en `null`.
    - `listFeatured`, con el estado calculado:
      - `noPrice` si es un producto sin términos o un combo sin productos disponibles;
      - `inactive` si es un combo inactivo;
      - `sharedCard` si un hermano de grupo está más arriba en la lista o en la banda;
      - `shown` en el resto.
    - `addFeatured`:
      - con duplicado → `throwConflict("Ya está en la lista de destacados.")`;
      - un producto tiene que ser ofertable;
      - un combo tiene que estar activo.
    - `removeFeatured`.
    - `reorderFeatured`: los ids tienen que ser **exactamente** los actuales; si no, `throwConflict("La lista cambió; recargá la página.")`.
    - `listCandidates` (productos; lo que ya existe, sin `pinnedRank`) y `listComboCandidates`.
    - `preview`: corre `getHomeContent()` (o el mismo armado con `db`) y lo resume con `source` = `"list"` si el destino está en la lista y `"ranking"` si no.
    - Nuevo `home-offers.service.test.ts`:
      - el reorder con ids de más o de menos se rechaza;
      - el duplicado se rechaza;
      - `setSpotlight` con un combo pone en `null` el producto;
      - `listFeatured` marca `sharedCard`.
19. **`home-offers.router.ts`:** `getSettings`, `updateSettings`, `setSpotlight`, `listFeatured`, `addFeatured`, `removeFeatured`, `reorderFeatured`, `listCandidates`, `listComboCandidates` y `preview`. Se va `setPinnedRank`.
20. **`home-offers-client.tsx`**, reescrito con la estructura de §5.4:
    - `CrudPageShell` con título "Destacados" y descripción "Elegí qué combos y productos se ven en el home y qué va en la banda destacada.";
    - card **"Banda destacada"** con `Combobox` de opciones agrupadas (productos y combos), valor `product:{id}` o `combo:{id}`, "Sin elección" y la ayuda "Sin elección, va el primero del ranking (si el relleno está prendido).";
    - card **"Lista de destacados"**, con la misma estructura que hoy tiene "Ofertas fijadas" (`:449-560`):
      - cada fila con badge "Combo" o "Producto", nombre, aviso, ↑ ↓ → `reorderFeatured` con el arreglo intercambiado, y "Quitar";
      - el `Alert` "Hay más destacados que lugares en la sección" se mantiene;
    - card **"Relleno"**: `Checkbox` "Completar con productos del ranking", `ToggleGroup` de criterio (deshabilitado con la casilla apagada), "Lugares en la sección" y "Guardar configuración";
    - **"Vista previa"**: `api.admin.homeOffers.preview` invalidado después de cada mutación;
    - borrar `home-offers-preview.ts` y su test;
    - `page.tsx`: `metadata.title "Destacados"`.

### 7.6. Home del cliente

21. **`home-combo-mosaic.tsx`.** Recibe `images: { url: string | null; name: string }[]` (las 4 de `selectComboMosaicImages`), en un contenedor `aspect-square`:
    - 1 imagen → completa;
    - 2 → dos mitades verticales;
    - 3 → una mitad y dos cuartos;
    - 4 → 2×2.
    - Cada celda es un `ProductImage` con el contrato de WP-C (`bg-contain`, `placeholderClassName`).
    - El contenedor lleva `role="img"` y `aria-label="Productos del {nombre}"`, y las celdas `aria-hidden`.
22. **`home-combo-add-button.tsx`** (`"use client"`): `Button variant="highlight"` a lo ancho, "Sumar combo", sin ícono ni monto. Deshabilitado con `!hasHydrated || isPending`. `onClick` → `addCombo(option)` y `openMiniCart()`.
23. **`home-combo-card.tsx`** (`"use client"`). Props: `{ card: HomeComboCard; size?: "default" | "hero"; isAuthenticated; userId }`. Estado `selectedId` (inicial `card.initialComboId`), y `option` = la opción seleccionada. Contiene, de arriba a abajo:
    - el mosaico;
    - el `Badge` "Combo";
    - el heading (`h3`, o `h2` en hero), **sin enlace**, con `option.name`;
    - la descripción, si no está vacía ni repite el nombre (`line-clamp-3`);
    - el selector:
      - si `options.length > 1`: `ToggleGroup type="single"` con `aria-label="Cantidad de personas"` y un ítem por opción con `formatPeopleLabel(people)`;
      - si hay una sola opción con personas: el texto `formatComboForPeople`;
    - la lista `<ul>`: cada `<li>` con un `Link` al nombre (`/products?product={id}`) y, a la derecha, `formatComboItemQuantity` · `formatCurrency(lineTotal)`;
    - si hay `unavailableNames`: "Esta semana no está: A, B." (`text-muted-foreground text-sm`);
    - la fila "Total hoy" + `formatCurrency(total, currency)`;
    - el botón.
    - Usa `Card` (`data-slot="card"`), como `HomeOfferCard`, con la misma altura y el botón alineado (`mt-auto`).
24. **`home-feature-card.tsx`:**
    - `kind === "product"` → `HomeOfferCard` + `HomeOfferAddButton`, como hoy en `offers-section.tsx`;
    - `"combo"` → `HomeComboCard`;
    - prop `size`.
25. **`featured-section.tsx`** (reemplaza a `offers-section.tsx`):
    - `<section id="ofertas" className="scroll-mt-20 …">`, `SectionHeading eyebrow="Destacados" title="Destacados de la semana"` y la acción "Ver todo el catálogo";
    - grilla `grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-5`, igual que hoy;
    - key: `product-{id}` o `combo-{card.key}`;
    - estado vacío con el mismo `Empty`, título "Estamos preparando los destacados" y "Contactar a CoCo".
    - Borrar `offers-section.tsx`, `home-offers-grid.tsx`, `home-offers-filter.ts` y su test.
26. **`home-spotlight-band.tsx`.** Prop `feature: HomeFeature`.
    - `aria-label="Destacado"` y badge "Destacado".
    - Texto:
      - producto → "Sumalo a tu pedido desde acá o seguí mirando los destacados de abajo.";
      - combo → "Sumá todos sus productos de una vez. Después cambiás lo que quieras en tu pedido."
    - Adentro va `HomeFeatureCard size="hero"`, dentro del `max-w-100` de WP-C.
27. **`page.tsx`:**
    - `const [session, { spotlight, featured }] = …`;
    - `spotlight ? <HomeSpotlightBand feature={spotlight} …/> : null`;
    - `<FeaturedSection featured={featured} …/>`;
    - si `HomeHero` todavía recibe `hasOffers` (WP-B lo saca), pasarle `featured.length > 0`.

### 7.7. "Sumar combo" en el pedido

28. **`cart.schemas.ts`:** `cartAddComboInputSchema = z.object({ comboId: z.number().int().positive() })`.
29. **`cart.data.ts`:** `findActiveComboForCart(database, comboId)` → `combo.findFirst({ where: { id, active: true, deleted: false }, select: { name, items: { orderBy: sortOrder, select: { productId, quantity, product: { select: { name } } } } } })`.
30. **`combo-cart.service.ts`** (`server-only`):
    - `addCombo(userId, comboId)`:
      - si `findActiveComboForCart(db, …)` da `null` → `TRPCError NOT_FOUND`, "Ese combo ya no está disponible.";
      - si no → `addItems(userId, items.map(({ productId, quantity, product }) => ({ productId, quantity: quantity.toString(), name: product.name })))`.
    - Test (mocks de `cart.data` y `cart.service`):
      - combo inactivo → `NOT_FOUND`;
      - pasa las cantidades y los nombres en orden;
      - devuelve lo que devuelve `addItems`.
    - `ensureCartMutable` y la suma los cubren los tests de WP-G.
31. **`cart.router.ts`:** `addCombo: protectedProcedure.input(cartAddComboInputSchema).output(cartAddItemsOutputSchema).mutation(({ ctx, input }) => comboCartService.addCombo(ctx.session.user.id, input.comboId))`.
32. **`use-cart-sync.ts` → `useCartActions`:**
    - `addComboMutation = api.cart.addCombo.useMutation({ onError: toast.error(error.message || "No se pudo sumar el combo"), onSuccess: (output) => { replaceCart(output.cart, userId); showAddOutcome(output.lines); } })`;
    - `showAddOutcome` usa `describeRepeatOutcome` (success → `toast.success`, info → `toast.info` y warning → `toast.warning`);
    - `addCombo(option: HomeComboOption)`:
      - **invitado:** `addLocalItems(option.items.map((item) => homeOfferToCartItem(item.offer, item.quantity)))` + `showAddOutcome([...items como "added", ...unavailableNames como "unavailable"])`;
      - **con sesión:** `addComboMutation.mutate({ comboId: option.comboId })`;
    - `isPending` suma `addComboMutation.isPending`;
    - `addCombo` se agrega al `useMemo`.

### 7.8. Scripts y fixture de e2e

33. **`purge-demo-data.plan.ts`:**
    - `KEPT_MODELS` suma `"Combo"`;
    - `CATALOG_DELETE_ORDER` suma `"HomeFeaturedItem"` y `"ComboItem"` **antes** de `"ProductLocalConstraints"`;
    - `PurgeCatalogState` suma `comboItems: { id; productId }[]` y `featuredItems: { id; productId: number | null }[]`;
    - `planDemoPurge` devuelve en `demo` `comboItemIds` y `featuredItemIds` (las filas de productos demo);
    - en `PurgeProduct` se va `homeOfferRank` y entra `featured: boolean` para el informe.
    - **Tests:** "classifies every model" y "deletes every child before the parent" tienen que pasar sin tocarlos. "keeps no row that points at a deleted one" sigue esperando `["HomeOfferSettings->Product"]`, porque `Combo` no apunta a nada. Agregar un caso al plan con un combo y un destacado sobre un producto demo.
34. **`purge-demo-data.ts`:**
    - el inventario lee `comboItem` y `homeFeaturedItem`;
    - `kept` suma `Combo: { label: "Combos", count }`;
    - la purga borra `comboItemIds` y `featuredItemIds` con `exact(...)`, antes de los productos;
    - el informe de productos sin clasificar dice "destacado en el home" en lugar de "fijado en el home, puesto N".
35. **Reset del catálogo:**
    - `reset-initial-catalog.plan.ts`: `RESET_DELETE_ORDER` suma `"HomeFeaturedItem"` y `"ComboItem"` antes de `"ProductLocalConstraints"`. `Combo` entra a `RESET_PRESERVED_MODELS` a través de `KEPT_MODELS`.
    - `lib/reset-initial-catalog.ts` (`replaceInitialCatalog`):
      - **antes** de borrar, lee `comboItem` (`comboId`, `quantity`, `sortOrder` y el nombre del producto) y `homeFeaturedItem` (`position`, `comboId` y el nombre del producto);
      - **después** de crear los productos:
        - recrea los ítems de combo y los destacados de producto buscando por nombre (los destacados de combo se recrean tal cual);
        - lo que no encuentra producto queda en un arreglo `droppedByReset` que se informa en la salida;
      - se va la restauración de `homeOfferRank` (`:268-273`);
      - se mantiene la del spotlight de producto, y `spotlightComboId` no se toca.
    - Actualizar `reset-initial-catalog.plan.test.ts` (el set de cobertura de modelos) y `reset-initial-catalog.integration.test.ts`: un combo con un producto de Quintal sobrevive al reset con la misma cantidad, y un destacado de producto conserva su posición.
36. **`prisma/seed.ts`** (solo `db:seed:test`, en la DB local):
    - sumar `"combo"`, `"combo_item"` y `"home_featured_item"` a `requiredTables`;
    - `seedHomeCombos(tx, data)` hace upsert por nombre de dos combos del grupo **"Desayuno (e2e)"**, "Combo desayuno (e2e)" con `people` 1 y 2. Usan 2 y 3 productos del seed **con términos vigentes** (`CURRENT_FROM_DATE`), al menos uno por kg y uno por unidad, en cantidades válidas (el mínimo y el doble);
    - upsert de `HomeFeaturedItem` del combo de 1 persona en `position` 1 (si no existe);
    - no toca la banda.

### 7.9. Companions

37. **Glosario (`glossary/data/catalog.ts`).** **No cambiar slugs.**
    - `concepto-oferta-destacada`:
      - `label "Destacado"`, `term "Featured item"`;
      - la definición, en castellano, sigue a *Featured item* de `CONTEXT.md`;
      - `aliases ["Oferta destacada", "Oferta fijada", "Promoción", "Operación", "Pedido abierto"]`.
    - `concepto-producto-destacado`:
      - `label "Banda destacada"`, `term "Home spotlight"`;
      - definición: "El producto o combo que la home muestra en su propia banda, arriba de los destacados…";
      - `aliases` suma "Producto destacado".
    - `concepto-ranking-de-ofertas`: la definición según *Offers ranking* (solo productos, completa los lugares libres, se puede apagar).
    - Nuevo `concepto-grupo-de-combos`: `label "Grupo de combos"`, `term "Combo group"`, `href "/admin/combos"`.
    - Nuevas entidades:
      - `entidad-combo` (`Combo` / `combo`, `href "/admin/combos"`);
      - `entidad-producto-de-combo` (`ComboItem` / `combo_item`);
      - `entidad-destacado` (`HomeFeaturedItem` / `home_featured_item`, `href "/admin/home-offers"`).
    - `entidad-configuracion-de-ofertas-del-home`: `label "Configuración de destacados"` y la definición actualizada (banda producto o combo, criterio, lugares y relleno; "La lista vive en Destacado").
    - Correr `glossary.data.test.ts`.
38. **Navegación (`shell/admin-nav.ts`):**
    - "Ofertas del home" pasa a `title "Destacados"` (sigue en `/admin/home-offers`, con `SparklesIcon`);
    - se agrega `{ title: "Combos", href: "/admin/combos", icon: ShoppingBasketIcon }` justo antes;
    - correr `admin-nav.test.ts`.
39. **`docs/schema-reference.md`:**
    - fila de `Product` (`:163`): `homeOfferRank` deprecado, más las relaciones nuevas;
    - fila de `HomeOfferSettings` (`:170`);
    - filas nuevas para `Combo`, `ComboItem` y `HomeFeaturedItem`;
    - el relato "compose the home" (`:399-406`);
    - la nota §12 (`:699-701`): la lista vive en `home_featured_item`.
40. **e2e:**
    - `e2e/smoke.spec.ts`:
      - `region` "Producto destacado" pasa a `"Destacado"`;
      - si la banda es un combo (no pasa con el seed), `test.skip` con el motivo;
      - agregar `expect(page.locator("#ofertas").getByRole("group", { name: "Filtrar ofertas por unidad" })).toHaveCount(0)`;
      - el título `#ofertas` incluye "Destacados de la semana".
    - Nuevo `e2e/home-combo.spec.ts`, como invitado (solo escribe localStorage, sin DB):
      - `goto("/")`;
      - la tarjeta con heading "Combo desayuno (e2e)"; `test.skip` si no está;
      - el `ToggleGroup` "Cantidad de personas" con "1 persona" presionado;
      - cambiar a "2 personas" cambia el texto de "Total hoy" y la cantidad de `li`;
      - "Sumar combo" abre el diálogo "Tu pedido";
      - `localStorage["coco.cart.v1"].state.items` tiene una entrada por producto con las cantidades del combo de 2 personas;
      - tocar "Sumar combo" otra vez **duplica** las cantidades.
    - `home-offer-quantity.spec.ts` debería pasar sin cambios (filtra las tarjetas con selector de cantidad). Verificarlo.
41. **Tutorial:** sin cambios. Verificar que `home-scene.tsx` compila y que corren `tutorial-*.test.ts` y `e2e/customer-tutorial.spec.ts`.
42. **Verificar** que `CONTEXT.md` (*Featured item*, *Combo*, *Combo group*, *Home spotlight* y *Offers ranking*) y el ADR 0014 coinciden con lo implementado. Si algo cambió, ajustarlos en el mismo commit.

## 8. Casos borde

- **Producto del combo sin precio esta semana:** la tarjeta lo nombra en "Esta semana no está", el total lo excluye y "Sumar combo" no lo suma. Con sesión, si en la carrera pierde el precio entre la tarjeta y el clic, el servidor lo informa como `unavailable` y aparece el aviso.
- **Ningún producto disponible:** el combo no aparece. Si era la banda, va el respaldo (o nada). El admin ve "No se ve en el home".
- **Cambió el mínimo o el paso después de guardar:** la tarjeta muestra la cantidad guardada y el total calculado con ella. Al sumar, `planCartAdditions` la ajusta y avisa "Ajustamos la cantidad…". El admin no ve error hasta que vuelve a editar el combo; ahí `validateComboItems` lo frena con el mensaje. Se acepta.
- **El producto ya está en el pedido:** se suma (`planCartAdditions`) y se recorta al tope con aviso.
- **Pedido con un pago en curso:** `ensureCartMutable` rechaza con su mensaje de siempre y la tarjeta muestra el toast de error. Es igual que con un producto.
- **Grupo con un solo combo visible** (el otro inactivo o sin productos): no hay selector y se ve "Para N personas".
- **Dos hermanos en la lista:** una sola tarjeta. En el admin, el segundo dice "Se muestra en la tarjeta de {primero}".
- **Combo en la banda y su hermano en la lista:** el hermano no ocupa lugar en la sección.
- **Combo inactivo en la lista o en la banda:** no se muestra. El admin lo ve como "Inactivo" en la lista y la banda cae al respaldo.
- **Combo borrado (soft):** sale de la lista y de la banda en la misma transacción.
- **Producto borrado definitivamente:** bloqueado si está en un combo ("{n} combos"). Si está en la lista de destacados, la cascada saca su fila.
- **Monedas mezcladas:** no deberían existir (todo es ARS). La validación lo frena al guardar, y el armado oculta la opción.
- **Relleno apagado y lista vacía:** la sección muestra el estado vacío y no hay banda.
- **Admin editando la lista en dos pestañas:** `reorderFeatured` rechaza con "La lista cambió; recargá la página.".
- **Invitado que inicia sesión:** las líneas sumadas como invitado entran por `syncLocal`, como siempre.

## 9. Testing y aceptación

- `pnpm typecheck`, `pnpm test` y `pnpm check` en verde, con los tests nuevos y ajustados:
  - `home-featured.test.ts`, `home-ranking.test.ts`, `combo.decision.test.ts`, `home-formatters.test.ts`;
  - `combo.service.test.ts`, `home-offers.service.test.ts`, `combo-cart.service.test.ts`;
  - `glossary.data.test.ts`, `admin-nav.test.ts`;
  - `purge-demo-data.plan.test.ts`, `reset-initial-catalog.plan.test.ts`.
- Contra la **DB local**, con `pnpm db:migrate`, `db:seed:init` y `db:seed:test` (§9 y §10 de la orquestación):
  - `pnpm test:e2e e2e/smoke.spec.ts e2e/home-combo.spec.ts e2e/home-offer-quantity.spec.ts e2e/customer-tutorial.spec.ts` en verde;
  - `reset-initial-catalog.integration.test.ts` en verde, si corre contra la DB local como hoy.
- `grep -rn "homeOfferRank" src` solo encuentra el comentario de `schema.prisma`. `grep -rn "HOME_OFFERS_POOL_SIZE\|composeHomeContent\|setPinnedRank\|home-offers-filter" src` no encuentra nada.
- **Revisión manual del admin** (login de Google; la hace quien implementa con su cuenta o Flavio):
  - crear "Combo desayuno" de 1 persona (granola 1 kg, pasta de maní 1 frasco, pasa de uva 1 kg) y otro de 2 personas en el grupo "Desayuno";
  - 0,7 kg en granola da el error de cantidad;
  - un segundo combo de 1 persona en el mismo grupo da el error de grupo;
  - en "Destacados", agregar el combo de 1 persona y un producto, reordenar, apagar y prender el relleno, y elegir el combo para la banda;
  - la vista previa coincide con el home;
  - la lista de combos marca "No se ve en el home" en un combo activo que no está destacado.
- **Revisión visual del home** a 360, 768 y 1280 px:
  - tarjeta de combo con mosaico, selector, lista, "Esta semana no está", total y botón alineado con las tarjetas de producto;
  - la banda con un combo, de 400 px o menos;
  - no quedan chips;
  - el título es fijo.
- **Mini review:** `q-review-code` (dos ejes) y `q-review-comments`.

## 10. Despliegue y vuelta atrás

1. **Rama y merge.** Rama `wpd-combos-featured` → revisión → merge `--no-ff` a `main`. Sin push sin el OK de Flavio.
2. **Migración en la DB compartida (la corre Flavio, antes del deploy):** `pnpm db:migrate`. El código viejo sigue andando: ignora las tablas y columnas nuevas y `homeOfferRank` sigue ahí. **Validación** con una consulta de solo lectura, que el orquestador puede correr:
   ```sql
   SELECT p.id FROM product p
   WHERE p."homeOfferRank" IS NOT NULL AND p.deleted = false
     AND NOT EXISTS (SELECT 1 FROM home_featured_item f WHERE f."productId" = p.id);
   ```
   Tiene que devolver 0 filas. Si entre la migración y el deploy alguien fijó un producto en la pantalla vieja, aparece acá, y se agrega a mano desde "Destacados".
3. **Deploy del código** (con el OK de Flavio).
4. **Contenido:** Flavio carga los combos y los agrega a "Destacados". Hasta entonces la sección muestra los productos fijados y el ranking, como hoy pero sin chips y con el título nuevo.
5. **Contracción** (diferida, §3): después de una pasada de QA, una migración que hace `DROP INDEX "product_homeOfferRank_idx"; ALTER TABLE "product" DROP COLUMN "homeOfferRank";`, junto con el schema y el `schema-reference`.

**Vuelta atrás: parcial.**
- Volver al código anterior es posible: no lee las tablas nuevas y `homeOfferRank` sigue con los fijados del momento de la migración. Pero lo que se editó después en "Destacados" (lista, banda combo, relleno) no se refleja, y los combos dejan de verse.
- Revertir el esquema (`DROP TABLE` de las 3 tablas y `DROP COLUMN` de las 2 columnas) **pierde los combos cargados**. Solo se hace si no hay contenido; si lo hay, corregir hacia adelante.
- Ninguna orden ni pago se ve afectada: los combos no dejan rastro en el pedido (ADR 0014).

## 11. Riesgos y trampas

- **Orden migración → deploy:** no borrar `homeOfferRank` en esta migración (§5.1 y §10).
- **`ComboItem.product` es `Restrict`:** cualquier camino que borra productos tiene que contemplarlo. Son el borrado definitivo del admin (paso 15), el reset (paso 35) y la purga demo (pasos 33 y 34). Si alguno queda afuera, falla con P2003.
- **Clasificación de modelos en los scripts:** los tests de `purge-demo-data.plan.test.ts` y `reset-initial-catalog.plan.test.ts` fallan apenas se agrega un modelo. Es lo esperado y se resuelve en los pasos 33 a 35, no se silencia.
- **Drift del glosario:** cada modelo nuevo necesita su entrada con `occurrences` exactas (`combo`, `combo_item` y `home_featured_item`). Los `@@map` siguen el snake_case que espera `modelTables`.
- **El contrato del home cambia:** `HomeOffer` se mantiene para la tarjeta de producto y la vista previa del admin de productos (`product-preview-dialog.tsx`). No tocar `homeOfferSchema`.
- **`describeRepeatOutcome`:** el nombre es de WP-G y se reusa tal cual. No duplicar los textos. Si el revisor pide un nombre neutro, renombrar en los dos usos dentro de este WP.
- **Vocabulario:** al cliente se le dice "pedido" y "CoCo". Nada de "carrito", "MOQ", "paso" o "step" en la tarjeta. La ayuda del admin sí puede decir "mínimo" y "de a".
- **Archivos compartidos:** `page.tsx`, `home-spotlight-band.tsx` y `home-offer-card.tsx` (WP-C ya mergeado); `admin-nav.ts`, `glossary/data/catalog.ts` y `CONTEXT.md` (WP-B suma "Cierre semanal"); `cart.service.ts`, `cart-store.ts` y `use-cart-sync.ts` (WP-G ya mergeado). Rebasear sin pisar.
- **El seed de e2e** cambia el home local: el combo queda primero en la sección. Revisar que los e2e que toman "la primera tarjeta" filtren por tarjetas de producto. `home-offer-quantity.spec.ts` ya filtra por el selector; el test de la ficha en `smoke.spec.ts` usa `h2 a`/`h3 a`, y el heading del combo no es un enlace.

## 12. Supuestos y coordinación

| Supuesto | Si no se cumple |
| --- | --- |
| WP-G está mergeado con `addItems(userId, items: { productId; quantity; name? }[])`, `cartAddItemsOutputSchema`, `useCartStore.addItems` y `describeRepeatOutcome` (rama `wpg-repeat-order`, commit `2cf2a3e`). | Frenar y avisar. No reimplementar la suma. |
| WP-C está mergeado: `ProductImage` con `placeholderClassName`, tarjetas 1:1 y `max-w-100` en la banda. | Frenar y avisar. |
| WP-B puede estar mergeado o no. | Si no, `HomeHero` todavía recibe `hasOffers` (paso 27). Si sí, rebasear `admin-nav.ts`, `catalog.ts`, `page.tsx` y `CONTEXT.md`. |
| El `Combobox` del admin no admite crear una opción nueva. | Usar `Input` + `datalist` para el grupo (paso 14). |
| `listCurrentClientTermsByProductIds` de WP-G se puede importar desde el admin sin ciclo. | Escribir una consulta igual en `combo.data.ts`. |

## 13. Preguntas abiertas

Ninguna bloqueante. Quedan dos textos a confirmar en el Re-test, que se pueden cambiar sin código nuevo: el título "Destacados de la semana" (Flavio lo vio en el mockup de la P2) y la bajada de la banda cuando es un combo.

## 14. Estado de QA al terminar

Cargar en `scripts/qa-ticket-triage.data.ts` (WP0), con la nota **arriba**:

- **#101 → Re-test.**
  > `[fecha · triage] Implementado en <commit>. Mirar: en el home, la sección "Destacados de la semana" (sin chips Todos/kg/unidad) muestra combos y productos en el orden de /admin/home-offers ("Destacados"); la tarjeta del combo muestra mosaico, nombre, descripción, selector [1 persona][2 personas] si hay combos del mismo grupo (o "Para N personas"), productos con cantidad y precio de hoy, "Esta semana no está: …" si falta alguno, "Total hoy" y "Sumar combo"; al sumar, cada producto entra como una línea del pedido (se suma a lo que ya había) y se puede cambiar o quitar; la banda "Destacado" puede ser un producto o un combo. Precondiciones: al menos dos combos del mismo grupo cargados en /admin/combos (por ejemplo 1 y 2 personas) y uno agregado en Destacados; para "Esta semana no está", un combo con un producto sin precio vigente.`
- **Si Flavio todavía no cargó combos en la DB compartida cuando se cierre el WP:** el orquestador decide si deja #101 en Re-test con la precondición o lo pasa a **Bloqueado** con "Falta cargar los combos (Flavio)".
- **#72:** ya queda como "Superado por #101" en el triage (WP0/WP1). Solo verificar que la transición esté y no repetirla.

## 15. Hecho significa e instrucciones para quien implementa

- **Ejecutar con `q-code-implement`** en un worktree (`isolation: "worktree"`), rama `wpd-combos-featured`.
- **Orden de los commits:**
  1. §7.1 (modelo y migración);
  2. §7.2 (lógica pura con sus tests, primero en rojo);
  3. §7.3;
  4. §7.7, el servidor;
  5. §7.4;
  6. §7.5;
  7. §7.6 + §7.7, el cliente;
  8. §7.8;
  9. §7.9.
- Commits chicos, en inglés, con el trailer del repo.
- **Prohibido:**
  - correr `db:migrate`, `db:seed:*` o scripts contra la DB compartida;
  - SQL a mano en la compartida;
  - push o deploy.
- Los e2e solo corren contra la DB local.
- **Hecho significa:**
  - los pasos 1 a 42 implementados;
  - §9 en verde;
  - la mini review aplicada;
  - el merge `--no-ff` a `main`;
  - el registro de ejecución en el **registro del orquestador** (§13 de la orquestación, no en este plan);
  - la transición de §14 cargada;
  - la migración de contracción anotada como pendiente en §13 de la orquestación.
