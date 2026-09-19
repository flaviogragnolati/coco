/**
 * Transcription of the test tables in `docs/qa/qa-ciclo-de-vida.md`. The doc is
 * the origin of the wording; the `qa_ticket` table is the source of truth for
 * status and notes once `pnpm qa:seed` has run.
 *
 * `section` keeps the literal letter prefix of the doc's heading so alphabetical
 * order is the doc's order. `isRegressionPath` marks the minimum end-to-end
 * regression chain listed at the bottom of the doc, which now runs through the
 * Mercado Pago branch only (21 + 23): the mock gateway of the old #17 is gone.
 *
 * A code that leaves this list is not erased: it moves to `retiredQaTicketCodes`
 * below and its row survives, logically deleted. `qa_ticket.code` is identity, so
 * a retired case has to keep meaning what it meant.
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
			"1) Sin sesión, agregar 2 productos desde `/products`.\n2) Loguearse.\n3) Revisar `/cart`.\n4) Variante: repetir con un usuario que ya tenga un pago en curso (un pedido con pago externo pendiente y comprobante declarado, o un checkout de Mercado Pago iniciado). Revisar `/cart` y después intentar `/checkout`.",
		expectedResult:
			'Los items del invitado se conservan y se suman al carrito del servidor del usuario. Si un producto dejó de estar disponible, aparece el toast "Quitamos un producto que ya no esta disponible."\nVariante con pago en curso: los items del invitado NO se suman. `/cart` muestra la alerta "Productos pendientes de agregar" con el motivo del servidor, los productos siguen visibles y "Ir a pagar" queda deshabilitado con la explicación debajo. `/checkout` muestra "No se pudo iniciar checkout" con el mismo motivo. Cuando el pago se resuelve, recargar la página suma los productos.',
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
		steps:
			'Precondiciones: sesión de Cliente con una cuenta de Google SIN direcciones guardadas (por ejemplo, una cuenta nueva: la app no permite borrar direcciones) y carrito editable con al menos un producto vigente. Con una dirección ya guardada, el checkout la preselecciona y "Pago" aparece habilitado desde el inicio: eso es correcto y no sirve para este caso.\n1) En `/cart`, anotar el código del carrito y hacer click en "Ir a pagar".\n2) Esperar la carga de `/checkout` y verificar que el paso activo inicial sea "Pedido".\n3) Sin cargar dirección, hacer click en "Envío", "Pago" y "Confirmar" en la barra de pasos de arriba.\n4) En otra sesión Admin, abrir `/admin/carts`, buscar el código anotado y revisar su estado.',
		expectedResult:
			'El checkout muestra la barra "Pedido → Envío → Pago → Confirmar" y comienza en "Pedido".\n"Envío" se puede abrir (el pedido ya tiene productos). "Pago" y "Confirmar" están deshabilitados y al pasar el mouse muestran "Completá los pasos anteriores".\nEn `/admin/carts`, el mismo carrito figura "En checkout"; todavía no existe una orden ni un intento de pago.',
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
			'Precondiciones: checkout iniciado y paso "Pedido" completo.\n1) Avanzar a "Envío" y hacer click en "Nueva".\n2) En "Agregar dirección", dejar vacíos los campos obligatorios y hacer click en "Guardar dirección".\n3) Completar Dirección, Ciudad, Provincia / Estado, Código postal y País. Dejar "Complemento" vacío: es opcional y sirve para piso, departamento, oficina u otra referencia interna.\n4) Guardar y comprobar qué tarjeta queda seleccionada.\n5) En esa tarjeta, hacer click en "Editar", cambiar Ciudad y Complemento, y volver a guardar.',
		expectedResult:
			'El envío vacío muestra mensajes de validación junto a cada campo obligatorio.\nEl alta muestra "Dirección guardada"; la nueva tarjeta queda con badge "Seleccionada" y habilita continuar.\nLa edición muestra "Dirección actualizada", conserva la selección y refleja Ciudad y Complemento nuevos.\nEliminar direcciones no forma parte de este caso; la falta de esa capacidad se registra como seguimiento de producto separado.',
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
		code: 18,
		section: SECTION_C,
		title: "Pago externo rechazado por admin",
		actor: "Cliente",
		feature: "Rechazo administrativo de un pago externo (ADR 0010)",
		steps:
			'Precondiciones: "Pago externo" habilitado en `/admin/payments` → Config; sesiones Cliente y Admin abiertas.\n1) Cliente: en `/checkout` → "Pago", elegir "Pago externo", aceptar los términos y hacer click en "Confirmar y pagar". Anotar el código del pedido que se muestra.\n2) Admin: en `/admin/payments`, buscar el intento del pedido (estado "Pendiente", proveedor externo) y rechazarlo con un motivo.\n3) Cliente: abrir `/my-orders/[id]` del pedido y después `/cart`.',
		expectedResult:
			'El intento pasa a "Rechazado" y el pedido a "Fallido"; no se crea demanda para fulfillment.\nEl carrito vuelve a ser editable: se pueden cambiar cantidades y volver a "Ir a pagar", que crea un intento nuevo.\nYa no existe el pago "mock" ni el alta manual de métodos de pago: un rechazo se prueba así o con Mercado Pago sandbox.',
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
			'Precondiciones: dos sesiones abiertas en navegadores distintos (Cliente y Admin). El Cliente tiene en el carrito un producto activo, anotado por nombre.\n1) Cliente: ir a `/checkout` y avanzar por "Pedido", "Envío" y "Pago" hasta el paso "Confirmar". Aceptar los términos y NO hacer click en "Confirmar y pagar" todavía.\n2) Admin: abrir `/admin/products`, buscar ese producto por nombre, abrir "Editar", desactivar el switch "Producto activo" y hacer click en "Guardar". Comprobar que la fila queda como inactiva.\n3) Cliente: sin refrescar la página, hacer click en "Confirmar y pagar". Leer el mensaje que aparece.\n4) Cliente: hacer click en "Volver al carrito". En `/cart`, mirar la línea del producto desactivado.\n5) Admin: en `/admin/carts`, buscar el carrito del Cliente y abrir su detalle.',
		expectedResult:
			'Paso 3: la confirmación se rechaza con "Uno de los productos del carrito ya no está disponible. Revisá el carrito antes de continuar."\nPaso 4: el carrito queda editable y permite quitar el producto inválido.\nPaso 5: el carrito no tiene un pedido ni un intento de pago nuevos por este intento.',
		isRegressionPath: false,
	},
	{
		code: 21,
		section: SECTION_D,
		title: "Redirección a Checkout Pro",
		actor: "Cliente",
		feature: "Preferencia MP + redirect",
		steps:
			'Precondiciones: entorno QA ya configurado (Mercado Pago en "Sandbox", URLs en `https://coco-kappa-ashy.vercel.app`) y un Cliente con carrito y dirección listos. Tener a mano el usuario comprador de prueba de MP, que el responsable de QA pasa por privado. Sandbox es el entorno de Mercado Pago para cuentas, compradores y medios de prueba; no mueve dinero real.\n1) En "Pago", elegir "Mercado Pago" y avanzar a "Confirmar".\n2) Aceptar los términos y hacer click en "Confirmar y pagar".\n3) Sin completar todavía el pago en Checkout Pro, abrir `/admin/payments` → "Intentos" en la sesión Admin y buscar el intento por el email del Cliente (el más reciente).',
		expectedResult:
			'La app muestra "Redirigiendo a Mercado Pago" y navega al Checkout Pro de prueba.\nEl intento aparece "pending", con proveedor `mercadopago · sandbox` y en "Refs" solo "Preferencia: …"; la orden queda "Pendiente" y el carrito "En checkout".\nLa pantalla externa usa únicamente credenciales de comprador y medios de pago de prueba.',
		isRegressionPath: true,
	},
	{
		code: 22,
		section: SECTION_D,
		title: "Pantallas de retorno informativas",
		actor: "Cliente",
		feature: "Back URLs success/failure/pending",
		steps:
			"Precondiciones: ninguna; no hace falta pagar ni pasar por Mercado Pago. Las tres rutas se abren directo sobre `https://coco-kappa-ashy.vercel.app`.\n1) Abrir `/checkout/mercadopago/success` (https://coco-kappa-ashy.vercel.app/checkout/mercadopago/success) y registrar título, badge y alerta.\n2) Abrir `/checkout/mercadopago/failure` (https://coco-kappa-ashy.vercel.app/checkout/mercadopago/failure) y repetir la revisión.\n3) Abrir `/checkout/mercadopago/pending` (https://coco-kappa-ashy.vercel.app/checkout/mercadopago/pending) y repetir la revisión.\n4) Confirmar que ninguna de las tres páginas ofrece o ejecuta una mutación de estado.",
		expectedResult:
			'Success muestra "Pago enviado a confirmación"; failure, "Pago no confirmado"; pending, "Pago pendiente".\nLas tres muestran "Estado sujeto a reconciliación" y explican que esa pantalla no actualiza el pago.\nLas tres permiten ir al inicio o a "Ver mis pedidos"; la verdad del pago sigue dependiendo del webhook firmado y la consulta al proveedor.',
		isRegressionPath: false,
	},
	{
		code: 23,
		section: SECTION_D,
		title: "Webhook aprobado acredita el pedido",
		actor: "Cliente + Sistema",
		feature: "Reconciliación por webhook firmado",
		steps:
			'Precondiciones: continuar desde el intento de #21 (Checkout Pro abierto, sin pagar). En Checkout Pro iniciar sesión con el usuario comprador de prueba, nunca con el vendedor. Pagar con la tarjeta de prueba que pasa el responsable de QA, nombre del titular `APRO` y DNI 12345678 (tabla pública de tarjetas de prueba de MP; si MP lo rechaza, usar el documento del perfil del comprador de prueba).\n1) Completar el pago en Checkout Pro y volver por la URL de éxito.\n2) En `/admin/payments` → "Intentos", abrir el intento de #21 y copiar el id del campo "Pago (id de Mercado Pago)". En "Eventos", buscar ese id: debe aparecer un evento de tipo `payment` con Firma "válida".\n3) En la sesión Cliente, abrir `/my-orders/[id]` del pedido y refrescar hasta que termine la reconciliación.',
		expectedResult:
			'El evento queda vinculado y con firma válida; el intento pasa a "completed" y el cliente ve el pago "Aprobado".\nEl campo "Pago (id de Mercado Pago)" del intento muestra el id del pago.\nLa orden pasa a "En procesamiento", el carrito a "Enviado" y sus items a submitted.\nEl detalle del cliente muestra "Pedido confirmado". La proyección puede aparecer unos segundos después porque el tracking es asíncrono.\nSi el evento no llega o llega con Firma "no válida" y error "Firma inválida: …", es configuración de entorno: el caso queda "Bloqueado", no "Fallido".',
		isRegressionPath: true,
	},
	{
		code: 24,
		section: SECTION_D,
		title: "Webhook rechazado / pendiente no rompe el carrito",
		actor: "Cliente + Sistema",
		feature: "Mapeo de estados MP",
		steps:
			'Precondiciones: mismo comprador de prueba, tarjeta y DNI que #23. Cada caso es un checkout nuevo con "Mercado Pago" (pasos 1 y 2 de #21); si Checkout Pro ofrece reintentar, no reintentar.\n1) Pagar en Checkout Pro con nombre del titular `OTHE` (MP lo rechaza).\n2) En otro checkout nuevo, pagar con nombre del titular `CONT` (MP lo deja pendiente, `in_process`).\n3) Para cada uno, revisar el intento en `/admin/payments` → "Intentos" (buscar por email del Cliente), el pedido en `/my-orders` y el carrito en `/cart`.',
		expectedResult:
			'`OTHE`: el intento queda "failed" y el cliente ve el pago "Rechazado"; la orden sigue "Pendiente" y el carrito sigue editable.\n`CONT`: el intento queda "inProcess" y el cliente ve el pago "En proceso" sin acreditar nada; la orden sigue "Pendiente".',
		isRegressionPath: false,
	},
	{
		code: 25,
		section: SECTION_D,
		title: "Webhook con firma inválida se rechaza",
		actor: "Admin",
		feature: "Validación de firma",
		steps:
			'Precondiciones: una terminal con `curl` y la sesión Admin en `/admin/payments`. El comando usa a propósito una firma inválida; no hace falta ninguna credencial. En `/admin/payments` → Config, el switch "Webhooks unsigned dev" debe estar apagado; si está prendido, el caso queda "Bloqueado".\n1) Ejecutar: `curl -i -X POST \'https://coco-kappa-ashy.vercel.app/api/mercadopago/webhook?type=payment&data.id=123\' -H \'Content-Type: application/json\' -H \'x-request-id: qa-firma-invalida\' -H \'x-signature: ts=1,v1=invalida\' -d \'{"type":"payment","action":"payment.updated","data":{"id":"123"}}\'`\n2) En `/admin/payments` → "Eventos", buscar `qa-firma-invalida` y abrir el evento.',
		expectedResult:
			'Paso 1: HTTP 401 con cuerpo `{"error":"invalid signature"}`.\nPaso 2: el evento aparece con estado "rejected", Firma "no válida", Intento "Sin vincular" y, en su detalle, un error que empieza con "Firma inválida".\nNo cambia ningún pago ni pedido.',
		isRegressionPath: false,
	},
	{
		code: 26,
		section: SECTION_D,
		title: "Replay del webhook es idempotente",
		actor: "Admin",
		feature: "Idempotencia de reconciliación",
		steps:
			'Precondiciones: el pedido acreditado en #23.\n1) En `/admin/payments` → "Eventos", abrir el evento `payment` de #23 (buscar por el id del campo "Pago (id de Mercado Pago)") y hacer click en "Reprocesar" dos veces.\n2) Revisar el intento en "Intentos" y el seguimiento del pedido en `/my-orders/[id]`.',
		expectedResult:
			'No se duplican submissions ni eventos de tracking (el timeline del item sigue con un solo "Pedido confirmado").\nLa transacción no retrocede de estado.',
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
		steps:
			'Precondiciones: Pago externo habilitado y pedido confirmado por el Cliente, pero todavía no liquidado ni rechazado por un Admin.\n1) En "Mis pedidos", abrir el pedido pendiente creado con Pago externo.\n2) Ubicar la card "Seguimiento del pedido" antes de que el Admin procese el intento.\n3) En otra sesión Admin, comprobar en `/admin/payments` que el intento sigue pendiente.',
		expectedResult:
			'La card muestra "El seguimiento comienza cuando se acredita el pago." y no dibuja etapas.\nLa orden y el intento permanecen pendientes; abrir el detalle no acredita ni modifica el pago.',
		isRegressionPath: false,
	},
	{
		code: 31,
		section: SECTION_E,
		title: "Journey de 6 etapas avanza con el fulfillment",
		actor: "Cliente + Admin",
		feature: "Timeline de 6 etapas del cliente",
		steps:
			'Precondiciones: un pedido con pago acreditado (estado "En procesamiento") con un solo producto, del que se conoce el código de pedido y el de carrito. Sesiones Cliente (dueño del pedido) y Admin abiertas. Después de cada paso Admin, el Cliente refresca `/my-orders/[id]` y anota qué etapa está resaltada.\n1) Cliente: abrir `/my-orders/[id]`. Mirar el bloque "Seguimiento del pedido".\n2) Admin: en `/admin/operations`, "Nueva operación" → "Revisar" → "Ejecutar", con un rango de fechas que incluya el pago del pedido.\n3) Admin: en `/admin/supplier-orders`, abrir la orden de proveedor que creó la operación, hacer click en "Solicitar" y después en "Confirmar" sin cambiar cantidades.\n4) Admin: en la misma orden, "Registrar despacho". En `/admin/shipments`, abrir el envío interno que quedó "Listo para despacho", hacer click en "Despachar" → "Confirmar salida", y después en "Recibir" con las cantidades completas.\n5) Admin: en `/admin/packages`, abrir el paquete de entrada "Recibido" y hacer click en "Fraccionar" → confirmar.\n6) Admin: en `/admin/shipments`, "Nuevo envío al cliente" (entrega a domicilio) con el paquete de salida del pedido, "Despachar" y después "Entregar".',
		expectedResult:
			'Paso 1: la etapa resaltada es "Pedido confirmado".\nPaso 2: "Preparación". Paso 3: "Proveedor". Paso 4: "Envío" (el traslado interno ya cuenta como envío). Paso 5: sigue "Envío", nunca retrocede a "Empaque". Paso 6: "Entrega", y todas las etapas anteriores quedan completas con fecha.\nNinguna etapa retrocede entre refrescos. Un cambio puede tardar unos segundos en verse porque la proyección es asíncrona.',
		isRegressionPath: true,
	},
	{
		code: 32,
		section: SECTION_E,
		title: "Journey unificado vs por item",
		actor: "Cliente",
		feature: "Roll-up del recorrido",
		steps:
			'Precondiciones: un pedido con pago acreditado con DOS productos distintos (por ejemplo, tomate y manzana), ninguno todavía incluido en una operación. Sesiones Cliente (dueño del pedido) y Admin abiertas.\n1) Cliente: abrir `/my-orders/[id]` y mirar el bloque "Seguimiento del pedido".\n2) Admin: en `/admin/operations`, "Nueva operación" → "Revisar". En la lista de demanda, marcar el checkbox "Omitir" de la fila de uno de los dos productos del pedido y hacer click en "Ejecutar".\n3) Cliente: refrescar `/my-orders/[id]` y mirar de nuevo el bloque.\n4) Admin: crear otra operación ("Nueva operación" → "Revisar" → "Ejecutar") que incluya el producto omitido.\n5) Cliente: refrescar `/my-orders/[id]` por última vez.',
		expectedResult:
			'Paso 1: un único recorrido con el texto "Todos los productos avanzan juntos por este recorrido."\nPaso 3: el bloque se divide en un recorrido por producto, cada uno con su nombre y el badge de su etapa ("Preparación" en uno, "Pedido confirmado" en el otro).\nPaso 5: con ambos productos en "Preparación", el bloque vuelve a ser un único recorrido, sin duplicados.',
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
			'Aparecen avisos legibles: "Reprogramado..." con el motivo que cargó el admin debajo, "Incidencia de fulfillment" (una incidencia en preparación, transporte o entrega) también con su motivo, luego "Incidencia resuelta" sin motivo, y "Disponible para retirar": este último como aviso, sin marcar la etapa Entrega. Para comprobar esto último, usar un item que no haya tenido otra entrega antes.',
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
			'Precondiciones: al menos un intento MP pagado (#23) y uno sin pagar (un checkout de #21 que quedó sin pagar). `providerPaymentId` = campo "Pago (id de Mercado Pago)".\n1) En `/admin/payments` → "Intentos", abrir un intento MP cuya columna "Refs" muestra "Pago: …" (por ejemplo el de #23) y hacer click en "Reconciliar ahora".\n2) Abrir un intento MP cuya columna "Refs" muestra solo "Preferencia: …" y mirar el botón "Reconciliar ahora".',
		expectedResult:
			'Paso 1: toast "Intento reconciliado" y el estado coincide con el pago real en MP.\nPaso 2: el botón está deshabilitado y debajo dice "Sin id de pago de Mercado Pago: el comprador todavía no pagó esta preferencia. El id llega con el webhook del pago."',
		isRegressionPath: false,
	},
	{
		code: 37,
		section: SECTION_F,
		title: "Reprocesar e ignorar eventos",
		actor: "Admin",
		feature: "Gestión de eventos de proveedor",
		steps:
			'Precondiciones: al menos un evento `payment` (después de #23) y el evento rechazado de #25.\n1) En `/admin/payments` → "Eventos", abrir el evento `payment` de #23 (buscar por el id del campo "Pago (id de Mercado Pago)") y hacer click en "Reprocesar".\n2) Abrir el evento de #25 (buscar `qa-firma-invalida`), escribir un motivo de 3 caracteres y mirar el botón "Ignorar".\n3) Escribir un motivo de 5 caracteres o más y hacer click en "Ignorar".',
		expectedResult:
			'Paso 1: toast "Evento reprocesado".\nPaso 2: con menos de 5 caracteres "Ignorar" está deshabilitado.\nPaso 3: toast "Evento ignorado" y el evento queda "ignored".',
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
			'Toast "Operación ejecutada". Se crean órdenes de proveedor "Pendiente", lotes y asignaciones; la demanda sin proveedor, bajo MOQ o fuera de step queda en rollover previo a la asignación con motivo explícito.\nEn `/admin/tracking`, cada item asignado termina en "Asignado a proveedor" ("En operación" es solo un paso intermedio del registro) y su journey de cliente pasa a "Preparación". Los items que fueron a rollover quedan "Reprogramado" y su journey muestra el aviso de reprogramación.',
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
			'1) `/admin/packages`: sobre el paquete de entrada "Recibido", acción "Fraccionar".\n2) Revisar las cantidades propuestas por carrito y confirmar.\n3) Reabrir el mismo paquete de entrada.',
		expectedResult:
			'Se crea un paquete de salida "Listo para envío" por carrito (un mismo cliente con dos carritos recibe dos paquetes); el paquete de entrada queda "Recibido" como historia. Toast "Fraccionado en {n} paquete(s) de salida".\nAl reabrirlo, el detalle indica "No queda cantidad recibida sin fraccionar." y "Fraccionar" queda deshabilitado, aunque otro paquete de entrada cubra la misma demanda.\nLos items pasan a "Empaquetado". El journey del cliente muestra "Empaque", salvo que el item ya haya pasado por un envío interno: en ese caso queda en "Envío", porque el journey nunca retrocede.',
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
			'1) Sobre un envío "En tránsito", "Marcar demorado" con motivo.\n2) Cliente revisa el journey.\n3) En `/admin/packages`, abrir un paquete de ese envío y mirar la acción "Recuperar".\n4) En `/admin/shipments`, abrir el envío demorado y hacer click en "Recuperar" (el diálogo indica a qué estado vuelve).\n5) Volver al paquete y al journey del cliente.',
		expectedResult:
			'Paso 2: el cliente ve "Incidencia de fulfillment" (incidencia de transporte) con el motivo cargado.\nPaso 3: "Recuperar" del paquete está deshabilitado con el motivo "Primero hay que recuperar el envio".\nPaso 4: el envío vuelve a "En transito" (o a "Listo para despacho" si se había demorado antes de salir) y sus paquetes demorados lo acompañan; el destino lo decide el sistema, no el operador.\nPaso 5: el paquete ya no está demorado y no necesita recuperarse aparte; el cliente ve "Incidencia resuelta".',
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
			'Caso A (fixture del seed; se consume al ejecutarlo y `pnpm db:seed` lo restaura): en `/admin/packages`, abrir "PKG-SEED-OUT-PICKUP-B" (pedido ORD-SEED-PICKUP, en punto de retiro) y hacer click en "Confirmar entrega". Después, en `/admin/carts`, abrir el carrito CART-SEED-PICKUP y mirar el estado de su pedido.\nCaso B: un pedido cuyos items quedan todos cancelados (rollover resuelto sin entrega).\nCaso C: un pedido con un item entregado y otro con un rollover abierto.',
		expectedResult:
			'Caso A: ORD-SEED-PICKUP pasa solo de "En procesamiento" a "Completado". Un pedido con items entregados y otros cancelados también termina "Completado".\nCaso B: pasa a "Cancelado".\nCaso C: sigue "En procesamiento": un rollover abierto lo mantiene abierto.\nEl cierre nunca pisa "Reembolsado", "Contracargo" ni "Fallido", no existe cierre manual y no depende de un plazo. Cancelar el pedido no cancela un pago externo pendiente (ADR 0005).',
		isRegressionPath: true,
	},
];

/**
 * Codes that the seed keeps logically deleted. A test lands here when the feature
 * it validated stopped existing, never when it merely fails: the row keeps its
 * identity, history and tracking, and only stops showing up in the active board.
 *
 * The retirement is monotonic: `qa-seed.ts` may take a code listed here from
 * active to deleted, and that is the only direction it can move it. Bringing one
 * back is a deliberate admin action, never the side effect of a seed run.
 *
 * - 17 — mock payment gateway, removed by ADR 0010.
 *
 * `implementation-plan-qa-coverage-expansion.md` extends this list with 15 and 18
 * when it runs; it must add to the list, not reimplement the mechanism.
 */
export const retiredQaTicketCodes: number[] = [15, 17];
