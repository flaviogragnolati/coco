import { expect, test } from "vitest";
import { dateInputSchema } from "./_crud-schema-helpers";

test.each([
	"2026-07-22T11:30",
	"2026-07-22T11:30:00",
	"2026-07-22T14:30:00.000Z",
	"2026-07-22T11:30:00-03:00",
	"2026-07-22",
])("accepts %s", (value) => {
	expect(dateInputSchema.safeParse(value).success).toBe(true);
});

test.each([
	"22/07/2026",
	"",
	"julio 22",
	"2026-13-45",
	"2026-07-22 11:30",
])("rejects %s", (value) => {
	expect(dateInputSchema.safeParse(value).success).toBe(false);
});
