# Historial de notificaciones, indicadores de envío y correos de Coco

| Campo | Valor |
|---|---|
| Artefacto | IP-COCO-ADMIN-NOTIF-20261127 · v0.2 · `implementation-plan` |
| Estado | Working · canónico para `planned-execution` de este requisito |
| Origen | REQ-COCO-ADMIN-NOTIF-20261127, identificador local de la solicitud del 27/11/2026 |
| Dependencia | IP-COCO-NOTIF-20261127, implementación local de los correos transaccionales sobre `70bf288` |

## Resultado y alcance

Un administrador que atiende una consulta puede abrir un pedido, comprobar qué avisos se enviaron y leer el mensaje que se preparó en ese momento. En Tracking puede identificar el correo asociado a un hecho concreto. El comprador recibe los mismos avisos de pago y logística con el nombre, los colores y el tono que reconoce de la tienda.

El alcance comprende los seis correos existentes, una sección administrativa de consulta y los indicadores en ambos visualizadores. Quedan para requisitos independientes el reenvío manual, la confirmación de entrega o lectura en la casilla, los canales adicionales y las campañas. El antecedente de QA #111 conserva su alcance propio. [Plan de correos transaccionales](notificaciones-transaccionales-resend.md) · [Seguimiento](../tracking-architecture.md)

## Alineación

| Punto | Criterio de trabajo | Fuente |
|---|---|---|
| Canal e identidad | Sección «Notificaciones», inicialmente correo. Marca Coco en todos los mails transaccionales actuales. | Solicitud |
| Audiencia | Chips para el equipo en el panel admin. | Alcance adoptado al solicitar la ejecución |
| Unidad del chip | Por pedido, «2 de 3 mails enviados». Por evento de tracking, el estado del aviso relacionado. | Alcance adoptado al solicitar la ejecución |
| Historial | Abrir en «Enviados». Permitir consultar los demás estados y abrir el contenido original cuando exista. | Alcance adoptado al solicitar la ejecución |
| Significado de enviado | Resend aceptó la solicitud y devolvió un identificador. La evidencia disponible llega hasta esa aceptación. | Despachador y glosario del proyecto |

Una sola marca verde por el último mail podría ocultar que las instrucciones de transferencia salieron y el aviso de retiro espera revisión. Esa alternativa queda fuera del diseño propuesto. También se descarta calcular el historial con el pedido actual porque el comprador puede haber cambiado de dirección o de mail. Se conserva el término «Correo de pedido» del glosario. La propuesta reutiliza el stack, los componentes y el modelo vigentes. [Glosario](../../src/features/admin/glossary/data/crosscutting.ts) · [Esquema](../../prisma/schema.prisma)

## Datos y reglas de lectura

La migración existente crea `CustomerEmailDelivery` con una fila por entorno y ocurrencia, enlazada a `orderId`. `notice` identifica el motivo. `request` guarda el destinatario efectivo, el asunto y las versiones HTML y texto que el despachador preparó. Antes del primer intento puede faltar. `attempts` cuenta intentos de la misma fila. El historial, los chips y los vínculos se leen de la misma partición, resuelta en servidor mediante `getEmailEnvironment()`. [Migración de base](../../prisma/migrations/20261127000000_customer_email_delivery/migration.sql) · [Configuración](../../src/server/services/notifications/email-config.ts) · [Despacho](../../src/server/services/notifications/customer-email-dispatcher.ts)

| Evidencia | Presentación |
|---|---|
| `accepted` | «Enviado». En detalle, «Aceptado por Resend» e ID del proveedor. En modo de prueba, identificar el envío de prueba y su destinatario real. |
| `pending` / `processing` | «Pendiente de envío» / «Envío en curso». |
| `skipped` / `review` | «Aviso omitido» / «Requiere revisión». Una respuesta incierta conserva ese carácter. |
| Pedido sin filas, o evento notificable sin vínculo verificable | «Sin registro de mail». También cubre pedidos históricos y datos incompletos. |
| Evento para el que Coco no genera correo | Omitir el chip en la cronología. |
| Modo `off` | Indicar «Correo desactivado» en la sección y los indicadores aplicables. Con `DISPATCH=false` y una partición configurada, el historial sigue disponible. |

El denominador del pedido cuenta las filas registradas de ese pedido en el entorno, incluidas las omitidas y en revisión. El numerador cuenta las aceptadas. Un pedido sin registros tiene su propia etiqueta. El chip enlaza al historial de todos sus estados. En QA, «2 de 3 mails de prueba enviados» evita atribuir una recepción al comprador.

