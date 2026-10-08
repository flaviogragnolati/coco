import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./seed-init.ts", import.meta.url), "utf8");

describe("seed-init.ts", () => {
	it.each([
		".update(",
		".updateMany(",
		".upsert(",
		".delete(",
		".deleteMany(",
		"$executeRaw",
		"$queryRaw",
	])("never calls %s: the seed only inserts", (call) => {
		expect(source).not.toContain(call);
	});

	it("has no APP_ENV guard, so it can load production", () => {
		expect(source).not.toContain("assertNotProduction");
	});
});
