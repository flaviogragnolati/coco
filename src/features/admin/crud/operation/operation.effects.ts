import type {
	CommandDisclosure,
	EntityDisclosures,
} from "~/features/admin/crud/_lib/fulfillment-effects.types";
import { toScaled } from "~/features/admin/crud/supplier-order/supplier-order-quantity";
import type { OperationDetail } from "~/shared/common/admin-crud/operation.types";

/**
 * The effect disclosures of the operation group. One entry per command, declared
 * as data so `fulfillment-effects.test.ts` can check every transition against the
 * ladders and every customer claim against the events the command publishes
 * (CONTEXT.md, "Effect disclosure").
 *
 * Roll over `resolve` lives here rather than in a module of its own: its dialog
 * does too, and the command has no entity page to belong to.
 */
export type OperationExecutePreview = {
	lotCount: number;
	lotItemCount: number;
	eligibleItemCount: number;
	assignedItemCount: number;
	assignedQuantity: string;
	rollOverItemCount: number;
	rollOverQuantity: string;
};

export type OperationDisclosureContext = {
	operation?: OperationDetail;
	/**
	 * The review dialog's own preview, recomputed client-side as omissions toggle.
	 * A draft has no lots yet, so `execute` can only count from the plan the review
	 * is showing — the same rows the command will run on (ADR 0006).
	 */
	preview?: OperationExecutePreview;
};

function liveLots(ctx: OperationDisclosureContext) {
	return (ctx.operation?.lots ?? []).filter(
		(lot) => lot.status !== "cancelled",
	);
}

/** Lot items a compensation would cancel: live line inside a live lot. */
function liveLotItems(ctx: OperationDisclosureContext) {
	return liveLots(ctx).flatMap((lot) =>
		lot.lotItems.filter((lotItem) => lotItem.status !== "cancelled"),
	);
}

function liveSupplierOrders(ctx: OperationDisclosureContext) {
	return Array.from(
		new Map(
			liveLots(ctx)
				.flatMap((lot) => (lot.supplierOrder ? [lot.supplierOrder] : []))
				.filter((order) => order.status !== "cancelled")
				.map((order) => [order.id, order]),
		).values(),
	);
}

function openRollOvers(ctx: OperationDisclosureContext) {
	return (ctx.operation?.rollOvers ?? []).filter(
		(rollOver) => rollOver.status === "open",
	);
}

/**
 * The cart items a compensation touches, mirroring `planOperationCompensation`:
 * every allocation of a live line that still carries quantity, plus every open
 * roll over this operation created.
 */
function compensatedCartItems(ctx: OperationDisclosureContext) {
	const ids = new Set<number>();

	for (const lotItem of liveLotItems(ctx)) {
		for (const allocation of lotItem.cartItemLotItems) {
			// A fully absorbed allocation survives at quantity 0 and returns nothing,
			// so it must not be counted as an excluded item.
			if ((toScaled(allocation.quantity) ?? 0n) <= 0n) continue;
			ids.add(allocation.cartItem.id);
		}
	}
	for (const rollOver of openRollOvers(ctx)) {
		ids.add(rollOver.cartItem.id);
	}

	return ids;
}

function compensationDetail(ctx: OperationDisclosureContext) {
	const rows = new Map<string, string>();

	for (const lotItem of liveLotItems(ctx)) {
		for (const allocation of lotItem.cartItemLotItems) {
			rows.set(
				`${allocation.cartItem.cart.user.name} · ${allocation.cartItem.code}`,
				allocation.quantity,
			);
		}
	}
	for (const rollOver of openRollOvers(ctx)) {
		rows.set(
			`${rollOver.cartItem.cart.user.name} · ${rollOver.cartItem.code} (rollover)`,
			rollOver.quantity,
		);
	}

	return Array.from(rows.entries()).map(([label, value]) => ({ label, value }));
}

const isCompleted = (ctx: OperationDisclosureContext) =>
	ctx.operation?.status === "completed";

