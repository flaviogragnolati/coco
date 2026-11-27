import type { MercadoPagoSettings } from "~/shared/common/admin-crud/payment.types";
import { toMoneyString } from "~/shared/common/commerce.helpers";

/** Largest id a Postgres `int` column holds. */
const MAX_INT_ID = 2_147_483_647;

/** How a preference and its payments point back to their attempt. */
export function toMercadoPagoExternalReference(transactionId: number) {
	return `user_transaction:${transactionId}`;
}

/**
 * The attempt id inside an external reference, or null for anything CoCo did
 * not write, including an id no attempt can have.
 */
export function parseMercadoPagoExternalReference(reference: unknown) {
	if (typeof reference !== "string") return null;
	const match = /^user_transaction:([1-9]\d{0,9})$/.exec(reference);
	if (!match?.[1]) return null;
	const id = Number(match[1]);
	return id <= MAX_INT_ID ? id : null;
}

export type MercadoPagoPreferenceLine = {
	id: string;
	title: string;
	requestedQuantity: string;
	lineTotal: string;
	currency: string;
};

type BuildMercadoPagoPreferenceInput = {
	lines: MercadoPagoPreferenceLine[];
	expectedAmount: string;
	currency: string;
	payerEmail: string;
	transactionId: number;
	orderId: number;
	orderCode: string;
	expiresAt: Date;
	settings: MercadoPagoSettings;
};

export class MercadoPagoPreferenceInvariantError extends Error {}

export function buildMercadoPagoPreferenceItems(
	lines: MercadoPagoPreferenceLine[],
) {
	return lines.map((line) => ({
		id: line.id,
		title: line.title,
		description: `Cantidad solicitada: ${line.requestedQuantity}`,
		quantity: 1,
		unit_price: Number(line.lineTotal),
		currency_id: line.currency,
	}));
}

export function calculateMercadoPagoPreferenceTotal(
	items: ReturnType<typeof buildMercadoPagoPreferenceItems>,
) {
	const totalInCents = items.reduce(
		(total, item) => total + Math.round(item.unit_price * 100) * item.quantity,
		0,
	);

	return toMoneyString(totalInCents / 100);
}

export function toMercadoPagoWebhookUrl(notificationUrl: string) {
	const url = new URL(notificationUrl);
	url.searchParams.set("source_news", "webhooks");
	return url.toString();
}

export function buildMercadoPagoPreferenceCreateData(
	input: BuildMercadoPagoPreferenceInput,
) {
	const items = buildMercadoPagoPreferenceItems(input.lines);
	const expectedAmountNumber = Number(input.expectedAmount);
	const expectedAmount = toMoneyString(expectedAmountNumber);
	const preferenceAmount = calculateMercadoPagoPreferenceTotal(items);
	const currencyMismatch = items.some(
		(item) => item.currency_id !== input.currency,
	);
	const invalidMoney =
		!Number.isFinite(expectedAmountNumber) ||
		expectedAmountNumber <= 0 ||
		items.length === 0 ||
		items.some(
			(item) => !Number.isFinite(item.unit_price) || item.unit_price <= 0,
		);

	if (invalidMoney || currencyMismatch || preferenceAmount !== expectedAmount) {
		throw new MercadoPagoPreferenceInvariantError(
			"The payment attempt amount or currency does not match the preference.",
		);
	}

	const externalReference = toMercadoPagoExternalReference(input.transactionId);
	const body = {
		items,
		payer: {
			email: input.payerEmail,
		},
		external_reference: externalReference,
		back_urls: {
			success: input.settings.successBackUrl,
			failure: input.settings.failureBackUrl,
			pending: input.settings.pendingBackUrl,
		},
		auto_return: input.settings.autoReturnApproved ? "approved" : undefined,
		notification_url: toMercadoPagoWebhookUrl(input.settings.notificationUrl),
		binary_mode: input.settings.binaryMode,
		expires: true,
		expiration_date_to: input.expiresAt.toISOString(),
		date_of_expiration: input.expiresAt.toISOString(),
		statement_descriptor: input.settings.statementDescriptor ?? undefined,
		payment_methods: {
			excluded_payment_methods: input.settings.excludedPaymentMethods.map(
				(id) => ({ id }),
			),
			excluded_payment_types: input.settings.excludedPaymentTypes.map((id) => ({
				id,
			})),
		},
		metadata: {
			userTransactionId: input.transactionId,
			userOrderId: input.orderId,
			userOrderCode: input.orderCode,
		},
	};

	return {
		body,
		requestOptions: {
			idempotencyKey: `mercadopago:preference:userTransaction:${input.transactionId}`,
		},
		expiresAt: input.expiresAt,
		externalReference,
	};
}
