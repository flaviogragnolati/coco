import { expect, test } from "vitest";

import {
	assessMercadoPagoPaymentAmounts,
	mapMercadoPagoPaymentStatus,
	shouldApplyMercadoPagoPaymentStatus,
	shouldSubmitOrderAfterMercadoPagoReconciliation,
} from "./mercadopago-reconciliation.decision";

test.each([
	["approved", "completed"],
	["authorized", "inProcess"],
	["in_process", "inProcess"],
	["in_mediation", "inProcess"],
	["rejected", "failed"],
	["cancelled", "cancelled"],
	["refunded", "refunded"],
	["charged_back", "chargedBack"],
	["unknown", "pending"],
	[null, "pending"],
] as const)("maps Mercado Pago status %s to %s", (provider, internal) => {
	expect(mapMercadoPagoPaymentStatus(provider)).toBe(internal);
});

test("approved provider evidence can recover a failed or cancelled attempt", () => {
	expect(shouldApplyMercadoPagoPaymentStatus("failed", "completed")).toBe(true);
	expect(shouldApplyMercadoPagoPaymentStatus("cancelled", "completed")).toBe(
		true,
	);
});

test("non-terminal evidence cannot downgrade a completed attempt", () => {
	for (const next of ["pending", "inProcess", "failed", "cancelled"] as const) {
		expect(shouldApplyMercadoPagoPaymentStatus("completed", next)).toBe(false);
	}
});

test("refund and chargeback evidence can supersede completion", () => {
	expect(shouldApplyMercadoPagoPaymentStatus("completed", "refunded")).toBe(
		true,
	);
	expect(shouldApplyMercadoPagoPaymentStatus("completed", "chargedBack")).toBe(
		true,
	);
});

test("refunded and charged-back attempts reject weaker later evidence", () => {
	expect(shouldApplyMercadoPagoPaymentStatus("refunded", "completed")).toBe(
		false,
	);
	expect(shouldApplyMercadoPagoPaymentStatus("chargedBack", "pending")).toBe(
		false,
	);
});

const baseAssessmentInput = {
	expectedAmount: "100.00",
	expectedCurrency: "ARS",
	transactionAmount: 100,
	transactionAmountRefunded: 0,
	currencyId: "ARS",
};

test.each([
	["match", {}],
	["missingAmount", { transactionAmount: null }],
	["missingAmount", { transactionAmount: Number.NaN }],
	["missingAmount", { currencyId: null }],
	["currencyMismatch", { currencyId: "USD" }],
	["amountMismatch", { transactionAmount: 100.01 }],
	["amountMismatch", { transactionAmount: 10 }],
	["partiallyRefunded", { transactionAmountRefunded: 40 }],
] as const)("assesses %s", (kind, overrides) => {
	expect(
		assessMercadoPagoPaymentAmounts({ ...baseAssessmentInput, ...overrides })
			.kind,
	).toBe(kind);
});

test("compares money in integer cents", () => {
	expect(
		assessMercadoPagoPaymentAmounts({
			...baseAssessmentInput,
			transactionAmount: 100.004,
		}).kind,
	).toBe("match");
	expect(
		assessMercadoPagoPaymentAmounts({
			...baseAssessmentInput,
			expectedAmount: "1000.50",
			transactionAmount: 1000.5,
		}).kind,
	).toBe("match");
});

test("a zero or absent refunded amount is not a partial refund", () => {
	for (const transactionAmountRefunded of [0, null, undefined]) {
		expect(
			assessMercadoPagoPaymentAmounts({
				...baseAssessmentInput,
				transactionAmountRefunded,
			}).kind,
		).toBe("match");
	}
});

test("currency is checked before the amount", () => {
	expect(
		assessMercadoPagoPaymentAmounts({
			...baseAssessmentInput,
			currencyId: "USD",
			transactionAmount: 3,
		}).kind,
	).toBe("currencyMismatch");
});

test("discrepancy details name both compared values", () => {
	const assessment = assessMercadoPagoPaymentAmounts({
		...baseAssessmentInput,
		transactionAmount: 10,
	});

	expect(assessment.kind).toBe("amountMismatch");
	expect(assessment.kind === "match" ? "" : assessment.detail).toContain("10");
	expect(assessment.kind === "match" ? "" : assessment.detail).toContain(
		"100.00",
	);
});

test("fulfillment advances once when an attempt first completes", () => {
	expect(
		shouldSubmitOrderAfterMercadoPagoReconciliation({
			completedAt: null,
			status: "completed",
		}),
	).toBe(true);
	expect(
		shouldSubmitOrderAfterMercadoPagoReconciliation({
			completedAt: new Date("2026-07-24T12:00:00.000Z"),
			status: "completed",
		}),
	).toBe(false);
	expect(
		shouldSubmitOrderAfterMercadoPagoReconciliation({
			completedAt: null,
			status: "pending",
		}),
	).toBe(false);
});
