import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("~/server/events/domain-event-dispatcher", () => ({
	DomainEventDispatcher: { wake: vi.fn() },
}));
vi.mock("~/server/services/admin/_base/admin-audit", () => ({
	writeAdminAuditLog: vi.fn(),
}));
vi.mock("./package.data", async (importOriginal) => ({
	...(await importOriginal<typeof import("./package.data")>()),
	findPackagesForShipmentAssignment: vi.fn(),
	reassignPackagesToShipment: vi.fn(),
}));
vi.mock("./order-delivery.data", () => ({
	findLiveOrderDeliveriesByCartIds: vi.fn(),
	lockLiveOrdersOfCarts: vi.fn(),
}));
vi.mock("./pickup-point.data", () => ({ findPickupPointById: vi.fn() }));
vi.mock("./shipment.data", async (importOriginal) => ({
	...(await importOriginal<typeof import("./shipment.data")>()),
	createShipment: vi.fn(),
	findShipmentById: vi.fn(),
	findShipmentForCommand: vi.fn(),
}));

import type { OrderDelivery } from "./order-delivery";
import * as orderDeliveryData from "./order-delivery.data";
import * as packageData from "./package.data";
import * as pickupPointData from "./pickup-point.data";
import * as shipmentData from "./shipment.data";
import { addPackages, createEndUser } from "./shipment.service";

const actor = { id: "admin-1", name: "Admin", role: "admin" as const };
const stop = new Error("detail not under test");

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
	active: false,
	deleted: false,
};

function outboundPackage(id: number, cartId: number) {
	return {
		id,
		name: `PKG-${id}`,
		status: "readyForShipment",
		leg: "outbound",
		shipmentId: null,
		packageLotItems: [
			{
				id: id * 10,
				status: "packed",
				packageAllocations: [{ cartItemLotItem: { cartItem: { cartId } } }],
			},
		],
	} as unknown as packageData.PackageAssignmentRecord;
}

function order(
	cartId: number,
	overrides: Partial<OrderDelivery> = {},
): OrderDelivery {
	return {
		cartId,
		orderId: cartId * 10,
		orderCode: `ORD-${cartId}`,
		status: "processing",
		customerName: "Ana",
		customerEmail: "ana@example.com",
		deliveryPreference: "pickupPoint",
		pickupPointId: 3,
		pickupPointName: "Centro",
		pickupPointActive: false,
		shippingAddressSnapshot: null,
		...overrides,
	};
}

const tx = {};
const database = {
	$transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
} as unknown as Parameters<typeof createEndUser>[2];

function withOrders(orders: OrderDelivery[]) {
	vi.mocked(
		orderDeliveryData.findLiveOrderDeliveriesByCartIds,
	).mockResolvedValue(new Map(orders.map((item) => [item.cartId, item])));
}

const pickupInput = {
	name: "Retiro Centro",
	internalCode: "SHIP-1",
	trackingCode: undefined,
	deliveryMode: "pickupPoint" as const,
	pickupPointId: 3,
	packageIds: [1],
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(pickupPointData.findPickupPointById).mockResolvedValue(centro);
	vi.mocked(shipmentData.createShipment).mockResolvedValue({
		id: 99,
		internalCode: "SHIP-1",
	});
	vi.mocked(shipmentData.findShipmentById).mockRejectedValue(stop);
});

describe("createEndUser follows the customer's delivery preference", () => {
	it("records the point and derives the destination from it, even when inactive", async () => {
		vi.mocked(packageData.findPackagesForShipmentAssignment).mockResolvedValue([
			outboundPackage(1, 5),
		]);
		withOrders([order(5)]);

		await expect(createEndUser(pickupInput, actor, database)).rejects.toBe(
			stop,
		);

		expect(orderDeliveryData.lockLiveOrdersOfCarts).toHaveBeenCalledWith(
			tx,
			[5],
		);
		expect(shipmentData.createShipment).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				deliveryMode: "pickupPoint",
				pickupPointId: 3,
				destinationAddressSnapshot: expect.objectContaining({
					source: "shipment",
					pickupPoint: expect.objectContaining({ id: 3, name: "Centro" }),
				}),
				destinationContactSnapshot: null,
			}),
		);
	});

	it("refuses a package whose order chose home delivery", async () => {
		vi.mocked(packageData.findPackagesForShipmentAssignment).mockResolvedValue([
			outboundPackage(1, 5),
		]);
		withOrders([
			order(5, {
				deliveryPreference: "homeDelivery",
				pickupPointId: null,
				pickupPointName: null,
			}),
		]);

		await expect(createEndUser(pickupInput, actor, database)).rejects.toThrow(
			"El pedido ORD-5 eligió A domicilio; cambiá su entrega primero.",
		);
		expect(shipmentData.createShipment).not.toHaveBeenCalled();
	});

	it("refuses a package whose orders chose different deliveries", async () => {
		const shared = outboundPackage(1, 5);
		shared.packageLotItems.push({
			...shared.packageLotItems[0],
			packageAllocations: [{ cartItemLotItem: { cartItem: { cartId: 6 } } }],
		} as (typeof shared.packageLotItems)[number]);
		vi.mocked(packageData.findPackagesForShipmentAssignment).mockResolvedValue([
			shared,
		]);
		withOrders([
			order(5),
			order(6, { deliveryPreference: "homeDelivery", pickupPointId: null }),
		]);

		await expect(createEndUser(pickupInput, actor, database)).rejects.toThrow(
			"mezcla pedidos con entregas distintas",
		);
	});

	it("copies the customer's order address for a home delivery", async () => {
		vi.mocked(packageData.findPackagesForShipmentAssignment).mockResolvedValue([
			outboundPackage(1, 5),
		]);
		withOrders([
			order(5, {
				deliveryPreference: "homeDelivery",
				pickupPointId: null,
				pickupPointName: null,
				shippingAddressSnapshot: {
					address: { line1: "Maipú 50", city: "Ushuaia", state: "TDF" },
				},
			}),
		]);

		await expect(
			createEndUser(
				{
					...pickupInput,
					deliveryMode: "homeDelivery",
					pickupPointId: undefined,
				},
				actor,
				database,
			),
		).rejects.toBe(stop);

		expect(shipmentData.createShipment).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				pickupPointId: null,
				destinationAddressSnapshot: expect.objectContaining({
					source: "order",
					orderCode: "ORD-5",
				}),
				destinationContactSnapshot: { name: "Ana", email: "ana@example.com" },
			}),
		);
	});
});

describe("addPackages", () => {
	it("refuses chosen-delivery orders on a pickup shipment that has no point", async () => {
		vi.mocked(shipmentData.findShipmentForCommand).mockResolvedValue({
			id: 99,
			type: "endUserDelivery",
			deliveryMode: "pickupPoint",
			pickupPointId: null,
			status: "readyForDispatch",
			packages: [],
		} as unknown as Awaited<
			ReturnType<typeof shipmentData.findShipmentForCommand>
		>);
		vi.mocked(packageData.findPackagesForShipmentAssignment)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([outboundPackage(1, 5)]);
		withOrders([order(5)]);

		await expect(
			addPackages({ id: 99, packageIds: [1] }, actor, database),
		).rejects.toThrow("Este envio no tiene punto de retiro asignado");
	});
});
