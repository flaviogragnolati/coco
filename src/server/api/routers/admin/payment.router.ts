import {
	paymentAttemptActionInputSchema,
	paymentAttemptDetailSchema,
	paymentAttemptListOutputSchema,
	paymentEventActionInputSchema,
	paymentEventDetailSchema,
	paymentEventIgnoreInputSchema,
	paymentEventListOutputSchema,
	paymentListInputSchema,
	paymentProviderConfigSchema,
	paymentProviderConfigUpdateInputSchema,
	paymentStatsSchema,
} from "~/schemas/admin/payment.schemas";
import {
	adminProcedure,
	createTRPCRouter,
	superadminProcedure,
} from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as paymentService from "~/server/services/admin/payment.service";

export const paymentRouter = createTRPCRouter({
	listAttempts: adminProcedure
		.input(paymentListInputSchema)
		.output(paymentAttemptListOutputSchema)
		.query(({ ctx, input }) => paymentService.listAttempts(input, ctx.db)),

	getAttemptById: adminProcedure
		.input(paymentAttemptActionInputSchema)
		.output(paymentAttemptDetailSchema)
		.query(({ ctx, input }) => paymentService.getAttemptById(input.id, ctx.db)),

	getAttemptStats: adminProcedure
		.output(paymentStatsSchema)
		.query(({ ctx }) => paymentService.getAttemptStats(ctx.db)),

	reconcileAttempt: adminProcedure
		.input(paymentAttemptActionInputSchema)
		.output(paymentAttemptDetailSchema)
		.mutation(({ ctx, input }) =>
			paymentService.reconcileAttempt(input.id, toAdminActor(ctx.session.user)),
		),

	listEvents: adminProcedure
		.input(paymentListInputSchema)
		.output(paymentEventListOutputSchema)
		.query(({ ctx, input }) => paymentService.listEvents(input, ctx.db)),

	getEventById: adminProcedure
		.input(paymentEventActionInputSchema)
		.output(paymentEventDetailSchema)
		.query(({ ctx, input }) => paymentService.getEventById(input.id, ctx.db)),

	reprocessEvent: adminProcedure
		.input(paymentEventActionInputSchema)
		.output(paymentAttemptDetailSchema)
		.mutation(({ ctx, input }) =>
			paymentService.reprocessEvent(input.id, toAdminActor(ctx.session.user)),
		),

	ignoreEvent: adminProcedure
		.input(paymentEventIgnoreInputSchema)
		.output(paymentEventDetailSchema)
		.mutation(({ ctx, input }) =>
			paymentService.ignoreEvent(input, toAdminActor(ctx.session.user), ctx.db),
		),

	getProviderConfig: adminProcedure
		.output(paymentProviderConfigSchema)
		.query(({ ctx }) => paymentService.getProviderConfig(ctx.db)),

	updateProviderConfig: superadminProcedure
		.input(paymentProviderConfigUpdateInputSchema)
		.output(paymentProviderConfigSchema)
		.mutation(({ ctx, input }) =>
			paymentService.updateProviderConfig(
				input,
				toAdminActor(ctx.session.user),
				ctx.db,
			),
		),
});
