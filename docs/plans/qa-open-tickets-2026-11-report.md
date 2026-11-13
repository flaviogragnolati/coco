# Reporte: tickets de QA abiertos (2026-11-13)

> **Fuente:** `/admin/qa-tickets` (tabla `qa_ticket`), leída el 2026-11-13. Hay **66 `pending`** y 41 `passed`. Ningún ticket está en `failed`, `blocked` ni `needsClarification`. Los códigos #94, #95 y #96 no existen en la base.
> **Estado:** triage. Las soluciones son propuestas apoyadas en el código de `main` (`a0ef619`). El 13/11 Flavio tomó las decisiones de la sección "Decisiones de Flavio". La ejecución sigue en `qa-open-tickets-2026-11-orchestration.md`.
> **Glosario:** el 13/11 se agregaron *QA re-test* y *Combo* a `CONTEXT.md`.

## Resumen

| Grupo | Tickets | Situación |
| --- | --- | --- |
| Casos del ciclo de vida, pasada del 04/09 | 26: #2 a #69 | Están corregidos en código o tienen el texto reescrito. Se reabrieron el 24/10 y **solo falta el re-test**. Siguen mostrando la nota vieja del 04/09. |
| Tickets de home y catálogo de octubre | 20: #70 a #89 | **Implementados** (8/10 y 11/10). Falta el re-test. **Ocho quedaron superados** por tickets nuevos. |
| Tickets nuevos | 20: #90 a #93 y #97 a #112 | Hay 1 bug, 7 mejoras, 8 features nuevas, 2 cambios de decisión (#105 y #106) y 2 de contenido. |

### Clases usadas

- **Bug:** algo que hoy funciona mal.
- **Mejora:** ajuste de UI o de texto sobre algo que ya existe.
- **Feature nueva:** no existe; pide un modelo, un flujo o una integración nuevos.
- **Cambio de decisión:** revierte algo que ya se decidió e implementó, en un plan o un ADR.
- **Contenido:** se resuelve cargando datos o textos, no (solo) con código.
- **Falta definir:** no se puede ejecutar sin un insumo o una decisión externa.
- **Re-test:** está corregido o implementado y falta que QA lo corra.
- **Superado:** lo reemplaza un ticket nuevo. Se propone cerrarlo sin re-test.

## Tickets nuevos (#90–#112)

