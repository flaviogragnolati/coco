import { expect, test } from "vitest";

import { paymentMethodCopy } from "./payment-method-copy";

test("the customer reads a transfer, never the admin's «Pago externo»", () => {
	expect(
		paymentMethodCopy({
			provider: "external",
			label: "Pago externo",
			details: "Transferencia bancaria",
		}).title,
	).toBe("Transferencia bancaria");
});

test("Mercado Pago keeps its name", () => {
	expect(
		paymentMethodCopy({
			provider: "mercadopago",
			label: "Mercado Pago",
			details: "Mercado Pago",
		}).title,
	).toBe("Mercado Pago");
});

test("an unknown provider falls back to what the method stores", () => {
	expect(
		paymentMethodCopy({ provider: "mock", label: "Prueba", details: "Demo" }),
	).toEqual({ title: "Prueba", description: "Demo" });
});
