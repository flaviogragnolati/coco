/**
 * Single home for the legal per-entity transition ladders, the fulfillment
 * compatibility tables and the fulfillment stage axis. Consumed by the supplier
 * order, operation, shipment and package commands (guards), the operational
 * diagnostics (monitoring) and the `fulfillmentStatus` derivation (projection).
 *
 * Pure data with no runtime dependency, like `tracking-display.ts`: this module
 * is reachable from client bundles, so Prisma enums arrive as types only and
 * decimal quantities arrive as strings.
 */

import type {
	CarrierOrderStatus,
	CartItemFulfillmentStatus,
	DeliveryMode,
	LotItemStatus,
	LotStatus,
	OperationStatus,
	PackageLeg,
	PackageLotItemStatus,
	PackageStatus,
	ShipmentStatus,
	ShipmentType,
	SupplierOrderStatus,
} from "~/prisma/client";
import {
	type AdminTrackingStageKey,
	adminTrackingStageKeys,
} from "./tracking-display";

/**
 * Legal supplier order moves. `registerDispatch` walks `confirmed →
 * readyForReceipt` and `shipment.receive` closes `readyForReceipt → completed`
 * (ADR 0003).
 */
export const supplierOrderTransitions: Record<
	SupplierOrderStatus,
	ReadonlySet<SupplierOrderStatus>
> = {
	pending: new Set(["requested", "cancelled"]),
	requested: new Set(["confirmed", "cancelled"]),
	confirmed: new Set(["readyForReceipt", "cancelled"]),
	readyForReceipt: new Set(["completed", "cancelled"]),
	completed: new Set([]),
	cancelled: new Set([]),
};

/**
 * Legal lot moves. Lots follow their supplier order; they are never driven
 * directly. `readyForPackaging` is reached by `shipment.receive` when it closes
 * an order; `completed` by `package.fractionate`'s roll-up, once everything the
 * lot holds has been packaged out.
 */
export const lotTransitions: Record<LotStatus, ReadonlySet<LotStatus>> = {
	pending: new Set(["assembling", "cancelled"]),
	assembling: new Set(["requested", "cancelled"]),
	requested: new Set(["confirmed", "cancelled"]),
	confirmed: new Set(["readyForPackaging", "cancelled"]),
	readyForPackaging: new Set(["completed", "cancelled"]),
	completed: new Set([]),
	cancelled: new Set([]),
};

/** Legal lot item moves. Lines follow their supplier order (ADR 0003). */
export const lotItemTransitions: Record<
	LotItemStatus,
	ReadonlySet<LotItemStatus>
> = {
	pending: new Set(["requested", "cancelled"]),
	requested: new Set(["confirmed", "cancelled"]),
	confirmed: new Set(["readyForPackaging", "cancelled"]),
	readyForPackaging: new Set(["completed", "cancelled"]),
	completed: new Set([]),
	cancelled: new Set([]),
};

/**
 * Legal package moves. `received → inTransit` looks wrong and is deliberate: it
 * is legal *only* via reassignment to a new shipment (retry) — architecture §11.
 * `failed → readyForShipment` is the same reassignment read from the other side;
 * a retry puts the surviving packages back on a fresh shipment while the failed
 * one stays `failed`.
 *
 * `received → readyForShipment` is the **promotion** rung (Phase 4a): a
 * mono-customer inbound package flips to the outbound leg and starts over. The
 * status has to reset because its `received` recorded the *inbound* arrival —
 * carrying it onto the outbound leg would claim an arrival at the customer that
 * has not happened.
 *
 * `readyForShipment → delayed|failed` is package-level disruption before
 * departure, which a depot-pickup package needs because it never gets a shipment
 * to fail on its behalf. `received` deliberately has no such rung: the goods are
 * in hand, so the disruption story belongs to whatever happens next.
 *
 * `readyForShipment → received` is the **depot-pickup handover** (Phase 4b): the
 * customer collects at the depot, so the package reaches `received` from a
 * standing start without ever being placed on a shipment.
 *
 * `delayed → readyForShipment` is `package.recover` for a package disrupted
 * *before* departure — the inverse of the rung 4a added.
 */
export const packageTransitions: Record<
	PackageStatus,
	ReadonlySet<PackageStatus>
> = {
	pending: new Set(["packing", "readyForShipment", "cancelled"]),
	packing: new Set(["readyForShipment", "cancelled"]),
	readyForShipment: new Set([
		"inTransit",
		"received",
		"delayed",
		"failed",
		"cancelled",
	]),
	inTransit: new Set(["received", "delayed", "failed"]),
	delayed: new Set([
		"inTransit",
		"readyForShipment",
		"received",
		"failed",
		"cancelled",
	]),
	received: new Set(["inTransit", "readyForShipment"]),
	failed: new Set(["readyForShipment", "cancelled"]),
	cancelled: new Set([]),
};

