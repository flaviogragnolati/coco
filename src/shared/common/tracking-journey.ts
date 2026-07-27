/**
 * Pure model of the admin fulfillment journey ("recorrido"). No React, no I/O —
 * folds a cart item's tracking events into the 10 happy-path stages plus the
 * notices/outcome that describe the deviations. Unit-tested in
 * `tracking-journey.test.ts`.
 *
 * The journey is derived from tracking events (history), NOT from the
 * `fulfillmentStatus` column (the aggregate status): the projector skips
 * transitions when evidence is missing and some writers move the column
 * directly, so the column can diverge from the evidence. Both are shown side by
 * side in the admin modal — the chip is the column, the stepper is the history.
 * See `docs/tracking-architecture.md`.
 *
 * Mirrors the pure-helper shape of `checkout-steps.ts` and the stage-folding
 * algorithm of `toUserOrderItemTimeline` (tracking-event.service.ts).
 */

import {
	type AdminTrackingStageKey,
	adminTrackingStageByEventType,
	adminTrackingStageDefinitions,
	type TrackingEventType,
	trackingEventLabelMap,
	type UserTrackingNoticeKind,
	userTrackingNoticeKindByEventType,
} from "./tracking-display";

export type TrackingJourneyCartItemStatus =
	| "inCart"
	| "submitted"
	| "dropped"
	| "cancelled";

/** Happy-path fulfillment statuses are exactly the stage keys, plus deviations. */
export type TrackingJourneyFulfillmentStatus =
	| AdminTrackingStageKey
	| "partiallyRolledOver"
	| "rolledOver"
	| "cancelled"
	| "exception";

export type TrackingJourneyEventInput = {
	eventType: TrackingEventType;
	quantity?: string;
	/** ISO string; the caller guarantees ascending order. */
	createdAt: string;
};

export type AdminTrackingJourneyStageStatus =
	| "completed"
	| "current"
	| "pending"
	| "skipped";

export type AdminTrackingJourneyStage = {
	key: AdminTrackingStageKey;
	label: string;
	description: string;
	status: AdminTrackingJourneyStageStatus;
	warning: boolean;
	eventType?: TrackingEventType;
	quantity?: string;
	createdAt?: string;
};

export type AdminTrackingJourneyNotice = {
	eventType: TrackingEventType;
	kind: UserTrackingNoticeKind;
	label: string;
	/** Stage that was current when the notice happened; null if none reached. */
	stageKey: AdminTrackingStageKey | null;
	quantity?: string;
	createdAt: string;
};

export type AdminTrackingJourneyOutcomeKind =
	| "dropped"
	| "cancelled"
	| "resolved"
	| "rolledOver"
	| "partiallyRolledOver"
	| "exception";

export type AdminTrackingJourneyOutcome = {
	kind: AdminTrackingJourneyOutcomeKind;
	label: string;
	createdAt?: string;
};

export type AdminTrackingJourney = {
	stages: AdminTrackingJourneyStage[];
	notices: AdminTrackingJourneyNotice[];
	outcome: AdminTrackingJourneyOutcome | null;
	currentStageKey: AdminTrackingStageKey | null;
};

type LatestEvent = { createdAt: string; order: number };

const adminStageIndexByKey = new Map<AdminTrackingStageKey, number>(
	adminTrackingStageDefinitions.map((stage, index) => [stage.key, index]),
);

const outcomeLabelMap: Record<AdminTrackingJourneyOutcomeKind, string> = {
	dropped: "Item eliminado del carrito",
	cancelled: "Item cancelado",
	resolved: "Resuelto sin entrega",
	rolledOver: "Reprogramado",
	partiallyRolledOver: "Parcialmente reprogramado",
	exception: "Con incidencia activa",
};

/** Notice kinds that flag their stage as needing attention. */
const warningNoticeKinds = new Set<UserTrackingNoticeKind>([
	"exception",
	"rollover",
	"cancelled",
]);

function outcomeOf(
	kind: AdminTrackingJourneyOutcomeKind,
	event?: LatestEvent,
): AdminTrackingJourneyOutcome {
	return { kind, label: outcomeLabelMap[kind], createdAt: event?.createdAt };
}

