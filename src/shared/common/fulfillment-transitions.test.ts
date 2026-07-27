import { expect, test } from "vitest";
import type {
	CarrierOrderStatus,
	LotItemStatus,
	LotStatus,
	PackageStatus,
	ShipmentStatus,
	SupplierOrderStatus,
} from "~/prisma/client";
import { carrierOrderCommandKeySchema } from "~/schemas/admin/carrier-order.schemas";
import { packageCommandKeySchema } from "~/schemas/admin/package.schemas";
import { shipmentCommandKeySchema } from "~/schemas/admin/shipment.schemas";
import {
	type CarrierOrderCommandKey,
	carrierOrderAvailableActions,
	carrierOrderCommandKeys,
	carrierOrderTransitions,
	isLegalTransition,
	lotAvailableActions,
	lotItemTransitions,
	lotTransitions,
	type OperationCommandKey,
	operationAvailableActions,
	type PackageCommandKey,
	packageAvailableActions,
	packageRecoveryTarget,
	packageTransitions,
	type ShipmentCommandKey,
	shipmentAvailableActions,
	shipmentTransitions,
	supplierOrderAvailableActions,
	supplierOrderStatusLineCompatibility,
	supplierOrderTransitions,
	unresolvedDemandFulfillmentStatuses,
} from "./fulfillment-transitions";

const legalSupplierOrderMoves: Array<
	[SupplierOrderStatus, SupplierOrderStatus]
> = [
	["pending", "requested"],
	["pending", "cancelled"],
	["requested", "confirmed"],
	["requested", "cancelled"],
	["confirmed", "readyForReceipt"],
	["confirmed", "cancelled"],
	["readyForReceipt", "completed"],
];

const illegalSupplierOrderMoves: Array<
	[SupplierOrderStatus, SupplierOrderStatus]
> = [
	["pending", "confirmed"],
	["pending", "completed"],
	["requested", "requested"],
	["confirmed", "requested"],
	["cancelled", "requested"],
	["completed", "cancelled"],
];

test.each(
	legalSupplierOrderMoves,
)("supplier order %s -> %s is legal", (from, to) => {
	expect(isLegalTransition(supplierOrderTransitions, from, to)).toBe(true);
});

test.each(
	illegalSupplierOrderMoves,
)("supplier order %s -> %s is refused", (from, to) => {
	expect(isLegalTransition(supplierOrderTransitions, from, to)).toBe(false);
});

const legalLotMoves: Array<[LotStatus, LotStatus]> = [
	["pending", "assembling"],
	["assembling", "requested"],
	["requested", "confirmed"],
	["confirmed", "readyForPackaging"],
	["readyForPackaging", "completed"],
	["assembling", "cancelled"],
];

const illegalLotMoves: Array<[LotStatus, LotStatus]> = [
	["pending", "requested"],
	["assembling", "confirmed"],
	["cancelled", "requested"],
	["completed", "cancelled"],
];

test.each(legalLotMoves)("lot %s -> %s is legal", (from, to) => {
	expect(isLegalTransition(lotTransitions, from, to)).toBe(true);
});

test.each(illegalLotMoves)("lot %s -> %s is refused", (from, to) => {
	expect(isLegalTransition(lotTransitions, from, to)).toBe(false);
});

const legalLotItemMoves: Array<[LotItemStatus, LotItemStatus]> = [
	["pending", "requested"],
	["requested", "confirmed"],
	["confirmed", "readyForPackaging"],
	["readyForPackaging", "completed"],
	["requested", "cancelled"],
];

const illegalLotItemMoves: Array<[LotItemStatus, LotItemStatus]> = [
	["pending", "confirmed"],
	["confirmed", "requested"],
	["cancelled", "requested"],
	["completed", "cancelled"],
];

test.each(legalLotItemMoves)("lot item %s -> %s is legal", (from, to) => {
	expect(isLegalTransition(lotItemTransitions, from, to)).toBe(true);
});

test.each(illegalLotItemMoves)("lot item %s -> %s is refused", (from, to) => {
	expect(isLegalTransition(lotItemTransitions, from, to)).toBe(false);
});

function actionState(
	input: Parameters<typeof supplierOrderAvailableActions>[0],
	action: string,
) {
	const state = supplierOrderAvailableActions(input).find(
		(entry) => entry.action === action,
	);
	if (!state) throw new Error(`Missing action ${action}`);
	return state;
}

test("every command key is always reported", () => {
	expect(
		supplierOrderAvailableActions({
			status: "completed",
			operationCompleted: true,
			liveLineCount: 0,
			dispatchableQuantity: "0",
		}).map((entry) => entry.action),
	).toEqual(["request", "confirm", "registerDispatch", "cancel", "cancelLine"]);
});

