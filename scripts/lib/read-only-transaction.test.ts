import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "~/prisma/client";
import { describeDatabaseTarget } from "../reset-initial-catalog.plan";
import { readOnlyTransaction } from "./read-only-transaction";

/** Mimics Postgres: `SET TRANSACTION READ ONLY` flips what `SHOW` reports. */
function fakeDb({ honoursSet = true } = {}) {
	const calls: string[] = [];
	let readOnly = false;
	const tx = {
		async $executeRawUnsafe(query: string) {
			calls.push(query);
			if (query === "SET TRANSACTION READ ONLY" && honoursSet) readOnly = true;
			return 0;
		},
		async $queryRawUnsafe<T>(query: string) {
			calls.push(query);
			return [{ transaction_read_only: readOnly ? "on" : "off" }] as T;
		},
	};
	const db = {
		async $transaction<R>(fn: (client: typeof tx) => Promise<R>) {
			return fn(tx);
		},
	};
	return { db, calls };
}

describe("readOnlyTransaction", () => {
	it("makes the transaction read-only and checks it before reading", async () => {
		const { db, calls } = fakeDb();

		const result = await readOnlyTransaction(db, async () => {
			calls.push("read");
			return 42;
		});

		expect(result).toBe(42);
		expect(calls).toEqual([
			"SET TRANSACTION READ ONLY",
			"SHOW transaction_read_only",
			"read",
		]);
	});

	it("refuses to read when the access mode did not stick", async () => {
		const { db } = fakeDb({ honoursSet: false });
		const read = vi.fn();

		await expect(readOnlyTransaction(db, read)).rejects.toThrow(
			"transaction_read_only=off",
		);
		expect(read).not.toHaveBeenCalled();
	});
});

// Opt-in: a throwaway local Postgres, e.g.
// QA_TRIAGE_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/qa_triage_test
const url = process.env.QA_TRIAGE_TEST_DATABASE_URL;
if (url) {
	const parsed = new URL(url);
	if (
		!["127.0.0.1", "localhost"].includes(parsed.hostname) ||
		!parsed.pathname.endsWith("_test") ||
		(process.env.DATABASE_URL &&
			describeDatabaseTarget(url) ===
				describeDatabaseTarget(process.env.DATABASE_URL))
	)
		throw new Error(
			"QA_TRIAGE_TEST_DATABASE_URL must be an isolated local *_test database, different from DATABASE_URL",
		);
}

describe.skipIf(!url)("readOnlyTransaction on PostgreSQL", () => {
	let db: PrismaClient;

	beforeAll(() => {
		db = new PrismaClient({
			adapter: new PrismaPg({ connectionString: url ?? "" }),
		});
	});

	afterAll(async () => {
		await db?.$disconnect();
	});

	it("rejects a write issued from inside the read", async () => {
		await expect(
			readOnlyTransaction(db, (tx) =>
				tx.$executeRawUnsafe(
					"CREATE TABLE qa_triage_read_only_probe (id integer)",
				),
			),
		).rejects.toThrow(/read-only transaction/);

		const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
			"SELECT to_regclass('qa_triage_read_only_probe') IS NOT NULL AS exists",
		);
		expect(rows[0]?.exists).toBe(false);
	});

	it("still reads", async () => {
		await expect(
			readOnlyTransaction(db, (tx) =>
				tx.$queryRawUnsafe<Array<{ one: number }>>("SELECT 1 AS one"),
			),
		).resolves.toEqual([{ one: 1 }]);
	});
});
