import { describe, expect, it } from "vitest";

import type { QaTicketDetail } from "~/shared/common/admin-crud/qa-ticket.types";
import {
	applyTransition,
	assertApplyAllowed,
	buildUpdateInput,
	findDuplicateCodes,
	parseTriageArgs,
	planTransition,
	planTriage,
	prependNote,
	summarizeDestinations,
	type TriageTicket,
	type TriageTransition,
} from "./qa-ticket-triage.plan";

function ticket(overrides: Partial<TriageTicket> = {}): TriageTicket {
	return {
		id: 100,
		code: 7,
		status: "pending",
		notes: null,
		deleted: false,
		title: "Caso",
		steps: "1) Abrir",
		expectedResult: "Abre",
		...overrides,
	};
}

const retestNote = "[13/11/2026 · triage] Texto reescrito. Mirar: algo.";

function change(transition: TriageTransition, current: TriageTicket) {
	const step = planTransition(transition, current);
	if (step.kind !== "change")
		throw new Error(`expected change, got ${step.kind}`);
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
	it("moves the status and prepends the note, keeping the old note", () => {
		const result = change(
			{ code: 7, status: "retest", prependNote: retestNote },
			ticket({ notes: "QA 04/09: no se entiende." }),
		);

		expect(result).toMatchObject({
			fromStatus: "pending",
			toStatus: "retest",
			addedNote: retestNote,
			nextNotes: `${retestNote}\n\nQA 04/09: no se entiende.`,
			needsUpdate: true,
			retire: false,
		});
	});

	it("skips a ticket already in the target status with the note in place", () => {
		const step = planTransition(
			{ code: 7, status: "retest", prependNote: retestNote },
			ticket({ status: "retest", notes: `${retestNote}\n\nviejo` }),
		);

		expect(step).toEqual({
			kind: "skip",
			code: 7,
			title: "Caso",
			status: "retest",
		});
	});

	it("only fixes the status when the note was added by an earlier run", () => {
		const result = change(
			{ code: 7, status: "retest", prependNote: retestNote },
			ticket({ notes: retestNote }),
		);

		expect(result.addedNote).toBeNull();
		expect(result.nextNotes).toBe(retestNote);
		expect(result.toStatus).toBe("retest");
	});

	it("only adds the note when the status is already right", () => {
		const result = change(
			{ code: 7, status: "skipped", prependNote: retestNote },
			ticket({ status: "skipped", notes: "otra cosa" }),
		);

		expect(result.toStatus).toBe("skipped");
		expect(result.addedNote).toBe(retestNote);
	});

	it("keeps the current status when the transition does not name one", () => {
		const result = change(
			{ code: 7, prependNote: retestNote, retire: true },
			ticket({ status: "failed" }),
		);

		expect(result).toMatchObject({
			fromStatus: "failed",
			toStatus: "failed",
			needsUpdate: true,
			retire: true,
		});
	});

	it("writes the note and then retires a superseded ticket", () => {
		const result = change(
			{ code: 7, prependNote: retestNote, retire: true },
			ticket(),
		);

		expect(result.addedNote).toBe(retestNote);
		expect(result.retire).toBe(true);
	});

	it("retires without an update when the note is already there", () => {
		const result = change(
			{ code: 7, prependNote: retestNote, retire: true },
			ticket({ notes: retestNote }),
		);

		expect(result.needsUpdate).toBe(false);
		expect(result.retire).toBe(true);
	});

	it("skips a retired ticket that already carries its note", () => {
		expect(
			planTransition(
				{ code: 7, prependNote: retestNote, retire: true },
				ticket({ deleted: true, notes: retestNote }),
			).kind,
		).toBe("skip");
	});

	it("reports a deleted ticket that still needs an edit as a conflict", () => {
		expect(
			planTransition(
				{ code: 7, prependNote: retestNote, retire: true },
				ticket({ deleted: true, notes: null }),
			),
		).toMatchObject({ kind: "conflict", code: 7 });
		expect(
			planTransition({ code: 7, status: "retest" }, ticket({ deleted: true }))
				.kind,
		).toBe("conflict");
	});

	it("does not take a ticket away from a tester who is running it", () => {
		expect(
			planTransition(
				{ code: 7, status: "retest", prependNote: retestNote },
				ticket({ status: "inProgress" }),
			),
		).toMatchObject({ kind: "conflict", code: 7 });
	});

	it("does not retire a ticket that a tester is running either", () => {
		expect(
			planTransition(
				{ code: 7, prependNote: retestNote, retire: true },
				ticket({ status: "inProgress" }),
			).kind,
		).toBe("conflict");
	});

	it("reports a code missing from the database as a conflict", () => {
		expect(planTransition({ code: 7, status: "retest" }, undefined)).toEqual({
			kind: "conflict",
			code: 7,
			reason: "no existe en la base",
		});
	});

	it("rewrites only the definition fields that differ", () => {
		const result = change(
			{
				code: 7,
				definition: { steps: "1) Nuevo", expectedResult: "Abre" },
			},
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

	it("skips a definition that already matches", () => {
		expect(
			planTransition({ code: 7, definition: { steps: "1) Abrir" } }, ticket())
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

	it("summarizes where each ticket ends up, skips included", () => {
		const plan = planTriage(transitions, [
			ticket({ code: 1 }),
			ticket({ code: 2 }),
			ticket({ code: 3, status: "skipped", notes: retestNote }),
			ticket({ code: 4 }),
		]);

		expect(
			Object.fromEntries(summarizeDestinations(transitions, plan)),
		).toEqual({
			retest: [1],
			papelera: [2],
			skipped: [3],
			blocked: [4],
		});
	});
});

describe("findDuplicateCodes", () => {
	it("returns each repeated code once", () => {
		expect(
			findDuplicateCodes([{ code: 1 }, { code: 2 }, { code: 1 }, { code: 1 }]),
		).toEqual([1]);
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
		assignee: { id: "tester-1", name: "Tester" },
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
	return {
		calls,
		writer: {
			async getById() {
				calls.push("getById");
				return current;
			},
			async update(input: ReturnType<typeof buildUpdateInput>) {
				if (current.deleted) throw new Error("ticket borrado");
				calls.push(`update:${input.status}`);
				current = {
					...current,
					status: input.status,
					notes: input.notes ?? null,
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
	it("keeps the definition, the regression flag and the assignee", () => {
		const current = detail();
		const input = buildUpdateInput(
			current,
			change({ code: 7, status: "retest", prependNote: retestNote }, current),
		);

		expect(input).toEqual({
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
			assigneeId: "tester-1",
		});
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
			assigneeId: undefined,
		});
	});
});

describe("applyTransition", () => {
	const retire: TriageTransition = {
		code: 7,
		prependNote: retestNote,
		retire: true,
	};

	it("writes the note before sending the ticket to the papelera", async () => {
		const { writer, calls } = fakeWriter(detail());

		await expect(applyTransition(retire, 100, writer)).resolves.toBe("applied");
		expect(calls).toEqual(["getById", "update:pending", "softDelete"]);
	});

	it("does nothing on a second run", async () => {
		const { writer, calls } = fakeWriter(detail());
		await applyTransition(retire, 100, writer);
		calls.length = 0;

		await expect(applyTransition(retire, 100, writer)).resolves.toBe("skipped");
		expect(calls).toEqual(["getById"]);
	});

	it("plans against a note saved after the dry run instead of overwriting it", async () => {
		const { writer } = fakeWriter(detail({ notes: "Nota nueva del tester." }));
		const updates: Array<string | undefined> = [];
		const recording = {
			...writer,
			async update(input: ReturnType<typeof buildUpdateInput>) {
				updates.push(input.notes);
				await writer.update(input);
			},
		};

		await applyTransition(
			{ code: 7, status: "retest", prependNote: retestNote },
			100,
			recording,
		);

		expect(updates).toEqual([`${retestNote}\n\nNota nueva del tester.`]);
	});

	it("refuses a ticket that a tester took in the meantime", async () => {
		const { writer, calls } = fakeWriter(detail({ status: "inProgress" }));

		await expect(
			applyTransition({ code: 7, status: "retest" }, 100, writer),
		).rejects.toThrow("#7");
		expect(calls).toEqual(["getById"]);
	});
});