test("request needs a pending order, a completed operation and live lines", () => {
	expect(
		actionState(
			{
				status: "pending",
				operationCompleted: true,
				liveLineCount: 2,
				dispatchableQuantity: "0",
			},
			"request",
		).enabled,
	).toBe(true);

	const notCompleted = actionState(
		{
			status: "pending",
			operationCompleted: false,
			liveLineCount: 2,
			dispatchableQuantity: "0",
		},
		"request",
	);
	expect(notCompleted.enabled).toBe(false);
	expect(notCompleted.reason).toBeTruthy();

	const noLines = actionState(
		{
			status: "pending",
			operationCompleted: true,
			liveLineCount: 0,
			dispatchableQuantity: "0",
		},
		"request",
	);
	expect(noLines.enabled).toBe(false);
	expect(noLines.reason).toBeTruthy();

	expect(
		actionState(
			{
				status: "requested",
				operationCompleted: true,
				liveLineCount: 2,
				dispatchableQuantity: "0",
			},
			"request",
		).enabled,
	).toBe(false);
});

test("confirm is reachable only from requested with live lines", () => {
	expect(
		actionState(
			{
				status: "requested",
				operationCompleted: true,
				liveLineCount: 1,
				dispatchableQuantity: "0",
			},
			"confirm",
		).enabled,
	).toBe(true);
	expect(
		actionState(
			{
				status: "requested",
				operationCompleted: true,
				liveLineCount: 0,
				dispatchableQuantity: "0",
			},
			"confirm",
		).enabled,
	).toBe(false);
	expect(
		actionState(
			{
				status: "confirmed",
				operationCompleted: true,
				liveLineCount: 1,
				dispatchableQuantity: "0",
			},
			"confirm",
		).enabled,
	).toBe(false);
});

test("cancel stays open through confirmed and closes afterwards", () => {
	for (const status of ["pending", "requested", "confirmed"] as const) {
		expect(
			actionState(
				{
					status,
					operationCompleted: true,
					liveLineCount: 1,
					dispatchableQuantity: "0",
				},
				"cancel",
			).enabled,
		).toBe(true);
	}

	for (const status of ["readyForReceipt", "completed", "cancelled"] as const) {
		const state = actionState(
			{
				status,
				operationCompleted: true,
				liveLineCount: 1,
				dispatchableQuantity: "0",
			},
			"cancel",
		);
		expect(state.enabled).toBe(false);
		expect(state.reason).toBeTruthy();
	}
});

test("cancelLine additionally needs a live line", () => {
	expect(
		actionState(
			{
				status: "confirmed",
				operationCompleted: true,
				liveLineCount: 0,
				dispatchableQuantity: "0",
			},
			"cancelLine",
		).enabled,
	).toBe(false);
	expect(
		actionState(
			{
				status: "confirmed",
				operationCompleted: true,
				liveLineCount: 1,
				dispatchableQuantity: "0",
			},
			"cancelLine",
		).enabled,
	).toBe(true);
});

test("registerDispatch needs a confirmed-or-readyForReceipt order with outstanding quantity", () => {
	for (const status of ["confirmed", "readyForReceipt"] as const) {
		expect(
			actionState(
				{
					status,
					operationCompleted: true,
					liveLineCount: 1,
					dispatchableQuantity: "5",
				},
				"registerDispatch",
			).enabled,
		).toBe(true);
	}

	const nothingLeft = actionState(
		{
			status: "readyForReceipt",
			operationCompleted: true,
			liveLineCount: 1,
			dispatchableQuantity: "0",
		},
		"registerDispatch",
	);
	expect(nothingLeft.enabled).toBe(false);
	expect(nothingLeft.reason).toBeTruthy();

	for (const status of [
		"pending",
		"requested",
		"completed",
		"cancelled",
	] as const) {
		const state = actionState(
			{
				status,
				operationCompleted: true,
				liveLineCount: 1,
				dispatchableQuantity: "5",
			},
			"registerDispatch",
		);
		expect(state.enabled).toBe(false);
		expect(state.reason).toBeTruthy();
	}
});

const legalPackageMoves: Array<[PackageStatus, PackageStatus]> = [
	["pending", "packing"],
	["pending", "readyForShipment"],
	["pending", "cancelled"],
	["packing", "readyForShipment"],
	["readyForShipment", "inTransit"],
	["readyForShipment", "cancelled"],
	["inTransit", "received"],
	["inTransit", "delayed"],
	["inTransit", "failed"],
	["delayed", "inTransit"],
	["delayed", "received"],
	["delayed", "failed"],
	["delayed", "cancelled"],
	// Reassignment to a new shipment only.
	["received", "inTransit"],
	// Promotion: the leg flips and the status starts over on the outbound leg.
	["received", "readyForShipment"],
	// Package-level disruption before departure, which depot pickup needs.
	["readyForShipment", "delayed"],
	["readyForShipment", "failed"],
	// Depot pickup: handed over without ever moving (Phase 4b).
	["readyForShipment", "received"],
	// `package.recover` for a package disrupted before departure (Phase 4b).
	["delayed", "readyForShipment"],
	["failed", "readyForShipment"],
	["failed", "cancelled"],
];

const illegalPackageMoves: Array<[PackageStatus, PackageStatus]> = [
	["pending", "inTransit"],
	["packing", "inTransit"],
	["inTransit", "readyForShipment"],
	["received", "cancelled"],
	// The goods are in hand; the disruption story belongs to what happens next.
	["received", "delayed"],
	["received", "failed"],
	["cancelled", "readyForShipment"],
	["failed", "inTransit"],
];

