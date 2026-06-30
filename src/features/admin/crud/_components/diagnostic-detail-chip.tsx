import { AlertOctagon, AlertTriangle } from "lucide-react";

import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import type { OperationalDiagnosticSeverity } from "~/shared/common/admin-crud/operational-diagnostic.types";

/**
 * Per-diagnostic chip: the diagnostic `code` as label, colored by severity
 * (critical → red, warning → amber). Mirrors the severity treatment of
 * `OperationalDiagnosticBadge` but for a single diagnostic instead of a count.
 */
export function DiagnosticDetailChip({
	code,
	severity,
}: {
	code: string;
	severity: OperationalDiagnosticSeverity;
}) {
	return (
		<StatusChip
			config={
				severity === "critical"
					? { label: code, variant: "destructive", icon: AlertOctagon }
					: { label: code, variant: "warning", icon: AlertTriangle }
			}
		/>
	);
}
