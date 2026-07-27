import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import {
	nonNegativeDecimalString,
	requiredText,
	sortDirectionSchema,
} from "~/schemas/admin/_crud-schema-helpers";
import {
	lotItemStatusSchema,
	lotStatusSchema,
} from "~/schemas/admin/lot.schemas";
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

export const supplierOrderStatusSchema = z.enum([
	"pending",
	"requested",
	"confirmed",
	"readyForReceipt",
	"completed",
	"cancelled",
]);

export const supplierOrderCommandKeySchema = z.enum([
	"request",
	"confirm",
	"registerDispatch",
	"cancel",
	"cancelLine",
]);

export const supplierOrderAvailableActionSchema = z.object({
	action: supplierOrderCommandKeySchema,
	enabled: z.boolean(),
	reason: z.string().optional(),
});

export const supplierOrderIdInputSchema = z.object({
	id: positiveIdSchema,
});

const userSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	deleted: z.boolean(),
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

const productSummarySchema = z.object({
	id: positiveIdSchema,
	name: z.string(),
	unit: z.enum(["kg", "lb", "piece", "box", "gr", "other"]),
});

const operationSummarySchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	status: z.enum(["running", "completed", "failed", "cancelled"]),
});

const cartSummarySchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	user: userSummarySchema,
});

const cartItemSummarySchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	cart: cartSummarySchema,
});

const demandAllocationSchema = z.object({
	id: positiveIdSchema,
	quantity: decimalOutputSchema,
	/** 0-based position in the LIFO cut order the server computed. */
	absorptionOrder: z.number().int().nonnegative(),
	paidAt: z.date().nullable(),
	cartItem: cartItemSummarySchema,
});

const supplierOrderLotItemSchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	status: lotItemStatusSchema,
	quantity: decimalOutputSchema,
	/** Σ of the line's live inbound package lines — derived, never stored (A10). */
	dispatchedQuantity: decimalOutputSchema,
	/** `quantity − dispatchedQuantity`, floored at 0. */
	remainingQuantity: decimalOutputSchema,
	product: productSummarySchema,
	destination: destinationSummarySchema,
	demandAllocations: z.array(demandAllocationSchema),
});

const supplierOrderLotSchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	status: lotStatusSchema,
	operation: operationSummarySchema,
	lotItems: z.array(supplierOrderLotItemSchema),
});

export const supplierOrderListInputSchema = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	sortDirection: sortDirectionSchema,
	search: optionalTrimmedText,
	status: supplierOrderStatusSchema.optional(),
	supplierId: positiveIdSchema.optional(),
	operationId: positiveIdSchema.optional(),
	diagnosticState: diagnosticStateSchema,
});

export const supplierOrderListItemSchema = z.object({
	id: positiveIdSchema,
	code: z.string(),
	externalReference: z.string().nullable(),
	status: supplierOrderStatusSchema,
	supplier: supplierSummarySchema,
	operations: z.array(operationSummarySchema),
	lotCount: z.number().int().nonnegative(),
	lotItemCount: z.number().int().nonnegative(),
	liveLotItemCount: z.number().int().nonnegative(),
	lotItemQuantity: decimalOutputSchema,
	liveLotItemQuantity: decimalOutputSchema,
	diagnosticCount: z.number().int().nonnegative(),
	highestDiagnosticSeverity: highestDiagnosticSeveritySchema,
	diagnosticMessages: z.array(z.string()),
	requestedAt: z.date().nullable(),
	confirmedAt: z.date().nullable(),
	cancelledAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const supplierOrderDetailSchema = supplierOrderListItemSchema.extend({
	lots: z.array(supplierOrderLotSchema),
	diagnostics: z.array(operationalDiagnosticSchema),
	availableActions: z.array(supplierOrderAvailableActionSchema),
});

export const supplierOrderListOutputSchema = z.object({
	items: z.array(supplierOrderListItemSchema),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	pageCount: z.number().int().nonnegative(),
	truncated: z.boolean(),
});

export const supplierOrderStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	byStatus: z.record(supplierOrderStatusSchema, z.number().int().nonnegative()),
	lotItemQuantity: decimalOutputSchema,
	openLineCount: z.number().int().nonnegative(),
	withDiagnostics: z.number().int().nonnegative(),
	truncated: z.boolean(),
});

export const supplierOrderRequestInputSchema = z.object({
	id: positiveIdSchema,
	externalReference: optionalTrimmedText,
});

export const supplierOrderConfirmInputSchema = z.object({
	id: positiveIdSchema,
	externalReference: optionalTrimmedText,
	lines: z
		.array(
			z.object({
				lotItemId: positiveIdSchema,
				confirmedQuantity: nonNegativeDecimalString("La cantidad", 4),
				overrides: z
					.array(
						z.object({
							allocationId: positiveIdSchema,
							removedQuantity: nonNegativeDecimalString("La cantidad", 4),
						}),
					)
					.optional(),
			}),
		)
		.min(1, "Se debe confirmar al menos una línea"),
});

export const supplierOrderCancelInputSchema = z.object({
	id: positiveIdSchema,
	reason: requiredText("El motivo es obligatorio"),
});

export const supplierOrderCancelLineInputSchema = z.object({
	id: positiveIdSchema,
	lotItemId: positiveIdSchema,
	reason: requiredText("El motivo es obligatorio"),
});

/**
 * Registering a supplier dispatch. Deliberately a plain object rather than a
 * `ZodEffects`: cross-field rules (per-line quantity ≤ remaining, at least one
 * positive line) live in the service, which is the only place that knows the
 * current remainders. `.refine` here would make the schema unextendable, the
 * wall Phase 2 hit with `operationCreateInputSchema`.
 */
export const supplierOrderRegisterDispatchInputSchema = z.object({
	id: positiveIdSchema,
	shipment: z.object({
		name: requiredText("El nombre del envío es obligatorio"),
		internalCode: requiredText("El código interno es obligatorio"),
		trackingCode: optionalTrimmedText,
	}),
	packageName: requiredText("El nombre del paquete es obligatorio"),
	lines: z
		.array(
			z.object({
				lotItemId: positiveIdSchema,
				quantity: nonNegativeDecimalString("La cantidad", 4),
			}),
		)
		.min(1, "Se debe despachar al menos una línea"),
});
