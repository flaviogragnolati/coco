import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ProductCardBadges } from "~/features/catalog/_components/product-card-badges";
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
	const hero = size === "hero";
	const Heading = hero ? "h2" : "h3";
	const href = `/products?product=${offer.productId}`;
	return (
		<Card
			className={cn("h-full gap-0 overflow-hidden py-0", hero && "shadow-xl")}
			size={hero ? "default" : "sm"}
		>
			<div className="relative">
				<Link aria-label={`Ver ${offer.productName}`} href={href}>
					<ProductImage
						className={cn(
							"flex w-full items-center justify-center bg-brand-soft bg-center bg-cover text-brand-soft-foreground",
							hero ? "aspect-4/3" : "aspect-3/2",
						)}
						imageUrl={offer.imageUrl}
						name={offer.productName}
					/>
				</Link>
				<ProductCardBadges discount={discount} />
			</div>
			<CardHeader className={hero ? "gap-1 pt-5" : "gap-0.5 pt-4"}>
				{offer.brandName ? (
					<p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
						{offer.brandName}
					</p>
				) : null}
				<CardTitle>
					<Heading
						className={cn(
							"font-heading",
							hero ? "text-2xl" : "line-clamp-2 text-base",
						)}
					>
						<Link href={href}>{offer.productName}</Link>
					</Heading>
				</CardTitle>
			</CardHeader>
			<CardContent
				className={cn("flex flex-1 flex-col", hero ? "pt-4 pb-5" : "pt-3 pb-4")}
			>
				<HomeOfferQuantityProvider offer={offer}>
					<HomeOfferPurchasePanel
						action={action}
						ignoreCart={ignoreCart}
						offer={offer}
						size={hero ? "hero" : "compact"}
					/>
				</HomeOfferQuantityProvider>
			</CardContent>
		</Card>
	);
}
