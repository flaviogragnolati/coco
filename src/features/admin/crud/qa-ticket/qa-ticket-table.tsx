"use client";

import {
	ArchiveXIcon,
	ArrowRightIcon,
	HandIcon,
	PencilIcon,
	Trash2Icon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { DateTooltip } from "~/features/admin/crud/_components/crud-cell-tooltips";
import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type { QaTicketListItem } from "~/shared/common/admin-crud/qa-ticket.types";
import {
	getQaTicketWorkAction,
	qaTicketStatusConfig,
} from "./qa-ticket.mappers";

function WorkAction({
	ticket,
	currentUserId,
	isClaiming,
	onClaim,
	onOpen,
}: {
	ticket: QaTicketListItem;
	currentUserId: string;
	isClaiming: boolean;
	onClaim: (ticket: QaTicketListItem) => void;
	onOpen: (ticket: QaTicketListItem) => void;
}) {
	const action = getQaTicketWorkAction(ticket, currentUserId);
	if (action === "claim") {
		return (
			<Button
				aria-label={`Tomar ticket de QA #${ticket.code}: ${ticket.title}`}
				disabled={isClaiming}
				onClick={() => onClaim(ticket)}
				size="sm"
				type="button"
				variant="highlight"
			>
				<HandIcon data-icon="inline-start" />
				Tomar
			</Button>
		);
	}
	if (action === "continue") {
		return (
			<Button
				aria-label={`Continuar ticket de QA #${ticket.code}: ${ticket.title}`}
				onClick={() => onOpen(ticket)}
				size="sm"
				type="button"
				variant="outline"
			>
				Continuar
				<ArrowRightIcon data-icon="inline-end" />
			</Button>
		);
	}

	return (
		<span className="text-muted-foreground text-xs">
			{action === "assigned" ? "Caso de otro admin" : "Sin acción"}
		</span>
	);
}

export function QaTicketTable({
	tickets,
	currentUserId,
	claimingTicketId,
	onOpen,
	onEdit,
	onClaim,
	onSoftDelete,
	onHardDelete,
}: {
	tickets: QaTicketListItem[];
	currentUserId: string;
	claimingTicketId: number | null;
	onOpen: (ticket: QaTicketListItem) => void;
	onEdit: (ticket: QaTicketListItem) => void;
	onClaim: (ticket: QaTicketListItem) => void;
	onSoftDelete: (ticket: QaTicketListItem) => void;
	onHardDelete: (ticket: QaTicketListItem) => void;
}) {
	const columns: CrudColumn<QaTicketListItem>[] = [
		{
			key: "code",
			header: "#",
			className: "w-14 font-mono",
			cell: (ticket) => ticket.code,
		},
		{
			key: "ticket",
			header: "Ticket",
			cell: (ticket) => (
				<div className="flex min-w-52 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-medium text-foreground">{ticket.title}</span>
						{ticket.isRegressionPath ? (
							<Badge variant="highlight">Regresión</Badge>
						) : null}
					</div>
					<span className="text-muted-foreground text-xs">
						{ticket.section} · {ticket.feature}
					</span>
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
			className: "w-40",
			cell: (ticket) => (
				<span className={ticket.assignee ? undefined : "text-muted-foreground"}>
					{ticket.assignee?.name ?? "Sin asignar"}
				</span>
			),
		},
		{
			key: "updatedAt",
			header: "Actualizado",
			className: "w-36",
			cell: (ticket) => <DateTooltip value={ticket.updatedAt} />,
		},
		{
			key: "work",
			header: "Trabajo",
			className: "w-36",
			cell: (ticket) => (
				<WorkAction
					currentUserId={currentUserId}
					isClaiming={claimingTicketId === ticket.id}
					onClaim={onClaim}
					onOpen={onOpen}
					ticket={ticket}
				/>
			),
		},
	];

	const adminActions: CrudRowAction<QaTicketListItem>[] = [
		{
			label: "Editar definición",
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
		<>
			<div className="hidden md:block">
				<CrudTable
					actions={(ticket) => (
						<CrudRowActions actions={adminActions} item={ticket} />
					)}
					columns={columns}
					getRowAriaLabel={(ticket) => `Abrir el ticket de QA #${ticket.code}`}
					getRowClassName={(ticket) =>
						ticket.deleted ? "bg-muted/30 text-muted-foreground" : undefined
					}
					getRowKey={(ticket) => ticket.id}
					items={tickets}
					onRowClick={onOpen}
				/>
			</div>

			<div className="grid gap-3 md:hidden">
				{tickets.map((ticket) => (
					<Card key={ticket.id} size="sm">
						<CardHeader>
							<button
								aria-label={`Abrir el ticket de QA #${ticket.code}`}
								className="flex min-w-0 flex-col gap-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
								onClick={() => onOpen(ticket)}
								type="button"
							>
								<span className="font-mono text-muted-foreground text-xs">
									#{ticket.code} · {ticket.section}
								</span>
								<CardTitle>{ticket.title}</CardTitle>
							</button>
							<CardAction>
								<CrudRowActions actions={adminActions} item={ticket} />
							</CardAction>
						</CardHeader>
						<CardContent className="flex flex-wrap items-center gap-2">
							<StatusChip config={qaTicketStatusConfig[ticket.status]} />
							{ticket.isRegressionPath ? (
								<Badge variant="highlight">Regresión</Badge>
							) : null}
							<span className="text-muted-foreground text-xs">
								{ticket.assignee?.name ?? "Sin asignar"}
							</span>
						</CardContent>
						<CardFooter>
							<WorkAction
								currentUserId={currentUserId}
								isClaiming={claimingTicketId === ticket.id}
								onClaim={onClaim}
								onOpen={onOpen}
								ticket={ticket}
							/>
						</CardFooter>
					</Card>
				))}
			</div>
		</>
	);
}
