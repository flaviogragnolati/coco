import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import type { DemandItem } from "./operation-execution.service";
import {
	applyOmissions,
	buildDemandFingerprint,
	type DemandOmissions,
	emptyOmissions,
	pruneOmissions,
} from "./operation-review";

function item(input: {
	sourceKey: string;
	userId?: string;
	quantity?: string;
}): DemandItem {
	const userId = input.userId ?? "user-1";

	return {
		sourceKey: input.sourceKey,
		cartItemId: 1,
		cartItemCode: "CI-1",
		cartId: 1,
		cartCode: "CART-1",
		userId,
		userName: `Cliente ${userId}`,
		userEmail: `${userId}@example.com`,
		quantity: new Prisma.Decimal(input.quantity ?? "10.0000"),
		paidAt: new Date("2026-06-01T00:00:00.000Z"),
		orderItemCreatedAt: new Date("2026-06-01T00:00:00.000Z"),
		product: {
			id: 1,
			name: "Producto",
			unit: "kg",
			defaultSupplierId: 1,
			active: true,
			deleted: false,
			supplierTerms: [],
		},
	};
}

function omissions(input: Partial<DemandOmissions> = {}): DemandOmissions {
	return { sourceKeys: input.sourceKeys ?? [], userIds: input.userIds ?? [] };
}

const keysOf = (items: DemandItem[]) => items.map((entry) => entry.sourceKey);

test("applyOmissions omits a single item by source key", () => {
	const items = [
		item({ sourceKey: "orderItem:1" }),
		item({ sourceKey: "orderItem:2" }),
	];

	const result = applyOmissions(
		items,
		omissions({ sourceKeys: ["orderItem:1"] }),
	);

	expect(keysOf(result.effective)).toEqual(["orderItem:2"]);
	expect(keysOf(result.omitted)).toEqual(["orderItem:1"]);
});

test("applyOmissions sweeps every item belonging to an omitted user", () => {
	const items = [
		item({ sourceKey: "orderItem:1", userId: "user-a" }),
		item({ sourceKey: "orderItem:2", userId: "user-a" }),
		item({ sourceKey: "rollOver:3", userId: "user-b" }),
	];

	const result = applyOmissions(items, omissions({ userIds: ["user-a"] }));

	expect(keysOf(result.effective)).toEqual(["rollOver:3"]);
	expect(keysOf(result.omitted)).toEqual(["orderItem:1", "orderItem:2"]);
});

test("applyOmissions unions the source-key and user-id sets", () => {
	const items = [
		item({ sourceKey: "orderItem:1", userId: "user-a" }),
		item({ sourceKey: "orderItem:2", userId: "user-b" }),
		item({ sourceKey: "orderItem:3", userId: "user-c" }),
	];

	const result = applyOmissions(
		items,
		omissions({ sourceKeys: ["orderItem:2"], userIds: ["user-a"] }),
	);

	expect(keysOf(result.effective)).toEqual(["orderItem:3"]);
	expect(keysOf(result.omitted)).toEqual(["orderItem:1", "orderItem:2"]);
});

test("applyOmissions with no omissions keeps every item", () => {
	const items = [
		item({ sourceKey: "orderItem:1" }),
		item({ sourceKey: "orderItem:2" }),
	];

	const result = applyOmissions(items, emptyOmissions);

	expect(keysOf(result.effective)).toEqual(["orderItem:1", "orderItem:2"]);
	expect(result.omitted).toEqual([]);
});

test("buildDemandFingerprint is stable under input reordering", () => {
	const first = [
		item({ sourceKey: "orderItem:1" }),
		item({ sourceKey: "orderItem:2" }),
		item({ sourceKey: "rollOver:3" }),
	];
	const reordered = [first[2], first[0], first[1]] as DemandItem[];

	expect(buildDemandFingerprint(reordered)).toBe(buildDemandFingerprint(first));
});

test("buildDemandFingerprint changes when a quantity changes", () => {
	const before = [item({ sourceKey: "orderItem:1", quantity: "10.0000" })];
	const after = [item({ sourceKey: "orderItem:1", quantity: "11.0000" })];

	expect(buildDemandFingerprint(after)).not.toBe(
		buildDemandFingerprint(before),
	);
});

