/**
 * Pure rules for closing a `UserOrder` from the fulfillment state of its items.
 * Sits next to `fulfillment-transitions.ts` and follows the same contract: no
 * runtime dependency, Prisma enums as types only, reachable from client bundles.
 *
 * The whole safety argument is the `processing` gate. `UserOrder.status` is owned
 * by the payment domain (`mercadopago-reconciliation.service.ts` and
 * `checkout.data.ts` are its only other writers); this roll-up only ever writes
 * *from* `processing`, so `refunded`, `chargedBack`, `failed`, `completed` and
 * `cancelled` are all outside its source set and no downgrade of a payment
 * outcome is representable. An allow-list of one, deliberately — a deny-list of
 * statuses to skip would stop being correct the moment `UserOrderStatus` grows.
 */

import type {
	CartItemFulfillmentStatus,
	UserOrderStatus,
} from "~/prisma/client";

/**
 * Demand that will not move again. `rolledOver` is deliberately absent: that
 * demand re-enters aggregation and the customer is still owed it (ADR 0005).
 */
export const terminalFulfillmentStatuses: ReadonlySet<CartItemFulfillmentStatus> =
	new Set(["delivered", "cancelled"]);

/**
 * The status to write, or `null` to leave the order alone — which is the normal
 * outcome on most events, since a single item moving rarely closes an order.
 */
export function deriveUserOrderClosure(input: {
	currentStatus: UserOrderStatus;
	itemStatuses: CartItemFulfillmentStatus[];
}): UserOrderStatus | null {
	if (input.currentStatus !== "processing") return null;
	if (input.itemStatuses.length === 0) return null;

	const allTerminal = input.itemStatuses.every((status) =>
		terminalFulfillmentStatuses.has(status),
	);
	if (!allTerminal) return null;

	return input.itemStatuses.some((status) => status === "delivered")
		? "completed"
		: "cancelled";
}