test.each(legalPackageMoves)("package %s -> %s is legal", (from, to) => {
	expect(isLegalTransition(packageTransitions, from, to)).toBe(true);
});

test.each(illegalPackageMoves)("package %s -> %s is refused", (from, to) => {
	expect(isLegalTransition(packageTransitions, from, to)).toBe(false);
});

const legalShipmentMoves: Array<[ShipmentStatus, ShipmentStatus]> = [
	["pending", "preparing"],
	["pending", "readyForDispatch"],
	["pending", "cancelled"],
	["preparing", "readyForDispatch"],
	["readyForDispatch", "inTransit"],
	["readyForDispatch", "delayed"],
	["readyForDispatch", "cancelled"],
	["inTransit", "received"],
	["inTransit", "delayed"],
	["inTransit", "failed"],
	["delayed", "inTransit"],
	["delayed", "received"],
	["delayed", "failed"],
	["delayed", "cancelled"],
	["failed", "cancelled"],
];

const illegalShipmentMoves: Array<[ShipmentStatus, ShipmentStatus]> = [
	["pending", "inTransit"],
	["readyForDispatch", "received"],
	["inTransit", "readyForDispatch"],
	// A retry creates a new shipment; the failed one is never revived.
	["failed", "readyForDispatch"],
	["failed", "inTransit"],
	["received", "inTransit"],
	["cancelled", "pending"],
];

test.each(legalShipmentMoves)("shipment %s -> %s is legal", (from, to) => {
	expect(isLegalTransition(shipmentTransitions, from, to)).toBe(true);
});

test.each(illegalShipmentMoves)("shipment %s -> %s is refused", (from, to) => {
	expect(isLegalTransition(shipmentTransitions, from, to)).toBe(false);
});

test("terminal package and shipment statuses declare no outgoing move", () => {
	expect(packageTransitions.cancelled.size).toBe(0);
	expect(shipmentTransitions.received.size).toBe(0);
	expect(shipmentTransitions.cancelled.size).toBe(0);
});

test("no ladder targets a status outside its own enum", () => {
	for (const [from, targets] of Object.entries(packageTransitions)) {
		for (const target of targets) {
			expect(Object.keys(packageTransitions)).toContain(target);
			expect(target).not.toBe(from);
		}
	}
	for (const [from, targets] of Object.entries(shipmentTransitions)) {
		for (const target of targets) {
			expect(Object.keys(shipmentTransitions)).toContain(target);
			expect(target).not.toBe(from);
		}
	}
});

function shipmentActionState(
	input: Parameters<typeof shipmentAvailableActions>[0],
	action: ShipmentCommandKey,
) {
	const state = shipmentAvailableActions(input).find(
		(entry) => entry.action === action,
	);
	if (!state) throw new Error(`Missing action ${action}`);
	return state;
}

const internalInTransit: Parameters<typeof shipmentAvailableActions>[0] = {
	status: "inTransit",
	type: "internalTransfer",
	deliveryMode: null,
	packageCount: 1,
	livePackageCount: 1,
};

/** A home-delivery shipment ready to leave, with one live package. */
function endUserInput(
	overrides: Partial<Parameters<typeof shipmentAvailableActions>[0]> = {},
): Parameters<typeof shipmentAvailableActions>[0] {
	return {
		status: "readyForDispatch",
		type: "endUserDelivery",
		deliveryMode: "homeDelivery",
		packageCount: 1,
		livePackageCount: 1,
		...overrides,
	};
}

const shipmentCommandKeys: ShipmentCommandKey[] = [
	"dispatch",
	"receive",
	"deliver",
	"addPackages",
	"markDelayed",
	"markFailed",
	"retry",
];

test("every shipment command key is always reported, disabled ones with a reason", () => {
	const actions = shipmentAvailableActions({
		status: "cancelled",
		type: "internalTransfer",
		deliveryMode: null,
		packageCount: 0,
		livePackageCount: 0,
	});

	expect(actions.map((entry) => entry.action)).toEqual(shipmentCommandKeys);
	for (const entry of actions) {
		expect(entry.enabled).toBe(false);
		expect(entry.reason).toBeTruthy();
	}
});

test("the shipment command key union and its schema enum stay in step", () => {
	expect([...shipmentCommandKeySchema.options].sort()).toEqual(
		[...shipmentCommandKeys].sort(),
	);
});

test("dispatch needs an internal shipment before departure with live packages", () => {
	for (const status of ["pending", "preparing", "readyForDispatch"] as const) {
		expect(
			shipmentActionState({ ...internalInTransit, status }, "dispatch").enabled,
		).toBe(true);
	}

	expect(
		shipmentActionState(
			{ ...internalInTransit, status: "readyForDispatch", livePackageCount: 0 },
			"dispatch",
		).enabled,
	).toBe(false);
	expect(
		shipmentActionState({ ...internalInTransit }, "dispatch").enabled,
	).toBe(false);
});

test("an end-user delivery shipment dispatches once it carries a delivery mode", () => {
	expect(shipmentActionState(endUserInput(), "dispatch").enabled).toBe(true);

	const noMode = shipmentActionState(
		endUserInput({ deliveryMode: null }),
		"dispatch",
	);
	expect(noMode.enabled).toBe(false);
	expect(noMode.reason).toBeTruthy();
});

