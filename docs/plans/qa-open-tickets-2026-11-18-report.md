# Reporte: tickets de QA #117–#120, #122 y #123 (2026-11-18)

> **Fuente:** `/admin/qa-tickets` (tabla `qa_ticket`), leída el 2026-11-18 en una transacción de solo lectura. Los seis tickets se cargaron el 14/11 y están en `pending`.
> **Base:** `main` en `247e38d`, desplegado en producción.
> **Alcance:** Flavio pidió el triage de #117, #118, #119, #120, #122 y #123. Quedan fuera:
> - #116 (contador con segundos) y #121 (textos de entrega, que dependen de #105): son cambios de decisión que se tratan aparte.
> - #124 y #125: son guías de QA, no desarrollo.
>
> **Estado:** triage. Las soluciones son propuestas apoyadas en el código actual. Las decisiones abiertas están en §5, cada una con su recomendación.
> **Idioma:** textos al cliente en castellano rioplatense, "tu pedido" y "CoCo" (`docs/plans/customer-vocabulary-pedido.md`).

## 1. Resumen

| Ticket | Título | Clase | Esf. | Paquete |
| --- | --- | --- | --- | --- |
| #117 | Centrar las grillas de productos en pantallas grandes | Mejora | S | WP-J |
| #118 | Al menos cuatro productos por pantalla en celular | **Cambio de decisión** + mejora | M–L | WP-J |
| #119 | Descripción breve de calidad y usos | Mejora (casi hecha) | S | WP-K |
| #120 | Quitar "mayorista" de las pantallas | Texto | S | WP-K |
| #122 | Reformular la pregunta sobre precios | Texto | XS | WP-K |
| #123 | Cargar las descripciones de los productos | Contenido | S | WP-L (después de WP-K) |

- **#118 revierte una parte de #106** (WP-C, mergeado el 13/11). Hoy el selector de cantidad está siempre visible y "Sumar al pedido" suma esa cantidad. El ticket pide un botón "Sumar" que, al tocarlo, se convierte en un selector que **edita la cantidad ya cargada en el pedido**. Cambia cómo funciona la tarjeta, no solo cómo se ve.
- **#123 trae el contenido que bloqueaba #92**, y en parte #91 (§4).
- Los re-test en curso de #106, #73 y #84 prueban una tarjeta que #118 va a cambiar (§4, D6).

## 2. Tickets

