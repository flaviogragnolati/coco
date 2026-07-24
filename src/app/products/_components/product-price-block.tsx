import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import {
	formatCurrency,
	formatQuantity,
	getPerUnitPrice,
	productUnitLabelMap,
} from "~/shared/common/commerce.helpers";

type ProductPriceBlockVariant = "card" | "table" | "detail";

export function ProductPriceBlock({
	product,
	variant = "card",
}: {
	product: CatalogProductListItem;
	variant?: ProductPriceBlockVariant;
}) {
	const perUnit = getPerUnitPrice(product.terms);
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
