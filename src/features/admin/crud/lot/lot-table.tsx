"use client";

import {
	DateTooltip,
	IdTooltip,
} from "~/features/admin/crud/_components/crud-cell-tooltips";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import { OperationalDiagnosticBadge } from "~/features/admin/crud/_components/operational-diagnostic-badge";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";
import type { LotListItem } from "~/shared/common/admin-crud/lot.types";
import { lotStatusConfig } from "./lot.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const lotColumns: CrudColumn<LotListItem>[] = [
	{
		key: "lot",
		header: "Lote",
		className: "min-w-44",
		cell: (lot) => (
			<div className="flex flex-col gap-1">
				<span className="font-medium">{lot.code}</span>
				<IdTooltip id={lot.id} label="Lote" />
			</div>
		),
	},
	{
		key: "operation",
		header: "Operacion",
		className: "min-w-44",
		cell: (lot) => (
			<div className="flex flex-col gap-1">
				<span>{lot.operation.code}</span>
				<IdTooltip id={lot.operation.id} label="Operacion" />
			</div>
		),
	},
	{
		key: "supplier",
		header: "Proveedor",
		className: "min-w-48",
		cell: (lot) => (
			<div className="flex flex-col gap-1">
				<span>{lot.supplier.name}</span>
				<span className="text-muted-foreground text-xs">
					{lot.supplierOrder
						? `Orden ${lot.supplierOrder.code}`
						: "Sin orden proveedor"}
				</span>
			</div>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (lot) => <StatusChip config={lotStatusConfig[lot.status]} />,
	},
	{
		key: "quantity",
		header: "Cantidades",
		className: "min-w-52",
		cell: (lot) => (
			<div className="flex flex-col gap-1 text-xs">
				<span>Lineas: {lot.lotItemQuantity}</span>
				<span>Demanda: {lot.demandAllocationQuantity}</span>
				<span>Pendiente empaque: {lot.pendingQuantity}</span>
			</div>
		),
	},
	{
		key: "diagnostics",
		header: "Diagnosticos",
		className: "min-w-60",
		cell: (lot) => (
			<div className="flex flex-col gap-1">
				<OperationalDiagnosticBadge
					count={lot.diagnosticCount}
					severity={lot.highestDiagnosticSeverity}
				/>
				{lot.diagnosticMessages.map((message) => (
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
		cell: (lot) => (
			<div className="flex flex-col gap-1 text-xs">
				<DateTooltip value={lot.createdAt} />
				<span className="text-muted-foreground">
					Act. {dateFormatter.format(new Date(lot.updatedAt))}
				</span>
			</div>
		),
	},
];

export function LotTable({
	lots,
	onSelect,
}: {
	lots: LotListItem[];
	onSelect: (lot: LotListItem) => void;
}) {
	return (
		<CrudTable
			columns={lotColumns}
			getRowAriaLabel={(lot) => `Ver lote ${lot.code}`}
			getRowKey={(lot) => lot.id}
			items={lots}
			onRowClick={onSelect}
		/>
	);
}
