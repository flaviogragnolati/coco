"use client";

import { useEffect, useRef, useState } from "react";

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

function allButtons(container: HTMLElement | null) {
	return Array.from(container?.querySelectorAll("button") ?? []);
}

function enabledButtons(container: HTMLElement | null) {
	return allButtons(container).filter((button) => !button.disabled);
}

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
	// A pending order update disables every control and drops the focus to the
	// page; remembering the focused end lets it come back once the update lands.
	const focusedEnd = useRef<"first" | "last" | null>(null);
	// Silent until this card's controls change the order, so loading a saved
	// order does not read out every product in it.
	const [announces, setAnnounces] = useState(false);

	useEffect(() => {
		if (!swapFocus.current) return;
		swapFocus.current = false;
		const enabled = enabledButtons(controlsRef.current);
		// The "+", or the trash can when the minimum is the only quantity; back
		// out of the order, the "Sumar" button.
		(inCart ? enabled.at(-1) : enabled[0])?.focus();
	}, [inCart]);

	useEffect(() => {
		if (disabled || focusedEnd.current === null) return;
		const active = document.activeElement;
		if (active !== null && active !== document.body) return;
		const all = allButtons(controlsRef.current);
		const target = focusedEnd.current === "first" ? all[0] : all.at(-1);
		(target?.disabled
			? enabledButtons(controlsRef.current).at(-1)
			: target
		)?.focus();
	}, [disabled]);

	useEffect(() => {
		const controls = controlsRef.current;
		if (!controls) return;
		const onFocusIn = (event: FocusEvent) => {
			const all = allButtons(controls);
			focusedEnd.current =
				event.target === all[0]
					? "first"
					: event.target === all.at(-1)
						? "last"
						: null;
		};
		// Losing it to nothing is the disabling; to another element, the user's move.
		const onFocusOut = (event: FocusEvent) => {
			if (event.relatedTarget !== null) focusedEnd.current = null;
		};
		controls.addEventListener("focusin", onFocusIn);
		controls.addEventListener("focusout", onFocusOut);
		return () => {
			controls.removeEventListener("focusin", onFocusIn);
			controls.removeEventListener("focusout", onFocusOut);
		};
	}, []);

	const change = (apply: () => void) => {
		setAnnounces(true);
		apply();
	};

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
						onClick={() =>
							change(() => {
								swapFocus.current = true;
								onAdd();
							})
						}
						type="button"
						variant="highlight"
					>
						Sumar
					</Button>
				) : (
					<QuantityStepper
						disabled={disabled}
						labels={labels}
						onCommit={(quantity) => change(() => onQuantityChange(quantity))}
						onDecrement={() =>
							change(() =>
								onQuantityChange(getPreviousQuantity(inCartQuantity, terms)),
							)
						}
						onIncrement={() =>
							change(() =>
								onQuantityChange(getNextQuantity(inCartQuantity, terms)),
							)
						}
						presentation={presentation}
						remove={{
							label: labels.remove,
							onRemove: () =>
								change(() => {
									swapFocus.current = true;
									onRemove();
								}),
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
				{!announces
					? ""
					: inCartQuantity === null
						? labels.removed
						: getCartQuantityAnnouncement(inCartQuantity, unit, presentation)}
			</p>
		</div>
	);
}