export const operationCancelAppliedCodes = [
	"lotsCancelled",
	"linesCancelled",
	"ordersCancelled",
	"ownRollOversCancelled",
	"consumedRollOversReopened",
	"cartItemsExcluded",
] as const;

const createDraft: CommandDisclosure<OperationDisclosureContext> = {
	effects: [
		{
			kind: "creates",
			record: "operation",
			count: () => 1,
			note: "borrador; no materializa lotes ni órdenes",
		},
	],
	demand: {
		moves: false,
		note: "No reserva demanda: la revisión recalcula sobre datos vivos y la ejecución es la que asigna.",
	},
	undo: {
		kind: "command",
		entity: "operation",
		command: "delete",
		note: "Se descarta con Eliminar; el borrador no deja rastro.",
	},
	next: [
		{
			entity: "operation",
			command: "execute",
			label: "Revisar la demanda y ejecutar",
		},
	],
};

const execute: CommandDisclosure<OperationDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "operation",
			from: "draft",
			to: "completed",
			count: () => 1,
		},
		{
			kind: "creates",
			record: "lot",
			count: (ctx) => ctx.preview?.lotCount ?? 0,
			note: "uno por proveedor",
		},
		{
			kind: "creates",
			record: "supplierOrder",
			count: (ctx) => ctx.preview?.lotCount ?? 0,
			note: "en pendiente, listas para solicitar",
		},
		{
			kind: "creates",
			record: "lotItem",
			count: (ctx) => ctx.preview?.lotItemCount ?? 0,
		},
		{
			kind: "creates",
			record: "rollOver",
			count: (ctx) => ctx.preview?.rollOverItemCount ?? 0,
			note: "previos a la asignación",
		},
		{
			kind: "quantity",
			label: "Cantidad asignada",
			quantity: (ctx) => ctx.preview?.assignedQuantity ?? null,
		},
		{
			kind: "quantity",
			label: "Cantidad a rollover",
			quantity: (ctx) => ctx.preview?.rollOverQuantity ?? null,
		},
		{
			kind: "customer",
			publishes: "operation.cartItem.allocatedToLotItem",
			count: (ctx) => ctx.preview?.assignedItemCount ?? 0,
			note: "{n} ítem(s) de demanda pasan a «asignado a proveedor» en el seguimiento del cliente",
		},
		{
			kind: "customer",
			publishes: "rollover.preAllocation.created",
			count: (ctx) => ctx.preview?.rollOverItemCount ?? 0,
			note: "{n} cliente(s) ven un aviso de reprogramación por la cantidad que no entró",
		},
	],
	demand: {
		moves: true,
		note: "Reserva la demanda elegible: deja de estar disponible para la próxima operación.",
	},
	undo: {
		kind: "command",
		entity: "operation",
		command: "cancel",
		note: "Se compensa con Cancelar mientras todas las órdenes de proveedor sigan pendientes.",
	},
	next: [
		{
			entity: "supplierOrder",
			command: "request",
			label: "Solicitar las órdenes de proveedor creadas",
		},
	],
};

const cancel: CommandDisclosure<OperationDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "operation",
			from: "completed",
			to: "cancelled",
			count: () => 1,
		},
		{
			kind: "transition",
			record: "lot",
			to: "cancelled",
			count: (ctx) => liveLots(ctx).length,
		},
		{
			kind: "transition",
			record: "lotItem",
			to: "cancelled",
			count: (ctx) => liveLotItems(ctx).length,
		},
		{
			kind: "transition",
			record: "supplierOrder",
			from: "pending",
			to: "cancelled",
			count: (ctx) => liveSupplierOrders(ctx).length,
		},
		{
			kind: "transition",
			record: "rollOver",
			from: "open",
			to: "cancelled",
			count: (ctx) => openRollOvers(ctx).length,
		},
		{
			kind: "customer",
			publishes: "operation.cartItem.excluded",
			count: (ctx) => compensatedCartItems(ctx).size,
			note: "{n} ítem(s) de demanda reciben un aviso de exclusión y vuelven a la cola",
		},
	],
	demand: {
		moves: true,
		note: "Nada se elimina: la demanda vuelve a la cola y los rollovers que esta operación consumió se reabren para reagruparse.",
	},
	undo: {
		kind: "command",
		entity: "operation",
		command: "rerun",
		note: "Se rehace con Reejecutar, que crea y ejecuta una operación nueva sobre la demanda liberada.",
	},
	next: [
		{
			entity: "operation",
			command: "rerun",
			label: "Reejecutar para volver a agrupar la demanda liberada",
		},
	],
	detail: compensationDetail,
	appliedCodes: operationCancelAppliedCodes,
};

