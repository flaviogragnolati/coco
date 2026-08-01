"use client";

import { CheckIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { ProductImage } from "~/features/catalog/_components/product-image";
import { getOfferBlockPrice } from "~/features/home/home-formatters";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";

type ProductMiniCardProps = {
	inCart: boolean;
	product: CatalogProductListItem;
	onSelect: (productId: number) => void;
};

export function ProductMiniCard({
	inCart,
	product,
	onSelect,
}: ProductMiniCardProps) {
	return (
		<button
			aria-label={`Ver ${product.name}`}
			className="flex items-center gap-3 rounded-2xl bg-card p-2 text-left shadow-xs ring-1 ring-foreground/5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 dark:ring-foreground/10"
			onClick={() => onSelect(product.id)}
			type="button"
		>
			<ProductImage
				className="flex aspect-square w-16 shrink-0 items-center justify-center rounded-xl bg-center bg-cover bg-muted text-muted-foreground"
				imageUrl={product.imageUrl}
				name={product.name}
			/>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="line-clamp-2 text-xs">{product.name}</span>
				<span className="flex flex-wrap items-center gap-1.5">
					<span className="font-heading font-semibold text-xs">
						{getOfferBlockPrice({ ...product.terms, unit: product.unit })}
					</span>
					{inCart ? (
						<Badge variant="success">
							<CheckIcon data-icon="inline-start" />
							En carrito
						</Badge>
					) : null}
				</span>
			</span>
		</button>
	);
}
