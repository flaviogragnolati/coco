import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ProductCardBadges } from "~/features/catalog/_components/product-card-badges";
import { ProductImage } from "~/features/catalog/_components/product-image";
import { cn } from "~/lib/utils";
import type { HomeOffer } from "~/shared/common/home.types";
import { getOfferDiscountLabel } from "../home-formatters";

/**
 * A home product card around its purchase block: compact in the grid, `hero`
 * in the spotlight band, where the brand and a larger title fit.
 */
export function HomeOfferCard({
	offer,
	children,
	size = "default",
}: {
	offer: HomeOffer;
	children: ReactNode;
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
						className="flex aspect-square w-full items-center justify-center"
						imageUrl={offer.imageUrl}
						legend={{ backdropColor: offer.photoBackgroundColor }}
						name={offer.productName}
						placeholderClassName="bg-brand-soft text-brand-soft-foreground"
					/>
				</Link>
				<ProductCardBadges discount={discount} />
			</div>
			<CardHeader className={hero ? "gap-1 pt-5" : "px-3 pt-3 sm:px-4"}>
				{hero && offer.brandName ? (
					<p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
						{offer.brandName}
					</p>
				) : null}
				<CardTitle>
					<Heading
						className={cn(
							"font-heading",
							hero ? "text-2xl" : "line-clamp-2 text-sm/snug sm:text-base",
						)}
					>
						<Link href={href}>{offer.productName}</Link>
					</Heading>
				</CardTitle>
			</CardHeader>
			<CardContent
				className={cn(
					"flex flex-1 flex-col",
					hero ? "pt-4 pb-5" : "px-3 pt-2 pb-3 sm:px-4 sm:pb-4",
				)}
			>
				{children}
			</CardContent>
		</Card>
	);
}
