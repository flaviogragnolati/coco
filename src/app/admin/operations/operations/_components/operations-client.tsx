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
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudEmptyState,
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { CrudStatsCards } from "~/features/admin/crud/_components/crud-stats-cards";
import { operationStatusOptions } from "~/features/admin/crud/operation/operation.mappers";
import { OperationCreateDialog } from "~/features/admin/crud/operation/operation-create-dialog";
import { OperationDetailDialog } from "~/features/admin/crud/operation/operation-detail-dialog";
import { OperationTable } from "~/features/admin/crud/operation/operation-table";
import type {
	OperationCreateFormValues,
	OperationListItem,
	OperationStatus,
} from "~/shared/common/admin-crud/operation.types";
import { api } from "~/trpc/react";

const allValue = "all";

export function OperationsClient() {
	const utils = api.useUtils();
	const [searchTerm, setSearchTerm] = useState("");
	const [status, setStatus] = useState<OperationStatus | "all">("all");
	const [createOpen, setCreateOpen] = useState(false);
	const [selectedOperationId, setSelectedOperationId] = useState<number | null>(
		null,
	);

	const listInput = useMemo(
		() => ({
			search: searchTerm.trim().length > 0 ? searchTerm : undefined,
			status: status === allValue ? undefined : status,
			strategy: "fifo" as const,
		}),
		[searchTerm, status],
	);

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
			toast.success("Operacion ejecutada");
			setCreateOpen(false);
			setSelectedOperationId(operation.id);
			await invalidateOperationQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo ejecutar la operacion");
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

		const operations = operationsQuery.data ?? [];

		if (operations.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros o crea una operacion nueva."
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
				<div className="flex flex-wrap gap-2">
					<Button asChild variant="outline">
						<Link href="/admin/operations">Volver a operaciones</Link>
					</Button>
					<Button onClick={() => setCreateOpen(true)}>
						<PlusIcon data-icon="inline-start" />
						Nueva operacion
					</Button>
				</div>
			}
			description="Ejecucion de asignacion de demanda pagada a lotes y ordenes de proveedor."
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
							description: "Ejecucion tecnica exitosa",
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
				<div className="rounded-none border p-3">
					<FieldGroup className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_14rem]">
						<Field>
							<FieldLabel htmlFor="operation-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="operation-search"
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="Codigo, destino o admin"
									value={searchTerm}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel htmlFor="operation-status-filter">Estado</FieldLabel>
							<Select
								id="operation-status-filter"
								onChange={(event) =>
									setStatus(event.target.value as OperationStatus | "all")
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
					</FieldGroup>
				</div>

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
				isLoading={detailQuery.isFetching}
				onOpenChange={(open) => {
					if (!open) setSelectedOperationId(null);
				}}
				open={selectedOperationId !== null}
				operation={detailQuery.data}
			/>
		</CrudPageShell>
	);
}
