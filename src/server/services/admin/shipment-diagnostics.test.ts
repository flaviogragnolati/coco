import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import type { ShipmentSummaryRecord } from "./shipment.data";
import { calculateShipmentDiagnostics } from "./shipment-diagnostics";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

type Package = ShipmentSummaryRecord["packages"][number];
type Line = Package["packageLotItems"][number];

function line(input: { status?: string; quantity?: string } = {}): Line {
	return {
		status: input.status ?? "packed",
		quantity: decimal(input.quantity ?? "6"),
		packageAllocations: [{ quantity: decimal(input.quantity ?? "6") }],
	} as unknown as Line;
}

function pkg(
	input: { id?: number; status?: string; lines?: Line[] } = {},
): Package {
	return {
		id: input.id ?? 1,
		status: input.status ?? "readyForShipment",
		packageLotItems: input.lines ?? [line()],
	} as unknown as Package;
}

function shipment(input: {
	status?: string;
	type?: string;
	deliveryMode?: string | null;
	trackingCode?: string | null;
	carrierOrder?: unknown;
	packages?: Package[];
}): ShipmentSummaryRecord {
	return {
		id: 5,
		internalCode: "SHP-1",
		name: "Envio",
		type: input.type ?? "internalTransfer",
		deliveryMode: input.deliveryMode ?? null,
		status: input.status ?? "readyForDispatch",
		trackingCode: input.trackingCode ?? null,
		carrierOrder: input.carrierOrder ?? null,
		packages: input.packages ?? [pkg()],
		createdAt: new Date("2026-07-01T00:00:00.000Z"),
		updatedAt: new Date("2026-07-01T00:00:00.000Z"),
	} as unknown as ShipmentSummaryRecord;
}

function codes(record: ShipmentSummaryRecord, hasTrackingEvents = true) {
	return calculateShipmentDiagnostics(record, hasTrackingEvents).map(
		(diagnostic) => diagnostic.code,
	);
}

test("a healthy shipment ready for dispatch reports nothing", () => {
	expect(codes(shipment({}))).toEqual([]);
});

test("a shipment with no packages reports the missing-package warning", () => {
	expect(codes(shipment({ packages: [] }))).toEqual([
		"shipment.package.missing",
	]);
});

test("a retried shipment reports nothing", () => {
	// `retry` moves the live packages to a new shipment and leaves this one failed
	// and empty as history, so the missing-package rule must not fire on it.
	expect(codes(shipment({ status: "failed", packages: [] }))).toEqual([]);
	expect(codes(shipment({ status: "cancelled", packages: [] }))).toEqual([]);
});

test("a failed shipment still holding live packages needs a follow-up", () => {
	expect(
		codes(
			shipment({ status: "failed", packages: [pkg({ status: "failed" })] }),
		),
	).toEqual(["shipment.failedWithoutFollowUp"]);
});

test("a failed shipment whose packages were fully written off needs no follow-up", () => {
	const writtenOff = pkg({
		status: "cancelled",
		lines: [line({ status: "cancelled" })],
	});

	expect(codes(shipment({ status: "failed", packages: [writtenOff] }))).toEqual(
		[],
	);
});

test("a received shipment holding a live unreceived line is critical", () => {
	const halfReceived = pkg({
		status: "received",
		lines: [line({ status: "received" }), line({ status: "shipped" })],
	});

	expect(
		codes(shipment({ status: "received", packages: [halfReceived] })),
	).toEqual([
		"shipment.received.linesNotReceived",
		"shipment.packageLine.statusMismatch",
	]);
});

test("a received shipment whose zero-received line was cancelled is clean", () => {
	const received = pkg({
		status: "received",
		lines: [line({ status: "received" }), line({ status: "cancelled" })],
	});

	expect(codes(shipment({ status: "received", packages: [received] }))).toEqual(
		[],
	);
});

test("an aggregate ahead of its live packages is critical", () => {
	expect(
		codes(
			shipment({
				status: "received",
				packages: [
					pkg({ status: "inTransit", lines: [line({ status: "received" })] }),
				],
			}),
		),
	).toEqual(["shipment.status.aggregateAheadOfPackages"]);
});

test("one disrupted package does not fail its whole shipment's critical rule", () => {
	// Phase 4a: a single lost box inside an otherwise-fine shipment. Before
	// `markFailed` existed at package level this state was unreachable, and the
	// compatibility table read it as a contradiction.
	expect(
		codes(
			shipment({
				status: "inTransit",
				packages: [
					pkg({
						id: 1,
						status: "inTransit",
						lines: [line({ status: "shipped" })],
					}),
					pkg({
						id: 2,
						status: "failed",
						lines: [line({ status: "shipped" })],
					}),
				],
			}),
		),
	).toEqual(["shipment.package.disrupted"]);
});