| Ticket | Hoy | Solución propuesta |
| --- | --- | --- |
| **#117** Centrar grillas | <ul><li>Todas las páginas tienen un contenedor centrado de ancho máximo (`max-w-7xl`, 1280 px): `products-client.tsx:212`, `featured-section.tsx:35`, `home-hero.tsx:13`. A 1920 o 2560 px el contenido ya queda centrado.</li><li>Lo que no se centra es **la última fila incompleta**: Destacados usa `grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))]` (`featured-section.tsx:49`), y con menos tarjetas que columnas `auto-fill` deja columnas vacías a la derecha.</li><li>El catálogo usa columnas fijas, `sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4` (`product-grid.tsx:24`): un filtro con 2 productos los deja pegados a la izquierda.</li><li>Similares: `sm:grid-cols-3` (`similar-products-section.tsx:53`).</li></ul> | <ul><li>Una sola regla de grilla para tarjetas, en un helper o componente compartido (`ProductCardGrid`): columnas de ancho fijo con un máximo (~17 rem) y `justify-content: center`, por ejemplo `grid-cols-[repeat(auto-fit,minmax(…,17rem))] justify-center`. En celular toma las 2 columnas de #118.</li><li>Se aplica en el catálogo, Destacados (productos y combos) y similares, y en la escena del catálogo del tutorial (`catalog-scene.tsx:104`), que copia la grilla (ADR 0012).</li><li>Un e2e con viewport de 1366, 1920 y 2560 px y un filtro de 2 productos que afirma que la fila queda centrada (los márgenes izquierdo y derecho difieren en menos de 1 px).</li></ul> |
| **#118** 4 productos en celular | <ul><li>La grilla del catálogo tiene **1 columna** debajo de `sm` (`product-grid.tsx:24`). Destacados también, porque el mínimo de 240 px no deja 2 columnas a 360 px.</li><li>La tarjeta (`product-card.tsx`) muestra marca, nombre, precio, precio por kg o por L, el selector **siempre** visible y "Sumar al pedido" a ancho completo (`purchase-panel.tsx:187-230`).</li><li>Cuando el producto ya está en el pedido, el selector se cambia por "✓ Ya tenés … en tu pedido" y el botón por "Ver en tu pedido". La cantidad del pedido **no se edita desde la tarjeta**.</li><li>Las acciones del carrito ya existen para invitados y usuarios con sesión: `useCartActions` (`use-cart-sync.ts:165`), con `setItemQuantity` y `removeItem` (`cart.router.ts:26-44`).</li></ul> | <ul><li>**Grilla:** 2 columnas debajo de `sm` en las grillas de productos (catálogo y Destacados), con un gap de 8 px.</li><li>**Tarjeta compacta (`size="compact"`):** imagen 1:1, nombre en 2 líneas, precio y precio por kg o por L. La marca sale de la tarjeta compacta: hoy ningún producto activo tiene marca.</li><li>**Botón compacto "Sumar".** Suma el **mínimo** del producto con la acción de siempre. Si el producto ya está en el pedido, la tarjeta muestra un selector − n + que llama a `setItemQuantity`. El "−" en el mínimo lo saca del pedido y vuelve "Sumar" (D1). Sin "Ver en tu pedido": el mini-pedido ya está en la barra.</li><li>**Unidad en el selector:** sigue la regla de WP-C ("0,5 kg" en los productos por peso, solo el número en los envasados).</li><li>**La ficha desplegada no cambia:** conserva el selector antes de sumar, porque en la ficha hay lugar (D2).</li><li>**Combos y destacado (banda):** no pasan a 2 columnas; una tarjeta de combo lista sus productos y no entra en media pantalla (D2).</li><li>**Riesgo:** editar la cantidad desde la tarjeta pasa por `ensureCartMutable`. Con un pedido esperando el pago, el cambio lo cancela o lo rechaza, igual que hoy en `/cart`. La tarjeta muestra el mismo aviso.</li><li>**Companions:** `product-card.tsx`, `home-offer-card.tsx` y `home-feature-card.tsx`, `catalog-product-purchase.tsx`, `purchase-panel.tsx`, el tutorial (`tutorial-script.ts` `stepQuantity`, `catalog-scene.tsx` y los contadores de `e2e/customer-tutorial.spec.ts`), y los e2e `catalog-product-card`, `home-offer-quantity`, `smoke` y `home-combo`.</li><li>**Aceptación:** a 360 × 780 y 390 × 844 px, cuatro tarjetas completas debajo del contador y la barra **cuando la grilla empieza arriba de la pantalla**. En `/products` el título, la bajada y los filtros quedan arriba; hace falta un primer scroll (D3).</li></ul> |
| **#119** Descripción breve | <ul><li>`Product.description` ya existe (`String?`, `schema.prisma:185`) y no tiene límite (`nullishText`, `product.schemas.ts:102`).</li><li>La ficha la muestra arriba de la columna de compra, a la derecha de la imagen en computadora y debajo en celular (`product-details-dialog.tsx:180-184`). Se oculta si falta o si repite el nombre (`visibleProductDescription`, WP-A).</li><li>La tarjeta **no** la muestra.</li><li>"Tu pedido" la muestra recortada a 2 líneas (`cart-line-row.tsx:159-163`).</li></ul> | <ul><li>Máximo de 200 caracteres en el schema de alta y edición, con contador en el textarea del admin (`product-form-dialog.tsx`). No hace falta migración (columna `TEXT`); las descripciones actuales repiten el nombre y miden menos de 60.</li><li>En la ficha, la descripción pasa a ir **debajo del título**, en el encabezado del diálogo, antes de la imagen en celular. Hoy queda debajo de la imagen.</li><li>La línea general "Seleccionamos productos de primera calidad." va debajo de la bajada del catálogo (`products-client.tsx:221-224`, junto con #120).</li><li>"Tu pedido" deja de mostrar la descripción: 200 caracteres recortados a 2 líneas no aportan en el carrito y no lo pide ningún ticket (D4).</li></ul> |
| **#120** Sin "mayorista" | "Mayorista" o "al por mayor" aparece fuera de Cómo funciona y del FAQ en:<ul><li>`products-client.tsx:215` (eyebrow "Catálogo mayorista") y `:222-223` (bajada);</li><li>`products/page.tsx:10` (meta description del catálogo);</li><li>`(storefront)/page.tsx:20` (meta description del home: "precios mayoristas");</li><li>`home-content.ts:23` (**bajada del hero**: "compramos al por mayor");</li><li>`my-orders/page.tsx:38`;</li><li>`product-details-dialog.tsx:103` (descripción sr-only de respaldo);</li><li>checkout: `checkout-client.tsx:445`, `checkout-summary.tsx:107`, `checkout-address-step.tsx:50`, `checkout-order-step.tsx:75` y `checkout/page.tsx:10`;</li><li>tutorial: `catalog-scene.tsx:66,73`, `checkout-scene.tsx:60` y `tutorial-script.ts:229`.</li></ul>Los términos `checkout-v4` **no** dicen "mayorista", así que no hace falta subir la versión. | <ul><li>Los textos del ticket: se va el eyebrow, bajada "Elegí lo que necesitás y sumalo a tu pedido de la semana." y meta del catálogo (D5).</li><li>Los demás textos se reescriben sin "mayorista", por ejemplo:<ul><li>checkout: "Cuatro pasos para dejar listo tu pedido de la semana.", "Tu pedido de la semana", "Elegí dónde recibir tu pedido.", "Estos productos entran en la compra de la semana.";</li><li>Mis pedidos: "Armá tu pedido para sumarte a la compra de la semana."</li></ul></li><li>**La bajada del hero** pierde "al por mayor" (D5).</li><li>Quedan Cómo funciona (`home-content.ts:41`), el FAQ (`:88`, `:107`→#122) y el paso "Cómo funciona" del tutorial (`tutorial-script.ts:120`).</li><li>Un test de guarda recorre los textos del cliente (`home-content`, metadata de páginas, tutorial) y falla si "mayorista" o "al por mayor" aparece fuera de la lista permitida.</li></ul> |
| **#122** Pregunta sobre precios | Pregunta 6 del FAQ: "¿Por qué los precios son más bajos que en un comercio?", con el texto preliminar de WP-B (`home-content.ts:106-108`). | La pregunta y la respuesta del ticket, tal cual. "Precio mayorista" queda permitido en el FAQ (#120). Actualizar `home-content.test.ts` y `e2e/smoke.spec.ts`, si afirma el texto. |
| **#123** Cargar descripciones | <ul><li>Los 27 productos activos tienen como descripción el nombre más un punto (lectura del 18/11), así que la ficha no muestra nada.</li><li>El ticket trae **26 textos para 27 productos**: "Castaña de cajú tostada" vale para #103 (sin sal) y #104 (salada).</li><li>En la base el producto se llama "Pecan premium" (#107) y en el ticket "Nuez pecán premium".</li><li>21 filas dicen "ID a completar". Ya están resueltas en §3.</li><li>El texto más largo mide 161 caracteres, así que todos entran en el límite de #119.</li></ul> | <ul><li>Cargar las 27 descripciones de §3 **después del deploy de #119**.</li><li>Cómo cargarlas es una decisión (D7): a mano desde el admin, como decidió Flavio el 13/11, o con un script con dry-run que escriba por el servicio auditado del admin.</li><li>Ojo: `verifyInitialCatalog` (`reset-initial-catalog.ts:151-178`) compara la descripción contra `quintal-catalog.data.ts`. Un reset futuro del catálogo inicial las pisa. Para que sobrevivan, conviene cargarlas también como overrides en `quintal-catalog.overrides.ts` (regenerando con `pnpm catalog:quintal`).</li></ul> |

