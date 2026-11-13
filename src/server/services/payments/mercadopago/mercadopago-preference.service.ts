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
		expiresAt: Date | null;
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
	const expiresAt = input.transaction.expiresAt;
	if (!expiresAt || expiresAt <= new Date()) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"El intento necesita un vencimiento vigente antes de crear la preferencia de Mercado Pago.",
		});
	}
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

export async function recoverMercadoPagoPreference(transaction: {
	id: number;
	amount: { toString(): string } | string;
	currency: string;
	providerPreferenceId: string | null;
	expiresAt: Date | null;
}) {
	const client = new Preference(createMercadoPagoClient());
	const externalReference = `user_transaction:${transaction.id}`;
	let preferenceId = transaction.providerPreferenceId;
	if (!preferenceId) {
		const search = await client.search({
			options: { external_reference: externalReference, limit: 2 },
		});
		const matches =
			search.elements?.filter(
				(item) => item.external_reference === externalReference,
			) ?? [];
		// An empty search cannot prove that a timed-out creation failed.
		if (matches.length !== 1 || (search.total ?? matches.length) !== 1) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message:
					"No pudimos recuperar el enlace de Mercado Pago. El intento sigue pendiente; volvé a intentar más tarde o, después de su vencimiento, recargá el checkout.",
			});
		}
		preferenceId = matches[0]?.id ?? null;
	}
	if (!preferenceId)
		throw new TRPCError({
			code: "BAD_GATEWAY",
			message: "Mercado Pago no devolvió una preferencia recuperable.",
		});
	const result = await client.get({ preferenceId });
	const items = result.items ?? [];
	const totalInCents = items.reduce(
		(sum, item) =>
			sum + Math.round((item.unit_price ?? 0) * 100) * (item.quantity ?? 0),
		0,
	);
	const expiresAt = new Date(result.expiration_date_to ?? "");
	if (
		result.id !== preferenceId ||
		result.external_reference !== externalReference ||
		items.length === 0 ||
		items.some(
			(item) =>
				item.currency_id !== transaction.currency ||
				!Number.isFinite(item.unit_price) ||
				(item.unit_price ?? 0) <= 0 ||
				!Number.isInteger(item.quantity) ||
				(item.quantity ?? 0) <= 0,
		) ||
		totalInCents !== Math.round(Number(transaction.amount.toString()) * 100) ||
		!result.expires ||
		!Number.isFinite(expiresAt.getTime()) ||
		expiresAt <= new Date() ||
		(transaction.expiresAt !== null && expiresAt > transaction.expiresAt) ||
		!(result.init_point || result.sandbox_init_point)
	) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"La preferencia recuperada no coincide con el intento o ya venció. Revisá el pago antes de volver a confirmar.",
		});
	}
	return {
		providerPreferenceId: preferenceId,
		checkoutUrl: result.init_point ?? null,
		sandboxCheckoutUrl: result.sandbox_init_point ?? null,
		expiresAt,
		externalReference,
		responseSnapshot: result,
	};
}
