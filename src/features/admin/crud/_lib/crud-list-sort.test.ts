import { describe, expect, test } from "vitest";

import { applyCrudListSort, sortByDate } from "./crud-list-sort";

function item(id: number | string, updatedAt: string) {
	return { id, updatedAt: new Date(updatedAt) };
}

const older = item(1, "2026-01-01T10:00:00Z");
const middle = item(2, "2026-02-01T10:00:00Z");
const newer = item(3, "2026-03-01T10:00:00Z");

describe("applyCrudListSort", () => {
	test("default preserves the order the server returned", () => {
		const items = [middle, newer, older];

		expect(applyCrudListSort(items, "default")).toBe(items);
	});

	test("newest puts the most recently updated first", () => {
		expect(
			applyCrudListSort([middle, older, newer], "newest").map((it) => it.id),
		).toEqual([3, 2, 1]);
	});

	test("oldest reverses it", () => {
		expect(
			applyCrudListSort([middle, older, newer], "oldest").map((it) => it.id),
		).toEqual([1, 2, 3]);
	});

	test("does not mutate the input array", () => {
		const items = [middle, older, newer];
		applyCrudListSort(items, "newest");

		expect(items.map((it) => it.id)).toEqual([2, 1, 3]);
	});

	test("breaks numeric-id ties deterministically", () => {
		const sameInstant = "2026-01-01T10:00:00Z";
		const items = [
			item(3, sameInstant),
			item(1, sameInstant),
			item(2, sameInstant),
		];

		expect(applyCrudListSort(items, "oldest").map((it) => it.id)).toEqual([
			1, 2, 3,
		]);
		expect(applyCrudListSort(items, "newest").map((it) => it.id)).toEqual([
			3, 2, 1,
		]);
	});

	test("breaks string-id ties deterministically", () => {
		const sameInstant = "2026-01-01T10:00:00Z";
		const items = [
			item("user-c", sameInstant),
			item("user-a", sameInstant),
			item("user-b", sameInstant),
		];

		expect(applyCrudListSort(items, "oldest").map((it) => it.id)).toEqual([
			"user-a",
			"user-b",
			"user-c",
		]);
	});
});

describe("sortByDate", () => {
	test("sorts by the date the accessor returns, not by updatedAt", () => {
		const events = [
			{ id: 1, receivedAt: new Date("2026-02-01T00:00:00Z") },
			{ id: 2, receivedAt: new Date("2026-03-01T00:00:00Z") },
			{ id: 3, receivedAt: new Date("2026-01-01T00:00:00Z") },
		];

		expect(
			sortByDate(
				events,
				"desc",
				(event) => event.receivedAt,
				(event) => event.id,
			).map((event) => event.id),
		).toEqual([2, 1, 3]);
	});
});
