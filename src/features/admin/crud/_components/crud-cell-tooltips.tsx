import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const dateTooltipFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "full",
	timeStyle: "medium",
});

/**
 * Shared `#id` reference with a "{label} #{id}" tooltip. The trigger is a plain
 * span (`asChild`) so the `crud-table` interactive guard does not treat it as
 * interactive and keeps row navigation working.
 */
export function IdTooltip({
	id,
	label,
	className,
}: {
	id: number | string;
	label: string;
	className?: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span
					className={`w-fit cursor-help font-mono text-muted-foreground text-xs ${className ?? ""}`}
				>
					#{id}
				</span>
			</TooltipTrigger>
			<TooltipContent>
				{label} #{id}
			</TooltipContent>
		</Tooltip>
	);
}

/** Short date display with the full date/time revealed on hover. */
export function DateTooltip({
	value,
	className,
}: {
	value: Date | string;
	className?: string;
}) {
	const date = value instanceof Date ? value : new Date(value);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className={`w-fit cursor-help ${className ?? ""}`}>
					{dateFormatter.format(date)}
				</span>
			</TooltipTrigger>
			<TooltipContent>{dateTooltipFormatter.format(date)}</TooltipContent>
		</Tooltip>
	);
}
