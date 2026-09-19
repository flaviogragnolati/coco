import { expect, test } from "vitest";

import { rerunParameters } from "./operation-rerun.decision";

const base = { destinationId: 1, strategy: "fifo" as const };

test("a completed source forces roll overs back on", () => {
	expect(
		rerunParameters("completed", { ...base, includeRollOver: false }),
	).toStrictEqual({
		parameters: { ...base, includeRollOver: true },
		forcedIncludeRollOver: true,
	});
});

test("a completed source that already included roll overs is not flagged", () => {
	expect(
		rerunParameters("completed", { ...base, includeRollOver: true }),
	).toStrictEqual({
		parameters: { ...base, includeRollOver: true },
		forcedIncludeRollOver: false,
	});
});

test("failed and cancelled sources keep the operator's choice", () => {
	for (const status of ["failed", "cancelled"]) {
		expect(
			rerunParameters(status, { ...base, includeRollOver: false }),
		).toStrictEqual({
			parameters: { ...base, includeRollOver: false },
			forcedIncludeRollOver: false,
		});
	}
});
