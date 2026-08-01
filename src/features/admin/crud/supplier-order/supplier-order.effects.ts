import type {
	CommandDisclosure,
	EntityDisclosures,
} from "~/features/admin/crud/_lib/fulfillment-effects.types";
import type { SupplierOrderDetail } from "~/shared/common/admin-crud/supplier-order.types";
import { fromScaled, sumScaled, toScaled } from "./supplier-order-quantity";

type SupplierOrderLotItem =
	SupplierOrderDetail["lots"][number]["lotItems"][number];

/**
 * The effect disclosures of the supplier loop. Every count comes from the detail
 * the dialog already loaded, or — for the two commands the operator's own
 * quantities decide — from the form state the dialog passes in, so the panel moves
 * as the numbers are typed.
 */
export type SupplierOrderConfirmDraft = {
	linesConfirmed: number;
	linesCancelled: number;
	cutQuantity: string;
	cutCartItemCount: number;
	confirmedCartItemCount: number;
};

export type SupplierOrderDispatchDraft = {
	lineCount: number;
	quantity: string;
	cartItemCount: number;
};

export type SupplierOrderDisclosureContext = {
	supplierOrder?: SupplierOrderDetail;
	/** Set only for `cancelLine`, which shares its dialog with `cancel`. */
	lotItem?: SupplierOrderLotItem;
	confirm?: SupplierOrderConfirmDraft;
	dispatch?: SupplierOrderDispatchDraft;
};

function liveLots(ctx: SupplierOrderDisclosureContext) {
	return (ctx.supplierOrder?.lots ?? []).filter(
		(lot) => lot.status !== "cancelled",
	);
}

function liveLotItems(ctx: SupplierOrderDisclosureContext) {
	return liveLots(ctx).flatMap((lot) =>
		lot.lotItems.filter((lotItem) => lotItem.status !== "cancelled"),
	);
}

/** The lines a cancellation reaches: one line for `cancelLine`, all of them for `cancel`. */
function cancelledLines(ctx: SupplierOrderDisclosureContext) {
	return ctx.lotItem ? [ctx.lotItem] : liveLotItems(ctx);
}

function liveAllocations(lines: SupplierOrderLotItem[]) {
	return lines.flatMap((lotItem) =>
		lotItem.demandAllocations.filter(
			(allocation) => (toScaled(allocation.quantity) ?? 0n) > 0n,
		),
	);
}

function distinctCartItems(lines: SupplierOrderLotItem[]) {
	return new Set(
		liveAllocations(lines).map((allocation) => allocation.cartItem.id),
	).size;
}

function allocationQuantity(lines: SupplierOrderLotItem[]) {
	return fromScaled(
		sumScaled(
			liveAllocations(lines).map(
				(allocation) => toScaled(allocation.quantity) ?? 0n,
			),
		),
	);
}

function cancellationDetail(ctx: SupplierOrderDisclosureContext) {
	return liveAllocations(cancelledLines(ctx)).map((allocation) => ({
		label: `${allocation.cartItem.cart.user.name} · ${allocation.cartItem.code}`,
		value: allocation.quantity,
	}));
}

export const supplierOrderConfirmAppliedCodes = [
	"linesConfirmed",
	"linesCancelled",
	"rollOverQuantity",
	"cartItemsCut",
] as const;

export const supplierOrderDispatchAppliedCodes = [
	"shipmentsCreated",
	"packagesCreated",
	"linesPackaged",
	"dispatchedQuantity",
] as const;

const request: CommandDisclosure<SupplierOrderDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "supplierOrder",
			from: "pending",
			to: "requested",
			count: () => 1,
		},
		{
			kind: "transition",
			record: "lot",
			from: "assembling",
			to: "requested",
			count: (ctx) => liveLots(ctx).length,
		},
		{
			kind: "transition",
			record: "lotItem",
			from: "pending",
			to: "requested",
			count: (ctx) => liveLotItems(ctx).length,
		},
		{
			kind: "customer",
			publishes: "supplier.cartItem.requested",
			count: (ctx) => distinctCartItems(liveLotItems(ctx)),
			note: "{n} ítem(s) de demanda pasan a «solicitado al proveedor» (etapa 4 del seguimiento)",
		},
	],
	demand: {
		moves: false,
		note: "No mueve cantidad: la demanda ya está asignada y esto sólo declara que la orden salió al proveedor.",
	},
	undo: {
		kind: "command",
		entity: "supplierOrder",
		command: "cancel",
		note: "Se revierte cancelando la orden, que devuelve toda la demanda activa a rollover.",
	},
	next: [
		{
			entity: "supplierOrder",
			command: "confirm",
			label: "Registrar lo que el proveedor confirme",
		},
	],
	detail: (ctx) =>
		liveLotItems(ctx).map((lotItem) => ({
			label: `${lotItem.code} · ${lotItem.product.name}`,
			value: `${lotItem.quantity} ${lotItem.product.unit}`,
		})),
};

