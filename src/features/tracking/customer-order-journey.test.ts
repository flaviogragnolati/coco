import { expect, test } from "vitest";

import type { UserOrderItemTimeline } from "~/shared/common/tracking.types";
import {
	type UserTrackingStageKey,
	userTrackingStageDefinitions,
} from "~/shared/common/tracking-display";
import {
	buildCustomerOrderJourneyView,
	type CustomerOrderJourneyItemInput,
} from "./customer-order-journey";

/**
 * Timeline shaped like the server fold: every stage before `current` is
 * completed, `current` carries the timestamp, the rest stay pending.
 */
function makeTimeline({
	cartItemId,
	currentStage,
	createdAt = "2026-03-01T10:00:00.000Z",
	notices = [],
}: {
	cartItemId: number;
	currentStage: UserTrackingStageKey | null;
	createdAt?: string;
	notices?: UserOrderItemTimeline["notices"];
}): UserOrderItemTimeline {
	const currentIndex = currentStage
		? userTrackingStageDefinitions.findIndex(
				(stage) => stage.key === currentStage,
			)
		: -1;

	return {
		cartItemId,
		stages: userTrackingStageDefinitions.map((stage, index) => ({
			key: stage.key,
			label: stage.label,
			description: stage.description,
			status:
				currentIndex < 0
					? ("pending" as const)
					: index < currentIndex
						? ("completed" as const)
						: index === currentIndex
							? ("current" as const)
							: ("pending" as const),
			createdAt:
				currentIndex >= 0 && index <= currentIndex ? createdAt : undefined,
		})),
		notices,
	};
}

function makeItem(
	overrides: Partial<CustomerOrderJourneyItemInput> & { cartItemId: number },
): CustomerOrderJourneyItemInput {
	return {
		productName: `Producto ${overrides.cartItemId}`,
		quantityLabel: "1 unidad",
		timeline: makeTimeline({
			cartItemId: overrides.cartItemId,
			currentStage: "preparation",
		}),
		...overrides,
	};
}

test("no items at all yields the empty mode", () => {
	expect(buildCustomerOrderJourneyView([])).toStrictEqual({ mode: "empty" });
});

test("items without any timeline yield the empty mode", () => {
	const view = buildCustomerOrderJourneyView([
		makeItem({ cartItemId: 1, timeline: undefined }),
		makeItem({ cartItemId: 2, timeline: undefined }),
	]);
	expect(view.mode).toBe("empty");
});

test("a single item collapses into the unified journey", () => {
	const view = buildCustomerOrderJourneyView([makeItem({ cartItemId: 1 })]);

	expect(view.mode).toBe("unified");
	if (view.mode !== "unified") return;
	expect(view.stages).toHaveLength(userTrackingStageDefinitions.length);
	expect(
		view.stages.filter((stage) => stage.status === "current"),
	).toHaveLength(1);
	expect(view.stages.every((stage) => stage.warning === false)).toBe(true);
	expect(view.cancelled).toBe(false);
});

test("two items on the same stage unify, keeping the newest timestamp per stage", () => {
	const view = buildCustomerOrderJourneyView([
		makeItem({
			cartItemId: 1,
			timeline: makeTimeline({
				cartItemId: 1,
				currentStage: "preparation",
				createdAt: "2026-03-01T10:00:00.000Z",
			}),
		}),
		makeItem({
			cartItemId: 2,
			timeline: makeTimeline({
				cartItemId: 2,
				currentStage: "preparation",
				createdAt: "2026-03-04T10:00:00.000Z",
			}),
		}),
	]);

	expect(view.mode).toBe("unified");
	if (view.mode !== "unified") return;
	expect(view.stages[1]?.status).toBe("current");
	expect(view.stages[1]?.timestamp).toBe("2026-03-04T10:00:00.000Z");
});

test("unified notices are prefixed by product and sorted by date", () => {
	const view = buildCustomerOrderJourneyView([
		makeItem({
			cartItemId: 1,
			productName: "Yerba",
			timeline: makeTimeline({
				cartItemId: 1,
				currentStage: "preparation",
				notices: [
					{
						eventType: "fulfillmentException",
						kind: "exception",
						label: "Incidencia de fulfillment",
						createdAt: "2026-03-05T10:00:00.000Z",
					},
				],
			}),
		}),
		makeItem({
			cartItemId: 2,
			productName: "Azúcar",
			timeline: makeTimeline({
				cartItemId: 2,
				currentStage: "preparation",
				notices: [
					{
						eventType: "cartItemQuantityChanged",
						kind: "quantity",
						label: "Cantidad actualizada",
						quantity: "3",
						createdAt: "2026-03-02T10:00:00.000Z",
					},
				],
			}),
		}),
	]);

	expect(view.mode).toBe("unified");
	if (view.mode !== "unified") return;
	expect(view.notices.map((notice) => notice.label)).toStrictEqual([
		"Azúcar: Cantidad actualizada (3)",
		"Yerba: Incidencia de fulfillment",
	]);
});

