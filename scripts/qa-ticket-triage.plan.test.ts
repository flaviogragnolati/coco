import { describe, expect, it } from "vitest";

import type {
	QaTicketDetail,
	QaTicketUpdateInput,
} from "~/shared/common/admin-crud/qa-ticket.types";
import {
	applyTransition,
	assertApplyAllowed,
	buildUpdateInput,
	findDuplicateEntries,
	parseTriageArgs,
	planTransition,
	planTriage,
	prependNote,
	summarizeDestinations,
	type TriageTicket,
	type TriageTransition,
} from "./qa-ticket-triage.plan";

const tester = { id: "tester-1", name: "Tester" };

function ticket(overrides: Partial<TriageTicket> = {}): TriageTicket {
	return {
		id: 100,
		code: 7,
		status: "pending",
		notes: null,
		deleted: false,
		assignee: null,
		title: "Caso",
		steps: "1) Abrir",
		expectedResult: "Abre",
		...overrides,
	};
}

const retestNote = "[13/11/2026 · triage] Texto reescrito. Mirar: algo.";
const toRetest: TriageTransition = {
	code: 7,
	status: "retest",
	prependNote: retestNote,
	clearAssignee: true,
};
const retire: TriageTransition = {
	code: 7,
	prependNote: retestNote,
	retire: true,
};

function change(transition: TriageTransition, current: TriageTicket) {
	const step = planTransition(transition, current);
	if (step.kind !== "change") {
		throw new Error(`expected change, got ${step.kind}`);
	}
	return step.change;
}

describe("prependNote", () => {
	it("puts the triage note above the tester's note with a blank line", () => {
		expect(prependNote("Falló el paso 2.", retestNote)).toBe(
			`${retestNote}\n\nFalló el paso 2.`,
		);
	});

	it("uses the note alone when there was nothing before", () => {
		expect(prependNote(null, retestNote)).toBe(retestNote);
		expect(prependNote("  \n", retestNote)).toBe(retestNote);
	});
});

