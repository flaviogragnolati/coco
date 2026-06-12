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

export const packageStatusSchema = z.enum([
	"pending",
	"packing",
	"readyForShipment",
	"inTransit",
	"received",
	"delayed",
	"failed",
	"cancelled",
]);

export const packageLotItemStatusSchema = z.enum([
	"pending",
	"packing",
	"packed",
	"shipped",
	"received",
	"cancelled",
]);

export const packageIdSchema = positiveIdSchema;

const productSummarySchema = z.object({
	id: positiveIdSchema,
	name: z.string(),
	unit: z.enum(["kg", "lb", "piece", "box", "gr", "other"]),
});

const userSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	deleted: z.boolean(),
});

const cartItemSummarySchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	quantity: decimalOutputSchema,
	fulfillmentStatus: z.string(),
	cart: z.object({
		id: positiveIdSchema,
		code: z.string(),
		user: userSummarySchema,
	}),
});

const shipmentSummarySchema = z.object({
	id: positiveIdSchema,
	name: z.string(),
	internalCode: z.string(),
	status: z.string(),
	type: z.string(),
	trackingCode: z.string().nullable(),
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

const packageAllocationSchema = z.object({
	id: positiveIdSchema,
	quantity: decimalOutputSchema,
	demandAllocation: z.object({
		id: positiveIdSchema,
		quantity: decimalOutputSchema,
		lotItemId: positiveIdSchema,
		cartItem: cartItemSummarySchema,
	}),
});

const packageLineSchema = z.object({
	id: positiveIdSchema,
	quantity: decimalOutputSchema,
	status: packageLotItemStatusSchema,
	allocationQuantity: decimalOutputSchema,
	unallocatedQuantity: decimalOutputSchema,
	lotItem: z.object({
		id: positiveIdSchema,
		code: z.string(),
		status: z.string(),
		quantity: decimalOutputSchema,
		lot: z.object({
			id: positiveIdSchema,
			code: z.string(),
			supplierName: z.string(),
		}),
		product: productSummarySchema,
	}),
	packageAllocations: z.array(packageAllocationSchema),
});

export const packageListInputSchema = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	search: optionalTrimmedText,
	status: packageStatusSchema.optional(),
	createdFrom: dateInputSchema.optional(),
	createdTo: dateInputSchema.optional(),
	diagnosticState: diagnosticStateSchema,
	packageId: positiveIdSchema.optional(),
	shipmentId: positiveIdSchema.optional(),
	lotId: positiveIdSchema.optional(),
	lotItemId: positiveIdSchema.optional(),
	productId: positiveIdSchema.optional(),
});

export const packageGetByIdInputSchema = z.object({
	id: packageIdSchema,
});

export const packageListItemSchema = z.object({
	id: packageIdSchema,
	name: z.string(),
	trackingCode: z.string().nullable(),
	status: packageStatusSchema,
	shipment: shipmentSummarySchema.nullable(),
	packageLineCount: z.number().int().nonnegative(),
	packageLineQuantity: decimalOutputSchema,
	packagedAllocationQuantity: decimalOutputSchema,
	unallocatedQuantity: decimalOutputSchema,
	diagnosticCount: z.number().int().nonnegative(),
	highestDiagnosticSeverity: highestDiagnosticSeveritySchema,
	diagnosticMessages: z.array(z.string()),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const packageDetailSchema = packageListItemSchema.extend({
	packageLines: z.array(packageLineSchema),
	trackingEvents: z.array(trackingEventSummarySchema),
	diagnostics: z.array(operationalDiagnosticSchema),
});

export const packageListOutputSchema = z.object({
	items: z.array(packageListItemSchema),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	pageCount: z.number().int().nonnegative(),
});

export const packageStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	byStatus: z.record(packageStatusSchema, z.number().int().nonnegative()),
	packageLineQuantity: decimalOutputSchema,
	packagedAllocationQuantity: decimalOutputSchema,
	unallocatedQuantity: decimalOutputSchema,
	withDiagnostics: z.number().int().nonnegative(),
});