| Ticket | Título | Clase | Hoy | Solución propuesta | Esf. |
| --- | --- | --- | --- | --- | --- |
| #93 | «Ver qué se puede comprar» duplica `#ofertas` y traba la página | **Bug** | El CTA es un `<Link href="#ofertas">` de Next (`home-hero.tsx:29`). No hay ningún listener de hash. **Hipótesis sin reproducir:** el router de Next 16.2, sobre una home dinámica, cachea la ruta con el hash incluido y en cada clic le concatena otro. El scroll después busca el id `ofertas#ofertas`, que no existe. | Reproducirlo primero (`q-code-debug`). El fix probable es un `<a>` nativo, o un `scrollIntoView` más `history.replaceState`, sin pasar por el router. Revisar también los links `/#ofertas` del navbar (`home-content.ts:5`). **Con #99 el CTA pasa a `/products`**, así que en el hero el problema desaparece solo. Igual hay que arreglar el navbar. | S |
| #97 | Ocultar «Sin galería adicional» | Mejora | El estado vacío de `product-details-dialog.tsx:156-161` se muestra en todo producto con menos de 2 imágenes, o sea en casi todos. | Borrar la rama `else`. **Se hace junto con #107**, que pide lo mismo. | XS |
| #109 | Escribir la marca "CoCo" | Mejora | "CoCo" aparece 0 veces. "Coco" aparece 33 veces en 23 archivos: metadata (`layout.tsx:33`, `page.tsx:13` y los títulos de cada página), pie (`home-footer.tsx:57`), textos del home, login, tutorial y `appName` de Better Auth. | Reemplazar todas las apariciones visibles, también en el admin y en el tutorial. Título: "CoCo \| Compras comunitarias en Ushuaia". **El wordmark en minúscula "coco"** (navbar, h1 del hero, pie, ilustración) **no cambia**, porque el ticket deja el logo fuera. Los identificadores de código no se tocan. | S |
| #103 | Filtrar el catálogo por categoría y no por kg/unidad | Mejora (casi hecha) | #88 ya agregó los chips de categoría en /products (`?categoria=<id>`). Queda el filtro "Unidad" del sidebar (`catalog-filters-sidebar.tsx:172-190`). Los chips kg/unidad del home se van con #101. | Sacar el bloque "Unidad" del sidebar (y el param `unit`, o dejarlo sin UI). Llegar desde el menú de #102 ya funciona con `?categoria=`. | XS |
| #107 | Refinar la ficha desplegada | Mejora | En `product-details-dialog.tsx`: subtítulo fijo "Información comercial vigente…" (`:88-91`). Descripción con fallback genérico (`:164-167`); como las descripciones de Quintal son el nombre más un punto, parece que repite el nombre. Imagen 4:3 `bg-cover`. Los similares se eligen por marca y después por unidad, **sin mirar la categoría** (`catalog-filtering.ts:181-234`): todos los productos no tienen marca, por eso al aceite le sale la sal. Hay dos controles de cierre: la ✕ (con label en inglés, "Close") y el botón "Cerrar" (`:196-204`). | Imagen 1:1 con los ajustes de #106. Subtítulo "Entra en el cierre del miércoles 11/11 a las 12 · Llega en 7 a 10 días", con la fecha de #98. El bloque de descripción se oculta si falta o si es igual al nombre. Sale «Sin galería adicional» (#97). Similares: filtrar por `category`, que ya está en el DTO. Se va el botón "Cerrar" y la ✕ pasa a decir "Cerrar". Si se quita el subtítulo, dejar un `DialogDescription` sr-only. | S–M |
| #99 | Nuevo texto del hero | Mejora + **falta definir** | El texto está fijo en `home-hero.tsx` ("coco", "Compras comunitarias", CTA a `#ofertas`, "Mirá el catálogo sin registrarte"). La franja superior repite esta última frase (`home-content.ts:10-11`). | Título, bajada, línea de cierre, CTA "Ver el catálogo" a `/products` y "No hace falta registrarte para mirar" debajo. La frase sale de la franja. La línea de cierre se arma con la configuración de #98 en vez de quedar fija. **Falta elegir el título** entre las dos opciones. El tutorial reusa `HomeHero` y el smoke e2e chequea el href. | S |
| #100 | Cómo funciona: una leyenda y cuatro pasos | Mejora (**supera #71**) | Hay 5 pasos (`home-content.ts:13-19`), y el 3 es "No somos una distribuidora…". El diagrama (`home-system-illustration.tsx`) **está en el hero, no en esta sección**, y su figcaption ya es casi la leyenda del ticket. | Los 4 pasos del ticket y se va el paso 3. **Hay que definir** si el diagrama baja a "Cómo funciona" (es lo que sugiere el recorrido del ticket) o queda en el hero. El paso 1 ("hasta el miércoles a las 12") sale de #98. **El paso 4 contradice el flujo actual** (hoy la entrega se elige en el checkout) hasta que salga #105. | S |
| #104 | Reformular las preguntas frecuentes | Mejora (**supera #75–#79**) + **falta definir** | Hoy hay 6 preguntas (`home-content.ts:46-76`). Dos de ellas ("¿Necesito una cuenta…?" y "¿Qué pasa después del pago?") se van. | Las 6 preguntas en el orden del ticket. La dirección del punto de retiro sale de la tabla `PickupPoint` si hay uno activo. **Bloqueante:** los textos están en el documento "CoCo · Tickets del recorrido", **que no está en el repo**. Las respuestas sobre entrega y pago dependen de #105 y #110. Hay que actualizar `home-content.test.ts` y el smoke e2e. | S |
| #98 | Contador hasta el próximo cierre | **Feature nueva** | **El cierre semanal no existe en ninguna parte**: las operaciones las lanza el admin a mano. `home-community-redesign.md` decidió una franja "sin fecha de cierre". Sí existe `BUSINESS_TZ` (`date.helpers.ts:10`). No hay tabla de configuración general, solo `HomeOfferSettings`. | Singleton `ClosingSettings` (o columnas en un singleton existente) con día y hora (por defecto miércoles 12:00), editable en el admin. Un helper puro `getNextClosing(now)` en hora de Argentina, con tests. Un componente cliente en la franja superior o el navbar que se actualiza por minuto: "faltan 2 días y 5 h" o, con menos de 24 h, "faltan 5 h 20 min". **Es la base de #99, #100, #104 y #107.** Hay que decidir si el contador es **solo informativo** o si además corta algo, por ejemplo mandar a la semana siguiente lo que entra después del cierre. | M |
| #102 | Menú de categorías y buscador en la barra | Feature nueva (en parte existe) | **El buscador ya existe** (`navbar-search.tsx`), pero se oculta en /products y en pantallas chicas. No hay menú de categorías, y la única query de categorías es la del admin. | Query pública `catalog.categories`: activas y con productos vigentes. Dropdown "Categorías" en el navbar y en el menú mobile que lleva a `/products?categoria=<id>`. El buscador queda como está, porque el ticket prioriza categorías. | S–M |
| #106 | Simplificar la tarjeta de producto | **Cambio de decisión** + mejora | **Revierte parte de `573f722` (23/10)**: el total va dentro del botón ("Agregar · $ 11.300", `purchase-panel.tsx:139-145`), el comparativo se oculta con paso de 1 kg/1 L (`commerce.helpers.ts:334`), la unidad va adentro del stepper y se trunca (`quantity-stepper.tsx:122`), la imagen es 3:2 `bg-cover` y el precio dice "por bidón 5 L" (`home-formatters.ts:66-73`). | Imagen 1:1 con `bg-contain`. El botón dice solo "Sumar al pedido", sin ícono ni monto, en todas las tarjetas (el catálogo hoy dice "Agregar"). El stepper muestra solo el número en las tarjetas; el carrito lo conserva. "$ 137.400 por bidón", sin el tamaño, en `getOfferStepLabel`. El comparativo se muestra siempre. Aplica a la tarjeta del catálogo, la del home, el destacado y la mini-tarjeta de similares. **Hay que confirmar que el total desaparece de la tarjeta.** Se rompen 6 checks e2e y los tests del comparativo. | M |
| #101 | Reemplazar "Ofertas destacadas" por combos | **Feature nueva** + **falta definir** | Hoy hay una grilla con criterio de ranking (ahorro, descuento o más pedidos), productos fijados por el admin y chips kg/unidad. **El combo no existe.** | **Primera etapa en configuración fija en código**, como permite el ticket: `combos.ts` con nombre y dos tamaños (1 y 2 personas) como listas de `{productId, cantidad}`. La tarjeta muestra los productos y la suma de los precios vigentes. "Sumar combo" agrega cada línea al pedido con la lógica de `syncLocal` (normaliza cantidades y avisa los que no están disponibles). **Segunda etapa:** ABM en el admin. Salen la grilla, los chips y (a decidir) la pantalla de ranking del admin. **Bloqueante:** el contenido de los combos ("a confirmar"). **Supera #72.** | M (fijo) / L (admin) |
| #110 | 10 % de descuento por transferencia | **Feature nueva** (toca ADR 0008) | No hay descuento por medio de pago ni línea de envío. El total del pedido es el monto de la transacción. Los snapshots de línea guardan el precio sin descuento. El ADR 0008 rechazó un segundo mecanismo de descuento porque obliga a definir acumulación, precedencia y snapshot. | El porcentaje va en los settings del pago externo (`payment_provider_config`, sin migración de config). El descuento se calcula sobre el subtotal de productos, se redondea a peso entero y **queda en el snapshot** del pedido o la transacción, así el detalle cierra. Se acumula sobre el precio que ya tiene el descuento de oferta. Se muestra en la ficha, en el pedido y en el paso de pago. `confirmAndPay` tiene que tener en cuenta el medio al reusar un intento (`checkout.service.ts:754`). Los términos pasan a `checkout-v4`. **Conviene un ADR**: es plata, es difícil de revertir y es una excepción a la 0008. | M–L |
| #112 | Historial de compras y repetir pedido | Feature nueva (el historial existe) | "Mis pedidos" ya lista fecha, código, total y estado, y el detalle muestra los productos. **No existe la opción de repetir.** Los términos viejos suelen estar cerrados (ADR 0008), así que no se pueden reusar los ids del snapshot. | Botón "Repetir pedido" en el detalle. Una mutación que lleva cada `product.id` del snapshot a sus **términos vigentes**, suma al pedido abierto con la normalización de `cart.service.ts` y devuelve qué se agregó, qué se ajustó y qué ya no está. Después, ir a /cart, donde se edita. Vocabulario: "Mis compras" se dice "Mis pedidos" en la app (`customer-vocabulary-pedido.md`). | M |
| #111 | Elegir por dónde recibir los avisos | **Feature nueva grande** | **No existe ningún envío de avisos**: no hay proveedor de correo ni de WhatsApp, ni un modelo de aviso en la plataforma, y `User` no tiene teléfono. Hay un modelo `Channel` sin uso. El outbox de eventos tiene un solo listener y no hay worker. La UI ya promete "te avisamos" (`checkout-delivery-step.tsx:57`, `home-content.ts:69`). | **Grill de diseño, junto con #105.** Por etapas: 1) avisos en la plataforma (modelo, campanita, listener del outbox), 2) correo (Resend o similar, con dominio verificado), 3) WhatsApp Business (cuenta de Meta, plantillas aprobadas, teléfono validado y consentimiento). Las preferencias por usuario se piden al confirmar la primera compra. | XL |
| #105 | Elegir la entrega cuando el pedido está listo | **Cambio de decisión** + feature nueva grande | **Contradice el ADR 0011** y el plan `customer-delivery-preference.md` (implementado el 09/10): hoy la entrega se elige en el paso "Entrega" del checkout. No existe un estado "listo para entregar" (el estado de fulfillment se deriva, ADR 0002), ni día y franja, ni costo de envío, ni avisos (#111). Una preferencia nula hoy significa "pedido viejo". | **Grill de diseño, con un ADR que reemplace al 0011.** Hay que definir: comando o estado derivado "listo", autoservicio del cliente después del pago, día y franja (modelo nuevo), cómo se paga el envío y el agrupado por día y franja en el admin. Cambian el checkout (sale un paso), los términos, el FAQ, el paso 4 de #100, el tutorial y `CONTEXT.md`. **Duda clave:** "el costo corre por su cuenta" puede querer decir **segundo cobro en CoCo** (un tipo de pago nuevo en MP y en transferencia) o **le paga al repartidor**. | XL |
| #90 | Leyenda "Imagen ilustrativa" en las fotos | **Feature nueva** | El upload (`api/admin/product-images/route.ts:78`) sube el archivo crudo a Blob. No hay librería de imágenes; `sharp` solo viene como dependencia opcional de Next. `Category` no tiene color. Las URLs pegadas a mano no pasan por el upload. | **Recomendado: overlay en `ProductImage`**, el único componente que usan todas las vistas. Va abajo a la derecha, con un tamaño relativo al ancho (unidades de contenedor, ~2,5 %) y un color tomado de un campo `color` nuevo en `Category`. Cubre las imágenes existentes y las URLs pegadas, y se "regenera" sola cuando cambia la categoría. **Literal del ticket:** estampar con `sharp` al subir y guardar el original; necesita dependencia, fuentes en serverless, migración y un job para regenerar. Es L. Con el overlay, la imagen descargada o compartida no lleva la leyenda. | S (overlay) / L (estampado) |
| #108 | Presentaciones dentro de la ficha | **Feature nueva** (modelo de datos) | No hay agrupación: los tres aceites son tres productos separados con el tamaño en el nombre. El carrito se indexa por términos. | **H2**, como dice el propio ticket. Necesita su propio grill: modelo de grupo, asignación en el admin, hermanos en la API del detalle, selector que cambia producto y términos, si la grilla los colapsa en una tarjeta y sacar a los hermanos de "similares". Mientras tanto, #107 (similares por categoría) muestra las otras presentaciones como similares. | L |
| #91 | Composición de los "mix" | **Contenido** | Las descripciones de Quintal son el nombre más un punto (`quintal-launch-catalog.parser.ts:120`). Los 3 mixes no dicen qué tienen. | Pedirle la composición a Quintal y cargarla como override por producto en `quintal-catalog.overrides.ts`. **No hacerlo solo en el admin**: `quintal-catalog.data.ts` es generado y el reset del catálogo compara las descripciones contra él. | S + contenido |
| #92 | Descripciones específicas | **Contenido** + mejora | Mismo origen que #91. El detalle muestra "Producto disponible para pedidos mayoristas compartidos." si falta la descripción, y el carrito tiene otro fallback. **Bug lateral:** desde el admin no se puede vaciar una descripción (`nullishText` convierte "" en `undefined` y Prisma deja el valor viejo). Lo leí en el código, no lo reproduje. | Contenido: redactar la descripción de los 27 productos activos (tipo, características, composición, presentación) y cargarla por overrides, igual que #91. Código: ocultar el bloque cuando no hay descripción (con #107) y arreglar el vaciado en el admin. **¿Quién redacta los textos?** | S + contenido |

