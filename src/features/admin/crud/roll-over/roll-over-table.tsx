"use client";

import { Button } from "~/components/ui/button";
import {
	DateTooltip,
	IdTooltip,
} from "~/features/admin/crud/_components/crud-cell-tooltips";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";
import type { RollOverListItem } from "~/shared/common/admin-crud/roll-over.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import {
	rollOverStageLabelMap,
	rollOverStatusConfig,
} from "./roll-over.mappers";

/**
 * `RollOver` has no unique code, so rows key on `id` and the id is what the
 * operator has to quote.
 */
function buildColumns(
	onResolve: (rollOver: RollOverListItem) => void,
): CrudColumn<RollOverListItem>[] {
	return [
		{
			key: "rollOver",
			header: "Rollover",
			className: "min-w-36",
			cell: (rollOver) => (
				<div className="flex flex-col gap-1">
					<span className="font-medium">#{rollOver.id}</span>
					<span className="text-muted-foreground text-xs">
						{rollOverStageLabelMap[rollOver.stage]}
					</span>
				</div>
			),
		},
		{
			key: "status",
			header: "Estado",
			cell: (rollOver) => (
				<StatusChip config={rollOverStatusConfig[rollOver.status]} />
			),
		},
		{
			key: "operation",
			header: "Operación",
			className: "min-w-44",
			cell: (rollOver) => (
				<div className="flex flex-col gap-1">
					<span>{rollOver.operation.code}</span>
					<IdTooltip id={rollOver.operation.id} label="Operación" />
					{rollOver.rebatchedIntoOperation ? (
						<span className="text-muted-foreground text-xs">
							Reagrupado en {rollOver.rebatchedIntoOperation.code}
						</span>
					) : null}
				</div>
			),
		},
		{
			key: "cartItem",
			header: "Demanda",
			className: "min-w-44",
			cell: (rollOver) => (
				<div className="flex flex-col gap-1">
					<span>{rollOver.cartItem.code}</span>
					<span className="text-muted-foreground text-xs">
						{rollOver.cartItem.userName}
					</span>
				</div>
			),
		},
		{
			key: "quantity",
			header: "Cantidad",
			cell: (rollOver) => <span>{rollOver.quantity}</span>,
		},
		{
			key: "reason",
			header: "Motivo",
			className: "min-w-64",
			cell: (rollOver) => <span className="text-xs">{rollOver.reason}</span>,
		},
		{
			key: "dates",
			header: "Fechas",
			className: "min-w-44",
			cell: (rollOver) => (
				<div className="flex flex-col gap-1 text-xs">
					<DateTooltip value={rollOver.createdAt} />
					<span className="text-muted-foreground">
						Act. {formatDateTimeShort(new Date(rollOver.updatedAt))}
					</span>
				</div>
			),
		},
		{
			key: "actions",
			header: "Acciones",
			cell: (rollOver) =>
				rollOver.status === "open" ? (
					<Button
						onClick={(event) => {
							event.stopPropagation();
							onResolve(rollOver);
						}}
						size="sm"
						type="button"
						variant="outline"
					>
						Resolver
					</Button>
				) : null,
		},
	];
}

export function RollOverTable({
	rollOvers,
	onResolve,
}: {
	rollOvers: RollOverListItem[];
	onResolve: (rollOver: RollOverListItem) => void;
}) {
	return (
		<CrudTable
			columns={buildColumns(onResolve)}
			getRowKey={(rollOver) => rollOver.id}
			items={rollOvers}
		/>
	);
}
