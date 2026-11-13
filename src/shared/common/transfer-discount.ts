import type { CatalogCurrency } from "./catalog.types";
import { toMoneyString } from "./commerce.helpers";

export const TRANSFER_DISCOUNT_MAX_PERCENT = 50;

/** The percent a customer can get, or null when there is no discount to apply. */
export function normalizeTransferDiscountPercent(
	value: unknown,
): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	if (value <= 0 || value > TRANSFER_DISCOUNT_MAX_PERCENT) return null;
	return value;
}

/** Amounts are `toMoneyString` strings ("123660.00"). */
export type TransferDiscountBreakdown = {
	percent: number;
	subtotal: string;
	discount: string;
	total: string;
};

/**
 * The transfer discount on a products subtotal (ADR 0013). The total is
 * rounded down to the whole peso, so the customer never gets less than the
 * advertised percent, and the discount is whatever that leaves. Pesos only: a
 * whole-peso rounding means nothing in another currency.
 *
 * Integer arithmetic on cents and basis points keeps it exact while
 * cents × (10 000 − bps) is a safe integer, about $ 9 000 millones of
 * subtotal; past that it gives no discount rather than a wrong one.
 */
export function applyTransferDiscount(input: {
	subtotal: string | number;
	percent: number | null;
	currency: CatalogCurrency;
}): TransferDiscountBreakdown | null {
	const percent = normalizeTransferDiscountPercent(input.percent);
	if (percent === null || input.currency !== "ARS") return null;

	const subtotal = Number(input.subtotal);
	if (!Number.isFinite(subtotal) || subtotal <= 0) return null;

	const subtotalCents = Math.round(subtotal * 100);
	const basisPoints = Math.round(percent * 100);
	const scaled = subtotalCents * (10_000 - basisPoints);
	if (!Number.isSafeInteger(scaled)) return null;

	const totalPesos = (scaled - (scaled % 1_000_000)) / 1_000_000;

	return {
		percent,
		subtotal: toMoneyString(subtotalCents / 100),
		discount: toMoneyString((subtotalCents - totalPesos * 100) / 100),
		total: toMoneyString(totalPesos),
	};
}

/**
 * One step of a product at the transfer price. It rounds the step, while the
 * order rounds its total, so with several steps the two may differ by $ 1; the
 * order is the one charged.
 */
export function getTransferStepPrice(
	stepPrice: number | null,
	percent: number | null,
	currency: CatalogCurrency,
): string | null {
	if (stepPrice === null) return null;
	return (
		applyTransferDiscount({ subtotal: stepPrice, percent, currency })?.total ??
		null
	);
}

/**
 * What a new payment attempt charges for a products subtotal. Only the
 * external provider takes the transfer discount; Mercado Pago always charges
 * the sum of the lines, which its preference invariant requires. The checkout
 * screen runs the same function to show and send the amount it expects.
 */
export function decideAttemptCharge(input: {
	provider: string;
	subtotal: string;
	currency: CatalogCurrency;
	transferDiscountPercent: number | null;
}): { amount: string; transferDiscount: TransferDiscountBreakdown | null } {
	const subtotal = toMoneyString(Number(input.subtotal));
	if (input.provider !== "external") {
		return { amount: subtotal, transferDiscount: null };
	}

	const transferDiscount = applyTransferDiscount({
		subtotal: input.subtotal,
		percent: input.transferDiscountPercent,
		currency: input.currency,
	});

	return transferDiscount
		? { amount: transferDiscount.total, transferDiscount }
		: { amount: subtotal, transferDiscount: null };
}

/** Same amount in whole cents. A non-numeric amount equals nothing. */
export function moneyEquals(left: string, right: string): boolean {
	const leftValue = Number(left);
	const rightValue = Number(right);
	if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return false;
	return Math.round(leftValue * 100) === Math.round(rightValue * 100);
}
