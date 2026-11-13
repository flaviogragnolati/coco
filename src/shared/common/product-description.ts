const normalize = (text: string) =>
	text.trim().replace(/\.+$/, "").replace(/\s+/g, " ").toLocaleLowerCase("es");

/**
 * The description worth showing the customer, or null when there is none.
 * A description that only repeats the product name (the Quintal import writes
 * `${name}.`) counts as none.
 */
export function visibleProductDescription(
	description: string | null | undefined,
	name: string,
): string | null {
	const trimmed = description?.trim() ?? "";
	if (trimmed === "" || normalize(trimmed) === normalize(name)) return null;
	return trimmed;
}
