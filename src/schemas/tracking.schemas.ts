import { z } from "zod";
import {
	trackingEventSources,
	trackingEventTypes,
	userTrackingNoticeKinds,
	userTrackingStageKeys,
} from "~/shared/common/tracking-display";

const optionalTrimmedText = z.preprocess((value) => {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}, z.string().trim().optional());

const optionalDateInputSchema = optionalTrimmedText.refine(
	(value) => value === undefined || !Number.isNaN(Date.parse(value)),
	"Fecha invalida",
);

export const trackingEventTypeSchema = z.enum(trackingEventTypes);

export const trackingEventSourceSchema = z.enum(trackingEventSources);

const decimalStringSchema = z.string();

export const trackingOrderTimelineInputSchema = z.object({
	orderId: z.number().int().positive(),
});

export const userTrackingTimelineItemSchema = z.object({
	eventType: trackingEventTypeSchema,
	source: trackingEventSourceSchema,
	quantity: decimalStringSchema.optional(),
	createdAt: z.string(),
	label: z.string(),
});

export const userTrackingTimelineOutputSchema = z.array(
	userTrackingTimelineItemSchema,
);

export const userTrackingTimelineStageStatusSchema = z.enum([
	"completed",
	"current",
	"pending",
]);

export const userTrackingTimelineStageSchema = z.object({
	key: z.enum(userTrackingStageKeys),
	label: z.string(),
	description: z.string(),
	status: userTrackingTimelineStageStatusSchema,
	eventType: trackingEventTypeSchema.optional(),
	quantity: decimalStringSchema.optional(),
	createdAt: z.string().optional(),
});

export const userTrackingTimelineNoticeSchema = z.object({
	eventType: trackingEventTypeSchema,
	kind: z.enum(userTrackingNoticeKinds),
	label: z.string(),
	quantity: decimalStringSchema.optional(),
	createdAt: z.string(),
});

export const userOrderItemTimelineSchema = z.object({
	cartItemId: z.number().int().positive(),
	stages: z.array(userTrackingTimelineStageSchema),
	notices: z.array(userTrackingTimelineNoticeSchema),
});

export const userOrderItemTimelinesOutputSchema = z.array(
	userOrderItemTimelineSchema,
);

export const adminTrackingCartTimelineInputSchema = z.object({
	cartId: z.number().int().positive(),
});

export const adminTrackingCartItemTimelineInputSchema = z.object({
	cartItemId: z.number().int().positive(),
});

export const adminTrackingTimelineItemSchema = z.object({
	id: z.number().int().positive(),
	eventKey: z.string().nullable(),
	cartItemId: z.number().int().positive(),
	eventType: trackingEventTypeSchema,
	source: trackingEventSourceSchema,
	actor: z.object({
		userId: z.string().nullable(),
		reference: z.string().nullable(),
	}),
	quantity: decimalStringSchema.optional(),
	label: z.string(),
	refs: z.object({
		operationId: z.number().int().positive().nullable(),
		cartItemLotItemId: z.number().int().positive().nullable(),
		packageAllocationId: z.number().int().positive().nullable(),
		lotId: z.number().int().positive().nullable(),
		lotItemId: z.number().int().positive().nullable(),
		packageId: z.number().int().positive().nullable(),
		shipmentId: z.number().int().positive().nullable(),
		rollOverId: z.number().int().positive().nullable(),
	}),
	metadata: z.unknown().nullable(),
	createdAt: z.string(),
});

export const adminTrackingTimelineOutputSchema = z.array(
	adminTrackingTimelineItemSchema,
);

export const adminTrackingListFiltersSchema = z.object({
	search: optionalTrimmedText,
	eventType: trackingEventTypeSchema.optional(),
	source: trackingEventSourceSchema.optional(),
	actorUserId: optionalTrimmedText,
	userId: optionalTrimmedText,
	cartId: z.number().int().positive().optional(),
	cartItemId: z.number().int().positive().optional(),
	orderId: z.number().int().positive().optional(),
	operationId: z.number().int().positive().optional(),
	lotId: z.number().int().positive().optional(),
	lotItemId: z.number().int().positive().optional(),
	packageId: z.number().int().positive().optional(),
	shipmentId: z.number().int().positive().optional(),
	rollOverId: z.number().int().positive().optional(),
	createdFrom: optionalDateInputSchema,
	createdTo: optionalDateInputSchema,
});

