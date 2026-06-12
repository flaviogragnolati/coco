import { Badge } from "~/components/ui/badge";
import type { OperationalDiagnosticSeverity } from "~/shared/common/admin-crud/operational-diagnostic.types";

export function OperationalDiagnosticBadge({
	count,
	severity,
}: {
	count: number;
	severity: OperationalDiagnosticSeverity | null;
}) {
	if (count === 0) return <Badge variant="outline">Sin diagnosticos</Badge>;

	return (
		<Badge variant={severity === "critical" ? "destructive" : "secondary"}>
			{count} diagnostico{count === 1 ? "" : "s"}
		</Badge>
	);
}
