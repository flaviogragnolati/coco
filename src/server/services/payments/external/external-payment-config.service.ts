import "server-only";

import type { Prisma } from "~/prisma/client";
import { externalPaymentSettingsSchema } from "~/schemas/admin/payment.schemas";
import type { db } from "~/server/db";
import { toPrismaInputJson } from "~/server/services/admin/_base/prisma-json";
import type { ExternalPaymentSettings } from "~/shared/common/admin-crud/payment.types";

type PaymentDb = typeof db | Prisma.TransactionClient;

export const EXTERNAL_PROVIDER = "external";

export const defaultExternalPaymentSettings: ExternalPaymentSettings = {
	accountHolder: "",
	bankName: "",
	cbu: "",
	alias: null,
	taxId: null,
	instructions: null,
	expiresInHours: 72,
};

export function parseExternalPaymentSettings(input: unknown) {
	return externalPaymentSettingsSchema.parse({
		...defaultExternalPaymentSettings,
		...(typeof input === "object" && input !== null ? input : {}),
	});
}

export async function getExternalPaymentConfig(database: PaymentDb) {
	const config = await database.paymentProviderConfig.findUnique({
		where: { provider: EXTERNAL_PROVIDER },
	});

	return {
		id: config?.id ?? null,
		provider: "external" as const,
		enabled: config?.enabled ?? false,
		settings: parseExternalPaymentSettings(config?.settings),
		createdAt: config?.createdAt ?? null,
		updatedAt: config?.updatedAt ?? null,
	};
}

export async function upsertExternalPaymentConfig(
	database: PaymentDb,
	input: {
		enabled: boolean;
		settings: ExternalPaymentSettings;
	},
) {
	// `mode` stays at its schema default: the external provider has no sandbox.
	const saved = await database.paymentProviderConfig.upsert({
		where: { provider: EXTERNAL_PROVIDER },
		create: {
			provider: EXTERNAL_PROVIDER,
			enabled: input.enabled,
			settings: toPrismaInputJson(input.settings),
		},
		update: {
			enabled: input.enabled,
			settings: toPrismaInputJson(input.settings),
		},
	});

	return {
		id: saved.id,
		provider: "external" as const,
		enabled: saved.enabled,
		settings: parseExternalPaymentSettings(saved.settings),
		createdAt: saved.createdAt,
		updatedAt: saved.updatedAt,
	};
}
