import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
	new URL("./backfill-categories.ts", import.meta.url),
	"utf8",
);

describe("backfill-categories.ts", () => {
	it.each([
		".create(",
		".createMany(",
		".update(",
		".upsert(",
		".delete(",
		".deleteMany(",
		"$executeRaw",
	])("never calls %s: it only sets categoryId", (call) => {
		expect(source).not.toContain(call);
	});
});
