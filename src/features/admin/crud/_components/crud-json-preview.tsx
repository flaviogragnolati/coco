/**
 * Raw JSON payload (operation summaries, shipment snapshots) rendered as an
 * escape hatch for the technical sections of the detail dialogs — everything a
 * reader normally needs is surfaced as structured UI above it.
 */
export function JsonPreview({
	value,
	emptyLabel = "Sin datos",
}: {
	value: unknown;
	emptyLabel?: string;
}) {
	if (value === null || value === undefined) {
		return <span className="text-muted-foreground text-xs">{emptyLabel}</span>;
	}

	return (
		<pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-2 font-mono text-[11px]">
			{JSON.stringify(value, null, 2)}
		</pre>
	);
}
