/**
 * The QA ticket transitions `pnpm qa:triage` applies. Notes follow the state
 * protocol of `docs/plans/qa-open-tickets-2026-11-orchestration.md` §5, in the
 * tester's language. Later waves append entries; a code may come back with a
 * new dated note and the statuses it may start from (`from`).
 *
 * Do not list a code until its target is settled: once its note is on the
 * ticket the entry never runs again, and a ticket in the papelera can no
 * longer be edited.
 *
 * In notes, "Tu pedido (el carrito)" is what the customer is still building and
 * "el pedido (en Mis pedidos)" is the confirmed order.
 */

import type { TriageTransition } from "./qa-ticket-triage.plan";

/** `[dd/mm/aaaa · triage] …`; later waves pass the date they triage on. */
export function triageNote(text: string, date = "13/11/2026") {
	return `[${date} · triage] ${text}`;
}

const note = (text: string) => triageNote(text);

function supersededBy(code: number, replacement: number, change: string) {
	return {
		code,
		prependNote: note(
			`Superado por #${replacement}: ${change}. No re-testear.`,
		),
		retire: true,
	} as const satisfies TriageTransition;
}

/** A re-test frees the ticket so whichever tester is free can run it. */
function retest(
	code: number,
	{
		fix,
		look,
		preconditions,
	}: { fix: string; look: string; preconditions: string },
) {
	return {
		code,
		status: "retest",
		prependNote: note(
			`${fix}. Mirar: ${look}. Precondiciones: ${preconditions}.`,
		),
		clearAssignee: true,
	} as const satisfies TriageTransition;
}

const TICKET_PRECONDITIONS = "las del ticket";
const MP_TEST_BUYER =
	"el comprador de prueba y las tarjetas de prueba de Mercado Pago, que el responsable de QA pasa por privado";

const superseded: TriageTransition[] = [
	supersededBy(
		71,
		100,
		'"Cómo funciona" queda con una sola leyenda y cuatro pasos, y sale "No somos una distribuidora…"',
	),
	supersededBy(
		72,
		101,
		'la sección "Ofertas destacadas" pasa a mostrar combos y destacados, y salen los filtros Todos / kg / unidad',
	),
	supersededBy(
		75,
		104,
		'las preguntas frecuentes se reescriben y "¿Qué significa cantidad mínima?" no queda entre ellas',
	),
	supersededBy(
		76,
		104,
		'las preguntas frecuentes se reescriben y "¿Qué pasa si mi demanda no entra en una operación?" no queda entre ellas',
	),
	supersededBy(
		77,
		104,
		'"¿Cuánto tarda en llegar mi compra?" sigue, pero con el texto nuevo del documento del recorrido',
	),
	supersededBy(
		78,
		104,
		'la pregunta de la entrega pasa a ser "¿Cómo recibo mi pedido?", con el texto nuevo del documento del recorrido',
	),
	supersededBy(
		79,
		104,
		'sale "¿Necesito una cuenta para ver productos?", que es la pregunta que este ticket corregía',
	),
];

const outOfScope: TriageTransition[] = [
	{
		code: 105,
		status: "skipped",
		prependNote: note(
			"Fuera de alcance por decisión del 13/11/2026. Por ahora la entrega se sigue eligiendo al confirmar el pedido. Se va a definir junto con #111 más adelante.",
		),
	},
	{
		code: 108,
		status: "skipped",
		prependNote: note(
			"Diferido a H2 por decisión del 13/11/2026. Mientras tanto, las otras presentaciones van a aparecer como productos similares de la misma categoría cuando salga #107.",
		),
	},
	{
		code: 111,
		status: "skipped",
		prependNote: note(
			"Fuera de alcance por decisión del 13/11/2026. Se va a definir junto con #105 más adelante.",
		),
	},
];

const blocked: TriageTransition[] = [
	{
		code: 82,
		status: "blocked",
		prependNote: note(
			"Falta el número de WhatsApp contratado; lo pasa Flavio cuando esté. Mientras tanto el ítem de WhatsApp del pie queda oculto (`WHATSAPP_NUMBER = null` en `home-content.ts`).",
		),
	},
];

