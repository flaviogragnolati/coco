# Plan de cierre de validación de Mercado Pago

> **Artifact ID:** IP-MP-VALIDATION-20261113 · **Versión:** 0.2
> **Lifecycle:** Working · **Owner:** q-code-grill-feature · **Fecha:** 2026-11-13
> **Autoridad:** canonical para `planned-execution` del cierre de validación; no declara aceptación ni habilitación productiva.
> **Alineación:** Flavio confirmó cerrar sandbox primero y mantener `https://coco-kappa-ashy.vercel.app` como destino. Esta confirmación resuelve las preguntas de alcance y entorno; las pruebas y su aceptación siguen pendientes. Los despliegues conservan su autorización específica.

## Objetivo y resultado esperado

Retomar la integración existente y demostrar el recorrido cliente → preferencia Checkout Pro → pago de prueba → webhook firmado → consulta `Payment.get` → acreditación → pedido y tracking, conservando evidencia por caso. Identificar y corregir los defectos que impidan ese recorrido antes de declararlo validado.

El resultado visible es que un cliente puede pagar en el entorno acordado y consultar su pedido confirmado, mientras el administrador puede explicar el estado y su origen. Abrir una página de éxito, obtener una preferencia o pasar pruebas unitarias no alcanza para aceptar la integración.

## Fuentes y trazabilidad

- Solicitud de Flavio: «la implementacion de mercadopago quedo trunca, nunca la terminamos de validar, retomemos ese punto».
- Respuestas de Flavio al grill: «Cerrar sandbox primero (recomendado)» y «si» a mantener `https://coco-kappa-ashy.vercel.app`.
- `qa_ticket:#21,#22,#23,#24,#25,#26,#27,#36,#37,#38`; #16 y #110 como regresiones del checkout y del monto por medio.
- `docs/plans/qa-mercadopago-pending.md`, especialmente §17: evidencia histórica, no estado actual de la base.
- `docs/plans/mercadopago-checkout-pro-sandbox-enablement.md` y `docs/plans/mercadopago-checkout-admin.md`: implementación previa.
- `docs/plans/qa-open-tickets-2026-11-report.md` y `docs/plans/qa-open-tickets-2026-11-orchestration.md`: clasificación de re-test.
- ADR 0001 (Checkout Pro y reconciliación), ADR 0010 (pago externo), ADR 0013 (descuento por intento); `CONTEXT.md`.
- Código observado en HEAD `2b992f0`. Había cambios ajenos en el workspace; no forman parte del alcance.
- No se encontró una fundación técnica ni un design-system versionado aplicable entre los documentos inspeccionados. Se conserva el stack y la interfaz actual; un cambio visual o de stack exige revisar sus contratos antes de ampliarlo.

Referencias primarias consultadas el 13/11/2026:

- [Compra de prueba para Checkout Pro vía Preferences](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/integration-test/test-purchases): comprador de prueba, navegador incógnito y escenarios con tarjeta.
- [Tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test/cards): APRO aprobado, OTHE rechazado y CONT pendiente. No confundir la etiqueta del escenario con el `payment.status` efectivamente obtenido.
- [Buscar preferencias por referencia externa](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-pro-preferences/search-preferences/get): contrato de búsqueda consultado durante la implementación; los tipos y el cliente del SDK 3.1.0 instalado corroboran `external_reference`, `total` y `elements`.
- [Notificaciones de Preferences](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/payment-notifications): firma, consulta del recurso y precedencia de la URL incluida en la preferencia.

## Alcance, exclusiones y diferidos

**Alcance confirmado:** cierre en sandbox sobre `https://coco-kappa-ashy.vercel.app`. Verificar durante la ejecución qué base utiliza ese despliegue. Incluye revisar configuración vigente, cubrir los límites HTTP/SDK/persistencia, corregir los casos de QA que contradicen el comportamiento actual y ejecutar el re-test con evidencia. Un defecto reproducido se deriva a `q-code-debug` y su corrección se valida antes de reanudar el caso afectado.

**Fuera de alcance:** cobros reales, migrar a Orders o Bricks, cambiar reglas de descuentos, rediseñar el admin, agregar un worker de webhooks, reembolsos iniciados desde la app, y resetear catálogo o datos compartidos. El corte productivo queda diferido para una decisión posterior al cierre de sandbox.

**No romper:** precios calculados en servidor; monto MP sin descuento por transferencia; un pedido vivo por carrito; idempotencia por intento; retorno informativo; firma obligatoria; consulta al proveedor antes de acreditar; conservación de estados terminales; autorización admin/superadmin y propiedad del pedido; una sola submission y tracking por ítem; notas, asignaciones y evidencia previa de QA.

