import type { CrudStatusFilter } from "~/shared/common/admin-crud/crud.types";

export function normalizeSearch(value: string) {
	return value.trim().toLocaleLowerCase("es-AR");
}

export function matchesSearch(search: string, values: Array<number | string | null>) {
	if (!search) return true;

	return values.some((value) =>
		String(value ?? "")
			.toLocaleLowerCase("es-AR")
			.includes(search),
	);
}

export function matchesCrudStatus(
	status: CrudStatusFilter,
	item: { active: boolean; deleted?: boolean },
) {
	if (status === "all") return true;
	if (item.deleted) return false;
	if (status === "active") return item.active;
	return !item.active;
}
