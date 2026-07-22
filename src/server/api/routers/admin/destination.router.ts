import { z } from "zod";

import {
	destinationCreateInputSchema,
	destinationDeleteInputSchema,
	destinationDetailSchema,
	destinationListInputSchema,
	destinationListOutputSchema,
	destinationStatsSchema,
	destinationUpdateInputSchema,
} from "~/schemas/admin/destination.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as destinationService from "~/server/services/admin/destination.service";

const deleteResultSchema = z.object({
	id: destinationDeleteInputSchema.shape.id,
});

export const destinationRouter = createTRPCRouter({
	list: adminProcedure
		.input(destinationListInputSchema)
		.output(destinationListOutputSchema)
		.query(async ({ ctx, input }) => destinationService.list(input, ctx.db)),

	getById: adminProcedure
		.input(destinationDeleteInputSchema)
		.output(destinationDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await destinationService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(destinationStatsSchema)
		.query(async ({ ctx }) => destinationService.getStats(ctx.db)),

	create: adminProcedure
		.input(destinationCreateInputSchema)
		.output(destinationDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await destinationService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(destinationUpdateInputSchema)
		.output(destinationDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await destinationService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(destinationDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await destinationService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(destinationDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await destinationService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
