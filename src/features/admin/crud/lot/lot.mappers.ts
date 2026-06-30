import type {
	LotItemStatus,
	LotStatus,
} from "~/shared/common/admin-crud/lot.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

export const lotStatusLabelMap: Record<LotStatus, string> = {
	pending: "Pendiente",
	assembling: "Armando",
	requested: "Solicitado",
	confirmed: "Confirmado",
	readyForPackaging: "Listo para empaque",
	completed: "Completado",
	cancelled: "Cancelado",
};

// Reserve `success` (green) for the terminal-good state (`completed`); every
// mid-lifecycle state — including `confirmed`/`readyForPackaging` — stays
// `inProgress` (blue) so the convention reads consistently across the admin.
export const lotStatusConfig: Record<LotStatus, StatusConfig> = {
	pending: { ...statusPresets.inProgress, label: lotStatusLabelMap.pending },
	assembling: {
		...statusPresets.inProgress,
		label: lotStatusLabelMap.assembling,
	},
	requested: {
		...statusPresets.inProgress,
		label: lotStatusLabelMap.requested,
	},
	confirmed: {
		...statusPresets.inProgress,
		label: lotStatusLabelMap.confirmed,
	},
	readyForPackaging: {
		...statusPresets.inProgress,
		label: lotStatusLabelMap.readyForPackaging,
	},
	completed: { ...statusPresets.success, label: lotStatusLabelMap.completed },
	cancelled: { ...statusPresets.failed, label: lotStatusLabelMap.cancelled },
};

// `lotItemStatus` shares the same vocabulary as `lotStatus` (minus `assembling`).
export const lotItemStatusConfig: Record<LotItemStatus, StatusConfig> = {
	pending: { ...statusPresets.inProgress, label: lotStatusLabelMap.pending },
	requested: {
		...statusPresets.inProgress,
		label: lotStatusLabelMap.requested,
	},
	confirmed: {
		...statusPresets.inProgress,
		label: lotStatusLabelMap.confirmed,
	},
	readyForPackaging: {
		...statusPresets.inProgress,
		label: lotStatusLabelMap.readyForPackaging,
	},
	completed: { ...statusPresets.success, label: lotStatusLabelMap.completed },
	cancelled: { ...statusPresets.failed, label: lotStatusLabelMap.cancelled },
};

export const lotStatusOptions = Object.entries(lotStatusLabelMap).map(
	([value, label]) => ({
		value: value as LotStatus,
		label,
	}),
);
