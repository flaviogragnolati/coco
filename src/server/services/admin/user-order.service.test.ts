import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./user-order.data", () => ({
	countPackagesBlockingDeliveryChange: vi.fn(),
	findOrderForDeliveryChange: vi.fn(),
	updateOrderDeliveryPreference: vi.fn(),
}));
vi.mock("./pickup-point.data", () => ({
	findPickupPointById: vi.fn(),
	listActivePickupPoints: vi.fn(),
}));
vi.mock("../checkout/checkout.data", () => ({
	findCheckoutAddressById: vi.fn(),
	listCheckoutAddresses: vi.fn(),
}));
vi.mock("./_base/admin-audit", () => ({ writeAdminAuditLog: vi.fn() }));
vi.mock("~/server/events/domain-event-publisher", () => ({
	DomainEventPublisher: { publish: vi.fn() },
}));
vi.mock("~/server/events/domain-event-dispatcher", () => ({
	DomainEventDispatcher: { wake: vi.fn() },
}));

import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import { buildPickupPointSnapshot } from "~/shared/common/pickup-point-snapshot";
import * as checkoutData from "../checkout/checkout.data";
import { writeAdminAuditLog } from "./_base/admin-audit";
import * as pickupPointData from "./pickup-point.data";
import * as data from "./user-order.data";
import {
	changeDeliveryPreference,
	deliveryChangeBlockedReason,
} from "./user-order.service";

const actor = { id: "admin-1", name: "Admin Uno", role: "admin" as const };
const reason = "La dirección queda fuera de la zona de reparto.";

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
	active: true,
	deleted: false,
};

const homeSnapshot = {
	source: "checkout",
	capturedAt: "2026-10-01T12:00:00.000Z",
	address: {
		id: 1,
		type: "shipping",
		line1: "Maipú 50",
		line2: null,
		city: "Ushuaia",
		state: "Tierra del Fuego",
		postalCode: "9410",
		country: "AR",
		active: true,
	},
};

function order(overrides: Partial<data.OrderDeliveryChangeRecord> = {}) {
	return {
		id: 7,
		code: "ORD-7",
		status: "processing",
		userId: "user-1",
		deliveryPreference: "homeDelivery",
		pickupPointId: null,
		pickupPointSnapshot: null,
		shippingAddressSnapshot: homeSnapshot,
		pickupPoint: null,
		items: [
			{ sourceCartItemId: 21, sourceCartItem: { status: "submitted" } },
			{ sourceCartItemId: 22, sourceCartItem: { status: "cancelled" } },
		],
		...overrides,
	} as data.OrderDeliveryChangeRecord;
}

function database() {
	const tx = {};
	return {
		tx,
		db: {
			$transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		} as unknown as Parameters<typeof changeDeliveryPreference>[2],
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(data.countPackagesBlockingDeliveryChange).mockResolvedValue(0);
	vi.mocked(data.updateOrderDeliveryPreference).mockImplementation(
		async (_tx, id, update) =>
			({
				...order(),
				id,
				...update,
			}) as data.OrderDeliveryChangeRecord,
	);
});

describe("deliveryChangeBlockedReason", () => {
	it("allows only paid orders in progress with no package on its way", () => {
		expect(deliveryChangeBlockedReason({ status: "processing" }, 0)).toBeNull();
		expect(deliveryChangeBlockedReason({ status: "pending" }, 0)).toMatch(
			/pedido pago/,
		);
		expect(deliveryChangeBlockedReason({ status: "completed" }, 0)).toMatch(
			/pedido pago/,
		);
		expect(deliveryChangeBlockedReason({ status: "processing" }, 1)).toMatch(
			/Quitalo del envío/,
		);
	});
});

