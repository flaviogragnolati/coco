"use client";

import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import { ProductCard } from "./product-card";

type ProductGridProps = {
	cartItemsByTermsId: Map<number, CartItem>;
	disabled?: boolean;
	products: CatalogProductListItem[];
	onAdd: (product: CatalogProductListItem) => void;
	onDetails: (productId: number) => void;
	onDecrement: (item: CartItem) => void;
	onIncrement: (item: CartItem) => void;
	onQuantityCommit: (item: CartItem, quantity: string) => void;
	onRemove: (productClientTermsId: number) => void;
};

export function ProductGrid({
	cartItemsByTermsId,
	disabled,
	products,
	onAdd,
	onDetails,
	onDecrement,
	onIncrement,
	onQuantityCommit,
	onRemove,
}: ProductGridProps) {
	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
			{products.map((product) => (
				<ProductCard
					cartItem={cartItemsByTermsId.get(product.terms.id)}
					disabled={disabled}
					key={product.id}
					onAdd={onAdd}
					onDecrement={onDecrement}
					onDetails={onDetails}
					onIncrement={onIncrement}
					onQuantityCommit={onQuantityCommit}
					onRemove={onRemove}
					product={product}
				/>
			))}
		</div>
	);
}
