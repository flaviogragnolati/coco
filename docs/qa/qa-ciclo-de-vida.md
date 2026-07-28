# QA — Ciclo de vida del pedido (cliente + admin)

> **Iteración:** ciclo de vida completo, desde cargar un item hasta la entrega y el cierre del pedido.
> **Fecha de creación:** 2026-07-27.
> **Cómo usar:** cada test tiene un número, el rol que lo ejecuta, la feature que valida, el flujo paso a paso y el resultado esperado.
> **Dónde se lleva el estado:** en `/admin/qa-tickets`, no acá. Ese es el tracking vivo de la pasada — quién tomó cada caso, cómo salió y con qué nota. Este documento queda como referencia de origen del contenido de los tests; las columnas **Estado** y **Notas** se conservan solo como registro de la transcripción. Poblar la tabla con `pnpm qa:seed`, que reaplica el texto de acá sin pisar el estado ya cargado.

## Precondiciones del entorno

- Base de datos seedeada (`pnpm db:seed`) y app corriendo (`pnpm dev`).
- Un usuario **cliente** con cuenta de Google, un usuario **admin** y un usuario **superadmin** (la config de Mercado Pago solo la guarda un superadmin).
- Mercado Pago en modo **sandbox** habilitado desde `/admin/payments` → tab Config (para la sección D). Los tests de pago "mock" corren con MP deshabilitado.
- Oráculos automáticos de referencia: `pnpm fulfillment:e2e` (corrida de 12 pasos por la capa de servicios) y `pnpm db:seed-verify` (derivados = almacenados, cero diagnósticos críticos).

## Rutas principales

- Cliente: `/products`, `/cart`, `/checkout`, `/my-orders`, `/my-orders/[id]`, `/profile`, `/login`.
- Admin: `/admin/payments`, `/admin/carts`, `/admin/operations`, `/admin/supplier-orders`, `/admin/lots`, `/admin/packages`, `/admin/shipments`, `/admin/carrier-orders`, `/admin/roll-overs`, `/admin/tracking`.

---

## A. Acceso y sesión

| # | Título | Quién | Feature | Flujo | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 1 | Login con Google | Cliente | Autenticación (better-auth, Google OAuth) | 1) Ir a `/login`. 2) Click en "Continuar con Google". 3) Completar el OAuth. | Redirige al home (o al `callbackURL`), el navbar muestra el menú de usuario con "Perfil", "Ver mis pedidos" y "Cerrar sesión". | ☐ | |
| 2 | Checkout exige sesión | Cliente | Guard de checkout | 1) Sin sesión, agregar un producto al carrito. 2) Ir a `/cart` y click en "Registrarme o iniciar sesión" (o navegar directo a `/checkout`). 3) Loguearse. | `/checkout` redirige a `/login?callbackURL=/checkout`; después del login vuelve automáticamente al checkout con el carrito intacto. | ☐ | |
| 3 | Carrito de invitado se sincroniza al login | Cliente | Persistencia local + merge del carrito | 1) Sin sesión, agregar 2 productos desde `/products`. 2) Loguearse. 3) Revisar `/cart`. | Los items del invitado se conservan y se suman al carrito del servidor del usuario. Si un producto dejó de estar disponible, aparece el toast "Quitamos un producto que ya no esta disponible." | ☐ | |
| 4 | Cerrar sesión limpia el carrito local | Cliente | Logout + aislamiento entre usuarios | 1) Con sesión y carrito con items, menú de usuario → "Cerrar sesión". 2) Observar `/cart` sin loguearse. | Redirige a `/login`; el carrito local queda vacío y no muestra items del usuario anterior. | ☐ | |

## B. Catálogo y carrito

