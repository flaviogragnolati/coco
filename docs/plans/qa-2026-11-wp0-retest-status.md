# WP0: estado "Re-test" y script de triage

> **Estado:** implementado en la rama `wp0-qa-retest-status`, rebaseada sobre `main` (`b3e5162`) y corregida tras la revisión independiente (sin merge ni push). **Fuente:** `docs/plans/qa-open-tickets-2026-11-orchestration.md` §6 WP0 y la tabla de §6 WP1; precondiciones de `docs/plans/qa-open-tickets-2026-11-report.md`. **Base:** `main` en `a0ef619`. **Fecha:** 13/11/2026.

## Objetivo

Que un ticket de QA corregido o implementado después de su última corrida tenga un estado propio, **Re-test** (`retest`), y que las transiciones del triage de noviembre se apliquen con un script auditado, idempotente y con dry-run de solo lectura.

## Tareas

| Tarea | Qué se hizo |
| --- | --- |
| T0.1 | `retest` al final de `enum QaTicketStatus`. Migración escrita a mano: `prisma/migrations/20261113000000_qa_ticket_status_retest/migration.sql` (`ALTER TYPE "QaTicketStatus" ADD VALUE 'retest';`). No se corrió contra ninguna base. |
| T0.2 | `qaTicketStatusSchema` y `qaTicketStatsSchema` (contador `retest`). `getQaTicketStats` ya arma los contadores desde `qaTicketStatusSchema.options`, así que inicializa `retest` sin cambios; lo cubre un test. |
| T0.3 | Mapper: label "Re-test", ícono `RotateCcwIcon`, preset `inProgress` (info) y un hint. Se distingue de Pendiente (gris), de Completo OK (verde) y de En curso (mismo color, otro ícono). KPI: Re-test no cuenta como ejecutado. El filtro de la tabla y el formulario de admin lo toman del mapa. |
| T0.4 | Glosario `estado-qa-re-test` (con `term: "QA re-test"` y los alias del `_Avoid_` de `CONTEXT.md`); `estado-qa-pendiente` pasa a "todavía no se corrió contra su definición actual", igual que *QA re-test*. `docs/schema-reference.md` suma `retest` a la fila de `QaTicketStatus`. *QA re-test* ya está en `CONTEXT.md` de `main`. |
| T0.5 | `scripts/qa-ticket-triage.ts` (I/O), `scripts/qa-ticket-triage.plan.ts` (lógica), `scripts/qa-ticket-triage.data.ts` (transiciones), `scripts/lib/read-only-transaction.ts` y `"qa:triage"` en `package.json`. |

### Cómo funciona `pnpm qa:triage`

- **Dry-run (por defecto).** Lee dentro de `db.$transaction` que arranca con `SET TRANSACTION READ ONLY` y comprueba `SHOW transaction_read_only = on` antes de leer; si no queda en solo lectura, corta. Imprime cada ticket con estado actual → nuevo, el asignado ("asignado: X → libre") y la nota; después, el resumen por destino, cuántos tienen asignado y si el enum de la base ya tiene `retest`. Corre siempre, también con `APP_ENV=production`. Acepta `--actor-email` para comprobar el actor sin escribir.
- **`--apply --actor-email <email>`.** Exige un superadmin activo con ese email (sin distinguir mayúsculas). Con `APP_ENV=production` exige además `--confirm-production`. Se niega a correr si va a escribir `retest` y la migración no está aplicada. Por cada ticket relee el detalle, vuelve a planificar contra lo releído y llama a `update` y después a `softDelete` de `qa-ticket.service.ts`, así quedan `qaTicket.update` y `qaTicket.softDelete` en `AuditLog`.
- **La nota marca que la transición ya corrió.** Si la nota está en el ticket, el estado, el asignado y la definición se dan por resueltos: no se reescriben, y solo se completa la papelera si faltó. Así, volver a correr el script nunca pisa un resultado que un tester cargó después del triage.
- **Origen (`from`).** Cada transición corre solo desde los estados de `from` (por defecto `["pending"]`) o si el ticket ya está en el destino. Cualquier otro estado es un conflicto ("un tester ya cargó un resultado").
- **Conflictos.** Se saltean con aviso y no frenan el resto del `--apply`: código inexistente, ticket en la papelera al que le faltan cambios, ticket **En curso** o un resultado fuera de `from`.
- **Asignado.** `clearAssignee: true` lo libera con el mismo `update` auditado (el servicio guarda `null` si no viene `assigneeId`). Todas las transiciones a Re-test lo usan; las demás lo conservan.
- **Notas.** Se agregan arriba de la nota existente, separadas por una línea en blanco; nunca la pisan. En la papelera, la nota se escribe antes del soft delete.
- **Más de una entrada por código.** Se permite si cambia la nota fechada o el `from` (por ejemplo, una re-corrección futura con `from: ["failed"]`). Cada entrada se planifica contra cómo deja el ticket la anterior. Dos entradas iguales cortan el script.
- **Para olas siguientes:** se agregan entradas a `qaTicketTriageTransitions` (tipo `TriageTransition`: `{ code, from?, status?, prependNote?, definition?, clearAssignee?, retire? }`); `triageNote(texto, fecha)` arma el prefijo `[dd/mm/aaaa · triage]`. En las notas, "Tu pedido (el carrito)" es el carrito y "el pedido (en Mis pedidos)" es la orden.

