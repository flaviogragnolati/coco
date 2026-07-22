import type { Prisma } from "~/prisma/client";

// Structural, not Prisma payload types: cart, checkout and operation records all
// satisfy these without any type change at the call sites.
export type TermsWindow = {
	active: boolean;
	deleted: boolean;
	fromDate: Date;
	toDate: Date | null;
};

export type OwnerFlags = {
	active: boolean;
	deleted: boolean;
};

// Both bounds are inclusive.
export function isTermsWindowCurrent(terms: TermsWindow, now: Date) {
	return (
		terms.active &&
		!terms.deleted &&
		terms.fromDate <= now &&
		(terms.toDate === null || terms.toDate >= now)
	);
}

export function isOwnerUsable(owner: OwnerFlags) {
	return owner.active && !owner.deleted;
}

export function isClientTermsUsable(
	terms: TermsWindow & { product: OwnerFlags },
	now: Date,
) {
	return isTermsWindowCurrent(terms, now) && isOwnerUsable(terms.product);
}

export function isSupplierTermsUsable(
	terms: TermsWindow & { supplier: OwnerFlags },
	now: Date,
) {
	return isTermsWindowCurrent(terms, now) && isOwnerUsable(terms.supplier);
}

// The SQL dialect of isTermsWindowCurrent.
export function currentTermsWhere(now: Date) {
	return {
		active: true,
		deleted: false,
		fromDate: { lte: now },
		OR: [{ toDate: null }, { toDate: { gte: now } }],
	} satisfies Prisma.ProductClientTermsWhereInput;
}
