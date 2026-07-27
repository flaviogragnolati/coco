"use client";

import { EyeIcon, PencilIcon, Trash2Icon, TrashIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
	DateTooltip,
	IdTooltip,
} from "~/features/admin/crud/_components/crud-cell-tooltips";
import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import { OperationalDiagnosticBadge } from "~/features/admin/crud/_components/operational-diagnostic-badge";
import type {
	CarrierOrderCommandKey,
	CarrierOrderListItem,
} from "~/shared/common/admin-crud/carrier-order.types";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import {
	carrierOrderActionLabelMap,
	carrierOrderStatusConfig,
} from "./carrier-order.mappers";

const carrierOrderColumns: CrudColumn<CarrierOrderListItem>[] = [
	{
		key: "code",
		header: "Orden",
		className: "min-w-48",
		cell: (order) => (
			<div className="flex flex-col gap-1">
				<span className="font-medium">{order.code}</span>
				<span className="text-muted-foreground text-xs">
					{order.externalReference ?? "Sin referencia externa"}
				</span>
				<IdTooltip id={order.id} label="Orden de transporte" />
			</div>
		),
	},
	{
		key: "carrier",
		header: "Transportista",
		className: "min-w-40",
		cell: (order) => (
			<div className="flex flex-col gap-1">
				<span>{order.carrier.name}</span>
				<IdTooltip id={order.carrier.id} label="Transportista" />
			</div>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (order) => (
			<div className="flex flex-col items-start gap-1">
				<StatusChip config={carrierOrderStatusConfig[order.status]} />
				{order.deleted ? <Badge variant="outline">Dada de baja</Badge> : null}
			</div>
		),
	},
	{
		key: "shipments",
		header: "Envíos",
		cell: (order) => (
			<div className="flex flex-col gap-0.5 text-xs">
				<span className="font-medium text-foreground">
					{order.liveShipmentCount} / {order.shipmentCount}
				</span>
				<span className="text-muted-foreground">Activos / totales</span>
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
			<div className="flex flex-col gap-0.5 text-xs">
				<DateTooltip value={order.createdAt} />
				<span className="text-muted-foreground">
					{order.requestedAt
						? `Solicitada ${formatDateTimeShort(new Date(order.requestedAt))}`
						: "Sin solicitar"}
				</span>
				<span className="text-muted-foreground">
					Act. {formatDateTimeShort(new Date(order.updatedAt))}
				</span>
			</div>
		),
	},
];

const rowCommandKeys = ["edit", "softDelete", "hardDelete"] as const;

const commandIcons: Record<(typeof rowCommandKeys)[number], typeof PencilIcon> =
	{
		edit: PencilIcon,
		softDelete: TrashIcon,
		hardDelete: Trash2Icon,
	};

export function CarrierOrderTable({
	carrierOrders,
	onView,
	onCommand,
}: {
	carrierOrders: CarrierOrderListItem[];
	onView: (order: CarrierOrderListItem) => void;
	onCommand: (order: CarrierOrderListItem, key: CarrierOrderCommandKey) => void;
}) {
	// Built from the server's `availableActions`: the row menu re-derives no
	// legality rule of its own, it only renders what the server declared.
	const actions = (
		order: CarrierOrderListItem,
	): CrudRowAction<CarrierOrderListItem>[] => [
		{ label: "Ver detalle", icon: EyeIcon, onSelect: onView },
		...rowCommandKeys.map((key) => {
			const state = order.availableActions.find(
				(entry) => entry.action === key,
			);

			return {
				label: carrierOrderActionLabelMap[key],
				icon: commandIcons[key],
				onSelect: (item: CarrierOrderListItem) => onCommand(item, key),
				disabled: () => !state?.enabled,
				destructive: key !== "edit",
				hint: state?.enabled ? undefined : state?.reason,
			};
		}),
	];

	return (
		<CrudTable
			actions={(order) => (
				<div className="flex items-center justify-end gap-2">
					<CrudRowActions actions={actions(order)} item={order} />
				</div>
			)}
			columns={carrierOrderColumns}
			getRowAriaLabel={(order) => `Ver orden de transporte ${order.code}`}
			getRowKey={(order) => order.id}
			items={carrierOrders}
			onRowClick={onView}
		/>
	);
}
