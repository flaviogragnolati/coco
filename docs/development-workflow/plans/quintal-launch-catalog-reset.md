---
artifact_id: IP-QUINTAL-LAUNCH-20261016
artifact_type: implementation-plan
version: "1.0"
lifecycle: Working
creation_mode: authored
semantic_authority: canonical
authority_scope: planned-execution
owner_skill: q-code-grill-feature
source_item_id: REQ-QUINTAL-LAUNCH-20261016
created: 2026-10-16
alignment_status: approved
execution_status: implemented
last_updated_by: q-code-implement
---

# Catálogo inicial Quintal de octubre y reinicio de la base compartida

## Objetivo y resultado

Sustituir el catálogo de inicialización por el listado de lanzamiento suministrado por el usuario. La base compartida quedará con **27 productos**, cada uno con un término vigente de proveedor y uno de cliente, sin productos anteriores ni operatoria histórica. Se conservan usuarios, accesos, configuración y tickets QA. Cajú sin sal y salada serán productos comprables distintos al mismo precio.

El usuario aprobó este plan al pedir su implementación con `q-code-implement` el 2026-10-16. La implementación y el reemplazo de la base compartida están completos; la evidencia de cierre figura en «Resultado de implementación». El refinamiento previo no había modificado código ni conectado a la base.

## Fuentes y autoridad