## Tickets de octubre (#70–#89): implementados, falta el re-test

| Ticket | Título | Clase | Nota |
| --- | --- | --- | --- |
| #70 | Ilustración en el hero | Re-test | Sigue vigente. Si #100 baja el diagrama a "Cómo funciona", cambia de lugar. |
| #71 | "Cómo funciona" en una secuencia | **Superado por #100** | |
| #72 | "Los productos más pedidos" + filtro | **Superado por #101** | La sección se reemplaza por combos y se van los chips. |
| #73 | Selector de cantidad en la ficha | Re-test | #106 cambia el stepper (solo el número) y el botón. Conviene re-testear después de #106. |
| #74 | Quitar el ahorro vs. góndola | Re-test | |
| #75 | Quitar FAQ "cantidad mínima" | **Superado por #104** | |
| #76 | Quitar FAQ "demanda no entra" | **Superado por #104** | |
| #77 | Reformular "¿Cuánto tarda…?" | **Superado por #104** | |
| #78 | FAQ "¿Cómo retiro…?" | **Superado por #104** | Su respuesta depende de #105. |
| #79 | "carrito" → "pedido" en el FAQ | **Superado por #104** | El vocabulario de toda la tienda ya se resolvió en `customer-vocabulary-pedido.md`. |
| #80 | Imágenes reales | Re-test | El upload a Blob existe. #90 se apoya en esto. |
| #81 | Catálogo real de Quintal | Re-test | 27 productos activos, todos con categoría, después del reset del 16/10. |
| #82 | WhatsApp real | **Falta insumo** | `WHATSAPP_NUMBER` sigue en `null` (`home-content.ts:88`), así que el ítem está oculto. Falta el número contratado. |
| #83 | "Sé proveedor" en el pie | Re-test | |
| #84 | Reordenar la ficha | Re-test después de #106 | `573f722` ya cambió esto y #106 lo vuelve a cambiar. |
| #85 | Sacar info interna del catálogo | Re-test | |
| #86 | Actualización masiva de precios | Re-test | Sigue abierto el "registro con fecha", diferido el 11/10. Mientras tanto, cada cambio deja su fila en `AuditLog`. |
| #87 | Unidad, paso y mínimo | Re-test | |
| #88 | Filtro por categoría | Re-test | #103 lo completa. |
| #89 | Categoría por producto | Re-test | |

