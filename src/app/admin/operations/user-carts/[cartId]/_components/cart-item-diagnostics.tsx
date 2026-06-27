import { Badge } from "~/components/ui/badge";
import type { OperationalDiagnostic } from "~/shared/common/admin-crud/operational-diagnostic.types";

function diagnosticKey(diagnostic: OperationalDiagnostic) {
	return `${diagnostic.code}-${JSON.stringify(diagnostic.refs ?? {})}`;
}

export function DiagnosticList({
	diagnostics,
	emptyLabel,
}: {
	diagnostics: OperationalDiagnostic[];
	emptyLabel: string;
}) {
	if (diagnostics.length === 0) {
		return <p className="text-muted-foreground text-xs">{emptyLabel}</p>;
	}

	return (
		<ul className="flex flex-col gap-2">
			{diagnostics.map((diagnostic) => (
				<li
					className="flex flex-col gap-1 rounded-none border p-2"
					key={diagnosticKey(diagnostic)}
				>
					<div className="flex items-center gap-2">
						<Badge
							variant={
								diagnostic.severity === "critical" ? "destructive" : "secondary"
							}
						>
							{diagnostic.severity === "critical" ? "Critico" : "Advertencia"}
						</Badge>
						<span className="font-mono text-[11px] text-muted-foreground">
							{diagnostic.code}
						</span>
					</div>
					<span className="text-sm">{diagnostic.message}</span>
				</li>
			))}
		</ul>
	);
}
