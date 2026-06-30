import { ArrowLeftRight, Truck } from "lucide-react";

import type {
	ShipmentStatus,
	ShipmentType,
} from "~/shared/common/admin-crud/shipment.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

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

// Same lifecycle convention as packages: `received` terminal-good (green),
// `delayed` needs-attention (amber), `failed`/`cancelled` terminal-bad (red).
export const shipmentStatusConfig: Record<ShipmentStatus, StatusConfig> = {
	pending: {
		...statusPresets.inProgress,
		label: shipmentStatusLabelMap.pending,
	},
	preparing: {
		...statusPresets.inProgress,
		label: shipmentStatusLabelMap.preparing,
	},
	readyForDispatch: {
		...statusPresets.inProgress,
		label: shipmentStatusLabelMap.readyForDispatch,
	},
	inTransit: {
		...statusPresets.inProgress,
		label: shipmentStatusLabelMap.inTransit,
	},
	received: {
		...statusPresets.success,
		label: shipmentStatusLabelMap.received,
	},
	delayed: {
		...statusPresets.attention,
		label: shipmentStatusLabelMap.delayed,
	},
	failed: { ...statusPresets.failed, label: shipmentStatusLabelMap.failed },
	cancelled: {
		...statusPresets.failed,
		label: shipmentStatusLabelMap.cancelled,
	},
};

// `shipmentType` is a category, not a lifecycle — informational `info` chips
// distinguished by icon, not color.
export const shipmentTypeConfig: Record<ShipmentType, StatusConfig> = {
	internalTransfer: {
		label: shipmentTypeLabelMap.internalTransfer,
		variant: "info",
		icon: ArrowLeftRight,
	},
	endUserDelivery: {
		label: shipmentTypeLabelMap.endUserDelivery,
		variant: "info",
		icon: Truck,
	},
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