## Contexto observado

Inspecciones de solo lectura realizadas durante este grill:

| Área | Evidencia | Límite |
| --- | --- | --- |
| SDK/runtime | `mercadopago` instalado 3.1.0; Node 24.20.0 | No implica aceptación del proveedor |
| Config en base localmente configurada | `mercadopago` enabled, mode sandbox; todas las URLs en `https://coco-kappa-ashy.vercel.app`; unsigned false; binary false | No prueba qué secretos tiene el deployment ni la identidad del vendedor |
| Secretos locales | Access token, secreto y variables del comprador presentes; no se imprimieron valores | Presencia, no vigencia ni correspondencia |
| Historial MP en esa base | Cero intentos y cero eventos | Puede haber habido limpieza; no demuestra que nunca se haya probado |
| QA | #21–#26 y #36–#38 en retest; #27 en passed; ninguno de estos tiene adjuntos | Las notas no se inspeccionaron: puede haber evidencia textual histórica |
| Rutas públicas | success/failure/pending: GET 200; webhook: GET 405 | No valida contenido completo, POST, firma, SDK ni transacción |
| Verificación local | 10 archivos / 188 pruebas focalizadas pasan; typecheck pasa | No hubo compra, POST al webhook ni cambio de estado de QA |

`confirmAndPay` crea la orden y el intento antes de llamar al proveedor. `createMercadoPagoPreference` conserva la igualdad de monto y moneda y utiliza referencia e idempotencia por intento. `buildPaymentResult` elige la URL según el modo. El webhook registra eventos y consulta `Payment.get`; la reconciliación actualiza intento, pedido y submission en una transacción, y despierta el dispatcher después del commit.

La cobertura actual de MP está en builders y decisiones puras. No hay un test específico de `route.POST` ni de `reconcileMercadoPagoPayment` con sus límites integrados. Los tests de cambio de medio simulan la creación de la preferencia; no prueban un fallo de esa llamada.

## Hallazgos a resolver

1. **Drift confirmado de #27:** `scripts/qa-tickets.data.ts` espera una orden nueva al reintentar y lo llama un edge pendiente de producto. El código reutiliza la orden viva y el intento vigente. Su passed histórico no valida la regla actual.
2. **Recuperación sin preferencia, hipótesis por lectura:** `createPendingTransaction` no fija vencimiento; si falla `Preference.create` o la persistencia de su respuesta, `getExistingPaymentResult` o el reuso del intento pueden devolver pending sin redirect ni un mecanismo de recuperación. Reproducir antes de escoger la corrección.
3. **CONT y clasificación de errores:** #24 presupone `inProcess`, pero el mapper diferencia `pending` de `in_process`. #23 atribuye la ausencia del evento o una firma rechazada directamente a configuración. Alinear el texto con el recurso observado y diagnosticar antes de clasificar bloqueado/fallido.
4. **No hay evidencia vigente del recorrido completo:** las lecturas, rutas y tests locales no permiten marcar #23, #24 o #26 como aprobados.

## Enfoque y supuestos

Con alcance y destino confirmados, verificar sus precondiciones, reproducir los riesgos y completar pruebas de contratos; finalmente probar el recorrido sandbox y registrar el resultado. Conservar las decisiones existentes de Checkout Pro vía Preferences y `Payment.get`.

- Sandbox es el alcance elegido por Flavio; los cobros reales quedan diferidos.
- La URL de validación confirmada es `https://coco-kappa-ashy.vercel.app`.
- La base de `.env` no se presume idéntica a la del deployment: verificar esa correspondencia con un intento identificado durante la prueba.
- El comprador de Mercado Pago es distinto de la sesión cliente de CoCo. Flavio o el tester controla los logins y códigos de acceso necesarios; los valores permanecen fuera del plan y los tickets.
- No se prevé DDL, migración ni backfill. Si un defecto exige cambio físico, detener esa ampliación y pasar por `q-tool-database-schema` con el perfil confirmado.

## Mapa de archivos

