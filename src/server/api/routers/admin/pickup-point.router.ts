import { z } from "zod";

import {
	pickupPointCreateInputSchema,
	pickupPointDeleteInputSchema,
	pickupPointDetailSchema,
	pickupPointListInputSchema,
	pickupPointListOutputSchema,
	pickupPointSetActiveInputSchema,
	pickupPointStatsSchema,
	pickupPointUpdateInputSchema,
} from "~/schemas/admin/pickup-point.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as pickupPointService from "~/server/services/admin/pickup-point.service";

const deleteResultSchema = z.object({
	id: pickupPointDeleteInputSchema.shape.id,
});

export const pickupPointRouter = createTRPCRouter({
	list: adminProcedure
		.input(pickupPointListInputSchema)
		.output(pickupPointListOutputSchema)
		.query(async ({ ctx, input }) => pickupPointService.list(input, ctx.db)),

	getById: adminProcedure
		.input(pickupPointDeleteInputSchema)
		.output(pickupPointDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await pickupPointService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(pickupPointStatsSchema)
		.query(async ({ ctx }) => pickupPointService.getStats(ctx.db)),

	create: adminProcedure
		.input(pickupPointCreateInputSchema)
		.output(pickupPointDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await pickupPointService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(pickupPointUpdateInputSchema)
		.output(pickupPointDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await pickupPointService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	setActive: adminProcedure
		.input(pickupPointSetActiveInputSchema)
		.output(pickupPointDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await pickupPointService.setActive(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(pickupPointDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await pickupPointService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(pickupPointDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await pickupPointService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
