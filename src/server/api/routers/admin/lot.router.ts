import {
	lotDetailSchema,
	lotGetByIdInputSchema,
	lotListInputSchema,
	lotListOutputSchema,
	lotStatsSchema,
} from "~/schemas/admin/lot.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import * as lotService from "~/server/services/admin/lot.service";

export const lotRouter = createTRPCRouter({
	list: adminProcedure
		.input(lotListInputSchema)
		.output(lotListOutputSchema)
		.query(async ({ ctx, input }) => lotService.list(input, ctx.db)),

	getById: adminProcedure
		.input(lotGetByIdInputSchema)
		.output(lotDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await lotService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(lotStatsSchema)
		.query(async ({ ctx }) => lotService.getStats(ctx.db)),
});
