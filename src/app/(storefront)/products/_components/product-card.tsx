"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ProductCardBadges } from "~/features/catalog/_components/product-card-badges";
import { ProductImage } from "~/features/catalog/_components/product-image";
import { getOfferDiscountLabel } from "~/features/home/home-formatters";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import {
	CatalogProductPurchase,
	type CatalogPurchaseHandlers,
} from "./catalog-product-purchase";

type ProductCardProps = CatalogPurchaseHandlers & {
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
	onViewInCart,
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
						className="flex aspect-3/2 w-full items-center justify-center bg-center bg-cover bg-muted text-muted-foreground"
						imageUrl={product.imageUrl}
						name={product.name}
					/>
				</button>
				<ProductCardBadges discount={discount} />
			</div>
			<CardHeader className="gap-0.5 pt-4">
				{product.brand ? (
					<p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
						{product.brand.name}
					</p>
				) : null}
				<CardTitle>
					<h2 className="line-clamp-2 font-heading text-base">
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
			<CardContent className="flex flex-1 flex-col pt-3 pb-4">
				<CatalogProductPurchase
					disabled={disabled}
					inCartQuantity={inCartQuantity}
					key={product.terms.id}
					onAdd={onAdd}
					onViewInCart={onViewInCart}
					product={product}
					size="compact"
				/>
			</CardContent>
		</Card>
	);
}
