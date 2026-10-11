import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ProductImage } from "~/features/catalog/_components/product-image";
import { cn } from "~/lib/utils";
import type { HomeOffer } from "~/shared/common/home.types";
import { getOfferDiscountLabel } from "../home-formatters";
import {
	HomeOfferPurchasePanel,
	HomeOfferQuantityProvider,
} from "./home-offer-quantity";

export function HomeOfferCard({
	offer,
	action,
	ignoreCart,
	size = "default",
}: {
	offer: HomeOffer;
	action?: ReactNode;
	ignoreCart?: boolean;
	size?: "default" | "hero";
}) {
	const discount = getOfferDiscountLabel(offer);
	const Heading = size === "hero" ? "h2" : "h3";
	const href = `/products?product=${offer.productId}`;
	return (
		<Card
			className={cn(
				"h-full gap-0 overflow-hidden py-0",
				size === "hero" && "shadow-xl",
			)}
		>
			<div className="relative">
				<Link aria-label={`Ver ${offer.productName}`} href={href}>
					<ProductImage
						className="flex aspect-4/3 w-full items-center justify-center bg-brand-soft bg-center bg-cover text-brand-soft-foreground"
						imageUrl={offer.imageUrl}
						name={offer.productName}
					/>
				</Link>
				{discount ? (
					<Badge className="absolute top-4 left-4" variant="highlight">
						{discount}
					</Badge>
				) : null}
			</div>
			<CardHeader className="gap-1 pt-5">
				{offer.brandName ? (
					<p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
						{offer.brandName}
					</p>
				) : null}
				<CardTitle>
					<Heading
						className={cn(
							"font-heading",
							size === "hero" ? "text-2xl" : "text-xl",
						)}
					>
						<Link href={href}>{offer.productName}</Link>
					</Heading>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col pt-4 pb-5">
				<HomeOfferQuantityProvider offer={offer}>
					<HomeOfferPurchasePanel
						action={action}
						ignoreCart={ignoreCart}
						offer={offer}
						size={size}
					/>
				</HomeOfferQuantityProvider>
			</CardContent>
		</Card>
	);
}
