/**
 * Runs `read` inside a transaction that Postgres itself keeps read-only, so a
 * dry run cannot write even if its code tried to. The access mode is checked
 * back with `SHOW` before `read` starts: a pooler or driver that dropped the
 * `SET` must stop the run, not let it continue unguarded.
 */

type RawCapable = {
	$executeRawUnsafe(query: string): Promise<unknown>;
	$queryRawUnsafe<T = unknown>(query: string): Promise<T>;
};

type TransactionCapable<Tx extends RawCapable> = {
	$transaction<R>(
		fn: (tx: Tx) => Promise<R>,
		options?: { maxWait?: number; timeout?: number },
	): Promise<R>;
};

export async function assertTransactionReadOnly(tx: RawCapable) {
	const rows = await tx.$queryRawUnsafe<
		Array<{ transaction_read_only: string }>
	>("SHOW transaction_read_only");
	const mode = rows[0]?.transaction_read_only;
	if (mode !== "on") {
		throw new Error(
			`La transacción no quedó en solo lectura (transaction_read_only=${mode ?? "?"}); no se lee nada.`,
		);
	}
}

export async function readOnlyTransaction<Tx extends RawCapable, R>(
	db: TransactionCapable<Tx>,
	read: (tx: Tx) => Promise<R>,
): Promise<R> {
	return db.$transaction(
		async (tx) => {
			await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
			await assertTransactionReadOnly(tx);
			return read(tx);
		},
		{ maxWait: 30_000, timeout: 60_000 },
	);
}
