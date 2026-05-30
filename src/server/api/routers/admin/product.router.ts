import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	productCreateInputSchema,
	productDeleteInputSchema,
	productDetailSchema,
	productListInputSchema,
	productListOutputSchema,
	productStatsSchema,
	productUpdateInputSchema,
} from "~/schemas/admin/product.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as productService from "~/server/services/admin/product.service";

const deleteResultSchema = z.object({
	id: productDeleteInputSchema.shape.id,
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

export const productRouter = createTRPCRouter({
	list: adminProcedure
		.input(productListInputSchema)
		.output(productListOutputSchema)
		.query(async ({ ctx, input }) => productService.list(input, ctx.db)),

	getById: adminProcedure
		.input(productDeleteInputSchema)
		.output(productDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await productService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(productStatsSchema)
		.query(async ({ ctx }) => productService.getStats(ctx.db)),

	create: adminProcedure
		.input(productCreateInputSchema)
		.output(productDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(productUpdateInputSchema)
		.output(productDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(productDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(productDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await productService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
