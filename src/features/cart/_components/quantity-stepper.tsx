"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type {
	CatalogClientTerms,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	canDecrementQuantity,
	canIncrementQuantity,
	formatQuantity,
	formatQuantityInput,
	normalizeCartQuantity,
	type ProductPresentation,
	parseQuantityInput,
} from "~/shared/common/commerce.helpers";

type QuantityStepperProps = {
	className?: string;
	disabled?: boolean;
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
		<div className={cn("flex min-w-0 items-center gap-1", className)}>
			<Button
				aria-label="Reducir cantidad"
				disabled={disabled || !canDecrement}
				onClick={onDecrement}
				size="icon-sm"
				type="button"
				variant="outline"
			>
				<MinusIcon />
			</Button>
			<Input
				aria-label={`Cantidad en ${unit}`}
				className="h-7 w-24 text-center"
				disabled={disabled}
				inputMode="decimal"
				onBlur={commitDraft}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.currentTarget.blur();
					}
				}}
				value={draft}
			/>
			<Button
				aria-label="Aumentar cantidad"
				disabled={disabled || !canIncrement}
				onClick={onIncrement}
				size="icon-sm"
				type="button"
				variant="outline"
			>
				<PlusIcon />
			</Button>
			<span className="min-w-16 text-muted-foreground text-xs">
				{formatQuantity(value, unit, presentation)}
			</span>
		</div>
	);
}