test("a single item's notices are not prefixed", () => {
	const view = buildCustomerOrderJourneyView([
		makeItem({
			cartItemId: 1,
			productName: "Yerba",
			timeline: makeTimeline({
				cartItemId: 1,
				currentStage: "supplier",
				notices: [
					{
						eventType: "fulfillmentException",
						kind: "exception",
						label: "Incidencia de fulfillment",
						createdAt: "2026-03-05T10:00:00.000Z",
					},
				],
			}),
		}),
	]);

	expect(view.mode).toBe("unified");
	if (view.mode !== "unified") return;
	expect(view.notices[0]?.label).toBe("Incidencia de fulfillment");
});

test("items on different stages unfold into per-item journeys", () => {
	const view = buildCustomerOrderJourneyView([
		makeItem({ cartItemId: 1 }),
		makeItem({
			cartItemId: 2,
			timeline: makeTimeline({ cartItemId: 2, currentStage: "shipping" }),
		}),
	]);

	expect(view.mode).toBe("perItem");
	if (view.mode !== "perItem") return;
	expect(view.items.map((item) => item.currentStageLabel)).toStrictEqual([
		"Preparación",
		"Envío",
	]);
});

test("one cancelled item next to an active one unfolds", () => {
	const cancelledNotice: UserOrderItemTimeline["notices"] = [
		{
			eventType: "cartItemCancelled",
			kind: "cancelled",
			label: "Producto cancelado",
			createdAt: "2026-03-03T10:00:00.000Z",
		},
	];

	const view = buildCustomerOrderJourneyView([
		makeItem({ cartItemId: 1 }),
		makeItem({
			cartItemId: 2,
			timeline: makeTimeline({
				cartItemId: 2,
				currentStage: "preparation",
				notices: cancelledNotice,
			}),
		}),
	]);

	expect(view.mode).toBe("perItem");
	if (view.mode !== "perItem") return;
	expect(view.items.map((item) => item.cancelled)).toStrictEqual([false, true]);
});

test("every item cancelled on the same stage stays unified and flags cancellation", () => {
	const notices: UserOrderItemTimeline["notices"] = [
		{
			eventType: "cartItemCancelled",
			kind: "cancelled",
			label: "Producto cancelado",
			createdAt: "2026-03-03T10:00:00.000Z",
		},
	];

	const view = buildCustomerOrderJourneyView([
		makeItem({
			cartItemId: 1,
			timeline: makeTimeline({
				cartItemId: 1,
				currentStage: "preparation",
				notices,
			}),
		}),
		makeItem({
			cartItemId: 2,
			timeline: makeTimeline({
				cartItemId: 2,
				currentStage: "preparation",
				notices,
			}),
		}),
	]);

	expect(view.mode).toBe("unified");
	if (view.mode !== "unified") return;
	expect(view.cancelled).toBe(true);
});

test("an item with events and one without unfold (no events = nothing reached)", () => {
	const view = buildCustomerOrderJourneyView([
		makeItem({ cartItemId: 1 }),
		makeItem({ cartItemId: 2, timeline: undefined }),
	]);

	expect(view.mode).toBe("perItem");
	if (view.mode !== "perItem") return;
	expect(view.items[1]?.currentStageLabel).toBe(null);
	expect(
		view.items[1]?.stages.every((stage) => stage.status === "pending"),
	).toBe(true);
});

test("items whose timelines have no events at all unify as fully pending", () => {
	const view = buildCustomerOrderJourneyView([
		makeItem({
			cartItemId: 1,
			timeline: makeTimeline({ cartItemId: 1, currentStage: null }),
		}),
		makeItem({
			cartItemId: 2,
			timeline: makeTimeline({ cartItemId: 2, currentStage: null }),
		}),
	]);

	expect(view.mode).toBe("unified");
	if (view.mode !== "unified") return;
	expect(view.stages.every((stage) => stage.status === "pending")).toBe(true);
	expect(view.stages.every((stage) => stage.timestamp === undefined)).toBe(
		true,
	);
});
