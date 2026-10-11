# Reporte: tickets de QA nuevos #84–#89 (2026-10-11)

> **Fuente:** `/admin/qa-tickets` (tabla `qa_ticket`). Hay 6 `pending` nuevos (#84–#89), creados el 10/10 en las secciones "Home y Catálogo" y "Catálogo". Los #70–#83 siguen en `pending`, pero están implementados y solo esperan el re-test (ver `qa-open-tickets-2026-10-report.md`).
> **Estado:** decisiones alineadas con Flavio el 2026-10-11. Este reporte es el insumo del plan de ejecución. Quedan abiertos el registro con fecha de #86, el grill de B11 y la revisión del mapeo de categorías.
> **Glosario (pendiente, va con la implementación):** en `CONTEXT.md` se agregan *Category* y *Presentation*. Cambian *Unit price* (pasa a ser el precio que se cobra), *Client terms* y *MOQ*, y en *Similar product* se borra "the catalog has no category".

## Tickets nuevos

| Ticket | Título | Problema | Solución propuesta (decisiones tomadas) | Esf. |
| --- | --- | --- | --- | --- |
| #84 | Reordenar la ficha (home y catálogo) | Precio y unidad van en dos líneas. El `mt-auto` (`home-offer-card.tsx:104`) empuja el selector al fondo y deja un hueco. "1 unidad" queda suelto a la derecha del stepper (`quantity-stepper.tsx:91`), sin plural ("16 unidad"). | **Panel de compra compartido** entre la tarjeta del home, la banda "Producto destacado" y la tarjeta de /products (#85). En orden: precio en una línea ("$ 19.500 por kg"), `QuantityStepper` en tamaño grande y centrado con la unidad como sufijo del input, total pegado debajo y botón de ancho completo. El espacio libre queda **arriba del precio**, así los botones de una fila se alinean. La marca aparece chica sobre el nombre, solo si existe. La unidad que va adentro del campo ("frasco", "botella") sale de la presentación de #87. El preview del admin (`product-preview-dialog.tsx`) usa las dos tarjetas reales, así que cambia con ellas. | M |
| #85 | Sacar info interna de la ficha del catálogo | MOQ, "por bloque MOQ", "≈ $X / unidad", el chip ARS (`product-price-block.tsx`) y "Marca disponible próximamente" (`product-card.tsx:62`). "Agregar" suma el MOQ. El ojo abre el diálogo. "Presentación del proveedor: …" **es un dato**: el parser de Quintal (`quintal-catalog.parser.ts:1037`) la escribió en `Product.description` de los 88 productos. | La tarjeta usa el panel de #84. La foto y el nombre abren el detalle `?product=`, que sigue siendo un diálogo, y se va el ojo. **Alcance: todas las vistas del cliente:** el diálogo de detalle (se va la tabla MOQ/Step/Máximo y el chip ARS), la línea del pedido y el mini-carrito (se van los badges MOQ/Step y "Sin marca"), los chips de moneda del checkout y el subtítulo "ajustá cantidades por MOQ". **Se quita la vista tabla** de /products. **Ya en el pedido:** igual que el home, "✓ Ya tenés N en tu pedido" + "Ver en tu pedido". El parser deja de generar la frase y un script la saca de las descripciones (ver #87, presentación del proveedor). Hay que actualizar los casos de QA #5 y #6, que citan "por bloque MOQ" y "Agregar". | M |
| #86 | Actualización masiva de precios | No hay importación ni historial de precios. El precio se edita en el lugar en `/admin/product-terms` y deja una fila en `AuditLog`, sin pantalla. Los pedidos pagados **ya** conservan su precio (`UserOrderItem.priceSnapshot` y `UserTransaction.amount`). No hay SKU y el nombre no es único. | El admin **descarga la planilla** (`.xlsx`: id, nombre, unidad, categoría, precio actual, precio nuevo), la edita y la sube (`.xlsx` o `.csv`). Los productos se cruzan **por id**. La planilla actualiza **precio y categoría de productos existentes**, sin altas. La vista previa muestra el precio actual, el nuevo y la variación %. Es **todo o nada**: con un error no se confirma nada. Las filas sin cambio se ignoran y una variación de más de ±30 % se marca sin bloquear. El precio es el **precio por unidad** (#87). Se edita en el lugar, en una transacción, **sin cerrar los términos**, porque cerrarlos invalida los carritos abiertos (`checkout.service.ts:143`, `cart.service.ts:278`). `fflate` y `fast-xml-parser` pasan a `dependencies`, y el lector xlsx de `scripts/lib` se mueve a `src`. **"Cada cambio queda registrado con fecha": diferido por Flavio, queda abierto.** Mientras tanto, cada cambio deja su fila en `AuditLog`. | L |
| #87 | Unidad, paso y mínimo por producto | Las cantidades son `Decimal(18,4)` en toda la cadena, así que **el 0,5 ya funciona sin migración**. Quintal tiene mínimo 1 y paso 1. No existe la presentación: `piece` se muestra como "unidad". El total se calcula por bloques (`calculateLineTotal`) y coincide con precio × cantidad solo si los precios son coherentes. El input **rechaza "1,5"** (`Number("1,5")` es NaN y vuelve al mínimo). La presentación del proveedor se filtra al cliente por la descripción. | **Precio por unidad como único precio que carga el admin.** El precio del mínimo y el del paso se calculan (unidad × mínimo, unidad × paso) y el total siempre es precio × cantidad. **Paso 0,5 y mínimo 0,5** en todos los productos por kg; los que se venden por unidad siguen de a 1. **Mínimo y paso siguen siendo dos campos**: el form propone mínimo = paso, el máximo es opcional y la cantidad fija sigue siendo paso vacío. **Presentación:** el admin elige un envase de una lista cerrada (botella, bidón, frasco, bolsa, paquete, unidad) y escribe el tamaño ("0,5 L"). El plural es automático ("2 frascos 370 g"). Los productos por kg no llevan presentación. Se muestra en la ficha, el pedido, el checkout y Mis pedidos. El snapshot del pedido guarda la presentación, y los pedidos viejos muestran la unidad. **Presentación del proveedor:** campo interno en los términos de proveedor, visible solo en el admin, que se completa con lo que hoy está en la descripción. El input acepta coma decimal. `ProductUnit` no cambia. | L |
| #88 | Filtro por categoría | No existe la categoría. /products filtra en el cliente (`catalog-filtering.ts`, `filterCatalog`), con estado en la URL (`use-catalog-params.ts`). El contador sale de la lista filtrada. | Param `categoria` en la URL, predicado en `filterCatalog` y `ToggleGroup` single sobre la grilla, como los chips de unidad del home (`home-offers-grid.tsx`): "Todos" más las categorías activas que tienen productos, calculadas sobre todo el catálogo para que los chips no salten al buscar. Se oculta si hay menos de 2. "Todos" y "Limpiar filtros" lo resetean. Combina con búsqueda, orden y los filtros del sidebar. **Depende de #89.** | S |
| #89 | Asignar categoría a cada producto | No hay columna ni modelo. Las 29 cabeceras del Excel de Quintal quedan en `quintal-catalog.data.ts` y nunca llegan a la DB (`seed-init.ts:99`). | **Tabla `Category` con ABM en el admin, como Marca** (nombre, orden, activa), con **6 categorías**: Frutos secos, Mixes y snacks, Frutas desecadas, Semillas y granola, Aceites y despensa y **Suplementos**. FK obligatoria en Product, select en el form, columna en la tabla del admin y columna en la planilla de #86. Backfill de los 88 de Quintal con el mapeo de abajo. El pipeline de Quintal suma `categoryMap` y excepciones por producto en `quintal-catalog.overrides.ts`. Hay que actualizar el glosario (entidad + ítem de nav, por el drift test), `CONTEXT.md` y `docs/schema-reference.md`. | M |

## Ítems nuevos surgidos del análisis

| Ítem | Título | Descripción | Solución propuesta | Esf. |
| --- | --- | --- | --- | --- |
| B11 | El mínimo del proveedor se mira línea por línea | `resolveAssignments` (`operation-execution.service.ts:143`) compara **cada línea sola** con el mínimo del proveedor y recién después `groupAssignments` (l.556) agrupa por proveedor, producto y destino. Verificado el 2026-10-11 con la función real y los términos de Quintal (10 kg): 20 × 0,5 kg → 0 asignado; 2 × 5 kg → 0 asignado; 1 × 12 kg → 10 asignados y 2 a roll over. Con Quintal, una operación no compra nada salvo líneas de 10 kg o más. Ya estaba anotado en `docs/schema-reference.md` §10 y no tiene test. | **Grill de diseño aparte** (decisión de Flavio), antes de la primera operación real con Quintal. Hay que definir: sumar por producto y destino y comparar contra el mínimo, a quién se le recorta el sobrante (¿LIFO por fecha de pago, como el *cut absorption*?), qué muestran la revisión de la operación y el cliente, y cómo convive con los roll overs reincorporados. No frena #84–#89. | L |
| B12 | Purga de datos demo | En la DB compartida quedan 11 productos demo (9 activos) con 5 proveedores. Inventario de solo lectura del 2026-10-11: **todo lo transaccional es demo**, es decir 34/34 pedidos, 36 transacciones, 16 operaciones, 23 órdenes de proveedor, 29 paquetes, 24 envíos, 10 órdenes de transporte, 63 roll overs y 273 eventos de tracking. Se mezcla con Quintal un solo pedido de QA (y 2 carritos). Un producto demo está fijado en el home. | **Reset transaccional + catálogo demo** (decisión de Flavio). Un script con dry-run por defecto y `--apply` en una sola transacción borra pedidos, carritos, pagos, operaciones, órdenes de proveedor, paquetes, envíos, órdenes de transporte, roll overs, tracking, los productos demo con sus términos y restricciones, los 5 proveedores demo y sus marcas. **Se conservan:** usuarios, Quintal, tickets y evidencia de QA, config de pagos, documentos legales, puntos de retiro, transportistas, destinos, auditoría y outbox. **Lo corre Flavio.** Hay que reescribir los casos de QA 7 (MOQ, step y máximo) y 8 (cantidad fija), que solo se podían probar con productos demo. | S |

## Mapeo de categorías de Quintal (borrador, revisar antes del backfill)

Va por cabecera del Excel, con excepciones por producto marcadas con *.

| Categoría | Cabeceras | Excepciones | Total |
| --- | --- | --- | --- |
| Frutos secos | ALMENDRA (salvo harinas y bañadas), AVELLANAS, CASTAÑAS DE CAJÚ, MANI (salvo pasta y bañado), NUEZ (salvo las 3 de 500 g), PISTACHOS | *Piñones (viene de SEMILLAS) | 24 |
| Mixes y snacks | MIX DE FRUTOS SECOS, BANANA CHIPS, MAIZ FRITO | *Almendras bañadas en chocolate con leche, *Maní bañado en chocolate semiamargo, *Nuez pecán garapiñada 500 g, *Nuez pecán con chocolate negro 500 g, *Nuez pecán con chocolate blanco 500 g, *Bocaditos | 15 |
| Frutas desecadas | ARANDANOS, CIRUELA, DATILES, DURAZNO, EMPAQUE MIXTO, FRUTA CUBETEADA, HIGOS SECOS, PASA DE UVA, PERA, TOMATE | *Coco rallado fino MED FAT, *Coco rallado fino HIGH FAT, *Coco en escamas | 21 |
| Semillas y granola | SEMILLAS (salvo piñones), GRANOLA | | 8 |
| Aceites y despensa | ACEITE OLIVA EXTRA VIRGEN, CACAO, CHOCOLATE, SAL ROSADA, HONGO SECO, FLORES | *Aceite de coco virgen 200 cc y 360 cc, *Harina de coco, *Harina de almendra con piel, *Harina de almendra sin piel, *Pasta de maní 370 g | 15 |
| Suplementos | OTROS (salvo Bocaditos) | Aceite de cannabis 10 ml 15%, Cordyceps, Cola de pavo, Maca Kalpa, Maca negra | 5 |

Casos dudosos para revisar: tomate seco (frutas desecadas o despensa), chocolate pins (despensa o snacks), coco rallado y escamas (frutas desecadas o despensa) y las flores de hibiscus y manzanilla (infusiones, hoy en despensa).

## Decisiones

**De Flavio (2026-10-11):**

1. #87: paso y mínimo de 0,5 en todos los productos por kg.
2. #87: la presentación se arma con un envase de lista cerrada y un tamaño, con plural automático.
3. #87 y #86: el admin carga solo el precio por unidad.
4. #87: la presentación del proveedor pasa a un campo interno de los términos de proveedor.
5. #87: mínimo y paso quedan en dos campos, iguales por defecto.
6. #85: la limpieza abarca todas las vistas del cliente.
7. #85: se quita la vista tabla de /products.
8. #85: cuando el producto ya está en el pedido, la ficha del catálogo se comporta igual que la del home.
9. #89: las categorías van en una tabla con ABM, como Marca.
10. #89: se agrega una sexta categoría, "Suplementos", y Bocaditos va a Mixes y snacks.
11. #86: los productos se cruzan por id, con la planilla descargada.
12. #86 y #89: la planilla actualiza precio y categoría de productos existentes, sin altas.
13. #86: el registro con fecha se difiere y queda abierto.
14. B12: reset transaccional + catálogo demo, con un script que corre Flavio.
15. B11: va a un grill de diseño aparte.

**Definidas en el análisis (se pueden corregir):**

- El espacio libre de la ficha va arriba del precio.
- La marca solo aparece si existe.
- El detalle sigue siendo el diálogo `?product=`.
- Los chips de categoría se calculan sobre todo el catálogo.
- La planilla se descarga en `.xlsx` y se sube en `.xlsx` o `.csv`.
- La planilla es todo o nada, ignora las filas sin cambio y marca una variación de más de ±30 %.
- `ProductUnit` no cambia.
- Los precios se editan en el lugar, sin cerrar los términos.

## Orden sugerido

1. B12, el script de purga, que lo corre Flavio. Libera #89 de los productos demo sin categoría.
2. #87: modelo de precio por unidad, presentación, paso 0,5, coma decimal y presentación del proveedor.
3. #84 + #85: el panel compartido y la limpieza de las vistas del cliente.
4. #89 → #88: la categoría y el filtro.
5. #86: la planilla de precio y categoría.
6. B11 en paralelo: grill de diseño.

## Datos que hay que migrar (en la DB compartida, los corre Flavio)

- **Términos de cliente de los 73 productos de Quintal por kg:** mínimo y paso 0,5, con precio del mínimo y precio del paso = precio por unidad × 0,5. Las cantidades que ya están en carritos (1, 2…) siguen siendo múltiplos válidos.
- **Presentación de los 15 productos de Quintal por unidad**, armada a partir del nombre (por ejemplo "botella 0,5 L", "frasco 370 g", "bolsa 500 g"). Después el admin la puede cambiar.
- **Descripciones:** se borra "Presentación del proveedor: …" y ese texto pasa al campo interno de los términos de proveedor.
- **Categorías:** backfill con el mapeo de arriba.

## Companions

- **e2e:** en `e2e/home-offer-quantity.spec.ts` cambian el aria-label `Cantidad en …`, el prefijo "Total" y el encabezado de la tarjeta. Revisar también `e2e/smoke.spec.ts`. No hay e2e del catálogo; conviene sumar uno para #85 y #88.
- **Vitest:**
  - `home-formatters.test.ts`
  - `commerce.helpers.test.ts`: casos de 0,5 y de coma decimal
  - `quintal-catalog.parser.test.ts`: la descripción con "Presentación del proveedor"
  - `catalog-filtering.test.ts`
  - `home-offers-filter.test.ts`
  - test nuevo de `resolveAssignments` (B11)
- **Glosario:** entidad `Category` más ítem de nav (drift test, `glossary.data.test.ts`), y la entrada de producto.
- **Documentación:**
  - `docs/schema-reference.md`: Product, ProductClientTerms, ProductSupplierTerms y Category
  - `CONTEXT.md`
  - `catalog-filtering.ts:184`, que dice "the catalog has no category"
- **Casos de QA:** actualizar el texto de #5 y #6 (MOQ, "Agregar"). Reescribir #7 y #8 después de B12. Correr `pnpm qa:seed`.

## Registro de ejecución (2026-10-11)

**Estado:** #84, #85, #86, #87, #88, #89 y B12 implementados y mergeados en `main` (sin push). B11 sigue para su grill de diseño. Falta que Flavio corra las migraciones y los scripts de datos en la DB compartida, y el re-test de QA.

| Ítem | Merge | Qué quedó |
| --- | --- | --- |
| B12 | 891012e | `pnpm db:purge-demo`: dry-run por defecto, `--apply` en una transacción, `--confirm-production` si `APP_ENV=production`. Borra lo transaccional y el catálogo demo; lo dudoso queda "sin clasificar" y no se borra. Casos QA 7 y 8 reescritos para Quintal. |
| #89 | 1e2e06d | Tabla `Category` (migración `20261011100000_category`, inserta las 6), ABM en `/admin/categories`, select obligatorio en el form, columna en la tabla, `category` en el DTO del catálogo. `categoryMap` + excepciones en los overrides de Quintal; `pnpm db:backfill:categories`. El mapeo da 24/15/21/8/15/5, igual al borrador. |
| #88 | 8b0c343 | Param `?categoria=<id>`, chips sobre la grilla calculados con todo el catálogo, ocultos con menos de 2; se combinan con búsqueda, orden y sidebar. |
| #87 | 3acb582 | Precio por unidad como único precio; total = precio × cantidad (redondeo a centavos half-up). Presentación (`presentationContainer` + `presentationSize`, migración `20261011110000_product_presentation`) con plural automático y en el snapshot del pedido. `supplierPresentation` interna. Coma decimal en el input. `pnpm db:migrate-unit-pricing`. |
| #84 + #85 | 18bb23d | Panel de compra compartido (home, destacado, /products y diálogo). Sin MOQ, bloque, chips de moneda ni "Sin marca" en las vistas del cliente; sin vista tabla; "Ya tenés N en tu pedido". Casos QA 5 y 6 reescritos. |
| #86 | 006a157 | Planilla en `/admin/product-terms`: descarga `.xlsx`, sube `.xlsx`/`.csv`, vista previa, todo o nada, ±30 % marcado, edición en el lugar con `AuditLog` por cambio (`batchId`). `fflate` y `fast-xml-parser` en `dependencies`; lector xlsx en `src/server/lib/xlsx`. |

**Mini review:** `q-review-code` en dos pasadas (estándares y especificación) por ola: *pass with findings*, sin blockers. Correcciones en e8a03fc (ola 1: step en edición, redondeo, re-ejecución del script de precios, `--force` del backfill, nombres de categoría únicos, duplicaciones) y b0d10e6 (ola 2: re-subir la planilla sin tocar con categoría inactiva, escritura de categorías en lote, tope de upload por streaming y de descompresión, respuestas validadas, términos de checkout `checkout-v3`). `q-review-comments`: *pass with findings*, aplicados (se borraron marcadores de pasos en una migración).

**Evidencia:** `pnpm typecheck` ok; `pnpm test` 123 archivos, 1836 tests ok; `pnpm check` ok. Playwright no se corrió (necesita servidor y DB): specs nuevos `e2e/catalog-category-filter.spec.ts` y `e2e/catalog-product-card.spec.ts`, actualizado `e2e/home-offer-quantity.spec.ts`.

**Desvíos:**
- `product.categoryId` es nullable en la DB y obligatorio en la app hasta que una migración posterior lo pase a NOT NULL, después del backfill y la purga.
- La aplicación de la planilla escribe cada precio con un update condicional y tiene 180 s de timeout. Las categorías van en lote.
- Los términos de checkout pasan a `checkout-v3`, porque el texto decía "por bloque de compra mínima (MOQ)". Es texto de prueba; Flavio confirma la redacción.
- De los 15 productos por unidad de Quintal, 7 reciben presentación inferida. Los otros 8 no nombran envase: aceite de coco 200 cc y 360 cc, Bocaditos, aceite de cannabis, Cordyceps, Cola de pavo, Maca Kalpa y Maca negra. Se cargan en el admin.

**Pasos de Flavio en la DB compartida, en orden** (cada script primero en dry-run y después con `--apply`):
1. `pnpm db:migrate`.
2. `pnpm db:purge-demo`.
3. `pnpm db:migrate-unit-pricing`.
4. `pnpm db:backfill:categories`. Antes, revisar los casos dudosos del mapeo.
5. `pnpm qa:seed`.
6. Cargar la presentación de los 8 productos.
7. Correr `pnpm test:e2e` contra un entorno con datos.

**Seguimientos:**
- Migración NOT NULL de `categoryId`.
- Pantalla de historial de precios: el registro con fecha sigue diferido y por ahora queda el `AuditLog`.
- Grill de diseño de B11.
- Etiqueta del botón: "Agregar" en la tarjeta y "Sumar al pedido" en el diálogo y el home. Hay que unificarla.
- El criterio "ahorro de mercado" del ranking del home usa el ahorro por mínimo, así que los productos por kg ahora compiten con 0,5.
- Coma decimal en los campos numéricos del admin.
- Casos QA 19 (multimoneda) y 32 (usa productos demo), que no se pueden correr después de la purga.
- Columna de moneda en la planilla.
- Sufijo largo truncado en el mini carrito a 360 px.
- El paso "`pnpm db:seed:test`" de la precondición del doc de QA traería de vuelta los datos demo.
- `pnpm catalog:quintal --check` con el Excel: el archivo de datos se transformó sin el `.xlsx`.
