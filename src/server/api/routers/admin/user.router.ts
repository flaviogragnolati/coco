import { z } from "zod";

import { adminOptionsOutputSchema } from "~/schemas/admin/_options.schemas";
import {
	adminViewerSchema,
	userCreateInputSchema,
	userDeleteInputSchema,
	userDetailSchema,
	userListInputSchema,
	userListOutputSchema,
	userOptionsInputSchema,
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
	/**
	 * The session already carries the role, so this hits no database. It exists so
	 * the client can *show* what it may do; every authorization decision stays in
	 * the procedure that performs the action.
	 */
	me: adminProcedure
		.output(adminViewerSchema)
		.query(({ ctx }) => toAdminActor(ctx.session.user)),

	list: adminProcedure
		.input(userListInputSchema)
		.output(userListOutputSchema)
		.query(async ({ ctx, input }) => userService.list(input, ctx.db)),

	options: adminProcedure
		.input(userOptionsInputSchema)
		.output(adminOptionsOutputSchema)
		.query(async ({ ctx, input }) => userService.options(input, ctx.db)),

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
