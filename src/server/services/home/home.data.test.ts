import { expect, test, vi } from "vitest";

import { countPaidOrdersByProduct } from "./home.data";

vi.mock("server-only", () => ({}));

function orderItem(userOrderId: number, productId: number) {
	return {
		userOrderId,
		sourceCartItem: { productClientTerms: { productId } },
	};
}

test("counts paid orders captured in the last 90 days on live requests", async () => {
	const findMany = vi.fn().mockResolvedValue([]);
	const now = new Date("2026-10-08T12:00:00.000Z");

	await countPaidOrdersByProduct({ userOrderItem: { findMany } } as never, now);

	expect(findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				userOrder: {
					status: { in: ["processing", "completed"] },
					transactions: {
						some: {
							status: "completed",
							completedAt: { gte: new Date("2026-07-10T12:00:00.000Z") },
						},
					},
				},
				sourceCartItem: { deleted: false, status: "submitted" },
			},
		}),
	);
});

test("counts distinct orders per product, across its terms rows", async () => {
	const findMany = vi
		.fn()
		.mockResolvedValue([
			orderItem(1, 10),
			orderItem(1, 10),
			orderItem(2, 10),
			orderItem(2, 20),
		]);

	const counts = await countPaidOrdersByProduct(
		{ userOrderItem: { findMany } } as never,
		new Date(),
	);

	expect(Object.fromEntries(counts)).toEqual({ 10: 2, 20: 1 });
});
