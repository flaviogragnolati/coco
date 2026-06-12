import { TRPCError } from "@trpc/server";

import {
	packageDetailSchema,
	packageGetByIdInputSchema,
	packageListInputSchema,
	packageListOutputSchema,
	packageStatsSchema,
} from "~/schemas/admin/package.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as packageService from "~/server/services/admin/package.service";

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
