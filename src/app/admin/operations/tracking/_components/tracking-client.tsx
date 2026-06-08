"use client";

import { ArrowLeftIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "~/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudEmptyState,
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import {
	trackingEventTypeOptions,
	trackingSourceOptions,
} from "~/features/admin/crud/tracking/tracking.mappers";
import { TrackingDetailDialog } from "~/features/admin/crud/tracking/tracking-detail-dialog";
import { TrackingEventTable } from "~/features/admin/crud/tracking/tracking-table";
import type { AdminTrackingEventListItem } from "~/shared/common/tracking.types";
import type {
	TrackingEventSource,
	TrackingEventType,
} from "~/shared/common/tracking-display";
import { api } from "~/trpc/react";

const allValue = "all";
const pageSizeOptions = [10, 25, 50, 100] as const;

function positiveIntOrUndefined(value: string) {
	if (!/^\d+$/.test(value)) return undefined;

	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function TrackingClient() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] =
		useState<(typeof pageSizeOptions)[number]>(25);
	const [searchTerm, setSearchTerm] = useState("");
	const [eventType, setEventType] = useState<TrackingEventType | "all">("all");
	const [source, setSource] = useState<TrackingEventSource | "all">("all");
	const [userId, setUserId] = useState("all");
	const [actorUserId, setActorUserId] = useState("all");
	const [cartId, setCartId] = useState("");
	const [cartItemId, setCartItemId] = useState("");
	const [orderId, setOrderId] = useState("");
	const [operationId, setOperationId] = useState("");
	const [lotId, setLotId] = useState("");
	const [lotItemId, setLotItemId] = useState("");
	const [packageId, setPackageId] = useState("");
	const [shipmentId, setShipmentId] = useState("");
	const [rollOverId, setRollOverId] = useState("");
	const [createdFrom, setCreatedFrom] = useState("");
	const [createdTo, setCreatedTo] = useState("");
	const [selectedCartItemId, setSelectedCartItemId] = useState<number | null>(
		null,
	);

	const updateFilter = <T,>(setter: (value: T) => void, value: T) => {
		setter(value);
		setPage(1);
	};

	const filters = useMemo(
		() => ({
			search: searchTerm.trim().length > 0 ? searchTerm : undefined,
			eventType: eventType === allValue ? undefined : eventType,
			source: source === allValue ? undefined : source,
			userId: userId === allValue ? undefined : userId,
			actorUserId: actorUserId === allValue ? undefined : actorUserId,
			cartId: positiveIntOrUndefined(cartId),
			cartItemId: positiveIntOrUndefined(cartItemId),
			orderId: positiveIntOrUndefined(orderId),
			operationId: positiveIntOrUndefined(operationId),
			lotId: positiveIntOrUndefined(lotId),
			lotItemId: positiveIntOrUndefined(lotItemId),
			packageId: positiveIntOrUndefined(packageId),
			shipmentId: positiveIntOrUndefined(shipmentId),
			rollOverId: positiveIntOrUndefined(rollOverId),
			createdFrom: createdFrom || undefined,
			createdTo: createdTo || undefined,
		}),
		[
			actorUserId,
			cartId,
			cartItemId,
			createdFrom,
			createdTo,
			eventType,
			lotId,
			lotItemId,
			operationId,
			orderId,
			packageId,
			rollOverId,
			searchTerm,
			shipmentId,
			source,
			userId,
		],
	);

	const listInput = useMemo(
		() => ({
			page,
			pageSize,
			filters,
		}),
		[filters, page, pageSize],
	);

	const eventsQuery = api.admin.tracking.listEvents.useQuery(listInput);
	const usersQuery = api.admin.user.list.useQuery({ includeDeleted: true });
	const detailQuery = api.admin.tracking.getCartItemTimelineDetail.useQuery(
		{ cartItemId: selectedCartItemId ?? 0 },
		{ enabled: selectedCartItemId !== null },
	);

	const clearFilters = () => {
		setSearchTerm("");
		setEventType("all");
		setSource("all");
		setUserId("all");
		setActorUserId("all");
		setCartId("");
		setCartItemId("");
		setOrderId("");
		setOperationId("");
		setLotId("");
		setLotItemId("");
		setPackageId("");
		setShipmentId("");
		setRollOverId("");
		setCreatedFrom("");
		setCreatedTo("");
		setPage(1);
	};

	const handleSelect = (event: AdminTrackingEventListItem) => {
		setSelectedCartItemId(event.cartItem.id);
	};

	const renderTable = () => {
		if (eventsQuery.isLoading) return <CrudLoadingState />;

		if (eventsQuery.isError) {
			return (
				<CrudErrorState
					message={
						eventsQuery.error.message ||
						"No se pudieron obtener los eventos de tracking"
					}
				/>
			);
		}

		const events = eventsQuery.data?.items ?? [];

		if (events.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros para revisar otros eventos."
					title="No hay eventos de tracking"
				/>
			);
		}

		return <TrackingEventTable events={events} onSelect={handleSelect} />;
	};

	const pageCount = eventsQuery.data?.pageCount ?? 0;
	const total = eventsQuery.data?.total ?? 0;

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
			description="Revision read-only del historial completo de tracking por cart item."
			title="Tracking de operaciones"
		>
			<section className="flex flex-col gap-3">
				<div className="rounded-none border p-3">
					<FieldGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<Field>
							<FieldLabel htmlFor="tracking-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="tracking-search"
									onChange={(event) =>
										updateFilter(setSearchTerm, event.target.value)
									}
									placeholder="Evento, actor, usuario, carrito o producto"
									value={searchTerm}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-event-type">Evento</FieldLabel>
							<Select
								id="tracking-event-type"
								onChange={(event) =>
									updateFilter(
										setEventType,
										event.target.value as TrackingEventType | "all",
									)
								}
								value={eventType}
							>
								<option value={allValue}>Todos</option>
								{trackingEventTypeOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-source">Fuente</FieldLabel>
							<Select
								id="tracking-source"
								onChange={(event) =>
									updateFilter(
										setSource,
										event.target.value as TrackingEventSource | "all",
									)
								}
								value={source}
							>
								<option value={allValue}>Todas</option>
								{trackingSourceOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-page-size">
								Tamaño pagina
							</FieldLabel>
							<Select
								id="tracking-page-size"
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
						<Field>
							<FieldLabel htmlFor="tracking-user">Usuario carrito</FieldLabel>
							<Select
								disabled={usersQuery.isLoading}
								id="tracking-user"
								onChange={(event) =>
									updateFilter(setUserId, event.target.value)
								}
								value={userId}
							>
								<option value={allValue}>Todos</option>
								{(usersQuery.data ?? []).map((user) => (
									<option key={user.id} value={user.id}>
										{user.name} - {user.email}
										{user.deleted ? " (eliminado)" : ""}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-actor">Actor</FieldLabel>
							<Select
								disabled={usersQuery.isLoading}
								id="tracking-actor"
								onChange={(event) =>
									updateFilter(setActorUserId, event.target.value)
								}
								value={actorUserId}
							>
								<option value={allValue}>Todos</option>
								{(usersQuery.data ?? []).map((user) => (
									<option key={user.id} value={user.id}>
										{user.name} - {user.email}
										{user.deleted ? " (eliminado)" : ""}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-cart-id">Cart ID</FieldLabel>
							<Input
								id="tracking-cart-id"
								inputMode="numeric"
								onChange={(event) =>
									updateFilter(setCartId, event.target.value)
								}
								placeholder="Ej: 10"
								value={cartId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-cart-item-id">
								Cart item ID
							</FieldLabel>
							<Input
								id="tracking-cart-item-id"
								inputMode="numeric"
								onChange={(event) =>
									updateFilter(setCartItemId, event.target.value)
								}
								placeholder="Ej: 25"
								value={cartItemId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-order-id">Order ID</FieldLabel>
							<Input
								id="tracking-order-id"
								inputMode="numeric"
								onChange={(event) =>
									updateFilter(setOrderId, event.target.value)
								}
								placeholder="Ej: 5"
								value={orderId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-operation-id">
								Operation ID
							</FieldLabel>
							<Input
								id="tracking-operation-id"
								inputMode="numeric"
								onChange={(event) =>
									updateFilter(setOperationId, event.target.value)
								}
								placeholder="Ej: 3"
								value={operationId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-lot-id">Lot ID</FieldLabel>
							<Input
								id="tracking-lot-id"
								inputMode="numeric"
								onChange={(event) => updateFilter(setLotId, event.target.value)}
								placeholder="Ej: 4"
								value={lotId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-lot-item-id">
								Lot item ID
							</FieldLabel>
							<Input
								id="tracking-lot-item-id"
								inputMode="numeric"
								onChange={(event) =>
									updateFilter(setLotItemId, event.target.value)
								}
								placeholder="Ej: 8"
								value={lotItemId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-package-id">Package ID</FieldLabel>
							<Input
								id="tracking-package-id"
								inputMode="numeric"
								onChange={(event) =>
									updateFilter(setPackageId, event.target.value)
								}
								placeholder="Ej: 12"
								value={packageId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-shipment-id">
								Shipment ID
							</FieldLabel>
							<Input
								id="tracking-shipment-id"
								inputMode="numeric"
								onChange={(event) =>
									updateFilter(setShipmentId, event.target.value)
								}
								placeholder="Ej: 6"
								value={shipmentId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-rollover-id">
								RollOver ID
							</FieldLabel>
							<Input
								id="tracking-rollover-id"
								inputMode="numeric"
								onChange={(event) =>
									updateFilter(setRollOverId, event.target.value)
								}
								placeholder="Ej: 2"
								value={rollOverId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-created-from">Desde</FieldLabel>
							<Input
								id="tracking-created-from"
								onChange={(event) =>
									updateFilter(setCreatedFrom, event.target.value)
								}
								type="datetime-local"
								value={createdFrom}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="tracking-created-to">Hasta</FieldLabel>
							<Input
								id="tracking-created-to"
								onChange={(event) =>
									updateFilter(setCreatedTo, event.target.value)
								}
								type="datetime-local"
								value={createdTo}
							/>
						</Field>
						<Field className="self-end" orientation="horizontal">
							<Button onClick={clearFilters} type="button" variant="outline">
								<RotateCcwIcon data-icon="inline-start" />
								Limpiar
							</Button>
							<FieldContent>
								<FieldLabel>Filtros</FieldLabel>
								<FieldDescription>Server-side</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<span className="text-muted-foreground text-sm">
						{eventsQuery.isLoading
							? "Cargando eventos"
							: `${total} evento${total === 1 ? "" : "s"}`}
					</span>
					<div className="flex items-center gap-2">
						<Button
							disabled={page <= 1 || eventsQuery.isLoading}
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
								pageCount === 0 || page >= pageCount || eventsQuery.isLoading
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

			<TrackingDetailDialog
				detail={detailQuery.data}
				errorMessage={
					detailQuery.isError ? detailQuery.error.message : undefined
				}
				isLoading={detailQuery.isFetching}
				onOpenChange={(open) => {
					if (!open) setSelectedCartItemId(null);
				}}
				open={selectedCartItemId !== null}
			/>
		</CrudPageShell>
	);
}
