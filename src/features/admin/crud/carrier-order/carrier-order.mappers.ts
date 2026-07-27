import type {
	CarrierOrderCommandKey,
	CarrierOrderStatus,
} from "~/shared/common/admin-crud/carrier-order.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

export const carrierOrderStatusLabelMap: Record<CarrierOrderStatus, string> = {
	pending: "Pendiente",
	requested: "Solicitada",
	confirmed: "Confirmada",
	inTransit: "En tránsito",
	completed: "Completada",
	cancelled: "Cancelada",
	failed: "Fallida",
};

export const carrierOrderStatusConfig: Record<
	CarrierOrderStatus,
	StatusConfig
> = {
	pending: {
		...statusPresets.inProgress,
		label: carrierOrderStatusLabelMap.pending,
	},
	requested: {
		...statusPresets.inProgress,
		label: carrierOrderStatusLabelMap.requested,
	},
	confirmed: {
		...statusPresets.inProgress,
		label: carrierOrderStatusLabelMap.confirmed,
	},
	inTransit: {
		...statusPresets.inProgress,
		label: carrierOrderStatusLabelMap.inTransit,
	},
	completed: {
		...statusPresets.success,
		label: carrierOrderStatusLabelMap.completed,
	},
	cancelled: {
		...statusPresets.failed,
		label: carrierOrderStatusLabelMap.cancelled,
	},
	failed: {
		...statusPresets.failed,
		label: carrierOrderStatusLabelMap.failed,
	},
};

export const carrierOrderStatusOptions = Object.entries(
	carrierOrderStatusLabelMap,
).map(([value, label]) => ({
	value: value as CarrierOrderStatus,
	label,
}));

export const carrierOrderActionLabelMap: Record<
	CarrierOrderCommandKey,
	string
> = {
	request: "Solicitar",
	confirm: "Confirmar",
	markInTransit: "Marcar en tránsito",
	complete: "Completar",
	cancel: "Cancelar",
	markFailed: "Marcar fallida",
	addShipments: "Agregar envíos",
	removeShipment: "Quitar envío",
	edit: "Editar",
	softDelete: "Dar de baja",
	hardDelete: "Eliminar",
};

/** The four ladder rungs that only need a confirmation, no reason. */
export const carrierOrderPlainCommandKeys = [
	"request",
	"confirm",
	"markInTransit",
	"complete",
] as const;

/** The two ladder rungs that carry a mandatory reason into the audit log. */
export const carrierOrderReasonCommandKeys = ["cancel", "markFailed"] as const;
