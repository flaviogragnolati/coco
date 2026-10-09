import type { z } from "zod";

import type {
	userOrderDeliveryChangeInputSchema,
	userOrderDeliveryOptionsSchema,
	userOrderDeliverySchema,
} from "~/schemas/admin/user-order.schemas";

export type UserOrderDeliveryChangeInput = z.output<
	typeof userOrderDeliveryChangeInputSchema
>;
export type UserOrderDelivery = z.output<typeof userOrderDeliverySchema>;
export type UserOrderDeliveryOptions = z.output<
	typeof userOrderDeliveryOptionsSchema
>;
