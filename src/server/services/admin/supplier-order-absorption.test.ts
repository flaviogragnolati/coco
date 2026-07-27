import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import { AdminCrudError } from "./_base/admin-crud.errors";
import {
	type AbsorptionCandidate,
	orderCandidatesLifo,
	planCutAbsorption,
} from "./supplier-order-absorption";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

function candidate(
	overrides: Partial<AbsorptionCandidate> = {},
): AbsorptionCandidate {
	return {
		allocationId: 1,
		cartItemId: 10,
		quantity: decimal("10"),
		paidAt: new Date("2026-01-01T00:00:00.000Z"),
		orderItemCreatedAt: new Date("2026-01-01T00:00:00.000Z"),
		...overrides,
	};
}

const oldest = candidate({
	allocationId: 1,
	cartItemId: 10,
	quantity: decimal("5"),
	paidAt: new Date("2026-01-01T00:00:00.000Z"),
});
const middle = candidate({
	allocationId: 2,
	cartItemId: 11,
	quantity: decimal("7"),
	paidAt: new Date("2026-02-01T00:00:00.000Z"),
});
const newest = candidate({
	allocationId: 3,
	cartItemId: 12,
	quantity: decimal("3"),
	paidAt: new Date("2026-03-01T00:00:00.000Z"),
});

function allocationIds(candidates: AbsorptionCandidate[]) {
	return candidates.map((entry) => entry.allocationId);
}

function sum(values: Prisma.Decimal[]) {
	return values.reduce(
		(total, value) => total.plus(value),
		new Prisma.Decimal(0),
	);
}

test("LIFO orders the newest payment first", () => {
	expect(allocationIds(orderCandidatesLifo([oldest, newest, middle]))).toEqual([
		3, 2, 1,
	]);
});

test("LIFO does not mutate the caller's array", () => {
	const input = [oldest, newest, middle];
	orderCandidatesLifo(input);
	expect(allocationIds(input)).toEqual([1, 3, 2]);
});

test("equal payment dates tie-break by order item creation then cart item id", () => {
	const paidAt = new Date("2026-02-01T00:00:00.000Z");
	const earlierOrderItem = candidate({
		allocationId: 1,
		cartItemId: 10,
		paidAt,
		orderItemCreatedAt: new Date("2026-01-10T00:00:00.000Z"),
	});
	const laterOrderItem = candidate({
		allocationId: 2,
		cartItemId: 11,
		paidAt,
		orderItemCreatedAt: new Date("2026-01-20T00:00:00.000Z"),
	});

	expect(
		allocationIds(orderCandidatesLifo([earlierOrderItem, laterOrderItem])),
	).toEqual([2, 1]);

	const orderItemCreatedAt = new Date("2026-01-10T00:00:00.000Z");
	const lowerCartItem = candidate({
		allocationId: 1,
		cartItemId: 10,
		paidAt,
		orderItemCreatedAt,
	});
	const higherCartItem = candidate({
		allocationId: 2,
		cartItemId: 11,
		paidAt,
		orderItemCreatedAt,
	});

	expect(
		allocationIds(orderCandidatesLifo([lowerCartItem, higherCartItem])),
	).toEqual([2, 1]);
});

test("an allocation without a resolvable payment absorbs first", () => {
	const unpaid = candidate({ allocationId: 9, cartItemId: 99, paidAt: null });

	expect(allocationIds(orderCandidatesLifo([oldest, newest, unpaid]))).toEqual([
		9, 3, 1,
	]);
});

test("a cut smaller than the newest allocation touches exactly one candidate", () => {
	const reductions = planCutAbsorption({
		candidates: [oldest, middle, newest],
		cut: decimal("2"),
	});

	expect(reductions).toHaveLength(1);
	expect(reductions[0]?.allocationId).toBe(3);
	expect(reductions[0]?.removedQuantity.toString()).toBe("2");
	expect(reductions[0]?.remainingQuantity.toString()).toBe("1");
});

test("a cut spanning several allocations walks the LIFO order", () => {
	const reductions = planCutAbsorption({
		candidates: [oldest, middle, newest],
		cut: decimal("11"),
	});

	expect(
		reductions.map((reduction) => [
			reduction.allocationId,
			reduction.removedQuantity.toString(),
		]),
	).toEqual([
		[3, "3"],
		[2, "7"],
		[1, "1"],
	]);
});

