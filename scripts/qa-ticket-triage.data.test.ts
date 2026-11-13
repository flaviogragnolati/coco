import { describe, expect, it } from "vitest";

import { qaTicketTriageTransitions } from "./qa-ticket-triage.data";
import { findDuplicateCodes } from "./qa-ticket-triage.plan";

function codesWhere(
	predicate: (
		transition: (typeof qaTicketTriageTransitions)[number],
	) => boolean,
) {
	return qaTicketTriageTransitions
		.filter(predicate)
		.map((transition) => transition.code)
		.sort((a, b) => a - b);
}

describe("qaTicketTriageTransitions", () => {
	it("lists each ticket once", () => {
		expect(findDuplicateCodes(qaTicketTriageTransitions)).toEqual([]);
	});

	it("dates every note and never leaves a transition without one", () => {
		for (const transition of qaTicketTriageTransitions) {
			expect(transition.prependNote).toMatch(
				/^\[\d{2}\/\d{2}\/\d{4} · triage\] \S/,
			);
		}
	});

	it("retires only superseded tickets, naming the replacement", () => {
		const retired = qaTicketTriageTransitions.filter((t) => t.retire);

		expect(retired.map((t) => t.code)).toEqual(
			expect.arrayContaining([71, 72, 75, 76, 77, 78, 79]),
		);
		for (const transition of retired) {
			expect(transition.status).toBeUndefined();
			expect(transition.prependNote).toMatch(
				/Superado por #\d+: .+\. No re-testear\.$/,
			);
		}
	});

	it("keeps the targets settled on 13/11 as later waves add entries", () => {
		expect(codesWhere((t) => t.status === "skipped")).toEqual(
			expect.arrayContaining([105, 108, 111]),
		);
		expect(codesWhere((t) => t.status === "blocked")).toEqual(
			expect.arrayContaining([82]),
		);
		expect(codesWhere((t) => t.status === "retest")).toEqual(
			expect.arrayContaining([
				2, 3, 12, 16, 18, 20, 21, 22, 23, 24, 25, 26, 30, 31, 32, 33, 36, 37,
				38, 42, 45, 48, 54, 61, 67, 80, 83, 86,
			]),
		);
	});

	it("tells the tester what changed, what to look at and what to prepare", () => {
		for (const transition of qaTicketTriageTransitions) {
			if (transition.status !== "retest") continue;
			expect(transition.prependNote).toMatch(
				/ Mirar: .+\. Precondiciones: .+\.$/,
			);
		}
	});
});
