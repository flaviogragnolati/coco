import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import type { SupplierOrderSummaryRecord } from "./supplier-order.data";
import { calculateSupplierOrderDiagnostics } from "./supplier-order-diagnostics";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

type PackageLineFixture = {
	id: number;
	status: string;
	quantity: Prisma.Decimal;
	package: { status: string; leg: string };
};

type LotItemFixture = {
	id: number;
	status: string;
	quantity: Prisma.Decimal;
	packageLotItems: PackageLineFixture[];
	cartItemLotItems: Array<{
		id: number;
		quantity: Prisma.Decimal;
		cartItem: { id: number; fulfillmentStatus: string };
	}>;
};

/** An inbound package line covering `quantity` of the lot line. */
function packageLine(
	overrides: Partial<PackageLineFixture> = {},
): PackageLineFixture {
	return {
		id: 400,
		status: "received",
		quantity: decimal("8"),
		package: { status: "received", leg: "inbound" },
		...overrides,
	};
}

function lotItem(overrides: Partial<LotItemFixture> = {}): LotItemFixture {
	return {
		id: 200,
		status: "confirmed",
		quantity: decimal("8"),
		packageLotItems: [],
		cartItemLotItems: [
			{
				id: 300,
				quantity: decimal("8"),
				cartItem: { id: 10, fulfillmentStatus: "supplierConfirmed" },
			},
		],
		...overrides,
	};
}

/** A confirmed order whose lines all sit at `confirmed`: every rule stays silent. */
function buildOrder(
	overrides: Partial<SupplierOrderSummaryRecord> = {},
): SupplierOrderSummaryRecord {
	return {
		id: 500,
		status: "confirmed",
		lots: [
			{
				id: 100,
				status: "confirmed",
				operation: { id: 1, code: "OP-1", status: "completed" },
				lotItems: [lotItem()],
			},
		],
		...overrides,
	} as unknown as SupplierOrderSummaryRecord;
}

function codes(order: SupplierOrderSummaryRecord) {
	return calculateSupplierOrderDiagnostics(order).map(
		(diagnostic) => diagnostic.code,
	);
}

test("a consistent confirmed order reports no diagnostics", () => {
	expect(calculateSupplierOrderDiagnostics(buildOrder())).toEqual([]);
});

test("an order without lots is flagged", () => {
	expect(codes(buildOrder({ lots: [] }))).toContain("supplierOrder.noLots");
});

test("an aggregate ahead of its live lines is flagged", () => {
	const order = buildOrder({
		lots: [
			{
				id: 100,
				status: "confirmed",
				operation: { id: 1, code: "OP-1", status: "completed" },
				lotItems: [lotItem({ status: "requested" })],
			},
		],
	} as unknown as Partial<SupplierOrderSummaryRecord>);

	expect(codes(order)).toContain("supplierOrder.status.aggregateAheadOfLines");
});

test("a closed order whose lines await packaging is not ahead of them", () => {
	// `closeReachableSupplierOrders` closes the order and stops its lines at
	// `readyForPackaging`; only fractionation moves them to `completed`. Until 4a
	// shipped, *every* order closed by a receipt reported this rule.
	const closed = buildOrder({
		status: "completed",
		lots: [
			{
				id: 100,
				status: "readyForPackaging",
				operation: { id: 1, code: "OP-1", status: "completed" },
				lotItems: [
					lotItem({
						status: "readyForPackaging",
						packageLotItems: [packageLine()],
					}),
				],
			},
		],
	} as unknown as Partial<SupplierOrderSummaryRecord>);

	expect(codes(closed)).not.toContain(
		"supplierOrder.status.aggregateAheadOfLines",
	);
});

test("a closed order whose lines are packaged out stays clean", () => {
	const fullyClosed = buildOrder({
		status: "completed",
		lots: [
			{
				id: 100,
				status: "completed",
				operation: { id: 1, code: "OP-1", status: "completed" },
				lotItems: [
					lotItem({ status: "completed", packageLotItems: [packageLine()] }),
				],
			},
		],
	} as unknown as Partial<SupplierOrderSummaryRecord>);

	expect(codes(fullyClosed)).not.toContain(
		"supplierOrder.status.aggregateAheadOfLines",
	);
});

test("a partially cancelled but otherwise confirmed order stays clean", () => {
	const order = buildOrder({
		lots: [
			{
				id: 100,
				status: "confirmed",
				operation: { id: 1, code: "OP-1", status: "completed" },
				lotItems: [
					lotItem({ id: 200 }),
					lotItem({
						id: 201,
						status: "cancelled",
						cartItemLotItems: [
							{
								id: 301,
								quantity: decimal("4"),
								cartItem: { id: 11, fulfillmentStatus: "rolledOver" },
							},
						],
					}),
				],
			},
		],
	} as unknown as Partial<SupplierOrderSummaryRecord>);

	expect(calculateSupplierOrderDiagnostics(order)).toEqual([]);
});