test("receive is reachable from inTransit and delayed only, and never on the end-user leg", () => {
	for (const status of ["inTransit", "delayed"] as const) {
		expect(
			shipmentActionState({ ...internalInTransit, status }, "receive").enabled,
		).toBe(true);
	}
	for (const status of ["readyForDispatch", "received", "failed"] as const) {
		expect(
			shipmentActionState({ ...internalInTransit, status }, "receive").enabled,
		).toBe(false);
	}

	// The end-user leg closes with `deliver`, which moves no quantity.
	const endUser = shipmentActionState(
		endUserInput({ status: "inTransit" }),
		"receive",
	);
	expect(endUser.enabled).toBe(false);
	expect(endUser.reason).toBeTruthy();
});

test("deliver needs an end-user shipment in transit or delayed, with a mode and live packages", () => {
	for (const status of ["inTransit", "delayed"] as const) {
		for (const deliveryMode of ["homeDelivery", "pickupPoint"] as const) {
			expect(
				shipmentActionState(endUserInput({ status, deliveryMode }), "deliver")
					.enabled,
			).toBe(true);
		}
	}

	for (const input of [
		endUserInput({ status: "readyForDispatch" }),
		endUserInput({ status: "received" }),
		endUserInput({ status: "inTransit", deliveryMode: null }),
		endUserInput({ status: "inTransit", livePackageCount: 0 }),
		{ ...internalInTransit },
	]) {
		const state = shipmentActionState(input, "deliver");
		expect(state.enabled).toBe(false);
		expect(state.reason).toBeTruthy();
	}
});

test("addPackages needs an end-user shipment that has not left yet", () => {
	for (const status of ["pending", "preparing", "readyForDispatch"] as const) {
		expect(
			shipmentActionState(endUserInput({ status }), "addPackages").enabled,
		).toBe(true);
	}

	for (const input of [
		endUserInput({ status: "inTransit" }),
		endUserInput({ status: "received" }),
		{ ...internalInTransit, status: "readyForDispatch" as const },
	]) {
		const state = shipmentActionState(input, "addPackages");
		expect(state.enabled).toBe(false);
		expect(state.reason).toBeTruthy();
	}
});

test("markDelayed needs inTransit; markFailed also accepts delayed", () => {
	expect(shipmentActionState(internalInTransit, "markDelayed").enabled).toBe(
		true,
	);
	expect(
		shipmentActionState(
			{ ...internalInTransit, status: "delayed" },
			"markDelayed",
		).enabled,
	).toBe(false);

	expect(shipmentActionState(internalInTransit, "markFailed").enabled).toBe(
		true,
	);
	expect(
		shipmentActionState(
			{ ...internalInTransit, status: "delayed" },
			"markFailed",
		).enabled,
	).toBe(true);
	expect(
		shipmentActionState(
			{ ...internalInTransit, status: "received" },
			"markFailed",
		).enabled,
	).toBe(false);
});

test("retry needs a failed shipment that still holds packages", () => {
	expect(
		shipmentActionState({ ...internalInTransit, status: "failed" }, "retry")
			.enabled,
	).toBe(true);

	// A retry empties the source shipment, so retrying it again has nothing to move.
	const emptied = shipmentActionState(
		{
			...internalInTransit,
			status: "failed",
			packageCount: 0,
			livePackageCount: 0,
		},
		"retry",
	);
	expect(emptied.enabled).toBe(false);
	expect(emptied.reason).toBeTruthy();
});

type PackageActionInput = Parameters<typeof packageAvailableActions>[0];

/** A received inbound package holding one customer and nothing fractionated yet. */
function packageInput(
	overrides: Partial<PackageActionInput> = {},
): PackageActionInput {
	return {
		status: "received",
		leg: "inbound",
		shipmentStatus: "received",
		liveLineCount: 1,
		liveLineQuantity: "10",
		fractionableQuantity: "10",
		distinctCartCount: 1,
		...overrides,
	};
}

function packageActionState(
	input: PackageActionInput,
	action: PackageCommandKey,
) {
	const state = packageAvailableActions(input).find(
		(entry) => entry.action === action,
	);
	if (!state) throw new Error(`Missing action ${action}`);
	return state;
}

const packageCommandKeys: PackageCommandKey[] = [
	"fractionate",
	"promote",
	"split",
	"confirmDelivery",
	"recover",
	"markDelayed",
	"markFailed",
	"writeOff",
];

test("every package command key is always reported, disabled ones with a reason", () => {
	for (const input of [
		packageInput(),
		packageInput({ status: "cancelled", liveLineCount: 0 }),
		packageInput({ status: "inTransit", leg: "outbound" }),
	]) {
		const actions = packageAvailableActions(input);
		expect(actions.map((entry) => entry.action)).toEqual(packageCommandKeys);
		for (const entry of actions) {
			if (!entry.enabled) expect(entry.reason).toBeTruthy();
		}
	}
});

test("the command key union and its schema enum stay in step", () => {
	expect([...packageCommandKeySchema.options].sort()).toEqual(
		[...packageCommandKeys].sort(),
	);
});

