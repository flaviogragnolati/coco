"use client";

import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
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
import { CrudSortToggle } from "~/features/admin/crud/_components/crud-sort-toggle";
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
import { type GlossaryKind, glossaryKindLabels } from "./glossary.types";
import { GlossaryEntryCard } from "./glossary-entry-card";

const allValue = "all";

export function GlossaryDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	// Filters deliberately survive closing the dialog: a consultation session
	// usually reopens on the same term.
	const [filters, setFilters] = useState<GlossaryFilters>(emptyGlossaryFilters);
	const [sortDirection, setSortDirection] =
		useState<GlossarySortDirection>("asc");

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
										section: event.target.value as GlossaryFilters["section"],
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
										/>
									))}
								</div>
							</section>
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
