/**
 * The QA ticket transitions `pnpm qa:triage` applies. Notes follow the state
 * protocol of `docs/plans/qa-open-tickets-2026-11-orchestration.md` §5, in the
 * tester's language; every later wave appends its own entries here.
 *
 * Do not list a code until its target is settled: re-running the script makes
 * whatever this file says true, and a ticket in the papelera can no longer be
 * edited.
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
	} as const satisfies TriageTransition;
}

const TICKET_PRECONDITIONS = "las del ticket";
const MP_TEST_BUYER =
	"el comprador de prueba y las tarjetas de prueba de Mercado Pago, que el responsable de QA pasa por privado";

const superseded: TriageTransition[] = [
	supersededBy(
		71,
		100,
		'"Cómo funciona" queda con una sola leyenda bajo el diagrama y cuatro pasos, y sale "No somos una distribuidora…"',
	),
	supersededBy(
		72,
		101,
		'la sección "Ofertas destacadas" pasa a mostrar combos y destacados, y salen los filtros Todos / kg / unidad',
	),
	supersededBy(
		75,
		104,
		'las preguntas frecuentes pasan a ser seis, con textos nuevos, y "¿Qué significa cantidad mínima?" no está entre ellas',
	),
	supersededBy(
		76,
		104,
		'las preguntas frecuentes pasan a ser seis, con textos nuevos, y "¿Qué pasa si mi demanda no entra en una operación?" no está entre ellas',
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
			"Fuera de alcance por decisión del 13/11/2026. La entrega se sigue eligiendo al confirmar el pedido (ADR 0011). Se retoma junto con #111 en un grill de diseño.",
		),
	},
	{
		code: 108,
		status: "skipped",
		prependNote: note(
			"Diferido a H2 por decisión del 13/11/2026. Mientras tanto, las otras presentaciones aparecen como productos similares de la misma categoría (#107).",
		),
	},
	{
		code: 111,
		status: "skipped",
		prependNote: note(
			"Fuera de alcance por decisión del 13/11/2026. Se retoma junto con #105 en un grill de diseño.",
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
		fix: "Corregido en 48f756d y dde6a65: el checkout libera un carrito abandonado y espera a que el pedido se sincronice antes de arrancar",
		look: 'que `/checkout` sin sesión lleve a `/login?callbackURL=/checkout` y que, después del login, vuelva al checkout con el pedido intacto, sin "No encontramos un carrito activo"',
		preconditions: "ninguna; arrancar sin sesión",
	}),
	retest(3, {
		fix: "Corregido en 1929045 (B9): si hay un pago en curso, los productos del invitado quedan pendientes y no se pierden",
		look: 'los dos casos del ticket; en la variante, la alerta "Productos pendientes de agregar" en `/cart`, "Ir a pagar" deshabilitado y "No se pudo iniciar checkout" en `/checkout`',
		preconditions:
			"para la variante, un usuario con un pago en curso (pago externo pendiente o un checkout de Mercado Pago iniciado)",
	}),
	retest(12, {
		fix: "Texto reescrito en 1929045",
		look: 'que el checkout arranque en "Pedido", que "Pago" y "Confirmar" estén deshabilitados con "Completá los pasos anteriores", y que el carrito figure "En checkout" sin pedido ni intento de pago',
		preconditions:
			"una cuenta de Google sin direcciones guardadas (por ejemplo, una cuenta nueva) y un pedido con al menos un producto",
	}),
	retest(16, {
		fix: 'Corregido en 1929045 (B3: términos reales en lugar de "lorem ipsum") y texto ajustado en 3e14bda. Los términos ahora son `checkout-v3`',
		look: 'que los términos se lean, que "Confirmar y pagar" esté deshabilitado sin el switch y que con "Pago externo" el pago quede "Pendiente"',
		preconditions:
			'"Pago externo" y "Mercado Pago" (Sandbox) habilitados en `/admin/payments`; sesiones Cliente y Admin',
	}),
	retest(18, {
		fix: 'Texto reescrito en 1929045: el rechazo se prueba con un pago externo que rechaza un admin, porque ya no existe el pago "mock"',
		look: 'que el intento pase a "Rechazado", el pedido a "Fallido" y que el pedido se pueda volver a editar y pagar',
		preconditions:
			'"Pago externo" habilitado en `/admin/payments`; sesiones Cliente y Admin',
	}),
	retest(20, {
		fix: 'Texto reescrito en 1929045 con pasos concretos (la nota anterior decía "No se entiende el flujo")',
		look: 'el rechazo "Uno de los productos de tu pedido ya no está disponible. Revisalo antes de continuar.", que el pedido quede editable y que no se cree un pedido ni un intento de pago nuevos',
		preconditions: "sesiones Cliente y Admin en navegadores distintos",
	}),
	retest(21, {
		fix: "Texto reescrito en 6a25a61; Mercado Pago ya está en Sandbox en el entorno de QA (antes faltaba `MERCADOPAGO_ACCESS_TOKEN`)",
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
		look: 'que el intento pase a "completed" con el id del pago, el pedido a "En procesamiento" y el carrito a "Enviado"',
		preconditions: `seguir desde el intento de #21; ${MP_TEST_BUYER}`,
	}),
	retest(24, {
		fix: "Texto reescrito en 6a25a61",
		look: 'que `OTHE` deje el intento "failed" con el pedido editable, y que `CONT` lo deje "inProcess" sin acreditar nada',
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
		fix: "Corregido en 1929045 (B1): el seguimiento no dibuja etapas hasta que se acredita el pago",
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
		fix: "Corregido en 1929045 (B2) y ed0b5b6 (B10): los avisos muestran un motivo legible",
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
		fix: 'Corregido en 1929045 (B7): al reejecutar una operación completada, "Incluir rollovers" queda forzado',
		look: 'el switch prendido y deshabilitado, que la vista siga a la operación nueva y que "Descartar" deje la demanda intacta',
		preconditions:
			"una operación completada dentro de la ventana y un borrador",
	}),
	retest(48, {
		fix: 'Corregido en 1929045 (B4: "Confirmar" ya no queda trabado en 0 después de "Ajustar reparto") y ed0b5b6 (B10: motivo legible)',
		look: 'el reparto LIFO, el error "El reparto suma…", una línea confirmada en 0 y el aviso al cliente con "El proveedor no confirmó toda la cantidad pedida."',
		preconditions: TICKET_PRECONDITIONS,
	}),
	retest(54, {
		fix: "Corregido en 1929045 (B8): cada paquete de salida guarda de qué paquete de entrada sale",
		look: 'que, al reabrir el paquete, diga "No queda cantidad recibida sin fraccionar." y "Fraccionar" quede deshabilitado',
		preconditions:
			"un paquete de entrada que se fracciona por primera vez después del 19/09/2026 (lo más simple: uno de una operación nueva); el #160 no sirve",
	}),
	retest(61, {
		fix: 'Corregido en 1929045 (B2 y B6): un envío demorado se recupera con "Recuperar" y el aviso muestra el motivo',
		look: 'el motivo en "Incidencia de fulfillment", "Recuperar" del paquete deshabilitado hasta recuperar el envío, y "Incidencia resuelta"',
		preconditions: 'un envío "En tránsito"',
	}),
	retest(67, {
		fix: "Texto reescrito en 1929045, con un caso A armado sobre datos de prueba",
		look: 'que ORD-SEED-PICKUP pase solo a "Completado", y los casos B ("Cancelado") y C (sigue "En procesamiento")',
		preconditions:
			"para el caso A, el paquete PKG-SEED-OUT-PICKUP-B de `pnpm db:seed:test`; si no está en la base, ese caso queda Bloqueado",
	}),
	retest(80, {
		fix: "Implementado en 2d30cc0: las fotos se suben desde `/admin/products`",
		look: 'que ninguna tarjeta ni ficha muestre "Sin imagen para …"',
		preconditions:
			"las fotos ya cargadas; si falta alguna, es contenido pendiente y no un fallo de la subida",
	}),
	retest(83, {
		fix: 'Implementado en 5c5d7e4: el link "Sé proveedor" del pie lleva al formulario de `/proveedores`',
		look: 'que la columna "Nosotros" tenga dos links y que el formulario de `/proveedores` se pueda enviar',
		preconditions: "ninguna",
	}),
	retest(86, {
		fix: 'Implementado en 006a157: "Descargar planilla de precios" y "Subir planilla" en `/admin/product-terms`',
		look: "la vista previa con el precio actual, el nuevo y la variación %, y que al confirmar se actualicen todos. El registro con fecha sigue diferido: mientras tanto, cada cambio deja su fila en la auditoría",
		preconditions: "una sesión de admin",
	}),
];

export const qaTicketTriageTransitions: TriageTransition[] = [
	...superseded,
	...outOfScope,
	...blocked,
	...retests,
];