test("fractionate needs a received inbound package with something left to package out", () => {
	expect(packageActionState(packageInput(), "fractionate").enabled).toBe(true);

	for (const input of [
		packageInput({ leg: "outbound" }),
		packageInput({ status: "inTransit" }),
		packageInput({ fractionableQuantity: "0" }),
	]) {
		const state = packageActionState(input, "fractionate");
		expect(state.enabled).toBe(false);
		expect(state.reason).toBeTruthy();
	}
});

test("promote additionally needs one customer and nothing fractionated yet", () => {
	expect(packageActionState(packageInput(), "promote").enabled).toBe(true);

	const multiCustomer = packageActionState(
		packageInput({ distinctCartCount: 2 }),
		"promote",
	);
	expect(multiCustomer.enabled).toBe(false);

	// Partially fractionated: part of this package already left on the outbound leg.
	const partial = packageActionState(
		packageInput({ fractionableQuantity: "4" }),
		"promote",
	);
	expect(partial.enabled).toBe(false);
	expect(partial.reason).toBeTruthy();

	expect(
		packageActionState(packageInput({ status: "inTransit" }), "promote")
			.enabled,
	).toBe(false);
});

test("split needs a package that is not in movement and still has lines", () => {
	for (const status of [
		"pending",
		"packing",
		"readyForShipment",
		"received",
	] as const) {
		expect(packageActionState(packageInput({ status }), "split").enabled).toBe(
			true,
		);
	}

	for (const input of [
		packageInput({ status: "inTransit" }),
		packageInput({ status: "cancelled" }),
		packageInput({ liveLineCount: 0 }),
	]) {
		const state = packageActionState(input, "split");
		expect(state.enabled).toBe(false);
		expect(state.reason).toBeTruthy();
	}
});

test("markDelayed needs a ready or in-transit package; markFailed also accepts delayed", () => {
	for (const status of ["readyForShipment", "inTransit"] as const) {
		expect(
			packageActionState(packageInput({ status }), "markDelayed").enabled,
		).toBe(true);
		expect(
			packageActionState(packageInput({ status }), "markFailed").enabled,
		).toBe(true);
	}

	expect(
		packageActionState(packageInput({ status: "delayed" }), "markDelayed")
			.enabled,
	).toBe(false);
	expect(
		packageActionState(packageInput({ status: "delayed" }), "markFailed")
			.enabled,
	).toBe(true);

	const received = packageActionState(packageInput(), "markFailed");
	expect(received.enabled).toBe(false);
	expect(received.reason).toBeTruthy();
});

test("write-off is gated on a disrupted package or a disrupted shipment", () => {
	for (const status of ["delayed", "failed"] as const) {
		expect(
			packageActionState(
				packageInput({ status, shipmentStatus: "inTransit" }),
				"writeOff",
			).enabled,
		).toBe(true);
	}

	// The package itself is fine, but its shipment failed.
	expect(
		packageActionState(
			packageInput({ status: "inTransit", shipmentStatus: "failed" }),
			"writeOff",
		).enabled,
	).toBe(true);

	const healthy = packageActionState(
		packageInput({ status: "inTransit", shipmentStatus: "inTransit" }),
		"writeOff",
	);
	expect(healthy.enabled).toBe(false);
	expect(healthy.reason).toBeTruthy();

	const noLines = packageActionState(
		packageInput({ status: "failed", shipmentStatus: null, liveLineCount: 0 }),
		"writeOff",
	);
	expect(noLines.enabled).toBe(false);
	expect(noLines.reason).toBeTruthy();
});

test("confirmDelivery covers depot pickup, pickup-point collection and recovery-by-delivery", () => {
	// Depot pickup: no shipment, handed over from a standing start.
	expect(
		packageActionState(
			packageInput({
				leg: "outbound",
				status: "readyForShipment",
				shipmentStatus: null,
			}),
			"confirmDelivery",
		).enabled,
	).toBe(true);

	for (const status of ["inTransit", "delayed"] as const) {
		expect(
			packageActionState(
				packageInput({ leg: "outbound", status }),
				"confirmDelivery",
			).enabled,
		).toBe(true);
	}

	for (const input of [
		// The inbound leg never reaches a customer.
		packageInput({ leg: "inbound", status: "readyForShipment" }),
		packageInput({ leg: "outbound", status: "received" }),
		packageInput({ leg: "outbound", status: "cancelled" }),
		packageInput({
			leg: "outbound",
			status: "inTransit",
			liveLineCount: 0,
		}),
	]) {
		const state = packageActionState(input, "confirmDelivery");
		expect(state.enabled).toBe(false);
		expect(state.reason).toBeTruthy();
	}
});

test("recover needs a delayed package under a shipment that is not itself disrupted", () => {
	for (const shipmentStatus of [
		null,
		"readyForDispatch",
		"inTransit",
	] as const) {
		expect(
			packageActionState(
				packageInput({ status: "delayed", shipmentStatus }),
				"recover",
			).enabled,
		).toBe(true);
	}

	for (const input of [
		packageInput({ status: "inTransit" }),
		packageInput({ status: "failed" }),
		packageInput({ status: "delayed", shipmentStatus: "delayed" }),
		packageInput({ status: "delayed", shipmentStatus: "failed" }),
	]) {
		const state = packageActionState(input, "recover");
		expect(state.enabled).toBe(false);
		expect(state.reason).toBeTruthy();
	}
});

