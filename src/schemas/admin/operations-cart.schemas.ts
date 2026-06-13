import { z } from "zod";
import {
	decimalOutputSchema,
	requiredDecimalString,
} from "~/schemas/admin/_crud-schema-helpers";
import { userIdSchema } from "~/schemas/admin/address.schemas";
import {
	productIdSchema,
	productUnitSchema,
} from "~/schemas/admin/product.schemas";
import {
	currencySchema,
	productClientTermsIdSchema,
} from "~/schemas/admin/product-client-terms.schemas";
import { userRoleSchema } from "~/schemas/admin/user.schemas";

export const operationsCartIdSchema = z
	.number()
	.int("El id debe ser un numero entero")
	.positive("El id debe ser positivo");

export const operationsCartItemIdSchema = z
	.number()
	.int("El id debe ser un numero entero")
	.positive("El id debe ser positivo");

export const operationsCartStatusSchema = z.enum([
	"draft",
	"pending",
	"atCheckout",
	"submitted",
	"abandoned",
	"cancelled",
	"aborted",
]);

export const operationsCartItemStatusSchema = z.enum([
	"inCart",
	"submitted",
	"dropped",
	"cancelled",
]);

export const operationsCartItemFulfillmentStatusSchema = z.enum([
	"awaitingAggregation",
	"includedInOperation",
	"allocatedToSupplierItem",
	"requestedFromSupplier",
	"supplierConfirmed",
	"packaged",
	"inInternalShipment",
	"atWarehouse",
	"inEndUserShipment",
	"delivered",
	"partiallyRolledOver",
	"rolledOver",
	"cancelled",
	"exception",
]);

export const operationsUserOrderStatusSchema = z.enum([
	"pending",
	"processing",
	"completed",
	"cancelled",
	"failed",
	"refunded",
	"chargedBack",
]);

export const operationsUserTransactionStatusSchema = z.enum([
	"pending",
	"inProcess",
	"completed",
	"failed",
	"cancelled",
	"refunded",
	"chargedBack",
]);

const optionalTrimmedText = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined));

const operationsUserSummarySchema = z.object({
	id: userIdSchema,
	name: z.string(),
	email: z.string(),
	role: userRoleSchema,
	deleted: z.boolean(),
});

const operationsBrandSummarySchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	deleted: z.boolean(),
});

const operationsProductSummarySchema = z.object({
	id: productIdSchema,
	name: z.string(),
	unit: productUnitSchema,
	deleted: z.boolean(),
	brand: operationsBrandSummarySchema.nullable(),
});

const operationsProductClientTermsSummarySchema = z.object({
	id: productClientTermsIdSchema,
	currency: currencySchema,
	moq: decimalOutputSchema,
	moqPrice: decimalOutputSchema,
	step: decimalOutputSchema.nullable(),
	stepPrice: decimalOutputSchema.nullable(),
	max: decimalOutputSchema.nullable(),
	refPrice: decimalOutputSchema.nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	product: operationsProductSummarySchema,
});

const operationsCartProductPreviewSchema = z.object({
	productId: productIdSchema,
	name: z.string(),
	unit: productUnitSchema,
	quantity: decimalOutputSchema,
	itemCount: z.number().int().nonnegative(),
	deleted: z.boolean(),
});

const operationsPaymentSummarySchema = z.object({
	transactionCount: z.number().int().nonnegative(),
	pendingAmount: decimalOutputSchema,
	completedAmount: decimalOutputSchema,
	failedAmount: decimalOutputSchema,
	refundedAmount: decimalOutputSchema,
	currencies: z.array(currencySchema),
});

export const operationsCartListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
	search: optionalTrimmedText,
	userId: userIdSchema.optional(),
	productId: productIdSchema.optional(),
	productClientTermsId: productClientTermsIdSchema.optional(),
	cartStatus: operationsCartStatusSchema.optional(),
	cartItemStatus: operationsCartItemStatusSchema.optional(),
	fulfillmentStatus: operationsCartItemFulfillmentStatusSchema.optional(),
	orderStatus: operationsUserOrderStatusSchema.optional(),
	paymentStatus: operationsUserTransactionStatusSchema.optional(),
});

