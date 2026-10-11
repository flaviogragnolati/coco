import { describe, expect, it } from "vitest";

import type { PriceSheetChange } from "~/shared/common/admin-crud/price-sheet.types";
import type { PriceSheetRow } from "./price-sheet.file";
import {
	type PriceSheetCategory,
	type PriceSheetProduct,
	planPriceSheet,
	stalePriceSheetProductIds,
} from "./price-sheet.plan";

const nuts = { id: 1, name: "Frutos secos" };
const oils = { id: 2, name: "Aceites y despensa" };

const categories: PriceSheetCategory[] = [
	{ ...nuts, active: true },
	{ ...oils, active: true },
	{ id: 3, name: "Suplementos", active: false },
	{ id: 4, name: "Semillas", active: true },
	{ id: 5, name: "SEMILLAS", active: true },
];

function product(
	id: number,
	overrides: Partial<PriceSheetProduct> = {},
): PriceSheetProduct {
	return {
		id,
		name: `Producto ${id}`,
		unitLabel: "kg",
		deleted: false,
		category: nuts,
		terms: {
			id: id * 10,
			currency: "ARS",
			unitPrice: "1000.00",
			moq: "0.5",
			moqPrice: "500.00",
		},
		...overrides,
	};
}

const products = [
	product(1),
	product(2),
	product(3, { terms: null }),
	product(4, { deleted: true }),
	product(5, {
		terms: {
			id: 50,
			currency: "ARS",
			unitPrice: null,
			moq: "2",
			moqPrice: "3000.00",
		},
	}),
];

function row(
	id: string | null,
	newPrice: string | null = null,
	category: string | null = null,
): PriceSheetRow {
	const cell = (text: string | null) =>
		text === null ? null : { text, numeric: false };
	return {
		rowNumber: 2,
		id: cell(id),
		newPrice: cell(newPrice),
		category: cell(category),
	};
}

/** Numbers the rows as a sheet would: the header is row 1. */
function plan(...rows: PriceSheetRow[]) {
	return planPriceSheet(
		rows.map((sheetRow, index) => ({ ...sheetRow, rowNumber: index + 2 })),
		products,
		categories,
	);
}

