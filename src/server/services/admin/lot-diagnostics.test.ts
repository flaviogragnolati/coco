import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import type { LotSummaryRecord } from "./lot.data";
import { calculateLotDiagnostics } from "./lot-diagnostics";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

type LotItemFixture = {
	id: number;
	code: string;
	status: string;
	quantity: Prisma.Decimal;
	cartItemLotItems: Array<{
		quantity: Prisma.Decimal;
		packageAllocations: Array<{ quantity: Prisma.Decimal }>;
		cartItem: { fulfillmentStatus: string };
	}>;
};

function lotItem(overrides: Partial<LotItemFixture> = {}): LotItemFixture {
	return {
		id: 200,
		code: "LITEM-200",
		status: "confirmed",
		quantity: decimal("8"),
		cartItemLotItems: [
			{
				quantity: decimal("8"),
				packageAllocations: [],
				cartItem: { fulfillmentStatus: "supplierConfirmed" },
			},
		],
		...overrides,
	};
}

/** A confirmed lot whose single line matches its demand: every rule stays silent. */
function buildLot(overrides: Partial<LotSummaryRecord> = {}): LotSummaryRecord {
	return {
		id: 100,
		code: "LOT-100",
		status: "confirmed",
		supplierOrder: { id: 500, code: "SORD-500" },
		lotItems: [lotItem()],
		...overrides,
	} as unknown as LotSummaryRecord;
}

function codes(lot: LotSummaryRecord) {
	return calculateLotDiagnostics(lot).map((diagnostic) => diagnostic.code);
}

test("a consistent confirmed lot reports no diagnostics", () => {
	expect(calculateLotDiagnostics(buildLot())).toEqual([]);
});

test("a cancelled line does not make the lot look ahead of its lines", () => {
	const lot = buildLot({
		lotItems: [
			lotItem(),
			lotItem({
				id: 201,
				code: "LITEM-201",
				status: "cancelled",
				cartItemLotItems: [
					{
						quantity: decimal("4"),
						packageAllocations: [],
						cartItem: { fulfillmentStatus: "rolledOver" },
					},
				],
			}),
		],
	} as unknown as Partial<LotSummaryRecord>);

	expect(codes(lot)).not.toContain("lot.status.aggregateAheadOfLines");
});

test("a live line behind the lot status still reports", () => {
	const lot = buildLot({
		lotItems: [lotItem({ status: "requested" })],
	} as unknown as Partial<LotSummaryRecord>);

	expect(codes(lot)).toContain("lot.status.aggregateAheadOfLines");
});

test("cancelled lines are skipped by the per-line rules", () => {
	const lot = buildLot({
		lotItems: [
			lotItem(),
			// A cancelled line keeps its requested quantity as history while its
			// allocations were emptied by the roll over, so both per-line rules would
			// otherwise fire on a correct cancellation.
			lotItem({
				id: 201,
				code: "LITEM-201",
				status: "cancelled",
				quantity: decimal("4"),
				cartItemLotItems: [],
			}),
		],
	} as unknown as Partial<LotSummaryRecord>);

	expect(codes(lot)).not.toContain("lot.item.noDemandAllocations");
	expect(codes(lot)).not.toContain("lot.item.quantityMismatch");
});

test("a live line whose quantity drifts from its demand still reports", () => {
	const lot = buildLot({
		lotItems: [lotItem({ quantity: decimal("9") })],
	} as unknown as Partial<LotSummaryRecord>);

	expect(codes(lot)).toContain("lot.item.quantityMismatch");
});

test("a cancelled lot whose demand rolled over is clean", () => {
	const lot = buildLot({
		status: "cancelled",
		lotItems: [
			lotItem({
				status: "cancelled",
				cartItemLotItems: [
					{
						quantity: decimal("8"),
						packageAllocations: [],
						cartItem: { fulfillmentStatus: "rolledOver" },
					},
				],
			}),
		],
	} as unknown as Partial<LotSummaryRecord>);

	expect(codes(lot)).not.toContain("lot.cancelledWithActiveDemand");
});

test("a cancelled lot still holding unresolved demand is critical", () => {
	const lot = buildLot({
		status: "cancelled",
		lotItems: [
			lotItem({
				status: "cancelled",
				cartItemLotItems: [
					{
						quantity: decimal("8"),
						packageAllocations: [],
						cartItem: { fulfillmentStatus: "supplierConfirmed" },
					},
				],
			}),
		],
	} as unknown as Partial<LotSummaryRecord>);

	expect(codes(lot)).toContain("lot.cancelledWithActiveDemand");
});

test("a lot without a supplier order is flagged", () => {
	expect(codes(buildLot({ supplierOrder: null }))).toContain(
		"lot.supplierOrder.missing",
	);
});
