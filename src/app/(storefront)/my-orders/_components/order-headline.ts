/**
 * The title and sentence at the top of an order: what is going on, in the
 * customer's words, from the customer order status, how it is being paid and
 * where its journey is. Never a date: the delivery lead time is a promise in
 * copy, not a computed date (CONTEXT.md). No React, no I/O.
 */

import type { CustomerOrderStatusKey } from "~/shared/common/order-display";
import type { UserTrackingStageKey } from "~/shared/common/tracking-display";

export type OrderHeadline = { title: string; text: string };

const stageHeadlines: Record<UserTrackingStageKey, OrderHeadline> = {
	submitted: {
		title: "Tu pedido está confirmado",
		text: "Cuando cierre la semana, lo juntamos con los pedidos de otros vecinos y compramos todo junto.",
	},
	preparation: {
		title: "Estamos preparando la compra",
		text: "Juntamos tu pedido con los de otros vecinos para hacer una sola compra.",
	},
	supplier: {
		title: "Le estamos comprando al proveedor",
		text: "Hacemos una sola compra con la cantidad de todos juntos.",
	},
	packaging: {
		title: "Estamos armando tu paquete",
		text: "Se arma el paquete con tus productos, listo para viajar.",
	},
	shipping: {
		title: "Tu pedido está viajando a Ushuaia",
		text: "Te avisamos acá cuando llegue.",
	},
	delivery: {
		title: "Tu pedido llegó",
		text: "Ya lo tenés o está listo para que lo retires.",
	},
};

export function orderHeadline(input: {
	status: CustomerOrderStatusKey;
	/** Provider of the attempt the order shows; null before the first one. */
	provider: string | null;
	/** Products at different stages: the order arrives in parts. */
	split: boolean;
	/** Stage the order's track is at; null before the first one. */
	stageKey: UserTrackingStageKey | null;
}): OrderHeadline {
	const transfer = input.provider === "external";

	switch (input.status) {
		case "awaitingPayment":
			return transfer
				? {
						title: "Falta tu transferencia",
						text: "Transferí el total con los datos de abajo y contanos el número de comprobante.",
					}
				: {
						title: "Falta el pago",
						text: "Tu pedido quedó guardado. Terminá el pago en Mercado Pago o cambiá a transferencia.",
					};
		case "verifyingPayment":
			return transfer
				? {
						title: "Estamos verificando tu transferencia",
						text: "Cuando la confirmemos, tu pedido queda confirmado y lo ves acá.",
					}
				: {
						title: "Mercado Pago está procesando tu pago",
						text: "Puede tardar unos minutos. El estado se actualiza en esta pantalla.",
					};
		case "inProgress":
			if (input.split) {
				return {
					title: "Tu pedido llega en partes",
					text: "Algunos productos van más adelante que otros. Abajo ves dónde está cada uno.",
				};
			}
			return stageHeadlines[input.stageKey ?? "submitted"];
		case "delivered":
			return {
				title: "Pedido entregado",
				text: "Si te gustó, podés repetirlo con los precios de hoy.",
			};
		case "cancelled":
			return {
				title: "Pedido cancelado",
				text: "Este pedido no sigue adelante. Si tenés dudas, escribinos.",
			};
		case "failed":
			return {
				title: "El pago no se acreditó",
				text: "Este pedido no sigue adelante. Podés armar uno nuevo cuando quieras.",
			};
		case "refunded":
			return {
				title: "Te devolvimos el dinero",
				text: "El reintegro se hace por el mismo medio con el que pagaste.",
			};
		case "chargedBack":
			return {
				title: "El pago fue desconocido",
				text: "Tu banco revirtió el pago. Si tenés dudas, escribinos.",
			};
	}
}