| # | Título | Quién | Feature | Flujo | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 5 | Catálogo lista solo productos vigentes | Cliente | Catálogo + términos de cliente vigentes | 1) Ir a `/products`. 2) Contrastar contra el admin: un producto inactivo o con términos vencidos. 3) Probar búsqueda, filtros de marca/unidad/precio y orden. | Solo aparecen productos activos con términos vigentes. El precio se muestra por bloque ("por bloque MOQ de {n}"). Búsqueda insensible a acentos; "Limpiar filtros" restaura el listado. | ☐ | |
| 6 | Agregar un item al carrito | Cliente | Alta de item (cantidad inicial = MOQ) | 1) En `/products`, click en "Agregar" sobre un producto. | El mini-carrito se abre, el producto figura con cantidad = MOQ, la tarjeta pasa a mostrar el badge "En carrito" con stepper y subtotal. | ☐ | |
| 7 | Reglas de cantidad MOQ / step / máximo | Cliente | Normalización de cantidades | 1) Con un producto con MOQ, step y máximo en el carrito: intentar bajar de MOQ con "−". 2) Subir con "+" hasta el máximo. 3) Tipear una cantidad fuera de step y salir del campo. | Nunca baja de MOQ; incrementa/decrementa de a step; el "+" se deshabilita al llegar al máximo; la cantidad tipeada se normaliza al múltiplo válido al perder foco (toast "Ajustamos la cantidad..." si lo corrige el servidor). | ☐ | |
| 8 | Producto sin step = cantidad fija | Cliente | Cantidad bloqueada en MOQ | 1) Agregar un producto cuyos términos no tienen step. 2) Intentar cambiar la cantidad. | La cantidad queda fija en el MOQ y los botones "−"/"+" están deshabilitados. | ☐ | |
| 9 | Subtotal por bloque, no lineal | Cliente | Precio por bloque (moqPrice + bloques × stepPrice) | 1) Producto con MOQ, step y stepPrice conocidos. 2) Llevar la cantidad a MOQ + 2 steps. 3) Verificar el subtotal de la línea. | Subtotal = moqPrice + 2 × stepPrice (no cantidad × precio unitario). Los totales del resumen se muestran por moneda. | ☐ | |
| 10 | Quitar item y vaciar carrito | Cliente | Bajas del carrito | 1) En `/cart`, quitar un item con el botón de basura. 2) Click en "Vaciar carrito". | El item desaparece (toast "Producto quitado del carrito"); "Vaciar carrito" deja el estado vacío ("Tu carrito está vacío") con CTA "Ver productos". | ☐ | |
| 11 | Edición desde el mini-carrito en checkout | Cliente | Carrito vivo durante el checkout | 1) Iniciar checkout con 2 items. 2) En el paso "Pedido", click "Editar carrito" y quitar un item desde el mini-carrito. 3) Quitar también el último item. | El resumen del checkout refleja el cambio al instante. Al vaciarlo aparece "Tu carrito está vacío" y los pasos posteriores se bloquean. | ☐ | |

## C. Checkout

| # | Título | Quién | Feature | Flujo | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 12 | Inicio del checkout (4 pasos) | Cliente | `checkout.start` + stepper | 1) Con carrito con items y sesión activa, ir a `/checkout`. | Se muestra el stepper "Pedido → Envío → Pago → Confirmar"; los pasos futuros están bloqueados con tooltip "Completá los pasos anteriores". En `/admin/carts` el carrito pasa a "En checkout". | ☐ | |
| 13 | Checkout sin carrito activo | Cliente | Guardas de `checkout.start` | 1) Con el carrito vacío, navegar directo a `/checkout`. | Alerta "No se pudo iniciar checkout" con el mensaje del servidor ("Tu carrito está vacío..." o "No encontramos un carrito activo...") y botones "Volver al carrito" / "Ver productos". | ☐ | |
| 14 | Alta y edición de dirección de envío | Cliente | Address book en el paso "Envío" | 1) En "Envío", click "Nueva". 2) Enviar el formulario vacío. 3) Completar Dirección, Ciudad, Provincia, Código postal, País y guardar. 4) Editarla con "Editar". | Los campos obligatorios muestran sus mensajes ("La dirección es obligatoria", etc.). Al guardar: toast "Dirección guardada", la tarjeta queda con badge "Seleccionada" y el paso se habilita. | ☐ | |
| 15 | Alta de método de pago con validación de datos sensibles | Cliente | Payment methods + `safePaymentTextSchema` | 1) En "Pago", click "Nuevo". 2) En "Referencia visible" pegar 16 dígitos corridos y guardar. 3) Corregir a una referencia corta ("Terminada en 1234") y guardar. | El primer intento se rechaza con "No ingreses números completos de tarjeta ni datos sensibles"; el segundo guarda con toast "Método de pago guardado" y el método queda "Seleccionado". | ☐ | |
| 16 | Términos obligatorios para confirmar | Cliente | Aceptación de términos | 1) Llegar al paso "Confirmar" con pedido, dirección y pago elegidos. 2) Intentar "Confirmar y pagar" sin activar el switch de términos. 3) Activarlo y confirmar. | Sin el switch el botón está deshabilitado (no se puede confirmar). Con el switch activo el pago se procesa. | ☐ | |
| 17 | Pago mock aprobado | Cliente | `confirmAndPay` camino feliz (gateway mock) | Precondición: MP deshabilitado. 1) Confirmar con un método cuya referencia NO contiene "fail"/"rechazo". 2) Observar el panel de resultado. 3) Ir a "Ver mi pedido". | Panel "Compra confirmada", carrito local vaciado, orden visible en `/my-orders` en "En procesamiento" con pago "Aprobado". En admin: carrito "Enviado", items "submitted". | ☐ | |
| 18 | Pago mock rechazado | Cliente | `confirmAndPay` camino de falla | 1) Crear un método de pago cuya referencia incluya "rechazo". 2) Confirmar el pedido. | Panel "No se pudo confirmar el pago" con alerta "Error del pago" ("El proveedor mock rechazó el pago."), orden en "Fallido", el carrito NO se vacía y "Intentar de nuevo" permite reintentar (nueva clave de idempotencia). | ☐ | |
| 19 | Carrito multi-moneda bloqueado | Cliente | `assertSingleCurrency` | 1) Armar un carrito con productos en dos monedas distintas (se permite en `/cart`, que muestra un total por moneda). 2) Intentar "Confirmar y pagar". | Error "El checkout de esta versión solo permite carritos con una moneda." El pedido no se crea dos veces ni queda a medias. | ☐ | |
| 20 | Producto deshabilitado durante el checkout | Cliente + Admin | Revalidación de términos | 1) Cliente arma carrito y llega al checkout. 2) Admin desactiva los términos/el producto. 3) Cliente intenta confirmar. | Error "Uno de los productos del carrito ya no está disponible. Revisá el carrito antes de continuar." El cliente puede volver al carrito y quitar el producto. | ☐ | |

