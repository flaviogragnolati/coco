import { z } from "zod";

import {
	userCreateInputSchema,
	userDeleteInputSchema,
	userDetailSchema,
	userListInputSchema,
	userListOutputSchema,
	userStatsSchema,
	userUpdateInputSchema,
} from "~/schemas/admin/user.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as userService from "~/server/services/admin/user.service";

const deleteResultSchema = z.object({
	id: userDeleteInputSchema.shape.id,
});

export const userRouter = createTRPCRouter({
	list: adminProcedure
		.input(userListInputSchema)
		.output(userListOutputSchema)
		.query(async ({ ctx, input }) => userService.list(input, ctx.db)),

	getById: adminProcedure
		.input(userDeleteInputSchema)
		.output(userDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await userService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(userStatsSchema)
		.query(async ({ ctx }) => userService.getStats(ctx.db)),

	create: adminProcedure
		.input(userCreateInputSchema)
		.output(userDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await userService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(userUpdateInputSchema)
		.output(userDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await userService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(userDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await userService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(userDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await userService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