## 3. #123: los ID resueltos

| ID | Producto en la base | Texto del ticket (caracteres) |
| --- | --- | --- |
| 100 | Almendra Non Pareil 25/27 | Almendra Non Pareil 25/27 (161) |
| 101 | Nuez mariposa extra light | Nuez mariposa extra light (151) |
| 102 | Nuez cuartos extra light | Nuez cuartos extra light |
| 103 | Castaña de cajú tostada sin sal | Castaña de cajú tostada (121), el mismo texto |
| 104 | Castaña de cajú tostada salada | Castaña de cajú tostada (121), el mismo texto |
| 105 | Pistacho con cáscara Riojano | Pistacho con cáscara riojano |
| 106 | Avellana Chile 13-15 | Avellana Chile 13-15 |
| 107 | Pecan premium | Nuez pecán premium (131) |
| 108 | Maní tostado salado | Maní tostado salado |
| 109 | Mix de frutos secos económico | Mix de frutos secos económico (130) |
| 110 | Mix de frutos secos deportivo | Mix de frutos secos deportivo |
| 111 | Mix de frutos secos antioxidante premium | Mix de frutos secos antioxidante premium |
| 112 | Banana chips | Banana chips |
| 113 | Pasa de uva Flame sin semilla | Pasa de uva Flame sin semilla (129) |
| 114 | Pasa de uva rubia premium 2026 | Pasa de uva rubia premium 2026 |
| 115 | Dátil Egipto | Dátil Egipto |
| 116 | Dátil Medjool | Dátil Medjool (151) |
| 117 | Ciruela sin carozo grande | Ciruela sin carozo grande |
| 118 | Empaque mixto sin carozo (frutas secas surtidas) | Empaque mixto sin carozo |
| 119 | Mix de semillas premium (sésamo, girasol, lino, chía) | Mix de semillas premium |
| 120 | Granola Kuati tradicional | Granola Kuati tradicional |
| 121 | Coco rallado fino | Coco rallado fino |
| 122 | Aceite de oliva extra virgen 0,5 L | ID 122 |
| 123 | Aceite de oliva extra virgen 1 L | ID 123 |
| 124 | Aceite de oliva extra virgen 5 L | ID 124 (149) |
| 125 | Pasta de maní Entre Nuts 370 g | ID 125 |
| 126 | Sal rosada del Himalaya | ID 126 |

