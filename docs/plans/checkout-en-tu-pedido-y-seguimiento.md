# Plan: checkout dentro de «Tu pedido» y seguimiento en «Mis pedidos»

> **Estado:** `Implemented` el 27/11/2026 en la rama `checkout-en-tu-pedido`, sin push (ver §18). Quedan las pruebas manuales con sesión de §11 y la verificación de S2 en sandbox.
> **Tipo:** `implementation-plan` (escrito con `feature-grill`).
> **Origen:** pedido de Flavio del 26/11/2026 (revisar checkout y seguimiento, proponer alternativas, tres prototipos) y su decisión del 27/11/2026: variante C más el aviso de cierre.
> **Prototipo aprobado:** `docs/prototypes/checkout-seguimiento/variante-c.html` (con `shared.css` y `shared.js`). La revisión pantalla por pantalla está en `docs/prototypes/checkout-seguimiento/index.html`.
> **Base:** `main` en `70bf288`, **después** de commitear el trabajo de Mercado Pago que hoy está sin commitear (ver §6, S1).
> **Decisión de arquitectura:** `docs/adr/0015-cart-freezes-when-the-customer-confirms.md`.
> **Planes anteriores que este enmienda:** `docs/plans/checkout-redesign.md` (el asistente de cuatro pasos desaparece) y `docs/plans/customer-funnel-order-tracking-redesign.md` (la tarjeta de seguimiento se reemplaza; `/my-orders/[orderId]` sigue siendo la pantalla del pedido).

## 1. Objetivo y resultado