test("the recovery target follows the shipment, not the operator", () => {
	expect(packageRecoveryTarget({ shipmentStatus: null })).toBe(
		"readyForShipment",
	);
	for (const shipmentStatus of [
		"pending",
		"preparing",
		"readyForDispatch",
	] as const) {
		expect(packageRecoveryTarget({ shipmentStatus })).toBe("readyForShipment");
	}
	for (const shipmentStatus of ["inTransit", "received"] as const) {
		expect(packageRecoveryTarget({ shipmentStatus })).toBe("inTransit");
	}
	// `recoverState` refuses here, so there is no target to state.
	for (const shipmentStatus of ["delayed", "failed"] as const) {
		expect(packageRecoveryTarget({ shipmentStatus })).toBeNull();
	}
});

test("a lot reports every supplier-order command disabled, naming the order", () => {
	const actions = lotAvailableActions({ supplierOrderCode: "SO-1" });

	expect(actions.map((entry) => entry.action)).toEqual([
		"request",
		"confirm",
		"registerDispatch",
		"cancel",
		"cancelLine",
	]);
	for (const entry of actions) {
		expect(entry.enabled).toBe(false);
		expect(entry.reason).toContain("SO-1");
	}

	const orphan = lotAvailableActions({ supplierOrderCode: null });
	for (const entry of orphan) {
		expect(entry.enabled).toBe(false);
		expect(entry.reason).toBe("El lote no tiene orden de proveedor");
	}
});

test("a completed order is compatible with lines still awaiting packaging", () => {
	// A receipt closes the order and leaves its lines at `readyForPackaging`;
	// fractionation is what moves them to `completed` (T15).
	expect(
		supplierOrderStatusLineCompatibility.completed?.has("readyForPackaging"),
	).toBe(true);
	expect(supplierOrderStatusLineCompatibility.completed?.has("completed")).toBe(
		true,
	);
	expect(supplierOrderStatusLineCompatibility.completed?.has("confirmed")).toBe(
		false,
	);
});

test("a readyForReceipt order is compatible with lines still confirmed", () => {
	// `registerDispatch` moves only the order; the lines are promoted to
	// `readyForPackaging` when receipt closes the order (ADR 0003). Without
	// `confirmed` here every dispatched order would look like a runaway aggregate.
	expect(
		supplierOrderStatusLineCompatibility.readyForReceipt?.has("confirmed"),
	).toBe(true);
});

test("unresolved demand excludes rolled over demand but keeps partial roll overs", () => {
	expect(unresolvedDemandFulfillmentStatuses.has("rolledOver")).toBe(false);
	expect(unresolvedDemandFulfillmentStatuses.has("partiallyRolledOver")).toBe(
		true,
	);
	expect(unresolvedDemandFulfillmentStatuses.has("cancelled")).toBe(false);
});

function operationActionState(
	input: Parameters<typeof operationAvailableActions>[0],
	action: OperationCommandKey,
) {
	const state = operationAvailableActions(input).find(
		(entry) => entry.action === action,
	);
	if (!state) throw new Error(`Missing action ${action}`);
	return state;
}

const completedInsideWindow: Parameters<typeof operationAvailableActions>[0] = {
	status: "completed",
	liveSupplierOrderStatuses: ["pending", "pending"],
	lotCount: 2,
	rollOverCount: 1,
};

test("every operation command key is always reported, disabled ones with a reason", () => {
	const actions = operationAvailableActions({
		status: "running",
		liveSupplierOrderStatuses: [],
		lotCount: 0,
		rollOverCount: 0,
	});

	expect(actions.map((entry) => entry.action)).toEqual([
		"cancel",
		"rerun",
		"delete",
	]);
	for (const entry of actions) {
		expect(entry.enabled).toBe(false);
		expect(entry.reason).toBeTruthy();
	}
});

test("a completed operation inside the administrative window can be cancelled and re-run", () => {
	expect(operationActionState(completedInsideWindow, "cancel").enabled).toBe(
		true,
	);
	expect(operationActionState(completedInsideWindow, "rerun").enabled).toBe(
		true,
	);
	expect(operationActionState(completedInsideWindow, "delete").enabled).toBe(
		false,
	);
});

test("an already cancelled supplier order does not close the window", () => {
	// The caller filters cancelled orders out, so the window sees only `pending`.
	expect(
		operationActionState(
			{ ...completedInsideWindow, liveSupplierOrderStatuses: ["pending"] },
			"cancel",
		).enabled,
	).toBe(true);
});

test("a dispatched supplier order closes the window, so compensation cannot reach packaged quantity", () => {
	// `registerDispatch` leaves the order at `readyForReceipt`. The window is
	// already closed there, which is why Phase 2's compensation needs no change to
	// stay clear of inbound packages (G2).
	const dispatched = {
		...completedInsideWindow,
		liveSupplierOrderStatuses: ["readyForReceipt"] as SupplierOrderStatus[],
	};

	expect(operationActionState(dispatched, "cancel").enabled).toBe(false);
	expect(operationActionState(dispatched, "cancel").reason).toBeTruthy();
	expect(operationActionState(dispatched, "rerun").enabled).toBe(false);
});

