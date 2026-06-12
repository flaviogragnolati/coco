import type { PackageStatus } from "~/shared/common/admin-crud/package.types";

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

export const packageStatusOptions = Object.entries(packageStatusLabelMap).map(
	([value, label]) => ({
		value: value as PackageStatus,
		label,
	}),
);
