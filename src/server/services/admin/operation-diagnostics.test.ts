import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import type { OperationSummaryRecord } from "./operation.data";
import { calculateOperationDiagnostics } from "./operation-diagnostics";
import { highestSeverity } from "./operational-diagnostics.types";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

/** A completed, fully consistent operation: every rule must stay silent. */
function buildOperation(
	overrides: Partial<OperationSummaryRecord> = {},
): OperationSummaryRecord {
	return {
		id: 1,
		status: "completed",
		eligibleQuantity: decimal("10"),
		assignedQuantity: decimal("8"),
		rollOverQuantity: decimal("2"),
		lots: [
			{
				id: 100,
				code: "LOT-100",
				supplierOrder: { id: 500 },
				lotItems: [{ id: 200, quantity: decimal("8") }],
			},
		],
		rollOvers: [{ id: 300, status: "rebatched" }],
		...overrides,
	} as unknown as OperationSummaryRecord;
}

function codes(operation: OperationSummaryRecord) {
	return calculateOperationDiagnostics(operation).map(
		(diagnostic) => diagnostic.code,
	);
}

test("a consistent completed operation reports no diagnostics", () => {
	expect(calculateOperationDiagnostics(buildOperation())).toEqual([]);
});

test("balance mismatch fires when eligible differs from assigned plus rollover", () => {
	expect(codes(buildOperation({ rollOverQuantity: decimal("1") }))).toContain(
		"operation.quantity.balanceMismatch",
	);
	expect(codes(buildOperation())).not.toContain(
		"operation.quantity.balanceMismatch",
	);
});

test("assigned mismatch fires when lot lines do not add up to the assigned quantity", () => {
	const operation = buildOperation({
		lots: [
			{
				id: 100,
				code: "LOT-100",
				supplierOrder: { id: 500 },
				lotItems: [{ id: 200, quantity: decimal("5") }],
			},
		],
	} as unknown as Partial<OperationSummaryRecord>);

	expect(codes(operation)).toContain("operation.quantity.assignedMismatch");
	expect(codes(buildOperation())).not.toContain(
		"operation.quantity.assignedMismatch",
	);
});

test("a completed operation without lots is flagged", () => {
	const operation = buildOperation({
		assignedQuantity: decimal("0"),
		rollOverQuantity: decimal("10"),
		lots: [],
	});

	expect(codes(operation)).toContain("operation.completed.noLots");
	expect(codes(buildOperation())).not.toContain("operation.completed.noLots");
});

test("a failed operation that still produced outputs is flagged", () => {
	const operation = buildOperation({ status: "failed" });

	expect(codes(operation)).toContain("operation.failed.withOutputs");
	expect(
		codes(buildOperation({ status: "failed", lots: [], rollOvers: [] })),
	).not.toContain("operation.failed.withOutputs");
});

test("lots without a supplier order roll up into a single diagnostic", () => {
	const operation = buildOperation({
		assignedQuantity: decimal("8"),
		lots: [
			{
				id: 100,
				code: "LOT-100",
				supplierOrder: null,
				lotItems: [{ id: 200, quantity: decimal("4") }],
			},
			{
				id: 101,
				code: "LOT-101",
				supplierOrder: null,
				lotItems: [{ id: 201, quantity: decimal("4") }],
			},
		],
	} as unknown as Partial<OperationSummaryRecord>);

	const missing = calculateOperationDiagnostics(operation).filter(
		(diagnostic) => diagnostic.code === "operation.lot.missingSupplierOrder",
	);

	expect(missing).toHaveLength(1);
	expect(missing[0]?.refs?.lotCount).toBe(2);
	expect(codes(buildOperation())).not.toContain(
		"operation.lot.missingSupplierOrder",
	);
});

test("open rollovers are counted in a single diagnostic", () => {
	const operation = buildOperation({
		rollOvers: [
			{ id: 300, status: "open" },
			{ id: 301, status: "open" },
			{ id: 302, status: "resolved" },
		],
	} as unknown as Partial<OperationSummaryRecord>);

	const open = calculateOperationDiagnostics(operation).filter(
		(diagnostic) => diagnostic.code === "operation.rollOver.open",
	);

	expect(open).toHaveLength(1);
	expect(open[0]?.refs?.rollOverCount).toBe(2);
	expect(codes(buildOperation())).not.toContain("operation.rollOver.open");
});

test("highest severity prefers critical over warning findings", () => {
	const operation = buildOperation({
		rollOverQuantity: decimal("1"),
		rollOvers: [{ id: 300, status: "open" }],
	} as unknown as Partial<OperationSummaryRecord>);

	const diagnostics = calculateOperationDiagnostics(operation);

	expect(diagnostics.length).toBeGreaterThan(1);
	expect(highestSeverity(diagnostics)).toBe("critical");
	expect(highestSeverity(calculateOperationDiagnostics(buildOperation()))).toBe(
		null,
	);
});
