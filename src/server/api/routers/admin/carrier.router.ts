import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	carrierCreateInputSchema,
	carrierDeleteInputSchema,
	carrierDetailSchema,
	carrierListInputSchema,
	carrierListOutputSchema,
	carrierStatsSchema,
	carrierUpdateInputSchema,
} from "~/schemas/admin/carrier.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as carrierService from "~/server/services/admin/carrier.service";

const deleteResultSchema = z.object({
	id: carrierDeleteInputSchema.shape.id,
});

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

export const carrierRouter = createTRPCRouter({
	list: adminProcedure
		.input(carrierListInputSchema)
		.output(carrierListOutputSchema)
		.query(async ({ ctx, input }) => carrierService.list(input, ctx.db)),

	getById: adminProcedure
		.input(carrierDeleteInputSchema)
		.output(carrierDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await carrierService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(carrierStatsSchema)
		.query(async ({ ctx }) => carrierService.getStats(ctx.db)),

	create: adminProcedure
		.input(carrierCreateInputSchema)
		.output(carrierDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(carrierUpdateInputSchema)
		.output(carrierDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(carrierDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(carrierDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
