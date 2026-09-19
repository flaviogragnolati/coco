import { expect, test } from "vitest";

import { isConfirmBlocked } from "./supplier-order-confirm.decision";

const lotItems = [{ quantity: "10" }];

test("confirming everything is not blocked", () => {
	expect(isConfirmBlocked(lotItems, [{ confirmedQuantity: "10" }])).toBe(false);
});

test("a quantity above the request blocks", () => {
	expect(isConfirmBlocked(lotItems, [{ confirmedQuantity: "11" }])).toBe(true);
});

test("an unparsable quantity blocks", () => {
	expect(isConfirmBlocked(lotItems, [{ confirmedQuantity: "abc" }])).toBe(true);
});

test("a manual split that does not add up to the cut blocks", () => {
	expect(
		isConfirmBlocked(lotItems, [
			{ confirmedQuantity: "5", overrides: [{ removedQuantity: "3" }] },
		]),
	).toBe(true);
});

test("a manual split that adds up to the cut is not blocked", () => {
	expect(
		isConfirmBlocked(lotItems, [
			{
				confirmedQuantity: "5",
				overrides: [{ removedQuantity: "3" }, { removedQuantity: "2" }],
			},
		]),
	).toBe(false);
});

// The split was seeded for a cut of 5, then the line went to 0.
test("a line confirmed at 0 ignores a split left over from a partial cut", () => {
	expect(
		isConfirmBlocked(lotItems, [
			{
				confirmedQuantity: "0",
				overrides: [{ removedQuantity: "3" }, { removedQuantity: "2" }],
			},
		]),
	).toBe(false);
});

test("a missing line blocks", () => {
	expect(isConfirmBlocked(lotItems, [])).toBe(true);
});
