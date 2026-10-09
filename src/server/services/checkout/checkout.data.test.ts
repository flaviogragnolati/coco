import { expect, test, vi } from "vitest";

import { Prisma } from "~/prisma/client";

vi.mock("server-only", () => ({}));

const { deliveryColumnsData } = await import("./checkout.data");

test("a pickup order writes SQL NULL addresses, never JSON null", () => {
	const data = deliveryColumnsData({
		deliveryPreference: "pickupPoint",
		pickupPointId: 3,
		pickupPointSnapshot: {
			source: "checkout",
			capturedAt: "2026-10-09T12:00:00.000Z",
			pickupPoint: {
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
			},
		},
		shippingAddressSnapshot: null,
	});

	expect(data.shippingAddressSnapshot).toBe(Prisma.DbNull);
	expect(data.billingAddressSnapshot).toBe(Prisma.DbNull);
	expect(data.pickupPointId).toBe(3);
});

test("a home order clears the point and mirrors billing from shipping", () => {
	const shippingAddressSnapshot = {
		source: "checkout" as const,
		capturedAt: "2026-10-09T12:00:00.000Z",
		address: {
			id: 1,
			type: "shipping" as const,
			line1: "Maipú 50",
			line2: null,
			city: "Ushuaia",
			state: "Tierra del Fuego",
			postalCode: "9410",
			country: "AR",
			active: true,
		},
	};
	const data = deliveryColumnsData({
		deliveryPreference: "homeDelivery",
		pickupPointId: null,
		pickupPointSnapshot: null,
		shippingAddressSnapshot,
	});

	expect(data.pickupPointSnapshot).toBe(Prisma.DbNull);
	expect(data.shippingAddressSnapshot).toEqual(shippingAddressSnapshot);
	expect(data.billingAddressSnapshot).toEqual(shippingAddressSnapshot);
});
