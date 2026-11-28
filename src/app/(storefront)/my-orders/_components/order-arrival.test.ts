import { describe, expect, it } from "vitest";

import { orderArrivalBanner, parseOrderArrival } from "./order-arrival";

describe("parseOrderArrival", () => {
	it.each([
		["nuevo", "nuevo"],
		["mp", "mp"],
		["MP", null],
		["", null],
		[undefined, null],
		[["mp"], null],
	])("reads %j as %j", (value, expected) => {
		expect(parseOrderArrival(value)).toBe(expected);
	});
});

describe("orderArrivalBanner", () => {
	const transfer = (status: "pending" | "completed") => ({
		provider: "external",
		status,
	});
	const mercadoPago = (
		status:
			| "pending"
			| "inProcess"
			| "completed"
			| "failed"
			| "cancelled"
			| "refunded",
	) => ({ provider: "mercadopago", status });

	it("tells a customer who just confirmed a transfer what is missing", () => {
		expect(
			orderArrivalBanner({ arrival: "nuevo", attempt: transfer("pending") }),
		).toMatchObject({
			tone: "pending",
			title: "Pedido registrado. Falta tu transferencia.",
		});
	});

	it("says nothing about a transfer that is no longer pending", () => {
		expect(
			orderArrivalBanner({ arrival: "nuevo", attempt: transfer("completed") }),
		).toBeNull();
	});

	it.each([
		["completed", "success", "Pago recibido"],
		["pending", "pending", "Estamos esperando la confirmación de Mercado Pago"],
		[
			"inProcess",
			"pending",
			"Estamos esperando la confirmación de Mercado Pago",
		],
		["failed", "failed", "Mercado Pago no aprobó el pago"],
		["cancelled", "failed", "Mercado Pago no aprobó el pago"],
	] as const)("back from Mercado Pago with a %s payment", (status, tone, title) => {
		expect(
			orderArrivalBanner({ arrival: "mp", attempt: mercadoPago(status) }),
		).toMatchObject({ tone, title });
	});

	it("never trusts the link over the payment", () => {
		expect(
			orderArrivalBanner({ arrival: "mp", attempt: transfer("pending") }),
		).toBeNull();
		expect(
			orderArrivalBanner({ arrival: "mp", attempt: mercadoPago("refunded") }),
		).toBeNull();
		expect(orderArrivalBanner({ arrival: "mp", attempt: null })).toBeNull();
		expect(
			orderArrivalBanner({ arrival: null, attempt: mercadoPago("completed") }),
		).toBeNull();
	});
});
