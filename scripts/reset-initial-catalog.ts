import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "~/prisma/client";
import {
	backupDigest,
	inventoryInitialCatalogReset,
	runInitialCatalogReplacement,
} from "./lib/reset-initial-catalog";
import { resolveScriptAppEnv } from "./lib/seed-environment";
import { quintalCatalog } from "./quintal-catalog.data";
import { quintalCatalogSchema } from "./quintal-catalog.schema";
import {
	assertResetApplyAllowed,
	describeDatabaseTarget,
	InitialCatalogResetError,
	parseResetArgs,
} from "./reset-initial-catalog.plan";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const args = parseResetArgs(process.argv.slice(2));
const appEnv = resolveScriptAppEnv(process.env);
const target = describeDatabaseTarget(url);
assertResetApplyAllowed(args, target, appEnv);
const catalog = quintalCatalogSchema.parse(quintalCatalog);
const backup = args.apply && args.backup ? backupDigest(args.backup) : null;
const db = new PrismaClient({
	adapter: new PrismaPg({ connectionString: url }),
	log: [],
});

async function main() {
	console.info(
		JSON.stringify({
			target,
			appEnv,
			sourceSha256: catalog.source.sha256,
			backupSha256: backup,
			apply: args.apply,
		}),
	);
	if (!args.apply) {
		const inventory = await db.$transaction(
			(tx) => inventoryInitialCatalogReset(tx, catalog),
			{ timeout: 180_000 },
		);
		console.info(JSON.stringify(inventory, null, 2));
		if (inventory.plan.blockers.length) process.exitCode = 1;
		return;
	}
	const result = await runInitialCatalogReplacement(db, catalog);
	console.info(JSON.stringify(result, null, 2));
	console.info(
		"Reemplazo confirmado: 27 productos y 54 términos; operatoria vacía, configuración y accesos conservados.",
	);
}

main()
	.catch((error: unknown) => {
		if (error instanceof InitialCatalogResetError) console.error(error.message);
		console.error(
			"El reemplazo no se confirmó. Se revirtió cualquier escritura de su transacción; revisar destino, guardas y conectividad. No se muestran payloads ni credenciales.",
		);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