| Archivo / símbolo | Trabajo previsto |
| --- | --- |
| `src/server/services/checkout/checkout.service.ts`: `confirmAndPay`, `getExistingPaymentResult`, `buildPaymentResult` | Caracterizar reintento, fallo del proveedor y selección de URL; corregir solo si la reproducción lo requiere |
| `src/server/services/checkout/checkout.data.ts`: `createPendingTransaction`, `updateTransactionWithMercadoPagoPreference`, `findLiveOrderByCartId` | Verificar persistencia y recuperación con el mismo pedido; cambios condicionados al diagnóstico |
| `src/server/services/checkout/checkout.payment-switch.test.ts` | Regresión MP/externo, montos, reuso y fallo de creación de preferencia |
| `src/server/services/payments/mercadopago/mercadopago-preference.service.ts` y `.decision.ts` | Verificar payload y respuesta del SDK; conservar referencia, monto y datos de retorno |
| `src/app/api/mercadopago/webhook/route.ts` y nuevo `route.test.ts` | Pruebas HTTP de firma, registro, consulta y respuesta de error |
| `src/server/services/payments/mercadopago/mercadopago-reconciliation.service.ts` y nuevo `.service.test.ts` | Pruebas de consulta al proveedor, transacción, monto, replay y errores |
| `src/server/services/payments/payment.data.ts`: `createPaymentProviderEvent` | Ejercitar deduplicación por evento y vínculo al intento; modificar solo con defecto demostrado |
| `src/server/services/payments/order-submission.service.ts` y su test | Verificar efectos únicos al acreditar y protección frente a regresiones |
| `src/server/api/routers/admin/payment.router.ts`; `src/server/services/admin/payment.service.ts` | Confirmar permisos y herramientas manuales existentes |
| `scripts/qa-tickets.data.ts`; `docs/qa/qa-ciclo-de-vida.md` | Corregir #27 y las ambigüedades verificadas de #23/#24; rutas solo si cambia el destino |
| `scripts/qa-tickets.data.test.ts` | Asegurar que #27 describe reuso del pedido y los escenarios distinguen estados reales |
| `README.md` | Incorporar al final la secuencia operativa que efectivamente se haya validado |
| Tickets QA existentes | Registro de ejecución y evidencia; no agregar un diario al plan |

## Fases y tareas ordenadas

### 1. Fijar el destino de validación

1. Utilizar las dos decisiones confirmadas: solo sandbox y `https://coco-kappa-ashy.vercel.app`. No volver a preguntar alcance o URL salvo que aparezca evidencia incompatible o una instrucción nueva.
2. Comparar `/admin/payments` → Config con los cinco callbacks del destino elegido: base, webhook y tres retornos. Confirmar modo sandbox, binary false y unsigned false. Verificar diagnósticos de secretos del deployment, cuenta vendedora de prueba y aplicación del panel. No deducir modo real únicamente del prefijo del token.
3. Acordar cuentas cliente/admin/superadmin y comprador de prueba disponibles; elegir productos activos del catálogo vigente y registrar cantidades y total que se usarán. No ejecutar seeds demo.
4. Vincular la versión del deployment y su base con la prueba. Si falta desplegar código, preparar el cambio y obtener autorización del destino concreto antes de publicarlo.

**Aceptación:** entorno identificado, configuración contrastada y cuentas disponibles; cualquier falta queda como bloqueo preciso del caso dependiente.

### 2. Cubrir contratos y reproducir recuperación

1. En `checkout.payment-switch.test.ts`, provocar un rechazo de `createMercadoPagoPreference` después de crear el intento; repetir con la misma idempotencyKey y luego con otra para el mismo pedido. Comprobar si vuelve una URL utilizable o queda pending sin preferencia. Simular también una respuesta aceptada por MP seguida de fallo al guardarla. No llamar al proveedor real desde los tests.
2. Si se reproduce el atasco, abrir el diagnóstico acotado con `q-code-debug`. Su contrato de aceptación es: recuperar una forma de pagar, conservar monto y pedido, no duplicar cobros y no declarar fallida una operación cuyo resultado externo aún sea incierto. La política de recuperación y sus archivos exactos se cierran con esa evidencia antes de implementarla; este borrador no prescribe un algoritmo de retry sin diagnóstico.
3. Crear `route.test.ts` invocando el `POST` real con `NextRequest` y fixtures. Simular base y API externas, y usar firmas HMAC de prueba compatibles con el SDK cuando se pruebe la firma. Verificar: firma inválida/ausente → 401, evento rejected y ninguna consulta al pago; firma válida payment → registro y reconciliación; error de reconciliación → 500 y posibilidad de reentrega; tipo ajeno → ninguna acreditación.
4. Crear `mercadopago-reconciliation.service.test.ts` con `Payment.get` simulado y límites de transacción observables. Cubrir approved coincidente, rejected, pending/in_process, monto o moneda distintos, pago sin intento, error de API, re-fetch válido después de discrepancia, replay secuencial y no degradación de un estado terminal. Comprobar que la submission depende del resultado consultado, no del body del webhook.
5. Verificar que los tests existentes de descuento y cambio de medio preservan el total MP sin descuento de transferencia y el bloqueo de intentos no cancelables. Un replay con mocks secuenciales no prueba concurrencia: para afirmar seguridad concurrente, añadir una prueba de persistencia en una base aislada o registrar que sigue sin verificarse. No utilizar la base compartida para inyectar estados monetarios ficticios.

