import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	productClientTermsCreateInputSchema,
	productClientTermsDeleteInputSchema,
	productClientTermsDetailSchema,
	productClientTermsListInputSchema,
	productClientTermsListOutputSchema,
	productClientTermsStatsSchema,
	productClientTermsUpdateInputSchema,
} from "~/schemas/admin/product-client-terms.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as productClientTermsService from "~/server/services/admin/product-client-terms.service";

const deleteResultSchema = z.object({
	id: productClientTermsDeleteInputSchema.shape.id,
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

export const productClientTermsRouter = createTRPCRouter({
	list: adminProcedure
		.input(productClientTermsListInputSchema)
		.output(productClientTermsListOutputSchema)
		.query(async ({ ctx, input }) =>
			productClientTermsService.list(input, ctx.db),
		),

	getById: adminProcedure
		.input(productClientTermsDeleteInputSchema)
		.output(productClientTermsDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await productClientTermsService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(productClientTermsStatsSchema)
		.query(async ({ ctx }) => productClientTermsService.getStats(ctx.db)),

	create: adminProcedure
		.input(productClientTermsCreateInputSchema)
		.output(productClientTermsDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productClientTermsService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(productClientTermsUpdateInputSchema)
		.output(productClientTermsDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productClientTermsService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(productClientTermsDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productClientTermsService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(productClientTermsDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productClientTermsService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
