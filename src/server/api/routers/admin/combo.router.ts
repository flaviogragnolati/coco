import { z } from "zod";

import {
	comboCreateInputSchema,
	comboDeleteInputSchema,
	comboDetailSchema,
	comboGroupOptionsSchema,
	comboListInputSchema,
	comboListOutputSchema,
	comboProductOptionListSchema,
	comboStatsSchema,
	comboUpdateInputSchema,
} from "~/schemas/admin/combo.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as comboService from "~/server/services/admin/combo.service";

const deleteResultSchema = z.object({
	id: comboDeleteInputSchema.shape.id,
});

export const comboRouter = createTRPCRouter({
	list: adminProcedure
		.input(comboListInputSchema)
		.output(comboListOutputSchema)
		.query(async ({ ctx, input }) => comboService.list(input, ctx.db)),

	getById: adminProcedure
		.input(comboDeleteInputSchema)
		.output(comboDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await comboService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(comboStatsSchema)
		.query(async ({ ctx }) => comboService.getStats(ctx.db)),

	productOptions: adminProcedure
		.output(comboProductOptionListSchema)
		.query(async ({ ctx }) => comboService.listProductOptions(ctx.db)),

	groupNames: adminProcedure
		.output(comboGroupOptionsSchema)
		.query(async ({ ctx }) => comboService.listGroupNames(ctx.db)),

	create: adminProcedure
		.input(comboCreateInputSchema)
		.output(comboDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await comboService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(comboUpdateInputSchema)
		.output(comboDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await comboService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(comboDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await comboService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(comboDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await comboService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
