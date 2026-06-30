import type {
	PackageLotItemStatus,
	PackageStatus,
} from "~/shared/common/admin-crud/package.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

export const packageStatusLabelMap: Record<PackageStatus, string> = {
	pending: "Pendiente",
	packing: "Empacando",
	readyForShipment: "Listo para envio",
	inTransit: "En transito",
	received: "Recibido",
	delayed: "Demorado",
	failed: "Fallido",
	cancelled: "Cancelado",
};

export const packageLotItemStatusLabelMap: Record<
	PackageLotItemStatus,
	string
> = {
	pending: "Pendiente",
	packing: "Empacando",
	packed: "Empacado",
	shipped: "Enviado",
	received: "Recibido",
	cancelled: "Cancelado",
};

// `delayed` is the canonical `attention` (amber) case; `received` is the only
// terminal-good (green); `failed`/`cancelled` are terminal-bad (red).
export const packageStatusConfig: Record<PackageStatus, StatusConfig> = {
	pending: {
		...statusPresets.inProgress,
		label: packageStatusLabelMap.pending,
	},
	packing: {
		...statusPresets.inProgress,
		label: packageStatusLabelMap.packing,
	},
	readyForShipment: {
		...statusPresets.inProgress,
		label: packageStatusLabelMap.readyForShipment,
	},
	inTransit: {
		...statusPresets.inProgress,
		label: packageStatusLabelMap.inTransit,
	},
	received: { ...statusPresets.success, label: packageStatusLabelMap.received },
	delayed: { ...statusPresets.attention, label: packageStatusLabelMap.delayed },
	failed: { ...statusPresets.failed, label: packageStatusLabelMap.failed },
	cancelled: {
		...statusPresets.failed,
		label: packageStatusLabelMap.cancelled,
	},
};

export const packageLotItemStatusConfig: Record<
	PackageLotItemStatus,
	StatusConfig
> = {
	pending: {
		...statusPresets.inProgress,
		label: packageLotItemStatusLabelMap.pending,
	},
	packing: {
		...statusPresets.inProgress,
		label: packageLotItemStatusLabelMap.packing,
	},
	packed: {
		...statusPresets.inProgress,
		label: packageLotItemStatusLabelMap.packed,
	},
	shipped: {
		...statusPresets.inProgress,
		label: packageLotItemStatusLabelMap.shipped,
	},
	received: {
		...statusPresets.success,
		label: packageLotItemStatusLabelMap.received,
	},
	cancelled: {
		...statusPresets.failed,
		label: packageLotItemStatusLabelMap.cancelled,
	},
};

export const packageStatusOptions = Object.entries(packageStatusLabelMap).map(
	([value, label]) => ({
		value: value as PackageStatus,
		label,
	}),
);
