"use client";

import {
	ArrowRightIcon,
	ChevronDownIcon,
	InfoIcon,
	MegaphoneIcon,
	MinusCircleIcon,
	MoveRightIcon,
	PlusCircleIcon,
	ScaleIcon,
	Undo2Icon,
	UsersIcon,
} from "lucide-react";
import { useState } from "react";
import type {
	EffectLineKind,
	ResolvedDisclosure,
} from "~/features/admin/crud/_lib/fulfillment-effects.types";
import { cn } from "~/lib/utils";

const iconByKind: Record<EffectLineKind, typeof PlusCircleIcon> = {
	creates: PlusCircleIcon,
	deletes: MinusCircleIcon,
	transition: MoveRightIcon,
	quantity: ScaleIcon,
	customer: MegaphoneIcon,
	note: InfoIcon,
};

// Only the two lines an operator must not skim past get a colour: what the
// customer will see, and what disappears for good.
const toneByKind: Record<EffectLineKind, string> = {
	creates: "text-muted-foreground",
	deletes: "text-destructive",
	transition: "text-muted-foreground",
	quantity: "text-muted-foreground",
	customer: "text-info",
	note: "text-muted-foreground",
};

/**
 * "Qué va a pasar": the effect disclosure of the command the dialog is about to
 * run. Purely presentational — it receives an already-resolved disclosure and
 * computes nothing, so the catalog stays the only place effects are declared.
 *
 * No scroll container of its own: `CrudFormDialogShell` already owns the dialog's
 * `overflow-y-auto`, and nesting a second one strands the footer.
 */
export function CrudEffectsPanel({
	disclosure,
}: {
	disclosure: ResolvedDisclosure;
}) {
	const [detailOpen, setDetailOpen] = useState(false);
	const hasDetail = disclosure.detail.length > 0;

	return (
		<section className="flex flex-col gap-2 rounded-2xl border p-3 text-xs">
			<h3 className="font-semibold text-muted-foreground uppercase tracking-wide">
				Qué va a pasar
			</h3>

			{disclosure.lines.length === 0 ? (
				<p className="text-muted-foreground">
					No cambia ningún registro operativo.
				</p>
			) : (
				<ul className="flex flex-col gap-1">
					{disclosure.lines.map((line) => {
						const Icon = iconByKind[line.icon];

						return (
							<li className="flex items-start gap-2" key={line.text}>
								<Icon
									className={cn(
										"mt-0.5 size-3.5 shrink-0",
										toneByKind[line.icon],
									)}
								/>
								<span>{line.text}</span>
							</li>
						);
					})}
				</ul>
			)}

			<div className="flex flex-col gap-1 border-t pt-2 text-muted-foreground">
				<span className="flex items-start gap-2">
					<UsersIcon className="mt-0.5 size-3.5 shrink-0" />
					{disclosure.demandNote}
				</span>
				<span className="flex items-start gap-2">
					<Undo2Icon className="mt-0.5 size-3.5 shrink-0" />
					{disclosure.undoNote}
				</span>
				{disclosure.nextLabel ? (
					<span className="flex items-start gap-2">
						<ArrowRightIcon className="mt-0.5 size-3.5 shrink-0" />
						Después: {disclosure.nextLabel}
					</span>
				) : null}
			</div>

			{hasDetail ? (
				<div className="flex flex-col gap-1 border-t pt-2">
					<button
						className="flex items-center gap-1 self-start text-muted-foreground hover:text-foreground"
						onClick={() => setDetailOpen((open) => !open)}
						type="button"
					>
						<ChevronDownIcon
							className={
								detailOpen ? "size-3.5 rotate-180" : "size-3.5 transition"
							}
						/>
						Ver detalle ({disclosure.detail.length})
					</button>
					{detailOpen ? (
						<dl className="flex flex-col gap-1">
							{disclosure.detail.map((row) => (
								<div
									className="flex justify-between gap-3"
									key={`${row.label}-${row.value}`}
								>
									<dt className="text-muted-foreground">{row.label}</dt>
									<dd className="text-right">{row.value}</dd>
								</div>
							))}
						</dl>
					) : null}
				</div>
			) : null}
		</section>
	);
}
