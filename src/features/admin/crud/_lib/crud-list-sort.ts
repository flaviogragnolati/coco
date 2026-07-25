import type {
	CrudEntityId,
	CrudSortDirection,
} from "~/shared/common/admin-crud/crud.types";

/**
 * Ordering offered by the simple CRUD pages, which hold the whole list in
 * memory. `default` keeps whatever order the server returned (by name, for the
 * catalog and user entities).
 */
export type CrudListSort = "default" | "newest" | "oldest";

export const crudListSortOptions: Array<{
	value: CrudListSort;
	label: string;
}> = [
	{ value: "default", label: "Por nombre" },
	{ value: "newest", label: "Más recientes" },
	{ value: "oldest", label: "Más antiguos" },
];

function compareIds(left: CrudEntityId, right: CrudEntityId) {
	return String(left).localeCompare(String(right));
}

/**
 * Sorts by a date, breaking ties on id so the order is stable across renders
 * for records written in the same transaction. Ids can be numbers or strings
 * (users), hence the string comparison.
 */
export function sortByDate<TItem>(
	items: TItem[],
	direction: CrudSortDirection,
	getDate: (item: TItem) => Date,
	getId: (item: TItem) => CrudEntityId,
): TItem[] {
	const factor = direction === "desc" ? -1 : 1;

	return items.slice().sort((left, right) => {
		const delta = getDate(left).getTime() - getDate(right).getTime();
		if (delta !== 0) return delta * factor;
		return compareIds(getId(left), getId(right)) * factor;
	});
}

export function applyCrudListSort<
	TItem extends { id: CrudEntityId; updatedAt: Date },
>(items: TItem[], sort: CrudListSort): TItem[] {
	if (sort === "default") return items;

	return sortByDate(
		items,
		sort === "newest" ? "desc" : "asc",
		(item) => item.updatedAt,
		(item) => item.id,
	);
}
