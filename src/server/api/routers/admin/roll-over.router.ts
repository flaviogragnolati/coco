import {
	rollOverListInputSchema,
	rollOverListOutputSchema,
	rollOverResolveInputSchema,
	rollOverResolveOutputSchema,
	rollOverStatsSchema,
} from "~/schemas/admin/roll-over.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as rollOverService from "~/server/services/admin/roll-over.service";

export const rollOverRouter = createTRPCRouter({
	list: adminProcedure
		.input(rollOverListInputSchema)
		.output(rollOverListOutputSchema)
		.query(async ({ ctx, input }) => rollOverService.list(input, ctx.db)),

	getStats: adminProcedure
		.output(rollOverStatsSchema)
		.query(async ({ ctx }) => rollOverService.getStats(ctx.db)),

	resolve: adminProcedure
		.input(rollOverResolveInputSchema)
		.output(rollOverResolveOutputSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await rollOverService.resolve(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
