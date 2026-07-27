import "server-only";

import type {
	CartItemFulfillmentStatus,
	Prisma,
	UserOrderStatus,
} from "~/prisma/client";

export type UserOrderClosureSnapshot = {
	status: UserOrderStatus;
	itemStatuses: CartItemFulfillmentStatus[];
};

const userOrderClosureSelect = {
	status: true,
	items: {
		select: { sourceCartItem: { select: { fulfillmentStatus: true } } },
	},
} satisfies Prisma.UserOrderSelect;

/**
 * Distinct orders the given cart items belong to. Distinct because the unique is
 * on `(userOrderId, sourceCartItemId)`, not on `sourceCartItemId` alone — one
 * cart item can in principle back items in more than one order.
 */
export async function findUserOrderIdsForCartItems(
	tx: Prisma.TransactionClient,
	cartItemIds: number[],
): Promise<number[]> {
	if (cartItemIds.length === 0) return [];

	const rows = await tx.userOrderItem.findMany({
		where: { sourceCartItemId: { in: cartItemIds } },
		select: { userOrderId: true },
		distinct: ["userOrderId"],
	});

	return rows.map((row) => row.userOrderId);
}

/**
 * The order's own status plus every item's derived fulfillment status. Deleted
 * cart items are deliberately **not** filtered out: `deriveFulfillmentStatus`
 * already returns `cancelled` for them, which is terminal, and dropping them
 * would let an order close on a subset of what the customer asked for.
 */
export async function loadUserOrderClosureSnapshot(
	tx: Prisma.TransactionClient,
	userOrderId: number,
): Promise<UserOrderClosureSnapshot | null> {
	const record = await tx.userOrder.findUnique({
		where: { id: userOrderId },
		select: userOrderClosureSelect,
	});
	if (!record) return null;

	return {
		status: record.status,
		itemStatuses: record.items.map(
			(item) => item.sourceCartItem.fulfillmentStatus,
		),
	};
}
