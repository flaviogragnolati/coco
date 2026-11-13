/**
 * Decides what `qa:triage` does to each QA ticket, from the transitions in
 * `qa-ticket-triage.data.ts` and the tickets as they are now. No I/O of its own:
 * the script reads, and `--apply` injects the admin service as the writer.
 *
 * The note is the mark that a transition already ran. Once it is on the ticket
 * the status, the assignee and the definition belong to the testers again, so
 * a second run only finishes a pending soft delete and never overwrites a
 * result recorded after the triage. A ticket whose status left the expected
 * origin before the note went in is reported and left alone.
 */

import { qaTicketUpdateInputSchema } from "~/schemas/admin/qa-ticket.schemas";
import type {
	QaTicketDetail,
	QaTicketStatus,
	QaTicketUpdateInput,
} from "~/shared/common/admin-crud/qa-ticket.types";

export type TriageDefinition = Partial<{
	title: string;
	steps: string;
	expectedResult: string;
}>;

export type TriageTransition = {
	code: number;
	/** Statuses the ticket may be in for the transition to run; `["pending"]` by default. */
	from?: QaTicketStatus[];
	status?: QaTicketStatus;
	/** Added above the current note, never replacing it. */
	prependNote?: string;
	definition?: TriageDefinition;
	/** Frees the ticket so any tester can claim the re-run. */
	clearAssignee?: true;
	/** Soft delete, after the note is written: a deleted ticket cannot be edited. */
	retire?: true;
};

export type TriageAssignee = { id: string; name: string } | null;

export type TriageTicket = {
	id: number;
	code: number;
	status: QaTicketStatus;
	notes: string | null;
	deleted: boolean;
	assignee: TriageAssignee;
	title: string;
	steps: string;
	expectedResult: string;
};

type DefinitionField = keyof TriageDefinition;

export type TriageChange = {
	code: number;
	ticketId: number;
	title: string;
	fromStatus: QaTicketStatus;
	toStatus: QaTicketStatus;
	fromAssignee: TriageAssignee;
	toAssignee: TriageAssignee;
	/** Null when the note already carries the text. */
	addedNote: string | null;
	nextNotes: string | null;
	definition: TriageDefinition;
	changedDefinitionFields: DefinitionField[];
	needsUpdate: boolean;
	retire: boolean;
};

export type TriageStep =
	| { kind: "change"; change: TriageChange }
	| {
			kind: "skip";
			code: number;
			title: string;
			status: QaTicketStatus;
			assignee: TriageAssignee;
			deleted: boolean;
	  }
	| {
			kind: "conflict";
			code: number;
			reason: string;
			status?: QaTicketStatus;
			title?: string;
			assignee?: TriageAssignee;
	  };

export type TriagePlan = {
	steps: TriageStep[];
	/** Skipped with a warning; they never stop the rest of `--apply`. */
	conflicts: Array<{ code: number; reason: string }>;
};

const DEFAULT_FROM: QaTicketStatus[] = ["pending"];

/** A blank line between triage notes and whatever the tester wrote before. */
export function prependNote(existing: string | null, note: string) {
	const current = existing?.trim() ?? "";
	return current.length === 0 ? note : `${note}\n\n${current}`;
}

function noteAlreadyAdded(notes: string | null, note: string) {
	return (notes ?? "").includes(note.trim());
}

function conflict(
	ticket: TriageTicket,
	reason: string,
): Extract<TriageStep, { kind: "conflict" }> {
	return {
		kind: "conflict",
		code: ticket.code,
		reason,
		status: ticket.status,
		title: ticket.title,
		assignee: ticket.assignee,
	};
}

