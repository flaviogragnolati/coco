"use client";

import { Button } from "~/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";

/**
 * One command button rendered straight from the server's `availableActions`. The
 * UI never re-derives a ladder rule — duplicating them is exactly the dual-truth
 * problem the shared transition module exists to end.
 */
export function CrudAvailableAction({
	label,
	enabled,
	reason,
	destructive,
	onClick,
}: {
	label: string;
	enabled: boolean;
	reason?: string;
	destructive?: boolean;
	onClick: () => void;
}) {
	if (enabled) {
		return (
			<Button
				onClick={onClick}
				type="button"
				variant={destructive ? "destructive" : "outline"}
			>
				{label}
			</Button>
		);
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				{/* `aria-disabled` rather than `disabled`: the control has to stay
				    hoverable and focusable for the tooltip to explain itself. */}
				<Button
					aria-disabled
					className="opacity-50"
					onClick={(event) => event.preventDefault()}
					type="button"
					variant={destructive ? "destructive" : "outline"}
				>
					{label}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{reason ?? "Acción no disponible"}</TooltipContent>
		</Tooltip>
	);
}