## Ejecución en orden

### 1. Publicar las lecturas administrativas

- Crear `src/schemas/admin/notification.schemas.ts`, `src/server/services/admin/notification.data.ts` y `src/server/api/routers/admin/notification.router.ts`. Registrar `admin.notification` en `src/server/api/routers/admin.router.ts`. Exponer `list` y `getById` con `adminProcedure`, esquemas de entrada y salida y el mismo control de partición. Una consulta por ID fuera de la partición se resuelve como registro inexistente.
- En `list`, paginar en servidor y filtrar por estado y por ID o código público de pedido. Mostrar tipo de aviso, código, destinatario efectivo si ya está fijado, asunto si existe, estado y última actualización. Orden inicial por `updatedAt DESC, id DESC`. Distinguir esta fecha de la entrega al buzón. Proyectar las claves JSON necesarias en la consulta. Devolver una fila por aviso y el total con los mismos filtros. Evitar transportar cuerpos completos en el listado o en los chips.
- En `getById`, devolver los datos congelados, cantidad de intentos y, si corresponde, el código de revisión conocido. Con `request` nulo mostrar «Contenido aún no disponible». Conservar filas antiguas aunque la versión o el tipo de aviso no se reconozcan. Una lectura jamás prepara ni despacha un correo.
- Agregar al módulo de lectura una consulta agrupada por `orderId` y `status` para un conjunto de pedidos y una consulta por lote para los eventos visibles. Usar los índices actuales de entorno/estado y pedido como punto de partida. La primera versión requiere la migración ya existente y puede construirse sin migración adicional ni carga retroactiva.

### 2. Abrir el historial desde el menú

- Agregar «Notificaciones» al grupo Operación en `src/features/admin/shell/admin-nav.ts`. Crear `src/app/admin/(operation)/notifications/page.tsx` y su cliente `_components/notifications-client.tsx`. Reutilizar `CrudPageShell`, `CrudFilterPanel`, `CrudTable`, `CrudPaginationBar`, `CrudDetailDialogShell` y los estados de carga, error y vacío que usa Tracking.
- La entrada de menú abre «Enviados». El vínculo desde un pedido abre `/admin/notifications?orderId=<id>&status=all`. Cambiar filtro vuelve a la primera página. Distinguir «Todavía no hay mails enviados» de «Ningún mail coincide con los filtros». Al volver a consultar, mostrar transiciones del despachador aunque el admin no haya realizado una acción.
- El detalle muestra el texto histórico como texto escapado. Para ver el diseño, presentar el HTML congelado en un documento aislado con sandbox sin permisos, recursos externos bloqueados y navegación de enlaces desactivada. El contenido conserva sus estilos inline. La previsualización tendrá título accesible y alternativa en texto. Mantener fuera del cliente los metadatos de lease, las credenciales y el JSON completo de control.

### 3. Integrar los chips en pedidos y tracking

- En `src/features/admin/crud/operations-cart/operations-cart-detail-form.tsx` y `src/app/admin/(operation)/carts/[cartId]/_components/order-payment-panel.tsx`, ubicar el resumen junto al código de cada pedido. Para las dos pantallas, resolver los pedidos visibles en una sola consulta por conjunto, por ejemplo `admin.notification.summarizeOrders({ orderIds })` con IDs únicos y lotes acotados. Así se conserva el contrato de las mutaciones del carrito. Usar `StatusChip` y `status-presets.ts`, con etiqueta legible y enlace accesible al historial. Una falla de consulta debe ofrecer reintentar y mantener visible el pedido.
- Ampliar **solo los tipos administrativos** en `src/schemas/tracking.schemas.ts`. En `src/server/services/tracking/tracking-event.service.ts`, enriquecer `listAdminEvents`, `getAdminCartTimeline`, `getAdminCartItemTimeline` y `getAdminCartItemTimelineDetail` por lote. `cart-traceability.service.ts` ya distribuye la misma cronología entre carrito e ítems. Consumir la proyección en `src/features/admin/crud/tracking/tracking-table.tsx` y `tracking-timeline.parts.tsx`, compartido por la ficha y las cronologías.