**Aceptación:** contratos comprobados y ningún defecto abierto que impida pagar o que pueda acreditar un monto incorrecto o duplicar submission. Los cambios funcionales los toma el diagnóstico acotado; si cambia comportamiento de producto, volver al grill antes de ampliar alcance.

### 3. Alinear los casos de QA

1. Reescribir #27: comprador abandona una preferencia válida sin pagar; vuelve a confirmar antes de su vencimiento; se conserva la misma orden y el intento vigente. Añadir variante de intento vencido/fallido: nuevo intento sobre la misma orden. Si cambia de medio, aplicar ADR 0013 y verificar el monto correspondiente.
2. En #24 registrar el `payment.status` real y su mapeo: rejected → failed; pending → pending; in_process → inProcess. Ningún caso acredita el pedido. No exigir inProcess solo porque se utilizó CONT.
3. En #23 sustituir la atribución automática a configuración por una pauta: contrastar entrega del proveedor, firma, logs y recurso consultado; distinguir bloqueo de precondiciones de un defecto de implementación.
4. Reflejar las definiciones en la tabla QA y sus comprobaciones de texto, conservando códigos y la cadena de regresión. Revisar las notas anteriores de los tickets antes de aplicar cambios, sin copiarlas ni reemplazarlas.
5. Publicar solo las definiciones afectadas mediante el admin o el servicio auditado de QA. `qa:seed` actualiza todos los casos: no ejecutarlo para este cierre sin revisar ese efecto. Llevar #27 a retest con nota de cambio de definición, conservando historial. Los demás ya están en retest: no reiniciarlos indiscriminadamente.

**Aceptación:** pasos ejecutables contra el destino elegido; estado histórico distinguible de resultado actual.

### 4. Ejecutar sandbox y registrar evidencia

Orden con dependencias:

| Secuencia | Casos | Prueba y evidencia necesaria |
| --- | --- | --- |
| A | #22, #38 | Retornos informativos; admin sin superadmin no cambia config; superadmin con confirmación sí, restaurando el valor original |
| B | #21 y #27 | Preferencia real sin pagar; id de orden/intento/preferencia y monto; abandono y reuso sin otra orden |
| C | #23 | Pagar con APRO y comprador de prueba; consultar Payment.get; evento firmado vinculado y processed; intento completed, carrito submitted, orden processing y un hecho de confirmación por ítem |
| D | #26, #36 | Reprocesar dos veces el evento de C y reconciliar el intento; estado estable y conteos de submission/tracking sin duplicación; intento de B sin payment id mantiene la explicación del botón deshabilitado |
| E | #24 | Pedidos separados para OTHE y CONT; registrar estado real del recurso y el mapeo; no acreditar ni generar tracking de compra confirmada |
| F | #25, #37 | POST deliberadamente mal firmado → 401 y rejected sin efecto de pago; reprocesar el evento válido de C; ignorar el inválido con motivo suficiente |
| G | #16, #110 | Comprobar total sin descuento en MP y total descontado en transferencia, cambio de medio permitido y bloqueo si ya está en proceso o con comprobante declarado |

Para cada ejecución registrar versión desplegada, fecha/hora, caso, orden/intento/evento, monto/moneda, estado consultado y observado, y evidencia redactada. Los identificadores operativos se guardan en el ticket, sin credenciales ni snapshots completos con datos personales. Esperar la proyección asíncrona y contrastar el outbox si el tracking demora; fijar y registrar el plazo de observación de la sesión antes de declarar timeout.

Si no llega un webhook, revisar entrega/HTTP del panel, URL de la preferencia, firma y error del servidor. No sintetizar un aprobado en la base ni usar el retorno como sustituto. El simulador comprueba recepción; una llamada con recurso inexistente no demuestra acreditación.

### 5. Cerrar o conservar pendientes explícitos

