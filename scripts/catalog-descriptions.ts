/**
 * `pnpm catalog:descriptions`: loads the product descriptions in
 * `catalog-descriptions.data.ts`.
 *
 * Dry run by default: it reads inside a read-only transaction and prints, for
 * each product, the current description and the new one. Any product that is
 * missing, deleted, renamed or that the admin form would reject blocks the
 * whole run. `--apply --actor-email <superadmin>` writes through the admin
 * product service, one product at a time, so every change leaves its
 * `product.update` row in `AuditLog`; a product already up to date is skipped.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "~/prisma/client";
import { productDetailSchema } from "~/schemas/admin/product.schemas";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { productDetailSelect } from "~/server/services/admin/product.data";
import { catalogDescriptions } from "./catalog-descriptions.data";
import {
	applyDescription,
	assertApplyAllowed,
	type DescriptionStep,
	findDuplicateEntries,
	parseDescriptionArgs,
	planDescriptions,
} from "./catalog-descriptions.plan";
import { readOnlyTransaction } from "./lib/read-only-transaction";
import { resolveScriptAppEnv } from "./lib/seed-environment";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error(
		"DATABASE_URL is required to run scripts/catalog-descriptions.ts",
	);
}

const args = parseDescriptionArgs(process.argv.slice(2));
const appEnv = resolveScriptAppEnv(process.env);
assertApplyAllowed(appEnv, args);

const db = new PrismaClient({
	adapter: new PrismaPg({ connectionString: DATABASE_URL }),
	// Widened so the client matches the `typeof db` the admin services accept.
	log: ["error", "warn"] as Prisma.LogLevel[],
	// Each service command runs several round trips to a remote Neon database.
	transactionOptions: { maxWait: 10_000, timeout: 60_000 },
});

type Tx = Prisma.TransactionClient;

type Snapshot = {
	steps: DescriptionStep[];
	actor: AdminMutationActor | null;
	actorProblem: string | null;
};

async function resolveActor(tx: Tx, email: string) {
	const users = await tx.user.findMany({
		where: {
			email: { equals: email, mode: "insensitive" },
			role: "superadmin",
			active: true,
			deleted: false,
		},
		select: { id: true, name: true, role: true },
	});
	if (users.length === 1 && users[0]) {
		return { actor: users[0], actorProblem: null };
	}
	return {
		actor: null,
		actorProblem:
			users.length === 0
				? `no hay un superadmin activo con el email ${email}`
				: `hay ${users.length} superadmins activos con el email ${email}`,
	};
}

async function loadSnapshot(tx: Tx): Promise<Snapshot> {
	const records = await tx.product.findMany({
		where: { id: { in: catalogDescriptions.map((entry) => entry.productId) } },
		select: productDetailSelect,
	});
	const products = records.map((record) => productDetailSchema.parse(record));
	const actor = args.actorEmail
		? await resolveActor(tx, args.actorEmail)
		: { actor: null, actorProblem: null };
	return { steps: planDescriptions(catalogDescriptions, products), ...actor };
}

function describeTarget(url: string) {
	try {
		const parsed = new URL(url);
		return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}`;
	} catch {
		return "(DATABASE_URL ilegible)";
	}
}

function printPlan(steps: DescriptionStep[]) {
	console.info("");
	for (const step of steps) {
		const label = `#${step.productId} ${step.name}`;
		if (step.kind === "change") {
			console.info(`${label}: cambia`);
			console.info(`    antes:   ${step.before ?? "(sin descripción)"}`);
			console.info(`    después: ${step.after}`);
		} else if (step.kind === "skip") {
			console.info(`${label}: ya tiene esta descripción, se saltea`);
		} else {
			console.warn(`${label}: BLOQUEADO, ${step.reason}`);
		}
	}
	const count = (kind: DescriptionStep["kind"]) =>
		steps.filter((step) => step.kind === kind).length;
	console.info(
		`\nResumen: ${steps.length} productos · ${count("change")} cambian · ${count("skip")} ya al día · ${count("blocked")} bloqueados`,
	);
}

async function main() {
	console.info(
		`Descripciones del catálogo · base ${describeTarget(DATABASE_URL ?? "")} · APP_ENV=${appEnv} · ${args.apply ? "APLICAR" : "simulación"}`,
	);

	const duplicates = findDuplicateEntries(catalogDescriptions);
	if (duplicates.length > 0) {
		throw new Error(
			`catalog-descriptions.data.ts repite ${duplicates.join(", ")}.`,
		);
	}

	const snapshot = await readOnlyTransaction(db, loadSnapshot);
	console.info(
		"Lectura dentro de una transacción de solo lectura (transaction_read_only=on).",
	);
	printPlan(snapshot.steps);

	const problems = snapshot.steps.flatMap((step) =>
		step.kind === "blocked" ? [`#${step.productId}: ${step.reason}`] : [],
	);
	if (args.apply && !snapshot.actor) {
		problems.push(snapshot.actorProblem ?? "falta el actor");
	}

	if (!args.apply) {
		if (problems.length > 0) {
			console.warn("\n--apply se negaría a correr mientras siga así:");
			for (const problem of problems) console.warn(`  - ${problem}`);
			process.exitCode = 1;
		}
		console.info(
			"\nSimulación: no se escribió nada. Para aplicar: pnpm catalog:descriptions --apply --actor-email <superadmin>",
		);
		return;
	}

	if (problems.length > 0 || !snapshot.actor) {
		console.error("\nNo se aplica nada:");
		for (const problem of problems) console.error(`  - ${problem}`);
		process.exitCode = 1;
		return;
	}

	// Loaded only to write: it pulls in the app's env and blob storage.
	const productService = await import(
		"~/server/services/admin/product.service"
	);
	const actor = snapshot.actor;
	console.info(`\nAplicando como ${actor.name} (${actor.id})…`);
	const counts = { applied: 0, skipped: 0, conflict: 0 };
	for (const entry of catalogDescriptions) {
		const outcome = await applyDescription(entry, {
			getById: (id) => productService.getById(id, db),
			update: (input) => productService.update(input, actor, db),
		});
		counts[outcome.kind] += 1;
		const label = `#${entry.productId} ${entry.name}`;
		if (outcome.kind === "conflict") {
			console.warn(`  ! ${label} se saltea al releerlo: ${outcome.reason}`);
		} else {
			console.info(`  ${outcome.kind === "applied" ? "✓" : "="} ${label}`);
		}
	}
	console.info(
		`\nAplicado: ${counts.applied} productos; ${counts.skipped} ya estaban al día y ${counts.conflict} cambiaron desde la lectura y se saltearon.`,
	);
	if (counts.conflict > 0) process.exitCode = 1;
}

main()
	.catch((error) => {
		console.error(
			args.apply
				? "catalog:descriptions falló. Lo aplicado hasta acá queda; volver a correr el dry-run, que saltea lo ya hecho."
				: "catalog:descriptions falló.",
		);
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