## Casos del ciclo de vida (#2–#69): falta el re-test

Todos están en `pending` desde el 24/10, con el texto reescrito (`qa:seed` ya corrió). **No se corrieron en la pasada del 23/10**, cuando pasaron 41. Detalle de cada fix en `qa-open-tickets-remediation.md` §17 y `qa-mercadopago-pending.md` §17.

| Ticket | Título | Clase | Qué falta |
| --- | --- | --- | --- |
| #2 | Checkout exige sesión | Re-test (corregido) | |
| #3 | Carrito de invitado se sincroniza al login | Re-test (corregido, B9) | |
| #12 | Inicio del checkout (4 pasos) | Re-test (texto) | Una cuenta de Google sin dirección guardada. **Si sale #105, el checkout pasa a 3 pasos.** |
| #16 | Términos obligatorios | Re-test (corregido, B3) | Los términos ahora son `checkout-v3`. |
| #18 | Pago externo rechazado por admin | Re-test (texto) | |
| #20 | Producto deshabilitado durante el checkout | Re-test (texto) | Antes era "no se entiende el flujo"; el texto ya está reescrito con pasos concretos. |
| #21 | Redirección a Checkout Pro | Re-test (texto) | El comprador y las tarjetas de prueba de MP, que se le pasan al tester en privado. |
| #22 | Pantallas de retorno | Re-test (texto) | |
| #23 | Webhook aprobado acredita | Re-test (texto) | Comprador y tarjetas de prueba de MP. |
| #24 | Webhook rechazado/pendiente | Re-test (texto) | Comprador y tarjetas de prueba de MP. |
| #25 | Webhook con firma inválida | Re-test (texto) | Confirmar que "Webhooks unsigned dev" esté apagado en `coco-kappa-ashy`. |
| #26 | Replay idempotente | Re-test (texto) | |
| #30 | Journey vacío hasta acreditar | Re-test (corregido, B1) | |
| #31 | Journey de 6 etapas | Re-test (texto) | Antes era "no queda claro el flujo". |
| #32 | Journey unificado vs por item | Re-test (texto) | Antes era "no entiendo cómo ejecutarlo". **Depende de datos demo** (lo anotó el registro del 11/10): verificar que existan después de la purga. |
| #33 | Avisos de rollover/incidencia/retiro | Re-test (corregido, B2 y B10) | |
| #36 | Reconciliar un intento a mano | Re-test (corregido) | |
| #37 | Reprocesar e ignorar eventos | Re-test (texto) | |
| #38 | Config de MP protegida por superadmin | Re-test (texto) | Una cuenta con rol "Administrador" que no sea superadmin. |
| #42 | Ejecutar operación | Re-test (texto) | |
| #45 | Reejecutar y descartar | Re-test (corregido, B7) | |
| #48 | Confirmación parcial con recorte LIFO | Re-test (corregido, B4 y B10) | |
| #54 | Fraccionar en paquetes por cliente | Re-test (corregido, B8) | Un paquete fraccionado después del 19/09. |
| #61 | Demora, incidencia y recuperación | Re-test (corregido, B2 y B6) | |
| #67 | Cierre automático del pedido | Re-test (texto) | |
| #69 | Operación hecha a mano corrupta tras el seed | Re-test **de dev** + texto desactualizado | El fix está (`prisma/seed.ts:589`). El ticket todavía dice `pnpm db:seed`, que ya no existe: hoy es `db:seed:test`. Lo corre un dev en un branch de Neon (`db:seed:test && db:seed-verify`, exit 0, sin `quantityMismatch`), nunca en la base compartida. |

