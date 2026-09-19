import { describe, expect, it } from "vitest";

import {
	formatAttemptRefs,
	reconcileUnavailableReason,
} from "./payment.mappers";

describe("formatAttemptRefs", () => {
	it("labels both ids with the payment first", () => {
		expect(
			formatAttemptRefs({
				providerPaymentId: "pay-1",
				providerPreferenceId: "pref-1",
			}),
		).toEqual([
			{ label: "Pago", value: "pay-1" },
			{ label: "Preferencia", value: "pref-1" },
		]);
	});

	it("shows only the preference before the buyer pays", () => {
		expect(
			formatAttemptRefs({
				providerPaymentId: null,
				providerPreferenceId: "pref-1",
			}),
		).toEqual([{ label: "Preferencia", value: "pref-1" }]);
	});

	it("returns nothing without ids", () => {
		expect(
			formatAttemptRefs({
				providerPaymentId: null,
				providerPreferenceId: null,
			}),
		).toEqual([]);
	});
});

describe("reconcileUnavailableReason", () => {
	it("allows reconciling once a payment id exists", () => {
		expect(reconcileUnavailableReason({ providerPaymentId: "pay-1" })).toBe(
			null,
		);
	});

	it("explains the missing payment id", () => {
		expect(reconcileUnavailableReason({ providerPaymentId: null })).toBe(
			"Sin id de pago de Mercado Pago: el comprador todavía no pagó esta preferencia. El id llega con el webhook del pago.",
		);
	});
});
