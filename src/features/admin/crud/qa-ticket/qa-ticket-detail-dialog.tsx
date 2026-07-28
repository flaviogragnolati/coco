"use client";

import { SaveIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldLabel } from "~/components/ui/field";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import type {
	QaTicketDetail,
	QaTicketStatus,
} from "~/shared/common/admin-crud/qa-ticket.types";
import {
	qaTicketStatusConfig,
	qaTicketStatusOptions,
} from "./qa-ticket.mappers";

function ReadOnlySection({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-1 rounded-2xl border p-3">
			<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</h3>
			<p className="whitespace-pre-line text-sm">{children}</p>
		</section>
	);
}

export function QaTicketDetailDialog({
	open,
	ticket,
	isLoading,
	isError,
	errorMessage,
	onOpenChange,
	onSetStatus,
	isSettingStatus,
}: {
	open: boolean;
	ticket?: QaTicketDetail;
	isLoading: boolean;
	isError?: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
	onSetStatus: (input: { status: QaTicketStatus; notes?: string }) => void;
	isSettingStatus?: boolean;
}) {
	const [status, setStatus] = useState<QaTicketStatus>("pending");
	const [notes, setNotes] = useState("");
	const [syncedFrom, setSyncedFrom] = useState<string | null>(null);

	// The dialog instance is reused across tickets, so the editable pair has to
	// resync whenever the record it mirrors changes. Keying on `updatedAt` as well
	// as the id picks up a save without letting a background refetch of unchanged
	// data wipe notes out from under whoever is typing them.
	const syncKey =
		open && ticket ? `${ticket.id}:${ticket.updatedAt.getTime()}` : null;

	if (ticket && syncKey && syncKey !== syncedFrom) {
		setSyncedFrom(syncKey);
		setStatus(ticket.status);
		setNotes(ticket.notes ?? "");
	}

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>
						{ticket ? `#${ticket.code} · ${ticket.title}` : "Ticket de QA"}
					</DialogTitle>
					<DialogDescription>
						Flujo y resultado esperado del caso, y el resultado de la pasada.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? <CrudLoadingState rows={4} /> : null}
				{!isLoading && isError ? (
					<CrudErrorState
						message={errorMessage || "No se pudo cargar el ticket de QA"}
					/>
				) : null}

				{!isLoading && ticket ? (
					<div className="flex flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<StatusChip config={qaTicketStatusConfig[ticket.status]} />
							{ticket.isRegressionPath ? (
								<Badge variant="highlight">Regresión</Badge>
							) : null}
							<span className="text-muted-foreground text-xs">
								{ticket.assignee
									? `Tomado por ${ticket.assignee.name}`
									: "Sin asignar"}
							</span>
						</div>

						<section className="grid gap-3 rounded-2xl border p-3 md:grid-cols-3">
							<div>
								<p className="text-muted-foreground text-xs">Sección</p>
								<p className="font-medium text-sm">{ticket.section}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Quién</p>
								<p className="font-medium text-sm">{ticket.actor}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Feature</p>
								<p className="font-medium text-sm">{ticket.feature}</p>
							</div>
						</section>

						<ReadOnlySection label="Flujo">{ticket.steps}</ReadOnlySection>
						<ReadOnlySection label="Resultado esperado">
							{ticket.expectedResult}
						</ReadOnlySection>

						<section className="flex flex-col gap-3 rounded-2xl border p-3">
							<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
								Resultado de la pasada
							</h3>
							<Field>
								<FieldLabel htmlFor="qa-ticket-detail-status">
									Estado
								</FieldLabel>
								<Select
									disabled={isSettingStatus || ticket.deleted}
									id="qa-ticket-detail-status"
									onChange={(event) =>
										setStatus(event.target.value as QaTicketStatus)
									}
									value={status}
								>
									{qaTicketStatusOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="qa-ticket-detail-notes">Notas</FieldLabel>
								<Textarea
									disabled={isSettingStatus || ticket.deleted}
									id="qa-ticket-detail-notes"
									onChange={(event) => setNotes(event.target.value)}
									placeholder="Hallazgo, contexto o link al bug"
									rows={4}
									value={notes}
								/>
							</Field>
						</section>
					</div>
				) : null}

				<DialogFooter>
					<Button
						disabled={isSettingStatus}
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cerrar
					</Button>
					<Button
						disabled={!ticket || ticket.deleted || isSettingStatus}
						onClick={() => onSetStatus({ status, notes })}
						type="button"
						variant="highlight"
					>
						<SaveIcon data-icon="inline-start" />
						Guardar resultado
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
