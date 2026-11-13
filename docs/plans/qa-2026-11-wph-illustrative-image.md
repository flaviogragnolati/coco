# Plan reducido: WP-H, leyenda "Imagen ilustrativa" en las fotos de producto (#90)

> **Estado:** Working. Simple grill del 13/11/2026. Flavio contestó las 4 preguntas a través del orquestador y eligió la opción recomendada en todas.
> **Origen:**
> - `docs/plans/qa-open-tickets-2026-11-orchestration.md` (§6 WP-H, §7);
> - `docs/plans/qa-open-tickets-2026-11-report.md` (fila #90).
>
> **Base:** `main` con **WP-C ya mergeado** (`docs/plans/qa-2026-11-wpc-product-card.md`). Después de WP-C, `ProductImage`:
> - es 1:1, con `bg-center bg-contain bg-no-repeat` y sin color de fondo propio (toma el de la superficie);
> - tiene el prop `placeholderClassName`;
> - recibe en `className` solo la forma.
>
> Si al arrancar WP-C no está en `main`, frenar y avisar al orquestador. WP-H va en la ola 4, después de WP-D: los datos que alimentan las tarjetas de la home pueden haber cambiado (ver §4.3, paso 9).

## 1. Objetivo

Todas las fotos grandes de producto llevan la leyenda "Imagen ilustrativa" escrita encima:
- abajo a la derecha;
- con un tamaño del 2,5 % del ancho y un mínimo legible de 9 px;
- en un tono oscuro del color de fondo de las fotos de la categoría del producto.

El archivo de la foto no se modifica.

## 2. Decisiones

| Tema | Decisión | Fuente |
| --- | --- | --- |
| Overlay o estampado | **Texto encima de la foto, en pantalla.** El archivo guardado no se toca: la "original" del ticket es la única versión que existe. Cubre las fotos ya cargadas y las pegadas por URL, y cambia de color sola cuando cambia la categoría. Si alguien descarga o comparte la foto, la descarga sale sin leyenda. | Flavio, 13/11 (P1, opción A) |
| Color | Campo nuevo en la categoría, **"Color de fondo de las fotos"**, opcional, que el admin carga en Admin → Categorías. La app calcula el tono de la leyenda: mismo tono y saturación del color, luminosidad fija del 30 %. Sin color cargado, o con la categoría oculta para el cliente, la leyenda va en **gris oscuro neutro `#4d4d4d`**. | Flavio, 13/11 (P2, opción A) |
| Productos sin foto | **No llevan leyenda.** El recuadro con el ícono no cambia. | Flavio, 13/11 (P3, opción A) |
| Tamaño y dónde aparece | `max(9px, 2,5 % del ancho)`, **solo en las fotos grandes**: tarjeta del catálogo, tarjeta de la home, destacado, foto principal de la ficha y vista previa del admin (foto principal). **No** aparece en Similares, en las miniaturas de la galería de la ficha o de la vista previa, ni en el pedido o el checkout (`CartLineRow`). | Flavio, 13/11 (P4, opción A) |
| Estilo | Sin fondo ni recuadro, con la misma fuente de la app en todas las pantallas, peso medio y una sola línea. | Supuesto aceptado por Flavio, 13/11 |
| Lectores de pantalla | La leyenda es decorativa (`aria-hidden`). El nombre accesible de la foto sigue siendo el nombre del producto. | Supuesto aceptado, 13/11 |
| Foto que no es cuadrada | La leyenda va en la esquina del **cuadro** 1:1, no de la foto. Si la foto queda con bandas, la leyenda cae sobre la banda. | Supuesto aceptado, 13/11 |
| Mosaico de combos (WP-D) | La leyenda va en el mosaico **solo si es fácil**: el mosaico pinta cada foto con `ProductImage` y alcanza con pasar el prop `legend`. Si no, queda fuera y se anota en el registro de ejecución. | Orquestador, 13/11 |

**No se vuelve a discutir:** §2 de la orquestación ni las decisiones de WP-C (fondo de la superficie, 1:1, `contain`).

## 3. Alcance

**Entra:**
- Una migración aditiva: la columna nueva en `category`.
- El ABM de categorías: esquema, servicio, formulario y tabla.
- El color de fondo en los datos del catálogo, la ficha, la vista previa del admin y las tarjetas de la home.
- Un helper puro que calcula el color de la leyenda.
- `ProductImage`, con el prop `legend`, y sus callers grandes.
- Los companions: tests, e2e, tutorial, glosario, `CONTEXT.md` y la transición de QA.

**No entra:**
- Estampar la leyenda en el archivo, guardar dos versiones o regenerar fotos: no hay `sharp` ni procesos nuevos.
- El upload (`src/app/api/admin/product-images/route.ts`), que no cambia.
- `CartLineRow` (pedido, mini-pedido y checkout), `ProductMiniCard` (Similares) y las miniaturas de las galerías.
- Cargar los colores de las 6 categorías reales: lo hace un admin desde el ABM después del deploy.
- Cualquier cambio de las decisiones de WP-C, incluido el fondo blanco de la superficie (ver §5, "Fondo beige").

**No hay que romper:**
- La foto y el nombre abren la ficha (`?product=`).
- El nombre accesible de la foto (`role="img"` + `aria-label` con el nombre del producto).
- El placeholder sin foto, con su tinte y su ícono.
- La auditoría de las categorías (`category.update` guarda el antes y el después).
- El drift test del glosario.
- El tutorial (ADR 0012).

## 4. Pasos (en orden)

### 4.1. Base de datos y ABM de categorías

1. **`prisma/schema.prisma`, `model Category` (195-207).** Agregar `photoBackgroundColor String?`, con el comentario `// Hex #rrggbb of the product photos' backdrop; the illustrative legend derives its tone from it`.
2. **Migración nueva** `prisma/migrations/<timestamp>_category_photo_background_color/migration.sql`:
   - El timestamp se genera al implementar, después de rebasear sobre `main`. WP0, WP-B, WP-D y WP-F suman migraciones antes.
   - Contenido:
     ```sql
     -- Additive only, no backfill: an admin loads each category's color; null draws the legend in neutral gray.
     ALTER TABLE "category" ADD COLUMN "photoBackgroundColor" TEXT;
     ```
   - **La aplica Flavio en la DB compartida** (`pnpm db:migrate`) antes del deploy del código que la lee (§9 de la orquestación).
   - Correr `pnpm db:generate`.
3. **`src/schemas/admin/category.schemas.ts`:**
   - Exportar `categoryPhotoBackgroundColorSchema`:
     ```ts
     z.string().regex(/^#[0-9a-fA-F]{6}$/, "Elegí un color válido")
       .transform((value) => value.toLowerCase())
       .nullable()
     ```
   - Usarlo en `categoryCreateInputSchema` como `photoBackgroundColor: categoryPhotoBackgroundColorSchema.default(null)`. `categoryUpdateInputSchema` lo hereda.
   - Agregar `photoBackgroundColor: z.string().nullable()` a `categoryDetailSchema` y a `categoryListItemSchema`.
4. **`src/server/services/admin/category.data.ts`:**
   - `photoBackgroundColor: true` en los dos selects (lista y detalle, ~12 y ~26).
   - Escribir el campo en `createCategory` (~85) y en `updateCategory` (~101).
   - `category.service.ts` no cambia: el detalle parseado ya entra en la auditoría.
5. **`src/features/admin/crud/category/category.mappers.ts`:**
   - `defaultCategoryFormValues.photoBackgroundColor = null`;
   - `categoryDetailToFormValues` copia el campo.
6. **`src/features/admin/crud/category/category-form-dialog.tsx`.** Agregar un `Field` nuevo después del bloque Nombre/Orden (~150-175):
   - Label: **"Color de fondo de las fotos"**.
   - Un `<Input type="color">` controlado con `form.watch`/`setValue`. Cuando el valor es `null`, el input muestra `#ffffff` sin guardarlo.
   - El hex visible al lado y un botón `variant="ghost"` **"Quitar color"** que vuelve a `null`. Se deshabilita cuando ya es `null`.
   - **Muestra:** un recuadro de ~10 × 4 rem con el color de fondo cargado (blanco si es `null`) y el texto "Imagen ilustrativa" en `illustrativeLegendColor(valor)` (paso 7).
   - `FieldDescription`: "El fondo que tienen las fotos de los productos de esta categoría. La leyenda «Imagen ilustrativa» de las fotos usa un tono oscuro de este color; sin color, va en gris oscuro."
   - `FieldError` para el mensaje del esquema.
   - Deshabilitado si `isSubmitting` o si `category?.deleted`, igual que el switch.
7. **`src/features/admin/crud/category/category-table.tsx`.** Columna nueva **"Fondo de fotos"** después de "Nombre" (~30):
   - una muestra de 1 rem redonda con el color, o "—" si no hay;
   - `aria-label` con el hex.

### 4.2. Color de la leyenda (lógica pura y tests primero)

8. **Nuevo `src/features/catalog/product-image-legend.ts`:**
   - `export const ILLUSTRATIVE_IMAGE_LEGEND = "Imagen ilustrativa";`
   - `export const NEUTRAL_LEGEND_COLOR = "#4d4d4d";`
   - `export function illustrativeLegendColor(backdrop: string | null): string`:
     - pasa el hex a HSL, conserva el tono y la saturación, fija la luminosidad en 0,30 y lo devuelve como `#rrggbb` en minúsculas;
     - con `null` o un valor que no es `#rrggbb`, devuelve `NEUTRAL_LEGEND_COLOR`.
   - JSDoc de una línea: "The legend's tone: the backdrop's hue and saturation at 30 % lightness; neutral gray without a backdrop."

   **Nuevo `src/features/catalog/product-image-legend.test.ts`.** Valores calculados al planificar:

   | Fondo | Leyenda |
   | --- | --- |
   | `#e8dcc8` | `#6c542d` |
   | `#e2c8ab` (beige de las fotos del tutorial) | `#724f27` |
   | `#FFD400` (mayúsculas) | `#997f00` |
   | `#c8e6c9` | `#306932` |
   | `#cccccc` y `#ffffff` (grises) | `#4d4d4d` |
   | `null`, `"beige"` y `"#abc"` | `#4d4d4d` |

### 4.3. Datos hasta las tarjetas

9. **El color llega a las vistas de cliente.** La regla es la misma que oculta la categoría: una categoría inactiva o eliminada no da color, y la leyenda va en gris.
   - `src/schemas/catalog.schemas.ts:29`: `catalogCategorySummarySchema` suma `photoBackgroundColor: z.string().nullable()`.
   - `src/server/services/_base/catalog-category.mapper.ts`: `CatalogCategorySource` suma `photoBackgroundColor: string | null` y `toCatalogCategory` lo copia.
   - `src/server/services/catalog/catalog.data.ts:14-20`: `catalogCategorySelect` suma `photoBackgroundColor: true`. Eso cubre el catálogo, la ficha y la vista previa del admin (`product.service.ts:88` usa el mismo record).
   - **Home.** `src/schemas/home.schemas.ts` (`homeOfferSchema`) suma `photoBackgroundColor: z.string().nullable()`.
     - `src/server/services/home/home.data.ts`: `homeOfferProductSelect` suma `category: { select: { id, name, sortOrder, active, deleted, photoBackgroundColor } }`.
     - `home.service.ts` (`mapHomeOffer`, ~32): `photoBackgroundColor: toCatalogCategory(record.product.category)?.photoBackgroundColor ?? null`.
     - **Si WP-D cambió los datos de las tarjetas de la home** (destacados y combos), poner el campo en el tipo que alimenta `HomeOfferCard` siguiendo la misma regla.
   - Arreglar los fixtures que arme el typecheck: `catalog-category.mapper.test.ts`, `home-ranking.test.ts` y otros.

### 4.4. `ProductImage` y sus callers

10. **`src/features/catalog/_components/product-image.tsx`** (estado de WP-C):
    - Prop nuevo `legend?: { backdropColor: string | null }`. Si está presente y **hay foto**, se dibuja la leyenda. Sin el prop, o sin foto, el render es el de hoy.
    - Con leyenda, el `div` de la foto suma `relative @container`, para que el 2,5 % se mida contra su ancho, y un hijo:
      ```tsx
      <span aria-hidden="true" className="pointer-events-none absolute right-[max(6px,3cqw)] bottom-[max(4px,2.5cqw)] select-none whitespace-nowrap font-medium font-sans text-[length:max(9px,2.5cqw)] leading-none" style={{ color: illustrativeLegendColor(legend.backdropColor) }}>
        {ILLUSTRATIVE_IMAGE_LEGEND}
      </span>
      ```
      - Verificar que Tailwind v4 genere `@container` y las clases arbitrarias con `cqw`. Si `text-[length:…]` no compila, usar `style={{ fontSize: "max(9px, 2.5cqw)" }}`.
      - El `role="img"` y el `aria-label={name}` no cambian. Los hijos de un `role="img"` ya son presentacionales, y el `aria-hidden` lo hace explícito.
    - JSDoc del prop, en una línea: "Draws the illustrative-image legend; only for large photos, never thumbnails."
11. **Callers que pasan `legend`** (los demás no cambian):
    - `src/app/(storefront)/products/_components/product-card.tsx` (~42): `legend={{ backdropColor: product.category?.photoBackgroundColor ?? null }}`.
    - `src/features/home/_components/home-offer-card.tsx` (~36), normal y hero, que cubre el destacado: `legend={{ backdropColor: offer.photoBackgroundColor }}`.
    - `src/app/(storefront)/products/_components/product-details-dialog.tsx`, **solo la foto principal** (~130): `legend={{ backdropColor: product.category?.photoBackgroundColor ?? null }}`. Las miniaturas (~148) no lo llevan.
    - `src/features/admin/crud/product/product-preview-dialog.tsx`, **solo la foto principal** (~96): `legend={{ backdropColor: catalogProduct?.category?.photoBackgroundColor ?? null }}`. Sin términos vigentes no hay `catalogProduct` y la leyenda va en gris. Las miniaturas (~108) no lo llevan.
    - **No** se toca `product-mini-card.tsx` ni `cart-line-row.tsx`.
    - **Mosaico de combos (WP-D):** si pinta cada foto con `ProductImage` en un tamaño grande, pasar `legend` con el color de cada producto. Si las fotos son chicas o no usan `ProductImage`, no se toca y se anota en el registro de ejecución.

### 4.5. Companions

12. **Test de componente**, nuevo `src/features/catalog/_components/product-image.test.tsx`. Usa `renderToStaticMarkup`, como `tutorial-scene.test.tsx`, y cubre cuatro casos:
    - con foto y `legend`: aparece "Imagen ilustrativa" con `aria-hidden="true"` y el color calculado en el `style`; el `aria-label` sigue siendo el nombre;
    - con foto y sin `legend`: no hay leyenda;
    - sin foto y con `legend`: no hay leyenda, y sigue "Sin imagen para …";
    - con `backdropColor: null`: el color es `#4d4d4d`.
13. **Tests del ABM, `src/server/services/admin/category.service.test.ts`:**
    - crear con `#E8DCC8` guarda `#e8dcc8`;
    - editar a `null` lo borra;
    - la auditoría de `category.update` lleva el color en el antes y en el después;
    - `"#abc"` lo rechaza el esquema.

    Si el archivo prueba el servicio y no el esquema, el caso del esquema va en un `category.schemas.test.ts` nuevo.
14. **e2e** (contra la DB local, §9 y §10 de la orquestación). `prisma/seed.ts` ya le da foto a "Tomate perita fresco" (~1437) y a "Aceite de oliva extra virgen 5L":
    - `e2e/catalog-product-card.spec.ts`: la tarjeta de "Tomate perita fresco" muestra el texto "Imagen ilustrativa" dentro del botón `Ver Tomate perita fresco`. Una tarjeta sin foto, si el seed tiene alguna, no lo muestra.
    - En el mismo spec o en `smoke.spec.ts`: al abrir la ficha de un producto con foto, "Imagen ilustrativa" aparece **una sola vez** en el diálogo, en la foto principal y no en las miniaturas.
    - No se agrega color al seed de test: el e2e mira el texto, no el tono.
15. **Tutorial (ADR 0012).** `src/features/tutorial/tutorial-fixtures.ts:47-51`:
    - las categorías suman `photoBackgroundColor`;
    - `nuts` y `driedFruit` llevan `"#e2c8ab"`, el beige medido en `public/tutorial/*.webp`;
    - `pantry` lleva `null`, porque la miel no tiene foto.

    La escena del catálogo (`catalog-scene.tsx:107`) usa la `ProductCard` real y muestra la leyenda sola. Los textos del tutorial no cambian.

    Correr `tutorial-fixtures.test.ts`, `tutorial-scene.test.tsx`, `tutorial-script.test.ts` y `e2e/customer-tutorial.spec.ts`. Si este último compara capturas o textos de la tarjeta, ajustar lo mínimo.
16. **Glosario del admin, `src/features/admin/glossary/data/catalog.ts`:**
    - `entidad-categoria` (~203-213): agregar al final "Puede tener el color de fondo de las fotos de sus productos, del que sale el tono de la leyenda «Imagen ilustrativa»."
    - **Concepto nuevo**, `concepto-imagen-ilustrativa`:
      - `kind: "concept"`, `section: "catalog"`, `label: "Imagen ilustrativa"`, `term: "Illustrative legend"`, `href: "/admin/categories"`;
      - definición: "La leyenda «Imagen ilustrativa» que la tienda escribe encima de las fotos grandes de producto (tarjetas, destacado, foto principal de la ficha y vista previa), abajo a la derecha. No se graba en el archivo: la foto descargada no la lleva. Su color es un tono oscuro del color de fondo de las fotos de la categoría, o gris oscuro si la categoría no tiene color. No aparece en miniaturas ni en productos sin foto.";
      - `aliases: ["Leyenda de la foto", "Marca de agua"]`.
    - El drift test no lo exige porque no es un modelo ni un enum, pero tiene que seguir en verde.
17. **Docs.** `CONTEXT.md`: *Category* y el término nuevo *Illustrative legend*. Ya los aplicó el grill: solo verificar.

## 5. Casos borde

- **Categoría sin color** (las 6 reales, hasta que un admin las cargue): la leyenda va en `#4d4d4d`.
- **Categoría inactiva o eliminada:** el cliente no la ve, así que tampoco su color. La leyenda va en gris.
- **Producto sin términos vigentes en la vista previa del admin:** no hay `catalogProduct` y la leyenda va en gris.
- **Fondo de la categoría oscuro** (el admin elige, por ejemplo, `#333333`): la leyenda queda oscura sobre oscuro. La muestra del formulario lo deja ver antes de guardar. No se agrega una regla automática, porque el ticket pide "un tono oscuro".
- **Foto que no es cuadrada:** la leyenda va en la esquina del cuadro. En modo oscuro, sobre la banda, un tono oscuro sobre la tarjeta oscura se lee poco. Es aceptable (supuesto aceptado) y no se trata aparte.
- **Producto del pie de la foto en la esquina** (por ejemplo, las almendras sueltas de `almendra.webp`): la leyenda va pegada al borde, a 2,5 % del alto desde abajo, y puede tocar el producto. Es aceptable: el ticket presupone que la foto deja libre el tercio inferior.
- **Fondo beige y fondo de la superficie (WP-C).** Las fotos de ejemplo tienen fondo beige (`#e2c8ab`), no blanco. Con la decisión de WP-C (sin fondo propio, blanco de la tarjeta), una foto 1:1 llena todo el cuadro y no se nota. Una foto que no es cuadrada muestra el recuadro beige dentro de la tarjeta blanca. **Observación para el re-test de #106**; la decisión de WP-C no cambia.
- **Tarjeta angosta** (mobile a 360 px y grilla de la home desde 240 px): rige el mínimo de 9 px. "Imagen ilustrativa" a 9 px mide ~80 px y entra hasta en una tarjeta de 240 px.
- **Imagen pegada por URL o foto ya cargada:** lleva la leyenda igual, porque no depende del upload.
- **Descarga o "copiar imagen":** sale sin leyenda (decisión P1).

## 6. Aceptación

- `pnpm typecheck`, `pnpm test` y `pnpm check` en verde, incluido el drift test del glosario.
- Contra la DB local con la migración aplicada (`pnpm db:migrate`, `db:seed:init` y `db:seed:test`), en verde: `pnpm test:e2e e2e/catalog-product-card.spec.ts e2e/smoke.spec.ts e2e/customer-tutorial.spec.ts`.
- En Admin → Categorías, en la DB local:
  - editar "Frutos secos", elegir `#e8dcc8` y ver la muestra con la leyenda en marrón oscuro;
  - guardar y ver la columna "Fondo de fotos" con la muestra;
  - "Quitar color" vuelve a "—";
  - el registro de auditoría muestra el cambio.
- Revisión visual a 360, 768, 1280 y 1536 px:
  - en `/products`, `/` (grilla y destacado), la foto principal de la ficha y la vista previa del admin (pestañas Tarjeta, Home y Detalle), "Imagen ilustrativa" aparece abajo a la derecha, en una línea y legible;
  - aparece en el tono de la categoría si tiene color, y en gris si no;
  - **no** aparece en Similares, en las miniaturas de la galería, en el pedido, en el mini-pedido, en el checkout ni en los productos sin foto.
- Tutorial: la tarjeta de "Almendra Non Pareil" muestra la leyenda en `#724f27`, y la "Miel pura" (sin foto) no la muestra.
- Mini review: `q-review-code` (dos ejes) y `q-review-comments`.

## 7. Supuestos

| Supuesto | Si no se cumple |
| --- | --- |
| WP-C está mergeado: `ProductImage` con `placeholderClassName`, 1:1 y `bg-contain`. | Frenar y avisar. No rehacer WP-C. |
| Tailwind v4 genera `@container` y las clases con `cqw` (container queries nativas de v4). | Poner `container-type: inline-size` y el `font-size` en `style`. |
| Todas las fotos de una categoría comparten el color de fondo, como las del tutorial. | El color es "el de la mayoría". Si una categoría mezcla fondos, se elige el más común. Lo decide el admin, no el código. |
| Los datos que alimentan `HomeOfferCard` siguen pasando por `home.service.ts` después de WP-D. | Poner `photoBackgroundColor` donde WP-D arme el dato de la tarjeta, con la misma regla de `toCatalogCategory`. |

## 8. Preguntas abiertas

Ninguna.

## 9. Estado de QA al terminar

La transición se agrega a `scripts/qa-ticket-triage.data.ts` (WP0). La nota va **arriba**, sin borrar la anterior.

- **#90 → Re-test.** Nota:
  > `[fecha · triage] Implementado en <commit> como leyenda en pantalla (no se modifica el archivo; decisión de Flavio del 13/11). Mirar: "Imagen ilustrativa" abajo a la derecha en tarjetas del catálogo y la home, destacado, foto principal de la ficha y vista previa del admin; tamaño 2,5 % del ancho con mínimo de 9 px; color = tono oscuro del "Color de fondo de las fotos" de la categoría (Admin → Categorías), gris oscuro si no tiene; no aparece en miniaturas, Similares, pedido/checkout ni en productos sin foto; cambiar la categoría o su color cambia la leyenda al recargar. La foto descargada no lleva la leyenda (por diseño). Precondiciones: migración aplicada y al menos una categoría con color cargado.`
- **Observación para el re-test de #106** (WP-C). Se agrega a su nota si sigue abierto: `Las fotos con fondo de color (beige) que no son cuadradas muestran ese fondo como un recuadro dentro de la tarjeta blanca; es esperado (fondo de la superficie, WP-C).`

## 10. Hecho significa

- Los pasos 1 a 17 implementados en una rama de WP-H, con commits chicos.
- La aceptación de §6 en verde.
- La mini review aplicada.
- El merge `--no-ff` a `main`.
- Flavio avisado de que tiene que aplicar la migración en la DB compartida **antes** del deploy, y de cargar los colores de las 6 categorías desde el ABM.
- El registro de ejecución agregado a este plan, con la decisión sobre el mosaico de combos, y una fila en §13 de la orquestación.
- La transición de §9 cargada en el script de triage.
