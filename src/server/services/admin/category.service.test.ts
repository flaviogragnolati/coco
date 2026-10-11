import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./category.data", () => ({
	createCategory: vi.fn(),
	findCategoryById: vi.fn(),
	getCategoryRelationCounts: vi.fn(),
	getCategoryStats: vi.fn(),
	hardDeleteCategory: vi.fn(),
	listCategories: vi.fn(),
	softDeleteCategory: vi.fn(),
	updateCategory: vi.fn(),
}));

vi.mock("./_base/admin-audit", () => ({
	writeAdminAuditLog: vi.fn(),
}));

import { AdminCrudError } from "./_base/admin-crud.errors";
import * as data from "./category.data";
import * as service from "./category.service";

const actor = { id: "admin-1", name: "Admin Uno", role: "admin" as const };

const frutosSecos = {
	id: 1,
	name: "Frutos secos",
	sortOrder: 1,
	active: true,
	deleted: false,
	createdAt: new Date("2026-10-11T00:00:00.000Z"),
	updatedAt: new Date("2026-10-11T00:00:00.000Z"),
};

function database(clash: { id: number } | null) {
	const tx = { category: { findFirst: vi.fn(async () => clash) } };
	return {
		tx,
		db: {
			$transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		} as unknown as Parameters<typeof service.create>[2],
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("category names", () => {
	it("refuses a second live category with the same name", async () => {
		const { db } = database({ id: 1 });

		await expect(
			service.create(
				{ name: "frutos secos ", sortOrder: 7, active: true },
				actor,
				db,
			),
		).rejects.toBeInstanceOf(AdminCrudError);
		expect(data.createCategory).not.toHaveBeenCalled();
	});

	it("lets a category keep its own name on update", async () => {
		const { db, tx } = database(null);
		vi.mocked(data.findCategoryById).mockResolvedValue(frutosSecos as never);
		vi.mocked(data.updateCategory).mockResolvedValue(frutosSecos as never);

		await service.update(
			{ id: 1, name: "Frutos secos", sortOrder: 1, active: true },
			actor,
			db,
		);

		expect(tx.category.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: { not: 1 }, deleted: false }),
			}),
		);
		expect(data.updateCategory).toHaveBeenCalled();
	});
});