test("a requested supplier order closes the window for both cancel and rerun", () => {
	const outside = {
		...completedInsideWindow,
		liveSupplierOrderStatuses: [
			"pending",
			"requested",
		] as SupplierOrderStatus[],
	};

	expect(operationActionState(outside, "cancel").enabled).toBe(false);
	expect(operationActionState(outside, "cancel").reason).toBeTruthy();
	expect(operationActionState(outside, "rerun").enabled).toBe(false);
});

test("a failed operation can be re-run in place and deleted only while childless", () => {
	const childless = {
		status: "failed" as const,
		liveSupplierOrderStatuses: [],
		lotCount: 0,
		rollOverCount: 0,
	};

	expect(operationActionState(childless, "rerun").enabled).toBe(true);
	expect(operationActionState(childless, "delete").enabled).toBe(true);
	expect(operationActionState(childless, "cancel").enabled).toBe(false);

	const withOutputs = { ...childless, lotCount: 1 };
	expect(operationActionState(withOutputs, "rerun").enabled).toBe(false);
	expect(operationActionState(withOutputs, "delete").enabled).toBe(false);
});

test("a cancelled operation can only be re-run", () => {
	const cancelled = {
		status: "cancelled" as const,
		liveSupplierOrderStatuses: [],
		lotCount: 2,
		rollOverCount: 3,
	};

	expect(operationActionState(cancelled, "rerun").enabled).toBe(true);
	expect(operationActionState(cancelled, "cancel").enabled).toBe(false);
	expect(operationActionState(cancelled, "delete").enabled).toBe(false);
});

const carrierOrderStatuses: CarrierOrderStatus[] = [
	"pending",
	"requested",
	"confirmed",
	"inTransit",
	"completed",
	"cancelled",
	"failed",
];

const legalCarrierOrderMoves: Array<[CarrierOrderStatus, CarrierOrderStatus]> =
	[
		["pending", "requested"],
		["pending", "cancelled"],
		["requested", "confirmed"],
		["requested", "cancelled"],
		["requested", "failed"],
		["confirmed", "inTransit"],
		["confirmed", "cancelled"],
		["confirmed", "failed"],
		["inTransit", "completed"],
		["inTransit", "failed"],
	];

const illegalCarrierOrderMoves: Array<
	[CarrierOrderStatus, CarrierOrderStatus]
> = [
	["pending", "completed"],
	["pending", "confirmed"],
	["pending", "failed"],
	["inTransit", "cancelled"],
	["failed", "requested"],
	["completed", "cancelled"],
	["cancelled", "requested"],
];

test.each(
	legalCarrierOrderMoves,
)("carrier order %s -> %s is legal", (from, to) => {
	expect(isLegalTransition(carrierOrderTransitions, from, to)).toBe(true);
});

test.each(
	illegalCarrierOrderMoves,
)("carrier order %s -> %s is refused", (from, to) => {
	expect(isLegalTransition(carrierOrderTransitions, from, to)).toBe(false);
});

test("the carrier order ladder covers every status and terminates at three", () => {
	expect(Object.keys(carrierOrderTransitions).sort()).toEqual(
		[...carrierOrderStatuses].sort(),
	);

	for (const terminal of ["completed", "cancelled", "failed"] as const) {
		expect(carrierOrderTransitions[terminal].size).toBe(0);
	}

	for (const status of carrierOrderStatuses) {
		const targets = carrierOrderTransitions[status];
		expect(targets.has(status)).toBe(false);
		for (const target of targets) {
			expect(carrierOrderStatuses).toContain(target);
		}
	}
});

function carrierOrderInput(
	overrides: Partial<Parameters<typeof carrierOrderAvailableActions>[0]> = {},
): Parameters<typeof carrierOrderAvailableActions>[0] {
	return {
		status: "pending",
		deleted: false,
		shipmentCount: 0,
		liveShipmentCount: 0,
		...overrides,
	};
}

function carrierOrderActionState(
	input: Parameters<typeof carrierOrderAvailableActions>[0],
	action: CarrierOrderCommandKey,
) {
	const state = carrierOrderAvailableActions(input).find(
		(entry) => entry.action === action,
	);
	if (!state) throw new Error(`Missing action ${action}`);
	return state;
}

test("every carrier order command key is always reported, disabled ones with a reason", () => {
	for (const status of carrierOrderStatuses) {
		for (const deleted of [false, true]) {
			for (const [shipmentCount, liveShipmentCount] of [
				[0, 0],
				[1, 0],
				[2, 1],
			]) {
				const actions = carrierOrderAvailableActions(
					carrierOrderInput({
						status,
						deleted,
						shipmentCount,
						liveShipmentCount,
					}),
				);

				expect(actions).toHaveLength(carrierOrderCommandKeys.length);
				expect(actions.map((entry) => entry.action)).toEqual(
					carrierOrderCommandKeys,
				);
				for (const entry of actions) {
					if (!entry.enabled) expect(entry.reason).toBeTruthy();
				}
			}
		}
	}
});

