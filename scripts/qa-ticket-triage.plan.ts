/**
 * Decides what `qa:triage` does to each QA ticket, from the transitions in
 * `qa-ticket-triage.data.ts` and the tickets as they are now. No I/O of its own:
 * the script reads, and `--apply` injects the admin service as the writer.
 *
 * Each part of a transition is compared on its own (status, note, definition,
 * papelera), so a run cut halfway converges on the next one instead of adding
 * the note twice.
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
	status?: QaTicketStatus;
	/** Added above the current note, never replacing it. */
	prependNote?: string;
	definition?: TriageDefinition;
	/** Soft delete, after the note is written: a deleted ticket cannot be edited. */
	retire?: true;
};

export type TriageTicket = {
	id: number;
	code: number;
	status: QaTicketStatus;
	notes: string | null;
	deleted: boolean;
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
	| { kind: "skip"; code: number; title: string; status: QaTicketStatus }
	| { kind: "conflict"; code: number; reason: string };

export type TriagePlan = {
	steps: TriageStep[];
	/** Non-empty means `--apply` must refuse. */
	conflicts: Array<{ code: number; reason: string }>;
};

/** A blank line between triage notes and whatever the tester wrote before. */
export function prependNote(existing: string | null, note: string) {
	const current = existing?.trim() ?? "";
	return current.length === 0 ? note : `${note}\n\n${current}`;
}

function noteAlreadyAdded(notes: string | null, note: string) {
	return (notes ?? "").includes(note.trim());
}

export function planTransition(
	transition: TriageTransition,
	ticket: TriageTicket | undefined,
): TriageStep {
	const { code } = transition;
	if (!ticket) {
		return { kind: "conflict", code, reason: "no existe en la base" };
	}

	const addedNote =
		transition.prependNote === undefined ||
		noteAlreadyAdded(ticket.notes, transition.prependNote)
			? null
			: transition.prependNote.trim();
	const toStatus = transition.status ?? ticket.status;
	const definition = transition.definition ?? {};
	const changedDefinitionFields = (
		Object.keys(definition) as DefinitionField[]
	).filter((field) => definition[field]?.trim() !== ticket[field]);
	const needsUpdate =
		toStatus !== ticket.status ||
		addedNote !== null ||
		changedDefinitionFields.length > 0;
	const retire = transition.retire === true && !ticket.deleted;

	if (!needsUpdate && !retire) {
		return { kind: "skip", code, title: ticket.title, status: ticket.status };
	}
	if (ticket.deleted) {
		return {
			kind: "conflict",
			code,
			reason:
				"está en la papelera y le faltan cambios; un ticket borrado no se puede editar",
		};
	}
	if (ticket.status === "inProgress" && (toStatus !== "inProgress" || retire)) {
		return {
			kind: "conflict",
			code,
			reason: "está En curso: un tester lo tomó; esperar su resultado",
		};
	}

	return {
		kind: "change",
		change: {
			code,
			ticketId: ticket.id,
			title: ticket.title,
			fromStatus: ticket.status,
			toStatus,
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

export function planTriage(
	transitions: readonly TriageTransition[],
	tickets: readonly TriageTicket[],
): TriagePlan {
	const byCode = new Map(tickets.map((ticket) => [ticket.code, ticket]));
	const steps = transitions.map((transition) =>
		planTransition(transition, byCode.get(transition.code)),
	);
	const conflicts = steps.flatMap((step) =>
		step.kind === "conflict" ? [{ code: step.code, reason: step.reason }] : [],
	);
	return { steps, conflicts };
}

/**
 * The admin form's full update payload: everything the change does not touch
 * is copied from the ticket as it is now, assignee included.
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
		assigneeId: current.assignee?.id,
	});
}

export type TriageWriter = {
	getById(id: number): Promise<QaTicketDetail>;
	update(input: QaTicketUpdateInput): Promise<unknown>;
	softDelete(id: number): Promise<unknown>;
};

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
): Promise<"applied" | "skipped"> {
	const current = await writer.getById(ticketId);
	const step = planTransition(transition, current);
	if (step.kind === "skip") return "skipped";
	if (step.kind === "conflict") {
		throw new Error(`#${step.code}: ${step.reason}`);
	}
	const { change } = step;
	if (change.needsUpdate) {
		await writer.update(buildUpdateInput(current, change));
	}
	if (change.retire) await writer.softDelete(current.id);
	return "applied";
}

export type TriageDestination = QaTicketStatus | "papelera";

/** Where each ticket ends up once the plan is applied; skipped ones included. */
export function summarizeDestinations(
	transitions: readonly TriageTransition[],
	plan: TriagePlan,
): Map<TriageDestination, number[]> {
	const byCode = new Map(transitions.map((t) => [t.code, t]));
	const summary = new Map<TriageDestination, number[]>();
	for (const step of plan.steps) {
		if (step.kind === "conflict") continue;
		const code = step.kind === "change" ? step.change.code : step.code;
		const destination: TriageDestination = byCode.get(code)?.retire
			? "papelera"
			: step.kind === "change"
				? step.change.toStatus
				: step.status;
		summary.set(destination, [...(summary.get(destination) ?? []), code]);
	}
	return summary;
}

/** Codes listed twice would be applied twice with diverging notes. */
export function findDuplicateCodes(transitions: readonly TriageTransition[]) {
	const seen = new Set<number>();
	const duplicates = new Set<number>();
	for (const { code } of transitions) {
		if (seen.has(code)) duplicates.add(code);
		seen.add(code);
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
