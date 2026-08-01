import type {
	CommandDisclosure,
	EntityDisclosures,
} from "~/features/admin/crud/_lib/fulfillment-effects.types";
import { toScaled } from "~/features/admin/crud/supplier-order/supplier-order-quantity";
import type { PackageDetail } from "~/shared/common/admin-crud/package.types";

/**
 * The effect disclosures of the package group. Three of these are decided by the
 * operator's own numbers — `fractionate`, `split` and `writeOff` — so their counts
 * come from the dialog's draft rather than from the record; the rest read the
 * detail the dialog already loaded.
 *
 * `recover` never guesses its target: it declares both rungs and lets the
 * server-derived `recoveryTarget` pick, so the panel and the command state the
 * same rule.
 */
export type PackageFractionateDraft = {
	customerCount: number;
	lineCount: number;
	quantity: string;
	cartItemCount: number;
};

export type PackageSplitDraft = {
	targetCount: number;
	lineCount: number;
	quantity: string;
	emptiedLineCount: number;
	emptiesSource: boolean;
};

export type PackageWriteOffDraft = {
	lineCount: number;
	quantity: string;
	cartItemCount: number;
	emptiesPackage: boolean;
};

export type PackageDisclosureContext = {
	pkg?: PackageDetail;
	fractionate?: PackageFractionateDraft;
	split?: PackageSplitDraft;
	writeOff?: PackageWriteOffDraft;
};

function liveLines(ctx: PackageDisclosureContext) {
	return (ctx.pkg?.packageLines ?? []).filter(
		(line) => line.status !== "cancelled",
	);
}

function liveAllocations(ctx: PackageDisclosureContext) {
	return liveLines(ctx).flatMap((line) =>
		line.packageAllocations.filter(
			(allocation) => (toScaled(allocation.quantity) ?? 0n) > 0n,
		),
	);
}

function affectedCartItems(ctx: PackageDisclosureContext) {
	return new Set(
		liveAllocations(ctx).map(
			(allocation) => allocation.demandAllocation.cartItem.id,
		),
	).size;
}

const wasDisrupted = (ctx: PackageDisclosureContext) =>
	ctx.pkg?.status === "delayed";

function customerDetail(ctx: PackageDisclosureContext) {
	const rows = new Map<string, string>();
	for (const allocation of liveAllocations(ctx)) {
		const cartItem = allocation.demandAllocation.cartItem;
		rows.set(
			`${cartItem.cart.user.name} · ${cartItem.code}`,
			allocation.quantity,
		);
	}
	return Array.from(rows.entries()).map(([label, value]) => ({ label, value }));
}

function contentDetail(ctx: PackageDisclosureContext) {
	return liveLines(ctx).map((line) => ({
		label: `${line.lotItem.code} · ${line.lotItem.product.name}`,
		value: `${line.quantity} ${line.lotItem.product.unit}`,
	}));
}

export const packageWriteOffAppliedCodes = [
	"writtenOffQuantity",
	"rollOversCreated",
	"cartItemsAffected",
] as const;

export const packageFractionateAppliedCodes = [
	"packagesCreated",
	"customersServed",
	"fractionatedQuantity",
] as const;

export const packageSplitAppliedCodes = [
	"packagesCreated",
	"movedQuantity",
] as const;

const fractionate: CommandDisclosure<PackageDisclosureContext> = {
	effects: [
		{
			kind: "creates",
			record: "package",
			count: (ctx) => ctx.fractionate?.customerCount ?? 0,
			note: "uno por cliente, en la pata de salida",
		},
		{
			kind: "creates",
			record: "packageLine",
			count: (ctx) => ctx.fractionate?.lineCount ?? 0,
		},
		{
			kind: "quantity",
			label: "Cantidad fraccionada",
			quantity: (ctx) => ctx.fractionate?.quantity ?? null,
		},
		{
			kind: "note",
			count: () => 1,
			text: "El paquete de entrada no se toca: queda como la evidencia de que la mercadería llegó",
		},
		{
			kind: "note",
			count: () => 1,
			text: "Las líneas de lote que queden completamente empaquetadas pasan a completadas, y sus lotes con ellas",
		},
		{
			kind: "customer",
			publishes: "package.cartItem.packaged",
			count: (ctx) => ctx.fractionate?.cartItemCount ?? 0,
			note: "{n} ítem(s) de demanda pasan a «empaquetado»",
		},
	],
	demand: {
		moves: false,
		note: "No mueve cantidad entre asignado y rollover: empaqueta demanda que ya estaba asignada.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: los paquetes creados se dividen o se dan de baja por separado.",
	},
	next: [
		{
			entity: "shipment",
			command: "createEndUser",
			label: "Armar el envío al cliente con los paquetes creados",
		},
	],
	appliedCodes: packageFractionateAppliedCodes,
};

