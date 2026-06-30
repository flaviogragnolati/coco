"use client";

import {
	AlertTriangleIcon,
	ArrowLeftIcon,
	BoxesIcon,
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
import { packageStatusOptions } from "~/features/admin/crud/package/package.mappers";
import { PackageDetailDialog } from "~/features/admin/crud/package/package-detail-dialog";
import { PackageTable } from "~/features/admin/crud/package/package-table";
import type { DiagnosticState } from "~/shared/common/admin-crud/operational-diagnostic.types";
import type {
	PackageListItem,
	PackageStatus,
} from "~/shared/common/admin-crud/package.types";
import { api } from "~/trpc/react";

const allValue = "all";
const pageSizeOptions = [10, 25, 50, 100] as const;

function positiveIntOrUndefined(value: string) {
	if (!/^\d+$/.test(value)) return undefined;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function PackagesClient() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] =
		useState<(typeof pageSizeOptions)[number]>(25);
	const [searchTerm, setSearchTerm] = useState("");
	const [status, setStatus] = useState<PackageStatus | "all">("all");
	const [diagnosticState, setDiagnosticState] =
		useState<DiagnosticState>("all");
	const [packageId, setPackageId] = useState("");
	const [shipmentId, setShipmentId] = useState("");
	const [lotId, setLotId] = useState("");
	const [lotItemId, setLotItemId] = useState("");
	const [productId, setProductId] = useState("");
	const [createdFrom, setCreatedFrom] = useState("");
	const [createdTo, setCreatedTo] = useState("");
	const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
		null,
	);

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
			packageId: positiveIntOrUndefined(packageId),
			shipmentId: positiveIntOrUndefined(shipmentId),
			lotId: positiveIntOrUndefined(lotId),
			lotItemId: positiveIntOrUndefined(lotItemId),
			productId: positiveIntOrUndefined(productId),
			createdFrom: createdFrom || undefined,
			createdTo: createdTo || undefined,
		}),
		[
			createdFrom,
			createdTo,
			diagnosticState,
			lotId,
			lotItemId,
			packageId,
			page,
			pageSize,
			productId,
			searchTerm,
			shipmentId,
			status,
		],
	);

	const listQuery = api.admin.package.list.useQuery(listInput);
	const statsQuery = api.admin.package.getStats.useQuery();
	const detailQuery = api.admin.package.getById.useQuery(
		{ id: selectedPackageId ?? 0 },
		{ enabled: selectedPackageId !== null },
	);

	const clearFilters = () => {
		setSearchTerm("");
		setStatus("all");
		setDiagnosticState("all");
		setPackageId("");
		setShipmentId("");
		setLotId("");
		setLotItemId("");
		setProductId("");
		setCreatedFrom("");
		setCreatedTo("");
		setPage(1);
	};

	const renderTable = () => {
		if (listQuery.isLoading) return <CrudLoadingState />;
		if (listQuery.isError)
			return <CrudErrorState message={listQuery.error.message} />;

		const packages = listQuery.data?.items ?? [];
		if (packages.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros para revisar otros paquetes."
					title="No hay paquetes para mostrar"
				/>
			);
		}

		return (
			<PackageTable
				onSelect={(pkg: PackageListItem) => setSelectedPackageId(pkg.id)}
				packages={packages}
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
			description="Revision read-only de paquetes, lineas, asignaciones empaquetadas y diagnosticos operativos."
			title="Paquetes"
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
							label: "Listos envio",
							value: statsQuery.data.byStatus.readyForShipment,
							icon: PackageCheckIcon,
							accent: "info",
						},
						{
							label: "Asignado",
							value: statsQuery.data.packagedAllocationQuantity,
							icon: BoxesIcon,
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
							<FieldLabel htmlFor="package-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="package-search"
									onChange={(event) =>
										updateFilter(setSearchTerm, event.target.value)
									}
									placeholder="Paquete, tracking o envio"
									value={searchTerm}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel htmlFor="package-status">Estado</FieldLabel>
							<Select
								id="package-status"
								onChange={(event) =>
									updateFilter(
										setStatus,
										event.target.value as PackageStatus | "all",
									)
								}
								value={status}
							>
								<option value={allValue}>Todos</option>
								{packageStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="package-diagnostics">
								Diagnosticos
							</FieldLabel>
							<Select
								id="package-diagnostics"
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
							<FieldLabel htmlFor="package-page-size">Tamaño pagina</FieldLabel>
							<Select
								id="package-page-size"
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
							["packageId", "Package ID", packageId, setPackageId],
							["shipmentId", "Shipment ID", shipmentId, setShipmentId],
							["lotId", "Lot ID", lotId, setLotId],
							["lotItemId", "Lot item ID", lotItemId, setLotItemId],
							["productId", "Product ID", productId, setProductId],
						].map(([id, label, value, setter]) => (
							<Field key={id as string}>
								<FieldLabel htmlFor={`package-${id}`}>
									{label as string}
								</FieldLabel>
								<Input
									id={`package-${id}`}
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
							<FieldLabel htmlFor="package-created-from">Desde</FieldLabel>
							<Input
								id="package-created-from"
								onChange={(event) =>
									updateFilter(setCreatedFrom, event.target.value)
								}
								type="datetime-local"
								value={createdFrom}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="package-created-to">Hasta</FieldLabel>
							<Input
								id="package-created-to"
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
							? "Cargando paquetes"
							: `${total} paquete${total === 1 ? "" : "s"}`}
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

			<PackageDetailDialog
				errorMessage={detailQuery.error?.message}
				isLoading={detailQuery.isFetching}
				onOpenChange={(open) => {
					if (!open) setSelectedPackageId(null);
				}}
				open={selectedPackageId !== null}
				pkg={detailQuery.data}
			/>
		</CrudPageShell>
	);
}
