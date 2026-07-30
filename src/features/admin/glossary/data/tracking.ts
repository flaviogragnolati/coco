import {
	trackingEventLabelMap,
	trackingSourceLabelMap,
} from "~/shared/common/tracking-display";
import type { GlossaryEntry } from "../glossary.types";

const eventColumn = "cart_item_tracking_event.eventType";
const sourceColumn = "cart_item_tracking_event.source";

export const trackingGlossaryEntries: GlossaryEntry[] = [
	// --- Conceptos -----------------------------------------------------------
	{
		slug: "concepto-recorrido",
		kind: "concept",
		section: "tracking",
		label: "Recorrido",
		term: "Fulfillment journey",
		definition:
			"La progresión por etapas, orientada a mostrarse, de una solicitud del cliente a través del fulfillment, calculada a partir de los eventos de seguimiento. Las desviaciones aparecen como avisos, nunca como etapas.",
		aliases: ["Timeline", "Log de eventos", "Linaje de fulfillment"],
		href: "/admin/tracking",
	},
	{
		slug: "concepto-etapa",
		kind: "concept",
		section: "tracking",
		label: "Etapa",
		term: "Journey stage",
		definition:
			"Un paso del eje fijo de un recorrido. El recorrido del admin tiene diez etapas mapeadas 1:1 al camino feliz; el del cliente las agrupa en seis.",
		aliases: ["Estado", "Estado operativo"],
		href: "/admin/tracking",
	},
	{
		slug: "concepto-aviso",
		kind: "concept",
		section: "tracking",
		label: "Aviso",
		term: "Journey notice",
		definition:
			"Una desviación o anotación colgada de la etapa que estaba en curso cuando ocurrió: rollover, excepción, cancelación o cambio de cantidad.",
		aliases: ["Advertencia", "Error"],
		href: "/admin/tracking",
	},
	{
		slug: "concepto-seguimiento-del-pedido",
		kind: "concept",
		section: "tracking",
		label: "Seguimiento del pedido",
		term: "Order journey",
		definition:
			"La vista de cara al cliente que agrupa los recorridos de los ítems de una orden enviada. Cuando todos comparten etapa colapsa en un único recorrido de seis etapas.",
		aliases: ["Timeline del pedido", "Pantalla de tracking"],
		href: "/admin/tracking",
	},

	// --- Entidades -----------------------------------------------------------
	{
		slug: "entidad-evento-de-seguimiento",
		kind: "entity",
		section: "tracking",
		label: "Evento de seguimiento",
		definition:
			"Un hecho registrado sobre un ítem de carrito, con su tipo, su origen y los registros operativos que lo provocaron. Es historia, no linaje: un ítem agregado y luego removido tiene evento y no tiene linaje.",
		aliases: ["Estado de la orden", "Estado del envío"],
		occurrences: [
			{ code: "CartItemTrackingEvent", db: "cart_item_tracking_event" },
		],
		href: "/admin/tracking",
	},

	// --- Estados: tipo de evento ---------------------------------------------
	{
		slug: "estado-evento-agregado-al-carrito",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.addedToCart,
		definition:
			"El cliente agregó el producto al carrito. Es historia: no implica linaje de fulfillment.",
		occurrences: [
			{ code: "CartItemTrackingEventType.addedToCart", db: eventColumn },
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-pedido-confirmado",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.submittedToOrder,
		definition:
			"El checkout se confirmó y la solicitud quedó fijada para trazarse operativamente.",
		occurrences: [
			{ code: "CartItemTrackingEventType.submittedToOrder", db: eventColumn },
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-cantidad-actualizada",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.cartItemQuantityChanged,
		definition:
			"Cambió la cantidad pedida del ítem; el aviso de cantidad del recorrido sale de acá.",
		occurrences: [
			{
				code: "CartItemTrackingEventType.cartItemQuantityChanged",
				db: eventColumn,
			},
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-producto-removido",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.cartItemRemoved,
		definition: "El ítem se sacó del carrito antes de enviarse como solicitud.",
		occurrences: [
			{ code: "CartItemTrackingEventType.cartItemRemoved", db: eventColumn },
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-producto-cancelado",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.cartItemCancelled,
		definition:
			"La solicitud ya enviada se canceló, por el usuario o por un admin.",
		occurrences: [
			{ code: "CartItemTrackingEventType.cartItemCancelled", db: eventColumn },
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-incidencia-de-fulfillment",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.fulfillmentException,
		definition:
			"El linaje del ítem tocó un paquete o envío demorado o fallido.",
		occurrences: [
			{
				code: "CartItemTrackingEventType.fulfillmentException",
				db: eventColumn,
			},
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-incidencia-resuelta",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.exceptionResolved,
		definition:
			"Los registros se recuperaron o la cantidad se reencaminó, así que la incidencia dejó de aplicar.",
		occurrences: [
			{ code: "CartItemTrackingEventType.exceptionResolved", db: eventColumn },
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-incluido-en-operacion",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.includedInOperation,
		definition: "Una operación de agregación tomó la demanda del ítem.",
		occurrences: [
			{
				code: "CartItemTrackingEventType.includedInOperation",
				db: eventColumn,
			},
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-asignado-a-lote",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.allocatedToLotItem,
		definition:
			"Se creó la asignación de demanda que conecta el ítem con una línea de proveedor.",
		occurrences: [
			{ code: "CartItemTrackingEventType.allocatedToLotItem", db: eventColumn },
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-pedido-al-proveedor",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.includedInSupplierOrder,
		definition:
			"El lote que contiene la demanda se envió en una orden de proveedor.",
		occurrences: [
			{
				code: "CartItemTrackingEventType.includedInSupplierOrder",
				db: eventColumn,
			},
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-confirmado-por-proveedor",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.supplierConfirmed,
		definition: "El proveedor confirmó la línea que cubre la demanda del ítem.",
		occurrences: [
			{ code: "CartItemTrackingEventType.supplierConfirmed", db: eventColumn },
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-empaquetado",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.packaged,
		definition: "La cantidad quedó asignada dentro de un paquete.",
		occurrences: [
			{ code: "CartItemTrackingEventType.packaged", db: eventColumn },
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-en-envio-interno",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.movedInInternalShipment,
		definition:
			"El paquete que lleva la cantidad salió en una transferencia interna hacia el destino.",
		occurrences: [
			{
				code: "CartItemTrackingEventType.movedInInternalShipment",
				db: eventColumn,
			},
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-recibido-en-deposito",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.receivedAtWarehouse,
		definition:
			"La cantidad llegó al destino interno y quedó lista para fraccionarse.",
		occurrences: [
			{
				code: "CartItemTrackingEventType.receivedAtWarehouse",
				db: eventColumn,
			},
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-en-envio-al-cliente",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.movedInEndUserShipment,
		definition:
			"El paquete de salida partió en un envío hacia el usuario final.",
		occurrences: [
			{
				code: "CartItemTrackingEventType.movedInEndUserShipment",
				db: eventColumn,
			},
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-disponible-para-retirar",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.arrivedAtPickupPoint,
		definition:
			"El envío llegó a un punto de retiro. No es una entrega: cada paquete sigue necesitando su confirmación.",
		occurrences: [
			{
				code: "CartItemTrackingEventType.arrivedAtPickupPoint",
				db: eventColumn,
			},
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-entregado",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.delivered,
		definition:
			"Se registró la entrega física del paquete de salida a su cliente.",
		occurrences: [
			{ code: "CartItemTrackingEventType.delivered", db: eventColumn },
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-reprogramado-antes-de-asignacion",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.rolledOverPreAllocation,
		definition:
			"La cantidad se cayó de la operación antes de llegar a una línea de proveedor y quedó como rollover abierto.",
		occurrences: [
			{
				code: "CartItemTrackingEventType.rolledOverPreAllocation",
				db: eventColumn,
			},
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-reprogramado-despues-de-asignacion",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.rolledOverPostAllocation,
		definition:
			"La cantidad ya asignada se cayó por un recorte del proveedor, un paquete fallido o una baja.",
		occurrences: [
			{
				code: "CartItemTrackingEventType.rolledOverPostAllocation",
				db: eventColumn,
			},
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-rollover-resuelto",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.rollOverResolved,
		definition:
			"Se registró una decisión terminal sobre un rollover del ítem: reagrupado, resuelto o cancelado.",
		occurrences: [
			{ code: "CartItemTrackingEventType.rollOverResolved", db: eventColumn },
		],
		href: "/admin/tracking",
	},
	{
		slug: "estado-evento-excluido-de-la-operacion",
		kind: "status",
		section: "tracking",
		label: trackingEventLabelMap.excludedFromOperation,
		definition:
			"La compensación de una operación sacó la demanda ya agrupada, que vuelve a la cola de agregación.",
		occurrences: [
			{
				code: "CartItemTrackingEventType.excludedFromOperation",
				db: eventColumn,
			},
		],
		href: "/admin/tracking",
	},

	// --- Estados: origen del evento ------------------------------------------
	{
		slug: "estado-origen-usuario",
		kind: "status",
		section: "tracking",
		label: trackingSourceLabelMap.user,
		definition: "El hecho lo provocó el cliente desde el storefront.",
		occurrences: [{ code: "TrackingEventSource.user", db: sourceColumn }],
		href: "/admin/tracking",
	},
	{
		slug: "estado-origen-admin",
		kind: "status",
		section: "tracking",
		label: trackingSourceLabelMap.admin,
		definition: "El hecho lo provocó un administrador desde el panel.",
		occurrences: [{ code: "TrackingEventSource.admin", db: sourceColumn }],
		href: "/admin/tracking",
	},
	{
		slug: "estado-origen-sistema",
		kind: "status",
		section: "tracking",
		label: trackingSourceLabelMap.system,
		definition:
			"El hecho lo produjo un proceso automático de la plataforma; es el valor por defecto.",
		occurrences: [{ code: "TrackingEventSource.system", db: sourceColumn }],
		href: "/admin/tracking",
	},
	{
		slug: "estado-origen-proveedor",
		kind: "status",
		section: "tracking",
		label: trackingSourceLabelMap.supplier,
		definition: "El hecho vino del ciclo con el proveedor mayorista.",
		occurrences: [{ code: "TrackingEventSource.supplier", db: sourceColumn }],
		href: "/admin/tracking",
	},
	{
		slug: "estado-origen-carrier",
		kind: "status",
		section: "tracking",
		label: trackingSourceLabelMap.carrier,
		definition: "El hecho vino del transportista que mueve los envíos.",
		occurrences: [{ code: "TrackingEventSource.carrier", db: sourceColumn }],
		href: "/admin/tracking",
	},
	{
		slug: "estado-origen-api-externa",
		kind: "status",
		section: "tracking",
		label: trackingSourceLabelMap.external_api,
		definition:
			"El hecho entró por una integración externa, típicamente un webhook.",
		occurrences: [
			{ code: "TrackingEventSource.external_api", db: sourceColumn },
		],
		href: "/admin/tracking",
	},
];