export function planTransition(
	transition: TriageTransition,
	ticket: TriageTicket | undefined,
): TriageStep {
	if (!ticket) {
		return {
			kind: "conflict",
			code: transition.code,
			reason: "no existe en la base",
		};
	}

	const alreadyRan =
		transition.prependNote !== undefined &&
		noteAlreadyAdded(ticket.notes, transition.prependNote);
	const toStatus = alreadyRan
		? ticket.status
		: (transition.status ?? ticket.status);
	const toAssignee =
		!alreadyRan && transition.clearAssignee ? null : ticket.assignee;
	const addedNote =
		alreadyRan || transition.prependNote === undefined
			? null
			: transition.prependNote.trim();
	const definition = alreadyRan ? {} : (transition.definition ?? {});
	// The admin schema trims every definition field when it stores it.
	const changedDefinitionFields = (
		Object.keys(definition) as DefinitionField[]
	).filter((field) => definition[field]?.trim() !== ticket[field]);
	const needsUpdate =
		toStatus !== ticket.status ||
		toAssignee?.id !== ticket.assignee?.id ||
		addedNote !== null ||
		changedDefinitionFields.length > 0;
	const retire = transition.retire === true && !ticket.deleted;

	if (!needsUpdate && !retire) {
		return {
			kind: "skip",
			code: ticket.code,
			title: ticket.title,
			status: ticket.status,
			assignee: ticket.assignee,
			deleted: ticket.deleted,
		};
	}
	if (ticket.deleted) {
		return conflict(
			ticket,
			"está en la papelera y le faltan cambios; un ticket borrado no se puede editar",
		);
	}
	const allowed = transition.from ?? DEFAULT_FROM;
	if (
		ticket.status === "inProgress" &&
		(alreadyRan || !allowed.includes("inProgress"))
	) {
		return conflict(
			ticket,
			"está En curso: un tester lo tomó; esperar su resultado",
		);
	}
	if (
		!alreadyRan &&
		!allowed.includes(ticket.status) &&
		ticket.status !== transition.status
	) {
		return conflict(
			ticket,
			`un tester ya cargó un resultado (${ticket.status}); se esperaba ${allowed.join(" o ")}`,
		);
	}

	return {
		kind: "change",
		change: {
			code: ticket.code,
			ticketId: ticket.id,
			title: ticket.title,
			fromStatus: ticket.status,
			toStatus,
			fromAssignee: ticket.assignee,
			toAssignee,
			addedNote,
			nextNotes:
				addedNote === null
					? ticket.notes
					: prependNote(ticket.notes, addedNote),
			definition,
			changedDefinitionFields,
			needsUpdate,
			retire,
		},
	};
}

/** The ticket as it reads once `change` is written. */
function project(ticket: TriageTicket, change: TriageChange): TriageTicket {
	return {
		...ticket,
		status: change.toStatus,
		assignee: change.toAssignee,
		notes: change.nextNotes,
		title: change.definition.title?.trim() ?? ticket.title,
		steps: change.definition.steps?.trim() ?? ticket.steps,
		expectedResult:
			change.definition.expectedResult?.trim() ?? ticket.expectedResult,
		deleted: ticket.deleted || change.retire,
	};
}

/**
 * Plans in file order; a later entry for the same code is planned against the
 * ticket as the earlier one leaves it.
 */
export function planTriage(
	transitions: readonly TriageTransition[],
	tickets: readonly TriageTicket[],
): TriagePlan {
	const byCode = new Map(tickets.map((ticket) => [ticket.code, ticket]));
	const steps: TriageStep[] = [];
	for (const transition of transitions) {
		const ticket = byCode.get(transition.code);
		const step = planTransition(transition, ticket);
		if (ticket && step.kind === "change") {
			byCode.set(ticket.code, project(ticket, step.change));
		}
		steps.push(step);
	}
	const conflicts = steps.flatMap((step) =>
		step.kind === "conflict" ? [{ code: step.code, reason: step.reason }] : [],
	);
	return { steps, conflicts };
}

/**
 * The admin form's full update payload: everything the change does not touch
 * is copied from the ticket as it is now.
 */
export function buildUpdateInput(
	current: QaTicketDetail,
	change: TriageChange,
): QaTicketUpdateInput {
	return qaTicketUpdateInputSchema.parse({
		id: current.id,
		section: current.section,
		title: change.definition.title ?? current.title,
		actor: current.actor,
		feature: current.feature,
		steps: change.definition.steps ?? current.steps,
		expectedResult: change.definition.expectedResult ?? current.expectedResult,
		status: change.toStatus,
		isRegressionPath: current.isRegressionPath,
		notes: change.nextNotes,
		assigneeId: change.toAssignee?.id,
	});
}

export type TriageWriter = {
	getById(id: number): Promise<QaTicketDetail>;
	update(input: QaTicketUpdateInput): Promise<unknown>;
	softDelete(id: number): Promise<unknown>;
};

