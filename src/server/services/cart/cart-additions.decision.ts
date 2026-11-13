import type { CatalogClientTerms } from "~/shared/common/catalog.types";
import {
	normalizeCartQuantity,
	quantitiesEqual,
	toNumber,
	toQuantityString,
} from "~/shared/common/commerce.helpers";

export type CartAdditionRequest = { productId: number; quantity: string };

export type CartAdditionPlan =
	| { productId: number; outcome: "unavailable" }
	| {
			productId: number;
			termsId: number;
			quantity: string;
			outcome: "added" | "adjusted";
	  };

/**
 * What adding several products to a cart does to each line. Additive: a
 * product already in the cart under the same terms keeps its quantity and
 * grows by the requested one, then the sum is fitted to the terms. A product
 * requested twice is added once with both quantities.
 */
export function planCartAdditions(input: {
	requests: CartAdditionRequest[];
	termsByProductId: Map<number, CatalogClientTerms>;
	existingQuantityByTermsId: Map<number, string>;
}): CartAdditionPlan[] {
	const requestedByProductId = new Map<number, number>();
	for (const request of input.requests) {
		requestedByProductId.set(
			request.productId,
			(requestedByProductId.get(request.productId) ?? 0) +
				(toNumber(request.quantity) ?? 0),
		);
	}

	return Array.from(requestedByProductId, ([productId, requested]) => {
		const terms = input.termsByProductId.get(productId);
		if (!terms) return { productId, outcome: "unavailable" as const };

		const existing =
			toNumber(input.existingQuantityByTermsId.get(terms.id)) ?? 0;
		const wanted = toQuantityString(existing + requested);
		const quantity = normalizeCartQuantity(wanted, terms);

		return {
			productId,
			termsId: terms.id,
			quantity,
			outcome: quantitiesEqual(quantity, wanted)
				? ("added" as const)
				: ("adjusted" as const),
		};
	});
}
