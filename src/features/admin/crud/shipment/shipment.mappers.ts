import type {
	ShipmentStatus,
	ShipmentType,
} from "~/shared/common/admin-crud/shipment.types";

export const shipmentStatusLabelMap: Record<ShipmentStatus, string> = {
	pending: "Pendiente",
	preparing: "Preparando",
	readyForDispatch: "Listo para despacho",
	inTransit: "En transito",
	received: "Recibido",
	delayed: "Demorado",
	failed: "Fallido",
	cancelled: "Cancelado",
};

export const shipmentTypeLabelMap: Record<ShipmentType, string> = {
	internalTransfer: "Transferencia interna",
	endUserDelivery: "Entrega a usuario",
};

export const shipmentStatusOptions = Object.entries(shipmentStatusLabelMap).map(
	([value, label]) => ({
		value: value as ShipmentStatus,
		label,
	}),
);

export const shipmentTypeOptions = Object.entries(shipmentTypeLabelMap).map(
	([value, label]) => ({
		value: value as ShipmentType,
		label,
	}),
);
