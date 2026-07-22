import {
	shipmentDetailSchema,
	shipmentGetByIdInputSchema,
	shipmentListInputSchema,
	shipmentListOutputSchema,
	shipmentStatsSchema,
} from "~/schemas/admin/shipment.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import * as shipmentService from "~/server/services/admin/shipment.service";

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
