# Plan: WP-KL — descripción breve, sin "mayorista", pregunta de precios y carga de descripciones (#119, #120, #122 y #123 en código)

> **Estado:** implementado el 19/11/2026 en la rama `wpkl-descriptions-copy`, sobre `main` (`a1386fe`). Revisión independiente hecha y hallazgos corregidos (§6). Sin merge ni push. **`catalog:descriptions --apply` no se corrió:** lo corre el orquestador con el OK de Flavio, después del deploy de #119.
> **Fuente:** `docs/plans/qa-open-tickets-2026-11-18-report.md` (§2, §3, §5 y las decisiones de Flavio en §7: D4, D5, D7 y D8). Texto literal de los tickets leído de `qa_ticket` (códigos 119, 120, 122 y 123) en una transacción de solo lectura.

## 1. Objetivo

- **#119:** descripción breve de hasta 200 caracteres. Se ve en la ficha, debajo del título.
- **#120:** sacar "mayorista" y "al por mayor" de las pantallas del cliente, salvo donde se explica el modelo.
- **#122:** pregunta y respuesta nuevas sobre los precios.
- **#123:** dejar listo el script que carga las 27 descripciones, con dry-run y escritura auditada (D7).

**Fuera de alcance:**
- las grillas y las tarjetas (#117 y #118, WP-J, rama `wpj-compact-cards`): de `products-client.tsx` solo se tocó la cabecera;
- correr `--apply` contra la base compartida.

## 2. Qué se hizo

| Ticket | Commit | Qué se hizo |
| --- | --- | --- |
| #119 | `1101f1c` | <ul><li>`PRODUCT_DESCRIPTION_MAX_LENGTH = 200` en `product.schemas.ts`, en el alta y la edición (el router del admin usa los mismos schemas, así que el límite también vale en el servidor). Se cuenta después del trim.</li><li>El textarea del admin tiene `maxLength`, una ayuda ("Calidad y usos, en una o dos frases…") y el contador `n/200`.</li><li>En la ficha (`product-details-dialog.tsx`), la descripción pasa al encabezado del diálogo, debajo del título y de la línea de cierre. En celular queda antes de la imagen. Sigue oculta si falta o si repite el nombre (`visibleProductDescription`).</li><li>Debajo de la bajada del catálogo va "Seleccionamos productos de primera calidad.", también en la escena del tutorial (ADR 0012).</li><li>**D4:** la línea de "Tu pedido" (`cart-line-row.tsx`) deja de mostrar la descripción, en el mini-pedido y en `/cart`.</li><li>Glosario del admin (entidad Producto) y `CONTEXT.md` (*Product description*).</li></ul> |
| #120 | `9e7abd8` | <ul><li>Sale el eyebrow "Catálogo mayorista". Bajada del catálogo: "Elegí lo que necesitás y sumalo a tu pedido de la semana."</li><li>**D5:** meta del catálogo "Explorá productos y armá tu pedido de la semana."; bajada del hero "Juntamos pedidos de toda Ushuaia y hacemos una sola compra grande. Elegís lo que necesitás; de comprarlo y traerlo nos encargamos nosotros."; meta del home "Compras comunitarias en Ushuaia. Sumate al pedido de otros vecinos y seguí tu compra hasta la entrega."</li><li>Checkout: meta "Confirmá dirección, pago y resumen de tu pedido."; encabezado "Cuatro pasos para dejar listo tu pedido de la semana."; resumen "Tu pedido de la semana"; Entrega "Elegí dónde recibir tu pedido."; Pedido "Estos productos entran en la compra de la semana."</li><li>Mis pedidos, sin pedidos: "Armá tu pedido para sumarte a la compra de la semana."</li><li>Ficha sin cierre configurado (sr-only): "Precio y cantidades para sumar este producto a tu pedido."</li><li>Tutorial: escenas del catálogo y del checkout, y el paso "Preparación" ("…una sola compra grande."). También `docs/plans/customer-tutorial.md`.</li><li>Test de guarda `src/features/home/wholesale-wording.test.ts`. Recorre todo `src/` salvo el código solo de admin y falla si "mayorist" o "por mayor" aparece fuera de la lista permitida. Además fija que en el home solo aparece en Cómo funciona y el FAQ (3 veces) y que en el tutorial solo aparece en el paso `how-it-works`.</li><li>Los términos `checkout-v4` no se tocaron.</li></ul> |
| #122 | `f3e1887` | La pregunta 6 del FAQ pasa a ser "¿Cómo conseguimos estos precios?", con la respuesta del ticket tal cual. `home-content.test.ts` y `e2e/smoke.spec.ts` la afirman. |
| #123 código | `b9b870b` | <ul><li>`scripts/catalog-descriptions.data.ts`: las 27 descripciones de §3, por id (100 a 126), con el nombre actual en la base como guarda. Los 26 textos se compararon uno por uno con el ticket; el más largo tiene 161 caracteres.</li><li>`scripts/catalog-descriptions.plan.ts`: lógica pura, con tests.</li><li>`scripts/catalog-descriptions.ts` y `pnpm catalog:descriptions`: <ul><li>**dry-run por defecto**, dentro de `readOnlyTransaction` (`transaction_read_only=on`), que imprime antes y después por producto;</li><li>se bloquea **toda** la corrida si un producto falta, está eliminado, cambió de nombre, ya tiene una descripción propia, o el formulario del admin no lo guardaría tal cual (se compara campo por campo);</li><li>`--apply --actor-email <superadmin>` escribe por `product.service.update`, así que cada cambio deja un `product.update` en `AuditLog`;</li><li>antes de escribir relee cada producto; lo que ya está igual se saltea, así que se puede volver a correr;</li><li>con `APP_ENV=production` pide `--confirm-production`.</li></ul></li><li>`quintal-catalog.overrides.ts`: el campo nuevo `descriptionOverrides` (nombre publicado → descripción) se arma con el mismo archivo de datos. El parser del perfil `coco-launch` lo usa en lugar de `${name}.`. `quintal-catalog.data.ts` se regeneró: cambian solo las 27 descripciones.</li><li>`docs/README.md` documenta el script.</li></ul> |
| Revisión | `c8ce384` | Correcciones de §6. |

## 3. Validación

| Comando | Resultado |
| --- | --- |
| `pnpm typecheck` | Sin errores. |
| `pnpm test` | 166 archivos pasan y 1 se saltea (la integración del reset, que necesita una base `_test`); 2317 tests pasan y 6 se saltean. Después de la revisión, `scripts` + `src/features`: 937 pasan. |
| `pnpm exec biome check src scripts e2e prisma docs` | Solo fallan 5 JSON de `docs/development-workflow/release/MP-VALIDATION-20261113/`. Son archivos ajenos, sin cambios en esta rama, y fallan igual en `main`. |
| `scripts/reset-initial-catalog.integration.test.ts` | **4/4 en verde** contra una base local nueva `coco_wpkl_reset_test` (contenedor `coco-e2e-postgres`, bajo el lock de e2e, con el `schema.sql` del scratchpad). Con las descripciones nuevas, el reset y `verifyInitialCatalog` siguen de acuerdo. La base se borró al terminar. |
| Regeneración de `quintal-catalog.data.ts` | El xlsx de lanzamiento no está en la máquina. Se regeneró desde `scripts/fixtures/quintal-launch-2026-10.json` (las celdas cacheadas del xlsx aprobado, mismo sha) con el mismo render que `pnpm catalog:quintal` (`JSON.stringify` + `biome format`). **Antes del cambio, la salida era idéntica byte a byte al archivo commiteado.** Después, cambian solo las 27 descripciones. La revisión lo repitió por su cuenta, con el mismo resultado. |
| `catalog:descriptions` en una base local descartable | `coco_wpkl_apply_test`: los 27 productos sembrados con ids 100 a 126 y descripción `${name}.`, más un superadmin. Resultado: dry-run → 27 cambian; `--apply` → 27 aplicados y 27 filas `product.update` en `AuditLog`; segundo dry-run → 27 ya al día. Se repitió después de la revisión (§5). |

### e2e (runner con lock, base local sembrada)

Specs: `smoke`, `catalog-product-card`, `catalog-category-filter`, `customer-tutorial` y `catalog-public-copy`. Resultado en §5.

Tests e2e nuevos:
- `smoke`: hero y meta del home, la pregunta y la respuesta de precios, y la cabecera del catálogo sin "mayorista", con la línea nueva y su meta.
- `catalog-product-card`: a 390 × 844, la descripción va en el encabezado, debajo del título y arriba del cuerpo con la foto. Después de sumar el producto, la descripción no aparece en el mini-pedido ni en `/cart`.
- `customer-tutorial`: la escena del catálogo copia la cabecera real.

### Dry-run contra la base del `.env` (compartida, producción)

Una sola corrida, de solo lectura, antes de las correcciones de la revisión:

```text
Descripciones del catálogo · base ep-cold-paper-…-pooler…neon.tech/neondb · APP_ENV=production · simulación
Lectura dentro de una transacción de solo lectura (transaction_read_only=on).
#100 Almendra Non Pareil 25/27: cambia
    antes:   Almendra Non Pareil 25/27.
    después: Variedad Non Pareil, calibre 25/27: …
… (27 productos, todos "cambia")
Resumen: 27 productos · 27 cambian · 0 ya al día · 0 bloqueados
Simulación: no se escribió nada.
```

- **Los 27 nombres coinciden** con la base y ninguno está bloqueado.
- **Los 27 productos cambian:** hoy todos tienen el nombre más un punto.
- Las imágenes y los demás campos pasan el formulario del admin sin cambios.
- La revisión agregó un bloqueo más ("ya tiene una descripción propia"), que no aplica a ninguno: los 27 tienen la descripción de relleno.

## 4. Desvíos

- **`catalog:descriptions` corre con `tsx --conditions=react-server`:** el pedido decía `tsx scripts/catalog-descriptions.ts`. `product.service` importa `server-only` y sin esa condición `--apply` falla al cargarlo. Se vio en la prueba local. `db:seed-verify` ya usa el mismo flag.
- **El servicio del admin se carga solo con `--apply`:** arrastra `~/env` y Vercel Blob. El dry-run lee con `productDetailSelect` y el schema de detalle, sin el servicio.
- **`quintal-catalog.data.ts` se regeneró desde el fixture del xlsx**, no desde el xlsx. La equivalencia byte a byte está verificada (§3).
- **`descriptionOverrides` reusa el archivo de datos** en lugar de repetir los 27 textos, para que haya una sola copia. Se lee por nombre publicado y solo lo usa el perfil `coco-launch`.
- **Más bloqueos que el pedido.** Además del nombre, el script se niega con un producto:
  - eliminado;
  - con descripción propia (no pisa lo que alguien escribió en el admin);
  - que el formulario del admin no guardaría tal cual.

  El servicio reescribe el registro completo, así que se compara campo por campo para que solo cambie la descripción.
- **La página "Sé proveedor" queda en la lista permitida del test de guarda.** Dice "Si vendés por mayor, contanos qué ofrecés…": le habla al proveedor, no al cliente, y §2 del reporte no la lista. **Decisión pendiente de Flavio:** dejarla, o cambiarla por ejemplo a "Si vendés en volumen…" y sacar la excepción.
- **La accesibilidad de la ficha:** la línea de cierre y la descripción quedaron dentro del mismo `DialogDescription`, un `div` con dos párrafos. Así el lector de pantalla anuncia las dos al abrir. El `[data-slot='dialog-description']` ahora contiene también la descripción; el e2e de WP-B, que afirma su comienzo, sigue en verde.

## 5. Revisión independiente

La hizo un sub-agente nuevo con `q-review-code` (los dos ejes) y `q-review-comments`, sobre `main...HEAD`.

| Eje | Resultado | Hallazgos y qué se hizo |
| --- | --- | --- |
| Estándares | Pasa con hallazgos | <ul><li>**Menor:** `--apply` pisaba una descripción escrita a mano. **Corregido:** ahora bloquea; hay tests.</li><li>**Menor:** la descripción no formaba parte de la descripción accesible del diálogo. **Corregido** (§4).</li><li>**Nit:** el contador se leía "45/200". **Corregido:** se lee "45/200 caracteres".</li><li>**Nit:** la lista de carpetas de admin del test de guarda es más amplia que lo que hoy tiene coincidencias. **Se deja:** son carpetas de admin por definición, y el admin sí puede decir "mayorista" (proveedores).</li><li>**Nit:** entre releer y escribir hay una carrera de milisegundos (dos transacciones). **Se acepta** para un script de una vez; queda anotado.</li></ul> |
| Especificación | Pasa con hallazgos | <ul><li>**Menor:** la excepción de "Sé proveedor" (§4). Queda para Flavio.</li><li>**Nit:** las descripciones del seed de demo dicen "mayorista" ("Cajones mayoristas…", "Bolsa mayorista…"). Solo afectan las bases de demo y e2e. **Se deja.**</li></ul> |
| Comentarios | Falla → corregido | <ul><li>**Blocker:** el docstring de `applyDescription` prometía algo que no pasaba. Se reescribió, y con la corrección del bloqueo ahora es cierto.</li><li>**Sugerencia:** precisar los motivos de bloqueo en el encabezado del script y en el README. **Aplicada.**</li></ul> |

e2e, primera tanda: 37 pasan y 2 fallan, los dos e2e nuevos.
- **Ficha:** al sumar se abre el mini-pedido, que también es un `dialog`, así que el test esperaba mal que no quedara ningún diálogo. Ahora afirma sobre ese mini-pedido.
- **Tutorial:** la escena es `inert` y queda fuera del árbol de accesibilidad, así que no sirven las consultas por rol.

Las dos correcciones están en `c8ce384`.

**Re-corrida con `c8ce384`: 39/39 en verde.**

| Spec | Tests |
| --- | --- |
| `smoke` | 17 |
| `catalog-product-card` | 6 |
| `catalog-category-filter` | 3 |
| `customer-tutorial` | 11 |
| `catalog-public-copy` | 2 |

- Los intermitentes conocidos de `main` (`smoke.spec.ts:119` y `:212`, `customer-tutorial.spec.ts:58`) no fallaron.
- **Observado en el log del servidor:** un aviso de hidratación en `/products`, dentro de `CatalogFiltersSidebar` (`catalog-filters-sidebar.tsx:69`): la sección "Marca" no coincide entre el servidor y el cliente.
  - Ese archivo no cambia en esta rama y ningún test falla por el aviso.
  - No se comparó contra `main`. Queda como observación.
- La prueba local de `--apply` se repitió con el bloqueo nuevo: 27 cambian, 27 aplicados y 27 `product.update`, y después 27 ya al día.

## 6. Notas de QA

Para cargar con `qa:triage` cuando se despliegue WP-KL:

- **#119 → Re-test:**
  > `[19/11/2026 · triage] Implementado: la descripción del producto admite hasta 200 caracteres (Admin › Productos, con contador n/200) y se muestra en la ficha desplegada debajo del título y de la línea de cierre, antes de la foto en celular; la tarjeta y "Tu pedido" (mini-pedido y /cart) no la muestran; debajo de la bajada del catálogo dice "Seleccionamos productos de primera calidad.". Mirar: un producto con descripción propia la muestra debajo del nombre; uno sin descripción, o cuya descripción repite el nombre, no muestra el bloque; el admin no deja pasar de 200 caracteres. Precondiciones: WP-KL desplegado; hasta que se carguen las descripciones de #123, cargar una a mano para probar.`
- **#120 → Re-test:**
  > `[19/11/2026 · triage] Implementado: sin "Catálogo mayorista"; bajada del catálogo "Elegí lo que necesitás y sumalo a tu pedido de la semana."; descripción para buscadores y WhatsApp "Explorá productos y armá tu pedido de la semana."; bajada del hero y descripción del home sin "mayorista"; checkout, Mis pedidos y tutorial reescritos. Mirar: home, catálogo, ficha, checkout (los cuatro pasos y el resumen), Mis pedidos sin pedidos y el tutorial completo; "mayorista"/"al por mayor" solo en Cómo funciona, las preguntas frecuentes y el paso "Comprás junto a otros vecinos" del tutorial; compartir /products por WhatsApp muestra la descripción nueva (puede tardar por caché). Precondiciones: WP-KL desplegado. La página "Sé proveedor" conserva "Si vendés por mayor" (le habla al proveedor), a confirmar por Flavio.`
- **#122 → Re-test:**
  > `[19/11/2026 · triage] Implementado: la pregunta 6 del FAQ es "¿Cómo conseguimos estos precios?" con la respuesta del ticket tal cual. Mirar: home › Preguntas frecuentes, última pregunta, texto completo. Precondiciones: WP-KL desplegado.`
- **#123:** queda en Pendiente hasta el `--apply`. Después del deploy de #119, con el OK de Flavio, se corre:
  - `pnpm catalog:descriptions` (dry-run; tiene que dar 27 cambian y 0 bloqueados);
  - `pnpm catalog:descriptions --apply --actor-email <superadmin> --confirm-production` si `APP_ENV=production`.

  Nota para cuando el `--apply` termine:
  > `[dd/mm/aaaa · triage] Cargadas las 27 descripciones con pnpm catalog:descriptions (cada una con su product.update en AuditLog); las castañas de cajú sin sal y salada comparten texto, y "Pecan premium" (#107) usa el de "Nuez pecán premium". Mirar: abrir cada producto del catálogo y comparar la descripción bajo el título con el ticket; Admin › Productos muestra el mismo texto. Precondiciones: WP-KL desplegado y --apply corrido.`
- **#92 (D8):** cuando se carguen las descripciones de #123, pasa a la papelera con:
  > `[dd/mm/aaaa · triage] Superado por #119 y #123: la ficha muestra la descripción específica de cada producto debajo del título y las 27 ya están cargadas.`

  **#91** sigue Bloqueado: los textos de los mix no dicen qué contienen.

## 7. Registro de ejecución

- **Base:** `main` en `a1386fe`. Rama `wpkl-descriptions-copy`.
- **Commits:** `1101f1c` (#119), `9e7abd8` (#120), `f3e1887` (#122), `b9b870b` (#123), `c8ce384` (revisión) y este registro.
- **Base compartida:** dos lecturas, las dos de solo lectura (`SET TRANSACTION READ ONLY` y su verificación con `SHOW`):
  - el texto de los tickets y los productos 100 a 126;
  - un dry-run de `catalog:descriptions`.

  No se escribió nada. No se corrió `pnpm dev`, ningún `db:*` salvo `db:generate`, ni `prisma migrate`.
- **Pendiente para el orquestador:**
  - decidir con Flavio la excepción de "Sé proveedor";
  - mergear, desplegar y correr `--apply` con su OK;
  - cargar las notas de §6.
