import { z } from "zod";
import {
	dateInputSchema,
	decimalOutputSchema,
} from "~/schemas/admin/_crud-schema-helpers";
import {
	diagnosticStateSchema,
	highestDiagnosticSeveritySchema,
	operationalDiagnosticSchema,
} from "~/schemas/admin/operational-diagnostic.schemas";

const optionalTrimmedText = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined));

const positiveIdSchema = z.number().int().positive();

export const lotStatusSchema = z.enum([
	"pending",
	"assembling",
	"requested",
	"confirmed",
	"readyForPackaging",
	"completed",
	"cancelled",
]);

export const lotItemStatusSchema = z.enum([
	"pending",
	"requested",
	"confirmed",
	"readyForPackaging",
	"completed",
	"cancelled",
]);

export const lotIdSchema = positiveIdSchema;

const productSummarySchema = z.object({
	id: positiveIdSchema,
	name: z.string(),
	unit: z.enum(["kg", "lb", "piece", "box", "gr", "other"]),
});

const supplierSummarySchema = z.object({
	id: positiveIdSchema,
	name: z.string(),
	active: z.boolean(),
	deleted: z.boolean(),
});

const destinationSummarySchema = z.object({
	id: positiveIdSchema,
	name: z.string(),
	active: z.boolean(),
	deleted: z.boolean(),
});

const operationSummarySchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	status: z.enum(["running", "completed", "failed"]),
});

const supplierOrderSummarySchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	externalReference: z.string().nullable(),
	status: z.enum([
		"pending",
		"requested",
		"confirmed",
		"readyForReceipt",
		"completed",
		"cancelled",
	]),
});

const userSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	deleted: z.boolean(),
});

const cartSummarySchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	user: userSummarySchema,
});

const cartItemSummarySchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	quantity: decimalOutputSchema,
	status: z.enum(["inCart", "submitted", "dropped", "cancelled"]),
	fulfillmentStatus: z.enum([
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
	]),
	cart: cartSummarySchema,
});

const trackingEventSummarySchema = z.object({
	id: positiveIdSchema,
	eventType: z.string(),
	label: z.string(),
	source: z.string(),
	cartItemId: positiveIdSchema,
	cartItemCode: z.string(),
	quantity: decimalOutputSchema.nullable(),
	createdAt: z.string(),
});

const demandAllocationSchema = z.object({
	id: positiveIdSchema,
	quantity: decimalOutputSchema,
	cartItem: cartItemSummarySchema,
	packagedQuantity: decimalOutputSchema,
});

const lotItemSchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	status: lotItemStatusSchema,
	quantity: decimalOutputSchema,
	demandAllocationQuantity: decimalOutputSchema,
	packagedQuantity: decimalOutputSchema,
	pendingQuantity: decimalOutputSchema,
	destination: destinationSummarySchema,
	product: productSummarySchema,
	demandAllocations: z.array(demandAllocationSchema),
});

const rollOverSchema = z.object({
	id: positiveIdSchema,
	stage: z.enum(["preAllocation", "postAllocation"]),
	status: z.enum(["open", "rebatched", "resolved", "cancelled"]),
	quantity: decimalOutputSchema,
	reason: z.string(),
	cartItemId: positiveIdSchema,
	cartItemCode: z.string(),
});

export const lotListInputSchema = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	search: optionalTrimmedText,
	status: lotStatusSchema.optional(),
	createdFrom: dateInputSchema.optional(),
	createdTo: dateInputSchema.optional(),
	diagnosticState: diagnosticStateSchema,
	operationId: positiveIdSchema.optional(),
	lotId: positiveIdSchema.optional(),
	lotItemId: positiveIdSchema.optional(),
	supplierId: positiveIdSchema.optional(),
	supplierOrderId: positiveIdSchema.optional(),
	destinationId: positiveIdSchema.optional(),
});

export const lotGetByIdInputSchema = z.object({
	id: lotIdSchema,
});

export const lotListItemSchema = z.object({
	id: lotIdSchema,
	code: z.string(),
	status: lotStatusSchema,
	operation: operationSummarySchema,
	supplier: supplierSummarySchema,
	supplierOrder: supplierOrderSummarySchema.nullable(),
	lotItemCount: z.number().int().nonnegative(),
	lotItemQuantity: decimalOutputSchema,
	demandAllocationQuantity: decimalOutputSchema,
	packagedQuantity: decimalOutputSchema,
	pendingQuantity: decimalOutputSchema,
	diagnosticCount: z.number().int().nonnegative(),
	highestDiagnosticSeverity: highestDiagnosticSeveritySchema,
	diagnosticMessages: z.array(z.string()),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const lotDetailSchema = lotListItemSchema.extend({
	lotItems: z.array(lotItemSchema),
	rollOvers: z.array(rollOverSchema),
	trackingEvents: z.array(trackingEventSummarySchema),
	diagnostics: z.array(operationalDiagnosticSchema),
});

export const lotListOutputSchema = z.object({
	items: z.array(lotListItemSchema),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	pageCount: z.number().int().nonnegative(),
});

export const lotStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	byStatus: z.record(lotStatusSchema, z.number().int().nonnegative()),
	lotItemQuantity: decimalOutputSchema,
	demandAllocationQuantity: decimalOutputSchema,
	pendingPackageQuantity: decimalOutputSchema,
	withDiagnostics: z.number().int().nonnegative(),
});
