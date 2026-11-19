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
const SECTION_L = "L. Tutorial del cliente";

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
			'Precondiciones: catálogo de Quintal cargado y sin productos demo, sin sesión y con el pedido vacío. Para el paso 2, una sesión Admin.\n1) Ir a `/products` y mirar la tarjeta de un producto por kg (por ejemplo "Almendra non pareil 20/22") y la de uno por unidad con presentación (por ejemplo "Pasta de maní Entre Nuts 370 g").\n2) Contrastar contra el admin: un producto inactivo o con términos vencidos.\n3) Probar búsqueda, filtros de marca/unidad/precio y orden.\n4) Click en la foto de un producto, cerrar el detalle y click en su nombre.',
		expectedResult:
			'Solo aparecen productos activos con términos vigentes.\nCada tarjeta es compacta y muestra, de arriba abajo: la foto (con el descuento encima, si tiene), la marca chica sobre el nombre (solo si tiene), el precio por paso en una sola línea (por ejemplo "$ 11.300 por 500 g" o "$ 4.200 por frasco"), debajo y más chico el precio comparativo (por ejemplo "$ 22.600 / kg" o "$ 11.351 / kg"), el selector de cantidad (con "kg" en los productos por peso y solo el número en los envasados) y el botón "Sumar al pedido", sin monto, alineado con el de las otras tarjetas de la fila.\nLa foto se ve completa en un cuadrado.\nEl precio comparativo aparece siempre, también con paso de 1 kg o 1 L (por ejemplo "Aceite de oliva extra virgen botella 1 L").\nLa tarjeta no muestra la descripción del producto (queda en el detalle) ni el total; el total se ve en Tu pedido al sumar.\nNo aparecen MOQ, "por bloque MOQ", "≈ $X / unidad", el chip de moneda ni "Marca disponible próximamente", y no hay vista de tabla.\nLa foto y el nombre abren el detalle del producto (la URL suma `?product=`).\nBúsqueda insensible a acentos; "Limpiar filtros" restaura el listado.',
		isRegressionPath: false,
	},
	{
		code: 6,
		section: SECTION_B,
		title: "Agregar un item al carrito",
		actor: "Cliente",
		feature: "Alta de item con la cantidad elegida en la tarjeta",
		steps:
			'Precondiciones: catálogo de Quintal cargado y sin productos demo, sin sesión y con el pedido vacío.\n1) En `/products`, buscar un producto por kg (por ejemplo "Almendra non pareil 20/22") y anotar la cantidad del selector y el precio por paso de su tarjeta.\n2) Click en "+" una vez.\n3) Click en "Sumar al pedido".\n4) Cerrar el mini-carrito y mirar la misma tarjeta.\n5) Click en "Ver en tu pedido".',
		expectedResult:
			'Paso 1: el selector arranca en el mínimo (0,5 kg) y el botón dice "Sumar al pedido".\nPaso 2: la cantidad pasa a 1 kg; el precio por paso de arriba no cambia.\nPaso 3: se abre el mini-carrito con el producto en 1 kg, la cantidad elegida y no el mínimo; el total se ve en el mini-carrito.\nPaso 4: en lugar del selector, la tarjeta muestra "Ya tenés 1 kg en tu pedido" y el botón pasa a "Ver en tu pedido".\nPaso 5: se abre el mini-carrito y la cantidad no cambia.',
		isRegressionPath: true,
	},
	{
		code: 7,
		section: SECTION_B,
		title: "Reglas de cantidad MOQ / step / máximo",
		actor: "Cliente + Admin",
		feature:
			"Normalización de cantidades (mínimo, paso, máximo y coma decimal)",
		steps:
			'Precondiciones: catálogo de Quintal cargado y sin productos demo. Los productos por kg tienen mínimo 0,5 y paso 0,5; los que se venden por unidad, mínimo 1 y paso 1. Ninguno trae máximo, así que el caso lo carga desde el admin. Sesión Admin y sesión Cliente.\n1) En `/admin/product-terms`, pestaña "Cliente", click en "Editar" sobre los términos vigentes de un producto de Quintal por kg (por ejemplo "Almendra non pareil 20/22"), cargar 2 en "Máximo" y guardar.\n2) Como Cliente, agregar ese producto desde `/products` y abrir `/cart`.\n3) Con la cantidad en el mínimo, intentar bajar con "−".\n4) Subir con "+" hasta que el botón se deshabilite, anotando cada valor.\n5) Tipear "1,5" en el campo de cantidad y salir del campo. Después tipear "1,3" y salir, y por último "5" y salir.\n6) Agregar un producto de Quintal por unidad (por ejemplo "Aceite de oliva extra virgen botella 1 L"), subir con "+" dos veces y bajar con "−" hasta el mínimo.\n7) Restaurar: en `/admin/product-terms`, editar los términos del paso 1, dejar "Máximo" vacío y guardar. Quitar los dos productos del carrito.',
		expectedResult:
			'El producto por kg entra con 0,5 y "−" está deshabilitado: nunca baja del mínimo.\n"+" sube de a 0,5 (0,5 → 1 → 1,5 → 2) y se deshabilita en 2, el máximo.\nAl perder el foco, "1,5" queda tal cual (la coma es el separador decimal), "1,3" se corrige a 1,5 (el múltiplo válido siguiente) y "5" baja a 2, el máximo (toast "Ajustamos la cantidad..." si lo corrige el servidor).\nEl producto por unidad entra con 1, sube y baja de a 1 y no baja de 1.\nCon "Máximo" vacío otra vez, el producto por kg ya no tiene tope.',
		isRegressionPath: false,
	},
	{
		code: 8,
		section: SECTION_B,
		title: "Producto sin step = cantidad fija",
		actor: "Admin + Cliente",
		feature: "Cantidad bloqueada en el mínimo (términos sin step)",
		steps:
			'Precondiciones: catálogo de Quintal cargado y sin productos demo. Ningún producto viene con cantidad fija: la arma el admin vaciando el step. Sesión Admin y sesión Cliente.\n1) En `/admin/product-terms`, pestaña "Cliente", click en "Editar" sobre los términos vigentes de un producto de Quintal por unidad (por ejemplo "Pasta de maní Entre Nuts 370 g"). Anotar "Paso", vaciar el campo y guardar.\n2) Como Cliente, mirar la tarjeta de ese producto en `/products`, agregarlo y abrir `/cart`.\n3) Intentar cambiar la cantidad con "−" y "+", y tipeando "3" en el campo y saliendo de él.\n4) Restaurar: en `/admin/product-terms`, editar los mismos términos, volver a cargar el valor anotado en "Paso" y guardar.\n5) Recargar `/cart` y click en "+". Quitar el producto del carrito.',
		expectedResult:
			'Los términos se guardan sin step (toast "Términos de cliente actualizados").\nEn `/products` la tarjeta no tiene selector: muestra solo la cantidad fija (por ejemplo "1 frasco 370 g") y el botón "Sumar al pedido", sin monto, sin línea "Total" aparte.\nEn `/cart` la cantidad queda fija en el mínimo y los botones "−"/"+" están deshabilitados; "3" vuelve al mínimo al perder el foco.\nCon el paso restaurado, "+" vuelve a sumar de a 1.',
		isRegressionPath: false,
	},
	{
		code: 9,
		section: SECTION_B,
		title: "Subtotal = precio por unidad × cantidad",
		actor: "Cliente",
		feature: "Precio por unidad (precio por unidad × cantidad, coma decimal)",
		steps:
			'1) Producto por kg con mínimo y paso 0,5 y precio por unidad conocido.\n2) Escribir "1,5" en la cantidad y salir del campo.\n3) Verificar la cantidad y el subtotal de la línea.',
		expectedResult:
			"La cantidad queda en 1,5 kg y el subtotal es 1,5 × precio por unidad, con el descuento aplicado si lo hay. Los totales del resumen se muestran por moneda.",
		isRegressionPath: false,
	},
	{
		code: 10,
		section: SECTION_B,
		title: "Quitar item y vaciar carrito",
		actor: "Cliente",
		feature: "Bajas del carrito",
		steps:
			'1) En `/cart`, quitar un item con el botón de basura.\n2) Click en "Vaciar pedido".',
		expectedResult:
			'El item desaparece (toast "Producto quitado de tu pedido"); "Vaciar pedido" deja el estado vacío ("Tu pedido está vacío") con CTA "Ver productos".',
		isRegressionPath: false,
	},
	{
		code: 11,
		section: SECTION_B,
		title: "Edición desde el mini-carrito en checkout",
		actor: "Cliente",
		feature: "Carrito vivo durante el checkout",
		steps:
			'1) Iniciar checkout con 2 items.\n2) En el paso "Pedido", click "Editar pedido" y quitar un item desde el mini-carrito.\n3) Quitar también el último item.',
		expectedResult:
			'El resumen del checkout refleja el cambio al instante. Al vaciarlo aparece "Tu pedido está vacío" y los pasos posteriores se bloquean.',
		isRegressionPath: false,
	},
	{
		code: 12,
		section: SECTION_C,
		title: "Inicio del checkout (4 pasos)",
		actor: "Cliente",
		feature: "`checkout.start` + stepper",
		steps:
			'Precondiciones: sesión de Cliente con una cuenta de Google SIN direcciones guardadas (por ejemplo, una cuenta nueva: la app no permite borrar direcciones) y carrito editable con al menos un producto vigente. Con una dirección ya guardada, el checkout la preselecciona y "Pago" aparece habilitado desde el inicio: eso es correcto y no sirve para este caso.\n1) En `/cart`, anotar el código del carrito y hacer click en "Ir a pagar".\n2) Esperar la carga de `/checkout` y verificar que el paso activo inicial sea "Pedido".\n3) Sin cargar dirección, hacer click en "Entrega", "Pago" y "Confirmar" en la barra de pasos de arriba.\n4) En otra sesión Admin, abrir `/admin/carts`, buscar el código anotado y revisar su estado.',
		expectedResult:
			'El checkout muestra la barra "Pedido → Entrega → Pago → Confirmar" y comienza en "Pedido".\n"Entrega" se puede abrir (el pedido ya tiene productos). "Pago" y "Confirmar" están deshabilitados y al pasar el mouse muestran "Completá los pasos anteriores".\nEn `/admin/carts`, el mismo carrito figura "En checkout"; todavía no existe una orden ni un intento de pago.',
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
			'Alerta "No se pudo iniciar checkout" con el mensaje del servidor ("Tu pedido está vacío..." o "No encontramos tu pedido para iniciar checkout.") y botones "Volver a tu pedido" / "Ver productos".',
		isRegressionPath: false,
	},
	{
		code: 14,
		section: SECTION_C,
		title: "Alta y edición de dirección de envío",
		actor: "Cliente",
		feature: 'Address book en el paso "Entrega"',
		steps:
			'Precondiciones: checkout iniciado y paso "Pedido" completo.\n1) Avanzar a "Entrega" (con "A domicilio" si se ofrece un punto de retiro) y hacer click en "Nueva".\n2) En "Agregar dirección", dejar vacíos los campos obligatorios y hacer click en "Guardar dirección".\n3) Completar Dirección, Ciudad, Provincia / Estado, Código postal y País. Dejar "Complemento" vacío: es opcional y sirve para piso, departamento, oficina u otra referencia interna.\n4) Guardar y comprobar qué tarjeta queda seleccionada.\n5) En esa tarjeta, hacer click en "Editar", cambiar Ciudad y Complemento, y volver a guardar.',
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
			'Precondiciones: "Pago externo" y "Mercado Pago" (en "Sandbox") habilitados en `/admin/payments` → Config; sesiones Cliente (con carrito y dirección listos) y Admin abiertas. No hace falta pagar en Mercado Pago.\n1) Cliente: en `/checkout`, elegir "Pago externo" y llegar al paso "Confirmar". Leer el texto de los términos.\n2) Intentar "Confirmar y pagar" sin activar el switch de términos.\n3) Activar el switch y hacer click en "Confirmar y pagar". Anotar el código del pedido y abrirlo en `/my-orders/[id]`.\n4) Admin: en `/admin/payments` → "Intentos", buscar el intento de ese pedido, revisar su estado y rechazarlo con un motivo (así se libera el carrito, como en #18).\n5) Cliente: en `/cart`, hacer click en "Ir a pagar", elegir "Mercado Pago", activar el switch y hacer click en "Confirmar y pagar". No completar el pago en Checkout Pro.',
		expectedResult:
			'Paso 1: los términos muestran condiciones legibles (texto de prueba hasta que llegue el definitivo), no "lorem ipsum".\nPaso 2: sin el switch, "Confirmar y pagar" está deshabilitado.\nPaso 3: con "Pago externo" el pedido se registra con los datos de transferencia y el cliente ve el pago "Pendiente": no se acredita solo.\nPaso 4: antes de rechazarlo, el intento figura "pending"; solo un Admin lo cobra o lo rechaza.\nPaso 5: con "Mercado Pago" la app muestra "Redirigiendo a Mercado Pago" y navega a Checkout Pro.',
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
			'Error "El checkout de esta versión solo permite pedidos con una moneda." El pedido no se crea dos veces ni queda a medias.',
		isRegressionPath: false,
	},
	{
		code: 20,
		section: SECTION_C,
		title: "Producto deshabilitado durante el checkout",
		actor: "Cliente + Admin",
		feature: "Revalidación de términos",
		steps:
			'Precondiciones: dos sesiones abiertas en navegadores distintos (Cliente y Admin). El Cliente tiene en el carrito un producto activo, anotado por nombre.\n1) Cliente: ir a `/checkout` y avanzar por "Pedido", "Entrega" y "Pago" hasta el paso "Confirmar". Aceptar los términos y NO hacer click en "Confirmar y pagar" todavía.\n2) Admin: abrir `/admin/products`, buscar ese producto por nombre, abrir "Editar", desactivar el switch "Producto activo" y hacer click en "Guardar". Comprobar que la fila queda como inactiva.\n3) Cliente: sin refrescar la página, hacer click en "Confirmar y pagar". Leer el mensaje que aparece.\n4) Cliente: hacer click en "Volver al carrito". En `/cart`, mirar la línea del producto desactivado.\n5) Admin: en `/admin/carts`, buscar el carrito del Cliente y abrir su detalle.',
		expectedResult:
			'Paso 3: la confirmación se rechaza con "Uno de los productos de tu pedido ya no está disponible. Revisalo antes de continuar."\nPaso 4: el carrito queda editable y permite quitar el producto inválido.\nPaso 5: el carrito no tiene un pedido ni un intento de pago nuevos por este intento.',
		isRegressionPath: false,
	},
	{
		code: 21,
		section: SECTION_D,
		title: "Redirección a Checkout Pro sandbox",
		actor: "Cliente + Admin",
		feature: "Checkout y preferencia visibles en pantalla",
		steps:
			'Precondiciones: sitio https://coco-kappa-ashy.vercel.app; sesiones Cliente y Admin en perfiles distintos. En `/admin/payments` → Config, Mercado Pago está en "Sandbox" y habilitado. El Cliente tiene un producto activo y una opción de entrega disponible. Comprador MP de prueba entregado por privado; no usar la cuenta vendedora.\n1) Cliente: abrir `/cart`, anotar producto, cantidad y total; elegir "Ir a pagar" y completar "Pedido" y "Entrega".\n2) En "Pago", elegir "Mercado Pago"; en "Confirmar", comprobar el total y aceptar términos. Pulsar "Confirmar y pagar".\n3) Comprobar que se abre Checkout Pro. Dejarlo sin pagar para continuar #27 y luego #23.\n4) Admin: abrir `/admin/payments` → "Intentos", buscar por email del Cliente y abrir el intento más reciente. Anotar pedido, número de intento, preferencia y monto visibles. Anotar también la hora en que se abrió Checkout Pro y los minutos de expiración configurados en Config.',
		expectedResult:
			'La app muestra "Redirigiendo a Mercado Pago" y abre Checkout Pro. El monto coincide con el confirmado en CoCo y no tiene descuento por transferencia.\nEl intento muestra pending, proveedor mercadopago · sandbox y "Preferencia" con un identificador. "Pago (id de Mercado Pago)" puede mostrar "Sin dato" antes de pagar.\nEl pedido sigue pendiente. No aparece todavía "Pedido confirmado" en el seguimiento. Registrar capturas de checkout y detalle, sin credenciales.',
		isRegressionPath: true,
	},
	{
		code: 22,
		section: SECTION_D,
		title: "Pantallas de retorno informativas",
		actor: "Cliente",
		feature: "Retornos success/failure/pending por navegación",
		steps:
			'Precondiciones: sitio https://coco-kappa-ashy.vercel.app; no hace falta pagar ni tener un pedido.\n1) Abrir `/checkout/mercadopago/success` y anotar título, badge y aviso.\n2) Abrir `/checkout/mercadopago/failure` y repetir.\n3) Abrir `/checkout/mercadopago/pending` y repetir.\n4) En cada página, comprobar los enlaces "Volver al inicio" y "Ver mis pedidos". Si había un pedido de prueba abierto, volver a su detalle y comprobar que abrir estos retornos no lo acreditó.',
		expectedResult:
			'Success: "Pago enviado a confirmación" y "Retorno exitoso". Failure: "Pago no confirmado" y "No confirmado". Pending: "Pago pendiente" y "Pendiente".\nLas tres muestran "Estado sujeto a reconciliación" y aclaran que esa pantalla no actualiza el pago. Los enlaces llevan al inicio y a los pedidos; sin sesión puede pedirse iniciar sesión.\nAbrir una URL de retorno no alcanza para ver un pedido como pagado. Guardar captura de cada retorno.',
		isRegressionPath: false,
	},
	{
		code: 23,
		section: SECTION_D,
		title: "Pago sandbox aprobado confirma el pedido en la UI",
		actor: "Cliente + Admin",
		feature: "Compra APRO y resultado visible en Cliente/Admin",
		steps:
			'Precondiciones: sitio https://coco-kappa-ashy.vercel.app; continuar con la preferencia sin pagar de #21/#27; perfiles Cliente y Admin separados y navegador de incógnito para el comprador MP de prueba. Visa de prueba 4509 9535 6623 3704, vencimiento 11/30, código 123; titular APRO para aprobado, OTHE para rechazado y CONT para pendiente; DNI 12345678 cuando se solicite. Credenciales y código de acceso del comprador MP: Flavio los entrega por privado.\n1) En Checkout Pro, ingresar con el comprador de prueba y pagar usando el titular `APRO`. Capturar el resultado sin incluir credenciales.\n2) Volver a CoCo. Admin: en `/admin/payments` → "Intentos", buscar por email o código de pedido, abrir el intento y actualizar la pantalla hasta observar el resultado.\n3) Copiar el identificador visible en "Pago (id de Mercado Pago)". En "Eventos", buscar ese identificador y abrir la fila de tipo payment.\n4) Cliente: abrir `/my-orders/[id]`, actualizar si hace falta y desplegar el seguimiento de cada producto. Admin: abrir `/admin/carts`, filtrar por el Cliente y abrir el carrito cuyo detalle referencia este pedido para leer su Estado. Registrar pedido, intento, pago, evento, monto y capturas.\n5) Si el resultado no se actualiza, registrar qué muestra cada pantalla y el tiempo observado; informar el problema al responsable. Si falta una cuenta o no se puede entrar al comprador de prueba, registrar la precondición faltante.',
		expectedResult:
			'El intento se ve completed, con id de pago y el mismo monto/moneda confirmado en CoCo. El Cliente ve el pago "Aprobado".\nEn "Eventos" se ve payment, firma válida, estado processed y el intento vinculado. Esta comprobación se hace leyendo las columnas del admin.\nEl pedido se ve "En procesamiento" y el carrito "Enviado". Cada producto muestra un solo "Pedido confirmado"; el seguimiento puede aparecer después de actualizar.\nEl retorno de éxito solo es informativo: el caso se aprueba por los estados y el seguimiento visibles. Ningún paso requiere inspeccionar datos internos.',
		isRegressionPath: true,
	},
	{
		code: 24,
		section: SECTION_D,
		title: "Pago sandbox rechazado o pendiente en la UI",
		actor: "Cliente + Admin",
		feature: "Escenarios OTHE/CONT visibles en Cliente/Admin",
		steps:
			"Precondiciones: sitio https://coco-kappa-ashy.vercel.app; cuentas de Cliente separadas o carritos independientes para cada escenario; no cancelar un pago en proceso para reutilizarlo. Mercado Pago habilitado en Sandbox y Binary mode apagado. Visa de prueba 4509 9535 6623 3704, vencimiento 11/30, código 123; titular APRO para aprobado, OTHE para rechazado y CONT para pendiente; DNI 12345678 cuando se solicite. Credenciales y código de acceso del comprador MP: Flavio los entrega por privado.\n1) Preparar un checkout nuevo como en #21 y pagar en Checkout Pro con titular `OTHE`. No reintentar dentro de esa preferencia.\n2) En el otro Cliente/carrito, preparar otro checkout y pagar con titular `CONT`.\n3) Para cada escenario, Admin: abrir el intento en `/admin/payments` y anotar el estado y monto visibles. Cliente: revisar `/my-orders/[id]` y el seguimiento.\n4) En el rechazado, volver a `/cart` e intentar editar. En el pendiente/en proceso, registrar lo que permite la pantalla sin forzar su cancelación.",
		expectedResult:
			'OTHE debe mostrar un pago rechazado: intento failed y pago "Rechazado". El pedido no queda aprobado; permite volver a editar.\nCONT puede verse pending ("Pendiente") o inProcess ("En proceso"). Registrar el estado mostrado; no exigir inProcess solo por haber escrito CONT.\nEn ninguno aparece compra aprobada ni "Pedido confirmado". Si se muestra "En proceso", no se permite abandonar ese pago para cambiarlo por otro medio.\nGuardar capturas de Checkout Pro, intento y pedido de cada escenario.',
		isRegressionPath: false,
	},
	{
		code: 25,
		section: SECTION_D,
		title: "Revisar en la UI un evento de firma inválida",
		actor: "Admin",
		feature: "Evento rechazado existente y pedido sin acreditar",
		steps:
			'Precondiciones: sesión Admin en https://coco-kappa-ashy.vercel.app; evento de prueba ya disponible con request id `qa-mp-invalid-7fa1a045-2c1c-4a64-882d-98ec509f74c7`. Es un evento preparado por el responsable; QA no necesita generarlo. Si ya no está disponible, pedir otro evento rechazado y registrar la precondición faltante.\n1) Abrir `/admin/payments` → "Eventos" y pegar el request id en "Buscar".\n2) Abrir la fila encontrada. Anotar número del evento y lo que muestran Estado, Firma, Intento y el mensaje visible.\n3) Capturar la fila y el detalle. Dejar este evento sin ignorar para conservar la referencia; para #37 se indica otro evento distinto.',
		expectedResult:
			'La fila muestra rejected, firma "no válida" e intento "Sin vincular". El detalle muestra un mensaje que empieza con "Firma inválida".\nLa pantalla no presenta este evento como una compra aprobada ni como un pago acreditado. Se registra únicamente la observación de la UI; no es una nueva prueba de validación criptográfica.',
		isRegressionPath: false,
	},
	{
		code: 26,
		section: SECTION_D,
		title: "Reprocesar un pago sin duplicar el seguimiento",
		actor: "Cliente + Admin",
		feature: "Repetición secuencial desde el botón Reprocesar",
		steps:
			'Precondiciones: Admin y Cliente en https://coco-kappa-ashy.vercel.app; pedido aprobado en #23 e identificador del pago anotado. Ningún otro tester está operando ese pedido.\n1) Cliente: abrir `/my-orders/[id]`, desplegar el seguimiento y capturar cuántas veces aparece "Pedido confirmado" por producto.\n2) Admin: `/admin/payments` → "Eventos", buscar por el id de pago y abrir el evento válido de #23.\n3) Pulsar "Reprocesar", esperar a que termine y comprobar el aviso. Repetir una segunda vez cuando el botón vuelva a estar disponible.\n4) Actualizar "Intentos" y el detalle del Cliente; comparar estado, monto y seguimiento con las capturas iniciales.',
		expectedResult:
			'Cada acción termina con "Evento reprocesado". El intento sigue completed y el pedido aprobado/en procesamiento.\nMonto y moneda no cambian. El seguimiento conserva una sola entrada "Pedido confirmado" por producto; no aparece otro pedido por estas acciones.\nGuardar capturas antes/después. El resultado cubre dos acciones consecutivas del usuario, no acciones simultáneas.',
		isRegressionPath: false,
	},
	{
		code: 27,
		section: SECTION_D,
		title: "Abandonar Checkout Pro y confirmar otra vez",
		actor: "Cliente + Admin",
		feature: "Reuso visible de orden, intento y preferencia",
		steps:
			"Precondiciones: sitio https://coco-kappa-ashy.vercel.app; continuar desde #21 con una preferencia válida sin pagar. Cliente/Admin en perfiles distintos. Anotar orden, intento, preferencia, monto y la hora en que se abrió el Checkout Pro recién creado. Leer Expiración minutos en Config antes de la prueba; actualmente son 60 minutos.\n1) Cerrar Checkout Pro sin pagar. Volver a `/checkout` y confirmar de nuevo antes del vencimiento, sin editar productos ni cambiar de medio.\n2) Admin: buscar el pedido en `/admin/payments`; Cliente: revisar `/my-orders`. Comparar los identificadores y el monto anotados.\n3) Variante: con una preferencia de prueba sin pagar, esperar el plazo completo de Expiración minutos contado desde que se abrió Checkout Pro (actualmente 60 minutos), recargar `/checkout` y confirmar de nuevo. No cambiar la configuración para acortar el plazo.\n4) Variante de cambio de medio: desde otro intento pending sin pagar ni comprobante, elegir Pago externo y confirmar. Comparar orden y total. Aplicar la regla de descuento del caso #110; no pagar luego la preferencia anterior.\n5) Si una pantalla informa que no pudo recuperar el enlace y el intento sigue pendiente, registrar el mensaje y reintentar después de su vencimiento. No simular fallos ni modificar intentos.",
		expectedResult:
			"Antes del vencimiento se ve la misma orden, el mismo intento y la misma preferencia, con el mismo monto; vuelve a abrirse Checkout Pro. No aparece compra confirmada.\nCon intento vencido o fallido, al recargar y confirmar se ve un nuevo intento sobre la misma orden, siempre que no se haya editado/cancelado el carrito.\nEl cambio de medio permitido mantiene la orden y muestra el total correspondiente a ese medio. Un pago en proceso o con comprobante declarado no se reemplaza.\nLa espera por recuperación incierta no acredita ni declara fallido el pago por sí sola. La recuperación se observa en las pantallas; su reproducción forzada queda fuera de este caso manual.",
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
			'Se ven: "Pedido {code}", "Código de armado {code}", card "Productos" (nombres, cantidades y montos del snapshot), "Resumen" (items, monto, dirección de envío) y "Pago" (estado, transacción, referencia, método). Un id ajeno o inválido da 404.',
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
			'Aparecen avisos legibles: "Reprogramado..." con un motivo legible debajo, sin códigos internos como LITEM-… (para el recorte de proveedor: "El proveedor no confirmó toda la cantidad pedida."), "Incidencia de fulfillment" (una incidencia en preparación, transporte o entrega) también con su motivo, luego "Incidencia resuelta" sin motivo, y "Disponible para retirar": este último como aviso, sin marcar la etapa Entrega. Para comprobar esto último, usar un item que no haya tenido otra entrega antes.',
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
		title: "Listado de pagos y detalle desde el admin",
		actor: "Admin",
		feature: "Búsqueda, filtros e indicadores globales de pagos",
		steps:
			'Precondiciones: sesión Admin en https://coco-kappa-ashy.vercel.app; al menos el pedido MP de #21 y un pedido externo de prueba identificado por el responsable o preparado en #16 sin acreditarlo. Si falta el externo, se puede revisar la búsqueda de MP pero la variante que compara ambos proveedores se registra Bloqueada por falta de ese pedido.\n1) Abrir `/admin/payments` → "Intentos". Capturar los indicadores Intentos, Pendientes, Completados y Eventos fallidos.\n2) Buscar por código de pedido y después por email del Cliente. Abrir la fila y comprobar estado, monto, proveedor, Preferencia y "Pago (id de Mercado Pago)".\n3) Probar el selector "Proveedor" con Mercado Pago, Pago externo y Todos; limpiar la búsqueda al cambiar de escenario. Probar el orden Más recientes/Más antiguos.\n4) Comparar los pedidos de prueba visibles en el listado con su detalle. No es necesario interpretar los bloques de datos que también ofrece la pantalla.',
		expectedResult:
			'La búsqueda y el filtro muestran los pedidos del proveedor seleccionado; al limpiar vuelven los demás. El orden de fechas cambia como indica el selector.\nLos indicadores son globales: incluyen Mercado Pago y transferencias y no se limitan al texto o proveedor filtrado. Un intento sin id de pago muestra "Sin dato"; uno pagado muestra su identificador.\nMonto, moneda y estado son consistentes entre la fila y el detalle. Cuando corresponde, se ve el descuento por transferencia; no se aplica a Mercado Pago.',
		isRegressionPath: false,
	},
	{
		code: 36,
		section: SECTION_F,
		title: "Conciliar un intento desde el admin",
		actor: "Admin",
		feature: "Botón Reconciliar ahora y estados visibles",
		steps:
			'Precondiciones: sesión Admin en https://coco-kappa-ashy.vercel.app; un intento MP aprobado de #23 y otro sin pagar de #21, con códigos anotados.\n1) Abrir `/admin/payments` → "Intentos", buscar el pedido aprobado y abrirlo. Comprobar "Pago (id de Mercado Pago)" y pulsar "Reconciliar ahora".\n2) Esperar el aviso y comprobar el estado, el monto y el id de pago en el detalle.\n3) Buscar el pedido sin pagar, abrirlo y revisar "Reconciliar ahora" y el texto que aparece debajo.',
		expectedResult:
			'En el aprobado se ve "Intento reconciliado"; mantiene el estado aprobado/completed y el monto registrado.\nSin id de pago, el botón está deshabilitado y explica: "Sin id de pago de Mercado Pago: el comprador todavía no pagó esta preferencia. El id llega con el webhook del pago." La prueba no requiere conseguir ni ingresar ese id manualmente.',
		isRegressionPath: false,
	},
	{
		code: 37,
		section: SECTION_F,
		title: "Reprocesar e ignorar eventos desde la UI",
		actor: "Admin",
		feature: "Acciones visibles sobre eventos de prueba identificados",
		steps:
			'Precondiciones: sesión Admin en https://coco-kappa-ashy.vercel.app; evento válido del pedido aprobado de #23 y otro evento rechazado de prueba con request id `qa-mp-invalid-df40bb92-0fb9-4efe-afb7-0c54d33f80ea`. Este segundo evento está reservado para ignorarlo; no usar el evento de referencia de #25.\n1) Abrir `/admin/payments` → "Eventos", buscar el id del pago aprobado de #23, abrir el evento y pulsar "Reprocesar". Esperar el resultado.\n2) Limpiar la búsqueda y buscar el request id del evento rechazado indicado arriba. Abrir la fila y escribir un motivo de 3 caracteres en "Motivo para ignorar".\n3) Comprobar "Ignorar". Reemplazar el motivo por "Evento de prueba de QA" (o un motivo suficiente de al menos 5 caracteres) y pulsar "Ignorar".\n4) Volver a buscar el mismo evento y capturar su estado y el motivo visible. Si otro tester ya lo ignoró, pedir al responsable otro evento preparado.',
		expectedResult:
			'La acción sobre el evento válido muestra "Evento reprocesado" y no cambia el pedido aprobado por uno distinto.\nCon 3 caracteres "Ignorar" está deshabilitado; con un motivo suficiente se ve "Evento ignorado" y el estado ignored.\nEl detalle del evento ignorado conserva el motivo escrito. No hace falta producir nuevas notificaciones para ejecutar el caso.',
		isRegressionPath: false,
	},
	{
		code: 38,
		section: SECTION_F,
		title: "Configuración MP protegida por rol y confirmación",
		actor: "Admin + Superadmin",
		feature: "Config desde Admin y Superadmin",
		steps:
			'Precondiciones: sitio https://coco-kappa-ashy.vercel.app; una cuenta con rol "Administrador" que no sea superadmin y otra Superadmin, entregadas por Flavio y abiertas en perfiles separados. No cambiar roles ni credenciales para preparar el caso. Mantener modo Sandbox, Binary mode y Webhooks unsigned dev como están.\n1) Admin: abrir `/admin/payments` → "Config", anotar "Expiración minutos", sumarle 1, escribir `CONFIRMAR` y pulsar "Guardar configuración".\n2) Superadmin: abrir la misma pantalla y comprobar que sigue el valor original. Sumarle 1, dejar "Confirmación" vacía y pulsar "Guardar configuración".\n3) Escribir `CONFIRMAR` y guardar. Actualizar la pantalla y comprobar el valor nuevo.\n4) Restaurar inmediatamente el valor anotado, escribir `CONFIRMAR`, guardar y actualizar para verificar la restauración. Capturar los resultados sin mostrar credenciales.',
		expectedResult:
			'Admin recibe "FORBIDDEN" y no guarda. Superadmin sin confirmación ve: \'Escribí "CONFIRMAR" para aplicar cambios de configuración.\' y no guarda.\nSuperadmin con CONFIRMAR ve "Configuración actualizada" y el valor persiste. Al terminar vuelve al valor original; no se cambian el modo ni los switches.\nAccess token y Webhook secret se ven solo como "Configurado" o "Falta". Si falta una cuenta o un requisito de acceso, registrar Bloqueado con el dato que falta.',
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
			'El recorte se reparte LIFO (el pagador más reciente absorbe primero). El reparto manual reemplaza al LIFO y debe sumar exacto ("El reparto suma {a} y el recorte es {b}."). Se crea un rollover post-asignación por recorte con motivo; el cliente afectado ve el aviso de reprogramación con el motivo "El proveedor no confirmó toda la cantidad pedida.", sin códigos internos como LITEM-…. Una línea confirmada en 0 se cancela con rollover total.',
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
			'Precondiciones: un paquete de entrada "Recibido" que se fracciona por primera vez en este caso, después del deploy del 19/09/2026, y cuya demanda no se haya fraccionado antes de esa fecha desde otro paquete (lo más simple: uno de una operación creada después del deploy). Un paquete fraccionado antes del deploy, como el #160, puede seguir mostrando cantidad sin fraccionar: no sirve para este caso.\n1) `/admin/packages`: sobre el paquete de entrada "Recibido", acción "Fraccionar".\n2) Revisar las cantidades propuestas por carrito y confirmar.\n3) Reabrir el mismo paquete de entrada.',
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
			'Caso A (fixture del seed; se consume al ejecutarlo y `pnpm db:seed:test` lo restaura): en `/admin/packages`, abrir "PKG-SEED-OUT-PICKUP-B" (pedido ORD-SEED-PICKUP, en punto de retiro) y hacer click en "Confirmar entrega". Después, en `/admin/carts`, abrir el carrito CART-SEED-PICKUP y mirar el estado de su pedido.\nCaso B: un pedido cuyos items quedan todos cancelados (rollover resuelto sin entrega).\nCaso C: un pedido con un item entregado y otro con un rollover abierto.',
		expectedResult:
			'Caso A: ORD-SEED-PICKUP pasa solo de "En procesamiento" a "Completado". Un pedido con items entregados y otros cancelados también termina "Completado".\nCaso B: pasa a "Cancelado".\nCaso C: sigue "En procesamiento": un rollover abierto lo mantiene abierto.\nEl cierre nunca pisa "Reembolsado", "Contracargo" ni "Fallido", no existe cierre manual y no depende de un plazo. Cancelar el pedido no cancela un pago externo pendiente (ADR 0005).',
		isRegressionPath: true,
	},
	{
		code: 113,
		section: SECTION_L,
		title: "Tutorial rápido desde el menú de ayuda",
		actor: "Cliente",
		feature: "`/tutorial` (ADR 0012)",
		steps:
			'Precondiciones: sin sesión o con sesión, cualquier navegador.\n1) En `/products`, abrir el ícono de ayuda (?) de la barra y elegir "Tutorial rápido · 1 min".\n2) Avanzar con "Siguiente", volver con "Atrás" y probar las flechas ← → del teclado.\n3) En el paso 5, recargar la página.\n4) Salir con Esc; volver a entrar y salir con ✕ y con "Salir del tutorial" de la barra superior.',
		expectedResult:
			'Se abre `/tutorial` con la barra "Modo tutorial · datos de ejemplo" y el diálogo "1 / 12"; cada paso resalta un elemento de la pantalla simulada.\nLas flechas mueven igual que los botones y la URL cambia el número de paso; al recargar sigue en el mismo paso.\nEsc, ✕ y "Salir del tutorial" vuelven a `/products` sin confirmación; el botón Atrás del navegador también sale del tutorial.',
		isRegressionPath: false,
	},
	{
		code: 114,
		section: SECTION_L,
		title: "Tutorial completo y Tu pedido real intacto",
		actor: "Cliente",
		feature: "`/tutorial` (ADR 0012)",
		steps:
			'Precondiciones: Tu pedido real con al menos un producto.\n1) Desde el menú de ayuda (?), elegir "Tutorial completo · 3 min".\n2) Avanzar hasta el final, mirando el seguimiento del pedido de ejemplo.\n3) En el último paso, hacer click en "Ir al catálogo" y abrir Tu pedido.',
		expectedResult:
			'El tutorial tiene 21 pasos y muestra las seis etapas del seguimiento una por una: Pedido confirmado, Preparación, Proveedor, Empaque, Envío y Entrega.\nEl último paso ofrece "Ir al catálogo" y "Terminar"; "Ir al catálogo" abre `/products`.\nTu pedido real tiene los mismos productos y cantidades que antes: el tutorial no agregó ni quitó nada.',
		isRegressionPath: false,
	},
	{
		code: 115,
		section: SECTION_L,
		title: "Invitación al tutorial en el primer ingreso",
		actor: "Cliente",
		feature: "Invitación al tutorial",
		steps:
			'Precondiciones: una cuenta de Google que nunca ingresó a CoCo (o un usuario con la invitación sin responder), y un segundo navegador.\n1) Sin sesión, agregar un producto e ir a pagar: ingresar con Google hasta llegar a `/checkout`.\n2) Pagar con Mercado Pago (sandbox) hasta volver a `/checkout/mercadopago/success`.\n3) Ir a `/` y mirar la esquina inferior.\n4) Elegir "Ahora no", recargar y navegar por la tienda.\n5) Ingresar con la misma cuenta en el segundo navegador.',
		expectedResult:
			'En `/checkout` y en la página de regreso de Mercado Pago no aparece ninguna invitación.\nEn `/` aparece la tarjeta "¿Primera vez en CoCo?" con "Tutorial rápido · 1 min", "Tutorial completo · 3 min" y "Ahora no".\nDespués de "Ahora no" no vuelve a aparecer, ni al recargar ni en el segundo navegador; elegir una versión en lugar de "Ahora no" abre el tutorial y también la cierra para siempre.',
		isRegressionPath: false,
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
 * - 15 — user-managed payment methods, removed by ADR 0010.
 * - 17 — mock payment gateway, removed by ADR 0010.
 */
export const retiredQaTicketCodes: number[] = [15, 17];
