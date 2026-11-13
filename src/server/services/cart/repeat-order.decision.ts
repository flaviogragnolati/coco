import { toNumber, toQuantityString } from "~/shared/common/commerce.helpers";
import type { OrderStatus } from "~/shared/common/order-display";
import { readSnapshotProduct } from "~/shared/common/product-snapshot";

export type RepeatLine = {
	productId: number | null;
	name: string;
	quantity: string;
	/** The first line's snapshot, for the unit an unavailable line is shown in. */
	productSnapshot: unknown;
};

/**
 * The products of an earlier order, one per product in order of first
 * appearance. Lines bought under different terms of the same product add up;
 * a line whose snapshot names no product stays on its own with a null id.
 */
export function collectRepeatLines(
	items: { quantity: string; productSnapshot: unknown }[],
): RepeatLine[] {
	const lines: RepeatLine[] = [];
	const lineByProductId = new Map<number, RepeatLine>();

	for (const item of items) {
		const product = readSnapshotProduct(item.productSnapshot);
		const existing =
			product.id === null ? undefined : lineByProductId.get(product.id);

		if (existing) {
			existing.quantity = toQuantityString(
				(toNumber(existing.quantity) ?? 0) + (toNumber(item.quantity) ?? 0),
			);
			continue;
		}

		const line: RepeatLine = {
			productId: product.id,
			name: product.name,
			quantity: item.quantity,
			productSnapshot: item.productSnapshot,
		};
		lines.push(line);
		if (product.id !== null) lineByProductId.set(product.id, line);
	}

	return lines;
}

export type RepeatGate = "orderPending" | "waitingOrder" | "allowed";

/**
 * Whether an order may be repeated now. Repeating edits the cart, and editing
 * a cart at checkout would cancel the order waiting for its payment; refusing
 * instead keeps that payment untouched.
 */
export function decideRepeatGate(input: {
	orderStatus: OrderStatus;
	hasWaitingOrder: boolean;
}): RepeatGate {
	if (input.orderStatus === "pending") return "orderPending";
	if (input.hasWaitingOrder) return "waitingOrder";
	return "allowed";
}
