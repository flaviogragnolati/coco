import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import { AdminCrudError } from "./_base/admin-crud.errors";
import {
	type FractionationCandidate,
	planFractionation,
} from "./package-fractionation";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

function sum(values: Prisma.Decimal[]) {
	return values.reduce(
		(total, value) => total.plus(value),
		new Prisma.Decimal(0),
	);
}

function candidate(
	overrides: Partial<FractionationCandidate> = {},
): FractionationCandidate {
	return {
		sourcePackageId: 1,
		sourcePackageLotItemId: 11,
		packagedAllocationId: 101,
		allocationId: 1001,
		cartItemId: 10,
		cartId: 100,
		lotItemId: 500,
		availableQuantity: decimal("5"),
		...overrides,
	};
}

const cartAlpha = candidate({
	packagedAllocationId: 101,
	allocationId: 1001,
	cartItemId: 10,
	cartId: 100,
	lotItemId: 500,
	availableQuantity: decimal("5"),
});
const cartBeta = candidate({
	packagedAllocationId: 102,
	allocationId: 1002,
	cartItemId: 11,
	cartId: 200,
	lotItemId: 500,
	availableQuantity: decimal("7"),
});
const cartBetaOtherLotItem = candidate({
	packagedAllocationId: 103,
	allocationId: 1003,
	cartItemId: 11,
	cartId: 200,
	lotItemId: 400,
	availableQuantity: decimal("3"),
});

const allCandidates = [cartBeta, cartBetaOtherLotItem, cartAlpha];

function planShape(groups: ReturnType<typeof planFractionation>) {
	return groups.map((group) => ({
		cartId: group.cartId,
		lines: group.lines.map((line) => [
			line.lotItemId,
			line.quantity.toString(),
			line.allocations.length,
		]),
	}));
}

test("candidates group into one package per cart, ordered deterministically", () => {
	expect(planShape(planFractionation({ candidates: allCandidates }))).toEqual([
		{ cartId: 100, lines: [[500, "5", 1]] },
		{
			cartId: 200,
			lines: [
				[400, "3", 1],
				[500, "7", 1],
			],
		},
	]);
});

test("two allocations for the same cart and lot item merge into one line", () => {
	const secondAllocation = candidate({
		packagedAllocationId: 104,
		allocationId: 1004,
		cartItemId: 12,
		cartId: 100,
		lotItemId: 500,
		availableQuantity: decimal("2.5"),
	});

	const groups = planFractionation({
		candidates: [cartAlpha, secondAllocation],
	});

	expect(groups).toHaveLength(1);
	expect(groups[0]?.lines).toHaveLength(1);
	expect(groups[0]?.lines[0]?.quantity.toString()).toBe("7.5");
	expect(
		groups[0]?.lines[0]?.allocations.map((entry) => entry.allocationId),
	).toEqual([1001, 1004]);
});

test.each([
	[undefined, "15"],
	[[{ packagedAllocationId: 101, quantity: "5" }], "5"],
	[
		[
			{ packagedAllocationId: 101, quantity: "2" },
			{ packagedAllocationId: 102, quantity: "3.25" },
		],
		"5.25",
	],
	[
		[
			{ packagedAllocationId: 101, quantity: "5" },
			{ packagedAllocationId: 102, quantity: "7" },
			{ packagedAllocationId: 103, quantity: "3" },
		],
		"15",
	],
])("the planned quantity always sums to what was taken (%#)", (requested, total) => {
	const groups = planFractionation({
		candidates: allCandidates,
		requested: requested?.map((entry) => ({
			packagedAllocationId: entry.packagedAllocationId,
			quantity: decimal(entry.quantity),
		})),
	});

	const planned = sum(
		groups.flatMap((group) =>
			group.lines.flatMap((line) =>
				line.allocations.map((allocation) => allocation.quantity),
			),
		),
	);

	expect(planned.toString()).toBe(decimal(total).toString());
	// The line quantity is the sum of its own allocations, never an independent number.
	for (const group of groups) {
		for (const line of group.lines) {
			expect(line.quantity.toString()).toBe(
				sum(
					line.allocations.map((allocation) => allocation.quantity),
				).toString(),
			);
		}
	}
});

test("a request takes only the listed allocations", () => {
	const groups = planFractionation({
		candidates: allCandidates,
		requested: [{ packagedAllocationId: 102, quantity: decimal("4") }],
	});

	expect(planShape(groups)).toEqual([{ cartId: 200, lines: [[500, "4", 1]] }]);
});

test("a request above the available quantity is refused", () => {
	expect(() =>
		planFractionation({
			candidates: allCandidates,
			requested: [{ packagedAllocationId: 101, quantity: decimal("5.0001") }],
		}),
	).toThrow(AdminCrudError);
});

test("a request for an unknown packaged allocation is refused", () => {
	expect(() =>
		planFractionation({
			candidates: allCandidates,
			requested: [{ packagedAllocationId: 999, quantity: decimal("1") }],
		}),
	).toThrow(AdminCrudError);
});

test("a request repeating a packaged allocation is refused", () => {
	expect(() =>
		planFractionation({
			candidates: allCandidates,
			requested: [
				{ packagedAllocationId: 101, quantity: decimal("1") },
				{ packagedAllocationId: 101, quantity: decimal("1") },
			],
		}),
	).toThrow(AdminCrudError);
});

test("a negative request is refused", () => {
	expect(() =>
		planFractionation({
			candidates: allCandidates,
			requested: [{ packagedAllocationId: 101, quantity: decimal("-1") }],
		}),
	).toThrow(AdminCrudError);
});

test("zero-quantity candidates and requests drop out entirely", () => {
	expect(
		planFractionation({
			candidates: [candidate({ availableQuantity: decimal("0") })],
		}),
	).toEqual([]);

	expect(
		planFractionation({
			candidates: allCandidates,
			requested: [{ packagedAllocationId: 101, quantity: decimal("0") }],
		}),
	).toEqual([]);
});

test("an empty candidate list plans nothing", () => {
	expect(planFractionation({ candidates: [] })).toEqual([]);
});
