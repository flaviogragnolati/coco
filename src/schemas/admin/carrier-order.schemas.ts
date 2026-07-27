import { z } from "zod";
import {
	dateInputSchema,
	jsonTextareaSchema,
	requiredText,
	sortDirectionSchema,
} from "~/schemas/admin/_crud-schema-helpers";
import {
	diagnosticStateSchema,
	highestDiagnosticSeveritySchema,
	operationalDiagnosticSchema,
} from "~/schemas/admin/operational-diagnostic.schemas";
import {
	deliveryModeSchema,
	shipmentStatusSchema,
	shipmentTypeSchema,
} from "~/schemas/admin/shipment.schemas";

const optionalTrimmedText = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined));

const positiveIdSchema = z.number().int().positive();

export const carrierOrderStatusSchema = z.enum([
	"pending",
	"requested",
	"confirmed",
	"inTransit",
	"completed",
	"cancelled",
	"failed",
]);

export const carrierOrderIdSchema = positiveIdSchema;

export const carrierOrderCommandKeySchema = z.enum([
	"request",
	"confirm",
	"markInTransit",
	"complete",
	"cancel",
	"markFailed",
	"addShipments",
	"removeShipment",
	"edit",
	"softDelete",
	"hardDelete",
]);

export const carrierOrderAvailableActionSchema = z.object({
	action: carrierOrderCommandKeySchema,
	enabled: z.boolean(),
	reason: z.string().optional(),
});

const carrierSummarySchema = z.object({
	id: positiveIdSchema,
	name: z.string(),
});

export const carrierOrderShipmentSummarySchema = z.object({
	id: positiveIdSchema,
	internalCode: z.string(),
	name: z.string(),
	type: shipmentTypeSchema,
	deliveryMode: deliveryModeSchema.nullable(),
	status: shipmentStatusSchema,
	trackingCode: z.string().nullable(),
	packageCount: z.number().int().nonnegative(),
});

export const carrierOrderIdInputSchema = z.object({ id: carrierOrderIdSchema });

/**
 * The identity fields an operator transcribes. `status` is deliberately absent:
 * it only ever moves through the guarded ladder commands.
 */
export const carrierOrderFieldsSchema = z.object({
	carrierId: positiveIdSchema,
	code: requiredText("El código es obligatorio"),
	externalReference: optionalTrimmedText,
	metadata: jsonTextareaSchema,
});

export const carrierOrderCreateInputSchema = carrierOrderFieldsSchema.extend({
	shipmentIds: z.array(positiveIdSchema).default([]),
});

export const carrierOrderUpdateInputSchema = carrierOrderFieldsSchema.extend({
	id: carrierOrderIdSchema,
});

export const carrierOrderListInputSchema = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	sortDirection: sortDirectionSchema,
	search: optionalTrimmedText,
	status: carrierOrderStatusSchema.optional(),
	carrierId: positiveIdSchema.optional(),
	shipmentId: positiveIdSchema.optional(),
	includeDeleted: z.boolean().default(false),
	diagnosticState: diagnosticStateSchema,
	createdFrom: dateInputSchema.optional(),
	createdTo: dateInputSchema.optional(),
});

export const carrierOrderListItemSchema = z.object({
	id: carrierOrderIdSchema,
	code: z.string(),
	externalReference: z.string().nullable(),
	status: carrierOrderStatusSchema,
	deleted: z.boolean(),
	carrier: carrierSummarySchema,
	shipmentCount: z.number().int().nonnegative(),
	liveShipmentCount: z.number().int().nonnegative(),
	requestedAt: z.date().nullable(),
	confirmedAt: z.date().nullable(),
	cancelledAt: z.date().nullable(),
	diagnosticCount: z.number().int().nonnegative(),
	highestDiagnosticSeverity: highestDiagnosticSeveritySchema,
	diagnosticMessages: z.array(z.string()),
	createdAt: z.date(),
	updatedAt: z.date(),
	// On the list item, not only the detail: the row menu renders from it too.
	availableActions: z.array(carrierOrderAvailableActionSchema),
});

export const carrierOrderDetailSchema = carrierOrderListItemSchema.extend({
	metadata: z.unknown().nullable(),
	shipments: z.array(carrierOrderShipmentSummarySchema),
	diagnostics: z.array(operationalDiagnosticSchema),
});

export const carrierOrderCommandInputSchema = z.object({
	id: carrierOrderIdSchema,
});

export const carrierOrderReasonInputSchema = z.object({
	id: carrierOrderIdSchema,
	reason: requiredText("El motivo es obligatorio"),
});

export const carrierOrderAddShipmentsInputSchema = z.object({
	id: carrierOrderIdSchema,
	shipmentIds: z
		.array(positiveIdSchema)
		.min(1, "Se debe seleccionar al menos un envío"),
});

export const carrierOrderRemoveShipmentInputSchema = z.object({
	id: carrierOrderIdSchema,
	shipmentId: positiveIdSchema,
});

export const carrierOrderDeleteInputSchema = z.object({
	id: carrierOrderIdSchema,
});

export const carrierOrderListOutputSchema = z.object({
	items: z.array(carrierOrderListItemSchema),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	pageCount: z.number().int().nonnegative(),
	truncated: z.boolean(),
});

export const carrierOrderStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	byStatus: z.record(carrierOrderStatusSchema, z.number().int().nonnegative()),
	shipmentCount: z.number().int().nonnegative(),
	withDiagnostics: z.number().int().nonnegative(),
	truncated: z.boolean(),
});