/**
 * Legal shipment moves. `received` is terminal, and `failed` only ever leads to
 * `cancelled`: `shipment.retry` creates a **new** shipment and reassigns the live
 * packages to it, leaving the failed one emptied as history rather than reviving
 * it (architecture §8, "identity preserved").
 */
export const shipmentTransitions: Record<
	ShipmentStatus,
	ReadonlySet<ShipmentStatus>
> = {
	pending: new Set(["preparing", "readyForDispatch", "cancelled"]),
	preparing: new Set(["readyForDispatch", "cancelled"]),
	readyForDispatch: new Set(["inTransit", "delayed", "cancelled"]),
	inTransit: new Set(["received", "delayed", "failed"]),
	delayed: new Set(["inTransit", "received", "failed", "cancelled"]),
	received: new Set([]),
	failed: new Set(["cancelled"]),
	cancelled: new Set([]),
};

/**
 * Legal carrier order moves. Unlike `shipmentTransitions`, `failed` is **terminal**
 * here: a shipment needs `failed → cancelled` because `shipment.retry` empties the
 * source and leaves it as history, and a carrier order has no retry command — a
 * failed booking is re-transcribed as a new one.
 *
 * `inTransit → cancelled` is deliberately absent: once the goods are moving the
 * booking either completes or fails. `pending → failed` is absent for the mirror
 * reason: a booking that was never requested cannot fail, it gets cancelled.
 */
export const carrierOrderTransitions: Record<
	CarrierOrderStatus,
	ReadonlySet<CarrierOrderStatus>
> = {
	pending: new Set(["requested", "cancelled"]),
	requested: new Set(["confirmed", "cancelled", "failed"]),
	confirmed: new Set(["inTransit", "cancelled", "failed"]),
	inTransit: new Set(["completed", "failed"]),
	completed: new Set([]),
	cancelled: new Set([]),
	failed: new Set([]),
};

export function isLegalTransition<TStatus extends string>(
	ladder: Record<TStatus, ReadonlySet<TStatus>>,
	from: TStatus,
	to: TStatus,
): boolean {
	return ladder[from]?.has(to) ?? false;
}

/** Lot statuses paired with the lot-item statuses that can back them. */
export const lotStatusLineCompatibility: Partial<
	Record<LotStatus, ReadonlySet<LotItemStatus>>
> = {
	requested: new Set([
		"requested",
		"confirmed",
		"readyForPackaging",
		"completed",
	]),
	confirmed: new Set(["confirmed", "readyForPackaging", "completed"]),
	readyForPackaging: new Set(["readyForPackaging", "completed"]),
	completed: new Set(["completed"]),
};

/**
 * Supplier order statuses paired with the lot-item statuses that can back them.
 * Like `lotStatusLineCompatibility` it deliberately omits `cancelled`: consumers
 * filter cancelled lines out before checking, so that a partially cancelled
 * order stays clean while an aggregate that genuinely ran ahead of its live
 * lines still reports.
 */
export const supplierOrderStatusLineCompatibility: Partial<
	Record<SupplierOrderStatus, ReadonlySet<LotItemStatus>>
> = {
	requested: new Set([
		"requested",
		"confirmed",
		"readyForPackaging",
		"completed",
	]),
	confirmed: new Set(["confirmed", "readyForPackaging", "completed"]),
	// `registerDispatch` moves only the order (`confirmed → readyForReceipt`); its
	// lines stay `confirmed` until `shipment.receive` closes the order and promotes
	// them to `readyForPackaging` (ADR 0003). Without `confirmed` here every
	// dispatched order would report its aggregate as running ahead of its lines.
	readyForReceipt: new Set(["confirmed", "readyForPackaging", "completed"]),
	// `closeReachableSupplierOrders` closes the **order** while promoting its lines
	// only to `readyForPackaging`; they reach `completed` later, when fractionation
	// packages them out. Without `readyForPackaging` here every order closed by a
	// receipt reported its aggregate as running ahead of its lines — which it did,
	// for every order, until Phase 4a shipped a command that could move them.
	completed: new Set(["readyForPackaging", "completed"]),
};

/** Package statuses paired with the package-line statuses that can back them. */
export const packageStatusLineCompatibility: Partial<
	Record<PackageStatus, ReadonlySet<PackageLotItemStatus>>
> = {
	readyForShipment: new Set(["packed", "shipped", "received"]),
	inTransit: new Set(["shipped", "received"]),
	received: new Set(["received"]),
};

/** Shipment statuses paired with the package statuses that can back them. */
export const shipmentStatusPackageCompatibility: Partial<
	Record<ShipmentStatus, ReadonlySet<PackageStatus>>
> = {
	inTransit: new Set(["inTransit", "received"]),
	received: new Set(["received"]),
};

/**
 * Carrier order statuses paired with the shipment statuses that can back them.
 * Only the two rungs that make a claim about the goods appear: a booking can be
 * `requested` or `confirmed` while its shipments are still being prepared, so
 * those statuses get no entry and are left unchecked — the "absent means
 * unchecked" convention `supplierOrderStatusLineCompatibility` already uses.
 */