describe("changeDeliveryPreference", () => {
	it("moves a home order to a pickup point, publishes the notice and audits the reason", async () => {
		vi.mocked(data.findOrderForDeliveryChange).mockResolvedValue(order());
		vi.mocked(pickupPointData.findPickupPointById).mockResolvedValue(centro);
		const { db, tx } = database();

		const result = await changeDeliveryPreference(
			{
				orderId: 7,
				delivery: { mode: "pickupPoint", pickupPointId: 3 },
				reason,
			},
			actor,
			db,
		);

		expect(result).toMatchObject({
			deliveryPreference: "pickupPoint",
			pickupPointId: 3,
			shippingAddressSnapshot: null,
		});
		expect(data.updateOrderDeliveryPreference).toHaveBeenCalledWith(
			tx,
			7,
			expect.objectContaining({
				pickupPointSnapshot: expect.objectContaining({
					source: "admin",
					pickupPoint: buildPickupPointSnapshot(centro, "admin").pickupPoint,
				}),
			}),
		);
		expect(data.countPackagesBlockingDeliveryChange).toHaveBeenCalledWith(
			tx,
			[21],
		);
		expect(DomainEventPublisher.publish).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				type: "userOrder.deliveryPreferenceChanged",
				aggregateType: "UserOrder",
				aggregateId: "7",
				actor: {
					source: "admin",
					actorId: "admin-1",
					actorReference: "Admin Uno",
				},
				payload: {
					orderId: "7",
					cartItemIds: ["21"],
					before: { mode: "homeDelivery", pickupPointName: undefined },
					after: { mode: "pickupPoint", pickupPointName: "Centro" },
					reason,
				},
			}),
		);
		expect(writeAdminAuditLog).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				action: "userOrder.changeDeliveryPreference",
				entityType: "userOrder",
				entityId: "7",
				before: expect.objectContaining({ deliveryPreference: "homeDelivery" }),
				after: expect.objectContaining({ deliveryPreference: "pickupPoint" }),
				metadata: { reason, cartItemIds: [21] },
			}),
		);
		expect(DomainEventDispatcher.wake).toHaveBeenCalled();
	});

	it("moves a pickup order home to an address typed for it", async () => {
		vi.mocked(data.findOrderForDeliveryChange).mockResolvedValue(
			order({
				deliveryPreference: "pickupPoint",
				pickupPointId: 3,
				pickupPointSnapshot: buildPickupPointSnapshot(centro, "checkout"),
				shippingAddressSnapshot: null,
				pickupPoint: { name: "Centro" },
			}),
		);
		const { db } = database();
		const snapshot = {
			type: "shipping" as const,
			line1: "Gobernador Paz 900",
			line2: null,
			city: "Ushuaia",
			state: "Tierra del Fuego",
			postalCode: "9410",
			country: "AR",
		};

		const result = await changeDeliveryPreference(
			{
				orderId: 7,
				delivery: { mode: "homeDelivery", address: { snapshot } },
				reason,
			},
			actor,
			db,
		);

		expect(result).toMatchObject({
			deliveryPreference: "homeDelivery",
			pickupPointId: null,
			pickupPointSnapshot: null,
			shippingAddressSnapshot: { source: "admin", address: snapshot },
		});
		expect(DomainEventPublisher.publish).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				payload: expect.objectContaining({
					before: { mode: "pickupPoint", pickupPointName: "Centro" },
					after: { mode: "homeDelivery" },
				}),
			}),
		);
	});

	it("refuses while a package of the order is on an end-user shipment", async () => {
		vi.mocked(data.findOrderForDeliveryChange).mockResolvedValue(order());
		vi.mocked(data.countPackagesBlockingDeliveryChange).mockResolvedValue(1);
		const { db } = database();

		await expect(
			changeDeliveryPreference(
				{
					orderId: 7,
					delivery: { mode: "pickupPoint", pickupPointId: 3 },
					reason,
				},
				actor,
				db,
			),
		).rejects.toThrow(/Quitalo del envío/);
		expect(data.updateOrderDeliveryPreference).not.toHaveBeenCalled();
		expect(DomainEventPublisher.publish).not.toHaveBeenCalled();
	});

	it("refuses an inactive point, a foreign address and a change to the same delivery", async () => {
		const { db } = database();
		vi.mocked(data.findOrderForDeliveryChange).mockResolvedValue(order());

		vi.mocked(pickupPointData.findPickupPointById).mockResolvedValue({
			...centro,
			active: false,
		});
		await expect(
			changeDeliveryPreference(
				{
					orderId: 7,
					delivery: { mode: "pickupPoint", pickupPointId: 3 },
					reason,
				},
				actor,
				db,
			),
		).rejects.toThrow("El punto de retiro ya no está disponible");

		vi.mocked(checkoutData.findCheckoutAddressById).mockResolvedValue(null);
		await expect(
			changeDeliveryPreference(
				{
					orderId: 7,
					delivery: { mode: "homeDelivery", address: { addressId: 99 } },
					reason,
				},
				actor,
				db,
			),
		).rejects.toThrow("La dirección no es del cliente");
		expect(checkoutData.findCheckoutAddressById).toHaveBeenCalledWith(
			expect.anything(),
			"user-1",
			99,
		);

		vi.mocked(checkoutData.findCheckoutAddressById).mockResolvedValue(
			homeSnapshot.address as Awaited<
				ReturnType<typeof checkoutData.findCheckoutAddressById>
			>,
		);
		await expect(
			changeDeliveryPreference(
				{
					orderId: 7,
					delivery: { mode: "homeDelivery", address: { addressId: 1 } },
					reason,
				},
				actor,
				db,
			),
		).rejects.toThrow("El pedido ya tiene esa entrega");

		expect(data.updateOrderDeliveryPreference).not.toHaveBeenCalled();
	});
});
