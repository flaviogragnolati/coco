"use client";

import { ArchiveXIcon, HandIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { DateTooltip } from "~/features/admin/crud/_components/crud-cell-tooltips";
import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type { QaTicketListItem } from "~/shared/common/admin-crud/qa-ticket.types";
import { qaTicketStatusConfig } from "./qa-ticket.mappers";

const qaTicketColumns: CrudColumn<QaTicketListItem>[] = [
	{
		key: "code",
		header: "#",
		className: "w-14 font-mono",
		cell: (ticket) => ticket.code,
	},
	{
		key: "section",
		header: "Sección",
		className: "w-56",
		cell: (ticket) => (
			<span className="text-muted-foreground text-xs">{ticket.section}</span>
		),
	},
	{
		key: "title",
		header: "Título",
		cell: (ticket) => (
			<div className="flex flex-wrap items-center gap-2">
				<span className="font-medium text-foreground">{ticket.title}</span>
				{ticket.isRegressionPath ? (
					<Badge variant="highlight">Regresión</Badge>
				) : null}
			</div>
		),
	},
	{
		key: "status",
		header: "Estado",
		className: "w-36",
		cell: (ticket) => (
			<StatusChip config={qaTicketStatusConfig[ticket.status]} />
		),
	},
	{
		key: "assignee",
		header: "Asignado",
		className: "w-44",
		cell: (ticket) => (
			<span className={ticket.assignee ? undefined : "text-muted-foreground"}>
				{ticket.assignee?.name ?? "—"}
			</span>
		),
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		className: "w-40",
		cell: (ticket) => <DateTooltip value={ticket.updatedAt} />,
	},
];

export function QaTicketTable({
	tickets,
	onOpen,
	onEdit,
	onClaim,
	onSoftDelete,
	onHardDelete,
}: {
	tickets: QaTicketListItem[];
	onOpen: (ticket: QaTicketListItem) => void;
	onEdit: (ticket: QaTicketListItem) => void;
	onClaim: (ticket: QaTicketListItem) => void;
	onSoftDelete: (ticket: QaTicketListItem) => void;
	onHardDelete: (ticket: QaTicketListItem) => void;
}) {
	const actions: CrudRowAction<QaTicketListItem>[] = [
		{
			label: "Tomar caso",
			icon: HandIcon,
			onSelect: onClaim,
			disabled: (ticket) => ticket.deleted,
		},
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
			disabled: (ticket) => ticket.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (ticket) => ticket.deleted,
		},
		{
			label: "Eliminar definitivamente",
			icon: Trash2Icon,
			onSelect: onHardDelete,
			destructive: true,
		},
	];

	return (
		<CrudTable
			actions={(ticket) => <CrudRowActions actions={actions} item={ticket} />}
			columns={qaTicketColumns}
			getRowAriaLabel={(ticket) => `Abrir el ticket de QA #${ticket.code}`}
			getRowClassName={(ticket) =>
				ticket.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(ticket) => ticket.id}
			items={tickets}
			onRowClick={onOpen}
		/>
	);
}