const promote: CommandDisclosure<PackageDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "package",
			from: "received",
			to: "readyForShipment",
			count: () => 1,
		},
		{
			kind: "note",
			count: () => 1,
			text: "El paquete pasa a la pata de salida conservando su identidad; su «recibido» registraba la llegada de entrada",
		},
	],
	demand: {
		moves: false,
		// The packaged fact was already published under this package id, so re-emitting
		// it would dedupe into silence — the reason `COMMAND_EVENT_TYPES` lists none.
		note: "No mueve demanda ni avisa al cliente: el ítem ya figura como empaquetado en este paquete.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: se corrige dividiendo o dando de baja el paquete.",
	},
	next: [
		{
			entity: "shipment",
			command: "createEndUser",
			label: "Armar el envío al cliente con este paquete",
		},
	],
	detail: contentDetail,
};

const split: CommandDisclosure<PackageDisclosureContext> = {
	effects: [
		{
			kind: "creates",
			record: "package",
			count: (ctx) => ctx.split?.targetCount ?? 0,
			note: "en el mismo envío y estado que el origen",
		},
		{
			kind: "creates",
			record: "packageLine",
			count: (ctx) => ctx.split?.lineCount ?? 0,
		},
		{
			kind: "quantity",
			label: "Cantidad movida",
			quantity: (ctx) => ctx.split?.quantity ?? null,
		},
		{
			kind: "transition",
			record: "packageLine",
			to: "cancelled",
			count: (ctx) => ctx.split?.emptiedLineCount ?? 0,
		},
		{
			kind: "transition",
			record: "package",
			to: "cancelled",
			count: (ctx) => (ctx.split?.emptiesSource ? 1 : 0),
		},
	],
	demand: {
		moves: false,
		note: "No se pierde cantidad: lo que sale del origen se crea en el destino, sobre el mismo envío.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: los bultos resultantes se vuelven a dividir o se dan de baja.",
	},
	next: [
		{
			entity: "package",
			command: "markFailed",
			label: "Marcar fallido el bulto que no llegó, para darlo de baja",
		},
	],
	appliedCodes: packageSplitAppliedCodes,
	detail: contentDetail,
};

const writeOff: CommandDisclosure<PackageDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "packageLine",
			to: "cancelled",
			count: (ctx) => ctx.writeOff?.lineCount ?? 0,
		},
		{
			kind: "transition",
			record: "package",
			to: "cancelled",
			count: (ctx) => (ctx.writeOff?.emptiesPackage ? 1 : 0),
		},
		{
			kind: "quantity",
			label: "Cantidad dada de baja",
			quantity: (ctx) => ctx.writeOff?.quantity ?? null,
		},
		{
			// Not a count: which demand absorbs the loss is decided LIFO by payment
			// date, and the package detail does not carry payment dates.
			kind: "note",
			count: (ctx) => ((ctx.writeOff?.cartItemCount ?? 0) > 0 ? 1 : 0),
			text: "La cantidad vuelve a rollover, absorbida por fecha de pago (más reciente primero)",
		},
		{
			kind: "customer",
			publishes: "rollover.postAllocation.created",
			count: (ctx) => ctx.writeOff?.cartItemCount ?? 0,
			note: "hasta {n} cliente(s) ven un aviso de reprogramación por la cantidad dada de baja",
		},
		{
			kind: "customer",
			publishes: "fulfillment.exception.resolved",
			count: (ctx) => ctx.writeOff?.cartItemCount ?? 0,
			note: "hasta {n} ítem(s) de demanda dejan de estar en excepción por este paquete",
		},
	],
	demand: {
		moves: true,
		note: "La cantidad sale del paquete y vuelve a rollover para la demanda que la absorbe.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: la baja es terminal y la demanda vuelve por rollover.",
	},
	next: [
		{
			entity: "operation",
			command: "createDraft",
			label: "Agrupar la demanda liberada en una operación nueva",
		},
	],
	appliedCodes: packageWriteOffAppliedCodes,
	detail: customerDetail,
};

