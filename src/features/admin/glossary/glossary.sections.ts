/**
 * The glossary's top-level grouping. An array rather than a record because the
 * declaration order *is* the render order of the groups, and it deliberately
 * mirrors the sidebar (`admin-nav.ts`) so an admin finds a term where they
 * already look for the screen that owns it.
 */
export const glossarySections = [
	{ id: "operation", label: "Operación y fulfillment" },
	{ id: "payments", label: "Pagos" },
	{ id: "catalog", label: "Catálogo" },
	{ id: "cart", label: "Carrito y checkout" },
	{ id: "tracking", label: "Seguimiento" },
	{ id: "people", label: "Usuarios y direcciones" },
	{ id: "qa", label: "QA" },
	{ id: "crosscutting", label: "Conceptos transversales" },
] as const;

export type GlossarySectionId = (typeof glossarySections)[number]["id"];

export const glossarySectionLabels: Record<GlossarySectionId, string> =
	Object.fromEntries(
		glossarySections.map((section) => [section.id, section.label]),
	) as Record<GlossarySectionId, string>;
