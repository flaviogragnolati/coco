"use client";

import { RefreshCwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { CrudFilterPanel } from "~/features/admin/crud/_components/crud-filter-panel";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import { CrudPaginationBar } from "~/features/admin/crud/_components/crud-pagination-bar";
import {
	CrudEmptyState,
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import { NotificationStatusChip } from "~/features/admin/notifications/notification-status-chip";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import { api, type RouterOutputs } from "~/trpc/react";
import { NotificationDetail } from "./notification-detail";

const filters = [
	["accepted", "Enviados"],
	["all", "Todos"],
	["pending", "Pendientes de envío"],
	["processing", "En curso"],
	["skipped", "Omitidos"],
	["review", "Requieren revisión"],
] as const;

function statusFilter(value: string) {
	return filters.find(([status]) => status === value)?.[0] ?? "accepted";
}

const noticeKinds = new Map([
	["confirmed", "Confirmación de pedido"],
	["rejected", "Pago rechazado"],
	["transfer", "Instrucciones de transferencia"],
	["pickup", "Disponible para retirar"],
	["change", "Cambio de entrega"],
	["rollover", "Productos reprogramados"],
]);

type NotificationRow =
	RouterOutputs["admin"]["notification"]["list"]["items"][number];

function notificationColumns(test: boolean): CrudColumn<NotificationRow>[] {
	return [
		{
			key: "order",
			header: "Pedido",
			cell: (row) => <span className="font-mono">{row.orderCode}</span>,
		},
		{
			key: "notice",
			header: "Mail",
			className: "max-w-96 whitespace-normal",
			cell: (row) => (
				<div className="flex flex-col gap-0.5 break-words">
					<span className="font-medium">
						{noticeKinds.get(row.kind ?? "") ?? "Correo de pedido"}
					</span>
					{row.subject ? (
						<span className="text-muted-foreground text-xs">{row.subject}</span>
					) : null}
				</div>
			),
		},
		{
			key: "recipient",
			header: "Destinatario",
			className: "max-w-72 whitespace-normal break-all",
			cell: (row) => row.to ?? "Aún sin registrar",
		},
		{
			key: "status",
			header: "Estado",
			cell: (row) => <NotificationStatusChip status={row.status} test={test} />,
		},
		{
			key: "date",
			header: "Última actualización",
			cell: (row) => formatDateTimeShort(row.updatedAt),
		},
	];
}

export function NotificationsClient({
	initialOrder,
	initialStatus,
}: {
	initialOrder: string;
	initialStatus: string;
}) {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(25);
	const [order, setOrder] = useState(initialOrder);
	const [status, setStatus] = useState(() => statusFilter(initialStatus));
	const [selected, setSelected] = useState<string | null>(null);
	const opener = useRef<HTMLElement | null>(null);
	const searchInput = useRef<HTMLInputElement>(null);
	const search = order.trim();
	const numericId = /^\d+$/.test(search) ? Number(search) : 0;
	const byId =
		Number.isSafeInteger(numericId) &&
		numericId > 0 &&
		numericId <= 2_147_483_647;
	const query = api.admin.notification.list.useQuery(
		{
			page,
			pageSize,
			status,
			orderId: byId ? numericId : undefined,
			orderCode: byId || !search ? undefined : search,
		},
		{ refetchInterval: 15_000, refetchOnWindowFocus: true },
	);
	const data = query.data;
	useEffect(() => {
		if (data && page > Math.max(1, data.pageCount))
			setPage(Math.max(1, data.pageCount));
	}, [data, page]);

	function select(row: NotificationRow) {
		opener.current =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		setSelected(row.id);
	}

	function close() {
		setSelected(null);
		requestAnimationFrame(() => {
			const target = opener.current;
			(target?.isConnected && target !== document.body
				? target
				: searchInput.current
			)?.focus();
		});
	}

	function results() {
		if (query.isLoading) return <CrudLoadingState />;
		if (query.isError || !data)
			return (
				<CrudErrorState message="No pudimos consultar el historial. Volvé a intentar con Actualizar." />
			);
		if (data.mode === "off")
			return (
				<CrudEmptyState
					description="Este entorno tiene el correo de pedidos desactivado."
					title="Correo desactivado"
				/>
			);
		if (!data.items.length) {
			return search || status !== "accepted" ? (
				<CrudEmptyState
					description="Probá con otro pedido o estado."
					title="Ningún mail coincide con los filtros"
				/>
			) : (
				<CrudEmptyState
					description="Elegí Todos para consultar también los avisos que esperan envío."
					title="Todavía no hay mails enviados"
				/>
			);
		}
		return (
			<CrudTable
				columns={notificationColumns(data.mode === "test")}
				getRowAriaLabel={(row) =>
					`Ver mail de ${row.orderCode}: ${row.subject ?? noticeKinds.get(row.kind ?? "") ?? "correo de pedido"}`
				}
				getRowKey={(row) => row.id}
				items={data.items}
				onRowClick={select}
			/>
		);
	}

	return (
		<CrudPageShell
			description={
				data?.mode === "test"
					? "Historial de mails de prueba. El destinatario es la casilla de pruebas del entorno."
					: "Historial de mails de pedido. Enviado indica que Resend aceptó el mail."
			}
			title="Notificaciones"
		>
			<CrudFilterPanel
				actions={
					<Button
						disabled={query.isFetching}
						onClick={() => void query.refetch()}
						type="button"
						variant="outline"
					>
						<RefreshCwIcon data-icon="inline-start" />
						Actualizar
					</Button>
				}
				activeAdvancedCount={0}
				onReset={
					order || status !== "accepted"
						? () => {
								setOrder("");
								setStatus("accepted");
								setPage(1);
							}
						: undefined
				}
				primary={
					<>
						<Field>
							<FieldLabel htmlFor="notification-order">Pedido</FieldLabel>
							<Input
								id="notification-order"
								maxLength={64}
								onChange={(event) => {
									setOrder(event.target.value);
									setPage(1);
								}}
								placeholder="Código o ID del pedido"
								ref={searchInput}
								type="search"
								value={order}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="notification-status">Estado</FieldLabel>
							<Select
								id="notification-status"
								onChange={(event) => {
									setStatus(statusFilter(event.target.value));
									setPage(1);
								}}
								value={status}
							>
								{filters.map(([key, label]) => (
									<option key={key} value={key}>
										{label}
									</option>
								))}
							</Select>
						</Field>
					</>
				}
			/>
			{data && data.mode !== "off" ? (
				<CrudPaginationBar
					onPageChange={setPage}
					onPageSizeChange={(size) => {
						setPageSize(size);
						setPage(1);
					}}
					page={page}
					pageCount={data.pageCount}
					pageSize={pageSize}
					total={data.total}
					totalLabel={{ singular: "mail", plural: "mails" }}
				/>
			) : null}
			{results()}
			{selected ? <NotificationDetail id={selected} onClose={close} /> : null}
		</CrudPageShell>
	);
}
