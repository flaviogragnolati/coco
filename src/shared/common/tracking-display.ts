export const trackingEventTypes = [
	"addedToCart",
	"submittedToOrder",
	"cartItemQuantityChanged",
	"cartItemRemoved",
	"cartItemCancelled",
	"fulfillmentException",
	"exceptionResolved",
	"includedInOperation",
	"allocatedToLotItem",
	"includedInSupplierOrder",
	"supplierConfirmed",
	"packaged",
	"movedInInternalShipment",
	"receivedAtWarehouse",
	"movedInEndUserShipment",
	"delivered",
	"rolledOverPreAllocation",
	"rolledOverPostAllocation",
] as const;

export const trackingEventSources = [
	"user",
	"admin",
	"system",
	"supplier",
	"carrier",
	"external_api",
] as const;

export const userTrackingStageKeys = [
	"submitted",
	"preparation",
	"supplier",
	"packaging",
	"shipping",
	"delivery",
] as const;

export const userTrackingNoticeKinds = [
	"exception",
	"resolved",
	"rollover",
	"cancelled",
	"quantity",
] as const;

export type TrackingEventType = (typeof trackingEventTypes)[number];
export type TrackingEventSource = (typeof trackingEventSources)[number];
export type UserTrackingStageKey = (typeof userTrackingStageKeys)[number];
export type UserTrackingNoticeKind = (typeof userTrackingNoticeKinds)[number];

export const trackingEventLabelMap: Record<TrackingEventType, string> = {
	addedToCart: "Producto agregado al carrito",
	submittedToOrder: "Pedido confirmado",
	cartItemQuantityChanged: "Cantidad actualizada",
	cartItemRemoved: "Producto removido",
	cartItemCancelled: "Producto cancelado",
	fulfillmentException: "Incidencia de fulfillment",
	exceptionResolved: "Incidencia resuelta",
	includedInOperation: "Incluido en operacion",
	allocatedToLotItem: "Asignado a lote de proveedor",
	includedInSupplierOrder: "Pedido al proveedor",
	supplierConfirmed: "Confirmado por proveedor",
	packaged: "Empaquetado",
	movedInInternalShipment: "En envio interno",
	receivedAtWarehouse: "Recibido en deposito",
	movedInEndUserShipment: "En envio al cliente",
	delivered: "Entregado",
	rolledOverPreAllocation: "Reprogramado antes de asignacion",
	rolledOverPostAllocation: "Reprogramado despues de asignacion",
};

export const trackingSourceLabelMap: Record<TrackingEventSource, string> = {
	user: "Usuario",
	admin: "Admin",
	system: "Sistema",
	supplier: "Proveedor",
	carrier: "Carrier",
	external_api: "API externa",
};

export const userTrackingStageDefinitions: Array<{
	key: UserTrackingStageKey;
	label: string;
	description: string;
}> = [
	{
		key: "submitted",
		label: "Pedido confirmado",
		description: "Tu solicitud quedo registrada.",
	},
	{
		key: "preparation",
		label: "Preparacion",
		description: "Estamos agrupando y preparando la compra.",
	},
	{
		key: "supplier",
		label: "Proveedor",
		description: "El pedido esta siendo gestionado con el proveedor.",
	},
	{
		key: "packaging",
		label: "Empaque",
		description: "El producto esta listo para entrar en logistica.",
	},
	{
		key: "shipping",
		label: "Envio",
		description: "El producto esta en movimiento.",
	},
	{
		key: "delivery",
		label: "Entrega",
		description: "El producto llego a destino.",
	},
];

export const userTrackingStageByEventType: Partial<
	Record<TrackingEventType, UserTrackingStageKey>
> = {
	submittedToOrder: "submitted",
	includedInOperation: "preparation",
	allocatedToLotItem: "preparation",
	includedInSupplierOrder: "supplier",
	supplierConfirmed: "supplier",
	packaged: "packaging",
	movedInInternalShipment: "shipping",
	receivedAtWarehouse: "shipping",
	movedInEndUserShipment: "shipping",
	delivered: "delivery",
};

export const userTrackingNoticeKindByEventType: Partial<
	Record<TrackingEventType, UserTrackingNoticeKind>
> = {
	fulfillmentException: "exception",
	exceptionResolved: "resolved",
	rolledOverPreAllocation: "rollover",
	rolledOverPostAllocation: "rollover",
	cartItemCancelled: "cancelled",
	cartItemRemoved: "cancelled",
	cartItemQuantityChanged: "quantity",
};
