/**
 * Transcription of the test tables in `docs/qa/qa-ciclo-de-vida.md`. The doc is
 * the origin of the wording; the `qa_ticket` table is the source of truth for
 * status and notes once `pnpm qa:seed` has run.
 *
 * `section` keeps the literal letter prefix of the doc's heading so alphabetical
 * order is the doc's order. `isRegressionPath` marks the minimum end-to-end
 * regression chain listed at the bottom of the doc, both payment branches
 * included (mock 17, Mercado Pago 21 + 23).
 */

export type QaTicketSeedEntry = {
	code: number;
	section: string;
	title: string;
	actor: string;
	feature: string;
	steps: string;
	expectedResult: string;
	isRegressionPath: boolean;
};

const SECTION_A = "A. Acceso y sesión";
const SECTION_B = "B. Catálogo y carrito";
const SECTION_C = "C. Checkout";
const SECTION_D = "D. Pago con Mercado Pago (sandbox)";
const SECTION_E = "E. Seguimiento del pedido (cliente)";
const SECTION_F = "F. Admin — Pagos";
const SECTION_G = "G. Admin — Demanda y operaciones";
const SECTION_H = "H. Admin — Órdenes de proveedor";
const SECTION_I = "I. Admin — Recepción y empaque";
const SECTION_J = "J. Admin — Envío al cliente y entrega";
const SECTION_K = "K. Admin — Rollovers, tracking y cierre del pedido";

