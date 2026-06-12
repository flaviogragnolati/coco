import { TRPCError } from "@trpc/server";

import {
	shipmentDetailSchema,
	shipmentGetByIdInputSchema,
	shipmentListInputSchema,
	shipmentListOutputSchema,
	shipmentStatsSchema,
} from "~/schemas/admin/shipment.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as shipmentService from "~/server/services/admin/shipment.service";

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

export const shipmentRouter = createTRPCRouter({
	list: adminProcedure
		.input(shipmentListInputSchema)
		.output(shipmentListOutputSchema)
		.query(async ({ ctx, input }) => shipmentService.list(input, ctx.db)),

	getById: adminProcedure
		.input(shipmentGetByIdInputSchema)
		.output(shipmentDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await shipmentService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(shipmentStatsSchema)
		.query(async ({ ctx }) => shipmentService.getStats(ctx.db)),
});