test("a package genuinely behind its shipment is still critical", () => {
	expect(
		codes(
			shipment({
				status: "inTransit",
				packages: [
					pkg({
						id: 1,
						status: "readyForShipment",
						lines: [line({ status: "shipped" })],
					}),
				],
			}),
		),
	).toEqual(["shipment.status.aggregateAheadOfPackages"]);
});

test("a cancelled package does not make the aggregate look ahead of itself", () => {
	expect(
		codes(
			shipment({
				status: "received",
				packages: [
					pkg({ status: "received", lines: [line({ status: "received" })] }),
					pkg({
						id: 2,
						status: "cancelled",
						lines: [line({ status: "cancelled" })],
					}),
				],
			}),
		),
	).toEqual([]);
});

/** A pickup-point shipment that arrived: packages stay `inTransit` until collected. */
function pickupPointArrived() {
	return shipment({
		type: "endUserDelivery",
		deliveryMode: "pickupPoint",
		status: "received",
		packages: [
			pkg({ status: "inTransit", lines: [line({ status: "shipped" })] }),
		],
	});
}

test("a delivered pickup-point shipment awaiting collection reports one warning and nothing critical", () => {
	expect(codes(pickupPointArrived())).toEqual([
		"shipment.pickupPoint.pendingCollection",
	]);
});

test("a fully collected pickup-point shipment reports nothing", () => {
	const collected = shipment({
		type: "endUserDelivery",
		deliveryMode: "pickupPoint",
		status: "received",
		packages: [
			pkg({ status: "received", lines: [line({ status: "received" })] }),
		],
	});

	expect(codes(collected)).toEqual([]);
});

test("the exemption is scoped to pickup points, so a home delivery still reports", () => {
	const homeDelivery = shipment({
		type: "endUserDelivery",
		deliveryMode: "homeDelivery",
		status: "received",
		packages: [
			pkg({ status: "inTransit", lines: [line({ status: "shipped" })] }),
		],
	});

	expect(codes(homeDelivery)).toEqual([
		"shipment.received.linesNotReceived",
		"shipment.status.aggregateAheadOfPackages",
		"shipment.packageLine.statusMismatch",
	]);
});

test("an end-user shipment with no delivery mode is critical", () => {
	const noMode = shipment({
		type: "endUserDelivery",
		deliveryMode: null,
		status: "readyForDispatch",
	});

	expect(codes(noMode)).toContain("shipment.endUser.noDeliveryMode");
});

test("an internal shipment is never asked for a delivery mode", () => {
	expect(
		codes(shipment({ type: "internalTransfer", deliveryMode: null })),
	).toEqual([]);
});

test("a tracking code without a carrier order reports", () => {
	expect(codes(shipment({ trackingCode: "TRK-1" }))).toEqual([
		"shipment.carrierOrder.missing",
	]);
});

test("an advanced shipment without tracking events reports", () => {
	const inTransit = shipment({
		status: "inTransit",
		packages: [
			pkg({ status: "inTransit", lines: [line({ status: "shipped" })] }),
		],
	});

	expect(codes(inTransit, false)).toEqual(["shipment.trackingEvents.missing"]);
	expect(codes(inTransit, true)).toEqual([]);
});

const STALE_BEFORE = new Date("2026-07-10T00:00:00.000Z");

function staleCodes(record: ShipmentSummaryRecord, staleBefore: Date | null) {
	return calculateShipmentDiagnostics(record, true, { staleBefore }).map(
		(diagnostic) => diagnostic.code,
	);
}

/** In transit with everything below it consistent, so only the new rule can fire. */
function travelling(type: string) {
	return shipment({
		type,
		status: "inTransit",
		deliveryMode: type === "endUserDelivery" ? "homeDelivery" : null,
		packages: [
			pkg({ status: "inTransit", lines: [line({ status: "shipped" })] }),
		],
	});
}

test("an internal transfer stuck in transit is flagged", () => {
	expect(staleCodes(travelling("internalTransfer"), STALE_BEFORE)).toContain(
		"shipment.dispatch.notReceived",
	);

	expect(staleCodes(travelling("internalTransfer"), null)).not.toContain(
		"shipment.dispatch.notReceived",
	);
	expect(codes(travelling("internalTransfer"))).not.toContain(
		"shipment.dispatch.notReceived",
	);
});

test("an end-user delivery in transit is not a stuck dispatch", () => {
	// The rule is about goods that never reached the warehouse; the customer leg
	// has `package.outbound.notCollected` for its own version of the question.
	expect(staleCodes(travelling("endUserDelivery"), STALE_BEFORE)).not.toContain(
		"shipment.dispatch.notReceived",
	);
});

test("a recently dispatched internal transfer is not yet stale", () => {
	const recent = {
		...travelling("internalTransfer"),
		updatedAt: new Date("2026-07-20T00:00:00.000Z"),
	} as ShipmentSummaryRecord;

	expect(staleCodes(recent, STALE_BEFORE)).not.toContain(
		"shipment.dispatch.notReceived",
	);
});
