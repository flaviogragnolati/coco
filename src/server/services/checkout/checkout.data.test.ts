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

test("completing a payment cancels only the order's other undeclared pending attempts", async () => {
	const { cancelOtherPendingAttempts } = await import("./checkout.data");
	const userTransaction = {
		findMany: vi.fn(async () => [{ id: 61 }, { id: 62 }]),
		updateMany: vi.fn(async () => ({ count: 2 })),
	};

	const ids = await cancelOtherPendingAttempts({ userTransaction } as never, {
		userOrderId: 70,
		keepTransactionId: 90,
	});

	const scope = {
		userOrderId: 70,
		status: "pending",
		providerPaymentId: null,
		declaredReceiptReference: null,
	};
	expect(ids).toEqual([61, 62]);
	expect(userTransaction.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: { ...scope, id: { not: 90 } },
		}),
	);
	expect(userTransaction.updateMany).toHaveBeenCalledWith({
		where: { ...scope, id: { in: [61, 62] } },
		data: { status: "cancelled", cancelledAt: expect.any(Date) },
	});
});

test("an attempt is cancelled for a switch only while still pending and undeclared", async () => {
	const { cancelAbandonableAttempt } = await import("./checkout.data");
	const userTransaction = { updateMany: vi.fn(async () => ({ count: 0 })) };

	await expect(
		cancelAbandonableAttempt({ userTransaction } as never, 61),
	).resolves.toBe(false);
	expect(userTransaction.updateMany).toHaveBeenCalledWith({
		where: {
			id: 61,
			status: "pending",
			providerPaymentId: null,
			declaredReceiptReference: null,
		},
		data: { status: "cancelled", cancelledAt: expect.any(Date) },
	});
});
