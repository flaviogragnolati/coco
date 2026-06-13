import type { z } from "zod";

import type {
	mercadoPagoSettingsSchema,
	paymentAttemptDetailSchema,
	paymentAttemptListItemSchema,
	paymentAttemptListOutputSchema,
	paymentEventDetailSchema,
	paymentEventIgnoreInputSchema,
	paymentEventListItemSchema,
	paymentEventListOutputSchema,
	paymentListInputSchema,
	paymentProviderConfigSchema,
	paymentProviderConfigUpdateInputSchema,
	paymentStatsSchema,
} from "~/schemas/admin/payment.schemas";

export type PaymentListInput = z.output<typeof paymentListInputSchema>;
export type PaymentAttemptListItem = z.output<
	typeof paymentAttemptListItemSchema
>;
export type PaymentAttemptDetail = z.output<typeof paymentAttemptDetailSchema>;
export type PaymentAttemptListOutput = z.output<
	typeof paymentAttemptListOutputSchema
>;
export type PaymentEventListItem = z.output<typeof paymentEventListItemSchema>;
export type PaymentEventDetail = z.output<typeof paymentEventDetailSchema>;
export type PaymentEventListOutput = z.output<
	typeof paymentEventListOutputSchema
>;
export type PaymentStats = z.output<typeof paymentStatsSchema>;
export type MercadoPagoSettings = z.output<typeof mercadoPagoSettingsSchema>;
export type PaymentProviderConfig = z.output<
	typeof paymentProviderConfigSchema
>;
export type PaymentProviderConfigUpdateInput = z.output<
	typeof paymentProviderConfigUpdateInputSchema
>;
export type PaymentProviderConfigFormInput = z.input<
	typeof paymentProviderConfigUpdateInputSchema
>;
export type PaymentEventIgnoreInput = z.output<
	typeof paymentEventIgnoreInputSchema
>;
