import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import {
	computeOperationCounters,
	type OperationCounterInputs,
} from "./operation-counters";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

/**
 * The shape `executeOperation` leaves behind: one supplier order, one lot, two
 * lines, three allocations across two cart items, one pre-allocation roll over.
 */
function executedShape(): OperationCounterInputs {
	return {
		lots: [
			{
				status: "assembling",
				supplierOrderId: 500,
				lotItems: [
					{
						status: "pending",
						quantity: decimal("8"),
						cartItemLotItems: [
							{ cartItemId: 10, quantity: decimal("5") },
							{ cartItemId: 11, quantity: decimal("3") },
						],
					},
					{
						status: "pending",
						quantity: decimal("4"),
						cartItemLotItems: [{ cartItemId: 10, quantity: decimal("4") }],
					},
				],
			},
		],
		rollOvers: [{ cartItemId: 11, status: "open", quantity: decimal("2") }],
	};
}

test("a freshly executed shape reproduces the executed numbers", () => {
	const counters = computeOperationCounters(executedShape());

	expect(counters.assignedQuantity.toString()).toBe("12");
	expect(counters.rollOverQuantity.toString()).toBe("2");
	expect(counters.assignedItemCount).toBe(2);
	expect(counters.rollOverItemCount).toBe(1);
	expect(counters.lotCount).toBe(1);
	expect(counters.supplierOrderCount).toBe(1);
});

test("a cancelled lot item drops out of the assigned quantity", () => {
	const input = executedShape();
	const lot = input.lots[0];
	if (!lot?.lotItems[1]) throw new Error("fixture");
	lot.lotItems[1].status = "cancelled";

	const counters = computeOperationCounters(input);

	expect(counters.assignedQuantity.toString()).toBe("8");
	expect(counters.assignedItemCount).toBe(2);
});

test("a cancelled lot removes every one of its lines", () => {
	const input = executedShape();
	const lot = input.lots[0];
	if (!lot) throw new Error("fixture");
	lot.status = "cancelled";

	const counters = computeOperationCounters(input);

	expect(counters.assignedQuantity.toString()).toBe("0");
	expect(counters.assignedItemCount).toBe(0);
	// The lot row still exists, so the output count is unchanged.
	expect(counters.lotCount).toBe(1);
});

test("an allocation cut to zero stops counting toward the item count", () => {
	const input = executedShape();
	const lot = input.lots[0];
	if (!lot?.lotItems[0] || !lot.lotItems[1]) throw new Error("fixture");
	lot.lotItems[0].quantity = decimal("5");
	lot.lotItems[0].cartItemLotItems = [
		{ cartItemId: 10, quantity: decimal("5") },
		{ cartItemId: 11, quantity: decimal("0") },
	];
	lot.lotItems[1].status = "cancelled";

	const counters = computeOperationCounters(input);

	expect(counters.assignedQuantity.toString()).toBe("5");
	expect(counters.assignedItemCount).toBe(1);
});

test("a resolved roll over still counts and a cancelled one does not", () => {
	const resolved = executedShape();
	if (!resolved.rollOvers[0]) throw new Error("fixture");
	resolved.rollOvers[0].status = "resolved";

	expect(computeOperationCounters(resolved).rollOverQuantity.toString()).toBe(
		"2",
	);
	expect(computeOperationCounters(resolved).rollOverItemCount).toBe(1);

	const cancelled = executedShape();
	if (!cancelled.rollOvers[0]) throw new Error("fixture");
	cancelled.rollOvers[0].status = "cancelled";

	expect(computeOperationCounters(cancelled).rollOverQuantity.toString()).toBe(
		"0",
	);
	expect(computeOperationCounters(cancelled).rollOverItemCount).toBe(0);
});

test("a partial cut conserves the balance between assigned and rolled over", () => {
	const input = executedShape();
	const lot = input.lots[0];
	if (!lot?.lotItems[0]) throw new Error("fixture");
	lot.lotItems[0].quantity = decimal("6");
	lot.lotItems[0].cartItemLotItems = [
		{ cartItemId: 10, quantity: decimal("5") },
		{ cartItemId: 11, quantity: decimal("1") },
	];
	input.rollOvers.push({
		cartItemId: 11,
		status: "open",
		quantity: decimal("2"),
	});

	const counters = computeOperationCounters(input);

	expect(
		counters.assignedQuantity.plus(counters.rollOverQuantity).toString(),
	).toBe("14");
});

test("lots without a supplier order do not inflate the supplier order count", () => {
	const input = executedShape();
	input.lots.push({
		status: "assembling",
		supplierOrderId: null,
		lotItems: [],
	});

	const counters = computeOperationCounters(input);

	expect(counters.lotCount).toBe(2);
	expect(counters.supplierOrderCount).toBe(1);
});
