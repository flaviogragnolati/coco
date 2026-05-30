"use client";

import { Trash2Icon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { QuantityStepper } from "~/features/cart/_components/quantity-stepper";
import type { CartItem } from "~/shared/common/cart.types";
import {
	formatCurrency,
	formatQuantity,
} from "~/shared/common/commerce.helpers";

function CartItemImage({ item }: { item: CartItem }) {
	if (!item.product.imageUrl) {
		return (
			<div className="flex aspect-square w-20 shrink-0 items-center justify-center border bg-muted text-muted-foreground">
				<span className="font-heading text-lg">
					{item.product.name.at(0)?.toUpperCase() ?? "P"}
				</span>
			</div>
		);
	}

	return (
		<div
			aria-label={item.product.name}
			className="aspect-square w-20 shrink-0 border bg-center bg-cover bg-muted"
			role="img"
			style={{ backgroundImage: `url(${item.product.imageUrl})` }}
		/>
	);
}

export function CartItemRow({
	disabled,
	item,
	onDecrement,
	onIncrement,
	onQuantityCommit,
	onRemove,
}: {
	disabled?: boolean;
	item: CartItem;
	onDecrement: (item: CartItem) => void;
	onIncrement: (item: CartItem) => void;
	onQuantityCommit: (item: CartItem, quantity: string) => void;
	onRemove: (productClientTermsId: number) => void;
}) {
	return (
		<div className="grid gap-3 border p-3 sm:grid-cols-[auto_1fr_auto]">
			<div className="flex gap-3">
				<CartItemImage item={item} />
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
				<div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
					<span>MOQ {formatQuantity(item.terms.moq, item.product.unit)}</span>
					<span>
						Step{" "}
						{item.terms.step
							? formatQuantity(item.terms.step, item.product.unit)
							: "sin incrementos"}
					</span>
				</div>
				<QuantityStepper
					disabled={disabled}
					onCommit={(quantity) => onQuantityCommit(item, quantity)}
					onDecrement={() => onDecrement(item)}
					onIncrement={() => onIncrement(item)}
					terms={item.terms}
					unit={item.product.unit}
					value={item.quantity}
				/>
			</div>
			<div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
				<div className="flex flex-col gap-1 sm:text-right">
					<span className="text-muted-foreground text-xs">Subtotal</span>
					<span className="font-heading font-semibold">
						{formatCurrency(item.lineTotal, item.terms.currency)}
					</span>
				</div>
				<Button
					aria-label={`Quitar ${item.product.name}`}
					disabled={disabled}
					onClick={() => onRemove(item.productClientTermsId)}
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<Trash2Icon />
				</Button>
			</div>
		</div>
	);
}