## 4. Dependencias y efectos sobre otros tickets

- **#119 va antes de #123:** el límite de 200 caracteres y la posición en la ficha tienen que estar desplegados antes de cargar.
- **#120 y #119 tocan la misma cabecera del catálogo** (`products-client.tsx:213-226`), y #122 toca el FAQ: van juntos en WP-K.
- **#117 y #118 tocan las mismas grillas y tarjetas:** van juntos en WP-J. WP-J y WP-K comparten solo `products-client.tsx` (cabecera vs grilla), así que pueden ir en paralelo con un rebase chico.
- **#92** ("descripciones específicas") queda resuelto por #119 + #123: hoy está Bloqueado por falta de contenido, y #123 lo trae (D8).
- **#91** ("composición de los mix"): los textos de #123 para los tres mix **no dicen qué contienen**, salvo el de semillas, que lo tiene en el nombre. Sigue sin datos (D8).
- **#106, #73 y #84 están en Re-test** y #118 cambia su selector y su botón (D6).
- **Fuera de este triage, pero cerca:** #116 cambia el contador que comparte la cabecera mobile con las 4 tarjetas de #118 (la altura cuenta). #121 reescribe el FAQ y el paso 4 que también toca #122, en otra pregunta.

## 5. Decisiones abiertas (con la opción que recomiendo)

Cada una lleva un mockup antes/después, como pide Flavio.

### D1. #118: ¿qué hace el "−" cuando el producto está en el mínimo?

```text
ANTES (hoy, en el pedido)            DESPUÉS A (recomendada)        DESPUÉS B
┌──────────────────┐                 ┌──────────────────┐           ┌──────────────────┐
│ Almendra Non P.  │                 │ Almendra Non P.  │           │ Almendra Non P.  │
│ $ 11.300 x 500 g │                 │ $ 11.300 x 500 g │           │ $ 11.300 x 500 g │
│ ✓ Ya tenés 0,5 kg│                 │ [ − 0,5 kg + ]   │           │ [🗑 0,5 kg + ]   │
│ [Ver en tu pedido]                 └──────────────────┘           └──────────────────┘
└──────────────────┘                  "−" en 0,5 kg → sale del       en el mínimo el "−"
                                      pedido y vuelve "Sumar"        es un tachito
```
- **A (recomendada):** el "−" en el mínimo saca el producto y vuelve "Sumar". Es el patrón de las apps de delivery y no suma íconos.
- **B:** en el mínimo, el "−" se convierte en un tachito. Es más explícito, pero ocupa el mismo lugar con un ícono distinto.

