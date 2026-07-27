import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import { AdminCrudError } from "./_base/admin-crud.errors";
import {
	type CoverageCandidate,
	planPackagedCoverage,
	planPackagedShortfall,
	planPackagedSplit,
	type ShortfallCandidate,
} from "./package-allocation-planner";
import { orderCandidatesLifo } from "./supplier-order-absorption";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

function sum(values: Prisma.Decimal[]) {
	return values.reduce(
		(total, value) => total.plus(value),
		new Prisma.Decimal(0),
	);
}

function coverage(
	overrides: Partial<CoverageCandidate> = {},
): CoverageCandidate {
	return {
		allocationId: 1,
		cartItemId: 10,
		uncoveredQuantity: decimal("10"),
		paidAt: new Date("2026-01-01T00:00:00.000Z"),
		orderItemCreatedAt: new Date("2026-01-01T00:00:00.000Z"),
		...overrides,
	};
}

const oldestPayer = coverage({
	allocationId: 1,
	cartItemId: 10,
	uncoveredQuantity: decimal("5"),
	paidAt: new Date("2026-01-01T00:00:00.000Z"),
});
const middlePayer = coverage({
	allocationId: 2,
	cartItemId: 11,
	uncoveredQuantity: decimal("7"),
	paidAt: new Date("2026-02-01T00:00:00.000Z"),
});
const newestPayer = coverage({
	allocationId: 3,
	cartItemId: 12,
	uncoveredQuantity: decimal("3"),
	paidAt: new Date("2026-03-01T00:00:00.000Z"),
});

const allPayers = [middlePayer, newestPayer, oldestPayer];

test("coverage serves the earliest payer first", () => {
	const assignments = planPackagedCoverage({
		candidates: allPayers,
		quantity: decimal("8"),
	});

	expect(
		assignments.map((entry) => [entry.allocationId, entry.quantity.toString()]),
	).toEqual([
		[1, "5"],
		[2, "3"],
	]);
});

test("coverage is exactly the mirror of the LIFO cut order", () => {
	const fifo = planPackagedCoverage({
		candidates: allPayers,
		// Enough to touch every candidate, so the assignment order is the full order.
		quantity: decimal("15"),
	}).map((entry) => entry.allocationId);

	const lifo = orderCandidatesLifo(
		allPayers.map((candidate) => ({
			allocationId: candidate.allocationId,
			cartItemId: candidate.cartItemId,
			quantity: candidate.uncoveredQuantity,
			paidAt: candidate.paidAt,
			orderItemCreatedAt: candidate.orderItemCreatedAt,
		})),
	).map((entry) => entry.allocationId);

	expect(fifo).toEqual([...lifo].reverse());
});

test.each([
	["1"],
	["4"],
	["5"],
	["9.5"],
	["15"],
])("the covered quantity always sums to the dispatched quantity (%s)", (quantity) => {
	const assignments = planPackagedCoverage({
		candidates: allPayers,
		quantity: decimal(quantity),
	});

	expect(sum(assignments.map((entry) => entry.quantity)).toString()).toBe(
		decimal(quantity).toString(),
	);
});

test("no candidate is ever covered beyond its uncovered quantity", () => {
	const assignments = planPackagedCoverage({
		candidates: allPayers,
		quantity: decimal("15"),
	});
	const byId = new Map(
		allPayers.map((candidate) => [candidate.allocationId, candidate]),
	);

	for (const assignment of assignments) {
		const candidate = byId.get(assignment.allocationId);
		expect(candidate).toBeDefined();
		expect(
			assignment.quantity.gt(candidate?.uncoveredQuantity ?? decimal("0")),
		).toBe(false);
	}
});

test("covering more than the uncovered demand is refused", () => {
	expect(() =>
		planPackagedCoverage({
			candidates: allPayers,
			quantity: decimal("15.0001"),
		}),
	).toThrow(AdminCrudError);
});

test("a non-positive dispatch covers nothing", () => {
	expect(
		planPackagedCoverage({ candidates: allPayers, quantity: decimal("0") }),
	).toEqual([]);
});

test("a candidate with nothing uncovered is skipped", () => {
	const assignments = planPackagedCoverage({
		candidates: [
			coverage({ allocationId: 9, uncoveredQuantity: decimal("0") }),
			oldestPayer,
		],
		quantity: decimal("5"),
	});

	expect(assignments.map((entry) => entry.allocationId)).toEqual([1]);
});

function shortfall(
	overrides: Partial<ShortfallCandidate> = {},
): ShortfallCandidate {
	return {
		packagedAllocationId: 101,
		allocationId: 1,
		cartItemId: 10,
		packagedQuantity: decimal("5"),
		paidAt: new Date("2026-01-01T00:00:00.000Z"),
		orderItemCreatedAt: new Date("2026-01-01T00:00:00.000Z"),
		...overrides,
	};
}