Actualizar cada ticket con passed/failed/blocked según su evidencia. Los casos no ejecutados permanecen en retest. Documentar en README el procedimiento probado y el diagnóstico de fallas. El registro de ejecución pertenece a los tickets; mantener este plan como definición de trabajo.

La salida real requiere un trabajo posterior al cierre de sandbox si Flavio lo solicita. Preparar allí cuenta, credenciales, ambiente, revisión de modo/live_mode y aprobación del deployment concreto; mantener el proveedor en sandbox durante este cierre.

## Verificación técnica

Comandos existentes, ejecutar desde el repositorio al implementar:

```bash
pnpm exec vitest run src/server/services/payments src/server/services/checkout src/app/api/mercadopago src/app/admin/payments/_components/payment.mappers.test.ts src/env.helpers.test.ts scripts/qa-tickets.data.test.ts
pnpm typecheck
pnpm exec biome check <archivos-de-código-modificados>
git diff --check
```

Ejecutar `pnpm test` tras cambios de producción en checkout/reconciliación por sus efectos compartidos. Ejecutar build si hay cambios de código que se vayan a desplegar. Las pruebas que usan mocks no sustituyen la compra sandbox ni una prueba de concurrencia con persistencia real. Si el wrapper pnpm no funciona en el sandbox, usar el binario instalado de Vitest y `tsgo` como en esta inspección, sin reinstalar dependencias.

## Rollout, rollback y aspectos transversales

- **Datos:** usar transacciones de prueba identificadas, conservar intentos y eventos como evidencia. No borrar historial para repetir casos.
- **Seguridad:** secretos solo en servidor; firma obligatoria; comprobar autorización y propiedad; logs sin tokens, passwords ni datos de tarjetas. No relajar validación para hacer pasar un test.
- **Observabilidad:** correlacionar intento, pago, evento y request id en las herramientas actuales; usar logs para aislar la frontera que falla.
- **Rollout:** si hay correcciones, primero gates locales, después despliegue al destino autorizado y luego retest de los casos dependientes. No anunciar comportamiento que no esté desplegado.
- **Rollback:** revertir únicamente la corrección identificada mediante el procedimiento Git autorizado; restaurar los valores de configuración cambiados en la prueba. Deshabilitar nuevas compras si fuera necesario no detiene el procesamiento de pagos ya emitidos: el webhook actual no se bloquea por `enabled` y debe seguir disponible para reconciliar cobros en vuelo.
- **Migraciones:** ninguna prevista. No ejecutar `db:push`, seeds demo, purge ni resets para validar pagos.
- **Documentación histórica:** proponer reconciliación de los planes anteriores a su propietario; no reescribirlos como si sus pendientes fueran actuales.

## Riesgos y preguntas abiertas

| Riesgo o pregunta | Tratamiento |
| --- | --- |
| Alcance | Resuelto por Flavio: cerrar sandbox primero; cobros reales diferidos |
| Destino | Resuelto por Flavio: `https://coco-kappa-ashy.vercel.app`; falta contrastar base y versión del deployment |
| Preferencia falla después de persistir pending | Reproducción en fase 2 y diagnóstico obligatorio si se confirma; bloquea cierre de recuperación |
| Código local distinto del desplegado | Registrar ambas versiones y probar la versión que se va a aceptar |
| Aprobación tardía de una preferencia tras cambiar de medio o pagar otro intento | Evaluar con pruebas aisladas del contrato de submission; no asumir que cancelar localmente cancela MP. Si implica compensación/doble pago, volver al grill con la regla de negocio concreta |
| Eventos concurrentes y redelivery | Diferenciar replay secuencial de concurrencia; no declarar concurrencia verificada sin evidencia de persistencia |
| Comprador/códigos o secretos del deployment no disponibles | Bloquear solo los casos dependientes; continuar cobertura local y lectura de configuración |

## Registro de alineación

**Resuelto por evidencia y decisiones previas:** Checkout Pro vía Preferences; UserTransaction como intento; firma más Payment.get; retorno informativo; descuento de transferencia separado; un pedido vivo por carrito; estados QA actuales distintos del plan histórico.

**Confirmado por Flavio:** cerrar sandbox primero en `https://coco-kappa-ashy.vercel.app`. Su respuesta valida las dos decisiones de alcance y entorno planteadas en el grill; no constituye evidencia de que los pagos funcionen ni habilita cobros reales.

