"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type {
	CatalogClientTerms,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	canDecrementQuantity,
	canIncrementQuantity,
	formatQuantity,
	normalizeCartQuantity,
} from "~/shared/common/commerce.helpers";

type QuantityStepperProps = {
	disabled?: boolean;
	terms: CatalogClientTerms;
	unit: CatalogProductUnit;
	value: string;
	onCommit: (quantity: string) => void;
	onDecrement: () => void;
	onIncrement: () => void;
};

export function QuantityStepper({
	disabled,
	terms,
	unit,
	value,
	onCommit,
	onDecrement,
	onIncrement,
}: QuantityStepperProps) {
	const [draft, setDraft] = useState(value);
	const canIncrement = canIncrementQuantity(value, terms);
	const canDecrement = canDecrementQuantity(value, terms);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	const commitDraft = () => {
		const normalized = normalizeCartQuantity(draft, terms);
		setDraft(normalized);
		onCommit(normalized);
	};

	return (
		<div className="flex min-w-0 items-center gap-1">
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
				{formatQuantity(value, unit)}
			</span>
		</div>
	);
}
