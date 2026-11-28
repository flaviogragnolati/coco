/**
 * Pure view model for `/my-orders`: filtering by status group and sorting by
 * date, entirely client-side over the full list `orders.listMine` already
 * returns. No React, no I/O — unit-tested in `order-list-view.test.ts`.
 *
 * Mirrors the pure-model shape of `src/features/checkout/finish-order.ts`.
 */

import type { OrderListItem } from "~/shared/common/checkout.types";
import {
	type OrderStatusFilterKey,
	orderStatusFilterGroups,
	orderStatusFilterKeys,
} from "~/shared/common/order-display";

export type OrderListSort = "newest" | "oldest";

export type OrderListViewInput = {
	filter: OrderStatusFilterKey;
	sort: OrderListSort;
};

function matchesFilter(order: OrderListItem, filter: OrderStatusFilterKey) {
	if (filter === "all") return true;
	return orderStatusFilterGroups[filter].statuses.includes(order.status);
}

/**
 * Filtered + sorted copy of `orders`. Ties on `createdAt` break by `id` in the
 * same direction, mirroring the server's `createdAt desc, id desc` so the
 * default view matches the order the list arrives in.
 */
export function applyOrderListView(
	orders: OrderListItem[],
	view: OrderListViewInput,
): OrderListItem[] {
	const direction = view.sort === "newest" ? -1 : 1;

	return orders
		.filter((order) => matchesFilter(order, view.filter))
		.sort((left, right) => {
			const byDate = left.createdAt.getTime() - right.createdAt.getTime();
			if (byDate !== 0) return byDate * direction;
			return (left.id - right.id) * direction;
		});
}

/** Chip counters — always computed over the full list, never over the filtered one. */
export function countOrdersByFilter(
	orders: OrderListItem[],
): Record<OrderStatusFilterKey, number> {
	const counts = Object.fromEntries(
		orderStatusFilterKeys.map((key) => [key, 0]),
	) as Record<OrderStatusFilterKey, number>;

	counts.all = orders.length;
	for (const order of orders) {
		for (const key of orderStatusFilterKeys) {
			if (key === "all") continue;
			if (matchesFilter(order, key)) counts[key] += 1;
		}
	}

	return counts;
}

/**
 * What an order row is called: its products, not its code. "Almendra",
 * "Almendra y Nuez", "Almendra, Nuez y Dátil", "Almendra, Nuez y 2 más".
 */
export function formatOrderItemNames(names: readonly string[]) {
	const [first, second, third] = names;
	if (!first) return "Sin productos";
	if (!second) return first;
	if (names.length === 2) return `${first} y ${second}`;
	if (names.length === 3) return `${first}, ${second} y ${third}`;
	return `${first}, ${second} y ${names.length - 2} más`;
}
