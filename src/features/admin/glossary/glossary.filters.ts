import { type GlossarySectionId, glossarySections } from "./glossary.sections";
import type { GlossaryEntry, GlossaryKind } from "./glossary.types";

/**
 * Accent- and case-insensitive normalizer, applied to **both** sides of every
 * comparison. Deliberately not `crud/_lib/filter-helpers.ts::normalizeSearch`,
 * which normalizes only the query and therefore must keep accents.
 */
export function normalizeGlossaryText(value: string): string {
	return value
		.trim()
		.toLocaleLowerCase("es-AR")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "");
}

export type GlossaryFilters = {
	search: string;
	section: GlossarySectionId | "all";
	kind: GlossaryKind | "all";
};

export type GlossarySortDirection = "asc" | "desc";

export type GlossaryGroup = {
	section: GlossarySectionId;
	label: string;
	entries: GlossaryEntry[];
};

export const emptyGlossaryFilters: GlossaryFilters = {
	search: "",
	section: "all",
	kind: "all",
};

/** Counts the select filters only — the search box reports itself. */
export function countActiveGlossaryFilters(filters: GlossaryFilters): number {
	return (filters.section === "all" ? 0 : 1) + (filters.kind === "all" ? 0 : 1);
}

function searchableValues(entry: GlossaryEntry): string[] {
	return [
		entry.label,
		entry.term ?? "",
		entry.definition ?? "",
		...(entry.aliases ?? []),
		...(entry.occurrences ?? []).flatMap((occurrence) => [
			occurrence.code,
			occurrence.db,
		]),
	];
}

export function filterGlossaryEntries(
	entries: GlossaryEntry[],
	filters: GlossaryFilters,
): GlossaryEntry[] {
	const query = normalizeGlossaryText(filters.search);

	return entries.filter((entry) => {
		if (filters.section !== "all" && entry.section !== filters.section) {
			return false;
		}
		if (filters.kind !== "all" && entry.kind !== filters.kind) return false;
		if (!query) return true;

		return searchableValues(entry).some((value) =>
			normalizeGlossaryText(value).includes(query),
		);
	});
}

export function groupGlossaryEntries(
	entries: GlossaryEntry[],
	direction: GlossarySortDirection,
): GlossaryGroup[] {
	const groups: GlossaryGroup[] = [];

	for (const section of glossarySections) {
		const sectionEntries = entries.filter(
			(entry) => entry.section === section.id,
		);
		if (sectionEntries.length === 0) continue;

		sectionEntries.sort((a, b) => {
			const byLabel = a.label.localeCompare(b.label, "es-AR");
			// Slug is the stable tiebreaker: labels repeat across entries
			// ("Cancelado" lives in several enums) and the order must not depend
			// on the input array.
			const compared = byLabel !== 0 ? byLabel : a.slug.localeCompare(b.slug);
			return direction === "desc" ? -compared : compared;
		});

		groups.push({
			section: section.id,
			label: section.label,
			entries: sectionEntries,
		});
	}

	return groups;
}