const packagedOldest = shortfall({
	packagedAllocationId: 101,
	allocationId: 1,
	cartItemId: 10,
	packagedQuantity: decimal("5"),
	paidAt: new Date("2026-01-01T00:00:00.000Z"),
});
const packagedMiddle = shortfall({
	packagedAllocationId: 102,
	allocationId: 2,
	cartItemId: 11,
	packagedQuantity: decimal("7"),
	paidAt: new Date("2026-02-01T00:00:00.000Z"),
});
const packagedNewest = shortfall({
	packagedAllocationId: 103,
	allocationId: 3,
	cartItemId: 12,
	packagedQuantity: decimal("3"),
	paidAt: new Date("2026-03-01T00:00:00.000Z"),
});

const allPackaged = [packagedOldest, packagedMiddle, packagedNewest];

test("a shortfall reuses the LIFO cut order and carries the packaged allocation id", () => {
	const reductions = planPackagedShortfall({
		candidates: allPackaged,
		shortfall: decimal("8"),
	});

	expect(
		reductions.map((entry) => [
			entry.packagedAllocationId,
			entry.removedQuantity.toString(),
			entry.remainingPackagedQuantity.toString(),
		]),
	).toEqual([
		[103, "3", "0"],
		[102, "5", "2"],
	]);
});

test.each([
	["1"],
	["3"],
	["7.25"],
	["10"],
	["15"],
])("the removed quantity always sums to the shortfall (%s)", (quantity) => {
	const reductions = planPackagedShortfall({
		candidates: allPackaged,
		shortfall: decimal(quantity),
	});

	expect(sum(reductions.map((entry) => entry.removedQuantity)).toString()).toBe(
		decimal(quantity).toString(),
	);
});

test("a shortfall above the packaged quantity is refused", () => {
	expect(() =>
		planPackagedShortfall({
			candidates: allPackaged,
			shortfall: decimal("15.0001"),
		}),
	).toThrow(AdminCrudError);
});

test("an override redistributes the shortfall and keeps the packaged allocation id", () => {
	const reductions = planPackagedShortfall({
		candidates: allPackaged,
		shortfall: decimal("4"),
		overrides: [
			{ allocationId: 1, removedQuantity: decimal("4") },
			{ allocationId: 3, removedQuantity: decimal("0") },
		],
	});

	expect(
		reductions.map((entry) => [
			entry.packagedAllocationId,
			entry.removedQuantity.toString(),
		]),
	).toEqual([[101, "4"]]);
});

test("an override that does not sum to the shortfall is refused", () => {
	expect(() =>
		planPackagedShortfall({
			candidates: allPackaged,
			shortfall: decimal("4"),
			overrides: [{ allocationId: 1, removedQuantity: decimal("3") }],
		}),
	).toThrow(AdminCrudError);
});

test.each([
	["1"],
	["3"],
	["7.25"],
	["10"],
	["15"],
])("a split always moves exactly the requested quantity (%s)", (quantity) => {
	const reductions = planPackagedSplit({
		candidates: allPackaged,
		movedQuantity: decimal(quantity),
	});

	expect(sum(reductions.map((entry) => entry.removedQuantity)).toString()).toBe(
		decimal(quantity).toString(),
	);
	// What stays plus what moves is what was there: a split loses nothing.
	const byId = new Map(
		allPackaged.map((candidate) => [candidate.packagedAllocationId, candidate]),
	);
	for (const reduction of reductions) {
		const candidate = byId.get(reduction.packagedAllocationId);
		expect(
			reduction.removedQuantity
				.plus(reduction.remainingPackagedQuantity)
				.toString(),
		).toBe(candidate?.packagedQuantity.toString());
	}
});

test("moving the whole line empties every source allocation", () => {
	const reductions = planPackagedSplit({
		candidates: allPackaged,
		movedQuantity: decimal("15"),
	});

	expect(reductions).toHaveLength(3);
	expect(
		reductions.every((entry) => entry.remainingPackagedQuantity.isZero()),
	).toBe(true);
});

test("a split override behaves exactly like the shortfall override path", () => {
	const overrides = [
		{ allocationId: 1, removedQuantity: decimal("4") },
		{ allocationId: 3, removedQuantity: decimal("0") },
	];

	expect(
		planPackagedSplit({
			candidates: allPackaged,
			movedQuantity: decimal("4"),
			overrides,
		}),
	).toEqual(
		planPackagedShortfall({
			candidates: allPackaged,
			shortfall: decimal("4"),
			overrides,
		}),
	);
});
