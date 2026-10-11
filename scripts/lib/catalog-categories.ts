/**
 * The categories the `category` migration inserts, in display order. Seeds and
 * the backfill look rows up by these names; an admin can rename a row later,
 * after which those scripts fail loudly instead of guessing.
 */
export const CATALOG_CATEGORY_NAMES = [
	"Frutos secos",
	"Mixes y snacks",
	"Frutas desecadas",
	"Semillas y granola",
	"Aceites y despensa",
	"Suplementos",
] as const;

export type CatalogCategoryName = (typeof CATALOG_CATEGORY_NAMES)[number];

export type ExistingCategory = { id: number; name: string; deleted: boolean };

/** Maps each name to its single non-deleted row, or throws listing every problem. */
export function categoryIdsByName(
	categories: ExistingCategory[],
	names: readonly string[],
): Map<string, number> {
	const ids = new Map<string, number>();
	const problems: string[] = [];

	for (const name of new Set(names)) {
		const live = categories.filter(
			(category) => category.name === name && !category.deleted,
		);
		const [only] = live;
		if (!only) {
			problems.push(`falta la categoría "${name}"`);
		} else if (live.length > 1) {
			problems.push(
				`hay ${live.length} categorías "${name}" (ids ${live.map((category) => category.id).join(", ")})`,
			);
		} else {
			ids.set(name, only.id);
		}
	}

	if (problems.length > 0) {
		throw new Error(
			`Categorías inconsistentes: ${problems.join("; ")}. Revisalas en /admin/categories o corré la migración "category".`,
		);
	}

	return ids;
}
