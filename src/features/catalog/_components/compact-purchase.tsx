"use client";

import { useEffect, useRef } from "react";

import { Button } from "~/components/ui/button";
import { QuantityStepper } from "~/features/cart/_components/quantity-stepper";
import type {
	CatalogClientTerms,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	getNextQuantity,
	getPreviousQuantity,
	type ProductPresentation,
} from "~/shared/common/commerce.helpers";
import {
	getCartQuantityAnnouncement,
	getCompactPurchaseLabels,
} from "../compact-purchase";
import { showsQuantityUnit, toOfferPricing } from "../purchase-panel";
import { PurchasePrice } from "./purchase-panel";

export type CompactPurchaseProps = {
	name: string;
	terms: CatalogClientTerms;
	unit: CatalogProductUnit;
	presentation: ProductPresentation;
	/** The quantity in the order, or `null` when the product is not there. */
	inCartQuantity: string | null;
	disabled?: boolean;
	/** Adds the minimum. */
	onAdd: () => void;
	/** Sets the quantity already in the order. */
	onQuantityChange: (quantity: string) => void;
	onRemove: () => void;
};

/**
 * The price and a "Sumar" button that, once the product is in the order, turns
 * into a stepper editing that quantity; at the minimum its "−" is a trash can.
 * Takes the free space above itself so the controls of a row line up.
 */
export function CompactPurchase({
	name,
	terms,
	unit,
	presentation,
	inCartQuantity,
	disabled,
	onAdd,
	onQuantityChange,
	onRemove,
}: CompactPurchaseProps) {
	const labels = getCompactPurchaseLabels(name, terms, unit, presentation);
	const inCart = inCartQuantity !== null;
	const controlsRef = useRef<HTMLDivElement>(null);
	// Swapping the button for the stepper, or back, drops the focused element;
	// only a swap this card's own controls caused moves the focus along.
	const swapFocus = useRef(false);

	useEffect(() => {
		if (!swapFocus.current) return;
		swapFocus.current = false;
		const buttons = Array.from(
			controlsRef.current?.querySelectorAll<HTMLButtonElement>(
				"button:not(:disabled)",
			) ?? [],
		);
		// The "+", or the trash can when the minimum is the only quantity; back
		// out of the order, the "Sumar" button.
		(inCart ? buttons.at(-1) : buttons[0])?.focus();
	}, [inCart]);

	return (
		<div className="mt-auto flex flex-col gap-2">
			<PurchasePrice
				pricing={toOfferPricing(terms, unit, presentation)}
				size="compact"
			/>
			<div ref={controlsRef}>
				{inCartQuantity === null ? (
					<Button
						aria-label={labels.add}
						className="h-10 w-full rounded-full"
						disabled={disabled}
						onClick={() => {
							swapFocus.current = true;
							onAdd();
						}}
						type="button"
						variant="highlight"
					>
						Sumar
					</Button>
				) : (
					<QuantityStepper
						disabled={disabled}
						labels={labels}
						onCommit={onQuantityChange}
						onDecrement={() =>
							onQuantityChange(getPreviousQuantity(inCartQuantity, terms))
						}
						onIncrement={() =>
							onQuantityChange(getNextQuantity(inCartQuantity, terms))
						}
						presentation={presentation}
						remove={{
							label: labels.remove,
							onRemove: () => {
								swapFocus.current = true;
								onRemove();
							},
						}}
						showUnit={showsQuantityUnit(unit)}
						size="compact"
						terms={terms}
						unit={unit}
						value={inCartQuantity}
					/>
				)}
			</div>
			<p aria-live="polite" className="sr-only">
				{inCartQuantity === null
					? ""
					: getCartQuantityAnnouncement(inCartQuantity, unit, presentation)}
			</p>
		</div>
	);
}
