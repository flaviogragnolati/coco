import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "~/env";
import { PrismaClient } from "~/prisma/client";

const createPrismaClient = () =>
	new PrismaClient({
		adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
		log:
			env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
		/**
		 * Prisma's 5s default is a per-statement-count budget in disguise: the
		 * fulfillment commands issue dozens of sequential round trips inside one
		 * transaction (guard, mutation, cascade, counter recompute, effects publish,
		 * audit), so against a managed Postgres a few hundred kilometres away they
		 * blow it and fail with P2028 — first observed driving `supplierOrder.request`
		 * and then `shipment.receive` from `scripts/fulfillment-e2e.ts`.
		 *
		 * A **ceiling, not a target**: co-located with its database the longest of
		 * these commands finishes in well under a second, and the value only has to
		 * be generous enough that latency alone never aborts a correct command. It is
		 * still far below Postgres's own `idle_in_transaction_session_timeout`.
		 *
		 * Per-field defaults: `runSerializable` sets its own `isolationLevel` and
		 * inherits these.
		 */
		transactionOptions: { maxWait: 10_000, timeout: 60_000 },
	});

const globalForPrisma = globalThis as unknown as {
	prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