## Observaciones transversales

1. **Los tickets #98–#111 salen del documento "CoCo · Tickets del recorrido"**, que no está en el repo. Hace falta para #104 (textos del FAQ), #101 (contenido de los combos) y probablemente para el título de #99.
2. **Varios tickets nuevos revierten decisiones recientes:**
   - #105 revierte el ADR 0011 (09/10).
   - #106 revierte el plan de la tarjeta (23/10).
   - #101 revierte #72.
   - #100 revierte #71.
   - #104 revierte #75–#79.
   - #98 revierte "sin fecha de cierre" (`home-community-redesign.md`).

   Hay que cerrar los superados para que QA no los re-testee y actualizar los planes afectados.
3. **El tutorial (`550a414`, 06/11) copia textos y flujos** que cambian #99, #100, #105, #106 y #110. Cada uno tiene que actualizar:
   - `tutorial-script.ts`
   - `tutorial-fixtures.ts`
   - `checkout-scene.tsx`
   - `tutorial-script.test.ts`, `tutorial-fixtures.test.ts` y `e2e/customer-tutorial.spec.ts`
4. **Dependencias:**
   - #98 es la base de #99, #100, #104 y #107.
   - #106 va antes de #107 y #101, que reusan la tarjeta.
   - #103 va antes de #102.
   - #111 va antes de #105, por el aviso de "listo".
   - #91 y #92 comparten el mecanismo de overrides.
