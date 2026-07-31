import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { ProductImage } from "~/features/catalog/_components/product-image";
import type { HomeOffer } from "~/shared/common/home.types";
import {
	getMarketComparison,
	getOfferBlockPrice,
	getOfferDiscountLabel,
	getOfferMinimumLabel,
	getOfferStrikethroughPrice,
	getOfferUnitReference,
} from "../home-formatters";

export function HomeOfferCard({ offer }: { offer: HomeOffer }) {
	const unitReference = getOfferUnitReference(offer);
	const strikethroughPrice = getOfferStrikethroughPrice(offer);
	const discountLabel = getOfferDiscountLabel(offer);
	const marketComparison = getMarketComparison(offer);

	return (
		<Card className="h-full gap-0 py-0">
			<ProductImage
				className="flex aspect-4/3 w-full items-center justify-center rounded-t-4xl bg-brand-soft bg-center bg-cover text-brand-soft-foreground"
				imageUrl={offer.imageUrl}
				name={offer.productName}
			/>
			<CardHeader className="pt-5">
				<div className="flex flex-wrap gap-2">
					<Badge variant="highlight">Oferta vigente</Badge>
					<Badge variant="outline">{offer.currency}</Badge>
				</div>
				<CardTitle>
					<h3>{offer.productName}</h3>
				</CardTitle>
				<CardDescription>
					{offer.brandName ?? "Marca disponible próximamente"}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-1 py-5">
				<div className="flex flex-wrap items-baseline gap-2">
					<p className="font-heading font-semibold text-2xl">
						{getOfferBlockPrice(offer)}
					</p>
					{strikethroughPrice ? (
						<p className="text-muted-foreground text-sm line-through">
							{strikethroughPrice}
						</p>
					) : null}
					{discountLabel ? (
						<Badge variant="highlight">{discountLabel}</Badge>
					) : null}
				</div>
				<p className="text-muted-foreground text-xs">
					{getOfferMinimumLabel(offer)}
				</p>
				{unitReference ? (
					<p className="text-muted-foreground text-xs">{unitReference}</p>
				) : null}
				{marketComparison ? (
					<p className="text-success text-xs">{marketComparison}</p>
				) : null}
			</CardContent>
			<CardFooter className="pb-5">
				<Button asChild className="w-full" variant="outline">
					<Link href={`/products?product=${offer.productId}`}>
						Ver producto
						<ArrowRightIcon data-icon="inline-end" />
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
