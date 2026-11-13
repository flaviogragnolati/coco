# Handoff: orquestación de los tickets de QA abiertos (noviembre 2026)

> **Para:** un agente orquestador. Coordina sub-agentes y no implementa los paquetes grandes él mismo.
> **Base:** `main` en `a0ef619` (2026-11-06). **Creado:** 2026-11-13, feature grill con Flavio.
> **Fuente:** `docs/plans/qa-open-tickets-2026-11-report.md` tiene el triage de los 66 tickets, el estado del código con archivo y línea, y las soluciones propuestas. **Leelo antes que este documento.**
> **Idioma:** los textos al cliente van en castellano rioplatense ("vos"). Lo que el cliente arma es "tu pedido", nunca "carrito" (`docs/plans/customer-vocabulary-pedido.md`).

## 1. Objetivo y "hecho significa"

- **Hecho significa:**
  1. Cada ticket abierto de `/admin/qa-tickets` terminó en un estado que dice qué hacer con él:
     - **Re-test:** QA lo tiene que correr.
     - **Completo OK:** se verificó por código, con la evidencia en la nota.
     - **Omitido:** quedó fuera de alcance o diferido.
     - **Bloqueado:** falta un insumo.
     - **Papelera:** quedó superado.
  2. Los paquetes de trabajo WP-A a WP-I están implementados, revisados y mergeados en `main`, o frenados en una pregunta bloqueante que Flavio tiene que contestar.
  3. Los tickets nuevos implementados quedan en **Re-test**, con una nota que dice qué mirar.