## D. Pago con Mercado Pago (sandbox)

| # | Título | Quién | Feature | Flujo | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 21 | Redirección a Checkout Pro | Cliente | Preferencia MP + redirect | Precondición: MP habilitado en sandbox. 1) Confirmar el pedido con el método "Mercado Pago". | Toast "Redirigiendo a Mercado Pago" y navegación al checkout de MP (URL sandbox). En `/admin/payments` el intento queda "pending" con preferencia creada; la orden queda "Pendiente" y el carrito sigue "En checkout". | ☐ | |
| 22 | Pantallas de retorno informativas | Cliente | Back URLs success/failure/pending | 1) Completar (o abandonar) el pago en MP y volver por cada back URL. | Las tres pantallas ("Pago enviado a confirmación" / "Pago no confirmado" / "Pago pendiente") muestran la alerta "Estado sujeto a reconciliación" y NO cambian ningún estado por sí mismas. | ☐ | |
| 23 | Webhook aprobado acredita el pedido | Cliente + Sistema | Reconciliación por webhook firmado | 1) Pagar en sandbox con una tarjeta de prueba aprobada. 2) Esperar el webhook. 3) Refrescar `/my-orders/[id]` y `/admin/payments`. | Transacción "Aprobado" (completed), orden "En procesamiento", carrito "Enviado", items submitted. El journey del pedido muestra "Pedido confirmado" (puede demorar unos segundos: el evento de tracking es asíncrono). | ☐ | |
| 24 | Webhook rechazado / pendiente no rompe el carrito | Cliente + Sistema | Mapeo de estados MP | 1) Pagar con tarjeta de prueba rechazada. 2) Revisar orden, transacción y carrito. | Transacción "Rechazado"; la orden sigue "Pendiente" y el carrito sigue editable. Un pago `in_process` deja la transacción "En proceso" sin acreditar nada. | ☐ | |
| 25 | Webhook con firma inválida se rechaza | Admin | Validación de firma | 1) Enviar un POST a `/api/mercadopago/webhook` con `x-signature` inválida (curl). 2) Revisar `/admin/payments` → tab Eventos. | Respuesta HTTP 401; el evento queda registrado como "rejected" con "firma no válida" y no se procesa ningún cambio de estado. | ☐ | |
| 26 | Replay del webhook es idempotente | Admin | Idempotencia de reconciliación | 1) Sobre un pago ya acreditado, reenviar el mismo evento (botón "Reprocesar" en tab Eventos). | No se duplican submissions ni eventos de tracking (el timeline del item sigue con un solo "Pedido confirmado"); la transacción no retrocede de estado. | ☐ | |
| 27 | Abandono del redirect y reintento | Cliente | Orden pendiente + reintento de checkout | 1) Confirmar con MP y cerrar la pestaña de MP sin pagar. 2) Volver a `/checkout` y confirmar de nuevo. 3) Revisar `/my-orders` y `/admin/payments`. | La primera orden queda "Pendiente" con su transacción "pending" (comportamiento conocido). El segundo intento genera una orden nueva sobre el mismo carrito. **Registrar el resultado observado** — es un edge conocido a decidir producto. | ☐ | |

