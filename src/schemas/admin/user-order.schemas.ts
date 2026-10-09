import { z } from "zod";

import {
	checkoutAddressFieldsSchema,
	checkoutAddressSchema,
} from "~/schemas/checkout.schemas";
import {
	deliveryModeSchema,
	pickupPointDataSchema,
} from "~/schemas/pickup-point.schemas";

const positiveIdSchema = z.number().int().positive();

export const userOrderIdInputSchema = z.object({ orderId: positiveIdSchema });

export const userOrderDeliveryChangeInputSchema = z.object({
	orderId: positiveIdSchema,
	delivery: z.discriminatedUnion("mode", [
		z.object({
			mode: z.literal("homeDelivery"),
			/** One of the customer's saved addresses, or one typed for this order only. */
			address: z.union([
				z.object({ addressId: positiveIdSchema }),
				z.object({ snapshot: checkoutAddressFieldsSchema }),
			]),
		}),
		z.object({
			mode: z.literal("pickupPoint"),
			pickupPointId: positiveIdSchema,
		}),
	]),
	/** Shown to the customer verbatim in their journey. */
	reason: z
		.string()
		.trim()
		.min(1, "El motivo es obligatorio")
		.max(500, "El motivo no puede superar los 500 caracteres"),
});

export const userOrderDeliverySchema = z.object({
	orderId: positiveIdSchema,
	deliveryPreference: deliveryModeSchema.nullable(),
	pickupPointId: positiveIdSchema.nullable(),
	pickupPointSnapshot: z.unknown().nullable(),
	shippingAddressSnapshot: z.unknown().nullable(),
});

export const userOrderDeliveryOptionsSchema = userOrderDeliverySchema.extend({
	orderCode: z.string(),
	addresses: z.array(checkoutAddressSchema),
	pickupPoints: z.array(pickupPointDataSchema),
	/** Why the change is refused right now; null when it is allowed. */
	blockedReason: z.string().nullable(),
});
