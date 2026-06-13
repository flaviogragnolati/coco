import "server-only";

import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import { env } from "~/env";
import type { Prisma } from "~/prisma/client";
import {
	mercadoPagoSettingsSchema,
	type paymentProviderModeSchema,
} from "~/schemas/admin/payment.schemas";
import type { db } from "~/server/db";
import { toPrismaInputJson } from "~/server/services/admin/_base/prisma-json";
import type { MercadoPagoSettings } from "~/shared/common/admin-crud/payment.types";

type PaymentProviderMode = z.output<typeof paymentProviderModeSchema>;
type PaymentDb = typeof db | Prisma.TransactionClient;

export const MERCADOPAGO_PROVIDER = "mercadopago";

export const defaultMercadoPagoSettings: MercadoPagoSettings = {
	publicBaseUrl: "http://localhost:3000",
	notificationUrl: "http://localhost:3000/api/mercadopago/webhook",
	successBackUrl: "http://localhost:3000/checkout/mercadopago/success",
	failureBackUrl: "http://localhost:3000/checkout/mercadopago/failure",
	pendingBackUrl: "http://localhost:3000/checkout/mercadopago/pending",
	preferenceExpiresInMinutes: 60,
	autoReturnApproved: true,
	binaryMode: false,
	excludedPaymentTypes: [],
	excludedPaymentMethods: [],
	statementDescriptor: null,
	allowUnsignedWebhooksInDevelopment: false,
};

function isLocalHttpUrl(url: URL) {
	return (
		url.protocol === "http:" &&
		(url.hostname === "localhost" || url.hostname === "127.0.0.1")
	);
}

export function validateMercadoPagoUrls(settings: MercadoPagoSettings) {
	const urls = [
		settings.publicBaseUrl,
		settings.notificationUrl,
		settings.successBackUrl,
		settings.failureBackUrl,
		settings.pendingBackUrl,
	];

	for (const rawUrl of urls) {
		const url = new URL(rawUrl);
		const allowed =
			url.protocol === "https:" ||
			(env.APP_ENV !== "production" && isLocalHttpUrl(url));

		if (!allowed) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"Las URLs de Mercado Pago deben usar HTTPS en producción. En desarrollo solo se permite HTTP local.",
			});
		}
	}
}

export function parseMercadoPagoSettings(input: unknown) {
	const settings = mercadoPagoSettingsSchema.parse({
		...defaultMercadoPagoSettings,
		...(typeof input === "object" && input !== null ? input : {}),
	});
	validateMercadoPagoUrls(settings);
	return settings;
}

export async function getMercadoPagoConfig(database: PaymentDb) {
	const config = await database.paymentProviderConfig.findUnique({
		where: { provider: MERCADOPAGO_PROVIDER },
	});

	return {
		id: config?.id ?? null,
		provider: "mercadopago" as const,
		enabled: config?.enabled ?? false,
		mode: (config?.mode ?? "sandbox") as PaymentProviderMode,
		settings: parseMercadoPagoSettings(config?.settings),
		diagnostics: {
			accessTokenConfigured: Boolean(env.MERCADOPAGO_ACCESS_TOKEN),
			webhookSecretConfigured: Boolean(env.MERCADOPAGO_WEBHOOK_SECRET),
			appEnv: env.APP_ENV,
		},
		createdAt: config?.createdAt ?? null,
		updatedAt: config?.updatedAt ?? null,
	};
}

export async function getEnabledMercadoPagoConfig(database: PaymentDb) {
	const config = await getMercadoPagoConfig(database);

	if (!config.enabled) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Mercado Pago no está habilitado para checkout.",
		});
	}

	if (!env.MERCADOPAGO_ACCESS_TOKEN) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Falta configurar el access token de Mercado Pago.",
		});
	}

	return config;
}

export async function upsertMercadoPagoConfig(
	database: PaymentDb,
	input: {
		enabled: boolean;
		mode: PaymentProviderMode;
		settings: MercadoPagoSettings;
	},
) {
	validateMercadoPagoUrls(input.settings);

	const saved = await database.paymentProviderConfig.upsert({
		where: { provider: MERCADOPAGO_PROVIDER },
		create: {
			provider: MERCADOPAGO_PROVIDER,
			enabled: input.enabled,
			mode: input.mode,
			settings: toPrismaInputJson(input.settings),
		},
		update: {
			enabled: input.enabled,
			mode: input.mode,
			settings: toPrismaInputJson(input.settings),
		},
	});

	return {
		id: saved.id,
		provider: "mercadopago" as const,
		enabled: saved.enabled,
		mode: saved.mode,
		settings: parseMercadoPagoSettings(saved.settings),
		diagnostics: {
			accessTokenConfigured: Boolean(env.MERCADOPAGO_ACCESS_TOKEN),
			webhookSecretConfigured: Boolean(env.MERCADOPAGO_WEBHOOK_SECRET),
			appEnv: env.APP_ENV,
		},
		createdAt: saved.createdAt,
		updatedAt: saved.updatedAt,
	};
}

export function canProcessUnsignedMercadoPagoWebhook(input: {
	allowUnsignedWebhooksInDevelopment: boolean;
}) {
	return (
		env.APP_ENV !== "production" &&
		input.allowUnsignedWebhooksInDevelopment === true
	);
}
