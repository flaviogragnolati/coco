import { z } from "zod";

import { catalogCurrencySchema } from "~/schemas/catalog.schemas";

const emptyStringToNull = (value: unknown) => {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const nullableTextSchema = z
	.preprocess(emptyStringToNull, z.string().nullable().optional())
	.transform((value) => value ?? null);

const decimalStringSchema = z.preprocess((value) => {
	if (value === null || value === undefined) return value;
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	if (
		typeof value === "object" &&
		"toString" in value &&
		typeof value.toString === "function"
	) {
		return value.toString();
	}
	return value;
}, z.string());

const jsonLikeSchema = z.unknown().nullable();

export const paymentProviderModeSchema = z.enum(["sandbox", "production"]);

export const paymentAttemptStatusSchema = z.enum([
	"pending",
	"inProcess",
	"completed",
	"failed",
	"cancelled",
	"refunded",
	"chargedBack",
]);

export const paymentProviderEventStatusSchema = z.enum([
	"received",
	"processed",
	"failed",
	"ignored",
	"rejected",
]);

export const paymentAttemptIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const paymentProviderEventIdSchema = paymentAttemptIdSchema;

export const paymentListInputSchema = z.object({
	provider: z.string().trim().optional(),
	status: paymentAttemptStatusSchema.optional(),
	eventStatus: paymentProviderEventStatusSchema.optional(),
	search: z.string().trim().optional(),
});

export const paymentAttemptListItemSchema = z.object({
	id: paymentAttemptIdSchema,
	amount: decimalStringSchema,
	currency: catalogCurrencySchema,
	status: paymentAttemptStatusSchema,
	provider: z.string(),
	providerMode: paymentProviderModeSchema.nullable(),
	providerPreferenceId: z.string().nullable(),
	providerPaymentId: z.string().nullable(),
	providerStatus: z.string().nullable(),
	providerStatusDetail: z.string().nullable(),
	checkoutUrl: z.string().nullable(),
	sandboxCheckoutUrl: z.string().nullable(),
	expiresAt: z.date().nullable(),
	completedAt: z.date().nullable(),
	cancelledAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
	userOrder: z.object({
		id: z.number().int().positive(),
		code: z.string(),
		status: z.enum([
			"pending",
			"processing",
			"completed",
			"cancelled",
			"failed",
			"refunded",
			"chargedBack",
		]),
		user: z.object({
			id: z.string(),
			name: z.string(),
			email: z.string(),
		}),
	}),
	paymentMethod: z.object({
		id: z.number().int().positive(),
		type: z.enum([
			"credit_card",
			"mercadopago",
			"bank_transfer",
			"google_pay",
			"cash",
			"other",
		]),
		label: z.string(),
		provider: z.string(),
	}),
	_count: z.object({
		paymentProviderEvents: z.number().int().nonnegative(),
	}),
});

export const paymentAttemptDetailSchema = paymentAttemptListItemSchema.extend({
	idempotencyKey: z.string(),
	externalTransactionId: z.string().nullable(),
	providerMerchantOrderId: z.string().nullable(),
	providerOrderId: z.string().nullable(),
	failureCode: z.string().nullable(),
	failureMessage: z.string().nullable(),
	requestSnapshot: jsonLikeSchema,
	responseSnapshot: jsonLikeSchema,
	events: z.array(
		z.object({
			id: paymentProviderEventIdSchema,
			eventType: z.string().nullable(),
			action: z.string().nullable(),
			providerResourceType: z.string().nullable(),
			providerResourceId: z.string().nullable(),
			providerRequestId: z.string().nullable(),
			signatureValid: z.boolean(),
			status: paymentProviderEventStatusSchema,
			lastError: z.string().nullable(),
			receivedAt: z.date(),
			processedAt: z.date().nullable(),
			ignoredAt: z.date().nullable(),
		}),
	),
});

export const paymentAttemptListOutputSchema = z.array(
	paymentAttemptListItemSchema,
);

export const paymentEventListItemSchema = z.object({
	id: paymentProviderEventIdSchema,
	provider: z.string(),
	providerMode: paymentProviderModeSchema.nullable(),
	eventType: z.string().nullable(),
	action: z.string().nullable(),
	providerEventId: z.string().nullable(),
	providerResourceType: z.string().nullable(),
	providerResourceId: z.string().nullable(),
	providerRequestId: z.string().nullable(),
	signatureValid: z.boolean(),
	status: paymentProviderEventStatusSchema,
	retryCount: z.number().int().nonnegative(),
	lastError: z.string().nullable(),
	receivedAt: z.date(),
	processedAt: z.date().nullable(),
	ignoredAt: z.date().nullable(),
	userTransaction: z
		.object({
			id: paymentAttemptIdSchema,
			status: paymentAttemptStatusSchema,
			userOrder: z.object({
				id: z.number().int().positive(),
				code: z.string(),
				user: z.object({
					id: z.string(),
					name: z.string(),
					email: z.string(),
				}),
			}),
		})
		.nullable(),
});

export const paymentEventDetailSchema = paymentEventListItemSchema.extend({
	payload: jsonLikeSchema,
	headers: jsonLikeSchema,
	query: jsonLikeSchema,
});

export const paymentEventListOutputSchema = z.array(paymentEventListItemSchema);

export const paymentStatsSchema = z.object({
	totalAttempts: z.number().int().nonnegative(),
	pendingAttempts: z.number().int().nonnegative(),
	completedAttempts: z.number().int().nonnegative(),
	failedAttempts: z.number().int().nonnegative(),
	receivedEvents: z.number().int().nonnegative(),
	failedEvents: z.number().int().nonnegative(),
});

export const mercadoPagoSettingsSchema = z.object({
	publicBaseUrl: z.string().url("Ingresá una URL base válida"),
	notificationUrl: z.string().url("Ingresá una URL de webhook válida"),
	successBackUrl: z.string().url("Ingresá una URL de éxito válida"),
	failureBackUrl: z.string().url("Ingresá una URL de fallo válida"),
	pendingBackUrl: z.string().url("Ingresá una URL de pendiente válida"),
	preferenceExpiresInMinutes: z.coerce
		.number()
		.int()
		.positive("La expiración debe ser positiva")
		.default(60),
	autoReturnApproved: z.boolean().default(true),
	binaryMode: z.boolean().default(false),
	excludedPaymentTypes: z.array(z.string().trim()).default([]),
	excludedPaymentMethods: z.array(z.string().trim()).default([]),
	statementDescriptor: nullableTextSchema,
	allowUnsignedWebhooksInDevelopment: z.boolean().default(false),
});

export const paymentProviderConfigSchema = z.object({
	id: z.number().int().positive().nullable(),
	provider: z.literal("mercadopago"),
	enabled: z.boolean(),
	mode: paymentProviderModeSchema,
	settings: mercadoPagoSettingsSchema,
	diagnostics: z.object({
		accessTokenConfigured: z.boolean(),
		webhookSecretConfigured: z.boolean(),
		appEnv: z.enum(["development", "test", "production"]),
	}),
	createdAt: z.date().nullable(),
	updatedAt: z.date().nullable(),
});

export const paymentProviderConfigUpdateInputSchema = z.object({
	enabled: z.boolean(),
	mode: paymentProviderModeSchema,
	settings: mercadoPagoSettingsSchema,
	confirmation: z.string().trim().min(1, "La confirmación es obligatoria"),
});

export const paymentAttemptActionInputSchema = z.object({
	id: paymentAttemptIdSchema,
});

export const paymentEventActionInputSchema = z.object({
	id: paymentProviderEventIdSchema,
});

export const paymentEventIgnoreInputSchema =
	paymentEventActionInputSchema.extend({
		reason: z.string().trim().min(5, "Indicá un motivo para ignorar el evento"),
	});
