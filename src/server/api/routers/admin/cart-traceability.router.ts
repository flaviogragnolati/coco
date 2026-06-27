import { TRPCError } from "@trpc/server";

import {
	cartTraceabilityDetailSchema,
	cartTraceabilityInputSchema,
} from "~/schemas/admin/cart-traceability.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as cartTraceabilityService from "~/server/services/admin/cart-traceability.service";

function mapServiceError(error: unknown): never {
	if (error instanceof AdminCrudError) {
		throw new TRPCError({
			code: error.code === "NOT_FOUND" ? "NOT_FOUND" : "CONFLICT",
			message: error.message,
			cause: error,
		});
	}

	throw error;
}

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