export const carrierOrderStatusShipmentCompatibility: Partial<
	Record<CarrierOrderStatus, ReadonlySet<ShipmentStatus>>
> = {
	inTransit: new Set(["inTransit", "received"]),
	completed: new Set(["received"]),
};

/** Shipment statuses paired with the package-line statuses that can back them. */
export const shipmentStatusLineCompatibility: Partial<
	Record<ShipmentStatus, ReadonlySet<PackageLotItemStatus>>
> = {
	inTransit: new Set(["shipped", "received"]),
	received: new Set(["received"]),
};

/** Demand that is still in play — everything except a cancelled request. */
export const activeDemandFulfillmentStatuses: ReadonlySet<CartItemFulfillmentStatus> =
	new Set([
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
		"partiallyRolledOver",
		"rolledOver",
		"exception",
	]);

/**
 * Demand that is still owed to a customer. Narrower than
 * `activeDemandFulfillmentStatuses` by exactly `rolledOver`: fully rolled-over
 * demand is resolved — it moved to a roll over record and will be re-aggregated
 * — so an aggregate cancelled correctly holds only such demand and must not
 * report as broken (ADR 0005).
 */
export const unresolvedDemandFulfillmentStatuses: ReadonlySet<CartItemFulfillmentStatus> =
	new Set(
		Array.from(activeDemandFulfillmentStatuses).filter(
			(status) => status !== "rolledOver",
		),
	);

export type SupplierOrderCommandKey =
	| "request"
	| "confirm"
	| "registerDispatch"
	| "cancel"
	| "cancelLine";

/**
 * A command the server declares reachable (or not, with the operator-facing
 * reason). Computed server-side so the UI never re-derives the ladder rules.
 */
export type AvailableAction<TKey extends string = string> = {
	action: TKey;
	enabled: boolean;
	reason?: string;
};

const cancellableSupplierOrderStatuses: ReadonlySet<SupplierOrderStatus> =
	new Set(["pending", "requested", "confirmed"]);

const dispatchableSupplierOrderStatuses: ReadonlySet<SupplierOrderStatus> =
	new Set(["confirmed", "readyForReceipt"]);

/**
 * `dispatchableQuantity` arrives as a decimal string because this module is
 * reachable from client bundles and must not depend on `Prisma.Decimal`; it is
 * only ever compared against zero here.
 */
export function supplierOrderAvailableActions(input: {
	status: SupplierOrderStatus;
	operationCompleted: boolean;
	liveLineCount: number;
	dispatchableQuantity: string;
}): AvailableAction<SupplierOrderCommandKey>[] {
	const hasLiveLines = input.liveLineCount > 0;
	const cancellable = cancellableSupplierOrderStatuses.has(input.status);

	function requestState(): AvailableAction<SupplierOrderCommandKey> {
		if (input.status !== "pending") {
			return {
				action: "request",
				enabled: false,
				reason: "Solo se puede solicitar una orden pendiente",
			};
		}
		if (!input.operationCompleted) {
			return {
				action: "request",
				enabled: false,
				reason: "La operación de origen no está completada",
			};
		}
		if (!hasLiveLines) {
			return {
				action: "request",
				enabled: false,
				reason: "La orden no tiene líneas activas",
			};
		}
		return { action: "request", enabled: true };
	}

	function confirmState(): AvailableAction<SupplierOrderCommandKey> {
		if (input.status !== "requested") {
			return {
				action: "confirm",
				enabled: false,
				reason: "Solo se puede confirmar una orden solicitada",
			};
		}
		if (!hasLiveLines) {
			return {
				action: "confirm",
				enabled: false,
				reason: "La orden no tiene líneas activas",
			};
		}
		return { action: "confirm", enabled: true };
	}

	function cancelState(): AvailableAction<SupplierOrderCommandKey> {
		if (!cancellable) {
			return {
				action: "cancel",
				enabled: false,
				reason: "La orden ya no se puede cancelar",
			};
		}
		return { action: "cancel", enabled: true };
	}

	function cancelLineState(): AvailableAction<SupplierOrderCommandKey> {
		if (!cancellable) {
			return {
				action: "cancelLine",
				enabled: false,
				reason: "La orden ya no se puede cancelar",
			};
		}
		if (!hasLiveLines) {
			return {
				action: "cancelLine",
				enabled: false,
				reason: "La orden no tiene líneas activas",
			};
		}
		return { action: "cancelLine", enabled: true };
	}

	function registerDispatchState(): AvailableAction<SupplierOrderCommandKey> {
		// `readyForReceipt` stays open: a second dispatch for the remainder is not a
		// ladder move, so the status the first dispatch produced must not block it.
		if (!dispatchableSupplierOrderStatuses.has(input.status)) {
			return {
				action: "registerDispatch",
				enabled: false,
				reason: "Solo se puede despachar una orden confirmada",
			};
		}
		if (Number(input.dispatchableQuantity) <= 0) {
			return {
				action: "registerDispatch",
				enabled: false,
				reason: "No queda cantidad pendiente de despacho",
			};
		}
		return { action: "registerDispatch", enabled: true };
	}

	return [
		requestState(),
		confirmState(),
		registerDispatchState(),
		cancelState(),
		cancelLineState(),
	];
}

