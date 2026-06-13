import "server-only";

import { MercadoPagoConfig } from "mercadopago";

import { env } from "~/env";

export function createMercadoPagoClient() {
	const accessToken = env.MERCADOPAGO_ACCESS_TOKEN;

	if (!accessToken) {
		throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN");
	}

	return new MercadoPagoConfig({
		accessToken,
		options: {
			timeout: env.MERCADOPAGO_TIMEOUT_MS ?? 5000,
		},
	});
}
