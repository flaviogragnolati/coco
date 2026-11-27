import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	notificationDetailOutput,
	notificationListInput,
	notificationListOutput,
	notificationSummaryInput,
	notificationSummaryOutput,
} from "~/schemas/admin/notification.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import {
	findNotification,
	listNotifications,
	summarizeOrderNotifications,
} from "~/server/services/admin/notification.data";

export const notificationRouter = createTRPCRouter({
	list: adminProcedure
		.input(notificationListInput)
		.output(notificationListOutput)
		.query(({ ctx, input }) => listNotifications(ctx.db, input)),
	getById: adminProcedure
		.input(z.object({ id: z.string().min(1).max(128) }))
		.output(notificationDetailOutput)
		.query(async ({ ctx, input }) => {
			const detail = await findNotification(ctx.db, input.id);
			if (!detail)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No se encontró la notificación.",
				});
			return detail;
		}),
	summarizeOrders: adminProcedure
		.input(notificationSummaryInput)
		.output(notificationSummaryOutput)
		.query(({ ctx, input }) =>
			summarizeOrderNotifications(ctx.db, input.orderIds),
		),
});
