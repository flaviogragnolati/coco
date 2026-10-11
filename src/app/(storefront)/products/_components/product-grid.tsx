"use client";

import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import type { CatalogPurchaseHandlers } from "./catalog-product-purchase";
import { ProductCard } from "./product-card";

type ProductGridProps = CatalogPurchaseHandlers & {
	/** Quantities already in the order, by terms id. */
	cartQuantities: Map<number, string>;
	disabled?: boolean;
	products: CatalogProductListItem[];
	onDetails: (productId: number) => void;
};

export function ProductGrid({
	cartQuantities,
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
					inCartQuantity={cartQuantities.get(product.terms.id) ?? null}
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
