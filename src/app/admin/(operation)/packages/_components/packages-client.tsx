"use client";

import {
	AlertTriangleIcon,
	ArrowLeftRightIcon,
	BoxesIcon,
	LayersIcon,
	PackageCheckIcon,
	SearchIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
	packageLegOptions,
	packageStatusOptions,
} from "~/features/admin/crud/package/package.mappers";
import { PackageConfirmDeliveryDialog } from "~/features/admin/crud/package/package-confirm-delivery-dialog";
import { PackageDetailDialog } from "~/features/admin/crud/package/package-detail-dialog";
import { PackageExceptionDialog } from "~/features/admin/crud/package/package-exception-dialog";
import { PackageFractionateDialog } from "~/features/admin/crud/package/package-fractionate-dialog";
import { PackagePromoteDialog } from "~/features/admin/crud/package/package-promote-dialog";
import { PackageRecoverDialog } from "~/features/admin/crud/package/package-recover-dialog";
import { PackageSplitDialog } from "~/features/admin/crud/package/package-split-dialog";
import { PackageTable } from "~/features/admin/crud/package/package-table";
import { PackageWriteOffDialog } from "~/features/admin/crud/package/package-write-off-dialog";
import type { CrudSortDirection } from "~/shared/common/admin-crud/crud.types";
import type { DiagnosticState } from "~/shared/common/admin-crud/operational-diagnostic.types";
import type {
	PackageCommandKey,
	PackageLeg,
	PackageListItem,
	PackageStatus,
} from "~/shared/common/admin-crud/package.types";
import { api } from "~/trpc/react";

const allValue = "all";

