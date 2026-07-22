import { expect, test } from "vitest";

import type {
	CatalogClientTerms,
	CatalogProductListItem,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	computeBrandFacets,
	computeUnitFacets,
	filterCatalog,
	matchScore,
	normalizeSearch,
	productPrice,
	sortCatalog,
} from "./catalog-filtering";

type ProductOverrides = {
	id?: number;
	name?: string;
	description?: string | null;
	unit?: CatalogProductUnit;
	brand?: { id: number; name: string } | null;
	createdAt?: Date;
	terms?: Partial<CatalogClientTerms>;
};

let termsId = 0;

function makeProduct(overrides: ProductOverrides = {}): CatalogProductListItem {
	termsId += 1;
	const terms: CatalogClientTerms = {
		id: overrides.terms?.id ?? termsId,
		moq: overrides.terms?.moq ?? "10",
		moqPrice: overrides.terms?.moqPrice ?? "100",
		step: overrides.terms?.step ?? null,
		stepPrice: overrides.terms?.stepPrice ?? null,
		max: overrides.terms?.max ?? null,
		refPrice: overrides.terms?.refPrice ?? null,
		currency: overrides.terms?.currency ?? "ARS",
		fromDate: overrides.terms?.fromDate ?? new Date("2024-01-01"),
		toDate: overrides.terms?.toDate ?? null,
	};

	return {
		id: overrides.id ?? termsId,
		name: overrides.name ?? "Producto",
		description:
			overrides.description === undefined ? null : overrides.description,
		unit: overrides.unit ?? "piece",
		brand: overrides.brand === undefined ? null : overrides.brand,
		imageUrl: null,
		createdAt: overrides.createdAt ?? new Date("2024-01-01"),
		terms,
	};
}

test("normalizeSearch strips accents, case and whitespace", () => {
	expect(normalizeSearch("  Café Crème  ")).toBe("cafe creme");
	expect(normalizeSearch("AZÚCAR")).toBe("azucar");
});

test("productPrice prefers refPrice over moqPrice", () => {
	const withRef = makeProduct({ terms: { moqPrice: "100", refPrice: "12" } });
	const withoutRef = makeProduct({ terms: { moqPrice: "100" } });
	expect(productPrice(withRef)).toBe(12);
	expect(productPrice(withoutRef)).toBe(100);
});

test("matchScore ranks name prefix over brand and description", () => {
	const product = makeProduct({
		name: "Aceite de oliva",
		brand: { id: 1, name: "Oliva Co" },
		description: "Botella premium",
	});
	expect(matchScore(product, normalizeSearch("aceite"))).toBe(4);
	expect(matchScore(product, normalizeSearch("oliva"))).toBe(3);
	expect(matchScore(product, normalizeSearch("co"))).toBe(2);
	expect(matchScore(product, normalizeSearch("premium"))).toBe(1);
	expect(matchScore(product, normalizeSearch("inexistente"))).toBe(0);
});

test("filterCatalog narrows by accent-insensitive search", () => {
	const products = [
		makeProduct({ name: "Café molido" }),
		makeProduct({ name: "Té verde" }),
	];
	const result = filterCatalog(products, {
		search: "cafe",
		brandIds: [],
		units: [],
		minPrice: "",
		maxPrice: "",
		inCartOnly: false,
	});
	expect(result.map((product) => product.name)).toStrictEqual(["Café molido"]);
});

test("filterCatalog narrows by brand membership", () => {
	const products = [
		makeProduct({ name: "A", brand: { id: 1, name: "Marca 1" } }),
		makeProduct({ name: "B", brand: { id: 2, name: "Marca 2" } }),
		makeProduct({ name: "C", brand: null }),
	];
	const result = filterCatalog(products, {
		search: "",
		brandIds: [1, 2],
		units: [],
		minPrice: "",
		maxPrice: "",
		inCartOnly: false,
	});
	expect(result.map((product) => product.name)).toStrictEqual(["A", "B"]);
});

test("filterCatalog narrows by unit membership", () => {
	const products = [
		makeProduct({ name: "A", unit: "kg" }),
		makeProduct({ name: "B", unit: "box" }),
	];
	const result = filterCatalog(products, {
		search: "",
		brandIds: [],
		units: ["kg"],
		minPrice: "",
		maxPrice: "",
		inCartOnly: false,
	});
	expect(result.map((product) => product.name)).toStrictEqual(["A"]);
});

