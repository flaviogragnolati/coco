import type { GlossarySectionId } from "./glossary.sections";

export type GlossaryKind = "concept" | "entity" | "status";

/**
 * One concrete place where an entry materializes: a Prisma model and its table,
 * or an enum value and the column that stores it.
 *
 * `db` follows the schema's actual naming, which is mixed on purpose: every
 * model carries `@@map` to snake_case while no field does, so tables read
 * `cart_item` and columns read `fulfillmentStatus`.
 */
export type GlossaryOccurrence = {
	/** `Lot` for an entity, `LotStatus.readyForPackaging` for a status. */
	code: string;
	/** `lot` for an entity, `lot.status` for a status. */
	db: string;
};

export type GlossaryEntry = {
	slug: string;
	kind: GlossaryKind;
	section: GlossarySectionId;
	/** Spanish label, the one the admin reads in the UI. */
	label: string;
	/** Canonical CONTEXT.md term, only when it differs from the label. */
	term?: string;
	/** Required on `concept` and `entity`; optional on `status`. */
	definition?: string;
	/** Discouraged synonyms (the `_Avoid_` list of CONTEXT.md), searchable. */
	aliases?: string[];
	occurrences?: GlossaryOccurrence[];
	/** Admin screen that administers this term; must exist in `adminNavGroups`. */
	href?: string;
};

export const glossaryKindLabels: Record<GlossaryKind, string> = {
	concept: "Concepto",
	entity: "Entidad",
	status: "Estado",
};
