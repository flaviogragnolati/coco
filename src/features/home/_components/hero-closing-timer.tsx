"use client";

import { useWeeklyClosing } from "~/features/weekly-closing/weekly-closing-provider";
import {
	formatClosingDate,
	formatTimeUntilClosing,
	splitTimeUntilClosing,
} from "~/shared/common/weekly-closing";

function Amount({ value, unit }: { value: number; unit: string }) {
	return (
		<span className="inline-flex items-baseline gap-1">
			<span className="font-extrabold font-heading text-3xl text-brand-ink leading-none tracking-tight dark:text-brand-soft-foreground">
				{value}
			</span>
			{unit}
		</span>
	);
}

/**
 * Minute resolution and no live region, like `ClosingCountdown`. Renders
 * nothing outside the storefront provider (the tutorial).
 */
export function HeroClosingTimer() {
	const closing = useWeeklyClosing();
	if (!closing) return null;

	const { now, nextClosing } = closing;
	const { days, hours, minutes } = splitTimeUntilClosing(now, nextClosing);
	return (
		<aside
			aria-label="Próximo cierre"
			className="flex min-w-62.5 flex-col gap-1.5 self-start rounded-2xl bg-brand-soft px-5 py-4 text-brand-soft-foreground md:self-end"
		>
			<span className="inline-flex items-center gap-2 font-bold text-[11px] uppercase leading-none tracking-[0.12em]">
				<span
					aria-hidden="true"
					className="size-2 animate-closing-pulse rounded-full bg-highlight"
				/>
				Próximo cierre
			</span>
			<p className="flex items-baseline gap-3 font-semibold text-sm tabular-nums">
				<span aria-hidden="true" className="contents">
					<Amount unit="d" value={days} />
					<Amount unit="h" value={hours} />
					<Amount unit="min" value={minutes} />
				</span>
				<span className="sr-only">
					{formatTimeUntilClosing(now, nextClosing)}
				</span>
			</p>
			<p className="text-sm first-letter:uppercase">
				<time dateTime={nextClosing.toISOString()}>
					{formatClosingDate(nextClosing)}
				</time>
			</p>
		</aside>
	);
}
