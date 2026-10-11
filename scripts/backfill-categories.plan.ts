import {
	CATALOG_CATEGORY_NAMES,
	type CatalogCategoryName,
	categoryIdsByName,
	type ExistingCategory,
} from "./lib/catalog-categories";
import { normalizeText } from "./quintal-catalog.schema";

/**
 * Decides which category each product gets from the Quintal catalog. A product
 * is a Quintal product when its name matches a catalog product and Quintal is
 * its default supplier, the same identity `db:seed:init` uses. Anything else
 * (demo data, a renamed product) is reported, never guessed.
 */

export type BackfillProduct = {
	id: number;
	name: string;
	categoryId: number | null;
	defaultSupplierId: number | null;
};

export type BackfillCatalogProduct = {
	key: string;
	name: string;
	heading: string;
	categoryName: CatalogCategoryName | null;
};

export type BackfillInput = {
	products: BackfillProduct[];
	categories: ExistingCategory[];
	quintalSupplierIds: number[];
	catalog: BackfillCatalogProduct[];
	/** Also reassigns products that already have a different category. */
	force: boolean;
};

export type BackfillDecision =
	| {
			action: "assign";
			productId: number;
			name: string;
			categoryName: CatalogCategoryName;
			categoryId: number;
			previousCategoryId: number | null;
	  }
	| { action: "keep"; productId: number; name: string; reason: string }
	| { action: "unclassified"; productId: number; name: string; reason: string };

export type BackfillPlan = {
	decisions: BackfillDecision[];
	/** Product ids to write, per target category id. */
	assignments: Map<number, number[]>;
	assignedPerCategory: Array<{ name: CatalogCategoryName; count: number }>;
	/** Products that still have no category once the plan is applied. */
	leftWithoutCategory: number;
};

type Classification =
	| { ok: true; categoryName: CatalogCategoryName }
	| { ok: false; reason: string };

function classify(
	product: BackfillProduct,
	catalogByName: Map<string, BackfillCatalogProduct>,
	quintalSupplierIds: Set<number>,
): Classification {
	const entry = catalogByName.get(normalizeText(product.name));
	if (!entry) {
		return { ok: false, reason: "no está en el catálogo de Quintal" };
	}
	if (
		product.defaultSupplierId === null ||
		!quintalSupplierIds.has(product.defaultSupplierId)
	) {
		return {
			ok: false,
			reason: `se llama como "${entry.key}" pero su proveedor por defecto no es Quintal`,
		};
	}
	if (!entry.categoryName) {
		return {
			ok: false,
			reason: `la cabecera "${entry.heading}" no tiene categoría en quintalCategoryOverrides`,
		};
	}
	return { ok: true, categoryName: entry.categoryName };
}

export function planCategoryBackfill(input: BackfillInput): BackfillPlan {
	const catalogByName = new Map(
		input.catalog.map((entry) => [normalizeText(entry.name), entry]),
	);
	const quintalSupplierIds = new Set(input.quintalSupplierIds);
	const classified = input.products.map((product) => ({
		product,
		result: classify(product, catalogByName, quintalSupplierIds),
	}));

	const categoryIds = categoryIdsByName(
		input.categories,
		classified.flatMap(({ result }) =>
			result.ok ? [result.categoryName] : [],
		),
	);
	const categoryNameById = new Map(
		input.categories.map((category) => [category.id, category.name]),
	);

	const decisions = classified.map(({ product, result }): BackfillDecision => {
		const base = { productId: product.id, name: product.name };
		if (!result.ok) {
			return product.categoryId === null
				? { ...base, action: "unclassified", reason: result.reason }
				: {
						...base,
						action: "keep",
						reason: `ya tiene categoría (${categoryNameById.get(product.categoryId) ?? product.categoryId}); ${result.reason}`,
					};
		}

		const categoryId = categoryIds.get(result.categoryName) as number;
		if (product.categoryId === categoryId) {
			return { ...base, action: "keep", reason: "ya está en esa categoría" };
		}
		if (product.categoryId !== null && !input.force) {
			return {
				...base,
				action: "keep",
				reason: `ya tiene categoría (${categoryNameById.get(product.categoryId) ?? product.categoryId}); se propone "${result.categoryName}", usá --force para cambiarla`,
			};
		}
		return {
			...base,
			action: "assign",
			categoryName: result.categoryName,
			categoryId,
			previousCategoryId: product.categoryId,
		};
	});

	const assignments = new Map<number, number[]>();
	const counts = new Map<CatalogCategoryName, number>();
	for (const decision of decisions) {
		if (decision.action !== "assign") continue;
		assignments.set(decision.categoryId, [
			...(assignments.get(decision.categoryId) ?? []),
			decision.productId,
		]);
		counts.set(
			decision.categoryName,
			(counts.get(decision.categoryName) ?? 0) + 1,
		);
	}

	return {
		decisions,
		assignments,
		assignedPerCategory: CATALOG_CATEGORY_NAMES.map((name) => ({
			name,
			count: counts.get(name) ?? 0,
		})),
		leftWithoutCategory: decisions.filter(
			(decision) => decision.action === "unclassified",
		).length,
	};
}
