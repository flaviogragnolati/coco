import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import { externalPaymentInstructionsSchema } from "~/schemas/admin/payment.schemas";
import { cartSnapshotSchema } from "~/schemas/cart.schemas";
import { catalogCurrencySchema } from "~/schemas/catalog.schemas";
import {
	checkoutPickupPointSchema,
	deliveryModeSchema,
	pickupPointDataSchema,
	pickupPointSnapshotSchema,
} from "~/schemas/pickup-point.schemas";
import { TRANSFER_DISCOUNT_MAX_PERCENT } from "~/shared/common/transfer-discount";

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

export const checkoutDeliveryInputSchema = z.discriminatedUnion("mode", [
	z.object({
		mode: z.literal("homeDelivery"),
		shippingAddressId: checkoutAddressIdSchema,
	}),
	z.object({
		mode: z.literal("pickupPoint"),
		pickupPointId: z.number().int().positive(),
	}),
]);

/**
 * The order a confirmed cart is waiting on (ADR 0015), with the choices it was
 * confirmed with so the screen can show them and confirm again.
 */
export const checkoutLiveOrderSchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	/** Null when the stored choice no longer maps to one checkout can send. */
	delivery: checkoutDeliveryInputSchema.nullable(),
	/** Method and provider of the latest attempt; null before the first one. */
	paymentMethodId: checkoutPaymentMethodIdSchema.nullable(),
	provider: z.string().nullable(),
	/** Whether "Volver a editar el pedido" may release the cart, or why not. */
	release: z.enum([
		"release",
		"blockedPaymentInFlight",
		"blockedDeclaredReceipt",
	]),
});

export const checkoutStateSchema = z.object({
	cart: cartSnapshotSchema,
	/** Null while the cart is editable. */
	liveOrder: checkoutLiveOrderSchema.nullable(),
	addresses: z.array(checkoutAddressSchema),
	paymentMethods: z.array(checkoutPaymentMethodSchema),
	/** Active points only; empty hides the pickup option. */
	pickupPoints: z.array(checkoutPickupPointSchema),
	termsText: z.string(),
	/** Null when paying by transfer gives no discount (ADR 0013). */
	transferDiscountPercent: z
		.number()
		.positive()
		.max(TRANSFER_DISCOUNT_MAX_PERCENT)
		.nullable(),
});

export const checkoutConfirmInputSchema = z.object({
	delivery: checkoutDeliveryInputSchema,
	paymentMethodId: checkoutPaymentMethodIdSchema,
	acceptedTerms: z.literal(true, {
		error: "Tenés que aceptar los términos para confirmar el pedido",
	}),
	idempotencyKey: z.string().uuid(),
	/** The amount the screen showed for the chosen payment method. */
	expectedAmount: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/, "Monto inválido"),
});

/**
 * The transfer discount an attempt froze at confirmation (ADR 0013); all three
 * null when it carries none.
 */
export const attemptTransferDiscountFields = {
	subtotalAmount: decimalOutputSchema.nullable(),
	transferDiscountPercent: decimalOutputSchema.nullable(),
	transferDiscountAmount: decimalOutputSchema.nullable(),
};

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
		...attemptTransferDiscountFields,
	}),
	redirectUrl: z.string().nullable().optional(),
	/** Transfer data the user needs while an external attempt stays pending (ADR 0010). */
	externalPayment: externalPaymentInstructionsSchema.nullable().optional(),
	deliveryPreference: deliveryModeSchema.nullable(),
	/** Null for a pickup-point order, which stores no address. */
	shippingAddress: checkoutAddressSchema.nullable(),
	pickupPoint: pickupPointDataSchema.nullable(),
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
	/** Product names in the order they were confirmed. */
	itemNames: z.array(z.string()),
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
	/** The customer reported a transfer the admin has not verified yet. */
	receiptDeclared: z.boolean(),
});

export const orderListOutputSchema = z.array(orderListItemSchema);

export const orderGetInputSchema = z.object({
	id: z.number().int().positive(),
});

/** What a Mercado Pago return page reads from its query string. */
export const orderPaymentReturnInputSchema = z.object({
	externalReference: z.string().max(64),
});

/** Null when the reference is not one of the user's attempts. */
export const orderPaymentReturnSchema = z
	.object({ orderId: z.number().int().positive() })
	.nullable();

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
	/** Null on orders paid before the customer could choose. */
	deliveryPreference: deliveryModeSchema.nullable(),
	pickupPointSnapshot: pickupPointSnapshotSchema.nullable(),
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
			...attemptTransferDiscountFields,
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