const retests: TriageTransition[] = [
	retest(2, {
		fix: "Corregido en 48f756d y dde6a65: un checkout abandonado ya no congela Tu pedido (el carrito) y el checkout espera a que se sincronice antes de arrancar",
		look: 'que `/checkout` sin sesión lleve a `/login?callbackURL=/checkout` y que, después del login, vuelva al checkout con Tu pedido (el carrito) intacto, sin "No se pudo iniciar checkout" ni "No encontramos tu pedido para iniciar checkout."',
		preconditions: "ninguna; arrancar sin sesión",
	}),
	retest(3, {
		fix: "Corregido en 1929045: si hay un pago en curso, los productos del invitado quedan pendientes y no se pierden",
		look: 'los dos casos del ticket; en la variante, la alerta "Productos pendientes de agregar" en `/cart`, "Ir a pagar" deshabilitado y "No se pudo iniciar checkout" en `/checkout`',
		preconditions:
			"para la variante, un usuario con un pago en curso (pago externo pendiente o un checkout de Mercado Pago iniciado)",
	}),
	retest(12, {
		fix: "Texto reescrito en 1929045",
		look: 'que el checkout arranque en "Pedido", que "Pago" y "Confirmar" estén deshabilitados con "Completá los pasos anteriores", y que en `/admin/carts` Tu pedido (el carrito) figure "En checkout" sin un pedido (en Mis pedidos) ni un intento de pago',
		preconditions:
			"una cuenta de Google sin direcciones guardadas (por ejemplo, una cuenta nueva) y Tu pedido (el carrito) con al menos un producto",
	}),
	retest(16, {
		fix: 'Corregido en 1929045 (términos reales en lugar de "lorem ipsum") y texto ajustado en 3e14bda. Los términos ahora son `checkout-v3`',
		look: 'que los términos se lean, que "Confirmar y pagar" esté deshabilitado sin el switch y que con "Pago externo" el pago quede "Pendiente"',
		preconditions:
			'"Pago externo" y "Mercado Pago" (Sandbox) habilitados en `/admin/payments`; sesiones Cliente y Admin',
	}),
	retest(18, {
		fix: 'Texto reescrito en 1929045: el rechazo se prueba con un pago externo que rechaza un admin, porque ya no existe el pago "mock"',
		look: 'que el intento pase a "Rechazado" y el pedido (en Mis pedidos) a "Fallido", y que Tu pedido (el carrito) vuelva a ser editable y se pueda volver a pagar',
		preconditions:
			'"Pago externo" habilitado en `/admin/payments`; sesiones Cliente y Admin',
	}),
	retest(20, {
		fix: 'Texto reescrito en 1929045 con pasos concretos (la nota anterior decía "No se entiende el flujo")',
		look: 'el rechazo "Uno de los productos de tu pedido ya no está disponible. Revisalo antes de continuar.", que Tu pedido (el carrito) quede editable y que no se cree un pedido (en Mis pedidos) ni un intento de pago nuevos',
		preconditions: "sesiones Cliente y Admin en navegadores distintos",
	}),
	retest(21, {
		fix: "Texto reescrito en 6a25a61; Mercado Pago ya está en Sandbox en el entorno de QA (antes faltaba la credencial de Mercado Pago)",
		look: '"Redirigiendo a Mercado Pago", el Checkout Pro de prueba y el intento "pending" con solo "Preferencia: …" en Refs',
		preconditions: MP_TEST_BUYER,
	}),
	retest(22, {
		fix: "Texto reescrito en 6a25a61: las tres pantallas se abren directo, sin pagar",
		look: 'el título de success, failure y pending, y el aviso "Estado sujeto a reconciliación" en las tres',
		preconditions: "ninguna",
	}),
	retest(23, {
		fix: "Texto reescrito en 6a25a61",
		look: 'que el intento pase a "completed" con el id del pago, el pedido (en Mis pedidos) a "En procesamiento" y Tu pedido (el carrito) a "Enviado"',
		preconditions: `seguir desde el intento de #21; ${MP_TEST_BUYER}`,
	}),
	retest(24, {
		fix: "Texto reescrito en 6a25a61",
		look: 'que `OTHE` deje el intento "failed", el pedido (en Mis pedidos) "Pendiente" y Tu pedido (el carrito) editable, y que `CONT` deje el intento "inProcess" sin acreditar nada',
		preconditions: MP_TEST_BUYER,
	}),
	retest(25, {
		fix: "Texto reescrito en 6a25a61, con el comando `curl` listo para copiar",
		look: 'HTTP 401 con `{"error":"invalid signature"}` y el evento "rejected", con firma "no válida" y sin vincular',
		preconditions:
			'confirmar que "Webhooks unsigned dev" está apagado en `/admin/payments` → Config de coco-kappa-ashy; si está prendido, el caso queda Bloqueado',
	}),
	retest(26, {
		fix: "Texto reescrito en 6a25a61",
		look: 'que "Reprocesar" dos veces no duplique el seguimiento ni haga retroceder el pago',
		preconditions: "el pedido acreditado en #23",
	}),
	retest(30, {
		fix: "Corregido en 1929045: el seguimiento no dibuja etapas hasta que se acredita el pago",
		look: 'que la card diga "El seguimiento comienza cuando se acredita el pago." y que abrir el detalle no cambie el pago',
		preconditions:
			"un pedido con Pago externo confirmado por el cliente y todavía sin liquidar",
	}),
	retest(31, {
		fix: 'Texto reescrito en 1929045 con dónde se ejecuta y dónde se mira cada paso (la nota anterior decía "No queda claro el flujo")',
		look: "la etapa resaltada después de cada paso del admin; ninguna retrocede entre refrescos",
		preconditions:
			"un pedido acreditado con un solo producto; sesiones Cliente y Admin",
	}),
	retest(32, {
		fix: 'Texto reescrito en 1929045 (la nota anterior decía "No entiendo cómo ejecutar el flujo")',
		look: "un solo recorrido, después uno por producto al omitir uno en la operación, y de nuevo uno solo",
		preconditions:
			"un pedido acreditado con dos productos distintos que no estén en ninguna operación. Depende de datos de prueba: confirmar que existen después de la purga del 11/10",
	}),
	retest(33, {
		fix: "Corregido en 1929045 y ed0b5b6: los avisos muestran un motivo legible",
		look: '"Reprogramado" con "El proveedor no confirmó toda la cantidad pedida." y sin códigos `LITEM-…`, "Incidencia de fulfillment" con su motivo, "Incidencia resuelta" y "Disponible para retirar" como aviso',
		preconditions:
			"para el retiro, un producto que no haya tenido otra entrega antes",
	}),
	retest(36, {
		fix: 'Corregido en 6a25a61: `/admin/payments` muestra "Pago (id de Mercado Pago)" y explica por qué "Reconciliar ahora" puede estar deshabilitado',
		look: '"Intento reconciliado" en un intento pagado, y el botón deshabilitado con su explicación en uno sin pagar',
		preconditions:
			"un intento de Mercado Pago pagado (#23) y uno sin pagar (#21)",
	}),
	retest(37, {
		fix: "Texto reescrito en 6a25a61: dice de dónde salen los eventos",
		look: '"Evento reprocesado", "Ignorar" deshabilitado con menos de 5 caracteres y "Evento ignorado"',
		preconditions: "correr antes #23 y #25",
	}),
	retest(38, {
		fix: "Texto ajustado en 3e14bda",
		look: '"FORBIDDEN" con la cuenta "Administrador", el pedido de escribir "CONFIRMAR" y "Configuración actualizada" con la superadmin; al final, dejar "Expiración minutos" como estaba',
		preconditions:
			'una cuenta con rol "Administrador" que no sea superadmin, que pasa el responsable de QA',
	}),
	retest(42, {
		fix: "Texto reescrito en 1929045",
		look: '"Operación ejecutada", las órdenes de proveedor "Pendiente", los lotes, los rollovers con motivo y, en `/admin/tracking`, los productos asignados en "Asignado a proveedor"',
		preconditions: "pedidos acreditados que no estén en ninguna operación",
	}),
	retest(45, {
		fix: 'Corregido en 1929045: al reejecutar una operación completada, "Incluir rollovers" queda forzado',
		look: 'el switch prendido y deshabilitado, que la vista siga a la operación nueva y que "Descartar" deje la demanda intacta',
		preconditions:
			"una operación completada dentro de la ventana y un borrador",
	}),
	retest(48, {
		fix: 'Corregido en 1929045 ("Confirmar" ya no queda trabado en 0 después de "Ajustar reparto") y ed0b5b6 (motivo legible)',
		look: 'el reparto LIFO, el error "El reparto suma…", una línea confirmada en 0 y el aviso al cliente con "El proveedor no confirmó toda la cantidad pedida."',
		preconditions: TICKET_PRECONDITIONS,
	}),
	retest(54, {
		fix: "Corregido en 1929045: cada paquete de salida guarda de qué paquete de entrada sale",
		look: 'que, al reabrir el paquete, diga "No queda cantidad recibida sin fraccionar." y "Fraccionar" quede deshabilitado',
		preconditions:
			"un paquete de entrada que se fracciona por primera vez después del 19/09/2026 (lo más simple: uno de una operación nueva); el #160 no sirve",
	}),
	retest(61, {
		fix: 'Corregido en 1929045: un envío demorado se recupera con "Recuperar" y el aviso muestra el motivo',
		look: 'el motivo en "Incidencia de fulfillment", "Recuperar" del paquete deshabilitado hasta recuperar el envío, y "Incidencia resuelta"',
		preconditions: 'un envío "En tránsito"',
	}),
	retest(67, {
		fix: "Texto reescrito en 1929045, con un caso A armado sobre datos de prueba",
		look: 'que ORD-SEED-PICKUP pase solo a "Completado", y los casos B ("Cancelado") y C (sigue "En procesamiento")',
		preconditions:
			"para el caso A, el paquete de prueba PKG-SEED-OUT-PICKUP-B; si no está en la base, ese caso queda Bloqueado (no correr seeds)",
	}),
	retest(80, {
		fix: "Implementado en 2d30cc0: las fotos se suben desde `/admin/products`",
		look: 'que ninguna tarjeta ni ficha muestre "Sin imagen para …"',
		preconditions:
			"las fotos ya cargadas; si falta alguna, es contenido pendiente y no un fallo de la subida",
	}),
	retest(83, {
		fix: 'Implementado en 5c5d7e4: el link "Sé proveedor" del pie lleva al formulario de `/proveedores`',
		look: 'que la columna "Nosotros" tenga dos links y que "Sé proveedor" abra el formulario de `/proveedores`. No enviarlo: crearía una postulación real',
		preconditions: "ninguna",
	}),
	retest(86, {
		fix: 'Implementado en 006a157: "Descargar planilla de precios" y "Subir planilla" en `/admin/product-terms`',
		look: "la vista previa con el precio actual, el nuevo y la variación %, y que al confirmar se actualicen todos. El registro con fecha sigue diferido: mientras tanto, cada cambio deja su fila en la auditoría",
		preconditions: "una sesión de admin",
	}),
];