## E. Seguimiento del pedido (cliente)

| # | Título | Quién | Feature | Flujo | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 28 | Listado "Mis pedidos" con filtros | Cliente | Listado + filtros por estado | 1) Con varios pedidos en distintos estados, ir a `/my-orders`. 2) Probar los chips "Todos / En curso / Completados / Cancelados / Reintegros" y el toggle "Más recientes / Más antiguos". | Cada tarjeta muestra código, fecha, estado, items, pago y monto; los contadores de los chips corresponden al total (no a la vista filtrada); "Ver seguimiento" navega al detalle. | ☐ | |
| 29 | Detalle del pedido | Cliente | Snapshot de productos, resumen y pago | 1) Abrir `/my-orders/[id]` de un pedido pagado. | Se ven: "Pedido {code}", carrito de origen, card "Productos" (nombres, cantidades y montos del snapshot), "Resumen" (items, monto, dirección de envío) y "Pago" (estado, transacción, referencia, método). Un id ajeno o inválido da 404. | ☐ | |
| 30 | Journey vacío hasta acreditar el pago | Cliente | Inicio del seguimiento | 1) Abrir el detalle de un pedido cuyo pago aún no se acreditó. | Card "Seguimiento del pedido" con "El seguimiento comienza cuando se acredita el pago." — sin etapas. | ☐ | |
| 31 | Journey de 6 etapas avanza con el fulfillment | Cliente + Admin | Timeline de 6 etapas del cliente | 1) Con un pedido pagado, el admin avanza el ciclo completo (operación → proveedor → empaque → envío → entrega). 2) El cliente refresca el detalle después de cada hito. | Las etapas se completan en orden: Pedido confirmado → Preparación → Proveedor → Empaque → Envío → Entrega, con timestamps. La etapa actual queda destacada y las futuras en pendiente. | ☐ | |
| 32 | Journey unificado vs por item | Cliente | Roll-up del recorrido | 1) Pedido con 2 items en la misma etapa: ver el detalle. 2) Hacer que un item avance más que el otro (p. ej. uno empaquetado y otro no) y volver a ver. | Caso 1: un solo stepper ("Todos los productos avanzan juntos por este recorrido."). Caso 2: un recorrido por item con su etapa y badge propios. | ☐ | |
| 33 | Avisos de rollover / incidencia / retiro | Cliente + Admin | Notices del journey | 1) Admin genera: un recorte de proveedor (rollover), una demora de envío (incidencia) y una llegada a punto de retiro. 2) Cliente revisa el detalle en cada caso. | Aparecen avisos legibles: reprogramación ("Reprogramado...") con motivo, "Incidencia de fulfillment" (y su resolución), y "Disponible para retirar" — este último como aviso, sin marcar la etapa Entrega. | ☐ | |
| 34 | Pedido/producto cancelado congela el recorrido | Cliente | Estado cancelado en el journey | 1) Lograr un item cancelado (p. ej. rollover resuelto sin entrega). 2) Ver el detalle del pedido. | Banner "Este pedido fue cancelado" (o "Este producto fue cancelado") con "El recorrido queda congelado en la etapa alcanzada." | ☐ | |

## F. Admin — Pagos

