import type {
	CatalogClientTerms,
	CatalogProductPresentationContainer,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	formatQuantity,
	isFixedQuantity,
	normalizeCartQuantity,
	quantitiesEqual,
	toNumber,
} from "~/shared/common/commerce.helpers";

export type ComboProductTerms = {
	name: string;
	unit: CatalogProductUnit;
	presentationContainer: CatalogProductPresentationContainer | null;
	/** Null when the product has no current client terms. */
	terms: CatalogClientTerms | null;
};

/** Trimmed and single-spaced as the admin will see it, or null when blank. */
export function normalizeComboGroupName(raw: string | null | undefined) {
	const name = raw?.trim().replace(/\s+/g, " ");
	return name ? name : null;
}

function quantityLabel(quantity: string, product: ComboProductTerms) {
	return formatQuantity(quantity, product.unit, {
		presentationContainer: product.presentationContainer,
		presentationSize: null,
	});
}

function quantityError(product: ComboProductTerms, terms: CatalogClientTerms) {
	const moq = quantityLabel(terms.moq, product);
	if (isFixedQuantity(terms)) {
		return `La cantidad de ${product.name} es fija: ${moq}.`;
	}
	const step = quantityLabel(terms.step ?? terms.moq, product);
	const max = toNumber(terms.max);
	const upTo =
		max === null ? "" : `, hasta ${quantityLabel(String(max), product)}`;
	return `La cantidad de ${product.name} tiene que ser ${moq} o más, de a ${step}${upTo}.`;
}

/**
 * A combo is saved only when every quantity is one the cart would accept as
 * is, so the card never quotes a quantity the add would change.
 */
export function validateComboItems(
	items: { productId: number; quantity: string }[],
	productsById: ReadonlyMap<number, ComboProductTerms>,
): string[] {
	if (items.length === 0) return ["Agregá al menos un producto."];

	const errors: string[] = [];
	const seen = new Set<number>();
	const currencies = new Set<string>();

	for (const item of items) {
		const product = productsById.get(item.productId);
		if (!product) {
			errors.push(`El producto #${item.productId} ya no está en el catálogo.`);
			continue;
		}
		if (seen.has(item.productId)) {
			errors.push(`${product.name} está dos veces.`);
			continue;
		}
		seen.add(item.productId);

		const { terms } = product;
		if (!terms) {
			errors.push(`${product.name} no tiene precio vigente.`);
			continue;
		}
		currencies.add(terms.currency);

		const quantity = toNumber(item.quantity);
		if (
			quantity === null ||
			quantity <= 0 ||
			!quantitiesEqual(normalizeCartQuantity(item.quantity, terms), quantity)
		) {
			errors.push(quantityError(product, terms));
		}
	}

	if (currencies.size > 1) {
		errors.push("Todos los productos tienen que tener la misma moneda.");
	}
	return errors;
}

/**
 * Within a group every combo declares its people and no two share the number,
 * so the card's selector has one distinct choice per combo. `siblings` are the
 * group's other non-deleted combos.
 */
export function validateComboGroup(
	combo: { id?: number; groupName: string | null; people: number | null },
	siblings: { id: number; name: string; people: number | null }[],
): string | null {
	if (!combo.groupName) return null;
	if (combo.people === null) {
		return "Un combo con grupo necesita la cantidad de personas.";
	}

	const clash = siblings.find(
		(sibling) => sibling.id !== combo.id && sibling.people === combo.people,
	);
	if (!clash) return null;

	const people = combo.people === 1 ? "1 persona" : `${combo.people} personas`;
	return `En el grupo ${combo.groupName} ya hay un combo para ${people} (${clash.name}).`;
}
