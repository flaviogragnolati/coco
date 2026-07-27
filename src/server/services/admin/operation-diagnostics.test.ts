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
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
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

test("a cancelled lot item's quantity is excluded from the assigned check", () => {
	const operation = buildOperation({
		lots: [
			{
				id: 100,
				code: "LOT-100",
				status: "confirmed",
				supplierOrder: { id: 500 },
				lotItems: [
					{ id: 200, status: "confirmed", quantity: decimal("8") },
					{ id: 201, status: "cancelled", quantity: decimal("4") },
				],
			},
		],
	} as unknown as Partial<OperationSummaryRecord>);

	expect(codes(operation)).not.toContain("operation.quantity.assignedMismatch");
});

test("a cancelled lot drops all of its lines from the assigned check", () => {
	const operation = buildOperation({
		assignedQuantity: decimal("0"),
		rollOverQuantity: decimal("10"),
		lots: [
			{
				id: 100,
				code: "LOT-100",
				status: "cancelled",
				supplierOrder: { id: 500 },
				lotItems: [{ id: 200, status: "cancelled", quantity: decimal("8") }],
			},
		],
	} as unknown as Partial<OperationSummaryRecord>);

	expect(codes(operation)).not.toContain("operation.quantity.assignedMismatch");
	expect(codes(operation)).not.toContain("operation.quantity.balanceMismatch");
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

test("open rollovers older than the threshold are also flagged as stale", () => {
	const operation = buildOperation({
		rollOvers: [{ id: 300, status: "open" }],
	} as unknown as Partial<OperationSummaryRecord>);

	const stale = calculateOperationDiagnostics(operation, {
		staleOpenRollOverBefore: new Date("2026-02-01T00:00:00.000Z"),
	}).map((diagnostic) => diagnostic.code);

	expect(stale).toContain("operation.rollOver.stale");

	const fresh = calculateOperationDiagnostics(operation, {
		staleOpenRollOverBefore: new Date("2025-12-01T00:00:00.000Z"),
	}).map((diagnostic) => diagnostic.code);

	expect(fresh).toContain("operation.rollOver.open");
	expect(fresh).not.toContain("operation.rollOver.stale");
});

test("the stale rule stays silent without open rollovers or without a threshold", () => {
	const resolvedOnly = buildOperation({
		rollOvers: [{ id: 300, status: "resolved" }],
	} as unknown as Partial<OperationSummaryRecord>);

	expect(
		calculateOperationDiagnostics(resolvedOnly, {
			staleOpenRollOverBefore: new Date("2026-02-01T00:00:00.000Z"),
		}).map((diagnostic) => diagnostic.code),
	).not.toContain("operation.rollOver.stale");

	const openRollOvers = buildOperation({
		rollOvers: [{ id: 300, status: "open" }],
	} as unknown as Partial<OperationSummaryRecord>);

	expect(calculateOperationDiagnostics(openRollOvers)).toEqual(
		calculateOperationDiagnostics(openRollOvers, {
			staleOpenRollOverBefore: null,
		}),
	);
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

/**
 * A compensated operation: outputs cancelled, own roll overs cancelled, live
 * counters recomputed to zero while `eligibleQuantity` stays frozen at the
 * execution snapshot. Every pre-existing rule must stay silent.
 */
function buildCompensatedOperation(
	overrides: Partial<OperationSummaryRecord> = {},
): OperationSummaryRecord {
	return buildOperation({
		status: "cancelled",
		assignedQuantity: decimal("0"),
		rollOverQuantity: decimal("0"),
		lots: [
			{
				id: 100,
				code: "LOT-100",
				status: "cancelled",
				supplierOrder: { id: 500, status: "cancelled" },
				lotItems: [{ id: 200, status: "cancelled", quantity: decimal("8") }],
			},
		],
		rollOvers: [{ id: 300, status: "cancelled" }],
		...overrides,
	} as unknown as Partial<OperationSummaryRecord>);
}

test("a fully compensated operation reports no diagnostics", () => {
	expect(calculateOperationDiagnostics(buildCompensatedOperation())).toEqual(
		[],
	);
});

test("a cancelled operation is exempt from the quantity rules", () => {
	// `eligibleQuantity` stays at 10 against zeroed live counters — the balance
	// rule would fire on every cancelled operation without the exemption.
	expect(codes(buildCompensatedOperation())).not.toContain(
		"operation.quantity.balanceMismatch",
	);
	expect(codes(buildCompensatedOperation())).not.toContain(
		"operation.quantity.assignedMismatch",
	);
});

test("a half-compensated operation reports exactly the not-compensated rule", () => {
	// A lot the compensation left untouched: `isLiveLotItem` needs both the lot
	// and the line to be live, which is the same predicate the counters apply.
	const withLiveLine = buildCompensatedOperation({
		lots: [
			{
				id: 100,
				code: "LOT-100",
				status: "assembling",
				supplierOrder: { id: 500, status: "pending" },
				lotItems: [{ id: 200, status: "pending", quantity: decimal("8") }],
			},
		],
	} as unknown as Partial<OperationSummaryRecord>);

	expect(codes(withLiveLine)).toEqual(["operation.cancelled.notCompensated"]);

	const withOpenRollOver = buildCompensatedOperation({
		rollOvers: [{ id: 300, status: "open" }],
	} as unknown as Partial<OperationSummaryRecord>);

	expect(codes(withOpenRollOver)).toEqual([
		"operation.cancelled.notCompensated",
	]);
});

/**
 * A draft as `createDraft` writes it: zeroed counters, no lots, no roll overs.
 * This is the case that pins the reasoning behind giving `draft` no exemption —
 * the quantity rules balance trivially and every output rule is unreachable, so
 * a guard on them would be dead code (ADR 0006).
 */
function buildDraft(
	overrides: Partial<OperationSummaryRecord> = {},
): OperationSummaryRecord {
	return buildOperation({
		status: "draft",
		eligibleQuantity: decimal("0"),
		assignedQuantity: decimal("0"),
		rollOverQuantity: decimal("0"),
		lots: [],
		rollOvers: [],
		...overrides,
	} as unknown as Partial<OperationSummaryRecord>);
}

test("a fresh draft reports no diagnostics at all", () => {
	expect(calculateOperationDiagnostics(buildDraft())).toEqual([]);

	// Still silent when the stale rule is armed but the draft is younger than it.
	expect(
		calculateOperationDiagnostics(buildDraft(), {
			staleDraftBefore: new Date("2025-12-01T00:00:00.000Z"),
		}),
	).toEqual([]);
});

test("a draft older than the threshold reports exactly one warning", () => {
	const diagnostics = calculateOperationDiagnostics(buildDraft(), {
		staleDraftBefore: new Date("2026-02-01T00:00:00.000Z"),
	});

	expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
		"operation.draft.stale",
	]);
	expect(diagnostics[0]?.severity).toBe("warning");
});

test("the stale-draft rule ignores every status but draft", () => {
	const armed = { staleDraftBefore: new Date("2026-02-01T00:00:00.000Z") };

	for (const status of ["running", "completed", "failed"] as const) {
		const codes = calculateOperationDiagnostics(
			buildDraft({ status } as unknown as Partial<OperationSummaryRecord>),
			armed,
		).map((diagnostic) => diagnostic.code);

		expect(codes).not.toContain("operation.draft.stale");
	}
});
