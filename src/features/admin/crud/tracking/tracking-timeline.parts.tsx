import type { ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import { IdTooltip } from "~/features/admin/crud/_components/crud-cell-tooltips";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import type { AdminTrackingTimelineItem } from "~/shared/common/tracking.types";
import {
	formatTrackingRefs,
	trackingEventTypeConfig,
	trackingSourceOptions,
} from "./tracking.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const sourceLabelMap = Object.fromEntries(
	trackingSourceOptions.map((option) => [option.value, option.label]),
) as Record<AdminTrackingTimelineItem["source"], string>;

export function JsonPreview({ value }: { value: unknown }) {
	if (value === null || value === undefined) {
		return <span className="text-muted-foreground text-xs">Sin metadata</span>;
	}

	return (
		<pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-none border bg-muted/30 p-2 font-mono text-[11px]">
			{JSON.stringify(value, null, 2)}
		</pre>
	);
}

/**
 * Renders one tracking event as a timeline `<li>`. Shared by the tracking detail
 * dialog (which passes the related-entities summary via `extra`) and the cart
 * traceability screen (which renders the base event only).
 */
export function TrackingTimelineItemCard({
	item,
	extra,
}: {
	item: AdminTrackingTimelineItem;
	extra?: ReactNode;
}) {
	const refs = formatTrackingRefs(item.refs);

	return (
		<li className="grid gap-3 rounded-none border p-3 lg:grid-cols-[12rem_1fr]">
			<div className="flex flex-col gap-1">
				<span className="font-medium text-sm">
					{dateFormatter.format(new Date(item.createdAt))}
				</span>
				<Badge variant="secondary">{sourceLabelMap[item.source]}</Badge>
				<IdTooltip id={item.id} label="Evento" />
			</div>

			<div className="flex min-w-0 flex-col gap-3">
				<div className="flex flex-col gap-1">
					<StatusChip config={trackingEventTypeConfig[item.eventType]} />
					<span className="font-mono text-[11px] text-muted-foreground">
						{item.eventKey ?? "Sin eventKey"}
					</span>
					<span className="text-muted-foreground text-xs">
						Actor: {item.actor.reference ?? item.actor.userId ?? "Sin actor"}
						{item.quantity ? ` / Cantidad: ${item.quantity}` : ""}
					</span>
				</div>

				<div className="flex flex-wrap gap-1">
					{refs.length > 0 ? (
						refs.map((ref) => (
							<Badge key={ref} variant="secondary">
								{ref}
							</Badge>
						))
					) : (
						<span className="text-muted-foreground text-xs">Sin refs</span>
					)}
				</div>

				{extra}

				<details className="rounded-none border bg-background p-2">
					<summary className="cursor-pointer font-medium text-xs">
						Metadata
					</summary>
					<div className="mt-2">
						<JsonPreview value={item.metadata} />
					</div>
				</details>
			</div>
		</li>
	);
}

export function TrackingTimeline({
	items,
	emptyLabel,
}: {
	items: AdminTrackingTimelineItem[];
	emptyLabel: string;
}) {
	if (items.length === 0) {
		return (
			<div className="rounded-none border p-3 text-muted-foreground text-sm">
				{emptyLabel}
			</div>
		);
	}

	return (
		<ol className="grid gap-3">
			{items.map((item) => (
				<TrackingTimelineItemCard item={item} key={item.id} />
			))}
		</ol>
	);
}