describe("planTransition", () => {
	it("moves a pending ticket, prepends the note and frees the assignee", () => {
		const result = change(
			toRetest,
			ticket({ notes: "QA 04/09: no se entiende.", assignee: tester }),
		);

		expect(result).toMatchObject({
			fromStatus: "pending",
			toStatus: "retest",
			fromAssignee: tester,
			toAssignee: null,
			addedNote: retestNote,
			nextNotes: `${retestNote}\n\nQA 04/09: no se entiende.`,
			needsUpdate: true,
			retire: false,
		});
	});

	it("keeps the assignee when the transition does not free it", () => {
		const result = change(
			{ code: 7, status: "blocked", prependNote: retestNote },
			ticket({ assignee: tester }),
		);

		expect(result.toAssignee).toEqual(tester);
	});

	it("skips a ticket whose note is already in place", () => {
		expect(
			planTransition(
				toRetest,
				ticket({ status: "retest", notes: `${retestNote}\n\nviejo` }),
			),
		).toEqual({
			kind: "skip",
			code: 7,
			title: "Caso",
			status: "retest",
			assignee: null,
			deleted: false,
		});
	});

	it.each([
		"failed",
		"passed",
		"blocked",
		"needsClarification",
	] as const)("leaves a %s result recorded after the triage note alone", (status) => {
		expect(
			planTransition(
				toRetest,
				ticket({
					status,
					notes: `Resultado.\n\n${retestNote}`,
					assignee: tester,
				}),
			).kind,
		).toBe("skip");
	});

	it("reports a result recorded before the triage instead of overwriting it", () => {
		expect(
			planTransition(toRetest, ticket({ status: "failed", assignee: tester })),
		).toMatchObject({
			kind: "conflict",
			code: 7,
			status: "failed",
			assignee: tester,
			reason: expect.stringContaining("un tester ya cargó un resultado"),
		});
	});

	it("runs from any status the transition names as its origin", () => {
		expect(
			change({ ...toRetest, from: ["failed"] }, ticket({ status: "failed" }))
				.toStatus,
		).toBe("retest");
	});

	it("adds the note to a ticket that already sits in the target status", () => {
		const result = change(toRetest, ticket({ status: "retest" }));

		expect(result.addedNote).toBe(retestNote);
		expect(result.toStatus).toBe("retest");
	});

	it("does not take a ticket away from a tester who is running it", () => {
		expect(
			planTransition(toRetest, ticket({ status: "inProgress" })),
		).toMatchObject({ kind: "conflict", code: 7 });
		expect(planTransition(retire, ticket({ status: "inProgress" })).kind).toBe(
			"conflict",
		);
		expect(
			planTransition(
				retire,
				ticket({ status: "inProgress", notes: retestNote }),
			).kind,
		).toBe("conflict");
	});

	it("writes the note and then retires a superseded ticket", () => {
		const result = change(retire, ticket());

		expect(result).toMatchObject({
			fromStatus: "pending",
			toStatus: "pending",
			addedNote: retestNote,
			needsUpdate: true,
			retire: true,
		});
	});

	it("only finishes the soft delete when the note went in on an earlier run", () => {
		const result = change(retire, ticket({ notes: retestNote }));

		expect(result.needsUpdate).toBe(false);
		expect(result.retire).toBe(true);
	});

	it("skips a retired ticket that already carries its note", () => {
		expect(
			planTransition(retire, ticket({ deleted: true, notes: retestNote })).kind,
		).toBe("skip");
	});

	it("reports a deleted ticket that still needs an edit as a conflict", () => {
		expect(planTransition(retire, ticket({ deleted: true })).kind).toBe(
			"conflict",
		);
		expect(planTransition(toRetest, ticket({ deleted: true })).kind).toBe(
			"conflict",
		);
	});

	it("reports a code missing from the database as a conflict", () => {
		expect(planTransition(toRetest, undefined)).toEqual({
			kind: "conflict",
			code: 7,
			reason: "no existe en la base",
		});
	});

	it("rewrites only the definition fields that differ", () => {
		const result = change(
			{ code: 7, definition: { steps: "1) Nuevo", expectedResult: "Abre" } },
			ticket(),
		);

		expect(result.changedDefinitionFields).toEqual(["steps"]);
		expect(result.needsUpdate).toBe(true);
	});

	it("compares the definition the way the admin form stores it, trimmed", () => {
		expect(
			planTransition({ code: 7, definition: { steps: "1) Abrir\n" } }, ticket())
				.kind,
		).toBe("skip");
	});
});

describe("planTriage", () => {
	const transitions: TriageTransition[] = [
		{ code: 1, status: "retest", prependNote: retestNote },
		{ code: 2, prependNote: retestNote, retire: true },
		{ code: 3, status: "skipped", prependNote: retestNote },
		{ code: 4, status: "blocked", prependNote: retestNote },
	];

	it("plans every transition against the ticket with its code", () => {
		const plan = planTriage(transitions, [
			ticket({ id: 11, code: 1 }),
			ticket({ id: 12, code: 2 }),
			ticket({ id: 13, code: 3, status: "skipped", notes: retestNote }),
		]);

		expect(plan.steps.map((step) => step.kind)).toEqual([
			"change",
			"change",
			"skip",
			"conflict",
		]);
		expect(plan.conflicts).toEqual([
			{ code: 4, reason: "no existe en la base" },
		]);
	});

	it("plans a later entry for the same code against what the earlier one leaves", () => {
		const reTriage =
			"[20/11/2026 · triage] Corregido de nuevo. Mirar: otra cosa.";
		const plan = planTriage(
			[
				{ code: 1, status: "retest", prependNote: retestNote },
				{
					code: 1,
					from: ["retest"],
					status: "blocked",
					prependNote: reTriage,
				},
			],
			[ticket({ code: 1, notes: "viejo" })],
		);

		const second = plan.steps[1];
		expect(second?.kind).toBe("change");
		if (second?.kind !== "change") return;
		expect(second.change.fromStatus).toBe("retest");
		expect(second.change.nextNotes).toBe(
			`${reTriage}\n\n${retestNote}\n\nviejo`,
		);
		expect(Object.fromEntries(summarizeDestinations(plan))).toEqual({
			blocked: [1],
		});
	});

	it("summarizes where each ticket ends up, skips included, conflicts out", () => {
		const plan = planTriage(transitions, [
			ticket({ code: 1 }),
			ticket({ code: 2 }),
			ticket({ code: 3, status: "skipped", notes: retestNote }),
			ticket({ code: 4, status: "passed" }),
		]);

		expect(Object.fromEntries(summarizeDestinations(plan))).toEqual({
			retest: [1],
			papelera: [2],
			skipped: [3],
		});
	});
});

