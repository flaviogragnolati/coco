import type { z } from "zod";

import {
	type deliveryModeSchema,
	pickupPointSnapshotSchema,
} from "~/schemas/pickup-point.schemas";
import type { PickupPointData } from "./pickup-point-snapshot";

export type DeliveryPreference = z.output<typeof deliveryModeSchema>;

export const deliveryPreferenceLabelMap: Record<DeliveryPreference, string> = {
	homeDelivery: "A domicilio",
	pickupPoint: "Punto de retiro",
};

type AddressLike = {
	line1: string;
	line2?: string | null;
	city: string;
	state: string;
	postalCode?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: null;
}

function text(value: unknown) {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

export function formatAddressLine(address: AddressLike) {
	const street = [address.line1, address.line2].filter(Boolean).join(", ");
	const place = [address.city, address.state].filter(Boolean).join(", ");
	return [street, [place, address.postalCode].filter(Boolean).join(" ")]
		.filter(Boolean)
		.join(" · ");
}

/** The `address` inside an order or shipment address snapshot, if readable. */
export function readAddressSnapshot(snapshot: unknown): AddressLike | null {
	const address = asRecord(asRecord(snapshot)?.address);
	const line1 = text(address?.line1);
	const city = text(address?.city);
	if (!address || !line1 || !city) return null;

	return {
		line1,
		line2: text(address.line2),
		city,
		state: text(address.state) ?? "",
		postalCode: text(address.postalCode),
	};
}

export function readPickupPointSnapshot(
	snapshot: unknown,
): PickupPointData | null {
	const parsed = pickupPointSnapshotSchema.safeParse(snapshot);
	return parsed.success ? parsed.data.pickupPoint : null;
}

export type OrderDeliveryView = {
	mode: DeliveryPreference;
	label: string;
	/** Where: the address, or the point's name and address. */
	place: string;
	hours: string | null;
	instructions: string | null;
	googleMapsUrl: string | null;
};

/**
 * The readable delivery of an order, or null for an order paid before the
 * customer could choose (its address row stays as it was).
 */
export function describeOrderDelivery(order: {
	deliveryPreference: DeliveryPreference | null;
	pickupPointSnapshot: unknown;
	shippingAddressSnapshot: unknown;
}): OrderDeliveryView | null {
	if (order.deliveryPreference === null) return null;

	if (order.deliveryPreference === "pickupPoint") {
		const point = readPickupPointSnapshot(order.pickupPointSnapshot);
		return {
			mode: "pickupPoint",
			label: deliveryPreferenceLabelMap.pickupPoint,
			place: point
				? [point.name, point.line1, point.line2, point.city]
						.filter(Boolean)
						.join(", ")
				: "Sin punto de retiro",
			hours: point?.hours ?? null,
			instructions: point?.instructions ?? null,
			googleMapsUrl: point?.googleMapsUrl ?? null,
		};
	}

	const address = readAddressSnapshot(order.shippingAddressSnapshot);
	return {
		mode: "homeDelivery",
		label: deliveryPreferenceLabelMap.homeDelivery,
		place: address ? formatAddressLine(address) : "Sin dirección",
		hours: null,
		instructions: null,
		googleMapsUrl: null,
	};
}

/** "A domicilio — <dirección>" or "Punto de retiro — <nombre>, <dirección> · <horario>". */
export function formatOrderDelivery(view: OrderDeliveryView) {
	const place = view.hours ? `${view.place} · ${view.hours}` : view.place;
	return `${view.label} — ${place}`;
}

export type DeliveryChoice = {
	mode: DeliveryPreference | null;
	pickupPointName?: string;
};

/** One short phrase for a delivery choice: "A domicilio", "Punto de retiro · Centro". */
export function describeDeliveryChoice(choice: DeliveryChoice) {
	if (choice.mode === null) return "Sin elección";
	if (choice.mode === "pickupPoint" && choice.pickupPointName) {
		return `${deliveryPreferenceLabelMap.pickupPoint} · ${choice.pickupPointName}`;
	}
	return deliveryPreferenceLabelMap[choice.mode];
}