export const qaTicketSeedEntries: QaTicketSeedEntry[] = [
	{
		code: 1,
		section: SECTION_A,
		title: "Login con Google",
		actor: "Cliente",
		feature: "Autenticación (better-auth, Google OAuth)",
		steps:
			'1) Ir a `/login`.\n2) Click en "Continuar con Google".\n3) Completar el OAuth.',
		expectedResult:
			'Redirige al home (o al `callbackURL`), el navbar muestra el menú de usuario con "Perfil", "Ver mis pedidos" y "Cerrar sesión".',
		isRegressionPath: true,
	},
	{
		code: 2,
		section: SECTION_A,
		title: "Checkout exige sesión",
		actor: "Cliente",
		feature: "Guard de checkout",
		steps:
			'1) Sin sesión, agregar un producto al carrito.\n2) Ir a `/cart` y click en "Registrarme o iniciar sesión" (o navegar directo a `/checkout`).\n3) Loguearse.',
		expectedResult:
			"`/checkout` redirige a `/login?callbackURL=/checkout`; después del login vuelve automáticamente al checkout con el carrito intacto.",
		isRegressionPath: false,
	},
	{
		code: 3,
		section: SECTION_A,
		title: "Carrito de invitado se sincroniza al login",
		actor: "Cliente",
		feature: "Persistencia local + merge del carrito",
		steps:
			"1) Sin sesión, agregar 2 productos desde `/products`.\n2) Loguearse.\n3) Revisar `/cart`.",
		expectedResult:
			'Los items del invitado se conservan y se suman al carrito del servidor del usuario. Si un producto dejó de estar disponible, aparece el toast "Quitamos un producto que ya no esta disponible."',
		isRegressionPath: false,
	},
	{
		code: 4,
		section: SECTION_A,
		title: "Cerrar sesión limpia el carrito local",
		actor: "Cliente",
		feature: "Logout + aislamiento entre usuarios",
		steps:
			'1) Con sesión y carrito con items, menú de usuario → "Cerrar sesión".\n2) Observar `/cart` sin loguearse.',
		expectedResult:
			"Redirige a `/login`; el carrito local queda vacío y no muestra items del usuario anterior.",
		isRegressionPath: false,
	},
	{
		code: 5,
		section: SECTION_B,
		title: "Catálogo lista solo productos vigentes",
		actor: "Cliente",
		feature: "Catálogo + términos de cliente vigentes",
		steps:
			"1) Ir a `/products`.\n2) Contrastar contra el admin: un producto inactivo o con términos vencidos.\n3) Probar búsqueda, filtros de marca/unidad/precio y orden.",
		expectedResult:
			'Solo aparecen productos activos con términos vigentes. El precio se muestra por bloque ("por bloque MOQ de {n}"). Búsqueda insensible a acentos; "Limpiar filtros" restaura el listado.',
		isRegressionPath: false,
	},
	{
		code: 6,
		section: SECTION_B,
		title: "Agregar un item al carrito",
		actor: "Cliente",
		feature: "Alta de item (cantidad inicial = MOQ)",
		steps: '1) En `/products`, click en "Agregar" sobre un producto.',
		expectedResult:
			'El mini-carrito se abre, el producto figura con cantidad = MOQ, la tarjeta pasa a mostrar el badge "En carrito" con stepper y subtotal.',
		isRegressionPath: true,
	},
	{
		code: 7,
		section: SECTION_B,
		title: "Reglas de cantidad MOQ / step / máximo",
		actor: "Cliente",
		feature: "Normalización de cantidades",
		steps:
			'1) Con un producto con MOQ, step y máximo en el carrito: intentar bajar de MOQ con "−".\n2) Subir con "+" hasta el máximo.\n3) Tipear una cantidad fuera de step y salir del campo.',
		expectedResult:
			'Nunca baja de MOQ; incrementa/decrementa de a step; el "+" se deshabilita al llegar al máximo; la cantidad tipeada se normaliza al múltiplo válido al perder foco (toast "Ajustamos la cantidad..." si lo corrige el servidor).',
		isRegressionPath: false,
	},
	{
		code: 8,
		section: SECTION_B,
		title: "Producto sin step = cantidad fija",
		actor: "Cliente",
		feature: "Cantidad bloqueada en MOQ",
		steps:
			"1) Agregar un producto cuyos términos no tienen step.\n2) Intentar cambiar la cantidad.",
		expectedResult:
			'La cantidad queda fija en el MOQ y los botones "−"/"+" están deshabilitados.',
		isRegressionPath: false,
	},
	{
		code: 9,
		section: SECTION_B,
		title: "Subtotal por bloque, no lineal",
		actor: "Cliente",
		feature: "Precio por bloque (moqPrice + bloques × stepPrice)",
		steps:
			"1) Producto con MOQ, step y stepPrice conocidos.\n2) Llevar la cantidad a MOQ + 2 steps.\n3) Verificar el subtotal de la línea.",
		expectedResult:
			"Subtotal = moqPrice + 2 × stepPrice (no cantidad × precio unitario). Los totales del resumen se muestran por moneda.",
		isRegressionPath: false,
	},
	{
		code: 10,
		section: SECTION_B,
		title: "Quitar item y vaciar carrito",
		actor: "Cliente",
		feature: "Bajas del carrito",
		steps:
			'1) En `/cart`, quitar un item con el botón de basura.\n2) Click en "Vaciar carrito".',
		expectedResult:
			'El item desaparece (toast "Producto quitado del carrito"); "Vaciar carrito" deja el estado vacío ("Tu carrito está vacío") con CTA "Ver productos".',
		isRegressionPath: false,
	},
	{
		code: 11,
		section: SECTION_B,
		title: "Edición desde el mini-carrito en checkout",
		actor: "Cliente",
		feature: "Carrito vivo durante el checkout",
		steps:
			'1) Iniciar checkout con 2 items.\n2) En el paso "Pedido", click "Editar carrito" y quitar un item desde el mini-carrito.\n3) Quitar también el último item.',
		expectedResult:
			'El resumen del checkout refleja el cambio al instante. Al vaciarlo aparece "Tu carrito está vacío" y los pasos posteriores se bloquean.',
		isRegressionPath: false,
	},
	{
		code: 12,
		section: SECTION_C,
		title: "Inicio del checkout (4 pasos)",
		actor: "Cliente",
		feature: "`checkout.start` + stepper",
		steps: "1) Con carrito con items y sesión activa, ir a `/checkout`.",
		expectedResult:
			'Se muestra el stepper "Pedido → Envío → Pago → Confirmar"; los pasos futuros están bloqueados con tooltip "Completá los pasos anteriores". En `/admin/carts` el carrito pasa a "En checkout".',
		isRegressionPath: true,
	},
	{
		code: 13,
		section: SECTION_C,
		title: "Checkout sin carrito activo",
		actor: "Cliente",
		feature: "Guardas de `checkout.start`",
		steps: "1) Con el carrito vacío, navegar directo a `/checkout`.",
		expectedResult:
			'Alerta "No se pudo iniciar checkout" con el mensaje del servidor ("Tu carrito está vacío..." o "No encontramos un carrito activo...") y botones "Volver al carrito" / "Ver productos".',
		isRegressionPath: false,
	},
	{
		code: 14,
		section: SECTION_C,
		title: "Alta y edición de dirección de envío",
		actor: "Cliente",
		feature: 'Address book en el paso "Envío"',
		steps:
			'1) En "Envío", click "Nueva".\n2) Enviar el formulario vacío.\n3) Completar Dirección, Ciudad, Provincia, Código postal, País y guardar.\n4) Editarla con "Editar".',
		expectedResult:
			'Los campos obligatorios muestran sus mensajes ("La dirección es obligatoria", etc.). Al guardar: toast "Dirección guardada", la tarjeta queda con badge "Seleccionada" y el paso se habilita.',
		isRegressionPath: true,
	},
	{
		code: 15,
		section: SECTION_C,
		title: "Alta de método de pago con validación de datos sensibles",
		actor: "Cliente",
		feature: "Payment methods + `safePaymentTextSchema`",
		steps:
			'1) En "Pago", click "Nuevo".\n2) En "Referencia visible" pegar 16 dígitos corridos y guardar.\n3) Corregir a una referencia corta ("Terminada en 1234") y guardar.',
		expectedResult:
			'El primer intento se rechaza con "No ingreses números completos de tarjeta ni datos sensibles"; el segundo guarda con toast "Método de pago guardado" y el método queda "Seleccionado".',
		isRegressionPath: true,
	},
	{
		code: 16,
		section: SECTION_C,
		title: "Términos obligatorios para confirmar",
		actor: "Cliente",
		feature: "Aceptación de términos",
		steps:
			'1) Llegar al paso "Confirmar" con pedido, dirección y pago elegidos.\n2) Intentar "Confirmar y pagar" sin activar el switch de términos.\n3) Activarlo y confirmar.',
		expectedResult:
			"Sin el switch el botón está deshabilitado (no se puede confirmar). Con el switch activo el pago se procesa.",
		isRegressionPath: false,
	},
	{
		code: 17,
		section: SECTION_C,
		title: "Pago mock aprobado",
		actor: "Cliente",
		feature: "`confirmAndPay` camino feliz (gateway mock)",
		steps:
			'Precondición: MP deshabilitado.\n1) Confirmar con un método cuya referencia NO contiene "fail"/"rechazo".\n2) Observar el panel de resultado.\n3) Ir a "Ver mi pedido".',
		expectedResult:
			'Panel "Compra confirmada", carrito local vaciado, orden visible en `/my-orders` en "En procesamiento" con pago "Aprobado". En admin: carrito "Enviado", items "submitted".',
		isRegressionPath: true,
	},
	{
		code: 18,
		section: SECTION_C,
		title: "Pago mock rechazado",
		actor: "Cliente",
		feature: "`confirmAndPay` camino de falla",
		steps:
			'1) Crear un método de pago cuya referencia incluya "rechazo".\n2) Confirmar el pedido.',
		expectedResult:
			'Panel "No se pudo confirmar el pago" con alerta "Error del pago" ("El proveedor mock rechazó el pago."), orden en "Fallido", el carrito NO se vacía y "Intentar de nuevo" permite reintentar (nueva clave de idempotencia).',
		isRegressionPath: false,
	},
	{
		code: 19,
		section: SECTION_C,
		title: "Carrito multi-moneda bloqueado",
		actor: "Cliente",
		feature: "`assertSingleCurrency`",
		steps:
			'1) Armar un carrito con productos en dos monedas distintas (se permite en `/cart`, que muestra un total por moneda).\n2) Intentar "Confirmar y pagar".',
		expectedResult:
			'Error "El checkout de esta versión solo permite carritos con una moneda." El pedido no se crea dos veces ni queda a medias.',
		isRegressionPath: false,
	},
	{
		code: 20,
		section: SECTION_C,
		title: "Producto deshabilitado durante el checkout",
		actor: "Cliente + Admin",
		feature: "Revalidación de términos",
		steps:
			"1) Cliente arma carrito y llega al checkout.\n2) Admin desactiva los términos/el producto.\n3) Cliente intenta confirmar.",
		expectedResult:
			'Error "Uno de los productos del carrito ya no está disponible. Revisá el carrito antes de continuar." El cliente puede volver al carrito y quitar el producto.',
		isRegressionPath: false,
	},
	{
		code: 21,
		section: SECTION_D,
		title: "Redirección a Checkout Pro",
		actor: "Cliente",
		feature: "Preferencia MP + redirect",
		steps:
			'Precondición: MP habilitado en sandbox.\n1) Confirmar el pedido con el método "Mercado Pago".',
		expectedResult:
			'Toast "Redirigiendo a Mercado Pago" y navegación al checkout de MP (URL sandbox). En `/admin/payments` el intento queda "pending" con preferencia creada; la orden queda "Pendiente" y el carrito sigue "En checkout".',
		isRegressionPath: true,
	},
	{
		code: 22,
		section: SECTION_D,
		title: "Pantallas de retorno informativas",
		actor: "Cliente",
		feature: "Back URLs success/failure/pending",
		steps:
			"1) Completar (o abandonar) el pago en MP y volver por cada back URL.",
		expectedResult:
			'Las tres pantallas ("Pago enviado a confirmación" / "Pago no confirmado" / "Pago pendiente") muestran la alerta "Estado sujeto a reconciliación" y NO cambian ningún estado por sí mismas.',
		isRegressionPath: false,
	},
	{
		code: 23,
		section: SECTION_D,
		title: "Webhook aprobado acredita el pedido",
		actor: "Cliente + Sistema",
		feature: "Reconciliación por webhook firmado",
		steps:
			"1) Pagar en sandbox con una tarjeta de prueba aprobada.\n2) Esperar el webhook.\n3) Refrescar `/my-orders/[id]` y `/admin/payments`.",
		expectedResult:
			'Transacción "Aprobado" (completed), orden "En procesamiento", carrito "Enviado", items submitted. El journey del pedido muestra "Pedido confirmado" (puede demorar unos segundos: el evento de tracking es asíncrono).',
		isRegressionPath: true,
	},
	{
		code: 24,
		section: SECTION_D,
		title: "Webhook rechazado / pendiente no rompe el carrito",
		actor: "Cliente + Sistema",
		feature: "Mapeo de estados MP",
		steps:
			"1) Pagar con tarjeta de prueba rechazada.\n2) Revisar orden, transacción y carrito.",
		expectedResult:
			'Transacción "Rechazado"; la orden sigue "Pendiente" y el carrito sigue editable. Un pago `in_process` deja la transacción "En proceso" sin acreditar nada.',
		isRegressionPath: false,
	},
	{
		code: 25,
		section: SECTION_D,
		title: "Webhook con firma inválida se rechaza",
		actor: "Admin",
		feature: "Validación de firma",
		steps:
			"1) Enviar un POST a `/api/mercadopago/webhook` con `x-signature` inválida (curl).\n2) Revisar `/admin/payments` → tab Eventos.",
		expectedResult:
			'Respuesta HTTP 401; el evento queda registrado como "rejected" con "firma no válida" y no se procesa ningún cambio de estado.',
		isRegressionPath: false,
	},
	{
		code: 26,
		section: SECTION_D,
		title: "Replay del webhook es idempotente",
		actor: "Admin",
		feature: "Idempotencia de reconciliación",
		steps:
			'1) Sobre un pago ya acreditado, reenviar el mismo evento (botón "Reprocesar" en tab Eventos).',
		expectedResult:
			'No se duplican submissions ni eventos de tracking (el timeline del item sigue con un solo "Pedido confirmado"); la transacción no retrocede de estado.',
		isRegressionPath: false,
	},
	{
		code: 27,
		section: SECTION_D,
		title: "Abandono del redirect y reintento",
		actor: "Cliente",
		feature: "Orden pendiente + reintento de checkout",
		steps:
			"1) Confirmar con MP y cerrar la pestaña de MP sin pagar.\n2) Volver a `/checkout` y confirmar de nuevo.\n3) Revisar `/my-orders` y `/admin/payments`.",
		expectedResult:
			'La primera orden queda "Pendiente" con su transacción "pending" (comportamiento conocido). El segundo intento genera una orden nueva sobre el mismo carrito. Registrar el resultado observado — es un edge conocido a decidir producto.',
		isRegressionPath: false,
	},
	{
		code: 28,
		section: SECTION_E,
		title: 'Listado "Mis pedidos" con filtros',
		actor: "Cliente",
		feature: "Listado + filtros por estado",
		steps:
			'1) Con varios pedidos en distintos estados, ir a `/my-orders`.\n2) Probar los chips "Todos / En curso / Completados / Cancelados / Reintegros" y el toggle "Más recientes / Más antiguos".',
		expectedResult:
			'Cada tarjeta muestra código, fecha, estado, items, pago y monto; los contadores de los chips corresponden al total (no a la vista filtrada); "Ver seguimiento" navega al detalle.',
		isRegressionPath: false,
	},
	{
		code: 29,
		section: SECTION_E,
		title: "Detalle del pedido",
		actor: "Cliente",
		feature: "Snapshot de productos, resumen y pago",
		steps: "1) Abrir `/my-orders/[id]` de un pedido pagado.",
		expectedResult:
			'Se ven: "Pedido {code}", carrito de origen, card "Productos" (nombres, cantidades y montos del snapshot), "Resumen" (items, monto, dirección de envío) y "Pago" (estado, transacción, referencia, método). Un id ajeno o inválido da 404.',
		isRegressionPath: false,
	},
	{
		code: 30,
		section: SECTION_E,
		title: "Journey vacío hasta acreditar el pago",
		actor: "Cliente",
		feature: "Inicio del seguimiento",
		steps: "1) Abrir el detalle de un pedido cuyo pago aún no se acreditó.",
		expectedResult:
			'Card "Seguimiento del pedido" con "El seguimiento comienza cuando se acredita el pago." — sin etapas.',
		isRegressionPath: false,
	},
	{
		code: 31,
		section: SECTION_E,
		title: "Journey de 6 etapas avanza con el fulfillment",
		actor: "Cliente + Admin",
		feature: "Timeline de 6 etapas del cliente",
		steps:
			"1) Con un pedido pagado, el admin avanza el ciclo completo (operación → proveedor → empaque → envío → entrega).\n2) El cliente refresca el detalle después de cada hito.",
		expectedResult:
			"Las etapas se completan en orden: Pedido confirmado → Preparación → Proveedor → Empaque → Envío → Entrega, con timestamps. La etapa actual queda destacada y las futuras en pendiente.",
		isRegressionPath: true,
	},
	{
		code: 32,
		section: SECTION_E,
		title: "Journey unificado vs por item",
		actor: "Cliente",
		feature: "Roll-up del recorrido",
		steps:
			"1) Pedido con 2 items en la misma etapa: ver el detalle.\n2) Hacer que un item avance más que el otro (p. ej. uno empaquetado y otro no) y volver a ver.",
		expectedResult:
			'Caso 1: un solo stepper ("Todos los productos avanzan juntos por este recorrido."). Caso 2: un recorrido por item con su etapa y badge propios.',
		isRegressionPath: false,
	},
	{
		code: 33,
		section: SECTION_E,
		title: "Avisos de rollover / incidencia / retiro",
		actor: "Cliente + Admin",
		feature: "Notices del journey",
		steps:
			"1) Admin genera: un recorte de proveedor (rollover), una demora de envío (incidencia) y una llegada a punto de retiro.\n2) Cliente revisa el detalle en cada caso.",
		expectedResult:
			'Aparecen avisos legibles: reprogramación ("Reprogramado...") con motivo, "Incidencia de fulfillment" (y su resolución), y "Disponible para retirar" — este último como aviso, sin marcar la etapa Entrega.',
		isRegressionPath: false,
	},
	{
		code: 34,
		section: SECTION_E,
		title: "Pedido/producto cancelado congela el recorrido",
		actor: "Cliente",
		feature: "Estado cancelado en el journey",
		steps:
			"1) Lograr un item cancelado (p. ej. rollover resuelto sin entrega).\n2) Ver el detalle del pedido.",
		expectedResult:
			'Banner "Este pedido fue cancelado" (o "Este producto fue cancelado") con "El recorrido queda congelado en la etapa alcanzada."',
		isRegressionPath: false,
	},
	{
		code: 35,
		section: SECTION_F,
		title: "Listado de intentos y detalle",
		actor: "Admin",
		feature: "`/admin/payments` tab Intentos",
		steps:
			"1) Abrir `/admin/payments`.\n2) Buscar por código de pedido o email.\n3) Click en una fila.",
		expectedResult:
			"Stats (Intentos/Pendientes/Completados/Eventos fallidos); el detalle muestra idempotencia, preferencia, pago, snapshots JSON y los eventos relacionados con validez de firma.",
		isRegressionPath: false,
	},
	{
		code: 36,
		section: SECTION_F,
		title: "Reconciliar un intento manualmente",
		actor: "Admin",
		feature: "`reconcileAttempt`",
		steps:
			'1) Elegir un intento con `providerPaymentId`.\n2) Click "Reconciliar ahora".\n3) Probar sobre un intento sin payment id.',
		expectedResult:
			'Toast "Intento reconciliado" y el estado se actualiza según el recurso real de MP. Sin payment id el botón está deshabilitado.',
		isRegressionPath: false,
	},
	{
		code: 37,
		section: SECTION_F,
		title: "Reprocesar e ignorar eventos",
		actor: "Admin",
		feature: "Gestión de eventos de proveedor",
		steps:
			'1) Tab Eventos: "Reprocesar" un evento de tipo payment.\n2) Intentar "Ignorar" con motivo de 3 caracteres.\n3) Ignorar con un motivo válido.',
		expectedResult:
			'Reprocesar re-ejecuta la reconciliación (toast "Evento reprocesado"). Ignorar exige motivo ≥ 5 caracteres y deja el evento "ignored" (toast "Evento ignorado").',
		isRegressionPath: false,
	},
	{
		code: 38,
		section: SECTION_F,
		title: "Config de MP protegida por superadmin",
		actor: "Admin + Superadmin",
		feature: "`updateProviderConfig`",
		steps:
			"1) Como admin común, tab Config: intentar guardar un cambio.\n2) Como superadmin, cambiar un valor, escribir `CONFIRMAR` y guardar.\n3) Probar guardar sin escribir `CONFIRMAR`.",
		expectedResult:
			'El admin común recibe FORBIDDEN. El superadmin sin la palabra exacta recibe \'Escribí "CONFIRMAR" para aplicar cambios...\'. Con `CONFIRMAR` el cambio se aplica y los secretos solo se muestran como "Configurado"/"Falta".',
		isRegressionPath: false,
	},
	{
		code: 39,
		section: SECTION_G,
		title: "Carritos operacionales y trazabilidad",
		actor: "Admin",
		feature: "`/admin/carts` + lineage",
		steps:
			'1) Abrir `/admin/carts`, filtrar por usuario y estado.\n2) En un carrito pagado, menú → "Rastrear".',
		expectedResult:
			"El listado muestra estado, items, orden/pagos. La página de trazabilidad muestra órdenes y pagos, el lineage de cada item (asignación → lote → operación → paquete → envío), diagnósticos y timeline.",
		isRegressionPath: false,
	},
	{
		code: 40,
		section: SECTION_G,
		title: "Crear borrador de operación",
		actor: "Admin",
		feature: "`operation.createDraft`",
		steps:
			'1) `/admin/operations` → "Nueva operación".\n2) Elegir ventana Desde/Hasta que cubra pagos acreditados, destino y "Incluir rollovers abiertos" activo.\n3) Click "Revisar".',
		expectedResult:
			'Toast "Borrador creado"; se abre la revisión con la demanda de la ventana. La operación figura como "Borrador" y no reserva nada (probar Hasta < Desde: se rechaza con mensaje).',
		isRegressionPath: true,
	},
	{
		code: 41,
		section: SECTION_G,
		title: "Revisión con omisiones de item y de cliente",
		actor: "Admin",
		feature: "`operation.review` + omisiones",
		steps:
			'1) En "Revisar {code}", marcar el checkbox de un item ("Omitir {code}").\n2) Marcar el checkbox de un cliente entero ("Omitir a {nombre}").\n3) Cerrar el diálogo y reabrirlo.',
		expectedResult:
			'Los totales Elegible/Omitida se actualizan; el cliente omitido muestra "Cliente omitido" y sus filas quedan marcadas y deshabilitadas. Las omisiones persisten (quedan en el borrador). La demanda omitida NO se pierde: entra en la próxima operación.',
		isRegressionPath: true,
	},
	{
		code: 42,
		section: SECTION_G,
		title: "Ejecutar operación",
		actor: "Admin",
		feature: "`operation.execute` + materialización",
		steps:
			'1) En la revisión con demanda elegible, click "Ejecutar".\n2) Revisar `/admin/supplier-orders`, `/admin/lots` y `/admin/roll-overs`.',
		expectedResult:
			'Toast "Operación ejecutada". Se crean órdenes de proveedor "Pendiente", lotes y asignaciones; la demanda sin proveedor / bajo MOQ queda en rollover pre-asignación con motivo explícito. Los items de los clientes pasan a "En operación" y su journey a "Preparación".',
		isRegressionPath: true,
	},
	{
		code: 43,
		section: SECTION_G,
		title: "Conflicto de fingerprint al ejecutar",
		actor: "Admin",
		feature: "Guard de demanda revisada (ADR 0006)",
		steps:
			'1) Abrir la revisión de un borrador.\n2) Sin cerrarla, generar demanda nueva dentro de la ventana (otro pago acreditado) o ejecutar la misma demanda desde otro borrador.\n3) Click "Ejecutar".',
		expectedResult:
			'El servidor rechaza con CONFLICT ("La demanda cambió desde la revisión..."); el diálogo muestra el banner ámbar, refetchea la demanda actual y el borrador sobrevive listo para re-ejecutar.',
		isRegressionPath: false,
	},
	{
		code: 44,
		section: SECTION_G,
		title: "Compensar una operación (ventana administrativa)",
		actor: "Admin",
		feature: "`operation.cancel`",
		steps:
			'1) Con una operación "Completada" cuyas órdenes de proveedor siguen "Pendiente": acción "Cancelar", ingresar motivo, confirmar.\n2) Repetir sobre una operación con una orden ya "Solicitada".',
		expectedResult:
			'Caso 1: toast "Operación cancelada"; lotes y órdenes quedan cancelados (nada se borra), los rollovers propios se cancelan, los consumidos vuelven a abiertos y la demanda re-entra en la próxima operación. Caso 2: el botón está deshabilitado con "Alguna orden de proveedor ya salió de pendiente...".',
		isRegressionPath: false,
	},
	{
		code: 45,
		section: SECTION_G,
		title: "Reejecutar y descartar",
		actor: "Admin",
		feature: "`operation.rerun` / `remove`",
		steps:
			'1) Sobre una operación completada dentro de la ventana: "Reejecutar" (verificar que "Incluir rollovers" está forzado) y confirmar.\n2) Sobre un borrador: "Descartar".',
		expectedResult:
			"Reejecutar compensa y crea/ejecuta una operación nueva en una sola transacción; la vista sigue al nuevo id. Descartar elimina el borrador dejando la demanda intacta.",
		isRegressionPath: false,
	},
	{
		code: 46,
		section: SECTION_H,
		title: "Solicitar orden al proveedor",
		actor: "Admin",
		feature: "`supplierOrder.request`",
		steps:
			'1) `/admin/supplier-orders`: sobre una orden "Pendiente", acción "Solicitar", opcionalmente cargar "Referencia externa".',
		expectedResult:
			'Orden, lotes y líneas pasan a "Solicitada". El journey del cliente pasa a la etapa "Proveedor".',
		isRegressionPath: true,
	},
	{
		code: 47,
		section: SECTION_H,
		title: "Confirmación total",
		actor: "Admin",
		feature: "`supplierOrder.confirm` (sin recorte)",
		steps:
			'1) Sobre una orden "Solicitada", acción "Confirmar" dejando todas las cantidades completas.',
		expectedResult:
			'Orden y líneas quedan "Confirmada"; no se generan rollovers; los items del cliente pasan a "Confirmado por proveedor".',
		isRegressionPath: true,
	},
	{
		code: 48,
		section: SECTION_H,
		title: "Confirmación parcial con recorte LIFO",
		actor: "Admin",
		feature: "Cut absorption (LIFO por fecha de pago)",
		steps:
			'1) Acción "Confirmar" bajando la cantidad de una línea.\n2) Revisar el preview de reparto ("#{k} ... absorbe {x}").\n3) Probar "Ajustar reparto" con una suma que no cierra.\n4) Confirmar.',
		expectedResult:
			'El recorte se reparte LIFO (el pagador más reciente absorbe primero). El reparto manual reemplaza al LIFO y debe sumar exacto ("El reparto suma {a} y el recorte es {b}."). Se crea un rollover post-asignación por recorte con motivo; el cliente afectado ve el aviso de reprogramación. Una línea confirmada en 0 se cancela con rollover total.',
		isRegressionPath: false,
	},
	{
		code: 49,
		section: SECTION_H,
		title: "Cancelar orden o línea",
		actor: "Admin",
		feature: "`supplierOrder.cancel` / `cancelLine`",
		steps:
			'1) Sobre una orden viva, "Cancelar orden" con motivo.\n2) Sobre otra orden, "Cancelar línea" de una sola línea.\n3) Intentar cancelar una orden con mercadería ya despachada/empaquetada.',
		expectedResult:
			'La demanda activa vuelve a rollover con el motivo ("Orden de proveedor cancelada: ..."). La cancelación por línea cascadea a lote/orden si no queda nada vivo. Con paquetes de entrada vivos la cancelación se rechaza.',
		isRegressionPath: false,
	},
	{
		code: 50,
		section: SECTION_H,
		title: "Registrar despacho del proveedor",
		actor: "Admin",
		feature: "`supplierOrder.registerDispatch`",
		steps:
			'1) Sobre una orden "Confirmada", acción "Registrar despacho": nombre, código interno único, cantidades (parciales o totales).\n2) Registrar un segundo despacho por el remanente.',
		expectedResult:
			'Cada despacho crea un envío interno "Listo para despacho" y un paquete de entrada consolidado; la orden pasa a "Lista para recepción". El código interno duplicado se rechaza. Despachos parciales son de primera clase.',
		isRegressionPath: true,
	},
	{
		code: 51,
		section: SECTION_I,
		title: "Despachar el envío interno",
		actor: "Admin",
		feature: "`shipment.dispatch`",
		steps:
			'1) `/admin/shipments`: sobre el envío interno "Listo para despacho", acción "Despachar" → "Confirmar salida".',
		expectedResult:
			'Envío "En tránsito" y sus paquetes en cascada. El journey del cliente entra en la etapa "Envío" (movimiento interno).',
		isRegressionPath: true,
	},
	{
		code: 52,
		section: SECTION_I,
		title: "Recibir completo cierra la orden de proveedor",
		actor: "Admin",
		feature: "`shipment.receive` (sin faltante)",
		steps:
			'1) Sobre el envío interno "En tránsito", acción "Recibir" con las cantidades completas.',
		expectedResult:
			'Envío y paquete quedan "Recibido". Si no queda nada pendiente de despacho, la orden de proveedor se completa sola y lotes/líneas pasan a "Listo para empaque".',
		isRegressionPath: true,
	},
	{
		code: 53,
		section: SECTION_I,
		title: "Recibir con faltante (discrepancia de recepción)",
		actor: "Admin",
		feature: "Receipt discrepancy + rollover",
		steps:
			'1) Acción "Recibir" declarando menos que lo despachado en una línea.\n2) Verificar que el "Motivo del faltante" es obligatorio.\n3) Confirmar.',
		expectedResult:
			'El faltante genera un rollover post-asignación con motivo ("Faltante en recepcion del envio..."); recibir 0 cancela la línea. No se puede recibir de más ("...registrá un segundo despacho para el excedente.").',
		isRegressionPath: false,
	},
	{
		code: 54,
		section: SECTION_I,
		title: "Fraccionar en paquetes por cliente",
		actor: "Admin",
		feature: "`package.fractionate`",
		steps:
			'1) `/admin/packages`: sobre el paquete de entrada "Recibido", acción "Fraccionar".\n2) Revisar las cantidades propuestas por cliente y confirmar.\n3) Intentar fraccionar de nuevo el mismo paquete agotado.',
		expectedResult:
			'Se crea un paquete de salida "Listo para envío" por cliente; el paquete de entrada queda "Recibido" como historia. Toast "Fraccionado en {n} paquete(s) de salida". Agotado: "No queda cantidad recibida sin fraccionar." Los items pasan a "Empaquetado" y el journey a "Empaque".',
		isRegressionPath: true,
	},
	{
		code: 55,
		section: SECTION_I,
		title: "Promover un paquete mono-cliente",
		actor: "Admin",
		feature: "`package.promote`",
		steps:
			'1) Lograr un paquete de entrada recibido con demanda de un solo cliente.\n2) Acción "Promover a salida".\n3) Intentarlo sobre un paquete multi-cliente.',
		expectedResult:
			'El paquete flipea a pata "Salida" y vuelve a "Listo para envío" conservando su identidad. Multi-cliente: deshabilitado con "Solo se puede promover un paquete de un unico cliente".',
		isRegressionPath: false,
	},
	{
		code: 56,
		section: SECTION_I,
		title: "Dividir un paquete",
		actor: "Admin",
		feature: "`package.split`",
		steps:
			'1) Sobre un paquete no en movimiento, acción "Dividir" repartiendo las líneas en 2 bultos con nombre.',
		expectedResult:
			"Se crean paquetes hermanos con el mismo envío/estado/pata; la suma de cantidades se conserva exactamente.",
		isRegressionPath: false,
	},
	{
		code: 57,
		section: SECTION_J,
		title: "Crear envío al cliente (modos de entrega)",
		actor: "Admin",
		feature: "`shipment.createEndUser` + DeliveryMode",
		steps:
			'1) `/admin/shipments` → "Nuevo envío al cliente".\n2) Modo "A domicilio" seleccionando paquetes de 2 clientes distintos.\n3) Repetir con paquetes de un solo cliente.\n4) Crear otro con modo "Punto de retiro" y varios clientes.',
		expectedResult:
			'"A domicilio" con 2 clientes se rechaza ("Un envio a domicilio debe ser de un unico cliente"); con 1 cliente se crea "Listo para despacho". "Punto de retiro" acepta multi-cliente. "Retiro en depósito" no es opción: es la ausencia de envío.',
		isRegressionPath: true,
	},
	{
		code: 58,
		section: SECTION_J,
		title: "Entrega a domicilio",
		actor: "Admin + Cliente",
		feature: "`shipment.deliver` (homeDelivery)",
		steps:
			'1) Despachar el envío a domicilio ("Confirmar salida").\n2) Acción "Entregar" → "Confirmar entrega".\n3) Cliente revisa su journey.',
		expectedResult:
			'La llegada confirma todos los paquetes (pasan a "Recibido") y los items quedan "Entregado". El cliente ve la etapa "Entrega" completada.',
		isRegressionPath: true,
	},
	{
		code: 59,
		section: SECTION_J,
		title: "Punto de retiro: llegada ≠ entrega",
		actor: "Admin + Cliente",
		feature: "Asimetría pickup point",
		steps:
			'1) Despachar el envío a punto de retiro.\n2) Acción "Entregar" → botón "Confirmar llegada".\n3) Cliente revisa su journey.\n4) Confirmar el retiro de cada paquete con "Confirmar entrega" en `/admin/packages`.',
		expectedResult:
			'La llegada deja el envío "Recibido" pero los paquetes siguen "En tránsito"; el cliente ve el aviso "Disponible para retirar" SIN completar la etapa Entrega. Cada "Confirmar entrega" por paquete marca "Entregado" a ese cliente.',
		isRegressionPath: false,
	},
	{
		code: 60,
		section: SECTION_J,
		title: "Retiro en depósito (sin envío)",
		actor: "Admin + Cliente",
		feature: "`package.confirmDelivery` directo",
		steps:
			'1) Sobre un paquete de salida "Listo para envío" sin envío asociado, acción "Confirmar entrega" (con nota opcional).\n2) Cliente revisa el journey.',
		expectedResult:
			'El paquete pasa de "Listo para envío" a "Recibido" sin viajar; el item queda "Entregado" y el cliente ve la etapa Entrega completada.',
		isRegressionPath: false,
	},
	{
		code: 61,
		section: SECTION_J,
		title: "Demora, incidencia y recuperación",
		actor: "Admin + Cliente",
		feature: "`markDelayed` / `recover`",
		steps:
			'1) Sobre un envío "En tránsito", "Marcar demorado" con motivo.\n2) Cliente revisa el journey.\n3) Intentar "Recuperar" un paquete del envío demorado.\n4) Recuperar primero el envío y después el paquete.',
		expectedResult:
			'El cliente ve "Incidencia de fulfillment" con el motivo. Recuperar el paquete con el envío demorado se rechaza ("Primero hay que recuperar el envio"). Recuperado todo, la incidencia figura resuelta y el estado vuelve al punto previo (derivado del registro, no elegido).',
		isRegressionPath: false,
	},
	{
		code: 62,
		section: SECTION_J,
		title: "Reintentar un envío fallido",
		actor: "Admin",
		feature: "`shipment.retry`",
		steps:
			'1) "Marcar fallido" un envío en tránsito (motivo).\n2) Acción "Reintentar": nombre y código interno nuevos.',
		expectedResult:
			"Los paquetes activos se mueven al envío nuevo conservando identidad, tipo y modo; el fallido queda vacío como historia. La vista sigue al envío nuevo.",
		isRegressionPath: false,
	},
	{
		code: 63,
		section: SECTION_J,
		title: "Dar de baja mercadería (write-off)",
		actor: "Admin + Cliente",
		feature: "`package.writeOff`",
		steps:
			'1) Sobre un paquete demorado o fallido, acción "Dar de baja" con cantidades y motivo.\n2) Revisar `/admin/roll-overs` y el journey del cliente.',
		expectedResult:
			'La cantidad dada de baja genera un rollover post-asignación con motivo ("Baja de paquete..."); un paquete totalmente dado de baja queda "Cancelado". El cliente ve el aviso de reprogramación.',
		isRegressionPath: false,
	},
	{
		code: 64,
		section: SECTION_K,
		title: "Rollovers: listado y resolución",
		actor: "Admin",
		feature: "`rollOver.resolve`",
		steps:
			'1) `/admin/roll-overs`: revisar filtros por estado y etapa (Antes/Después de asignación).\n2) Sobre un rollover "Abierto", click "Resolver" con motivo.\n3) Verificar que uno resuelto no ofrece la acción.',
		expectedResult:
			"El listado muestra abiertos, reagrupados, resueltos y cancelados (los resueltos no se ocultan). Resolver exige motivo, registra la decisión sin mover dinero y queda en el tracking del item. Solo los abiertos se resuelven.",
		isRegressionPath: false,
	},
	{
		code: 65,
		section: SECTION_K,
		title: "Rollover reagrupado en la próxima operación",
		actor: "Admin + Cliente",
		feature: "Re-agregación por defecto (ADR 0005)",
		steps:
			'1) Con un rollover abierto, crear un borrador con "Incluir rollovers abiertos" activo, revisar y ejecutar.\n2) Revisar el rollover y el journey del cliente.',
		expectedResult:
			'El rollover pasa a "Reagrupado" con link a la operación nueva; la demanda sigue su curso normal en el nuevo lote. El cliente ve su item retomar el recorrido.',
		isRegressionPath: false,
	},
	{
		code: 66,
		section: SECTION_K,
		title: "Tracking admin por item",
		actor: "Admin",
		feature: "`/admin/tracking`",
		steps:
			"1) Abrir `/admin/tracking`, filtrar por evento y fuente.\n2) Click en una fila para abrir el modal del item.",
		expectedResult:
			"El modal muestra el recorrido admin de 10 etapas, el estado de fulfillment vivo, los avisos, links a carrito/operación/lote/paquete/envío y la lista cruda de eventos. Los filtros por ids (carrito, operación, paquete...) funcionan como deep-links desde otras pantallas.",
		isRegressionPath: false,
	},
	{
		code: 67,
		section: SECTION_K,
		title: "Cierre automático del pedido",
		actor: "Admin + Cliente",
		feature: "`UserOrderClosure` derivado",
		steps:
			"1) Llevar un pedido a: todos los items entregados.\n2) Otro pedido: todos los items cancelados (rollover resuelto sin entrega).\n3) Otro: un item entregado y un rollover abierto.",
		expectedResult:
			'Caso 1: la orden pasa sola a "Completado". Caso 2: pasa a "Cancelado". Caso 3: la orden sigue "En procesamiento" — un rollover abierto la mantiene abierta. El cierre nunca pisa "Reembolsado"/"Contracargo"/"Fallido" y no existe cierre manual.',
		isRegressionPath: true,
	},
];
