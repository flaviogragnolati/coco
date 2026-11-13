/**
 * `pnpm qa:triage`: moves QA tickets to the state `qa-ticket-triage.data.ts`
 * settles for them and adds its note above the tester's.
 *
 * Dry run by default: it reads inside a read-only transaction and prints, for
 * each ticket, the current state → the new one, the assignee and the note.
 * `--apply --actor-email <superadmin>` writes through the admin QA ticket
 * service, one ticket at a time, so every change leaves its `qaTicket.update`
 * or `qaTicket.softDelete` row in `AuditLog`; a conflict skips that ticket
 * only. The decisions live in `qa-ticket-triage.plan.ts`.
 *
 * Ordering hazard: a ticket written as `retest` breaks `/admin/qa-tickets` on a
 * deployment whose Prisma client predates the value. Apply only after the
 * migration is applied AND the app that knows `retest` is deployed.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "~/prisma/client";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import * as qaTicketService from "~/server/services/admin/qa-ticket.service";
import { readOnlyTransaction } from "./lib/read-only-transaction";
import { resolveScriptAppEnv } from "./lib/seed-environment";
import { qaTicketTriageTransitions } from "./qa-ticket-triage.data";
import {
	applyTransition,
	assertApplyAllowed,
	findDuplicateEntries,
	parseTriageArgs,
	planTriage,
	summarizeDestinations,
	type TriageAssignee,
	type TriageChange,
	type TriagePlan,
	type TriageTicket,
} from "./qa-ticket-triage.plan";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error(
		"DATABASE_URL is required to run scripts/qa-ticket-triage.ts",
	);
}

const args = parseTriageArgs(process.argv.slice(2));
const appEnv = resolveScriptAppEnv(process.env);
assertApplyAllowed(appEnv, args);

const db = new PrismaClient({
	adapter: new PrismaPg({ connectionString: DATABASE_URL }),
	// Widened so the client matches the `typeof db` the admin services accept.
	log: ["error", "warn"] as Prisma.LogLevel[],
	// Each service command runs several round trips to a remote Neon database.
	transactionOptions: { maxWait: 10_000, timeout: 60_000 },
});

type Tx = Prisma.TransactionClient;

const transitions = qaTicketTriageTransitions;

const triageTicketSelect = {
	id: true,
	code: true,
	status: true,
	notes: true,
	deleted: true,
	assignee: { select: { id: true, name: true } },
	title: true,
	steps: true,
	expectedResult: true,
} satisfies Prisma.QaTicketSelect;

type Snapshot = {
	plan: TriagePlan;
	enumHasRetest: boolean;
	actor: AdminMutationActor | null;
	actorProblem: string | null;
};

async function enumHasRetest(tx: Tx) {
	const rows = await tx.$queryRawUnsafe<Array<{ present: boolean }>>(
		`SELECT 'retest' = ANY (enum_range(NULL::"QaTicketStatus")::text[]) AS present`,
	);
	return rows[0]?.present === true;
}

async function resolveActor(tx: Tx, email: string) {
	const users = await tx.user.findMany({
		where: {
			email: { equals: email, mode: "insensitive" },
			role: "superadmin",
			active: true,
			deleted: false,
		},
		select: { id: true, name: true, role: true },
	});
	if (users.length === 1 && users[0]) {
		return { actor: users[0], actorProblem: null };
	}
	return {
		actor: null,
		actorProblem:
			users.length === 0
				? `no hay un superadmin activo con el email ${email}`
				: `hay ${users.length} superadmins activos con el email ${email}`,
	};
}

async function loadSnapshot(tx: Tx): Promise<Snapshot> {
	const tickets: TriageTicket[] = await tx.qaTicket.findMany({
		where: { code: { in: transitions.map((t) => t.code) } },
		select: triageTicketSelect,
	});
	const actor = args.actorEmail
		? await resolveActor(tx, args.actorEmail)
		: { actor: null, actorProblem: null };
	return {
		plan: planTriage(transitions, tickets),
		enumHasRetest: await enumHasRetest(tx),
		...actor,
	};
}

function describeTarget(url: string) {
	try {
		const parsed = new URL(url);
		return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}`;
	} catch {
		return "(DATABASE_URL ilegible)";
	}
}

function oneLine(text: string) {
	return text.replace(/\s*\n\s*/g, " ⏎ ");
}

function assigneeName(assignee: TriageAssignee) {
	return assignee ? assignee.name : "libre";
}

function describeAssignee(from: TriageAssignee, to: TriageAssignee) {
	return from?.id === to?.id
		? `asignado: ${assigneeName(from)}`
		: `asignado: ${assigneeName(from)} → ${assigneeName(to)}`;
}

function describeChange(change: TriageChange) {
	const destination = change.retire
		? change.toStatus === change.fromStatus
			? "papelera"
			: `${change.toStatus}, después papelera`
		: change.toStatus;
	return `#${change.code} [${change.fromStatus} → ${destination}] ${change.title} · ${describeAssignee(change.fromAssignee, change.toAssignee)}`;
}

