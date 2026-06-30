"use client";

import { Trash2Icon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { QuantityStepper } from "~/features/cart/_components/quantity-stepper";
import { cn } from "~/lib/utils";
import type { CartItem } from "~/shared/common/cart.types";
import {
	formatCurrency,
	formatQuantity,
} from "~/shared/common/commerce.helpers";

type CartLineRowProps = {
	item: CartItem;
	disabled?: boolean;
	/**
	 * Display-only mode: renders the quantity as text and hides the remove
	 * button. When set, the editing callbacks are not required. Used by the
	 * checkout Pedido/Confirmar item lists.
	 */
	readOnly?: boolean;
	variant?: "compact" | "full";
	onDecrement?: (item: CartItem) => void;
	onIncrement?: (item: CartItem) => void;
	onQuantityCommit?: (item: CartItem, quantity: string) => void;
	onRemove?: (productClientTermsId: number) => void;
};

function CartLineImage({
	item,
	className,
}: {
	item: CartItem;
	className?: string;
}) {
	if (!item.product.imageUrl) {
		return (
			<div
				className={cn(
					"flex shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground",
					className,
				)}
			>
				<span className="font-heading text-lg">
					{item.product.name.at(0)?.toUpperCase() ?? "P"}
				</span>
			</div>
		);
	}

	return (
		<div
			aria-label={item.product.name}
			className={cn(
				"shrink-0 rounded-2xl bg-center bg-cover bg-muted",
				className,
			)}
			role="img"
			style={{ backgroundImage: `url(${item.product.imageUrl})` }}
		/>
	);
}

export function CartLineRow({
	item,
	disabled,
	readOnly = false,
	variant = "full",
	onDecrement,
	onIncrement,
	onQuantityCommit,
	onRemove,
}: CartLineRowProps) {
	if (variant === "compact") {
		return (
			<div className="flex gap-3 rounded-3xl bg-muted/40 p-3">
				<CartLineImage className="aspect-square w-16" item={item} />
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="flex items-start justify-between gap-2">
						<div className="flex min-w-0 flex-col">
							<span className="truncate font-medium text-sm">
								{item.product.name}
							</span>
							<span className="text-muted-foreground text-xs">
								{item.product.brandName ?? "Sin marca"}
							</span>
						</div>
						{readOnly ? null : (
							<Button
								aria-label={`Quitar ${item.product.name}`}
								disabled={disabled}
								onClick={() => onRemove?.(item.productClientTermsId)}
								size="icon-xs"
								type="button"
								variant="ghost"
							>
								<Trash2Icon />
							</Button>
						)}
					</div>
					<div className="flex items-center justify-between gap-2">
						{readOnly ? (
							<span className="text-muted-foreground text-xs">
								{formatQuantity(item.quantity, item.product.unit)}
							</span>
						) : (
							<QuantityStepper
								disabled={disabled}
								onCommit={(quantity) => onQuantityCommit?.(item, quantity)}
								onDecrement={() => onDecrement?.(item)}
								onIncrement={() => onIncrement?.(item)}
								terms={item.terms}
								unit={item.product.unit}
								value={item.quantity}
							/>
						)}
						<span className="shrink-0 font-heading font-semibold text-sm">
							{formatCurrency(item.lineTotal, item.terms.currency)}
						</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="grid gap-3 rounded-3xl bg-card p-3 shadow-sm ring-1 ring-foreground/5 sm:grid-cols-[auto_1fr_auto] dark:ring-foreground/10">
			<div className="flex gap-3">
				<CartLineImage className="aspect-square w-20" item={item} />
				<div className="flex min-w-0 flex-col gap-1 sm:hidden">
					<span className="font-medium">{item.product.name}</span>
					<span className="text-muted-foreground text-xs">
						{item.product.brandName ?? "Sin marca"}
					</span>
				</div>
			</div>
			<div className="flex min-w-0 flex-col gap-3">
				<div className="hidden min-w-0 flex-col gap-1 sm:flex">
					<span className="font-medium">{item.product.name}</span>
					<span className="text-muted-foreground text-xs">
						{item.product.brandName ?? "Sin marca"}
					</span>
				</div>
				<p className="line-clamp-2 text-muted-foreground text-xs/relaxed">
					{item.product.description ??
						"Producto agregado para compra mayorista compartida."}
				</p>
				<div className="flex flex-wrap gap-2">
					<Badge variant="info">
						MOQ {formatQuantity(item.terms.moq, item.product.unit)}
					</Badge>
					<Badge variant="secondary">
						Step{" "}
						{item.terms.step
							? formatQuantity(item.terms.step, item.product.unit)
							: "sin incrementos"}
					</Badge>
				</div>
				{readOnly ? (
					<span className="text-muted-foreground text-sm">
						{formatQuantity(item.quantity, item.product.unit)}
					</span>
				) : (
					<QuantityStepper
						disabled={disabled}
						onCommit={(quantity) => onQuantityCommit?.(item, quantity)}
						onDecrement={() => onDecrement?.(item)}
						onIncrement={() => onIncrement?.(item)}
						terms={item.terms}
						unit={item.product.unit}
						value={item.quantity}
					/>
				)}
			</div>
			<div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
				<div className="flex flex-col gap-1 sm:text-right">
					<span className="text-muted-foreground text-xs">Subtotal</span>
					<span className="font-heading font-semibold">
						{formatCurrency(item.lineTotal, item.terms.currency)}
					</span>
				</div>
				{readOnly ? null : (
					<Button
						aria-label={`Quitar ${item.product.name}`}
						disabled={disabled}
						onClick={() => onRemove?.(item.productClientTermsId)}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<Trash2Icon />
					</Button>
				)}
			</div>
		</div>
	);
}
