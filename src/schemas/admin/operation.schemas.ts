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
	"draft",
	"running",
	"completed",
	"failed",
	"cancelled",
]);

export const operationCommandKeySchema = z.enum([
	"execute",
	"cancel",
	"rerun",
	"delete",
]);

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

/**
 * The demand an admin decided to keep out of the operation. `userIds` is a
 * standing decision that survives every recomputation, not a bulk toggle over the
 * rows visible at click time (ADR 0006).
 */
export const operationOmissionsSchema = z.object({
	sourceKeys: z.array(z.string().min(1)),
	userIds: z.array(userIdSchema),
});

const operationApprovedSchema = z.object({
	fingerprint: z.string().min(1),
	itemCount: z.number().int().nonnegative(),
	quantity: decimalOutputSchema,
	at: z.string(),
	byUserId: userIdSchema,
});

/**
 * `Operation.reviewState`. Written on every draft and stamped with `approved` at
 * execution, which is the durable record of the demand set a human signed off on.
 */
export const operationReviewStateSchema = z.object({
	omissions: operationOmissionsSchema,
	approved: operationApprovedSchema.nullish(),
});

/** Creating an operation creates a draft; the parameters are unchanged. */
export const operationDraftCreateInputSchema = operationCreateInputSchema;

export const operationDraftUpdateInputSchema = operationCreateFieldsSchema
	.partial()
	.extend({
		id: operationIdSchema,
		omissions: operationOmissionsSchema.optional(),
	})
	// Only catches a window sent whole. A half-sent window is checked against the
	// stored parameters in `updateDraft`, which is the only place that knows them.
	.superRefine((value, ctx) => {
		if (value.from === undefined || value.to === undefined) return;
		refineDateOrder({ from: value.from, to: value.to }, ctx);
	});

export const operationExecuteInputSchema = z.object({
	id: operationIdSchema,
	fingerprint: z.string().min(1),
});

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
	reviewState: z.unknown().nullable(),
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
	draft: z.number().int().nonnegative(),
	running: z.number().int().nonnegative(),
	completed: z.number().int().nonnegative(),
	failed: z.number().int().nonnegative(),
	cancelled: z.number().int().nonnegative(),
	eligibleQuantity: decimalOutputSchema,
	assignedQuantity: decimalOutputSchema,
	rollOverQuantity: decimalOutputSchema,
});

/**
 * One demand item as the review renders it. `assignedQuantity` and
 * `rollOverQuantity` come from the same `resolveAssignments` the command runs, so
 * the dialog cannot show a plan execution would refuse.
 */
const operationReviewRowSchema = z.object({
	sourceKey: z.string(),
	source: z.enum(["orderItem", "rollOver"]),
	cartItemId: z.number().int().positive(),
	cartItemCode: z.string(),
	cartId: z.number().int().positive(),
	cartCode: z.string(),
	user: z.object({
		id: userIdSchema,
		name: z.string(),
		email: z.string(),
	}),
	product: productSummarySchema,
	quantity: decimalOutputSchema,
	supplier: supplierSummarySchema.nullable(),
	/**
	 * The lot item this row would land in, together with the supplier. Carried so
	 * the dialog can re-fold the lot summary client-side as omissions toggle and
	 * still count lot items the way `groupAssignments` does.
	 */
	productSupplierTermsId: z.number().int().positive().nullable(),
	assignedQuantity: decimalOutputSchema,
	rollOverQuantity: decimalOutputSchema,
	rollOverReason: z.string().nullable(),
	omitted: z.boolean(),
});

/** One supplier — that is, one lot and one supplier order the execution would create. */
const operationReviewGroupSchema = z.object({
	supplier: supplierSummarySchema,
	lotItemCount: z.number().int().nonnegative(),
	quantity: decimalOutputSchema,
});

const operationReviewTotalsSchema = z.object({
	eligibleItemCount: z.number().int().nonnegative(),
	eligibleQuantity: decimalOutputSchema,
	omittedItemCount: z.number().int().nonnegative(),
	omittedQuantity: decimalOutputSchema,
	assignedItemCount: z.number().int().nonnegative(),
	assignedQuantity: decimalOutputSchema,
	rollOverItemCount: z.number().int().nonnegative(),
	rollOverQuantity: decimalOutputSchema,
	lotCount: z.number().int().nonnegative(),
	supplierOrderCount: z.number().int().nonnegative(),
});

export const operationReviewOutputSchema = z.object({
	operation: operationDetailSchema,
	fingerprint: z.string(),
	rows: z.array(operationReviewRowSchema),
	groups: z.array(operationReviewGroupSchema),
	totals: operationReviewTotalsSchema,
	omissions: operationOmissionsSchema,
	/** Omissions dropped because the demand they named is no longer in the window. */
	prunedOmissions: operationOmissionsSchema,
});

export const operationListOutputSchema = z.object({
	items: z.array(operationListItemSchema),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	pageCount: z.number().int().nonnegative(),
	truncated: z.boolean(),
});
