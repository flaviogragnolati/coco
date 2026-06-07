import { z } from "zod";

const trackingEventTypeSchema = z.enum([
	"addedToCart",
	"submittedToOrder",
	"cartItemQuantityChanged",
	"cartItemRemoved",
	"cartItemCancelled",
	"fulfillmentException",
	"exceptionResolved",
	"includedInOperation",
	"allocatedToLotItem",
	"includedInSupplierOrder",
	"supplierConfirmed",
	"packaged",
	"movedInInternalShipment",
	"receivedAtWarehouse",
	"movedInEndUserShipment",
	"delivered",
	"rolledOverPreAllocation",
	"rolledOverPostAllocation",
]);

const trackingEventSourceSchema = z.enum([
	"user",
	"admin",
	"system",
	"supplier",
	"carrier",
	"external_api",
]);

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
