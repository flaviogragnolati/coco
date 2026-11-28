/**
 * The banner an order shows to a customer who just arrived at it: after
 * confirming a transfer (`?llegada=nuevo`) or back from Mercado Pago
 * (`?llegada=mp`). The query only says where they came from; what the banner
 * says always comes from the order's actual payment, so a forged or stale link
 * can never announce a payment that did not happen. No React, no I/O.
 */

import type { OrderTransactionStatus } from "~/shared/common/order-display";

export type OrderArrival = "nuevo" | "mp";

export type OrderArrivalBanner = {
	tone: "success" | "pending" | "failed";
	title: string;
	body: string;
};

/** `?llegada=` read leniently: anything else is no arrival. */
export function parseOrderArrival(value: unknown): OrderArrival | null {
	return value === "nuevo" || value === "mp" ? value : null;
}

export function orderArrivalBanner(input: {
	arrival: OrderArrival | null;
	/** The attempt the order shows (`selectOrderDisplayAttempt`). */
	attempt: { provider: string; status: OrderTransactionStatus } | null;
}): OrderArrivalBanner | null {
	const { arrival, attempt } = input;
	if (!arrival || !attempt) return null;

	if (arrival === "nuevo") {
		return attempt.provider === "external" && attempt.status === "pending"
			? {
					tone: "pending",
					title: "Pedido registrado. Falta tu transferencia.",
					body: "Los datos están acá abajo. En esta misma pantalla seguís tu pedido después.",
				}
			: null;
	}

	if (attempt.provider !== "mercadopago") return null;

	switch (attempt.status) {
		case "completed":
			return {
				tone: "success",
				title: "Pago recibido",
				body: "Mercado Pago aprobó tu pago y tu pedido quedó confirmado. Acá seguís cada etapa.",
			};
		case "pending":
		case "inProcess":
			return {
				tone: "pending",
				title: "Estamos esperando la confirmación de Mercado Pago",
				body: "Puede tardar unos minutos, o hasta dos días hábiles si elegiste pagar en efectivo. No hace falta que te quedes: el estado se actualiza en esta pantalla.",
			};
		case "failed":
		case "cancelled":
			return {
				tone: "failed",
				title: "Mercado Pago no aprobó el pago",
				body: "No se cobró nada. Tu pedido quedó guardado: podés intentar de nuevo o pagar por transferencia.",
			};
		default:
			return null;
	}
}
