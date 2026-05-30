import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	productLocalConstraintsCreateInputSchema,
	productLocalConstraintsDeleteInputSchema,
	productLocalConstraintsDetailSchema,
	productLocalConstraintsListInputSchema,
	productLocalConstraintsListOutputSchema,
	productLocalConstraintsStatsSchema,
	productLocalConstraintsUpdateInputSchema,
} from "~/schemas/admin/product-local-constraints.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as productLocalConstraintsService from "~/server/services/admin/product-local-constraints.service";

const deleteResultSchema = z.object({
	id: productLocalConstraintsDeleteInputSchema.shape.id,
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

export const productLocalConstraintsRouter = createTRPCRouter({
	list: adminProcedure
		.input(productLocalConstraintsListInputSchema)
		.output(productLocalConstraintsListOutputSchema)
		.query(async ({ ctx, input }) =>
			productLocalConstraintsService.list(input, ctx.db),
		),

	getById: adminProcedure
		.input(productLocalConstraintsDeleteInputSchema)
		.output(productLocalConstraintsDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await productLocalConstraintsService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(productLocalConstraintsStatsSchema)
		.query(async ({ ctx }) => productLocalConstraintsService.getStats(ctx.db)),

	create: adminProcedure
		.input(productLocalConstraintsCreateInputSchema)
		.output(productLocalConstraintsDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productLocalConstraintsService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(productLocalConstraintsUpdateInputSchema)
		.output(productLocalConstraintsDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productLocalConstraintsService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(productLocalConstraintsDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productLocalConstraintsService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(productLocalConstraintsDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productLocalConstraintsService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
