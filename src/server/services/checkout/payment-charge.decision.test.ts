import { expect, test } from "vitest";

import { decideOpenAttemptHandling } from "./payment-charge.decision";

test("the same payment method answers with the open attempt", () => {
	for (const provider of ["mercadopago", "external"]) {
		expect(
			decideOpenAttemptHandling({
				attempt: {
					provider,
					status: "pending",
					declaredReceiptReference: null,
				},
				requestedProvider: provider,
			}),
		).toBe("reuse");
	}
});

test("a pending Mercado Pago attempt is replaced when the customer switches to transfer", () => {
	expect(
		decideOpenAttemptHandling({
			attempt: {
				provider: "mercadopago",
				status: "pending",
				declaredReceiptReference: null,
			},
			requestedProvider: "external",
		}),
	).toBe("replace");
});

test("a Mercado Pago payment in process is kept", () => {
	expect(
		decideOpenAttemptHandling({
			attempt: {
				provider: "mercadopago",
				status: "inProcess",
				declaredReceiptReference: null,
			},
			requestedProvider: "external",
		}),
	).toBe("reuse");
});

test("a transfer with a declared receipt is kept", () => {
	expect(
		decideOpenAttemptHandling({
			attempt: {
				provider: "external",
				status: "pending",
				declaredReceiptReference: "TRX-1",
			},
			requestedProvider: "mercadopago",
		}),
	).toBe("reuse");
});

test("a transfer still waiting for its receipt is replaced when the customer switches to Mercado Pago", () => {
	expect(
		decideOpenAttemptHandling({
			attempt: {
				provider: "external",
				status: "pending",
				declaredReceiptReference: null,
			},
			requestedProvider: "mercadopago",
		}),
	).toBe("replace");
});

test("a completed attempt is never replaced", () => {
	expect(
		decideOpenAttemptHandling({
			attempt: {
				provider: "mercadopago",
				status: "completed",
				declaredReceiptReference: null,
			},
			requestedProvider: "external",
		}),
	).toBe("reuse");
});
