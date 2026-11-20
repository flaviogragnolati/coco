import { DetailEmpty } from "~/features/admin/crud/_components/crud-detail";
import { DiagnosticDetailChip } from "~/features/admin/crud/_components/diagnostic-detail-chip";
import { cn } from "~/lib/utils";
import type { OperationalDiagnostic } from "~/shared/common/admin-crud/operational-diagnostic.types";

function diagnosticKey(diagnostic: OperationalDiagnostic) {
	return `${diagnostic.code}-${JSON.stringify(diagnostic.refs ?? {})}`;
}

/**
 * Same treatment as `DetailDiagnosticList`, composed here because a cart can
 * repeat a diagnostic code across records: the key needs the refs too.
 */
export function DiagnosticList({
	diagnostics,
	emptyLabel,
}: {
	diagnostics: OperationalDiagnostic[];
	emptyLabel: string;
}) {
	if (diagnostics.length === 0) {
		return <DetailEmpty>{emptyLabel}</DetailEmpty>;
	}

	return (
		<ul className="flex flex-col gap-2">
			{diagnostics.map((diagnostic) => (
				<li
					className={cn(
						"flex flex-col items-start gap-1.5 rounded-xl border-l-2 bg-muted/40 px-3 py-2",
						diagnostic.severity === "critical"
							? "border-l-destructive"
							: "border-l-warning",
					)}
					key={diagnosticKey(diagnostic)}
				>
					<DiagnosticDetailChip
						code={diagnostic.code}
						severity={diagnostic.severity}
					/>
					<p className="text-xs/relaxed">{diagnostic.message}</p>
				</li>
			))}
		</ul>
	);
}
