import type {
	PackageCommandKey,
	PackageLeg,
	PackageLotItemStatus,
	PackageStatus,
} from "~/shared/common/admin-crud/package.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

export const packageStatusLabelMap: Record<PackageStatus, string> = {
	pending: "Pendiente",
	packing: "Empacando",
	readyForShipment: "Listo para envío",
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

export const packageLegLabelMap: Record<PackageLeg, string> = {
	inbound: "Entrada",
	outbound: "Salida",
};

// A leg is a category, not a lifecycle — informational `inert` chips rather than
// lifecycle colours, the convention `shipmentTypeConfig` established.
export const packageLegConfig: Record<PackageLeg, StatusConfig> = {
	inbound: { ...statusPresets.inert, label: packageLegLabelMap.inbound },
	outbound: { ...statusPresets.inert, label: packageLegLabelMap.outbound },
};

export const packageLegOptions = Object.entries(packageLegLabelMap).map(
	([value, label]) => ({
		value: value as PackageLeg,
		label,
	}),
);

export const packageActionLabelMap: Record<PackageCommandKey, string> = {
	fractionate: "Fraccionar",
	promote: "Promover a salida",
	split: "Dividir",
	confirmDelivery: "Confirmar entrega",
	recover: "Recuperar",
	markDelayed: "Marcar demorado",
	markFailed: "Marcar fallido",
	writeOff: "Dar de baja",
};
