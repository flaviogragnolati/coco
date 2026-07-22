import { z } from "zod";

import {
	addressCreateInputSchema,
	addressDeleteInputSchema,
	addressDetailSchema,
	addressListInputSchema,
	addressListOutputSchema,
	addressStatsSchema,
	addressUpdateInputSchema,
} from "~/schemas/admin/address.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as addressService from "~/server/services/admin/address.service";

const deleteResultSchema = z.object({
	id: addressDeleteInputSchema.shape.id,
});

export const addressRouter = createTRPCRouter({
	list: adminProcedure
		.input(addressListInputSchema)
		.output(addressListOutputSchema)
		.query(async ({ ctx, input }) => addressService.list(input, ctx.db)),

	getById: adminProcedure
		.input(addressDeleteInputSchema)
		.output(addressDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await addressService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(addressStatsSchema)
		.query(async ({ ctx }) => addressService.getStats(ctx.db)),

	create: adminProcedure
		.input(addressCreateInputSchema)
		.output(addressDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await addressService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(addressUpdateInputSchema)
		.output(addressDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await addressService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(addressDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await addressService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(addressDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await addressService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
