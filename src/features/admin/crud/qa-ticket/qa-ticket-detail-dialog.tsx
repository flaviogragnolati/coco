"use client";

import {
	AlertTriangleIcon,
	BanIcon,
	CheckCircle2Icon,
	HandIcon,
	SaveIcon,
	SkipForwardIcon,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import type {
	QaTicketDetail,
	QaTicketLogInput,
	QaTicketSaveResultInput,
	QaTicketStatus,
} from "~/shared/common/admin-crud/qa-ticket.types";
import { QA_TICKET_LOG_MAX_BYTES } from "~/shared/common/admin-crud/qa-ticket-evidence.constants";
import { qaTicketStatusConfig } from "./qa-ticket.mappers";
import { QaTicketImages } from "./qa-ticket-images";
import { QaTicketLogFields } from "./qa-ticket-log-fields";

const resultOptions = [
	{ value: "passed", label: "Completo OK", icon: CheckCircle2Icon },
	{ value: "failed", label: "Fallido", icon: AlertTriangleIcon },
	{ value: "blocked", label: "Bloqueado", icon: BanIcon },
	{ value: "skipped", label: "Omitido", icon: SkipForwardIcon },
] satisfies Array<{
	value: QaTicketStatus;
	label: string;
	icon: typeof SaveIcon;
}>;

const emptyLog: QaTicketLogInput = {
	content: "",
	fileName: null,
	mimeType: null,
};

function toLogInput(
	log: QaTicketDetail["consoleLog"] | QaTicketDetail["networkLog"],
): QaTicketLogInput {
	return log
		? {
				content: log.content,
				fileName: log.fileName,
				mimeType: log.mimeType,
			}
		: { ...emptyLog };
}

function editableSnapshot(input: {
	status: QaTicketStatus;
	notes: string;
	consoleLog: QaTicketLogInput;
	networkLog: QaTicketLogInput;
}) {
	return JSON.stringify(input);
}

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
	currentUserId,
	isLoading,
	isError,
	errorMessage,
	onOpenChange,
	onSaveResult,
	isSaving,
	onClaim,
	isClaiming,
	onEvidenceChanged,
}: {
	open: boolean;
	ticket?: QaTicketDetail;
	currentUserId: string;
	isLoading: boolean;
	isError?: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
	onSaveResult: (
		input: Omit<QaTicketSaveResultInput, "id">,
	) => Promise<QaTicketDetail>;
	isSaving?: boolean;
	onClaim: () => Promise<QaTicketDetail>;
	isClaiming?: boolean;
	onEvidenceChanged: () => Promise<void>;
}) {
	const [status, setStatus] = useState<QaTicketStatus>("pending");
	const [notes, setNotes] = useState("");
	const [consoleLog, setConsoleLog] = useState<QaTicketLogInput>(emptyLog);
	const [networkLog, setNetworkLog] = useState<QaTicketLogInput>(emptyLog);
	const [baseline, setBaseline] = useState("");
	const [syncedTicketId, setSyncedTicketId] = useState<number | null>(null);

	if (open && ticket && ticket.id !== syncedTicketId) {
		const nextConsoleLog = toLogInput(ticket.consoleLog);
		const nextNetworkLog = toLogInput(ticket.networkLog);
		setSyncedTicketId(ticket.id);
		setStatus(ticket.status);
		setNotes(ticket.notes ?? "");
		setConsoleLog(nextConsoleLog);
		setNetworkLog(nextNetworkLog);
		setBaseline(
			editableSnapshot({
				status: ticket.status,
				notes: ticket.notes ?? "",
				consoleLog: nextConsoleLog,
				networkLog: nextNetworkLog,
			}),
		);
	}

	const currentSnapshot = useMemo(
		() => editableSnapshot({ status, notes, consoleLog, networkLog }),
		[consoleLog, networkLog, notes, status],
	);
	const isDirty = Boolean(baseline) && currentSnapshot !== baseline;
	const logTooLarge =
		new TextEncoder().encode(consoleLog.content).byteLength >
			QA_TICKET_LOG_MAX_BYTES ||
		new TextEncoder().encode(networkLog.content).byteLength >
			QA_TICKET_LOG_MAX_BYTES;
	const isOwner = ticket?.assignee?.id === currentUserId;
	const canClaim =
		Boolean(ticket) &&
		!ticket?.deleted &&
		(!ticket?.assignee || (isOwner && ticket.status !== "inProgress"));
	const canEdit = Boolean(ticket) && !ticket?.deleted && isOwner;

	const requestOpenChange = (nextOpen: boolean) => {
		if (
			!nextOpen &&
			isDirty &&
			!window.confirm("Hay cambios sin guardar. ¿Querés cerrar igualmente?")
		) {
			return;
		}
		if (!nextOpen) setSyncedTicketId(null);
		onOpenChange(nextOpen);
	};

	const save = async () => {
		if (!ticket) return;
		try {
			const saved = await onSaveResult({
				status,
				notes,
				consoleLog,
				networkLog,
			});
			const nextConsoleLog = toLogInput(saved.consoleLog);
			const nextNetworkLog = toLogInput(saved.networkLog);
			setStatus(saved.status);
			setNotes(saved.notes ?? "");
			setConsoleLog(nextConsoleLog);
			setNetworkLog(nextNetworkLog);
			setBaseline(
				editableSnapshot({
					status: saved.status,
					notes: saved.notes ?? "",
					consoleLog: nextConsoleLog,
					networkLog: nextNetworkLog,
				}),
			);
		} catch {
			// The mutation owner surfaces its typed message through the shared toast.
		}
	};

	const claimCurrentTicket = async () => {
		const priorServerStatus = ticket?.status;
		try {
			const claimed = await onClaim();
			setStatus((current) =>
				current === priorServerStatus ? claimed.status : current,
			);
			setBaseline((current) => {
				if (!current) return current;
				const parsed = JSON.parse(current) as {
					status: QaTicketStatus;
					notes: string;
					consoleLog: QaTicketLogInput;
					networkLog: QaTicketLogInput;
				};
				return editableSnapshot({ ...parsed, status: claimed.status });
			});
		} catch {
			// The mutation owner surfaces its typed message through the shared toast.
		}
	};

	return (
		<Dialog onOpenChange={requestOpenChange} open={open}>
			<DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
				<DialogHeader className="px-5 pt-5 pb-4">
					<div className="flex flex-wrap items-start justify-between gap-3 pr-8">
						<div className="flex min-w-0 flex-col gap-1">
							<DialogTitle>
								{ticket ? `#${ticket.code} · ${ticket.title}` : "Ticket de QA"}
							</DialogTitle>
							<DialogDescription>
								Ejecutá el flujo, registrá el resultado y adjuntá la evidencia
								vigente.
							</DialogDescription>
						</div>
						{canClaim ? (
							<Button
								disabled={isClaiming}
								onClick={() => void claimCurrentTicket()}
								type="button"
								variant="highlight"
							>
								<HandIcon data-icon="inline-start" />
								{ticket?.assignee ? "Retomar caso" : "Tomar caso"}
							</Button>
						) : null}
					</div>
				</DialogHeader>

				<Separator />
				<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
					{isLoading ? <CrudLoadingState rows={5} /> : null}
					{!isLoading && isError ? (
						<CrudErrorState
							message={errorMessage || "No se pudo cargar el ticket de QA"}
						/>
					) : null}

					{!isLoading && ticket ? (
						<div className="flex flex-col gap-5">
							<div className="flex flex-wrap items-center gap-2">
								<StatusChip config={qaTicketStatusConfig[ticket.status]} />
								{ticket.isRegressionPath ? (
									<Badge variant="highlight">Regresión</Badge>
								) : null}
								<span className="text-muted-foreground text-sm">
									{ticket.assignee
										? `Asignado a ${ticket.assignee.name}`
										: "Sin asignar"}
								</span>
							</div>

							{!canEdit ? (
								<Alert>
									<AlertTitle>Espacio en modo lectura</AlertTitle>
									<AlertDescription>
										{ticket.deleted
											? "El ticket está en la papelera y conserva sus evidencias."
											: ticket.assignee
												? `Este caso pertenece a ${ticket.assignee.name}. La reasignación se hace desde Editar definición.`
												: "Tomá el caso para registrar su resultado y evidencia."}
									</AlertDescription>
								</Alert>
							) : null}

							<section className="grid gap-3 rounded-2xl border p-3 sm:grid-cols-3">
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

							<div className="grid gap-4 lg:grid-cols-2">
								<div className="flex flex-col gap-3">
									<ReadOnlySection label="Flujo">
										{ticket.steps}
									</ReadOnlySection>
									<ReadOnlySection label="Resultado esperado">
										{ticket.expectedResult}
									</ReadOnlySection>
								</div>

								<section className="flex flex-col gap-4 rounded-2xl border p-4">
									<div>
										<h3 className="font-medium">Resultado de la pasada</h3>
										<p className="text-muted-foreground text-sm">
											Pendiente y En curso siguen disponibles desde el tracking
											administrativo.
										</p>
									</div>
									<ToggleGroup
										aria-label="Resultado de la pasada"
										className="flex w-full flex-wrap justify-start"
										disabled={!canEdit || isSaving}
										onValueChange={(value) => {
											if (value) setStatus(value as QaTicketStatus);
										}}
										type="single"
										value={status}
										variant="outline"
									>
										{resultOptions.map((option) => {
											const Icon = option.icon;
											return (
												<ToggleGroupItem
													key={option.value}
													value={option.value}
												>
													<Icon data-icon="inline-start" />
													{option.label}
												</ToggleGroupItem>
											);
										})}
									</ToggleGroup>
									<Field>
										<FieldLabel htmlFor="qa-ticket-detail-notes">
											Hallazgo o contexto
										</FieldLabel>
										<Textarea
											disabled={!canEdit || isSaving}
											id="qa-ticket-detail-notes"
											onChange={(event) => setNotes(event.target.value)}
											placeholder="Hallazgo, contexto o link al bug"
											rows={6}
											value={notes}
										/>
									</Field>
								</section>
							</div>

							<section className="flex flex-col gap-3 rounded-2xl border p-4">
								<div>
									<h3 className="font-medium">Evidencia técnica</h3>
									<p className="text-muted-foreground text-sm">
										Los logs se guardan junto con el resultado. Máximo 1 MiB
										UTF-8 por campo.
									</p>
								</div>
								<QaTicketLogFields
									consoleLog={consoleLog}
									disabled={!canEdit || isSaving}
									networkLog={networkLog}
									onConsoleLogChange={setConsoleLog}
									onNetworkLogChange={setNetworkLog}
								/>
							</section>

							<section className="flex flex-col gap-3 rounded-2xl border p-4">
								<p className="text-muted-foreground text-sm">
									Cada imagen queda guardada inmediatamente al terminar su
									carga; Guardar resultado no vuelve a enviarla.
								</p>
								<QaTicketImages
									disabled={!canEdit}
									images={ticket.images}
									onEvidenceChanged={onEvidenceChanged}
									ticketId={ticket.id}
								/>
							</section>
						</div>
					) : null}
				</div>

				<Separator />
				<DialogFooter className="px-5 py-4">
					{isDirty ? (
						<span className="mr-auto text-muted-foreground text-sm">
							Hay cambios sin guardar
						</span>
					) : null}
					<Button
						disabled={isSaving}
						onClick={() => requestOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cerrar
					</Button>
					<Button
						disabled={!canEdit || isSaving || logTooLarge}
						onClick={() => void save()}
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
