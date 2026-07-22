import {
	packageDetailSchema,
	packageGetByIdInputSchema,
	packageListInputSchema,
	packageListOutputSchema,
	packageStatsSchema,
} from "~/schemas/admin/package.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import * as packageService from "~/server/services/admin/package.service";

export const packageRouter = createTRPCRouter({
	list: adminProcedure
		.input(packageListInputSchema)
		.output(packageListOutputSchema)
		.query(async ({ ctx, input }) => packageService.list(input, ctx.db)),

	getById: adminProcedure
		.input(packageGetByIdInputSchema)
		.output(packageDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await packageService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(packageStatsSchema)
		.query(async ({ ctx }) => packageService.getStats(ctx.db)),
});
