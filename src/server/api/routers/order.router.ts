import { z } from "zod";

import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";

export const orderRouter = createTRPCRouter({
	test: publicProcedure
		.input(z.object({ text: z.string() }))
		.query(({ input }) => {
			return {
				message: `Hello ${input.text}`,
			};
		}),
});
