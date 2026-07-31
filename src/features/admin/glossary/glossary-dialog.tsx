"use client";

import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "~/components/ui/empty";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CrudSortToggle } from "~/features/admin/crud/_components/crud-sort-toggle";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import type { GlossaryProposalStatus } from "~/shared/common/admin-crud/glossary-proposal.types";
import { api } from "~/trpc/react";
import { glossaryEntries } from "./glossary.data";
import {
	countActiveGlossaryFilters,
	emptyGlossaryFilters,
	filterGlossaryEntries,
	type GlossaryFilters,
	type GlossarySortDirection,
	groupGlossaryEntries,
} from "./glossary.filters";
import { glossarySections } from "./glossary.sections";
import {
	type GlossaryEntry,
	type GlossaryKind,
	glossaryKindLabels,
} from "./glossary.types";
import { GlossaryEntryCard } from "./glossary-entry-card";
import {
	glossaryProposalStatusFilterOptions,
	unresolvedGlossaryProposalStatuses,
} from "./glossary-proposal.mappers";
import { GlossaryProposalDialog } from "./glossary-proposal-dialog";
import { GlossaryProposalList } from "./glossary-proposal-list";

const allValue = "all";
const unresolvedValue = "unresolved";

type ProposalStatusFilter = GlossaryProposalStatus | "unresolved" | "all";

const knownSlugs = new Set(glossaryEntries.map((entry) => entry.slug));

