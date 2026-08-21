import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { qaTicketSeedEntries } from "./qa-tickets.data";

/**
 * The minimum end-to-end regression chain of `docs/qa/qa-ciclo-de-vida.md`,
 * with both payment branches: mock (17) and Mercado Pago (21 + 23).
 */
const regressionChain = [
	1, 6, 12, 14, 15, 17, 21, 23, 31, 40, 41, 42, 46, 47, 50, 51, 52, 54, 57, 58,
	67,
];

describe("qaTicketSeedEntries", () => {
	it("transcribes the 67 tests with codes 1-67, no gaps and no duplicates", () => {
		expect(qaTicketSeedEntries).toHaveLength(67);
		expect(qaTicketSeedEntries.map((entry) => entry.code)).toEqual(
			Array.from({ length: 67 }, (_, index) => index + 1),
		);
	});

	it("marks exactly the regression chain", () => {
		const marked = qaTicketSeedEntries
			.filter((entry) => entry.isRegressionPath)
			.map((entry) => entry.code);

		expect(marked).toEqual(regressionChain);
	});

	it("leaves no field empty", () => {
		for (const entry of qaTicketSeedEntries) {
			for (const field of [
				"section",
				"title",
				"actor",
				"feature",
				"steps",
				"expectedResult",
			] as const) {
				expect(
					entry[field].trim().length,
					`#${entry.code} ${field}`,
				).toBeGreaterThan(0);
			}
		}
	});

	it("keeps markdown table syntax out of the transcribed text", () => {
		for (const entry of qaTicketSeedEntries) {
			expect(`${entry.steps}${entry.expectedResult}`).not.toContain("|");
		}
	});

	it("keeps the seed update restricted to canonical specification fields", () => {
		const source = readFileSync(
			new URL("./qa-seed.ts", import.meta.url),
			"utf8",
		);
		const updateBlock = source.match(
			/\n\s*update: \{([\s\S]*?)\n\s*\},\n\s*\}\);/,
		)?.[1];

		expect(updateBlock).toBeDefined();
		for (const field of [
			"section",
			"title",
			"actor",
			"feature",
			"steps",
			"expectedResult",
			"isRegressionPath",
		]) {
			expect(updateBlock).toContain(field);
		}
		for (const trackingField of [
			"status",
			"notes",
			"assigneeId",
			"deleted",
			"evidence",
		]) {
			expect(updateBlock).not.toContain(trackingField);
		}
	});
});
