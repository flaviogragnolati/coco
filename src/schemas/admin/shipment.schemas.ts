import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import {
	dateInputSchema,
	nonNegativeDecimalString,
	requiredText,
	sortDirectionSchema,
} from "~/schemas/admin/_crud-schema-helpers";
import {
	diagnosticStateSchema,
	highestDiagnosticSeveritySchema,
	operationalDiagnosticSchema,
} from "~/schemas/admin/operational-diagnostic.schemas";
import { packageLegSchema } from "~/schemas/admin/package.schemas";

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

/**
 * Depot pickup is deliberately absent: it is the absence of a shipment, not a
 * mode of one (see the `DeliveryMode` enum in `prisma/schema.prisma`).
 */
export const deliveryModeSchema = z.enum(["homeDelivery", "pickupPoint"]);

export const shipmentIdSchema = positiveIdSchema;

export const shipmentCommandKeySchema = z.enum([
	"dispatch",
	"receive",
	"deliver",
	"addPackages",
	"markDelayed",
	"markFailed",
	"retry",
]);

export const shipmentAvailableActionSchema = z.object({
	action: shipmentCommandKeySchema,
	enabled: z.boolean(),
	reason: z.string().optional(),
});

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
	leg: packageLegSchema,
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
	sortDirection: sortDirectionSchema,
	search: optionalTrimmedText,
	status: shipmentStatusSchema.optional(),
	createdFrom: dateInputSchema.optional(),
	createdTo: dateInputSchema.optional(),
	diagnosticState: diagnosticStateSchema,
	shipmentId: positiveIdSchema.optional(),
	type: shipmentTypeSchema.optional(),
	carrierOrderId: positiveIdSchema.optional(),
	carrierId: positiveIdSchema.optional(),
	/** Shipments not yet on any carrier order — what a booking picks from. */
	unassigned: z.boolean().optional(),
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
	deliveryMode: deliveryModeSchema.nullable(),
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
	availableActions: z.array(shipmentAvailableActionSchema),
});

export const shipmentIdInputSchema = z.object({ id: shipmentIdSchema });

/**
 * Receiving a shipment. The payload must cover every live line of every live
 * package exactly once — the rule `confirm` established — but that, the
 * shortfall reason and the `final` remainder reason are all service-side checks:
 * they depend on the recorded quantities, which only the server holds.
 */
export const shipmentReceiveInputSchema = z.object({
	id: shipmentIdSchema,
	lines: z
		.array(
			z.object({
				packageLotItemId: positiveIdSchema,
				receivedQuantity: nonNegativeDecimalString("La cantidad recibida", 4),
				reason: optionalTrimmedText,
				overrides: z
					.array(
						z.object({
							allocationId: positiveIdSchema,
							removedQuantity: nonNegativeDecimalString("El reparto", 4),
						}),
					)
					.optional(),
			}),
		)
		.min(1, "Se debe recibir al menos una línea"),
	/** Closes every supplier order the shipment reaches, rolling over the remainder. */
	final: z.boolean().default(false),
	finalReason: optionalTrimmedText,
});

export const shipmentExceptionInputSchema = z.object({
	id: shipmentIdSchema,
	reason: requiredText("El motivo es obligatorio"),
});

/**
 * Building an end-user delivery. The mode is mandatory at creation — it is what
 * `deliver` branches on, and the diagnostics report a null one as critical.
 * Depot pickup is deliberately not expressible here: it is the absence of a
 * shipment, handled by `package.confirmDelivery` on an unassigned package.
 */
export const shipmentCreateEndUserInputSchema = z.object({
	name: requiredText("El nombre del envío es obligatorio"),
	internalCode: requiredText("El código interno es obligatorio"),
	trackingCode: optionalTrimmedText,
	deliveryMode: deliveryModeSchema,
	packageIds: z
		.array(positiveIdSchema)
		.min(1, "Se debe seleccionar al menos un paquete"),
	destinationAddressSnapshot: z.record(z.string(), z.unknown()).optional(),
	destinationContactSnapshot: z.record(z.string(), z.unknown()).optional(),
});

export const shipmentAddPackagesInputSchema = z.object({
	id: shipmentIdSchema,
	packageIds: z
		.array(positiveIdSchema)
		.min(1, "Se debe seleccionar al menos un paquete"),
});

export const shipmentDeliverInputSchema = z.object({
	id: shipmentIdSchema,
	notes: optionalTrimmedText,
});

/** A retry creates a new shipment; these are *its* identifying fields. */
export const shipmentRetryInputSchema = z.object({
	id: shipmentIdSchema,
	shipment: z.object({
		name: requiredText("El nombre del envío es obligatorio"),
		internalCode: requiredText("El código interno es obligatorio"),
		trackingCode: optionalTrimmedText,
	}),
});

export const shipmentListOutputSchema = z.object({
	items: z.array(shipmentListItemSchema),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	pageCount: z.number().int().nonnegative(),
	truncated: z.boolean(),
});

export const shipmentStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	byStatus: z.record(shipmentStatusSchema, z.number().int().nonnegative()),
	byType: z.record(shipmentTypeSchema, z.number().int().nonnegative()),
	packageCount: z.number().int().nonnegative(),
	transportedQuantity: decimalOutputSchema,
	withDiagnostics: z.number().int().nonnegative(),
	truncated: z.boolean(),
});
