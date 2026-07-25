"use client";

import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

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
import {
	trackingEventTypeOptions,
	trackingSourceOptions,
} from "~/features/admin/crud/tracking/tracking.mappers";
import { TrackingDetailDialog } from "~/features/admin/crud/tracking/tracking-detail-dialog";
import { TrackingEventTable } from "~/features/admin/crud/tracking/tracking-table";
import type { CrudSortDirection } from "~/shared/common/admin-crud/crud.types";
import type { AdminTrackingEventListItem } from "~/shared/common/tracking.types";
import type {
	TrackingEventSource,
	TrackingEventType,
} from "~/shared/common/tracking-display";
import { api } from "~/trpc/react";

const allValue = "all";

function positiveIntOrUndefined(value: string) {
	if (!/^\d+$/.test(value)) return undefined;

	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

type TrackingInitialFilters = {
	cartId?: string;
	cartItemId?: string;
	orderId?: string;
	operationId?: string;
	lotId?: string;
	lotItemId?: string;
	packageId?: string;
	shipmentId?: string;
	rollOverId?: string;
};

export function TrackingClient({
	initialFilters = {},
}: {
	initialFilters?: TrackingInitialFilters;
}) {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<number>(25);
	const [sortDirection, setSortDirection] = useState<CrudSortDirection>("desc");
	const [searchTerm, setSearchTerm] = useState("");
	const [eventType, setEventType] = useState<TrackingEventType | "all">("all");
	const [source, setSource] = useState<TrackingEventSource | "all">("all");
	const [userId, setUserId] = useState("all");
	const [actorUserId, setActorUserId] = useState("all");
	const [cartId, setCartId] = useState(() => initialFilters.cartId ?? "");
	const [cartItemId, setCartItemId] = useState(
		() => initialFilters.cartItemId ?? "",
	);
	const [orderId, setOrderId] = useState(() => initialFilters.orderId ?? "");
	const [operationId, setOperationId] = useState(
		() => initialFilters.operationId ?? "",
	);
	const [lotId, setLotId] = useState(() => initialFilters.lotId ?? "");
	const [lotItemId, setLotItemId] = useState(
		() => initialFilters.lotItemId ?? "",
	);
	const [packageId, setPackageId] = useState(
		() => initialFilters.packageId ?? "",
	);
	const [shipmentId, setShipmentId] = useState(
		() => initialFilters.shipmentId ?? "",
	);
	const [rollOverId, setRollOverId] = useState(
		() => initialFilters.rollOverId ?? "",
	);
	const [createdFrom, setCreatedFrom] = useState("");
	const [createdTo, setCreatedTo] = useState("");
	// Arriving with `?cartItemId=` both filters the table and opens that item's
	// journey modal — deep links from the lot/package/shipment dialogs land on the
	// item itself. Initial read only: closing the modal does not touch the URL.
	const [selectedCartItemId, setSelectedCartItemId] = useState<number | null>(
		() => positiveIntOrUndefined(initialFilters.cartItemId ?? "") ?? null,
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
			sortDirection,
			filters,
		}),
		[filters, page, pageSize, sortDirection],
	);

	const advancedFilterValues = [
		userId,
		actorUserId,
		cartId,
		cartItemId,
		orderId,
		operationId,
		lotId,
		lotItemId,
		packageId,
		shipmentId,
		rollOverId,
		createdFrom,
		createdTo,
	];
	const activeAdvancedCount = advancedFilterValues.filter(
		(value) => value.length > 0 && value !== allValue,
	).length;

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
		setSortDirection("desc");
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

	const idFilters = [
		["cart-id", "Cart ID", "Ej: 10", cartId, setCartId],
		["cart-item-id", "Cart item ID", "Ej: 25", cartItemId, setCartItemId],
		["order-id", "Order ID", "Ej: 5", orderId, setOrderId],
		["operation-id", "Operation ID", "Ej: 3", operationId, setOperationId],
		["lot-id", "Lot ID", "Ej: 4", lotId, setLotId],
		["lot-item-id", "Lot item ID", "Ej: 8", lotItemId, setLotItemId],
		["package-id", "Package ID", "Ej: 12", packageId, setPackageId],
		["shipment-id", "Shipment ID", "Ej: 6", shipmentId, setShipmentId],
		["rollover-id", "RollOver ID", "Ej: 2", rollOverId, setRollOverId],
	] as const;

	const userOptions = (usersQuery.data ?? []).map((user) => ({
		id: user.id,
		label: `${user.name} - ${user.email}${user.deleted ? " (eliminado)" : ""}`,
	}));

	return (
		<CrudPageShell
			description="Revisión read-only del historial completo de tracking por ítem de carrito."
			title="Tracking"
		>
			<section className="flex flex-col gap-3">
				<CrudFilterPanel
					actions={
						<CrudSortToggle onChange={setSortDirection} value={sortDirection} />
					}
					activeAdvancedCount={activeAdvancedCount}
					advanced={
						<>
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
									{userOptions.map((user) => (
										<option key={user.id} value={user.id}>
											{user.label}
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
									{userOptions.map((user) => (
										<option key={user.id} value={user.id}>
											{user.label}
										</option>
									))}
								</Select>
							</Field>
							{idFilters.map(([id, label, placeholder, value, setter]) => (
								<Field key={id}>
									<FieldLabel htmlFor={`tracking-${id}`}>{label}</FieldLabel>
									<Input
										id={`tracking-${id}`}
										inputMode="numeric"
										onChange={(event) =>
											updateFilter(setter, event.target.value)
										}
										placeholder={placeholder}
										value={value}
									/>
								</Field>
							))}
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
						</>
					}
					onReset={clearFilters}
					primary={
						<>
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
						</>
					}
				/>

				<CrudPaginationBar
					isLoading={eventsQuery.isLoading}
					onPageChange={setPage}
					onPageSizeChange={(value) => updateFilter(setPageSize, value)}
					page={page}
					pageCount={eventsQuery.data?.pageCount ?? 0}
					pageSize={pageSize}
					total={eventsQuery.data?.total ?? 0}
					totalLabel={{ singular: "evento", plural: "eventos" }}
				/>

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
