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

/** Which half of the chain the package travels (ADR 0004). */
export const packageLegSchema = z.enum(["inbound", "outbound"]);

export const packageIdSchema = positiveIdSchema;

/** Must stay exhaustive against `PackageCommandKey` in `fulfillment-transitions.ts`. */
export const packageCommandKeySchema = z.enum([
	"fractionate",
	"promote",
	"split",
	"confirmDelivery",
	"recover",
	"markDelayed",
	"markFailed",
	"writeOff",
]);

export const packageAvailableActionSchema = z.object({
	action: packageCommandKeySchema,
	enabled: z.boolean(),
	reason: z.string().optional(),
});

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
	/** What this allocation can still contribute to a fractionation, if anything. */
	fractionableQuantity: decimalOutputSchema,
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
	sortDirection: sortDirectionSchema,
	search: optionalTrimmedText,
	status: packageStatusSchema.optional(),
	createdFrom: dateInputSchema.optional(),
	createdTo: dateInputSchema.optional(),
	diagnosticState: diagnosticStateSchema,
	packageId: positiveIdSchema.optional(),
	shipmentId: positiveIdSchema.optional(),
	/** Packages not yet on any shipment — what an end-user shipment picks from. */
	unassigned: z.boolean().optional(),
	lotId: positiveIdSchema.optional(),
	lotItemId: positiveIdSchema.optional(),
	productId: positiveIdSchema.optional(),
	leg: packageLegSchema.optional(),
});

export const packageGetByIdInputSchema = z.object({
	id: packageIdSchema,
});

export const packageListItemSchema = z.object({
	id: packageIdSchema,
	name: z.string(),
	trackingCode: z.string().nullable(),
	status: packageStatusSchema,
	leg: packageLegSchema,
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
	availableActions: z.array(packageAvailableActionSchema),
	/** Received inbound quantity this package still holds unfractionated. */
	fractionableQuantity: decimalOutputSchema,
	/** Customers the package's live allocations span — derived, never stored. */
	distinctCartCount: z.number().int().nonnegative(),
	/**
	 * Where `package.recover` would put this package back, derived server-side so
	 * the dialog states the same target the command applies. Null when recovery is
	 * not available.
	 */
	recoveryTarget: z.enum(["readyForShipment", "inTransit"]).nullable(),
});

/**
 * Writing off packaged quantity. One mandatory reason covers the whole command;
 * the per-line overrides redistribute which demand absorbs the loss, exactly as
 * they do on a supplier cut.
 */
export const packageWriteOffInputSchema = z.object({
	id: packageIdSchema,
	lines: z
		.array(
			z.object({
				packageLotItemId: positiveIdSchema,
				quantity: nonNegativeDecimalString("La cantidad", 4),
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
		.min(1, "Se debe dar de baja al menos una línea"),
	reason: requiredText("El motivo es obligatorio"),
});

/**
 * Fractionating a selection of received inbound packages into one outbound
 * package per customer. Omitting `allocations` takes everything still
 * fractionable — the "fraccionar todo" default; listing them makes the pass
 * partial, and further passes can take the rest.
 */
export const packageFractionateInputSchema = z.object({
	sourcePackageIds: z
		.array(packageIdSchema)
		.min(1, "Se debe fraccionar al menos un paquete"),
	allocations: z
		.array(
			z.object({
				packagedAllocationId: positiveIdSchema,
				quantity: nonNegativeDecimalString("La cantidad", 4),
			}),
		)
		.optional(),
	namePrefix: optionalTrimmedText,
});

/** Flipping a mono-customer inbound package onto the outbound leg. */
export const packagePromoteInputSchema = z.object({
	id: packageIdSchema,
	name: optionalTrimmedText,
});

/**
 * Splitting one package into the real physical bundles. Quantity-level, not
 * whole-lines-only: a line can appear in several targets as long as the target
 * quantities do not exceed it. The per-line overrides redistribute which demand
 * travels in which target, exactly as they do on a write-off.
 */
export const packageSplitInputSchema = z.object({
	id: packageIdSchema,
	targets: z
		.array(
			z.object({
				name: requiredText("El nombre del paquete es obligatorio"),
				lines: z
					.array(
						z.object({
							packageLotItemId: positiveIdSchema,
							quantity: nonNegativeDecimalString("La cantidad", 4),
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
					.min(1, "Cada paquete destino necesita al menos una línea"),
			}),
		)
		.min(1, "Se debe crear al menos un paquete destino"),
});

/** `markDelayed` and `markFailed` share one shape; the command picks the target. */
export const packageExceptionInputSchema = z.object({
	id: packageIdSchema,
	reason: requiredText("El motivo es obligatorio"),
});

/**
 * The per-package handover. No per-line quantities: a delivery discrepancy is
 * composed from `split` + `markFailed` + `writeOff`, which already run the four
 * reductions and mint the roll over.
 */
export const packageConfirmDeliveryInputSchema = z.object({
	id: packageIdSchema,
	notes: optionalTrimmedText,
});

export const packageRecoverInputSchema = z.object({
	id: packageIdSchema,
	notes: optionalTrimmedText,
});

/**
 * `fractionate` and `split` return ids rather than a detail: the first has N
 * sources and M outputs and the second leaves the source changed *and* creates
 * siblings, so returning one detail would silently pick a winner
 * (`operation.remove`'s precedent).
 */
export const packageFractionateOutputSchema = z.object({
	createdPackageIds: z.array(packageIdSchema),
	sourcePackageIds: z.array(packageIdSchema),
});

export const packageSplitOutputSchema = z.object({
	sourcePackageId: packageIdSchema,
	createdPackageIds: z.array(packageIdSchema),
});

export const packageListOutputSchema = z.object({
	items: z.array(packageListItemSchema),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	pageCount: z.number().int().nonnegative(),
	truncated: z.boolean(),
});

export const packageStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	byStatus: z.record(packageStatusSchema, z.number().int().nonnegative()),
	byLeg: z.record(packageLegSchema, z.number().int().nonnegative()),
	packageLineQuantity: decimalOutputSchema,
	packagedAllocationQuantity: decimalOutputSchema,
	unallocatedQuantity: decimalOutputSchema,
	withDiagnostics: z.number().int().nonnegative(),
	truncated: z.boolean(),
});
