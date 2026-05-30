import { TRPCError } from "@trpc/server";

import {
	profileSchema,
	profileUpdateInputSchema,
} from "~/schemas/profile.schemas";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const profileSelect = {
	id: true,
	name: true,
	email: true,
	emailVerified: true,
	image: true,
	role: true,
	document: true,
	taxId: true,
	dob: true,
	active: true,
	deleted: true,
} as const;

export const profileRouter = createTRPCRouter({
	get: protectedProcedure.output(profileSchema).query(async ({ ctx }) => {
		const user = await ctx.db.user.findUnique({
			where: { id: ctx.session.user.id },
			select: profileSelect,
		});

		if (!user) {
			throw new TRPCError({ code: "NOT_FOUND" });
		}

		return profileSchema.parse(user);
	}),

	update: protectedProcedure
		.input(profileUpdateInputSchema)
		.output(profileSchema)
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db.user.update({
				where: { id: ctx.session.user.id },
				data: {
					name: input.name,
					document: input.document,
					taxId: input.taxId,
					dob: input.dob,
				},
				select: profileSelect,
			});

			return profileSchema.parse(user);
		}),
});
