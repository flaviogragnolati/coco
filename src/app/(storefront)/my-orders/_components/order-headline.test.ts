import { describe, expect, it } from "vitest";

import { orderHeadline } from "./order-headline";

const base = {
	provider: "external",
	split: false,
	stageKey: null,
} as const;

describe("orderHeadline", () => {
	it("asks for the transfer while it is missing", () => {
		expect(orderHeadline({ ...base, status: "awaitingPayment" }).title).toBe(
			"Falta tu transferencia",
		);
	});

	it("asks to finish a Mercado Pago payment", () => {
		expect(
			orderHeadline({
				...base,
				status: "awaitingPayment",
				provider: "mercadopago",
			}).title,
		).toBe("Falta el pago");
	});

	it("says a reported transfer is being checked", () => {
		expect(orderHeadline({ ...base, status: "verifyingPayment" }).title).toBe(
			"Estamos verificando tu transferencia",
		);
	});

	it.each([
		[null, "Tu pedido está confirmado"],
		["submitted", "Tu pedido está confirmado"],
		["preparation", "Estamos preparando la compra"],
		["supplier", "Le estamos comprando al proveedor"],
		["packaging", "Estamos armando tu paquete"],
		["shipping", "Tu pedido está viajando a Ushuaia"],
	] as const)("an order under way at %s reads «%s»", (stageKey, title) => {
		expect(
			orderHeadline({ ...base, status: "inProgress", stageKey }).title,
		).toBe(title);
	});

	it("an order split across stages says it arrives in parts", () => {
		expect(
			orderHeadline({
				...base,
				status: "inProgress",
				split: true,
				stageKey: "shipping",
			}).title,
		).toBe("Tu pedido llega en partes");
	});

	it.each([
		["delivered", "Pedido entregado"],
		["cancelled", "Pedido cancelado"],
		["failed", "El pago no se acreditó"],
		["refunded", "Te devolvimos el dinero"],
		["chargedBack", "El pago fue desconocido"],
	] as const)("a %s order reads «%s»", (status, title) => {
		expect(orderHeadline({ ...base, status }).title).toBe(title);
	});

	it("never promises a date", () => {
		const statuses = [
			"awaitingPayment",
			"verifyingPayment",
			"inProgress",
			"delivered",
		] as const;
		for (const status of statuses) {
			expect(orderHeadline({ ...base, status }).text).not.toMatch(
				/\d+\/\d+|\d+ días/,
			);
		}
	});
});
