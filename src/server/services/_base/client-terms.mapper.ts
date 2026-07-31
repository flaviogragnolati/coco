import type { CatalogClientTerms } from "~/shared/common/catalog.types";

// Structural, not a Prisma payload type: the cart, checkout, catalog and admin
// selects all satisfy it. Decimals are typed by the only thing this module asks
// of them, which keeps Prisma out of the signature.
type Decimalish = { toString(): string };

export type ClientTermsSource = {
	id: number;
	moq: Decimalish;
	moqPrice: Decimalish;
	step: Decimalish | null;
	stepPrice: Decimalish | null;
	max: Decimalish | null;
	unitPrice: Decimalish | null;
	marketPrice: Decimalish | null;
	discountPercent: Decimalish | null;
	currency: CatalogClientTerms["currency"];
	fromDate: Date;
	toDate: Date | null;
};

export function termsToClientTerms(
	terms: ClientTermsSource,
): CatalogClientTerms {
	return {
		id: terms.id,
		moq: terms.moq.toString(),
		moqPrice: terms.moqPrice.toString(),
		step: terms.step?.toString() ?? null,
		stepPrice: terms.stepPrice?.toString() ?? null,
		max: terms.max?.toString() ?? null,
		unitPrice: terms.unitPrice?.toString() ?? null,
		marketPrice: terms.marketPrice?.toString() ?? null,
		discountPercent: terms.discountPercent?.toString() ?? null,
		currency: terms.currency,
		fromDate: terms.fromDate,
		toDate: terms.toDate,
	};
}
