import { CheckCircle2, Layers, MinusCircle, Trash2 } from "lucide-react";

import type { CrudStatItem } from "~/features/admin/crud/_components/crud-stats-cards";

/**
 * Icon + accent for the shared Total/Active/Inactive/Deleted stat quartet that
 * every crud-home page renders. Clients spread the matching entry into their own
 * (gendered, entity-specific) labels/descriptions so only the visual treatment
 * is centralized:
 *
 *   { label: "Activas", value: stats.active, description: "…", ...crudStatusStatAccents.active }
 */
export const crudStatusStatAccents: Record<
	"total" | "active" | "inactive" | "deleted",
	Pick<CrudStatItem, "icon" | "accent">
> = {
	total: { icon: Layers, accent: "default" },
	active: { icon: CheckCircle2, accent: "success" },
	inactive: { icon: MinusCircle, accent: "default" },
	deleted: { icon: Trash2, accent: "destructive" },
};