- `REQ-QUINTAL-LAUNCH-20261016`: solicitud del usuario y respuestas de alineación del 2026-10-16; identificador local de esta solicitud, sin ticket/backlog previo identificado.
- [Planilla suministrada](https://docs.google.com/spreadsheets/d/16S1ivbmXSI378E5b6xDsZeXDe_L2cK-A/edit?gid=452922195#gid=452922195): archivo Office `CoCo Catalogo para carga - Oct 2026.xlsx`, Drive ID `16S1ivbmXSI378E5b6xDsZeXDe_L2cK-A`, modificado `2026-10-11T22:24:01.667Z`, 27.470 bytes.
- Snapshot leído: SHA-256 `22661c07c5264cc5e64baf45effd43244ad34ffd9f1b80df1a54140caf6c1f26`. Hojas reales del XLSX: **Catalogo**, **Criterios**. El `gid` de la URL no es el `sheetId` de Office. No convertir ni editar el archivo remoto.
- `Catalogo!B6:AG7`: encabezados y criterios; `B8:AG33`: 26 filas de productos; `Criterios`: parámetros y salvedades. Cajú, fila 11, se expande por decisión del usuario.
- Código inspeccionado en `HEAD 3b4a1ff`: `prisma/schema.prisma`, `scripts/{seed-init.ts,seed-init.plan.ts,quintal-catalog-parse.ts,quintal-catalog.parser.ts,quintal-catalog.schema.ts,quintal-catalog.overrides.ts,quintal-catalog.categories.ts,quintal-catalog.data.ts,purge-demo-data.ts,purge-demo-data.plan.ts}`, sus pruebas y `src/server/lib/xlsx/xlsx-reader.ts`.
- Contratos consumidores: `src/shared/common/commerce.helpers.ts`, `src/server/services/_base/{client-terms-prices,terms-validity}.ts`, `src/server/events/domain-event-dispatcher.ts`, `src/server/services/checkout/checkout.service.ts`.
- Documentación operativa: `docs/README.md`. Tiene cambios previos del usuario; preservarlos al editar. No hay una referencia versionada a technical foundation o workflow activo identificada para esta solicitud.

## Alcance y límites

Incluye importación reproducible del XLSX, regeneración de `quintal-catalog.data.ts`, mínimos/pasos/precios por producto, clasificación, presentaciones, reemplazo de todos los productos y operatoria, validación y recuperación de la base compartida.

El alcance confirmado por el usuario importa el **precio publicado final**, sin aplicar de nuevo flete, IVA, markup o redondeo al cargar términos o vender. Se conservan los criterios como referencia de importación. Una ampliación futura a UI o motor de precios requiere un refinamiento separado.

No incluye sincronización continua con Drive, edición de la planilla, cambio de stack, nuevas reglas de fulfillment, modificación de textos legales o términos y condiciones de checkout, ni repoblación de pedidos demo. «Términos» aquí significa condiciones de compra de producto para cliente y proveedor.

Diferido: cotizaciones futuras, actualización automática al cambiar costos, imágenes y descripciones editoriales nuevas, cambios de marca visible, confirmación comercial de estimaciones de merma/flete/pesos y de la variedad del coco. La falta de esa confirmación no autoriza a corregir los precios de la planilla.

## Alineación

| Tema | Resolución y procedencia |
| --- | --- |
| Entorno | Base compartida, confirmado por el usuario. No inferir que es descartable ni decidir el destino por `NODE_ENV`. |
| Datos que permanecen | Usuarios, accesos, configuración y tickets QA, confirmado por el usuario. |
| Datos que se eliminan | Todo el catálogo anterior de productos y toda la operatoria: carritos, pedidos, intentos de pago, operaciones, compras a proveedores, lotes, paquetes, envíos y relaciones dependientes. Confirmado por el usuario. |
| Cajú | Dos productos, sin sal y salada; precio y términos iguales. Confirmado por el usuario. |
| Precios y composición | Snapshot de precios finales y términos; conservar criterios como referencia de importación. Confirmado por el usuario. No desarrollar UI de desglose ni recálculo. |
| Presentaciones | Las de cliente y proveedor son distintas; respetar ambas columnas. |
| Vigencia | Capturar el instante de generación del snapshot aprobado como `listDate`; documentarlo como vigencia del catálogo importado, sin atribuir a Quintal una fecha diaria que el libro no declara. Los términos deben resultar vigentes al aplicar. |
| Descripciones ausentes | Usar `nombre + "."` como descripción mínima para satisfacer el contrato; no publicar notas internas ni inventar propiedades. |
| Referencias de configuración | Conservar proveedores, marcas, categorías, transportistas, puntos de retiro, destinos y configuración de pagos. Los proveedores sobrantes no son productos; no eliminarlos por deducción. |

Opciones descartadas: volver a ejecutar el seed actual como si actualizara datos; usar `db:purge-demo` como reemplazo completo; restaurar el dataset demo; `prisma migrate reset`/`db push` para una sustitución de datos; mantener un producto único de cajú. Sin cambio de terminología durable ni ADR necesario para el alcance de importación.

## Contexto observado y riesgos físicos

- El catálogo actual tiene 88 productos y fecha de julio. El parser espera `Lista WEB`; este libro usa una tabla diferente con 26 filas y precios finales.
- `db:seed:init` es insert-only: `planSeedInit` decide `create/keep/skip`; nunca reemplaza precios o productos ni borra los que salen del listado. Mantener este contrato en la ejecución habitual.
- `db:purge-demo` borra operatoria pero conserva Quintal, sus productos y términos. No cumple este reemplazo; mantener el comportamiento de ese comando.
- Las cantidades se guardan en `Decimal(18,4)`, el dinero en `Decimal(18,2)`. La tabla ya cabe en `Product`, `ProductClientTerms` y `ProductSupplierTerms`; no se propone DDL para importar valores finales.
- `CartItem` restringe el borrado de términos de cliente y `LotItem` el de términos de proveedor. Borrar primero sus dependientes. El destacado de home referencia producto con `SetNull`.
- El ledger `PaymentProviderEvent` tiene deduplicación y relación `SetNull` con intentos. Conservar sus recibos como infraestructura de auditoría, aunque se borren los intentos de pago; no llamar APIs de pagos ni emitir reembolsos como parte del reset.
- `AuditLog` y `DomainEventOutbox` contienen IDs históricos fuera de esas FKs. Conservarlos no vuelve seguros los eventos pendientes. No reciclar IDs ni reiniciar secuencias.
- Revisión transitoria `q-tool-database-schema`, request `quintal-launch-20261016`, tarea `schema-review`: relaciones, precisiones y orden de dependencia revisados a partir del repositorio. Request/result validados contra sus schemas. Cobertura **portable**: versión del servidor, constraints reales, volumen, topology y backup no inspeccionados. La aprobación específica de ejecución/migración del motor queda condicionada a ese relevamiento durante implementación; no se afirmó revisión de la base viva.
- `docs/README.md` informa que la base compartida carece de historial Prisma y tiene instrucciones SQL manuales. Verificar el estado actual antes de ejecutar; este cambio de catálogo no necesita inventar una nueva migración estructural.

## Contrato de importación

Leer `Catalogo`, reconocer el bloque por encabezados y número de producto, y validar las 26 filas; no depender exclusivamente de posiciones. Detectar encabezados ausentes/repetidos, IDs repetidos, filas inesperadas y valores inválidos. En la versión inspeccionada los datos están en filas 8–33.

| Fuente | Destino o uso |
| --- | --- |
| B: número | Identidad estable de importación `coco-oct2026--01` … `--26`; cajú `coco-oct2026--04-sin-sal` y `--04-salada`. Registrar fila fuente. |
| C: nombre publicado | `Product.name`, salvo la separación explícita de cajú: `Castaña de cajú tostada sin sal` y `Castaña de cajú tostada salada`. |
| D: categoría | Categoría canónica homónima; no aplicar excepciones de productos antiguos por parecido de nombre. |
| E: proveedor | Validar `Quintal`, resolver un único proveedor no eliminado. Preservar sus datos de contacto; no tomarlo como marca pública. |
| F: unidad | `kg → kg`, `unidad → piece`. Rechazar otras unidades. |
| G: presentación cliente | `null` por kg; por unidad: `botella/0,5 L`, `botella/1 L`, `bidon/5 L`, `frasco/370 g`, `bolsa/1 kg`. |
| I / J: paso / mínimo cliente | `clientTerms.step` / `moq`; están explícitos. No recalcular el paso por el precio en runtime. |
| Z: precio publicado | `clientTerms.unitPrice`; `moqPrice = unitPrice × moq`, `stepPrice = unitPrice × step`, a centavos con Decimal. `max = null`. |
| AC: total mínimo | Validación independiente de `clientTerms.moqPrice`. |
| K: precio Quintal por unidad | `supplierTerms.refPrice`; no usarlo como precio al cliente. |
| AD / AE / AF: pack / mínimo / precio pack | `supplierPresentation` / `moq` / `moqPrice`. `step = moq`, `stepPrice = moqPrice`; comprobar `K × AE = AF` a centavos. |
| H, L:Y, AA:AB, AG y Criterios | Procedencia y notas internas de importación; no hay columnas equivalentes de costo/peso en los términos actuales. Preservar evidencia de criterios en el snapshot generado; no mostrarlas como descripción comercial. |

ARS, compras sin IVA y de contado según fuente. No añadir IVA, margen o descuentos sobre Z. Packs alternativos o promociones en notas quedan como referencia y no crean otros términos. No trasladar supuestos internos de merma/peso a propiedades comerciales.

El lector existente consume valores cacheados y no evalúa fórmulas. El XLSX inspeccionado tiene 527 fórmulas en Catalogo y 18 en Criterios, con caché presente y sin partes de macros/conexiones/enlaces externos identificadas. No equivale a recalculación independiente. El importador debe rechazar errores o cachés ausentes en datos consumidos; corroborar precios de una muestra contra fórmulas/criterios y los 26 valores Z contra la matriz de aceptación. No recalcular el archivo fuente.

Extender `source.sheet` para aceptar `Catalogo` además de `Lista WEB`; conservar nombre, hash y añadir URL/modifiedTime y perfil de importación como procedencia opcional compatible con el parser legado. Incluir un snapshot interno tipado de los criterios y columnas de costo/peso de este perfil, sin persistirlos en nuevas tablas. Esto preserva la referencia sin introducir un motor financiero.

## Matriz de aceptación comercial

Importes ARS por kg o unidad según fila. Mínimo = paso del cliente. El pack de Quintal usa esa misma unidad de medida, no el número de envases como unidad nueva.

| Fila XLSX | Producto | Unidad | Precio cliente | Mín./paso | Mín. Quintal | Precio pack Quintal |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 8 | Almendra Non Pareil 25/27 | kg | 32850 | 0,5 | 10 | 225000 |
| 9 | Nuez mariposa extra light | kg | 18000 | 1 | 10 | 115000 |
| 10 | Nuez cuartos extra light | kg | 16650 | 1 | 10 | 105000 |
| 11 | Castaña de cajú tostada sin sal | kg | 22600 | 0,5 | 5 | 74500 |
| 11 | Castaña de cajú tostada salada | kg | 22600 | 0,5 | 5 | 74500 |
| 12 | Pistacho con cáscara Riojano | kg | 34900 | 0,5 | 10 | 240000 |
| 13 | Avellana Chile 13-15 | kg | 38150 | 0,5 | 10 | 264000 |
| 14 | Pecan premium | kg | 29350 | 0,5 | 10 | 199000 |
| 15 | Maní tostado salado | kg | 6150 | 1 | 5 | 13750 |
| 16 | Mix de frutos secos económico | kg | 12300 | 1 | 10 | 73000 |
| 17 | Mix de frutos secos deportivo | kg | 16500 | 1 | 10 | 104000 |
| 18 | Mix de frutos secos antioxidante premium | kg | 25700 | 0,5 | 10 | 172000 |
| 19 | Banana chips | kg | 15800 | 1 | 6,8 | 67320 |
| 20 | Pasa de uva Flame sin semilla | kg | 7850 | 1 | 10 | 40000 |
| 21 | Pasa de uva rubia premium 2026 | kg | 11500 | 1 | 9 | 60300 |
| 22 | Dátil Egipto | kg | 9750 | 0,5 | 5 | 27000 |
| 23 | Dátil Medjool | kg | 30150 | 0,5 | 5 | 102500 |
| 24 | Ciruela sin carozo grande | kg | 14200 | 1 | 5 | 43500 |
| 25 | Empaque mixto sin carozo (frutas secas surtidas) | kg | 17150 | 1 | 5 | 54500 |
| 26 | Mix de semillas premium (sésamo, girasol, lino, chía) | kg | 7850 | 1 | 5 | 20000 |
| 27 | Granola Kuati tradicional | kg | 14450 | 1 | 5 | 44500 |
| 28 | Coco rallado fino | kg | 14050 | 1 | 5 | 43000 |
| 29 | Aceite de oliva extra virgen 0,5 L | piece | 16900 | 1 | 12 | 140400 |
| 30 | Aceite de oliva extra virgen 1 L | piece | 30400 | 1 | 6 | 126000 |
| 31 | Aceite de oliva extra virgen 5 L | piece | 137400 | 1 | 2 | 190000 |
| 32 | Pasta de maní Entre Nuts 370 g | piece | 5150 | 1 | 12 | 32400 |
| 33 | Sal rosada del Himalaya | piece | 7500 | 1 | 1 | 3800 |

Totales: 9 Frutos secos, 4 Mixes y snacks, 6 Frutas desecadas, 3 Semillas y granola y 5 Aceites y despensa. Conservar la categoría configurada Suplementos, sin productos cargados. 22 productos por kg, 5 por unidad; 9 mínimos de 0,5 y 18 mínimos de 1.

## Mapa de archivos

| Archivo | Trabajo y contrato |
| --- | --- |
| `scripts/quintal-launch-catalog.parser.ts` (nuevo) | `parseQuintalLaunchSheet(sheet, criteriaSheet, metadata)` devuelve `{catalog, issues, rowLog}`, compatible en forma con el parser actual; filas, precios finales, split y procedencia del nuevo perfil. `sheet` es Catalogo y `criteriaSheet` es Criterios, ambas `XlsxSheet`. Metadata contiene fileName, sha256, sourceUrl, sourceModifiedAt y listDate. |
| `scripts/quintal-launch-catalog.config.ts` (nuevo) | Metadata estable del snapshot: nombre original, hash esperado, URL, modifiedTime e instante de captura elegido al generar. El parser valida el hash; `--check` consume los mismos valores sin consultar la hora ni Drive. |
| `scripts/quintal-launch-catalog.parser.test.ts` (nuevo) | Casos del libro nuevo con fixtures mínimas fieles; matriz de 26 filas fuente/27 productos y rechazos. |
| `scripts/quintal-catalog-parse.ts` | `--format coco-launch` selecciona `Catalogo` y parser nuevo. Mantener ruta legada `quintal-list` y el default legado; `--check` compara el resultado, sin DB. |
| `scripts/quintal-catalog.schema.ts` | Fuente compatible con ambas hojas, metadata opcional y evidencia interna del perfil nuevo; cantidades y precios conservan precisión. |
| `scripts/quintal-catalog.data.ts` | Regenerar, nunca editar manualmente; contiene solo los 27 productos. |
| `scripts/quintal-catalog.categories.ts` | Resolver categorías canónicas directas además de los headings legados, manteniendo prioridad de excepciones explícitas por key. |
| `scripts/quintal-catalog.{data,categories}.test.ts` | Reemplazar expectativas de 88 productos/precio proveedor = cliente/0,5 universal por la matriz nueva. Aislar checks de overrides legados en fixtures del perfil legado. |
| `scripts/lib/seed-init-core.ts` (nuevo) | Extraer `loadState`, `applyPlan`, preparación/validación de categorías a funciones importables sin side effects: `loadSeedInitState(tx,catalog)`, `applySeedInitPlan(tx,plan,catalog,listDate)`, `toSeedInitCatalog(catalog)`. |
| `scripts/seed-init.ts` | Wrapper CLI que usa el core y mantiene insert-only, transacción y resumen. No importar un CLI desde el reset. |
| `scripts/reset-initial-catalog.plan.ts` (nuevo) | Planner puro: inventario, validaciones, orden de borrado, target y condiciones de aplicación. No confundirlo con `planDemoPurge`. |
| `scripts/reset-initial-catalog.ts` (nuevo) | Dry run por defecto; aplicación atómica de borrado + `planSeedInit` + `applySeedInitPlan` + verificación exacta. |
| `scripts/reset-initial-catalog.plan.test.ts` / `.integration.test.ts` (nuevos) | Límites del reset, preservación, integridad, fallo inyectado y rollback; integración solo en base descartable dedicada. |
| `package.json` | `db:reset:catalog = tsx scripts/reset-initial-catalog.ts`; sin cambiar semántica de comandos previos. |
| `docs/README.md` | Fuente nueva, comandos, semántica de precios/mínimos y runbook; integrar con cambios ya presentes. |

No cambiar `prisma/schema.prisma` ni crear migraciones si el alcance final sigue siendo snapshot de términos. Cualquier necesidad física nueva vuelve al refinamiento.

## Fases y tareas ordenadas

### 1. Cerrar el alcance y fijar la evidencia

1. Validar este plan final con el usuario. El alcance comercial ya está cerrado: 27 productos, términos finales y criterios como referencia; sin UI o recálculo.
2. Obtener el XLSX original con Drive, verificar metadata/hash frente al snapshot. Si cambió, presentar diferencias comerciales y detener la regeneración dependiente de cambios sin alinear.
3. Usar el archivo original como entrada local fuera del repo; no agregar binarios ni credenciales. La copia temporal usada en el grill no es un artefacto durable garantizado.

Aceptación: fuente exacta, separación de cajú y valores a importar identificados; sin cambios remotos.

### 2. Importador y catálogo

1. Implementar el perfil `coco-launch`, su evidencia interna tipada y selección CLI. Mantener el parser de la lista mayorista para su uso explícito y sus pruebas.
2. Validar encabezados, ARS, proveedor, unidades, categorías, cantidades positivas, ausencia de duplicados y coherencia de precios. Generar exactamente 27 keys/nombres únicos a partir de 26 filas. No ejecutar fórmulas del XLSX.
3. Extender el resolver para categorías directas; conservar las seis categorías existentes, aunque una quede vacía.
4. Regenerar `scripts/quintal-catalog.data.ts` con `pnpm catalog:quintal <xlsx> --format coco-launch`; volver a ejecutar con `--check`. Metadata de snapshot estable entre ambas invocaciones: fijar listDate/modifiedTime en configuración de importación, nunca `new Date()` en cada `--check`.
5. Actualizar pruebas contra la matriz de este plan. Verificar todos los precios finales, mínimos, packs y cinco presentaciones; no derivar el expected de la misma función que se prueba.

Aceptación: las dos variantes de cajú a $22.600/kg; Dátil Egipto conserva 0,5 aun a $9.750/kg; sal es una unidad cerrada; banana tiene mínimo de proveedor de 6,8 kg. Los términos de proveedor/clientes nunca se cruzan.

### 3. Preparar reemplazo atómico sin debilitar el seed

1. Extraer el core de `seed-init.ts` sin cambiar las decisiones de `planSeedInit`; mantener tests insert-only e idempotencia. El reset utiliza el mismo constructor de filas y términos.
2. Implementar inventario de **todos** los productos, términos y restricciones, incluidos inactivos/eliminados y otros proveedores. Imprimir target sanitizado (`hostname/database`, sin credenciales), APP_ENV, hash de catálogo, conteos y condiciones de bloqueo. El dry run no modifica datos.
3. `--apply` exige `--target <hostname/database>` coincidente con el destino inventariado. En APP_ENV production requiere además el flag existente `--confirm-production`. Estos controles también cubren una `.env` local que apunta a la base compartida. Argumentos desconocidos fallan antes de escribir.
4. Prevalidar catálogo, categorías activas/no eliminadas, proveedor Quintal único/activo/no eliminado, vigencia, y preservación. Si falta algo, abortar antes de borrar; no restaurar silenciosamente proveedores desactivados.
5. Mantener `AuditLog`, `DomainEventOutbox`, ledger de eventos del proveedor de pagos y todos los modelos de configuración/QA del inventario `KEPT_MODELS`. Rechazar aplicación si hay outbox pending/processing/failed; no borrar eventos para esconder el bloqueo. La resolución de eventos es trabajo operativo previo, fuera del reset.
6. Dentro de **una** transacción verificada, recargar inventario/guardas; guardar conteos y snapshots de configuración a preservar. Borrar la operatoria en `TRANSACTIONAL_DELETE_ORDER` de `purge-demo-data.plan.ts`, **exceptuando PaymentProviderEvent**. El borrado de UserTransaction debe dejar nula su relación en el ledger conservado.
7. Después borrar todas las `ProductLocalConstraints`, `ProductClientTerms`, `ProductSupplierTerms` y `Product`. Conservar proveedores, marcas y categorías. Capturar y remapear el destacado/ranking del home por coincidencia exacta de nombre con el nuevo catálogo; si no existe, limpiar la referencia, sin adivinar equivalencias. Conservar los demás campos de HomeOfferSettings.
8. Con el catálogo vacío, `planSeedInit(toSeedInitCatalog(catalog), state, now)` debe decidir crear los 27 productos y 54 términos. Cualquier `keep`, `skip` o discrepancia inesperada aborta. Aplicar con `applySeedInitPlan` en esa misma transacción.
9. Antes de commit, comprobar igualdad exacta de sets, atributos, términos, importes y cantidades; cero productos viejos, términos viejos o restricciones previas; cero operatoria. Comparar contenido de configuración/usuarios/QA que debe permanecer, no solo cantidades. Validar remapeo del home y nulificación exclusiva del vínculo ledger→intento.
10. El reset es destructivo también al repetirlo: siempre dry run primero. La **idempotencia** exigida corresponde al seed normal después de cargar; una segunda ejecución de `db:seed:init` no agrega ni modifica filas. No describir el reset como inocuo por ser repetible.

Aceptación: fallo en cualquier borrado, inserción o postcondición revierte el reemplazo completo en la base de prueba. No crear un intervalo comprometido con catálogo vacío mediante dos comandos/transacciones separados.

### 4. Verificación proporcional y revisión

1. Ejecutar pruebas focalizadas de parsers, datos, categorías, seed y planner; typecheck y Biome sobre archivos afectados.
2. Crear/proveer una base de integración **descartable y distinta** del target compartido, verificar su motor/versión y constraints. El harness exige target explícito de pruebas y rechaza coincidencia con la base compartida; no basta NODE_ENV=test. Cargar fixtures pequeñas con pedidos/carritos, dependencias de fulfillment, QA, configuración, ledger y ambos perfiles de productos.
3. Probar dry run sin escrituras, target erróneo, fuente/categoría/proveedor inválido, eventos pendientes, rollback después de borrar y después de cargar, preservación de datos ajenos, exactitud de 27/54 y seed posterior sin cambios. Conservar evidencia de restauración en entorno descartable.
4. Usar los cálculos comerciales existentes para comprobar 0,5 kg de almendra = $16.425, 1 kg de nuez mariposa = $18.000, 0,5 kg de Dátil Egipto = $4.875 y un bidón de 5 L = $137.400. Verificar selección por paso y precios al armar el pedido, sin transacciones reales de pago.
5. `pnpm typecheck`; `pnpm exec biome check <archivos afectados>`; `pnpm exec vitest run scripts/quintal-launch-catalog.parser.test.ts scripts/quintal-catalog.parser.test.ts scripts/quintal-catalog.data.test.ts scripts/quintal-catalog.categories.test.ts scripts/seed-init.plan.test.ts scripts/seed-init.test.ts scripts/reset-initial-catalog.plan.test.ts src/shared/common/commerce.helpers.test.ts src/server/services/_base/client-terms-prices.test.ts`. Ejecutar la prueba de integración únicamente con su destino aislado verificado.
6. Hacer `q-review-code` y `q-review-comments`; resolver hallazgos relevantes. Documentar errores preexistentes sin editar trabajo ajeno.

`db:seed-verify` y `fulfillment:e2e` esperan fixtures demo y cobertura de estados. No son el criterio de aceptación de una base intencionalmente vacía de operatoria; no correrlos contra la base compartida ni repoblarla para hacerlos pasar.

### 5. Rollout y recuperación de la base compartida

1. Actualizar runbook y preparar código/revisión antes de operar. La autorización del usuario identifica la base compartida y el alcance del borrado; no extenderla a otros destinos ni operaciones Git/publicación.
2. Durante implementación, identificar el target sanitizado real, versión PostgreSQL, constraints y volumen. Resolver con el responsable operativo cómo detener escrituras de app, administrativos, webhooks y dispatchers. Revisar intentos/eventos de pago activos en el inventario y su tratamiento antes de retirar las referencias; este reset no cancela pagos remotos.
3. Ejecutar dry run en ese target, contrastar su inventario con la política aprobada y obtener un respaldo restaurable identificado y un procedimiento ensayado. Si el destino/alcance no coincide, falta mantenimiento o no hay recuperación, detener antes de `--apply`; presentar ese bloqueo concreto.
4. Poner el servicio en mantenimiento, evitar jobs/eventos concurrentes y resolver outbox pendiente. Repetir inventario/guardas en la transacción. No confiar en que serializable por sí solo impida todas las escrituras externas.
5. Ejecutar `pnpm db:reset:catalog --apply --target <target verificado>` con el flag production cuando corresponda. No usar migrate reset, truncate cascade o reinicio de identidades como atajo.
6. Verificar persistencia de las 27 filas/54 términos y de la configuración conservada. Ejecutar `pnpm db:seed:init` y comprobar cero cambios. Hacer smoke de catálogo, filtros, fichas y cálculo de pedido; limpiar solo el carrito generado por ese smoke si lo hubo.
7. Reabrir servicio al cumplir los criterios. La base tendrá cero operatoria al terminar el reset, antes de las comprobaciones que generen nuevos pedidos/carritos.

Rollback previo a commit: transacción completa revertida, demostrado en integración. Después del commit, volver al código/lista anterior **no** recupera pedidos ni configuraciones de producto perdidas: se requiere restaurar el respaldo de la base, con mantenimiento y reconciliación de eventos/pagos externos recibidos desde el punto de recuperación. No prometer un DOWN reversible. Mantener el respaldo hasta aceptación operativa.

## Preocupaciones transversales y documentación

Preservar secretos y datos personales: los resúmenes solo muestran identidad sanitizada de base, nombres de productos y conteos. No imprimir DATABASE_URL, tokens, snapshots de usuarios o payloads de pagos. Tests no dependen de Drive en ejecución ni de credenciales compartidas.

El catálogo estático separa proveedor y cliente. Cantidades/precios se manejan con Decimal y strings canónicos; comparar dinero a centavos y cantidad a cuatro decimales. Mantener `fromDate/toDate` y banderas coherentes con términos utilizables.

Documentar el nuevo perfil de importación, hash/URL, fecha del snapshot y la excepción de cajú. Corregir la descripción de precios «sin margen, precio de lista, medio kilo para todos» que deja de ser cierta. No sobrescribir los cambios previos de `docs/README.md`. Registrar limitaciones del archivo fuente: pesos estimados, merma, despacho, coco sin variante confirmada y ausencia de descripciones.

No introducir una UI, componente reusable o contrato visual nuevo en este alcance; si se confirma desglose visible, cargar el design system exacto y ampliar este plan antes de implementación.

## Riesgos, preguntas y definición de terminado

Riesgos principales: pérdida histórica deliberada, pérdida de imágenes/ediciones manuales de productos al recrearlos, cachés de fórmulas no recalculadas, archivo remoto actualizado después del snapshot, escrituras/eventos concurrentes, referencias del home y diferencias entre schema y base viva. Las guardas, pruebas, inventario, mantenimiento y respaldo anteriores son las mitigaciones exigidas.

No quedan preguntas materiales de producto abiertas. La validación del usuario y los requisitos operativos se resolvieron durante la implementación; ver el cierre siguiente.

Terminado cuando la fuente coincide, el catálogo generado tiene exactamente los 27 productos de la matriz con 54 términos exactos, el seed habitual sigue siendo insert-only e idempotente, los ensayos de integridad/rollback/preservación pasan, las dos revisiones pasan, el runbook está actualizado y el reemplazo autorizado de la base compartida se verifica con respaldo disponible. El grill termina al entregar y validar el plan; no afirmar ese resultado operativo antes de implementarlo.

Instrucciones al ejecutor: usar este único plan; preservar cambios ajenos y sin staging/commit/push implícitos; no mutar la base hasta satisfacer los controles de fase 5. Ejecutar con `q-code-implement` después de validación. Actualizar el ticket/registro de ejecución que corresponda al comenzar, sin convertir este plan en una bitácora paralela ni tocar workflow state/artifact index desde modo standalone.

## Resultado de implementación — 2026-10-16

**Estado: implementado y aplicado en la base compartida.** La fuente mantiene el hash aprobado. El catálogo anterior de 88 productos y sus 176 términos fue reemplazado por 27 productos y 54 términos. No se crearon pedidos ni carritos durante el smoke. No se hicieron commits, staging, push ni publicación.

Cambios entregados: perfil `coco-launch` con metadata fija y referencia interna de criterios/costos; catálogo regenerado; categorías directas; core reutilizable de seed; CLI y planner de reemplazo con guardas de destino/backup/producción/eventos; transacción que bloquea tablas, elimina, recarga y verifica; fixtures independientes, pruebas y runbook. `db:seed:init` sigue siendo insert-only y `db:purge-demo` conserva su comportamiento.

| Criterio | Evidencia de aceptación |
| --- | --- |
| Fuente y catálogo | `catalog:quintal --format coco-launch --check` coincide; 26 filas fuente → 27 nombres/keys únicos. Cajú sin sal y salada tienen términos iguales. Matriz comercial completa comprobada por pruebas independientes. |
| Integridad y rollback | Cuatro pruebas en PostgreSQL local: dry run sin cambios y bloqueo de outbox; error de inserción después de borrar con rollback íntegro; bloqueo de escritor concurrente y fallo posterior a recarga; reemplazo exitoso preservando QA/home/ledger y seed posterior sin cambios. Fixture con toda la cadena de fulfillment y pagos. |
| Esquema y destino | Compartida: `ep-cold-paper-apysp10p-pooler.c-7.us-east-1.aws.neon.tech/neondb`, APP_ENV production, PostgreSQL 17.11. Diff vivo vs Prisma vacío. No DDL ni migración aplicada. |
| Mantenimiento | Los 18 modelos transaccionales estaban vacíos y había cero eventos de outbox/pagos sin resolver. Se pausó acceso a las 44 tablas mediante locks exclusivos dentro de la transacción. Esta decisión operativa es válida para ese estado vacío observado; en bases pobladas el runbook exige además detener admisiones/jobs con posibles efectos externos. |
| Preservación | Antes de commit se compararon huellas del contenido íntegro de usuarios, accesos, configuración, proveedores/marcas/categorías, auditoría, outbox y QA. Ledger conservado salvo vínculos a intentos eliminados; configuración home conservada salvo remapeo permitido por nombre. Todas las comprobaciones pasaron. |
| Verificación compartida | 27 productos, 27 términos proveedor y 27 cliente, cero restricciones anteriores y cero operatoria. El seed posterior devolvió cero productos/términos creados y 27 productos conservados. |
| Servicio público | `catalog.service.list()` devuelve 27 productos válidos. Fichas y cálculo con pasos correctos: almendra 0,5 kg = 16425, nuez mariposa 1 kg = 18000, Dátil Egipto 0,5 kg = 4875, aceite 5 L de a 1 = 137400 ARS. No se generaron cobros. |

**Respaldo y restauración.** Dump custom completo creado antes del reemplazo, restaurado sin errores en PostgreSQL local 18.6 y comparado con la compartida: conteos y huellas del contenido coinciden para las **44 tablas**. El comando completo de reset se ensayó también sobre esa copia restaurada con éxito, antes de aplicarlo en la compartida. Respaldo privado, con modo 600, conservado fuera de Git en `tmp/backups/quintal-20261016-before-reset/neondb.dump`; SHA-256 `b2c1a3312e796da975fbce471b058d063431bad280c678086b49898192a66d34`. `restore-verification.json` acompaña las huellas. El PostgreSQL de pruebas se detuvo al finalizar.

**Verificaciones de código.** Suite completa: 125 archivos pasaron, 1 suite de integración omitida por defecto; **1753 pruebas pasaron y 4 omitidas**. Esas cuatro se ejecutaron por separado en una base local nueva y pasaron. Typecheck y Biome sobre los 22 archivos de código/datos afectados pasaron; `git diff --check` pasó. Se usaron los binarios instalados y `node --import tsx` porque el sandbox bloqueó la caché de pnpm/IPC del CLI tsx. No se necesitó build o prueba en navegador para este cambio de datos/scripts; el smoke se ejecutó en el servicio público real.

**Mini review.** `q-review-code`: estándares **pass**, especificación **pass** después de corregir un P1 de identidad de destino. El driver admitía parámetros `host`/`port` que podían divergir del target mostrado; ahora se rechazan overrides, rutas sin DB, hosts de socket codificados y puertos heredados ambiguos, con seis regresiones sintéticas. `q-review-comments`: **pass**, 9 bloques conservados, sin remove/rewrite/add pendientes. Ambos resultados son distintos y sin bloqueos residuales.

**Ajustes de implementación dentro del alcance.** La orquestación reusable quedó en `scripts/lib/reset-initial-catalog.ts`, separada del planner y CLI; se agregaron fixtures fuente y expectativas comerciales independientes. Se añadió `--backup` obligatorio para aplicar. El lector XLSX ahora informa fórmulas sin caché para impedir una importación incompleta. Se actualizaron también los totales del test de backfill que dependía de los 88 productos. Los cambios previos del usuario en `docs/README.md` se conservaron.

**Riesgo residual.** La eliminación del catálogo anterior está confirmada; recuperar sus imágenes/ediciones o su estado requiere el respaldo. Las fórmulas de la fuente se consumen por sus valores cacheados, sin recalcularlas; no se verificaron comercialmente sus supuestos de merma, despacho o pesos. La integración aislada usó PostgreSQL 18.6 y la aplicación/validación final se completó en el PostgreSQL 17.11 real. El runtime imprimió advertencias preexistentes de pg sobre SSL/consultas concurrentes; no fallaron las comprobaciones. No hay preguntas ni bloqueos abiertos. Próxima acción: revisión del diff por el usuario; mantener el respaldo según su política de retención.