function printPlan(snapshot: Snapshot) {
	const { plan } = snapshot;
	console.info("");
	for (const step of plan.steps) {
		if (step.kind === "change") {
			const { change } = step;
			console.info(describeChange(change));
			if (change.addedNote) {
				console.info(`    nota: ${oneLine(change.addedNote)}`);
			}
			if (change.changedDefinitionFields.length > 0) {
				console.info(
					`    definición: cambia ${change.changedDefinitionFields.join(", ")}`,
				);
			}
		} else if (step.kind === "skip") {
			console.info(
				`#${step.code} [${step.deleted ? "papelera" : step.status}] ${step.title} · ${describeAssignee(step.assignee, step.assignee)}: ya aplicado, se saltea`,
			);
		} else {
			const state =
				step.status === undefined
					? ""
					: ` [${step.status}] ${step.title} · ${describeAssignee(step.assignee ?? null, step.assignee ?? null)}`;
			console.warn(
				`#${step.code}${state} CONFLICTO, se saltea: ${step.reason}`,
			);
		}
	}

	const changes = plan.steps.filter((step) => step.kind === "change");
	const skips = plan.steps.filter((step) => step.kind === "skip").length;
	const assigned = changes.filter((step) => step.change.fromAssignee).length;
	const freed = changes.filter(
		(step) => step.change.fromAssignee && !step.change.toAssignee,
	).length;
	console.info(
		`\nResumen: ${transitions.length} transiciones · ${changes.length} a aplicar · ${skips} ya aplicadas · ${plan.conflicts.length} conflictos`,
	);
	console.info(
		`Con asignado entre las que se aplican: ${assigned} (se liberan ${freed}).`,
	);
	console.info("Destino final por estado:");
	for (const [destination, codes] of summarizeDestinations(plan)) {
		console.info(
			`  ${destination}: ${codes.length} (${codes.map((c) => `#${c}`).join(", ")})`,
		);
	}
	console.info(
		`\nEl enum QaTicketStatus de esta base ${snapshot.enumHasRetest ? "ya tiene" : "todavía NO tiene"} el valor retest.`,
	);
}

function preflightProblems(snapshot: Snapshot) {
	const problems: string[] = [];
	const writesRetest = snapshot.plan.steps.some(
		(step) => step.kind === "change" && step.change.toStatus === "retest",
	);
	if (writesRetest && !snapshot.enumHasRetest) {
		problems.push(
			"la migración 20261113000000_qa_ticket_status_retest no está aplicada en esta base",
		);
	}
	if (args.apply && !snapshot.actor) {
		problems.push(snapshot.actorProblem ?? "falta el actor");
	}
	return problems;
}

async function main() {
	console.info(
		`Triage de tickets de QA · base ${describeTarget(DATABASE_URL ?? "")} · APP_ENV=${appEnv} · ${args.apply ? "APLICAR" : "simulación"}`,
	);

	const duplicates = findDuplicateEntries(transitions);
	if (duplicates.length > 0) {
		throw new Error(
			`qa-ticket-triage.data.ts repite entradas idénticas para ${duplicates.map((c) => `#${c}`).join(", ")}.`,
		);
	}

	const snapshot = await readOnlyTransaction(db, loadSnapshot);
	console.info(
		"Lectura dentro de una transacción de solo lectura (transaction_read_only=on).",
	);
	printPlan(snapshot);

	const problems = preflightProblems(snapshot);
	if (!args.apply) {
		if (problems.length > 0) {
			console.warn("\n--apply se negaría a correr mientras siga así:");
			for (const problem of problems) console.warn(`  - ${problem}`);
		}
		console.info(
			"\nSimulación: no se escribió nada. Para aplicar: pnpm qa:triage --apply --actor-email <superadmin>",
		);
		return;
	}

	if (problems.length > 0 || !snapshot.actor) {
		console.error("\nNo se aplica nada:");
		for (const problem of problems) console.error(`  - ${problem}`);
		process.exitCode = 1;
		return;
	}

	const actor = snapshot.actor;
	console.info(`\nAplicando como ${actor.name} (${actor.id})…`);
	const counts = { applied: 0, skipped: 0, conflict: 0 };
	for (const [index, step] of snapshot.plan.steps.entries()) {
		if (step.kind !== "change") continue;
		const transition = transitions[index];
		if (!transition) continue;
		const outcome = await applyTransition(transition, step.change.ticketId, {
			getById: (id) => qaTicketService.getById(id, db),
			update: (input) => qaTicketService.update(input, actor, db),
			softDelete: (id) => qaTicketService.softDelete({ id }, actor, db),
		});
		counts[outcome.kind] += 1;
		if (outcome.kind === "conflict") {
			console.warn(
				`  ! #${step.change.code} se saltea al releerlo: ${outcome.reason}`,
			);
		} else {
			console.info(
				`  ${outcome.kind === "applied" ? "✓" : "="} ${describeChange(step.change)}`,
			);
		}
	}
	console.info(
		`\nAplicado: ${counts.applied} tickets; ${counts.skipped} ya estaban al día y ${counts.conflict} cambiaron desde la lectura y se saltearon. Antes ya se saltearon ${snapshot.plan.conflicts.length} conflictos.`,
	);
}

main()
	.catch((error) => {
		console.error(
			args.apply
				? "qa:triage falló. Lo aplicado hasta acá queda; volver a correr el dry-run, que saltea lo ya hecho."
				: "qa:triage falló.",
		);
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
