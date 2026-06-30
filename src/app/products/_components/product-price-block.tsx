import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import {
	formatCurrency,
	formatQuantity,
	productUnitLabelMap,
	toNumber,
} from "~/shared/common/commerce.helpers";

type ProductPriceBlockVariant = "card" | "table" | "detail";

/**
 * Per-unit price shown as a secondary reference. Prefers the explicit
 * refPrice; otherwise derives it from the MOQ block (moqPrice / moq),
 * guarding against divide-by-zero.
 */
function getPerUnitPrice(product: CatalogProductListItem): number | null {
	const refPrice = toNumber(product.terms.refPrice);
	if (refPrice !== null) return refPrice;

	const moqPrice = toNumber(product.terms.moqPrice);
	const moq = toNumber(product.terms.moq);
	if (moqPrice === null || moq === null || moq <= 0) return null;
	return moqPrice / moq;
}

export function ProductPriceBlock({
	product,
	variant = "card",
}: {
	product: CatalogProductListItem;
	variant?: ProductPriceBlockVariant;
}) {
	const perUnit = getPerUnitPrice(product);
	const perUnitLabel =
		perUnit === null
			? null
			: `≈ ${formatCurrency(perUnit, product.terms.currency)} / ${productUnitLabelMap[product.unit]}`;

	if (variant === "table") {
		return (
			<div className="flex flex-col gap-0.5">
				<span className="font-heading font-semibold text-sm">
					{formatCurrency(product.terms.moqPrice, product.terms.currency)}
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
				<span
					className={cn(
						"font-heading font-semibold",
						variant === "detail" ? "text-2xl" : "text-xl",
					)}
				>
					{formatCurrency(product.terms.moqPrice, product.terms.currency)}
				</span>
				<span className="text-muted-foreground text-xs">
					por bloque MOQ de {formatQuantity(product.terms.moq, product.unit)}
				</span>
				{perUnitLabel ? (
					<span className="text-muted-foreground text-xs">{perUnitLabel}</span>
				) : null}
			</div>
		</div>
	);
}
