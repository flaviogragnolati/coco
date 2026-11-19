"use client";

import { CheckIcon } from "lucide-react";
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
	formatCurrency,
	getNextQuantity,
	getPerStepPrice,
	getPreviousQuantity,
	type ProductPresentation,
} from "~/shared/common/commerce.helpers";
import { getTransferStepPrice } from "~/shared/common/transfer-discount";
import {
	getInitialPurchaseQuantity,
	getPurchasePanelMode,
	getPurchasePrice,
	showsQuantityUnit,
	toOfferPricing,
} from "../purchase-panel";

export function usePurchaseQuantity(terms: CatalogClientTerms) {
	return useState(() => getInitialPurchaseQuantity(terms));
}

type PurchasePanelSize = "compact" | "default" | "hero";

const headlineSizeClassName: Record<PurchasePanelSize, string> = {
	compact: "text-base sm:text-lg",
	default: "text-3xl",
	hero: "text-4xl",
};

export function PurchasePrice({
	pricing,
	size = "default",
	showDiscount = false,
	transferDiscountPercent = null,
}: {
	pricing: OfferPricing;
	size?: PurchasePanelSize;
	/** For surfaces without a discount badge over the product image. */
	showDiscount?: boolean;
	/** Only the product dialog passes it; cards never show the transfer price. */
	transferDiscountPercent?: number | null;
}) {
	const price = getPurchasePrice(pricing);
	const transferStepPrice = getTransferStepPrice(
		getPerStepPrice(pricing),
		transferDiscountPercent,
		pricing.currency,
	);
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-0.5">
				{/* Compact, the price and its step share a line at half a phone's width. */}
				<p
					className={cn(
						"flex flex-wrap items-baseline gap-y-1",
						size === "compact" ? "gap-x-1" : "gap-x-2",
					)}
				>
					<span
						className={cn(
							"font-bold font-heading tracking-tight",
							headlineSizeClassName[size],
						)}
					>
						{price.amount}
					</span>{" "}
					<span
						className={cn(
							"text-muted-foreground",
							size === "compact" ? "text-xs sm:text-sm" : "text-sm",
						)}
					>
						{price.unitLabel}
					</span>{" "}
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
				{transferStepPrice ? (
					<p className="font-medium text-sm tabular-nums">
						{formatCurrency(transferStepPrice, pricing.currency)} pagando con
						transferencia
					</p>
				) : null}
				{price.comparison ? (
					<p className="text-muted-foreground text-xs tabular-nums">
						{price.comparison.amount}{" "}
						<span aria-hidden="true">{price.comparison.measureLabel}</span>
						<span className="sr-only">{price.comparison.spokenLabel}</span>
					</p>
				) : size === "compact" ? (
					// Only a missing or unreadable size lands here; holds the line so the
					// steppers of a row stay aligned.
					<p aria-hidden="true" className="text-xs">
						&nbsp;
					</p>
				) : null}
			</div>
			{price.saving ? (
				<p className="w-fit rounded-full bg-brand-soft px-3 py-1.5 font-medium text-brand-soft-foreground text-xs">
					{price.saving}
				</p>
			) : null}
		</div>
	);
}

export function PurchaseActionButton({
	disabled,
	inCart,
	onAdd,
	onViewInCart,
}: {
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
			{inCart ? "Ver en tu pedido" : "Sumar al pedido"}
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
	transferDiscountPercent?: number | null;
};

/**
 * Price, quantity and action, top to bottom: the product dialog's and the home
 * spotlight's, where there is room to pick a quantity before adding. The total
 * is only announced to screen readers; the order shows it once added.
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
	transferDiscountPercent,
}: PurchasePanelProps) {
	const mode = getPurchasePanelMode(terms, inCartQuantity);
	return (
		<div className="mt-auto flex flex-col gap-3">
			<PurchasePrice
				pricing={toOfferPricing(terms, unit, presentation)}
				showDiscount={showDiscount}
				size={size}
				transferDiscountPercent={transferDiscountPercent}
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
				<div className="flex flex-col items-center">
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
						showUnit={showsQuantityUnit(unit)}
						size="lg"
						terms={terms}
						unit={unit}
						value={quantity}
					/>
					<p aria-live="polite" className="sr-only">
						{getOfferTotalLabel(terms, quantity)}
					</p>
				</div>
			)}
			{action}
		</div>
	);
}
