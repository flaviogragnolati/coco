import { Badge } from "~/components/ui/badge";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import {
	formatCurrency,
	formatQuantity,
	getDisplayPrice,
	getPriceLabel,
} from "~/shared/common/commerce.helpers";

export function ProductPriceBlock({
	product,
	compact = false,
}: {
	product: CatalogProductListItem;
	compact?: boolean;
}) {
	return (
		<div className="flex flex-col gap-2 border bg-muted/30 p-3">
			<div className="flex flex-wrap gap-2">
				<Badge variant="secondary">
					MOQ {formatQuantity(product.terms.moq, product.unit)}
				</Badge>
				{product.terms.max ? (
					<Badge variant="outline">
						Max {formatQuantity(product.terms.max, product.unit)}
					</Badge>
				) : null}
			</div>
			<div className="flex flex-col gap-0.5">
				<span className="text-muted-foreground text-xs">
					{getPriceLabel(product.terms, product.unit)}
				</span>
				<span
					className={
						compact ? "font-semibold" : "font-heading font-semibold text-xl"
					}
				>
					{formatCurrency(
						getDisplayPrice(product.terms),
						product.terms.currency,
					)}
				</span>
			</div>
		</div>
	);
}