| # | Título | Quién | Feature | Flujo | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 35 | Listado de intentos y detalle | Admin | `/admin/payments` tab Intentos | 1) Abrir `/admin/payments`. 2) Buscar por código de pedido o email. 3) Click en una fila. | Stats (Intentos/Pendientes/Completados/Eventos fallidos); el detalle muestra idempotencia, preferencia, pago, snapshots JSON y los eventos relacionados con validez de firma. | ☐ | |
| 36 | Reconciliar un intento manualmente | Admin | `reconcileAttempt` | 1) Elegir un intento con `providerPaymentId`. 2) Click "Reconciliar ahora". 3) Probar sobre un intento sin payment id. | Toast "Intento reconciliado" y el estado se actualiza según el recurso real de MP. Sin payment id el botón está deshabilitado. | ☐ | |
| 37 | Reprocesar e ignorar eventos | Admin | Gestión de eventos de proveedor | 1) Tab Eventos: "Reprocesar" un evento de tipo payment. 2) Intentar "Ignorar" con motivo de 3 caracteres. 3) Ignorar con un motivo válido. | Reprocesar re-ejecuta la reconciliación (toast "Evento reprocesado"). Ignorar exige motivo ≥ 5 caracteres y deja el evento "ignored" (toast "Evento ignorado"). | ☐ | |
| 38 | Config de MP protegida por superadmin | Admin + Superadmin | `updateProviderConfig` | 1) Como admin común, tab Config: intentar guardar un cambio. 2) Como superadmin, cambiar un valor, escribir `CONFIRMAR` y guardar. 3) Probar guardar sin escribir `CONFIRMAR`. | El admin común recibe FORBIDDEN. El superadmin sin la palabra exacta recibe 'Escribí "CONFIRMAR" para aplicar cambios...'. Con `CONFIRMAR` el cambio se aplica y los secretos solo se muestran como "Configurado"/"Falta". | ☐ | |

## G. Admin — Demanda y operaciones

| # | Título | Quién | Feature | Flujo | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 39 | Carritos operacionales y trazabilidad | Admin | `/admin/carts` + lineage | 1) Abrir `/admin/carts`, filtrar por usuario y estado. 2) En un carrito pagado, menú → "Rastrear". | El listado muestra estado, items, orden/pagos. La página de trazabilidad muestra órdenes y pagos, el lineage de cada item (asignación → lote → operación → paquete → envío), diagnósticos y timeline. | ☐ | |
| 40 | Crear borrador de operación | Admin | `operation.createDraft` | 1) `/admin/operations` → "Nueva operación". 2) Elegir ventana Desde/Hasta que cubra pagos acreditados, destino y "Incluir rollovers abiertos" activo. 3) Click "Revisar". | Toast "Borrador creado"; se abre la revisión con la demanda de la ventana. La operación figura como "Borrador" y no reserva nada (probar Hasta < Desde: se rechaza con mensaje). | ☐ | |
| 41 | Revisión con omisiones de item y de cliente | Admin | `operation.review` + omisiones | 1) En "Revisar {code}", marcar el checkbox de un item ("Omitir {code}"). 2) Marcar el checkbox de un cliente entero ("Omitir a {nombre}"). 3) Cerrar el diálogo y reabrirlo. | Los totales Elegible/Omitida se actualizan; el cliente omitido muestra "Cliente omitido" y sus filas quedan marcadas y deshabilitadas. Las omisiones persisten (quedan en el borrador). La demanda omitida NO se pierde: entra en la próxima operación. | ☐ | |
| 42 | Ejecutar operación | Admin | `operation.execute` + materialización | 1) En la revisión con demanda elegible, click "Ejecutar". 2) Revisar `/admin/supplier-orders`, `/admin/lots` y `/admin/roll-overs`. | Toast "Operación ejecutada". Se crean órdenes de proveedor "Pendiente", lotes y asignaciones; la demanda sin proveedor / bajo MOQ queda en rollover pre-asignación con motivo explícito. Los items de los clientes pasan a "En operación" y su journey a "Preparación". | ☐ | |
| 43 | Conflicto de fingerprint al ejecutar | Admin | Guard de demanda revisada (ADR 0006) | 1) Abrir la revisión de un borrador. 2) Sin cerrarla, generar demanda nueva dentro de la ventana (otro pago acreditado) o ejecutar la misma demanda desde otro borrador. 3) Click "Ejecutar". | El servidor rechaza con CONFLICT ("La demanda cambió desde la revisión..."); el diálogo muestra el banner ámbar, refetchea la demanda actual y el borrador sobrevive listo para re-ejecutar. | ☐ | |
| 44 | Compensar una operación (ventana administrativa) | Admin | `operation.cancel` | 1) Con una operación "Completada" cuyas órdenes de proveedor siguen "Pendiente": acción "Cancelar", ingresar motivo, confirmar. 2) Repetir sobre una operación con una orden ya "Solicitada". | Caso 1: toast "Operación cancelada"; lotes y órdenes quedan cancelados (nada se borra), los rollovers propios se cancelan, los consumidos vuelven a abiertos y la demanda re-entra en la próxima operación. Caso 2: el botón está deshabilitado con "Alguna orden de proveedor ya salió de pendiente...". | ☐ | |
| 45 | Reejecutar y descartar | Admin | `operation.rerun` / `remove` | 1) Sobre una operación completada dentro de la ventana: "Reejecutar" (verificar que "Incluir rollovers" está forzado) y confirmar. 2) Sobre un borrador: "Descartar". | Reejecutar compensa y crea/ejecuta una operación nueva en una sola transacción; la vista sigue al nuevo id. Descartar elimina el borrador dejando la demanda intacta. | ☐ | |