test("buildDemandFingerprint distinguishes quantities that collide as floats", () => {
	const before = [
		item({ sourceKey: "orderItem:1", quantity: "10.0001" }),
		item({ sourceKey: "orderItem:2", quantity: "10.0002" }),
	];
	const after = [
		item({ sourceKey: "orderItem:1", quantity: "10.0002" }),
		item({ sourceKey: "orderItem:2", quantity: "10.0001" }),
	];

	expect(buildDemandFingerprint(after)).not.toBe(
		buildDemandFingerprint(before),
	);
});

test("buildDemandFingerprint changes when an item is added", () => {
	const before = [item({ sourceKey: "orderItem:1" })];
	const after = [...before, item({ sourceKey: "orderItem:2" })];

	expect(buildDemandFingerprint(after)).not.toBe(
		buildDemandFingerprint(before),
	);
});

test("buildDemandFingerprint changes when an item is removed", () => {
	const before = [
		item({ sourceKey: "orderItem:1" }),
		item({ sourceKey: "orderItem:2" }),
	];
	const after = [before[0]] as DemandItem[];

	expect(buildDemandFingerprint(after)).not.toBe(
		buildDemandFingerprint(before),
	);
});

/**
 * The property the whole conflict check rests on (ADR 0006): the fingerprint
 * covers the effective set, so demand arriving for an already-omitted user is not
 * a change to what will run and must not block execution.
 */
test("new demand for an already-omitted user leaves the fingerprint untouched", () => {
	const reviewed = [
		item({ sourceKey: "orderItem:1", userId: "user-a" }),
		item({ sourceKey: "orderItem:2", userId: "user-b" }),
	];
	const omitUserB = omissions({ userIds: ["user-b"] });

	const approved = buildDemandFingerprint(
		applyOmissions(reviewed, omitUserB).effective,
	);

	const later = [
		...reviewed,
		item({ sourceKey: "orderItem:9", userId: "user-b" }),
	];
	const recomputed = buildDemandFingerprint(
		applyOmissions(later, omitUserB).effective,
	);

	expect(recomputed).toBe(approved);
});

test("new demand for a user nobody omitted does change the fingerprint", () => {
	const reviewed = [item({ sourceKey: "orderItem:1", userId: "user-a" })];
	const later = [
		...reviewed,
		item({ sourceKey: "orderItem:9", userId: "user-c" }),
	];

	expect(buildDemandFingerprint(later)).not.toBe(
		buildDemandFingerprint(reviewed),
	);
});

test("pruneOmissions drops orphaned keys and users and reports them", () => {
	const items = [item({ sourceKey: "orderItem:1", userId: "user-a" })];

	const result = pruneOmissions(
		items,
		omissions({
			sourceKeys: ["orderItem:1", "orderItem:404"],
			userIds: ["user-a", "user-gone"],
		}),
	);

	expect(result.omissions).toEqual({
		sourceKeys: ["orderItem:1"],
		userIds: ["user-a"],
	});
	expect(result.droppedSourceKeys).toEqual(["orderItem:404"]);
	expect(result.droppedUserIds).toEqual(["user-gone"]);
});

test("pruneOmissions keeps a user omission while any of their demand survives", () => {
	const items = [
		item({ sourceKey: "orderItem:2", userId: "user-a" }),
		item({ sourceKey: "orderItem:3", userId: "user-b" }),
	];

	const result = pruneOmissions(items, omissions({ userIds: ["user-a"] }));

	expect(result.omissions.userIds).toEqual(["user-a"]);
	expect(result.droppedUserIds).toEqual([]);
});

test("pruneOmissions drops everything when the demand set is empty", () => {
	const result = pruneOmissions(
		[],
		omissions({ sourceKeys: ["orderItem:1"], userIds: ["user-a"] }),
	);

	expect(result.omissions).toEqual({ sourceKeys: [], userIds: [] });
	expect(result.droppedSourceKeys).toEqual(["orderItem:1"]);
	expect(result.droppedUserIds).toEqual(["user-a"]);
});
