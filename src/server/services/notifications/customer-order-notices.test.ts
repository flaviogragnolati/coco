import { beforeEach, expect, test, vi } from "vitest";
import { Prisma } from "~/prisma/client";
import {
	enqueueCustomerEmail,
	isCustomerEmailEnabled,
} from "./customer-email.data";
import { notifyPickupArrival, notifyRollOvers } from "./customer-order-notices";
import { renderLogisticsNotice } from "./logistics-content";

vi.mock("./customer-email.data", () => ({
	enqueueCustomerEmail: vi.fn(),
	isCustomerEmailEnabled: vi.fn(() => true),
}));

function fixture() {
	const order = {
		code: "ORD-10",
		pickupPointSnapshot: null,
		shippingAddressSnapshot: { capturedAt: "now" },
		items: [
			{
				sourceCartItemId: 1,
				productSnapshot: { product: { name: "Nueces", unit: "kg" } },
				quantity: new Prisma.Decimal(3),
			},
		],
	};
	const data = {
		userOrderItem: {
			findMany: vi.fn(async () => [
				{ sourceCartItemId: 1, userOrderId: 10 },
				{ sourceCartItemId: 2, userOrderId: 20 },
			]),
		},
		userOrder: { findFirst: vi.fn(async () => order) },
		shipment: {
			findFirst: vi.fn(async () => ({
				packages: [{ id: 50 }],
				destinationAddressSnapshot: {
					label: "Punto Centro",
					line1: "Primera 200",
					city: "Ushuaia",
					state: "Tierra del Fuego",
				},
			})),
		},
		rollOver: {
			findMany: vi.fn(async () => [
				{ cartItemId: 1, quantity: new Prisma.Decimal(1) },
			]),
		},
	};
	return { data, tx: data as unknown as Prisma.TransactionClient };
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(isCustomerEmailEnabled).mockReturnValue(true);
});

test("a shared arrival groups each buyer's allocations by order including split packages", async () => {
	const { tx, data } = fixture();
	const lines = [
		{
			packageId: 50,
			packageLotItemId: 501,
			lotItemId: 51,
			allocations: [
				{ cartItemId: 1, cartId: 5, quantity: "1.25" },
				{ cartItemId: 2, cartId: 7, quantity: "1" },
			],
		},
		{
			packageId: 60,
			packageLotItemId: 601,
			lotItemId: 53,
			allocations: [{ cartItemId: 1, cartId: 5, quantity: "1.75" }],
		},
	];
	await notifyPickupArrival(tx, 81, lines);
	expect(data.userOrderItem.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				sourceCartItemId: { in: [1, 2] },
				userOrder: { status: "processing" },
			},
		}),
	);
	expect(enqueueCustomerEmail).toHaveBeenCalledTimes(2);
	expect(enqueueCustomerEmail).toHaveBeenCalledWith(tx, 10, "pickup/81/10", {
		kind: "pickup",
		shipmentId: 81,
		allocations: [
			{ cartItemId: 1, packageId: 50, quantity: "1.25" },
			{ cartItemId: 1, packageId: 60, quantity: "1.75" },
		],
	});
	expect(enqueueCustomerEmail).toHaveBeenCalledWith(tx, 20, "pickup/81/20", {
		kind: "pickup",
		shipmentId: 81,
		allocations: [{ cartItemId: 2, packageId: 50, quantity: "1" }],
	});
});

test("a collected package drops out of pickup quantities before dispatch", async () => {
	const { tx, data } = fixture();
	const notice = {
		kind: "pickup" as const,
		shipmentId: 81,
		allocations: [
			{ cartItemId: 1, packageId: 50, quantity: "1.25" },
			{ cartItemId: 1, packageId: 60, quantity: "1.75" },
			{ cartItemId: 2, packageId: 50, quantity: "10" },
		],
	};
	const partial = await renderLogisticsNotice(tx, 10, notice);
	expect(partial?.quantityKey).toBe("1:1.25");
	expect(partial?.title).toContain("parte de tu pedido ORD-10");
	expect(partial?.lines).toEqual([
		"Punto Centro",
		"Primera 200 · Ushuaia, Tierra del Fuego",
		"Nueces · 1,25 kg",
	]);
	expect(data.shipment.findFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				id: 81,
				type: "endUserDelivery",
				deliveryMode: "pickupPoint",
				status: "received",
			},
			select: expect.objectContaining({
				packages: expect.objectContaining({
					where: expect.objectContaining({
						status: "inTransit",
						leg: "outbound",
					}),
				}),
			}),
		}),
	);
	data.shipment.findFirst.mockResolvedValueOnce({
		packages: [],
		destinationAddressSnapshot: {
			label: "Punto Centro",
			line1: "Primera 200",
			city: "Ushuaia",
			state: "Tierra del Fuego",
		},
	});
	expect(await renderLogisticsNotice(tx, 10, notice)).toBeNull();
});

test("the rollover key survives reordering while separate cuts of the same order have distinct keys", async () => {
	const { tx } = fixture();
	const rows = [
		{ cartItemId: 1, rollOverId: 13 },
		{ cartItemId: 1, rollOverId: 11 },
	];
	await notifyRollOvers(tx, "supplierOrder", rows);
	await notifyRollOvers(tx, "supplierOrder", [...rows].reverse());
	await notifyRollOvers(tx, "supplierOrder", [
		{ cartItemId: 1, rollOverId: 14 },
	]);
	const calls = vi.mocked(enqueueCustomerEmail).mock.calls;
	expect(calls[0]).toEqual(calls[1]);
	expect(calls[0]?.[2]).not.toEqual(calls[2]?.[2]);
	expect(calls[0]?.[3]).toEqual({
		kind: "rollover",
		ids: [11, 13],
		cause: "supplierOrder",
	});
});

test("only outstanding rollover quantities remain in the email", async () => {
	const { tx, data } = fixture();
	const notice = {
		kind: "rollover" as const,
		ids: [10, 13],
		cause: "shipment" as const,
	};
	const content = await renderLogisticsNotice(tx, 10, notice);
	expect(data.rollOver.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: { id: { in: [10, 13] }, status: "open", cartItemId: { in: [1] } },
		}),
	);
	expect(content?.quantityKey).toBe("1:1");
	expect(content?.lines).toContain("Nueces · 1 kg");
	expect(content?.lines).toContain(
		"Llegó menos mercadería de la que pedimos al proveedor.",
	);
	data.rollOver.findMany.mockResolvedValueOnce([]);
	expect(await renderLogisticsNotice(tx, 10, notice)).toBeNull();
});

test("a superseded change of delivery cannot send an outdated location", async () => {
	const { tx } = fixture();
	const notice = {
		kind: "change" as const,
		capturedAt: "then",
		change: "A domicilio, en otra dirección",
		reason: "Nuevo domicilio solicitado",
	};
	expect(await renderLogisticsNotice(tx, 10, notice)).toBeNull();
	expect(
		await renderLogisticsNotice(tx, 10, { ...notice, capturedAt: "now" }),
	).toEqual({
		title: "Cambió la entrega de tu pedido ORD-10",
		lines: [notice.change, notice.reason],
	});
});

test("disabled email leaves logistics commands independent of queue reads", async () => {
	const { tx, data } = fixture();
	vi.mocked(isCustomerEmailEnabled).mockReturnValue(false);
	await notifyRollOvers(tx, "operation", [{ cartItemId: 1, rollOverId: 4 }]);
	expect(data.userOrderItem.findMany).not.toHaveBeenCalled();
	expect(enqueueCustomerEmail).not.toHaveBeenCalled();
});
