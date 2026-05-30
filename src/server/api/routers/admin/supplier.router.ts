import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	supplierCreateInputSchema,
	supplierDeleteInputSchema,
	supplierDetailSchema,
	supplierListInputSchema,
	supplierListOutputSchema,
	supplierStatsSchema,
	supplierUpdateInputSchema,
} from "~/schemas/admin/supplier.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as supplierService from "~/server/services/admin/supplier.service";

const deleteResultSchema = z.object({
	id: supplierDeleteInputSchema.shape.id,
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

export const supplierRouter = createTRPCRouter({
	list: adminProcedure
		.input(supplierListInputSchema)
		.output(supplierListOutputSchema)
		.query(async ({ ctx, input }) => supplierService.list(input, ctx.db)),

	getById: adminProcedure
		.input(supplierDeleteInputSchema)
		.output(supplierDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await supplierService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(supplierStatsSchema)
		.query(async ({ ctx }) => supplierService.getStats(ctx.db)),

	create: adminProcedure
		.input(supplierCreateInputSchema)
		.output(supplierDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await supplierService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(supplierUpdateInputSchema)
		.output(supplierDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await supplierService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(supplierDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await supplierService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(supplierDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await supplierService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