**Secuencia del plan:** incorporar #27 al re-test por cambio de definición; reproducir el riesgo de preferencia sin URL; corregir únicamente defectos reproducidos que impidan la aceptación y completar los casos sandbox. No quedan preguntas de alcance abiertas. El algoritmo de recuperación se define mediante el diagnóstico de fase 2 si el fallo se confirma.

**Opciones descartadas por contradicción con contratos vigentes:** retorno como verdad de pago; mocks como evidencia de compra real; rehacer el gateway; crear otra orden en cada abandono; marcar passed por presencia de configuración; correr un reset de datos para volver a probar.

**Terminología:** sin cambios durables; no se requiere ADR nuevo para este alcance. Una nueva política de compensación o salida productiva se alinea aparte si aparece.

## Definición de hecho e instrucciones para ejecución

- [x] Flavio confirma el alcance sandbox y el destino del plan.
- [ ] Configuración y credenciales del deployment contrastadas con la aplicación y vendedor de prueba.
- [x] Riesgo de intento sin preferencia reproducido y corregido localmente con pruebas; validación desplegada pendiente.
- [x] Pruebas locales de HTTP/reconciliación y regresiones de montos pasan; concurrencia con persistencia real sigue sin verificar.
- [x] #27 refleja el reuso actual; #23/#24 tienen expectativas y diagnóstico correctos, publicados mediante servicio auditado.
- [ ] Casos #21–#27 y #36–#38 ejecutados sobre la versión elegida con evidencia, más regresiones #16/#110; ningún bloqueo o fallo necesario para aceptación sigue abierto.
- [ ] Sin dobles submissions, monto incorrecto, aprobación por redirect ni procesamiento de una firma inválida.
- [x] Tickets con resultados honestos y guía operativa actualizada; los casos dependientes del comprador/proveedor real siguen pendientes.

Ejecutar en orden, comenzando por las precondiciones del entorno confirmado. Usar `q-code-implement` para el trabajo asentado y `q-code-debug` para un fallo reproducido cuya corrección aún no esté decidida. No ampliar arquitectura ni esquema sin alinear el cambio. No modificar workflow-state ni artifact-index desde esta ejecución standalone; el sidecar queda para reconciliación del orquestador. Preservar todos los cambios ajenos del workspace y no hacer operaciones Git o despliegues sin la autorización correspondiente.

## Estado de ejecución — 13/11/2026

**Estado: implementación y admin verificados; despliegue ejecutado; aceptación sandbox pendiente.** Base de comparación: `6e151350a04f95c6d9711f1bad7f83294679e67d`. La corrección se desplegó por CLI en el proyecto existente. La versión final `2026.11.mp-validation2` y sus huellas exactas están en `docs/development-workflow/release/MP-VALIDATION-20261113/07-release-candidate.yaml`. Después del despliegue, Flavio autorizó commit y push a main: completados en `247e38dcc2232d300cfd8e7de2de68d1df867cad`. Los resultados operativos y sus identificadores están en los tickets originales; este apartado registra el estado agregado de implementación.

**Decisión de Flavio durante la ejecución:** autorizó recuperar una preferencia existente y, si la búsqueda no la encuentra, conservar el intento pendiente hasta su vencimiento original antes de permitir otro intento sobre la misma orden; aceptó la espera de hasta 60 minutos configurados. No se presupone que una búsqueda vacía pruebe el fracaso de la creación ni se depende de una garantía no verificada de idempotencia del endpoint de preferencias.

**Cambio:** ambos fallos reproducidos — creación rechazada/incierta y respuesta aceptada que no pudo persistirse — devolvían pending sin URL con la misma clave y con otra. Se guarda ahora el vencimiento antes de llamar al SDK; la recuperación consulta la preferencia conocida o busca por referencia y obtiene su detalle. Verifica unicidad, referencia, monto, moneda, URLs y vencimiento sin extender el plazo original. No crea otra preferencia durante esa recuperación ni declara fallida una operación incierta. La persistencia recuperada solo modifica intentos pending sin payment id, y conserva el request original. Una clave vencida pide recargar checkout; una nueva confirmación crea otro intento sobre la misma orden.

**Cobertura de aceptación local:** pruebas del POST real con HMAC del SDK, errores/redelivery, deduplicación del evento, consulta Payment.get, estados y discrepancias monetarias, re-fetch, replay secuencial, rollback de submission, no degradación terminal y aprobación tardía secuencial sin otro hecho de confirmación. Los límites de persistencia se simulan; no prueban concurrencia ni cobros reales del proveedor.

