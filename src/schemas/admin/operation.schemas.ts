import { z } from "zod";
import {
	dateInputSchema,
	decimalOutputSchema,
} from "~/schemas/admin/_crud-schema-helpers";
import { userIdSchema } from "~/schemas/admin/address.schemas";
import { destinationIdSchema } from "~/schemas/admin/destination.schemas";
import { userRoleSchema } from "~/schemas/admin/user.schemas";

export const operationIdSchema = z
	.number()
	.int("El id debe ser un numero entero")
	.positive("El id debe ser positivo");

export const operationStatusSchema = z.enum(["running", "completed", "failed"]);

export const operationStrategySchema = z.enum(["fifo", "other"]);
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

export const operationCreateInputSchema = z
	.object({
		from: dateInputSchema,
		to: dateInputSchema,
		destinationId: destinationIdSchema,
		includeRollOver: z.boolean().optional().default(false),
		strategy: operationCreateStrategySchema.optional().default("fifo"),
		notes: optionalTrimmedText,
	})
	.superRefine((value, ctx) => {
		if (new Date(value.to) < new Date(value.from)) {
			ctx.addIssue({
				code: "custom",
				message: "La fecha hasta no puede ser anterior a la fecha desde",
				path: ["to"],
			});
		}
	});

export const operationListInputSchema = z.object({
	search: optionalTrimmedText,
	status: operationStatusSchema.optional(),
	strategy: operationStrategySchema.optional(),
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
});

const supplierOrderSummarySchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	status: z.enum([
		"pending",
		"requested",
		"confirmed",
		"readyForReceipt",
		"completed",
		"cancelled",
	]),
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
	stage: z.enum(["preAllocation", "postAllocation"]),
	status: z.enum(["open", "rebatched", "resolved", "cancelled"]),
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
});

export const operationStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	running: z.number().int().nonnegative(),
	completed: z.number().int().nonnegative(),
	failed: z.number().int().nonnegative(),
	eligibleQuantity: decimalOutputSchema,
	assignedQuantity: decimalOutputSchema,
	rollOverQuantity: decimalOutputSchema,
});

export const operationListOutputSchema = z.array(operationListItemSchema);
