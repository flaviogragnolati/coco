import "server-only";

import { TRPCError } from "@trpc/server";
import { Preference } from "mercadopago";

import { createMercadoPagoClient } from "~/lib/mercadopago/client";
import type { CheckoutCartRecord } from "~/server/services/checkout/checkout.data";
import type { PaymentProviderConfig } from "~/shared/common/admin-crud/payment.types";
import {
	calculateLineTotal,
	toMoneyString,
} from "~/shared/common/commerce.helpers";

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

function buildPreferenceItems(cart: CheckoutCartRecord) {
	return cart.cartItems.map((item) => {
		const name = item.productClientTerms.product.name;
		const quantity = Number(item.quantity.toString());
		const lineTotal = Number(
			calculateLineTotal(
				{
					id: item.productClientTerms.id,
					moq: item.productClientTerms.moq.toString(),
					moqPrice: item.productClientTerms.moqPrice.toString(),
					step: item.productClientTerms.step?.toString() ?? null,
					stepPrice: item.productClientTerms.stepPrice?.toString() ?? null,
					max: item.productClientTerms.max?.toString() ?? null,
					refPrice: item.productClientTerms.refPrice?.toString() ?? null,
					currency: item.productClientTerms.currency,
					fromDate: item.productClientTerms.fromDate,
					toDate: item.productClientTerms.toDate,
				},
				item.quantity.toString(),
			),
		);
		const unitPrice = quantity > 0 ? lineTotal / quantity : lineTotal;

		return {
			id: String(item.productClientTerms.product.id),
			title: name,
			quantity: Math.max(1, Math.round(quantity)),
			unit_price: Number(toMoneyString(unitPrice)),
			currency_id: item.productClientTerms.currency,
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
	const externalReference = `user_transaction:${input.transaction.id}`;
	const body = {
		items: buildPreferenceItems(input.cart),
		payer: {
			email: input.order.user.email,
		},
		external_reference: externalReference,
		back_urls: {
			success: input.config.settings.successBackUrl,
			failure: input.config.settings.failureBackUrl,
			pending: input.config.settings.pendingBackUrl,
		},
		auto_return: input.config.settings.autoReturnApproved
			? "approved"
			: undefined,
		notification_url: input.config.settings.notificationUrl,
		binary_mode: input.config.settings.binaryMode,
		expires: true,
		expiration_date_to: expiresAt.toISOString(),
		date_of_expiration: expiresAt.toISOString(),
		statement_descriptor:
			input.config.settings.statementDescriptor ?? undefined,
		payment_methods: {
			excluded_payment_methods:
				input.config.settings.excludedPaymentMethods.map((id) => ({ id })),
			excluded_payment_types: input.config.settings.excludedPaymentTypes.map(
				(id) => ({ id }),
			),
		},
		metadata: {
			userTransactionId: input.transaction.id,
			userOrderId: input.order.id,
			userOrderCode: input.order.code,
		},
	};

	const result = await preference.create({
		body,
		requestOptions: {
			idempotencyKey: `mercadopago:preference:userTransaction:${input.transaction.id}`,
		},
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
		expiresAt,
		externalReference,
		requestSnapshot: body,
		responseSnapshot: result,
	};
}