**Evidencia técnica:** La cobertura focalizada original de 284 pruebas se amplió con una regresión de indicadores; suite completa final: 2.260 pasan, 6 omitidas existentes (164 archivos: 163 pasan, 1 omitido). TypeScript (`tsgo --noEmit`), Biome sobre los 14 archivos de código afectados, `git diff --check`, generación Prisma y build de Next.js pasan. El wrapper `pnpm test` no produjo salida y se interrumpió; se usaron los binarios instalados sin reinstalar dependencias. El primer build falló al descargar Google Fonts bajo red restringida; el build final con acceso de red pasó, sin cambiar fuentes ni configuración.

**Entorno y QA:** configuración de base contrastada: sandbox, callbacks del destino, binary y unsigned apagados. Un POST inválido observado en el deployment produjo el evento rejected en esa base y confirmó su correspondencia. Las tres páginas públicas devolvieron 200 con título y aviso esperado; el POST inválido devolvió 401 sin crear intentos. La versión exacta se identificó por deployment y huella de código. #22 se completó por navegador sobre el destino; #25 conserva evidencia HTTP/datos y requiere inspección autenticada del evento. #23/#24/#27 se alinearon por servicio auditado; solo #27 cambió de passed a retest. Historial, asignaciones y evidencia anterior se conservaron. Flavio Gragnolati existe como superadmin activo; no se creó ni modificó ninguna cuenta.

**Mini revisión:** q-review-code completado por revisor independiente contra el SHA base: eje de estándares aprobado sin hallazgos accionables; eje de especificación aprobado para el cambio implementado, con aceptación integral pendiente. q-review-comments aprobado por el implementador: 1 comentario agregado, keep; ninguno reescrito ni eliminado. Brechas declaradas: recuperación SDK aún simulada, concurrencia sin base aislada y recorrido sandbox/admin pendiente. No se encontró una fundación técnica versionada: revisión sobre contratos existentes, ADRs y SDK instalado.

**Desviaciones y bloqueos:** no hubo compra de prueba, revisión autenticada del admin desplegado, APRO/OTHE/CONT ni replays operativos. Flavio autorizó el despliegue; se verificaron versión por deployment/huella, proyecto y presencia por nombre de secretos en Vercel. Faltan vigencia y correspondencia de esas credenciales con aplicación/vendedor de prueba, y sesiones cliente/admin/comprador para completar los casos dependientes. Los permisos admin/superadmin y las acciones de pago externo se probaron por navegador en una base aislada, sin presentarlos como aceptación del entorno compartido. Los casos no ejecutados siguen en retest; no se declara validada la integración. El README corrige el destino y documenta el procedimiento local y los límites comprobados.

**Riesgo residual:** intentos legados sin vencimiento guardado y sin preferencia recuperable requieren investigación administrativa; no se inventa un plazo ni se hace backfill. Concurrencia de eventos y compensación por dos pagos externos permanecen sin validar y no se presentan como resueltas por mocks. No hubo migraciones, seeds, resets ni cambios de modo sobre el entorno compartido. Estado global e índice de artefactos sin modificar.

**Archivos cambiados:**

- Producción: `src/server/services/checkout/checkout.service.ts`, `src/server/services/checkout/checkout.data.ts`, `src/server/services/payments/mercadopago/mercadopago-preference.service.ts`, `src/server/services/payments/payment.data.ts`, `src/app/admin/payments/_components/payments-admin-client.tsx`.
- Pruebas: `src/server/services/checkout/checkout.payment-switch.test.ts`, `src/server/services/checkout/checkout.preference-persistence.test.ts`, `src/app/api/mercadopago/webhook/route.test.ts`, `src/server/services/payments/mercadopago/mercadopago-preference.service.test.ts`, `src/server/services/payments/mercadopago/mercadopago-reconciliation.service.test.ts`, `src/server/services/payments/payment.data.test.ts`, `src/server/services/payments/order-submission.service.test.ts`, `scripts/qa-tickets.data.test.ts`.
- QA y guía: `scripts/qa-tickets.data.ts`, `docs/qa/qa-ciclo-de-vida.md`, `README.md`.
- Registro: este plan y `mercadopago-validation-resumption.md.stage-result.yaml`.

**Siguiente acción:** completar la secuencia sandbox y el retest autenticado sobre `https://coco-kappa-ashy.vercel.app`, con sesiones controladas por Flavio/tester. El despliegue ya está autorizado y ejecutado; no volver a pedir esa autorización para este resultado. El resultado standalone adjunto queda pendiente de reconciliación por el orquestador.


