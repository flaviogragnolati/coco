"use client";

import {
	AlertTriangleIcon,
	ClipboardListIcon,
	ClockIcon,
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
import { supplierOrderStatusOptions } from "~/features/admin/crud/supplier-order/supplier-order.mappers";
import { SupplierOrderCancelDialog } from "~/features/admin/crud/supplier-order/supplier-order-cancel-dialog";
import { SupplierOrderConfirmDialog } from "~/features/admin/crud/supplier-order/supplier-order-confirm-dialog";
import { SupplierOrderDetailDialog } from "~/features/admin/crud/supplier-order/supplier-order-detail-dialog";
import { SupplierOrderDispatchDialog } from "~/features/admin/crud/supplier-order/supplier-order-dispatch-dialog";
import { SupplierOrderRequestDialog } from "~/features/admin/crud/supplier-order/supplier-order-request-dialog";
import { SupplierOrderTable } from "~/features/admin/crud/supplier-order/supplier-order-table";
import type { CrudSortDirection } from "~/shared/common/admin-crud/crud.types";
import type { DiagnosticState } from "~/shared/common/admin-crud/operational-diagnostic.types";
import type {
	SupplierOrderDetail,
	SupplierOrderListItem,
	SupplierOrderStatus,
} from "~/shared/common/admin-crud/supplier-order.types";
import { api } from "~/trpc/react";

const allValue = "all";

type SupplierOrderLotItem =
	SupplierOrderDetail["lots"][number]["lotItems"][number];

function positiveIntOrUndefined(value: string) {
	if (!/^\d+$/.test(value)) return undefined;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function SupplierOrdersClient({
	initialDetailId,
	initialFilters = {},
}: {
	initialDetailId?: number;
	initialFilters?: { operationId?: string };
}) {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<number>(25);
	const [sortDirection, setSortDirection] = useState<CrudSortDirection>("desc");
	const [searchTerm, setSearchTerm] = useState("");
	const [status, setStatus] = useState<SupplierOrderStatus | "all">("all");
	const [diagnosticState, setDiagnosticState] =
		useState<DiagnosticState>("all");
	const [supplierId, setSupplierId] = useState("");
	const [operationId, setOperationId] = useState(
		() => initialFilters.operationId ?? "",
	);
	const [selectedOrderId, setSelectedOrderId] = useState<number | null>(
		initialDetailId ?? null,
	);
	const [requestOpen, setRequestOpen] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [dispatchOpen, setDispatchOpen] = useState(false);
	const [cancelTarget, setCancelTarget] = useState<{
		lotItem?: SupplierOrderLotItem;
	} | null>(null);

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
			diagnosticState,
			supplierId: positiveIntOrUndefined(supplierId),
			operationId: positiveIntOrUndefined(operationId),
		}),
		[
			diagnosticState,
			operationId,
			page,
			pageSize,
			searchTerm,
			sortDirection,
			status,
			supplierId,
		],
	);

	const activeAdvancedCount = [supplierId, operationId].filter(
		(value) => value.length > 0,
	).length;

	const listQuery = api.admin.supplierOrder.list.useQuery(listInput);
	const statsQuery = api.admin.supplierOrder.getStats.useQuery();
	const detailQuery = api.admin.supplierOrder.getById.useQuery(
		{ id: selectedOrderId ?? 0 },
		{ enabled: selectedOrderId !== null },
	);

	// A supplier order command moves lot, lot item and operation state too, so the
	// neighbouring caches have to be dropped or the operation detail keeps showing
	// stale counters right after a confirmation.
	const invalidateSupplierOrderQueries = async () => {
		await Promise.all([
			utils.admin.supplierOrder.invalidate(),
			utils.admin.lot.invalidate(),
			utils.admin.operation.invalidate(),
			utils.admin.package.invalidate(),
			utils.admin.shipment.invalidate(),
		]);
	};

	const requestMutation = api.admin.supplierOrder.request.useMutation({
		onSuccess: async () => {
			toast.success("Orden solicitada al proveedor");
			setRequestOpen(false);
			await invalidateSupplierOrderQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo solicitar la orden");
		},
	});

	const confirmMutation = api.admin.supplierOrder.confirm.useMutation({
		onSuccess: async () => {
			toast.success("Orden confirmada");
			setConfirmOpen(false);
			await invalidateSupplierOrderQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo confirmar la orden");
		},
	});

	const registerDispatchMutation =
		api.admin.supplierOrder.registerDispatch.useMutation({
			onSuccess: async () => {
				toast.success("Despacho registrado");
				setDispatchOpen(false);
				await invalidateSupplierOrderQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo registrar el despacho");
			},
		});

	const cancelMutation = api.admin.supplierOrder.cancel.useMutation({
		onSuccess: async () => {
			toast.warning("Orden cancelada");
			setCancelTarget(null);
			await invalidateSupplierOrderQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo cancelar la orden");
		},
	});

	const cancelLineMutation = api.admin.supplierOrder.cancelLine.useMutation({
		onSuccess: async () => {
			toast.warning("Línea cancelada");
			setCancelTarget(null);
			await invalidateSupplierOrderQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo cancelar la línea");
		},
	});

	const clearFilters = () => {
		setSearchTerm("");
		setStatus("all");
		setDiagnosticState("all");
		setSupplierId("");
		setOperationId("");
		setSortDirection("desc");
		setPage(1);
	};

	const renderTable = () => {
		if (listQuery.isLoading) return <CrudLoadingState />;
		if (listQuery.isError) {
			return <CrudErrorState message={listQuery.error.message} />;
		}

		const supplierOrders = listQuery.data?.items ?? [];
		if (supplierOrders.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros para revisar otras órdenes."
					title="No hay órdenes de proveedor para mostrar"
				/>
			);
		}

		return (
			<SupplierOrderTable
				onSelect={(order: SupplierOrderListItem) =>
					setSelectedOrderId(order.id)
				}
				supplierOrders={supplierOrders}
			/>
		);
	};

	const detail = detailQuery.data;

	return (
		<CrudPageShell
			description="Solicitud, confirmación y cancelación de órdenes de proveedor, con el reparto de recortes sobre la demanda asignada."
			title="Órdenes de proveedor"
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
							icon: ClipboardListIcon,
						},
						{
							label: "Solicitadas",
							value: statsQuery.data.byStatus.requested,
							icon: ClockIcon,
							accent: "info",
						},
						{
							label: "Líneas abiertas",
							value: statsQuery.data.openLineCount,
							icon: PackageCheckIcon,
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
							<Field>
								<FieldLabel htmlFor="supplier-order-supplier-id">
									Supplier ID
								</FieldLabel>
								<Input
									id="supplier-order-supplier-id"
									inputMode="numeric"
									onChange={(event) =>
										updateFilter(setSupplierId, event.target.value)
									}
									value={supplierId}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="supplier-order-operation-id">
									Operation ID
								</FieldLabel>
								<Input
									id="supplier-order-operation-id"
									inputMode="numeric"
									onChange={(event) =>
										updateFilter(setOperationId, event.target.value)
									}
									value={operationId}
								/>
							</Field>
						</>
					}
					onReset={clearFilters}
					primary={
						<>
							<Field>
								<FieldLabel htmlFor="supplier-order-search">Buscar</FieldLabel>
								<div className="relative">
									<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
									<Input
										className="pl-8"
										id="supplier-order-search"
										onChange={(event) =>
											updateFilter(setSearchTerm, event.target.value)
										}
										placeholder="Orden, referencia, proveedor u operación"
										value={searchTerm}
									/>
								</div>
							</Field>
							<Field>
								<FieldLabel htmlFor="supplier-order-status">Estado</FieldLabel>
								<Select
									id="supplier-order-status"
									onChange={(event) =>
										updateFilter(
											setStatus,
											event.target.value as SupplierOrderStatus | "all",
										)
									}
									value={status}
								>
									<option value={allValue}>Todos</option>
									{supplierOrderStatusOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="supplier-order-diagnostics">
									Diagnósticos
								</FieldLabel>
								<Select
									id="supplier-order-diagnostics"
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
					totalLabel={{ singular: "orden", plural: "órdenes" }}
					truncated={listQuery.data?.truncated}
				/>

				{renderTable()}
			</section>

			<SupplierOrderDetailDialog
				errorMessage={detailQuery.error?.message}
				isLoading={detailQuery.isFetching}
				onCancel={() => setCancelTarget({})}
				onCancelLine={(lotItem) => setCancelTarget({ lotItem })}
				onConfirm={() => setConfirmOpen(true)}
				onOpenChange={(open) => {
					if (!open) setSelectedOrderId(null);
				}}
				onRegisterDispatch={() => setDispatchOpen(true)}
				onRequest={() => setRequestOpen(true)}
				open={selectedOrderId !== null}
				supplierOrder={detail}
			/>

			<SupplierOrderRequestDialog
				isSubmitting={requestMutation.isPending}
				onOpenChange={setRequestOpen}
				onSubmit={(values) => {
					if (!detail) return;
					requestMutation.mutate({ id: detail.id, ...values });
				}}
				open={requestOpen}
				supplierOrder={detail}
			/>

			<SupplierOrderConfirmDialog
				isSubmitting={confirmMutation.isPending}
				onOpenChange={setConfirmOpen}
				onSubmit={(values) => confirmMutation.mutate(values)}
				open={confirmOpen}
				supplierOrder={detail}
			/>

			<SupplierOrderDispatchDialog
				isSubmitting={registerDispatchMutation.isPending}
				onOpenChange={setDispatchOpen}
				onSubmit={(values) => registerDispatchMutation.mutate(values)}
				open={dispatchOpen}
				supplierOrder={detail}
			/>

			<SupplierOrderCancelDialog
				isSubmitting={cancelMutation.isPending || cancelLineMutation.isPending}
				lotItem={cancelTarget?.lotItem}
				onOpenChange={(open) => {
					if (!open) setCancelTarget(null);
				}}
				onSubmit={({ reason }) => {
					if (!detail) return;
					const lotItem = cancelTarget?.lotItem;

					if (lotItem) {
						cancelLineMutation.mutate({
							id: detail.id,
							lotItemId: lotItem.id,
							reason,
						});
						return;
					}

					cancelMutation.mutate({ id: detail.id, reason });
				}}
				open={cancelTarget !== null}
				supplierOrder={detail}
			/>
		</CrudPageShell>
	);
}