| Evento en tracking | Asociación que debe poder probarse |
|---|---|
| `submittedToOrder` | Confirmación del pedido e intento acreditado, a partir de `metadata.refs.orderId` y `transactionId` y del aviso `confirmed`. Un correo puede corresponder a varios renglones. |
| `deliveryPreferenceChanged` | Pedido y ocurrencia exacta. El productor usa el mismo instante ISO en la clave de dominio registrada en `metadata.domainEventKey` y en `notice.capturedAt`. Cubrir dos cambios seguidos. |
| `arrivedAtPickupPoint` | `shipmentId`, pedido e ítem de las asignaciones del aviso `pickup`. Un envío compartido tiene un aviso por pedido. |
| `rolledOverPreAllocation` / `rolledOverPostAllocation` | Identificador concreto `rollOverId` en `notice.ids`, además del pedido y su ítem. La resolución posterior del rollover es otro evento. |
| Rechazo de pago e instrucciones de transferencia | Figuran en el pedido y su historial. Estos dos avisos carecen de evento propio en la cronología de ítems. |

Para avisos parciales, distinguir el grupo que originó el aviso de las cantidades que realmente figuraron en el mail. Aprovechar `request.quantityKey` cuando esté disponible. Si un ítem quedó fuera del mensaje o varias ocurrencias del mismo ítem impiden identificar cuál se incluyó, mostrar «Sin registro de mail» para ese evento y ofrecer el historial del pedido. Evitar asociaciones por cercanía horaria o por el último pedido de un carrito. Probar el mismo ítem reutilizado tras un pago rechazado. [Productores de avisos](../../src/server/services/notifications/customer-order-notices.ts) · [Mapeo de eventos](../../src/server/services/tracking/tracking-event-mapper.ts) · [Contenido logístico](../../src/server/services/notifications/logistics-content.ts)

### 4. Aplicar la identidad visual a los seis correos

En `src/server/services/notifications/customer-email.templates.ts`, separar la composición HTML que usa `buildEmailRequest` de la selección de contenido de pago y logística. Una columna de hasta 560 px, con «coco» tipográfico en tinta oscura o en claro sobre tinta, título con el número público de pedido, mensaje breve, cantidades o datos útiles y un botón principal. Usar el texto «Ver datos para transferir» en transferencia y «Ver mi pedido» en los demás. Ejemplo de retiro parcial, «Ya podés retirar parte de tu pedido ORD-…», seguido por el punto, horario y productos disponibles.

Tomar los colores de la tienda en sRGB para los estilos inline. La paleta clara actual da tinta `#0F2A30`, crema `#FBF1DF`, menta `#C9F0E6` y naranja `#F5833E` con texto oscuro `#341507` para el botón. Usar tipografía de sistema con fallback, encabezado semántico, espaciado cómodo, enlaces identificables y tablas de presentación si hacen falta. El mensaje debe funcionar con imágenes bloqueadas, a 320 px y en texto plano. La versión texto conserva productos, importes, cantidades, destino aplicable y URL. Escapar todo valor dinámico. Comprobar el mismo enlace autenticado y las reglas de supresión para cada tipo. [Marca de la tienda](../../src/components/app-navbar.tsx) · [Tokens](../../src/styles/globals.css) · [Plantilla actual](../../src/server/services/notifications/customer-email.templates.ts)

El despachador ya congela el cuerpo antes del intento y reutiliza esa versión bajo la misma clave. Los correos ya preparados pueden conservar el diseño anterior, tanto en reintentos como en el historial. El proyecto declara `design_system_ref: null` y `technical_foundation_ref: null`. Esta adaptación utiliza el lenguaje visual desplegado y la plantilla compartida existente. [Estado de proyecto](../development-workflow/00-workflow-state.yaml)

## Aceptación, despliegue y vuelta atrás

| Verificación | Resultado exigible |
|---|---|
| Historial y permisos | Acceso de admin y superadmin activos. Sesión ausente, usuario común, usuario inactivo e ID de otra partición carecen de acceso. Validar filtros, paginación estable, estado vacío, contenido congelado y reconsulta. Un cambio posterior de email del cliente deja visible el destinatario original. |
| Pedido y tracking | Con una transferencia aceptada y una confirmación pendiente, el pedido muestra «1 de 2 mails enviados». Un reintento conserva el total. Probar también dos pedidos en un carrito, dos clientes en un envío, retiro parcial, rollover agrupado, fila histórica sin vínculo y evento que nunca genera correo. Los chips coinciden en tabla, detalle y cronología. |
| Marca | Cubrir confirmación, rechazo, transferencia, retiro, cambio de entrega y reprogramación con datos ficticios. Revisar móvil y escritorio, alto contraste, textos largos, acentos, botón y alternativa de texto. Un reintento iniciado antes del cambio conserva el cuerpo anterior. |
| Regresión operativa | Ejecutar `pnpm typecheck`, `pnpm check` y las pruebas focalizadas con `pnpm exec vitest run`. Extender `customer-email.templates.test.ts`, `customer-email-dispatcher.integration.test.ts`, `cart-traceability.service.test.ts` y `admin-nav.test.ts` donde corresponda. Añadir pruebas focalizadas para lectura, aislamiento y correlación. Ejecutar la integración con `EMAIL_DISPATCH_TEST_DATABASE_URL` en una base local descartable. Verificar navegación por teclado y retorno de foco al cerrar el detalle. |

