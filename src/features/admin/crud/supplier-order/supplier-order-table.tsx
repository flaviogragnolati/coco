"use client";

import {
	DateTooltip,
	IdTooltip,
} from "~/features/admin/crud/_components/crud-cell-tooltips";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import { OperationalDiagnosticBadge } from "~/features/admin/crud/_components/operational-diagnostic-badge";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";
import type { SupplierOrderListItem } from "~/shared/common/admin-crud/supplier-order.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import { supplierOrderStatusConfig } from "./supplier-order.mappers";

const supplierOrderColumns: CrudColumn<SupplierOrderListItem>[] = [
	{
		key: "order",
		header: "Orden",
		className: "min-w-44",
		cell: (order) => (
			<div className="flex flex-col gap-1">
				<span className="font-medium">{order.code}</span>
				<IdTooltip id={order.id} label="Orden de proveedor" />
				{order.externalReference ? (
					<span className="text-muted-foreground text-xs">
						Ref. {order.externalReference}
					</span>
				) : null}
			</div>
		),
	},
	{
		key: "supplier",
		header: "Proveedor",
		className: "min-w-44",
		cell: (order) => <span>{order.supplier.name}</span>,
	},
	{
		key: "operations",
		header: "Operación",
		className: "min-w-44",
		cell: (order) => (
			<div className="flex flex-col gap-1">
				{order.operations.length === 0 ? (
					<span className="text-muted-foreground text-xs">Sin operación</span>
				) : (
					order.operations.map((operation) => (
						<span key={operation.id}>{operation.code}</span>
					))
				)}
			</div>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (order) => (
			<StatusChip config={supplierOrderStatusConfig[order.status]} />
		),
	},
	{
		key: "lines",
		header: "Líneas",
		className: "min-w-52",
		cell: (order) => (
			<div className="flex flex-col gap-1 text-xs">
				<span>
					Activas: {order.liveLotItemCount} / {order.lotItemCount}
				</span>
				<span>Cantidad activa: {order.liveLotItemQuantity}</span>
				<span className="text-muted-foreground">Lotes: {order.lotCount}</span>
			</div>
		),
	},
	{
		key: "diagnostics",
		header: "Diagnósticos",
		className: "min-w-60",
		cell: (order) => (
			<div className="flex flex-col gap-1">
				<OperationalDiagnosticBadge
					count={order.diagnosticCount}
					severity={order.highestDiagnosticSeverity}
				/>
				{order.diagnosticMessages.map((message) => (
					<span className="text-muted-foreground text-xs" key={message}>
						{message}
					</span>
				))}
			</div>
		),
	},
	{
		key: "dates",
		header: "Fechas",
		className: "min-w-44",
		cell: (order) => (
			<div className="flex flex-col gap-1 text-xs">
				<DateTooltip value={order.createdAt} />
				{order.requestedAt ? (
					<span className="text-muted-foreground">
						Solicitada {formatDateTimeShort(new Date(order.requestedAt))}
					</span>
				) : null}
				{order.confirmedAt ? (
					<span className="text-muted-foreground">
						Confirmada {formatDateTimeShort(new Date(order.confirmedAt))}
					</span>
				) : null}
				{order.cancelledAt ? (
					<span className="text-muted-foreground">
						Cancelada {formatDateTimeShort(new Date(order.cancelledAt))}
					</span>
				) : null}
			</div>
		),
	},
];

export function SupplierOrderTable({
	supplierOrders,
	onSelect,
}: {
	supplierOrders: SupplierOrderListItem[];
	onSelect: (order: SupplierOrderListItem) => void;
}) {
	return (
		<CrudTable
			columns={supplierOrderColumns}
			getRowAriaLabel={(order) => `Ver orden de proveedor ${order.code}`}
			getRowKey={(order) => order.id}
			items={supplierOrders}
			onRowClick={onSelect}
		/>
	);
}
