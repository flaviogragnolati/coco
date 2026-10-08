# Reporte: tickets de QA abiertos (2026-10-08)

> **Fuente:** `/admin/qa-tickets` (tabla `qa_ticket`). 41 abiertos: 14 `pending` nuevos (#70–#83, home, creados el 02/10) y 27 `failed`/`blocked`/`needsClarification` de la pasada del 04/09.
> **Estado:** decisiones alineadas con Flavio el 2026-10-08. Este reporte es el insumo del plan de ejecución.
> **Glosario:** `CONTEXT.md` actualizado. Cambian *Home spotlight* y *Offers ranking*, *Pickup point* suma "centro de retiro" a `_Avoid_` y se agregan *Delivery preference*, *Fixed quantity* y *Supplier application*.

## Tickets nuevos (home)

| Ticket | Título | Descripción (problema) | Solución propuesta (decisiones tomadas) | Esf. |
| --- | --- | --- | --- | --- |
| #70 | Hero: ilustración en vez de ficha | La ficha de producto del hero trae su propio "Sumar al pedido", que compite con el CTA principal. | Componente estático en código (`home-system-illustration.tsx`): SVG/lucide con tokens de marca, `role="img"` y alt en español, label "Proveedor" según el glosario. El hero queda con un solo CTA, "Ver qué se puede comprar". El **Producto destacado** se mueve a una **banda propia entre "Cómo funciona" y la grilla**: reutiliza la tarjeta grande y el selector del admin, y sigue excluido de la grilla. De paso se corrige el preview del admin, que hoy muestra un producto de más. | M |
| #71 | "Cómo funciona" en una sola secuencia | Tres bloques repiten la misma idea: trust strip, problema/solución y los `heroSteps`. | Nuevo `how-it-works-section.tsx` (`#como-funciona`, `<ol>` numerada). Se eliminan `trust-strip`, `problem-solution-section` y `heroSteps`, y las 2 líneas del FAQ que repiten el paso 2. Copy ajustado al glosario: "precio mayorista" y "lo que vos necesitás". **Paso 5 interino** hasta que salga F1: "Cuando llega, te lo llevamos a la dirección que cargaste o te avisamos para retirarlo en nuestro punto de retiro." Con F1 pasa al copy del ticket, con "punto de retiro". | S |
| #72 | "Los productos más pedidos" + filtro | Con el ranking actual (fijados + ahorro/descuento) el título no sería cierto, y el filtro no estaba especificado. | Nuevo criterio de ranking **`orderVolume`** (pedidos pagados por producto, últimos 90 días). El admin lo elige junto a ahorro y descuento, **sin pasar a ser el default**. Los fijados del admin siguen primero y el criterio rellena el resto. **Título automático por criterio:** "Los productos más pedidos", "Los mejores descuentos" u "Ofertas destacadas" (ahorro). **Filtro:** chips por unidad (Todos · kg · caja · unidad), ocultos si hay menos de 2 opciones; el server trae un pool de unas 24. Requiere migración del enum y una entrada de glosario (lo exige el drift test). | M |
| #73 | Selector de cantidad en la ficha | La ficha muestra "Mínimo" y "Total del mínimo" fijos y siempre suma el MOQ: desde el home no se puede elegir cuánto. | Selector –/+ con las reglas del carrito (`QuantityStepper`, `normalizeCartQuantity`): **piso en el MOQ**, que es por cliente; sube de a step y frena en el máximo. El total se calcula en vivo con `calculateLineTotal`, y "Sumar al pedido" agrega la cantidad elegida. **Cantidad fija** (sin step): sin selector, solo "12 unidades · Total $X". **Ya en el pedido:** "✓ Ya tenés N en tu pedido" + "Ver en tu pedido", y la cantidad se cambia en /cart. | M |
| #74 | Quitar el ahorro vs. góndola | "Ahorrás $X vs. góndola" aparece en el home y en /products. | **Ocultar sin eliminar**, con un switch único en código (`SHOW_MARKET_SAVING = false`) para todas las vistas de cliente: grilla, banda destacada, tarjeta y detalle de /products. Se conservan los formatters, `marketPrice`, el criterio "Ahorro" y el campo del admin; solo cambia el help text del campo. | S |
| #75 | Quitar FAQ "cantidad mínima" | Pregunta que sobra. | Eliminar el ítem de `faqItems` (`home-content.ts`). | S |
| #76 | Quitar FAQ "demanda no entra en una operación" | Pregunta que sobra. | Eliminarla; no se menciona en otro lugar del home. Hay que enmendar `home-community-redesign.md` (§2 y T17 pedían conservarla). | S |
| #77 | Reformular "¿Cuánto tarda…?" | Falta un plazo concreto. | Copy del ticket con dos ajustes: "…entre 7 y 10 días **desde que tu pedido entra en preparación**…" y el cierre "Vas a ver cada etapa en **Mis pedidos**." Hay que enmendar T21 del redesign, que prohibía "10 días". | S |
| #78 | FAQ "¿Cómo retiro mi pedido o lo recibo en casa?" | Promete una elección que hoy el cliente no tiene. | **Se publica junto con F1.** Usa "punto de retiro" (no "centro de retiro") y no dice "servicio de mensajería". Va después de "¿Cuánto tarda…?". | S |
| #79 | "carrito" → "pedido" en el FAQ | El FAQ usa "carrito". | **Solo FAQ:** después de #75 no queda ningún "carrito". Se abre un **ticket aparte de vocabulario** para decidir carrito/pedido en toda la tienda; ojo, choca con "Mis pedidos". | S |
| #80 | Imágenes reales | Todas las fichas muestran el placeholder, y el admin solo acepta URLs. | **Upload desde el admin a Vercel Blob**: `@vercel/blob`, `BLOB_READ_WRITE_TOKEN` y una route de upload modelada sobre la de evidencia QA, en los campos card/cart/images del form de producto. Además, poner entre comillas el `url("…")` de `ProductImage`. | M |
| #81 | Catálogo real de Quintal | El catálogo es ficticio. | **Quintal es el Supplier del MVP.** Un parser convierte el Excel en `quintal-catalog.data.ts` tipado (zod + test), que se commitea. **Seed nuevo `db:seed:init`:** idempotente, solo carga Quintal (supplier, productos, supplier terms y client terms), no borra nada y es apto para producción. **El seed actual pasa a `db:seed:test`** con el catálogo demo intacto (fixtures y QA) y se niega a correr con `APP_ENV=production`. | L |
| #82 | WhatsApp real | El link es el placeholder `wa.me/5491100000000`. | Constante única con solo los dígitos, de la que salen el href y el texto visible. Mientras sea `null`, el ítem se oculta. | S |
| #83 | "Sé proveedor" en el footer | La columna Nosotros tiene un solo link. | Link a una **página nueva `/proveedores` con formulario**. Las *Solicitudes de proveedor* se guardan en la DB (modelo nuevo) y se listan en el admin para marcarlas como contactadas. Sin email. Hay que enmendar el redesign, que lo había diferido. | M |

## Ítems nuevos surgidos del análisis

| Ítem | Título | Descripción | Solución propuesta | Esf. |
| --- | --- | --- | --- | --- |
| F1 (de #71/#78) | El cliente elige el modo de entrega | Hoy el checkout solo pide una dirección y el admin decide el modo al crear el envío. | Opciones: **domicilio o punto de retiro** (el retiro en depósito sigue siendo interno). **Entidad nueva *Punto de retiro*** con ABM en el admin (dirección, horario, indicaciones); el cliente elige uno en el checkout. La *Delivery preference* se guarda en el pedido. El diálogo de envío agrupa y precarga según esa preferencia; el admin puede cambiarla con override auditado, visible en el journey. Mismo precio para ambas opciones. Cruza checkout, fulfillment, admin y tracking, así que **conviene un grill propio antes de planificarla**. | L |
| B10 (de #33/#48) | Motivo crudo en el aviso "Reprogramado" | El cliente ve "Confirmacion parcial del proveedor en la linea LITEM-…" (`supplier-order.service.ts:671`). | Mostrar al cliente un motivo legible; el detalle técnico queda solo en el admin. | S |

## Tickets antiguos (27): Fase 0

Los fixes de `qa-open-tickets-remediation.md` (1929045) y de `qa-mercadopago-pending.md` (6a25a61) están en `main` y **desplegados desde el 19/09**, pero **nunca se corrió `pnpm qa:seed`**. Por eso la DB tiene el texto viejo, #15 sigue activo y nadie los reabrió.

| Grupo | Tickets | Acción |
| --- | --- | --- |
| Corregidos en código | #2, #3, #16, #30, #33, #36, #45, #48, #54, #61, #69 | Re-test. #69 lo corre un dev en un branch de Neon (`db:seed` + `db:seed-verify`). |
| Solo texto reescrito | #12, #18, #20, #21, #22, #23, #24, #25, #26, #31, #32, #37, #42, #67 | `qa:seed` + re-test. Para #21, #23 y #24 hay que pasarle al tester el comprador y las tarjetas de prueba de MP. |
| Ajustar texto antes del seed | #38, #54, #16 | #38: pedir una cuenta `admin` no superadmin (el tester ya es superadmin) y tocar y revertir un valor inocuo. #54: precondición "paquete fraccionado después del deploy". #16: resultado esperado = el pago externo queda *Pendiente* y MP redirige a Checkout Pro. |
| Retirar | #15 | Lo retira el `qa:seed`. |

Pasos: ajustar #16, #38 y #54 → `pnpm qa:seed` (solo texto, en la DB compartida) → reabrir los 29 como `pending` (los 27, contando #2 y #38, que habían quedado fuera de las listas) → actualizar el §17 de ambos planes (desplegado el 19/09, `db:seed` corrido el 25/09).

## Insumos externos (bloqueantes)

- **Excel de Quintal** (#81) y fotos con derechos de uso (#80).
- **Vercel:** crear el Blob store y `BLOB_READ_WRITE_TOKEN` (#80).
- **Número de WhatsApp** contratado (#82).
- **Texto legal** de los términos, a cargo de negocio/legal; bloqueante para producción, no para QA (#16).

## Orden sugerido

1. Fase 0 (tickets antiguos) + B10.
2. Copy del home: #75, #76, #77, #79, #71 (paso 5 interino), #74.
3. Grilla y fichas: #73, #72, #70 + la banda del destacado.
4. Catálogo: #81 → #80.
5. Footer: #83, #82.
6. F1 + #78 (después de su grill).

**Companions:** el conteo de FAQ en `e2e/smoke.spec.ts:27` pasa de 7 a 5, y a 6 con #78. Además: los tests de `home-ranking` y `home-formatters`, `glossary/data/catalog.ts` (drift test), `docs/schema-reference.md` y las enmiendas a `docs/plans/home-community-redesign.md`.

## Registro de ejecución (2026-10-08)

**Estado:** implementado y mergeado en `main` todo salvo **F1 y #78**, que esperan su grill. Cada workstream se hizo en un worktree aislado, con su mini review (`q-review-code` + `q-review-comments`) y su merge `--no-ff`. Nada se corrió contra la DB.

| Ítem | Merge | Resultado | Desvíos y decisiones |
| --- | --- | --- | --- |
| B10 | `e0bb1b1` | El cliente ve una frase fija según la causa, por ejemplo "El proveedor no confirmó toda la cantidad pedida.". El motivo completo queda solo en el admin, el evento y la auditoría. Se resuelve al leer, así que corrige también los eventos viejos. | Cubre también los motivos de recepción incompleta, cierre definitivo y baja de paquete. Las incidencias siguen mostrando el texto del admin. |
| #73, #74 | `98ecc3a` | Selector –/+ en la ficha (cart rules, total en vivo, agrega la cantidad elegida). Cantidad fija sin selector. "Ya tenés N en tu pedido". `SHOW_MARKET_SAVING = false` en home y /products. | `isFixedQuantity` también trata como fija la cantidad cuando el máximo no deja ningún step. |
| #80 | `2d30cc0` | `POST /api/admin/product-images` sube a Vercel Blob. Botón "Subir" en los campos de tarjeta, carrito y galería. `cssUrl()` entrecomilla la URL. | Límite de 4 MiB (Vercel corta a 4,5 MB). Solo JPEG, PNG y WebP; el tipo se verifica por los primeros bytes. Sin token, la carga responde 503. |
| #72 | `36e416f` | Criterio `orderVolume` ("Pedidos (90 días)") y título según el criterio. Chips por unidad sobre un pool de 24. Migración `20261008100000_home_offers_order_volume`. | Pedido pagado = `UserOrder` en `processing` o `completed`, con transacción `completed` dentro de los 90 días e ítem `submitted`. Se cuenta por producto, no por client terms. |
| Fase 0 | `fff0ca4` | Textos de #16, #38 y #54, y también de #33 y #48 para alinearlos con B10. Se agregó el §17 a los dos planes. | `qa:seed` **no reabre** tickets: solo reescribe texto y retira #15. Se reabren **26**, no 29 (los 27 ya incluían #2 y #38, menos #15). |
| #70, #71, #75, #76, #77, #79, #82 | `8a7ec78` | Ilustración en el hero con un solo CTA. Banda "Producto destacado". "Cómo funciona" en 5 pasos con el paso 5 interino. FAQ de 5 ítems. WhatsApp oculto (`WHATSAPP_NUMBER = null`). Preview del admin corregido. Enmiendas en `home-community-redesign.md`. | En la FAQ también quedaba "armar tu carrito", que pasó a "pedido". |
| #83 | `5c5d7e4` | `/proveedores` con formulario (honeypot y CHECK de email o teléfono). Admin "Solicitudes de proveedor" con "Marcar como contactada" auditado. Migración `20261008200000_supplier_application`. | Sin enum de estado: `contactedAt` vacío significa pendiente. No tiene rate limit (follow-up). |
| #81 | `259cff3` | Parser del Excel con `fflate` y `fast-xml-parser`, más `scripts/quintal-catalog.data.ts` (88 productos, 29 categorías). `db:seed:init` solo inserta. `db:seed` pasa a `db:seed:test`, que se niega a correr con `APP_ENV=production`. | Decisiones de Flavio: precio al cliente = precio de lista (sin margen ni IVA). MOQ 1 kg o 1 unidad, step 1. Se incluye OTROS. Identidad por nombre, sin migración. Si un producto tiene varias presentaciones, se carga la más barata por unidad. Los tiers por volumen y los recargos por fraccionado quedan solo como referencia. El Excel no se commitea. |

**Commit en `main`:** `7d8078f` alinea en `CONTEXT.md` y en el glosario que el precio de góndola y el ahorro ya no se muestran al cliente.

**Evidencia:** `pnpm typecheck` limpio y `pnpm test` con 86 archivos y 1469 tests verdes en `main` después del último merge. Biome está limpio en todos los archivos tocados. `pnpm check` falla en todo el repo, pero ya fallaba antes y solo en archivos que no se tocaron (`.agents/**`, `skills-lock.json`, `.vscode/launch.json`, `field.tsx`, `domain-event-publisher.ts`, `audit-log.service.ts`). **No se corrieron los e2e** (`smoke`, `home-offer-quantity`, `supplier-application`) ni se hizo prueba visual.

**Mini review:** todos los workstreams pasaron `q-review-code` "con findings, sin blockers" (corregidos o anotados abajo) y `q-review-comments` "pass" o "pass con findings aplicados".

**Acciones pendientes del usuario (escriben en una DB o son externas):**

1. Aplicar las migraciones `20261008100000_home_offers_order_volume` y `20261008200000_supplier_application` antes del deploy.
2. Deployar (B10 tiene que estar antes de `qa:seed`). Después: `pnpm qa:seed`, reabrir los 26 tickets (SQL o admin en el §17 de `qa-open-tickets-remediation.md`) y pasarle al tester el comprador y las tarjetas de MP (#21, #23, #24) más una cuenta `admin` que no sea superadmin (#38).
3. Vercel: crear el Blob store para tener `BLOB_READ_WRITE_TOKEN`, redeployar y subir las fotos con derechos de uso.
4. Producción: correr `pnpm db:seed:init` y corregir la dirección placeholder de Quintal en el admin. Poner `APP_ENV="production"` en todo `.env` que apunte a producción.
5. Cargar `WHATSAPP_NUMBER` cuando esté el número contratado.

**Follow-ups:**

- F1 + #78 (grill de diseño).
- Ticket de vocabulario carrito/pedido (#79).
- Título "Reprogramado despues de asignacion": sin tildes y con un término interno.
- Rate limit en `/proveedores`.
- Los blobs reemplazados no se borran.
- Margen y vigencia de la lista de Quintal: precios del 02/07, margen 0. Confirmar antes de producción.
- Renombrar un producto Quintal en el admin lo duplica en el próximo `db:seed:init`.
- "Mix de frutos secos cervecero premium" pertenece a la línea media.
- Tests de componentes React: el repo no tiene setup.
