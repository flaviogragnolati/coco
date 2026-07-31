import { describe, expect, test } from "vitest";
import { idFilterParam } from "./search-params";

describe("idFilterParam", () => {
	test("keeps a valid id as text", () => {
		expect(idFilterParam("3")).toBe("3");
	});

	test("takes the first entry of a repeated param", () => {
		expect(idFilterParam(["3", "5"])).toBe("3");
	});

	test.each([
		["missing", undefined],
		["empty", ""],
		["non numeric", "abc"],
		["decimal", "1.5"],
		["zero", "0"],
		["negative", "-2"],
		["empty array", [] as string[]],
	])("returns no filter when %s", (_case, value) => {
		expect(idFilterParam(value)).toBe("");
	});
});
