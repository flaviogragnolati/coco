import type { CatalogProductUnit } from "~/shared/common/catalog.types";
import {
	formatUnitLabel,
	type ProductPresentation,
	parseQuantityInput,
} from "~/shared/common/commerce.helpers";

/**
 * The field's accessible name. Always plural so it stays put while the
 * quantity changes: "Cantidad (kg)", "Cantidad (frascos 370 g)".
 */
export function getQuantityFieldLabel(
	unit: CatalogProductUnit,
	presentation?: ProductPresentation | null,
) {
	return `Cantidad (${formatUnitLabel(2, unit, presentation)})`;
}

/**
 * The unit shown inside the field, agreeing with what is typed so far and
 * falling back to the committed quantity while the draft is unreadable.
 */
export function getQuantitySuffix(
	draft: string,
	committed: string,
	unit: CatalogProductUnit,
	presentation?: ProductPresentation | null,
) {
	return formatUnitLabel(
		parseQuantityInput(draft) ?? committed,
		unit,
		presentation,
	);
}
