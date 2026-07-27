"use client";

import {
	BanIcon,
	ClipboardCheckIcon,
	EyeIcon,
	RefreshCwIcon,
	Trash2Icon,
} from "lucide-react";

import {
	DateTooltip,
	IdTooltip,
} from "~/features/admin/crud/_components/crud-cell-tooltips";
import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import { OperationalDiagnosticBadge } from "~/features/admin/crud/_components/operational-diagnostic-badge";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type {
	OperationCommandKey,
	OperationListItem,
} from "~/shared/common/admin-crud/operation.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import {
	operationActionLabelMap,
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
		key: "diagnostics",
		header: "Diagnósticos",
		className: "min-w-60",
		cell: (operation) => (
			<div className="flex flex-col gap-1">
				<OperationalDiagnosticBadge
					count={operation.diagnosticCount}
					severity={operation.highestDiagnosticSeverity}
				/>
				{operation.diagnosticMessages.map((message) => (
					<span className="text-muted-foreground text-xs" key={message}>
						{message}
					</span>
				))}
			</div>
		),
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

const commandKeys = ["execute", "cancel", "rerun", "delete"] as const;

const commandIcons: Record<OperationCommandKey, typeof BanIcon> = {
	execute: ClipboardCheckIcon,
	cancel: BanIcon,
	rerun: RefreshCwIcon,
	delete: Trash2Icon,
};

export function OperationTable({
	operations,
	onView,
	onCommand,
}: {
	operations: OperationListItem[];
	onView: (operation: OperationListItem) => void;
	onCommand: (operation: OperationListItem, key: OperationCommandKey) => void;
}) {
	// Built from the server's `availableActions`: the row menu re-derives no
	// legality rule of its own, it only renders what the server declared.
	const actions = (
		operation: OperationListItem,
	): CrudRowAction<OperationListItem>[] => [
		{
			label: "Ver detalle",
			icon: EyeIcon,
			onSelect: onView,
		},
		...commandKeys.map((key) => {
			const state = operation.availableActions.find(
				(entry) => entry.action === key,
			);

			return {
				label: operationActionLabelMap[key],
				icon: commandIcons[key],
				onSelect: (item: OperationListItem) => onCommand(item, key),
				disabled: () => !state?.enabled,
				destructive: key !== "rerun",
				hint: state?.enabled ? undefined : state?.reason,
			};
		}),
	];

	return (
		<CrudTable
			actions={(operation) => (
				<div className="flex items-center justify-end gap-2">
					<CrudRowActions actions={actions(operation)} item={operation} />
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
