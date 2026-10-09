import { describe, expect, it } from "vitest";

import {
	describeDeliveryChoice,
	describeOrderDelivery,
	formatAddressLine,
	formatOrderDelivery,
} from "./delivery-display";
import { buildPickupPointSnapshot } from "./pickup-point-snapshot";

const centro = {
	id: 3,
	name: "Centro",
	line1: "San Martín 100",
	line2: null,
	city: "Ushuaia",
	state: "Tierra del Fuego",
	postalCode: "9410",
	country: "AR",
	googleMapsUrl: "https://maps.example/centro",
	hours: "Lun a vie 10 a 18 h",
	instructions: "Tocá timbre.",
};

const addressSnapshot = {
	source: "checkout",
	capturedAt: "2026-10-09T12:00:00.000Z",
	address: {
		id: 1,
		line1: "Maipú 50",
		line2: "Depto 2",
		city: "Ushuaia",
		state: "Tierra del Fuego",
		postalCode: "9410",
		country: "AR",
	},
};

describe("describeOrderDelivery", () => {
	it("keeps a legacy order without a preference out of the new row", () => {
		expect(
			describeOrderDelivery({
				deliveryPreference: null,
				pickupPointSnapshot: null,
				shippingAddressSnapshot: addressSnapshot,
			}),
		).toBeNull();
	});

	it("reads a home delivery from the address snapshot", () => {
		const view = describeOrderDelivery({
			deliveryPreference: "homeDelivery",
			pickupPointSnapshot: null,
			shippingAddressSnapshot: addressSnapshot,
		});

		expect(view && formatOrderDelivery(view)).toBe(
			"A domicilio — Maipú 50, Depto 2 · Ushuaia, Tierra del Fuego 9410",
		);
	});

	it("reads a pickup point with its hours and instructions", () => {
		const view = describeOrderDelivery({
			deliveryPreference: "pickupPoint",
			pickupPointSnapshot: buildPickupPointSnapshot(centro, "checkout"),
			shippingAddressSnapshot: null,
		});

		expect(view && formatOrderDelivery(view)).toBe(
			"Punto de retiro — Centro, San Martín 100 · Ushuaia, Tierra del Fuego 9410 · Lun a vie 10 a 18 h",
		);
		expect(view).toMatchObject({
			instructions: "Tocá timbre.",
			googleMapsUrl: "https://maps.example/centro",
		});
	});
});

describe("describeDeliveryChoice", () => {
	it("names the point only for a pickup choice", () => {
		expect(describeDeliveryChoice({ mode: "homeDelivery" })).toBe(
			"A domicilio",
		);
		expect(
			describeDeliveryChoice({
				mode: "pickupPoint",
				pickupPointName: "Centro",
			}),
		).toBe("Punto de retiro · Centro");
		expect(describeDeliveryChoice({ mode: null })).toBe("Sin elección");
	});
});

it("formats an address without empty parts", () => {
	expect(
		formatAddressLine({ line1: "Maipú 50", city: "Ushuaia", state: "TDF" }),
	).toBe("Maipú 50 · Ushuaia, TDF");
});
