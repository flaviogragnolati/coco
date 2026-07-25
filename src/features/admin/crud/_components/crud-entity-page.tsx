"use client";

import { PlusIcon, SearchIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "~/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { CrudDeleteDialog } from "~/features/admin/crud/_components/crud-delete-dialog";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudEmptyState,
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { CrudStatsCards } from "~/features/admin/crud/_components/crud-stats-cards";
import {
	buildCrudStatItems,
	type CrudEntityCopy,
	type CrudEntityStats,
	crudElementIds,
} from "~/features/admin/crud/_lib/crud-entity-copy";
import {
	type CrudListSort,
	crudListSortOptions,
} from "~/features/admin/crud/_lib/crud-list-sort";
import type { CrudQueryLike } from "~/features/admin/crud/_lib/use-crud-entity-page";
import type { CrudStatusFilter } from "~/shared/common/admin-crud/crud.types";

type CrudEntityPageState<TListItem> = {
	includeDeleted: boolean;
	setIncludeDeleted: (value: boolean) => void;
	statusFilter: CrudStatusFilter;
	setStatusFilter: (value: CrudStatusFilter) => void;
	searchTerm: string;
	setSearchTerm: (value: string) => void;
	listSort: CrudListSort;
	setListSort: (value: CrudListSort) => void;
	softDeleteTarget: TListItem | null;
	setSoftDeleteTarget: (target: TListItem | null) => void;
	hardDeleteTarget: TListItem | null;
	setHardDeleteTarget: (target: TListItem | null) => void;
	openCreate: () => void;
};

type CrudDeleteHandler<TListItem> = {
	isPending: boolean;
	onConfirm: (target: TListItem) => void;
};

/**
 * The crud-home page template: create action, stats quartet, filter bar,
 * list-state gate, and both delete dialogs. The entity table and form dialog
 * arrive as render props so their per-entity prop names (`brands`,
 * `isLoadingCarrier`, …) stay untouched.
 *
 * `copy.pageShell` selects the layout: a standalone page with a header, or a
 * bare panel that carries its own create button (the product-terms tabs).
 */
export function CrudEntityPage<
	TListItem extends { active: boolean; deleted?: boolean },
>({
	copy,
	state,
	statsQuery,
	listQuery,
	filteredItems,
	softDelete,
	hardDelete,
	renderTable,
	renderFormDialog,
	extras,
}: {
	copy: CrudEntityCopy<TListItem>;
	state: CrudEntityPageState<TListItem>;
	statsQuery: CrudQueryLike<CrudEntityStats>;
	listQuery: CrudQueryLike<TListItem[]>;
	filteredItems: TListItem[];
	softDelete: CrudDeleteHandler<TListItem>;
	hardDelete: CrudDeleteHandler<TListItem>;
	renderTable: () => ReactNode;
	renderFormDialog: () => ReactNode;
	extras?: ReactNode;
}) {
	const { includeDeletedId, searchId } = crudElementIds(copy);
	const sortId = `${searchId}-sort`;
	const stats = statsQuery.data;
	const { hardDeleteTarget, softDeleteTarget } = state;

	const statsBlock = statsQuery.isLoading ? (
		<CrudLoadingState rows={2} />
	) : statsQuery.isError ? (
		<CrudErrorState
			message={statsQuery.error?.message || copy.statsErrorMessage}
		/>
	) : stats ? (
		<CrudStatsCards stats={buildCrudStatItems(copy, stats)} />
	) : null;

	const createButton = (
		<Button onClick={state.openCreate} variant="highlight">
			<PlusIcon data-icon="inline-start" />
			{copy.createButtonLabel}
		</Button>
	);

	const filterBar = (
		<div className="flex flex-col gap-3 rounded-2xl border p-3 lg:flex-row lg:items-end lg:justify-between">
			<FieldGroup className="grid flex-1 gap-3 md:grid-cols-[minmax(14rem,1fr)_auto_auto_auto] md:items-end">
				<Field>
					<FieldLabel htmlFor={searchId}>Buscar</FieldLabel>
					<div className="relative">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							className="pl-8"
							id={searchId}
							onChange={(event) => state.setSearchTerm(event.target.value)}
							placeholder={copy.searchPlaceholder}
							value={state.searchTerm}
						/>
					</div>
				</Field>
				<Field>
					<FieldLabel>Estado</FieldLabel>
					<ToggleGroup
						onValueChange={(value) => {
							if (value) state.setStatusFilter(value as CrudStatusFilter);
						}}
						type="single"
						value={state.statusFilter}
						variant="outline"
					>
						<ToggleGroupItem value="all">Todos</ToggleGroupItem>
						<ToggleGroupItem value="active">
							{copy.statusLabels.active}
						</ToggleGroupItem>
						<ToggleGroupItem value="inactive">
							{copy.statusLabels.inactive}
						</ToggleGroupItem>
					</ToggleGroup>
				</Field>
				<Field className="md:w-44">
					<FieldLabel htmlFor={sortId}>Orden</FieldLabel>
					<Select
						id={sortId}
						onChange={(event) =>
							state.setListSort(event.target.value as CrudListSort)
						}
						value={state.listSort}
					>
						{crudListSortOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
				</Field>
				<Field orientation="horizontal">
					<Switch
						checked={state.includeDeleted}
						id={includeDeletedId}
						onCheckedChange={state.setIncludeDeleted}
					/>
					<FieldContent>
						<FieldLabel htmlFor={includeDeletedId}>
							{copy.includeDeletedLabel}
						</FieldLabel>
						<FieldDescription>{copy.includeDeletedHint}</FieldDescription>
					</FieldContent>
				</Field>
			</FieldGroup>
		</div>
	);

	const listContent = listQuery.isLoading ? (
		<CrudLoadingState />
	) : listQuery.isError ? (
		<CrudErrorState
			message={listQuery.error?.message || copy.listErrorMessage}
		/>
	) : filteredItems.length === 0 ? (
		<CrudEmptyState
			description={copy.empty.description}
			title={copy.empty.title}
		/>
	) : (
		renderTable()
	);

	const dialogs = (
		<>
			{renderFormDialog()}
			{extras}

			<CrudDeleteDialog
				confirmLabel={copy.softDelete.confirmLabel}
				description={
					softDeleteTarget ? copy.softDelete.describe(softDeleteTarget) : ""
				}
				isPending={softDelete.isPending}
				onConfirm={() => {
					if (softDeleteTarget) softDelete.onConfirm(softDeleteTarget);
				}}
				onOpenChange={(open) => {
					if (!open) state.setSoftDeleteTarget(null);
				}}
				open={Boolean(softDeleteTarget)}
				title={copy.softDelete.title}
			/>

			<CrudDeleteDialog
				confirmationLabel={
					hardDeleteTarget
						? copy.hardDelete.confirmationLabel?.(hardDeleteTarget)
						: undefined
				}
				confirmationValue={
					hardDeleteTarget
						? copy.hardDelete.confirmationValue?.(hardDeleteTarget)
						: undefined
				}
				confirmLabel={copy.hardDelete.confirmLabel}
				description={
					hardDeleteTarget ? copy.hardDelete.describe(hardDeleteTarget) : ""
				}
				isPending={hardDelete.isPending}
				onConfirm={() => {
					if (hardDeleteTarget) hardDelete.onConfirm(hardDeleteTarget);
				}}
				onOpenChange={(open) => {
					if (!open) state.setHardDeleteTarget(null);
				}}
				open={Boolean(hardDeleteTarget)}
				title={copy.hardDelete.title}
			/>
		</>
	);

	if (!copy.pageShell) {
		return (
			<section className="flex flex-col gap-3">
				<div className="flex justify-end">{createButton}</div>
				{statsBlock}
				{filterBar}
				{listContent}
				{dialogs}
			</section>
		);
	}

	return (
		<CrudPageShell
			actions={createButton}
			description={copy.pageShell.description}
			title={copy.pageShell.title}
		>
			{statsBlock}

			<section className="flex flex-col gap-3">
				{filterBar}
				{listContent}
			</section>

			{dialogs}
		</CrudPageShell>
	);
}
