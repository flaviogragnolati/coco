import type {
	CommandDisclosure,
	EntityDisclosures,
} from "~/features/admin/crud/_lib/fulfillment-effects.types";
import type { ShipmentDetail } from "~/shared/common/admin-crud/shipment.types";

type ShipmentPackage = ShipmentDetail["packages"][number];

/**
 * The effect disclosures of the shipment group. `deliver` is the mode-dependent
 * one and the reason `Shipment.deliveryMode` exists: a home delivery hands the
 * goods over and cascades to its packages, a pickup-point arrival does not
 * (architecture §8). Both branches are declared and the zero-count drop picks.
 */
export type ShipmentPackageSelection = {
	packageCount: number;
};

export type ShipmentReceiveDraft = {
	lineCount: number;
	shortfallQuantity: string;
	shortfallCartItemCount: number;
	final: boolean;
};

export type ShipmentDisclosureContext = {
	shipment?: ShipmentDetail;
	/** What the operator has picked in the two selection-driven dialogs. */
	selection?: ShipmentPackageSelection;
	receive?: ShipmentReceiveDraft;
};

function livePackages(ctx: ShipmentDisclosureContext): ShipmentPackage[] {
	return (ctx.shipment?.packages ?? []).filter(
		(pkg) => pkg.status !== "cancelled",
	);
}

function liveLines(ctx: ShipmentDisclosureContext) {
	return livePackages(ctx).flatMap((pkg) =>
		pkg.lines.filter((line) => line.status !== "cancelled"),
	);
}

function affectedCartItems(ctx: ShipmentDisclosureContext) {
	return new Set(
		liveLines(ctx).flatMap((line) =>
			line.allocations.map((allocation) => allocation.cartItemId),
		),
	).size;
}

const isHomeDelivery = (ctx: ShipmentDisclosureContext) =>
	ctx.shipment?.deliveryMode === "homeDelivery";

const isPickupPoint = (ctx: ShipmentDisclosureContext) =>
	ctx.shipment?.deliveryMode === "pickupPoint";

const isEndUser = (ctx: ShipmentDisclosureContext) =>
	ctx.shipment?.type === "endUserDelivery";

/** A receipt or delivery from `delayed` also clears the exception it recorded. */
const wasDisrupted = (ctx: ShipmentDisclosureContext) =>
	ctx.shipment?.status === "delayed";

function packageDetail(ctx: ShipmentDisclosureContext) {
	return livePackages(ctx).map((pkg) => ({
		label: `#${pkg.id} ${pkg.name}`,
		value: `${pkg.lineCount} línea(s) · ${pkg.lineQuantity}`,
	}));
}

function customerDetail(ctx: ShipmentDisclosureContext) {
	const rows = new Map<string, string>();
	for (const line of liveLines(ctx)) {
		for (const allocation of line.allocations) {
			rows.set(
				`${allocation.userName} · ${allocation.cartItemCode}`,
				allocation.quantity,
			);
		}
	}
	return Array.from(rows.entries()).map(([label, value]) => ({ label, value }));
}

export const shipmentReceiveAppliedCodes = [
	"linesReceived",
	"shortfallQuantity",
	"rollOversCreated",
	"cartItemsAffected",
] as const;

const createEndUser: CommandDisclosure<ShipmentDisclosureContext> = {
	effects: [
		{
			kind: "creates",
			record: "shipment",
			count: () => 1,
			note: "entrega al cliente, en listo para despacho",
		},
		{
			kind: "note",
			count: (ctx) => ctx.selection?.packageCount ?? 0,
			text: "{n} paquete(s) de salida quedan asignados a este envío",
		},
	],
	demand: {
		moves: false,
		// Architecture §8: creating a shipment publishes nothing because nothing moved.
		note: "No mueve demanda ni avisa al cliente: los paquetes no se movieron todavía.",
	},
	undo: {
		kind: "none",
		note: "No hay comando para soltar un paquete: se corrige marcando el envío como fallido y reintentando.",
	},
	next: [
		{
			entity: "shipment",
			command: "dispatch",
			label: "Despachar el envío cuando esté armado",
		},
	],
};