export function GlossaryDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	// Filters deliberately survive closing the dialog: a consultation session
	// usually reopens on the same term. The active tab is kept for the same
	// reason — someone tracking a proposal reopens on the proposals.
	const [filters, setFilters] = useState<GlossaryFilters>(emptyGlossaryFilters);
	const [sortDirection, setSortDirection] =
		useState<GlossarySortDirection>("asc");
	const [tab, setTab] = useState("terminos");
	const [proposalStatus, setProposalStatus] =
		useState<ProposalStatusFilter>(unresolvedValue);
	const [proposalTarget, setProposalTarget] = useState<GlossaryEntry | null>(
		null,
	);

	const utils = api.useUtils();

	// One query for the whole dialog: it feeds the tab counter, the per-entry
	// badges and the list. It fires when the dialog mounts, which is the first
	// time the FAB opens it — no admin page pays for the glossary (ADR 0007).
	const proposalsQuery = api.admin.glossaryProposal.list.useQuery({
		status: allValue,
	});
	const viewerQuery = api.admin.user.me.useQuery();
	const canResolve = viewerQuery.data?.role === "superadmin";

	const resolveMutation = api.admin.glossaryProposal.resolve.useMutation({
		onSuccess: async () => {
			toast.success("Propuesta actualizada");
			await utils.admin.glossaryProposal.list.invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar la propuesta");
		},
	});

	const proposals = useMemo(
		() => proposalsQuery.data ?? [],
		[proposalsQuery.data],
	);

	const unresolvedCount = proposals.filter((proposal) =>
		unresolvedGlossaryProposalStatuses.includes(proposal.status),
	).length;

	const openCountBySlug = useMemo(() => {
		const counts = new Map<string, number>();

		for (const proposal of proposals) {
			if (!unresolvedGlossaryProposalStatuses.includes(proposal.status)) {
				continue;
			}
			counts.set(proposal.entrySlug, (counts.get(proposal.entrySlug) ?? 0) + 1);
		}

		return counts;
	}, [proposals]);

	const visibleProposals = useMemo(() => {
		if (proposalStatus === allValue) return proposals;
		if (proposalStatus === unresolvedValue) {
			return proposals.filter((proposal) =>
				unresolvedGlossaryProposalStatuses.includes(proposal.status),
			);
		}

		return proposals.filter((proposal) => proposal.status === proposalStatus);
	}, [proposals, proposalStatus]);

	const groups = useMemo(() => {
		return groupGlossaryEntries(
			filterGlossaryEntries(glossaryEntries, filters),
			sortDirection,
		);
	}, [filters, sortDirection]);

	const matchCount = groups.reduce(
		(total, group) => total + group.entries.length,
		0,
	);
	const hasFilters =
		countActiveGlossaryFilters(filters) > 0 || filters.search.length > 0;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			{/* Scroll lives on the list below, not on the content box, so the
			    controls stay pinned while the entries move. */}
			<DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col gap-4 overflow-hidden sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Glosario</DialogTitle>
					<DialogDescription>
						Qué significa cada término, cómo se llama en el código y en qué
						tabla y columna vive.
					</DialogDescription>
				</DialogHeader>

				<Tabs
					className="flex min-h-0 flex-1 flex-col gap-4"
					onValueChange={setTab}
					value={tab}
				>
					<TabsList>
						<TabsTrigger value="terminos">Términos</TabsTrigger>
						<TabsTrigger value="propuestas">
							Propuestas
							{unresolvedCount > 0 ? (
								<Badge variant="highlight">{unresolvedCount}</Badge>
							) : null}
						</TabsTrigger>
					</TabsList>

					<TabsContent
						className="flex min-h-0 flex-1 flex-col gap-4"
						value="terminos"
					>
						<div className="flex flex-col gap-3 rounded-2xl border p-3">
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								<Field>
									<FieldLabel htmlFor="glossary-search">Buscar</FieldLabel>
									<div className="relative">
										<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
										{/* Autofocused on purpose: searching is the dialog's whole point. */}
										<Input
											autoFocus
											className="pl-8"
											id="glossary-search"
											onChange={(event) =>
												setFilters((current) => ({
													...current,
													search: event.target.value,
												}))
											}
											placeholder="Término, estado, tabla o columna"
											value={filters.search}
										/>
									</div>
								</Field>
								<Field>
									<FieldLabel htmlFor="glossary-section">Sección</FieldLabel>
									<Select
										id="glossary-section"
										onChange={(event) =>
											setFilters((current) => ({
												...current,
												section: event.target
													.value as GlossaryFilters["section"],
											}))
										}
										value={filters.section}
									>
										<option value={allValue}>Todas</option>
										{glossarySections.map((section) => (
											<option key={section.id} value={section.id}>
												{section.label}
											</option>
										))}
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor="glossary-kind">Tipo</FieldLabel>
									<Select
										id="glossary-kind"
										onChange={(event) =>
											setFilters((current) => ({
												...current,
												kind: event.target.value as GlossaryFilters["kind"],
											}))
										}
										value={filters.kind}
									>
										<option value={allValue}>Todos</option>
										{Object.entries(glossaryKindLabels).map(([kind, label]) => (
											<option key={kind} value={kind as GlossaryKind}>
												{label}
											</option>
										))}
									</Select>
								</Field>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="text-muted-foreground text-xs">
									{matchCount} de {glossaryEntries.length}
								</p>
								<div className="flex items-center gap-2">
									<CrudSortToggle
										oldestLabel="A-Z"
										onChange={setSortDirection}
										recentLabel="Z-A"
										value={sortDirection}
									/>
									{hasFilters ? (
										<Button
											onClick={() => setFilters(emptyGlossaryFilters)}
											size="sm"
											type="button"
											variant="outline"
										>
											Limpiar
										</Button>
									) : null}
								</div>
							</div>
						</div>

						<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
							{groups.length === 0 ? (
								<Empty>
									<EmptyHeader>
										<EmptyTitle>Sin resultados</EmptyTitle>
										<EmptyDescription>
											Probá con otro término, o limpiá los filtros de sección y
											tipo.
										</EmptyDescription>
									</EmptyHeader>
								</Empty>
							) : (
								groups.map((group) => (
									<section className="flex flex-col gap-2" key={group.section}>
										<h3 className="sticky top-0 z-10 bg-popover py-1 font-heading font-medium text-sm">
											{group.label}
											<span className="ml-2 font-normal text-muted-foreground text-xs">
												{group.entries.length}
											</span>
										</h3>
										<div className="grid gap-2 lg:grid-cols-2">
											{group.entries.map((entry) => (
												<GlossaryEntryCard
													entry={entry}
													key={entry.slug}
													onNavigate={() => onOpenChange(false)}
													onPropose={setProposalTarget}
													openProposalCount={openCountBySlug.get(entry.slug)}
												/>
											))}
										</div>
									</section>
								))
							)}
						</div>
					</TabsContent>

					<TabsContent
						className="flex min-h-0 flex-1 flex-col gap-3"
						value="propuestas"
					>
						<Field className="max-w-56">
							<FieldLabel htmlFor="glossary-proposal-status">Estado</FieldLabel>
							<Select
								id="glossary-proposal-status"
								onChange={(event) =>
									setProposalStatus(event.target.value as ProposalStatusFilter)
								}
								value={proposalStatus}
							>
								{glossaryProposalStatusFilterOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>

						<div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
							{proposalsQuery.isLoading ? (
								<CrudLoadingState rows={3} />
							) : proposalsQuery.isError ? (
								<CrudErrorState message={proposalsQuery.error.message} />
							) : (
								<GlossaryProposalList
									canResolve={canResolve}
									isResolving={resolveMutation.isPending}
									knownSlugs={knownSlugs}
									onResolve={(proposal, status, resolutionNote) =>
										resolveMutation.mutate({
											id: proposal.id,
											status,
											resolutionNote,
										})
									}
									proposals={visibleProposals}
								/>
							)}
						</div>
					</TabsContent>
				</Tabs>

				<GlossaryProposalDialog
					entry={proposalTarget ?? undefined}
					onOpenChange={(nextOpen) => {
						if (!nextOpen) setProposalTarget(null);
					}}
					open={proposalTarget !== null}
				/>
			</DialogContent>
		</Dialog>
	);
}
