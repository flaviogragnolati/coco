import {
	supplierApplicationListInputSchema,
	supplierApplicationListItemSchema,
	supplierApplicationListOutputSchema,
	supplierApplicationMarkContactedInputSchema,
} from "~/schemas/admin/supplier-application.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as supplierApplicationService from "~/server/services/admin/supplier-application.service";

export const supplierApplicationRouter = createTRPCRouter({
	list: adminProcedure
		.input(supplierApplicationListInputSchema)
		.output(supplierApplicationListOutputSchema)
		.query(async ({ ctx, input }) =>
			supplierApplicationService.list(input, ctx.db),
		),

	markContacted: adminProcedure
		.input(supplierApplicationMarkContactedInputSchema)
		.output(supplierApplicationListItemSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await supplierApplicationService.markContacted(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
