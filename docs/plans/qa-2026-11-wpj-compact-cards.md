# Plan corto: WP-J, grillas centradas y tarjeta compacta (#117 y #118)

> **Estado:** implementado el 19/11/2026 en la rama `wpj-compact-cards`, sobre `main` (`a1386fe`). Revisión independiente hecha y hallazgos corregidos. e2e en verde contra la base local. Sin merge ni push.
> **Origen:** `docs/plans/qa-open-tickets-2026-11-18-report.md` (§2 filas #117 y #118, §4, §5 y las decisiones de Flavio en §7: D1, D2, D3 y D6). Sin grill: las decisiones ya estaban.
> **Base anterior:** la tarjeta de WP-C (`docs/plans/qa-2026-11-wpc-product-card.md`) y los combos y Destacados de WP-D (`docs/plans/qa-2026-11-wpd-combos-featured.md`).
> **En paralelo:** WP-KL (`wpkl-descriptions-copy`) cambia la cabecera del catálogo y la ficha. Esta rama no las toca. En `products-client.tsx` solo cambian el skeleton de la grilla y los handlers, lejos de la cabecera.

## 1. Qué se hizo

### #117: una sola grilla de tarjetas

`ProductCardGrid` (`src/features/catalog/_components/product-card-grid.tsx`) es la grilla única de tarjetas de producto:
- **En el celular:** 2 columnas iguales, con 8 px de separación.
- **Desde `sm` (640 px):** columnas fijas de 13,5 rem (216 px) con `auto-fit` y `justify-content: center`. Las columnas vacías colapsan, así que una fila con menos tarjetas que columnas queda centrada.
- **Columnas según el ancho:**

  | Pantalla | Columnas |
  | --- | --- |
  | Catálogo a 768 px | 3 |
  | Catálogo a 1024 px, al lado de los filtros | 3 |
  | Catálogo desde 1280 px | 4 |
  | Home desde 1280 px | 5 |

- **Dónde se usa:** el catálogo (`product-grid.tsx` y su skeleton), Destacados (`featured-section.tsx`) y la escena del catálogo del tutorial (`catalog-scene.tsx`, ADR 0012).
- **Combos en Destacados:** en el celular ocupan el ancho completo (D2). Desde `sm` ocupan una columna, como antes.
- **Similares de la ficha:** cada uno ocupa un tercio de la fila; si hay uno o dos, quedan centrados. La mini-tarjeta no cambia (D2).

### #118: tarjeta compacta

**Qué muestra.** `ProductCard` (catálogo) y `HomeOfferCard` (productos de Destacados) muestran, de arriba abajo:
- foto 1:1;
- nombre en hasta 2 líneas;
- precio por paso y su unidad en una sola línea, y debajo el precio por kg o por L;
- el botón "Sumar".

No muestran la marca. En la tarjeta compacta, el precio baja a `text-base` en el celular para entrar en media pantalla.

**Cómo funciona `CompactPurchase`** (`src/features/catalog/_components/compact-purchase.tsx`):
- **"Sumar"** agrega el mínimo con la acción de siempre (`onAdd` en el catálogo, `setItem` en la home) y abre Tu pedido, como antes.
- **Con el producto en el pedido**, el botón se cambia por un selector − n + que edita la cantidad del pedido:
  - usa `useCartActions.updateQuantity`, que llama a `setItemQuantity` con sesión y edita el store local para los invitados;
  - respeta el paso y el tope;
  - en el mínimo, el "−" es un tachito que llama a `removeItem` y vuelve "Sumar" (D1).
- **Unidad en el selector:** la regla de WP-C. "0,5 kg" en los productos por peso y solo el número en los envasados.
- **Se van de la tarjeta** "Ver en tu pedido" y "✓ Ya tenés …". Siguen en la ficha y en la banda "Destacado", que no cambian (D2).
- **Accesibilidad:**
  - **Nombres de los botones:** cada uno nombra el producto: "Sumar Almendra a tu pedido", "Sumar 0,5 kg más de Almendra", "Restar 0,5 kg de Almendra", "Quitar Almendra de tu pedido".
  - **Región `aria-live`:** anuncia "Tenés 1 kg en tu pedido", o "Quitaste Almendra de tu pedido" al sacarlo. Solo habla después de que la tarjeta cambió el pedido, así que no lee todos los productos guardados al cargar la página.
  - **Foco:** pasa de "Sumar" al "+" y del tachito a "Sumar". Si una actualización pendiente deshabilita los botones, el foco vuelve al mismo botón cuando termina.
- **Pago en curso:** si `ensureCartMutable` rechaza el cambio, se ve en un toast el mismo mensaje del servidor que en `/cart` ("Hay un pago en curso para tu pedido…"). Después, `useCartActions` vuelve a leer el pedido del servidor, para que la tarjeta no quede con la cantidad rechazada. No lo relee si una fusión bloqueada todavía tiene productos guardados solo en el navegador (`canRestoreServerCart`), para no borrarlos.
- **Limpieza:** se borraron los tamaños que quedaron sin uso: `size` de `PurchaseActionButton` y de `CatalogProductPurchase`, `ignoreCart`, y el tamaño `md` del selector, que ahora es `compact`.
- **Vista previa del admin:** las pestañas Tarjeta y Home muestran la tarjeta compacta al ancho de la grilla.

### Companions

- **Tutorial:** cambió el texto de `stepQuantity`: "Con Sumar agregás el mínimo, 500 g. Después, con − y + cambiás la cantidad de a 500 g, y el tachito lo saca de tu pedido." La tabla de `docs/plans/customer-tutorial.md` también. Los pasos no cambiaron, así que los contadores de `customer-tutorial.spec.ts` (12 y 21) siguen igual.
- **Casos de QA #5, #6 y #8:** en `docs/qa/qa-ciclo-de-vida.md`, `scripts/qa-tickets.data.ts` y su test, se reescribieron la tarjeta compacta, el flujo Sumar → selector → tachito y la cantidad fija.
- **Glosario del admin:** no tiene entradas sobre el botón o el selector de la tarjeta. No se tocó.

## 2. Commits

| Commit | Qué |
| --- | --- |
| `2f02930` | `ProductCardGrid` y similares centrados. |
| `1bdb225` | `useCartActions` relee el pedido cuando el servidor rechaza un cambio. |
| `4d11213` | Tarjeta compacta (catálogo, Destacados, vista previa del admin y escena del tutorial) y selector `compact` con tachito. |
| `4f4f082` | Tutorial y casos de QA #5, #6 y #8. |
| `402fd7c` | e2e: flujo de la tarjeta compacta, 4 tarjetas en el celular y filas centradas. |
| `5606bc3` | Correcciones de la revisión (§4). |

## 3. Validación

| Comando | Resultado |
| --- | --- |
| `pnpm typecheck` | Sin errores. |
| `pnpm test` | 164 archivos pasan y 1 se saltea. 2263 tests pasan y 6 se saltean. |
| `pnpm exec biome check src scripts e2e prisma docs` | Sin errores en lo que toca esta rama. Los 5 errores de formato de `docs/development-workflow/release/MP-VALIDATION-20261113/07-*.json` ya estaban en `main`. |

**e2e contra la base local** (`run-e2e-local.sh`), última corrida: **47/47**.

| Spec | Resultado |
| --- | --- |
| `product-card-grid` (nuevo) | 9/9. Dos columnas y cuatro tarjetas completas a 360 × 780 y 390 × 844, con la grilla arriba, debajo de la barra fija. El flujo Sumar → selector → "+" → "−" → tachito → Sumar, con el foco de vuelta en "Sumar" y el anuncio. La fila centrada en el catálogo ("Solo en mi pedido" con 2 productos) y en Destacados, a 1366, 1920 y 2560 px. |
| `catalog-product-card` | 5/5. "Sumar" agrega el mínimo, el selector sobrevive a una recarga y "+" edita el pedido sin abrirlo. La unidad dentro del campo solo en los productos por peso. |
| `home-offer-quantity` | 1/1. Flujo compacto en Destacados. |
| `smoke` | 16/16. El test de la banda se renombró: "adding the spotlight offer…". |
| `home-combo` | 1/1 |
| `customer-tutorial` | 10/10 |
| `catalog-category-filter` | 3/3 |
| `catalog-public-copy` | 2/2 |

Los intermitentes de referencia (`smoke.spec.ts:119` y `:212`, `customer-tutorial.spec.ts:58`) pasaron en todas las corridas.

**Revisión visual:** con un spec temporal sin commitear, a 360, 390, 768, 1366, 1920 y 2560 px. Las capturas están en `/tmp/claude-1000/-home-flavio-quasar-coco/faa97d93-7356-42ca-ba3c-0f31cff820da/scratchpad/wpj-shots/`.
- **Alto de la tarjeta compacta:**
  - a 360 px, 321 px: la segunda fila termina en 714 px de 780;
  - a 390 px, 336 px: termina en 744 px de 844.
- **En el celular,** el precio y su paso entran en una línea ("$ 137.400 por bidón").
- **En la computadora,** el catálogo muestra 4 columnas de 216 px, y una búsqueda con 2 productos queda centrada.

## 4. Revisión

Un revisor independiente corrió `q-review-code` (los dos ejes) y `q-review-comments` sobre `main...HEAD`. Resultado: aprobado con hallazgos. Todo lo corregido entró en `5606bc3`.

| Hallazgo | Severidad | Qué se hizo |
| --- | --- | --- |
| El pedido releído después de un rechazo podía borrar los productos de invitado pendientes de una fusión bloqueada. | Mayor | `canRestoreServerCart` con test. No se relee mientras la fusión está bloqueada. |
| Con sesión, `isPending` deshabilita los botones y el foco cae a la página. | Mayor | La tarjeta recuerda el extremo enfocado y lo vuelve a enfocar cuando termina la actualización. |
| El empaquetado denso de Destacados cambiaba el orden visual respecto del de tabulación. | Menor | Se sacó. Un producto solo antes de un combo deja media fila vacía en el celular. |
| La región `aria-live` anunciaba los productos guardados al cargar. | Menor | Ahora habla después de un cambio hecho desde la tarjeta, y anuncia "Quitaste …" al sacar. |
| Con 14 rem a 1024 px y una barra de scroll clásica, el catálogo bajaba a 2 columnas. | Menor | Pistas de 13,5 rem. |
| e2e: aserción débil de "Sumar", test de smoke mal nombrado, centrado solo en el catálogo. | Nit / menor | Corregido, y se agregó el centrado en Destacados. |
| Comentarios: el docstring de la grilla, el comentario del empaquetado denso y uno repetido en un test. | Sugerencia | Reescrito, quitado y quitado. |
| La última fila incompleta de una grilla de varias filas no se centra. | Menor (spec) | Queda como desvío (§5) para que decida Flavio. |

## 5. Desvíos y decisiones

- **Última fila incompleta:**
  - **Qué hace:** `auto-fit` + `justify-content: center` centra la grilla y una fila única con menos tarjetas que columnas, que es lo que pide #117. En una grilla de varias filas, la última fila corta queda alineada con las de arriba, no centrada. Se ve en Destacados a 768 px: 3 columnas, 4 ítems.
  - **Alternativa:** si Flavio quiere centrar también esa fila, hay que pasar a `flex-wrap` con base fija desde `sm`, y las tarjetas tienen que dejar `h-full` para alinear los botones de cada fila.
- **Ancho de columna:** 13,5 rem en lugar de los ~17 rem del reporte. Con 17 rem el catálogo quedaba en 2 columnas a 1024 px y en 3 desde 1280, con 100 a 200 px vacíos a los costados.
- **Combos desde `sm`:** ocupan una columna, como antes. A dos columnas, el mosaico cuadrado del combo mediría 450 px de alto. El ancho completo de D2 vale para el celular.
- **Lista del combo a 216 px:** se lee apretada, con el nombre del producto partido en varias líneas. Ya pasaba con las columnas de ~236 px de antes. No se tocó.
- **"Sumar" sigue abriendo Tu pedido**, como la acción de siempre y el paso "Tu pedido se arma acá" del tutorial. El "+" y el "−" no lo abren.
- **El aviso de pago en curso** es el toast del servidor, el mismo mensaje que muestra `/cart` al intentar volver a editar. La tarjeta no se deshabilita con el pedido en checkout: el servidor libera un checkout abandonado o rechaza el cambio, igual que antes con "Sumar al pedido".
- **Sin e2e con sesión:** la suite no tiene usuario con sesión. La vuelta del foco después de `isPending` y el aviso de pago en curso se verificaron leyendo el código, no en un navegador.
- **`smoke.spec.ts`:** el test de agregar un destacado ahora prueba solo la banda, que conserva "Sumar al pedido" y "Ver en tu pedido". Se renombró. Las tarjetas compactas las cubre `home-offer-quantity`.

## 6. Notas de QA (las carga el orquestador con `qa:triage`; van arriba, sin borrar las anteriores)

Reemplazar `<commit>` por el merge de `wpj-compact-cards` en `main`.

- **#117 → Re-test.**
  > `[19/11/2026 · triage] Implementado en <commit>. Mirar: en la home (Destacados) y en el catálogo, a 1366, 1920 y 2560 px, las tarjetas tienen ancho fijo y la grilla queda centrada; con menos productos que columnas la fila se centra (en el catálogo, activar "Solo en mi pedido" con 1 o 2 productos, o buscar un nombre). En la ficha, uno o dos similares quedan centrados. Una última fila corta debajo de filas completas queda alineada a la izquierda de la grilla, no centrada: avisar si se quiere centrada también. Precondiciones: ninguna (sin ingresar).`
- **#118 → Re-test.**
  > `[19/11/2026 · triage] Implementado en <commit>. Mirar: en el celular (360 a 390 px), catálogo y Destacados en 2 columnas; al hacer scroll hasta que la grilla llega arriba, entran 4 tarjetas completas. La tarjeta muestra foto 1:1, nombre en hasta 2 líneas, precio y precio por kg o L, sin marca, y el botón "Sumar". "Sumar" agrega el mínimo y abre Tu pedido; al cerrarlo, la tarjeta muestra el selector con la cantidad del pedido ("0,5 kg" en productos por peso, solo el número en envasados). "+" y "−" cambian la cantidad del pedido; en el mínimo el "−" es un tachito que lo saca y vuelve "Sumar". Los combos ocupan el ancho completo; la banda "Destacado" y la ficha no cambian. Probar también con sesión. Precondiciones: ninguna; con sesión, cualquier cliente.`
- **Casos #5, #6 y #8 → Re-test**, después de que Flavio corra `pnpm qa:seed`.
  > `[19/11/2026 · triage] Texto actualizado por #118 en <commit>: tarjeta compacta con "Sumar", selector con tachito al estar en el pedido, cantidad fija con "+" deshabilitado. Re-testear.`

### Notas propuestas para #106, #73 y #84 (D6)

**Ahora, mientras WP-J no está mergeado.** Siguen en Re-test.
- **#106:**
  > `[19/11/2026 · triage] La parte del selector y del botón de la tarjeta cambia con #118 (tarjeta compacta con "Sumar"). Re-testear el resto: foto 1:1 completa, precio por paso sin tamaño ("$ X por bidón"), precio por kg o L siempre, y la ficha con "Sumar al pedido" sin ícono ni monto. Precondiciones: ninguna (sin ingresar).`
- **#73:**
  > `[19/11/2026 · triage] En la tarjeta el selector cambia con #118 (aparece después de "Sumar" y edita la cantidad del pedido). Re-testear en la ficha: selector − n + editable, arranca en el mínimo y no baja de ahí. Precondiciones: ninguna.`
- **#84:**
  > `[19/11/2026 · triage] La tarjeta cambia con #118; el orden de la ficha no. Re-testear en la ficha: foto, nombre, precio con su unidad, selector y botón a ancho completo. Precondiciones: ninguna.`

**Cuando entre WP-J.** Vuelven a Re-test completo.
- **#106:**
  > `[dd/mm/aaaa · triage] #118 entró en <commit>. Re-testear completo con la tarjeta compacta: foto 1:1 completa, "$ X por bidón", precio por kg o L siempre, botón "Sumar" sin ícono ni monto, y el selector (solo el número en envasados, "0,5 kg" en productos por peso) cuando el producto está en el pedido. En la ficha y la banda "Destacado" sigue "Sumar al pedido". Precondiciones: ninguna (sin ingresar).`
- **#73:**
  > `[dd/mm/aaaa · triage] #118 entró en <commit>. Re-testear completo: en la ficha, el selector arranca en el mínimo y no baja de ahí; en la tarjeta, el selector aparece después de "Sumar", edita la cantidad del pedido y en el mínimo el "−" es un tachito. Precondiciones: ninguna.`
- **#84:**
  > `[dd/mm/aaaa · triage] #118 entró en <commit>. Re-testear completo: el orden de la ficha (foto, nombre, precio con su unidad, selector, botón a ancho completo) no cambió; la tarjeta compacta es foto, nombre, precio y "Sumar". Precondiciones: ninguna.`

## 7. Pendiente

- Merge `--no-ff` a `main` después de WP-KL, con rebase. Puede chocar en `products-client.tsx`, por la cabecera contra el skeleton y los handlers, y en `tutorial-script.ts`, en otra línea.
- Cargar las notas de §6 con `qa:triage`. Para los casos #5, #6 y #8, Flavio corre `pnpm qa:seed`.
- Que Flavio decida sobre la última fila incompleta (§5).