describe("planPriceSheet", () => {
	it("ignores rows that change nothing", () => {
		const result = plan(row("1"), row("2", "1000", "frutos secos"));

		expect(result).toMatchObject({
			rows: [],
			changes: [],
			unchangedCount: 2,
			errorCount: 0,
			canApply: false,
		});
	});

	it("plans a price change with its variation", () => {
		const result = plan(row("1", "1.250,50"));

		expect(result.rows).toEqual([
			{
				rowNumber: 2,
				productId: 1,
				productName: "Producto 1",
				unitLabel: "kg",
				currency: "ARS",
				price: { current: "1000.00", next: "1250.50", variationPercent: 25.1 },
				category: null,
				largeVariation: false,
				errors: [],
			},
		]);
		expect(result.changes).toEqual([
			{
				productId: 1,
				termsId: 10,
				price: { from: "1000.00", to: "1250.50" },
				category: null,
			},
		]);
		expect(result.canApply).toBe(true);
	});

	it("flags a variation above ±30 % without blocking", () => {
		const result = plan(row("1", "1300"), row("2", "1300,01"));
		const result2 = plan(row("1", "690"));

		expect(result.rows.map((r) => r.largeVariation)).toEqual([false, true]);
		expect(result.largeVariationCount).toBe(1);
		expect(result.canApply).toBe(true);
		expect(result2.rows[0]).toMatchObject({
			largeVariation: true,
			price: { variationPercent: -31 },
		});
	});

	it("reads a number cell without guessing separators", () => {
		const result = planPriceSheet(
			[
				{
					rowNumber: 2,
					id: { text: "1", numeric: true },
					newPrice: { text: "1100.000000000001", numeric: true },
					category: null,
				},
			],
			products,
			categories,
		);

		expect(result.changes[0]?.price).toEqual({
			from: "1000.00",
			to: "1100.00",
		});
	});

	it("resolves the category by name, ignoring case and accents", () => {
		const result = plan(row("1", null, "  ACEITES Y DESPENSA "));

		expect(result.rows[0]?.category).toEqual({ current: nuts, next: oils });
		expect(result.changes).toEqual([
			{
				productId: 1,
				termsId: null,
				price: null,
				category: { from: 1, to: 2 },
			},
		]);
	});

	it("changes the category of a product without current terms", () => {
		const result = plan(row("3", null, "Aceites y despensa"));

		expect(result.canApply).toBe(true);
		expect(result.changes[0]).toMatchObject({ productId: 3, termsId: null });
	});

	it("sets a unit price on legacy terms, measuring the variation against moqPrice / moq", () => {
		const result = plan(row("5", "1500"));

		expect(result.rows[0]?.price).toEqual({
			current: "1500.00",
			next: "1500.00",
			variationPercent: 0,
		});
		expect(result.changes[0]?.price).toEqual({ from: null, to: "1500.00" });
	});

	it.each([
		[row(null, "100"), "Falta el id del producto"],
		[row("abc", "100"), 'El id "abc" no es válido'],
		[row("1.5", "100"), 'El id "1.5" no es válido'],
		[row("99", "100"), "No existe un producto con id 99"],
		[row("4", "100"), "No existe un producto con id 4"],
		[row("1", "mil"), 'El precio nuevo "mil" no es un número'],
		[row("1", "19,500"), 'El precio nuevo "19,500" tiene más de dos decimales'],
		[row("1", "0"), "El precio nuevo tiene que ser mayor a 0"],
		[row("1", "-5"), "El precio nuevo tiene que ser mayor a 0"],
		[row("3", "100"), "El producto no tiene términos de cliente vigentes"],
		[row("1", null, "Bebidas"), 'No existe la categoría "Bebidas"'],
		[row("1", null, "suplementos"), 'La categoría "Suplementos" está inactiva'],
		[row("1", null, "Semillas"), 'Hay más de una categoría llamada "Semillas"'],
	])("reports a row error (%#)", (sheetRow, error) => {
		const result = planPriceSheet([sheetRow], products, categories);

		expect(result.rows[0]?.errors).toEqual([error]);
		expect(result.errorCount).toBe(1);
		expect(result.canApply).toBe(false);
	});

	it.each([
		["inactive", { id: 3, name: "Suplementos" }],
		["deleted", { id: 9, name: "Infusiones" }],
		["shared with another category", { id: 4, name: "Semillas" }],
	])("leaves the product's own %s category alone on a price-only edit", (_state, category) => {
		const result = planPriceSheet(
			[row("1", "1100", category.name)],
			[product(1, { category })],
			categories,
		);

		expect(result.errorCount).toBe(0);
		expect(result.changes).toEqual([
			expect.objectContaining({ productId: 1, category: null }),
		]);
	});

	it("an inactive namesake does not make the active category ambiguous", () => {
		const result = planPriceSheet(
			[row("1", null, "Suplementos")],
			[product(1)],
			[...categories, { id: 6, name: "Suplementos", active: true }],
		);

		expect(result.errorCount).toBe(0);
		expect(result.changes[0]?.category).toEqual({ from: 1, to: 6 });
	});

	it("marks every occurrence of a repeated id", () => {
		const result = plan(row("1", "1100"), row("2", "1100"), row("1", "1200"));

		expect(result.rows.map((r) => r.errors)).toEqual([
			["El id 1 está repetido (filas 2, 4)"],
			[],
			["El id 1 está repetido (filas 2, 4)"],
		]);
	});

	it("is all or nothing: one error blocks every valid change", () => {
		const result = plan(row("1", "1100"), row("2", "1200"), row("99", "5"));

		expect(result.errorCount).toBe(1);
		expect(result.changes).toHaveLength(2);
		expect(result.canApply).toBe(false);
	});

	it("collects several errors on one row", () => {
		const result = plan(row("99", "x", "Bebidas"));

		expect(result.rows[0]?.errors).toEqual([
			"No existe un producto con id 99",
			'El precio nuevo "x" no es un número',
			'No existe la categoría "Bebidas"',
		]);
	});
});

describe("stalePriceSheetProductIds", () => {
	const change = (
		productId: number,
		overrides: Partial<PriceSheetChange> = {},
	): PriceSheetChange => ({
		productId,
		termsId: productId * 10,
		price: { from: "1000.00", to: "1100.00" },
		category: null,
		...overrides,
	});

	it("is empty when the file still plans what the preview showed", () => {
		expect(
			stalePriceSheetProductIds([change(1), change(2)], [change(2), change(1)]),
		).toEqual([]);
	});

	it("names products whose current value or target changed", () => {
		expect(
			stalePriceSheetProductIds(
				[change(1), change(2), change(3)],
				[
					change(1, { price: { from: "1050.00", to: "1100.00" } }),
					change(2, { termsId: 99 }),
					change(3, { category: { from: 1, to: 2 } }),
				],
			),
		).toEqual([1, 2, 3]);
	});

	it("names products that appeared or vanished", () => {
		expect(
			stalePriceSheetProductIds([change(1), change(2)], [change(1), change(3)]),
		).toEqual([2, 3]);
	});
});
