import {
	operationCreateInputSchema,
	operationDetailSchema,
	operationGetByIdInputSchema,
	operationListInputSchema,
	operationListOutputSchema,
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
});
