import type { z } from "zod";

import type {
	adminTrackingCartItemTimelineInputSchema,
	adminTrackingCartTimelineInputSchema,
	adminTrackingTimelineItemSchema,
	adminTrackingTimelineOutputSchema,
	trackingOrderTimelineInputSchema,
	userTrackingTimelineItemSchema,
	userTrackingTimelineOutputSchema,
} from "~/schemas/tracking.schemas";

export type TrackingOrderTimelineInput = z.output<
	typeof trackingOrderTimelineInputSchema
>;
export type UserTrackingTimelineItem = z.output<
	typeof userTrackingTimelineItemSchema
>;
export type UserTrackingTimelineOutput = z.output<
	typeof userTrackingTimelineOutputSchema
>;
export type AdminTrackingCartTimelineInput = z.output<
	typeof adminTrackingCartTimelineInputSchema
>;
export type AdminTrackingCartItemTimelineInput = z.output<
	typeof adminTrackingCartItemTimelineInputSchema
>;
export type AdminTrackingTimelineItem = z.output<
	typeof adminTrackingTimelineItemSchema
>;
export type AdminTrackingTimelineOutput = z.output<
	typeof adminTrackingTimelineOutputSchema
>;