const supplierOrderCommandKeys: SupplierOrderCommandKey[] = [
	"request",
	"confirm",
	"registerDispatch",
	"cancel",
	"cancelLine",
];

/**
 * Lots are never commanded directly — they follow their supplier order (ADR
 * 0003). This says so at the surface where an operator would look for a button:
 * every entry names the commanding order, and none of them is a lot command.
 *
 * When the caller can supply the **order-wide** facts (`order`), it delegates to
 * `supplierOrderAvailableActions` rather than re-deriving the ladder, so the lot
 * detail and the supplier-order detail can never disagree about what is
 * reachable. Those facts span *all* the order's lots — a single lot record does
 * not carry them, which is why they arrive as a parameter instead of being
 * guessed. Without them every key comes back disabled, which is what this
 * returned unconditionally before.
 */
export function lotAvailableActions(input: {
	supplierOrderCode: string | null;
	order?: {
		status: SupplierOrderStatus;
		operationCompleted: boolean;
		liveLineCount: number;
		dispatchableQuantity: string;
	};
}): AvailableAction<SupplierOrderCommandKey>[] {
	const managedBy =
		input.supplierOrderCode === null
			? "El lote no tiene orden de proveedor"
			: `Se gestiona desde la orden de proveedor ${input.supplierOrderCode}`;

	if (!input.order || input.supplierOrderCode === null) {
		return supplierOrderCommandKeys.map((action) => ({
			action,
			enabled: false,
			reason: managedBy,
		}));
	}

	// The ladder's own reason still explains *why* something is unavailable; the
	// order code is appended so the operator knows where to go either way.
	return supplierOrderAvailableActions(input.order).map((entry) =>
		entry.enabled
			? { ...entry, reason: managedBy }
			: { ...entry, reason: `${entry.reason}. ${managedBy}` },
	);
}

export type ShipmentCommandKey =
	| "dispatch"
	| "receive"
	| "deliver"
	| "addPackages"
	| "markDelayed"
	| "markFailed"
	| "retry";

export type PackageCommandKey =
	| "writeOff"
	| "fractionate"
	| "promote"
	| "split"
	| "confirmDelivery"
	| "recover"
	| "markDelayed"
	| "markFailed";

/** A shipment that has not left yet: still assemblable, still dispatchable. */
export const dispatchableShipmentStatuses: ReadonlySet<ShipmentStatus> =
	new Set(["pending", "preparing", "readyForDispatch"]);

const disruptedStatuses: ReadonlySet<ShipmentStatus | PackageStatus> = new Set([
	"delayed",
	"failed",
]);

/**
 * `livePackageCount` must arrive with cancelled packages already filtered out,
 * the same contract `operationAvailableActions` established for
 * `liveSupplierOrderStatuses`: filtering here would make the parameter mean
 * something other than its name.
 */
