"use client";

import { ProductCardGrid } from "~/features/catalog/_components/product-card-grid";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import { ProductCard, type ProductCardHandlers } from "./product-card";

type ProductGridProps = ProductCardHandlers & {
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
	onQuantityChange,
	onRemove,
}: ProductGridProps) {
	return (
		<ProductCardGrid>
			{products.map((product) => (
				<ProductCard
					disabled={disabled}
					inCartQuantity={cartQuantities.get(product.terms.id) ?? null}
					key={product.id}
					onAdd={onAdd}
					onDetails={onDetails}
					onQuantityChange={onQuantityChange}
					onRemove={onRemove}
					product={product}
				/>
			))}
		</ProductCardGrid>
	);
}
