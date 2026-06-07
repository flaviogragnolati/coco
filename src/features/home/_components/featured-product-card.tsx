import { ImageIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import type { HomeFeaturedProduct } from "~/shared/common/home.types";
import { formatCurrency } from "../home-formatters";

export function FeaturedProductCard({
	product,
}: {
	product: HomeFeaturedProduct;
}) {
	return (
		<Card>
			{product.imageUrl ? (
				<div
					aria-label={product.productName}
					className="aspect-[16/9] w-full bg-center bg-cover"
					role="img"
					style={{ backgroundImage: `url(${product.imageUrl})` }}
				/>
			) : (
				<div className="flex aspect-[16/9] w-full items-center justify-center bg-muted text-muted-foreground">
					<ImageIcon />
				</div>
			)}
			<CardHeader>
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">Destacado</Badge>
					{product.refPrice && product.currency ? (
						<Badge variant="outline">
							{formatCurrency(product.refPrice, product.currency)}
						</Badge>
					) : null}
				</div>
				<CardTitle>{product.productName}</CardTitle>
				<CardDescription>
					{product.brandName ?? "Producto para compra consolidada"}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="line-clamp-2 text-muted-foreground text-xs/relaxed">
					{product.productDescription ??
						"Producto activo con condiciones vigentes para pedidos compartidos."}
				</p>
			</CardContent>
		</Card>
	);
}
