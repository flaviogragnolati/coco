import { describe, expect, test } from "vitest";

import {
	applyTransferDiscount,
	decideAttemptCharge,
	getTransferStepPrice,
	moneyEquals,
	normalizeTransferDiscountPercent,
} from "./transfer-discount";

describe("applyTransferDiscount", () => {
	test("rounds the total down to the whole peso and derives the discount from it", () => {
		expect(
			applyTransferDiscount({
				subtotal: "137400.00",
				percent: 10,
				currency: "ARS",
			}),
		).toEqual({
			percent: 10,
			subtotal: "137400.00",
			discount: "13740.00",
			total: "123660.00",
		});
		expect(
			applyTransferDiscount({
				subtotal: "45215",
				percent: 10,
				currency: "ARS",
			}),
		).toMatchObject({ total: "40693.00", discount: "4522.00" });
		expect(
			applyTransferDiscount({
				subtotal: "34900.00",
				percent: 10,
				currency: "ARS",
			}),
		).toMatchObject({ total: "31410.00", discount: "3490.00" });
	});

	test("takes a percent with two decimals", () => {
		expect(
			applyTransferDiscount({
				subtotal: 137400,
				percent: 7.5,
				currency: "ARS",
			}),
		).toMatchObject({ percent: 7.5, total: "127095.00", discount: "10305.00" });
	});

	test("a subtotal with cents keeps the cents in the discount, never in the total", () => {
		expect(
			applyTransferDiscount({
				subtotal: "11302.50",
				percent: 10,
				currency: "ARS",
			}),
		).toEqual({
			percent: 10,
			subtotal: "11302.50",
			discount: "1130.50",
			total: "10172.00",
		});
	});

	test("gives nothing for a percent that is missing, zero or out of range", () => {
		for (const percent of [null, 0, -1, 50.01, Number.NaN]) {
			expect(
				applyTransferDiscount({
					subtotal: "137400.00",
					percent,
					currency: "ARS",
				}),
			).toBeNull();
		}
	});

	test("gives nothing outside pesos or on an empty subtotal", () => {
		expect(
			applyTransferDiscount({
				subtotal: "137400.00",
				percent: 10,
				currency: "USD",
			}),
		).toBeNull();
		expect(
			applyTransferDiscount({ subtotal: "0", percent: 10, currency: "ARS" }),
		).toBeNull();
		expect(
			applyTransferDiscount({ subtotal: "abc", percent: 10, currency: "ARS" }),
		).toBeNull();
	});

	test("50 % is the ceiling and still applies", () => {
		expect(
			applyTransferDiscount({
				subtotal: "999.99",
				percent: 50,
				currency: "ARS",
			}),
		).toMatchObject({ total: "499.00", discount: "500.99" });
	});
});

describe("normalizeTransferDiscountPercent", () => {
	test("keeps a percent in (0, 50] and drops anything else", () => {
		expect(normalizeTransferDiscountPercent(10)).toBe(10);
		expect(normalizeTransferDiscountPercent(50)).toBe(50);
		for (const value of [
			0,
			-1,
			50.01,
			Number.NaN,
			Infinity,
			"10",
			null,
			undefined,
		]) {
			expect(normalizeTransferDiscountPercent(value)).toBeNull();
		}
	});
});

test("getTransferStepPrice is the one-step price at the transfer total", () => {
	expect(getTransferStepPrice(137400, 10, "ARS")).toBe("123660.00");
	expect(getTransferStepPrice(null, 10, "ARS")).toBeNull();
	expect(getTransferStepPrice(137400, null, "ARS")).toBeNull();
});

describe("decideAttemptCharge", () => {
	test("Mercado Pago charges the subtotal even with a transfer percent configured", () => {
		expect(
			decideAttemptCharge({
				provider: "mercadopago",
				subtotal: "137400.00",
				currency: "ARS",
				transferDiscountPercent: 10,
			}),
		).toEqual({ amount: "137400.00", transferDiscount: null });
	});

	test("a transfer charges the discounted total and carries the breakdown", () => {
		expect(
			decideAttemptCharge({
				provider: "external",
				subtotal: "137400.00",
				currency: "ARS",
				transferDiscountPercent: 10,
			}),
		).toEqual({
			amount: "123660.00",
			transferDiscount: {
				percent: 10,
				subtotal: "137400.00",
				discount: "13740.00",
				total: "123660.00",
			},
		});
	});

	test("a transfer without a percent charges the subtotal", () => {
		expect(
			decideAttemptCharge({
				provider: "external",
				subtotal: "137400",
				currency: "ARS",
				transferDiscountPercent: null,
			}),
		).toEqual({ amount: "137400.00", transferDiscount: null });
	});
});

test("moneyEquals compares whole cents", () => {
	expect(moneyEquals("123660", "123660.00")).toBe(true);
	expect(moneyEquals("123660.00", "123661.00")).toBe(false);
	expect(moneyEquals("0.1", "0.10")).toBe(true);
	expect(moneyEquals("abc", "abc")).toBe(false);
});
