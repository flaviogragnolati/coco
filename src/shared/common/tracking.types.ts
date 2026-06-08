import type { z } from "zod";

import type {
	adminTrackingCartItemDetailSchema,
	adminTrackingCartItemTimelineInputSchema,
	adminTrackingCartTimelineInputSchema,
	adminTrackingEventListItemSchema,
	adminTrackingListFiltersSchema,
	adminTrackingListInputSchema,
	adminTrackingListOutputSchema,
	adminTrackingTimelineDetailItemSchema,
	adminTrackingTimelineItemSchema,
	adminTrackingTimelineOutputSchema,
	trackingOrderTimelineInputSchema,
	userOrderItemTimelineSchema,
	userOrderItemTimelinesOutputSchema,
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
export type UserOrderItemTimeline = z.output<
	typeof userOrderItemTimelineSchema
>;
export type UserOrderItemTimelinesOutput = z.output<
	typeof userOrderItemTimelinesOutputSchema
>;
export type AdminTrackingCartTimelineInput = z.output<
	typeof adminTrackingCartTimelineInputSchema
>;
export type AdminTrackingCartItemTimelineInput = z.output<
	typeof adminTrackingCartItemTimelineInputSchema
>;
export type AdminTrackingListFilters = z.output<
	typeof adminTrackingListFiltersSchema
>;
export type AdminTrackingListInput = z.output<
	typeof adminTrackingListInputSchema
>;
export type AdminTrackingEventListItem = z.output<
	typeof adminTrackingEventListItemSchema
>;
export type AdminTrackingListOutput = z.output<
	typeof adminTrackingListOutputSchema
>;
export type AdminTrackingTimelineItem = z.output<
	typeof adminTrackingTimelineItemSchema
>;
export type AdminTrackingTimelineDetailItem = z.output<
	typeof adminTrackingTimelineDetailItemSchema
>;
export type AdminTrackingTimelineOutput = z.output<
	typeof adminTrackingTimelineOutputSchema
>;
export type AdminTrackingCartItemDetail = z.output<
	typeof adminTrackingCartItemDetailSchema
>;
