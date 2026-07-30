import { describe, expect, it } from "vitest";

import {
	countActiveGlossaryFilters,
	emptyGlossaryFilters,
	filterGlossaryEntries,
	type GlossaryFilters,
	groupGlossaryEntries,
	normalizeGlossaryText,
} from "./glossary.filters";
import type { GlossaryEntry } from "./glossary.types";

const operationConcept: GlossaryEntry = {
	slug: "operacion",
	kind: "concept",
	section: "operation",
	label: "Operación",
	definition: "Lote de agregación de la demanda enviada por los clientes.",
	aliases: ["Job", "Run"],
	occurrences: [{ code: "Operation", db: "operation" }],
	href: "/admin/operations",
};

const supplierDispatch: GlossaryEntry = {
	slug: "despacho-de-proveedor",
	kind: "concept",
	section: "operation",
	label: "Despacho de proveedor",
	definition: "El envío anunciado de mercadería para una orden de proveedor.",
	aliases: ["Remito", "Nota de entrega"],
};

const lotItemEntity: GlossaryEntry = {
	slug: "item-de-lote",
	kind: "entity",
	section: "operation",
	label: "Ítem de lote",
	definition: "Línea solicitada al proveedor dentro de un lote.",
	occurrences: [{ code: "LotItem", db: "lot_item" }],
};

const readyForPackaging: GlossaryEntry = {
	slug: "estado-listo-para-empaque",
	kind: "status",
	section: "operation",
	label: "Listo para empaque",
	occurrences: [
		{ code: "LotStatus.readyForPackaging", db: "lot.status" },
		{ code: "LotItemStatus.readyForPackaging", db: "lot_item.status" },
	],
};

const paymentApproved: GlossaryEntry = {
	slug: "estado-pago-aprobado",
	kind: "status",
	section: "payments",
	label: "Aprobado",
	occurrences: [
		{ code: "UserTransactionStatus.completed", db: "user_transaction.status" },
	],
};

const entries = [
	operationConcept,
	supplierDispatch,
	lotItemEntity,
	readyForPackaging,
	paymentApproved,
];

function withFilters(overrides: Partial<GlossaryFilters>): GlossaryFilters {
	return { ...emptyGlossaryFilters, ...overrides };
}

function slugsOf(matched: GlossaryEntry[]) {
	return matched.map((entry) => entry.slug);
}

describe("normalizeGlossaryText", () => {
	it("strips accents, case and surrounding whitespace", () => {
		expect(normalizeGlossaryText("  Operación ")).toBe("operacion");
		expect(normalizeGlossaryText("Ítem de LOTE")).toBe("item de lote");
	});
});

describe("filterGlossaryEntries", () => {
	it("matches labels regardless of accents and case", () => {
		expect(
			slugsOf(
				filterGlossaryEntries(entries, withFilters({ search: "operacion" })),
			),
		).toEqual(["operacion"]);
		expect(
			slugsOf(
				filterGlossaryEntries(entries, withFilters({ search: "ITEM DE LOTE" })),
			),
		).toEqual(["item-de-lote"]);
	});

	it("matches discouraged synonyms", () => {
		expect(
			slugsOf(
				filterGlossaryEntries(entries, withFilters({ search: "remito" })),
			),
		).toEqual(["despacho-de-proveedor"]);
	});

	it("matches code identifiers and table.column identifiers", () => {
		expect(
			slugsOf(
				filterGlossaryEntries(
					entries,
					withFilters({ search: "LotStatus.readyForPackaging" }),
				),
			),
		).toEqual(["estado-listo-para-empaque"]);
		expect(
			slugsOf(
				filterGlossaryEntries(entries, withFilters({ search: "lot_item" })),
			),
		).toEqual(["item-de-lote", "estado-listo-para-empaque"]);
	});

	it("matches definitions", () => {
		expect(
			slugsOf(
				filterGlossaryEntries(entries, withFilters({ search: "mercaderia" })),
			),
		).toEqual(["despacho-de-proveedor"]);
	});

	it("combines search with the section and kind filters", () => {
		expect(
			slugsOf(
				filterGlossaryEntries(
					entries,
					withFilters({ search: "a", kind: "status", section: "payments" }),
				),
			),
		).toEqual(["estado-pago-aprobado"]);

		expect(
			filterGlossaryEntries(
				entries,
				withFilters({ search: "remito", section: "payments" }),
			),
		).toEqual([]);
	});

	it("returns everything when no filter is applied", () => {
		expect(filterGlossaryEntries(entries, emptyGlossaryFilters)).toHaveLength(
			entries.length,
		);
	});
});

describe("groupGlossaryEntries", () => {
	it("keeps the section order and omits empty groups", () => {
		const groups = groupGlossaryEntries(entries, "asc");

		expect(groups.map((group) => group.section)).toEqual([
			"operation",
			"payments",
		]);
	});

	it("sorts A-Z inside each group, ignoring accents in the label", () => {
		const [operation] = groupGlossaryEntries(entries, "asc");

		expect(slugsOf(operation?.entries ?? [])).toEqual([
			"despacho-de-proveedor",
			"item-de-lote",
			"estado-listo-para-empaque",
			"operacion",
		]);
	});

	it("inverts the order inside the group without reordering the groups", () => {
		const groups = groupGlossaryEntries(entries, "desc");

		expect(groups.map((group) => group.section)).toEqual([
			"operation",
			"payments",
		]);
		expect(slugsOf(groups[0]?.entries ?? [])).toEqual([
			"operacion",
			"estado-listo-para-empaque",
			"item-de-lote",
			"despacho-de-proveedor",
		]);
	});

	it("breaks label ties by slug so the order does not depend on the input", () => {
		const cancelledLot: GlossaryEntry = {
			slug: "estado-cancelado-lote",
			kind: "status",
			section: "operation",
			label: "Cancelado",
		};
		const cancelledPayment: GlossaryEntry = {
			slug: "estado-cancelado-carrito",
			kind: "status",
			section: "operation",
			label: "Cancelado",
		};

		const [ascending] = groupGlossaryEntries(
			[cancelledLot, cancelledPayment],
			"asc",
		);
		const [reversedInput] = groupGlossaryEntries(
			[cancelledPayment, cancelledLot],
			"asc",
		);

		expect(slugsOf(ascending?.entries ?? [])).toEqual([
			"estado-cancelado-carrito",
			"estado-cancelado-lote",
		]);
		expect(slugsOf(reversedInput?.entries ?? [])).toEqual(
			slugsOf(ascending?.entries ?? []),
		);
	});
});

describe("countActiveGlossaryFilters", () => {
	it("counts the selects and ignores the search box", () => {
		expect(countActiveGlossaryFilters(emptyGlossaryFilters)).toBe(0);
		expect(countActiveGlossaryFilters(withFilters({ search: "lote" }))).toBe(0);
		expect(
			countActiveGlossaryFilters(withFilters({ section: "payments" })),
		).toBe(1);
		expect(
			countActiveGlossaryFilters(
				withFilters({ section: "payments", kind: "status" }),
			),
		).toBe(2);
	});
});
