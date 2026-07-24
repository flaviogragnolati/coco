"use client";

import {
	BanIcon,
	EyeIcon,
	RefreshCwIcon,
	RotateCcwIcon,
	Trash2Icon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
	DateTooltip,
	IdTooltip,
} from "~/features/admin/crud/_components/crud-cell-tooltips";
import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type { OperationListItem } from "~/shared/common/admin-crud/operation.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import {
	operationStatusConfig,
	operationStrategyConfig,
} from "./operation.mappers";

function QuantitySummary({ operation }: { operation: OperationListItem }) {
	return (
		<div className="flex flex-col gap-0.5 text-xs">
			<span className="font-medium text-foreground">
				{operation.eligibleQuantity} / {operation.assignedQuantity} /{" "}
				{operation.rollOverQuantity}
			</span>
			<span className="text-muted-foreground">
				Elegible / asignada / rollover
			</span>
			<span className="text-muted-foreground">
				{operation.eligibleItemCount} items, {operation.lotCount} lotes
			</span>
		</div>
	);
}

const operationColumns: CrudColumn<OperationListItem>[] = [
	{
		key: "operation",
		header: "Operación",
		className: "min-w-40",
		cell: (operation) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-foreground">{operation.code}</span>
				<IdTooltip id={operation.id} label="Operación" />
			</div>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (operation) => (
			<div className="flex flex-col items-start gap-1">
				<StatusChip config={operationStatusConfig[operation.status]} />
				<StatusChip config={operationStrategyConfig[operation.strategy]} />
			</div>
		),
	},
	{
		key: "window",
		header: "Ventana",
		className: "min-w-44",
		cell: (operation) => (
			<div className="flex flex-col gap-0.5 text-xs">
				<DateTooltip value={operation.from} />
				<span className="text-muted-foreground">
					hasta {formatDateTimeShort(operation.to)}
				</span>
				<span className="text-muted-foreground">
					{operation.includeRollOver ? "Incluye rollovers" : "Sin rollovers"}
				</span>
			</div>
		),
	},
	{
		key: "destination",
		header: "Destino",
		cell: (operation) =>
			operation.destination ? (
				<div className="flex flex-col gap-0.5">
					<span className="font-medium">{operation.destination.name}</span>
					<IdTooltip id={operation.destination.id} label="Destino" />
				</div>
			) : (
				<span className="text-muted-foreground text-xs">Sin destino</span>
			),
	},
	{
		key: "summary",
		header: "Resumen",
		cell: (operation) => <QuantitySummary operation={operation} />,
	},
	{
		key: "createdAt",
		header: "Ejecución",
		className: "w-40",
		cell: (operation) => (
			<div className="flex flex-col gap-0.5 text-xs">
				<DateTooltip value={operation.createdAt} />
				<span className="text-muted-foreground">
					{operation.finishedAt
						? formatDateTimeShort(operation.finishedAt)
						: "En curso"}
				</span>
			</div>
		),
	},
];

export function OperationTable({
	operations,
	onView,
	onUnavailableAction,
}: {
	operations: OperationListItem[];
	onView: (operation: OperationListItem) => void;
	onUnavailableAction: (action: string) => void;
}) {
	const actions: CrudRowAction<OperationListItem>[] = [
		{
			label: "Ver detalle",
			icon: EyeIcon,
			onSelect: onView,
		},
		{
			label: "Cancelar",
			icon: BanIcon,
			onSelect: () => onUnavailableAction("Cancelar"),
			disabled: () => true,
		},
		{
			label: "Reejecutar",
			icon: RefreshCwIcon,
			onSelect: () => onUnavailableAction("Reejecutar"),
			disabled: () => true,
		},
		{
			label: "Eliminar",
			icon: Trash2Icon,
			onSelect: () => onUnavailableAction("Eliminar"),
			disabled: () => true,
			destructive: true,
		},
	];

	return (
		<CrudTable
			actions={(operation) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						disabled
						size="icon-sm"
						title="Reejecutar disponible en una version futura"
						variant="outline"
					>
						<RotateCcwIcon />
					</Button>
					<CrudRowActions actions={actions} item={operation} />
				</div>
			)}
			columns={operationColumns}
			getRowAriaLabel={(operation) => `Ver operación ${operation.code}`}
			getRowKey={(operation) => operation.id}
			items={operations}
			onRowClick={onView}
		/>
	);
}