/** Tickets implemented by the November work packages (WP-A, WP-G, …). */
const implemented: TriageTransition[] = [
	retest(101, {
		fix: "Implementado en b68fa10",
		look: "Destacados de la semana muestra productos y combos en el orden del admin; el combo agrupa personas, muestra las fotos, cantidades y precios vigentes y suma cada producto por separado a Tu pedido; se avisa si falta alguno y se oculta si no queda ninguno. La banda Destacado puede mostrar un producto o un combo",
		preconditions:
			"Flavio carga al menos dos combos del mismo grupo con distinta cantidad de personas en /admin/combos y los agrega en /admin/home-offers; migración y deploy aplicados",
	}),
	retest(102, {
		fix: "Implementado en b0e09d3",
		look: "Categorías en la barra de computadora y en el menú del celular; cada opción abre /products con esa categoría seleccionada; no aparecen categorías vacías u ocultas. El buscador funciona igual y la barra entra a 1024 px junto al contador",
		preconditions: "categorías activas con productos y precios vigentes",
	}),
	retest(110, {
		fix: "Implementado en ad74aae; Pago y Resumen muestran el mismo intento efectivo",
		look: "un superadmin configura Descuento por transferencia (%) en /admin/payments → Pago externo; la ficha, Tu pedido y el mini-pedido muestran el precio alternativo; el checkout externo y Mis pedidos muestran subtotal, descuento y monto final. Mercado Pago no descuenta; cambiar de medio conserva el intento correcto y los términos dicen checkout-v4",
		preconditions:
			"superadmin para configurar el porcentaje, pago externo habilitado y un pedido armado; migración y deploy aplicados",
	}),
	retest(93, {
		fix: "Corregido en 86f4f26: los links a secciones del home ya no pasan por el navegador interno de la app",
		look: 'en el home, tocar "Ver qué se puede comprar" varias veces: baja a Ofertas y la URL queda con un solo "#ofertas". Repetirlo después de llegar desde el catálogo con el menú (celular: ☰ → "Ofertas"; computadora: Ayuda → "Preguntas frecuentes") y tocar el logo: vuelve a "/" sin "#". Desde otra página, esos links ahora recargan la página: es lo esperado',
		preconditions: "ninguna",
	}),
	retest(97, {
		fix: 'Implementado en 86f4f26: sale "Sin galería adicional"',
		look: 'abrir un producto con una sola imagen (por ejemplo, Aceite de oliva extra virgen 0,5 L): no aparece "Sin galería adicional" ni queda el hueco. Con varias imágenes, la galería funciona igual',
		preconditions: "ninguna",
	}),
	retest(103, {
		fix: 'Implementado en 86f4f26: el catálogo filtra solo por categoría y sale el bloque "Unidad"',
		look: 'en /products el panel de filtros ya no tiene "Unidad", y un link viejo con "?unit=kg" muestra todo el catálogo. Los chips Todos / kg / unidad del home salen con #101: en este re-test mirar solo /products',
		preconditions: "ninguna",
	}),
	retest(109, {
		fix: 'Implementado en 86f4f26: la marca se escribe "CoCo" en todos los textos',
		look: 'la pestaña dice "CoCo | Compras comunitarias en Ushuaia" y el pie "© 2026 CoCo"; "CoCo" en el ingreso, los pasos del home, el menú del celular ("Explorá CoCo"), proveedores, el tutorial y el admin. El logo sigue en minúscula',
		preconditions: "ninguna",
	}),
	retest(112, {
		fix: "Implementado en 964c670",
		look: 'en Mis pedidos, el detalle de un pedido que no esté "Pendiente" → "Repetir pedido": diálogo con casillas (todas marcadas, precio de hoy, "Ya no disponible" deshabilitado); al confirmar se suma a Tu pedido (el carrito), acumulando si el producto ya estaba, y se abre Tu pedido para editar y confirmar; el pedido original no cambia; cada línea del detalle muestra "cantidad × precio". Con otro pedido esperando el pago aparece el aviso con "Ver pedido pendiente" y no se cancela nada. Si se repite un pedido cancelado cuyos productos siguen en Tu pedido, las cantidades se suman (es la regla elegida). En "cantidad × precio" el precio va redondeado como en el catálogo, así que la cuenta a mano puede diferir en $ 1',
		preconditions:
			"una cuenta de cliente con al menos un pedido pagado; para el aviso, un pedido confirmado con transferencia sin informar",
	}),
	retest(106, {
		fix: "Implementado en b04ebdc",
		look: 'foto cuadrada completa; "Sumar al pedido" sin ícono ni monto en el catálogo, el home, el destacado y la ficha; "$ X por bidón" sin el tamaño; el precio por kg o por litro siempre (también en la botella de 1 L); el selector muestra solo el número en los envasados y "0,5 kg" en los productos por peso; el total se ve en Tu pedido. Las fotos con fondo beige se ven como un recuadro dentro de la tarjeta blanca: avisar si molesta',
		preconditions: "ninguna (sin ingresar)",
	}),
	retest(73, {
		fix: "Re-testear después de #106 (b04ebdc)",
		look: "el selector − n + se puede editar en la tarjeta y en la ficha, arranca en el mínimo y no baja de ahí. Superado por #106: el total ya no se muestra en la ficha (queda para lectores de pantalla y en Tu pedido)",
		preconditions: "ninguna",
	}),
	retest(84, {
		fix: "Re-testear después de #106 (b04ebdc)",
		look: "el orden foto, nombre, precio con su unidad, selector y botón a ancho completo. Superado por #106: no hay línea de total, y la unidad va dentro del campo solo en los productos por peso; en los envasados el campo muestra solo el número",
		preconditions: "ninguna",
	}),
	// Lifecycle cases that had passed and whose text #106 rewrote (qa:seed).
	{
		...retest(5, {
			fix: "Texto actualizado por #106 en b04ebdc: botón sin monto y precio por kg o por litro siempre",
			look: 'la foto cuadrada, "$ 4.200 por frasco" sin tamaño, el precio por kg o por litro también en la botella de 1 L, "kg" en el campo solo en los productos por peso y la tarjeta sin total',
			preconditions: TICKET_PRECONDITIONS,
		}),
		from: ["passed"],
	},
	{
		...retest(6, {
			fix: "Texto actualizado por #106 en b04ebdc: botón sin monto",
			look: 'el botón dice "Sumar al pedido" y el total aparece en el resumen de Tu pedido',
			preconditions: TICKET_PRECONDITIONS,
		}),
		from: ["passed"],
	},
	{
		...retest(8, {
			fix: "Texto actualizado por #106 en b04ebdc: botón sin monto",
			look: 'la cantidad fija sigue diciendo "1 frasco 370 g" y el botón no tiene monto',
			preconditions: TICKET_PRECONDITIONS,
		}),
		from: ["passed"],
	},
	retest(90, {
		fix: "Implementado en 12b9936 como leyenda en pantalla (no se modifica el archivo; decisión de Flavio del 13/11)",
		look: '"Imagen ilustrativa" abajo a la derecha en tarjetas del catálogo y la home, destacado, foto principal de la ficha y vista previa del admin; tamaño 2,5 % del ancho con mínimo de 9 px; color = tono oscuro del "Color de fondo de las fotos" de la categoría (Admin → Categorías), gris oscuro si no tiene; no aparece en miniaturas, Similares, pedido/checkout ni en productos sin foto; cambiar la categoría o su color cambia la leyenda al recargar. La foto descargada no lleva la leyenda (por diseño)',
		preconditions:
			"migración aplicada y al menos una categoría con color cargado",
	}),
	retest(98, {
		fix: "Implementado en c9ac7f9",
		look: 'el contador "Cierre del pedido: faltan …" en la barra (computadora) y en la franja de arriba (celular y tableta), sin segundos y en hora de Argentina; la pantalla Admin › Catálogo › Cierre semanal: cambiar el día o la hora y ver que cambie todo (contador, hero, pasos, preguntas frecuentes y ficha). Es solo informativo: la compra se sigue lanzando a mano',
		preconditions: 'una cuenta "Administrador" que no sea superadmin',
	}),
	retest(99, {
		fix: "Implementado en c9ac7f9",
		look: 'título "Comprar en grupo sale menos.", bajada, línea de cierre, "Ver el catálogo" → /products y "No hace falta registrarte para mirar"; la franja ya no repite la frase. Los textos son preliminares: los revisa Flavio',
		preconditions: "ninguna",
	}),
	retest(100, {
		fix: "Implementado en c9ac7f9",
		look: 'el diagrama con su leyenda en "Cómo funciona" y 4 pasos; el paso 4 se adaptó al flujo actual (la entrega se elige al confirmar el pedido). Los textos son preliminares',
		preconditions: "ninguna",
	}),
	retest(104, {
		fix: "Implementado en c9ac7f9",
		look: '6 preguntas en el orden del ticket; "¿Cómo recibo mi pedido?" adaptada al flujo actual y con la dirección del punto de retiro activo. Las respuestas son preliminares, redactadas sin el documento del recorrido',
		preconditions:
			'corregir o desactivar el punto de retiro con datos de prueba ("Calle Falsa 123") en /admin/pickup-points',
	}),
	retest(107, {
		fix: 'Línea de cierre de la ficha implementada en c9ac7f9 ("Entra en el cierre del … · Llega en …"). Con #97 (86f4f26) y #106 (b04ebdc) la ficha queda completa: re-testear entera',
		look: "la línea de cierre, la descripción oculta cuando repite el nombre, un solo control para cerrar, los similares de la misma categoría primero y la foto, el precio, el selector y el botón iguales a los de la tarjeta",
		preconditions: "ninguna",
	}),
	retest(70, {
		fix: 'La ilustración del sistema se movió del hero a "Cómo funciona" (#100) en c9ac7f9',
		look: 'que se vea en "Cómo funciona" y que el hero quede solo con texto y botón',
		preconditions: "ninguna",
	}),
];