export type TriageOutcome =
	| { kind: "applied" }
	| { kind: "skipped" }
	| { kind: "conflict"; reason: string };

/**
 * Applies one transition against the ticket re-read just before writing: the
 * update replaces the whole definition, so a note a tester saved after the dry
 * run must be planned against, not overwritten. The note goes in before the
 * soft delete because a deleted ticket can no longer be edited.
 */
export async function applyTransition(
	transition: TriageTransition,
	ticketId: number,
	writer: TriageWriter,
): Promise<TriageOutcome> {
	const current = await writer.getById(ticketId);
	const step = planTransition(transition, current);
	if (step.kind === "skip") return { kind: "skipped" };
	if (step.kind === "conflict")
		return { kind: "conflict", reason: step.reason };
	const { change } = step;
	if (change.needsUpdate) {
		await writer.update(buildUpdateInput(current, change));
	}
	if (change.retire) await writer.softDelete(current.id);
	return { kind: "applied" };
}

export type TriageDestination = QaTicketStatus | "papelera";

/**
 * Where each listed ticket ends up once the plan is applied, by its last
 * planned entry; skipped ones included, conflicts left out.
 */
export function summarizeDestinations(
	plan: TriagePlan,
): Map<TriageDestination, number[]> {
	const finalByCode = new Map<number, TriageDestination>();
	for (const step of plan.steps) {
		if (step.kind === "conflict") continue;
		if (step.kind === "change") {
			const { change } = step;
			finalByCode.set(
				change.code,
				change.retire ? "papelera" : change.toStatus,
			);
		} else {
			finalByCode.set(step.code, step.deleted ? "papelera" : step.status);
		}
	}
	const summary = new Map<TriageDestination, number[]>();
	for (const [code, destination] of finalByCode) {
		summary.set(destination, [...(summary.get(destination) ?? []), code]);
	}
	return summary;
}

function entryKey(transition: TriageTransition) {
	const from = [...(transition.from ?? DEFAULT_FROM)].sort().join(",");
	return `${transition.code}|${from}|${transition.prependNote?.trim() ?? ""}`;
}

/**
 * A code may come back in a later wave with a new dated note or another
 * origin; of two entries that agree on both, the second would never run.
 */
export function findDuplicateEntries(transitions: readonly TriageTransition[]) {
	const seen = new Set<string>();
	const duplicates = new Set<number>();
	for (const transition of transitions) {
		const key = entryKey(transition);
		if (seen.has(key)) duplicates.add(transition.code);
		seen.add(key);
	}
	return [...duplicates];
}

export type TriageArgs = {
	apply: boolean;
	confirmProduction: boolean;
	actorEmail: string | null;
};

export function parseTriageArgs(argv: readonly string[]): TriageArgs {
	const args: TriageArgs = {
		apply: false,
		confirmProduction: false,
		actorEmail: null,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index] ?? "";
		if (arg === "--apply") args.apply = true;
		else if (arg === "--confirm-production") args.confirmProduction = true;
		else if (arg === "--actor-email") {
			const value = argv[index + 1];
			if (!value || value.startsWith("--")) {
				throw new Error("--actor-email necesita un email.");
			}
			args.actorEmail = value.trim();
			index += 1;
		} else if (arg.startsWith("--actor-email=")) {
			args.actorEmail = arg.slice("--actor-email=".length).trim();
		} else {
			throw new Error(
				`Argumento desconocido: ${arg}. Se aceptan --apply, --actor-email <email> y --confirm-production.`,
			);
		}
	}
	if (args.apply && !args.actorEmail) {
		throw new Error(
			"--apply necesita --actor-email <email> de un superadmin activo: cada cambio queda en AuditLog a su nombre.",
		);
	}
	return args;
}

/**
 * The dry run only reads, inside a read-only transaction, so it runs anywhere.
 * Writing to a database that declares itself production takes a second flag.
 */
export function assertApplyAllowed(appEnv: string, args: TriageArgs) {
	if (args.apply && appEnv === "production" && !args.confirmProduction) {
		throw new Error(
			"APP_ENV=production: --apply escribe en los tickets de QA de esta base. Si es la base correcta, repetir con --apply --confirm-production.",
		);
	}
}
