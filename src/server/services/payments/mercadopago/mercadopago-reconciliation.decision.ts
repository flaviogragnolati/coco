export type PaymentStatus =
	| "pending"
	| "inProcess"
	| "completed"
	| "failed"
	| "cancelled"
	| "refunded"
	| "chargedBack";

export function mapMercadoPagoPaymentStatus(
	status: string | undefined | null,
): PaymentStatus {
	switch (status) {
		case "approved":
			return "completed";
		case "authorized":
		case "in_process":
		case "in_mediation":
			return "inProcess";
		case "rejected":
			return "failed";
		case "cancelled":
			return "cancelled";
		case "refunded":
			return "refunded";
		case "charged_back":
			return "chargedBack";
		default:
			return "pending";
	}
}

export function shouldApplyMercadoPagoPaymentStatus(
	current: PaymentStatus,
	next: PaymentStatus,
) {
	if (current === next) return true;
	if (next === "refunded" || next === "chargedBack") return true;
	if (current === "refunded" || current === "chargedBack") return false;
	if (current === "completed") return false;
	if (next === "completed") return true;
	return true;
}

export function shouldSubmitOrderAfterMercadoPagoReconciliation(input: {
	completedAt: Date | null;
	status: PaymentStatus;
}) {
	return input.status === "completed" && input.completedAt === null;
}

export type MercadoPagoAmountAssessment =
	| { kind: "match" }
	| {
			kind: "missingAmount" | "currencyMismatch" | "amountMismatch";
			detail: string;
	  }
	| { kind: "partiallyRefunded"; detail: string };

export const MERCADOPAGO_AMOUNT_FAILURE_CODES = {
	missingAmount: "mp_missing_amount",
	currencyMismatch: "mp_currency_mismatch",
	amountMismatch: "mp_amount_mismatch",
	partiallyRefunded: "mp_partially_refunded",
} as const;

/**
 * Tells apart the failure codes this module owns from those written by a
 * payment gateway, so a healed re-fetch only clears its own flags.
 */
export function isMercadoPagoAmountFailureCode(code: string | null) {
	if (!code) return false;
	return Object.values(MERCADOPAGO_AMOUNT_FAILURE_CODES).some(
		(value) => value === code,
	);
}

function toCents(value: number) {
	return Math.round(value * 100);
}

/**
 * Compares what Mercado Pago reports it captured against what the attempt
 * recorded. Money is compared in integer cents, matching the outbound
 * preference invariant in `mercadopago-preference.decision.ts`.
 */
export function assessMercadoPagoPaymentAmounts(input: {
	expectedAmount: string;
	expectedCurrency: string;
	transactionAmount: number | null | undefined;
	transactionAmountRefunded: number | null | undefined;
	currencyId: string | null | undefined;
}): MercadoPagoAmountAssessment {
	const expectedAmountNumber = Number(input.expectedAmount);

	if (
		typeof input.transactionAmount !== "number" ||
		!Number.isFinite(input.transactionAmount) ||
		!Number.isFinite(expectedAmountNumber) ||
		!input.currencyId
	) {
		return {
			kind: "missingAmount",
			detail: `Mercado Pago no informó un monto o moneda utilizables (monto: ${String(input.transactionAmount)}, moneda: ${String(input.currencyId)}).`,
		};
	}

	if (input.currencyId !== input.expectedCurrency) {
		return {
			kind: "currencyMismatch",
			detail: `La moneda informada por Mercado Pago (${input.currencyId}) no coincide con la del intento (${input.expectedCurrency}).`,
		};
	}

	if (toCents(input.transactionAmount) !== toCents(expectedAmountNumber)) {
		return {
			kind: "amountMismatch",
			detail: `El monto informado por Mercado Pago (${input.transactionAmount}) no coincide con el del intento (${input.expectedAmount}).`,
		};
	}

	if (
		typeof input.transactionAmountRefunded === "number" &&
		Number.isFinite(input.transactionAmountRefunded) &&
		toCents(input.transactionAmountRefunded) > 0
	) {
		return {
			kind: "partiallyRefunded",
			detail: `Mercado Pago informó un monto reembolsado (${input.transactionAmountRefunded}) sobre el pago del intento.`,
		};
	}

	return { kind: "match" };
}