## H. Admin — Órdenes de proveedor

| # | Título | Quién | Feature | Flujo | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 46 | Solicitar orden al proveedor | Admin | `supplierOrder.request` | 1) `/admin/supplier-orders`: sobre una orden "Pendiente", acción "Solicitar", opcionalmente cargar "Referencia externa". | Orden, lotes y líneas pasan a "Solicitada". El journey del cliente pasa a la etapa "Proveedor". | ☐ | |
| 47 | Confirmación total | Admin | `supplierOrder.confirm` (sin recorte) | 1) Sobre una orden "Solicitada", acción "Confirmar" dejando todas las cantidades completas. | Orden y líneas quedan "Confirmada"; no se generan rollovers; los items del cliente pasan a "Confirmado por proveedor". | ☐ | |
| 48 | Confirmación parcial con recorte LIFO | Admin | Cut absorption (LIFO por fecha de pago) | 1) Acción "Confirmar" bajando la cantidad de una línea. 2) Revisar el preview de reparto ("#{k} ... absorbe {x}"). 3) Probar "Ajustar reparto" con una suma que no cierra. 4) Confirmar. | El recorte se reparte LIFO (el pagador más reciente absorbe primero). El reparto manual reemplaza al LIFO y debe sumar exacto ("El reparto suma {a} y el recorte es {b}."). Se crea un rollover post-asignación por recorte con motivo; el cliente afectado ve el aviso de reprogramación. Una línea confirmada en 0 se cancela con rollover total. | ☐ | |
| 49 | Cancelar orden o línea | Admin | `supplierOrder.cancel` / `cancelLine` | 1) Sobre una orden viva, "Cancelar orden" con motivo. 2) Sobre otra orden, "Cancelar línea" de una sola línea. 3) Intentar cancelar una orden con mercadería ya despachada/empaquetada. | La demanda activa vuelve a rollover con el motivo ("Orden de proveedor cancelada: ..."). La cancelación por línea cascadea a lote/orden si no queda nada vivo. Con paquetes de entrada vivos la cancelación se rechaza. | ☐ | |
| 50 | Registrar despacho del proveedor | Admin | `supplierOrder.registerDispatch` | 1) Sobre una orden "Confirmada", acción "Registrar despacho": nombre, código interno único, cantidades (parciales o totales). 2) Registrar un segundo despacho por el remanente. | Cada despacho crea un envío interno "Listo para despacho" y un paquete de entrada consolidado; la orden pasa a "Lista para recepción". El código interno duplicado se rechaza. Despachos parciales son de primera clase. | ☐ | |

## I. Admin — Recepción y empaque

