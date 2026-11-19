import type {
	CatalogClientTerms,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	formatQuantity,
	getStepQuantity,
	type ProductPresentation,
} from "~/shared/common/commerce.helpers";

/**
 * Accessible names for the compact card's controls. Each one names the product,
 * because a screen reader moving through the grid hears the button alone.
 */
export function getCompactPurchaseLabels(
	name: string,
	terms: Pick<CatalogClientTerms, "step" | "moq">,
	unit: CatalogProductUnit,
	presentation: ProductPresentation,
) {
	const step = formatQuantity(getStepQuantity(terms), unit, {
		presentationContainer: presentation.presentationContainer,
		presentationSize: null,
	});
	return {
		add: `Sumar ${name} a tu pedido`,
		increment: `Sumar ${step} más de ${name}`,
		decrement: `Restar ${step} de ${name}`,
		remove: `Quitar ${name} de tu pedido`,
	};
}

export function getCartQuantityAnnouncement(
	quantity: string,
	unit: CatalogProductUnit,
	presentation: ProductPresentation,
) {
	return `Tenés ${formatQuantity(quantity, unit, presentation)} en tu pedido`;
}