const remainingRetests: TriageTransition[] = [
	{
		...retest(69, {
			fix: "El comando vigente es db:seed:test; se corrige la definición del caso",
			look: "crear una operación sobre demanda de prueba, volver a sembrar y verificar que no haya diagnósticos de cantidades inconsistentes. Esta reproducción completa todavía requiere ejecución por un desarrollador",
			preconditions:
				"una base local descartable aislada; nunca ejecutar estos comandos sobre la base compartida",
		}),
		definition: {
			title:
				"Re-sembrar después de una operación manual conserva las cantidades de prueba",
			steps:
				"1) Usar exclusivamente una base local descartable y ejecutar pnpm db:seed:test.\n2) Crear y ejecutar una operación sobre demanda sembrada (CITEM-SEED-*), hasta generar lote, orden de proveedor y paquete.\n3) Volver a ejecutar pnpm db:seed:test.\n4) Ejecutar pnpm db:seed-verify contra la misma base local.",
			expectedResult:
				"Ambos comandos terminan con código 0 y db:seed-verify no informa lot.item.quantityMismatch ni package.line.quantityMismatch. No ejecutar seeds de prueba sobre la base compartida.",
		},
	},
	retest(85, {
		fix: "Ajustes del catálogo implementados; tarjeta y ficha verificadas por navegador contra la base local",
		look: "sin MOQ, información del proveedor, chip ARS ni comparación con góndola; nombre, precio, selector y Sumar al pedido. El total se muestra en Tu pedido, de acuerdo con el cambio de #106",
		preconditions: "ninguna; comparar con el pedido después de agregar",
	}),
	retest(87, {
		fix: "Lectura de la base compartida: los 27 productos tienen mínimo igual al paso (0,5 o 1) y precio vigente; la interfaz pública tiene pruebas automáticas",
		look: "cantidades y unidades en ficha, Tu pedido y Mis pedidos; no mostrar la presentación del proveedor. El mínimo es configurable por producto: 13 productos por kg tienen mínimo y paso 1, no 0,5",
		preconditions: "una cuenta con pedidos para verificar Mis pedidos",
	}),
	retest(88, {
		fix: "Filtro implementado y verificado por navegador contra la base local; faltan las combinaciones manuales de búsqueda y orden",
		look: "cada categoría filtra los productos y el contador; Todos restablece; combinar con búsqueda y orden. Solo aparecen categorías con productos vigentes",
		preconditions: "al menos dos categorías con productos vigentes",
	}),
	retest(89, {
		fix: "Lectura de la base compartida: los 27 productos activos tienen categoría; falta validar la edición e importación desde el admin",
		look: "selector de categoría al editar productos e importar la planilla; el filtro del catálogo usa esa categoría",
		preconditions: "una cuenta de administrador",
	}),
	...[113, 114, 115].map((code) =>
		retest(code, {
			fix: "Tutorial implementado y actualizado con los cambios de esta pasada; pruebas públicas del recorrido en verde",
			look:
				code === 115
					? "la invitación del primer ingreso no aparece durante el pago y, al responderla, no reaparece en otro navegador"
					: "los pasos y controles del tutorial, salir y volver al catálogo; el recorrido de ejemplo no modifica Tu pedido real",
			preconditions:
				code === 115
					? "cuenta de Google sin invitación respondida y segundo navegador; comprador de prueba para Mercado Pago"
					: "para comprobar que se conserva Tu pedido real, armarlo antes de entrar al tutorial",
		}),
	),
];

