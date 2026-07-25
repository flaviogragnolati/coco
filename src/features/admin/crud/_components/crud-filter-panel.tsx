"use client";

import {
	ChevronDownIcon,
	RotateCcwIcon,
	SlidersHorizontalIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { FieldGroup } from "~/components/ui/field";

/**
 * Filter shell for the operational admin lists: the handful of controls people
 * reach for every day stay visible, everything else lives behind "Filtros".
 *
 * Both slots receive already-built `Field`s whose values are owned by the
 * caller, so collapsing the advanced area never drops a filter — the badge
 * keeps reporting how many are still applied.
 */
export function CrudFilterPanel({
	primary,
	advanced,
	activeAdvancedCount,
	actions,
	onReset,
	defaultOpen,
}: {
	primary: ReactNode;
	advanced?: ReactNode;
	/** Advanced filters currently applied. Primary ones are visible already. */
	activeAdvancedCount: number;
	/** Right-aligned slot next to the buttons, for the sort toggle. */
	actions?: ReactNode;
	onReset?: () => void;
	defaultOpen?: boolean;
}) {
	// Deep-links (`/admin/tracking?lotId=1`) land with advanced filters applied,
	// so the panel opens on mount — and only on mount, never on later renders.
	const [open, setOpen] = useState(
		() => Boolean(defaultOpen) || activeAdvancedCount > 0,
	);

	return (
		<Collapsible
			className="flex flex-col gap-3 rounded-2xl border p-3"
			onOpenChange={setOpen}
			open={open}
		>
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<FieldGroup className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{primary}
				</FieldGroup>
				<div className="flex flex-wrap items-center gap-2">
					{actions}
					{advanced ? (
						<CollapsibleTrigger asChild>
							<Button type="button" variant="outline">
								<SlidersHorizontalIcon data-icon="inline-start" />
								Filtros
								{activeAdvancedCount > 0 ? (
									<Badge variant="highlight">{activeAdvancedCount}</Badge>
								) : null}
								<ChevronDownIcon
									className={`transition-transform ${open ? "rotate-180" : ""}`}
									data-icon="inline-end"
								/>
							</Button>
						</CollapsibleTrigger>
					) : null}
					{onReset ? (
						<Button onClick={onReset} type="button" variant="outline">
							<RotateCcwIcon data-icon="inline-start" />
							Limpiar
						</Button>
					) : null}
				</div>
			</div>

			{advanced ? (
				<CollapsibleContent>
					<FieldGroup className="grid gap-3 border-t pt-3 sm:grid-cols-2 xl:grid-cols-4">
						{advanced}
					</FieldGroup>
				</CollapsibleContent>
			) : null}
		</Collapsible>
	);
}