export const adminTrackingListInputSchema = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	filters: adminTrackingListFiltersSchema.default({}),
});

const adminTrackingUserSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	role: z.enum(["user", "admin", "superadmin"]),
	deleted: z.boolean(),
});

const adminTrackingCartSummarySchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	status: z.enum([
		"draft",
		"pending",
		"atCheckout",
		"submitted",
		"abandoned",
		"cancelled",
		"aborted",
	]),
	deleted: z.boolean(),
	user: adminTrackingUserSummarySchema,
});

const adminTrackingProductSummarySchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	unit: z.enum(["kg", "lb", "piece", "box", "gr", "other"]),
});

const adminTrackingOrderSummarySchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	status: z.enum([
		"pending",
		"processing",
		"completed",
		"cancelled",
		"failed",
		"refunded",
	]),
});

const adminTrackingCartItemSummarySchema = z.object({
	id: z.number().int().positive(),
	code: z.string(),
	quantity: decimalStringSchema,
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
	deleted: z.boolean(),
	product: adminTrackingProductSummarySchema,
	cart: adminTrackingCartSummarySchema,
	orders: z.array(adminTrackingOrderSummarySchema),
});

export const adminTrackingEventListItemSchema = z.object({
	id: z.number().int().positive(),
	eventKey: z.string().nullable(),
	eventType: trackingEventTypeSchema,
	label: z.string(),
	source: trackingEventSourceSchema,
	actor: z.object({
		userId: z.string().nullable(),
		reference: z.string().nullable(),
		user: adminTrackingUserSummarySchema.nullable(),
	}),
	cartItem: adminTrackingCartItemSummarySchema,
	quantity: decimalStringSchema.optional(),
	refs: adminTrackingTimelineItemSchema.shape.refs,
	createdAt: z.string(),
});

export const adminTrackingListOutputSchema = z.object({
	items: z.array(adminTrackingEventListItemSchema),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	pageCount: z.number().int().nonnegative(),
});

const adminTrackingRelatedSchema = z.object({
	actorUser: adminTrackingUserSummarySchema.nullable(),
	operation: z
		.object({
			id: z.number().int().positive(),
			code: z.string(),
			strategy: z.string(),
		})
		.nullable(),
	lot: z
		.object({
			id: z.number().int().positive(),
			code: z.string(),
			status: z.string(),
			supplierName: z.string(),
		})
		.nullable(),
	lotItem: z
		.object({
			id: z.number().int().positive(),
			code: z.string(),
			status: z.string(),
			quantity: decimalStringSchema,
			productName: z.string(),
		})
		.nullable(),
	package: z
		.object({
			id: z.number().int().positive(),
			name: z.string(),
			status: z.string(),
			trackingCode: z.string().nullable(),
		})
		.nullable(),
	shipment: z
		.object({
			id: z.number().int().positive(),
			name: z.string(),
			internalCode: z.string(),
			status: z.string(),
			type: z.string(),
			trackingCode: z.string().nullable(),
		})
		.nullable(),
	rollOver: z
		.object({
			id: z.number().int().positive(),
			stage: z.string(),
			status: z.string(),
			quantity: decimalStringSchema,
			reason: z.string(),
		})
		.nullable(),
	cartItemLotItem: z
		.object({
			id: z.number().int().positive(),
			quantity: decimalStringSchema,
			lotItemId: z.number().int().positive(),
		})
		.nullable(),
	packageAllocation: z
		.object({
			id: z.number().int().positive(),
			quantity: decimalStringSchema,
		})
		.nullable(),
});

export const adminTrackingTimelineDetailItemSchema =
	adminTrackingTimelineItemSchema.extend({
		related: adminTrackingRelatedSchema,
	});

export const adminTrackingCartItemDetailSchema = z.object({
	cartItem: adminTrackingCartItemSummarySchema,
	timeline: z.array(adminTrackingTimelineDetailItemSchema),
});