const addPackages: CommandDisclosure<ShipmentDisclosureContext> = {
	effects: [
		{
			kind: "note",
			count: (ctx) => ctx.selection?.packageCount ?? 0,
			text: "{n} paquete(s) más quedan asignados a este envío",
		},
	],
	demand: {
		moves: false,
		note: "No mueve demanda ni avisa al cliente: sólo cambia qué envío lleva cada paquete.",
	},
	undo: {
		kind: "none",
		note: "No hay comando para soltar un paquete: se corrige marcando el envío como fallido y reintentando.",
	},
	next: [
		{
			entity: "shipment",
			command: "dispatch",
			label: "Despachar el envío cuando esté armado",
		},
	],
};

const dispatch: CommandDisclosure<ShipmentDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "shipment",
			to: "inTransit",
			count: () => 1,
		},
		{
			kind: "transition",
			record: "package",
			to: "inTransit",
			count: (ctx) => livePackages(ctx).length,
		},
		{
			kind: "transition",
			record: "packageLine",
			from: "packed",
			to: "shipped",
			count: (ctx) => liveLines(ctx).length,
		},
		{
			kind: "customer",
			publishes: "shipment.internal.dispatched",
			count: (ctx) => (isEndUser(ctx) ? 0 : affectedCartItems(ctx)),
			note: "{n} ítem(s) de demanda pasan a «en traslado interno»",
		},
		{
			kind: "customer",
			publishes: "shipment.endUser.dispatched",
			count: (ctx) => (isEndUser(ctx) ? affectedCartItems(ctx) : 0),
			note: "{n} ítem(s) de demanda pasan a «en envío al cliente»",
		},
	],
	demand: {
		moves: false,
		note: "No mueve cantidad: el envío sale con lo que sus paquetes ya declaran.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: un envío que ya salió se cierra recibiendo, entregando o marcándolo como fallido.",
	},
	next: [
		{
			entity: "shipment",
			command: "deliver",
			label: "Entregar el envío al cliente cuando llegue",
			when: isEndUser,
		},
		{
			entity: "shipment",
			command: "receive",
			label: "Recibir el envío y registrar lo que llegó",
		},
	],
	detail: packageDetail,
};

const receive: CommandDisclosure<ShipmentDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "shipment",
			to: "received",
			count: () => 1,
		},
		{
			kind: "transition",
			record: "package",
			to: "received",
			count: (ctx) => livePackages(ctx).length,
		},
		{
			kind: "transition",
			record: "packageLine",
			from: "shipped",
			to: "received",
			count: (ctx) => ctx.receive?.lineCount ?? liveLines(ctx).length,
		},
		{
			kind: "quantity",
			label: "Faltante",
			quantity: (ctx) => ctx.receive?.shortfallQuantity ?? null,
		},
		{
			// Not a count: which demand absorbs the shortfall is decided LIFO by
			// payment date, and the shipment detail does not carry payment dates.
			kind: "note",
			count: (ctx) => ((ctx.receive?.shortfallCartItemCount ?? 0) > 0 ? 1 : 0),
			text: "El faltante vuelve a rollover, absorbido por fecha de pago (más reciente primero)",
		},
		{
			kind: "transition",
			record: "supplierOrder",
			from: "readyForReceipt",
			to: "completed",
			count: (ctx) => (ctx.receive?.final ? 1 : 0),
		},
		{
			kind: "note",
			count: (ctx) => (ctx.receive && !ctx.receive.final ? 1 : 0),
			text: "Si esta recepción no deja nada pendiente, la orden de proveedor se completa igual",
		},
		{
			kind: "customer",
			publishes: "shipment.internal.received",
			count: (ctx) => affectedCartItems(ctx),
			note: "{n} ítem(s) de demanda pasan a «en depósito»",
		},
		{
			kind: "customer",
			publishes: "rollover.postAllocation.created",
			count: (ctx) => ctx.receive?.shortfallCartItemCount ?? 0,
			note: "hasta {n} cliente(s) ven un aviso de reprogramación por el faltante",
		},
		{
			kind: "customer",
			publishes: "fulfillment.exception.resolved",
			count: (ctx) => (wasDisrupted(ctx) ? affectedCartItems(ctx) : 0),
			note: "{n} ítem(s) de demanda dejan de estar en excepción",
		},
	],
	demand: {
		moves: true,
		note: "El faltante sale de la asignación y vuelve a rollover para la demanda que lo absorbe.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: recibido es terminal para un envío.",
	},
	next: [
		{
			entity: "package",
			command: "fractionate",
			label: "Fraccionar el paquete de entrada por cliente",
		},
	],
	appliedCodes: shipmentReceiveAppliedCodes,
};

