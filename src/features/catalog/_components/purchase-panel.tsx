"use client";

import { CheckIcon, ShoppingCartIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { QuantityStepper } from "~/features/cart/_components/quantity-stepper";
import {
	getOfferFixedQuantityLabel,
	getOfferInCartLabel,
	getOfferTotalLabel,
	type OfferPricing,
} from "~/features/home/home-formatters";
import { cn } from "~/lib/utils";
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
	getInitialPurchaseQuantity,
	getPurchasePanelMode,
	getPurchasePrice,
	toOfferPricing,
} from "../purchase-panel";

export function usePurchaseQuantity(terms: CatalogClientTerms) {
	return useState(() => getInitialPurchaseQuantity(terms));
}

export function PurchasePrice({
	pricing,
	size = "default",
	showDiscount = false,
}: {
	pricing: OfferPricing;
	size?: "default" | "hero";
	/** For surfaces without a discount badge over the product image. */
	showDiscount?: boolean;
}) {
	const price = getPurchasePrice(pricing);
	return (
		<div className="flex flex-col gap-2">
			<p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				<span
					className={cn(
						"font-bold font-heading tracking-tight",
						size === "hero" ? "text-4xl" : "text-3xl",
					)}
				>
					{price.amount}
				</span>{" "}
				<span className="text-muted-foreground text-sm">{price.unitLabel}</span>{" "}
				{price.previousAmount ? (
					<del className="text-muted-foreground text-sm">
						{price.previousAmount}
					</del>
				) : null}
				{showDiscount && price.discount ? (
					<Badge className="self-center" variant="highlight">
						{price.discount}
					</Badge>
				) : null}
			</p>
			{price.saving ? (
				<p className="w-fit rounded-full bg-brand-soft px-3 py-1.5 font-medium text-brand-soft-foreground text-xs">
					{price.saving}
				</p>
			) : null}
		</div>
	);
}

export function PurchaseActionButton({
	addLabel = "Sumar al pedido",
	disabled,
	inCart,
	onAdd,
	onViewInCart,
}: {
	addLabel?: string;
	disabled?: boolean;
	inCart: boolean;
	onAdd: () => void;
	onViewInCart: () => void;
}) {
	return (
		<Button
			className="h-11 w-full rounded-full"
			disabled={disabled}
			onClick={inCart ? onViewInCart : onAdd}
			size="lg"
			type="button"
			variant="highlight"
		>
			<ShoppingCartIcon data-icon="inline-start" />
			{inCart ? "Ver en tu pedido" : addLabel}
		</Button>
	);
}

type PurchasePanelProps = {
	terms: CatalogClientTerms;
	unit: CatalogProductUnit;
	presentation: ProductPresentation;
	/** The selection the action adds; ignored once the product is in the order. */
	quantity: string;
	onQuantityChange: (quantity: string) => void;
	/** The quantity already in the order, or `null` when it is not there. */
	inCartQuantity: string | null;
	/** The full-width button, usually a `PurchaseActionButton`. */
	action?: ReactNode;
	disabled?: boolean;
	size?: "default" | "hero";
	showDiscount?: boolean;
	className?: string;
};

/**
 * Price, quantity, total and action, top to bottom. It takes the free space
 * above itself so the buttons of a row of cards line up.
 */
export function PurchasePanel({
	terms,
	unit,
	presentation,
	quantity,
	onQuantityChange,
	inCartQuantity,
	action,
	disabled,
	size = "default",
	showDiscount,
	className,
}: PurchasePanelProps) {
	const mode = getPurchasePanelMode(terms, inCartQuantity);
	return (
		<div className={cn("mt-auto flex flex-col gap-3", className)}>
			<PurchasePrice
				pricing={toOfferPricing(terms, unit, presentation)}
				showDiscount={showDiscount}
				size={size}
			/>
			{mode === "in-cart" && inCartQuantity !== null ? (
				<p className="flex min-h-11 items-center justify-center gap-1.5 text-center font-medium text-sm text-success">
					<CheckIcon aria-hidden="true" className="size-4 shrink-0" />
					{getOfferInCartLabel(inCartQuantity, unit, presentation)}
				</p>
			) : mode === "fixed" ? (
				<p className="flex min-h-11 items-center justify-center text-center font-medium text-sm">
					{getOfferFixedQuantityLabel(terms, unit, presentation)}
				</p>
			) : (
				<div className="flex flex-col items-center gap-2">
					<QuantityStepper
						disabled={disabled}
						onCommit={onQuantityChange}
						onDecrement={() =>
							onQuantityChange(getPreviousQuantity(quantity, terms))
						}
						onIncrement={() =>
							onQuantityChange(getNextQuantity(quantity, terms))
						}
						presentation={presentation}
						size="lg"
						terms={terms}
						unit={unit}
						value={quantity}
					/>
					<p aria-live="polite" className="font-medium text-sm">
						{getOfferTotalLabel(terms, quantity)}
					</p>
				</div>
			)}
			{action}
		</div>
	);
}
