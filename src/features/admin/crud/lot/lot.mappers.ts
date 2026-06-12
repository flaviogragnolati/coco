import type { LotStatus } from "~/shared/common/admin-crud/lot.types";

export const lotStatusLabelMap: Record<LotStatus, string> = {
	pending: "Pendiente",
	assembling: "Armando",
	requested: "Solicitado",
	confirmed: "Confirmado",
	readyForPackaging: "Listo para empaque",
	completed: "Completado",
	cancelled: "Cancelado",
};

export const lotStatusOptions = Object.entries(lotStatusLabelMap).map(
	([value, label]) => ({
		value: value as LotStatus,
		label,
	}),
);
