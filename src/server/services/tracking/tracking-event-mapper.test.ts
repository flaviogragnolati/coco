import { expect, test, vi } from "vitest";

import { domainEventSchema } from "~/schemas/domain-events.schemas";
import { mapDomainEventToTrackingCommands } from "./tracking-event-mapper";

vi.mock("server-only", () => ({}));

test("a delivery change becomes one admin tracking event per order item", () => {
	const event = domainEventSchema.parse({
		type: "userOrder.deliveryPreferenceChanged",
		eventKey:
			"admin:userOrder:7:deliveryPreferenceChanged:2026-10-09T12:00:00.000Z",
		aggregateType: "UserOrder",
		aggregateId: "7",
		actor: { source: "admin", actorId: "admin-1", actorReference: "Admin" },
		payload: {
			orderId: "7",
			cartItemIds: ["21", "22"],
			before: { mode: "homeDelivery" },
			after: { mode: "pickupPoint", pickupPointName: "Centro" },
			reason: "La dirección queda fuera de la zona de reparto.",
		},
	});

	const commands = mapDomainEventToTrackingCommands(event);

	expect(commands.map((command) => command.cartItemId)).toEqual(["21", "22"]);
	expect(new Set(commands.map((command) => command.eventKey)).size).toBe(2);
	expect(commands[0]).toMatchObject({
		eventType: "deliveryPreferenceChanged",
		source: "admin",
		actorId: "admin-1",
		refs: { orderId: "7" },
		metadata: {
			reason: "La dirección queda fuera de la zona de reparto.",
			before: { mode: "homeDelivery" },
			after: { mode: "pickupPoint", pickupPointName: "Centro" },
		},
	});
});

test("a delivery change event needs at least one item and a reason", () => {
	const base = {
		type: "userOrder.deliveryPreferenceChanged",
		eventKey: "k",
		aggregateType: "UserOrder",
		aggregateId: "7",
		payload: {
			orderId: "7",
			cartItemIds: ["21"],
			before: { mode: null },
			after: { mode: "homeDelivery" },
			reason: "Motivo",
		},
	};

	expect(domainEventSchema.safeParse(base).success).toBe(true);
	expect(
		domainEventSchema.safeParse({
			...base,
			payload: { ...base.payload, cartItemIds: [] },
		}).success,
	).toBe(false);
	expect(
		domainEventSchema.safeParse({
			...base,
			payload: { ...base.payload, reason: "" },
		}).success,
	).toBe(false);
});