const deliver: CommandDisclosure<ShipmentDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "shipment",
			to: "received",
			count: () => 1,
		},
		{
			// No `from`: a delivery is reachable from `inTransit` and from `delayed`,
			// and the packages sit wherever their shipment left them.
			kind: "transition",
			record: "package",
			to: "received",
			count: (ctx) => (isHomeDelivery(ctx) ? livePackages(ctx).length : 0),
		},
		{
			kind: "transition",
			record: "packageLine",
			from: "shipped",
			to: "received",
			count: (ctx) => (isHomeDelivery(ctx) ? liveLines(ctx).length : 0),
		},
		{
			kind: "note",
			count: (ctx) => (isPickupPoint(ctx) ? livePackages(ctx).length : 0),
			text: "{n} paquete(s) siguen en tránsito: la llegada al punto no es la entrega, cada cliente confirma su retiro",
		},
		{
			kind: "customer",
			publishes: "shipment.endUser.delivered",
			count: (ctx) => (isHomeDelivery(ctx) ? affectedCartItems(ctx) : 0),
			note: "{n} ítem(s) de demanda pasan a «entregado»",
		},
		{
			kind: "customer",
			publishes: "shipment.endUser.arrivedAtPickupPoint",
			count: (ctx) => (isPickupPoint(ctx) ? affectedCartItems(ctx) : 0),
			note: "{n} cliente(s) ven «disponible para retirar»",
		},
		{
			kind: "customer",
			publishes: "fulfillment.exception.resolved",
			count: (ctx) => (wasDisrupted(ctx) ? affectedCartItems(ctx) : 0),
			note: "{n} ítem(s) de demanda dejan de estar en excepción",
		},
	],
	demand: {
		moves: false,
		note: "No mueve cantidad: una diferencia en la entrega se compone dividiendo el paquete, marcándolo fallido y dándolo de baja.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: recibido es terminal para un envío.",
	},
	next: [
		{
			entity: "package",
			command: "confirmDelivery",
			label: "Cada cliente confirma el retiro de su paquete",
			when: isPickupPoint,
		},
	],
	detail: customerDetail,
};

const markDelayed: CommandDisclosure<ShipmentDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "shipment",
			from: "inTransit",
			to: "delayed",
			count: () => 1,
		},
		{
			kind: "transition",
			record: "package",
			from: "inTransit",
			to: "delayed",
			count: (ctx) => livePackages(ctx).length,
		},
		{
			kind: "customer",
			publishes: "fulfillment.exception.created",
			count: (ctx) => affectedCartItems(ctx),
			note: "{n} ítem(s) de demanda pasan a excepción y el cliente ve el motivo",
		},
	],
	demand: {
		moves: false,
		note: "No mueve cantidad: la demanda queda en excepción hasta que el envío llegue o se dé de baja.",
	},
	undo: {
		kind: "command",
		entity: "shipment",
		command: "recover",
		note: "Se recupera cuando la demora se resuelve; recibirlo o entregarlo también resuelve la excepción.",
	},
	next: [
		{
			entity: "shipment",
			command: "deliver",
			label: "Entregar cuando llegue, o escalar a fallido",
			when: isEndUser,
		},
		{
			entity: "shipment",
			command: "receive",
			label: "Recibir cuando llegue, o escalar a fallido",
		},
	],
	detail: customerDetail,
};

const markFailed: CommandDisclosure<ShipmentDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "shipment",
			to: "failed",
			count: () => 1,
		},
		{
			kind: "transition",
			record: "package",
			to: "failed",
			count: (ctx) => livePackages(ctx).length,
		},
		{
			kind: "customer",
			publishes: "fulfillment.exception.created",
			count: (ctx) => affectedCartItems(ctx),
			note: "{n} ítem(s) de demanda pasan a excepción y el cliente ve el motivo",
		},
	],
	demand: {
		moves: false,
		note: "No mueve cantidad todavía: la demanda queda en excepción hasta que se reintente o se dé de baja.",
	},
	undo: {
		kind: "command",
		entity: "shipment",
		command: "retry",
		note: "Se reintenta con un envío nuevo que se lleva los paquetes vivos.",
	},
	next: [
		{
			entity: "shipment",
			command: "retry",
			label: "Reintentar con un envío nuevo, o dar de baja los paquetes",
		},
	],
	detail: customerDetail,
};

