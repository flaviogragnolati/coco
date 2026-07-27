import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import { AdminCrudError } from "./_base/admin-crud.errors";
import {
	type CompensationLot,
	type CompensationRollOver,
	type OperationCompensationRecord,
	planOperationCompensation,
} from "./operation-compensation";

const OPERATION_ID = 900;

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

function cartItem(id: number, cartId = id * 10) {
	return { id, cart: { id: cartId } };
}

function lot(overrides: Partial<CompensationLot> = {}): CompensationLot {
	return {
		id: 1,
		status: "assembling",
		supplierOrder: {
			id: 1,
			code: "SORD-1",
			status: "pending",
			lots: [{ id: 1, operationId: OPERATION_ID }],
		},
		lotItems: [],
		...overrides,
	};
}

function rollOver(
	overrides: Partial<CompensationRollOver> = {},
): CompensationRollOver {
	return {
		id: 1,
		status: "open",
		quantity: decimal("2"),
		cartItem: cartItem(1),
		...overrides,
	};
}

function record(
	overrides: Partial<OperationCompensationRecord> = {},
): OperationCompensationRecord {
	return {
		id: OPERATION_ID,
		code: "OP-900",
		lots: [],
		rollOvers: [],
		...overrides,
	};
}

function excludedQuantity(
	plan: ReturnType<typeof planOperationCompensation>,
	cartItemId: number,
) {
	return plan.affectedCartItems.find((entry) => entry.cartItemId === cartItemId)
		?.quantity;
}

test("a fully allocated cart item gets its whole allocation back", () => {
	const plan = planOperationCompensation(
		record({
			lots: [
				lot({
					lotItems: [
						{
							id: 11,
							status: "pending",
							cartItemLotItems: [
								{ id: 101, quantity: decimal("8"), cartItem: cartItem(1) },
							],
						},
					],
				}),
			],
		}),
	);

	expect(plan.lotIds).toEqual([1]);
	expect(plan.lotItemIds).toEqual([11]);
	expect(plan.supplierOrderIds).toEqual([1]);
	expect(plan.affectedCartItems).toEqual([
		{ cartItemId: 1, cartId: 10, quantity: "8" },
	]);
});

test("a partially rolled-over cart item gets allocation plus its open roll over", () => {
	// The included event carried 10: 8 assigned and 2 rolled over pre-allocation.
	const plan = planOperationCompensation(
		record({
			lots: [
				lot({
					lotItems: [
						{
							id: 11,
							status: "pending",
							cartItemLotItems: [
								{ id: 101, quantity: decimal("8"), cartItem: cartItem(1) },
							],
						},
					],
				}),
			],
			rollOvers: [rollOver({ id: 51, quantity: decimal("2") })],
		}),
	);

	expect(excludedQuantity(plan, 1)).toBe("10");
	expect(plan.createdRollOverIds).toEqual([51]);
});

test("allocations of one cart item across several lot items are aggregated", () => {
	const plan = planOperationCompensation(
		record({
			lots: [
				lot({
					lotItems: [
						{
							id: 11,
							status: "pending",
							cartItemLotItems: [
								{ id: 101, quantity: decimal("3"), cartItem: cartItem(1) },
							],
						},
						{
							id: 12,
							status: "pending",
							cartItemLotItems: [
								{ id: 102, quantity: decimal("4"), cartItem: cartItem(1) },
								{ id: 103, quantity: decimal("5"), cartItem: cartItem(2) },
							],
						},
					],
				}),
			],
		}),
	);

	expect(plan.affectedCartItems).toEqual([
		{ cartItemId: 1, cartId: 10, quantity: "7" },
		{ cartItemId: 2, cartId: 20, quantity: "5" },
	]);
});

