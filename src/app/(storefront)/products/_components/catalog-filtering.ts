import type {
	CatalogCategorySummary,
	CatalogProductListItem,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	getPerUnitPrice,
	productUnitLabelMap,
	toNumber,
} from "~/shared/common/commerce.helpers";

export type CatalogSort =
	| "relevance"
	| "name-asc"
	| "name-desc"
	| "price-asc"
	| "price-desc"
	| "newest";

export type CatalogFilters = {
	search: string;
	brandIds: number[];
	units: CatalogProductUnit[];
	minPrice: string;
	maxPrice: string;
	inCartOnly: boolean;
	categoryId: number | null;
};

export const emptyCatalogFilters: CatalogFilters = {
	search: "",
	brandIds: [],
	units: [],
	minPrice: "",
	maxPrice: "",
	inCartOnly: false,
	categoryId: null,
};

export type CatalogBrandFacet = { id: number; label: string; count: number };
export type CatalogUnitFacet = {
	unit: CatalogProductUnit;
	label: string;
	count: number;
};
export type CatalogCategoryChip = { id: number; label: string };

export function normalizeSearch(value: string) {
	return value
		.trim()
		.toLocaleLowerCase("es")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "");
}

/**
 * The offer price per unit the customer is charged, so filtering and sorting
 * rank products by the same number the card advertises; `0` when the terms
 * carry no usable price at all.
 */
export function productPrice(product: Pick<CatalogProductListItem, "terms">) {
	return getPerUnitPrice(product.terms) ?? 0;
}

/**
 * Relevance score for a product against an already-normalized query.
 * Higher is more relevant: name prefix > name match > brand match >
 * description match. Returns 0 when the product does not match at all.
 */
export function matchScore(
	product: CatalogProductListItem,
	normalizedQuery: string,
): number {
	if (!normalizedQuery) return 0;

	const name = normalizeSearch(product.name);
	const brand = normalizeSearch(product.brand?.name ?? "");
	const description = normalizeSearch(product.description ?? "");

	if (name.startsWith(normalizedQuery)) return 4;
	if (name.includes(normalizedQuery)) return 3;
	if (brand.includes(normalizedQuery)) return 2;
	if (description.includes(normalizedQuery)) return 1;
	return 0;
}

function createdAtTime(product: CatalogProductListItem): number {
	const createdAt = product.createdAt;
	if (!createdAt) return 0;
	const time =
		createdAt instanceof Date
			? createdAt.getTime()
			: new Date(createdAt).getTime();
	return Number.isNaN(time) ? 0 : time;
}

export function filterCatalog(
	products: CatalogProductListItem[],
	filters: CatalogFilters,
	options: { inCartTermsIds?: Set<number> } = {},
): CatalogProductListItem[] {
	const query = normalizeSearch(filters.search);
	const minPrice = toNumber(filters.minPrice);
	const maxPrice = toNumber(filters.maxPrice);
	const brandIds = new Set(filters.brandIds);
	const units = new Set(filters.units);
	const inCartTermsIds = options.inCartTermsIds ?? new Set<number>();

	return products.filter((product) => {
		if (query && matchScore(product, query) === 0) return false;

		if (
			brandIds.size > 0 &&
			(product.brand === null || !brandIds.has(product.brand.id))
		) {
			return false;
		}

		if (units.size > 0 && !units.has(product.unit)) return false;

		if (
			filters.categoryId !== null &&
			product.category?.id !== filters.categoryId
		) {
			return false;
		}

		const price = productPrice(product);
		if (minPrice !== null && price < minPrice) return false;
		if (maxPrice !== null && price > maxPrice) return false;

		if (filters.inCartOnly && !inCartTermsIds.has(product.terms.id)) {
			return false;
		}

		return true;
	});
}

export function sortCatalog(
	products: CatalogProductListItem[],
	sort: CatalogSort,
	query?: string,
): CatalogProductListItem[] {
	const normalizedQuery = query ? normalizeSearch(query) : "";
	const sorted = [...products];

	switch (sort) {
		case "relevance":
			return sorted.sort((left, right) => {
				const diff =
					matchScore(right, normalizedQuery) -
					matchScore(left, normalizedQuery);
				if (diff !== 0) return diff;
				return left.name.localeCompare(right.name, "es");
			});
		case "name-desc":
			return sorted.sort((left, right) =>
				right.name.localeCompare(left.name, "es"),
			);
		case "price-asc":
			return sorted.sort(
				(left, right) => productPrice(left) - productPrice(right),
			);
		case "price-desc":
			return sorted.sort(
				(left, right) => productPrice(right) - productPrice(left),
			);
		case "newest":
			return sorted.sort((left, right) => {
				const diff = createdAtTime(right) - createdAtTime(left);
				if (diff !== 0) return diff;
				return right.id - left.id;
			});
		default:
			return sorted.sort((left, right) =>
				left.name.localeCompare(right.name, "es"),
			);
	}
}

