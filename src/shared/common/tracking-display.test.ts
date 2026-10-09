import { expect, test } from "vitest";

import {
	customerNoticeDetail,
	customerNoticeReason,
	customerTrackingEventLabelMap,
	trackingEventLabelMap,
	userTrackingNoticeKindByEventType,
	userTrackingStageByEventType,
} from "./tracking-display";

test("an exception carries the admin reason", () => {
	expect(
		customerNoticeReason("fulfillmentException", { reason: "Camión demorado" }),
	).toBe("Camión demorado");
});

test("a delivery change shows the admin reason verbatim", () => {
	expect(
		customerNoticeReason("deliveryPreferenceChanged", {
			reason: "  La dirección queda fuera de la zona de reparto. ",
		}),
	).toBe("La dirección queda fuera de la zona de reparto.");
});

test("a delivery change is an info notice, never a stage", () => {
	expect(userTrackingNoticeKindByEventType.deliveryPreferenceChanged).toBe(
		"info",
	);
	expect(
		userTrackingStageByEventType.deliveryPreferenceChanged,
	).toBeUndefined();
});

test("a delivery change notice states what it changed from and to", () => {
	expect(
		customerNoticeDetail("deliveryPreferenceChanged", {
			before: { mode: "homeDelivery" },
			after: { mode: "pickupPoint", pickupPointName: "Centro" },
		}),
	).toBe("A domicilio → Punto de retiro · Centro");
	expect(
		customerNoticeDetail("deliveryPreferenceChanged", {
			before: { mode: null },
			after: { mode: "homeDelivery" },
		}),
	).toBe("A domicilio");
	expect(
		customerNoticeDetail("deliveryPreferenceChanged", {
			before: { mode: "homeDelivery" },
			after: { mode: "homeDelivery" },
		}),
	).toBe("A domicilio, en otra dirección");
	expect(
		customerNoticeDetail("fulfillmentException", { reason: "x" }),
	).toBeUndefined();
});

test("a post-allocation roll over reads what cut it, never the composed reason", () => {
	expect(
		customerNoticeReason("rolledOverPostAllocation", {
			supplierOrderId: "3",
			supplierOrderCode: "SO-1",
			reason: "Confirmacion parcial del proveedor en la linea LITEM-1",
		}),
	).toBe("El proveedor no confirmó toda la cantidad pedida.");
	expect(
		customerNoticeReason("rolledOverPostAllocation", {
			shipmentId: "5",
			supplierOrderId: "3",
			reason: "Faltante en recepcion del envio SHP-1: caja rota",
		}),
	).toBe("Llegó menos mercadería de la que pedimos al proveedor.");
	expect(
		customerNoticeReason("rolledOverPostAllocation", {
			packageId: "7",
			reason: "Baja de paquete PKG-7: Mercadería perdida",
		}),
	).toBe("Hubo un problema con el paquete que llevaba tu producto.");
});

test("a roll over without a known reference shows no reason", () => {
	expect(
		customerNoticeReason("rolledOverPostAllocation", { reason: "x" }),
	).toBeUndefined();
	expect(
		customerNoticeReason("rolledOverPreAllocation", {
			reason: "Sin termino de proveedor vigente para Yerba",
		}),
	).toBeUndefined();
});

// Same `rollover` notice kind, but the reason is an internal operator note.
test("a roll over resolution and an operation compensation never carry a reason", () => {
	expect(
		customerNoticeReason("rollOverResolved", { reason: "Cerrado a mano" }),
	).toBeUndefined();
	expect(
		customerNoticeReason("excludedFromOperation", {
			reason: "Reejecucion de la operacion OP-1",
		}),
	).toBeUndefined();
});

test("resolved, info and quantity notices never carry a reason", () => {
	for (const eventType of [
		"exceptionResolved",
		"arrivedAtPickupPoint",
		"cartItemQuantityChanged",
	] as const) {
		expect(customerNoticeReason(eventType, { reason: "x" })).toBeUndefined();
	}
});

test("missing, blank or non-string reasons are dropped", () => {
	expect(customerNoticeReason("fulfillmentException", null)).toBeUndefined();
	expect(customerNoticeReason("fulfillmentException", {})).toBeUndefined();
	expect(
		customerNoticeReason("fulfillmentException", { reason: "  " }),
	).toBeUndefined();
	expect(
		customerNoticeReason("fulfillmentException", { reason: 3 }),
	).toBeUndefined();
});

test("customer event labels never say carrito; admin keeps its own", () => {
	for (const label of Object.values(customerTrackingEventLabelMap)) {
		expect(label).not.toMatch(/carrito/i);
	}
	expect(trackingEventLabelMap.addedToCart).toBe(
		"Producto agregado al carrito",
	);
});

test("customers read a plain roll over title; admin keeps the allocation stage", () => {
	expect(customerTrackingEventLabelMap.rolledOverPreAllocation).toBe(
		"Reprogramado",
	);
	expect(customerTrackingEventLabelMap.rolledOverPostAllocation).toBe(
		"Reprogramado",
	);
	expect(trackingEventLabelMap.rolledOverPostAllocation).toBe(
		"Reprogramado después de la asignación",
	);
	for (const label of Object.values(customerTrackingEventLabelMap)) {
		expect(label).not.toMatch(/asignaci/i);
	}
});