5. **Tests que se rompen a propósito:**
   - `e2e/smoke.spec.ts`: 5 pasos, el href del CTA y 6 preguntas del FAQ.
   - `e2e/catalog-product-card.spec.ts` y `e2e/home-offer-quantity.spec.ts`: el monto en el botón.
   - `home-content.test.ts`
   - `commerce.helpers.test.ts` y `home-formatters.test.ts`: el comparativo de 1 kg/1 L.

## Orden sugerido

1. **QA (sin código):**
   - Cerrar como superados #71, #72 y #75–#79.
   - Pasarle al tester el comprador de MP y la cuenta de "Administrador", y corregir el texto de #69.
   - Re-testear #2–#67 y los #70–#89 vigentes. #73 y #84 van después de #106.
2. **Ola rápida (S, sin decisiones):** #93, #97 + #107 (salvo la línea de cierre), #109, #103, la parte de código de #92 (fallback y vaciado en el admin).
3. **Ola cierre semanal:** #98, después #99, #100 y #104 (con los textos del documento), y la línea de cierre de #107.
4. **Ola catálogo:** #106, #102 y #101 (cuando estén los combos).
5. **Ola pago:** #110 (con su ADR) y #112.
6. **Grill de diseño:** #105 + #111 juntos. #90 si se elige el estampado.
7. **H2:** #108.

