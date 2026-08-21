import { describe, expect, it } from "vitest";

import {
	QA_TICKET_CLARIFICATION_REASON_MESSAGE,
	qaTicketCreateInputSchema,
	qaTicketSaveResultInputSchema,
	qaTicketStatsSchema,
	qaTicketStatusSchema,
	qaTicketUpdateInputSchema,
} from "./qa-ticket.schemas";

const definition = {
	section: "A. Acceso y sesión",
	title: "Iniciar sesión",
	actor: "Cliente",
	feature: "Auth",
	steps: "1) Abrir /login",
	expectedResult: "Entra al home",
};

const emptyLog = { content: "", fileName: null, mimeType: null };

/** Every shape a missing reason can arrive in from a form or a raw payload. */
const blankReasons = [undefined, null, "", "   ", "\n\t"];

function reasonIssues(result: {
	success: boolean;
	error?: { issues: unknown };
}) {
	if (result.success) return [];
	const issues = (result.error?.issues ?? []) as Array<{
		path: PropertyKey[];
		message: string;
	}>;
	return issues.filter((issue) => issue.path[0] === "notes");
}

describe("qaTicketStatusSchema", () => {
	it("keeps the six original slugs and appends the clarification state", () => {
		expect(qaTicketStatusSchema.options).toEqual([
			"pending",
			"inProgress",
			"passed",
			"failed",
			"blocked",
			"skipped",
			"needsClarification",
		]);
	});
});

describe("qaTicketStatsSchema", () => {
	it("counts one key per status plus the totals", () => {
		const counters = Object.fromEntries(
			qaTicketStatusSchema.options.map((status) => [status, 0]),
		);

		expect(
			qaTicketStatsSchema.parse({ ...counters, total: 0, deleted: 0 }),
		).toMatchObject({ needsClarification: 0 });
	});

	it("rejects a payload that omits the new counter", () => {
		const counters = Object.fromEntries(
			qaTicketStatusSchema.options
				.filter((status) => status !== "needsClarification")
				.map((status) => [status, 0]),
		);

		expect(
			qaTicketStatsSchema.safeParse({ ...counters, total: 0, deleted: 0 })
				.success,
		).toBe(false);
	});
});

describe("clarification reason", () => {
	it.each(blankReasons)("rejects create with notes %j", (notes) => {
		const result = qaTicketCreateInputSchema.safeParse({
			...definition,
			status: "needsClarification",
			notes,
		});

		expect(result.success).toBe(false);
		expect(reasonIssues(result).map((issue) => issue.message)).toEqual([
			QA_TICKET_CLARIFICATION_REASON_MESSAGE,
		]);
	});

	it.each(blankReasons)("rejects update with notes %j", (notes) => {
		const result = qaTicketUpdateInputSchema.safeParse({
			...definition,
			id: 12,
			status: "needsClarification",
			notes,
		});

		expect(result.success).toBe(false);
		expect(reasonIssues(result)).toHaveLength(1);
	});

	it.each(blankReasons)("rejects save-result with notes %j", (notes) => {
		const result = qaTicketSaveResultInputSchema.safeParse({
			id: 12,
			status: "needsClarification",
			notes,
			consoleLog: emptyLog,
			networkLog: emptyLog,
		});

		expect(result.success).toBe(false);
		expect(reasonIssues(result)).toHaveLength(1);
	});

	it("accepts a reason and keeps it trimmed", () => {
		expect(
			qaTicketCreateInputSchema.parse({
				...definition,
				status: "needsClarification",
				notes: "  Falta el dato de qué usuario usar  ",
			}).notes,
		).toBe("Falta el dato de qué usuario usar");
	});

	it("leaves every other status free of a reason", () => {
		for (const status of qaTicketStatusSchema.options) {
			if (status === "needsClarification") continue;

			expect(
				qaTicketCreateInputSchema.safeParse({ ...definition, status }).success,
			).toBe(true);
			expect(
				qaTicketSaveResultInputSchema.safeParse({
					id: 12,
					status,
					consoleLog: emptyLog,
					networkLog: emptyLog,
				}).success,
			).toBe(true);
		}
	});
});

describe("qaTicketCreateInputSchema", () => {
	it("still defaults status, regression flag and blank notes", () => {
		const parsed = qaTicketCreateInputSchema.parse(definition);

		expect(parsed).toMatchObject({
			status: "pending",
			isRegressionPath: false,
		});
		expect(parsed.notes).toBeUndefined();
		expect(
			qaTicketCreateInputSchema.parse({ ...definition, notes: "  " }).notes,
		).toBeUndefined();
	});

	it("still rejects an empty definition field", () => {
		expect(
			qaTicketCreateInputSchema.safeParse({ ...definition, steps: "  " })
				.success,
		).toBe(false);
	});
});
