"use client";

import { CartLineRow } from "~/features/cart/_components/cart-line-row";
import type { CartItem } from "~/shared/common/cart.types";

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
		<CartLineRow
			disabled={disabled}
			item={item}
			onDecrement={onDecrement}
			onIncrement={onIncrement}
			onQuantityCommit={onQuantityCommit}
			onRemove={onRemove}
			variant="full"
		/>
	);
}
