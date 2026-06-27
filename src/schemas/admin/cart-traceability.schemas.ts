import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/admin/_crud-schema-helpers";
import {
	lotItemStatusSchema,
	lotStatusSchema,
} from "~/schemas/admin/lot.schemas";
import {
	operationStatusSchema,
	operationStrategySchema,
} from "~/schemas/admin/operation.schemas";
import {
	highestDiagnosticSeveritySchema,
	operationalDiagnosticSchema,
} from "~/schemas/admin/operational-diagnostic.schemas";
import {
	operationsCartItemFulfillmentStatusSchema,
	operationsCartItemStatusSchema,
	operationsCartStatusSchema,
	operationsUserOrderStatusSchema,
	operationsUserTransactionStatusSchema,
} from "~/schemas/admin/operations-cart.schemas";
import {
	packageLotItemStatusSchema,
	packageStatusSchema,
} from "~/schemas/admin/package.schemas";
import { productUnitSchema } from "~/schemas/admin/product.schemas";
import { currencySchema } from "~/schemas/admin/product-client-terms.schemas";
import {
	shipmentStatusSchema,
	shipmentTypeSchema,
} from "~/schemas/admin/shipment.schemas";
import { userRoleSchema } from "~/schemas/admin/user.schemas";
import { adminTrackingTimelineItemSchema } from "~/schemas/tracking.schemas";

export const cartTraceabilityInputSchema = z.object({
	cartId: z.number().int().positive(),
});

const rollOverStageSchema = z.enum(["preAllocation", "postAllocation"]);
const rollOverStatusSchema = z.enum([
	"open",
	"rebatched",
	"resolved",
	"cancelled",
]);
const paymentMethodTypeSchema = z.enum([
	"credit_card",
	"mercadopago",
	"bank_transfer",
	"google_pay",
	"cash",
	"other",
]);

const cartTraceabilityUserSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	role: userRoleSchema,
	deleted: z.boolean(),
});

const cartTraceabilityProductSchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	unit: productUnitSchema,
});

const cartTraceabilityOperationSchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	status: operationStatusSchema,
	strategy: operationStrategySchema,
});

const cartTraceabilityShipmentSchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	internalCode: z.string(),
	status: shipmentStatusSchema,
	type: shipmentTypeSchema,
	trackingCode: z.string().nullable(),
});

const cartTraceabilityPackagingSchema = z.object({
	id: z.number().int().positive(),
	quantity: decimalOutputSchema,
	packageLine: z.object({
		id: z.number().int().positive(),
		quantity: decimalOutputSchema,
		status: packageLotItemStatusSchema,
	}),
	package: z.object({
		id: z.number().int().positive(),
		name: z.string(),
		status: packageStatusSchema,
		trackingCode: z.string().nullable(),
	}),
	shipment: cartTraceabilityShipmentSchema.nullable(),
});

const cartTraceabilityAllocationSchema = z.object({
	id: z.number().int().positive(),
	quantity: decimalOutputSchema,
	lotItem: z.object({
		id: z.number().int().positive(),
		code: z.string(),
		status: lotItemStatusSchema,
		quantity: decimalOutputSchema,
		product: z.object({ name: z.string() }),
		lot: z.object({
			id: z.number().int().positive(),
			code: z.string(),
			status: lotStatusSchema,
			supplierName: z.string(),
			operation: cartTraceabilityOperationSchema,
		}),
	}),
	packaging: z.array(cartTraceabilityPackagingSchema),
});

const cartTraceabilityRollOverSchema = z.object({
	id: z.number().int().positive(),
	stage: rollOverStageSchema,
	status: rollOverStatusSchema,
	quantity: decimalOutputSchema,
	reason: z.string(),
	operation: z.object({
		id: z.number().int().positive(),
		code: z.string(),
		status: operationStatusSchema,
	}),
});

const cartTraceabilityItemSchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	quantity: decimalOutputSchema,
	status: operationsCartItemStatusSchema,
	fulfillmentStatus: operationsCartItemFulfillmentStatusSchema,
	deleted: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
	product: cartTraceabilityProductSchema,
	allocations: z.array(cartTraceabilityAllocationSchema),
	rollOvers: z.array(cartTraceabilityRollOverSchema),
	diagnostics: z.array(operationalDiagnosticSchema),
	highestDiagnosticSeverity: highestDiagnosticSeveritySchema,
	timeline: z.array(adminTrackingTimelineItemSchema),
});

const cartTraceabilityPaymentSchema = z.object({
	id: z.number().int().positive(),
	amount: decimalOutputSchema,
	currency: currencySchema,
	status: operationsUserTransactionStatusSchema,
	provider: z.string(),
	paymentMethodType: paymentMethodTypeSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
});

const cartTraceabilityOrderSchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	status: operationsUserOrderStatusSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
	payments: z.array(cartTraceabilityPaymentSchema),
});

const cartTraceabilityFulfillmentCountSchema = z.object({
	status: operationsCartItemFulfillmentStatusSchema,
	count: z.number().int().positive(),
});

const cartTraceabilityAggregateSchema = z.object({
	itemCount: z.number().int().nonnegative(),
	fulfillmentSummary: z.array(cartTraceabilityFulfillmentCountSchema),
});

const cartTraceabilityCartSchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	status: operationsCartStatusSchema,
	deleted: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
	user: cartTraceabilityUserSchema,
});

export const cartTraceabilityDetailSchema = z.object({
	cart: cartTraceabilityCartSchema,
	aggregate: cartTraceabilityAggregateSchema,
	orders: z.array(cartTraceabilityOrderSchema),
	items: z.array(cartTraceabilityItemSchema),
	cartTimeline: z.array(adminTrackingTimelineItemSchema),
	diagnostics: z.array(operationalDiagnosticSchema),
	highestDiagnosticSeverity: highestDiagnosticSeveritySchema,
});
