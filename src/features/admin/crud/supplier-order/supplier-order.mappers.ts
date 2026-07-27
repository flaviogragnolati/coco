import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";
import type {
	SupplierOrderCommandKey,
	SupplierOrderStatus,
} from "~/shared/common/admin-crud/supplier-order.types";

export const supplierOrderStatusLabelMap: Record<SupplierOrderStatus, string> =
	{
		pending: "Pendiente",
		requested: "Solicitada",
		confirmed: "Confirmada",
		readyForReceipt: "Lista para recepción",
		completed: "Completada",
		cancelled: "Cancelada",
	};

// Same convention as the lot mappers: `success` (green) is reserved for the
// terminal-good state, every mid-lifecycle state stays `inProgress` (blue).
export const supplierOrderStatusConfig: Record<
	SupplierOrderStatus,
	StatusConfig
> = {
	pending: {
		...statusPresets.inProgress,
		label: supplierOrderStatusLabelMap.pending,
	},
	requested: {
		...statusPresets.inProgress,
		label: supplierOrderStatusLabelMap.requested,
	},
	confirmed: {
		...statusPresets.inProgress,
		label: supplierOrderStatusLabelMap.confirmed,
	},
	readyForReceipt: {
		...statusPresets.inProgress,
		label: supplierOrderStatusLabelMap.readyForReceipt,
	},
	completed: {
		...statusPresets.success,
		label: supplierOrderStatusLabelMap.completed,
	},
	cancelled: {
		...statusPresets.failed,
		label: supplierOrderStatusLabelMap.cancelled,
	},
};

export const supplierOrderStatusOptions = Object.entries(
	supplierOrderStatusLabelMap,
).map(([value, label]) => ({
	value: value as SupplierOrderStatus,
	label,
}));

export const supplierOrderActionLabelMap: Record<
	SupplierOrderCommandKey,
	string
> = {
	request: "Solicitar",
	confirm: "Confirmar",
	registerDispatch: "Registrar despacho",
	cancel: "Cancelar orden",
	cancelLine: "Cancelar línea",
};