| # | Título | Quién | Feature | Flujo | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 51 | Despachar el envío interno | Admin | `shipment.dispatch` | 1) `/admin/shipments`: sobre el envío interno "Listo para despacho", acción "Despachar" → "Confirmar salida". | Envío "En tránsito" y sus paquetes en cascada. El journey del cliente entra en la etapa "Envío" (movimiento interno). | ☐ | |
| 52 | Recibir completo cierra la orden de proveedor | Admin | `shipment.receive` (sin faltante) | 1) Sobre el envío interno "En tránsito", acción "Recibir" con las cantidades completas. | Envío y paquete quedan "Recibido". Si no queda nada pendiente de despacho, la orden de proveedor se completa sola y lotes/líneas pasan a "Listo para empaque". | ☐ | |
| 53 | Recibir con faltante (discrepancia de recepción) | Admin | Receipt discrepancy + rollover | 1) Acción "Recibir" declarando menos que lo despachado en una línea. 2) Verificar que el "Motivo del faltante" es obligatorio. 3) Confirmar. | El faltante genera un rollover post-asignación con motivo ("Faltante en recepcion del envio..."); recibir 0 cancela la línea. No se puede recibir de más ("...registrá un segundo despacho para el excedente."). | ☐ | |
| 54 | Fraccionar en paquetes por cliente | Admin | `package.fractionate` | 1) `/admin/packages`: sobre el paquete de entrada "Recibido", acción "Fraccionar". 2) Revisar las cantidades propuestas por cliente y confirmar. 3) Intentar fraccionar de nuevo el mismo paquete agotado. | Se crea un paquete de salida "Listo para envío" por cliente; el paquete de entrada queda "Recibido" como historia. Toast "Fraccionado en {n} paquete(s) de salida". Agotado: "No queda cantidad recibida sin fraccionar." Los items pasan a "Empaquetado" y el journey a "Empaque". | ☐ | |
| 55 | Promover un paquete mono-cliente | Admin | `package.promote` | 1) Lograr un paquete de entrada recibido con demanda de un solo cliente. 2) Acción "Promover a salida". 3) Intentarlo sobre un paquete multi-cliente. | El paquete flipea a pata "Salida" y vuelve a "Listo para envío" conservando su identidad. Multi-cliente: deshabilitado con "Solo se puede promover un paquete de un unico cliente". | ☐ | |
| 56 | Dividir un paquete | Admin | `package.split` | 1) Sobre un paquete no en movimiento, acción "Dividir" repartiendo las líneas en 2 bultos con nombre. | Se crean paquetes hermanos con el mismo envío/estado/pata; la suma de cantidades se conserva exactamente. | ☐ | |

## J. Admin — Envío al cliente y entrega

| # | Título | Quién | Feature | Flujo | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 57 | Crear envío al cliente (modos de entrega) | Admin | `shipment.createEndUser` + DeliveryMode | 1) `/admin/shipments` → "Nuevo envío al cliente". 2) Modo "A domicilio" seleccionando paquetes de 2 clientes distintos. 3) Repetir con paquetes de un solo cliente. 4) Crear otro con modo "Punto de retiro" y varios clientes. | "A domicilio" con 2 clientes se rechaza ("Un envio a domicilio debe ser de un unico cliente"); con 1 cliente se crea "Listo para despacho". "Punto de retiro" acepta multi-cliente. "Retiro en depósito" no es opción: es la ausencia de envío. | ☐ | |
| 58 | Entrega a domicilio | Admin + Cliente | `shipment.deliver` (homeDelivery) | 1) Despachar el envío a domicilio ("Confirmar salida"). 2) Acción "Entregar" → "Confirmar entrega". 3) Cliente revisa su journey. | La llegada confirma todos los paquetes (pasan a "Recibido") y los items quedan "Entregado". El cliente ve la etapa "Entrega" completada. | ☐ | |
| 59 | Punto de retiro: llegada ≠ entrega | Admin + Cliente | Asimetría pickup point | 1) Despachar el envío a punto de retiro. 2) Acción "Entregar" → botón "Confirmar llegada". 3) Cliente revisa su journey. 4) Confirmar el retiro de cada paquete con "Confirmar entrega" en `/admin/packages`. | La llegada deja el envío "Recibido" pero los paquetes siguen "En tránsito"; el cliente ve el aviso "Disponible para retirar" SIN completar la etapa Entrega. Cada "Confirmar entrega" por paquete marca "Entregado" a ese cliente. | ☐ | |
| 60 | Retiro en depósito (sin envío) | Admin + Cliente | `package.confirmDelivery` directo | 1) Sobre un paquete de salida "Listo para envío" sin envío asociado, acción "Confirmar entrega" (con nota opcional). 2) Cliente revisa el journey. | El paquete pasa de "Listo para envío" a "Recibido" sin viajar; el item queda "Entregado" y el cliente ve la etapa Entrega completada. | ☐ | |
| 61 | Demora, incidencia y recuperación | Admin + Cliente | `markDelayed` / `recover` | 1) Sobre un envío "En tránsito", "Marcar demorado" con motivo. 2) Cliente revisa el journey. 3) Intentar "Recuperar" un paquete del envío demorado. 4) Recuperar primero el envío y después el paquete. | El cliente ve "Incidencia de fulfillment" con el motivo. Recuperar el paquete con el envío demorado se rechaza ("Primero hay que recuperar el envio"). Recuperado todo, la incidencia figura resuelta y el estado vuelve al punto previo (derivado del registro, no elegido). | ☐ | |
| 62 | Reintentar un envío fallido | Admin | `shipment.retry` | 1) "Marcar fallido" un envío en tránsito (motivo). 2) Acción "Reintentar": nombre y código interno nuevos. | Los paquetes activos se mueven al envío nuevo conservando identidad, tipo y modo; el fallido queda vacío como historia. La vista sigue al envío nuevo. | ☐ | |
| 63 | Dar de baja mercadería (write-off) | Admin + Cliente | `package.writeOff` | 1) Sobre un paquete demorado o fallido, acción "Dar de baja" con cantidades y motivo. 2) Revisar `/admin/roll-overs` y el journey del cliente. | La cantidad dada de baja genera un rollover post-asignación con motivo ("Baja de paquete..."); un paquete totalmente dado de baja queda "Cancelado". El cliente ve el aviso de reprogramación. | ☐ | |