### D2. #118: ¿dónde va la tarjeta compacta de 2 columnas?

- **A (recomendada):** en el catálogo y en los productos de Destacados.
  - Las tarjetas de combo ocupan las 2 columnas: listan sus productos y no entran en media pantalla.
  - La banda "Destacado", la ficha desplegada y los similares (mini-tarjetas en fila) quedan como están.
- **B:** en todo, también combos y similares. Los combos quedarían ilegibles a ~165 px de ancho.

### D3. #118: "cuatro tarjetas debajo del contador y el encabezado"

En `/products`, arriba de la grilla están el título "Productos disponibles", la bajada y los filtros (chips de categoría y botón de filtros), unos 200 px. A 360 × 780 hoy no entran 4 tarjetas en la primera pantalla aunque la tarjeta sea compacta.

```text
360 × 780, opción A (recomendada)       opción B
┌ contador ─────────────────────┐       ┌ contador ─────────────────────┐
│ coco          ?  🛒  ⇥  ☰     │       │ coco          ?  🛒  ⇥  ☰     │
│ Productos disponibles          │       │ [Todas][Frutos secos][…]  ⚙  │
│ Elegí lo que necesitás…        │       │ ┌──────┐ ┌──────┐            │
│ [Todas][Frutos secos][…]  ⚙   │       │ │      │ │      │            │
│ ┌──────┐ ┌──────┐             │       │ └──────┘ └──────┘            │
│ │      │ │      │  (fila 1)   │       │ ┌──────┐ ┌──────┐            │
│ └──────┘ └──────┘             │       │ │      │ │      │            │
│ (la fila 2 entra tras scroll) │       │ └──────┘ └──────┘            │
```
- **A (recomendada):** la aceptación es "4 tarjetas completas a la vista cuando la grilla llega arriba", al hacer scroll. La cabecera del catálogo no cambia.
- **B:** en celular se compactan título y bajada (o se ocultan), para que entren 4 tarjetas en la primera pantalla. Es más agresivo y choca con la bajada nueva de #120.

### D4. #119: ¿"Tu pedido" sigue mostrando la descripción?

- **A (recomendada):** no. La descripción vive en la ficha; el pedido muestra nombre, cantidad y precio.
- **B:** sí, recortada a 2 líneas, como hoy. Con 150 caracteres de "para qué sirve", el pedido se alarga.

### D5. #120: los textos que el ticket no fija

1. **Meta description del catálogo** (lo que se ve al compartir el link por WhatsApp):
   - **A (recomendada):** "Explorá productos y armá tu pedido de la semana." Es la alternativa que propone el propio ticket.
   - **B:** "Explorá productos."
2. **Bajada del hero** (hoy dice "…y compramos al por mayor…"):
   - **A (recomendada):** "Juntamos pedidos de toda Ushuaia y hacemos una sola compra grande. Elegís lo que necesitás; de comprarlo y traerlo nos encargamos nosotros."
   - **B:** dejarla como está; el hero sería una tercera excepción.
3. **Meta description del home:** "Compras comunitarias en Ushuaia. Sumate al pedido de otros vecinos y seguí tu compra hasta la entrega." Se saca "accedé a precios mayoristas".

### D6. #106, #73 y #84 ya están en Re-test, y #118 cambia su selector y su botón

- **A (recomendada):** agregarles una nota: "la parte del selector y del botón cambia con #118; re-testear el resto (imagen, precio, orden)". Cuando entre #118, una nota nueva los vuelve a Re-test completo.
- **B:** sacarlos de Re-test y devolverlos a Pendiente hasta que entre #118.

### D7. #123: ¿cómo se cargan las 27 descripciones?

