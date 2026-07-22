import {
	cartTraceabilityDetailSchema,
	cartTraceabilityInputSchema,
} from "~/schemas/admin/cart-traceability.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import * as cartTraceabilityService from "~/server/services/admin/cart-traceability.service";

export const cartTraceabilityRouter = createTRPCRouter({
	getCartTraceability: adminProcedure
		.input(cartTraceabilityInputSchema)
		.output(cartTraceabilityDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await cartTraceabilityService.getCartTraceability(
					input.cartId,
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
