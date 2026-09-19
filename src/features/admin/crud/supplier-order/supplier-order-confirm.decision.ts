import { sumScaled, toScaled } from "./supplier-order-quantity";

export type ConfirmLotItemInput = { quantity: string };

export type ConfirmLineInput = {
	confirmedQuantity?: string;
	overrides?: { removedQuantity?: string }[];
};

/**
 * Whether any line keeps "Confirmar" disabled: an unparsable or excessive
 * quantity, or a manual split that does not add up to the cut.
 *
 * A line confirmed at 0 cancels whole, so every allocation is removed and there
 * is nothing to split: its overrides are ignored. They can be stale from an
 * earlier partial cut, and the toggle that would clear them is hidden at 0.
 */
export function isConfirmBlocked(
	lotItems: ConfirmLotItemInput[],
	lines: (ConfirmLineInput | undefined)[] | undefined,
) {
	return lotItems.some((lotItem, index) => {
		const line = lines?.[index];
		if (!line) return true;

		const requested = toScaled(lotItem.quantity) ?? 0n;
		const confirmed = toScaled(line.confirmedQuantity ?? "");
		if (confirmed === null || confirmed > requested) return true;

		if (confirmed === 0n || line.overrides === undefined) return false;
		return (
			sumScaled(
				line.overrides.map(
					(override) => toScaled(override.removedQuantity ?? "") ?? 0n,
				),
			) !==
			requested - confirmed
		);
	});
}
