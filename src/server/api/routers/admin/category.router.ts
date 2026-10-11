import { z } from "zod";

import {
	categoryCreateInputSchema,
	categoryDeleteInputSchema,
	categoryDetailSchema,
	categoryListInputSchema,
	categoryListOutputSchema,
	categoryStatsSchema,
	categoryUpdateInputSchema,
} from "~/schemas/admin/category.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as categoryService from "~/server/services/admin/category.service";

const deleteResultSchema = z.object({
	id: categoryDeleteInputSchema.shape.id,
});

export const categoryRouter = createTRPCRouter({
	list: adminProcedure
		.input(categoryListInputSchema)
		.output(categoryListOutputSchema)
		.query(async ({ ctx, input }) => categoryService.list(input, ctx.db)),

	getById: adminProcedure
		.input(categoryDeleteInputSchema)
		.output(categoryDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await categoryService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(categoryStatsSchema)
		.query(async ({ ctx }) => categoryService.getStats(ctx.db)),

	create: adminProcedure
		.input(categoryCreateInputSchema)
		.output(categoryDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await categoryService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(categoryUpdateInputSchema)
		.output(categoryDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await categoryService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(categoryDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await categoryService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(categoryDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await categoryService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
