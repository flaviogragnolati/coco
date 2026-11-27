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
	/** What changed, e.g. "A domicilio → Punto de retiro · Centro". */
	detail?: string;
	/** Admin-entered explanation; only exceptions, delivery changes and roll over creations carry one. */
	reason?: string;
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
		detail: notice.detail,
		reason: notice.reason,
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

/**
 * The server returns a timeline for every item, even one with no events, so the
 * presence of a timeline says nothing. A notice counts: a rollover can precede
 * any stage and must still render.
 */
function hasReachedAnyStage(timeline: UserOrderItemTimeline | undefined) {
	if (!timeline) return false;

	return (
		timeline.notices.length > 0 ||
		timeline.stages.some((stage) => stage.status !== "pending")
	);
}

export function buildCustomerOrderJourneyView(
	items: CustomerOrderJourneyItemInput[],
): CustomerOrderJourneyView {
	// Nothing happened yet (typically: payment not credited) — the caller shows a
	// hint instead of six empty circles.
	if (!items.some((item) => hasReachedAnyStage(item.timeline))) {
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

/** Index of the delivery stage: reaching it means the item was handed over. */
const DELIVERY_INDEX = userTrackingStageDefinitions.findIndex(
	(stage) => stage.key === "delivery",
);
const STAGE_COUNT = userTrackingStageDefinitions.length;

export type CustomerOrderLineTone =
	| "waiting"
	| "active"
	| "delivered"
	| "cancelled";

/** One product of the order with where it is and what happened to it. */
export type CustomerOrderLineStage = {
	cartItemId: number;
	stageLabel: string;
	tone: CustomerOrderLineTone;
	/** Its own notices, without the product prefix the unified view adds. */
	notices: CustomerJourneyNoticeView[];
};

/**
 * The stage chip and notices of each product. Read from each item's own
 * timeline, whatever the collapse rule decided, so every line says where it
 * is. Before any stage, every line is waiting for the payment.
 */
export function buildOrderLineStages(
	items: CustomerOrderJourneyItemInput[],
): CustomerOrderLineStage[] {
	const started = items.some((item) => hasReachedAnyStage(item.timeline));

	return items.map((item) => {
		if (!started) {
			return {
				cartItemId: item.cartItemId,
				stageLabel: "Esperando el pago",
				tone: "waiting",
				notices: [],
			};
		}

		const view = toItemView(item);
		const index = currentStageIndex(view.stages);
		const [stageLabel, tone]: [string, CustomerOrderLineTone] = view.cancelled
			? ["Cancelado", "cancelled"]
			: index === DELIVERY_INDEX
				? ["Entregado", "delivered"]
				: index >= 0
					? [view.currentStageLabel ?? "", "active"]
					: ["Sin novedades", "waiting"];

		return {
			cartItemId: item.cartItemId,
			stageLabel,
			tone,
			notices: view.notices,
		};
	});
}

export type CustomerOrderJourneySummary = {
	/** The one track the order page draws. */
	stages: TrackingJourneyStepperStage[];
	/** "Etapa 2 de 6 · …" or "En viaje · 3 de 4 productos"; null when there is nothing to add. */
	caption: string | null;
	/** Every product still in the order was handed over. */
	delivered: boolean;
};

/** A delivered track reads as finished: the delivery stage is done, not under way. */
function finishDelivered(stages: TrackingJourneyStepperStage[]) {
	const delivered = currentStageIndex(stages) === DELIVERY_INDEX;
	return {
		delivered,
		stages: delivered
			? stages.map((stage) => ({ ...stage, status: "completed" as const }))
			: stages,
	};
}

/**
 * One track for the whole order. When products are at different stages it
 * follows the stage most of them share (on a tie, the furthest one), leaving
 * cancelled products out, and the caption says how many are there.
 */
export function summarizeOrderJourney(
	view: CustomerOrderJourneyView,
): CustomerOrderJourneySummary {
	if (view.mode === "empty") {
		return { stages: pendingStages(), caption: null, delivered: false };
	}

	if (view.mode === "unified") {
		const { stages, delivered } = finishDelivered(view.stages);
		const index = currentStageIndex(stages);
		const current = index >= 0 ? stages[index] : undefined;
		return {
			stages,
			delivered,
			caption:
				view.cancelled || !current
					? null
					: [`Etapa ${index + 1} de ${STAGE_COUNT}`, current.description]
							.filter(Boolean)
							.join(" · "),
		};
	}

	const active = view.items.filter((item) => !item.cancelled);
	const byStage = new Map<number, CustomerItemJourneyView[]>();
	for (const item of active) {
		const index = currentStageIndex(item.stages);
		if (index < 0) continue;
		byStage.set(index, [...(byStage.get(index) ?? []), item]);
	}

	const [leadIndex, leaders] = Array.from(byStage).sort(
		([leftIndex, left], [rightIndex, right]) =>
			right.length - left.length || rightIndex - leftIndex,
	)[0] ?? [-1, []];
	const lead = leaders[0] ?? view.items[0];
	if (!lead)
		return { stages: pendingStages(), caption: null, delivered: false };

	const { stages, delivered } = finishDelivered(lead.stages);
	const label =
		leadIndex === DELIVERY_INDEX
			? "Entregado"
			: (userTrackingStageDefinitions[leadIndex]?.label ?? null);

	return {
		stages,
		// The whole order is delivered only when every product still in it is.
		delivered: delivered && leaders.length === active.length,
		caption: label
			? `${label} · ${leaders.length} de ${view.items.length} productos`
			: null,
	};
}
