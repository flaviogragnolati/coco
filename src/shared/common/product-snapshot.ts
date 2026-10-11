import {
	catalogProductUnitSchema,
	productPresentationContainerSchema,
} from "~/schemas/catalog.schemas";
import type { CatalogProductUnit } from "./catalog.types";
import type { ProductPresentation } from "./commerce.helpers";

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
