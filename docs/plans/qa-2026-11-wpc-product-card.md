# Plan reducido: WP-C, tarjeta y ficha de producto (#106 y el resto de #107)

> **Estado:** Working. Simple grill del 13/11/2026; Flavio contestó las 4 preguntas por el orquestador.
> **Origen:** `docs/plans/qa-open-tickets-2026-11-orchestration.md` (§6 WP-C, §7) y `docs/plans/qa-open-tickets-2026-11-report.md` (filas #106 y #107).
> **Base:** `main` con **WP-A ya mergeado**. WP-A deja así el diálogo y el resto:
> - En `product-details-dialog.tsx` ya no están "Sin galería adicional" ni el botón "Cerrar".
> - El subtítulo es un `DialogDescription` sr-only y la descripción se oculta cuando repite el nombre.
> - La ✕ dice "Cerrar".
> - "Coco" pasó a "CoCo".
> - `computeUnitFacets` ya no existe.
>
> Si al arrancar WP-A no está en `main`, frenar y avisar al orquestador.
> **Reemplaza en parte a:** `docs/plans/product-card-price-hierarchy.md` (23/10, commit `573f722`).

## 1. Objetivo

Todas las tarjetas de producto y la ficha muestran:
- la foto completa en un cuadrado;
- el precio por paso sin repetir el tamaño del envase;
- el precio por kilo o litro siempre;
- un selector con solo el número en los envasados;
- un botón "Sumar al pedido" sin ícono ni monto.

Lo que se cobra no cambia.

## 2. Decisiones

| Tema | Decisión | Fuente |
| --- | --- | --- |
| Total de la línea | **No se ve ni en la tarjeta ni en la ficha.** Queda la live region sr-only "Total $ X" (`purchase-panel.tsx:223-225`), y el total visible aparece en "Tu pedido", que se abre al sumar. La parte del total de #73 y #84 se anota como "superada por #106". | Flavio, 13/11 (P1, opción A) |
| Productos por peso (kg, gr, lb) | Conservan la cantidad en el precio ("$ 11.300 por 500 g", "por kg") y la unidad en el selector ("0,5 kg"). | Flavio, 13/11 (P2, opción A) |
| Envasados (frasco, botella, bidón, bolsa) | El precio nombra solo el envase: "$ 137.400 por bidón", "por 6 frascos". El selector muestra solo el número: "− 1 +". | Flavio, 13/11 (P2) + ticket #106 |
| Fondo de la imagen | El de la superficie que la contiene (tarjeta, ficha o mini-tarjeta; blanco en modo claro) en todas las pantallas. El gris o el verde quedan solo para el ícono de "sin imagen". | Flavio, 13/11 (P3, opción A) |
| Producto destacado (home) | Foto 1:1, con la tarjeta limitada a ~400 px (`max-w-100`) y centrada en su columna. | Flavio, 13/11 (P4, opción A) |
| Botón | "Sumar al pedido" en todas las superficies, sin ícono. Sale "Agregar" del catálogo. El estado "Ver en tu pedido" también pierde el ícono. | Ticket #106, §6 |
| Precio por kilo o litro | Siempre, también con paso de 1 kg o 1 L ("$ 30.400 por botella" + "$ 30.400 / L"). Solo falta si el tamaño del envase no se puede leer. | Ticket #106, §6 |
| Relleno de la línea del precio por kilo o litro | **Se mantiene** el `&nbsp;` de `purchase-panel.tsx:87-91`, pero solo cubre ese caso borde. **Desvío de §6**, que pedía sacarlo. Sin relleno, una tarjeta con un tamaño ilegible ("2 x 500 g") desalinea los selectores de su fila, y #106 pide que "todas queden alineadas". Aceptado por el orquestador. | Orquestador, 13/11 |
| Imagen | 1:1, completa (`bg-contain`, centrada, sin repetir), en la tarjeta del catálogo, la de la home, el destacado, la mini-tarjeta de similares, la ficha (principal y miniaturas) y la vista previa del admin. | Tickets #106 y #107 |
| Ficha (#107) | Usa el mismo precio, el mismo selector y el mismo botón que la tarjeta: sale todo del `PurchasePanel` compartido. | Ticket #107 |

**No se vuelve a discutir:** §2 de la orquestación, ni lo que WP-A hizo en el diálogo. La línea de cierre del subtítulo de #107 es de WP-B.

## 3. Alcance

**Entra:**
- `ProductImage` y sus 7 usos.
- `PurchasePanel`, `PurchaseActionButton` y `QuantityStepper`.
- `getOfferStepLabel` y `getComparisonPrice`.
- `ProductCard`, `HomeOfferCard`, `HomeSpotlightBand`, `ProductMiniCard` y `ProductDetailsDialog` (la imagen y los skeletons).
- Los callers del botón, incluida la vista previa del admin.
- Los skeletons.
- Los companions: tests, e2e, tutorial, glosario del admin, textos de QA, `CONTEXT.md` y la nota en el plan del 23/10.

**No entra:**
- Lo que se cobra: `calculateLineTotal`, `normalizeCartQuantity`, los pasos y los máximos.
- El carrito, el mini-carrito, el checkout y "Mis pedidos". El selector del carrito conserva la unidad, y `formatUnitLabel`/`formatQuantity` no cambian.
- Los textos "Ya tenés 2 bidones 5 L en tu pedido" y el de cantidad fija ("1 frasco 370 g"), que siguen con el tamaño.
- La línea de cierre de la ficha (WP-B).
- Los combos (WP-D).
- Las presentaciones dentro de la ficha (#108, H2).
- Las columnas de la grilla (`product-grid.tsx`, `home-offers-grid.tsx`).
- `SHOW_MARKET_SAVING`.
- Los badges.

**No hay que romper:**
- Se suma la cantidad elegida en el selector.
- El estado "en tu pedido".
- La foto y el nombre abren la ficha (`?product=`).
- Los botones de una fila de tarjetas quedan alineados (`mt-auto`).
- La línea del precio mantiene nodos de texto separados (fix `4b9348b`).
- El tutorial (ADR 0012).

## 4. Pasos (en orden)

### 4.1. Precios (lógica pura y tests primero)

1. **`src/shared/common/commerce.helpers.ts`, `getComparisonPrice` (~líneas 312-338).**
   - Borrar el corte `if (Math.abs(getStepQuantity(terms) * perUnit.amount - 1) < epsilon) return null;` (líneas 334-335).
   - En el JSDoc, dejar solo "Null when it cannot be read".
   - `epsilon` sigue en uso en otras funciones: no borrarlo.
2. **`src/shared/common/commerce.helpers.test.ts` (~540-580).**
   - Los casos "a 1 kg step repeats the step price", "a 1 L bottle…" y "a 1 kg bag…" pasan a esperar `{ amount: 7850, measure: "kg" }`, `{ amount: 9000, measure: "L" }` y `{ amount: 9000, measure: "kg" }`.
   - Renombrarlos, por ejemplo "a 1 kg step still compares per kg".
3. **`src/features/home/home-formatters.ts`, `getOfferStepLabel` (66-73).**
   - Para unidades que no son de peso, armar el rótulo con la presentación **sin tamaño**: `{ presentationContainer: offer.presentationContainer, presentationSize: null }`.
     - Paso 1: `por ${formatUnitLabel(1, unit, sinTamaño)}` → "por bidón".
     - Paso mayor: `por ${formatQuantity(step, unit, sinTamaño)}` → "por 6 frascos".
   - Las ramas de peso no cambian ("por 500 g", "por kg", "por 1,5 kg", "por 250 gr").
   - Actualizar el JSDoc (62-65) con los ejemplos nuevos.
   - **No tocar `formatUnitLabel`**, que la usa el carrito.
4. **`src/features/home/home-formatters.test.ts`.**
   - En el `test.each` de `getOfferStepLabel` (~61-100): "one jar" → `"por frasco"`; "several jars" y "no step falls back…" → `"por 6 frascos"`.
   - Agregar el caso `bidon` + `"5 L"` → `"por bidón"`.
   - En el test del comparativo (~102-130): `{ ...halfKilos, step: "1" }` pasa a esperar `{ amount: "$ 22.600", measureLabel: "/ kg", spokenLabel: "por kg" }`, y la botella de 1 L pasa a esperar su valor en "/ L".
   - Renombrar el test ("…and shown even when it equals the step").
5. **`src/features/catalog/purchase-panel.ts`.** Agregar el helper puro `showsQuantityUnit(unit: CatalogProductUnit): boolean` = `isWeightUnit(unit)`. Decide si el selector de una tarjeta o de la ficha muestra la unidad.
6. **`src/features/catalog/purchase-panel.test.ts`.**
   - `:51` `"por frasco 370 g"` → `"por frasco"`.
   - "a whole kilo step has no comparison line" pasa a esperar el comparativo.
   - Tests de `showsQuantityUnit`: kg, gr y lb dan `true`; `piece` y `box` dan `false`.

### 4.2. Selector y panel compartido

7. **`src/features/cart/_components/quantity-stepper.tsx`.**
   - Prop nuevo `showUnit?: boolean`, por defecto `true`: el carrito no cambia.
   - Con `false` no se renderiza el `<span>` del sufijo (122-124) y el número queda centrado. El `<label>` ya es `justify-center`; revisar que el ancho en `ch` del input no lo corra.
   - El `aria-label` del input ("Cantidad (bidones 5 L)") **se mantiene**: el lector de pantalla sigue escuchando la unidad.
   - Documentar el prop en una línea.
8. **`src/features/catalog/_components/purchase-panel.tsx`.**
   - `PurchaseActionButton` (103-150):
     - sacar `ShoppingCartIcon` (y su import) y el prop `total` con su render (139-145);
     - sacar el prop `addLabel`: el texto queda fijo, "Sumar al pedido".
   - `PurchasePanel`:
     - pasar `showUnit={showsQuantityUnit(unit)}` al `QuantityStepper`;
     - actualizar el JSDoc (168-171): la acción ya no lleva el total;
     - la live region sr-only `getOfferTotalLabel` (223-225) **queda**.
   - `PurchasePrice`: el relleno `&nbsp;` (87-91) **queda**. Cambiar el comentario: "Only an unreadable presentation size lands here; holds the line so the steppers of a row stay aligned."
9. **Callers del botón:**
   - `src/app/(storefront)/products/_components/catalog-product-purchase.tsx`: sacar `addLabel`, `total` y el import de `getOfferTotalAmount`.
   - `src/app/(storefront)/products/_components/product-card.tsx:70`: sacar `addLabel="Agregar"`.
   - `src/features/home/_components/home-offer-add-button.tsx:44`: sacar `total` y el import.
   - `src/features/admin/crud/product/product-preview-dialog.tsx:250-259`: sacar `total` y los imports que queden sin uso (`getOfferTotalAmount`, quizás `homeOfferTerms`).
   - Después, si `getOfferTotalAmount` solo la usan `getOfferTotalLabel` y los tests, dejarla como está; no hace falta un refactor.

### 4.3. Imagen 1:1 completa

10. **`src/features/catalog/_components/product-image.tsx`.**
    - Prop nuevo `placeholderClassName?: string`.
    - **Con imagen:** `cn("bg-center bg-contain bg-no-repeat", className)`, sin color de fondo. Queda el de la superficie: blanco de la tarjeta o del diálogo en modo claro.
    - **Sin imagen:** `cn(className, placeholderClassName)`.
    - Los callers pasan en `className` solo la forma (aspecto, ancho, redondeo, flex/centrado) y en `placeholderClassName` el tinte y el color del ícono.
11. **Callers de `ProductImage`.** En todos se van `bg-center bg-cover` y el color de fondo pasa a `placeholderClassName`:
    - `product-card.tsx:43`: `aspect-3/2` → `aspect-square`; placeholder `bg-muted text-muted-foreground`.
    - `home-offer-card.tsx:37-40`: `aspect-3/2` y `aspect-4/3` (hero) → `aspect-square` en los dos tamaños; placeholder `bg-brand-soft text-brand-soft-foreground`.
    - `product-mini-card.tsx:40`: ya es `aspect-square w-16`; placeholder `bg-muted text-muted-foreground`.
    - `product-details-dialog.tsx`: imagen principal (~131, `aspect-4/3` → `aspect-square`) y miniaturas (~149, ya cuadradas). Placeholder `bg-muted text-muted-foreground`. Las líneas pueden haberse corrido con WP-A.
    - `product-preview-dialog.tsx:97` (`aspect-[4/3]` → `aspect-square`) y `:109`: placeholder `bg-muted text-muted-foreground`.
12. **Destacado.** En `src/features/home/_components/home-spotlight-band.tsx:27-37`, envolver `HomeOfferCard` en `<div className="mx-auto w-full max-w-100">` (400 px) para que la franja no crezca.
13. **Skeletons:**
    - `products-client.tsx:56` `aspect-3/2` → `aspect-square`.
    - El skeleton de carga del diálogo (`product-details-dialog.tsx` ~101) `aspect-4/3` → `aspect-square`.

### 4.4. Companions

14. **e2e** (son los 6 checks del monto en el botón):
    - `e2e/catalog-product-card.spec.ts`:
      - `:17` y `:67`: `{ name: /^Agregar.*\$/ }` → `{ name: "Sumar al pedido", exact: true }`;
      - `:68` y `:72` (comparan el texto del botón): comparar el texto de la live region `card.getByText(/^Total /)` antes y después de "+";
      - `:62`: actualizar el comentario ("the total is for screen readers only; it shows in the order");
      - **agregar:** la caja del botón de la imagen (`card.getByRole("button", { name: \`Ver ${name}\`, exact: true })`) es cuadrada (`|width − height| < 2`).
    - `e2e/home-offer-quantity.spec.ts`:
      - `:7` y `:42` → `{ name: "Sumar al pedido", exact: true }`;
      - `:43` y `:47`: igual que arriba, con la live region;
      - `:40`: actualizar el comentario.
    - `e2e/smoke.spec.ts:57` y `:116` → `{ name: "Sumar al pedido", exact: true }`.
    - **Agregar** en `smoke.spec.ts` (destacado): la tarjeta del band mide como máximo 401 px de ancho en un viewport de 1280.
15. **Tutorial (ADR 0012):**
    - `src/features/tutorial/tutorial-script.ts:141`, cuerpo de `stepQuantity`: "Con − y + sumás o restás de a 500 g desde el mínimo. El botón te muestra el total antes de agregar." → "Con − y + sumás o restás de a 500 g desde el mínimo. Al sumar, ves el total en tu pedido."
    - `stepPrice` (133-134) sigue valiendo: el producto de la escena es por kg.
    - `catalog-scene.tsx` no necesita cambios propios. Renderiza el `ProductCard` real y queda sobre el estado de WP-A, sin `computeUnitFacets`; verificar que compila y que el target `product-purchase` sigue en `[data-slot="card-content"]`.
    - `tutorial-fixtures.ts` no cambia: la "Miel pura frasco 500 g" se va a ver como "por frasco" + "$ X / kg".
    - Correr `tutorial-script.test.ts`, `tutorial-fixtures.test.ts` y `e2e/customer-tutorial.spec.ts`.
16. **Glosario del admin, `src/features/admin/glossary/data/catalog.ts`:**
    - `concepto-precio-por-paso` (~92): ejemplos `("por 500 g", "por frasco 370 g")` → `("por 500 g", "por bidón")`. Agregar "En los envasados se nombra solo el envase, porque el tamaño ya está en el nombre."
    - `concepto-precio-comparativo` (~103): sacar "o si repite el precio por paso (paso de 1 kg o 1 L)". Queda "No se muestra si el tamaño no se puede leer."
17. **Textos de QA, `scripts/qa-tickets.data.ts`.** No son tickets abiertos; los siembra `pnpm qa:seed`, que corre Flavio y no toca `status` ni `notes`.
    - **Caso #5 (`:98`):**
      - "el precio por paso… ('$ 11.300 por 500 g' o '$ 4.200 por frasco 370 g')" → "('$ 11.300 por 500 g' o '$ 4.200 por frasco')";
      - "el selector de cantidad con la unidad dentro del campo y el botón 'Agregar' con el total (por ejemplo 'Agregar · $ 11.300')" → "el selector de cantidad (con 'kg' en los productos por peso y solo el número en los envasados) y el botón 'Sumar al pedido', sin monto";
      - la oración "El precio comparativo no aparece cuando el paso es 1 kg o 1 L…" → "El precio comparativo aparece siempre, también con paso de 1 kg o 1 L (por ejemplo 'Aceite de oliva extra virgen botella 1 L')";
      - agregar "La foto se ve completa en un cuadrado" y "La tarjeta no muestra el total; se ve en Tu pedido al sumar".
    - **Caso #6 (`:110`):**
      - paso 1: "el botón muestra 'Agregar · $ X'…" → "el botón dice 'Sumar al pedido'";
      - paso 2: "el monto del botón se recalcula…" → "la cantidad pasa a 1 kg; el precio por paso de arriba no cambia";
      - paso 3: agregar "el total se ve en el mini-carrito".
    - **Caso #8 (`:135`):** "el botón con el total (por ejemplo 'Agregar · $ 4.200')" → "el botón 'Sumar al pedido', sin monto".
    - Correr `scripts/qa-tickets.data.test.ts`.
18. **Docs** (ya aplicados en el grill, solo verificar):
    - `CONTEXT.md`, *Step price* y *Comparison price*;
    - la nota "en parte reemplazado por #106" en `docs/plans/product-card-price-hierarchy.md`.

## 5. Casos borde

- **Tamaño ilegible** ("2 x 500 g", "grande"): no hay comparativo y el relleno mantiene la alineación.
- **Unidad contable sin envase** (`piece` o `box` sin `presentationContainer`): el precio dice "por unidad" o "por caja" y el selector muestra solo el número (supuesto, §7). No hay ninguno en los datos de hoy.
- **Cantidad fija** (sin paso): no hay selector y la línea de cantidad fija conserva el tamaño ("1 frasco 370 g"). El botón va sin monto.
- **Descuento:** el tachado sigue siendo el precio por paso sin descuento, y el comparativo lleva el descuento.
- **Sin imagen:** el placeholder conserva su tinte (gris en el catálogo, verde en la home) y el ícono.
- **Modo oscuro:** la foto con fondo blanco queda como un cuadro blanco sobre la tarjeta oscura. Es aceptable y no se trata aparte.
- **Ya en el pedido:** "Ya tenés 2 bidones 5 L en tu pedido" + "Ver en tu pedido", sin ícono.
- **Teclear en el selector sin unidad:** sigue normalizando al perder el foco, igual que hoy.

## 6. Aceptación

- `pnpm typecheck`, `pnpm test` y `pnpm check` en verde.
- Contra la DB local (§9 y §10 de la orquestación), en verde:
  - `pnpm test:e2e e2e/catalog-product-card.spec.ts e2e/home-offer-quantity.spec.ts e2e/smoke.spec.ts e2e/customer-tutorial.spec.ts`.
- `grep -rn 'addLabel\|ShoppingCartIcon' src/features/catalog src/app/\(storefront\)/products` no encuentra nada en el botón de compra.
- Revisión visual a 360, 768, 1280 y 1536 px:
  - en `/products`, `/` (grilla y destacado), la ficha y similares: foto cuadrada completa;
  - el botón dice "Sumar al pedido" sin ícono ni monto;
  - "$ X por bidón" + "$ Y / L";
  - la botella de 1 L y la bolsa de 1 kg muestran su comparativo;
  - en kg, "− 0,5 kg +"; en envasados, "− 1 +";
  - los botones de una fila quedan alineados;
  - el destacado mide 400 px o menos de ancho y la franja no crece.
- El carrito y el mini-carrito no cambian: el selector con unidad, los totales y el texto.
- La vista previa del admin (`/admin/products`, pestañas Tarjeta, Home y Detalle) muestra lo mismo.
- Mini review: `q-review-code` (dos ejes) y `q-review-comments`.

## 7. Supuestos

| Supuesto | Si no se cumple |
| --- | --- |
| WP-A está mergeado: diálogo sin "Cerrar" ni "Sin galería", descripción sr-only, sin `computeUnitFacets`. | Frenar y rebasear sobre `main` cuando entre; no rehacer el trabajo de WP-A. |
| "Envasado" = cualquier unidad que no es de peso (`!isWeightUnit`). Flavio nombró frasco, botella, bidón y bolsa; hoy los 5 productos por unidad tienen envase. | Si aparece una unidad contable que necesite la unidad visible, `showsQuantityUnit` es el único lugar a tocar. |
| `max-w-100` existe (Tailwind v4, escala de 0,25 rem → 25 rem = 400 px). | Usar `max-w-[25rem]`. |
| Las fotos de producto vienen sobre fondo blanco. | Con fondos de color se ven franjas blancas; es aceptable y no se trata aparte. |

## 8. Preguntas abiertas

Ninguna.

## 9. Estado de QA al terminar

Las transiciones se agregan a `scripts/qa-ticket-triage.data.ts` (WP0). Las notas van **arriba**, sin borrar las anteriores.

- **#106 → Re-test.** Nota:
  > `[fecha · triage] Implementado en <commit>. Mirar: foto 1:1 completa; "Sumar al pedido" sin ícono ni monto en catálogo, home, destacado y ficha; "$ X por bidón" sin tamaño; precio por kg/L siempre (también botella 1 L); selector solo número en envasados, "0,5 kg" en productos por peso; el total se ve en Tu pedido. Precondiciones: ninguna (sin login).`
- **#107 → Re-test solo si WP-B ya está mergeado** (la línea de cierre del subtítulo). Si no, queda en Pendiente con la nota:
  > `[fecha · triage] Imagen 1:1 y precio/selector/botón como la tarjeta implementados en <commit>; falta la línea de cierre (WP-B).`
- **#73 → Re-test.** Nota:
  > `[fecha · triage] Re-testear después de #106 (<commit>). Mirar: selector − n + editable en la tarjeta y la ficha, arranca en el mínimo y no baja de ahí. Superado por #106: el total ya no se muestra en la ficha (queda para lectores de pantalla y en Tu pedido).`
- **#84 → Re-test.** Nota:
  > `[fecha · triage] Re-testear después de #106 (<commit>). Mirar: orden foto, nombre, precio con su unidad, selector, botón a ancho completo. Superado por #106: no hay línea de total, y la unidad va dentro del campo solo en productos por peso; en los envasados el campo muestra solo el número.`
- **Casos #5, #6 y #8** (textos de QA cambiados en el paso 17): después de que Flavio corra `pnpm qa:seed`, pasan a **Re-test** con la nota `[fecha · triage] Texto actualizado por #106 en <commit>: botón sin monto, comparativo siempre. Re-testear.`

## 10. Hecho significa

- Los pasos 1 a 17 implementados en una rama de WP-C, con commits chicos.
- La aceptación de §6 en verde.
- La mini review aplicada.
- El merge `--no-ff` a `main`.
- El registro de ejecución agregado a este plan y una fila en §13 de la orquestación.
- Las transiciones de §9 cargadas en el script de triage.
