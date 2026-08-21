import { describe, expect, it } from "vitest";

import { qaTicketStatusSchema } from "~/schemas/admin/qa-ticket.schemas";
import {
	getQaTicketWorkAction,
	qaTicketResultOptions,
	qaTicketStatusConfig,
	qaTicketStatusLabelMap,
	qaTicketStatusOptions,
} from "./qa-ticket.mappers";

describe("qaTicketStatusConfig", () => {
	it("covers every status of the Zod enum with a labelled chip", () => {
		for (const status of qaTicketStatusSchema.options) {
			expect(qaTicketStatusLabelMap[status]?.length).toBeGreaterThan(0);
			expect(qaTicketStatusConfig[status]?.label).toBe(
				qaTicketStatusLabelMap[status],
			);
			expect(qaTicketStatusConfig[status]?.icon).toBeDefined();
		}
	});

	it("distinguishes the two inert statuses by icon", () => {
		expect(qaTicketStatusConfig.pending.icon).not.toBe(
			qaTicketStatusConfig.skipped.icon,
		);
	});

	it("distinguishes a missing environment from a missing definition", () => {
		expect(qaTicketStatusConfig.needsClarification.label).toBe(
			"Requiere aclaración",
		);
		expect(qaTicketStatusConfig.needsClarification.icon).not.toBe(
			qaTicketStatusConfig.blocked.icon,
		);
		expect(
			qaTicketStatusConfig.needsClarification.hint?.length,
		).toBeGreaterThan(0);
	});

	it("offers one filter option per status", () => {
		expect(qaTicketStatusOptions.map((option) => option.value)).toEqual([
			...qaTicketStatusSchema.options,
		]);
	});
});

describe("qaTicketResultOptions", () => {
	it("offers exactly the statuses a finished run can produce", () => {
		expect(qaTicketResultOptions.map((option) => option.value)).toEqual([
			"passed",
			"failed",
			"blocked",
			"skipped",
			"needsClarification",
		]);
	});

	it("excludes the queue positions from the operational selector", () => {
		const values: string[] = qaTicketResultOptions.map(
			(option) => option.value,
		);

		expect(values).not.toContain("pending");
		expect(values).not.toContain("inProgress");
	});

	it("reuses the chip metadata instead of a parallel list", () => {
		for (const option of qaTicketResultOptions) {
			expect(option.label).toBe(qaTicketStatusLabelMap[option.value]);
			expect(option.icon).toBe(qaTicketStatusConfig[option.value].icon);
		}
	});
});

describe("getQaTicketWorkAction", () => {
	const ticket = { assignee: null, deleted: false };

	it("maps unassigned, own, foreign and deleted tickets to contextual actions", () => {
		expect(getQaTicketWorkAction(ticket, "me")).toBe("claim");
		expect(
			getQaTicketWorkAction(
				{ ...ticket, assignee: { id: "me", name: "Yo" } },
				"me",
			),
		).toBe("continue");
		expect(
			getQaTicketWorkAction(
				{ ...ticket, assignee: { id: "other", name: "Otra" } },
				"me",
			),
		).toBe("assigned");
		expect(getQaTicketWorkAction({ ...ticket, deleted: true }, "me")).toBe(
			"none",
		);
	});
});
