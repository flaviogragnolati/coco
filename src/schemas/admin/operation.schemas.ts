import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import {
	dateInputSchema,
	requiredText,
	sortDirectionSchema,
} from "~/schemas/admin/_crud-schema-helpers";
import { userIdSchema } from "~/schemas/admin/address.schemas";
import { destinationIdSchema } from "~/schemas/admin/destination.schemas";
import {
	diagnosticStateSchema,
	highestDiagnosticSeveritySchema,
	operationalDiagnosticSchema,
} from "~/schemas/admin/operational-diagnostic.schemas";
import { userRoleSchema } from "~/schemas/admin/user.schemas";

export const operationIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const operationStatusSchema = z.enum([
	"running",
	"completed",
	"failed",
	"cancelled",
]);

export const operationCommandKeySchema = z.enum(["cancel", "rerun", "delete"]);

export const operationAvailableActionSchema = z.object({
	action: operationCommandKeySchema,
	enabled: z.boolean(),
	reason: z.string().optional(),
});

export const operationStrategySchema = z.enum(["fifo", "other"]);

export const operationSupplierOrderStatusSchema = z.enum([
	"pending",
	"requested",
	"confirmed",
	"readyForReceipt",
	"completed",
	"cancelled",
]);

export const operationRollOverStageSchema = z.enum([
	"preAllocation",
	"postAllocation",
]);

export const operationRollOverStatusSchema = z.enum([
	"open",
	"rebatched",
	"resolved",
	"cancelled",
]);
export const operationCreateStrategySchema = z.literal("fifo");

const optionalTrimmedText = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined));

const userSummarySchema = z.object({
	id: userIdSchema,
	name: z.string(),
	email: z.string(),
	role: userRoleSchema,
	deleted: z.boolean(),
});

const destinationSummarySchema = z.object({
	id: destinationIdSchema,
	name: z.string(),
	active: z.boolean(),
	deleted: z.boolean(),
});

const supplierSummarySchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	active: z.boolean(),
	deleted: z.boolean(),
});

const productSummarySchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	unit: z.enum(["kg", "lb", "piece", "box", "gr", "other"]),
});

const productSupplierTermsSummarySchema = z.object({
	id: z.number().int().positive(),
	product: productSummarySchema,
	supplier: supplierSummarySchema,
});

/**
 * The bare object body of the create input. Extracted so `rerun` can extend it:
 * `operationCreateInputSchema` is a `ZodEffects` once refined, and `.extend` does
 * not exist on that type, which would leave the date-order rule duplicated.
 */
export const operationCreateFieldsSchema = z.object({
	from: dateInputSchema,
	to: dateInputSchema,
	destinationId: destinationIdSchema,
	includeRollOver: z.boolean().optional().default(true),
	strategy: operationCreateStrategySchema.optional().default("fifo"),
	notes: optionalTrimmedText,
});

const refineDateOrder = (
	value: { from: string; to: string },
	ctx: z.RefinementCtx,
) => {
	if (new Date(value.to) < new Date(value.from)) {
		ctx.addIssue({
			code: "custom",
			message: "La fecha hasta no puede ser anterior a la fecha desde",
			path: ["to"],
		});
	}
};

export const operationCreateInputSchema =
	operationCreateFieldsSchema.superRefine(refineDateOrder);

export const operationCancelInputSchema = z.object({
	id: operationIdSchema,
	reason: requiredText("El motivo es obligatorio"),
});

/**
 * The source operation plus the parameters to run with. One command, three
 * internal paths by source status — see the service (ADR 0005, architecture §8).
 */
export const operationRerunInputSchema = operationCreateFieldsSchema
	.extend({
		id: operationIdSchema,
		reason: optionalTrimmedText,
	})
	.superRefine(refineDateOrder);

export const operationDeleteInputSchema = z.object({
	id: operationIdSchema,
});

export const operationListInputSchema = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	sortDirection: sortDirectionSchema,
	search: optionalTrimmedText,
	status: operationStatusSchema.optional(),
	strategy: operationStrategySchema.optional(),
	diagnosticState: diagnosticStateSchema,
});