**Entrega.** Confirmar que la versión desplegada incluye la base transaccional y su migración, hoy presentes en el árbol de trabajo. En QA utilizar la partición y la casilla de prueba del proyecto. Comprobar un mail nuevo, un pedido mixto y un evento sin correo. Añadir al apartado «Customer order emails» del README el significado de «Enviado», el acceso desde pedido y el comportamiento al pausar el despacho. Conservar los resultados de ejecución en el ticket o registro de implementación.

**Reversión.** Revertir las lecturas, componentes y composición visual de esta entrega como cambio de aplicación. Conservar las filas y los cuerpos ya preparados para que el despachador continúe con su idempotencia. El rollback no requiere borrar datos ni reenviar mensajes.

## Resultado de implementación · 27/11/2026

El pedido de ejecutar este plan se tomó como validación de la propuesta de Alineación. La implementación está verificada en el árbol de trabajo. La publicación sigue pendiente.

| Entrega | Resultado comprobado |
|---|---|
| Historial | La sección abre en «Enviados». Los filtros por estado, ID y código público, la paginación, la fecha de actualización y el detalle de HTML y texto usan el registro de la partición activa. El panel diferencia una casilla de prueba y un contenido aún sin preparar. [Página](../../src/app/admin/%28operation%29/notifications/page.tsx) · [Lecturas](../../src/server/services/admin/notification.data.ts) |
| Indicadores | Los dos visualizadores muestran el código público, el recuento de envíos y el enlace al historial filtrado por ID de pedido. Tracking asocia el aviso a cada ocurrencia, distingue retiros parciales y conserva la cronología cuando el estado de mail no está disponible. El refresco de un mail pendiente conserva el acordeón y el foco. [Resumen de pedido](../../src/features/admin/notifications/order-notification-chip.tsx) · [Correlación](../../src/server/services/tracking/tracking-email.ts) |
| Correos | Los seis mensajes usan la marca «coco», los colores de la tienda y una acción principal. El envío conserva su versión de texto y el cuerpo congelado de intentos anteriores. [Plantilla](../../src/server/services/notifications/customer-email.templates.ts) |
| Operación | El README documenta el acceso, el significado de «Enviado» y cómo consultar el historial con el despacho pausado. La base utiliza la migración de correo previa. [Operación del correo](../../README.md#customer-order-emails) |

**Verificación.** Pasaron las 2.445 pruebas de Vitest en 179 archivos, incluidas las integraciones PostgreSQL 17 con bases locales descartables. Pasaron TypeScript, Biome, la prueba Playwright de previsualización aislada y el build de producción. En Chromium se revisaron los seis mails a 320 y 900 px. En el build definitivo se recorrieron con una sesión administrativa de prueba el modal de Carritos, el detalle del pedido con «1 de 2», su historial, HTML y texto originales, y el chip del mismo evento en la lista y la cronología. Se verificó redirección de visitantes y clientes, teclado y retorno de foco. Las pruebas usaron una respuesta simulada de Resend.

**Revisión de código.** La revisión contra el plan y la base local del correo en el árbol de `70bf288` detectó una falla de aislamiento de la consulta auxiliar de tracking, el desmontaje del diálogo durante el refresco y la ausencia del código público en el modal de Carritos. Se corrigieron los tres puntos. Las pruebas de regresión cubren fallos de configuración y lectura. La pasada final de estándares y especificación quedó conforme. Para la identidad se usaron los tokens de la tienda porque el repositorio carece de un sistema de diseño versionado.

**Revisión de comentarios.** Se conservaron las dos aclaraciones de implementación sobre el documento aislado para la vista previa y la precisión del total congelado para rollovers. Los condicionales de Outlook forman parte del HTML de presentación. Revisión concluida sin hallazgos pendientes.

**Publicación.** Desplegar junto a la base transaccional previa, con su migración aplicada, y verificar el primer correo en la casilla de QA. La recepción y presentación en Gmail y Outlook quedan para la prueba de entrega del entorno.
