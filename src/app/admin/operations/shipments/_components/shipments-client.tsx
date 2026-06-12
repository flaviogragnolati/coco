"use client";

import { ArrowLeftIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
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
import {
	shipmentStatusOptions,
	shipmentTypeOptions,
} from "~/features/admin/crud/shipment/shipment.mappers";
import { ShipmentDetailDialog } from "~/features/admin/crud/shipment/shipment-detail-dialog";
import { ShipmentTable } from "~/features/admin/crud/shipment/shipment-table";
import type { DiagnosticState } from "~/shared/common/admin-crud/operational-diagnostic.types";
import type {
	ShipmentListItem,
	ShipmentStatus,
	ShipmentType,
} from "~/shared/common/admin-crud/shipment.types";
import { api } from "~/trpc/react";

const allValue = "all";
const pageSizeOptions = [10, 25, 50, 100] as const;

function positiveIntOrUndefined(value: string) {
	if (!/^\d+$/.test(value)) return undefined;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function ShipmentsClient() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] =
		useState<(typeof pageSizeOptions)[number]>(25);
	const [searchTerm, setSearchTerm] = useState("");
	const [status, setStatus] = useState<ShipmentStatus | "all">("all");
	const [type, setType] = useState<ShipmentType | "all">("all");
	const [diagnosticState, setDiagnosticState] =
		useState<DiagnosticState>("all");
	const [shipmentId, setShipmentId] = useState("");
	const [carrierOrderId, setCarrierOrderId] = useState("");
	const [carrierId, setCarrierId] = useState("");
	const [trackingCode, setTrackingCode] = useState("");
	const [createdFrom, setCreatedFrom] = useState("");
	const [createdTo, setCreatedTo] = useState("");
	const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(
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
			type: type === allValue ? undefined : type,
			diagnosticState,
			shipmentId: positiveIntOrUndefined(shipmentId),
			carrierOrderId: positiveIntOrUndefined(carrierOrderId),
			carrierId: positiveIntOrUndefined(carrierId),
			trackingCode: trackingCode.trim().length > 0 ? trackingCode : undefined,
			createdFrom: createdFrom || undefined,
			createdTo: createdTo || undefined,
		}),
		[
			carrierId,
			carrierOrderId,
			createdFrom,
			createdTo,
			diagnosticState,
			page,
			pageSize,
			searchTerm,
			shipmentId,
			status,
			trackingCode,
			type,
		],
	);

	const listQuery = api.admin.shipment.list.useQuery(listInput);
	const statsQuery = api.admin.shipment.getStats.useQuery();
	const detailQuery = api.admin.shipment.getById.useQuery(
		{ id: selectedShipmentId ?? 0 },
		{ enabled: selectedShipmentId !== null },
	);

	const clearFilters = () => {
		setSearchTerm("");
		setStatus("all");
		setType("all");
		setDiagnosticState("all");
		setShipmentId("");
		setCarrierOrderId("");
		setCarrierId("");
		setTrackingCode("");
		setCreatedFrom("");
		setCreatedTo("");
		setPage(1);
	};

	const renderTable = () => {
		if (listQuery.isLoading) return <CrudLoadingState />;
		if (listQuery.isError)
			return <CrudErrorState message={listQuery.error.message} />;

		const shipments = listQuery.data?.items ?? [];
		if (shipments.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros para revisar otros envios."
					title="No hay envios para mostrar"
				/>
			);
		}

		return (
			<ShipmentTable
				onSelect={(shipment: ShipmentListItem) =>
					setSelectedShipmentId(shipment.id)
				}
				shipments={shipments}
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
			description="Revision read-only de envios, paquetes transportados, tracking y diagnosticos operativos."
			title="Envios"
		>
			{statsQuery.isLoading ? (
				<CrudLoadingState rows={2} />
			) : statsQuery.isError ? (
				<CrudErrorState message={statsQuery.error.message} />
			) : statsQuery.data ? (
				<CrudStatsCards
					stats={[
						{ label: "Total", value: statsQuery.data.total },
						{
							label: "En transito",
							value: statsQuery.data.byStatus.inTransit,
						},
						{ label: "Paquetes", value: statsQuery.data.packageCount },
						{
							label: "Con diagnosticos",
							value: statsQuery.data.withDiagnostics,
						},
					]}
				/>
			) : null}

			<section className="flex flex-col gap-3">
				<div className="rounded-none border p-3">
					<FieldGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<Field>
							<FieldLabel htmlFor="shipment-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="shipment-search"
									onChange={(event) =>
										updateFilter(setSearchTerm, event.target.value)
									}
									placeholder="Codigo, nombre, tracking o carrier"
									value={searchTerm}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel htmlFor="shipment-status">Estado</FieldLabel>
							<Select
								id="shipment-status"
								onChange={(event) =>
									updateFilter(
										setStatus,
										event.target.value as ShipmentStatus | "all",
									)
								}
								value={status}
							>
								<option value={allValue}>Todos</option>
								{shipmentStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="shipment-type">Tipo</FieldLabel>
							<Select
								id="shipment-type"
								onChange={(event) =>
									updateFilter(
										setType,
										event.target.value as ShipmentType | "all",
									)
								}
								value={type}
							>
								<option value={allValue}>Todos</option>
								{shipmentTypeOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="shipment-diagnostics">
								Diagnosticos
							</FieldLabel>
							<Select
								id="shipment-diagnostics"
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
							<FieldLabel htmlFor="shipment-page-size">
								Tamaño pagina
							</FieldLabel>
							<Select
								id="shipment-page-size"
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
							["shipmentId", "Shipment ID", shipmentId, setShipmentId],
							[
								"carrierOrderId",
								"Carrier order ID",
								carrierOrderId,
								setCarrierOrderId,
							],
							["carrierId", "Carrier ID", carrierId, setCarrierId],
						].map(([id, label, value, setter]) => (
							<Field key={id as string}>
								<FieldLabel htmlFor={`shipment-${id}`}>
									{label as string}
								</FieldLabel>
								<Input
									id={`shipment-${id}`}
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
							<FieldLabel htmlFor="shipment-tracking-code">
								Tracking code
							</FieldLabel>
							<Input
								id="shipment-tracking-code"
								onChange={(event) =>
									updateFilter(setTrackingCode, event.target.value)
								}
								value={trackingCode}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="shipment-created-from">Desde</FieldLabel>
							<Input
								id="shipment-created-from"
								onChange={(event) =>
									updateFilter(setCreatedFrom, event.target.value)
								}
								type="datetime-local"
								value={createdFrom}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="shipment-created-to">Hasta</FieldLabel>
							<Input
								id="shipment-created-to"
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
							? "Cargando envios"
							: `${total} envio${total === 1 ? "" : "s"}`}
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

			<ShipmentDetailDialog
				errorMessage={detailQuery.error?.message}
				isLoading={detailQuery.isFetching}
				onOpenChange={(open) => {
					if (!open) setSelectedShipmentId(null);
				}}
				open={selectedShipmentId !== null}
				shipment={detailQuery.data}
			/>
		</CrudPageShell>
	);
}
