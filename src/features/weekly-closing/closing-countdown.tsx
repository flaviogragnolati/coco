"use client";

import { cn } from "~/lib/utils";
import {
	formatClosingDate,
	formatTimeUntilClosing,
} from "~/shared/common/weekly-closing";
import { useWeeklyClosing } from "./weekly-closing-provider";

/**
 * Minute resolution and no live region on purpose: a per-minute announcement
 * would read as sales pressure.
 */
export function ClosingCountdown({ className }: { className?: string }) {
	const closing = useWeeklyClosing();
	if (!closing) return null;

	const { now, nextClosing } = closing;
	return (
		<p className={cn("whitespace-nowrap", className)}>
			Cierre del pedido:{" "}
			<time
				dateTime={nextClosing.toISOString()}
				title={formatClosingDate(nextClosing)}
			>
				{formatTimeUntilClosing(now, nextClosing)}
			</time>
		</p>
	);
}
