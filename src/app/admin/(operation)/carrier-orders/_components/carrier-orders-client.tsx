"use client";

import {
	AlertTriangleIcon,
	CheckCircle2Icon,
	ClipboardListIcon,
	PlusIcon,
	SearchIcon,
	TruckIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Field, FieldContent, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { CrudDeleteDialog } from "~/features/admin/crud/_components/crud-delete-dialog";
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
import { carrierOrderStatusOptions } from "~/features/admin/crud/carrier-order/carrier-order.mappers";
import { CarrierOrderAddShipmentsDialog } from "~/features/admin/crud/carrier-order/carrier-order-add-shipments-dialog";
import { CarrierOrderDetailDialog } from "~/features/admin/crud/carrier-order/carrier-order-detail-dialog";
import { CarrierOrderFormDialog } from "~/features/admin/crud/carrier-order/carrier-order-form-dialog";
import {
	CarrierOrderStatusDialog,
	isCarrierOrderLadderCommand,
} from "~/features/admin/crud/carrier-order/carrier-order-status-dialog";
import { CarrierOrderTable } from "~/features/admin/crud/carrier-order/carrier-order-table";
import type {
	CarrierOrderCommandKey,
	CarrierOrderFormValues,
	CarrierOrderStatus,
} from "~/shared/common/admin-crud/carrier-order.types";
import type { CrudSortDirection } from "~/shared/common/admin-crud/crud.types";
import type { DiagnosticState } from "~/shared/common/admin-crud/operational-diagnostic.types";
import { api } from "~/trpc/react";

const allValue = "all";

export function CarrierOrdersClient({
	initialDetailId,
}: {
	initialDetailId?: number;
}) {
	const utils = api.useUtils();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<number>(25);
	const [sortDirection, setSortDirection] = useState<CrudSortDirection>("desc");
	const [searchTerm, setSearchTerm] = useState("");
	const [status, setStatus] = useState<CarrierOrderStatus | "all">("all");
	const [carrierId, setCarrierId] = useState<string>(allValue);
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [diagnosticState, setDiagnosticState] =
		useState<DiagnosticState>("all");
	const [createdFrom, setCreatedFrom] = useState("");
	const [createdTo, setCreatedTo] = useState("");
	const [selectedCarrierOrderId, setSelectedCarrierOrderId] = useState<
		number | null
	>(initialDetailId ?? null);
	// `create` is not a server command — there is no row to compute it from — so it
	// rides the same dialog state under its own key rather than in the matrix.
	const [command, setCommand] = useState<{
		id: number;
		key: CarrierOrderCommandKey | "create";
	} | null>(null);

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
			carrierId: carrierId === allValue ? undefined : Number(carrierId),
			includeDeleted,
			diagnosticState,
			createdFrom: createdFrom || undefined,
			createdTo: createdTo || undefined,
		}),
		[
			carrierId,
			createdFrom,
			createdTo,
			debouncedSearch,
			diagnosticState,
			includeDeleted,
			page,
			pageSize,
			sortDirection,
			status,
		],
	);

	const activeAdvancedCount = [
		createdFrom,
		createdTo,
		includeDeleted ? "1" : "",
	].filter((value) => value.length > 0).length;

	const listQuery = api.admin.carrierOrder.list.useQuery(listInput);
	const statsQuery = api.admin.carrierOrder.getStats.useQuery();
	const carriersQuery = api.admin.carrier.list.useQuery({
		includeDeleted: false,
	});
	const detailQuery = api.admin.carrierOrder.getById.useQuery(
		{ id: selectedCarrierOrderId ?? 0 },
		{ enabled: selectedCarrierOrderId !== null },
	);
	// Commands act on the row or on the open detail; both resolve through the same
	// `getById` query, which react-query dedupes when the two ids agree.
	const commandDetailQuery = api.admin.carrierOrder.getById.useQuery(
		{ id: command?.id ?? 0 },
		{ enabled: command !== null },
	);

	const clearFilters = () => {
		setSearchTerm("");
		setStatus("all");
		setCarrierId(allValue);
		setIncludeDeleted(false);
		setDiagnosticState("all");
		setCreatedFrom("");
		setCreatedTo("");
		setSortDirection("desc");
		setPage(1);
	};

	const invalidateCarrierOrderQueries = async () => {
		await Promise.all([
			utils.admin.carrierOrder.list.invalidate(),
			utils.admin.carrierOrder.getStats.invalidate(),
			utils.admin.carrierOrder.getById.invalidate(),
			// Attaching or detaching rewrites `Shipment.carrierOrderId`, which the
			// shipment list, detail and `carrierOrder.missing` diagnostic all read.
			utils.admin.shipment.invalidate(),
		]);
	};

	const closeCommand = (open: boolean) => {
		if (!open) setCommand(null);
	};

	const onCommandSuccess =
		(message: string) => async (result: { id: number }) => {
			toast.success(message);
			setCommand(null);
			setSelectedCarrierOrderId(result.id);
			await invalidateCarrierOrderQueries();
		};

	const onCommandError = (fallback: string) => (error: { message: string }) => {
		toast.error(error.message || fallback);
	};

	const createMutation = api.admin.carrierOrder.create.useMutation({
		onSuccess: async (order) => {
			toast.success("Orden de transporte creada");
			setCommand(null);
			setSelectedCarrierOrderId(order.id);
			await invalidateCarrierOrderQueries();
		},
		onError: onCommandError("No se pudo crear la orden de transporte"),
	});

	const updateMutation = api.admin.carrierOrder.update.useMutation({
		onSuccess: onCommandSuccess("Orden de transporte actualizada"),
		onError: onCommandError("No se pudo actualizar la orden de transporte"),
	});

	const requestMutation = api.admin.carrierOrder.request.useMutation({
		onSuccess: onCommandSuccess("Orden solicitada"),
		onError: onCommandError("No se pudo solicitar la orden"),
	});

	const confirmMutation = api.admin.carrierOrder.confirm.useMutation({
		onSuccess: onCommandSuccess("Orden confirmada"),
		onError: onCommandError("No se pudo confirmar la orden"),
	});

	const markInTransitMutation =
		api.admin.carrierOrder.markInTransit.useMutation({
			onSuccess: onCommandSuccess("Orden en tránsito"),
			onError: onCommandError("No se pudo despachar la orden"),
		});

	const completeMutation = api.admin.carrierOrder.complete.useMutation({
		onSuccess: onCommandSuccess("Orden completada"),
		onError: onCommandError("No se pudo completar la orden"),
	});

	const cancelMutation = api.admin.carrierOrder.cancel.useMutation({
		onSuccess: onCommandSuccess("Orden cancelada"),
		onError: onCommandError("No se pudo cancelar la orden"),
	});

	const markFailedMutation = api.admin.carrierOrder.markFailed.useMutation({
		onSuccess: onCommandSuccess("Orden marcada como fallida"),
		onError: onCommandError("No se pudo marcar la orden como fallida"),
	});

	const addShipmentsMutation = api.admin.carrierOrder.addShipments.useMutation({
		onSuccess: onCommandSuccess("Envíos agregados"),
		onError: onCommandError("No se pudieron agregar los envíos"),
	});

	const removeShipmentMutation =
		api.admin.carrierOrder.removeShipment.useMutation({
			onSuccess: async (order) => {
				toast.success("Envío quitado de la orden");
				setSelectedCarrierOrderId(order.id);
				await invalidateCarrierOrderQueries();
			},
			onError: onCommandError("No se pudo quitar el envío"),
		});

	// The deletes return `{ id }`, not a detail: the selection has to be cleared
	// or the detail dialog refetches a row that is hidden or gone.
	const softDeleteMutation = api.admin.carrierOrder.softDelete.useMutation({
		onSuccess: async () => {
			toast.success("Orden dada de baja");
			setCommand(null);
			setSelectedCarrierOrderId(null);
			await invalidateCarrierOrderQueries();
		},
		onError: onCommandError("No se pudo dar de baja la orden"),
	});

	const hardDeleteMutation = api.admin.carrierOrder.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Orden eliminada");
			setCommand(null);
			setSelectedCarrierOrderId(null);
			await invalidateCarrierOrderQueries();
		},
		onError: onCommandError("No se pudo eliminar la orden"),
	});

	const ladderMutations = {
		request: requestMutation,
		confirm: confirmMutation,
		markInTransit: markInTransitMutation,
		complete: completeMutation,
		cancel: cancelMutation,
		markFailed: markFailedMutation,
	} as const;

	const handleCommand = (
		order: { id: number },
		key: CarrierOrderCommandKey,
	) => {
		setCommand({ id: order.id, key });
	};

	const handleFormSubmit = (
		values: CarrierOrderFormValues & { shipmentIds: number[] },
	) => {
		if (command?.key === "edit") {
			updateMutation.mutate({ id: command.id, ...values });
			return;
		}
		createMutation.mutate(values);
	};

	const ladderCommand =
		command && isCarrierOrderLadderCommand(command.key) ? command.key : null;
	const ladderMutation = ladderCommand
		? ladderMutations[ladderCommand]
		: undefined;

	const renderTable = () => {
		if (listQuery.isLoading) return <CrudLoadingState />;
		if (listQuery.isError) {
			return (
				<CrudErrorState
					message={
						listQuery.error.message ||
						"No se pudo obtener la lista de órdenes de transporte"
					}
				/>
			);
		}

		const carrierOrders = listQuery.data?.items ?? [];
		if (carrierOrders.length === 0) {
			return (
				<CrudEmptyState
					description="Ajustá los filtros o creá una orden de transporte nueva."
					title="No hay órdenes de transporte para mostrar"
				/>
			);
		}

		return (
			<CarrierOrderTable
				carrierOrders={carrierOrders}
				onCommand={handleCommand}
				onView={(order) => setSelectedCarrierOrderId(order.id)}
			/>
		);
	};

	return (
		<CrudPageShell
			actions={
				<Button
					onClick={() => setCommand({ id: 0, key: "create" })}
					variant="highlight"
				>
					<PlusIcon data-icon="inline-start" />
					Nueva orden
				</Button>
			}
			description="Contratación de transporte para uno o más envíos: solicitud, confirmación, despacho y cierre."
			title="Órdenes de transporte"
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
							description: "Órdenes activas",
							icon: ClipboardListIcon,
						},
						{
							label: "En tránsito",
							value: statsQuery.data.byStatus.inTransit,
							description: "Transporte en curso",
							icon: TruckIcon,
							accent: "info",
						},
						{
							label: "Completadas",
							value: statsQuery.data.byStatus.completed,
							description: "Recorrido terminado",
							icon: CheckCircle2Icon,
							accent: "success",
						},
						{
							label: "Con diagnósticos",
							value: statsQuery.data.withDiagnostics,
							description: "Requieren revisión",
							icon: AlertTriangleIcon,
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
					activeAdvancedCount={activeAdvancedCount}
					advanced={
						<>
							<Field>
								<FieldLabel htmlFor="carrier-order-created-from">
									Desde
								</FieldLabel>
								<Input
									id="carrier-order-created-from"
									onChange={(event) =>
										updateFilter(setCreatedFrom, event.target.value)
									}
									type="datetime-local"
									value={createdFrom}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="carrier-order-created-to">
									Hasta
								</FieldLabel>
								<Input
									id="carrier-order-created-to"
									onChange={(event) =>
										updateFilter(setCreatedTo, event.target.value)
									}
									type="datetime-local"
									value={createdTo}
								/>
							</Field>
							<Field orientation="horizontal">
								<Switch
									checked={includeDeleted}
									id="carrier-order-include-deleted"
									onCheckedChange={(checked) =>
										updateFilter(setIncludeDeleted, checked)
									}
								/>
								<FieldContent>
									<FieldLabel htmlFor="carrier-order-include-deleted">
										Mostrar dadas de baja
									</FieldLabel>
								</FieldContent>
							</Field>
						</>
					}
					onReset={clearFilters}
					primary={
						<>
							<Field>
								<FieldLabel htmlFor="carrier-order-search">Buscar</FieldLabel>
								<div className="relative">
									<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
									<Input
										className="pl-8"
										id="carrier-order-search"
										onChange={(event) =>
											updateFilter(setSearchTerm, event.target.value)
										}
										placeholder="Código, referencia, transportista o envío"
										value={searchTerm}
									/>
								</div>
							</Field>
							<Field>
								<FieldLabel htmlFor="carrier-order-status">Estado</FieldLabel>
								<Select
									id="carrier-order-status"
									onChange={(event) =>
										updateFilter(
											setStatus,
											event.target.value as CarrierOrderStatus | "all",
										)
									}
									value={status}
								>
									<option value={allValue}>Todos</option>
									{carrierOrderStatusOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="carrier-order-carrier-filter">
									Transportista
								</FieldLabel>
								<Select
									id="carrier-order-carrier-filter"
									onChange={(event) =>
										updateFilter(setCarrierId, event.target.value)
									}
									value={carrierId}
								>
									<option value={allValue}>Todos</option>
									{(carriersQuery.data ?? []).map((carrier) => (
										<option key={carrier.id} value={carrier.id}>
											{carrier.name}
										</option>
									))}
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="carrier-order-diagnostics">
									Diagnósticos
								</FieldLabel>
								<Select
									id="carrier-order-diagnostics"
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

			<CarrierOrderFormDialog
				carrierOrder={
					command?.key === "edit" ? commandDetailQuery.data : undefined
				}
				carriers={carriersQuery.data ?? []}
				isLoadingCarriers={carriersQuery.isLoading}
				isSubmitting={createMutation.isPending || updateMutation.isPending}
				mode={command?.key === "edit" ? "edit" : "create"}
				onOpenChange={closeCommand}
				onSubmit={handleFormSubmit}
				open={command?.key === "create" || command?.key === "edit"}
			/>

			<CarrierOrderDetailDialog
				carrierOrder={detailQuery.data}
				errorMessage={detailQuery.error?.message}
				isLoading={detailQuery.isPending && selectedCarrierOrderId !== null}
				onCommand={(key) => {
					if (selectedCarrierOrderId === null) return;
					handleCommand({ id: selectedCarrierOrderId }, key);
				}}
				onOpenChange={(open) => {
					if (!open) setSelectedCarrierOrderId(null);
				}}
				onRemoveShipment={(shipmentId) => {
					if (selectedCarrierOrderId === null) return;
					removeShipmentMutation.mutate({
						id: selectedCarrierOrderId,
						shipmentId,
					});
				}}
				open={selectedCarrierOrderId !== null}
			/>

			<CarrierOrderStatusDialog
				carrierOrder={commandDetailQuery.data}
				command={ladderCommand}
				isSubmitting={ladderMutation?.isPending}
				onOpenChange={closeCommand}
				onSubmit={({ reason }) => {
					if (!command || !ladderCommand) return;
					if (ladderCommand === "cancel" || ladderCommand === "markFailed") {
						ladderMutations[ladderCommand].mutate({
							id: command.id,
							reason: reason ?? "",
						});
						return;
					}
					ladderMutations[ladderCommand].mutate({ id: command.id });
				}}
				open={ladderCommand !== null}
			/>

			<CarrierOrderAddShipmentsDialog
				carrierOrder={commandDetailQuery.data}
				isSubmitting={addShipmentsMutation.isPending}
				onOpenChange={closeCommand}
				onSubmit={({ shipmentIds }) => {
					if (!command) return;
					addShipmentsMutation.mutate({ id: command.id, shipmentIds });
				}}
				open={command?.key === "addShipments"}
			/>

			<CrudDeleteDialog
				confirmLabel="Dar de baja"
				description={`La orden ${commandDetailQuery.data?.code ?? ""} deja de aparecer en la lista. No se puede dar de baja mientras conserve envíos activos.`}
				isPending={softDeleteMutation.isPending}
				onConfirm={() => {
					if (!command) return;
					softDeleteMutation.mutate({ id: command.id });
				}}
				onOpenChange={closeCommand}
				open={command?.key === "softDelete"}
				title="Dar de baja la orden de transporte"
			/>

			<CrudDeleteDialog
				confirmationValue={commandDetailQuery.data?.code}
				confirmLabel="Eliminar definitivamente"
				description={`La orden ${commandDetailQuery.data?.code ?? ""} se elimina de forma permanente. Solo es posible si está pendiente y no tiene envíos asociados.`}
				isPending={hardDeleteMutation.isPending}
				onConfirm={() => {
					if (!command) return;
					hardDeleteMutation.mutate({ id: command.id });
				}}
				onOpenChange={closeCommand}
				open={command?.key === "hardDelete"}
				title="Eliminar la orden de transporte"
			/>
		</CrudPageShell>
	);
}
