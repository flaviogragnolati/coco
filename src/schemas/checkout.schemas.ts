import { z } from "zod";
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

const safePaymentTextSchema = (message: string) =>
	requiredText(message)
		.max(120, "Usá una descripción corta")
		.refine((value) => !/\d{12,}/.test(value.replace(/[\s-]/g, "")), {
			message: "No ingreses números completos de tarjeta ni datos sensibles",
		});

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

export const checkoutPaymentMethodFieldsSchema = z.object({
	type: checkoutPaymentMethodTypeSchema.default("credit_card"),
	label: safePaymentTextSchema("El nombre del método es obligatorio"),
	details: safePaymentTextSchema(
		"La descripción segura del método es obligatoria",
	),
});

export const checkoutPaymentMethodSchema = z.object({
	id: checkoutPaymentMethodIdSchema,
	type: checkoutPaymentMethodTypeSchema,
	label: z.string(),
	details: z.string(),
	provider: z.string(),
	externalPaymentMethodId: z.string().nullable(),
	active: z.boolean(),
});

export const checkoutPaymentMethodCreateInputSchema =
	checkoutPaymentMethodFieldsSchema;

export const checkoutPaymentMethodUpdateInputSchema =
	checkoutPaymentMethodFieldsSchema.extend({
		id: checkoutPaymentMethodIdSchema,
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
		]),
	}),
	transaction: z.object({
		id: z.number().int().positive(),
		status: z.enum(["pending", "completed", "failed", "refunded"]),
		amount: decimalStringSchema,
		currency: catalogCurrencySchema,
		provider: z.string(),
		externalTransactionId: z.string().nullable(),
		failureCode: z.string().nullable(),
		failureMessage: z.string().nullable(),
	}),
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
	]),
	createdAt: z.date(),
	updatedAt: z.date(),
	itemCount: z.number().int().nonnegative(),
	totalAmount: decimalStringSchema,
	currency: catalogCurrencySchema.nullable(),
	latestTransactionStatus: z
		.enum(["pending", "completed", "failed", "refunded"])
		.nullable(),
});

export const orderListOutputSchema = z.array(orderListItemSchema);

export const orderGetInputSchema = z.object({
	id: z.number().int().positive(),
});

export const orderDetailSchema = orderListItemSchema.extend({
	cartCode: z.string(),
	billingAddressSnapshot: z.unknown().nullable(),
	shippingAddressSnapshot: z.unknown().nullable(),
	termsSnapshot: z.unknown().nullable(),
	acceptedTermsAt: z.date().nullable(),
	items: z.array(
		z.object({
			id: z.number().int().positive(),
			sourceCartItemId: z.number().int().positive(),
			quantity: decimalStringSchema,
			productSnapshot: z.unknown(),
			priceSnapshot: z.unknown(),
			createdAt: z.date(),
		}),
	),
	transactions: z.array(
		z.object({
			id: z.number().int().positive(),
			amount: decimalStringSchema,
			currency: catalogCurrencySchema,
			status: z.enum(["pending", "completed", "failed", "refunded"]),
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
