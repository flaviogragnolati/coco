import { CheckCircle2, MinusCircle, Trash2 } from "lucide-react";

import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";

export function CrudStatusBadge({
	active,
	deleted,
}: {
	active: boolean;
	deleted?: boolean;
}) {
	if (deleted) {
		return (
			<StatusChip
				config={{ label: "Eliminado", variant: "destructive", icon: Trash2 }}
			/>
		);
	}

	return active ? (
		<StatusChip
			config={{ label: "Activo", variant: "success", icon: CheckCircle2 }}
		/>
	) : (
		<StatusChip
			config={{ label: "Inactivo", variant: "outline", icon: MinusCircle }}
		/>
	);
}
