import {
	catalogCurrencySchema,
	catalogProductUnitSchema,
	productPresentationContainerSchema,
} from "~/schemas/catalog.schemas";
import type { CatalogCurrency, CatalogProductUnit } from "./catalog.types";
import { getPerUnitPrice, type ProductPresentation } from "./commerce.helpers";

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: null;
}

/**
 * What a persisted `productSnapshot` (cart item or order item) says a quantity
 * is counted in. Snapshots written before the presentation existed carry only
 * the unit, so they fall back to the unit label.
 */
export function readSnapshotQuantityUnit(snapshot: unknown): {
	unit: CatalogProductUnit;
	presentation: ProductPresentation;
} {
	const product = asRecord(asRecord(snapshot)?.product);
	const unit = catalogProductUnitSchema.safeParse(product?.unit);
	const container = productPresentationContainerSchema.safeParse(
		product?.presentationContainer,
	);
	const size = product?.presentationSize;

	return {
		unit: unit.success ? unit.data : "other",
		presentation: {
			presentationContainer: container.success ? container.data : null,
			presentationSize: typeof size === "string" ? size : null,
		},
	};
}

/**
 * The product a persisted `productSnapshot` points at. The id is null when the
 * snapshot is too old or malformed to carry one.
 */
export function readSnapshotProduct(snapshot: unknown): {
	id: number | null;
	name: string;
} {
	const product = asRecord(asRecord(snapshot)?.product);
	const id = product?.id;
	const name = product?.name;

	return {
		id: typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null,
		name: typeof name === "string" && name.length > 0 ? name : "-",
	};
}

function asDecimalString(value: unknown): string | null {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return null;
}

/**
 * The offer unit price an order line was charged, read from the client terms
 * its `priceSnapshot` froze at checkout (ADR 0008). Null for snapshots that
 * carry no terms or no usable price.
 */
export function readSnapshotUnitPrice(
	priceSnapshot: unknown,
): { unitPrice: number; currency: CatalogCurrency } | null {
	const snapshot = asRecord(priceSnapshot);
	const terms = asRecord(snapshot?.productClientTerms);
	if (!terms) return null;

	const currency = catalogCurrencySchema.safeParse(
		terms.currency ?? snapshot?.currency,
	);
	if (!currency.success) return null;

	const unitPrice = getPerUnitPrice({
		unitPrice: asDecimalString(terms.unitPrice),
		moqPrice: asDecimalString(terms.moqPrice) ?? "",
		moq: asDecimalString(terms.moq) ?? "",
		discountPercent: asDecimalString(terms.discountPercent),
	});
	if (unitPrice === null) return null;

	return { unitPrice, currency: currency.data };
}

/**
 * Freezes the product's current presentation into a snapshot, so an order shows
 * the package it was bought in even if the cart line was added before it was set.
 */
export function withSnapshotPresentation(
	snapshot: unknown,
	presentation: Required<ProductPresentation>,
): unknown {
	const record = asRecord(snapshot);
	if (!record) return snapshot;

	return {
		...record,
		product: {
			...asRecord(record.product),
			presentationContainer: presentation.presentationContainer,
			presentationSize: presentation.presentationSize,
		},
	};
}