export function shipmentAvailableActions(input: {
	status: ShipmentStatus;
	type: ShipmentType;
	deliveryMode: DeliveryMode | null;
	packageCount: number;
	livePackageCount: number;
}): AvailableAction<ShipmentCommandKey>[] {
	const isEndUser = input.type === "endUserDelivery";
	const hasLivePackages = input.livePackageCount > 0;
	const noPackagesReason =
		input.packageCount === 0
			? "El envío no tiene paquetes"
			: "El envío no tiene paquetes activos";
	const missingModeReason = "El envío no tiene modo de entrega";

	function dispatchState(): AvailableAction<ShipmentCommandKey> {
		if (!dispatchableShipmentStatuses.has(input.status)) {
			return {
				action: "dispatch",
				enabled: false,
				reason: "El envío ya salió",
			};
		}
		if (isEndUser && input.deliveryMode === null) {
			return {
				action: "dispatch",
				enabled: false,
				reason: missingModeReason,
			};
		}
		if (!hasLivePackages) {
			return {
				action: "dispatch",
				enabled: false,
				reason: noPackagesReason,
			};
		}
		return { action: "dispatch", enabled: true };
	}

	function deliverState(): AvailableAction<ShipmentCommandKey> {
		if (!isEndUser) {
			return {
				action: "deliver",
				enabled: false,
				reason: "Solo se puede entregar un envío al cliente",
			};
		}
		if (input.status !== "inTransit" && input.status !== "delayed") {
			return {
				action: "deliver",
				enabled: false,
				reason: "Solo se puede entregar un envío en tránsito o demorado",
			};
		}
		if (input.deliveryMode === null) {
			return { action: "deliver", enabled: false, reason: missingModeReason };
		}
		if (!hasLivePackages) {
			return { action: "deliver", enabled: false, reason: noPackagesReason };
		}
		return { action: "deliver", enabled: true };
	}

	function addPackagesState(): AvailableAction<ShipmentCommandKey> {
		if (!isEndUser) {
			return {
				action: "addPackages",
				enabled: false,
				reason: "Solo se pueden agregar paquetes a un envío al cliente",
			};
		}
		if (!dispatchableShipmentStatuses.has(input.status)) {
			return {
				action: "addPackages",
				enabled: false,
				reason: "El envío ya salió",
			};
		}
		return { action: "addPackages", enabled: true };
	}

	function receiveState(): AvailableAction<ShipmentCommandKey> {
		// `receive` absorbs shortfalls and closes supplier orders — an inbound story.
		// The end-user leg's counterpart is `deliver`, which moves no quantity.
		if (isEndUser) {
			return {
				action: "receive",
				enabled: false,
				reason: "Un envío al cliente se cierra con la entrega",
			};
		}
		if (input.status !== "inTransit" && input.status !== "delayed") {
			return {
				action: "receive",
				enabled: false,
				reason: "Solo se puede recibir un envío en tránsito o demorado",
			};
		}
		if (!hasLivePackages) {
			return {
				action: "receive",
				enabled: false,
				reason: noPackagesReason,
			};
		}
		return { action: "receive", enabled: true };
	}

	function markDelayedState(): AvailableAction<ShipmentCommandKey> {
		if (input.status !== "inTransit") {
			return {
				action: "markDelayed",
				enabled: false,
				reason: "Solo se puede demorar un envío en tránsito",
			};
		}
		return { action: "markDelayed", enabled: true };
	}

	function markFailedState(): AvailableAction<ShipmentCommandKey> {
		if (input.status !== "inTransit" && input.status !== "delayed") {
			return {
				action: "markFailed",
				enabled: false,
				reason:
					"Solo se puede marcar como fallido un envío en tránsito o demorado",
			};
		}
		return { action: "markFailed", enabled: true };
	}

	function retryState(): AvailableAction<ShipmentCommandKey> {
		if (input.status !== "failed") {
			return {
				action: "retry",
				enabled: false,
				reason: "Solo se puede reintentar un envío fallido",
			};
		}
		if (!hasLivePackages) {
			return {
				action: "retry",
				enabled: false,
				reason: "El envío fallido ya no tiene paquetes",
			};
		}
		return { action: "retry", enabled: true };
	}

	return [
		dispatchState(),
		receiveState(),
		deliverState(),
		addPackagesState(),
		markDelayedState(),
		markFailedState(),
		retryState(),
	];
}

const splittableStatuses: ReadonlySet<PackageStatus> = new Set([
	"pending",
	"packing",
	"readyForShipment",
	"received",
]);

/**
 * `liveLineCount`, `liveLineQuantity`, `fractionableQuantity` and
 * `distinctCartCount` must arrive with cancelled records already filtered out, as
 * in `shipmentAvailableActions`. The decimal quantities arrive as strings because
 * this module is reachable from client bundles and must not depend on
 * `Prisma.Decimal`; they are only ever compared against zero or against each
 * other, which `Number` resolves exactly at the 4-decimal scale the schema uses.
 *
 * A write-off is reachable from a *disrupted* package or a disrupted shipment: a
 * shipment that will clearly never arrive should not need a fake `markFailed`
 * first (CONTEXT.md, "Write-off").
 */