const confirm: CommandDisclosure<SupplierOrderDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "supplierOrder",
			from: "requested",
			to: "confirmed",
			count: (ctx) => ((ctx.confirm?.linesConfirmed ?? 0) > 0 ? 1 : 0),
		},
		{
			// Every line refused means the order itself is cancelled, not confirmed.
			kind: "transition",
			record: "supplierOrder",
			from: "requested",
			to: "cancelled",
			count: (ctx) => (ctx.confirm && ctx.confirm.linesConfirmed === 0 ? 1 : 0),
		},
		{
			kind: "transition",
			record: "lotItem",
			from: "requested",
			to: "confirmed",
			count: (ctx) => ctx.confirm?.linesConfirmed ?? 0,
		},
		{
			kind: "transition",
			record: "lotItem",
			from: "requested",
			to: "cancelled",
			count: (ctx) => ctx.confirm?.linesCancelled ?? 0,
		},
		{
			kind: "creates",
			record: "rollOver",
			count: (ctx) => ctx.confirm?.cutCartItemCount ?? 0,
			note: "posteriores a la asignación, por el recorte",
		},
		{
			kind: "quantity",
			label: "Cantidad recortada",
			quantity: (ctx) => ctx.confirm?.cutQuantity ?? null,
		},
		{
			kind: "customer",
			publishes: "supplier.lotItem.confirmed",
			count: (ctx) => ctx.confirm?.confirmedCartItemCount ?? 0,
			note: "{n} ítem(s) de demanda pasan a «confirmado por el proveedor»",
		},
		{
			kind: "customer",
			publishes: "rollover.postAllocation.created",
			count: (ctx) => ctx.confirm?.cutCartItemCount ?? 0,
			note: "{n} cliente(s) ven un aviso de reprogramación por lo que el proveedor recortó",
		},
	],
	demand: {
		moves: true,
		note: "Lo que el proveedor no confirma sale de la asignación y vuelve a rollover, absorbido LIFO por fecha de pago salvo reparto manual.",
	},
	undo: {
		kind: "command",
		entity: "supplierOrder",
		command: "cancel",
		note: "Cancelar la orden devuelve a rollover lo que quede confirmado; el recorte ya aplicado no se revierte.",
	},
	next: [
		{
			entity: "supplierOrder",
			command: "registerDispatch",
			label: "Registrar el despacho del proveedor",
		},
	],
	appliedCodes: supplierOrderConfirmAppliedCodes,
};

const registerDispatch: CommandDisclosure<SupplierOrderDisclosureContext> = {
	effects: [
		{
			kind: "creates",
			record: "shipment",
			count: () => 1,
			note: "traslado interno, en listo para despacho",
		},
		{
			kind: "creates",
			record: "package",
			count: () => 1,
			note: "paquete de entrada consolidado",
		},
		{
			kind: "creates",
			record: "packageLine",
			count: (ctx) => ctx.dispatch?.lineCount ?? 0,
		},
		{
			// A second dispatch for the remainder leaves the order where it is:
			// `readyForReceipt → readyForReceipt` is deliberately not a ladder move.
			kind: "transition",
			record: "supplierOrder",
			from: "confirmed",
			to: "readyForReceipt",
			count: (ctx) => (ctx.supplierOrder?.status === "confirmed" ? 1 : 0),
		},
		{
			kind: "quantity",
			label: "Cantidad despachada",
			quantity: (ctx) => ctx.dispatch?.quantity ?? null,
		},
		{
			// An upper bound, and it says so: the server assigns coverage to the demand
			// each line has left uncovered, which the order detail does not carry per
			// allocation. A partial dispatch can therefore reach fewer than these.
			kind: "customer",
			publishes: "package.cartItem.packaged",
			count: (ctx) => ctx.dispatch?.cartItemCount ?? 0,
			note: "hasta {n} ítem(s) de demanda pasan a «empaquetado»",
		},
	],
	demand: {
		moves: false,
		note: "No mueve cantidad entre asignado y rollover: empaqueta demanda que ya estaba asignada.",
	},
	undo: {
		kind: "none",
		note: "No se deshace desde acá: el envío se marca como fallido y los paquetes se dan de baja.",
	},
	next: [
		{
			entity: "shipment",
			command: "dispatch",
			label: "Confirmar la salida del envío interno",
		},
	],
	appliedCodes: supplierOrderDispatchAppliedCodes,
};

