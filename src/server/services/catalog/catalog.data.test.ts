import { describe, expect, it, vi } from "vitest";

import { listCatalogCategories } from "./catalog.data";

vi.mock("server-only", () => ({}));

describe("listCatalogCategories", () => {
	it("excludes hidden categories and those without a purchasable product", async () => {
		const findMany = vi.fn().mockResolvedValue([]);
		const now = new Date("2026-11-13T12:00:00.000Z");

		await listCatalogCategories({ category: { findMany } } as never, now);

		expect(findMany).toHaveBeenCalledWith({
			where: {
				active: true,
				deleted: false,
				products: {
					some: {
						active: true,
						deleted: false,
						productClientTerms: {
							some: {
								active: true,
								deleted: false,
								fromDate: { lte: now },
								OR: [{ toDate: null }, { toDate: { gte: now } }],
							},
						},
					},
				},
			},
			select: {
				id: true,
				name: true,
				sortOrder: true,
				photoBackgroundColor: true,
				active: true,
				deleted: true,
			},
			orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
		});
	});
});
