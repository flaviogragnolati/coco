import { describe, expect, test } from "vitest";

import {
	canResolveGlossaryProposal,
	glossaryProposalTransitions,
} from "./glossary-proposal.transitions";
import type {
	GlossaryProposalResolution,
	GlossaryProposalStatus,
} from "./glossary-proposal.types";

const resolutions: GlossaryProposalResolution[] = [
	"accepted",
	"applied",
	"rejected",
];

const legal: Array<[GlossaryProposalStatus, GlossaryProposalResolution]> = [
	["open", "accepted"],
	["open", "rejected"],
	["accepted", "applied"],
	["accepted", "rejected"],
];

describe("glossaryProposalTransitions", () => {
	test.each(legal)("allows %s → %s", (from, to) => {
		expect(canResolveGlossaryProposal(from, to)).toBe(true);
	});

	test("an open proposal cannot jump straight to applied", () => {
		expect(canResolveGlossaryProposal("open", "applied")).toBe(false);
	});

	test("an accepted proposal cannot be accepted twice", () => {
		expect(canResolveGlossaryProposal("accepted", "accepted")).toBe(false);
	});

	test.each(["applied", "rejected"] as const)("%s is terminal", (from) => {
		expect(glossaryProposalTransitions[from]).toEqual([]);

		for (const to of resolutions) {
			expect(canResolveGlossaryProposal(from, to)).toBe(false);
		}
	});
});