const confirmDelivery: CommandDisclosure<PackageDisclosureContext> = {
	effects: [
		{
			// No `from`: the handover is reachable from `readyForShipment` (depot
			// pickup), from `inTransit` (pickup point) and from `delayed`.
			kind: "transition",
			record: "package",
			to: "received",
			count: () => 1,
		},
		{
			kind: "transition",
			record: "packageLine",
			to: "received",
			count: (ctx) => liveLines(ctx).length,
		},
		{
			kind: "note",
			count: (ctx) => (ctx.pkg?.shipment ? 1 : 0),
			text: "El envío no cambia: un cliente retirando no dice nada del resto de la ruta",
		},
		{
			kind: "customer",
			publishes: "shipment.endUser.delivered",
			count: (ctx) => affectedCartItems(ctx),
			note: "{n} ítem(s) de demanda pasan a «entregado»",
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
		note: "No mueve cantidad: una diferencia en la entrega se compone dividiendo, marcando fallido y dando de baja.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: recibido es la evidencia de la entrega.",
	},
	next: [],
	detail: contentDetail,
};

const recover: CommandDisclosure<PackageDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "package",
			from: "delayed",
			to: "readyForShipment",
			count: (ctx) => (ctx.pkg?.recoveryTarget === "readyForShipment" ? 1 : 0),
		},
		{
			kind: "transition",
			record: "package",
			from: "delayed",
			to: "inTransit",
			count: (ctx) => (ctx.pkg?.recoveryTarget === "inTransit" ? 1 : 0),
		},
		{
			kind: "transition",
			record: "packageLine",
			to: "packed",
			count: (ctx) =>
				ctx.pkg?.recoveryTarget === "readyForShipment"
					? liveLines(ctx).length
					: 0,
		},
		{
			kind: "transition",
			record: "packageLine",
			to: "shipped",
			count: (ctx) =>
				ctx.pkg?.recoveryTarget === "inTransit" ? liveLines(ctx).length : 0,
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
		note: "No mueve cantidad: el paquete vuelve a donde estaba con lo que ya llevaba.",
	},
	undo: {
		kind: "command",
		entity: "package",
		command: "markDelayed",
		note: "Se vuelve a marcar demorado si la incidencia sigue abierta.",
	},
	next: [],
	detail: contentDetail,
};

const markDelayed: CommandDisclosure<PackageDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "package",
			to: "delayed",
			count: () => 1,
		},
		{
			kind: "note",
			count: () => 1,
			text: "El resto del envío no se toca, y las líneas del paquete no cambian de estado: la excepción se lee del paquete",
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
		note: "No mueve cantidad: la demanda queda en excepción hasta que el paquete aparezca o se dé de baja.",
	},
	undo: {
		kind: "command",
		entity: "package",
		command: "recover",
		note: "Se recupera con Recuperar, que lo devuelve al estado que el envío indique.",
	},
	next: [
		{
			entity: "package",
			command: "recover",
			label: "Recuperar el paquete cuando aparezca, o escalar a fallido",
		},
	],
	detail: customerDetail,
};

const markFailed: CommandDisclosure<PackageDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "package",
			to: "failed",
			count: () => 1,
		},
		{
			kind: "note",
			count: () => 1,
			text: "El resto del envío no se toca: un bulto perdido no hace fallar todo el envío",
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
		note: "No mueve cantidad todavía: la demanda queda en excepción hasta que se dé de baja.",
	},
	undo: {
		kind: "command",
		entity: "package",
		command: "writeOff",
		note: "El cierre es dar de baja, que devuelve la cantidad a rollover.",
	},
	next: [
		{
			entity: "package",
			command: "writeOff",
			label: "Dar de baja el paquete para devolver la cantidad a rollover",
		},
	],
	detail: customerDetail,
};

export const packageDisclosures: EntityDisclosures<
	"package",
	PackageDisclosureContext
> = {
	fractionate,
	promote,
	split,
	writeOff,
	confirmDelivery,
	recover,
	markDelayed,
	markFailed,
};
