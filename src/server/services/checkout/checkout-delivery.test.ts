import { expect, test } from "vitest";

import { resolveCheckoutDelivery } from "./checkout-delivery";

const capturedAt = new Date("2026-10-09T12:00:00.000Z");

const address = {
	id: 1,
	type: "shipping" as const,
	line1: "Maipú 50",
	line2: null,
	city: "Ushuaia",
	state: "Tierra del Fuego",
	postalCode: "9410",
	country: "AR",
	active: true,
};

const centro = {
	id: 3,
	name: "Centro",
	line1: "San Martín 100",
	line2: null,
	city: "Ushuaia",
	state: "Tierra del Fuego",
	postalCode: null,
	country: "AR",
	googleMapsUrl: null,
	hours: "Lun a vie 10 a 18 h",
	instructions: null,
};

test("home delivery snapshots the address and names no point", () => {
	expect(
		resolveCheckoutDelivery(
			{ delivery: { mode: "homeDelivery", shippingAddressId: 1 }, address },
			capturedAt,
		),
	).toEqual({
		deliveryPreference: "homeDelivery",
		pickupPointId: null,
		pickupPointSnapshot: null,
		shippingAddressSnapshot: {
			source: "checkout",
			capturedAt: capturedAt.toISOString(),
			address,
		},
	});
});

test("a pickup point snapshots the point and stores no address", () => {
	expect(
		resolveCheckoutDelivery(
			{
				delivery: { mode: "pickupPoint", pickupPointId: 3 },
				pickupPoint: centro,
			},
			capturedAt,
		),
	).toEqual({
		deliveryPreference: "pickupPoint",
		pickupPointId: 3,
		pickupPointSnapshot: {
			source: "checkout",
			capturedAt: capturedAt.toISOString(),
			pickupPoint: centro,
		},
		shippingAddressSnapshot: null,
	});
});
