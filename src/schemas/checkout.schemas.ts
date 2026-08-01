import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import { externalPaymentInstructionsSchema } from "~/schemas/admin/payment.schemas";
import { cartSnapshotSchema } from "~/schemas/cart.schemas";
import { catalogCurrencySchema } from "~/schemas/catalog.schemas";

const requiredText = (message: string) => z.string().trim().min(1, message);

const emptyStringToNull = (value: unknown) => {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const optionalTextInputSchema = z
	.preprocess(emptyStringToNull, z.string().nullable().optional())
	.transform((value) => value ?? null);

export const checkoutAddressTypeSchema = z.enum([
	"all",
	"billing",
	"shipping",
	"other",
]);

export const checkoutAddressIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const checkoutAddressFieldsSchema = z.object({
	type: checkoutAddressTypeSchema.default("shipping"),
	line1: requiredText("La dirección es obligatoria"),
	line2: optionalTextInputSchema,
	city: requiredText("La ciudad es obligatoria"),
	state: requiredText("La provincia o estado es obligatorio"),
	postalCode: requiredText("El código postal es obligatorio"),
	country: requiredText("El país es obligatorio"),
});

export const checkoutAddressSchema = checkoutAddressFieldsSchema.extend({
	id: checkoutAddressIdSchema,
	active: z.boolean(),
});

export const checkoutAddressCreateInputSchema = checkoutAddressFieldsSchema;

export const checkoutAddressUpdateInputSchema =
	checkoutAddressFieldsSchema.extend({
		id: checkoutAddressIdSchema,
	});

export const checkoutPaymentMethodTypeSchema = z.enum([
	"credit_card",
	"mercadopago",
	"bank_transfer",
	"google_pay",
	"cash",
	"other",
]);

export const checkoutPaymentMethodIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const checkoutPaymentMethodSchema = z.object({
	id: checkoutPaymentMethodIdSchema,
	type: checkoutPaymentMethodTypeSchema,
	label: z.string(),
	details: z.string(),
	provider: z.string(),
	externalPaymentMethodId: z.string().nullable(),
	active: z.boolean(),
});

export const checkoutStateSchema = z.object({
	cart: cartSnapshotSchema,
	addresses: z.array(checkoutAddressSchema),
	paymentMethods: z.array(checkoutPaymentMethodSchema),
	termsText: z.string(),
});

export const checkoutConfirmInputSchema = z.object({
	shippingAddressId: checkoutAddressIdSchema,
	paymentMethodId: checkoutPaymentMethodIdSchema,
	acceptedTerms: z.literal(true, {
		error: "Tenés que aceptar los términos para confirmar el pedido",
	}),
	idempotencyKey: z.string().uuid(),
});

export const checkoutPaymentStatusSchema = z.enum([
	"succeeded",
	"failed",
	"pending",
]);

export const checkoutPaymentResultSchema = z.object({
	status: checkoutPaymentStatusSchema,
	message: z.string(),
	order: z.object({
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
	}),
	transaction: z.object({
		id: z.number().int().positive(),
		status: z.enum([
			"pending",
			"inProcess",
			"completed",
			"failed",
			"cancelled",
			"refunded",
			"chargedBack",
		]),
		amount: decimalOutputSchema,
		currency: catalogCurrencySchema,
		provider: z.string(),
		externalTransactionId: z.string().nullable(),
		failureCode: z.string().nullable(),
		failureMessage: z.string().nullable(),
		checkoutUrl: z.string().nullable().optional(),
		sandboxCheckoutUrl: z.string().nullable().optional(),
	}),
	redirectUrl: z.string().nullable().optional(),
	/** Transfer data the user needs while an external attempt stays pending (ADR 0010). */
	externalPayment: externalPaymentInstructionsSchema.nullable().optional(),
	shippingAddress: checkoutAddressSchema,
	paymentMethod: checkoutPaymentMethodSchema,
});

export const orderListItemSchema = z.object({
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
	createdAt: z.date(),
	updatedAt: z.date(),
	itemCount: z.number().int().nonnegative(),
	totalAmount: decimalOutputSchema,
	currency: catalogCurrencySchema.nullable(),
	latestTransactionStatus: z
		.enum([
			"pending",
			"inProcess",
			"completed",
			"failed",
			"cancelled",
			"refunded",
			"chargedBack",
		])
		.nullable(),
});

export const orderListOutputSchema = z.array(orderListItemSchema);

export const orderGetInputSchema = z.object({
	id: z.number().int().positive(),
});

export const orderDeclareReceiptInputSchema = z.object({
	orderId: z.number().int().positive(),
	reference: z
		.string()
		.trim()
		.min(3, "Ingresá la referencia del comprobante")
		.max(120, "La referencia es demasiado larga"),
});

export const orderExternalPaymentSchema =
	externalPaymentInstructionsSchema.extend({
		declaredReceiptReference: z.string().nullable(),
		declaredReceiptAt: z.date().nullable(),
	});

export const orderDetailSchema = orderListItemSchema.extend({
	cartCode: z.string(),
	billingAddressSnapshot: z.unknown().nullable(),
	shippingAddressSnapshot: z.unknown().nullable(),
	termsSnapshot: z.unknown().nullable(),
	acceptedTermsAt: z.date().nullable(),
	/**
	 * Transfer data plus whatever the user already declared, present only while
	 * the latest attempt is external and pending (ADR 0010).
	 */
	externalPayment: orderExternalPaymentSchema.nullable(),
	items: z.array(
		z.object({
			id: z.number().int().positive(),
			sourceCartItemId: z.number().int().positive(),
			quantity: decimalOutputSchema,
			productSnapshot: z.unknown(),
			priceSnapshot: z.unknown(),
			createdAt: z.date(),
		}),
	),
	transactions: z.array(
		z.object({
			id: z.number().int().positive(),
			amount: decimalOutputSchema,
			currency: catalogCurrencySchema,
			status: z.enum([
				"pending",
				"inProcess",
				"completed",
				"failed",
				"cancelled",
				"refunded",
				"chargedBack",
			]),
			provider: z.string(),
			externalTransactionId: z.string().nullable(),
			providerStatus: z.string().nullable(),
			failureCode: z.string().nullable(),
			failureMessage: z.string().nullable(),
			createdAt: z.date(),
			paymentMethod: checkoutPaymentMethodSchema.pick({
				id: true,
				type: true,
				label: true,
				details: true,
				provider: true,
				externalPaymentMethodId: true,
				active: true,
			}),
		}),
	),
});
