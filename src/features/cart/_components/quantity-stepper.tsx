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
	/** `lg` keeps the mobile size on every screen: the purchase panel's. */
	size?: "default" | "lg";
	terms: CatalogClientTerms;
	unit: CatalogProductUnit;
	presentation?: ProductPresentation | null;
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
	value,
	onCommit,
	onDecrement,
	onIncrement,
}: QuantityStepperProps) {
	const [draft, setDraft] = useState(() => formatQuantityInput(value));
	const canIncrement = canIncrementQuantity(value, terms);
	const canDecrement = canDecrementQuantity(value, terms);
	const large = size === "lg";
	// 44px touch targets on mobile; compact rows shrink back from `sm` up.
	const buttonClassName = large ? "size-11" : "size-11 sm:size-8";

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
				!large && "sm:w-auto",
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
					!large && "sm:h-8 sm:w-36 sm:flex-none sm:text-sm",
				)}
			>
				<input
					aria-label={getQuantityFieldLabel(unit, presentation)}
					className="min-w-0 bg-transparent text-right font-medium tabular-nums outline-none disabled:cursor-not-allowed"
					disabled={disabled}
					inputMode="decimal"
					onBlur={commitDraft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.currentTarget.blur();
						}
					}}
					// Sized to its text so the unit reads right after the number.
					style={{ width: `${Math.max(draft.length, 1) + 0.5}ch` }}
					value={draft}
				/>
				<span aria-hidden="true" className="truncate text-muted-foreground">
					{getQuantitySuffix(draft, value, unit, presentation)}
				</span>
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
