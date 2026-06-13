import {
	InvalidWebhookSignatureError,
	SignatureFailureReason,
	WebhookSignatureValidator,
} from "mercadopago";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "~/env";
import { db } from "~/server/db";
import {
	canProcessUnsignedMercadoPagoWebhook,
	getMercadoPagoConfig,
	MERCADOPAGO_PROVIDER,
} from "~/server/services/payments/mercadopago/mercadopago-config.service";
import { reconcileMercadoPagoPayment } from "~/server/services/payments/mercadopago/mercadopago-reconciliation.service";
import { createPaymentProviderEvent } from "~/server/services/payments/payment.data";

function headersToObject(headers: Headers) {
	return Object.fromEntries(headers.entries());
}

function searchParamsToObject(searchParams: URLSearchParams) {
	return Object.fromEntries(searchParams.entries());
}

function getBodyStringValue(body: unknown, path: string[]) {
	let current = body;

	for (const key of path) {
		if (typeof current !== "object" || current === null || !(key in current)) {
			return null;
		}
		current = (current as Record<string, unknown>)[key];
	}

	return typeof current === "string" || typeof current === "number"
		? String(current)
		: null;
}

async function parseJson(request: NextRequest) {
	return request.json().catch(() => null);
}

export async function POST(request: NextRequest) {
	const url = new URL(request.url);
	const query = searchParamsToObject(url.searchParams);
	const headers = headersToObject(request.headers);
	const body = await parseJson(request);
	const config = await getMercadoPagoConfig(db);

	const dataId =
		url.searchParams.get("data.id") ?? getBodyStringValue(body, ["data", "id"]);
	const eventType =
		url.searchParams.get("type") ?? getBodyStringValue(body, ["type"]);
	const action = getBodyStringValue(body, ["action"]);
	const providerEventId = getBodyStringValue(body, ["id"]);
	const xSignature = request.headers.get("x-signature");
	const xRequestId = request.headers.get("x-request-id");
	let signatureValid = false;
	let rejectedReason: string | null = null;

	try {
		if (!env.MERCADOPAGO_WEBHOOK_SECRET) {
			throw new InvalidWebhookSignatureError(
				SignatureFailureReason.SignatureMismatch,
				xRequestId ?? undefined,
			);
		}

		WebhookSignatureValidator.validate({
			xSignature,
			xRequestId,
			dataId,
			secret: env.MERCADOPAGO_WEBHOOK_SECRET,
			toleranceSeconds: 300,
		});
		signatureValid = true;
	} catch (error) {
		const canProcessUnsigned = canProcessUnsignedMercadoPagoWebhook({
			allowUnsignedWebhooksInDevelopment:
				config.settings.allowUnsignedWebhooksInDevelopment,
		});

		if (canProcessUnsigned) {
			rejectedReason =
				"Firma ausente o inválida; procesada por configuración de desarrollo.";
		} else {
			rejectedReason =
				error instanceof InvalidWebhookSignatureError
					? `Firma inválida: ${error.reason}`
					: "Firma inválida.";
		}
	}

	if (!signatureValid && !rejectedReason?.includes("procesada")) {
		await createPaymentProviderEvent(db, {
			provider: MERCADOPAGO_PROVIDER,
			providerMode: config.mode,
			eventType,
			action,
			providerEventId,
			providerResourceType: eventType,
			providerResourceId: dataId,
			providerRequestId: xRequestId,
			signatureValid: false,
			status: "rejected",
			lastError: rejectedReason,
			payload: body,
			headers,
			query,
		});

		return NextResponse.json({ error: "invalid signature" }, { status: 401 });
	}

	const event = await createPaymentProviderEvent(db, {
		provider: MERCADOPAGO_PROVIDER,
		providerMode: config.mode,
		eventType,
		action,
		providerEventId,
		providerResourceType: eventType,
		providerResourceId: dataId,
		providerRequestId: xRequestId,
		signatureValid,
		status: "received",
		payload: body,
		headers,
		query,
	});

	if (eventType !== "payment" || !dataId) {
		return NextResponse.json({ received: true });
	}

	try {
		await reconcileMercadoPagoPayment({
			paymentId: dataId,
			eventId: event.id,
		});
	} catch (_error) {
		return NextResponse.json({ received: true }, { status: 202 });
	}

	return NextResponse.json({ received: true });
}