- **Por qué:** el tablero de QA mezcla casos corregidos que nadie volvió a correr, tickets que reemplazan a otros y pedidos nuevos. Sin ordenarlo, la pasada de QA no converge.
- **Para:** un agente orquestador con permiso para lanzar sub-agentes (`Agent`), usar worktrees y preguntarle a Flavio (`AskUserQuestion`).
- **Documentos de diseño de origen:** no hay. ADRs que siguen vigentes: 0008 (descuento de oferta), 0010 (pagos externos los liquida un admin), 0011 (la entrega se elige en el checkout; **sigue vigente** porque #105 quedó fuera) y 0012 (el tutorial corre en escenas simuladas).

## 2. Decisiones ya tomadas

| Tema | Decisión | Fuente |
| --- | --- | --- |
| #105 y #111 | **Fuera de alcance por ahora.** Pasan a Omitido con nota. La entrega se sigue eligiendo en el checkout (ADR 0011). | Flavio, 13/11 |
| #108 (presentaciones dentro de la ficha) | **Diferido a H2.** Pasa a Omitido con nota. Mientras tanto, los otros tamaños aparecen como "similares" por categoría (#107). | Flavio, 13/11 |
| Cómo se marca un re-test | **Estado nuevo `retest`** ("Re-test") en `QaTicketStatus`, con chip y filtro propios. Ver *QA re-test* en `CONTEXT.md`. | Flavio, 13/11 |
| Re-tests verificables por código | El orquestador los verifica y los pasa a **Completo OK** con la evidencia. El resto pasa a **Re-test**. Criterios en §5. | Flavio, 13/11 |
| Tickets superados | **Nota "Superado por #N" y después papelera** (soft delete auditado), igual que se retiraron #15 y #17. "Omitido" se reserva para "fuera de esta pasada". | Default del orquestador, sobre la convención existente (`retiredQaTicketCodes`, glosario `estado-qa-omitido`) |
| #101 (combos) | **Son dos funciones ortogonales:** *Combo* es una entidad configurable desde el admin, y los **destacados** son otra función que puede mostrar productos o combos. El combo no tiene precio ni stock propios. Ver *Combo* en `CONTEXT.md`. | Flavio, 13/11 |
| #110 (dónde se configura el %) | Campo **"Descuento por transferencia (%)"** en `/admin/payments` → pestaña "Pago externo" (`ExternalConfigEditor`, `payments-admin-client.tsx:688`). Se guarda en los settings JSON del proveedor `external`, sin migración de config. Solo lo edita un superadmin (`updateExternalConfig` es `superadminProcedure`). | Flavio, 13/11 |
| #100 paso 4 y #104 "¿Cómo recibo mi pedido?" | **Se adaptan al flujo actual**: la entrega se elige al confirmar el pedido. Cuando salga #105 se cambian por el texto del ticket. | Flavio, 13/11 |
| Tickets nuevos implementados | Pasan a **Re-test**, no a Completo OK: quien escribió el ticket valida que la UI coincida con lo que pidió. | Default del orquestador |

## 3. Alcance

- **Entra:**
  - WP0 (estado Re-test y script de triage) y WP1 (gestión de estados).
  - WP-A a WP-I (§6): #90, #91, #92, #93, #97, #98, #99, #100, #101, #102, #103, #104, #106, #107, #109, #110, #112.
  - El re-test de #2–#89.
- **No entra:**
  - #105, #111 y #108.
  - B11 (el mínimo del proveedor se mira línea por línea; grill de diseño aparte, ver `qa-open-tickets-2026-10-11-report.md`).
  - El "registro con fecha" de #86 (sigue diferido).
  - Cambiar ADR 0011.
  - Notificaciones de cualquier tipo.
  - Push o deploy sin el OK de Flavio.
- **Diferido:** #108 (H2), y #105 + #111 (juntos, en un grill de diseño futuro).
- **No hay que romper:**
  - La idempotencia de `confirmAndPay` y la regla de un pedido vivo por carrito.
  - El invariante de la preferencia de Mercado Pago (`mercadopago-preference.decision.ts:59-77`).
  - Que `qa:seed` nunca toca `status`, `notes`, `assigneeId` ni `evidence`.
  - El drift test del glosario (`glossary.data.test.ts`).
  - El tutorial, que tiene que seguir funcionando y sin mentir (ADR 0012).
  - La DB compartida: nada se escribe fuera de lo que autoriza §4.

## 4. Cómo trabaja el orquestador

### Roles de los sub-agentes

| Rol | Skill | Aislamiento | Devuelve |
| --- | --- | --- | --- |
| Grill | `q-code-grill-simple` (hasta 5 preguntas) o `q-code-grill-feature` | Sin worktree, solo lectura más su plan | Primero, **preguntas** para Flavio (protocolo abajo). Después, el plan en `docs/plans/<slug>.md`, las entradas de `CONTEXT.md` y el ADR si corresponde. |
| Debug | `q-code-debug` | Worktree | La causa confirmada, el fix y el test (#93). |
| Implementador | `q-code-implement` | `isolation: "worktree"` | Una rama con commits chicos, el registro de ejecución en el plan y la evidencia de `typecheck`, `test` y `check`. |
| Revisor | `q-review-code` (eje estándares y eje especificación) + `q-review-comments` | Sub-agente nuevo; **no** el implementador | Hallazgos. El implementador los corrige y el revisor confirma. |

### Protocolo de los grills (los sub-agentes no hablan con Flavio)

1. El orquestador lanza el grill con el brief de §7: decisiones ya tomadas, preguntas abiertas con su default y archivos a leer.
2. El grill explora el código y devuelve **solo preguntas**, cada una con:
   - el texto del ticket,
   - lo que muestra la pantalla hoy,
   - un **mockup antes/después** en ASCII con valores realistas,
   - su recomendación.

   Es una preferencia explícita de Flavio: sin ese contexto no puede decidir.
3. El orquestador le hace las preguntas a Flavio con `AskUserQuestion` (hasta 4 por diálogo, cada una entendible sola) y le pasa las respuestas al grill con `SendMessage`.
4. El grill escribe el plan. El orquestador lo lee, chequea que respete §2 y §3, y lanza al implementador.
5. **Un solo grill por vez le pregunta a Flavio.** Los demás pueden explorar en paralelo, pero sus preguntas esperan turno.

### Merge y registro

- **Orden del merge:** rama del WP → revisión → corrección de hallazgos → merge `--no-ff` a `main` en el checkout principal. Mensajes de commit en inglés, como el historial. **No hacer push** sin el OK de Flavio.
- **Paquetes que tocan los mismos archivos van en serie** (mapa en §8). Si dos ramas chocan, rebasear la segunda sobre `main`. No resolver a ciegas: usar `q-code-merge-conflicts`.
- **Al cerrar cada WP:**
  - agregar el registro de ejecución al plan del WP y una fila a la tabla "Registro de ejecución" de este documento (§13);
  - agregar las transiciones de sus tickets a `scripts/qa-ticket-triage.data.ts` (WP0).

### Qué se puede escribir en la base compartida (`DATABASE_URL` de `.env`, Neon)

- **Siempre, sin preguntar:** lectura con `SET default_transaction_read_only = on`.
- **Solo con el OK explícito de Flavio** en esta conversación y por cada ejecución: `pnpm qa:triage --apply`.
- **Lo corre Flavio:** migraciones (`pnpm exec prisma db execute --file prisma/migrations/<nombre>/migration.sql`; no `db:migrate`, que falla con P3005 porque la base compartida no tiene historial de migraciones: ver `docs/README.md:116`), scripts de datos y deploys.
- **Nunca:** `db:seed:test`, `db:purge-demo`, e2e que escriben (`supplier-application.spec.ts`, flujos de carrito o checkout), ni SQL a mano.

## 5. Protocolo de estados de QA

| Situación | Estado final | Nota (se agrega arriba, sin borrar la nota anterior) |
| --- | --- | --- |
| Lo reemplaza un ticket nuevo | **Papelera** (`softDelete`) | `[13/11/2026 · triage] Superado por #N: <qué cambia>. No re-testear.` La nota se escribe **antes** del soft delete, porque un ticket borrado no se puede editar (`qa-ticket.service.ts:69`). |
| Queda fuera de alcance o diferido | **Omitido** (`skipped`) | `[fecha · triage] Fuera de alcance por decisión del 13/11/2026` o `Diferido a H2`. |
| Falta un insumo externo | **Bloqueado** (`blocked`) | Qué falta y quién lo provee. |
| Corregido o implementado, y lo tiene que correr una persona | **Re-test** (`retest`) | `[fecha · triage] Corregido/implementado en <commit>. Mirar: <qué>. Precondiciones: <cuenta, datos>.` |
| Corregido o implementado, y verificable por código | **Completo OK** (`passed`) | `[fecha · triage] Verificado por código en <commit>: <comando> → <resultado>.` La salida completa queda en el registro de ejecución. |

**Un ticket es "verificable por código" solo si cumple todo esto:**
1. El resultado esperado se observa **sin login de Google, sin Mercado Pago y sin el admin**, o es un dato que una **consulta de solo lectura** a la DB compartida demuestra.
2. Hay un test (unitario o e2e) o una consulta que afirma **exactamente** ese resultado. Que "haya tests en el área" no alcanza.
3. Corrió en verde sobre el `main` actual. Los e2e corren contra una **DB local descartable**, nunca contra la compartida (§10).

Si una parte del ticket cumple y otra no, el ticket va a **Re-test** y la nota dice qué parte ya quedó verificada.

## 6. Paquetes de trabajo

Cada WP dice: tickets, cómo se ejecuta, qué hay que cambiar, la aceptación y el estado de QA al terminar. Los archivos y las líneas de "hoy" están en el reporte de triage.

### WP0 — Estado "Re-test" y script de triage

**Ejecución:** implementador directo, sin grill. **Esfuerzo:** S–M. **Depende de:** nada. **Bloquea a:** WP1.

**Tareas:**
- **T0.1, el enum.**
  - `prisma/schema.prisma` (`enum QaTicketStatus`): agregar `retest`.
  - `[NEW] prisma/migrations/20261113000000_qa_ticket_status_retest/migration.sql`: `ALTER TYPE "QaTicketStatus" ADD VALUE 'retest';`.
- **T0.2, el esquema y los datos.**
  - `src/schemas/admin/qa-ticket.schemas.ts`: `qaTicketStatusSchema` y `qaTicketStatsSchema` (contador `retest`).
  - `src/server/services/admin/qa-ticket.data.ts` (`getQaTicketStats`, ~l.126): inicializar el contador.
- **T0.3, la UI.**
  - `src/features/admin/crud/qa-ticket/qa-ticket.mappers.ts`: label "Re-test", ícono `RotateCcwIcon` y preset `inProgress` (info). Tiene que distinguirse de Pendiente (inerte) y de Completo OK.
  - `qa-ticket-kpis.ts`: Re-test **no** cuenta como ejecutado.
  - El selector de resultado y el filtro de la tabla toman las opciones del mapa, así que solo hay que verificar que aparezca.
- **T0.4, la documentación.**
  - Entrada `estado-qa-re-test` en `src/features/admin/glossary/data/qa.ts`, siguiendo a `estado-qa-omitido` (drift test).
  - Agregar `retest` a la fila de `QaTicketStatus` en `docs/schema-reference.md:313`.
  - `CONTEXT.md` ya tiene *QA re-test*.
- **T0.5, el script.**
  - `[NEW] scripts/qa-ticket-triage.data.ts`: lista tipada de transiciones `{ code, status?, prependNote?, definition?: Partial<{steps, expectedResult, title}>, retire?: true }`.
  - `[NEW] scripts/qa-ticket-triage.ts`:
    - Por defecto hace **dry-run**: imprime cada ticket con estado actual → nuevo y la nota.
    - `--apply` ejecuta cada transición con `update` y `softDelete` de `src/server/services/admin/qa-ticket.service.ts`, con el actor resuelto por `--actor-email` (un superadmin activo). Así cada cambio deja su `qaTicket.update` o `qaTicket.softDelete` en `AuditLog`.
    - Es idempotente: si el ticket ya está en el estado destino con esa nota, lo saltea.
    - Cortar si `APP_ENV=production`, salvo `--confirm-production`.
  - Agregar `"qa:triage": "tsx scripts/qa-ticket-triage.ts"` a `package.json`.
  - El patrón a copiar está en `scripts/purge-demo-data.ts`: dry-run, `--apply` y la confirmación de producción.

**Aceptación:**
- `pnpm typecheck`, `pnpm test` y `pnpm check` en verde.
- Hay tests del mapper, de los KPI y del schema con `retest`.
- `pnpm qa:triage` en dry-run lista las transiciones de WP1 sin escribir nada.

**Riesgo de orden:** la migración tiene que estar aplicada **y** la app desplegada con el enum nuevo **antes** de cualquier `--apply` que escriba `retest`. Si no, el cliente Prisma desplegado no puede leer el valor y `/admin/qa-tickets` se rompe. Además, el valor nuevo de un enum no se puede usar en la misma transacción que lo crea.

### WP1 — Gestión de estados y re-test

**Ejecución:** el orquestador mismo. Es operativo, no hay código salvo los datos del triage. **Depende de:** WP0 mergeado, migración aplicada y deploy hecho (lo hace Flavio).

**Transiciones iniciales** (cargarlas en `qa-ticket-triage.data.ts`):

| Tickets | Transición | Nota |
| --- | --- | --- |
| #71 | Papelera | Superado por #100 |
| #72 | Papelera | Superado por #101 |
| #75, #76, #77, #78, #79 | Papelera | Superado por #104 |
| #105, #111 | Omitido | Fuera de alcance por decisión del 13/11/2026 |
| #108 | Omitido | Diferido a H2; ver el reporte de noviembre |
| #82 | Bloqueado | Falta el número de WhatsApp contratado (`WHATSAPP_NUMBER = null`, `home-content.ts:88`) |
| #69 | Se reescribe la definición. Después, Completo OK si se verifica, o Re-test | Pasos: `pnpm db:seed:test` (ya no existe `db:seed`) y `pnpm db:seed-verify`. Resultado esperado: exit code 0 y ningún diagnóstico `quantityMismatch`. Verificar en una **DB local de Docker**, nunca en la compartida. |
| Candidatos a verificar por código: #70, #74, #81, #85, #87, #88, #89 | Completo OK si cumplen §5; si no, Re-test | #81, #87 y #89: consulta de solo lectura a la DB compartida (productos de Quintal activos, paso 0,5 en los términos por kg, 0 productos sin categoría) + tests unitarios. #70, #74, #85 y #88: e2e (`smoke`, `catalog-product-card`, `catalog-category-filter`) contra la DB local, más grep de que no queden "Ahorrás", "MOQ" ni "por bloque" en las vistas del cliente. |
| #2, #3, #12, #16, #18, #20–#26, #30–#33, #36–#38, #42, #45, #48, #54, #61, #67, #80, #83, #86 | Re-test | Copiar las precondiciones del reporte: comprador y tarjetas de MP para #21/#23/#24; cuenta "Administrador" no superadmin para #38; "Webhooks unsigned dev" apagado para #25; datos demo para #32; paquete fraccionado después del 19/09 para #54; para #86, "el registro con fecha sigue diferido". |
| #73, #84 | Re-test **después de WP-C** | WP-C cambia el stepper y el botón; antes no tiene sentido re-testearlos. |

**Pasos:**
1. Correr el dry-run y mostrarle a Flavio el resumen: cuántos van a cada estado y la lista.
2. Con su OK, correr `--apply --actor-email <el que indique Flavio>`.
3. Verificar en una consulta de solo lectura que los conteos por estado coinciden con el dry-run.

### WP-A — Bug y ajustes rápidos (#93, #97, #107 parcial, #109, #103 y #92 en código)

**Ejecución:** #93 con `q-code-debug`; el resto con un implementador directo, sin grill, porque las decisiones ya están. Commits separados por ticket. **Esfuerzo:** M en total. **Depende de:** nada.

**Tareas:**
- **#93.**
  - Reproducirlo en local: clics repetidos en "Ver qué se puede comprar" (`home-hero.tsx:29`) y en los links `/#ofertas` del navbar (`home-content.ts:5`).
  - Fix probable: un `<a>` nativo, o un handler con `scrollIntoView` y `history.replaceState`, sin pasar por el router de Next.
  - Agregar un e2e que haga 3 clics y afirme que la URL tiene un solo `#ofertas`.
  - El id `ofertas` se mantiene hasta WP-D.
- **#97 + #107 (sin imagen ni línea de cierre).** En `product-details-dialog.tsx`:
  - Sacar el estado vacío "Sin galería adicional" (`:156-161`).
  - Ocultar el bloque de descripción si es nulo, vacío o igual al nombre. Hay que normalizar el punto final, porque las descripciones de Quintal son `${name}.`.
  - Sacar el botón "Cerrar" del pie (`:196-204`).
  - El subtítulo genérico pasa a `DialogDescription` sr-only (WP-B le pone la línea de cierre).
  - En `src/components/ui/dialog.tsx`, el label sr-only de la ✕ pasa de "Close" a "Cerrar". Afecta a todos los diálogos, y está bien así. Buscar tests que esperen "Close".
- **#107, productos similares.**
  - `selectSimilarProducts` (`catalog-filtering.ts:181-234`): misma categoría primero y después el criterio actual.
  - Actualizar *Similar product* en `CONTEXT.md`: hoy dice "shared brand first and shared unit second" y pone "category" en `_Avoid_`.
  - Actualizar también los tests de `catalog-filtering`.
- **#109.**
  - "Coco" pasa a "CoCo" en todos los textos visibles del cliente y del admin, en la metadata, en el pie y en `better-auth/config.ts:8`.
  - **No cambian:** el wordmark en minúscula "coco" (navbar, h1 del hero, pie, ilustración, navbar del tutorial), `contacto@coco.app`, los identificadores de código ni la prosa de `docs/`.
  - Actualizar los tests y e2e que afirman "Coco".
- **#103.**
  - Sacar el bloque "Unidad" de `catalog-filters-sidebar.tsx:172-190`.
  - Ignorar el param `unit` en las URLs viejas, sin romperlas.
  - Borrar `computeUnitFacets` si queda sin uso y ajustar los tests.
- **#92 (código).**
  - Ocultar la descripción en el detalle y el fallback "Producto agregado para compra mayorista compartida." en el carrito (`cart-line-row.tsx:153-156`), con la misma regla que #107.
  - **Arreglar el vaciado de la descripción en el admin.** `nullishText` convierte "" en `undefined` y `toProductWriteInput` (`product.service.ts:285`) no escribe nada. Con descripción vacía tiene que guardar `null`. Va con un test que lo reproduzca primero.

**Aceptación:**
- `typecheck`, `test` y `check` en verde.
- e2e nuevos o ajustados en verde contra la DB local.
- No queda ningún "Coco" visible: `grep -rn '"Coco\|Coco ' src`, revisado a mano.

**Estado de QA al terminar:** #93, #97, #103, #109 → Re-test. #107 y #92 siguen en Pendiente hasta WP-B, WP-C y WP-I.

### WP-B — Cierre semanal y textos del home (#98, #99, #100, #104 y la línea de cierre de #107)

**Ejecución:** `q-code-grill-simple` → implementador. **Esfuerzo:** M. **Depende de:** WP-A mergeado (comparten `home-content.ts`, `app-navbar.tsx` y el diálogo). **Insumo bloqueante:** los textos de #104, del documento "CoCo · Tickets del recorrido", que no está en el repo. Pedírselos a Flavio antes del grill.

**Lo que hay que hacer (las decisiones abiertas están en el brief de §7):**
- **#98.**
  - Configuración del cierre (día y hora, por defecto miércoles 12:00, hora de Argentina) en un solo lugar editable desde el admin.
  - Un helper puro `getNextClosing(now, settings)` en `src/shared/common/date.helpers.ts` (usa `BUSINESS_TZ`), con tests de borde: justo antes y después del cierre, cambio de día y el dispositivo en otra zona horaria.
  - Un componente cliente que se actualiza **por minuto** (sin segundos): "Cierre del pedido: faltan 2 días y 5 h" o, con menos de 24 h, "faltan 5 h 20 min".
  - Va junto a "Ingresar" en el navbar, o en la franja superior en mobile (`announcement-bar.tsx`).
- **#99.**
  - Hero nuevo en `home-hero.tsx`: título (a elegir), bajada, línea de cierre armada con la config de #98 y el plazo de entrega, CTA "Ver el catálogo" a `/products`, y "No hace falta registrarte para mirar" debajo del botón.
  - Sacar "Mirá el catálogo sin registrarte" de la franja (`home-content.ts:10-11`).
- **#100.**
  - Los 4 pasos del ticket en `home-content.ts:13-19`.
  - El paso 1 sale de la config de #98.
  - El **paso 4 se adapta al flujo actual** (§2), por ejemplo: "Retirás o te lo enviamos. Al confirmar el pedido elegís retirarlo en el punto de retiro o recibirlo en tu casa."
  - Se va "No somos una distribuidora…".
  - La leyenda única es la figcaption de `home-system-illustration.tsx`, con "CoCo".
- **#104.**
  - Las 6 preguntas en el orden del ticket, con los textos del documento.
  - "¿Cómo recibo mi pedido?" se adapta al flujo actual.
  - La dirección del punto de retiro se agrega si hay un `PickupPoint` activo.
- **#107.** Subtítulo de la ficha: "Entra en el cierre del miércoles 11/11 a las 12 · Llega en 7 a 10 días", con la fecha de `getNextClosing`.
- **Companions:**
  - `home-content.test.ts` y `e2e/smoke.spec.ts` (5 pasos → 4, href del CTA, 6 preguntas del FAQ).
  - Tutorial: `tutorial-script.ts`, `home-scene.tsx` (reusa `HomeHero` y `HowItWorksSection`), `e2e/customer-tutorial.spec.ts`.
  - El aviso de `docs/plans/home-community-redesign.md` (que decía "sin fecha de cierre").

**Estado de QA al terminar:** #98, #99, #100, #104 → Re-test. #107 → Re-test solo si WP-C ya está mergeado.

### WP-C — Tarjeta y ficha (#106 y el resto de #107)

**Ejecución:** `q-code-grill-simple` → implementador. **Esfuerzo:** M. **Depende de:** WP-A (comparten el diálogo). Puede ir en paralelo con WP-B si se coordina el diálogo; si no, va después.

**Lo que hay que hacer:**
- **#106, en todas las tarjetas:** `product-card.tsx`, `home-offer-card.tsx` (grilla y destacado), `product-mini-card.tsx` y `PurchasePanel`.
  - Imagen 1:1 con `bg-contain` en `ProductImage` y en los contenedores.
  - Botón "Sumar al pedido" sin ícono ni monto. El catálogo hoy dice "Agregar".
  - El stepper muestra solo el número en las tarjetas, con un prop nuevo en `QuantityStepper`; el carrito conserva la unidad.
  - "$ 137.400 por bidón": se saca el tamaño dentro de `getOfferStepLabel` (`home-formatters.ts:66-73`), **no** en `formatUnitLabel`, porque esa la usa el carrito.
  - El comparativo se muestra siempre: sacar la regla de `commerce.helpers.ts:334-335` y el `&nbsp;` de relleno (`purchase-panel.tsx:87-91`).
- **#107, el resto:** la imagen del diálogo pasa a 1:1 con los mismos precio, stepper y botón que la tarjeta.
- **Companions:**
  - `e2e/catalog-product-card.spec.ts`, `e2e/home-offer-quantity.spec.ts`, `e2e/smoke.spec.ts` (6 checks del monto en el botón), `commerce.helpers.test.ts` y `home-formatters.test.ts`.
  - Tutorial: `tutorial-script.ts:133-134` y `catalog-scene.tsx`.
  - `CONTEXT.md`: en *Comparison price*, sacar "or when it equals the step price".
  - Nota en `docs/plans/product-card-price-hierarchy.md`: "en parte reemplazado por #106".

**Estado de QA al terminar:** #106 y #107 → Re-test. **Liberar #73 y #84 a Re-test.**

### WP-D — Combos y destacados (#101)

**Ejecución:** `q-code-grill-feature` → implementador. Si el grill ve que hacen falta varios ADR, escalar a `q-code-grill-design`. **Esfuerzo:** L. **Depende de:** WP-C (tarjetas) y WP-A (id `ofertas`). **Insumo bloqueante:** el contenido de los combos ("a confirmar" en el ticket).

**Lo que ya está decidido:**
- El *Combo* es una entidad con ABM en el admin.
- Los **destacados** son ortogonales y pueden ser productos o combos.
- Cada producto del combo entra como una línea del pedido, a su precio vigente, y se puede cambiar o quitar.
- Salen los chips Todos / kg / unidad de la sección.

**Hoy:** `HomeOfferSettings` (criterio, `offersLimit`, `spotlightProductId`), `Product.homeOfferRank` (fijados), `home-ranking.ts`, `offers-section.tsx`, `home-offers-grid.tsx` y `/admin/(catalog)/home-offers`.

**Companions:**
- `CONTEXT.md`: el grill tiene que actualizar *Featured offer*, *Offers ranking* y *Home spotlight*.
- Glosario del admin: entidad Combo más ítem de nav (drift test).
- Tutorial y smoke e2e.

**Estado de QA al terminar:** #101 → Re-test.

### WP-E — Menú de categorías en la barra (#102)

**Ejecución:** implementador directo. **Esfuerzo:** S–M. **Depende de:** WP-A (#103 y `app-navbar.tsx`). Si comparte navbar con WP-B, va después de WP-B.

**Tareas:**
- Procedure pública `catalog.categories` en `src/server/api/routers/catalog.router.ts`: categorías activas con al menos un producto vigente, ordenadas por `sortOrder`. Reusar el mapper `catalog-category.mapper.ts`.
- Dropdown "Categorías" en `app-navbar.tsx`, separado de la navegación principal, que lleva a `/products?categoria=<id>`.
- El mismo menú en `mobile-nav-menu.tsx`.
- No se muestra si no hay categorías. El buscador (`navbar-search.tsx`) queda como está.
- Revisar `tutorial-navbar.tsx` por consistencia visual.

**Estado de QA al terminar:** #102 → Re-test.

### WP-F — Descuento por transferencia (#110)

**Ejecución:** `q-code-grill-feature` → implementador. **Probablemente hace falta un ADR**: es plata, es difícil de revertir y es una excepción al ADR 0008. **Esfuerzo:** M–L. **Depende de:** WP-C si la ficha cambia de layout; si no, de nada. **Insumo:** que Flavio apruebe el texto de los términos `checkout-v4`.

**Lo que ya está decidido:**
- El campo va en la pestaña "Pago externo" (§2).
- El descuento se aplica sobre los productos, no sobre el envío.
- Se muestra en la ficha desplegada ("$ 123.660 pagando con transferencia") pero no en la tarjeta del catálogo.
- En el pedido va el total y debajo "Con transferencia: $ X".
- En el paso de pago, el total final ya trae el descuento.
- Montos redondeados a peso entero.

**Hoy:**
- El total del pedido es `UserTransaction.amount` (`checkout.service.ts:802`).
- Los snapshots de línea no tienen descuento.
- `confirmAndPay` reusa un intento sin mirar el medio (`:754-771`).
- Los términos son `checkout-v3` (`checkout-terms.ts`).
- El tutorial fija el total en $ 34.900 (`tutorial-fixtures.ts`).

**Estado de QA al terminar:** #110 → Re-test.

### WP-G — Repetir pedido (#112)

**Ejecución:** `q-code-grill-simple` → implementador. **Esfuerzo:** M. **Depende de:** nada. Ojo con el carrito si WP-D toca `cart.service.ts`.

**Hoy:**
- `/my-orders` tiene la lista y el detalle (`order-detail-view.tsx`).
- No existe la opción de repetir.
- Los ids de términos del snapshot suelen estar cerrados (ADR 0008), así que hay que llevar `productSnapshot.product.id` a los **términos vigentes**.
- Las altas pasan por `cart.service.ts` (`syncLocal`, que normaliza cantidades y avisa cuando algo no está disponible).
- `ensureCartMutable` rechaza la operación si hay un pago en curso.
- El carrito se espeja en `src/store/cart-store.ts` (`replaceCart`).

**Vocabulario:** "Mis compras" del ticket se dice "Mis pedidos". El botón dice "Repetir pedido".

**Estado de QA al terminar:** #112 → Re-test.

### WP-H — Leyenda "Imagen ilustrativa" (#90)

**Ejecución:** `q-code-grill-simple` → implementador. **Esfuerzo:** S con overlay, L con estampado. **Depende de:** WP-C (`ProductImage` 1:1).

**Hoy:**
- El upload sube el archivo crudo (`api/admin/product-images/route.ts:78`).
- No hay librería de imágenes.
- `Category` no tiene color.
- Las URLs pegadas a mano no pasan por el upload.

**Estado de QA al terminar:** #90 → Re-test.

### WP-I — Descripciones y composición de los mix (#91, #92 contenido)

**Ejecución:** el orquestador coordina el contenido con Flavio y un implementador carga los datos. **Esfuerzo:** S de código más el contenido. **Depende de:** WP-A (#92 código). **Insumo bloqueante:** la composición de los 3 mix y las descripciones de los productos activos, de Quintal o de quien redacte.

**Tareas:**
- Overrides de descripción por clave de producto en `scripts/quintal-catalog.overrides.ts`. Regenerar con `pnpm catalog:quintal`: `scripts/quintal-catalog.data.ts` es generado ("Do not edit").
- **Verificar** qué comando lleva las descripciones a una DB existente sin resetear el catálogo (`scripts/lib/seed-init-core.ts:86`, `scripts/lib/reset-initial-catalog.ts:157-170`). Si no hay ninguno, agregar un modo `--update-descriptions` con dry-run.
- **No editar las descripciones solo desde el admin**: el reset las marca como diferencia.
- La aplicación en la DB compartida la corre Flavio.

**Estado de QA al terminar:** #91 y #92 → Re-test.

## 7. Briefs de los grills

Las preguntas tienen el default recomendado. El grill puede sumar preguntas si el código lo pide, sin pasar de 5 en los simples. Lo que §2 ya decidió **no se vuelve a preguntar**.

**WP-B (simple):**
1. #98: ¿el cierre es solo informativo o corta algo, por ejemplo que lo que entra después vaya a la semana siguiente? **Default:** solo informativo; el admin sigue lanzando la operación a mano.
2. #98: ¿dónde vive la configuración del cierre y quién la edita? **Default:** un singleton nuevo `StoreSettings` (día, hora y plazo de entrega "7 a 10 días") con una pantalla en el admin para los admins. Va aparte de los settings de pago (§2 #110).
3. #99: ¿qué título? "Comprar en grupo sale menos." o "Entre muchos, mejor precio." **Default:** el que diga el documento del recorrido; si no dice nada, que elija Flavio.
4. #100: ¿el diagrama baja a "Cómo funciona" o queda en el hero? **Default:** que baje. El hero queda con texto y CTA.
5. #98, mobile: ¿va en la franja superior siempre o solo cuando no entra en el navbar? **Default:** en mobile, siempre en la franja.

**WP-C (simple):**
1. ¿El total de la línea desaparece de la tarjeta? **Default:** sí; queda como live region sr-only y se ve en el pedido.
2. ¿Los productos por kg conservan "por 500 g"? **Default:** sí; el tamaño solo se saca en los productos por unidad.
3. ¿Qué fondo lleva la imagen 1:1 con `contain`? **Default:** el fondo neutro de la tarjeta.

**WP-D (feature):**
1. ¿Los tamaños del combo son dos fijos (1 y 2 personas) o variantes con nombre libre? **Default:** variantes con nombre, y el admin carga "1 persona" y "2 personas".
2. ¿Los destacados son una lista curada a mano o se mantiene el ranking automático para rellenar? **Default:** lista curada de productos y combos, con el ranking actual como relleno opcional.
3. ¿El "Producto destacado" (spotlight) puede ser un combo? **Default:** no en esta entrega.
4. ¿Los combos aparecen fuera del home (por ejemplo en `/products`)? **Default:** solo en el home.
5. Si un producto del combo no está disponible: **Default:** se suman los demás con un aviso, el combo se oculta si no queda ninguno y el admin ve una advertencia. Las cantidades se validan contra el mínimo y el paso al guardar el combo.
6. ¿Qué pasa con la pantalla `home-offers` y los criterios de ranking? **Default:** pasa a llamarse "Destacados" y conserva los criterios como relleno.

**WP-F (feature):**
1. ¿Se acumula con el descuento de oferta? **Default:** sí, sobre el subtotal que ya tiene el descuento de oferta.
2. ¿Dónde queda el descuento en el snapshot? **Default:** columnas nuevas y nulas en el pedido (`paymentDiscountPercent`, `paymentDiscountAmount`), para que el detalle de "Mis pedidos" cierre.
3. ¿Qué pasa si el cliente cambia de medio con un intento abierto? **Default:** se reusa el intento solo si es del mismo medio; si no, se cancela y se crea uno nuevo.
4. ¿Qué se redondea a peso entero, el descuento o el total? **Default:** el total con transferencia, con el descuento = subtotal − total.
5. ¿Qué pasa si el % cambia mientras el cliente está en el checkout? **Default:** se congela al confirmar y la pantalla de pago lo vuelve a calcular al entrar.

**WP-G (simple):**
1. ¿Se eligen los productos antes de repetir, o se agregan todos y se edita en el pedido? **Default:** un diálogo con checkboxes (todos marcados, los no disponibles deshabilitados con "Ya no disponible"), después se suma al pedido y se va a `/cart`.
2. Si el pedido abierto ya tiene ese producto: **Default:** se suman las cantidades, normalizadas al paso y al máximo.
3. ¿El detalle muestra el precio por unidad registrado? **Default:** sí, una línea con "precio × cantidad".

**WP-H (simple):**
1. ¿Overlay en pantalla o imagen estampada? **Default:** overlay en `ProductImage`, abajo a la derecha, con tamaño relativo al ancho (~2,5 %).
2. ¿De dónde sale el color por categoría? **Default:** un campo `color` nuevo en `Category`, con un selector en el ABM de categorías, y la leyenda en un tono oscuro de ese color.
3. ¿Los placeholders sin foto llevan la leyenda? **Default:** no.

## 8. Olas y mapa de conflictos

```text
Ola 0: WP0 ──► (Flavio: migración + deploy) ──► WP1
Ola 1: WP-A (debug #93 + ajustes)        grills en serie: WP-B → WP-C → WP-F → WP-G
Ola 2: WP-B ─┐                            (pide insumos: textos #104, combos, descripciones)
       WP-C ─┴─► liberar #73/#84 ──► WP-E
Ola 3: WP-D (grill + impl), WP-F, WP-G
Ola 4: WP-H, WP-I (cuando llegue el contenido)
```

**Archivos compartidos (esos paquetes van en serie o con rebase):**

| Archivo | Paquetes |
| --- | --- |
| `product-details-dialog.tsx` | A, B, C, F |
| `app-navbar.tsx` | A (#109), B (#98), E |
| `home-content.ts` | A (#93), B, D |
| `purchase-panel.tsx` | C, D |
| `tutorial-script.ts` | A, B, C, F |
| `cart.service.ts` | D, G |
| `checkout-*` | F |

## 9. Riesgos y trampas globales

- **Tutorial (ADR 0012).** Copia textos y flujos. Cada WP que cambia textos del home, la tarjeta, el checkout o el total tiene que actualizar:
  - `src/features/tutorial/tutorial-script.ts`
  - `tutorial-fixtures.ts`
  - `scenes/*`
  - `tutorial-script.test.ts`, `tutorial-fixtures.test.ts` y `e2e/customer-tutorial.spec.ts` (contadores "1 / 12" y "19 / 21")
- **Drift test del glosario.** Toda entidad, estado o ítem de nav nuevo (Re-test, Combo, StoreSettings, categorías en el navbar) necesita su entrada en `src/features/admin/glossary/data/*.ts`.
- **Migraciones.** Primero se aplica la migración en la DB compartida (lo hace Flavio) y después se despliega el código que la lee. Ningún script de datos se corre desde un agente.
- **Términos del checkout.** Cualquier cambio de texto obliga a subir la versión (`checkout-v4` en WP-F). El texto lo aprueba Flavio.
- **e2e y DB.** `playwright.config.ts` levanta `pnpm dev`, que usa `.env`, y `.env` apunta a la Neon compartida.
  - Para e2e, levantar una DB local con Docker (Docker Desktop está disponible) y pasar un `DATABASE_URL` local por variable de entorno.
  - `start-database.sh` deduce la contraseña, el puerto y el nombre del `DATABASE_URL` de `.env`. Con la URL de Neon activa no sirve: correrlo con la URL local (`.env:16`, comentada) o crear el contenedor a mano.
  - Antes de los e2e: el script `run-e2e-local.sh` restaura la base local sembrada y aplica con `E2E_PREP` las migraciones nuevas del WP (§13). `pnpm db:migrate` no corre sobre una base vacía.
- **Notas de QA.** Siempre se **agregan arriba**, sin pisar la nota del tester; la historia también queda en `AuditLog`. Un ticket en papelera no se puede editar.
- **Vocabulario.** Los textos al cliente usan "pedido" y no "carrito", y "CoCo" después de WP-A. El *Combo* no es una "promoción" (`CONTEXT.md`).
- **Preguntas a Flavio.** Siempre con el contexto del ticket y un mockup antes/después; nunca abrir con jerga (MOQ, step).

## 10. Validación

- **Por WP:** `pnpm typecheck`, `pnpm test`, `pnpm check`, y los e2e del área con `pnpm test:e2e <spec>` contra la DB local.
- **Mini review por WP:** `q-review-code` (dos ejes) y `q-review-comments`. Los hallazgos se corrigen o se registran.
- **Estados de QA:** después de cada `--apply`, una consulta de solo lectura de los conteos por estado y una comparación contra el dry-run.

## 11. Lo que tiene que aportar Flavio

| Insumo o acción | Para |
| --- | --- |
| Documento "CoCo · Tickets del recorrido" (textos del FAQ y del hero) | WP-B (#104, #99) |
| Contenido de los combos | WP-D |
| Composición de los mix y descripciones, de Quintal o de quien redacte | WP-I |
| Número de WhatsApp contratado | #82 (sigue bloqueado mientras falte) |
| Aprobación del texto `checkout-v4` | WP-F |
| Comprador y tarjetas de prueba de MP, y una cuenta "Administrador" no superadmin, para el tester | Re-test de #21, #23, #24 y #38 |
| Aplicar migraciones, deploy, OK para `qa:triage --apply` y OK para push | Todas las olas |

## 12. Definición de hecho

- [ ] `retest` existe en el enum, la UI, las estadísticas, el glosario y `docs/schema-reference.md`. El tablero lo filtra.
- [ ] Ningún ticket de #2–#112 queda en Pendiente sin motivo. Cada uno está en Re-test, Completo OK (con evidencia), Omitido, Bloqueado o papelera, con su nota fechada.
- [ ] WP-A a WP-I están mergeados en `main`, cada uno con su revisión, o frenados en una pregunta bloqueante registrada en §13.
- [ ] `pnpm typecheck`, `pnpm test` y `pnpm check` en verde en `main`. Los e2e de las áreas tocadas están en verde contra la DB local.
- [ ] `CONTEXT.md`, el glosario del admin, el tutorial y los planes afectados están actualizados.
- [ ] El registro de ejecución (§13) está completo y el reporte de triage tiene sus decisiones al día.

## 13. Registro de ejecución

| WP | Plan | Merge | Estado de QA aplicado | Notas |
| --- | --- | --- | --- | --- |
| WP0 | `qa-2026-11-wp0-retest-status.md` | `56d3233` | Ninguno todavía: `--apply` espera la migración `20261113000000_qa_ticket_status_retest` y el deploy (Flavio). El dry-run del 13/11 sobre `e34f660`+datos da 44 transiciones, sin conflictos: 7 a la papelera, 3 a Omitido, 1 a Bloqueado y 33 a Re-test (se liberan 30 asignados). | La revisión pidió que re-correr `--apply` no pise lo que cargó un tester (B1). Ahora la nota marca la transición como hecha, `from` define desde qué estado puede arrancar (por defecto `pending`) y los conflictos se saltean con aviso. Re-test libera el asignado (Flavio, 13/11). Re-test no aparece en el selector de resultado del tester, porque es un lugar en la cola y no un resultado. |
| WP-G | `qa-2026-11-wpg-repeat-order.md` | `964c670` | Cargado en `qa:triage`: #112 → Re-test. | La revisión encontró una carrera (M1) en la que repetir podía cancelar un pedido recién confirmado. Se corrigió con la política `refuseLiveOrder` en la liberación del checkout. Queda un riesgo residual que necesita un lock de fila del carrito, fuera de alcance. e2e en verde contra la base local: `customer-tutorial` (9) y `smoke` (15). El flujo real de repetir no tiene e2e porque el login es solo con Google. |
| WP-A | `qa-2026-11-wpa-quick-fixes.md` | `86f4f26` | Cargado en `qa:triage`: #93, #97, #103 y #109 → Re-test. #107 y #92 siguen en Pendiente. | Revisión independiente con un bloqueante (aserción de e2e sobre `sr-only`), corregido. e2e en verde contra la base local: `home-section-links` 3×, `catalog-product-card`, `smoke`, `catalog-category-filter`, `home-offer-quantity` y `supplier-application`. #93: causa confirmada en Next 16.2.7 (la caché de rutas guarda el hash), fix con `HashSafeLink`. #92: el bug de vaciado en el admin no existía (`product.data.ts` escribe `?? null`). Preexistente en `main`: hydration mismatch en `/products` (sidebar de marcas) que vuelve intermitente `customer-tutorial.spec.ts:58`. |

**Decisiones y hallazgos del orquestador (13/11):**
- Los worktrees de los sub-agentes salen de `origin/main` (`a0ef619`). Por eso cada implementador hace `git rebase main` antes de empezar.
- La base local de e2e es el contenedor `coco-e2e-postgres` (`localhost:5433/coco_e2e`), armada con `prisma migrate diff --from-empty` porque `pnpm db:migrate` no corre sobre una base vacía: la historia de migraciones no tiene baseline. Hay un dump sembrado para restaurarla. Los agentes corren los e2e solo con `/tmp/claude-1000/-home-flavio-quasar-coco/faa97d93-7356-42ca-ba3c-0f31cff820da/scratchpad/run-e2e-local.sh <specs>`, que toma un lock global (puerto 3000 y base), apunta el `.env` del worktree a la base local, restaura el dump, corre `E2E_PREP` si está definido (por ejemplo, para aplicar la migración del WP) y restaura el `.env` al salir, verificándolo con sha256.
- La base compartida no tiene historial de Prisma: `pnpm db:migrate` falla con P3005 (le pasó a Flavio el 13/11 con la migración de WP0). Cada migración se aplica con `pnpm exec prisma db execute --file prisma/migrations/<nombre>/migration.sql` y se verifica con `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` (`docs/README.md:116`).
- Flavio, 13/11:
  - #104 y #99: los textos preliminares los generan los agentes y Flavio los revisa en el re-test.
  - Combos, mix (#91) y descripciones (#92): se cargan desde el admin.
  - Re-test libera el asignado.
  - `checkout-v4` aprobado.
- Precondición de QA de #104: el único punto de retiro activo tiene datos de prueba ("Calle Falsa 123"). Flavio lo corrige o lo desactiva antes del re-test.

## 14. Instrucciones para el orquestador

1. Leer, en este orden:
   - este documento;
   - `docs/plans/qa-open-tickets-2026-11-report.md`;
   - `CONTEXT.md`;
   - los ADR 0008, 0010, 0011 y 0012;
   - `docs/plans/product-card-price-hierarchy.md` y `docs/plans/customer-tutorial.md`.
2. Respetar §2 y §3. No reabrir #105, #108 ni #111 ni proponer cambios al ADR 0011.
3. Antes de lanzar cada WP, verificar que las rutas y los símbolos que cita el reporte sigan existiendo. Si `main` cambió, corregir el brief.
4. No implementar los paquetes con grill sin el plan aprobado. Los paquetes directos (WP0, WP-A, WP-E) arrancan sin grill.
5. Ante una pregunta bloqueante, frenar ese WP, preguntarle a Flavio (§4, protocolo) y seguir con otro WP que no dependa de ella. Ante un hueco no bloqueante, seguir con el default de §7 y anotarlo.
6. Nunca escribir en la DB compartida, hacer push ni desplegar sin el OK explícito de Flavio para esa acción.
7. Al terminar cada ola, mandarle a Flavio un resumen corto: qué se mergeó, qué estados de QA cambiaron, qué insumos faltan y la próxima ola.
