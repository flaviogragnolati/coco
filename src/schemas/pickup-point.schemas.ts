import { z } from "zod";

/**
 * Depot pickup is deliberately absent: it is the absence of a shipment, not a
 * mode of one (see the `DeliveryMode` enum in `prisma/schema.prisma`). The same
 * values name the customer's delivery preference on an order.
 */
export const deliveryModeSchema = z.enum(["homeDelivery", "pickupPoint"]);

/** What a pickup point looks like once copied into an order or a shipment. */
export const pickupPointDataSchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	line1: z.string(),
	line2: z.string().nullable(),
	city: z.string(),
	state: z.string(),
	postalCode: z.string().nullable(),
	country: z.string(),
	googleMapsUrl: z.string().nullable(),
	hours: z.string(),
	instructions: z.string().nullable(),
});

export const pickupPointSnapshotSourceSchema = z.enum([
	"checkout",
	"admin",
	"shipment",
]);

export const pickupPointSnapshotSchema = z.object({
	source: pickupPointSnapshotSourceSchema,
	capturedAt: z.string(),
	pickupPoint: pickupPointDataSchema,
});

export const checkoutPickupPointSchema = pickupPointDataSchema;
