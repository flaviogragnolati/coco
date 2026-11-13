import { describe, expect, test } from "vitest";
import type { CatalogClientTerms } from "~/shared/common/catalog.types";
import {
	type ComboProductTerms,
	normalizeComboGroupName,
	validateComboGroup,
	validateComboItems,
} from "./combo.decision";

function terms(input: Partial<CatalogClientTerms> = {}): CatalogClientTerms {
	return {
		id: 1,
		moq: "1",
		moqPrice: "100",
		step: "1",
		stepPrice: null,
		max: null,
		unitPrice: "100",
		marketPrice: null,
		discountPercent: null,
		currency: "ARS",
		fromDate: new Date("2026-11-01T00:00:00.000Z"),
		toDate: null,
		...input,
	};
}

const granola: ComboProductTerms = {
	name: "Granola",
	unit: "kg",
	presentationContainer: null,
	terms: terms({ moq: "0.5", step: "0.5" }),
};
const peanutButter: ComboProductTerms = {
	name: "Pasta de maní",
	unit: "piece",
	presentationContainer: "frasco",
	terms: terms(),
};

function products(entries: [number, ComboProductTerms][]) {
	return new Map(entries);
}

describe("validateComboItems", () => {
	test("a kilo product accepts a quantity on its step and rejects one off it", () => {
		const catalog = products([[1, granola]]);

		expect(
			validateComboItems([{ productId: 1, quantity: "1" }], catalog),
		).toEqual([]);
		expect(
			validateComboItems([{ productId: 1, quantity: "0.7" }], catalog),
		).toEqual([
			"La cantidad de Granola tiene que ser 0,5 kg o más, de a 0,5 kg.",
		]);
	});

	test("a jar sold one by one names the container", () => {
		const catalog = products([[2, peanutButter]]);

		expect(
			validateComboItems([{ productId: 2, quantity: "2" }], catalog),
		).toEqual([]);
		expect(
			validateComboItems([{ productId: 2, quantity: "1.5" }], catalog),
		).toEqual([
			"La cantidad de Pasta de maní tiene que ser 1 frasco o más, de a 1 frasco.",
		]);
	});

	test("a quantity above the maximum names it", () => {
		const catalog = products([
			[2, { ...peanutButter, terms: terms({ max: "3" }) }],
		]);

		expect(
			validateComboItems([{ productId: 2, quantity: "4" }], catalog),
		).toEqual([
			"La cantidad de Pasta de maní tiene que ser 1 frasco o más, de a 1 frasco, hasta 3 frascos.",
		]);
	});

	test("a fixed quantity says so", () => {
		const catalog = products([
			[2, { ...peanutButter, terms: terms({ moq: "6", step: null }) }],
		]);

		expect(
			validateComboItems([{ productId: 2, quantity: "12" }], catalog),
		).toEqual(["La cantidad de Pasta de maní es fija: 6 frascos."]);
	});

	test("a product without current terms cannot go in", () => {
		const catalog = products([[1, { ...granola, terms: null }]]);

		expect(
			validateComboItems([{ productId: 1, quantity: "1" }], catalog),
		).toEqual(["Granola no tiene precio vigente."]);
	});

	test("the same product twice is rejected", () => {
		const catalog = products([[1, granola]]);

		expect(
			validateComboItems(
				[
					{ productId: 1, quantity: "1" },
					{ productId: 1, quantity: "0.5" },
				],
				catalog,
			),
		).toEqual(["Granola está dos veces."]);
	});

	test("products in different currencies are rejected", () => {
		const catalog = products([
			[1, granola],
			[2, { ...peanutButter, terms: terms({ currency: "USD" }) }],
		]);

		expect(
			validateComboItems(
				[
					{ productId: 1, quantity: "1" },
					{ productId: 2, quantity: "1" },
				],
				catalog,
			),
		).toEqual(["Todos los productos tienen que tener la misma moneda."]);
	});

	test("an empty combo is rejected", () => {
		expect(validateComboItems([], products([]))).toEqual([
			"Agregá al menos un producto.",
		]);
	});
});

describe("validateComboGroup", () => {
	const siblings = [{ id: 7, name: "Desayuno para 1", people: 1 }];

	test("a combo without a group needs nothing else", () => {
		expect(
			validateComboGroup({ groupName: null, people: null }, siblings),
		).toBeNull();
	});

	test("a combo in a group needs its people", () => {
		expect(
			validateComboGroup({ groupName: "Desayuno", people: null }, []),
		).toBe("Un combo con grupo necesita la cantidad de personas.");
	});

	test("two combos of a group cannot serve the same people", () => {
		expect(
			validateComboGroup({ groupName: "Desayuno", people: 1 }, siblings),
		).toBe(
			"En el grupo Desayuno ya hay un combo para 1 persona (Desayuno para 1).",
		);
	});

	test("editing a combo does not clash with itself", () => {
		expect(
			validateComboGroup({ id: 7, groupName: "Desayuno", people: 1 }, siblings),
		).toBeNull();
	});
});

test("a group name is trimmed and single-spaced, and blank means none", () => {
	expect(normalizeComboGroupName("  Desayuno   de campo ")).toBe(
		"Desayuno de campo",
	);
	expect(normalizeComboGroupName("   ")).toBeNull();
	expect(normalizeComboGroupName(null)).toBeNull();
});