const pendingContent: TriageTransition[] = [
	{
		code: 91,
		status: "blocked",
		prependNote: note(
			"Falta la composición confirmada de los mix. Quintal la provee y Flavio la carga desde /admin/products, según la decisión del 13/11/2026. No se inventan ingredientes.",
		),
	},
	{
		code: 92,
		status: "blocked",
		prependNote: note(
			"Faltan las descripciones específicas de los productos, que Flavio carga desde /admin/products. La parte de código ya oculta los textos genéricos o que repiten el nombre; guardar y vaciar una descripción funciona. Cuando se cargue el contenido, volver a Re-test.",
		),
	},
];

const verifiedLegacy: TriageTransition[] = [
	{
		code: 74,
		status: "passed",
		prependNote: note(
			"Verificado por código sobre main con b68fa10: e2e/catalog-public-copy.spec.ts → 2/2 en verde contra la base local, sin comparación de ahorro vs. góndola en home, catálogo y todas las fichas de la muestra sembrada. La pasada conjunta de navegador terminó 44/44.",
		),
	},
	{
		code: 81,
		status: "passed",
		prependNote: note(
			"Verificado por código sobre main con b68fa10: consulta de solo lectura a la base compartida → exactamente los 27 nombres del catálogo real de Quintal, sin productos demo activos; todos con categoría, precio de cliente y condiciones de proveedor vigentes. La lista real ya existe; incluye frutos secos, semillas, aceites y despensa.",
		),
	},
];

