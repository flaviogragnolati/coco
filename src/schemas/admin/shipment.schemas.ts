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

export const shipmentStatusSchema = z.enum([
	"pending",
	"preparing",
	"readyForDispatch",
	"inTransit",
	"received",
	"delayed",
	"failed",
	"cancelled",
]);

export const shipmentTypeSchema = z.enum([
	"internalTransfer",
	"endUserDelivery",
]);

export const shipmentIdSchema = positiveIdSchema;

const carrierOrderSummarySchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	externalReference: z.string().nullable(),
	status: z.string(),
	carrier: z.object({
		id: positiveIdSchema,
		name: z.string(),
	}),
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

const packageSummarySchema = z.object({
	id: positiveIdSchema,
	name: z.string(),
	trackingCode: z.string().nullable(),
	status: z.string(),
	lineCount: z.number().int().nonnegative(),
	lineQuantity: decimalOutputSchema,
	allocationQuantity: decimalOutputSchema,
	lines: z.array(
		z.object({
			id: positiveIdSchema,
			status: z.string(),
			quantity: decimalOutputSchema,
			lotItemId: positiveIdSchema,
			lotItemCode: z.string(),
			productName: z.string(),
			allocations: z.array(
				z.object({
					id: positiveIdSchema,
					quantity: decimalOutputSchema,
					cartItemId: positiveIdSchema,
					cartItemCode: z.string(),
					userName: z.string(),
				}),
			),
		}),
	),
});

export const shipmentListInputSchema = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	search: optionalTrimmedText,
	status: shipmentStatusSchema.optional(),
	createdFrom: dateInputSchema.optional(),
	createdTo: dateInputSchema.optional(),
	diagnosticState: diagnosticStateSchema,
	shipmentId: positiveIdSchema.optional(),
	type: shipmentTypeSchema.optional(),
	carrierOrderId: positiveIdSchema.optional(),
	carrierId: positiveIdSchema.optional(),
	trackingCode: optionalTrimmedText,
});

export const shipmentGetByIdInputSchema = z.object({
	id: shipmentIdSchema,
});

export const shipmentListItemSchema = z.object({
	id: shipmentIdSchema,
	internalCode: z.string(),
	name: z.string(),
	type: shipmentTypeSchema,
	status: shipmentStatusSchema,
	trackingCode: z.string().nullable(),
	carrierOrder: carrierOrderSummarySchema.nullable(),
	packageCount: z.number().int().nonnegative(),
	transportedQuantity: decimalOutputSchema,
	packagedAllocationQuantity: decimalOutputSchema,
	diagnosticCount: z.number().int().nonnegative(),
	highestDiagnosticSeverity: highestDiagnosticSeveritySchema,
	diagnosticMessages: z.array(z.string()),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const shipmentDetailSchema = shipmentListItemSchema.extend({
	destinationAddressSnapshot: z.unknown().nullable(),
	destinationContactSnapshot: z.unknown().nullable(),
	packages: z.array(packageSummarySchema),
	trackingEvents: z.array(trackingEventSummarySchema),
	diagnostics: z.array(operationalDiagnosticSchema),
});

export const shipmentListOutputSchema = z.object({
	items: z.array(shipmentListItemSchema),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	pageCount: z.number().int().nonnegative(),
});

export const shipmentStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	byStatus: z.record(shipmentStatusSchema, z.number().int().nonnegative()),
	byType: z.record(shipmentTypeSchema, z.number().int().nonnegative()),
	packageCount: z.number().int().nonnegative(),
	transportedQuantity: decimalOutputSchema,
	withDiagnostics: z.number().int().nonnegative(),
});
