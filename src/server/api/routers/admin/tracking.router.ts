import {
	adminTrackingCartItemDetailSchema,
	adminTrackingCartItemTimelineInputSchema,
	adminTrackingCartTimelineInputSchema,
	adminTrackingListInputSchema,
	adminTrackingListOutputSchema,
	adminTrackingTimelineOutputSchema,
} from "~/schemas/tracking.schemas";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { TrackingEventService } from "~/server/services/tracking/tracking-event.service";

export const adminTrackingRouter = createTRPCRouter({
	listEvents: adminProcedure
		.input(adminTrackingListInputSchema)
		.output(adminTrackingListOutputSchema)
		.query(({ input }) => {
			return TrackingEventService.listAdminEvents(input);
		}),

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

	getCartItemTimelineDetail: adminProcedure
		.input(adminTrackingCartItemTimelineInputSchema)
		.output(adminTrackingCartItemDetailSchema)
		.query(({ input }) => {
			return TrackingEventService.getAdminCartItemTimelineDetail(
				input.cartItemId,
			);
		}),
});
