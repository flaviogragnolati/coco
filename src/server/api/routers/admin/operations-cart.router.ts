import { z } from "zod";

import {
	operationsCartDeleteInputSchema,
	operationsCartDetailSchema,
	operationsCartListInputSchema,
	operationsCartListOutputSchema,
	operationsCartQuickStatusInputSchema,
	operationsCartStatsSchema,
	operationsCartUpdateInputSchema,
} from "~/schemas/admin/operations-cart.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as operationsCartService from "~/server/services/admin/operations-cart.service";

const deleteResultSchema = z.object({
	id: operationsCartDeleteInputSchema.shape.id,
});

export const operationsCartRouter = createTRPCRouter({
	list: adminProcedure
		.input(operationsCartListInputSchema)
		.output(operationsCartListOutputSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await operationsCartService.list(input, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getById: adminProcedure
		.input(operationsCartDeleteInputSchema)
		.output(operationsCartDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await operationsCartService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(operationsCartStatsSchema)
		.query(async ({ ctx }) => operationsCartService.getStats(ctx.db)),

	update: adminProcedure
		.input(operationsCartUpdateInputSchema)
		.output(operationsCartDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationsCartService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	quickUpdateStatus: adminProcedure
		.input(operationsCartQuickStatusInputSchema)
		.output(operationsCartDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationsCartService.quickUpdateStatus(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(operationsCartDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationsCartService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(operationsCartDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationsCartService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
