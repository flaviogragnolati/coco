import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	productSupplierTermsCreateInputSchema,
	productSupplierTermsDeleteInputSchema,
	productSupplierTermsDetailSchema,
	productSupplierTermsListInputSchema,
	productSupplierTermsListOutputSchema,
	productSupplierTermsStatsSchema,
	productSupplierTermsUpdateInputSchema,
} from "~/schemas/admin/product-supplier-terms.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as productSupplierTermsService from "~/server/services/admin/product-supplier-terms.service";

const deleteResultSchema = z.object({
	id: productSupplierTermsDeleteInputSchema.shape.id,
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

export const productSupplierTermsRouter = createTRPCRouter({
	list: adminProcedure
		.input(productSupplierTermsListInputSchema)
		.output(productSupplierTermsListOutputSchema)
		.query(async ({ ctx, input }) =>
			productSupplierTermsService.list(input, ctx.db),
		),

	getById: adminProcedure
		.input(productSupplierTermsDeleteInputSchema)
		.output(productSupplierTermsDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await productSupplierTermsService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(productSupplierTermsStatsSchema)
		.query(async ({ ctx }) => productSupplierTermsService.getStats(ctx.db)),

	create: adminProcedure
		.input(productSupplierTermsCreateInputSchema)
		.output(productSupplierTermsDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productSupplierTermsService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(productSupplierTermsUpdateInputSchema)
		.output(productSupplierTermsDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productSupplierTermsService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(productSupplierTermsDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productSupplierTermsService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(productSupplierTermsDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productSupplierTermsService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
