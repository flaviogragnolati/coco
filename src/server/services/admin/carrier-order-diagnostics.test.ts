import { expect, test } from "vitest";
import type { CarrierOrderStatus } from "~/prisma/client";
import type { CarrierOrderSummaryRecord } from "./carrier-order.data";
import { calculateCarrierOrderDiagnostics } from "./carrier-order-diagnostics";

type Shipment = CarrierOrderSummaryRecord["shipments"][number];

function shipment(
	input: { id?: number; status?: string; type?: string } = {},
): Shipment {
	return {
		id: input.id ?? 1,
		internalCode: `SHP-${input.id ?? 1}`,
		name: "Envio",
		type: input.type ?? "internalTransfer",
		deliveryMode: null,
		status: input.status ?? "received",
		trackingCode: null,
		_count: { packages: 1 },
	} as unknown as Shipment;
}

function buildOrder(
	overrides: { status?: CarrierOrderStatus; shipments?: Shipment[] } = {},
): CarrierOrderSummaryRecord {
	return {
		id: 9,
		code: "CORD-1",
		externalReference: null,
		status: overrides.status ?? "pending",
		deleted: false,
		requestedAt: null,
		confirmedAt: null,
		cancelledAt: null,
		createdAt: new Date("2026-07-01T00:00:00.000Z"),
		updatedAt: new Date("2026-07-01T00:00:00.000Z"),
		carrier: { id: 1, name: "Transporte SA" },
		shipments: overrides.shipments ?? [],
	} as unknown as CarrierOrderSummaryRecord;
}

function codes(record: CarrierOrderSummaryRecord) {
	return calculateCarrierOrderDiagnostics(record).map(
		(diagnostic) => diagnostic.code,
	);
}

test("a pending order with no shipments reports nothing", () => {
	expect(codes(buildOrder())).toEqual([]);
});

test("a healthy order in every status reports nothing", () => {
	const healthy: Array<[CarrierOrderStatus, Shipment[]]> = [
		["pending", [shipment({ status: "pending" })]],
		["requested", [shipment({ status: "preparing" })]],
		["confirmed", [shipment({ status: "readyForDispatch" })]],
		["inTransit", [shipment({ status: "inTransit" })]],
		["completed", [shipment({ status: "received" })]],
		["cancelled", [shipment({ status: "cancelled" })]],
		["failed", [shipment({ status: "cancelled" })]],
	];

	for (const [status, shipments] of healthy) {
		expect(codes(buildOrder({ status, shipments }))).toEqual([]);
	}
});

test("a completed order whose shipment is still moving reports the aggregate rule", () => {
	expect(
		codes(
			buildOrder({
				status: "completed",
				shipments: [shipment({ status: "inTransit" })],
			}),
		),
	).toEqual(["carrierOrder.status.aggregateAheadOfShipments"]);
});

test("a delayed shipment reports the disruption rule instead of the aggregate one", () => {
	expect(
		codes(
			buildOrder({
				status: "completed",
				shipments: [shipment({ status: "delayed" })],
			}),
		),
	).toEqual(["carrierOrder.shipment.disrupted"]);
});

test("cancelled shipments never make an aggregate look ahead of itself", () => {
	expect(
		codes(
			buildOrder({
				status: "completed",
				shipments: [
					shipment({ id: 1, status: "received" }),
					shipment({ id: 2, status: "cancelled" }),
				],
			}),
		),
	).toEqual([]);
});

test("an order in course without live shipments reports the empty-booking rule", () => {
	for (const status of ["inTransit", "completed"] as const) {
		expect(codes(buildOrder({ status, shipments: [] }))).toEqual([
			"carrierOrder.noShipments",
		]);
		expect(
			codes(
				buildOrder({ status, shipments: [shipment({ status: "cancelled" })] }),
			),
		).toEqual(["carrierOrder.noShipments"]);
	}
});

test("a closed order keeping unsettled shipments reports only the closure rule", () => {
	for (const status of ["cancelled", "failed"] as const) {
		expect(
			codes(
				buildOrder({ status, shipments: [shipment({ status: "delayed" })] }),
			),
		).toEqual(["carrierOrder.closedWithLiveShipments"]);
	}
});

test("a live order with a failed shipment reports the disruption rule", () => {
	expect(
		codes(
			buildOrder({
				status: "confirmed",
				shipments: [
					shipment({ id: 1, status: "readyForDispatch" }),
					shipment({ id: 2, status: "failed" }),
				],
			}),
		),
	).toEqual(["carrierOrder.shipment.disrupted"]);
});

const STALE_BEFORE = new Date("2026-07-10T00:00:00.000Z");

function staleCodes(
	record: CarrierOrderSummaryRecord,
	staleBefore: Date | null,
) {
	return calculateCarrierOrderDiagnostics(record, { staleBefore }).map(
		(diagnostic) => diagnostic.code,
	);
}

test("a booking requested days ago and still unconfirmed is flagged", () => {
	const order = {
		...buildOrder({ status: "requested" }),
		requestedAt: new Date("2026-07-01T00:00:00.000Z"),
	} as CarrierOrderSummaryRecord;

	expect(staleCodes(order, STALE_BEFORE)).toContain(
		"carrierOrder.requestedNotConfirmed",
	);

	// The threshold is what turns the rule on; without it the calculator behaves
	// exactly as it did before the option existed.
	expect(staleCodes(order, null)).not.toContain(
		"carrierOrder.requestedNotConfirmed",
	);
	expect(codes(order)).not.toContain("carrierOrder.requestedNotConfirmed");
});

test("a confirmed booking never reports an unconfirmed request", () => {
	const order = {
		...buildOrder({ status: "confirmed" }),
		requestedAt: new Date("2026-06-01T00:00:00.000Z"),
		confirmedAt: new Date("2026-06-02T00:00:00.000Z"),
	} as CarrierOrderSummaryRecord;

	expect(staleCodes(order, STALE_BEFORE)).not.toContain(
		"carrierOrder.requestedNotConfirmed",
	);
});

test("a recently requested booking is not yet stale", () => {
	const order = {
		...buildOrder({ status: "requested" }),
		requestedAt: new Date("2026-07-20T00:00:00.000Z"),
	} as CarrierOrderSummaryRecord;

	expect(staleCodes(order, STALE_BEFORE)).not.toContain(
		"carrierOrder.requestedNotConfirmed",
	);
});
