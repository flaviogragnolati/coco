import { expect, test } from "vitest";

import type { UserOrderItemTimeline } from "~/shared/common/tracking.types";
import {
	type UserTrackingStageKey,
	userTrackingStageDefinitions,
} from "~/shared/common/tracking-display";
import {
	buildCustomerOrderJourneyView,
	buildOrderLineStages,
	type CustomerOrderJourneyItemInput,
	summarizeOrderJourney,
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
		"En viaje",
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

test("timelines with every stage pending and no notices yield the empty mode", () => {
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

	expect(view).toStrictEqual({ mode: "empty" });
});

test("one item on the first stage leaves the empty mode", () => {
	const view = buildCustomerOrderJourneyView([
		makeItem({
			cartItemId: 1,
			timeline: makeTimeline({ cartItemId: 1, currentStage: "submitted" }),
		}),
	]);

	expect(view.mode).toBe("unified");
});

test("a notice before any stage still renders the journey", () => {
	const view = buildCustomerOrderJourneyView([
		makeItem({
			cartItemId: 1,
			timeline: makeTimeline({
				cartItemId: 1,
				currentStage: null,
				notices: [
					{
						eventType: "rolledOverPreAllocation",
						kind: "rollover",
						label: "Reprogramado",
						createdAt: "2026-03-02T10:00:00.000Z",
					},
				],
			}),
		}),
	]);

	expect(view.mode).toBe("unified");
});

test("notice views carry the reason", () => {
	const view = buildCustomerOrderJourneyView([
		makeItem({
			cartItemId: 1,
			timeline: makeTimeline({
				cartItemId: 1,
				currentStage: "shipping",
				notices: [
					{
						eventType: "fulfillmentException",
						kind: "exception",
						label: "Incidencia de fulfillment",
						reason: "Demora del transporte",
						createdAt: "2026-03-02T10:00:00.000Z",
					},
				],
			}),
		}),
	]);

	expect(view.mode).toBe("unified");
	if (view.mode !== "unified") return;
	expect(view.notices[0]?.reason).toBe("Demora del transporte");
});

test("a delivery change notice keeps both its change line and the admin reason", () => {
	const view = buildCustomerOrderJourneyView([
		makeItem({
			cartItemId: 1,
			timeline: makeTimeline({
				cartItemId: 1,
				currentStage: "preparation",
				notices: [
					{
						eventType: "deliveryPreferenceChanged",
						kind: "info",
						label: "Cambiamos tu entrega",
						detail: "A domicilio → Punto de retiro · Centro",
						reason: "La dirección queda fuera de la zona de reparto.",
						createdAt: "2026-03-02T10:00:00.000Z",
					},
				],
			}),
		}),
	]);

	expect(view.mode).toBe("unified");
	if (view.mode !== "unified") return;
	expect(view.notices[0]).toMatchObject({
		label: "Cambiamos tu entrega",
		detail: "A domicilio → Punto de retiro · Centro",
		reason: "La dirección queda fuera de la zona de reparto.",
	});
});

const cancelledNotices: UserOrderItemTimeline["notices"] = [
	{
		eventType: "cartItemCancelled",
		kind: "cancelled",
		label: "Producto cancelado",
		createdAt: "2026-03-03T10:00:00.000Z",
	},
];

function at(cartItemId: number, currentStage: UserTrackingStageKey | null) {
	return makeItem({
		cartItemId,
		timeline: makeTimeline({ cartItemId, currentStage }),
	});
}

test("before any stage every line waits for the payment", () => {
	const items = [at(1, null), at(2, null)];

	expect(buildOrderLineStages(items)).toStrictEqual([
		{
			cartItemId: 1,
			stageLabel: "Esperando el pago",
			tone: "waiting",
			notices: [],
		},
		{
			cartItemId: 2,
			stageLabel: "Esperando el pago",
			tone: "waiting",
			notices: [],
		},
	]);
	expect(
		summarizeOrderJourney(buildCustomerOrderJourneyView(items)),
	).toMatchObject({ caption: null, delivered: false });
});

test("each line carries its own stage and its own notices, without a product prefix", () => {
	const rolledOver = makeItem({
		cartItemId: 2,
		timeline: makeTimeline({
			cartItemId: 2,
			currentStage: "preparation",
			notices: [
				{
					eventType: "rolledOverPreAllocation",
					kind: "rollover",
					label: "Reprogramado",
					createdAt: "2026-03-02T10:00:00.000Z",
				},
			],
		}),
	});
	const items = [at(1, "shipping"), rolledOver];

	const lines = buildOrderLineStages(items);

	expect(lines.map(({ stageLabel, tone }) => [stageLabel, tone])).toStrictEqual(
		[
			["En viaje", "active"],
			["Preparación", "active"],
		],
	);
	expect(lines[1]?.notices.map((notice) => notice.label)).toStrictEqual([
		"Reprogramado",
	]);
});

test("a delivered line and a cancelled line say so", () => {
	const cancelled = makeItem({
		cartItemId: 2,
		timeline: makeTimeline({
			cartItemId: 2,
			currentStage: "preparation",
			notices: cancelledNotices,
		}),
	});

	expect(
		buildOrderLineStages([at(1, "delivery"), cancelled]).map(
			({ stageLabel, tone }) => [stageLabel, tone],
		),
	).toStrictEqual([
		["Entregado", "delivered"],
		["Cancelado", "cancelled"],
	]);
});

test("a unified order shows its stage and what it means", () => {
	const summary = summarizeOrderJourney(
		buildCustomerOrderJourneyView([at(1, "supplier"), at(2, "supplier")]),
	);

	expect(summary.caption).toBe("Etapa 3 de 6");
	expect(summary.stages.map((stage) => stage.status)).toStrictEqual([
		"completed",
		"completed",
		"current",
		"pending",
		"pending",
		"pending",
	]);
	expect(summary.delivered).toBe(false);
});

test("a delivered order reads as finished", () => {
	const summary = summarizeOrderJourney(
		buildCustomerOrderJourneyView([at(1, "delivery"), at(2, "delivery")]),
	);

	expect(summary.delivered).toBe(true);
	expect(summary.caption).toBeNull();
	expect(summary.stages.every((stage) => stage.status === "completed")).toBe(
		true,
	);
});

test("a split order follows the stage most products share", () => {
	const summary = summarizeOrderJourney(
		buildCustomerOrderJourneyView([
			at(1, "shipping"),
			at(2, "shipping"),
			at(3, "shipping"),
			at(4, "preparation"),
		]),
	);

	expect(summary.caption).toBe("En viaje · 3 de 4 productos");
	expect(summary.stages.find((stage) => stage.status === "current")?.key).toBe(
		"shipping",
	);
});

test("on a tie the split order follows the furthest stage", () => {
	const summary = summarizeOrderJourney(
		buildCustomerOrderJourneyView([at(1, "preparation"), at(2, "packaging")]),
	);

	expect(summary.caption).toBe("Empaque · 1 de 2 productos");
});

test("cancelled products do not lead the track", () => {
	const cancelled = (cartItemId: number) =>
		makeItem({
			cartItemId,
			timeline: makeTimeline({
				cartItemId,
				currentStage: "preparation",
				notices: cancelledNotices,
			}),
		});
	const summary = summarizeOrderJourney(
		buildCustomerOrderJourneyView([
			cancelled(1),
			cancelled(2),
			at(3, "shipping"),
		]),
	);

	expect(summary.caption).toBe("En viaje · 1 de 3 productos");
});

test("an order is delivered only when every product still in it is", () => {
	const summary = summarizeOrderJourney(
		buildCustomerOrderJourneyView([
			at(1, "delivery"),
			at(2, "delivery"),
			at(3, "shipping"),
		]),
	);

	expect(summary.caption).toBe("Entregado · 2 de 3 productos");
	expect(summary.delivered).toBe(false);
});

test("a journey with every stage done reads as delivered", () => {
	const allDone = makeItem({
		cartItemId: 1,
		timeline: {
			...makeTimeline({ cartItemId: 1, currentStage: "delivery" }),
			stages: makeTimeline({
				cartItemId: 1,
				currentStage: "delivery",
			}).stages.map((stage) => ({ ...stage, status: "completed" as const })),
		},
	});

	expect(buildOrderLineStages([allDone])[0]).toMatchObject({
		stageLabel: "Entregado",
		tone: "delivered",
	});
	expect(
		summarizeOrderJourney(buildCustomerOrderJourneyView([allDone])).delivered,
	).toBe(true);
});
