"use client";

import {
	CheckCircle2Icon,
	LayersIcon,
	PackageCheckIcon,
	RotateCcwIcon,
	SearchIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { CrudFilterPanel } from "~/features/admin/crud/_components/crud-filter-panel";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import { CrudPaginationBar } from "~/features/admin/crud/_components/crud-pagination-bar";
import { CrudSortToggle } from "~/features/admin/crud/_components/crud-sort-toggle";
import {
	CrudEmptyState,
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { CrudStatsCards } from "~/features/admin/crud/_components/crud-stats-cards";
import { RollOverResolveDialog } from "~/features/admin/crud/operation/roll-over-resolve-dialog";
import {
	rollOverStageOptions,
	rollOverStatusOptions,
} from "~/features/admin/crud/roll-over/roll-over.mappers";
import { RollOverTable } from "~/features/admin/crud/roll-over/roll-over-table";
import type { CrudSortDirection } from "~/shared/common/admin-crud/crud.types";
import type {
	RollOverListItem,
	RollOverStage,
	RollOverStatus,
} from "~/shared/common/admin-crud/roll-over.types";
import { api } from "~/trpc/react";

const allValue = "all";

function positiveIntOrUndefined(value: string) {
	if (!/^\d+$/.test(value)) return undefined;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function RollOversClient() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<number>(25);
	const [sortDirection, setSortDirection] = useState<CrudSortDirection>("desc");
	const [searchTerm, setSearchTerm] = useState("");
	// Deliberately unset: a resolved roll over is terminal demand, and finding
	// those is the reason this page exists.
	const [status, setStatus] = useState<RollOverStatus | "all">("all");
	const [stage, setStage] = useState<RollOverStage | "all">("all");
	const [operationId, setOperationId] = useState("");
	const [cartItemId, setCartItemId] = useState("");
	const [createdFrom, setCreatedFrom] = useState("");
	const [createdTo, setCreatedTo] = useState("");
	const [resolving, setResolving] = useState<RollOverListItem | null>(null);

	const updateFilter = <T,>(setter: (value: T) => void, value: T) => {
		setter(value);
		setPage(1);
	};

	const listInput = useMemo(
		() => ({
			page,
			pageSize,
			sortDirection,
			search: searchTerm.trim().length > 0 ? searchTerm : undefined,
			status: status === allValue ? undefined : status,
			stage: stage === allValue ? undefined : stage,
			operationId: positiveIntOrUndefined(operationId),
			cartItemId: positiveIntOrUndefined(cartItemId),
			createdFrom: createdFrom || undefined,
			createdTo: createdTo || undefined,
		}),
		[
			cartItemId,
			createdFrom,
			createdTo,
			operationId,
			page,
			pageSize,
			searchTerm,
			sortDirection,
			stage,
			status,
		],
	);

	const activeAdvancedCount = [
		operationId,
		cartItemId,
		createdFrom,
		createdTo,
	].filter((value) => value.length > 0).length;

	const listQuery = api.admin.rollOver.list.useQuery(listInput);
	const statsQuery = api.admin.rollOver.getStats.useQuery();

	const clearFilters = () => {
		setSearchTerm("");
		setStatus("all");
		setStage("all");
		setOperationId("");
		setCartItemId("");
		setCreatedFrom("");
		setCreatedTo("");
		setSortDirection("desc");
		setPage(1);
	};

	const renderTable = () => {
		if (listQuery.isLoading) return <CrudLoadingState />;
		if (listQuery.isError) {
			return <CrudErrorState message={listQuery.error.message} />;
		}

		const rollOvers = listQuery.data?.items ?? [];
		if (rollOvers.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros para revisar otros rollovers."
					title="No hay rollovers para mostrar"
				/>
			);
		}

		return <RollOverTable onResolve={setResolving} rollOvers={rollOvers} />;
	};

	const idFilters = [
		["operationId", "Operation ID", operationId, setOperationId],
		["cartItemId", "Cart item ID", cartItemId, setCartItemId],
	] as const;

	return (
		<CrudPageShell
			description="Demanda reprogramada de todas las operaciones: abierta, reagrupada, resuelta o cancelada."
			title="Rollovers"
		>
			{statsQuery.isLoading ? (
				<CrudLoadingState rows={2} />
			) : statsQuery.isError ? (
				<CrudErrorState message={statsQuery.error.message} />
			) : statsQuery.data ? (
				<CrudStatsCards
					stats={[
						{ label: "Total", value: statsQuery.data.total, icon: LayersIcon },
						{
							label: "Abiertos",
							value: statsQuery.data.byStatus.open,
							icon: RotateCcwIcon,
							accent: "warning",
						},
						{
							label: "Resueltos",
							value: statsQuery.data.byStatus.resolved,
							icon: CheckCircle2Icon,
							accent: "info",
						},
						{
							label: "Cantidad abierta",
							value: statsQuery.data.openQuantity,
							icon: PackageCheckIcon,
							accent: "info",
						},
					]}
				/>
			) : null}

			<section className="flex flex-col gap-3">
				<CrudFilterPanel
					actions={
						<CrudSortToggle onChange={setSortDirection} value={sortDirection} />
					}
					activeAdvancedCount={activeAdvancedCount}
					advanced={
						<>
							{idFilters.map(([id, label, value, setter]) => (
								<Field key={id}>
									<FieldLabel htmlFor={`roll-over-${id}`}>{label}</FieldLabel>
									<Input
										id={`roll-over-${id}`}
										inputMode="numeric"
										onChange={(event) =>
											updateFilter(setter, event.target.value)
										}
										value={value}
									/>
								</Field>
							))}
							<Field>
								<FieldLabel htmlFor="roll-over-created-from">Desde</FieldLabel>
								<Input
									id="roll-over-created-from"
									onChange={(event) =>
										updateFilter(setCreatedFrom, event.target.value)
									}
									type="datetime-local"
									value={createdFrom}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="roll-over-created-to">Hasta</FieldLabel>
								<Input
									id="roll-over-created-to"
									onChange={(event) =>
										updateFilter(setCreatedTo, event.target.value)
									}
									type="datetime-local"
									value={createdTo}
								/>
							</Field>
						</>
					}
					onReset={clearFilters}
					primary={
						<>
							<Field>
								<FieldLabel htmlFor="roll-over-search">Buscar</FieldLabel>
								<div className="relative">
									<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
									<Input
										className="pl-8"
										id="roll-over-search"
										onChange={(event) =>
											updateFilter(setSearchTerm, event.target.value)
										}
										placeholder="Motivo, operación o item"
										value={searchTerm}
									/>
								</div>
							</Field>
							<Field>
								<FieldLabel htmlFor="roll-over-status">Estado</FieldLabel>
								<Select
									id="roll-over-status"
									onChange={(event) =>
										updateFilter(
											setStatus,
											event.target.value as RollOverStatus | "all",
										)
									}
									value={status}
								>
									<option value={allValue}>Todos</option>
									{rollOverStatusOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="roll-over-stage">Etapa</FieldLabel>
								<Select
									id="roll-over-stage"
									onChange={(event) =>
										updateFilter(
											setStage,
											event.target.value as RollOverStage | "all",
										)
									}
									value={stage}
								>
									<option value={allValue}>Todas</option>
									{rollOverStageOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</Field>
						</>
					}
				/>

				<CrudPaginationBar
					isLoading={listQuery.isLoading}
					onPageChange={setPage}
					onPageSizeChange={(value) => updateFilter(setPageSize, value)}
					page={page}
					pageCount={listQuery.data?.pageCount ?? 0}
					pageSize={pageSize}
					total={listQuery.data?.total ?? 0}
					totalLabel={{ singular: "rollover", plural: "rollovers" }}
					truncated={listQuery.data?.truncated}
				/>

				{renderTable()}
			</section>

			<RollOverResolveDialog
				onOpenChange={(open) => {
					if (!open) setResolving(null);
				}}
				open={resolving !== null}
				rollOver={
					resolving
						? {
								id: resolving.id,
								quantity: resolving.quantity,
								cartItemCode: resolving.cartItem.code,
							}
						: undefined
				}
			/>
		</CrudPageShell>
	);
}
