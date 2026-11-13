"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type {
	CatalogClientTerms,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	canDecrementQuantity,
	canIncrementQuantity,
	formatQuantityInput,
	normalizeCartQuantity,
	type ProductPresentation,
	parseQuantityInput,
} from "~/shared/common/commerce.helpers";
import {
	getQuantityFieldLabel,
	getQuantitySuffix,
} from "../quantity-stepper.labels";

type QuantityStepperProps = {
	className?: string;
	disabled?: boolean;
	/**
	 * `lg` keeps the mobile size on every screen: the purchase panel's. `md` is
	 * the compact card's: full width like `lg`, shrinking to 40px from `sm` up.
	 */
	size?: "default" | "md" | "lg";
	terms: CatalogClientTerms;
	unit: CatalogProductUnit;
	presentation?: ProductPresentation | null;
	/** Off, the field shows the bare number; its accessible name keeps the unit. */
	showUnit?: boolean;
	value: string;
	onCommit: (quantity: string) => void;
	onDecrement: () => void;
	onIncrement: () => void;
};

export function QuantityStepper({
	className,
	disabled,
	size = "default",
	terms,
	unit,
	presentation,
	showUnit = true,
	value,
	onCommit,
	onDecrement,
	onIncrement,
}: QuantityStepperProps) {
	const [draft, setDraft] = useState(() => formatQuantityInput(value));
	const canIncrement = canIncrementQuantity(value, terms);
	const canDecrement = canDecrementQuantity(value, terms);
	const fullWidth = size !== "default";
	// 44px touch targets on mobile; smaller sizes shrink back from `sm` up.
	const buttonClassName = {
		default: "size-11 sm:size-8",
		md: "size-11 sm:size-10",
		lg: "size-11",
	}[size];

	useEffect(() => {
		setDraft(formatQuantityInput(value));
	}, [value]);

	// Unreadable input keeps the current quantity instead of snapping to the
	// minimum.
	const commitDraft = () => {
		const normalized = normalizeCartQuantity(
			parseQuantityInput(draft) ?? value,
			terms,
		);
		setDraft(formatQuantityInput(normalized));
		onCommit(normalized);
	};

	return (
		<div
			className={cn(
				"flex w-full min-w-0 items-center gap-1.5",
				!fullWidth && "sm:w-auto",
				className,
			)}
		>
			<Button
				aria-label="Reducir cantidad"
				className={buttonClassName}
				disabled={disabled || !canDecrement}
				onClick={onDecrement}
				size="icon-sm"
				type="button"
				variant="outline"
			>
				<MinusIcon />
			</Button>
			<label
				className={cn(
					"flex h-11 min-w-0 flex-1 cursor-text items-center justify-center gap-1 rounded-3xl border border-transparent bg-input/50 px-3 text-base transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 has-disabled:cursor-not-allowed has-disabled:opacity-50",
					size === "default" && "sm:h-8 sm:w-36 sm:flex-none sm:text-sm",
					size === "md" && "sm:h-10",
				)}
			>
				<input
					aria-label={getQuantityFieldLabel(unit, presentation)}
					className={cn(
						"min-w-0 bg-transparent font-medium tabular-nums outline-none disabled:cursor-not-allowed",
						showUnit ? "text-right" : "text-center",
					)}
					disabled={disabled}
					inputMode="decimal"
					onBlur={commitDraft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.currentTarget.blur();
						}
					}}
					// Sized to its text so the unit, when shown, reads right after the number.
					style={{ width: `${Math.max(draft.length, 1) + 0.5}ch` }}
					value={draft}
				/>
				{showUnit ? (
					<span aria-hidden="true" className="truncate text-muted-foreground">
						{getQuantitySuffix(draft, value, unit, presentation)}
					</span>
				) : null}
			</label>
			<Button
				aria-label="Aumentar cantidad"
				className={buttonClassName}
				disabled={disabled || !canIncrement}
				onClick={onIncrement}
				size="icon-sm"
				type="button"
				variant="outline"
			>
				<PlusIcon />
			</Button>
		</div>
	);
}