test("filterCatalog narrows by price range", () => {
	const products = [
		makeProduct({ name: "Cheap", terms: { moqPrice: "50" } }),
		makeProduct({ name: "Mid", terms: { moqPrice: "150" } }),
		makeProduct({ name: "Pricey", terms: { moqPrice: "300" } }),
	];
	const result = filterCatalog(products, {
		search: "",
		brandIds: [],
		units: [],
		minPrice: "100",
		maxPrice: "200",
		inCartOnly: false,
	});
	expect(result.map((product) => product.name)).toStrictEqual(["Mid"]);
});

test("filterCatalog narrows by inCartOnly", () => {
	const inCart = makeProduct({ name: "InCart", terms: { id: 999 } });
	const products = [inCart, makeProduct({ name: "Other" })];
	const result = filterCatalog(
		products,
		{
			search: "",
			brandIds: [],
			units: [],
			minPrice: "",
			maxPrice: "",
			inCartOnly: true,
		},
		{ inCartTermsIds: new Set([999]) },
	);
	expect(result.map((product) => product.name)).toStrictEqual(["InCart"]);
});

test("sortCatalog name-asc and name-desc", () => {
	const products = [
		makeProduct({ name: "Banana" }),
		makeProduct({ name: "Ananá" }),
		makeProduct({ name: "Cereza" }),
	];
	expect(
		sortCatalog(products, "name-asc").map((product) => product.name),
	).toStrictEqual(["Ananá", "Banana", "Cereza"]);
	expect(
		sortCatalog(products, "name-desc").map((product) => product.name),
	).toStrictEqual(["Cereza", "Banana", "Ananá"]);
});

test("sortCatalog price-asc and price-desc", () => {
	const products = [
		makeProduct({ name: "Mid", terms: { moqPrice: "150" } }),
		makeProduct({ name: "Cheap", terms: { moqPrice: "50" } }),
		makeProduct({ name: "Pricey", terms: { moqPrice: "300" } }),
	];
	expect(
		sortCatalog(products, "price-asc").map((product) => product.name),
	).toStrictEqual(["Cheap", "Mid", "Pricey"]);
	expect(
		sortCatalog(products, "price-desc").map((product) => product.name),
	).toStrictEqual(["Pricey", "Mid", "Cheap"]);
});

test("sortCatalog newest orders by createdAt desc, id desc on ties", () => {
	const products = [
		makeProduct({ id: 1, name: "Old", createdAt: new Date("2024-01-01") }),
		makeProduct({ id: 2, name: "New", createdAt: new Date("2024-06-01") }),
		makeProduct({ id: 3, name: "SameDay", createdAt: new Date("2024-06-01") }),
	];
	expect(
		sortCatalog(products, "newest").map((product) => product.name),
	).toStrictEqual(["SameDay", "New", "Old"]);
});

test("sortCatalog relevance orders by match score when searching", () => {
	const products = [
		makeProduct({ name: "Otro", description: "contiene aceite" }),
		makeProduct({ name: "Aceite puro" }),
		makeProduct({ name: "Mezcla con aceite" }),
	];
	expect(
		sortCatalog(products, "relevance", "aceite").map((product) => product.name),
	).toStrictEqual(["Aceite puro", "Mezcla con aceite", "Otro"]);
});

test("computeBrandFacets counts products per brand sorted by label", () => {
	const products = [
		makeProduct({ brand: { id: 2, name: "Zeta" } }),
		makeProduct({ brand: { id: 1, name: "Alfa" } }),
		makeProduct({ brand: { id: 1, name: "Alfa" } }),
		makeProduct({ brand: null }),
	];
	expect(computeBrandFacets(products)).toStrictEqual([
		{ id: 1, label: "Alfa", count: 2 },
		{ id: 2, label: "Zeta", count: 1 },
	]);
});

test("computeUnitFacets counts products per unit with labels", () => {
	const products = [
		makeProduct({ unit: "kg" }),
		makeProduct({ unit: "kg" }),
		makeProduct({ unit: "box" }),
	];
	const facets = computeUnitFacets(products);
	const kg = facets.find((facet) => facet.unit === "kg");
	const box = facets.find((facet) => facet.unit === "box");
	expect(kg?.count).toBe(2);
	expect(kg?.label).toBe("kg");
	expect(box?.count).toBe(1);
	expect(box?.label).toBe("caja");
});
