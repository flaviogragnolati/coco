import { z } from "zod";
import {
	operationCancelInputSchema,
	operationCreateInputSchema,
	operationDeleteInputSchema,
	operationDetailSchema,
	operationGetByIdInputSchema,
	operationIdSchema,
	operationListInputSchema,
	operationListOutputSchema,
	operationRerunInputSchema,
	operationStatsSchema,
} from "~/schemas/admin/operation.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as operationService from "~/server/services/admin/operation.service";

export const operationRouter = createTRPCRouter({
	list: adminProcedure
		.input(operationListInputSchema)
		.output(operationListOutputSchema)
		.query(async ({ ctx, input }) => operationService.list(input, ctx.db)),

	getById: adminProcedure
		.input(operationGetByIdInputSchema)
		.output(operationDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await operationService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(operationStatsSchema)
		.query(async ({ ctx }) => operationService.getStats(ctx.db)),

	createAndExecute: adminProcedure
		.input(operationCreateInputSchema)
		.output(operationDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationService.createAndExecute(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	cancel: adminProcedure
		.input(operationCancelInputSchema)
		.output(operationDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationService.cancel(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	/** May return a *different* operation than the one it was called on. */
	rerun: adminProcedure
		.input(operationRerunInputSchema)
		.output(operationDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationService.rerun(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	remove: adminProcedure
		.input(operationDeleteInputSchema)
		.output(z.object({ id: operationIdSchema }))
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationService.remove(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