## K. Admin — Rollovers, tracking y cierre del pedido

| # | Título | Quién | Feature | Flujo | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 64 | Rollovers: listado y resolución | Admin | `rollOver.resolve` | 1) `/admin/roll-overs`: revisar filtros por estado y etapa (Antes/Después de asignación). 2) Sobre un rollover "Abierto", click "Resolver" con motivo. 3) Verificar que uno resuelto no ofrece la acción. | El listado muestra abiertos, reagrupados, resueltos y cancelados (los resueltos no se ocultan). Resolver exige motivo, registra la decisión sin mover dinero y queda en el tracking del item. Solo los abiertos se resuelven. | ☐ | |
| 65 | Rollover reagrupado en la próxima operación | Admin + Cliente | Re-agregación por defecto (ADR 0005) | 1) Con un rollover abierto, crear un borrador con "Incluir rollovers abiertos" activo, revisar y ejecutar. 2) Revisar el rollover y el journey del cliente. | El rollover pasa a "Reagrupado" con link a la operación nueva; la demanda sigue su curso normal en el nuevo lote. El cliente ve su item retomar el recorrido. | ☐ | |
| 66 | Tracking admin por item | Admin | `/admin/tracking` | 1) Abrir `/admin/tracking`, filtrar por evento y fuente. 2) Click en una fila para abrir el modal del item. | El modal muestra el recorrido admin de 10 etapas, el estado de fulfillment vivo, los avisos, links a carrito/operación/lote/paquete/envío y la lista cruda de eventos. Los filtros por ids (carrito, operación, paquete...) funcionan como deep-links desde otras pantallas. | ☐ | |
| 67 | Cierre automático del pedido | Admin + Cliente | `UserOrderClosure` derivado | 1) Llevar un pedido a: todos los items entregados. 2) Otro pedido: todos los items cancelados (rollover resuelto sin entrega). 3) Otro: un item entregado y un rollover abierto. | Caso 1: la orden pasa sola a "Completado". Caso 2: pasa a "Cancelado". Caso 3: la orden sigue "En procesamiento" — un rollover abierto la mantiene abierta. El cierre nunca pisa "Reembolsado"/"Contracargo"/"Fallido" y no existe cierre manual. | ☐ | |

---

## Resumen de cobertura

| Sección | Tests | Rol dominante |
|---|---|---|
| A. Acceso y sesión | 1–4 | Cliente |
| B. Catálogo y carrito | 5–11 | Cliente |
| C. Checkout | 12–20 | Cliente |
| D. Pago Mercado Pago | 21–27 | Cliente + Sistema |
| E. Seguimiento del pedido | 28–34 | Cliente |
| F. Pagos | 35–38 | Admin |
| G. Demanda y operaciones | 39–45 | Admin |
| H. Órdenes de proveedor | 46–50 | Admin |
| I. Recepción y empaque | 51–56 | Admin |
| J. Envío al cliente y entrega | 57–63 | Admin |
| K. Rollovers, tracking y cierre | 64–67 | Admin |

**Cadena mínima de regresión (camino feliz de punta a punta):** 1 → 6 → 12 → 14 → 15 → 17 (o 21+23) → 40 → 41 → 42 → 46 → 47 → 50 → 51 → 52 → 54 → 57 → 58 → 67 → 31.
