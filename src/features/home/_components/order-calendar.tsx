import type { CSSProperties } from "react";

import { cn } from "~/lib/utils";
import type { OrderCalendar as OrderCalendarData } from "../order-calendar";

type BarKind = OrderCalendarData["rows"][number]["bars"][number]["kind"];

const barClassName: Record<BarKind, string> = {
	order: "border-[1.75px] border-brand-ink bg-brand-soft",
	closing: "bg-highlight",
	trip: "bg-brand-ink",
	window:
		"border-[1.75px] border-brand-ink bg-[repeating-linear-gradient(135deg,var(--brand-ink)_0_5px,transparent_5px_10px)]",
	arrival: "border-[1.75px] border-brand-ink border-dashed bg-card",
};

/** Past this many columns the phone shows every other day label. */
const DENSE_COLUMNS = 24;

const rowClassName =
	"grid items-center gap-x-8 gap-y-2 md:grid-cols-[minmax(0,13.75rem)_minmax(0,1fr)]";

export function OrderCalendar({
	calendar,
	stepTitles,
	label,
	legend,
}: {
	calendar: OrderCalendarData;
	/** One per row, in step order. */
	stepTitles: string[];
	/** The accessible name: the drawing itself is hidden from screen readers. */
	label: string;
	legend: { kind: BarKind; label: string }[];
}) {
	const columns = calendar.days.length;
	const dense = columns > DENSE_COLUMNS;
	const track: CSSProperties = {
		gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
	};

	return (
		<div className="flex flex-col gap-5">
			<div aria-label={label} className="flex flex-col" role="img">
				<div className={cn(rowClassName, "items-end pb-2")}>
					<span className="hidden text-brand-warm-foreground/70 text-sm md:block">
						Cada columna es un día
					</span>
					<div
						className="grid text-center font-bold text-[11px] text-brand-warm-foreground/65 leading-none"
						style={track}
					>
						{calendar.days.map((day, index) => (
							<span
								className={cn(
									day.isClosingDay && "text-highlight-foreground",
									dense &&
										index % 2 === 1 &&
										!day.isClosingDay &&
										"max-md:invisible",
								)}
								// biome-ignore lint/suspicious/noArrayIndexKey: the column is the identity.
								key={index}
							>
								{day.label}
								{day.isClosingDay ? (
									<span className="mx-auto mt-1.5 block size-1.5 rounded-full bg-highlight" />
								) : null}
							</span>
						))}
					</div>
				</div>
				{calendar.rows.map((row, rowIndex) => {
					const hasWindow = row.bars.some((bar) => bar.kind === "window");
					return (
						<div
							className={cn(
								rowClassName,
								"border-brand-warm-foreground/15 border-t py-3.5",
							)}
							key={row.step}
						>
							<span className="font-heading font-semibold text-base/snug">
								{row.step} · {stepTitles[rowIndex]}
							</span>
							<div
								className="grid min-h-8.5 items-center bg-[linear-gradient(90deg,color-mix(in_oklch,var(--brand-warm-foreground)_10%,transparent)_1px,transparent_1px)]"
								style={{
									...track,
									backgroundSize: `calc(100% / ${columns}) 100%`,
								}}
							>
								{row.bars.map((bar) => (
									<span
										className={cn(
											"h-6.5 rounded-full",
											barClassName[bar.kind],
											bar.kind === "trip" && hasWindow && "rounded-r-none",
											bar.kind === "window" && "rounded-l-none",
										)}
										key={bar.kind}
										style={{ gridColumn: `${bar.from} / ${bar.to + 1}` }}
									/>
								))}
							</div>
						</div>
					);
				})}
			</div>
			<ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
				{legend.map((item) => (
					<li className="inline-flex items-center gap-2" key={item.kind}>
						<span
							aria-hidden="true"
							className={cn("h-3.5 w-7 rounded-full", barClassName[item.kind])}
						/>
						{item.label}
					</li>
				))}
			</ul>
		</div>
	);
}