**En paralelo, contenido:** la composición de los mix (#91) y las descripciones (#92), que tienen que venir de Quintal o de quien redacte.

## Decisiones de Flavio (2026-11-13)

1. **#101:** combos y destacados son dos funciones ortogonales. El combo es configurable en el admin, y los destacados pueden mostrar combos o productos.
2. **#110:** el porcentaje se configura en `/admin/payments` → pestaña "Pago externo", junto a los datos de la transferencia, y solo lo edita un superadmin.
3. **#105 y #111:** quedan fuera de alcance por ahora (Omitido).
4. **#108:** se difiere a H2 (Omitido).
5. **Re-test:** se crea un estado nuevo `retest` ("Re-test"). Los re-test verificables por código los verifica el orquestador.
6. **#100 y #104:** lo que hablan de la entrega se adapta al flujo actual, en el que se elige al confirmar el pedido.
7. **Superados:** se cierran correctamente, con una nota y a la papelera, igual que #15 y #17.

De la tabla de abajo:
- **La 1 queda resuelta:** los superados van a la papelera con nota, no a Omitido.
- **La 7 la reemplaza la decisión 1.** Lo que queda abierto pasa al grill de WP-D.
- **La 8 no aplica**, porque #105 quedó fuera.
- Las demás (2–6, 9 y 10) pasan como defaults a los grills del handoff.

## Decisiones abiertas (con la opción que recomiendo)

| # | Decisión | Recomendación |
| --- | --- | --- |
| 1 | ¿Cerrar #71, #72 y #75–#79 como superados, con estado `skipped` y una nota "reemplazado por #X"? | Sí. |
| 2 | #99: ¿qué título? "Comprar en grupo sale menos." o "Entre muchos, mejor precio." | El documento del recorrido o negocio. |
| 3 | #98: ¿el cierre es solo informativo o corta algo, por ejemplo que lo que entra después del cierre vaya a la semana siguiente? | Solo informativo; el admin sigue lanzando la operación a mano. |
| 4 | #100: ¿el diagrama baja a "Cómo funciona" o queda en el hero? | Que baje, como describe el ticket. El hero queda solo con texto y CTA. |
| 5 | #106: ¿el total de la línea desaparece de la tarjeta? Hoy está en el botón. | Sí; queda como live region para lectores de pantalla y se ve en el pedido. |
| 6 | #90: ¿overlay en pantalla o imagen estampada? | Overlay, con color por categoría. |
| 7 | #101: ¿qué pasa con la pantalla de ranking del admin y la banda "Producto destacado"? | El destacado queda. La pantalla de ranking se oculta, sin borrar los datos. |
| 8 | #105: ¿"el envío corre por su cuenta" es un cobro en CoCo o un pago al repartidor? | Se define en el grill de diseño; cambia el tamaño del trabajo. |
| 9 | #110: ¿el descuento por transferencia se acumula con el descuento de oferta? | Sí: se aplica sobre el subtotal que ya tiene el descuento de oferta. |
| 10 | #91/#92: ¿quién redacta las descripciones y la composición? | Quintal pasa los datos y CoCo redacta. Se carga por overrides. |