export function packageAvailableActions(input: {
	status: PackageStatus;
	leg: PackageLeg;
	shipmentStatus: ShipmentStatus | null;
	liveLineCount: number;
	liveLineQuantity: string;
	fractionableQuantity: string;
	distinctCartCount: number;
}): AvailableAction<PackageCommandKey>[] {
	const receivedInbound =
		input.leg === "inbound" && input.status === "received";
	const hasFractionable = Number(input.fractionableQuantity) > 0;

	function confirmDeliveryState(): AvailableAction<PackageCommandKey> {
		if (input.leg !== "outbound") {
			return {
				action: "confirmDelivery",
				enabled: false,
				reason: "Solo se puede entregar un paquete de salida",
			};
		}
		if (!isLegalTransition(packageTransitions, input.status, "received")) {
			return {
				action: "confirmDelivery",
				enabled: false,
				reason: "El paquete no esta en un estado entregable",
			};
		}
		if (input.liveLineCount <= 0) {
			return {
				action: "confirmDelivery",
				enabled: false,
				reason: "El paquete no tiene lineas activas",
			};
		}
		return { action: "confirmDelivery", enabled: true };
	}

	function recoverState(): AvailableAction<PackageCommandKey> {
		if (input.status !== "delayed") {
			return {
				action: "recover",
				enabled: false,
				reason: "Solo se puede recuperar un paquete demorado",
			};
		}
		// `isDisrupted` in the derivation reads both levels, so recovering a package
		// under a disrupted shipment would look like a no-op to the operator.
		if (
			input.shipmentStatus !== null &&
			disruptedStatuses.has(input.shipmentStatus)
		) {
			return {
				action: "recover",
				enabled: false,
				reason: "Primero hay que recuperar el envio",
			};
		}
		return { action: "recover", enabled: true };
	}

	function fractionateState(): AvailableAction<PackageCommandKey> {
		if (!receivedInbound) {
			return {
				action: "fractionate",
				enabled: false,
				reason: "Solo se puede fraccionar un paquete de entrada recibido",
			};
		}
		if (!hasFractionable) {
			return {
				action: "fractionate",
				enabled: false,
				reason: "No queda cantidad recibida sin fraccionar",
			};
		}
		return { action: "fractionate", enabled: true };
	}

	function promoteState(): AvailableAction<PackageCommandKey> {
		if (!receivedInbound) {
			return {
				action: "promote",
				enabled: false,
				reason: "Solo se puede promover un paquete de entrada recibido",
			};
		}
		if (input.distinctCartCount !== 1) {
			return {
				action: "promote",
				enabled: false,
				reason: "Solo se puede promover un paquete de un unico cliente",
			};
		}
		// Anything already fractionated left part of this package on the outbound
		// leg, so promoting the whole row would package that part a second time.
		if (
			!hasFractionable ||
			Number(input.fractionableQuantity) !== Number(input.liveLineQuantity)
		) {
			return {
				action: "promote",
				enabled: false,
				reason: "El paquete ya fue fraccionado parcialmente",
			};
		}
		return { action: "promote", enabled: true };
	}

	function splitState(): AvailableAction<PackageCommandKey> {
		if (!splittableStatuses.has(input.status)) {
			return {
				action: "split",
				enabled: false,
				reason: "Solo se puede dividir un paquete que no esta en movimiento",
			};
		}
		if (input.liveLineCount <= 0) {
			return {
				action: "split",
				enabled: false,
				reason: "El paquete no tiene lineas activas",
			};
		}
		return { action: "split", enabled: true };
	}

	function markDelayedState(): AvailableAction<PackageCommandKey> {
		if (input.status !== "readyForShipment" && input.status !== "inTransit") {
			return {
				action: "markDelayed",
				enabled: false,
				reason: "Solo se puede demorar un paquete listo o en transito",
			};
		}
		return { action: "markDelayed", enabled: true };
	}

	function markFailedState(): AvailableAction<PackageCommandKey> {
		if (
			input.status !== "readyForShipment" &&
			input.status !== "inTransit" &&
			input.status !== "delayed"
		) {
			return {
				action: "markFailed",
				enabled: false,
				reason:
					"Solo se puede marcar como fallido un paquete listo, en transito o demorado",
			};
		}
		return { action: "markFailed", enabled: true };
	}

	function writeOffState(): AvailableAction<PackageCommandKey> {
		const disrupted =
			disruptedStatuses.has(input.status) ||
			(input.shipmentStatus !== null &&
				disruptedStatuses.has(input.shipmentStatus));

		if (!disrupted) {
			return {
				action: "writeOff",
				enabled: false,
				reason: "Solo se puede dar de baja un paquete demorado o fallido",
			};
		}
		if (input.liveLineCount <= 0) {
			return {
				action: "writeOff",
				enabled: false,
				reason: "El paquete no tiene líneas activas",
			};
		}
		return { action: "writeOff", enabled: true };
	}

	return [
		fractionateState(),
		promoteState(),
		splitState(),
		confirmDeliveryState(),
		recoverState(),
		markDelayedState(),
		markFailedState(),
		writeOffState(),
	];
}

/**
 * Where `package.recover` puts a delayed package back. Derived from the record
 * rather than asked of the operator: a package that never departed belongs back
 * at `readyForShipment`, one already travelling belongs back `inTransit`.
 *
 * Single definition so the command, the package detail's `recoveryTarget` and the
 * dialog copy can never disagree. Undefined when the shipment is itself disrupted
 * — `recoverState` refuses there, because recovering only the package would leave
 * the item deriving `exception` anyway (`isDisrupted` reads both levels).
 */
export function packageRecoveryTarget(input: {
	shipmentStatus: ShipmentStatus | null;
}): Extract<PackageStatus, "readyForShipment" | "inTransit"> | null {
	if (input.shipmentStatus === null) return "readyForShipment";
	if (disruptedStatuses.has(input.shipmentStatus)) return null;
	return dispatchableShipmentStatuses.has(input.shipmentStatus)
		? "readyForShipment"
		: "inTransit";
}

export type CarrierOrderCommandKey =
	| "request"
	| "confirm"
	| "markInTransit"
	| "complete"
	| "cancel"
	| "markFailed"
	| "addShipments"
	| "removeShipment"
	| "edit"
	| "softDelete"
	| "hardDelete";

