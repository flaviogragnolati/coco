import { describe, expect, it } from "vitest";

import type { TrackingEventType } from "./tracking-display";
import {
	type AdminTrackingJourney,
	buildAdminTrackingJourney,
	type TrackingJourneyCartItemStatus,
	type TrackingJourneyFulfillmentStatus,
} from "./tracking-journey";

let clock = 0;

/** Events are consumed in the order given; timestamps only need to be ascending. */
function event(eventType: TrackingEventType, quantity?: string) {
	clock += 1;
	return {
		eventType,
		quantity,
		createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, clock)).toISOString(),
	};
}

function build({
	status = "submitted",
	fulfillmentStatus = "awaitingAggregation",
	events = [],
}: {
	status?: TrackingJourneyCartItemStatus;
	fulfillmentStatus?: TrackingJourneyFulfillmentStatus;
	events?: ReturnType<typeof event>[];
} = {}): AdminTrackingJourney {
	return buildAdminTrackingJourney({ status, fulfillmentStatus, events });
}

function statusOf(journey: AdminTrackingJourney, key: string) {
	return journey.stages.find((stage) => stage.key === key)?.status;
}

describe("buildAdminTrackingJourney", () => {
	it("leaves every stage pending when there are no events", () => {
		const journey = build({ status: "inCart" });

		expect(journey.stages).toHaveLength(10);
		expect(journey.stages.every((stage) => stage.status === "pending")).toBe(
			true,
		);
		expect(journey.currentStageKey).toBeNull();
		expect(journey.outcome).toBeNull();
		expect(journey.notices).toEqual([]);
	});

	it("marks reached stages completed and the last one current", () => {
		const journey = build({
			fulfillmentStatus: "allocatedToSupplierItem",
			events: [
				event("submittedToOrder"),
				event("includedInOperation"),
				event("allocatedToLotItem"),
			],
		});

		expect(statusOf(journey, "awaitingAggregation")).toBe("completed");
		expect(statusOf(journey, "includedInOperation")).toBe("completed");
		expect(statusOf(journey, "allocatedToSupplierItem")).toBe("current");
		expect(statusOf(journey, "requestedFromSupplier")).toBe("pending");
		expect(statusOf(journey, "delivered")).toBe("pending");
		expect(journey.currentStageKey).toBe("allocatedToSupplierItem");
	});

	it("marks stages without their own event as skipped", () => {
		const journey = build({
			fulfillmentStatus: "packaged",
			events: [event("submittedToOrder"), event("packaged")],
		});

		expect(statusOf(journey, "awaitingAggregation")).toBe("completed");
		expect(statusOf(journey, "includedInOperation")).toBe("skipped");
		expect(statusOf(journey, "allocatedToSupplierItem")).toBe("skipped");
		expect(statusOf(journey, "requestedFromSupplier")).toBe("skipped");
		expect(statusOf(journey, "supplierConfirmed")).toBe("skipped");
		expect(statusOf(journey, "packaged")).toBe("current");
	});

	it("attaches a post-allocation rollover to the stage current at that moment", () => {
		const journey = build({
			fulfillmentStatus: "rolledOver",
			events: [
				event("submittedToOrder"),
				event("includedInOperation"),
				event("allocatedToLotItem"),
				event("rolledOverPostAllocation", "3"),
			],
		});

		const notice = journey.notices.at(0);
		expect(journey.notices).toHaveLength(1);
		expect(notice).toMatchObject({
			eventType: "rolledOverPostAllocation",
			kind: "rollover",
			stageKey: "allocatedToSupplierItem",
			quantity: "3",
		});
		expect(
			journey.stages.find((stage) => stage.key === "allocatedToSupplierItem")
				?.warning,
		).toBe(true);
		expect(
			journey.stages.find((stage) => stage.key === "includedInOperation")
				?.warning,
		).toBe(false);
		expect(journey.outcome).toMatchObject({ kind: "rolledOver" });
	});

	it("freezes the journey and reports a cancelled outcome", () => {
		const journey = build({
			status: "cancelled",
			fulfillmentStatus: "cancelled",
			events: [
				event("submittedToOrder"),
				event("includedInOperation"),
				event("cartItemCancelled"),
			],
		});

		expect(journey.currentStageKey).toBe("includedInOperation");
		expect(statusOf(journey, "allocatedToSupplierItem")).toBe("pending");
		expect(journey.outcome).toMatchObject({
			kind: "cancelled",
			label: "Item cancelado",
		});
		expect(journey.outcome?.createdAt).toBeDefined();
	});

	it("clears the outcome once an exception is resolved but keeps both notices", () => {
		const journey = build({
			fulfillmentStatus: "supplierConfirmed",
			events: [
				event("submittedToOrder"),
				event("fulfillmentException"),
				event("exceptionResolved"),
			],
		});

		expect(journey.outcome).toBeNull();
		expect(journey.notices.map((notice) => notice.kind)).toEqual([
			"exception",
			"resolved",
		]);
		expect(
			journey.stages.find((stage) => stage.key === "awaitingAggregation")
				?.warning,
		).toBe(true);
	});

	it("reports an exception outcome while it stays unresolved", () => {
		const journey = build({
			fulfillmentStatus: "exception",
			events: [event("submittedToOrder"), event("fulfillmentException")],
		});

		expect(journey.outcome).toMatchObject({
			kind: "exception",
			label: "Con incidencia activa",
		});
	});

	it("treats a quantity change as an informative notice without warning", () => {
		const journey = build({
			events: [
				event("submittedToOrder"),
				event("cartItemQuantityChanged", "5"),
			],
		});

		expect(journey.notices.at(0)).toMatchObject({
			kind: "quantity",
			stageKey: "awaitingAggregation",
			quantity: "5",
		});
		expect(journey.stages.every((stage) => !stage.warning)).toBe(true);
	});

	it("leaves the stage of a notice null when no stage was reached yet", () => {
		const journey = build({
			status: "inCart",
			events: [event("cartItemQuantityChanged", "2")],
		});

		expect(journey.notices.at(0)?.stageKey).toBeNull();
		expect(journey.currentStageKey).toBeNull();
	});

	it("prioritises the dropped outcome over a rollover", () => {
		const journey = build({
			status: "dropped",
			fulfillmentStatus: "rolledOver",
			events: [
				event("submittedToOrder"),
				event("rolledOverPreAllocation"),
				event("cartItemRemoved"),
			],
		});

		expect(journey.outcome).toMatchObject({
			kind: "dropped",
			label: "Item eliminado del carrito",
		});
	});
});
