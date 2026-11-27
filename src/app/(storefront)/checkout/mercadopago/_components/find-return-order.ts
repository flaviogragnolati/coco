import "server-only";

import { api } from "~/trpc/server";
import { readExternalReference } from "./mercadopago-return";

/**
 * The order a Mercado Pago return belongs to, or null: no reference, no
 * session, or not one of the user's attempts. Never throws, so the caller can
 * redirect outside any try.
 */
export async function findReturnOrderId(searchParams: {
	external_reference?: string | string[];
}) {
	const externalReference = readExternalReference(
		searchParams.external_reference,
	);
	if (!externalReference) return null;

	try {
		const result = await api.orders.resolvePaymentReturn({ externalReference });
		return result?.orderId ?? null;
	} catch {
		// Signed out: the fallback page sends them to Mis pedidos, which asks
		// them to sign in.
		return null;
	}
}
