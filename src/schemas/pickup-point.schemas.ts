import { z } from "zod";

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
