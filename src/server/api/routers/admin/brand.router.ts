import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	brandCreateInputSchema,
	brandDeleteInputSchema,
	brandDetailSchema,
	brandListInputSchema,
	brandListOutputSchema,
	brandStatsSchema,
	brandUpdateInputSchema,
} from "~/schemas/admin/brand.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as brandService from "~/server/services/admin/brand.service";

const deleteResultSchema = z.object({
	id: brandDeleteInputSchema.shape.id,
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

export const brandRouter = createTRPCRouter({
	list: adminProcedure
		.input(brandListInputSchema)
		.output(brandListOutputSchema)
		.query(async ({ ctx, input }) => brandService.list(input, ctx.db)),

	getById: adminProcedure
		.input(brandDeleteInputSchema)
		.output(brandDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await brandService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(brandStatsSchema)
		.query(async ({ ctx }) => brandService.getStats(ctx.db)),

	create: adminProcedure
		.input(brandCreateInputSchema)
		.output(brandDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await brandService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(brandUpdateInputSchema)
		.output(brandDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await brandService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(brandDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await brandService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(brandDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await brandService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