export function buildAdminTrackingJourney({
	status,
	fulfillmentStatus,
	events,
}: {
	status: TrackingJourneyCartItemStatus;
	fulfillmentStatus: TrackingJourneyFulfillmentStatus;
	events: TrackingJourneyEventInput[];
}): AdminTrackingJourney {
	const latestEventByStage = new Map<
		AdminTrackingStageKey,
		TrackingJourneyEventInput
	>();
	const notices: AdminTrackingJourneyNotice[] = [];
	// Replay order (not timestamps) decides which of two event types came last:
	// the caller orders events asc with an id tiebreak, so ties are already
	// resolved there.
	const latestEventByType = new Map<TrackingEventType, LatestEvent>();
	let highestStageIndex = -1;

	for (const [order, event] of events.entries()) {
		latestEventByType.set(event.eventType, {
			createdAt: event.createdAt,
			order,
		});

		const stageKey = adminTrackingStageByEventType[event.eventType];
		if (stageKey) {
			latestEventByStage.set(stageKey, event);
			highestStageIndex = Math.max(
				highestStageIndex,
				adminStageIndexByKey.get(stageKey) ?? -1,
			);
		}

		const noticeKind = userTrackingNoticeKindByEventType[event.eventType];
		if (noticeKind) {
			notices.push({
				eventType: event.eventType,
				kind: noticeKind,
				label: trackingEventLabelMap[event.eventType],
				stageKey:
					highestStageIndex >= 0
						? (adminTrackingStageDefinitions[highestStageIndex]?.key ?? null)
						: null,
				quantity: event.quantity,
				createdAt: event.createdAt,
			});
		}
	}

	const currentStageIndex = highestStageIndex;
	const warningStageKeys = new Set(
		notices
			.filter(
				(notice) => notice.stageKey && warningNoticeKinds.has(notice.kind),
			)
			.map((notice) => notice.stageKey as AdminTrackingStageKey),
	);

	const stages = adminTrackingStageDefinitions.map((stage, index) => {
		const event = latestEventByStage.get(stage.key);
		const stageStatus: AdminTrackingJourneyStageStatus =
			currentStageIndex < 0
				? "pending"
				: index < currentStageIndex
					? event
						? "completed"
						: "skipped"
					: index === currentStageIndex
						? "current"
						: "pending";

		return {
			key: stage.key,
			label: stage.label,
			description: stage.description,
			status: stageStatus,
			warning: warningStageKeys.has(stage.key),
			eventType: event?.eventType,
			quantity: event?.quantity,
			createdAt: event?.createdAt,
		};
	});

	return {
		stages,
		notices,
		outcome: resolveOutcome({ status, fulfillmentStatus, latestEventByType }),
		currentStageKey:
			currentStageIndex >= 0
				? (adminTrackingStageDefinitions[currentStageIndex]?.key ?? null)
				: null,
	};
}

/** First match wins: terminal item states outrank rollovers and exceptions. */
function resolveOutcome({
	status,
	fulfillmentStatus,
	latestEventByType,
}: {
	status: TrackingJourneyCartItemStatus;
	fulfillmentStatus: TrackingJourneyFulfillmentStatus;
	latestEventByType: Map<TrackingEventType, LatestEvent>;
}): AdminTrackingJourneyOutcome | null {
	if (status === "dropped") {
		return outcomeOf("dropped", latestEventByType.get("cartItemRemoved"));
	}

	const cancelled = latestEventByType.get("cartItemCancelled");
	if (status === "cancelled" || cancelled) {
		return outcomeOf("cancelled", cancelled);
	}

	// A resolved roll over derives `cancelled` (ADR 0005) without the request ever
	// being cancelled, so the terminal badge would otherwise sit above a journey
	// with no outcome at all. Runs after the branch above so a genuine cancellation
	// still wins.
	const rollOverResolved = latestEventByType.get("rollOverResolved");
	if (fulfillmentStatus === "cancelled" && rollOverResolved) {
		return outcomeOf("resolved", rollOverResolved);
	}

	const exception = latestEventByType.get("fulfillmentException");
	if (exception) {
		const resolved = latestEventByType.get("exceptionResolved");
		if (!resolved || resolved.order < exception.order) {
			return outcomeOf("exception", exception);
		}
	}

	if (fulfillmentStatus === "rolledOver") {
		return outcomeOf("rolledOver", latestRollover(latestEventByType));
	}

	if (fulfillmentStatus === "partiallyRolledOver") {
		return outcomeOf("partiallyRolledOver", latestRollover(latestEventByType));
	}

	return null;
}

function latestRollover(
	latestEventByType: Map<TrackingEventType, LatestEvent>,
) {
	const pre = latestEventByType.get("rolledOverPreAllocation");
	const post = latestEventByType.get("rolledOverPostAllocation");
	if (!pre) return post;
	if (!post) return pre;
	return post.order > pre.order ? post : pre;
}
