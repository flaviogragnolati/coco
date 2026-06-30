"use client";

import {
	AlertTriangleIcon,
	ArrowLeftIcon,
	ClockIcon,
	LayersIcon,
	PackageCheckIcon,
	RotateCcwIcon,
	SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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
import { lotStatusOptions } from "~/features/admin/crud/lot/lot.mappers";
import { LotDetailDialog } from "~/features/admin/crud/lot/lot-detail-dialog";
import { LotTable } from "~/features/admin/crud/lot/lot-table";
import type {
	LotListItem,
	LotStatus,
} from "~/shared/common/admin-crud/lot.types";
import type { DiagnosticState } from "~/shared/common/admin-crud/operational-diagnostic.types";
import { api } from "~/trpc/react";

const allValue = "all";
const pageSizeOptions = [10, 25, 50, 100] as const;

function positiveIntOrUndefined(value: string) {
	if (!/^\d+$/.test(value)) return undefined;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function LotsClient() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] =
		useState<(typeof pageSizeOptions)[number]>(25);
	const [searchTerm, setSearchTerm] = useState("");
	const [status, setStatus] = useState<LotStatus | "all">("all");
	const [diagnosticState, setDiagnosticState] =
		useState<DiagnosticState>("all");
	const [operationId, setOperationId] = useState("");
	const [lotId, setLotId] = useState("");
	const [lotItemId, setLotItemId] = useState("");
	const [supplierId, setSupplierId] = useState("");
	const [supplierOrderId, setSupplierOrderId] = useState("");
	const [destinationId, setDestinationId] = useState("");
	const [createdFrom, setCreatedFrom] = useState("");
	const [createdTo, setCreatedTo] = useState("");
	const [selectedLotId, setSelectedLotId] = useState<number | null>(null);

	const updateFilter = <T,>(setter: (value: T) => void, value: T) => {
		setter(value);
		setPage(1);
	};

	const listInput = useMemo(
		() => ({
			page,
			pageSize,
			search: searchTerm.trim().length > 0 ? searchTerm : undefined,
			status: status === allValue ? undefined : status,
			diagnosticState,
			operationId: positiveIntOrUndefined(operationId),
			lotId: positiveIntOrUndefined(lotId),
			lotItemId: positiveIntOrUndefined(lotItemId),
			supplierId: positiveIntOrUndefined(supplierId),
			supplierOrderId: positiveIntOrUndefined(supplierOrderId),
			destinationId: positiveIntOrUndefined(destinationId),
			createdFrom: createdFrom || undefined,
			createdTo: createdTo || undefined,
		}),
		[
			createdFrom,
			createdTo,
			destinationId,
			diagnosticState,
			lotId,
			lotItemId,
			operationId,
			page,
			pageSize,
			searchTerm,
			status,
			supplierId,
			supplierOrderId,
		],
	);

	const listQuery = api.admin.lot.list.useQuery(listInput);
	const statsQuery = api.admin.lot.getStats.useQuery();
	const detailQuery = api.admin.lot.getById.useQuery(
		{ id: selectedLotId ?? 0 },
		{ enabled: selectedLotId !== null },
	);

	const clearFilters = () => {
		setSearchTerm("");
		setStatus("all");
		setDiagnosticState("all");
		setOperationId("");
		setLotId("");
		setLotItemId("");
		setSupplierId("");
		setSupplierOrderId("");
		setDestinationId("");
		setCreatedFrom("");
		setCreatedTo("");
		setPage(1);
	};

	const renderTable = () => {
		if (listQuery.isLoading) return <CrudLoadingState />;
		if (listQuery.isError) {
			return <CrudErrorState message={listQuery.error.message} />;
		}

		const lots = listQuery.data?.items ?? [];
		if (lots.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros para revisar otros lotes."
					title="No hay lotes para mostrar"
				/>
			);
		}

		return (
			<LotTable
				lots={lots}
				onSelect={(lot: LotListItem) => setSelectedLotId(lot.id)}
			/>
		);
	};

	const pageCount = listQuery.data?.pageCount ?? 0;
	const total = listQuery.data?.total ?? 0;

	return (
		<CrudPageShell
			actions={
				<Button asChild variant="outline">
					<Link href="/admin/operations">
						<ArrowLeftIcon data-icon="inline-start" />
						Operaciones
					</Link>
				</Button>
			}
			description="Revision read-only de lotes, lineas de lote, demanda asignada y diagnosticos operativos."
			title="Lotes"
		>
			{statsQuery.isLoading ? (
				<CrudLoadingState rows={2} />
			) : statsQuery.isError ? (
				<CrudErrorState message={statsQuery.error.message} />
			) : statsQuery.data ? (
				<CrudStatsCards
					stats={[
						{
							label: "Total",
							value: statsQuery.data.total,
							icon: LayersIcon,
						},
						{
							label: "Solicitados",
							value: statsQuery.data.byStatus.requested,
							icon: ClockIcon,
							accent: "info",
						},
						{
							label: "Cantidad demanda",
							value: statsQuery.data.demandAllocationQuantity,
							icon: PackageCheckIcon,
							accent: "info",
						},
						{
							label: "Con diagnosticos",
							value: statsQuery.data.withDiagnostics,
							icon: AlertTriangleIcon,
							accent: "warning",
						},
					]}
				/>
			) : null}

			<section className="flex flex-col gap-3">
				<div className="rounded-none border p-3">
					<FieldGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<Field>
							<FieldLabel htmlFor="lot-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="lot-search"
									onChange={(event) =>
										updateFilter(setSearchTerm, event.target.value)
									}
									placeholder="Lote, operacion, proveedor u orden"
									value={searchTerm}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel htmlFor="lot-status">Estado</FieldLabel>
							<Select
								id="lot-status"
								onChange={(event) =>
									updateFilter(
										setStatus,
										event.target.value as LotStatus | "all",
									)
								}
								value={status}
							>
								<option value={allValue}>Todos</option>
								{lotStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="lot-diagnostics">Diagnosticos</FieldLabel>
							<Select
								id="lot-diagnostics"
								onChange={(event) =>
									updateFilter(
										setDiagnosticState,
										event.target.value as DiagnosticState,
									)
								}
								value={diagnosticState}
							>
								<option value="all">Todos</option>
								<option value="withDiagnostics">Con diagnosticos</option>
								<option value="withoutDiagnostics">Sin diagnosticos</option>
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="lot-page-size">Tamaño pagina</FieldLabel>
							<Select
								id="lot-page-size"
								onChange={(event) =>
									updateFilter(
										setPageSize,
										Number(
											event.target.value,
										) as (typeof pageSizeOptions)[number],
									)
								}
								value={String(pageSize)}
							>
								{pageSizeOptions.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</Select>
						</Field>
						{[
							["operationId", "Operation ID", operationId, setOperationId],
							["lotId", "Lot ID", lotId, setLotId],
							["lotItemId", "Lot item ID", lotItemId, setLotItemId],
							["supplierId", "Supplier ID", supplierId, setSupplierId],
							[
								"supplierOrderId",
								"Supplier order ID",
								supplierOrderId,
								setSupplierOrderId,
							],
							[
								"destinationId",
								"Destination ID",
								destinationId,
								setDestinationId,
							],
						].map(([id, label, value, setter]) => (
							<Field key={id as string}>
								<FieldLabel htmlFor={`lot-${id}`}>{label as string}</FieldLabel>
								<Input
									id={`lot-${id}`}
									inputMode="numeric"
									onChange={(event) =>
										updateFilter(
											setter as (value: string) => void,
											event.target.value,
										)
									}
									value={value as string}
								/>
							</Field>
						))}
						<Field>
							<FieldLabel htmlFor="lot-created-from">Desde</FieldLabel>
							<Input
								id="lot-created-from"
								onChange={(event) =>
									updateFilter(setCreatedFrom, event.target.value)
								}
								type="datetime-local"
								value={createdFrom}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="lot-created-to">Hasta</FieldLabel>
							<Input
								id="lot-created-to"
								onChange={(event) =>
									updateFilter(setCreatedTo, event.target.value)
								}
								type="datetime-local"
								value={createdTo}
							/>
						</Field>
						<Field className="self-end">
							<Button onClick={clearFilters} type="button" variant="outline">
								<RotateCcwIcon data-icon="inline-start" />
								Limpiar
							</Button>
						</Field>
					</FieldGroup>
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<span className="text-muted-foreground text-sm">
						{listQuery.isLoading
							? "Cargando lotes"
							: `${total} lote${total === 1 ? "" : "s"}`}
					</span>
					<div className="flex items-center gap-2">
						<Button
							disabled={page <= 1 || listQuery.isLoading}
							onClick={() => setPage((current) => Math.max(1, current - 1))}
							type="button"
							variant="outline"
						>
							Anterior
						</Button>
						<span className="text-sm">
							Pagina {page} de {Math.max(pageCount, 1)}
						</span>
						<Button
							disabled={
								pageCount === 0 || page >= pageCount || listQuery.isLoading
							}
							onClick={() => setPage((current) => current + 1)}
							type="button"
							variant="outline"
						>
							Siguiente
						</Button>
					</div>
				</div>

				{renderTable()}
			</section>

			<LotDetailDialog
				errorMessage={detailQuery.error?.message}
				isLoading={detailQuery.isFetching}
				lot={detailQuery.data}
				onOpenChange={(open) => {
					if (!open) setSelectedLotId(null);
				}}
				open={selectedLotId !== null}
			/>
		</CrudPageShell>
	);
}
