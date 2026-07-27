import { CheckCircle2Icon, RotateCcwIcon, XCircleIcon } from "lucide-react";

import type {
	RollOverStage,
	RollOverStatus,
} from "~/shared/common/admin-crud/roll-over.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

export const rollOverStatusLabelMap: Record<RollOverStatus, string> = {
	open: "Abierto",
	rebatched: "Reagrupado",
	resolved: "Resuelto",
	cancelled: "Cancelado",
};

export const rollOverStageLabelMap: Record<RollOverStage, string> = {
	preAllocation: "Antes de asignación",
	postAllocation: "Después de asignación",
};

// `open` is the worklist state, so it reads as needing attention; `rebatched` is
// normal progress (the demand re-entered an operation); `resolved` is terminal-
// good — a decision was recorded — and `cancelled` is compensation debris.
export const rollOverStatusConfig: Record<RollOverStatus, StatusConfig> = {
	open: {
		...statusPresets.attention,
		icon: RotateCcwIcon,
		label: rollOverStatusLabelMap.open,
	},
	rebatched: {
		...statusPresets.inProgress,
		label: rollOverStatusLabelMap.rebatched,
	},
	resolved: {
		...statusPresets.success,
		icon: CheckCircle2Icon,
		label: rollOverStatusLabelMap.resolved,
	},
	cancelled: {
		...statusPresets.failed,
		icon: XCircleIcon,
		label: rollOverStatusLabelMap.cancelled,
	},
};

export const rollOverStatusOptions = Object.entries(rollOverStatusLabelMap).map(
	([value, label]) => ({ value: value as RollOverStatus, label }),
);

export const rollOverStageOptions = Object.entries(rollOverStageLabelMap).map(
	([value, label]) => ({ value: value as RollOverStage, label }),
);
