/**
 * Seeds the QA tickets of `docs/qa/qa-ciclo-de-vida.md` into `qa_ticket`.
 *
 * The upsert rewrites only the transcribed text (section, title, actor, feature,
 * steps, expectedResult, isRegressionPath) and never touches `status`, `notes`,
 * `assigneeId` or `evidence`: those fields ARE the QA tracking, so re-running
 * this after a wording fix must not wipe a pass that is underway.
 *
 * The single exception is `deleted`, and only in one direction: after the
 * upserts, the codes in `retiredQaTicketCodes` are taken to `deleted: true`.
 * That write is monotonic — the seed can retire a case whose feature no longer
 * exists, but it can never resurrect one, so a row retired here stays retired
 * across every future run. Reactivating one is a deliberate admin action.
 *
 * For the same reason `qa_ticket` is deliberately absent from
 * `resetDemoTransactionalData` and `requiredTables` in `prisma/seed.ts`. The QA
 * doc asks for `pnpm db:seed` as an environment precondition, so putting the
 * table in that reset would erase the tracking at the exact moment a pass
 * starts. Run this script separately, with `pnpm qa:seed`.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "~/prisma/client";
import { qaTicketSeedEntries, retiredQaTicketCodes } from "./qa-tickets.data";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is required to run scripts/qa-seed.ts");
}

const db = new PrismaClient({
	adapter: new PrismaPg({ connectionString: DATABASE_URL }),
	log: ["error", "warn"],
});

async function main() {
	const existingCodes = new Set(
		(await db.qaTicket.findMany({ select: { code: true } })).map(
			(ticket) => ticket.code,
		),
	);

	let created = 0;
	let updated = 0;

	for (const entry of qaTicketSeedEntries) {
		await db.qaTicket.upsert({
			where: { code: entry.code },
			create: {
				code: entry.code,
				section: entry.section,
				title: entry.title,
				actor: entry.actor,
				feature: entry.feature,
				steps: entry.steps,
				expectedResult: entry.expectedResult,
				isRegressionPath: entry.isRegressionPath,
				status: "pending",
				notes: null,
				assigneeId: null,
				deleted: false,
			},
			update: {
				section: entry.section,
				title: entry.title,
				actor: entry.actor,
				feature: entry.feature,
				steps: entry.steps,
				expectedResult: entry.expectedResult,
				isRegressionPath: entry.isRegressionPath,
			},
		});

		if (existingCodes.has(entry.code)) updated += 1;
		else created += 1;
	}

	// Monotonic logical delete: `deleted: false` in the filter means an already
	// retired row is left untouched, so the count reports what THIS run retired.
	const { count: retired } = await db.qaTicket.updateMany({
		where: { code: { in: retiredQaTicketCodes }, deleted: false },
		data: { deleted: true },
	});

	console.info(
		`QA tickets: ${created} creados, ${updated} actualizados, ${retired} retirados (tracking preservado).`,
	);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
