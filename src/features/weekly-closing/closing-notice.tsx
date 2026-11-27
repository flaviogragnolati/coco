"use client";

import { cn } from "~/lib/utils";
import {
	formatClosingCountdown,
	formatClosingDate,
	formatDeliveryLeadTime,
	formatTimeUntilClosing,
} from "~/shared/common/weekly-closing";
import { useWeeklyClosing } from "./weekly-closing-provider";

export type ClosingNoticeVariant = "cart" | "awaitingPayment" | "paid";

/**
 * What the next closing means for the order in view. Conditional on purpose:
 * the weekly closing is informative, and whether a transfer verified after it
 * still joins is not decided (QA #127).
 */
function closingSentence(variant: ClosingNoticeVariant, leadTime: string) {
	switch (variant) {
		case "cart":
			return `Lo que pagues antes entra en la compra de esta semana y llega ${leadTime} después.`;
		case "awaitingPayment":
			return "Si el pago entra antes, tu pedido va en la compra de esta semana.";
		case "paid":
			return `Tu pedido ya está adentro. Desde el cierre tarda ${leadTime} en llegar.`;
	}
}

/**
 * The "Cierre del pedido" box of the order page and of an order that still
 * joins the next closing: the same mint box as the home countdown. Minute
 * resolution and no live region, like `ClosingCountdown`. Renders nothing
 * outside the storefront provider (the tutorial).
 */
export function ClosingNotice({
	variant,
	className,
}: {
	variant: ClosingNoticeVariant;
	className?: string;
}) {
	const closing = useWeeklyClosing();
	if (!closing) return null;

	const { now, nextClosing, schedule } = closing;
	return (
		<aside
			aria-label="Cierre del pedido"
			className={cn(
				"grid gap-x-5 gap-y-1 rounded-2xl bg-brand-soft px-5 py-4 text-brand-soft-foreground sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center",
				className,
			)}
		>
			<p className="whitespace-nowrap font-extrabold font-heading text-3xl text-brand-ink tabular-nums leading-none tracking-tight sm:row-span-2 dark:text-brand-soft-foreground">
				<span aria-hidden="true">
					{formatClosingCountdown(now, nextClosing)}
				</span>
				<span className="sr-only">
					{formatTimeUntilClosing(now, nextClosing)}
				</span>
			</p>
			<span className="inline-flex items-center gap-2 font-bold text-[11px] uppercase leading-none tracking-[0.12em]">
				<span aria-hidden="true" className="size-2 rounded-full bg-highlight" />
				Cierre del pedido
			</span>
			<p className="text-sm">
				<time
					className="inline-block font-semibold first-letter:uppercase"
					dateTime={nextClosing.toISOString()}
				>
					{formatClosingDate(nextClosing)}
				</time>
				. {closingSentence(variant, formatDeliveryLeadTime(schedule))}
			</p>
		</aside>
	);
}
