import { describe, expect, it } from "vitest";

import { categoryIdsByName } from "./catalog-categories";

describe("categoryIdsByName", () => {
	it("maps each name to its live row, skipping deleted namesakes", () => {
		const ids = categoryIdsByName(
			[
				{ id: 1, name: "Frutos secos", deleted: true },
				{ id: 2, name: "Frutos secos", deleted: false },
				{ id: 3, name: "Suplementos", deleted: false },
			],
			["Frutos secos", "Suplementos", "Frutos secos"],
		);

		expect([...ids]).toEqual([
			["Frutos secos", 2],
			["Suplementos", 3],
		]);
	});

	it("names every missing or ambiguous category at once", () => {
		expect(() =>
			categoryIdsByName(
				[
					{ id: 1, name: "Suplementos", deleted: false },
					{ id: 2, name: "Suplementos", deleted: false },
				],
				["Frutos secos", "Suplementos"],
			),
		).toThrow(
			'falta la categoría "Frutos secos"; hay 2 categorías "Suplementos" (ids 1, 2)',
		);
	});
});
