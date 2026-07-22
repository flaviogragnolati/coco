import { expect, test } from "vitest";
import {
	type FulfillmentLineageCounts,
	hasFulfillmentLineage,
} from "./operations-cart.data";

function counts(
	input: Partial<FulfillmentLineageCounts> = {},
): FulfillmentLineageCounts {
	return {
		rollOvers: input.rollOvers ?? 0,
		cartItemLotItems: input.cartItemLotItems ?? 0,
		userOrderItems: input.userOrderItems ?? 0,
	};
}

test("an item with no operational links has no lineage", () => {
	expect(hasFulfillmentLineage(counts())).toBe(false);
});

test.each([
	["rollOvers", { rollOvers: 1 }],
	["cartItemLotItems", { cartItemLotItems: 1 }],
	["userOrderItems", { userOrderItems: 1 }],
] as const)("a %s row alone establishes lineage", (_label, input) => {
	expect(hasFulfillmentLineage(counts(input))).toBe(true);
});

// Tracking rows are history, not lineage: an item whose only link is an
// `addedToCart` event stays hard-deletable. A raw Prisma `_count` carrying
// trackingEvents still satisfies FulfillmentLineageCounts, and is ignored.
test("tracking events do not establish lineage", () => {
	const rawCount = { ...counts(), trackingEvents: 3 };

	expect(hasFulfillmentLineage(rawCount)).toBe(false);
});
