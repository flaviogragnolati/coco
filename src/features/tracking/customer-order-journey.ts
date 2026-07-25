/**
 * Pure adapter from the customer tracking payload (`UserOrderItemTimeline`) to
 * the view model of the order journey ("Seguimiento del pedido"): the roll-up of
 * one order's item journeys.
 *
 * The whole point is to summarise without repeating — when every item is at the
 * same point of the journey the order shows ONE stepper; only genuine divergence
 * unfolds into per-item journeys. No React, no I/O — tested in
 * `customer-order-journey.test.ts`; mirrors the pure-model shape of
 * `checkout-steps.ts`.
 */

import type { TrackingJourneyStepperStage } from "~/features/tracking/tracking-journey-stepper";
import type { UserOrderItemTimeline } from "~/shared/common/tracking.types";
import {
	type UserTrackingNoticeKind,
	userTrackingStageDefinitions,
} from "~/shared/common/tracking-display";

export type CustomerOrderJourneyItemInput = {
	cartItemId: number;
	productName: string;
	/** Already formatted by the caller (it owns the unit of the product snapshot). */
	quantityLabel: string;
	timeline: UserOrderItemTimeline | undefined;
};

export type CustomerJourneyNoticeView = {
	label: string;
	kind: UserTrackingNoticeKind;
	createdAt: string;
};

export type CustomerItemJourneyView = {
	cartItemId: number;
	productName: string;
	quantityLabel: string;
	stages: TrackingJourneyStepperStage[];
	notices: CustomerJourneyNoticeView[];
	cancelled: boolean;
	currentStageLabel: string | null;
};

export type CustomerOrderJourneyView =
	| { mode: "empty" }
	| {
			mode: "unified";
			stages: TrackingJourneyStepperStage[];
			notices: CustomerJourneyNoticeView[];
			cancelled: boolean;
	  }
	| { mode: "perItem"; items: CustomerItemJourneyView[] };

/** All stages pending — used for items whose timeline never arrived. */
function pendingStages(): TrackingJourneyStepperStage[] {
	return userTrackingStageDefinitions.map((stage) => ({
		key: stage.key,
		label: stage.label,
		description: stage.description,
		status: "pending" as const,
		warning: false,
	}));
}

function toStepperStages(
	timeline: UserOrderItemTimeline | undefined,
): TrackingJourneyStepperStage[] {
	if (!timeline) return pendingStages();

	return timeline.stages.map((stage) => ({
		key: stage.key,
		label: stage.label,
		description: stage.description,
		// The customer fold never produces `skipped` and carries no per-stage
		// warnings: deviations surface as notices below the stepper instead.
		status: stage.status,
		warning: false,
		timestamp: stage.createdAt,
	}));
}

function toNoticeViews(
	timeline: UserOrderItemTimeline | undefined,
): CustomerJourneyNoticeView[] {
	return (timeline?.notices ?? []).map((notice) => ({
		label: notice.quantity
			? `${notice.label} (${notice.quantity})`
			: notice.label,
		kind: notice.kind,
		createdAt: notice.createdAt,
	}));
}

/** Index of the `current` stage, or -1 when nothing has happened yet. */
function currentStageIndex(stages: TrackingJourneyStepperStage[]) {
	return stages.findIndex((stage) => stage.status === "current");
}

function toItemView(
	item: CustomerOrderJourneyItemInput,
): CustomerItemJourneyView {
	const stages = toStepperStages(item.timeline);
	const index = currentStageIndex(stages);

	return {
		cartItemId: item.cartItemId,
		productName: item.productName,
		quantityLabel: item.quantityLabel,
		stages,
		notices: toNoticeViews(item.timeline),
		cancelled: (item.timeline?.notices ?? []).some(
			(notice) => notice.kind === "cancelled",
		),
		currentStageLabel: index >= 0 ? (stages[index]?.label ?? null) : null,
	};
}

/**
 * Collapse rule: items are "in the same place" when they share the current
 * stage AND the same cancellation state. Notices never block the collapse —
 * they are aggregated below the unified stepper, prefixed by product.
 */
function isConverged(items: CustomerItemJourneyView[]) {
	const first = items[0];
	if (!first) return false;

	const firstIndex = currentStageIndex(first.stages);
	return items.every(
		(item) =>
			currentStageIndex(item.stages) === firstIndex &&
			item.cancelled === first.cancelled,
	);
}

/** Per stage, the most recent evidence across items (the newest timestamp wins). */
function mergeStages(items: CustomerItemJourneyView[]) {
	const [first, ...rest] = items;
	if (!first) return [];

	return first.stages.map((stage, index) => {
		let timestamp = stage.timestamp;

		for (const item of rest) {
			const candidate = item.stages[index]?.timestamp;
			if (candidate && (!timestamp || candidate > timestamp)) {
				timestamp = candidate;
			}
		}

		return { ...stage, timestamp };
	});
}

function byCreatedAtAsc(
	left: CustomerJourneyNoticeView,
	right: CustomerJourneyNoticeView,
) {
	return left.createdAt.localeCompare(right.createdAt);
}

export function buildCustomerOrderJourneyView(
	items: CustomerOrderJourneyItemInput[],
): CustomerOrderJourneyView {
	// No item has a timeline yet (typically: payment not credited) — the caller
	// shows a hint instead of six empty circles.
	if (items.length === 0 || items.every((item) => !item.timeline)) {
		return { mode: "empty" };
	}

	const itemViews = items.map(toItemView);
	if (!isConverged(itemViews)) return { mode: "perItem", items: itemViews };

	const showProductPrefix = itemViews.length > 1;
	const notices = itemViews
		.flatMap((item) =>
			item.notices.map((notice) => ({
				...notice,
				label: showProductPrefix
					? `${item.productName}: ${notice.label}`
					: notice.label,
			})),
		)
		.sort(byCreatedAtAsc);

	return {
		mode: "unified",
		stages: mergeStages(itemViews),
		notices,
		cancelled: itemViews[0]?.cancelled ?? false,
	};
}
