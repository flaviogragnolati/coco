"use client";

import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import { ProductCard } from "./product-card";

type ProductGridProps = {
	cartItemsByTermsId: Map<number, CartItem>;
	disabled?: boolean;
	products: CatalogProductListItem[];
	onDetails: (productId: number) => void;
	onDecrement: (item: CartItem) => void;
	onIncrement: (item: CartItem) => void;
	onQuantityCommit: (item: CartItem, quantity: string) => void;
	onSetItem: (item: CartItem) => void;
};

export function ProductGrid({
	cartItemsByTermsId,
	disabled,
	products,
	onDetails,
	onDecrement,
	onIncrement,
	onQuantityCommit,
	onSetItem,
}: ProductGridProps) {
	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{products.map((product) => (
				<ProductCard
					cartItem={cartItemsByTermsId.get(product.terms.id)}
					disabled={disabled}
					key={product.id}
					onDecrement={onDecrement}
					onDetails={onDetails}
					onIncrement={onIncrement}
					onQuantityCommit={onQuantityCommit}
					onSetItem={onSetItem}
					product={product}
				/>
			))}
		</div>
	);
}