export type SimilarProductReference = Pick<
	CatalogProductListItem,
	"id" | "unit" | "brand" | "terms"
>;

/**
 * Products to propose alongside `current`: same brand first, same unit second,
 * each tier ordered by how close its price is to the current product's.
 *
 * The relation is derived from brand and unit, not declared.
 * It never falls through to unrelated products: returning fewer than `limit`
 * results — or none — is the intended behavior, because padding the list would
 * make "Productos similares" a lie.
 */
export function selectSimilarProducts(
	products: CatalogProductListItem[],
	current: SimilarProductReference,
	limit = 3,
): CatalogProductListItem[] {
	const referencePrice = productPrice(current);
	const compare = (
		left: CatalogProductListItem,
		right: CatalogProductListItem,
	) => {
		const distance =
			Math.abs(productPrice(left) - referencePrice) -
			Math.abs(productPrice(right) - referencePrice);
		if (distance !== 0) return distance;
		const byName = left.name.localeCompare(right.name, "es");
		if (byName !== 0) return byName;
		return left.id - right.id;
	};

	const candidates = products.filter((product) => product.id !== current.id);

	// A missing brand is not a brand two products can share, so a brandless
	// current product skips this tier instead of matching every other one.
	const brandTier = current.brand
		? candidates
				.filter((product) => product.brand?.id === current.brand?.id)
				.sort(compare)
		: [];

	const brandTierIds = new Set(brandTier.map((product) => product.id));
	const unitTier = candidates
		.filter(
			(product) =>
				product.unit === current.unit && !brandTierIds.has(product.id),
		)
		.sort(compare);

	return [...brandTier, ...unitTier].slice(0, limit);
}

export function computeBrandFacets(
	products: CatalogProductListItem[],
): CatalogBrandFacet[] {
	const brandMap = new Map<number, { label: string; count: number }>();

	for (const product of products) {
		if (!product.brand) continue;
		const existing = brandMap.get(product.brand.id);
		if (existing) {
			existing.count += 1;
		} else {
			brandMap.set(product.brand.id, { label: product.brand.name, count: 1 });
		}
	}

	return Array.from(brandMap.entries())
		.map(([id, { label, count }]) => ({ id, label, count }))
		.sort((left, right) => left.label.localeCompare(right.label, "es"));
}

/**
 * Pass the whole catalog, not the filtered list, so the chips stay put while
 * other filters narrow the grid. Fewer than two categories split nothing, so
 * none are offered.
 */
export function computeCategoryChips(
	products: CatalogProductListItem[],
): CatalogCategoryChip[] {
	const categories = new Map<number, CatalogCategorySummary>();
	for (const product of products) {
		if (product.category) categories.set(product.category.id, product.category);
	}
	if (categories.size < 2) return [];

	return Array.from(categories.values())
		.sort(
			(left, right) =>
				left.sortOrder - right.sortOrder ||
				left.name.localeCompare(right.name, "es") ||
				left.id - right.id,
		)
		.map(({ id, name }) => ({ id, label: name }));
}

/** A category the chips do not offer filters nothing; a stale URL reads as "Todos". */
export function resolveCategoryId(
	chips: CatalogCategoryChip[],
	categoryId: number | null,
): number | null {
	return chips.some((chip) => chip.id === categoryId) ? categoryId : null;
}

export function computeUnitFacets(
	products: CatalogProductListItem[],
): CatalogUnitFacet[] {
	const unitMap = new Map<CatalogProductUnit, number>();

	for (const product of products) {
		unitMap.set(product.unit, (unitMap.get(product.unit) ?? 0) + 1);
	}

	return Array.from(unitMap.entries())
		.map(([unit, count]) => ({
			unit,
			label: productUnitLabelMap[unit],
			count,
		}))
		.sort((left, right) => left.label.localeCompare(right.label, "es"));
}
