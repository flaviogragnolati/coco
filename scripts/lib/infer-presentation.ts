import type { CatalogProductPresentationContainer } from "~/shared/common/catalog.types";

export type InferredPresentation = {
	presentationContainer: CatalogProductPresentationContainer;
	presentationSize: string | null;
};

const containerWords: Array<[RegExp, CatalogProductPresentationContainer]> = [
	[/\bbotellas?\b/, "botella"],
	[/\bbidon(?:es)?\b/, "bidon"],
	[/\bfrascos?\b/, "frasco"],
	[/\b(?:bolsas?|bolsitas?|bolson(?:es)?)\b/, "bolsa"],
	[/\bpaquetes?\b/, "paquete"],
];

const sizeUnits: Record<string, string> = {
	kg: "kg",
	g: "g",
	gr: "g",
	grs: "g",
	l: "L",
	lt: "L",
	ml: "ml",
	cc: "cc",
};

const sizePattern = /(\d+(?:[.,]\d+)?)\s*(kg|grs|gr|g|lt|ml|cc|l)\b/i;

function fold(text: string) {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

function findContainer(text: string) {
	const folded = fold(text);
	return containerWords.find(([pattern]) => pattern.test(folded))?.[1] ?? null;
}

function findSize(text: string) {
	const match = sizePattern.exec(text);
	if (!match?.[1] || !match[2]) return null;
	const unit = sizeUnits[match[2].toLowerCase()];
	return unit ? `${match[1].replace(".", ",")} ${unit}` : null;
}

/**
 * The customer-facing presentation a product name implies ("botella 0,5 L",
 * "bidón 5 L"), completed by the supplier's own wording when the name lacks the
 * container ("12 frascos de 370 g" → frasco). Null when no container is named:
 * guessing one would show the customer a package nobody chose.
 */
export function inferPresentationFromName(
	name: string,
	supplierPresentation?: string | null,
): InferredPresentation | null {
	const container =
		findContainer(name) ??
		(supplierPresentation ? findContainer(supplierPresentation) : null);
	if (!container) return null;

	return {
		presentationContainer: container,
		presentationSize:
			findSize(name) ??
			(supplierPresentation ? findSize(supplierPresentation) : null),
	};
}
