import { expect, test } from "vitest";

import {
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
