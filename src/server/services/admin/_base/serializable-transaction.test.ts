import { expect, test, vi } from "vitest";
import { Prisma } from "~/prisma/client";
import { runSerializable } from "./serializable-transaction";

function serializationFailure() {
	return new Prisma.PrismaClientKnownRequestError(
		"could not serialize access",
		{
			code: "P2034",
			clientVersion: "test",
		},
	);
}

/** A fake client whose `$transaction` fails a fixed number of times first. */
function database(behaviour: { failures: unknown[] }) {
	const remaining = [...behaviour.failures];
	const $transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
		const failure = remaining.shift();
		if (failure !== undefined) throw failure;
		return fn({} as never);
	});

	return {
		client: { $transaction } as unknown as Parameters<
			typeof runSerializable
		>[0],
		$transaction,
	};
}

test("a serialization failure is retried and the callback re-runs from scratch", async () => {
	const { client, $transaction } = database({
		failures: [serializationFailure(), serializationFailure()],
	});
	const callback = vi.fn(async () => "ok");

	await expect(runSerializable(client, callback)).resolves.toBe("ok");
	expect($transaction).toHaveBeenCalledTimes(3);
	// The first two attempts never reached the callback — the transaction aborted.
	expect(callback).toHaveBeenCalledTimes(1);
});

test("a raw 40001 that Prisma did not map is still recognised", async () => {
	const unmapped = new Prisma.PrismaClientUnknownRequestError(
		"ERROR: could not serialize access due to read/write dependencies (SQLSTATE 40001)",
		{ clientVersion: "test" },
	);
	const { client, $transaction } = database({ failures: [unmapped] });

	await expect(runSerializable(client, async () => "ok")).resolves.toBe("ok");
	expect($transaction).toHaveBeenCalledTimes(2);
});

test("anything that is not a serialization failure surfaces on the first attempt", async () => {
	// A CONFLICT from a command guard is a decision, not contention.
	const guardFailure = new Error("El envio ya salio");
	const { client, $transaction } = database({ failures: [guardFailure] });

	await expect(runSerializable(client, async () => "ok")).rejects.toBe(
		guardFailure,
	);
	expect($transaction).toHaveBeenCalledTimes(1);
});

test("the last serialization failure is re-thrown once the attempts run out", async () => {
	const last = serializationFailure();
	const { client, $transaction } = database({
		failures: [serializationFailure(), serializationFailure(), last],
	});

	await expect(runSerializable(client, async () => "ok")).rejects.toBe(last);
	expect($transaction).toHaveBeenCalledTimes(3);
});

test("the attempt count is configurable and never drops below one", async () => {
	const { client, $transaction } = database({
		failures: [serializationFailure()],
	});

	await expect(
		runSerializable(client, async () => "ok", { retries: 0 }),
	).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
	expect($transaction).toHaveBeenCalledTimes(1);
});