describe("findDuplicateEntries", () => {
	it("flags entries that repeat the code, the origin and the note", () => {
		expect(
			findDuplicateEntries([
				{ code: 1, prependNote: "a" },
				{ code: 2, prependNote: "a" },
				{ code: 1, prependNote: "a", from: ["pending"] },
			]),
		).toEqual([1]);
	});

	it("allows a code again with a new dated note or another origin", () => {
		expect(
			findDuplicateEntries([
				{ code: 1, prependNote: "[13/11/2026 · triage] a" },
				{ code: 1, prependNote: "[20/11/2026 · triage] a" },
				{ code: 1, prependNote: "[13/11/2026 · triage] a", from: ["failed"] },
			]),
		).toEqual([]);
	});
});

function detail(overrides: Partial<QaTicketDetail> = {}): QaTicketDetail {
	return {
		id: 100,
		code: 7,
		section: "A. Acceso",
		title: "Caso",
		actor: "Cliente",
		feature: "Auth",
		status: "pending",
		isRegressionPath: true,
		assignee: tester,
		deleted: false,
		updatedAt: new Date("2026-11-01T00:00:00Z"),
		steps: "1) Abrir",
		expectedResult: "Abre",
		notes: "Nota del tester.",
		consoleLog: null,
		networkLog: null,
		images: [],
		...overrides,
	};
}

/** Records the writes and makes them visible to the next read, like the DB. */
function fakeWriter(initial: QaTicketDetail) {
	let current = initial;
	const calls: string[] = [];
	const updates: QaTicketUpdateInput[] = [];
	return {
		calls,
		updates,
		writer: {
			async getById() {
				calls.push("getById");
				return current;
			},
			async update(input: QaTicketUpdateInput) {
				if (current.deleted) throw new Error("ticket borrado");
				calls.push(`update:${input.status}`);
				updates.push(input);
				current = {
					...current,
					status: input.status,
					notes: input.notes ?? null,
					assignee: input.assigneeId ? current.assignee : null,
				};
			},
			async softDelete() {
				calls.push("softDelete");
				current = { ...current, deleted: true };
			},
		},
	};
}

describe("buildUpdateInput", () => {
	it("keeps the definition and the regression flag, and frees the assignee", () => {
		const current = detail();

		expect(buildUpdateInput(current, change(toRetest, current))).toEqual({
			id: 100,
			section: "A. Acceso",
			title: "Caso",
			actor: "Cliente",
			feature: "Auth",
			steps: "1) Abrir",
			expectedResult: "Abre",
			status: "retest",
			isRegressionPath: true,
			notes: `${retestNote}\n\nNota del tester.`,
			assigneeId: undefined,
		});
	});

	it("keeps the assignee when the transition does not free it", () => {
		const current = detail();
		const input = buildUpdateInput(
			current,
			change({ code: 7, status: "blocked", prependNote: retestNote }, current),
		);

		expect(input.assigneeId).toBe("tester-1");
	});

	it("takes the rewritten definition fields from the transition", () => {
		const current = detail({ assignee: null });
		const input = buildUpdateInput(
			current,
			change(
				{ code: 7, definition: { steps: "1) Nuevo", title: "Caso nuevo" } },
				current,
			),
		);

		expect(input).toMatchObject({
			title: "Caso nuevo",
			steps: "1) Nuevo",
			expectedResult: "Abre",
		});
	});
});

