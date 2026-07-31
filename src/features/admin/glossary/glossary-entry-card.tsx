"use client";

import { ArrowUpRightIcon, MessageSquarePlusIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { CopyIdentifierButton } from "./copy-identifier-button";
import { type GlossaryEntry, glossaryKindLabels } from "./glossary.types";

const kindVariant = {
	concept: "info",
	entity: "outline",
	status: "secondary",
} as const;

function IdentifierChip({ value }: { value: string }) {
	return (
		<span className="inline-flex items-center gap-0.5 rounded-lg bg-muted py-0.5 pr-0.5 pl-2 font-mono text-xs">
			{value}
			<CopyIdentifierButton value={value} />
		</span>
	);
}

export function GlossaryEntryCard({
	entry,
	onNavigate,
	onPropose,
	openProposalCount = 0,
}: {
	entry: GlossaryEntry;
	onNavigate: () => void;
	onPropose: (entry: GlossaryEntry) => void;
	/** Counted once for the whole dataset by the dialog: never query per card. */
	openProposalCount?: number;
}) {
	return (
		<article className="flex flex-col gap-2 rounded-2xl border p-3">
			<div className="flex flex-wrap items-center gap-2">
				<h4 className="font-medium text-sm">{entry.label}</h4>
				<Badge variant={kindVariant[entry.kind]}>
					{glossaryKindLabels[entry.kind]}
				</Badge>
				{entry.term && entry.term !== entry.label ? (
					<span className="text-muted-foreground text-xs">{entry.term}</span>
				) : null}
				{entry.href ? (
					<Link
						className="ml-auto inline-flex items-center gap-1 text-primary text-xs hover:underline"
						href={entry.href}
						onClick={onNavigate}
					>
						Ver pantalla
						<ArrowUpRightIcon className="size-3" />
					</Link>
				) : null}
				<div
					className={
						entry.href
							? "flex items-center gap-1"
							: "ml-auto flex items-center gap-1"
					}
				>
					{openProposalCount > 0 ? (
						<Badge title="propuestas sin resolver" variant="highlight">
							{openProposalCount}
						</Badge>
					) : null}
					<Button
						aria-label={`Proponer cambio para ${entry.label}`}
						onClick={() => onPropose(entry)}
						size="sm"
						type="button"
						variant="ghost"
					>
						<MessageSquarePlusIcon />
					</Button>
				</div>
			</div>

			{entry.definition ? (
				<p className="text-muted-foreground text-sm">{entry.definition}</p>
			) : null}

			{entry.occurrences && entry.occurrences.length > 0 ? (
				<div className="flex flex-col gap-1">
					{entry.occurrences.map((occurrence) => (
						<div
							className="flex flex-wrap items-center gap-1.5"
							key={occurrence.code}
						>
							<IdentifierChip value={occurrence.code} />
							<span className="text-muted-foreground text-xs">→</span>
							<IdentifierChip value={occurrence.db} />
						</div>
					))}
				</div>
			) : null}

			{entry.aliases && entry.aliases.length > 0 ? (
				<p className="text-muted-foreground text-xs">
					No usar: {entry.aliases.join(", ")}
				</p>
			) : null}
		</article>
	);
}
