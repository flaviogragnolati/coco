import { TRPCError } from "@trpc/server";

import { supplierApplicationSubmitInputSchema } from "~/schemas/supplier-application.schemas";
import { clientIpFrom } from "~/server/api/client-ip";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { appLogger } from "~/server/services/logging/app-logger.service";
import * as supplierApplicationService from "~/server/services/supplier-application/supplier-application.service";

export const supplierApplicationRouter = createTRPCRouter({
	submit: publicProcedure
		.input(supplierApplicationSubmitInputSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				await supplierApplicationService.submit(
					input,
					ctx.db,
					clientIpFrom(ctx.headers),
				);
			} catch (error) {
				if (error instanceof TRPCError) throw error;
				// Anonymous callers must not see raw database errors.
				appLogger.error("supplierApplicationSubmitFailed", {
					error: error instanceof Error ? error.message : String(error),
				});
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "No pudimos registrar la solicitud",
				});
			}
		}),
});