### Transiciones cargadas (39)

| Destino | Tickets |
| --- | --- |
| Papelera | #71 (por #100), #72 (por #101), #75–#79 (por #104) |
| Omitido | #105, #111 (fuera de alcance), #108 (diferido a H2) |
| Bloqueado | #82 (falta el número de WhatsApp) |
| Re-test | #2, #3, #12, #16, #18, #20–#26, #30–#33, #36–#38, #42, #45, #48, #54, #61, #67, #80, #83, #86 |

**No se cargaron** (los carga el orquestador): #69, #70, #73, #74, #81, #84, #85, #87, #88, #89.

Cada nota de re-test dice qué se corrigió, sin jerga interna (con el commit: `1929045` para los arreglos y los textos de la remediación de septiembre, `6a25a61` para Mercado Pago, `3e14bda` para los ajustes previos al seed, `ed0b5b6` para el motivo legible de "Reprogramado", `48f756d`/`dde6a65` para #2, y los merges `2d30cc0`, `5c5d7e4` y `006a157` para #80, #83 y #86), qué mirar y las precondiciones del reporte.

## Riesgo de orden (sin cambios respecto del handoff)

1. Flavio aplica la migración en la base compartida (`pnpm db:migrate`).
2. Se despliega la app con el enum nuevo.
3. Recién ahí `pnpm qa:triage --apply --confirm-production --actor-email <superadmin>`. El script frena solo el paso 1 faltante (consulta el enum); el paso 2 no lo puede comprobar.

## Registro de ejecución (q-code-implement, 13/11/2026)

### Commits

| Commit | Contenido |
| --- | --- |
| `86083a9` | Enum, migración, schemas y test de estadísticas |
| `b137f04` | Chip, KPI, glosario y `schema-reference.md` |
| `b83b310` | Helper de transacción de solo lectura y sus tests |
| `8e7529a` | Plan, script `qa:triage` y `package.json` |
| `5baa630` | Datos del triage |
| `8907289` | Este plan con el primer dry-run |
| `1fa4ec1` | Revisión B1 e I3: la nota marca la transición como hecha, `from`, conflictos que no frenan, varias entradas por código, `clearAssignee` y asignado en el dry-run |
| `59125fd` | Revisión I1, I2 y menores 1–4: notas sin jerga, error actual del checkout, "Tu pedido (el carrito)" / "el pedido (en Mis pedidos)", Re-test libera el asignado |
| `c1fab50` | Revisión menores 5 y 8: hint del diálogo de detalle y definición de Pendiente |
| `5c85bd7` | Revisión menor 6: guard del test de integración (local, `_test`, distinto de `DATABASE_URL`) |
| `bcc4c56` | El conflicto muestra el título del ticket |
| `f3d53a8` | Encabezado del script |
| (este) | Plan actualizado con la revisión y el segundo dry-run |

### Validación

- `pnpm typecheck`: sin errores.
- `pnpm test`: 133 archivos pasan, 1 salteado (integración del reset de catálogo, opt-in); 1971 tests pasan, 6 salteados (incluye los 2 de integración de solo lectura, opt-in).
- `pnpm check`: 867 archivos, sin cambios ni errores.
- **Solo lectura contra Postgres real:** `QA_TRIAGE_TEST_DATABASE_URL` apuntando a un contenedor Docker descartable (`postgres:17-alpine`, puerto 55432, base `qa_triage_test`): 4/4 tests; con una base que no termina en `_test`, el guard corta; un `CREATE TABLE` dentro de `readOnlyTransaction` falla con "read-only transaction" y la tabla no queda creada.
- **`--apply` de punta a punta en una base local descartable** (otra base del mismo contenedor, con el esquema generado offline por `prisma migrate diff --from-empty --to-schema` y cargado con `psql`; 39 tickets y un superadmin de prueba):
  - sin `--confirm-production` y con `APP_ENV=production`: corta antes de conectarse;
  - con `--confirm-production`: 39 tickets aplicados; `AuditLog` con 39 `qaTicket.update` y 7 `qaTicket.softDelete`; las notas viejas quedan debajo de la nueva tras una línea en blanco; se conservan el asignado y el flag de regresión;
  - segunda corrida: "Aplicado: 0 tickets"; el dry-run posterior marca las 39 como "ya aplicadas".
  - Con el mismo contenedor, un dry-run sobre una tabla mínima con #3 "En curso" lo marca como conflicto y avisa que falta la migración.
  - **Después de la revisión** (base `triage_apply_test`, con #3 en `passed` y #2, #12 y #71 asignados): el dry-run marca #3 como conflicto ("un tester ya cargó un resultado (passed)") y "asignado: Tester Uno → libre" en #2 y #12; `--apply` aplica 38 y saltea #3. Después se simuló a un tester que deja #2 en `failed` (con su nota arriba) y toma #12: la segunda corrida da "0 a aplicar · 38 ya aplicadas" y no toca ninguno. `AuditLog`: 38 `qaTicket.update` y 7 `qaTicket.softDelete`.
  - El contenedor se detuvo al terminar (`--rm`).
- **Dry-run contra la base compartida.** Hubo dos ejecuciones en total, las dos sin escribir nada y con código de salida 0. La primera fue antes de la revisión. La segunda es la que sigue, con el código final, sin el aviso de SSL de `pg` y con el host abreviado:

```text
$ tsx scripts/qa-ticket-triage.ts
Triage de tickets de QA · base <neon-pooler>/neondb · APP_ENV=production · simulación

Lectura dentro de una transacción de solo lectura (transaction_read_only=on).

#71 [pending → papelera] Unificar "3 pasos" + "problema/solución/resultado" en una sola secuencia explicativa · asignado: Flavio Gragnolati
    nota: [13/11/2026 · triage] Superado por #100: "Cómo funciona" queda con una sola leyenda y cuatro pasos, y sale "No somos una distribuidora…". No re-testear.
#72 [pending → papelera] Renombrar sección y agregar filtro · asignado: Flavio Gragnolati
    nota: [13/11/2026 · triage] Superado por #101: la sección "Ofertas destacadas" pasa a mostrar combos y destacados, y salen los filtros Todos / kg / unidad. No re-testear.
#75 [pending → papelera] Eliminar pregunta "¿Qué significa cantidad mínima?" · asignado: Flavio Gragnolati
    nota: [13/11/2026 · triage] Superado por #104: las preguntas frecuentes se reescriben y "¿Qué significa cantidad mínima?" no queda entre ellas. No re-testear.
#76 [pending → papelera] Eliminar pregunta "¿Qué pasa si mi demanda no entra en una operación?" · asignado: Flavio Gragnolati
    nota: [13/11/2026 · triage] Superado por #104: las preguntas frecuentes se reescriben y "¿Qué pasa si mi demanda no entra en una operación?" no queda entre ellas. No re-testear.
#77 [pending → papelera] Reformular respuesta de "¿Cuánto tarda en llegar mi compra?" · asignado: Flavio Gragnolati
    nota: [13/11/2026 · triage] Superado por #104: "¿Cuánto tarda en llegar mi compra?" sigue, pero con el texto nuevo del documento del recorrido. No re-testear.
#78 [pending → papelera] Agregar pregunta "¿Cómo retiro mi pedido o lo recibo en casa?" · asignado: Flavio Gragnolati
    nota: [13/11/2026 · triage] Superado por #104: la pregunta de la entrega pasa a ser "¿Cómo recibo mi pedido?", con el texto nuevo del documento del recorrido. No re-testear.
#79 [pending → papelera] Reemplazar "carrito" por "pedido" en la pregunta de cuenta · asignado: Flavio Gragnolati
    nota: [13/11/2026 · triage] Superado por #104: sale "¿Necesito una cuenta para ver productos?", que es la pregunta que este ticket corregía. No re-testear.
#105 [pending → skipped] Elegir la forma de entrega cuando el pedido está listo · asignado: Flavio Gragnolati
    nota: [13/11/2026 · triage] Fuera de alcance por decisión del 13/11/2026. Por ahora la entrega se sigue eligiendo al confirmar el pedido. Se va a definir junto con #111 más adelante.
#108 [pending → skipped] Presentaciones de un mismo producto dentro de la ficha · asignado: Flavio Gragnolati
    nota: [13/11/2026 · triage] Diferido a H2 por decisión del 13/11/2026. Mientras tanto, las otras presentaciones van a aparecer como productos similares de la misma categoría cuando salga #107.
#111 [pending → skipped] Elegir por dónde recibir los avisos del pedido · asignado: Flavio Gragnolati
    nota: [13/11/2026 · triage] Fuera de alcance por decisión del 13/11/2026. Se va a definir junto con #105 más adelante.
#82 [pending → blocked] Reemplazar número de WhatsApp placeholder · asignado: Flavio Gragnolati
    nota: [13/11/2026 · triage] Falta el número de WhatsApp contratado; lo pasa Flavio cuando esté. Mientras tanto el ítem de WhatsApp del pie queda oculto (`WHATSAPP_NUMBER = null` en `home-content.ts`).
#2 [pending → retest] Checkout exige sesión · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Corregido en 48f756d y dde6a65: un checkout abandonado ya no congela Tu pedido (el carrito) y el checkout espera a que se sincronice antes de arrancar. Mirar: que `/checkout` sin sesión lleve a `/login?callbackURL=/checkout` y que, después del login, vuelva al checkout con Tu pedido (el carrito) intacto, sin "No se pudo iniciar checkout" ni "No encontramos tu pedido para iniciar checkout.". Precondiciones: ninguna; arrancar sin sesión.
#3 [pending → retest] Carrito de invitado se sincroniza al login · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Corregido en 1929045: si hay un pago en curso, los productos del invitado quedan pendientes y no se pierden. Mirar: los dos casos del ticket; en la variante, la alerta "Productos pendientes de agregar" en `/cart`, "Ir a pagar" deshabilitado y "No se pudo iniciar checkout" en `/checkout`. Precondiciones: para la variante, un usuario con un pago en curso (pago externo pendiente o un checkout de Mercado Pago iniciado).
#12 [pending → retest] Inicio del checkout (4 pasos) · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 1929045. Mirar: que el checkout arranque en "Pedido", que "Pago" y "Confirmar" estén deshabilitados con "Completá los pasos anteriores", y que en `/admin/carts` Tu pedido (el carrito) figure "En checkout" sin un pedido (en Mis pedidos) ni un intento de pago. Precondiciones: una cuenta de Google sin direcciones guardadas (por ejemplo, una cuenta nueva) y Tu pedido (el carrito) con al menos un producto.
#16 [pending → retest] Términos obligatorios para confirmar · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Corregido en 1929045 (términos reales en lugar de "lorem ipsum") y texto ajustado en 3e14bda. Los términos ahora son `checkout-v3`. Mirar: que los términos se lean, que "Confirmar y pagar" esté deshabilitado sin el switch y que con "Pago externo" el pago quede "Pendiente". Precondiciones: "Pago externo" y "Mercado Pago" (Sandbox) habilitados en `/admin/payments`; sesiones Cliente y Admin.
#18 [pending → retest] Pago externo rechazado por admin · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 1929045: el rechazo se prueba con un pago externo que rechaza un admin, porque ya no existe el pago "mock". Mirar: que el intento pase a "Rechazado" y el pedido (en Mis pedidos) a "Fallido", y que Tu pedido (el carrito) vuelva a ser editable y se pueda volver a pagar. Precondiciones: "Pago externo" habilitado en `/admin/payments`; sesiones Cliente y Admin.
#20 [pending → retest] Producto deshabilitado durante el checkout · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 1929045 con pasos concretos (la nota anterior decía "No se entiende el flujo"). Mirar: el rechazo "Uno de los productos de tu pedido ya no está disponible. Revisalo antes de continuar.", que Tu pedido (el carrito) quede editable y que no se cree un pedido (en Mis pedidos) ni un intento de pago nuevos. Precondiciones: sesiones Cliente y Admin en navegadores distintos.
#21 [pending → retest] Redirección a Checkout Pro · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 6a25a61; Mercado Pago ya está en Sandbox en el entorno de QA (antes faltaba la credencial de Mercado Pago). Mirar: "Redirigiendo a Mercado Pago", el Checkout Pro de prueba y el intento "pending" con solo "Preferencia: …" en Refs. Precondiciones: el comprador de prueba y las tarjetas de prueba de Mercado Pago, que el responsable de QA pasa por privado.
#22 [pending → retest] Pantallas de retorno informativas · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 6a25a61: las tres pantallas se abren directo, sin pagar. Mirar: el título de success, failure y pending, y el aviso "Estado sujeto a reconciliación" en las tres. Precondiciones: ninguna.
#23 [pending → retest] Webhook aprobado acredita el pedido · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 6a25a61. Mirar: que el intento pase a "completed" con el id del pago, el pedido (en Mis pedidos) a "En procesamiento" y Tu pedido (el carrito) a "Enviado". Precondiciones: seguir desde el intento de #21; el comprador de prueba y las tarjetas de prueba de Mercado Pago, que el responsable de QA pasa por privado.
#24 [pending → retest] Webhook rechazado / pendiente no rompe el carrito · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 6a25a61. Mirar: que `OTHE` deje el intento "failed", el pedido (en Mis pedidos) "Pendiente" y Tu pedido (el carrito) editable, y que `CONT` deje el intento "inProcess" sin acreditar nada. Precondiciones: el comprador de prueba y las tarjetas de prueba de Mercado Pago, que el responsable de QA pasa por privado.
#25 [pending → retest] Webhook con firma inválida se rechaza · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 6a25a61, con el comando `curl` listo para copiar. Mirar: HTTP 401 con `{"error":"invalid signature"}` y el evento "rejected", con firma "no válida" y sin vincular. Precondiciones: confirmar que "Webhooks unsigned dev" está apagado en `/admin/payments` → Config de coco-kappa-ashy; si está prendido, el caso queda Bloqueado.
#26 [pending → retest] Replay del webhook es idempotente · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 6a25a61. Mirar: que "Reprocesar" dos veces no duplique el seguimiento ni haga retroceder el pago. Precondiciones: el pedido acreditado en #23.
#30 [pending → retest] Journey vacío hasta acreditar el pago · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Corregido en 1929045: el seguimiento no dibuja etapas hasta que se acredita el pago. Mirar: que la card diga "El seguimiento comienza cuando se acredita el pago." y que abrir el detalle no cambie el pago. Precondiciones: un pedido con Pago externo confirmado por el cliente y todavía sin liquidar.
#31 [pending → retest] Journey de 6 etapas avanza con el fulfillment · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 1929045 con dónde se ejecuta y dónde se mira cada paso (la nota anterior decía "No queda claro el flujo"). Mirar: la etapa resaltada después de cada paso del admin; ninguna retrocede entre refrescos. Precondiciones: un pedido acreditado con un solo producto; sesiones Cliente y Admin.
#32 [pending → retest] Journey unificado vs por item · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 1929045 (la nota anterior decía "No entiendo cómo ejecutar el flujo"). Mirar: un solo recorrido, después uno por producto al omitir uno en la operación, y de nuevo uno solo. Precondiciones: un pedido acreditado con dos productos distintos que no estén en ninguna operación. Depende de datos de prueba: confirmar que existen después de la purga del 11/10.
#33 [pending → retest] Avisos de rollover / incidencia / retiro · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Corregido en 1929045 y ed0b5b6: los avisos muestran un motivo legible. Mirar: "Reprogramado" con "El proveedor no confirmó toda la cantidad pedida." y sin códigos `LITEM-…`, "Incidencia de fulfillment" con su motivo, "Incidencia resuelta" y "Disponible para retirar" como aviso. Precondiciones: para el retiro, un producto que no haya tenido otra entrega antes.
#36 [pending → retest] Reconciliar un intento manualmente · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Corregido en 6a25a61: `/admin/payments` muestra "Pago (id de Mercado Pago)" y explica por qué "Reconciliar ahora" puede estar deshabilitado. Mirar: "Intento reconciliado" en un intento pagado, y el botón deshabilitado con su explicación en uno sin pagar. Precondiciones: un intento de Mercado Pago pagado (#23) y uno sin pagar (#21).
#37 [pending → retest] Reprocesar e ignorar eventos · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 6a25a61: dice de dónde salen los eventos. Mirar: "Evento reprocesado", "Ignorar" deshabilitado con menos de 5 caracteres y "Evento ignorado". Precondiciones: correr antes #23 y #25.
#38 [pending → retest] Config de MP protegida por superadmin · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto ajustado en 3e14bda. Mirar: "FORBIDDEN" con la cuenta "Administrador", el pedido de escribir "CONFIRMAR" y "Configuración actualizada" con la superadmin; al final, dejar "Expiración minutos" como estaba. Precondiciones: una cuenta con rol "Administrador" que no sea superadmin, que pasa el responsable de QA.
#42 [pending → retest] Ejecutar operación · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 1929045. Mirar: "Operación ejecutada", las órdenes de proveedor "Pendiente", los lotes, los rollovers con motivo y, en `/admin/tracking`, los productos asignados en "Asignado a proveedor". Precondiciones: pedidos acreditados que no estén en ninguna operación.
#45 [pending → retest] Reejecutar y descartar · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Corregido en 1929045: al reejecutar una operación completada, "Incluir rollovers" queda forzado. Mirar: el switch prendido y deshabilitado, que la vista siga a la operación nueva y que "Descartar" deje la demanda intacta. Precondiciones: una operación completada dentro de la ventana y un borrador.
#48 [pending → retest] Confirmación parcial con recorte LIFO · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Corregido en 1929045 ("Confirmar" ya no queda trabado en 0 después de "Ajustar reparto") y ed0b5b6 (motivo legible). Mirar: el reparto LIFO, el error "El reparto suma…", una línea confirmada en 0 y el aviso al cliente con "El proveedor no confirmó toda la cantidad pedida.". Precondiciones: las del ticket.
#54 [pending → retest] Fraccionar en paquetes por cliente · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Corregido en 1929045: cada paquete de salida guarda de qué paquete de entrada sale. Mirar: que, al reabrir el paquete, diga "No queda cantidad recibida sin fraccionar." y "Fraccionar" quede deshabilitado. Precondiciones: un paquete de entrada que se fracciona por primera vez después del 19/09/2026 (lo más simple: uno de una operación nueva); el #160 no sirve.
#61 [pending → retest] Demora, incidencia y recuperación · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Corregido en 1929045: un envío demorado se recupera con "Recuperar" y el aviso muestra el motivo. Mirar: el motivo en "Incidencia de fulfillment", "Recuperar" del paquete deshabilitado hasta recuperar el envío, y "Incidencia resuelta". Precondiciones: un envío "En tránsito".
#67 [pending → retest] Cierre automático del pedido · asignado: Lucas Ferreyra → libre
    nota: [13/11/2026 · triage] Texto reescrito en 1929045, con un caso A armado sobre datos de prueba. Mirar: que ORD-SEED-PICKUP pase solo a "Completado", y los casos B ("Cancelado") y C (sigue "En procesamiento"). Precondiciones: para el caso A, el paquete de prueba PKG-SEED-OUT-PICKUP-B; si no está en la base, ese caso queda Bloqueado (no correr seeds).
#80 [pending → retest] Cargar imágenes reales en las fichas de producto · asignado: Flavio Gragnolati → libre
    nota: [13/11/2026 · triage] Implementado en 2d30cc0: las fotos se suben desde `/admin/products`. Mirar: que ninguna tarjeta ni ficha muestre "Sin imagen para …". Precondiciones: las fotos ya cargadas; si falta alguna, es contenido pendiente y no un fallo de la subida.
#83 [pending → retest] Agregar "Sé proveedor" a la columna Nosotros · asignado: Flavio Gragnolati → libre
    nota: [13/11/2026 · triage] Implementado en 5c5d7e4: el link "Sé proveedor" del pie lleva al formulario de `/proveedores`. Mirar: que la columna "Nosotros" tenga dos links y que "Sé proveedor" abra el formulario de `/proveedores`. No enviarlo: crearía una postulación real. Precondiciones: ninguna.
#86 [pending → retest] Actualización masiva de precios de venta · asignado: Flavio Gragnolati → libre
    nota: [13/11/2026 · triage] Implementado en 006a157: "Descargar planilla de precios" y "Subir planilla" en `/admin/product-terms`. Mirar: la vista previa con el precio actual, el nuevo y la variación %, y que al confirmar se actualicen todos. El registro con fecha sigue diferido: mientras tanto, cada cambio deja su fila en la auditoría. Precondiciones: una sesión de admin.

Resumen: 39 transiciones · 39 a aplicar · 0 ya aplicadas · 0 conflictos
Con asignado entre las que se aplican: 39 (se liberan 28).
Destino final por estado:
  papelera: 7 (#71, #72, #75, #76, #77, #78, #79)
  skipped: 3 (#105, #108, #111)
  blocked: 1 (#82)
  retest: 28 (#2, #3, #12, #16, #18, #20, #21, #22, #23, #24, #25, #26, #30, #31, #32, #33, #36, #37, #38, #42, #45, #48, #54, #61, #67, #80, #83, #86)

El enum QaTicketStatus de esta base todavía NO tiene el valor retest.

--apply se negaría a correr mientras siga así:
  - la migración 20261113000000_qa_ticket_status_retest no está aplicada en esta base

Simulación: no se escribió nada. Para aplicar: pnpm qa:triage --apply --actor-email <superadmin>
```

**Resumen del dry-run:** 39 transiciones, 39 a aplicar, 0 ya aplicadas y 0 conflictos. Papelera 7, Omitido 3, Bloqueado 1 y Re-test 28. Todos los tickets están hoy en `pending` y **los 39 tienen asignado**: los 28 que pasan a Re-test quedan libres, y los 11 restantes (papelera, Omitido y Bloqueado) lo conservan. La base compartida **todavía no tiene** `retest` en el enum.

### Desvíos y decisiones

- **Re-test no entra en el selector de resultado del tester** (`qaTicketResultOptions`). §6 T0.3 decía que el selector "toma las opciones del mapa", pero ese selector usa una lista explícita de resultados. Re-test es una posición en la cola, como Pendiente y En curso: no es un resultado de una corrida. Se elige desde el formulario de admin y desde el script. Lo cubre un test.
- **`CONTEXT.md` no se toca en la rama:** *QA re-test* ya está en `main` (`b3e5162`), sobre el que se rebaseó la rama.
- **El preset sigue el handoff (`inProgress`, info).** Re-test comparte el color con En curso; lo distinguen el ícono, el label y el hint.
- **Conflicto "En curso"** (no estaba en el handoff): el script no mueve ni manda a la papelera un ticket que un tester tomó. Es más seguro que pisar una corrida en marcha.
- **Los conflictos no frenan nada** (cambio de la revisión): se saltean con aviso, el dry-run sale con 0 y `--apply` sigue con el resto. Lo único que frena `--apply` es la migración faltante o un actor inválido.
- **`--apply` relee cada ticket antes de escribir.** El `update` del servicio reemplaza la definición completa, así que una nota que un tester guarde entre el dry-run y el apply queda debajo de la del triage y no se pierde. Igual queda una ventana de milisegundos entre la relectura y el `update`; no hay bloqueo optimista.
- **Validación local con `prisma migrate diff` + `psql`.** No se corrió `prisma migrate` contra ninguna base. El esquema se generó offline y se cargó en un contenedor descartable para probar `--apply`.
- **Re-test libera el asignado** (decisión de Flavio en la revisión). Papelera, Omitido y Bloqueado lo conservan.

### Dudas para el orquestador

1. **#67, caso A:** usa el fixture `ORD-SEED-PICKUP` / `PKG-SEED-OUT-PICKUP-B` de `db:seed:test`. La purga del 11/10 (`db:purge-demo`) borró todos los pedidos y paquetes, y `db:seed:test` está prohibido en la base compartida. Es probable que el caso A no se pueda correr ahí. La nota ya dice "si no está en la base, ese caso queda Bloqueado". ¿Hay que reescribir el caso A?
2. **#32 y #42** necesitan pedidos acreditados fuera de toda operación; después de la purga, alguien tiene que crearlos. La nota de #32 lo advierte; la de #42 pide "pedidos acreditados que no estén en ninguna operación".
3. **#80** pasa a Re-test aunque depende de que las fotos estén cargadas (contenido). La nota lo aclara.

### Mini review

- `q-review-code`, eje estándares: **pass with findings**, corregidos:
  - la comparación de la definición ahora es sin espacios al borde, porque el schema del admin los recorta al guardar; si no, una definición con `\n` final nunca quedaba aplicada;
  - retirar un ticket En curso ahora es conflicto, igual que cambiarle el estado.
  Los dos tienen test.
- `q-review-code`, eje especificación: **pass with findings**. El desvío del selector de resultado queda registrado y no se corrige. Las tareas T0.1–T0.5 y la aceptación de §6 WP0 se cumplen.
- `q-review-comments`: **pass with findings**. Hay unos 25 comentarios en alcance. Se aplicó 1 reescritura: la cabecera de `qa-ticket-triage.plan.ts` decía "Pure", y ahora el módulo recibe el escritor inyectado. No hay narración ni referencias a tickets en el código.
- La primera revisión la hizo el mismo implementador.

### Revisión independiente (13/11/2026) y correcciones

| Hallazgo | Corrección |
| --- | --- |
| **B1** (bloqueante): re-correr `--apply` volvía un `failed`/`passed`/`blocked`/`needsClarification` a `retest` si la nota ya estaba | La nota marca la transición como hecha: con la nota puesta solo se completa la papelera. Nuevo `from` (por defecto `["pending"]`); otro estado es conflicto y se saltea sin frenar el resto. El test viejo se reemplazó por uno por cada resultado (skip con la nota puesta, conflicto sin ella). Se permiten varias entradas por código con otra nota fechada u otro `from`, planificadas en orden. |
| **I1**: #2 citaba un error que ya no existe | Cita "No se pudo iniciar checkout" / "No encontramos tu pedido para iniciar checkout." |
| **I2**: pedido/carrito ambiguo en #12, #18, #20 y #24 | "Tu pedido (el carrito)" y "el pedido (en Mis pedidos)"; en #18 lo que vuelve a ser editable es Tu pedido (el carrito). Se aplicó también a #2 y #23. |
| **I3**: Re-test libera el asignado | `clearAssignee: true` en todas las transiciones a Re-test, por el mismo `update` auditado; el dry-run muestra "asignado: X → libre". |
| Menor 1: jerga | Sin "grill", "ADR 0011", "(B1)…(B10)" ni `MERCADOPAGO_ACCESS_TOKEN` ("faltaba la credencial de Mercado Pago"); un test lo vigila. `WHATSAPP_NUMBER` queda en #82. |
| Menor 2: afirmaciones no ciertas todavía | #108 "van a aparecer … cuando salga #107"; #71 sin "bajo el diagrama"; #75 y #76 "se reescriben". |
| Menor 3: #83 | Solo pide que el link abra el formulario; dice explícitamente que no se envíe. |
| Menor 4: #67 | "el paquete de prueba PKG-SEED-OUT-PICKUP-B; si no está en la base, ese caso queda Bloqueado (no correr seeds)". |
| Menor 5 | Hint del diálogo de detalle: "Pendiente, En curso y Re-test siguen disponibles…". |
| Menor 6 | Guard del test de integración copiado de `reset-initial-catalog.integration.test.ts` (local, `_test`, distinto de `DATABASE_URL`; sin la variable de target, que el pedido no incluía). |
| Menor 7 | Este plan y el `.stage-result.yaml`. |
| Menor 8 | Pendiente = "todavía no se corrió contra su definición actual" en las dos entradas del glosario, como *QA re-test* en `CONTEXT.md`. |
| Menor 9 | Encabezado de `qa-ticket-triage.plan.ts` reescrito con el motivo real: la nota es la marca de que la transición ya corrió. |

`q-review-comments` sobre lo nuevo: pass. Se reescribieron los encabezados de `plan.ts`, `data.ts` (incluye la convención pedido/carrito) y `qa-ticket-triage.ts`; no queda narración.

### Próximos pasos

1. El orquestador confirma las correcciones de la revisión y mergea la rama a `main`.
2. Flavio aplica la migración en la base compartida y despliega.
3. El orquestador agrega #69, #70, #73, #74, #81, #84, #85, #87, #88 y #89 a `qa-ticket-triage.data.ts` cuando estén resueltos. Corre el dry-run y, con el OK de Flavio, `--apply --confirm-production --actor-email <superadmin>`. Después compara los conteos con una consulta de solo lectura.
