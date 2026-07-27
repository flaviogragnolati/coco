import { Prisma } from "~/prisma/client";
import type { db } from "~/server/db";

/**
 * Structural rather than `typeof db`: `executeOperation` already takes only the
 * `$transaction` capability so its callers can pass a narrower client.
 */
type Database = { $transaction: typeof db.$transaction };

/**
 * The single place `Serializable` isolation is requested, with a bounded retry on
 * serialization failure.
 *
 * Every quantity-moving command runs at `Serializable` so two concurrent
 * absorptions cannot both read the same remaining quantity. Postgres enforces
 * that by *aborting* one of them (SQLSTATE 40001), which without a retry surfaced
 * to the operator as a raw Prisma error under contention — the risk the
 * architecture doc has carried since Phase 1.
 *
 * **The callback must be idempotent under retry.** All twelve call sites read
 * their state inside the transaction, so a retry re-reads and re-plans from the
 * committed world. Anything with an effect *outside* the transaction would break
 * this; `DomainEventDispatcher.wake()` is always called after commit, never
 * inside.
 *
 * Only serialization failures are retried. A `CONFLICT` from a command guard is a
 * decision, not contention, and must surface on the first attempt.
 */
const SERIALIZATION_FAILURE_CODE = "P2034";
/** SQLSTATE for `serialization_failure`, matched defensively in case Prisma stops mapping it. */
const SERIALIZATION_FAILURE_SQLSTATE = "40001";

function isSerializationFailure(error: unknown): boolean {
	if (
		error instanceof Prisma.PrismaClientKnownRequestError &&
		error.code === SERIALIZATION_FAILURE_CODE
	) {
		return true;
	}

	return (
		error instanceof Prisma.PrismaClientUnknownRequestError &&
		error.message.includes(SERIALIZATION_FAILURE_SQLSTATE)
	);
}

export async function runSerializable<T>(
	database: Database,
	fn: (tx: Prisma.TransactionClient) => Promise<T>,
	options?: { retries?: number },
): Promise<T> {
	// No backoff: at this scale contention is rare and short-lived, and a delay
	// would only widen the window the retry exists to close.
	const attempts = Math.max(1, options?.retries ?? 3);
	let lastFailure: unknown;

	for (let attempt = 0; attempt < attempts; attempt += 1) {
		try {
			return await database.$transaction(fn, {
				isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
			});
		} catch (error) {
			if (!isSerializationFailure(error)) throw error;
			lastFailure = error;
		}
	}

	throw lastFailure;
}
