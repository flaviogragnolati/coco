"use client";

import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

/**
 * Selectable card used by the Envío and Pago steps: the whole left region is a
 * single toggle button, while `actions` (chip + Editar) stay outside it so the
 * markup keeps a valid, non-nested interactive tree.
 */
export function SelectableTile({
	selected,
	onSelect,
	children,
	actions,
	className,
}: {
	selected: boolean;
	onSelect: () => void;
	children: ReactNode;
	actions?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col gap-3 rounded-3xl bg-card p-3 shadow-sm ring-1 ring-foreground/5 transition-all md:flex-row md:items-start md:justify-between dark:ring-foreground/10",
				selected && "ring-2 ring-success/40",
				className,
			)}
		>
			<button
				aria-pressed={selected}
				className="flex flex-1 flex-col gap-1 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
				onClick={onSelect}
				type="button"
			>
				{children}
			</button>
			{actions ? (
				<div className="flex items-center gap-2">{actions}</div>
			) : null}
		</div>
	);
}