export const carrierOrderCommandKeys: CarrierOrderCommandKey[] = [
	"request",
	"confirm",
	"markInTransit",
	"complete",
	"cancel",
	"markFailed",
	"addShipments",
	"removeShipment",
	"edit",
	"softDelete",
	"hardDelete",
];

const cancellableCarrierOrderStatuses: ReadonlySet<CarrierOrderStatus> =
	new Set(["pending", "requested", "confirmed"]);

const failableCarrierOrderStatuses: ReadonlySet<CarrierOrderStatus> = new Set([
	"requested",
	"confirmed",
	"inTransit",
]);

/** A booking that is still open for shipments to join or leave. */
const openCarrierOrderStatuses: ReadonlySet<CarrierOrderStatus> = new Set([
	"pending",
	"requested",
	"confirmed",
	"inTransit",
]);

/**
 * `liveShipmentCount` must arrive with cancelled shipments already filtered out,
 * the contract `shipmentAvailableActions` established for `livePackageCount`;
 * `shipmentCount` is every shipment the booking holds, cancelled included,
 * because `hardDelete`'s childless guard is about the FK, not about liveness.
 */
export function carrierOrderAvailableActions(input: {
	status: CarrierOrderStatus;
	deleted: boolean;
	shipmentCount: number;
	liveShipmentCount: number;
}): AvailableAction<CarrierOrderCommandKey>[] {
	const open = openCarrierOrderStatuses.has(input.status);
	const closedReason = "La orden ya está cerrada";

	function requestState(): AvailableAction<CarrierOrderCommandKey> {
		if (input.status !== "pending") {
			return {
				action: "request",
				enabled: false,
				reason: "Solo se puede solicitar una orden pendiente",
			};
		}
		return { action: "request", enabled: true };
	}

	function confirmState(): AvailableAction<CarrierOrderCommandKey> {
		if (input.status !== "requested") {
			return {
				action: "confirm",
				enabled: false,
				reason: "Solo se puede confirmar una orden solicitada",
			};
		}
		return { action: "confirm", enabled: true };
	}

	function markInTransitState(): AvailableAction<CarrierOrderCommandKey> {
		if (input.status !== "confirmed") {
			return {
				action: "markInTransit",
				enabled: false,
				reason: "Solo se puede despachar una orden confirmada",
			};
		}
		if (input.liveShipmentCount <= 0) {
			return {
				action: "markInTransit",
				enabled: false,
				reason: "La orden no tiene envíos activos",
			};
		}
		return { action: "markInTransit", enabled: true };
	}

	function completeState(): AvailableAction<CarrierOrderCommandKey> {
		if (input.status !== "inTransit") {
			return {
				action: "complete",
				enabled: false,
				reason: "Solo se puede completar una orden en tránsito",
			};
		}
		return { action: "complete", enabled: true };
	}

	function cancelState(): AvailableAction<CarrierOrderCommandKey> {
		if (!cancellableCarrierOrderStatuses.has(input.status)) {
			return {
				action: "cancel",
				enabled: false,
				reason: "La orden ya no se puede cancelar",
			};
		}
		return { action: "cancel", enabled: true };
	}

	function markFailedState(): AvailableAction<CarrierOrderCommandKey> {
		if (!failableCarrierOrderStatuses.has(input.status)) {
			return {
				action: "markFailed",
				enabled: false,
				reason: "La orden no está en curso",
			};
		}
		return { action: "markFailed", enabled: true };
	}

	function addShipmentsState(): AvailableAction<CarrierOrderCommandKey> {
		if (!open) {
			return { action: "addShipments", enabled: false, reason: closedReason };
		}
		return { action: "addShipments", enabled: true };
	}

	function removeShipmentState(): AvailableAction<CarrierOrderCommandKey> {
		if (!open) {
			return { action: "removeShipment", enabled: false, reason: closedReason };
		}
		if (input.shipmentCount <= 0) {
			return {
				action: "removeShipment",
				enabled: false,
				reason: "La orden no tiene envíos",
			};
		}
		return { action: "removeShipment", enabled: true };
	}

	// A carrier order is a manual transcription of a real-world booking and its
	// `externalReference` often arrives after the fact, so editing stays open even
	// on a terminal status. The audit log is the trail.
	function editState(): AvailableAction<CarrierOrderCommandKey> {
		return { action: "edit", enabled: true };
	}

	function softDeleteState(): AvailableAction<CarrierOrderCommandKey> {
		if (input.deleted) {
			return {
				action: "softDelete",
				enabled: false,
				reason: "La orden ya está dada de baja",
			};
		}
		if (input.liveShipmentCount > 0) {
			return {
				action: "softDelete",
				enabled: false,
				reason: "Quitá los envíos antes de dar de baja",
			};
		}
		return { action: "softDelete", enabled: true };
	}

	function hardDeleteState(): AvailableAction<CarrierOrderCommandKey> {
		if (input.status !== "pending") {
			return {
				action: "hardDelete",
				enabled: false,
				reason: "Solo se puede eliminar una orden pendiente",
			};
		}
		if (input.shipmentCount > 0) {
			return {
				action: "hardDelete",
				enabled: false,
				reason: "La orden tiene envíos asociados",
			};
		}
		return { action: "hardDelete", enabled: true };
	}

	const hardDelete = hardDeleteState();

	if (input.deleted) {
		// A hidden row accepts no command — except the purge, which is the natural
		// follow-up to a soft delete and keeps its own guard rather than this reason.
		return carrierOrderCommandKeys.map((action) =>
			action === "hardDelete"
				? hardDelete
				: {
						action,
						enabled: false,
						reason: "La orden está dada de baja",
					},
		);
	}

	return [
		requestState(),
		confirmState(),
		markInTransitState(),
		completeState(),
		cancelState(),
		markFailedState(),
		addShipmentsState(),
		removeShipmentState(),
		editState(),
		softDeleteState(),
		hardDelete,
	];
}