test("a cancelled order holding unresolved demand is critical", () => {
	const order = buildOrder({
		status: "cancelled",
		lots: [
			{
				id: 100,
				status: "cancelled",
				operation: { id: 1, code: "OP-1", status: "completed" },
				lotItems: [
					lotItem({
						status: "cancelled",
						cartItemLotItems: [
							{
								id: 300,
								quantity: decimal("8"),
								cartItem: { id: 10, fulfillmentStatus: "supplierConfirmed" },
							},
						],
					}),
				],
			},
		],
	} as unknown as Partial<SupplierOrderSummaryRecord>);

	expect(codes(order)).toContain("supplierOrder.cancelledWithActiveDemand");
});

test("a cancelled order whose demand rolled over is clean", () => {
	const order = buildOrder({
		status: "cancelled",
		lots: [
			{
				id: 100,
				status: "cancelled",
				operation: { id: 1, code: "OP-1", status: "completed" },
				lotItems: [
					lotItem({
						status: "cancelled",
						cartItemLotItems: [
							{
								id: 300,
								quantity: decimal("8"),
								cartItem: { id: 10, fulfillmentStatus: "rolledOver" },
							},
						],
					}),
				],
			},
		],
	} as unknown as Partial<SupplierOrderSummaryRecord>);

	expect(calculateSupplierOrderDiagnostics(order)).toEqual([]);
});

test("an active order whose lines are all cancelled failed to cascade", () => {
	const order = buildOrder({
		lots: [
			{
				id: 100,
				status: "confirmed",
				operation: { id: 1, code: "OP-1", status: "completed" },
				lotItems: [
					lotItem({
						status: "cancelled",
						cartItemLotItems: [
							{
								id: 300,
								quantity: decimal("8"),
								cartItem: { id: 10, fulfillmentStatus: "rolledOver" },
							},
						],
					}),
				],
			},
		],
	} as unknown as Partial<SupplierOrderSummaryRecord>);

	expect(codes(order)).toContain("supplierOrder.allLinesCancelled");
});

function orderWithLines(
	status: string,
	lotItems: LotItemFixture[],
): SupplierOrderSummaryRecord {
	return buildOrder({
		status,
		lots: [
			{
				id: 100,
				status: "readyForPackaging",
				operation: { id: 1, code: "OP-1", status: "completed" },
				lotItems,
			},
		],
	} as unknown as Partial<SupplierOrderSummaryRecord>);
}

test("a completed order with undispatched quantity is critical", () => {
	// The invariant behind the `final` closing path: if this fires, the closing
	// rule left quantity outside both `assigned` and `rollOver`.
	const partlyDispatched = lotItem({
		status: "completed",
		quantity: decimal("8"),
		packageLotItems: [packageLine({ quantity: decimal("5") })],
	});

	expect(codes(orderWithLines("completed", [partlyDispatched]))).toEqual([
		"supplierOrder.completedWithUndispatchedQuantity",
	]);
});

test("a completed order fully covered by its inbound packages is clean", () => {
	const fullyDispatched = lotItem({
		status: "completed",
		quantity: decimal("8"),
		packageLotItems: [packageLine({ quantity: decimal("8") })],
	});

	expect(codes(orderWithLines("completed", [fullyDispatched]))).toEqual([]);
});

test("a cancelled line does not hold a completed order open", () => {
	const cancelled = lotItem({
		id: 201,
		status: "cancelled",
		quantity: decimal("3"),
		packageLotItems: [],
	});
	const fullyDispatched = lotItem({
		status: "completed",
		packageLotItems: [packageLine({ quantity: decimal("8") })],
	});

	expect(
		codes(orderWithLines("completed", [cancelled, fullyDispatched])),
	).toEqual([]);
});

test("a readyForReceipt order with no live inbound package line warns", () => {
	expect(codes(orderWithLines("readyForReceipt", [lotItem()]))).toEqual([
		"supplierOrder.readyForReceipt.noPackages",
	]);

	const dispatched = lotItem({
		packageLotItems: [
			packageLine({
				status: "packed",
				package: { status: "inTransit", leg: "inbound" },
			}),
		],
	});
	expect(codes(orderWithLines("readyForReceipt", [dispatched]))).toEqual([]);
});

test("a readyForReceipt order whose only package was written off warns again", () => {
	const writtenOff = lotItem({
		packageLotItems: [
			packageLine({
				status: "cancelled",
				package: { status: "cancelled", leg: "inbound" },
			}),
		],
	});

	expect(codes(orderWithLines("readyForReceipt", [writtenOff]))).toEqual([
		"supplierOrder.readyForReceipt.noPackages",
	]);
});
