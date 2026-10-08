import { supplierApplicationSubmitInputSchema } from "~/schemas/supplier-application.schemas";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import * as supplierApplicationService from "~/server/services/supplier-application/supplier-application.service";

export const supplierApplicationRouter = createTRPCRouter({
	submit: publicProcedure
		.input(supplierApplicationSubmitInputSchema)
		.mutation(async ({ ctx, input }) => {
			await supplierApplicationService.submit(input, ctx.db);
		}),
});