export type OperationCommandKey = "cancel" | "rerun" | "delete";

/**
 * The administrative window: an operation can still be compensated while every
 * *live* supplier order it produced sits at `pending`. An order already cancelled
 * through the supplier loop does not close the window — its lines are already
 * `cancelled` and compensation skips them (architecture §8).
 *
 * `liveSupplierOrderStatuses` must arrive with cancelled orders already filtered
 * out; filtering here would make the parameter mean something other than its name.
 */
function isInsideAdministrativeWindow(
	liveSupplierOrderStatuses: SupplierOrderStatus[],
) {
	return liveSupplierOrderStatuses.every((status) => status === "pending");
}

export function operationAvailableActions(input: {
	status: OperationStatus;
	liveSupplierOrderStatuses: SupplierOrderStatus[];
	lotCount: number;
	rollOverCount: number;
}): AvailableAction<OperationCommandKey>[] {
	const windowOpen = isInsideAdministrativeWindow(
		input.liveSupplierOrderStatuses,
	);
	const childless = input.lotCount === 0 && input.rollOverCount === 0;

	function cancelState(): AvailableAction<OperationCommandKey> {
		if (input.status !== "completed") {
			return {
				action: "cancel",
				enabled: false,
				reason: "Solo se puede cancelar una operación completada",
			};
		}
		if (!windowOpen) {
			return {
				action: "cancel",
				enabled: false,
				reason:
					"Alguna orden de proveedor ya salió de pendiente; gestionar desde el proveedor",
			};
		}
		return { action: "cancel", enabled: true };
	}

	function rerunState(): AvailableAction<OperationCommandKey> {
		if (input.status === "cancelled") return { action: "rerun", enabled: true };

		if (input.status === "failed") {
			if (!childless) {
				return {
					action: "rerun",
					enabled: false,
					reason:
						"La operación fallida dejó lotes o rollovers; no se puede reejecutar en el lugar",
				};
			}
			return { action: "rerun", enabled: true };
		}

		if (input.status === "completed") {
			// Re-running a completed operation compensates it first, so it needs the
			// same window `cancel` does.
			if (!windowOpen) {
				return {
					action: "rerun",
					enabled: false,
					reason:
						"Alguna orden de proveedor ya salió de pendiente; no se puede compensar",
				};
			}
			return { action: "rerun", enabled: true };
		}

		return {
			action: "rerun",
			enabled: false,
			reason: "Una operación en ejecución no admite comandos",
		};
	}

	function deleteState(): AvailableAction<OperationCommandKey> {
		if (input.status !== "failed") {
			return {
				action: "delete",
				enabled: false,
				reason: "Solo se puede eliminar una operación fallida",
			};
		}
		if (!childless) {
			return {
				action: "delete",
				enabled: false,
				reason: "La operación tiene lotes o rollovers asociados",
			};
		}
		return { action: "delete", enabled: true };
	}

	return [cancelState(), rerunState(), deleteState()];
}

const stageRankByKey = new Map<AdminTrackingStageKey, number>(
	adminTrackingStageKeys.map((key, index) => [key, index]),
);

export function fulfillmentStageRank(stage: AdminTrackingStageKey): number {
	return stageRankByKey.get(stage) ?? -1;
}

export function isStageAtOrAfter(
	stage: AdminTrackingStageKey,
	reference: AdminTrackingStageKey,
): boolean {
	return fulfillmentStageRank(stage) >= fulfillmentStageRank(reference);
}

export const stageByLotItemStatus: Partial<
	Record<LotItemStatus, AdminTrackingStageKey>
> = {
	requested: "requestedFromSupplier",
	confirmed: "supplierConfirmed",
	readyForPackaging: "supplierConfirmed",
	completed: "supplierConfirmed",
};

export const stageBySupplierOrderStatus: Partial<
	Record<SupplierOrderStatus, AdminTrackingStageKey>
> = {
	requested: "requestedFromSupplier",
	confirmed: "requestedFromSupplier",
	readyForReceipt: "requestedFromSupplier",
	completed: "requestedFromSupplier",
};
