"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CompactPurchase } from "~/features/catalog/_components/compact-purchase";
import { ProductCardBadges } from "~/features/catalog/_components/product-card-badges";
import { ProductImage } from "~/features/catalog/_components/product-image";
import { getInitialPurchaseQuantity } from "~/features/catalog/purchase-panel";
import { getOfferDiscountLabel } from "~/features/home/home-formatters";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";

export type ProductCardHandlers = {
	onAdd: (product: CatalogProductListItem, quantity: string) => void;
	onQuantityChange: (product: CatalogProductListItem, quantity: string) => void;
	onRemove: (product: CatalogProductListItem) => void;
};

type ProductCardProps = ProductCardHandlers & {
	disabled?: boolean;
	/** The quantity already in the order, or `null` when it is not there. */
	inCartQuantity: string | null;
	product: CatalogProductListItem;
	onDetails: (productId: number) => void;
};

export function ProductCard({
	disabled,
	inCartQuantity,
	product,
	onAdd,
	onDetails,
	onQuantityChange,
	onRemove,
}: ProductCardProps) {
	const discount = getOfferDiscountLabel({
		...product.terms,
		unit: product.unit,
	});
	return (
		<Card className="h-full gap-0 overflow-hidden py-0" size="sm">
			<div className="relative">
				<button
					aria-label={`Ver ${product.name}`}
					className="block w-full focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
					onClick={() => onDetails(product.id)}
					type="button"
				>
					<ProductImage
						className="flex aspect-square w-full items-center justify-center"
						imageUrl={product.imageUrl}
						legend={{
							backdropColor: product.category?.photoBackgroundColor ?? null,
						}}
						name={product.name}
						placeholderClassName="bg-muted text-muted-foreground"
					/>
				</button>
				<ProductCardBadges discount={discount} />
			</div>
			<CardHeader className="px-3 pt-3 sm:px-4">
				<CardTitle>
					<h2 className="line-clamp-2 font-heading text-sm/snug sm:text-base">
						<button
							className="rounded-sm text-left hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
							onClick={() => onDetails(product.id)}
							type="button"
						>
							{product.name}
						</button>
					</h2>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col px-3 pt-2 pb-3 sm:px-4 sm:pb-4">
				<CompactPurchase
					disabled={disabled}
					inCartQuantity={inCartQuantity}
					name={product.name}
					onAdd={() =>
						onAdd(product, getInitialPurchaseQuantity(product.terms))
					}
					onQuantityChange={(quantity) => onQuantityChange(product, quantity)}
					onRemove={() => onRemove(product)}
					presentation={product}
					terms={product.terms}
					unit={product.unit}
				/>
			</CardContent>
		</Card>
	);
}
