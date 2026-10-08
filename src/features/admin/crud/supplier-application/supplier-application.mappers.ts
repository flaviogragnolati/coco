import { InboxIcon } from "lucide-react";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";
import type {
	SupplierApplicationListItem,
	SupplierApplicationStatus,
} from "~/shared/common/admin-crud/supplier-application.types";

export const supplierApplicationStatusLabelMap: Record<
	SupplierApplicationStatus,
	string
> = {
	pending: "Sin contactar",
	contacted: "Contactada",
};

export const supplierApplicationStatusConfig: Record<
	SupplierApplicationStatus,
	StatusConfig
> = {
	pending: {
		...statusPresets.attention,
		icon: InboxIcon,
		label: supplierApplicationStatusLabelMap.pending,
	},
	contacted: {
		...statusPresets.success,
		label: supplierApplicationStatusLabelMap.contacted,
	},
};

export const supplierApplicationStatusOptions = Object.entries(
	supplierApplicationStatusLabelMap,
).map(([value, label]) => ({
	value: value as SupplierApplicationStatus,
	label,
}));

export function supplierApplicationStatusOf(
	application: Pick<SupplierApplicationListItem, "contactedAt">,
): SupplierApplicationStatus {
	return application.contactedAt ? "contacted" : "pending";
}
