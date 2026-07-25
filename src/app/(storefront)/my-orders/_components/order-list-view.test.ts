import { expect, test } from "vitest";

import type { OrderListItem } from "~/shared/common/checkout.types";
import { applyOrderListView, countOrdersByFilter } from "./order-list-view";

function makeOrder(overrides: Partial<OrderListItem> = {}): OrderListItem {
	return {
		id: 1,
		code: "ORD-1",
		status: "pending",
		createdAt: new Date("2026-01-01T10:00:00.000Z"),
		updatedAt: new Date("2026-01-01T10:00:00.000Z"),
		itemCount: 1,
		totalAmount: "100.00",
		currency: "ARS",
		latestTransactionStatus: "pending",
		...overrides,
	};
}

const ALL_STATUSES: OrderListItem["status"][] = [
	"pending",
	"processing",
	"completed",
	"cancelled",
	"failed",
	"refunded",
	"chargedBack",
];

const oneOfEach = ALL_STATUSES.map((status, index) =>
	makeOrder({
		id: index + 1,
		code: `ORD-${index + 1}`,
		createdAt: new Date(`2026-01-0${index + 1}T10:00:00.000Z`),
		status,
	}),
);

function statusesOf(orders: OrderListItem[]) {
	return orders.map((order) => order.status);
}

test("all keeps every order", () => {
	const result = applyOrderListView(oneOfEach, {
		filter: "all",
		sort: "newest",
	});
	expect(result).toHaveLength(ALL_STATUSES.length);
});

test("inProgress matches pending + processing", () => {
	const result = applyOrderListView(oneOfEach, {
		filter: "inProgress",
		sort: "oldest",
	});
	expect(statusesOf(result)).toStrictEqual(["pending", "processing"]);
});

test("completed matches only completed", () => {
	const result = applyOrderListView(oneOfEach, {
		filter: "completed",
		sort: "oldest",
	});
	expect(statusesOf(result)).toStrictEqual(["completed"]);
});

test("cancelled groups cancelled + failed", () => {
	const result = applyOrderListView(oneOfEach, {
		filter: "cancelled",
		sort: "oldest",
	});
	expect(statusesOf(result)).toStrictEqual(["cancelled", "failed"]);
});

test("refunded groups refunded + chargedBack", () => {
	const result = applyOrderListView(oneOfEach, {
		filter: "refunded",
		sort: "oldest",
	});
	expect(statusesOf(result)).toStrictEqual(["refunded", "chargedBack"]);
});

test("newest and oldest are exact inverses", () => {
	const newest = applyOrderListView(oneOfEach, {
		filter: "all",
		sort: "newest",
	});
	const oldest = applyOrderListView(oneOfEach, {
		filter: "all",
		sort: "oldest",
	});
	expect(newest.map((order) => order.id)).toStrictEqual(
		oldest.map((order) => order.id).reverse(),
	);
	expect(newest.at(0)?.id).toBe(ALL_STATUSES.length);
	expect(oldest.at(0)?.id).toBe(1);
});

test("same createdAt breaks the tie by id, in the sort direction", () => {
	const sameInstant = new Date("2026-02-01T10:00:00.000Z");
	const orders = [
		makeOrder({ id: 2, createdAt: sameInstant }),
		makeOrder({ id: 5, createdAt: sameInstant }),
		makeOrder({ id: 3, createdAt: sameInstant }),
	];

	expect(
		applyOrderListView(orders, { filter: "all", sort: "newest" }).map(
			(order) => order.id,
		),
	).toStrictEqual([5, 3, 2]);
	expect(
		applyOrderListView(orders, { filter: "all", sort: "oldest" }).map(
			(order) => order.id,
		),
	).toStrictEqual([2, 3, 5]);
});

test("empty list stays empty", () => {
	expect(
		applyOrderListView([], { filter: "all", sort: "newest" }),
	).toStrictEqual([]);
	expect(countOrdersByFilter([])).toStrictEqual({
		all: 0,
		inProgress: 0,
		completed: 0,
		cancelled: 0,
		refunded: 0,
	});
});

test("does not mutate or reorder the input array", () => {
	const orders = [
		makeOrder({ id: 1, createdAt: new Date("2026-01-01T10:00:00.000Z") }),
		makeOrder({ id: 2, createdAt: new Date("2026-03-01T10:00:00.000Z") }),
		makeOrder({ id: 3, createdAt: new Date("2026-02-01T10:00:00.000Z") }),
	];
	const snapshot = orders.map((order) => order.id);

	applyOrderListView(orders, { filter: "all", sort: "newest" });

	expect(orders.map((order) => order.id)).toStrictEqual(snapshot);
});

test("counts cover every group and ignore the current filter", () => {
	expect(countOrdersByFilter(oneOfEach)).toStrictEqual({
		all: 7,
		inProgress: 2,
		completed: 1,
		cancelled: 2,
		refunded: 2,
	});
});
