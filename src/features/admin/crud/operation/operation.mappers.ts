import { ArrowDownUp, CheckCircle2, Clock, XCircle } from "lucide-react";
import type {
	OperationCreateFormValues,
	OperationRollOverStage,
	OperationRollOverStatus,
	OperationStatus,
	OperationStrategy,
	OperationSupplierOrderStatus,
} from "~/shared/common/admin-crud/operation.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";
import { toDateTimeLocalValue } from "~/shared/common/date.helpers";

export const operationStatusLabelMap: Record<OperationStatus, string> = {
	running: "En ejecución",
	completed: "Completada",
	failed: "Fallida",
};

export const operationStrategyLabelMap: Record<OperationStrategy, string> = {
	fifo: "FIFO",
	other: "Otra",
};

export const operationStatusConfig: Record<OperationStatus, StatusConfig> = {
	running: {
		label: operationStatusLabelMap.running,
		variant: "warning",
		icon: Clock,
		hint: "Asignación en curso",
	},
	completed: {
		label: operationStatusLabelMap.completed,
		variant: "success",
		icon: CheckCircle2,
		hint: "Ejecución tecnica exitosa",
	},
	failed: {
		label: operationStatusLabelMap.failed,
		variant: "destructive",
		icon: XCircle,
		hint: "Error tecnico en la ejecución",
	},
};

export const operationStrategyConfig: Record<OperationStrategy, StatusConfig> =
	{
		fifo: {
			label: operationStrategyLabelMap.fifo,
			variant: "info",
			icon: ArrowDownUp,
			hint: "Asignación por orden de llegada",
		},
		other: {
			label: operationStrategyLabelMap.other,
			variant: "outline",
		},
	};

export const supplierOrderStatusLabelMap: Record<
	OperationSupplierOrderStatus,
	string
> = {
	pending: "Pendiente",
	requested: "Solicitada",
	confirmed: "Confirmada",
	readyForReceipt: "Lista para recepción",
	completed: "Completada",
	cancelled: "Cancelada",
};

export const supplierOrderStatusConfig: Record<
	OperationSupplierOrderStatus,
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

export const rollOverStageLabelMap: Record<OperationRollOverStage, string> = {
	preAllocation: "Previo a la asignación",
	postAllocation: "Posterior a la asignación",
};

export const rollOverStatusLabelMap: Record<OperationRollOverStatus, string> = {
	open: "Abierto",
	rebatched: "Reagrupado",
	resolved: "Resuelto",
	cancelled: "Cancelado",
};

export const rollOverStatusConfig: Record<
	OperationRollOverStatus,
	StatusConfig
> = {
	// An open rollover is quantity waiting for someone to act on it, not a
	// normal in-progress step — hence `attention` rather than `inProgress`.
	open: { ...statusPresets.attention, label: rollOverStatusLabelMap.open },
	rebatched: {
		...statusPresets.inProgress,
		label: rollOverStatusLabelMap.rebatched,
	},
	resolved: {
		...statusPresets.success,
		label: rollOverStatusLabelMap.resolved,
	},
	cancelled: {
		...statusPresets.failed,
		label: rollOverStatusLabelMap.cancelled,
	},
};

export const operationStatusOptions = Object.entries(
	operationStatusLabelMap,
).map(([value, label]) => ({
	value: value as OperationStatus,
	label,
}));

export const operationStrategyOptions = Object.entries(
	operationStrategyLabelMap,
).map(([value, label]) => ({
	value: value as OperationStrategy,
	label,
}));

export const defaultOperationCreateFormValues = (
	destinationId = 0,
): OperationCreateFormValues => {
	const now = new Date();
	const from = new Date(now);
	from.setDate(from.getDate() - 1);

	return {
		from: toDateTimeLocalValue(from),
		to: toDateTimeLocalValue(now),
		destinationId,
		includeRollOver: true,
		strategy: "fifo",
		notes: undefined,
	};
};
