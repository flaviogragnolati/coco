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

/**
 * Admin fulfillment journey: the 10 happy-path stages, 1:1 with the happy-path
 * literals of `CartItemFulfillmentStatus`. Deviations (cancellation, rollover,
 * exception) are notices/outcomes, never stages — see `tracking-journey.ts`.
 */
export const adminTrackingStageKeys = [
	"awaitingAggregation",
	"includedInOperation",
	"allocatedToSupplierItem",
	"requestedFromSupplier",
	"supplierConfirmed",
	"packaged",
	"inInternalShipment",
	"atWarehouse",
	"inEndUserShipment",
	"delivered",
] as const;

export type AdminTrackingStageKey = (typeof adminTrackingStageKeys)[number];

export const adminTrackingStageDefinitions: Array<{
	key: AdminTrackingStageKey;
	label: string;
	description: string;
}> = [
	{
		key: "awaitingAggregation",
		label: "Esperando agregacion",
		description: "El pedido fue confirmado y espera entrar en una operacion.",
	},
	{
		key: "includedInOperation",
		label: "En operacion",
		description: "La demanda quedo incluida en una operacion de compra.",
	},
	{
		key: "allocatedToSupplierItem",
		label: "Asignado a lote",
		description: "La demanda fue asignada a una linea de lote de proveedor.",
	},
	{
		key: "requestedFromSupplier",
		label: "Pedido a proveedor",
		description: "El lote fue enviado al proveedor como orden de compra.",
	},
	{
		key: "supplierConfirmed",
		label: "Confirmado",
		description: "El proveedor confirmo la disponibilidad del item.",
	},
	{
		key: "packaged",
		label: "Empaquetado",
		description: "El item fue empaquetado y esta listo para logistica.",
	},
	{
		key: "inInternalShipment",
		label: "Envio interno",
		description: "El paquete viaja hacia el deposito.",
	},
	{
		key: "atWarehouse",
		label: "En deposito",
		description: "El paquete fue recibido en el deposito.",
	},
	{
		key: "inEndUserShipment",
		label: "Envio al cliente",
		description: "El paquete salio en el envio final al cliente.",
	},
	{
		key: "delivered",
		label: "Entregado",
		description: "El item llego a destino.",
	},
];

export const adminTrackingStageByEventType: Partial<
	Record<TrackingEventType, AdminTrackingStageKey>
> = {
	submittedToOrder: "awaitingAggregation",
	includedInOperation: "includedInOperation",
	allocatedToLotItem: "allocatedToSupplierItem",
	includedInSupplierOrder: "requestedFromSupplier",
	supplierConfirmed: "supplierConfirmed",
	packaged: "packaged",
	movedInInternalShipment: "inInternalShipment",
	receivedAtWarehouse: "atWarehouse",
	movedInEndUserShipment: "inEndUserShipment",
	delivered: "delivered",
};
