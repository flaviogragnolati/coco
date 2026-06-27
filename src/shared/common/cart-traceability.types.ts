import type { z } from "zod";

import type {
	cartTraceabilityDetailSchema,
	cartTraceabilityInputSchema,
} from "~/schemas/admin/cart-traceability.schemas";

export type CartTraceabilityInput = z.output<
	typeof cartTraceabilityInputSchema
>;
export type CartTraceabilityDetail = z.output<
	typeof cartTraceabilityDetailSchema
>;

export type CartTraceabilityCart = CartTraceabilityDetail["cart"];
export type CartTraceabilityAggregate = CartTraceabilityDetail["aggregate"];
export type CartTraceabilityFulfillmentCount =
	CartTraceabilityAggregate["fulfillmentSummary"][number];
export type CartTraceabilityOrder = CartTraceabilityDetail["orders"][number];
export type CartTraceabilityPayment = CartTraceabilityOrder["payments"][number];
export type CartTraceabilityItem = CartTraceabilityDetail["items"][number];
export type CartTraceabilityAllocation =
	CartTraceabilityItem["allocations"][number];
export type CartTraceabilityPackaging =
	CartTraceabilityAllocation["packaging"][number];
export type CartTraceabilityRollOver =
	CartTraceabilityItem["rollOvers"][number];
