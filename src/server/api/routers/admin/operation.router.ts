import { TRPCError } from "@trpc/server";

import {
	operationCreateInputSchema,
	operationDetailSchema,
	operationGetByIdInputSchema,
	operationListInputSchema,
	operationListOutputSchema,
	operationStatsSchema,
} from "~/schemas/admin/operation.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as operationService from "~/server/services/admin/operation.service";

function mapServiceError(error: unknown): never {
	if (error instanceof AdminCrudError) {
		throw new TRPCError({
			code: error.code === "NOT_FOUND" ? "NOT_FOUND" : "CONFLICT",
			message: error.message,
			cause: error,
		});
	}

	throw error;
}

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