function positiveIntOrUndefined(value: string) {
	if (!/^\d+$/.test(value)) return undefined;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function PackagesClient({
	initialDetailId,
}: {
	initialDetailId?: number;
}) {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<number>(25);
	const [sortDirection, setSortDirection] = useState<CrudSortDirection>("desc");
	const [searchTerm, setSearchTerm] = useState("");
	const [status, setStatus] = useState<PackageStatus | "all">("all");
	const [leg, setLeg] = useState<PackageLeg | "all">("all");
	const [diagnosticState, setDiagnosticState] =
		useState<DiagnosticState>("all");
	const [packageId, setPackageId] = useState("");
	const [shipmentId, setShipmentId] = useState("");
	const [lotId, setLotId] = useState("");
	const [lotItemId, setLotItemId] = useState("");
	const [productId, setProductId] = useState("");
	const [createdFrom, setCreatedFrom] = useState("");
	const [createdTo, setCreatedTo] = useState("");
	const [openCommand, setOpenCommand] = useState<PackageCommandKey | null>(
		null,
	);
	const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
		initialDetailId ?? null,
	);

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
			leg: leg === allValue ? undefined : leg,
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
			leg,
			lotId,
			lotItemId,
			packageId,
			page,
			pageSize,
			productId,
			searchTerm,
			shipmentId,
			sortDirection,
			status,
		],
	);

	const activeAdvancedCount = [
		packageId,
		shipmentId,
		lotId,
		lotItemId,
		productId,
		createdFrom,
		createdTo,
	].filter((value) => value.length > 0).length;

	const utils = api.useUtils();
	const listQuery = api.admin.package.list.useQuery(listInput);
	const statsQuery = api.admin.package.getStats.useQuery();
	const detailQuery = api.admin.package.getById.useQuery(
		{ id: selectedPackageId ?? 0 },
		{ enabled: selectedPackageId !== null },
	);

	// A package command reaches beyond the packages list: roll overs, lot closing
	// and shipment coverage all read the rows it touches.
	const invalidateNeighbours = () =>
		Promise.all([
			utils.admin.package.invalidate(),
			utils.admin.shipment.invalidate(),
			utils.admin.supplierOrder.invalidate(),
			utils.admin.lot.invalidate(),
			utils.admin.operation.invalidate(),
		]);

	const closeCommand = () => setOpenCommand(null);

	const writeOffMutation = api.admin.package.writeOff.useMutation({
		onSuccess: async () => {
			toast.warning("Paquete dado de baja");
			closeCommand();
			await invalidateNeighbours();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo dar de baja el paquete");
		},
	});

	const fractionateMutation = api.admin.package.fractionate.useMutation({
		onSuccess: async (result) => {
			toast.success(
				`Fraccionado en ${result.createdPackageIds.length} paquete(s) de salida`,
			);
			closeCommand();
			// The command creates rows the current selection does not describe, and can
			// touch several sources at once — the whole list has to drop, not one row.
			setSelectedPackageId(null);
			await invalidateNeighbours();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo fraccionar el paquete");
		},
	});

	const promoteMutation = api.admin.package.promote.useMutation({
		onSuccess: async () => {
			toast.success("Paquete promovido a la pata de salida");
			closeCommand();
			await invalidateNeighbours();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo promover el paquete");
		},
	});

	const splitMutation = api.admin.package.split.useMutation({
		onSuccess: async (result) => {
			toast.success(
				`Dividido en ${result.createdPackageIds.length} paquete(s)`,
			);
			closeCommand();
			setSelectedPackageId(null);
			await invalidateNeighbours();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo dividir el paquete");
		},
	});

	const markDelayedMutation = api.admin.package.markDelayed.useMutation({
		onSuccess: async () => {
			toast.warning("Paquete marcado como demorado");
			closeCommand();
			await invalidateNeighbours();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo demorar el paquete");
		},
	});

	const markFailedMutation = api.admin.package.markFailed.useMutation({
		onSuccess: async () => {
			toast.error("Paquete marcado como fallido");
			closeCommand();
			await invalidateNeighbours();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo marcar el paquete como fallido");
		},
	});

	const confirmDeliveryMutation = api.admin.package.confirmDelivery.useMutation(
		{
			onSuccess: async () => {
				toast.success("Entrega confirmada");
				closeCommand();
				await invalidateNeighbours();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo confirmar la entrega");
			},
		},
	);

	const recoverMutation = api.admin.package.recover.useMutation({
		onSuccess: async () => {
			toast.success("Paquete recuperado");
			closeCommand();
			await invalidateNeighbours();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo recuperar el paquete");
		},
	});

	const clearFilters = () => {
		setSearchTerm("");
		setStatus("all");
		setLeg("all");
		setDiagnosticState("all");
		setPackageId("");
		setShipmentId("");
		setLotId("");
		setLotItemId("");
		setProductId("");
		setCreatedFrom("");
		setCreatedTo("");
		setSortDirection("desc");
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

	const idFilters = [
		["packageId", "Package ID", packageId, setPackageId],
		["shipmentId", "Shipment ID", shipmentId, setShipmentId],
		["lotId", "Lot ID", lotId, setLotId],
		["lotItemId", "Lot item ID", lotItemId, setLotItemId],
		["productId", "Product ID", productId, setProductId],
	] as const;

	return (
		<CrudPageShell
			description="Revisión read-only de paquetes, líneas, asignaciones empaquetadas y diagnósticos operativos."
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
							label: "Listos envío",
							value: statsQuery.data.byStatus.readyForShipment,
							icon: PackageCheckIcon,
							accent: "info",
						},
						{
							label: "Entrada / salida",
							value: `${statsQuery.data.byLeg.inbound ?? 0} / ${statsQuery.data.byLeg.outbound ?? 0}`,
							icon: ArrowLeftRightIcon,
							accent: "info",
						},
						{
							label: "Asignado",
							value: statsQuery.data.packagedAllocationQuantity,
							icon: BoxesIcon,
							accent: "info",
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
									<FieldLabel htmlFor={`package-${id}`}>{label}</FieldLabel>
									<Input
										id={`package-${id}`}
										inputMode="numeric"
										onChange={(event) =>
											updateFilter(setter, event.target.value)
										}
										value={value}
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
						</>
					}
					onReset={clearFilters}
					primary={
						<>
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
										placeholder="Paquete, tracking o envío"
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
								<FieldLabel htmlFor="package-leg">Pata</FieldLabel>
								<Select
									id="package-leg"
									onChange={(event) =>
										updateFilter(
											setLeg,
											event.target.value as PackageLeg | "all",
										)
									}
									value={leg}
								>
									<option value={allValue}>Todas</option>
									{packageLegOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="package-diagnostics">
									Diagnósticos
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
									<option value="withDiagnostics">Con diagnósticos</option>
									<option value="withoutDiagnostics">Sin diagnósticos</option>
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
					totalLabel={{ singular: "paquete", plural: "paquetes" }}
					truncated={listQuery.data?.truncated}
				/>

				{renderTable()}
			</section>

			<PackageDetailDialog
				errorMessage={detailQuery.error?.message}
				isLoading={detailQuery.isFetching}
				onAction={setOpenCommand}
				onOpenChange={(open) => {
					if (!open) setSelectedPackageId(null);
				}}
				open={selectedPackageId !== null}
				pkg={detailQuery.data}
			/>

			<PackageWriteOffDialog
				isSubmitting={writeOffMutation.isPending}
				onOpenChange={(open) => {
					if (!open) closeCommand();
				}}
				onSubmit={(values) => writeOffMutation.mutate(values)}
				open={openCommand === "writeOff"}
				pkg={detailQuery.data}
			/>

			<PackageFractionateDialog
				isSubmitting={fractionateMutation.isPending}
				onOpenChange={(open) => {
					if (!open) closeCommand();
				}}
				onSubmit={(values) => fractionateMutation.mutate(values)}
				open={openCommand === "fractionate"}
				pkg={detailQuery.data}
			/>

			<PackagePromoteDialog
				isSubmitting={promoteMutation.isPending}
				onOpenChange={(open) => {
					if (!open) closeCommand();
				}}
				onSubmit={(values) =>
					promoteMutation.mutate({
						id: detailQuery.data?.id ?? 0,
						name: values.name,
					})
				}
				open={openCommand === "promote"}
				pkg={detailQuery.data}
			/>

			<PackageSplitDialog
				isSubmitting={splitMutation.isPending}
				onOpenChange={(open) => {
					if (!open) closeCommand();
				}}
				onSubmit={(values) => splitMutation.mutate(values)}
				open={openCommand === "split"}
				pkg={detailQuery.data}
			/>

			<PackageExceptionDialog
				isSubmitting={
					markDelayedMutation.isPending || markFailedMutation.isPending
				}
				onOpenChange={(open) => {
					if (!open) closeCommand();
				}}
				onSubmit={({ reason }) => {
					const id = detailQuery.data?.id ?? 0;
					if (openCommand === "markFailed") {
						markFailedMutation.mutate({ id, reason });
						return;
					}
					markDelayedMutation.mutate({ id, reason });
				}}
				open={openCommand === "markDelayed" || openCommand === "markFailed"}
				pkg={detailQuery.data}
				target={openCommand === "markFailed" ? "failed" : "delayed"}
			/>

			<PackageConfirmDeliveryDialog
				isSubmitting={confirmDeliveryMutation.isPending}
				onOpenChange={(open) => {
					if (!open) closeCommand();
				}}
				onSubmit={({ notes }) =>
					confirmDeliveryMutation.mutate({
						id: detailQuery.data?.id ?? 0,
						notes,
					})
				}
				open={openCommand === "confirmDelivery"}
				pkg={detailQuery.data}
			/>

			<PackageRecoverDialog
				isSubmitting={recoverMutation.isPending}
				onOpenChange={(open) => {
					if (!open) closeCommand();
				}}
				onSubmit={({ notes }) =>
					recoverMutation.mutate({ id: detailQuery.data?.id ?? 0, notes })
				}
				open={openCommand === "recover"}
				pkg={detailQuery.data}
			/>
		</CrudPageShell>
	);
}
