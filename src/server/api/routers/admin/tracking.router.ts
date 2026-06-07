import {
	adminTrackingCartItemTimelineInputSchema,
	adminTrackingCartTimelineInputSchema,
	adminTrackingTimelineOutputSchema,
} from "~/schemas/tracking.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { TrackingEventService } from "~/server/services/tracking/tracking-event.service";

export const adminTrackingRouter = createTRPCRouter({
	getCartTimeline: adminProcedure
		.input(adminTrackingCartTimelineInputSchema)
		.output(adminTrackingTimelineOutputSchema)
		.query(({ input }) => {
			return TrackingEventService.getAdminCartTimeline(input.cartId);
		}),

	getCartItemTimeline: adminProcedure
		.input(adminTrackingCartItemTimelineInputSchema)
		.output(adminTrackingTimelineOutputSchema)
		.query(({ input }) => {
			return TrackingEventService.getAdminCartItemTimeline(input.cartItemId);
		}),
});
