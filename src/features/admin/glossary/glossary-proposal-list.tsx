"use client";

import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "~/components/ui/empty";
import { Textarea } from "~/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { glossaryProposalTransitions } from "~/shared/common/admin-crud/glossary-proposal.transitions";
import type {
	GlossaryProposalListItem,
	GlossaryProposalResolution,
} from "~/shared/common/admin-crud/glossary-proposal.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import {
	glossaryProposalFieldLabelMap,
	glossaryProposalStatusConfig,
} from "./glossary-proposal.mappers";

const resolutionLabelMap: Record<GlossaryProposalResolution, string> = {
	accepted: "Aceptar",
	applied: "Marcar aplicada",
	rejected: "Rechazar",
};

const noPermissionReason =
	"Sólo un superadmin puede resolver una propuesta de glosario";

function ResolveButton({
	resolution,
	canResolve,
	isResolving,
	onResolve,
}: {
	resolution: GlossaryProposalResolution;
	canResolve: boolean;
	isResolving: boolean;
	onResolve: () => void;
}) {
	const label = resolutionLabelMap[resolution];
	const variant = resolution === "rejected" ? "outline" : "highlight";

	if (canResolve) {
		return (
			<Button
				disabled={isResolving}
				onClick={onResolve}
				size="sm"
				type="button"
				variant={variant}
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
					size="sm"
					type="button"
					variant={variant}
				>
					{label}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{noPermissionReason}</TooltipContent>
		</Tooltip>
	);
}

function ProposalCard({
	proposal,
	entryExists,
	canResolve,
	isResolving,
	onResolve,
}: {
	proposal: GlossaryProposalListItem;
	entryExists: boolean;
	canResolve: boolean;
	isResolving: boolean;
	onResolve: (
		proposal: GlossaryProposalListItem,
		status: GlossaryProposalResolution,
		resolutionNote?: string,
	) => void;
}) {
	const [note, setNote] = useState("");
	const resolutions = glossaryProposalTransitions[proposal.status];

	return (
		<article className="flex flex-col gap-2 rounded-2xl border p-3">
			<div className="flex flex-wrap items-center gap-2">
				<StatusChip config={glossaryProposalStatusConfig[proposal.status]} />
				<span className="font-medium text-sm">{proposal.entryLabel}</span>
				<Badge variant="outline">
					{glossaryProposalFieldLabelMap[proposal.field]}
				</Badge>
				{entryExists ? null : (
					<span className="text-muted-foreground text-xs">
						La entrada «{proposal.entrySlug}» ya no está en el glosario
					</span>
				)}
			</div>

			<div className="grid gap-2 md:grid-cols-2">
				<div className="flex flex-col gap-0.5">
					<span className="text-muted-foreground text-xs">Valor actual</span>
					<p className="whitespace-pre-line text-muted-foreground text-sm">
						{proposal.currentValue ?? "—"}
					</p>
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="text-muted-foreground text-xs">Propuesta</span>
					<p className="whitespace-pre-line text-sm">{proposal.proposed}</p>
				</div>
			</div>

			{proposal.reason ? (
				<p className="whitespace-pre-line text-sm">{proposal.reason}</p>
			) : null}

			<p className="text-muted-foreground text-xs">
				{proposal.proposer?.name ?? "Autor dado de baja"} ·{" "}
				{formatDateTimeShort(proposal.createdAt)}
				{proposal.resolver && proposal.resolvedAt
					? ` · resuelta por ${proposal.resolver.name} el ${formatDateTimeShort(proposal.resolvedAt)}`
					: null}
			</p>

			{proposal.resolutionNote ? (
				<p className="whitespace-pre-line text-muted-foreground text-xs">
					{proposal.resolutionNote}
				</p>
			) : null}

			{resolutions.length > 0 ? (
				<div className="flex flex-col gap-2">
					{canResolve ? (
						<Textarea
							aria-label={`Nota de resolución para ${proposal.entryLabel}`}
							disabled={isResolving}
							onChange={(event) => setNote(event.target.value)}
							placeholder="Nota de resolución (opcional)"
							rows={2}
							value={note}
						/>
					) : null}
					<div className="flex flex-wrap items-center gap-2">
						{resolutions.map((resolution) => (
							<ResolveButton
								canResolve={canResolve}
								isResolving={isResolving}
								key={resolution}
								onResolve={() => onResolve(proposal, resolution, note)}
								resolution={resolution}
							/>
						))}
					</div>
				</div>
			) : null}
		</article>
	);
}

export function GlossaryProposalList({
	proposals,
	knownSlugs,
	canResolve,
	isResolving,
	onResolve,
}: {
	proposals: GlossaryProposalListItem[];
	knownSlugs: ReadonlySet<string>;
	canResolve: boolean;
	isResolving: boolean;
	onResolve: (
		proposal: GlossaryProposalListItem,
		status: GlossaryProposalResolution,
		resolutionNote?: string,
	) => void;
}) {
	if (proposals.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>Sin propuestas</EmptyTitle>
					<EmptyDescription>
						Desde cualquier término del glosario se puede proponer un cambio de
						nombre, de definición o de identificador.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			{proposals.map((proposal) => (
				<ProposalCard
					canResolve={canResolve}
					entryExists={knownSlugs.has(proposal.entrySlug)}
					isResolving={isResolving}
					key={proposal.id}
					onResolve={onResolve}
					proposal={proposal}
				/>
			))}
		</div>
	);
}
