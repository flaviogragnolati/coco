import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";

import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import type { OperationalDiagnosticSeverity } from "~/shared/common/admin-crud/operational-diagnostic.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";

export function OperationalDiagnosticBadge({
	count,
	severity,
}: {
	count: number;
	severity: OperationalDiagnosticSeverity | null;
}) {
	if (count === 0) {
		return (
			<StatusChip
				config={{
					label: "Sin diagnosticos",
					variant: "outline",
					icon: CheckCircle2,
				}}
			/>
		);
	}

	const label = `${count} diagnostico${count === 1 ? "" : "s"}`;

	const config: StatusConfig =
		severity === "critical"
			? { label, variant: "destructive", icon: AlertOctagon }
			: { label, variant: "warning", icon: AlertTriangle };

	return <StatusChip config={config} />;
}