const rerun: CommandDisclosure<OperationDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "operation",
			from: "completed",
			to: "cancelled",
			count: (ctx) => (isCompleted(ctx) ? 1 : 0),
		},
		{
			kind: "transition",
			record: "lot",
			to: "cancelled",
			count: (ctx) => (isCompleted(ctx) ? liveLots(ctx).length : 0),
		},
		{
			kind: "transition",
			record: "supplierOrder",
			from: "pending",
			to: "cancelled",
			count: (ctx) => (isCompleted(ctx) ? liveSupplierOrders(ctx).length : 0),
		},
		{
			kind: "creates",
			record: "operation",
			// A `failed` source is re-executed in place; the other two paths mint a row.
			count: (ctx) => (ctx.operation?.status === "failed" ? 0 : 1),
			note: "se ejecuta con los parámetros de abajo",
		},
		{
			kind: "transition",
			record: "operation",
			from: "failed",
			to: "completed",
			count: (ctx) => (ctx.operation?.status === "failed" ? 1 : 0),
		},
		{
			kind: "customer",
			publishes: "operation.cartItem.excluded",
			count: (ctx) => (isCompleted(ctx) ? compensatedCartItems(ctx).size : 0),
			note: "{n} ítem(s) de demanda reciben el aviso de exclusión antes de volver a agruparse",
		},
	],
	demand: {
		moves: true,
		note: "Todo ocurre en una sola transacción: si la ejecución falla, la compensación se deshace con ella.",
	},
	undo: {
		kind: "command",
		entity: "operation",
		command: "cancel",
		note: "La operación resultante se compensa con Cancelar mientras la ventana administrativa siga abierta.",
	},
	next: [
		{
			entity: "supplierOrder",
			command: "request",
			label: "Solicitar las órdenes de proveedor que se creen",
		},
	],
};

const remove: CommandDisclosure<OperationDisclosureContext> = {
	effects: [
		{
			kind: "deletes",
			record: "operation",
			count: () => 1,
			note: "no queda fila ni historial",
		},
	],
	demand: {
		moves: false,
		note: "La demanda que agrupaba queda intacta y entra en la próxima operación.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: la operación se elimina definitivamente.",
	},
	next: [],
};

export const operationDisclosures: EntityDisclosures<
	"operation",
	OperationDisclosureContext
> = {
	createDraft,
	execute,
	cancel,
	rerun,
	delete: remove,
};

export type RollOverDisclosureContext = {
	rollOver?: { quantity: string; cartItemCode: string };
};

export const rollOverDisclosures: EntityDisclosures<
	"rollOver",
	RollOverDisclosureContext
> = {
	resolve: {
		effects: [
			{
				kind: "transition",
				record: "rollOver",
				from: "open",
				to: "resolved",
				count: () => 1,
			},
			{
				kind: "quantity",
				label: "Cantidad reprogramada",
				quantity: (ctx) => ctx.rollOver?.quantity ?? null,
			},
			{
				kind: "customer",
				publishes: "rollover.resolved",
				count: () => 1,
				note: "El cliente ve el rollover como resuelto en su seguimiento",
			},
		],
		demand: {
			moves: true,
			note: "Saca la cantidad de la cola: deja de reagruparse en operaciones futuras y no mueve dinero (ADR 0005).",
		},
		undo: {
			kind: "none",
			note: "No se deshace: resolver es una decisión terminal.",
		},
		next: [],
	},
};