- **Hecho significa:**
  1. `/cart` («Tu pedido») muestra los productos editables, el aviso de cierre y un panel «Finalizar» con entrega, pago, total, términos y el botón de confirmar. Entrega y pago se eligen en hojas (lateral en escritorio, inferior en teléfono).
  2. El pedido se puede editar hasta confirmar. Recién al confirmar queda congelado.
  3. Al confirmar con transferencia, el cliente cae en `/my-orders/{id}` con el aviso «Pedido registrado. Falta tu transferencia.» y los datos para transferir. Con Mercado Pago va al proveedor y, al volver, cae en el mismo pedido con el resultado real del pago.
  4. `/my-orders` muestra la lista y el pedido lado a lado en escritorio, y lista → pedido en teléfono. Cada pedido tiene un solo seguimiento lineal, y cada producto lleva su etapa y sus avisos.
  5. `/checkout` redirige a `/cart`. No queda ningún texto interno a la vista del cliente («Código de armado», «Transacción #», «Sin ref.», «webhooks», «intento de pago»).
  6. El tutorial recorre el flujo nuevo.
- **Por qué:** hoy un cliente con dirección guardada aprieta «Continuar» tres veces sin decidir nada, el pedido se congela con solo abrir el checkout, y después de pagar el seguimiento no explica qué pasa ni qué falta.
- **Para:** agente de código o desarrollador.
- **Documento de diseño previo:** ninguno. La única decisión de arquitectura está en el ADR 0015.

## 2. Decisiones alineadas

| # | Tema | Decisión | Origen |
| --- | --- | --- | --- |
| D1 | Estructura | Variante C: no hay pantalla de checkout. Se finaliza en «Tu pedido». | Flavio, 27/11 |
| D2 | Aviso de cierre | Recuadro menta «Cierre del pedido» con el tiempo que falta y la fecha. Va en «Tu pedido» y en el pedido mientras todavía entra en ese cierre. | Flavio, 27/11 (pedido); ubicación según prototipo |
| D3 | Nombre del pago | El cliente lee «Transferencia bancaria». El admin, el código y los ADR siguen con «Pago externo». | Flavio, 27/11 |
| D4 | Estados del pedido | Para el cliente: «Esperando tu pago», «En curso», «Entregado». El admin conserva los suyos. | Flavio, 27/11 |
| D5 | Etapas | Para el cliente: «Compra al proveedor» (antes «Proveedor») y «En viaje» (antes «Envío»). Las otras cuatro no cambian. | Flavio, 27/11 |
| D6 | Cuándo se congela | Al confirmar, no al abrir. `checkout.start` deja de mover el carrito; `checkout.confirmAndPay` lo pasa a `atCheckout` en la misma transacción que crea el pedido. | Consecuencia de D1; código; ADR 0015 |
| D7 | Después de confirmar | No hay pantalla de resultado. Se cae en el pedido, que es confirmación, pago pendiente y seguimiento. | Prototipo C |
| D8 | Pedido esperando el pago, visto desde «Tu pedido» | Productos en solo lectura, enlace al pedido, panel para cambiar el medio de pago o reintentar, y «Volver a editar el pedido». | Default propuesto (reemplaza el reintento que hoy vive en `/checkout`) |
| D9 | Reintentar o cambiar el pago | Se hace confirmando de nuevo desde «Tu pedido», que reutiliza el pedido vivo como hoy. El botón del pedido lleva ahí. | Default propuesto; código (`confirmAndPay` ya reutiliza) |
| D10 | URL del pedido | `/my-orders/[orderId]` sigue siendo la dirección de cada pedido. El lado a lado es un layout, no una ruta nueva ni un modal. | Plan anterior de seguimiento |
| D11 | Seguimiento cuando el pedido se divide | Un solo recorrido, el de la etapa que comparten más productos (si empatan, la más avanzada), con la leyenda «En viaje · 3 de 4 productos». Cada producto muestra su etapa. | Prototipo C; regla exacta: default propuesto |
| D12 | Dirección | El formulario pide calle y número, piso o depto y código postal. Ciudad, provincia y país se completan solos (Ushuaia, Tierra del Fuego, Argentina). | Prototipo C; supuesto S3 |
| D13 | Términos | Casilla con enlace que abre el texto en un diálogo. Se reemplaza el recuadro con scroll y el interruptor. | Prototipo C |
| D14 | Retorno de Mercado Pago | Las tres rutas de retorno buscan el pedido y redirigen a él. Si no lo encuentran, muestran un mensaje en lenguaje de cliente. | Prototipo C; código |
| D15 | Estado «Verificando tu pago» | Un pedido pendiente con comprobante declarado o con el pago en proceso dice «Verificando tu pago», no «Esperando tu pago». | Default propuesto (ver §15) |

Términos del glosario que este plan usa tal cual: *Cart* («Tu pedido»), *Checkout*, *Leave checkout* («Volver a editar el pedido»), *Delivery preference* («Entrega»), *External payment*, *Declared receipt*, *Transfer discount*, *Weekly closing* («Cierre del pedido»), *Delivery lead time*, *Order journey*, *Journey notice* («Aviso»), *Customer order status*, *Repeat order*, *Tutorial*.

### Opciones descartadas

- Variante A (una página con tres secciones) y variante B (asistente de tres pasos).
- Confirmar por proveedor en vez de por `paymentMethodId`: ver ADR 0015.
- Reintentar el pago con una mutación nueva desde el pedido: queda diferido (§3).

## 3. Alcance

### Entra

- `/cart`: panel «Finalizar», hojas de entrega y de pago, formulario de dirección, diálogo de términos, aviso de cierre, barra fija en teléfono y el modo «esperando el pago».
- Servidor: mover el congelamiento al confirmar, `liveOrder` en el estado del checkout, nombres de productos y comprobante declarado en `orders.listMine`, y una consulta para resolver el retorno de Mercado Pago.
- `/my-orders` y `/my-orders/[orderId]`: lado a lado, pedido rediseñado, recorrido lineal nuevo, etapa por producto.
- Retorno de Mercado Pago en lenguaje de cliente.
- Vocabulario del cliente (D3, D4, D5).
- Tutorial, tests unitarios, e2e de lo que no requiere sesión y documentación.

### No entra

- Reglas de pago: `decideAttemptCharge`, `decideOpenAttemptHandling`, `decideCheckoutRelease`, `isSpentPaymentAttempt`, reconciliación y webhook de Mercado Pago.
- El contrato de entrada de `checkout.confirmAndPay`.
- El admin: sus tablas, sus estados, sus diez etapas y `TrackingJourneyStepper`.
- El texto de los términos (`CHECKOUT_TERMS`, ticket #126) y los correos al cliente.
- Esquema de base de datos. No hay migraciones.
- `src/components/ui/*`.

### Diferido

- Reintentar o cambiar el pago directamente desde el pedido, con una mutación `checkout.retryPayment`. Conviene hacerlo cuando el trabajo de Mercado Pago esté cerrado.
- Mostrar el aviso dentro de la etapa donde ocurrió (idea de la variante B). Hoy `UserOrderItemTimeline.notices` no trae la etapa.
- Elegir la transferencia como pago preseleccionado (§15).
- La ilustración de trazo fino en el seguimiento, diferida también en `docs/plans/home-variante-d-como-funciona.md`.

### No se debe romper

- Nunca se crea un intento por un monto distinto de `expectedAmount`.
- Un carrito no se libera con un pago en proceso ni con un comprobante declarado (ADR 0010).
- Confirmar dos veces con la misma `idempotencyKey` devuelve el mismo intento.
- `Repetir pedido` sigue rechazándose mientras otro pedido espera su pago.
- El tutorial no lee ni escribe datos reales (ADR 0012). `e2e/customer-tutorial.spec.ts` lo verifica.
- Los correos y las pantallas del admin no cambian de texto, salvo las dos etapas de D5 si el correo las usa (F2-T2).

## 4. Contexto del sistema actual

**Servidor del checkout** (`src/server/services/checkout/checkout.service.ts`)

- `start(userId)` pasa el carrito a `atCheckout`, crea los métodos de pago del usuario (`findOrCreateMercadoPagoPaymentMethod`, `findOrCreateExternalPaymentMethod`) y devuelve `CheckoutState`.
- `getState(userId)` devuelve lo mismo sin escribir nada. Solo lista métodos ya creados.
- `confirmAndPay(userId, input)` corre en `runSerializable`. Busca el pedido vivo con `findLiveOrderByCartId`, lo reutiliza o crea uno con `createLiveUserOrder`, y abre el intento con `createPendingTransaction`. Hoy rechaza si no hay pedido vivo y el carrito no está en `atCheckout` («El checkout no está iniciado»).
- `leave(userId)` y cualquier mutación del carrito comparten `releaseCheckoutCart` (`checkout-release.ts`): cancelan el pedido vivo y su intento pendiente, salvo pago en proceso o comprobante declarado (`checkout-release.decision.ts`).
- `src/server/services/cart/cart.service.ts`, `ensureCartMutable`: **una mutación del carrito ya libera un checkout abandonado**. Por eso el congelamiento al abrir era, en la práctica, una regla de pantalla.

**Pantallas actuales**

- `src/app/(storefront)/cart/_components/`: `cart-client.tsx` (datos), `cart-page-view.tsx` (vista sin servidor, la usa el tutorial), `cart-summary.tsx` (resumen con «Ir a pagar»).
- `src/app/(storefront)/checkout/_components/`: `checkout-client.tsx` (orquestador), `checkout-steps.ts` (modelo puro de pasos, con test), `checkout-stepper.tsx`, cuatro pasos, `checkout-summary.tsx`, `checkout-result-panel.tsx`, `address-form-dialog.tsx`, `selectable-tile.tsx`, `checkout-charge.ts`.
- `src/app/(storefront)/checkout/mercadopago/{success,failure,pending}/page.tsx` con `_components/mercadopago-return-page.tsx`: página estática que no sabe a qué pedido volvió.
- `src/app/(storefront)/my-orders/`: `page.tsx`, `_components/my-orders-client.tsx`, `_components/order-list-view.ts` (filtro y orden puros, con test), `[orderId]/page.tsx`, `[orderId]/_components/order-detail-view.tsx`, `external-payment-panel.tsx`, `repeat-order-dialog.tsx`.
- Seguimiento: `src/features/tracking/customer-order-journey.ts` (adaptador puro: `empty | unified | perItem`), `customer-order-journey-view.tsx`, `tracking-journey-stepper.tsx` (compartido con `src/features/admin/crud/tracking/tracking-detail-dialog.tsx`).
- Vocabulario: `src/shared/common/order-display.ts` y `src/shared/common/tracking-display.ts`. **`orderStatusLabelMap` también lo usa el admin** (`tracking-table.tsx`, `tracking-detail-dialog.tsx`, `src/features/admin/glossary/data/cart.ts`).
- Cierre semanal: `src/features/weekly-closing/weekly-closing-provider.tsx` (`useWeeklyClosing`), `closing-countdown.tsx`, `src/features/home/_components/hero-closing-timer.tsx`, y los textos en `src/shared/common/weekly-closing.ts`.
- Tutorial: `src/features/tutorial/tutorial-script.ts` (pasos y escenas como datos), `tutorial-fixtures.ts`, `_components/tutorial-scene.tsx` y `_components/scenes/*.tsx`. Las escenas renderizan los componentes reales con datos de ejemplo.

**Patrones a imitar**

- Vista sin servidor más contenedor con datos: `cart-page-view.tsx` + `cart-client.tsx`, y `order-detail-view.tsx` + `[orderId]/page.tsx`.
- Modelo puro con test al lado: `checkout-steps.ts`, `order-list-view.ts`, `customer-order-journey.ts`.
- Recuadro del contador: `hero-closing-timer.tsx` (menta, dígitos en tinta, punto naranja).
- Encabezados: `src/components/page-header.tsx` con `tone="storefront"` y `src/components/eyebrow.tsx`.
- Store persistido: `src/store/cart-store.ts` (zustand con `persist`).

## 5. Enfoque y secuencia

1. **Servidor primero y compatible.** La fase 1 se puede desplegar con la interfaz vieja: `/checkout` sigue funcionando porque `start` devuelve lo mismo más un campo, y `confirmAndPay` acepta un carrito sin congelar.
2. **Vocabulario y piezas puras después**, con sus tests, antes de tocar pantallas.
3. **Pantallas de adelante hacia atrás:** «Tu pedido», después «Mis pedidos», después el retorno de Mercado Pago.
4. **Tutorial al final**, porque depende de los componentes ya rediseñados. Entre la fase 3 y la 6 el tutorial no compila si se borran los componentes viejos: se borran recién en la fase 6.
5. **Un commit por fase.** `pnpm check`, `pnpm typecheck` y `pnpm test` pasan al cerrar cada una.

Cómo se evitan regresiones: no se toca ninguna función de decisión de pagos, los tests de servicio existentes se actualizan en vez de borrarse, y el prototipo es la referencia visual de cada pantalla.

## 6. Supuestos

| # | Supuesto | Por qué es razonable | Qué lo invalida | Qué hacer si es falso |
| --- | --- | --- | --- | --- |
| S1 | El trabajo sin commitear de Mercado Pago (`checkout.service.ts`, `checkout.data.ts`, `checkout-release.decision.ts`, `payment-attempt.decision.ts`, `payment-charge.decision.ts`, webhook y reconciliación) y el de correos al cliente (`src/server/services/notifications/`, sin seguimiento en git) se commitean antes de empezar. | Este plan edita esos mismos archivos y revisa las plantillas de correo (F2-T2). | `git status` muestra esos archivos modificados al arrancar. | Frenar y avisar. No mezclar los dos cambios. |
| S2 | Mercado Pago agrega `external_reference` a las URL de retorno. | Es el comportamiento documentado de Checkout Pro, y la preferencia la envía como `user_transaction:{id}` (`mercadopago-preference.decision.ts`). | En sandbox el retorno llega sin ese parámetro. | Queda el mensaje de respaldo con enlace a «Mis pedidos». Probar `preference_id` como alternativa. |
| S3 | Solo se entrega en Ushuaia. | La home y los puntos de retiro lo dicen; el proyecto es de compras comunitarias en Ushuaia. | Se suma otra ciudad. | Volver a mostrar ciudad y provincia en el formulario. El esquema no cambia. |
| S4 | Un carrito en `atCheckout` tiene un pedido vivo, salvo filas viejas. | Después de la fase 1 solo `confirmAndPay` lo pone en ese estado. | Carritos abandonados en el checkout viejo. | Ya está cubierto: `liveOrder` llega `null` y la pantalla lo trata como editable. |
| S5 | No hay inicio de sesión en los e2e. | `e2e/` no usa `storageState` ni pasos de login. | Aparece una utilidad de sesión. | Sumar un e2e del flujo completo con sesión. |

## 7. Plan por fases

### Fase 0 — Preparación

**Objetivo:** partir de una base limpia.
**Tareas:** F0-T1.
**Dependencias:** S1.
**Hecho:** rama `checkout-en-tu-pedido` creada desde `main` actualizado; `pnpm test` en verde antes de tocar nada.

### Fase 1 — Servidor: congelar al confirmar y datos nuevos

**Objetivo:** que el servidor soporte el flujo nuevo sin romper el viejo.
**Tareas:** F1-T1 a F1-T5.
**Dependencias:** fase 0.
**Hecho:** tests de servicio en verde; `/checkout` viejo sigue funcionando a mano.

### Fase 2 — Vocabulario y piezas puras

**Objetivo:** dejar listos los textos del cliente y los modelos que las pantallas van a consumir.
**Tareas:** F2-T1 a F2-T7.
**Dependencias:** fase 1 (por los campos nuevos de la lista).
**Hecho:** tests unitarios nuevos en verde; las pantallas actuales ya muestran los estados y etapas nuevos.

### Fase 3 — «Tu pedido» con «Finalizar»

**Objetivo:** confirmar un pedido sin pasar por `/checkout`.
**Tareas:** F3-T1 a F3-T9.
**Dependencias:** fases 1 y 2.
**Hecho:** confirmación con transferencia y con Mercado Pago desde `/cart`; `/checkout` redirige.

### Fase 4 — «Mis pedidos» lado a lado y pedido rediseñado

**Objetivo:** que el pedido sea a la vez confirmación, pago pendiente y seguimiento.
**Tareas:** F4-T1 a F4-T6.
**Dependencias:** fase 2. Puede hacerse en paralelo con la fase 3.
**Hecho:** los cinco estados del prototipo (esperando el pago, preparación, en viaje, en dos partes, entregado) se ven bien a 1280 px y a 390 px.

### Fase 5 — Retorno de Mercado Pago

**Objetivo:** volver del proveedor al pedido correcto.
**Tareas:** F5-T1 y F5-T2.
**Dependencias:** F1-T5 y fase 4.
**Hecho:** las tres rutas redirigen al pedido con `?llegada=mp`; sin referencia, muestran el respaldo.

### Fase 6 — Tutorial y limpieza

**Objetivo:** tutorial al día (ADR 0012) y código viejo borrado.
**Tareas:** F6-T1 a F6-T4.
**Dependencias:** fases 3 y 4.
**Hecho:** `pnpm test` y `pnpm test:e2e` en verde; no queda ningún import a los componentes borrados.

### Fase 7 — Documentación y cierre

**Objetivo:** dejar el repositorio coherente.
**Tareas:** F7-T1 y F7-T2.
**Dependencias:** todas.
**Hecho:** §13 completo y definición de hecho (§16) tildada.

## 8. Detalle de tareas

### F0-T1 — Base limpia

- **Archivos:** ninguno.
- **Cambio:** confirmar con `git status` que el trabajo de Mercado Pago está commiteado. Crear la rama. Releer `confirmAndPay`, `start` y `getState`, porque los números de línea de este plan son de antes de ese commit.
- **Aceptación:** `pnpm test`, `pnpm check` y `pnpm typecheck` en verde.

### F1-T1 — `start` deja de congelar

- **Archivos:** `src/server/services/checkout/checkout.service.ts`.
- **Símbolos:** `start(userId)`.
- **Cambio:** quitar la llamada a `updateCartStatus(tx, cart.id, "atCheckout")` y usar el carrito tal como llega. Actualizar el comentario de la función: prepara las opciones, no congela.
- **Depende de:** F0-T1.
- **Aceptación:** test en `checkout.transaction-queries.test.ts`: `start` sobre un carrito `pending` no llama a `updateCartStatus` y devuelve `cart.status === "pending"`.
- **Riesgo:** ese test hoy arma el carrito en `atCheckout`. Agregar el caso `pending`, no reemplazar el existente.

### F1-T2 — `confirmAndPay` congela al crear el pedido

- **Archivos:** `src/server/services/checkout/checkout.service.ts`.
- **Símbolos:** `confirmAndPay(userId, input)`.
- **Cambio:** eliminar el rechazo «El checkout no está iniciado» (`!liveOrder && cart.status !== "atCheckout"`). En su lugar, cuando no hay pedido vivo y el carrito no está en `atCheckout`, llamar a `updateCartStatus(tx, cart.id, "atCheckout")` dentro de la misma transacción, **después** de la comparación con `expectedAmount` y **antes** de `createLiveUserOrder`. Si la comparación falla, la transacción se revierte y el carrito queda editable.
- **Depende de:** F1-T1.
- **Aceptación:** tests nuevos en `checkout.payment-switch.test.ts`: (a) carrito `pending` + confirmación válida → una llamada a `updateCartStatus(…, "atCheckout")` y un pedido creado; (b) carrito `pending` + `expectedAmount` distinto → `CONFLICT` y ninguna llamada a `updateCartStatus`; (c) carrito ya en `atCheckout` con pedido vivo → no se vuelve a llamar.
- **Riesgo:** no mover el orden de `cancelAbandonableAttempt` ni de `decideOpenAttemptHandling`.

### F1-T3 — `liveOrder` en el estado del checkout

- **Archivos:** `src/schemas/checkout.schemas.ts`, `src/server/services/checkout/checkout.service.ts`, `src/server/services/checkout/checkout.data.ts`, `src/shared/common/checkout.types.ts` (si los tipos no se derivan solos del esquema: verificar).
- **Símbolos:** `checkoutStateSchema`; función nueva `toLiveOrderState(order)` en el servicio; `orderDetailSelect`.
- **Cambio:** agregar a `checkoutStateSchema` el campo `liveOrder`, `null` cuando no hay pedido vivo, con esta forma: `id`, `code`, `delivery` (misma forma que `checkoutDeliveryInputSchema`, o `null` si no se puede reconstruir), `paymentMethodId` (el del último intento, o `null`), `provider` (o `null`) y `release` (`"release" | "blockedPaymentInFlight" | "blockedDeclaredReceipt"`, calculado con `decideCheckoutRelease`). `start` y `getState` lo llenan con `findLiveOrderByCartId` solo si el carrito está en `atCheckout`. Para reconstruir `delivery` hace falta el id del punto de retiro: `orderDetailSelect` hoy selecciona `deliveryPreference` pero no `pickupPointId`; sumarlo. La dirección sale de `getAddressFromSnapshot`.
- **Depende de:** F1-T1.
- **Aceptación:** tests: carrito `pending` → `liveOrder: null`; carrito `atCheckout` con intento externo pendiente sin comprobante → `release: "release"`; con comprobante declarado → `release: "blockedDeclaredReceipt"`.
- **Riesgo:** `orderDetailSelect` alimenta `orderDetailSchema`. Sumar una columna al `select` no la expone al cliente, pero confirmar que `orderDetailSchema.parse` no falla por claves extra.

### F1-T4 — Nombres de productos y comprobante en la lista

- **Archivos:** `src/server/services/checkout/checkout.data.ts`, `src/server/services/checkout/checkout.service.ts`, `src/schemas/checkout.schemas.ts`, `src/shared/common/product-snapshot.ts`.
- **Símbolos:** `orderListSelect`, `toOrderListItem`, `orderListItemSchema`, `readSnapshotProduct`.
- **Cambio:** `orderListSelect` suma `items: { select: { productSnapshot: true }, orderBy: { id: "asc" } }` y, en `transactions`, `declaredReceiptReference`. `orderListItemSchema` suma `itemNames: string[]` (todos los nombres, en orden) y `receiptDeclared: boolean` (el intento que elige `selectOrderDisplayAttempt` está pendiente y tiene comprobante declarado). El nombre se lee con `readSnapshotProduct(snapshot).name`, que ya existe; usarlo también en lugar del `getProductName` local de `order-detail-view.tsx`.
- **Aceptación:** test de `toOrderListItem` (en `checkout.data.test.ts` o un test nuevo del servicio): tres productos → tres nombres en orden; intento con comprobante → `receiptDeclared: true`. `orderDetailSchema` extiende al de la lista: `toOrderDetail` debe llenar los dos campos nuevos.
- **Riesgo:** `tutorial-fixtures.ts` construye `orderList` y `orderDetail` a mano; van a fallar los tipos hasta completar los campos (hacerlo acá, no en la fase 6).

### F1-T5 — Resolver el retorno de Mercado Pago

- **Archivos:** `src/server/services/checkout/checkout.data.ts`, `src/server/services/checkout/checkout.service.ts`, `src/server/api/routers/orders.router.ts`, `src/schemas/checkout.schemas.ts`.
- **Símbolos:** `findOrderIdByTransactionId(db, userId, transactionId)` `[NEW]`; `resolvePaymentReturn(userId, externalReference)` `[NEW]`; procedimiento `orders.resolvePaymentReturn` `[NEW]` (consulta protegida); `orderPaymentReturnInputSchema` `[NEW]` (`externalReference: string`, máximo 64 caracteres).
- **Cambio:** aceptar solo el formato `user_transaction:{entero positivo}`. El parser vive en `mercadopago-preference.decision.ts` (`parseMercadoPagoExternalReference`, junto a `toMercadoPagoExternalReference`) y lo comparte la conciliación. Buscar la transacción y devolver `{ orderId }` únicamente si su pedido es del usuario. En cualquier otro caso devolver `null`, sin distinguir «no existe» de «no es tuyo».
- **Aceptación:** tests: referencia válida y propia → id; referencia de otro usuario → `null`; texto con otro formato → `null`.
- **Riesgo:** no reutilizar `findTransactionByIdempotencyKey`. No lanzar `FORBIDDEN`: delataría la existencia del pedido.

### F2-T1 — Estados del pedido para el cliente

- **Archivos:** `src/shared/common/order-display.ts`, `src/app/(storefront)/my-orders/_components/order-list-view.test.ts`.
- **Símbolos:** `customerOrderStatusView(order)` `[NEW]`, que recibe `{ status, latestTransactionStatus, receiptDeclared }` y devuelve `{ key, label, variant, icon }`; `orderStatusChipConfigMap`; `orderStatusFilterGroups`.
- **Cambio:** `pending` → «Esperando tu pago», o «Verificando tu pago» si `receiptDeclared` o el intento está `inProcess` (D15). `processing` → «En curso». `completed` → «Entregado». Los otros cuatro conservan su texto. El filtro «Completados» pasa a «Entregados». **No tocar `orderStatusLabelMap`**: lo usa el admin. `orderStatusChipConfigMap` queda solo si algún consumidor lo necesita; las pantallas del cliente pasan a `customerOrderStatusView`.
- **Aceptación:** test nuevo `src/shared/common/order-display.test.ts` `[NEW]` con los siete estados y los dos casos de «Verificando tu pago». Las tablas del admin no cambian de texto.

### F2-T2 — Etapas para el cliente

- **Archivos:** `src/shared/common/tracking-display.ts`.
- **Símbolos:** `userTrackingStageDefinitions`.
- **Cambio:** `supplier` → etiqueta «Compra al proveedor», descripción «Hacemos una sola compra con los pedidos de todos.». `shipping` → «En viaje», «Tu pedido viaja de Buenos Aires a Ushuaia.». Revisar las otras cuatro descripciones contra `STAGES` de `docs/prototypes/checkout-seguimiento/shared.js` y adoptarlas.
- **Aceptación:** `pnpm test` en verde después de actualizar los tests que afirman las etiquetas viejas (`customer-order-journey.test.ts`, `tutorial-script.test.ts`, `tutorial-fixtures.test.ts`).
- **Riesgo:** `src/server/services/tracking/tracking-event.service.ts` usa estas definiciones para armar el seguimiento del cliente. Verificar con `grep` si `src/server/services/notifications/customer-email.templates.ts` o `customer-order-notices.ts` muestran estas etiquetas; si lo hacen, el correo cambia de texto y hay que actualizar `customer-email.templates.test.ts`. `trackingSourceLabelMap.supplier` («Proveedor») es otra cosa: no tocarlo.

### F2-T3 — Texto de los medios de pago

- **Archivos:** `src/features/checkout/payment-method-copy.ts` `[NEW]`, `src/app/(storefront)/checkout/_components/checkout-payment-step.tsx`.
- **Símbolos:** `paymentMethodCopy({ provider, label, details })` (mover desde `checkout-payment-step.tsx`).
- **Cambio:** `external` → título «Transferencia bancaria», descripción «Te damos los datos al confirmar. Tu pedido queda confirmado cuando verificamos la transferencia.». `mercadopago` → «Mercado Pago», «Tarjeta, dinero en cuenta o efectivo. Pagás en Mercado Pago y volvés a CoCo.». Todas las pantallas del cliente deben usar esta función y **nunca** `paymentMethod.label`: esa columna guarda «Pago externo» (`checkout.data.ts`, `findOrCreateExternalPaymentMethod`) y la ve el admin.
- **Aceptación:** `grep -rn "paymentMethod.label" "src/app/(storefront)" src/features` no devuelve usos en pantallas del cliente al terminar la fase 6.

### F2-T4 — Modelo de «Finalizar»

- **Archivos:** `src/features/checkout/finish-order.ts` `[NEW]`, `src/features/checkout/finish-order.test.ts` `[NEW]`.
- **Símbolos:** `resolveFinishSelection(state, draft)`, que devuelve la entrega y el pago efectivos validando los ids del borrador contra las opciones vigentes y cayendo en el primero disponible; `finishBlockers(selection, { acceptedTerms })`, que devuelve la lista ordenada de lo que falta (`"address" | "pickupPoint" | "payment" | "terms"`); `toConfirmInput(selection, charge, idempotencyKey)`.
- **Cambio:** reemplaza a `checkout-steps.ts`. Sin React ni I/O. Cada elección sale del borrador, después de `state.liveOrder` y por último de la primera opción. El borrador gana para que confirmar de nuevo pueda cambiar el medio de pago (D9).
- **Imitar:** `src/app/(storefront)/checkout/_components/checkout-steps.ts`.
- **Aceptación:** tests: sin direcciones y modo domicilio → falta `address`; id de dirección que ya no existe → cae en la primera; solo punto de retiro disponible; `liveOrder` con entrega → se respeta.

### F2-T5 — Etapa por producto y resumen del recorrido

- **Archivos:** `src/features/tracking/customer-order-journey.ts`, `src/features/tracking/customer-order-journey.test.ts`.
- **Símbolos:** `buildOrderLineStages(view, items)` `[NEW]`, una fila por producto con `{ cartItemId, stageLabel, tone, notices }`; `summarizeOrderJourney(view)` `[NEW]`, que devuelve `{ stages, caption }`.
- **Cambio:** regla D11. En `empty`, todas las etapas pendientes, sin leyenda, y cada producto dice «Esperando el pago». En `unified`, las etapas del pedido y la leyenda «Etapa N de 6 · descripción». En `perItem`, las etapas del grupo con más productos (empate: el más avanzado; los cancelados no cuentan) y la leyenda «{etapa} · X de Y productos». Los avisos van en la fila de su producto; en `unified` los avisos ya vienen con el nombre del producto como prefijo, así que el adaptador debe conservar el `cartItemId` de cada aviso para poder repartirlos sin parsear el texto.
- **Aceptación:** tests para los tres modos, el empate y un producto cancelado.
- **Riesgo:** no cambiar `buildCustomerOrderJourneyView` ni la regla de colapso; el tutorial y sus tests dependen de ella.

### F2-T6 — Aviso de cierre

- **Archivos:** `src/features/weekly-closing/closing-notice.tsx` `[NEW]`, `src/shared/common/weekly-closing.ts`, `src/shared/common/weekly-closing.test.ts`.
- **Símbolos:** `ClosingNotice({ variant })` con `variant: "cart" | "awaitingPayment" | "paid"`; `orderJoinsNextClosing({ orderCreatedAt, nextClosing, stageKey })` `[NEW]` en `weekly-closing.ts`.
- **Cambio:** recuadro menta con el tiempo que falta (`formatTimeUntilClosing`), el rótulo «Cierre del pedido», la fecha (`formatClosingDate`) y una frase por variante: `cart` «Lo que pagues antes entra en la compra de esta semana y llega {plazo} después.»; `awaitingPayment` «Si el pago entra antes, tu pedido va en la compra de esta semana.»; `paid` «Tu pedido ya está adentro. Desde el cierre tarda {plazo} en llegar.». El plazo sale de `formatDeliveryLeadTime`. Devuelve `null` fuera del proveedor, como `HeroClosingTimer`. `orderJoinsNextClosing` es verdadero solo si el pedido se creó después del cierre anterior (`nextClosing` menos siete días) y todavía no pasó de «Pedido confirmado».
- **Imitar:** `src/features/home/_components/hero-closing-timer.tsx`.
- **Aceptación:** tests de `orderJoinsNextClosing`: pedido de esta semana en «Pedido confirmado» → verdadero; pedido de la semana pasada → falso; pedido ya en «Preparación» → falso.
- **Riesgo:** el cierre semanal es informativo (glosario). No prometer una fecha de entrega ni afirmar que una transferencia sin verificar entró (ticket #127, pendiente de Producto).

### F2-T7 — Aviso de llegada al pedido

- **Archivos:** `src/app/(storefront)/my-orders/_components/order-arrival.ts` `[NEW]`, `order-arrival.test.ts` `[NEW]`.
- **Símbolos:** `orderArrivalBanner({ arrival, order })` con `arrival: "nuevo" | "mp" | null`.
- **Cambio:** función pura. `nuevo` con transferencia pendiente → «Pedido registrado. Falta tu transferencia.». `mp` con el intento `completed` → «Pago recibido»; `pending` o `inProcess` → «Estamos esperando la confirmación de Mercado Pago»; `failed` o `cancelled` → «Mercado Pago no aprobó el pago». Textos completos en `compute()` de `shared.js` (`mpTitle`, `mpText`). Sin `arrival`, o si el estado real no corresponde, `null`.
- **Aceptación:** test por rama. El aviso siempre sale del estado real del pedido, nunca del parámetro de la URL solo.

### F3-T1 — Datos del panel

- **Archivos:** `src/features/checkout/use-checkout-options.ts` `[NEW]`, `src/store/checkout-draft-store.ts` `[NEW]`.
- **Símbolos:** `useCheckoutOptions({ enabled })`; `useCheckoutDraftStore`.
- **Cambio:** el hook llama a `api.checkout.start` una sola vez cuando `enabled` (hay sesión, el carrito tiene productos y `canStartCheckout` abre la compuerta), expone el estado, y las mutaciones `createAddress` y `updateAddress` con la misma actualización local que hoy hace `checkout-client.tsx`. Ante un `CONFLICT` de confirmación, vuelve a leer con `checkout.getState`. El store guarda por usuario `deliveryMode`, `addressId`, `pickupPointId` y `provider`, en `sessionStorage`. No guarda la aceptación de términos.
- **Imitar:** `checkout-client.tsx` (compuerta y mutaciones) y `src/store/cart-store.ts` (persistencia).
- **Riesgo:** `start` sigue siendo una mutación porque crea los métodos de pago. No llamarla para invitados ni con el carrito vacío (devuelve `BAD_REQUEST`).

### F3-T2 — Panel «Finalizar»

- **Archivos:** `src/features/checkout/finish-order-panel.tsx` `[NEW]`, `src/features/checkout/finish-order-mobile-bar.tsx` `[NEW]`.
- **Símbolos:** `FinishOrderPanel`, `FinishOrderMobileBar`. Solo props, sin hooks de datos.
- **Cambio:** dos filas que abren las hojas («Entrega», «Pago»), con la fila de entrega resaltada si falta la dirección; subtotal, «Descuento por transferencia» si aplica y total («Total a transferir» o «Total»); casilla de términos; botón «Confirmar pedido» o «Pagar en Mercado Pago». El botón deshabilitado explica qué falta con el primer elemento de `finishBlockers`. El monto sale de `getCheckoutCharge` (mover `checkout-charge.ts` a `src/features/checkout/`).
- **Imitar:** `.pick`, `.sum` y `.mbar` del prototipo; `CheckoutMobileBar` en `checkout-summary.tsx`.
- **Aceptación:** con dirección guardada, el cliente confirma con una casilla y un botón.

### F3-T3 — Hojas de entrega y de pago, dirección y términos

- **Archivos:** `src/features/checkout/delivery-sheet.tsx` `[NEW]`, `payment-sheet.tsx` `[NEW]`, `address-form.tsx` `[NEW]`, `terms-dialog.tsx` `[NEW]`; mover `selectable-tile.tsx` a `src/features/checkout/`.
- **Cambio:** usar `Sheet` de `src/components/ui/sheet.tsx` con `side="right"` en escritorio y `side="bottom"` en teléfono (`useIsMobile` de `src/hooks/use-mobile.ts`). Entrega: selector «A domicilio / Punto de retiro» (oculto si no hay puntos activos), lista de direcciones o de puntos, «Agregar otra dirección» que abre el formulario dentro de la misma hoja, y «Las dos opciones cuestan lo mismo». Pago: una fila por método con su precio a la derecha y el ahorro en la transferencia. El formulario pide calle y número, piso o depto y código postal (9410 por defecto) y envía `city: "Ushuaia"`, `state: "Tierra del Fuego"`, `country: "Argentina"`, `type: "shipping"`; las constantes van en `src/shared/common/delivery-area.ts` `[NEW]`. El diálogo de términos muestra `termsText` y un botón «Aceptar» que tilda la casilla.
- **Imitar:** `checkout-delivery-step.tsx`, `checkout-address-step.tsx`, `address-form-dialog.tsx` (validación y campos), el prototipo para el aspecto.
- **Aceptación:** primera compra sin direcciones → la hoja abre directo en el formulario y «Listo» queda deshabilitado hasta guardar.
- **Riesgo:** `checkoutAddressFieldsSchema` no cambia: sigue exigiendo ciudad, provincia y país.

### F3-T4 — Contenedor y confirmación

- **Archivos:** `src/features/checkout/finish-order.container.tsx` `[NEW]`.
- **Símbolos:** `FinishOrder({ userId })`.
- **Cambio:** une `useCheckoutOptions`, el borrador, `finish-order.ts` y `api.checkout.confirmAndPay`. Conserva la `idempotencyKey` en estado y la renueva solo después de una respuesta exitosa o de un cambio de medio de pago. Al confirmar: con `redirectUrl`, `window.location.assign`; sin ella, actualizar el carrito del store con `cart.getCurrent` (queda en `atCheckout`), invalidar `orders.listMine`, limpiar el borrador y `router.push("/my-orders/{id}?llegada=nuevo")`. Ante `CONFLICT`, toast con el mensaje del servidor y recarga del estado, como hoy.
- **Imitar:** `handleConfirm` y `confirmAndPay.onSuccess` de `checkout-client.tsx`.
- **Aceptación:** prueba manual con transferencia y con Mercado Pago en sandbox.

### F3-T5 — Vista de «Tu pedido»

- **Archivos:** `src/app/(storefront)/cart/_components/cart-page-view.tsx`, `cart-client.tsx`, `cart-summary.tsx` (se borra), `src/app/(storefront)/cart/page.tsx`.
- **Símbolos:** `CartPageView` gana `finishSlot: React.ReactNode` y `closingSlot?: React.ReactNode`; `targets` suma `finish`.
- **Cambio:** orden de la página: encabezado «Tu pedido» / «Tu pedido de la semana», `ClosingNotice variant="cart"`, y dos columnas: productos y panel. Bajo los productos, «Podés cambiar cantidades hasta el momento de confirmar.» y el enlace «Vaciar pedido». Invitado: el panel muestra el total y «Registrarme o iniciar sesión» con `callbackURL=/cart`. Se eliminan la insignia de estado del carrito, «Código de armado», «Líneas» y «Total estimado». Actualizar `metadata.description` de la página.
- **Riesgo:** `CartPageView` debe seguir sin hooks de datos: el tutorial la renderiza con datos de ejemplo.

### F3-T6 — Modo «esperando el pago»

- **Archivos:** `cart-page-view.tsx`, `finish-order-panel.tsx`, `finish-order.container.tsx`.
- **Cambio:** cuando el estado trae `liveOrder`: productos en solo lectura, título del panel «Falta el pago», enlace «Ver el pedido» a `/my-orders/{id}`, las filas de entrega y pago con lo elegido en ese pedido, y el botón que confirma de nuevo (reintenta o cambia el medio). «Volver a editar el pedido» llama a `leaveCheckout` de `useCartActions`. Con `liveOrder.release` distinto de `"release"`: sin botón de confirmar ni de editar, y el texto de `checkoutReleaseBlockedMessage`. Carrito en `atCheckout` sin `liveOrder` (fila vieja): se trata como editable.
- **Depende de:** F1-T3.
- **Aceptación:** después de confirmar con transferencia, volver a `/cart` muestra este modo; «Volver a editar el pedido» cancela el pedido y devuelve los controles de cantidad.

### F3-T7 — Avisar cuando editar cancela un pedido

- **Archivos:** `src/features/cart/use-cart-sync.ts`.
- **Símbolos:** `applyOutput`, `leaveCheckoutMutation`.
- **Cambio:** si antes de una mutación el carrito del store estaba en `atCheckout` y la respuesta llega en `pending`, mostrar «Cancelamos el pedido que esperaba el pago. Ya podés editarlo.». Cambiar el toast de `leaveCheckoutMutation` por ese mismo texto («Cerramos el checkout» ya no describe nada).
- **Aceptación:** con un pedido esperando la transferencia, sumar un producto desde el catálogo muestra el aviso. El comportamiento del servidor no cambia.

### F3-T8 — Enlaces y redirección

- **Archivos:** `src/app/(storefront)/checkout/page.tsx`, `src/features/cart/_components/cart-sheet-view.tsx`, `src/features/tutorial/tutorial-invitation.decision.ts`, `tutorial-invitation.decision.test.ts`, `src/features/cart/checkout-start-gate.decision.ts` (solo el comentario).
- **Cambio:** `/checkout` hace `redirect("/cart")`. En el mini-pedido, un solo botón destacado «Finalizar pedido» a `/cart` (se quita «Ver pedido completo», que quedaría duplicado) y el inicio de sesión con `callbackURL=/cart`. `EXCLUDED_SECTIONS` suma `"/cart"`: la invitación al tutorial no debe interrumpir a quien está finalizando.
- **Aceptación:** `grep -rn '"/checkout"' src` solo devuelve la redirección y `EXCLUDED_SECTIONS`.
- **Riesgo:** no borrar la carpeta `checkout/mercadopago/`.

### F3-T9 — e2e sin sesión

- **Archivos:** `e2e/checkout-en-tu-pedido.spec.ts` `[NEW]`.
- **Cambio:** `/checkout` como invitado termina en `/cart`; con un producto en el pedido, `/cart` muestra el aviso de cierre, el total y «Registrarme o iniciar sesión»; no aparece «Código de armado».
- **Imitar:** `e2e/home-offer-quantity.spec.ts` para cargar el pedido como invitado.

### F4-T1 — Layout lado a lado

- **Archivos:** `src/app/(storefront)/my-orders/layout.tsx` `[NEW]`, `_components/my-orders-shell.tsx` `[NEW]`, `_components/order-list-pane.tsx` `[NEW]`, `_components/order-detail-section.tsx` `[NEW]`, `page.tsx`, `[orderId]/page.tsx`, `_components/my-orders-client.tsx` (se borra en la fase 6).
- **Símbolos:** `MyOrdersShell({ list, detail, detailOpen })` (solo props, lo usa también el tutorial); `OrderListPane({ orders, selectedId })`; `OrderDetailSection({ orderId, arrival })` (componente de servidor con la carga que hoy hace `[orderId]/page.tsx`).
- **Cambio:** el layout pide `orders.listMine`, muestra el encabezado y el estado vacío, y arma la grilla: lista de 340 px y pedido. `OrderListPane` lee el pedido elegido con `useSelectedLayoutSegment`. En `/my-orders`, la página renderiza el detalle del pedido más reciente dentro de un contenedor visible solo desde `lg`; en teléfono se ve solo la lista. En `/my-orders/[orderId]`, en teléfono se oculta la lista y aparece «← Mis pedidos». Cada fila: estado (`customerOrderStatusView`), total, nombres («Almendra, Nuez y 2 más» a partir de `itemNames`) y fecha. Se conservan los filtros por estado en una fila con scroll horizontal; se quita el botón de orden (siempre más recientes primero).
- **Imitar:** `.md`, `.oitem` del prototipo.
- **Aceptación:** elegir un pedido en escritorio cambia la URL y no recarga la lista; el botón «atrás» del navegador funciona.
- **Riesgo:** un layout no se vuelve a ejecutar al navegar entre hijos. Después de declarar un comprobante hay que llamar a `router.refresh()` (ya se hace en `external-payment-panel.tsx`) para que la lista cambie a «Verificando tu pago».

### F4-T2 — Recorrido lineal

- **Archivos:** `src/features/tracking/order-journey-track.tsx` `[NEW]`.
- **Símbolos:** `OrderJourneyTrack({ stages, caption })`.
- **Cambio:** seis puntos unidos por una línea: completadas en tinta, actual en naranja con halo, pendientes en gris. Etiquetas siempre visibles en escritorio; en teléfono, solo la primera, la actual y la última. Lista ordenada con `aria-current="step"` en la actual. Texto de 12 px como mínimo.
- **Imitar:** `.track` y `.tk` del prototipo.
- **Riesgo:** no modificar `tracking-journey-stepper.tsx`: lo usa el admin.

### F4-T3 — Pedido rediseñado

- **Archivos:** `src/app/(storefront)/my-orders/[orderId]/_components/order-detail-view.tsx`, `order-detail-view.test.tsx`, `src/app/(storefront)/my-orders/_components/order-headline.ts` `[NEW]` con su test.
- **Símbolos:** `OrderDetailView` suma `arrivalBanner`, `closingSlot` y `paymentSlot` (reemplaza a `externalPaymentSlot`); `orderHeadline({ order, journeySummary })` `[NEW]`, puro, devuelve título y frase.
- **Cambio:** orden de arriba hacia abajo: aviso de llegada; tarjeta de cabecera con «Pedido {código}», estado, título («Falta tu transferencia», «Tu pedido entra en la compra de esta semana», «Tu pedido está viajando a Ushuaia», «Tu pedido llega en dos partes», «Pedido entregado», «Pedido cancelado»), frase, `OrderJourneyTrack` y aviso de cierre; acción de pago; productos con foto, cantidad, importe, etapa y avisos, más el desglose del descuento con `TransferDiscountBreakdownRows`; y una tarjeta con «Entrega» y «Pago». En «Pago»: medio (`paymentMethodCopy`), monto y una frase de estado. Se eliminan «Código de armado», «Líneas comerciales confirmadas», «Transacción #» y «Referencia: Sin ref.». Se conservan `describeOrderDelivery`, el enlace al mapa y «¿Querés cambiarla? Escribinos.».
- **Imitar:** bloque `P.onSync` de `variante-c.html` y los textos `st` de `shared.js`.
- **Aceptación:** `order-detail-view.test.tsx` actualizado; los cinco estados del prototipo reproducidos con datos de `qa:seed` o a mano.
- **Riesgo:** las frases no deben afirmar fechas. «7 a 10 días después del cierre» es una promesa de texto, no un cálculo (glosario, *Delivery lead time*).

### F4-T4 — Acción de pago

- **Archivos:** `src/app/(storefront)/my-orders/[orderId]/_components/external-payment-panel.tsx`, `src/features/checkout/external-payment-details.tsx`, `src/app/(storefront)/my-orders/[orderId]/_components/order-payment-pending.tsx` `[NEW]`.
- **Cambio:** el panel de transferencia pasa a titularse «Datos para transferir», suma «Copiar todo» y separa «¿Ya transferiste?» con el campo del comprobante. Con comprobante: «Comprobante informado», el número y «Lo estamos verificando. Te avisamos acá cuando el pedido quede confirmado.», con «Corregir». `OrderPaymentPending` cubre el pedido pendiente por Mercado Pago: «Terminá de pagar. Tu pedido quedó guardado, no hace falta armarlo de nuevo.», con un botón a `/cart` (D9) y «Volver a editar el pedido».
- **Aceptación:** en un pedido pendiente, lo primero que se ve bajo la cabecera es qué hacer para pagar.

### F4-T5 — Aviso de cierre en el pedido

- **Archivos:** `src/app/(storefront)/my-orders/_components/order-detail-section.tsx`, `src/features/weekly-closing/closing-notice.tsx`.
- **Cambio:** pedido `pending` → `variant="awaitingPayment"`. Pedido pago → `variant="paid"` solo si `orderJoinsNextClosing` es verdadero. En cualquier otro caso, nada.
- **Depende de:** F2-T6. La decisión necesita el reloj del proveedor (`useWeeklyClosing`), así que vive en un componente cliente chico que recibe `orderCreatedAt` y `stageKey`.

### F4-T6 — Limpieza del seguimiento viejo

- **Archivos:** `src/features/tracking/customer-order-journey-view.tsx` (se borra en la fase 6, cuando el tutorial ya no lo use).

### F5-T1 — Rutas de retorno

- **Archivos:** `src/app/(storefront)/checkout/mercadopago/success/page.tsx`, `failure/page.tsx`, `pending/page.tsx`.
- **Cambio:** cada página lee `searchParams.external_reference`. Con sesión y referencia, llama a `api.orders.resolvePaymentReturn`; si devuelve un pedido, `redirect("/my-orders/{id}?llegada=mp")`. Si no, renderiza el respaldo.
- **Riesgo:** `searchParams` es una promesa en esta versión de Next (igual que `params` en `[orderId]/page.tsx`). No confiar en el nombre de la ruta para decidir el resultado: el aviso sale del estado real (F2-T7).

### F5-T2 — Mensaje de respaldo

- **Archivos:** `src/app/(storefront)/checkout/mercadopago/_components/mercadopago-return-page.tsx`.
- **Cambio:** tres textos en lenguaje de cliente (los de `mp` en `shared.js`) y un botón «Ver mis pedidos». Se elimina el recuadro «Estado sujeto a reconciliación».

### F6-T1 — Guion del tutorial

- **Archivos:** `src/features/tutorial/tutorial-script.ts`, `tutorial-script.test.ts`.
- **Símbolos:** `TutorialScene`, `TUTORIAL_TARGETS`, `targetsByScene`, `steps`.
- **Cambio:** la escena `cart` pasa a `{ id: "cart"; signedIn: boolean; sheet: "delivery" | "payment" | null }`. Se eliminan las escenas `checkout` y `checkoutResult` y el import de `CheckoutStepId`. `orderDetail` suma `arrival?: "nuevo"`. Objetivos: se quitan `checkout-stepper`, `checkout-delivery`, `checkout-payment`, `checkout-review` y `checkout-result`; se suman `cart-finish`, `finish-delivery`, `finish-payment`, `finish-confirm` y `order-arrival`. Los pasos `checkout-steps`, `checkout-delivery`, `checkout-payment`, `checkout-review` y `payment-approved` se reescriben sobre esas escenas: finalizás en la misma pantalla; elegís entrega; elegís pago y ves el descuento; aceptás y confirmás; caés en tu pedido.
- **Aceptación:** `tutorial-script.test.ts` en verde con los conteos nuevos de pasos por versión.
- **Riesgo:** ningún paso puede decir «checkout» ni «carrito». Mantener el orden de las escenas siempre hacia adelante.

### F6-T2 — Escenas y datos de ejemplo

- **Archivos:** `src/features/tutorial/_components/tutorial-scene.tsx`, `scenes/cart-scene.tsx`, `scenes/my-orders-scene.tsx`, `scenes/order-detail-scene.tsx`, `scenes/checkout-scene.tsx` (se borra), `scenes/checkout-result-scene.tsx` (se borra), `tutorial-fixtures.ts`, `tutorial-fixtures.test.ts`, `tutorial-scene.test.tsx`.
- **Cambio:** `CartScene` renderiza `CartPageView` con `FinishOrderPanel` en `finishSlot` y, según `sheet`, la hoja de entrega o de pago abierta con datos de ejemplo. `MyOrdersScene` y `OrderDetailScene` usan `MyOrdersShell`. `navbarStateFor` pierde el caso `checkout` y decide la sesión con `scene.signedIn`. En los datos de ejemplo: quitar `paymentResult`, cambiar la etiqueta «Pago externo», y completar `itemNames` y `receiptDeclared`.
- **Riesgo:** las hojas usan un portal de Radix. Verificar que el recorte del tutorial (`tutorial-spotlight.tsx`) encuentra el objetivo dentro del portal; si no, renderizar el contenido de la hoja en línea dentro de la escena.

### F6-T3 — e2e del tutorial

- **Archivos:** `e2e/customer-tutorial.spec.ts`.
- **Cambio:** actualizar los totales de pasos y cualquier selector de las escenas eliminadas. La prueba de que el tutorial no hace llamadas tRPC ni toca el pedido real debe seguir igual.

### F6-T4 — Borrar lo que quedó sin uso

- **Archivos:** en `src/app/(storefront)/checkout/_components/`: `checkout-client.tsx`, `checkout-steps.ts`, `checkout-steps.test.ts`, `checkout-stepper.tsx`, `checkout-order-step.tsx`, `checkout-delivery-step.tsx`, `checkout-address-step.tsx`, `checkout-payment-step.tsx`, `checkout-review-step.tsx`, `checkout-summary.tsx`, `checkout-result-panel.tsx`, `address-form-dialog.tsx`. Además `my-orders-client.tsx`, `cart-summary.tsx` y `customer-order-journey-view.tsx`.
- **Aceptación:** `pnpm typecheck` y `pnpm madge` sin referencias rotas ni ciclos nuevos.

### F7-T1 — Documentación

- Ver §13.

### F7-T2 — Revisión visual

- **Cambio:** comparar cada pantalla con el prototipo a 1280 px y a 390 px, con y sin dirección guardada, en los cinco estados del pedido. Sin desborde horizontal.

## 9. Temas transversales

- **Datos, esquema y migración:** no hay. Los campos nuevos son de salida. Los carritos viejos en `atCheckout` sin pedido se cubren con S4.
- **Configuración:** ninguna variable nueva. Las URL de retorno de Mercado Pago (`successBackUrl`, `failureBackUrl`, `pendingBackUrl`) no cambian.
- **Seguridad y permisos:** `orders.resolvePaymentReturn` es protegida y no revela pedidos ajenos (F1-T5). El aviso de llegada nunca confía en la URL. Las hojas no muestran datos bancarios: eso sigue saliendo solo de `loadExternalPaymentInstructions`, con el intento pendiente (ADR 0010).
- **Observabilidad:** los eventos `mercadopagoCheckoutRedirectReady` y `mercadopagoCheckoutFailed` se conservan. No se agregan nuevos.
- **Accesibilidad:** foco dentro de las hojas y devuelto a la fila que las abrió; botón deshabilitado con el motivo asociado por `aria-describedby`, como hace hoy `cart-summary.tsx`; el aviso de cierre sin región viva, igual que `ClosingCountdown`.

## 10. Riesgos de implementación

- **Orden de borrado.** Los componentes viejos del checkout los importa el tutorial. No borrarlos antes de la fase 6.
- **Tipos de los datos de ejemplo.** Cualquier campo nuevo en `orderListItemSchema` o `checkoutStateSchema` rompe `tutorial-fixtures.ts`. Completarlos en la misma tarea.
- **`orderStatusLabelMap` compartido.** Cambiarlo altera el admin y su glosario. Usar la función nueva.
- **Etiqueta del método en la base.** «Pago externo» está guardado en `payment_method.label`. No migrarlo ni mostrarlo al cliente.
- **Carrera con el arranque del pedido.** `checkout.start` falla si el pedido del invitado todavía no llegó al servidor. Respetar `canStartCheckout`.
- **Carrera entre editar y confirmar.** Desde la fase 1 el carrito sigue editable hasta confirmar. Si una mutación del carrito se confirma en los milisegundos entre que `confirmAndPay` lee los productos y hace su commit, el pedido guarda las cantidades viejas y el carrito congelado las nuevas. Las mutaciones del carrito no corren en transacción serializable ni bloquean la fila del carrito, así que Postgres no detecta el conflicto. La carrera ya existía con el flujo viejo, con otra forma. En la fase 3, `FinishOrder` no debe permitir confirmar mientras haya una mutación del carrito en curso (`useCartActions().isPending`). Endurecerlo en el servidor (bloquear la fila del carrito en las mutaciones y en la confirmación) queda en §15.
- **Clave de idempotencia.** Si se renueva en cada render, se abren intentos duplicados; si no se renueva después de cambiar el medio de pago, el servidor devuelve el intento anterior.
- **Layouts de Next.** La lista vive en el layout y no se recarga sola; usar `router.refresh()` después de mutaciones.
- **Portales y tutorial.** Ver F6-T2.
- **`searchParams` asíncrono.** Ver F5-T1.

## 11. Pruebas y validación

- **Tests nuevos:** `finish-order.test.ts`, `order-display.test.ts`, `order-arrival.test.ts`, `order-headline.test.ts`, casos en `customer-order-journey.test.ts`, `weekly-closing.test.ts`, `checkout.payment-switch.test.ts`, `checkout.transaction-queries.test.ts` y `tutorial-invitation.decision.test.ts`; e2e `checkout-en-tu-pedido.spec.ts`.
- **Tests que cambian:** `tutorial-script.test.ts`, `tutorial-fixtures.test.ts`, `tutorial-scene.test.tsx`, `order-detail-view.test.tsx`, `order-list-view.test.ts`, `e2e/customer-tutorial.spec.ts`.
- **Tests que se borran:** `checkout-steps.test.ts`.
- **Comandos:** `pnpm test`, `pnpm check`, `pnpm typecheck`, `pnpm build`, `pnpm test:e2e`.
- **Pruebas manuales con sesión** (no hay login en e2e, S5):
  1. Primera compra sin dirección: agregar la dirección en la hoja y confirmar con transferencia.
  2. Cliente con dirección: una casilla y un botón.
  3. Cambiar una cantidad en `/cart` después de abrir las hojas: se puede, y el total del panel cambia.
  4. Confirmar, volver a `/cart`, cambiar a Mercado Pago y confirmar: se reemplaza el intento.
  5. Declarar el comprobante: la lista dice «Verificando tu pago» y «Volver a editar el pedido» desaparece.
  6. Mercado Pago en sandbox: aprobado, pendiente y rechazado vuelven al pedido con el aviso correcto.
  7. Pedido en dos partes: un recorrido, leyenda «X de Y productos» y etapa por producto.
  8. Punto de retiro sin puntos activos: la opción no aparece.
- **Criterio de éxito:** todo lo anterior, más la definición de hecho (§16).

## 12. Despliegue, migración y vuelta atrás

- **Secuencia:** la fase 1 puede salir sola; es compatible con la interfaz actual. Las fases 2 a 6 salen juntas.
- **Sin bandera:** el cambio es de interfaz y no altera datos. Una bandera duplicaría dos flujos de pago.
- **Vuelta atrás:** revertir los commits de las fases 2 a 6 devuelve `/checkout`. La fase 1 puede quedar: el checkout viejo funciona igual con un carrito sin congelar.
- **Después de publicar:** revisar en los registros `mercadopagoCheckoutFailed` y, en el admin, que no aparezcan carritos «En checkout» sin pedido creados después del despliegue.
- **Coordinación:** avisar a QA que los tickets de checkout y de seguimiento cambian de pasos, y que #126 (términos) ahora se lee en un diálogo.

## 13. Documentación

- `docs/plans/checkout-redesign.md` y `docs/plans/customer-funnel-order-tracking-redesign.md`: nota de enmienda al inicio, con enlace a este plan.
- `docs/plans/customer-tutorial.md`: escenas y objetivos nuevos.
- `docs/adr/0015-cart-freezes-when-the-customer-confirms.md`: marcado como implementado al cerrar la fase 3.
- `docs/adr/0012-tutorial-runs-in-simulated-scenes.md`: revisar si nombra las escenas eliminadas.
- `prisma/schema.prisma`: el comentario de `CartStatus.atCheckout` («The user has started checkout…») pasa a describir un carrito con un pedido esperando el pago. Es solo un comentario; no genera migración.
- `src/features/admin/glossary/data/cart.ts`: la definición de `CartStatus.atCheckout` en el glosario del admin, con el mismo sentido. La etiqueta «En checkout» no cambia.
- `README.md`, si describe el flujo de compra.
- **CONTEXT.md (ya actualizado el 27/11/2026):** *External payment* (el cliente lee «Transferencia bancaria»), *Journey stage* (las seis etapas del cliente), *Customer order status* (nuevo), *Checkout* y *Leave checkout* (se congela al confirmar), *Weekly closing* (también en el pedido) y, en la fase 3, *Tutorial invitation* (tampoco aparece en «Tu pedido»).
- **ADR creados:** `docs/adr/0015-cart-freezes-when-the-customer-confirms.md`.

## 14. Riesgos y compromisos

| Riesgo | Por qué importa | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- | --- |
| Choque con el trabajo de Mercado Pago en curso | Los dos cambios tocan `checkout.service.ts` | Alta si no se respeta S1 | Alto | Fase 0; no empezar con esos archivos modificados |
| El cliente edita sin querer un pedido que espera el pago y lo cancela | Ya pasa hoy; el flujo nuevo lo hace más visible | Media | Medio | Modo «esperando el pago» en solo lectura (F3-T6) y aviso al cancelar (F3-T7) |
| El retorno de Mercado Pago llega sin referencia | El cliente no cae en su pedido | Baja | Bajo | Mensaje de respaldo (F5-T2) |
| El aviso de cierre promete algo que Operaciones no cumple | Ticket #127 sin definir | Media | Medio | Regla conservadora (`orderJoinsNextClosing`) y textos condicionales («si el pago entra antes») |
| El tutorial queda desalineado | ADR 0012 exige componentes reales | Media | Medio | Fase 6 obligatoria antes de publicar; e2e del tutorial |
| El lado a lado no entra en pantallas intermedias | Entre 900 y 1100 px la columna del pedido queda angosta | Media | Bajo | El corte a una columna es en `lg`; revisar a 1024 px |
| Reintentar el pago pide un paso de más | El botón del pedido lleva a «Tu pedido» | Segura | Bajo | Diferido: `checkout.retryPayment` |

## 15. Preguntas abiertas

- **Bloqueantes:** ninguna.
- **No bloqueantes (seguir con el default y anotarlo):**
  1. ¿«Verificando tu pago» como cuarto estado (D15)? Default: sí. Si Flavio prefiere solo los tres aprobados, `customerOrderStatusView` devuelve «Esperando tu pago» en esos casos.
  2. ¿Qué pago viene preseleccionado? Default: el primero que devuelve el servidor (hoy Mercado Pago), como ahora. El prototipo muestra la transferencia.
  3. ¿Sumar productos con un pedido esperando el pago debe seguir cancelándolo? Default: sí, con aviso (F3-T7). Es el comportamiento actual del servidor.
  4. ¿El aviso de cierre en pedidos ya pagos se muestra con la regla de F2-T6? Default: sí. La alternativa es mostrarlo solo mientras falta el pago.
  5. Verificar en sandbox que el retorno trae `external_reference` (S2).
  6. ¿Bloquear la fila del carrito (`SELECT … FOR UPDATE`) en `confirmAndPay` y en las mutaciones de `cart.service.ts` para cerrar la carrera de §10? Default: no por ahora; la fase 3 lo evita desde la pantalla.
- **Mejoras opcionales:** mostrar el punto de retiro en un mapa dentro de la hoja; recordar la última entrega elegida entre pedidos (hoy el borrador dura la sesión).

## 16. Definición de hecho

- [x] Un carrito no pasa a `atCheckout` hasta que `confirmAndPay` crea el pedido (tests de F1-T1 y F1-T2).
- [ ] Desde `/cart`, un cliente con dirección guardada confirma con una casilla y un botón. *Verificado en la pantalla con datos de ejemplo; falta la confirmación real con sesión (§11, prueba 2).*
- [ ] Confirmar con transferencia lleva a `/my-orders/{id}` con el aviso y los datos para transferir. *Falta prueba manual con sesión (§11, prueba 1).*
- [ ] Las tres rutas de retorno de Mercado Pago llevan al pedido con el resultado real. *Cubierto con test unitario; falta la compra en sandbox (§11, prueba 6, y S2).*
- [x] `/checkout` redirige a `/cart`.
- [x] `/my-orders` muestra lista y pedido lado a lado desde `lg`, y lista → pedido en teléfono.
- [x] El cliente no ve «Pago externo», «Pendiente», «En procesamiento», «Completado», «Código de armado», «Transacción #», «Sin ref.» ni «checkout».
- [x] El admin no cambió ningún texto. *Salvo la definición de `CartStatus.atCheckout` en su glosario, que ahora describe lo que significa.*
- [x] El aviso de cierre aparece en «Tu pedido» y en los pedidos que todavía entran en ese cierre.
- [x] El tutorial recorre el flujo nuevo y `e2e/customer-tutorial.spec.ts` pasa.
- [x] `pnpm test`, `pnpm check`, `pnpm typecheck`, `pnpm build` y `pnpm test:e2e` en verde. *e2e con la falla previa de `home-combo.spec.ts`, que depende de los datos de QA.*
- [x] Documentación de §13 hecha y ADR 0015 marcado como implementado.

## 17. Instrucciones para quien lo ejecute

- Usar este plan como fuente principal. Leer primero: `CONTEXT.md` (secciones «Fulfillment and operations» y «Catalog and cart»), `docs/adr/0015-cart-freezes-when-the-customer-confirms.md`, `docs/adr/0010-external-payments-are-admin-settled.md`, `docs/adr/0012-tutorial-runs-in-simulated-scenes.md`, `docs/adr/0013-transfer-discount-is-an-attribute-of-the-payment-attempt.md`, y abrir `docs/prototypes/checkout-seguimiento/variante-c.html` en el navegador (la barra negra cambia de pantalla, de tipo de cliente y de estado del pedido).
- Respetar las decisiones D1 a D15. No cambiar lo listado en «No entra» ni en «No se debe romper» (§3).
- Verificar antes de modificar: que el trabajo de Mercado Pago esté commiteado (S1); los nombres de las funciones de `checkout.service.ts`; si `checkout.types.ts` deriva sus tipos de los esquemas; si los correos usan las etiquetas de etapa (F2-T2).
- Ejecutar las fases en orden y respetar las dependencias. Un commit por fase.
- Implementar al nivel indicado: escribir el código que describen las tareas, sin rediseñar. El prototipo manda en el aspecto; este plan manda en el comportamiento. Si chocan, gana el plan.
- Las preguntas de §15 no bloquean: seguir con el default y dejar anotado el supuesto en el resultado.
- Si aparece un cambio que toca las reglas de pago o el esquema, frenar y preguntar.

## 18. Resultado

### Fase 0 — 27/11/2026

El trabajo pendiente se separó en dos commits sobre la rama `checkout-en-tu-pedido`, creada desde `main` en `70bf288`. Cada uno se verificó por separado: typecheck, Biome y suite completa.

- `f4a0d57` fix(payments): Mercado Pago sandbox de punta a punta.
- `65e3d15` feat(notifications): correos transaccionales con Resend.
- `e1bf358` docs(checkout): prototipos, ADR 0015, este plan y el glosario.

### Fase 1 — 27/11/2026

- **F1-T1 y F1-T2.** `start` ya no congela. `confirmAndPay` pasa el carrito a `atCheckout` después de comparar el monto y antes de crear el pedido, dentro de la misma transacción. Se quitó el rechazo «El checkout no está iniciado». Congela siempre que el carrito no esté en `atCheckout`, aunque haya un pedido vivo: es más estricto que lo que decía la tarea y no cambia ningún caso real.
- **F1-T3.** `CheckoutState.liveOrder` (`checkoutLiveOrderSchema`) con `id`, `code`, `delivery`, `paymentMethodId`, `provider` y `release`. `orderDetailSelect` suma `pickupPointId`.
- **F1-T4.** `OrderListItem` suma `itemNames` y `receiptDeclared` (no `paymentReported`, para coincidir con *Declared receipt* del glosario). `receiptDeclared` solo es verdadero si el intento mostrado sigue pendiente.
- **F1-T5.** `orders.resolvePaymentReturn` responde `{ orderId }` o `null`. El parser de la referencia se movió a `mercadopago-preference.decision.ts` y ahora rechaza ids fuera del rango de `int`, que antes hacían fallar la consulta de la conciliación.
- **Tests:** `checkout.customer-reads.test.ts` [NEW] (20 casos), tres casos nuevos en `checkout.payment-switch.test.ts`, uno en `checkout.transaction-queries.test.ts` y once en `mercadopago-preference.decision.test.ts`. Suite completa: 2459 aprobados, 21 omitidos. Typecheck y Biome limpios.
- **Compatibilidad:** la pantalla actual de `/checkout` sigue funcionando. La única diferencia visible es que abrirla ya no congela el pedido.
- **Hallazgo:** la carrera entre editar y confirmar (§10). No bloquea.

### Fase 2 — 27/11/2026

- **F2-T1.** `customerOrderStatusView` en `order-display.ts`, con los cuatro estados del cliente («Esperando tu pago», «Verificando tu pago», «En curso», «Entregado»). Lo usan Mis pedidos, el pedido y el resultado del checkout actual. `orderStatusChipConfigMap` se eliminó: no le quedaban consumidores. El filtro dice «Entregados». `orderStatusLabelMap` (admin) no cambió.
- **F2-T2.** Etapas «Compra al proveedor» y «En viaje», y descripciones nuevas para las seis. No mencionan Buenos Aires: el tutorial aclara que el proveedor suele estar en otra provincia. Los correos no usan estas etiquetas. Los títulos del tutorial y el e2e se actualizaron.
- **F2-T3.** `src/features/checkout/payment-method-copy.ts`. Ninguna pantalla del cliente lee ya `paymentMethod.label`. Los datos de ejemplo del tutorial siguen guardando «Pago externo», como la base, y se muestran a través de esta función.
- **F2-T4.** `finish-order.ts` con `resolveFinishSelection`, `finishBlockers`, `finishBlockerMessages` y `toConfirmInput`. Cambio respecto de la tarea: el borrador gana sobre el pedido vivo (ver la tarea).
- **F2-T5.** `buildOrderLineStages` lee el recorrido de cada producto, no la vista unificada, así los avisos llegan sin el prefijo del nombre y no hizo falta sumar `cartItemId` a los avisos. `summarizeOrderJourney` marca como completa la etapa «Entrega» cuando el pedido se entregó (el servidor la deja como actual) y `delivered` exige que se hayan entregado todos los productos activos.
- **F2-T6.** `ClosingNotice` y, en `weekly-closing.ts`, `formatClosingCountdown` y `orderJoinsNextClosing`. Cambio respecto de la tarea: la regla compara el cierre que le tocaba al pedido según su fecha con el próximo cierre, en vez de restar siete días, así sigue valiendo si el admin mueve el día. Recibe `now` y `schedule` en lugar de `nextClosing`. Un pedido confirmado en el instante exacto del cierre entra en el siguiente, como dice el glosario. El componente todavía no se muestra en ninguna pantalla: lo ubican las fases 3 y 4.
- **F2-T7.** `order-arrival.ts` con `parseOrderArrival` y `orderArrivalBanner`, que recibe el intento que muestra el pedido y nunca anuncia un pago por el parámetro de la URL solo.
- **Verificación:** suite completa 2521 aprobados, 21 omitidos; typecheck y Biome limpios; `e2e/customer-tutorial.spec.ts` 11 de 11, corrido contra la base de `.env` (solo lectura).

### Fase 3 — 27/11/2026

- **F3-T1.** `use-checkout-options.ts` y `src/store/checkout-draft-store.ts` (borrador por usuario en `sessionStorage`, sin la aceptación de términos). Cambio respecto de la tarea: el hook lo usa `CartClient`, no el panel, porque la lista de productos también necesita saber si hay un pedido esperando el pago. Vuelve a leer con `getState` cada vez que el carrito entra o sale de `atCheckout`.
- **F3-T2.** `finish-order-panel.tsx` con `FinishOrderPanel`, `FinishOrderMobileBar`, `FinishOrderGuestPanel`, `FinishOrderLoadingPanel`, `FinishOrderErrorPanel` y `FinishOrderNoticePanel` (productos del invitado sin agregar). `checkout-charge.ts` y `selectable-tile.tsx` se movieron a `src/features/checkout/`.
- **F3-T3.** `delivery-sheet.tsx`, `payment-sheet.tsx`, `address-form.tsx`, `terms-dialog.tsx` y `src/shared/common/delivery-area.ts`. La hoja de entrega permite editar una dirección, como el checkout anterior.
- **F3-T4.** `finish-order.container.tsx`. La clave de idempotencia se renueva cuando cambia la entrega o el medio de pago, y después de cada confirmación exitosa. El botón queda deshabilitado mientras hay una edición del pedido en curso (§10). Con un pedido esperando la misma transferencia, el botón lleva al pedido sin confirmar de nuevo. En un pedido que espera el pago no se vuelve a pedir la aceptación de términos: el pedido conserva la que dio al confirmar.
- **F3-T5 y F3-T6.** «Tu pedido de la semana» con el aviso de cierre, los productos y el panel. Se borró `cart-summary.tsx`. Los productos quedan en solo lectura solo si hay un pedido esperando el pago (o mientras se carga el estado de un carrito congelado).
- **F3-T7.** Aviso «Cancelamos el pedido que esperaba el pago. Ya podés editarlo.» cuando una edición, un combo o «Volver a editar el pedido» liberan el carrito. Un carrito que el flujo viejo dejó congelado sin pedido también dispara el aviso al liberarse; desaparece con esos carritos.
- **F3-T8.** `/checkout` redirige a `/cart`. Mini-pedido: con sesión, un solo botón «Finalizar pedido»; sin sesión, ingresar (vuelve a `/cart`) y «Ver pedido completo». La invitación al tutorial no aparece en `/cart`. Los componentes del checkout viejo siguen en el repositorio porque los usa el tutorial; se borran en la fase 6.
- **F3-T9.** `e2e/checkout-en-tu-pedido.spec.ts`, 2 de 2.
- **Verificación:** suite completa en verde; typecheck y Biome limpios; e2e 61 de 63. Las dos fallas (`catalog-public-copy.spec.ts` y `home-combo.spec.ts`) se reproducen igual sin estos cambios: dependen de los datos de la base de QA (falta el combo «(e2e)»). El panel con sesión se revisó a 1280 y 390 px en una página temporal con los datos del tutorial (listo, transferencia, primera compra con la hoja de entrega, hoja de pago, pedido esperando el pago y transferencia informada), y se corrigió un desborde horizontal de la grilla en teléfono. No hay login en e2e, así que la confirmación real con transferencia y con Mercado Pago sigue pendiente de prueba manual (§11, pruebas 1 a 6).

### Fase 4 — 27/11/2026

- **F4-T1.** `my-orders/layout.tsx` con `MyOrdersRouteShell` (`my-orders-shell.tsx`), `OrderListPane` y `OrderDetailSection`. La lista se lee una vez por request con `loadMyOrders` (`cache` de React), porque el layout y la página índice la necesitan. Cada fila se nombra por sus productos (`formatOrderItemNames`) y lleva estado, total y fecha (`formatDateMedium`, nuevo). Los filtros solo aparecen con más de un estado y pasan a otra línea en vez de cortarse. `my-orders-client.tsx` queda para el tutorial hasta la fase 6.
- **F4-T2.** `src/features/tracking/order-journey-track.tsx`. `TrackingJourneyStepper` no cambió.
- **F4-T3.** `OrderDetailView` recibe `journeyItems` y arma adentro el recorrido, el resumen y la etapa de cada producto; `orderHeadline` da título y frase. Los datos de ejemplo del tutorial suman `journeyItems`. Se quitaron «Código de armado», «Líneas comerciales confirmadas», «Transacción #» y «Referencia: Sin ref.»; la referencia del proveedor queda como «Número de operación» solo cuando existe. Las fotos de las líneas salen del snapshot (`readSnapshotImageUrl`, nuevo) y se dibujan como fondo, igual que en el pedido. Cambio respecto de F2-T5: la leyenda de un pedido unificado es solo «Etapa N de 6», porque el título ya explica la etapa, y un recorrido con las seis etapas completas también cuenta como entregado.
- **F4-T4.** `ExternalPaymentPanel` con «Datos para transferir», «Copiar todo» (`formatTransferFields`) y «¿Ya transferiste?». `OrderPaymentPending` para un pago de Mercado Pago pendiente o rechazado, con un botón a «Tu pedido».
- **F4-T5.** `src/features/weekly-closing/order-closing-notice.tsx`.
- **Glosario:** *Order journey* describe el recorrido único más la etapa de cada producto.
- **Verificación:** suite completa en verde; typecheck y Biome limpios; e2e 61 de 63 (las mismas dos fallas previas de datos de QA). Revisión visual a 1280 y 390 px en una página temporal con los datos del tutorial: falta la transferencia (con el aviso de llegada), verificando la transferencia, preparación, en dos partes con un aviso, entregado y la lista sola en teléfono. No queda desborde horizontal. Sin login en e2e, el pedido real sigue pendiente de prueba manual.

### Fase 5 — 27/11/2026

- **F5-T1.** Las tres rutas de retorno leen `external_reference` (`readExternalReference`), buscan el pedido con `findReturnOrderId` y redirigen a `/my-orders/{id}?llegada=mp` (`orderReturnPath`). La búsqueda nunca lanza error, así que el `redirect` queda fuera de cualquier `try`. Sin sesión, sin referencia o con una referencia ajena, muestran el respaldo.
- **F5-T2.** `MercadoPagoReturnPage` con un texto por ruta que no afirma que el pago se aprobó, porque la ruta solo dice qué botón trajo de vuelta al cliente. Botón «Ver mis pedidos»; en el rechazo, también «Ir a tu pedido». Se quitó el recuadro de conciliación.
- **Tests:** `mercadopago-return.test.ts` y `find-return-order.test.ts` [NEW], y un caso nuevo en `e2e/checkout-en-tu-pedido.spec.ts` para las tres rutas sin sesión. Suite completa: 2556 aprobados, 21 omitidos; typecheck y Biome limpios; e2e del checkout y del tutorial, 14 de 14.
- **Pendiente:** S2 sigue sin verificar. Hay que confirmar en sandbox que Mercado Pago agrega `external_reference` a la URL de retorno; si no lo hace, el cliente ve el respaldo y llega a su pedido desde «Ver mis pedidos».

### Fase 6 — 27/11/2026

- **F6-T1.** La escena `cart` pasa a `{ signedIn, sheet }`; se eliminaron `checkout` y `checkoutResult`; `orderDetail` suma `arrival?: "mp"`. Objetivos nuevos: `cart-finish`, `finish-delivery`, `finish-payment`, `finish-confirm` y `order-arrival`. Pasos nuevos: «Listo para finalizar», «Finalizás en la misma pantalla», «Cómo lo recibís», «Cómo pagás», «Confirmás» (solo en la versión completa) y «Volvés a tu pedido». Las versiones siguen con 12 y 21 pasos, así que los números de paso de los e2e no cambiaron. Cambio respecto de la tarea: la llegada es la de Mercado Pago (`arrival: "mp"`), porque el recorrido de ejemplo paga con Mercado Pago.
- **F6-T2.** `CartScene` usa `FinishOrderPanel` y las hojas reales con `modal={false}` e `inert`, como el mini-pedido, así no bloquean los controles del tutorial. `MyOrdersScene` usa `MyOrdersShell` y `OrderListPane`; `OrderDetailScene`, el aviso de llegada. Los datos de ejemplo pierden `paymentResult` y `deliverySelection`, y el carrito del panel queda `pending`. `finish-delivery` y `finish-payment` son portales: quedan con los objetivos que solo existen en el navegador.
- **F6-T3.** `e2e/customer-tutorial.spec.ts`: el paso 8 comprueba la hoja de pago (precio con transferencia y ahorro).
- **F6-T4.** Se borraron los doce archivos de `checkout/_components`, `my-orders-client.tsx` y `customer-order-journey-view.tsx`. Ningún import roto y ningún ciclo nuevo: los seis ciclos fuera de `generated/` son los de la base.
- **Glosario:** *Tutorial* ya no nombra el checkout.
- **Verificación:** suite completa 2547 aprobados; typecheck y Biome (todo el repositorio) limpios; e2e 63 de 64 con la falla previa de `home-combo.spec.ts` (`catalog-public-copy.spec.ts` es intermitente con los datos de QA). La corrida completa registra seis errores de hidratación en el navegador, los mismos seis que en el commit anterior; ningún spec los produce corrido solo.

### Fase 7 — 27/11/2026

- **F7-T1.** Notas de enmienda al inicio de `checkout-redesign.md`, `customer-funnel-order-tracking-redesign.md` y `customer-tutorial.md`. ADR 0012 actualizado (escenas y vistas compartidas). `docs/schema-reference.md`: el carrito se congela al confirmar. Comentario de `CartStatus.atCheckout` en `prisma/schema.prisma` (solo comentario, sin migración) y su definición en el glosario del admin. README: tras vencer un pago, se confirma de nuevo desde Tu pedido.
- **Textos del servidor.** Seis mensajes de error que ahora llegan al cliente en «Tu pedido» decían «checkout»; se reescribieron (por ejemplo, «El pago venció. Volvé a confirmar desde Tu pedido para generar uno nuevo.»).
- **F7-T2.** Revisión final con el tutorial, que usa los componentes reales: finalizar, hoja de entrega, hoja de pago, llegada, Mis pedidos y una etapa del seguimiento, a 1280 y 390 px, sin desborde ni errores de página. Las demás pantallas y estados se revisaron en las fases 3 y 4.
- **Hallazgo resuelto el 27/11/2026:** en el tutorial, la barra «Modo tutorial» tapaba el encabezado de las hojas laterales y su botón de cerrar, también en el mini-pedido. La barra tiene ahora un alto fijo (`h-9`) y las hojas laterales de las escenas empiezan debajo (`BELOW_TUTORIAL_BAR` en `tutorial-mode-bar.tsx`). La barra sigue por encima de las hojas, así «Salir del tutorial» queda siempre a mano. Las pantallas reales no cambian.
- **Verificación final:** typecheck, Biome sobre todo el repositorio, suite completa (2547 aprobados) y `pnpm build` en verde.

### Pendiente para cerrar

1. Pruebas manuales con sesión de §11 (1 a 8), sobre todo confirmar con transferencia, cambiar a Mercado Pago desde «Falta el pago», informar un comprobante y «Volver a editar el pedido».
2. Una compra en sandbox para confirmar S2: que Mercado Pago agrega `external_reference` a la URL de retorno.
3. ~~Revisar los errores de hidratación de la corrida completa de e2e.~~ Resuelto el 27/11/2026: venían de `/products`, que precargaba el catálogo sin esperarlo y lo leía con `useQuery`. Ver la nota siguiente.
4. Decidir las preguntas no bloqueantes de §15 (estado «Verificando tu pago», pago preseleccionado, bloqueo de la fila del carrito).

### Errores de hidratación del e2e — 27/11/2026

- **Causa.** `/products` precargaba el catálogo sin esperar (`void api.catalog.list.prefetch()`), el cliente de consultas manda al navegador también las consultas pendientes, y `ProductsClient` lo lee con `useQuery`, que no suspende. El servidor renderizaba «0 productos»; si la respuesta llegaba al navegador antes de que React hidratara, el cliente renderizaba la lista entera. Solo se veía con el servidor cargado (la suite completa en paralelo), pero puede pasar en producción según la latencia. No lo trajo este plan.
- **Descartado: esperar la precarga.** Abrir un producto, cambiar un filtro o una página es un `router.push` que vuelve a ejecutar la página, así que cada una de esas acciones quedaba esperando a la base. `catalog-public-copy` pasó a fallar siempre por tiempo.
- **Descartado: `useSuspenseQuery` con `Suspense`.** Elimina el error y manda los productos en el HTML, pero los muestra antes de que la página sea interactiva: los clics tempranos se pierden. Dos tests e2e empezaron a fallar de forma intermitente por eso, y a un usuario con un teléfono lento le pasaría lo mismo.
- **Elegido: sin precarga.** Servidor y cliente arrancan con el esqueleto y el cliente pide el catálogo al montarse, como cualquier otra lectura con `useQuery`. Cambia una línea (`src/app/(storefront)/products/page.tsx`). Costo: los productos aparecen un viaje de red más tarde que con la precarga.
- **Verificación:** tres corridas completas de e2e sin errores de hidratación (antes, entre cuatro y seis por corrida); 63 de 64 en cada una, con la falla de datos de `home-combo.spec.ts`. `catalog-public-copy.spec.ts`, que fallaba de forma intermitente, pasó en las tres.

### e2e sobre la base local — 27/11/2026

- **Corrección de lo informado antes.** Las corridas de e2e de las fases 2 a 7 se hicieron contra la base de QA del `.env` (Neon), porque la local estaba apagada. Ahí fallaba `home-combo.spec.ts`: busca el combo «Combo desayuno (e2e)», que solo existe en el seed de pruebas. No era un problema de datos de QA ni del test.
- **Corrida correcta:** contenedor local `coco-e2e-postgres` (puerto 5433), `prisma db push` y `pnpm db:seed:test`, con `DATABASE_URL` y `APP_ENV=development` pasados solo a esos comandos. Resultado: **64 de 64**, sin errores de hidratación.
- **Para que no se repita:** el README tiene una sección «End-to-end tests» con el procedimiento, y `home-combo.spec.ts` dice qué falta cuando no encuentra el combo.
