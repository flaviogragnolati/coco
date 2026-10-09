import type {
	PickupPointDetail,
	PickupPointFormValues,
} from "~/shared/common/admin-crud/pickup-point.types";

export const defaultPickupPointFormValues: PickupPointFormValues = {
	name: "",
	line1: "",
	line2: "",
	city: "Ushuaia",
	state: "Tierra del Fuego",
	postalCode: "",
	country: "AR",
	googleMapsUrl: "",
	hours: "",
	instructions: "",
	active: true,
};

export function pickupPointDetailToFormValues(
	point: PickupPointDetail,
): PickupPointFormValues {
	return {
		name: point.name,
		line1: point.line1,
		line2: point.line2 ?? "",
		city: point.city,
		state: point.state,
		postalCode: point.postalCode ?? "",
		country: point.country,
		googleMapsUrl: point.googleMapsUrl ?? "",
		hours: point.hours,
		instructions: point.instructions ?? "",
		active: point.active,
	};
}

export function pickupPointAddressLine(point: {
	line1: string;
	line2: string | null;
	city: string;
}) {
	return [point.line1, point.line2, point.city].filter(Boolean).join(", ");
}

export function deactivationDescription(point: {
	name: string;
	pendingOrderCount: number;
}) {
	const count = point.pendingOrderCount;
	const orders =
		count === 0
			? "Ningún pedido pago en curso eligió este punto."
			: count === 1
				? "Hay 1 pedido pago que eligió este punto; lo conserva hasta que cambies su entrega."
				: `Hay ${count} pedidos pagos que eligieron este punto; lo conservan hasta que cambies su entrega.`;

	return `${orders} El checkout deja de ofrecer "${point.name}" enseguida.`;
}
