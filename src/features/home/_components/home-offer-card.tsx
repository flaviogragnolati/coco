import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ProductCardBadges } from "~/features/catalog/_components/product-card-badges";
import { ProductImage } from "~/features/catalog/_components/product-image";
import type { HomeOffer } from "~/shared/common/home.types";
import { getOfferDiscountLabel } from "../home-formatters";

/**
 * A home product card around its purchase block: compact in the grid; `hero`
 * in the spotlight band, photo beside the purchase and no card around them,
 * with `intro` over the title.
 */
export function HomeOfferCard({
	offer,
	children,
	size = "default",
	intro,
}: {
	offer: HomeOffer;
	children: ReactNode;
	size?: "default" | "hero";
	intro?: ReactNode;
}) {
	const discount = getOfferDiscountLabel(offer);
	const hero = size === "hero";
	const Heading = hero ? "h2" : "h3";
	const href = `/products?product=${offer.productId}`;
	const photo = (
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
	);

	if (hero) {
		return (
			<article className="grid gap-6 md:grid-cols-2 md:items-center md:gap-10">
				<div className="overflow-hidden rounded-3xl">{photo}</div>
				<div className="flex flex-col gap-5">
					{intro}
					<div className="flex flex-col gap-1">
						{offer.brandName ? (
							<p className="font-semibold text-brand-soft-foreground/70 text-xs uppercase tracking-widest">
								{offer.brandName}
							</p>
						) : null}
						<Heading className="font-bold font-heading text-[clamp(26px,3vw,34px)] leading-tight tracking-tight">
							<Link href={href}>{offer.productName}</Link>
						</Heading>
					</div>
					{children}
				</div>
			</article>
		);
	}

	return (
		<Card className="h-full gap-0 overflow-hidden py-0" size="sm">
			{photo}
			<CardHeader className="px-3 pt-3 sm:px-4">
				<CardTitle>
					<Heading className="line-clamp-2 font-heading text-sm/snug sm:text-base">
						<Link href={href}>{offer.productName}</Link>
					</Heading>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col px-3 pt-2 pb-3 sm:px-4 sm:pb-4">
				{children}
			</CardContent>
		</Card>
	);
}
