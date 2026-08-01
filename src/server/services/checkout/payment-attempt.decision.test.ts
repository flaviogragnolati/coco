import { describe, expect, test } from "vitest";

import {
	isCancellablePaymentAttempt,
	isSpentPaymentAttempt,
	type PaymentAttemptStatus,
} from "./payment-attempt.decision";

const NOW = new Date("2026-07-31T12:00:00.000Z");
const PAST = new Date("2026-07-31T11:59:59.000Z");
const FUTURE = new Date("2026-07-31T12:00:01.000Z");

const LIVE_STATUSES: PaymentAttemptStatus[] = [
	"pending",
	"inProcess",
	"completed",
	"refunded",
	"chargedBack",
];

describe("isSpentPaymentAttempt", () => {
	test("a failed or cancelled attempt is always spent", () => {
		for (const expiresAt of [null, PAST, FUTURE]) {
			expect(isSpentPaymentAttempt({ status: "failed", expiresAt }, NOW)).toBe(
				true,
			);
			expect(
				isSpentPaymentAttempt({ status: "cancelled", expiresAt }, NOW),
			).toBe(true);
		}
	});

	test("a pending attempt is spent only once its window closed", () => {
		expect(
			isSpentPaymentAttempt({ status: "pending", expiresAt: null }, NOW),
		).toBe(false);
		expect(
			isSpentPaymentAttempt({ status: "pending", expiresAt: FUTURE }, NOW),
		).toBe(false);
		expect(
			isSpentPaymentAttempt({ status: "pending", expiresAt: PAST }, NOW),
		).toBe(true);
	});

	test("an attempt expiring exactly now is spent", () => {
		expect(
			isSpentPaymentAttempt({ status: "pending", expiresAt: NOW }, NOW),
		).toBe(true);
	});

	test("a settled or in-flight attempt is never spent, even past its expiry", () => {
		for (const status of LIVE_STATUSES.filter(
			(candidate) => candidate !== "pending",
		)) {
			expect(isSpentPaymentAttempt({ status, expiresAt: PAST }, NOW)).toBe(
				false,
			);
		}
	});
});

describe("isCancellablePaymentAttempt", () => {
	test("a pending attempt without a declared receipt can be abandoned", () => {
		expect(
			isCancellablePaymentAttempt({
				status: "pending",
				declaredReceiptReference: null,
			}),
		).toBe(true);
	});

	test("a pending attempt with a declared receipt waits for the admin", () => {
		expect(
			isCancellablePaymentAttempt({
				status: "pending",
				declaredReceiptReference: "TRF-99182",
			}),
		).toBe(false);
	});

	test("a dead attempt stays abandonable whatever the user declared", () => {
		for (const status of ["failed", "cancelled"] as const) {
			expect(
				isCancellablePaymentAttempt({
					status,
					declaredReceiptReference: null,
				}),
			).toBe(true);
			expect(
				isCancellablePaymentAttempt({
					status,
					declaredReceiptReference: "TRF-99182",
				}),
			).toBe(true);
		}
	});

	test("an attempt the provider is holding or that took money is not cancellable", () => {
		for (const status of [
			"inProcess",
			"completed",
			"refunded",
			"chargedBack",
		] as const) {
			expect(
				isCancellablePaymentAttempt({
					status,
					declaredReceiptReference: null,
				}),
			).toBe(false);
		}
	});
});
