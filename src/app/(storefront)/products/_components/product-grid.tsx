"use client";

import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import type { CatalogPurchaseHandlers } from "./catalog-product-purchase";
import { ProductCard } from "./product-card";

type ProductGridProps = CatalogPurchaseHandlers & {
	cartItemsByTermsId: Map<number, CartItem>;
	disabled?: boolean;
	products: CatalogProductListItem[];
	onDetails: (productId: number) => void;
};

export function ProductGrid({
	cartItemsByTermsId,
	disabled,
	products,
	onAdd,
	onDetails,
	onViewInCart,
}: ProductGridProps) {
	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
			{products.map((product) => (
				<ProductCard
					disabled={disabled}
					inCartQuantity={
						cartItemsByTermsId.get(product.terms.id)?.quantity ?? null
					}
					key={product.id}
					onAdd={onAdd}
					onDetails={onDetails}
					onViewInCart={onViewInCart}
					product={product}
				/>
			))}
		</div>
	);
}
