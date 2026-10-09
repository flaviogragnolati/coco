import { expect, test } from "vitest";

import { Prisma } from "~/prisma/client";
import { orderDeliveryUpdateData } from "./user-order.data";

test("a pickup override clears both address snapshots as SQL NULL", () => {
	const data = orderDeliveryUpdateData({
		deliveryPreference: "pickupPoint",
		pickupPointId: 3,
		pickupPointSnapshot: { source: "admin", pickupPoint: { id: 3 } },
		shippingAddressSnapshot: null,
	});

	expect(data.shippingAddressSnapshot).toBe(Prisma.DbNull);
	expect(data.billingAddressSnapshot).toBe(Prisma.DbNull);
	expect(data.pickupPointSnapshot).toEqual({
		source: "admin",
		pickupPoint: { id: 3 },
	});
});

test("a home override clears the point and mirrors billing from shipping", () => {
	const address = { source: "admin", address: { line1: "Maipú 50" } };
	const data = orderDeliveryUpdateData({
		deliveryPreference: "homeDelivery",
		pickupPointId: null,
		pickupPointSnapshot: null,
		shippingAddressSnapshot: address,
	});

	expect(data.pickupPointId).toBeNull();
	expect(data.pickupPointSnapshot).toBe(Prisma.DbNull);
	expect(data.shippingAddressSnapshot).toEqual(address);
	expect(data.billingAddressSnapshot).toEqual(address);
});