describe("applyTransition", () => {
	it("writes the note before sending the ticket to the papelera", async () => {
		const { writer, calls } = fakeWriter(detail());

		await expect(applyTransition(retire, 100, writer)).resolves.toEqual({
			kind: "applied",
		});
		expect(calls).toEqual(["getById", "update:pending", "softDelete"]);
	});

	it("does nothing on a second run", async () => {
		const { writer, calls } = fakeWriter(detail());
		await applyTransition(toRetest, 100, writer);
		calls.length = 0;

		await expect(applyTransition(toRetest, 100, writer)).resolves.toEqual({
			kind: "skipped",
		});
		expect(calls).toEqual(["getById"]);
	});

	it("does not undo a result the tester saved after the first run", async () => {
		const { writer, calls, updates } = fakeWriter(detail());
		await applyTransition(toRetest, 100, writer);
		const [triaged] = updates;
		if (!triaged) throw new Error("expected the triage update");
		await writer.update({
			...triaged,
			status: "failed",
			notes: `Falló de nuevo.\n\n${triaged.notes}`,
		});
		calls.length = 0;

		await expect(applyTransition(toRetest, 100, writer)).resolves.toEqual({
			kind: "skipped",
		});
		expect(calls).toEqual(["getById"]);
	});

	it("plans against a note saved after the dry run instead of overwriting it", async () => {
		const { writer, updates } = fakeWriter(
			detail({ notes: "Nota nueva del tester." }),
		);

		await applyTransition(toRetest, 100, writer);

		expect(updates.map((input) => input.notes)).toEqual([
			`${retestNote}\n\nNota nueva del tester.`,
		]);
	});

	it("skips, without writing, a ticket a tester took in the meantime", async () => {
		const { writer, calls } = fakeWriter(detail({ status: "inProgress" }));

		await expect(applyTransition(toRetest, 100, writer)).resolves.toMatchObject(
			{ kind: "conflict", reason: expect.stringContaining("En curso") },
		);
		expect(calls).toEqual(["getById"]);
	});
});

describe("parseTriageArgs", () => {
	it("defaults to a dry run", () => {
		expect(parseTriageArgs([])).toEqual({
			apply: false,
			confirmProduction: false,
			actorEmail: null,
		});
	});

	it("reads the actor email in both spellings", () => {
		expect(
			parseTriageArgs(["--apply", "--actor-email", "qa@coco.app"]).actorEmail,
		).toBe("qa@coco.app");
		expect(
			parseTriageArgs(["--apply", "--actor-email=qa@coco.app"]).actorEmail,
		).toBe("qa@coco.app");
	});

	it("requires an actor to apply", () => {
		expect(() => parseTriageArgs(["--apply"])).toThrow("--actor-email");
		expect(() => parseTriageArgs(["--apply", "--actor-email"])).toThrow(
			"necesita un email",
		);
	});

	it("rejects unknown flags", () => {
		expect(() => parseTriageArgs(["--force"])).toThrow("--force");
	});
});

describe("assertApplyAllowed", () => {
	const dryRun = parseTriageArgs([]);
	const apply = parseTriageArgs(["--apply", "--actor-email", "qa@coco.app"]);

	it("lets the read-only dry run through on production", () => {
		expect(() => assertApplyAllowed("production", dryRun)).not.toThrow();
	});

	it("stops --apply on production without the second flag", () => {
		expect(() => assertApplyAllowed("production", apply)).toThrow(
			"--confirm-production",
		);
		expect(() =>
			assertApplyAllowed("production", { ...apply, confirmProduction: true }),
		).not.toThrow();
	});

	it("lets --apply through outside production", () => {
		expect(() => assertApplyAllowed("development", apply)).not.toThrow();
	});
});
