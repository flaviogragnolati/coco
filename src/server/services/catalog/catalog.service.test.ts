import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("./catalog.data", () => ({
	listCatalogCategories: vi.fn(),
	listCatalogProducts: vi.fn(),
	findCatalogProductDetail: vi.fn(),
}));

import { listCatalogCategories } from "./catalog.data";
import { categories } from "./catalog.service";

const category = {
	id: 1,
	name: "Frutos secos",
	sortOrder: 2,
	photoBackgroundColor: "#e2c8ab",
	active: true,
	deleted: false,
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("catalog categories", () => {
	it("maps customer category fields in the configured order", async () => {
		vi.mocked(listCatalogCategories).mockResolvedValue([
			category,
			{ ...category, id: 3, name: "Almacén", sortOrder: 5 },
		]);

		await expect(categories()).resolves.toEqual([
			{
				id: 1,
				name: "Frutos secos",
				sortOrder: 2,
				photoBackgroundColor: "#e2c8ab",
			},
			{
				id: 3,
				name: "Almacén",
				sortOrder: 5,
				photoBackgroundColor: "#e2c8ab",
			},
		]);
	});

	it("does not expose inactive or deleted categories if the source includes one", async () => {
		vi.mocked(listCatalogCategories).mockResolvedValue([
			{ ...category, active: false },
			{ ...category, id: 2, deleted: true },
		]);

		await expect(categories()).resolves.toEqual([]);
	});
});