const retry: CommandDisclosure<ShipmentDisclosureContext> = {
	effects: [
		{
			kind: "creates",
			record: "shipment",
			count: () => 1,
			note: "reemplazo, en listo para despacho",
		},
		{
			kind: "note",
			count: (ctx) => livePackages(ctx).length,
			text: "{n} paquete(s) se reasignan al envío nuevo conservando su identidad",
		},
		{
			kind: "transition",
			record: "package",
			from: "failed",
			to: "readyForShipment",
			count: (ctx) => livePackages(ctx).length,
		},
		{
			kind: "transition",
			record: "packageLine",
			from: "shipped",
			to: "packed",
			count: (ctx) => liveLines(ctx).length,
		},
		{
			kind: "customer",
			publishes: "fulfillment.exception.resolved",
			count: (ctx) => affectedCartItems(ctx),
			note: "{n} ítem(s) de demanda salen de excepción",
		},
	],
	demand: {
		moves: false,
		note: "No mueve cantidad: los paquetes viajan igual, en otro envío.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: el envío fallido queda vacío como historia.",
	},
	next: [
		{
			entity: "shipment",
			command: "dispatch",
			label: "Despachar el envío de reemplazo",
		},
	],
	detail: packageDetail,
};

/** The packages `recover` moves: only those the delay caught. */
function delayedPackages(ctx: ShipmentDisclosureContext) {
	return livePackages(ctx).filter((pkg) => pkg.status === "delayed");
}

const recoversToTransit = (ctx: ShipmentDisclosureContext) =>
	ctx.shipment?.recoveryTarget === "inTransit";

const recoversToDispatch = (ctx: ShipmentDisclosureContext) =>
	ctx.shipment?.recoveryTarget === "readyForDispatch";

const recover: CommandDisclosure<ShipmentDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "shipment",
			from: "delayed",
			to: "inTransit",
			count: (ctx) => (recoversToTransit(ctx) ? 1 : 0),
		},
		{
			kind: "transition",
			record: "shipment",
			from: "delayed",
			to: "readyForDispatch",
			count: (ctx) => (recoversToDispatch(ctx) ? 1 : 0),
		},
		{
			kind: "transition",
			record: "package",
			from: "delayed",
			to: "inTransit",
			count: (ctx) =>
				recoversToTransit(ctx) ? delayedPackages(ctx).length : 0,
		},
		{
			kind: "transition",
			record: "package",
			from: "delayed",
			to: "readyForShipment",
			count: (ctx) =>
				recoversToDispatch(ctx) ? delayedPackages(ctx).length : 0,
		},
		{
			kind: "customer",
			publishes: "fulfillment.exception.resolved",
			count: (ctx) => affectedCartItems(ctx),
			note: "{n} ítem(s) de demanda dejan de estar en excepción",
		},
	],
	demand: {
		moves: false,
		note: "No mueve cantidad: el envío vuelve a donde estaba con los paquetes que ya llevaba.",
	},
	undo: {
		kind: "command",
		entity: "shipment",
		command: "markDelayed",
		note: "Se vuelve a marcar demorado, desde En transito, si la demora sigue.",
	},
	next: [
		{
			entity: "shipment",
			command: "deliver",
			label: "Entregar cuando llegue",
			when: (ctx) => isEndUser(ctx) && recoversToTransit(ctx),
		},
		{
			entity: "shipment",
			command: "receive",
			label: "Recibir cuando llegue",
			when: (ctx) => !isEndUser(ctx) && recoversToTransit(ctx),
		},
		{
			entity: "shipment",
			command: "dispatch",
			label: "Despachar cuando salga",
			when: recoversToDispatch,
		},
	],
	detail: packageDetail,
};

export const shipmentDisclosures: EntityDisclosures<
	"shipment",
	ShipmentDisclosureContext
> = {
	createEndUser,
	addPackages,
	dispatch,
	receive,
	deliver,
	markDelayed,
	markFailed,
	retry,
	recover,
};