### Verificación administrativa solicitada durante el despliegue

Flavio pidió verificar pagos, transferencias y operaciones para cerrar el feature. Se ejecutaron 11 comprobaciones por Chromium contra la app y PostgreSQL locales, en una base nueva con datos ficticios. Pasan declaración de comprobante sin acreditar, cobro único y submission, rechazo sin demanda, bloqueo de reconciliación MP sin payment id, ignorado con motivo, permisos admin/superadmin, confirmación y configuración de ambos medios. Operaciones incorpora solo la demanda pagada; se comprobaron rollover bajo MOQ y, en otro pedido, un lote, una orden de proveedor y asignación de 50 unidades con un único hecho de submission. Resultados y capturas: `docs/development-workflow/release/MP-VALIDATION-20261113/07-admin-validation.json` y `screenshots/`.

Se reprodujeron y corrigieron dos defectos: los indicadores globales excluían transferencias aunque el listado las incluía; y la confirmación vacía exponía un error técnico. El contador ahora incluye todos los proveedores y el guard de confirmación muestra el mensaje vigente, conservando la validación y autorización del servidor. La regresión de datos falló antes de corregir el contador y pasó después. La revisión independiente incremental aprobó estándares y especificación; comentarios: aprobado sin comentarios agregados o afectados en este incremento.

El harness de fulfillment anterior pasó 12/13 pasos: su ventana de borrador de junio no coincide con los fixtures vigentes de julio. Ese fallo del harness no se declara aprobado ni se corrigió dentro de este alcance; las pruebas administrativas ejecutaron directamente la creación/revisión/ejecución con pagos locales actuales. No se inyectaron estados monetarios ficticios en la base compartida. Ninguna prueba local sustituye la compra sandbox, el webhook firmado real ni aceptación humana.

### Tickets para ejecución manual por UI — 13/11/2026

Flavio pidió que QA levante el recorrido desde tickets con pasos por pantalla, sin pruebas de backend ni revisión de logs. Se publicaron mediante el servicio auditado en [Tickets QA](https://coco-kappa-ashy.vercel.app/admin/qa-tickets):

- **#125 — Guía QA UI — Mercado Pago sandbox y admin de pagos:** punto de entrada con entorno, cuentas entregadas por privado, datos públicos de tarjeta de prueba, precondiciones, secuencia de casos y evidencia visible requerida.
- **#124 — QA UI — transferencia cobrada/rechazada y demanda en Operaciones:** declaración de comprobante, cobro/rechazo, rastreo, revisión y ejecución de demanda de prueba, lotes, órdenes de proveedor, tracking o rollover. Requiere un escenario aislado o pedidos y acciones de prueba previamente autorizados por el responsable; QA recibe ese escenario preparado.
- **12 casos actualizados:** #21–#27, #35–#38 y #110. Se conservaron estados, asignaciones, notas históricas y evidencias. Los dos tickets nuevos quedaron pendientes y sin asignar. La lectura posterior confirmó las 14 definiciones publicadas; esta actualización no equivale a una nueva ejecución ni marca casos aprobados.

Las instrucciones actuales solo requieren Cliente, Checkout Pro y pantallas de Admin. #25 inspecciona un evento rechazado ya disponible y no pretende verificar criptografía desde la UI. #110 conserva la variante de descuento del 10%, pero queda bloqueada si el responsable no preparó ese porcentaje: el entorno compartido lo tenía sin configurar. Las notas anteriores se mantienen como historia; la nueva definición identifica las instrucciones vigentes.

Se alinearon las 11 definiciones sembradas correspondientes en `scripts/qa-tickets.data.ts` y su tabla en `docs/qa/qa-ciclo-de-vida.md`; #110 y los dos tickets nuevos son registros manuales. No se ejecutó el seed general. Verificación proporcional: 125 pruebas de definiciones pasan, Biome y `git diff --check` pasan. Mini revisión independiente de estándares/especificación aprobada con hallazgos menores corregidos: plazo observable desde apertura de Checkout Pro, intento adicional sin pagar para #36, precondición externa para #35 y pantalla de carrito para #23. Revisión de comentarios aprobada sin comentarios agregados o afectados.

La publicación modifica contenido del tablero; no requiere otro despliegue de la aplicación. Los cambios locales de definiciones y documentación de esta actualización quedan sin commit. Siguiente acción de QA: comenzar por #125, registrar capturas y resultados en cada caso y declarar la precondición concreta cuando un caso quede bloqueado. La aceptación integral sandbox continúa pendiente.