/** Second November round (report of 18/11, WP-KL and WP-J). */
const NOVEMBER_19 = "19/11/2026";

/** A re-test whose note is written whole and dated on the round it belongs to. */
function retestOn(code: number, date: string, text: string) {
	return {
		code,
		status: "retest",
		prependNote: triageNote(text, date),
		clearAssignee: true,
	} as const satisfies TriageTransition;
}

const secondRound: TriageTransition[] = [
	retestOn(
		119,
		NOVEMBER_19,
		'Implementado en 38bf6cd: la descripción del producto admite hasta 200 caracteres (Admin › Productos, con contador n/200) y se muestra en la ficha desplegada debajo del título y de la línea de cierre, antes de la foto en celular; la tarjeta y Tu pedido no la muestran; debajo de la bajada del catálogo dice "Seleccionamos productos de primera calidad.". Mirar: un producto con descripción propia la muestra debajo del nombre; uno sin descripción, o cuya descripción repite el nombre, no muestra el bloque; el admin no deja pasar de 200 caracteres. Precondiciones: hasta que se carguen las descripciones de #123, cargar una a mano para probar.',
	),
	retestOn(
		120,
		NOVEMBER_19,
		'Implementado en 38bf6cd: sin "Catálogo mayorista"; bajada del catálogo "Elegí lo que necesitás y sumalo a tu pedido de la semana."; descripción para buscadores y WhatsApp "Explorá productos y armá tu pedido de la semana."; bajada del hero y descripción del home sin "mayorista"; checkout, Mis pedidos y tutorial reescritos. Mirar: home, catálogo, ficha, checkout (los cuatro pasos y el resumen), Mis pedidos sin pedidos y el tutorial completo; "mayorista" y "al por mayor" solo aparecen en Cómo funciona, las preguntas frecuentes y el paso "Comprás junto a otros vecinos" del tutorial; compartir /products por WhatsApp muestra la descripción nueva (puede tardar por caché). Precondiciones: ninguna.',
	),
	retestOn(
		122,
		NOVEMBER_19,
		'Implementado en 38bf6cd: la pregunta 6 del FAQ es "¿Cómo conseguimos estos precios?" con la respuesta del ticket tal cual. Mirar: home › Preguntas frecuentes, última pregunta, texto completo. Precondiciones: ninguna.',
	),
	retestOn(
		123,
		NOVEMBER_19,
		'Cargadas las 27 descripciones con pnpm catalog:descriptions sobre d8571c6 (cada una con su product.update en la auditoría); las castañas de cajú sin sal y salada comparten texto, y "Pecan premium" (#107) usa el de "Nuez pecán premium". Mirar: abrir cada producto del catálogo y comparar la descripción bajo el título con el ticket; Admin › Productos muestra el mismo texto. Precondiciones: ninguna.',
	),
	{
		code: 92,
		from: ["blocked"],
		prependNote: triageNote(
			"Superado por #123: con #119, la ficha muestra la descripción específica de cada producto debajo del título, y las 27 ya están cargadas. No re-testear.",
			NOVEMBER_19,
		),
		retire: true,
	},
	// D6: these re-tests keep their status; #118 changes the card's selector and
	// button, so until WP-J ships they only check the rest.
	...[106, 73, 84].map(
		(code): TriageTransition => ({
			code,
			from: ["retest"],
			prependNote: triageNote(
				'El selector y el botón de la tarjeta van a cambiar con #118 (botón "Sumar" que se convierte en selector). En este re-test mirar el resto: imagen, precio, orden de la ficha y el selector de la ficha desplegada. Cuando entre #118 se vuelve a pedir el re-test completo.',
				NOVEMBER_19,
			),
		}),
	),
	retestOn(
		117,
		NOVEMBER_19,
		"Implementado en 462c6a3. Mirar: en la home (Destacados) y en el catálogo, a 1366, 1920 y 2560 px, las tarjetas tienen ancho fijo y la grilla queda centrada; con menos productos que columnas la fila se centra (en el catálogo, buscar un nombre que dé 1 o 2 productos). En la ficha, uno o dos similares quedan centrados. Una última fila corta debajo de filas completas queda alineada a la izquierda de la grilla, por decisión del 19/11. Precondiciones: ninguna (sin ingresar).",
	),
	retestOn(
		118,
		NOVEMBER_19,
		'Implementado en 462c6a3. Mirar: en el celular (360 a 390 px), catálogo y Destacados en 2 columnas; al hacer scroll hasta que la grilla llega arriba, entran 4 tarjetas completas. La tarjeta muestra foto 1:1, nombre en hasta 2 líneas, precio y precio por kg o L, sin marca, y el botón "Sumar". "Sumar" agrega el mínimo y abre Tu pedido; al cerrarlo, la tarjeta muestra el selector con la cantidad del pedido ("0,5 kg" en productos por peso, solo el número en envasados). "+" y "−" cambian la cantidad del pedido; en el mínimo el "−" es un tachito que lo saca y vuelve "Sumar". Los combos ocupan el ancho completo; la banda "Destacado" y la ficha no cambian. Probar también con sesión. Precondiciones: ninguna; con sesión, cualquier cliente.',
	),
	// Lifecycle cases whose text #118 rewrote; they run after qa:seed.
	...[5, 6, 8].map(
		(code): TriageTransition => ({
			...retestOn(
				code,
				NOVEMBER_19,
				'Texto actualizado por #118 en 462c6a3. Mirar: la tarjeta compacta con "Sumar", el selector con tachito cuando el producto está en el pedido y, en la cantidad fija, el "+" deshabilitado, según los pasos nuevos del caso. Precondiciones: las del caso.',
			),
			from: ["retest", "passed"],
		}),
	),
	// D6, second half: #118 shipped, so the card re-tests ask for a full run.
	{
		code: 106,
		from: ["retest"],
		prependNote: triageNote(
			'#118 entró en 462c6a3. Re-testear completo con la tarjeta compacta: foto 1:1 completa, "$ X por bidón", precio por kg o L siempre, botón "Sumar" sin ícono ni monto, y el selector (solo el número en envasados, "0,5 kg" en productos por peso) cuando el producto está en el pedido. En la ficha y la banda "Destacado" sigue "Sumar al pedido". Precondiciones: ninguna (sin ingresar).',
			NOVEMBER_19,
		),
	},
	{
		code: 73,
		from: ["retest"],
		prependNote: triageNote(
			'#118 entró en 462c6a3. Re-testear completo: en la ficha, el selector arranca en el mínimo y no baja de ahí; en la tarjeta, el selector aparece después de "Sumar", edita la cantidad del pedido y en el mínimo el "−" es un tachito. Precondiciones: ninguna.',
			NOVEMBER_19,
		),
	},
	{
		code: 84,
		from: ["retest"],
		prependNote: triageNote(
			'#118 entró en 462c6a3. Re-testear completo: el orden de la ficha (foto, nombre, precio con su unidad, selector, botón a ancho completo) no cambió; la tarjeta compacta es foto, nombre, precio y "Sumar". Precondiciones: ninguna.',
			NOVEMBER_19,
		),
	},
];

export const qaTicketTriageTransitions: TriageTransition[] = [
	...superseded,
	...outOfScope,
	...blocked,
	...retests,
	...implemented,
	...remainingRetests,
	...pendingContent,
	...verifiedLegacy,
	...secondRound,
];