export const operationGetByIdInputSchema = z.object({
	id: operationIdSchema,
});

export const operationListItemSchema = z.object({
	id: operationIdSchema,
	code: z.string(),
	status: operationStatusSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
	finishedAt: z.date().nullable(),
	from: z.date(),
	to: z.date(),
	includeRollOver: z.boolean(),
	strategy: operationStrategySchema,
	notes: z.string().nullable(),
	failureReason: z.string().nullable(),
	eligibleQuantity: decimalOutputSchema,
	assignedQuantity: decimalOutputSchema,
	rollOverQuantity: decimalOutputSchema,
	eligibleItemCount: z.number().int().nonnegative(),
	assignedItemCount: z.number().int().nonnegative(),
	rollOverItemCount: z.number().int().nonnegative(),
	lotCount: z.number().int().nonnegative(),
	supplierOrderCount: z.number().int().nonnegative(),
	destination: destinationSummarySchema.nullable(),
	triggeredByUser: userSummarySchema.nullable(),
	diagnosticCount: z.number().int().nonnegative(),
	highestDiagnosticSeverity: highestDiagnosticSeveritySchema,
	diagnosticMessages: z.array(z.string()),
	// On the list item, not only the detail: the row menu renders from it too.
	availableActions: z.array(operationAvailableActionSchema),
});

const supplierOrderSummarySchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	status: operationSupplierOrderStatusSchema,
	supplier: supplierSummarySchema,
	createdAt: z.date(),
	updatedAt: z.date(),
});

const cartItemAllocationSchema = z.object({
	id: z.number().int().positive(),
	quantity: decimalOutputSchema,
	cartItem: z.object({
		id: z.number().int().positive(),
		code: z.string(),
		quantity: decimalOutputSchema,
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
		cart: z.object({
			id: z.number().int().positive(),
			code: z.string(),
			user: userSummarySchema,
		}),
	}),
});

const lotItemDetailSchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	status: z.enum([
		"pending",
		"requested",
		"confirmed",
		"readyForPackaging",
		"completed",
		"cancelled",
	]),
	quantity: decimalOutputSchema,
	destination: destinationSummarySchema,
	productSupplierTerms: productSupplierTermsSummarySchema,
	cartItemLotItems: z.array(cartItemAllocationSchema),
});

const lotDetailSchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	status: z.enum([
		"pending",
		"assembling",
		"requested",
		"confirmed",
		"readyForPackaging",
		"completed",
		"cancelled",
	]),
	supplier: supplierSummarySchema,
	supplierOrder: supplierOrderSummarySchema.nullable(),
	lotItems: z.array(lotItemDetailSchema),
	createdAt: z.date(),
	updatedAt: z.date(),
});

const rollOverDetailSchema = z.object({
	id: z.number().int().positive(),
	stage: operationRollOverStageSchema,
	status: operationRollOverStatusSchema,
	quantity: decimalOutputSchema,
	reason: z.string(),
	cartItem: z.object({
		id: z.number().int().positive(),
		code: z.string(),
		quantity: decimalOutputSchema,
		cart: z.object({
			id: z.number().int().positive(),
			code: z.string(),
			user: userSummarySchema,
		}),
		productClientTerms: z.object({
			id: z.number().int().positive(),
			product: productSummarySchema,
		}),
	}),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const operationDetailSchema = operationListItemSchema.extend({
	summary: z.unknown().nullable(),
	lots: z.array(lotDetailSchema),
	rollOvers: z.array(rollOverDetailSchema),
	supplierOrders: z.array(supplierOrderSummarySchema),
	diagnostics: z.array(operationalDiagnosticSchema),
});

export const operationStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	running: z.number().int().nonnegative(),
	completed: z.number().int().nonnegative(),
	failed: z.number().int().nonnegative(),
	cancelled: z.number().int().nonnegative(),
	eligibleQuantity: decimalOutputSchema,
	assignedQuantity: decimalOutputSchema,
	rollOverQuantity: decimalOutputSchema,
});

export const operationListOutputSchema = z.object({
	items: z.array(operationListItemSchema),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	pageCount: z.number().int().nonnegative(),
	truncated: z.boolean(),
});