/**
 * `cancel` and `cancelLine` share one dialog and differ only in reach, so their
 * entries differ only in what `cancelledLines` returns. Both are separate entries
 * because the transitions they declare are not the same.
 */
const cancel: CommandDisclosure<SupplierOrderDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "supplierOrder",
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
			kind: "creates",
			record: "rollOver",
			count: (ctx) => liveAllocations(liveLotItems(ctx)).length,
			note: "uno por asignación de demanda",
		},
		{
			kind: "quantity",
			label: "Cantidad que vuelve a rollover",
			quantity: (ctx) => allocationQuantity(liveLotItems(ctx)),
		},
		{
			kind: "customer",
			publishes: "rollover.postAllocation.created",
			count: (ctx) => distinctCartItems(liveLotItems(ctx)),
			note: "{n} cliente(s) ven un aviso de reprogramación",
		},
	],
	demand: {
		moves: true,
		note: "Toda la demanda activa vuelve a rollover y se reagrupa en la próxima operación.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: la demanda vuelve por rollover, no restaurando la orden.",
	},
	next: [
		{
			entity: "operation",
			command: "createDraft",
			label: "Agrupar la demanda liberada en una operación nueva",
		},
	],
	detail: cancellationDetail,
};

const cancelLine: CommandDisclosure<SupplierOrderDisclosureContext> = {
	effects: [
		{
			kind: "transition",
			record: "lotItem",
			to: "cancelled",
			count: (ctx) => cancelledLines(ctx).length,
		},
		{
			// The lot and the order follow only when nothing live is left behind.
			kind: "transition",
			record: "lot",
			to: "cancelled",
			count: (ctx) => {
				const lot = liveLots(ctx).find((entry) =>
					entry.lotItems.some((lotItem) => lotItem.id === ctx.lotItem?.id),
				);
				if (!lot) return 0;
				const survivors = lot.lotItems.filter(
					(lotItem) =>
						lotItem.status !== "cancelled" && lotItem.id !== ctx.lotItem?.id,
				);
				return survivors.length === 0 ? 1 : 0;
			},
		},
		{
			kind: "transition",
			record: "supplierOrder",
			to: "cancelled",
			count: (ctx) =>
				liveLotItems(ctx).filter((lotItem) => lotItem.id !== ctx.lotItem?.id)
					.length === 0
					? 1
					: 0,
		},
		{
			kind: "creates",
			record: "rollOver",
			count: (ctx) => liveAllocations(cancelledLines(ctx)).length,
			note: "uno por asignación de demanda",
		},
		{
			kind: "quantity",
			label: "Cantidad que vuelve a rollover",
			quantity: (ctx) => allocationQuantity(cancelledLines(ctx)),
		},
		{
			kind: "customer",
			publishes: "rollover.postAllocation.created",
			count: (ctx) => distinctCartItems(cancelledLines(ctx)),
			note: "{n} cliente(s) ven un aviso de reprogramación",
		},
	],
	demand: {
		moves: true,
		note: "La demanda de la línea vuelve a rollover y se reagrupa en la próxima operación.",
	},
	undo: {
		kind: "none",
		note: "No se deshace: la demanda vuelve por rollover, no restaurando la línea.",
	},
	next: [
		{
			entity: "operation",
			command: "createDraft",
			label: "Agrupar la demanda liberada en una operación nueva",
		},
	],
	detail: cancellationDetail,
};

export const supplierOrderDisclosures: EntityDisclosures<
	"supplierOrder",
	SupplierOrderDisclosureContext
> = {
	request,
	confirm,
	registerDispatch,
	cancel,
	cancelLine,
};
