import "server-only";

import { TRPCError } from "@trpc/server";
import { Preference } from "mercadopago";

import { createMercadoPagoClient } from "~/lib/mercadopago/client";
import { termsToClientTerms } from "~/server/services/_base/client-terms.mapper";
import type { CheckoutCartRecord } from "~/server/services/checkout/checkout.data";
import type { PaymentProviderConfig } from "~/shared/common/admin-crud/payment.types";
import { calculateLineTotal } from "~/shared/common/commerce.helpers";
import {
	buildMercadoPagoPreferenceCreateData,
	MercadoPagoPreferenceInvariantError,
	type MercadoPagoPreferenceLine,
} from "./mercadopago-preference.decision";

type CreateMercadoPagoPreferenceInput = {
	cart: CheckoutCartRecord;
	order: {
		id: number;
		code: string;
		user: {
			email: string;
		};
	};
	transaction: {
		id: number;
		amount: { toString(): string } | string;
		currency: string;
	};
	config: PaymentProviderConfig;
};

export function buildPreferenceLines(cart: CheckoutCartRecord) {
	return cart.cartItems.map<MercadoPagoPreferenceLine>((item) => {
		const name = item.productClientTerms.product.name;
		const requestedQuantity = item.quantity.toString();
		// Must go through `termsToClientTerms`: a hand-built literal satisfies the
		// type by construction, so a field the discount needs would be silently
		// omitted here and the customer charged the undiscounted amount with no
		// compile error. Same reason `buildPriceSnapshot` uses the mapper.
		const lineTotal = calculateLineTotal(
			termsToClientTerms(item.productClientTerms),
			requestedQuantity,
		);

		return {
			id: String(item.productClientTerms.product.id),
			title: name,
			requestedQuantity,
			lineTotal,
			currency: item.productClientTerms.currency,
		};
	});
}

export async function createMercadoPagoPreference(
	input: CreateMercadoPagoPreferenceInput,
) {
	const preference = new Preference(createMercadoPagoClient());
	const expiresAt = new Date(
		Date.now() + input.config.settings.preferenceExpiresInMinutes * 60_000,
	);
	let preferenceData: ReturnType<typeof buildMercadoPagoPreferenceCreateData>;

	try {
		preferenceData = buildMercadoPagoPreferenceCreateData({
			lines: buildPreferenceLines(input.cart),
			expectedAmount: input.transaction.amount.toString(),
			currency: input.transaction.currency,
			payerEmail: input.order.user.email,
			transactionId: input.transaction.id,
			orderId: input.order.id,
			orderCode: input.order.code,
			expiresAt,
			settings: input.config.settings,
		});
	} catch (error) {
		if (!(error instanceof MercadoPagoPreferenceInvariantError)) throw error;

		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"El total o la moneda del checkout no coincide con la preferencia de Mercado Pago.",
		});
	}

	const result = await preference.create({
		body: preferenceData.body,
		requestOptions: preferenceData.requestOptions,
	});

	if (!result.id) {
		throw new TRPCError({
			code: "BAD_GATEWAY",
			message: "Mercado Pago no devolvió un id de preferencia.",
		});
	}

	return {
		providerPreferenceId: result.id,
		checkoutUrl: result.init_point ?? null,
		sandboxCheckoutUrl: result.sandbox_init_point ?? null,
		expiresAt: preferenceData.expiresAt,
		externalReference: preferenceData.externalReference,
		requestSnapshot: preferenceData.body,
		responseSnapshot: result,
	};
}