test("a supplier order already cancelled through the supplier loop is skipped", () => {
	// Its lines are already cancelled and its demand already rolled over, so the
	// compensation neither cancels it again nor returns its quantity twice.
	const plan = planOperationCompensation(
		record({
			lots: [
				lot({
					id: 1,
					status: "cancelled",
					supplierOrder: {
						id: 1,
						code: "SORD-1",
						status: "cancelled",
						lots: [{ id: 1, operationId: OPERATION_ID }],
					},
					lotItems: [
						{
							id: 11,
							status: "cancelled",
							cartItemLotItems: [
								{ id: 101, quantity: decimal("8"), cartItem: cartItem(1) },
							],
						},
					],
				}),
				lot({
					id: 2,
					supplierOrder: {
						id: 2,
						code: "SORD-2",
						status: "pending",
						lots: [{ id: 2, operationId: OPERATION_ID }],
					},
					lotItems: [
						{
							id: 21,
							status: "pending",
							cartItemLotItems: [
								{ id: 201, quantity: decimal("4"), cartItem: cartItem(2) },
							],
						},
					],
				}),
			],
			// The supplier-loop cancellation minted this one; it stays open and keeps
			// cart item 1 out of the original-demand query.
			rollOvers: [
				rollOver({ id: 51, quantity: decimal("8"), cartItem: cartItem(1) }),
			],
		}),
	);

	expect(plan.lotIds).toEqual([2]);
	expect(plan.lotItemIds).toEqual([21]);
	expect(plan.supplierOrderIds).toEqual([2]);
	expect(excludedQuantity(plan, 1)).toBe("8");
	expect(excludedQuantity(plan, 2)).toBe("4");
});

test("an allocation fully absorbed by a Phase 1 cut emits no zero-quantity notice", () => {
	const plan = planOperationCompensation(
		record({
			lots: [
				lot({
					lotItems: [
						{
							id: 11,
							status: "confirmed",
							cartItemLotItems: [
								{ id: 101, quantity: decimal("0"), cartItem: cartItem(1) },
								{ id: 102, quantity: decimal("6"), cartItem: cartItem(2) },
							],
						},
					],
				}),
			],
		}),
	);

	expect(plan.affectedCartItems).toEqual([
		{ cartItemId: 2, cartId: 20, quantity: "6" },
	]);
});

test("resolved and cancelled roll overs are not returned to the pool", () => {
	const plan = planOperationCompensation(
		record({
			rollOvers: [
				rollOver({ id: 51, status: "resolved", cartItem: cartItem(1) }),
				rollOver({ id: 52, status: "cancelled", cartItem: cartItem(2) }),
				rollOver({ id: 53, status: "open", cartItem: cartItem(3) }),
			],
		}),
	);

	expect(plan.createdRollOverIds).toEqual([53]);
	expect(plan.affectedCartItems).toEqual([
		{ cartItemId: 3, cartId: 30, quantity: "2" },
	]);
});

test("conservation: excluded quantity equals what the operation included", () => {
	// Cart item 1 entered with 10 (8 assigned, 2 cut by the supplier); cart item 2
	// entered with 5 and was assigned in full.
	const included = new Map([
		[1, decimal("10")],
		[2, decimal("5")],
	]);

	const plan = planOperationCompensation(
		record({
			lots: [
				lot({
					lotItems: [
						{
							id: 11,
							status: "confirmed",
							cartItemLotItems: [
								{ id: 101, quantity: decimal("8"), cartItem: cartItem(1) },
								{ id: 102, quantity: decimal("5"), cartItem: cartItem(2) },
							],
						},
					],
				}),
			],
			rollOvers: [
				rollOver({ id: 51, quantity: decimal("2"), cartItem: cartItem(1) }),
			],
		}),
	);

	for (const entry of plan.affectedCartItems) {
		expect(decimal(entry.quantity).equals(included.get(entry.cartItemId) ?? 0));
	}
	expect(plan.affectedCartItems.map((entry) => entry.quantity)).toEqual([
		"10",
		"5",
	]);
});

test("a supplier order outside the administrative window is refused", () => {
	expect(() =>
		planOperationCompensation(
			record({
				lots: [
					lot({
						supplierOrder: {
							id: 1,
							code: "SORD-1",
							status: "requested",
							lots: [{ id: 1, operationId: OPERATION_ID }],
						},
					}),
				],
			}),
		),
	).toThrow(AdminCrudError);
});

test("a supplier order holding lots of another operation is refused", () => {
	expect(() =>
		planOperationCompensation(
			record({
				lots: [
					lot({
						supplierOrder: {
							id: 1,
							code: "SORD-1",
							status: "pending",
							lots: [
								{ id: 1, operationId: OPERATION_ID },
								{ id: 2, operationId: 999 },
							],
						},
					}),
				],
			}),
		),
	).toThrow(/otra operación/);
});
