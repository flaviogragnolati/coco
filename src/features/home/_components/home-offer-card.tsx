import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { ProductImage } from "~/features/catalog/_components/product-image";
import { cn } from "~/lib/utils";
import type { HomeOffer } from "~/shared/common/home.types";
import {
	getMarketSavingLabel,
	getOfferDiscountLabel,
	getOfferHeadlinePrice,
	getOfferMinimumLabel,
	getOfferMinimumTotal,
	getOfferStrikethroughPrice,
} from "../home-formatters";

export function HomeOfferCard({
	offer,
	action,
	size = "default",
}: {
	offer: HomeOffer;
	action?: ReactNode;
	size?: "default" | "hero";
}) {
	const price = getOfferHeadlinePrice(offer);
	const previousPrice = getOfferStrikethroughPrice(offer);
	const discount = getOfferDiscountLabel(offer);
	const saving = getMarketSavingLabel(offer);
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
			<CardHeader className="gap-2 pt-5">
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
			<CardContent className="flex flex-1 flex-col gap-3 py-4">
				<div>
					<div className="flex flex-wrap items-baseline gap-2">
						<p
							className={cn(
								"font-bold font-heading tracking-tight",
								size === "hero" ? "text-4xl" : "text-3xl",
							)}
						>
							{price.amount}
						</p>
						{previousPrice ? (
							<del className="text-muted-foreground text-sm">
								{previousPrice}
							</del>
						) : null}
					</div>
					<p className="text-muted-foreground text-sm">{price.unitLabel}</p>
				</div>
				<p className="text-sm">{getOfferMinimumLabel(offer)}</p>
				{saving ? (
					<p className="w-fit rounded-full bg-brand-soft px-3 py-1.5 font-medium text-brand-soft-foreground text-xs">
						{saving}
					</p>
				) : null}
				<p className="mt-auto text-muted-foreground text-xs">
					{getOfferMinimumTotal(offer)}
				</p>
			</CardContent>
			{action ? <CardFooter className="pb-5">{action}</CardFooter> : null}
		</Card>
	);
}
