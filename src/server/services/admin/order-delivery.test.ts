import { describe, expect, it } from "vitest";

import {
	deliveryPreferenceDiagnostics,
	deriveShipmentDestination,
	findDeliveryMismatch,
	hasDeliveryConflict,
	type OrderDelivery,
	packageCartIds,
} from "./order-delivery";

function order(overrides: Partial<OrderDelivery> = {}): OrderDelivery {
	return {
		cartId: 10,
		orderId: 100,
		orderCode: "ORD-1",
		status: "processing",
		customerName: "Ana",
		customerEmail: "ana@example.com",
		deliveryPreference: "homeDelivery",
		pickupPointId: null,
		pickupPointName: null,
		pickupPointActive: null,
		shippingAddressSnapshot: {
			source: "checkout",
			capturedAt: "2026-10-09T12:00:00.000Z",
			address: {
				line1: "Maipú 50",
				line2: null,
				city: "Ushuaia",
				state: "Tierra del Fuego",
				postalCode: "9410",
			},
		},
		...overrides,
	};
}

const centroOrder = order({
	orderCode: "ORD-2",
	deliveryPreference: "pickupPoint",
	pickupPointId: 3,
	pickupPointName: "Centro",
	pickupPointActive: true,
	shippingAddressSnapshot: null,
});

describe("findDeliveryMismatch", () => {
	it("accepts orders that chose the shipment's mode and point", () => {
		expect(
			findDeliveryMismatch(
				{ deliveryMode: "homeDelivery", pickupPointId: null },
				[order()],
			),
		).toBeNull();
		expect(
			findDeliveryMismatch({ deliveryMode: "pickupPoint", pickupPointId: 3 }, [
				centroOrder,
			]),
		).toBeNull();
	});

	it("refuses a home-preference order on a pickup shipment", () => {
		expect(
			findDeliveryMismatch({ deliveryMode: "pickupPoint", pickupPointId: 3 }, [
				order(),
			])?.message,
		).toBe("El pedido ORD-1 eligió A domicilio; cambiá su entrega primero.");
	});

	it("refuses a pickup order on a home shipment or on another point", () => {
		expect(
			findDeliveryMismatch(
				{ deliveryMode: "homeDelivery", pickupPointId: null },
				[centroOrder],
			)?.message,
		).toBe(
			"El pedido ORD-2 eligió Punto de retiro · Centro; cambiá su entrega primero.",
		);
		expect(
			findDeliveryMismatch({ deliveryMode: "pickupPoint", pickupPointId: 4 }, [
				centroOrder,
			])?.order.orderCode,
		).toBe("ORD-2");
	});

	it("exempts orders paid before the customer could choose", () => {
		expect(
			findDeliveryMismatch({ deliveryMode: "pickupPoint", pickupPointId: 3 }, [
				order({ deliveryPreference: null }),
			]),
		).toBeNull();
	});
});

describe("hasDeliveryConflict", () => {
	it("flags orders that chose differently, ignoring legacy ones", () => {
		expect(hasDeliveryConflict([order(), centroOrder])).toBe(true);
		expect(
			hasDeliveryConflict([centroOrder, { ...centroOrder, orderId: 101 }]),
		).toBe(false);
		expect(
			hasDeliveryConflict([order({ deliveryPreference: null }), centroOrder]),
		).toBe(false);
	});
});

describe("deriveShipmentDestination", () => {
	const capturedAt = new Date("2026-10-09T15:00:00.000Z");

	it("snapshots the point for a pickup shipment, with no single contact", () => {
		const point = {
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

		expect(
			deriveShipmentDestination(
				{ deliveryMode: "pickupPoint", pickupPoint: point },
				capturedAt,
			),
		).toEqual({
			destinationAddressSnapshot: {
				source: "shipment",
				capturedAt: capturedAt.toISOString(),
				pickupPoint: point,
			},
			destinationContactSnapshot: null,
		});
	});

	it("copies the customer's order address for a home delivery", () => {
		const destination = deriveShipmentDestination(
			{ deliveryMode: "homeDelivery", orders: [order()] },
			capturedAt,
		);

		expect(destination.destinationAddressSnapshot).toMatchObject({
			source: "order",
			orderCode: "ORD-1",
			address: { line1: "Maipú 50", city: "Ushuaia" },
		});
		expect(destination.destinationContactSnapshot).toEqual({
			name: "Ana",
			email: "ana@example.com",
		});
	});

	it("leaves the destination empty when no order is reachable", () => {
		expect(
			deriveShipmentDestination({ deliveryMode: "homeDelivery", orders: [] }),
		).toEqual({
			destinationAddressSnapshot: null,
			destinationContactSnapshot: null,
		});
	});
});

describe("deliveryPreferenceDiagnostics", () => {
	it("warns about a paid order whose point is no longer active", () => {
		const [diagnostic] = deliveryPreferenceDiagnostics({
			...centroOrder,
			pickupPointActive: false,
		});

		expect(diagnostic).toMatchObject({
			code: "order.deliveryPreference.pointInactive",
			severity: "warning",
			refs: { orderId: 100, pickupPointId: 3 },
		});
	});

	it("stays silent for active points, closed orders and home deliveries", () => {
		expect(deliveryPreferenceDiagnostics(centroOrder)).toEqual([]);
		expect(
			deliveryPreferenceDiagnostics({
				...centroOrder,
				pickupPointActive: false,
				status: "completed",
			}),
		).toEqual([]);
		expect(deliveryPreferenceDiagnostics(order())).toEqual([]);
	});
});

it("derives a package's carts from its live lines only", () => {
	const line = (status: string, cartId: number) => ({
		status,
		packageAllocations: [{ cartItemLotItem: { cartItem: { cartId } } }],
	});

	expect(
		packageCartIds({
			packageLotItems: [
				line("packed", 1),
				line("packed", 1),
				line("cancelled", 2),
			],
		}),
	).toEqual([1]);
});