test("a cut equal to the total zeroes every candidate", () => {
	const reductions = planCutAbsorption({
		candidates: [oldest, middle, newest],
		cut: decimal("15"),
	});

	expect(reductions).toHaveLength(3);
	expect(
		reductions.every((reduction) => reduction.remainingQuantity.isZero()),
	).toBe(true);
});

test.each([
	["0.5"],
	["2"],
	["7.25"],
	["10"],
	["14.9999"],
	["15"],
])("conservation holds for a cut of %s", (cut) => {
	const reductions = planCutAbsorption({
		candidates: [oldest, middle, newest],
		cut: decimal(cut),
	});

	expect(
		sum(reductions.map((reduction) => reduction.removedQuantity)).equals(
			decimal(cut),
		),
	).toBe(true);
});

test("a cut larger than the assigned demand is refused", () => {
	expect(() =>
		planCutAbsorption({
			candidates: [oldest, middle, newest],
			cut: decimal("16"),
		}),
	).toThrowError(AdminCrudError);

	try {
		planCutAbsorption({
			candidates: [oldest, middle, newest],
			cut: decimal("16"),
		});
	} catch (error) {
		expect((error as AdminCrudError).code).toBe("CONFLICT");
	}
});

test("overrides replace LIFO entirely when they sum to the cut", () => {
	const reductions = planCutAbsorption({
		candidates: [oldest, middle, newest],
		cut: decimal("4"),
		overrides: [
			{ allocationId: 1, removedQuantity: decimal("3") },
			{ allocationId: 2, removedQuantity: decimal("1") },
		],
	});

	expect(
		reductions.map((reduction) => [
			reduction.allocationId,
			reduction.removedQuantity.toString(),
			reduction.remainingQuantity.toString(),
		]),
	).toEqual([
		[1, "3", "2"],
		[2, "1", "6"],
	]);
});

test("a zero-quantity override is dropped but still counts toward the sum check", () => {
	const reductions = planCutAbsorption({
		candidates: [oldest, middle],
		cut: decimal("2"),
		overrides: [
			{ allocationId: 1, removedQuantity: decimal("0") },
			{ allocationId: 2, removedQuantity: decimal("2") },
		],
	});

	expect(reductions.map((reduction) => reduction.allocationId)).toEqual([2]);
});

const invalidOverrides: Array<
	[string, Parameters<typeof planCutAbsorption>[0]]
> = [
	[
		"sums short of the cut",
		{
			candidates: [oldest, middle],
			cut: decimal("4"),
			overrides: [{ allocationId: 1, removedQuantity: decimal("3") }],
		},
	],
	[
		"sums past the cut",
		{
			candidates: [oldest, middle],
			cut: decimal("4"),
			overrides: [
				{ allocationId: 1, removedQuantity: decimal("3") },
				{ allocationId: 2, removedQuantity: decimal("3") },
			],
		},
	],
	[
		"references an unknown allocation",
		{
			candidates: [oldest, middle],
			cut: decimal("4"),
			overrides: [{ allocationId: 404, removedQuantity: decimal("4") }],
		},
	],
	[
		"exceeds one allocation's quantity",
		{
			candidates: [oldest, middle],
			cut: decimal("6"),
			overrides: [{ allocationId: 1, removedQuantity: decimal("6") }],
		},
	],
	[
		"repeats an allocation",
		{
			candidates: [oldest, middle],
			cut: decimal("4"),
			overrides: [
				{ allocationId: 1, removedQuantity: decimal("2") },
				{ allocationId: 1, removedQuantity: decimal("2") },
			],
		},
	],
];

test.each(
	invalidOverrides,
)("an override set that %s is refused", (_, input) => {
	expect(() => planCutAbsorption(input)).toThrowError(AdminCrudError);

	try {
		planCutAbsorption(input);
	} catch (error) {
		expect((error as AdminCrudError).code).toBe("CONFLICT");
	}
});

test("a non-positive cut plans nothing", () => {
	expect(
		planCutAbsorption({ candidates: [oldest], cut: decimal("0") }),
	).toEqual([]);
});