test("the carrier order command key union and its schema enum stay in step", () => {
	expect([...carrierOrderCommandKeySchema.options].sort()).toEqual(
		[...carrierOrderCommandKeys].sort(),
	);
});

test("the carrier order ladder commands follow their own rungs", () => {
	expect(carrierOrderActionState(carrierOrderInput(), "request").enabled).toBe(
		true,
	);
	expect(
		carrierOrderActionState(
			carrierOrderInput({ status: "requested" }),
			"confirm",
		).enabled,
	).toBe(true);
	expect(
		carrierOrderActionState(
			carrierOrderInput({ status: "inTransit" }),
			"complete",
		).enabled,
	).toBe(true);

	for (const status of ["pending", "requested", "confirmed"] as const) {
		expect(
			carrierOrderActionState(carrierOrderInput({ status }), "cancel").enabled,
		).toBe(true);
	}
	for (const status of ["inTransit", "completed", "failed"] as const) {
		expect(
			carrierOrderActionState(carrierOrderInput({ status }), "cancel").enabled,
		).toBe(false);
	}

	for (const status of ["requested", "confirmed", "inTransit"] as const) {
		expect(
			carrierOrderActionState(carrierOrderInput({ status }), "markFailed")
				.enabled,
		).toBe(true);
	}
	expect(
		carrierOrderActionState(carrierOrderInput(), "markFailed").enabled,
	).toBe(false);
});

test("markInTransit needs a confirmed order that still carries a live shipment", () => {
	const confirmed = carrierOrderInput({ status: "confirmed" });

	expect(carrierOrderActionState(confirmed, "markInTransit").enabled).toBe(
		false,
	);
	expect(
		carrierOrderActionState(confirmed, "markInTransit").reason,
	).toBeTruthy();
	expect(
		carrierOrderActionState(
			{ ...confirmed, shipmentCount: 1, liveShipmentCount: 1 },
			"markInTransit",
		).enabled,
	).toBe(true);
	// A booking whose only shipment was cancelled has nothing to dispatch.
	expect(
		carrierOrderActionState(
			{ ...confirmed, shipmentCount: 1, liveShipmentCount: 0 },
			"markInTransit",
		).enabled,
	).toBe(false);
});

test("shipments can join and leave only while the booking is open", () => {
	for (const status of [
		"pending",
		"requested",
		"confirmed",
		"inTransit",
	] as const) {
		expect(
			carrierOrderActionState(carrierOrderInput({ status }), "addShipments")
				.enabled,
		).toBe(true);
	}
	for (const status of ["completed", "cancelled", "failed"] as const) {
		expect(
			carrierOrderActionState(carrierOrderInput({ status }), "addShipments")
				.enabled,
		).toBe(false);
		expect(
			carrierOrderActionState(carrierOrderInput({ status }), "removeShipment")
				.enabled,
		).toBe(false);
	}

	expect(
		carrierOrderActionState(carrierOrderInput(), "removeShipment").enabled,
	).toBe(false);
	expect(
		carrierOrderActionState(
			carrierOrderInput({ shipmentCount: 1 }),
			"removeShipment",
		).enabled,
	).toBe(true);
});

test("softDelete is blocked by a live shipment and allowed once only cancelled ones remain", () => {
	expect(
		carrierOrderActionState(
			carrierOrderInput({ shipmentCount: 1, liveShipmentCount: 1 }),
			"softDelete",
		).enabled,
	).toBe(false);
	expect(
		carrierOrderActionState(
			carrierOrderInput({ shipmentCount: 1, liveShipmentCount: 0 }),
			"softDelete",
		).enabled,
	).toBe(true);
});

test("hardDelete is reachable only on a childless pending order, deleted or not", () => {
	expect(
		carrierOrderActionState(carrierOrderInput(), "hardDelete").enabled,
	).toBe(true);
	expect(
		carrierOrderActionState(
			carrierOrderInput({ shipmentCount: 1 }),
			"hardDelete",
		).enabled,
	).toBe(false);
	expect(
		carrierOrderActionState(
			carrierOrderInput({ status: "completed" }),
			"hardDelete",
		).enabled,
	).toBe(false);

	// The purge is the natural follow-up to a soft delete, so it keeps its own
	// guard instead of the blanket deleted reason.
	expect(
		carrierOrderActionState(carrierOrderInput({ deleted: true }), "hardDelete")
			.enabled,
	).toBe(true);
});

test("a deleted carrier order accepts no command other than the purge", () => {
	const actions = carrierOrderAvailableActions(
		carrierOrderInput({ deleted: true, shipmentCount: 1 }),
	);

	for (const entry of actions) {
		expect(entry.enabled).toBe(false);
		expect(entry.reason).toBeTruthy();
	}

	expect(
		actions
			.filter((entry) => entry.action !== "hardDelete")
			.map((entry) => entry.reason),
	).toEqual(
		Array(carrierOrderCommandKeys.length - 1).fill(
			"La orden está dada de baja",
		),
	);
	expect(actions.find((entry) => entry.action === "hardDelete")?.reason).toBe(
		"La orden tiene envíos asociados",
	);
});
