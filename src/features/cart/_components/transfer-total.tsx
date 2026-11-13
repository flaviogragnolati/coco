import type { CatalogCurrency } from "~/shared/common/catalog.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { applyTransferDiscount } from "~/shared/common/transfer-discount";

const percentFormatter = new Intl.NumberFormat("es-AR", {
	maximumFractionDigits: 2,
});

/** "10", "7,5": the percent as the customer reads it. */
export function formatTransferDiscountPercent(percent: number | string) {
	return percentFormatter.format(Number(percent));
}

/** "Con transferencia: $ X" under a total; nothing when there is no discount. */
export function TransferTotalHint({
	total,
	percent,
}: {
	total: { amount: string; currency: CatalogCurrency };
	percent: number | null;
}) {
	const breakdown = applyTransferDiscount({
		subtotal: total.amount,
		percent,
		currency: total.currency,
	});
	if (!breakdown) return null;

	return (
		<p className="text-right text-muted-foreground text-xs tabular-nums">
			Con transferencia: {formatCurrency(breakdown.total, total.currency)}
		</p>
	);
}

/**
 * Subtotal, discount and total of a transfer, from a fresh calculation or from
 * the columns an attempt froze (ADR 0013).
 */
export function TransferDiscountBreakdownRows({
	breakdown,
	currency,
	totalLabel,
}: {
	breakdown: {
		percent: number | string;
		subtotal: string;
		discount: string;
		total: string;
	};
	currency: CatalogCurrency;
	totalLabel: string;
}) {
	return (
		<div className="flex flex-col gap-1.5 text-sm tabular-nums">
			<div className="flex items-center justify-between gap-3">
				<span className="text-muted-foreground">Subtotal productos</span>
				<span>{formatCurrency(breakdown.subtotal, currency)}</span>
			</div>
			<div className="flex items-center justify-between gap-3">
				<span className="text-muted-foreground">
					{`Descuento por transferencia (${formatTransferDiscountPercent(breakdown.percent)} %)`}
				</span>
				<span>−{formatCurrency(breakdown.discount, currency)}</span>
			</div>
			<div className="flex items-center justify-between gap-3">
				<span className="font-medium">{totalLabel}</span>
				<span className="font-heading font-semibold text-lg">
					{formatCurrency(breakdown.total, currency)}
				</span>
			</div>
		</div>
	);
}
