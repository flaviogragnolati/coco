import { expect, test } from "vitest";
import type { CrudEntityCopy } from "./crud-entity-copy";
import { buildCrudStatItems, crudElementIds } from "./crud-entity-copy";

type Item = { active: boolean; deleted?: boolean; name: string };

const copy: CrudEntityCopy<Item> = {
	idPrefix: "brand",
	createButtonLabel: "Agregar nueva",
	searchPlaceholder: "ID o nombre",
	statusLabels: { active: "Activas", inactive: "Inactivas" },
	stats: {
		total: { label: "Total", description: "Incluye eliminadas" },
		active: { label: "Activas", description: "Disponibles" },
		inactive: { label: "Inactivas", description: "Fuera de uso" },
		deleted: { label: "Eliminadas", description: "Baja lógica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminadas",
	includeDeletedHint: "Baja lógica",
	listErrorMessage: "No se pudo obtener la lista",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar la marca",
	empty: { title: "Sin marcas", description: "Ajustá los filtros." },
	softDelete: {
		title: "Confirmar baja lógica",
		confirmLabel: "Enviar a papelera",
		describe: (item) => `La marca "${item.name}" se da de baja.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: (item) => `Borra "${item.name}".`,
	},
};

test("derives both DOM ids from the prefix", () => {
	expect(crudElementIds(copy)).toEqual({
		searchId: "brand-search",
		includeDeletedId: "brand-include-deleted",
	});
});

test("an explicit includeDeletedId overrides only that id", () => {
	expect(
		crudElementIds({ ...copy, includeDeletedId: "include-deleted" }),
	).toEqual({ searchId: "brand-search", includeDeletedId: "include-deleted" });
});

// CrudDeleteDialog gates its typed confirmation on Boolean(confirmationValue),
// so an absent builder and one returning "" are not interchangeable.
test("an omitted confirmationValue is distinguishable from an empty one", () => {
	const item: Item = { active: true, name: "Acme" };

	const emptyBuilder: CrudEntityCopy<Item>["hardDelete"]["confirmationValue"] =
		() => "";

	expect(copy.hardDelete.confirmationValue?.(item)).toBeUndefined();
	expect(emptyBuilder?.(item)).toBe("");
});

test("emits the stat quartet in order with its accents attached", () => {
	const items = buildCrudStatItems(copy, {
		total: 10,
		active: 6,
		inactive: 3,
		deleted: 1,
	});

	expect(items.map((item) => [item.label, item.value])).toEqual([
		["Total", 10],
		["Activas", 6],
		["Inactivas", 3],
		["Eliminadas", 1],
	]);
	expect(items.every((item) => item.icon && item.accent)).toBe(true);
});
