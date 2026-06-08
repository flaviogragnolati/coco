import {
	trackingOrderTimelineInputSchema,
	userOrderItemTimelinesOutputSchema,
	userTrackingTimelineOutputSchema,
} from "~/schemas/tracking.schemas";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TrackingEventService } from "~/server/services/tracking/tracking-event.service";

export const trackingRouter = createTRPCRouter({
	getOrderTimeline: protectedProcedure
		.input(trackingOrderTimelineInputSchema)
		.output(userTrackingTimelineOutputSchema)
		.query(({ ctx, input }) => {
			return TrackingEventService.getUserOrderTimeline(
				ctx.session.user.id,
				input.orderId,
			);
		}),

	getOrderItemTimelines: protectedProcedure
		.input(trackingOrderTimelineInputSchema)
		.output(userOrderItemTimelinesOutputSchema)
		.query(({ ctx, input }) => {
			return TrackingEventService.getUserOrderItemTimelines(
				ctx.session.user.id,
				input.orderId,
			);
		}),
});
