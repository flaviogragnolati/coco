import { TRPCError } from "@trpc/server";

import {
	lotDetailSchema,
	lotGetByIdInputSchema,
	lotListInputSchema,
	lotListOutputSchema,
	lotStatsSchema,
} from "~/schemas/admin/lot.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as lotService from "~/server/services/admin/lot.service";

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

export const lotRouter = createTRPCRouter({
	list: adminProcedure
		.input(lotListInputSchema)
		.output(lotListOutputSchema)
		.query(async ({ ctx, input }) => lotService.list(input, ctx.db)),

	getById: adminProcedure
		.input(lotGetByIdInputSchema)
		.output(lotDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await lotService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(lotStatsSchema)
		.query(async ({ ctx }) => lotService.getStats(ctx.db)),
});
