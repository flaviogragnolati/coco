"use client";

import {
	AlertTriangleIcon,
	BoxesIcon,
	LayersIcon,
	SearchIcon,
	TruckIcon,
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
import {
	shipmentStatusOptions,
	shipmentTypeOptions,
} from "~/features/admin/crud/shipment/shipment.mappers";
import { ShipmentAddPackagesDialog } from "~/features/admin/crud/shipment/shipment-add-packages-dialog";
import { ShipmentCreateEndUserDialog } from "~/features/admin/crud/shipment/shipment-create-end-user-dialog";
import { ShipmentDeliverDialog } from "~/features/admin/crud/shipment/shipment-deliver-dialog";
import { ShipmentDetailDialog } from "~/features/admin/crud/shipment/shipment-detail-dialog";
import { ShipmentDispatchDialog } from "~/features/admin/crud/shipment/shipment-dispatch-dialog";
import { ShipmentExceptionDialog } from "~/features/admin/crud/shipment/shipment-exception-dialog";
import { ShipmentReceiveDialog } from "~/features/admin/crud/shipment/shipment-receive-dialog";
import { ShipmentRetryDialog } from "~/features/admin/crud/shipment/shipment-retry-dialog";
import { ShipmentTable } from "~/features/admin/crud/shipment/shipment-table";
import type { CrudSortDirection } from "~/shared/common/admin-crud/crud.types";
import type { DiagnosticState } from "~/shared/common/admin-crud/operational-diagnostic.types";
import type {
	ShipmentCommandKey,
	ShipmentListItem,
	ShipmentStatus,
	ShipmentType,
} from "~/shared/common/admin-crud/shipment.types";
import { api } from "~/trpc/react";

const allValue = "all";

function positiveIntOrUndefined(value: string) {
	if (!/^\d+$/.test(value)) return undefined;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function ShipmentsClient({
	initialDetailId,
}: {
	initialDetailId?: number;
}) {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<number>(25);
	const [sortDirection, setSortDirection] = useState<CrudSortDirection>("desc");
	const [searchTerm, setSearchTerm] = useState("");
	const [status, setStatus] = useState<ShipmentStatus | "all">("all");
	const [type, setType] = useState<ShipmentType | "all">("all");
	// A boolean, not a third "all" select: the `where` builder only adds a clause
	// when `unassigned === true`, so sending `false` would mean "only assigned",
	// which is not a filter anybody asked for.
	const [unassigned, setUnassigned] = useState(false);
	const [diagnosticState, setDiagnosticState] =
		useState<DiagnosticState>("all");
	const [shipmentId, setShipmentId] = useState("");
	const [carrierOrderId, setCarrierOrderId] = useState("");
	const [carrierId, setCarrierId] = useState("");
	const [trackingCode, setTrackingCode] = useState("");
	const [createdFrom, setCreatedFrom] = useState("");
	const [createdTo, setCreatedTo] = useState("");
	const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(
		initialDetailId ?? null,
	);
	const [openCommand, setOpenCommand] = useState<ShipmentCommandKey | null>(
		null,
	);
	// `createEndUser` is not a command on a selected shipment, so it lives outside
	// the `openCommand` machinery.
	const [createOpen, setCreateOpen] = useState(false);

	const utils = api.useUtils();

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
			type: type === allValue ? undefined : type,
			unassigned: unassigned ? true : undefined,
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
			sortDirection,
			status,
			trackingCode,
			type,
			unassigned,
		],
	);

	const activeAdvancedCount =
		[
			shipmentId,
			carrierOrderId,
			carrierId,
			trackingCode,
			createdFrom,
			createdTo,
		].filter((value) => value.length > 0).length + (unassigned ? 1 : 0);

	const listQuery = api.admin.shipment.list.useQuery(listInput);
	const statsQuery = api.admin.shipment.getStats.useQuery();
	const detailQuery = api.admin.shipment.getById.useQuery(
		{ id: selectedShipmentId ?? 0 },
		{ enabled: selectedShipmentId !== null },
	);

	// Every one of these commands moves package, lot and supplier-order records too,
	// so the neighbouring caches have to drop or those pages keep showing stale rows.
	const invalidateShipmentQueries = async () => {
		await Promise.all([
			utils.admin.shipment.invalidate(),
			utils.admin.package.invalidate(),
			utils.admin.supplierOrder.invalidate(),
			utils.admin.lot.invalidate(),
			utils.admin.operation.invalidate(),
		]);
	};

	const commandOptions = (successMessage: string, failureMessage: string) => ({
		onSuccess: async () => {
			toast.success(successMessage);
			setOpenCommand(null);
			await invalidateShipmentQueries();
		},
		onError: (error: { message: string }) => {
			toast.error(error.message || failureMessage);
		},
	});

	const dispatchMutation = api.admin.shipment.dispatch.useMutation(
		commandOptions("Envío despachado", "No se pudo despachar el envío"),
	);
	const receiveMutation = api.admin.shipment.receive.useMutation(
		commandOptions("Envío recibido", "No se pudo recibir el envío"),
	);
	const markDelayedMutation = api.admin.shipment.markDelayed.useMutation(
		commandOptions("Envío demorado", "No se pudo demorar el envío"),
	);
	const markFailedMutation = api.admin.shipment.markFailed.useMutation(
		commandOptions("Envío marcado como fallido", "No se pudo marcar el envío"),
	);
	const deliverMutation = api.admin.shipment.deliver.useMutation(
		commandOptions("Envío entregado", "No se pudo entregar el envío"),
	);
	const addPackagesMutation = api.admin.shipment.addPackages.useMutation(
		commandOptions("Paquetes agregados", "No se pudieron agregar los paquetes"),
	);
	const createEndUserMutation = api.admin.shipment.createEndUser.useMutation({
		// Like `retry`, this returns a shipment the current selection does not
		// describe — the selection has to follow the result id.
		onSuccess: async (result) => {
			toast.success("Envío al cliente creado");
			setCreateOpen(false);
			setSelectedShipmentId(result.id);
			await invalidateShipmentQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el envío");
		},
	});
	const retryMutation = api.admin.shipment.retry.useMutation({
		// `retry` returns a *different* shipment; the selection has to follow the
		// result id or the operator stays on the emptied failed one.
		onSuccess: async (result) => {
			toast.success("Envío reintentado");
			setOpenCommand(null);
			setSelectedShipmentId(result.id);
			await invalidateShipmentQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo reintentar el envío");
		},
	});

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
		setSortDirection("desc");
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
					description="Ajusta los filtros para revisar otros envíos."
					title="No hay envíos para mostrar"
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

	const detail = detailQuery.data;

	const idFilters = [
		["shipmentId", "Shipment ID", shipmentId, setShipmentId],
		[
			"carrierOrderId",
			"ID de orden de transporte",
			carrierOrderId,
			setCarrierOrderId,
		],
		["carrierId", "ID de transportista", carrierId, setCarrierId],
	] as const;

	return (
		<CrudPageShell
			// `createEndUser` has no owning row, so it is a page-level action — every
			// other shipment command hangs off a detail footer.
			actions={
				<Button onClick={() => setCreateOpen(true)} size="sm">
					Nuevo envío al cliente
				</Button>
			}
			description="Revisión read-only de envíos, paquetes transportados, tracking y diagnósticos operativos."
			title="Envíos"
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
							label: "En transito",
							value: statsQuery.data.byStatus.inTransit,
							icon: TruckIcon,
							accent: "info",
						},
						{
							label: "Paquetes",
							value: statsQuery.data.packageCount,
							icon: BoxesIcon,
						},
						{
							label: "Con diagnósticos",
							value: statsQuery.data.withDiagnostics,
							icon: AlertTriangleIcon,
							accent: "warning",
							description: statsQuery.data.truncated
								? "Primeros 1000 mas recientes"
								: undefined,
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
									<FieldLabel htmlFor={`shipment-${id}`}>{label}</FieldLabel>
									<Input
										id={`shipment-${id}`}
										inputMode="numeric"
										onChange={(event) =>
											updateFilter(setter, event.target.value)
										}
										value={value}
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
							<Field>
								<FieldLabel htmlFor="shipment-diagnostics">
									Diagnósticos
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
									<option value="withDiagnostics">Con diagnósticos</option>
									<option value="withoutDiagnostics">Sin diagnósticos</option>
								</Select>
							</Field>
						</>
					}
					onReset={clearFilters}
					primary={
						<>
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
										placeholder="Código, nombre, tracking o transportista"
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
								<FieldLabel htmlFor="shipment-unassigned">
									Orden de transporte
								</FieldLabel>
								<Select
									id="shipment-unassigned"
									onChange={(event) =>
										updateFilter(setUnassigned, event.target.value === "true")
									}
									value={unassigned ? "true" : "false"}
								>
									<option value="false">Todas</option>
									<option value="true">Sin orden de transporte</option>
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
					totalLabel={{ singular: "envío", plural: "envíos" }}
					truncated={listQuery.data?.truncated}
				/>

				{renderTable()}
			</section>

			<ShipmentDetailDialog
				errorMessage={detailQuery.error?.message}
				isLoading={detailQuery.isFetching}
				onAction={setOpenCommand}
				onOpenChange={(open) => {
					if (!open) setSelectedShipmentId(null);
				}}
				open={selectedShipmentId !== null}
				shipment={detailQuery.data}
			/>

			<ShipmentDispatchDialog
				isSubmitting={dispatchMutation.isPending}
				onOpenChange={(open) => {
					if (!open) setOpenCommand(null);
				}}
				onSubmit={() => {
					if (detail) dispatchMutation.mutate({ id: detail.id });
				}}
				open={openCommand === "dispatch"}
				shipment={detail}
			/>

			<ShipmentReceiveDialog
				isSubmitting={receiveMutation.isPending}
				onOpenChange={(open) => {
					if (!open) setOpenCommand(null);
				}}
				onSubmit={(values) => receiveMutation.mutate(values)}
				open={openCommand === "receive"}
				shipment={detail}
			/>

			<ShipmentExceptionDialog
				isSubmitting={
					markDelayedMutation.isPending || markFailedMutation.isPending
				}
				onOpenChange={(open) => {
					if (!open) setOpenCommand(null);
				}}
				onSubmit={({ reason }) => {
					if (!detail) return;
					const mutation =
						openCommand === "markFailed"
							? markFailedMutation
							: markDelayedMutation;
					mutation.mutate({ id: detail.id, reason });
				}}
				open={openCommand === "markDelayed" || openCommand === "markFailed"}
				shipment={detail}
				target={openCommand === "markFailed" ? "failed" : "delayed"}
			/>

			<ShipmentDeliverDialog
				isSubmitting={deliverMutation.isPending}
				onOpenChange={(open) => {
					if (!open) setOpenCommand(null);
				}}
				onSubmit={({ notes }) =>
					deliverMutation.mutate({ id: detailQuery.data?.id ?? 0, notes })
				}
				open={openCommand === "deliver"}
				shipment={detailQuery.data}
			/>

			<ShipmentAddPackagesDialog
				isSubmitting={addPackagesMutation.isPending}
				onOpenChange={(open) => {
					if (!open) setOpenCommand(null);
				}}
				onSubmit={({ packageIds }) =>
					addPackagesMutation.mutate({
						id: detailQuery.data?.id ?? 0,
						packageIds,
					})
				}
				open={openCommand === "addPackages"}
				shipment={detailQuery.data}
			/>

			<ShipmentCreateEndUserDialog
				isSubmitting={createEndUserMutation.isPending}
				onOpenChange={setCreateOpen}
				onSubmit={(values) => createEndUserMutation.mutate(values)}
				open={createOpen}
			/>

			<ShipmentRetryDialog
				isSubmitting={retryMutation.isPending}
				onOpenChange={(open) => {
					if (!open) setOpenCommand(null);
				}}
				onSubmit={(values) => retryMutation.mutate(values)}
				open={openCommand === "retry"}
				shipment={detail}
			/>
		</CrudPageShell>
	);
}
