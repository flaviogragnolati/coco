import { ArrowDownUp, CheckCircle2, Clock, Undo2, XCircle } from "lucide-react";
import type {
	OperationCommandKey,
	OperationCreateFormValues,
	OperationRollOverStage,
	OperationRollOverStatus,
	OperationStatus,
	OperationStrategy,
} from "~/shared/common/admin-crud/operation.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";
import { toDateTimeLocalValue } from "~/shared/common/date.helpers";

export const operationStatusLabelMap: Record<OperationStatus, string> = {
	running: "En ejecución",
	completed: "Completada",
	failed: "Fallida",
	cancelled: "Cancelada",
};

export const operationActionLabelMap: Record<OperationCommandKey, string> = {
	cancel: "Cancelar",
	rerun: "Reejecutar",
	delete: "Eliminar",
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
	cancelled: {
		label: operationStatusLabelMap.cancelled,
		variant: "outline",
		icon: Undo2,
		hint: "Compensada: su demanda volvió a la cola",
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

/**
 * Preloads the re-run form from the source operation, except `includeRollOver`,
 * which is forced to `true`: a re-run that excluded roll overs would strand the
 * demand the compensation just released (architecture §8).
 */
export const rerunOperationFormValues = (operation: {
	from: Date;
	to: Date;
	destinationId?: number | null;
	destination: { id: number } | null;
	notes: string | null;
}): OperationCreateFormValues => ({
	from: toDateTimeLocalValue(operation.from),
	to: toDateTimeLocalValue(operation.to),
	destinationId: operation.destination?.id ?? 0,
	includeRollOver: true,
	strategy: "fifo",
	notes: operation.notes ?? undefined,
});

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