- **A (recomendada):** un script `pnpm catalog:descriptions` con dry-run, con los textos de §3 en un archivo de datos.
  - Escribe por el servicio de productos del admin, así cada cambio queda en `AuditLog`.
  - También deja los textos en `quintal-catalog.overrides.ts`, para que un reset del catálogo no los pise.
  - Lo corre el orquestador con el OK de Flavio, después del deploy de #119.
- **B:** cargarlas a mano desde Admin › Productos, como dice el ticket y la decisión del 13/11. Son 27 ediciones, con riesgo de error de tipeo, y un reset futuro las pisa.

### D8. #91 y #92

- **#92** (descripciones específicas):
  - **A (recomendada):** cuando se carguen las de #123, pasa a la papelera con "Superado por #119 y #123".
  - **B:** pasa a Re-test.
- **#91** (composición de los mix): los textos de #123 no dicen qué tiene cada mix.
  - **A (recomendada):** sigue Bloqueado hasta tener la composición.
  - **B:** se da por resuelto con los textos de #123 y pasa a la papelera.

## 6. Paquetes de trabajo propuestos

| Paquete | Tickets | Ejecución | Esf. | Depende de | Estado de QA al terminar |
| --- | --- | --- | --- | --- | --- |
| **WP-K** Textos y descripción | #119, #120, #122 | Implementador directo, después de D4 y D5 | S | — | Re-test |
| **WP-J** Grillas y tarjeta compacta | #117, #118 | `q-code-grill-simple` (D1–D3 y D6) → implementador | M–L | — (rebase chico con WP-K) | Re-test; #106, #73 y #84 vuelven a Re-test con nota |
| **WP-L** Carga de descripciones | #123 (y #92) | Script con dry-run, o carga manual (D7) | S | WP-K desplegado | #123 Re-test, #92 según D8 |

**Orden sugerido:** WP-K y el grill de WP-J en paralelo, WP-L apenas se despliegue WP-K, y la implementación de WP-J cuando se respondan D1–D3. Las reglas de la orquestación de noviembre siguen vigentes:
- revisión independiente;
- e2e contra la base local con `run-e2e-local.sh`;
- notas de QA vía `qa:triage`;
- ninguna escritura en la base compartida, push ni deploy sin el OK de Flavio.

Ningún paquete necesita migración.

## 7. Decisiones de Flavio (19/11/2026)

| # | Decisión |
| --- | --- |
| D1 | **Tachito en el mínimo:** en la tarjeta compacta, cuando la cantidad está en el mínimo, el "−" se muestra como un tachito que saca el producto del pedido y vuelve a "Sumar". Por encima del mínimo es un "−". (Flavio eligió la opción B.) |
| D2 | Recomendada: 2 columnas en el catálogo y en los productos de Destacados. Los combos ocupan el ancho completo; la banda, la ficha y los similares no cambian. |
| D3 | Recomendada: "4 tarjetas" se mide cuando la grilla llega arriba de la pantalla. La cabecera del catálogo no cambia. |
| D4 | Recomendada: "Tu pedido" deja de mostrar la descripción. |
| D5 | Recomendada: meta del catálogo "Explorá productos y armá tu pedido de la semana."; bajada del hero y meta del home sin "mayorista", con los textos de D5. |
| D6 | Recomendada: #106, #73 y #84 siguen en Re-test con una nota; vuelven a Re-test completo cuando entre #118. |
| D7 | Recomendada: script `pnpm catalog:descriptions` con dry-run, escritura auditada y overrides del catálogo. Lo corre el orquestador con el OK de Flavio después del deploy de #119. |
| D8 | Recomendada: #92 → papelera ("Superado por #119 y #123") cuando se carguen las descripciones; #91 sigue Bloqueado. |

**Ejecución (19/11):**
- WP-K y WP-L van en una sola rama (`wpkl-descriptions-copy`), porque los dos tocan la descripción.
- WP-J va en `wpj-compact-cards`, sin grill: las decisiones ya están.
- Base de referencia de e2e en `main` (`247e38d`): `smoke.spec.ts:119` y `:212` fallan de forma intermitente, y `customer-tutorial.spec.ts:58` ya era intermitente antes.
