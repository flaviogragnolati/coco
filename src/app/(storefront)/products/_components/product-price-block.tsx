import { Badge } from "~/components/ui/badge";
import {
	getMarketComparison,
	getOfferBlockPrice,
	getOfferDiscountLabel,
	getOfferStrikethroughPrice,
	getOfferUnitReference,
} from "~/features/home/home-formatters";
import { cn } from "~/lib/utils";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import { formatQuantity } from "~/shared/common/commerce.helpers";

type ProductPriceBlockVariant = "card" | "table" | "detail";

export function ProductPriceBlock({
	product,
	variant = "card",
}: {
	product: CatalogProductListItem;
	variant?: ProductPriceBlockVariant;
}) {
	const offer = { ...product.terms, unit: product.unit };
	const blockPrice = getOfferBlockPrice(offer);
	const strikethroughPrice = getOfferStrikethroughPrice(offer);
	const discountLabel = getOfferDiscountLabel(offer);
	const marketComparison = getMarketComparison(offer);
	const perUnitLabel = getOfferUnitReference(offer);

	if (variant === "table") {
		return (
			<div className="flex flex-col gap-0.5">
				<span className="flex flex-wrap items-baseline gap-1.5">
					<span className="font-heading font-semibold text-sm">
						{blockPrice}
					</span>
					{strikethroughPrice ? (
						<span className="text-muted-foreground text-xs line-through">
							{strikethroughPrice}
						</span>
					) : null}
					{discountLabel ? (
						<Badge variant="highlight">{discountLabel}</Badge>
					) : null}
				</span>
				<span className="text-muted-foreground text-xs">
					MOQ {formatQuantity(product.terms.moq, product.unit)}
				</span>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-3">
			<div className="flex flex-wrap gap-2">
				<Badge variant="info">
					MOQ {formatQuantity(product.terms.moq, product.unit)}
				</Badge>
				<Badge variant="secondary">{product.terms.currency}</Badge>
				{product.terms.max ? (
					<Badge variant="outline">
						Máx {formatQuantity(product.terms.max, product.unit)}
					</Badge>
				) : null}
			</div>
			<div className="flex flex-col gap-0.5">
				<div className="flex flex-wrap items-baseline gap-2">
					<span
						className={cn(
							"font-heading font-semibold",
							variant === "detail" ? "text-2xl" : "text-xl",
						)}
					>
						{blockPrice}
					</span>
					{strikethroughPrice ? (
						<span className="text-muted-foreground text-sm line-through">
							{strikethroughPrice}
						</span>
					) : null}
					{discountLabel ? (
						<Badge variant="highlight">{discountLabel}</Badge>
					) : null}
				</div>
				<span className="text-muted-foreground text-xs">
					por bloque MOQ de {formatQuantity(product.terms.moq, product.unit)}
				</span>
				{perUnitLabel ? (
					<span className="text-muted-foreground text-xs">{perUnitLabel}</span>
				) : null}
				{marketComparison ? (
					<span className="text-success text-xs">{marketComparison}</span>
				) : null}
			</div>
		</div>
	);
}