export const operationsCartListItemSchema = z.object({
	id: operationsCartIdSchema,
	code: z.string(),
	status: operationsCartStatusSchema,
	deleted: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
	user: operationsUserSummarySchema,
	itemCount: z.number().int().nonnegative(),
	totalQuantity: decimalOutputSchema,
	products: z.array(operationsCartProductPreviewSchema),
	orderCount: z.number().int().nonnegative(),
	latestOrderStatus: operationsUserOrderStatusSchema.nullable(),
	paymentSummary: operationsPaymentSummarySchema,
});

const operationsCartDetailItemSchema = z.object({
	id: operationsCartItemIdSchema,
	code: z.string(),
	quantity: decimalOutputSchema,
	status: operationsCartItemStatusSchema,
	fulfillmentStatus: operationsCartItemFulfillmentStatusSchema,
	deleted: z.boolean(),
	productSnapshot: z.unknown(),
	createdAt: z.date(),
	updatedAt: z.date(),
	productClientTerms: operationsProductClientTermsSummarySchema,
	operationalLinkCount: z.number().int().nonnegative(),
	orderItemCount: z.number().int().nonnegative(),
});

const operationsPaymentMethodSchema = z.object({
	id: z.number().int().positive(),
	type: z.enum([
		"credit_card",
		"mercadopago",
		"bank_transfer",
		"google_pay",
		"cash",
		"other",
	]),
	details: z.string(),
});

const operationsUserTransactionSchema = z.object({
	id: z.number().int().positive(),
	amount: decimalOutputSchema,
	currency: currencySchema,
	status: operationsUserTransactionStatusSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
	paymentMethod: operationsPaymentMethodSchema,
});

const operationsUserOrderItemSchema = z.object({
	id: z.number().int().positive(),
	sourceCartItemId: operationsCartItemIdSchema,
	quantity: decimalOutputSchema,
	productSnapshot: z.unknown(),
	priceSnapshot: z.unknown(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

const operationsUserOrderSchema = z.object({
	id: z.number().int().positive(),
	status: operationsUserOrderStatusSchema,
	billingAddressSnapshot: z.unknown().nullable(),
	shippingAddressSnapshot: z.unknown().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
	items: z.array(operationsUserOrderItemSchema),
	transactions: z.array(operationsUserTransactionSchema),
});

export const operationsCartDetailSchema = z.object({
	id: operationsCartIdSchema,
	code: z.string(),
	status: operationsCartStatusSchema,
	deleted: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
	user: operationsUserSummarySchema,
	cartItems: z.array(operationsCartDetailItemSchema),
	userOrders: z.array(operationsUserOrderSchema),
});

export const operationsCartItemInputSchema = z.object({
	id: operationsCartItemIdSchema.optional(),
	productClientTermsId: productClientTermsIdSchema,
	quantity: requiredDecimalString("Cantidad", 4),
});

export const operationsCartUpdateInputSchema = z.object({
	id: operationsCartIdSchema,
	status: operationsCartStatusSchema,
	items: z.array(operationsCartItemInputSchema).default([]),
});

export const operationsCartQuickStatusInputSchema = z.object({
	id: operationsCartIdSchema,
	status: operationsCartStatusSchema,
});

export const operationsCartDeleteInputSchema = z.object({
	id: operationsCartIdSchema,
});

export const operationsCartStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
	open: z.number().int().nonnegative(),
	submitted: z.number().int().nonnegative(),
	withOrders: z.number().int().nonnegative(),
	withPayments: z.number().int().nonnegative(),
});

export const operationsCartListOutputSchema = z.array(
	operationsCartListItemSchema,
);
