"use client";

import {
	CheckCircle2,
	Layers,
	PackageCheck,
	PlusIcon,
	RotateCcw,
	SearchIcon,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
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
import { useDebouncedValue } from "~/features/admin/crud/_lib/use-debounced-value";
import {
	operationStatusOptions,
	operationStrategyOptions,
} from "~/features/admin/crud/operation/operation.mappers";
import { OperationCreateDialog } from "~/features/admin/crud/operation/operation-create-dialog";
import { OperationDetailDialog } from "~/features/admin/crud/operation/operation-detail-dialog";
import { OperationTable } from "~/features/admin/crud/operation/operation-table";
import type { CrudSortDirection } from "~/shared/common/admin-crud/crud.types";
import type {
	OperationCreateFormValues,
	OperationListItem,
	OperationStatus,
	OperationStrategy,
} from "~/shared/common/admin-crud/operation.types";
import type { DiagnosticState } from "~/shared/common/admin-crud/operational-diagnostic.types";
import { api } from "~/trpc/react";

const allValue = "all";

export function OperationsClient({
	initialDetailId,
}: {
	initialDetailId?: number;
}) {
	const utils = api.useUtils();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<number>(25);
	const [sortDirection, setSortDirection] = useState<CrudSortDirection>("desc");
	const [searchTerm, setSearchTerm] = useState("");
	const [status, setStatus] = useState<OperationStatus | "all">("all");
	const [strategy, setStrategy] = useState<OperationStrategy | "all">("all");
	const [diagnosticState, setDiagnosticState] =
		useState<DiagnosticState>("all");
	const [createOpen, setCreateOpen] = useState(false);
	const [selectedOperationId, setSelectedOperationId] = useState<number | null>(
		initialDetailId ?? null,
	);

	const debouncedSearch = useDebouncedValue(searchTerm, 250);

	const updateFilter = <T,>(setter: (value: T) => void, value: T) => {
		setter(value);
		setPage(1);
	};

	const listInput = useMemo(
		() => ({
			page,
			pageSize,
			sortDirection,
			search: debouncedSearch.trim().length > 0 ? debouncedSearch : undefined,
			status: status === allValue ? undefined : status,
			strategy: strategy === allValue ? undefined : strategy,
			diagnosticState,
		}),
		[
			debouncedSearch,
			diagnosticState,
			page,
			pageSize,
			sortDirection,
			status,
			strategy,
		],
	);

	const clearFilters = () => {
		setSearchTerm("");
		setStatus("all");
		setStrategy("all");
		setDiagnosticState("all");
		setSortDirection("desc");
		setPage(1);
	};

	const operationsQuery = api.admin.operation.list.useQuery(listInput);
	const statsQuery = api.admin.operation.getStats.useQuery();
	const destinationsQuery = api.admin.destination.list.useQuery({
		includeDeleted: true,
	});
	const detailQuery = api.admin.operation.getById.useQuery(
		{ id: selectedOperationId ?? 0 },
		{ enabled: selectedOperationId !== null },
	);

	const invalidateOperationQueries = async () => {
		await Promise.all([
			utils.admin.operation.list.invalidate(),
			utils.admin.operation.getStats.invalidate(),
			utils.admin.operation.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.operation.createAndExecute.useMutation({
		onSuccess: async (operation) => {
			toast.success("Operación ejecutada");
			setCreateOpen(false);
			setSelectedOperationId(operation.id);
			await invalidateOperationQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo ejecutar la operación");
		},
	});

	const handleCreate = (values: OperationCreateFormValues) => {
		createMutation.mutate(values);
	};

	const handleView = (operation: OperationListItem) => {
		setSelectedOperationId(operation.id);
	};

	const renderTable = () => {
		if (operationsQuery.isLoading) return <CrudLoadingState />;

		if (operationsQuery.isError) {
			return (
				<CrudErrorState
					message={
						operationsQuery.error.message ||
						"No se pudo obtener la lista de operaciones"
					}
				/>
			);
		}

		const operations = operationsQuery.data?.items ?? [];

		if (operations.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros o crea una operación nueva."
					title="No hay operaciones para mostrar"
				/>
			);
		}

		return (
			<OperationTable
				onUnavailableAction={(action) =>
					toast.info(`${action} estara disponible en una version futura`)
				}
				onView={handleView}
				operations={operations}
			/>
		);
	};

	return (
		<CrudPageShell
			actions={
				<Button onClick={() => setCreateOpen(true)} variant="highlight">
					<PlusIcon data-icon="inline-start" />
					Nueva operación
				</Button>
			}
			description="Ejecución de asignación de demanda pagada a lotes y órdenes de proveedor."
			title="Operaciones"
		>
			{statsQuery.isLoading ? (
				<CrudLoadingState rows={2} />
			) : statsQuery.isError ? (
				<CrudErrorState
					message={
						statsQuery.error.message || "No se pudieron cargar los indicadores"
					}
				/>
			) : statsQuery.data ? (
				<CrudStatsCards
					stats={[
						{
							label: "Total",
							value: statsQuery.data.total,
							description: "Operaciones registradas",
							icon: Layers,
						},
						{
							label: "Completadas",
							value: statsQuery.data.completed,
							description: "Ejecución tecnica exitosa",
							icon: CheckCircle2,
							accent: "success",
						},
						{
							label: "Fallidas",
							value: statsQuery.data.failed,
							description: "Error tecnico",
							icon: XCircle,
							accent: "destructive",
						},
						{
							label: "Asignada",
							value: statsQuery.data.assignedQuantity,
							description: "Cantidad total asignada",
							icon: PackageCheck,
							accent: "info",
						},
						{
							label: "Rollover",
							value: statsQuery.data.rollOverQuantity,
							description: "Cantidad abierta",
							icon: RotateCcw,
							accent: "warning",
						},
					]}
				/>
			) : null}

			<section className="flex flex-col gap-3">
				<CrudFilterPanel
					actions={
						<CrudSortToggle onChange={setSortDirection} value={sortDirection} />
					}
					activeAdvancedCount={0}
					onReset={clearFilters}
					primary={
						<>
							<Field>
								<FieldLabel htmlFor="operation-search">Buscar</FieldLabel>
								<div className="relative">
									<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
									<Input
										className="pl-8"
										id="operation-search"
										onChange={(event) =>
											updateFilter(setSearchTerm, event.target.value)
										}
										placeholder="Código, destino o admin"
										value={searchTerm}
									/>
								</div>
							</Field>
							<Field>
								<FieldLabel htmlFor="operation-status-filter">
									Estado
								</FieldLabel>
								<Select
									id="operation-status-filter"
									onChange={(event) =>
										updateFilter(
											setStatus,
											event.target.value as OperationStatus | "all",
										)
									}
									value={status}
								>
									<option value={allValue}>Todos</option>
									{operationStatusOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="operation-strategy-filter">
									Estrategia
								</FieldLabel>
								<Select
									id="operation-strategy-filter"
									onChange={(event) =>
										updateFilter(
											setStrategy,
											event.target.value as OperationStrategy | "all",
										)
									}
									value={strategy}
								>
									<option value={allValue}>Todas</option>
									{operationStrategyOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="operation-diagnostics">
									Diagnósticos
								</FieldLabel>
								<Select
									id="operation-diagnostics"
									onChange={(event) =>
										updateFilter(
											setDiagnosticState,
											event.target.value as DiagnosticState,
										)
									}
									value={diagnosticState}
								>
									<option value="all">Todos</option>
									<option value="withDiagnostics">Con diagnósticos</option>
									<option value="withoutDiagnostics">Sin diagnósticos</option>
								</Select>
							</Field>
						</>
					}
				/>

				<CrudPaginationBar
					isLoading={operationsQuery.isLoading}
					onPageChange={setPage}
					onPageSizeChange={(value) => updateFilter(setPageSize, value)}
					page={page}
					pageCount={operationsQuery.data?.pageCount ?? 0}
					pageSize={pageSize}
					total={operationsQuery.data?.total ?? 0}
					totalLabel={{ singular: "operación", plural: "operaciones" }}
					truncated={operationsQuery.data?.truncated}
				/>

				{renderTable()}
			</section>

			<OperationCreateDialog
				destinations={destinationsQuery.data ?? []}
				isLoadingDestinations={destinationsQuery.isLoading}
				isSubmitting={createMutation.isPending}
				onOpenChange={setCreateOpen}
				onSubmit={handleCreate}
				open={createOpen}
			/>

			<OperationDetailDialog
				errorMessage={detailQuery.error?.message}
				isLoading={detailQuery.isPending && selectedOperationId !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedOperationId(null);
				}}
				open={selectedOperationId !== null}
				operation={detailQuery.data}
			/>
		</CrudPageShell>
	);
}
