import type { Catalog } from "./lib/seed-init-core";
import { toSeedInitCatalog } from "./lib/seed-init-core";
import {
	KEPT_MODELS,
	TRANSACTIONAL_DELETE_ORDER,
} from "./purge-demo-data.plan";
import { quintalLaunchSource } from "./quintal-launch-catalog.config";
import type { SeedInitState } from "./seed-init.plan";
import { planSeedInit } from "./seed-init.plan";

export class InitialCatalogResetError extends Error {}

export const RESET_DELETE_ORDER = [
	...TRANSACTIONAL_DELETE_ORDER.filter(
		(model) => model !== "PaymentProviderEvent",
	),
	"ProductLocalConstraints",
	"ProductClientTerms",
	"ProductSupplierTerms",
	"Product",
] as const;

export const RESET_PRESERVED_MODELS = [
	...KEPT_MODELS.filter((model) => model !== "HomeOfferSettings"),
	"Supplier",
	"Brand",
] as const;

export function describeDatabaseTarget(connectionString: string) {
	const url = new URL(connectionString);
	const safeParameters = new Set([
		"ssl",
		"sslmode",
		"sslrootcert",
		"sslcert",
		"sslkey",
		"channel_binding",
		"uselibpqcompat",
		"application_name",
		"connect_timeout",
		"connection_limit",
		"pool_timeout",
		"pgbouncer",
		"client_encoding",
	]);
	for (const key of url.searchParams.keys()) {
		if (!safeParameters.has(key))
			throw new InitialCatalogResetError(
				"El destino no admite parámetros de conexión que alteren el enrutamiento",
			);
	}
	if (
		!["postgres:", "postgresql:"].includes(url.protocol) ||
		!url.hostname ||
		url.hostname.includes("%") ||
		!/^\/[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/.test(url.pathname) ||
		(!url.port && process.env.PGPORT && process.env.PGPORT !== "5432")
	)
		throw new InitialCatalogResetError("Destino PostgreSQL inválido");
	return `${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
}

export type ResetArgs = {
	apply: boolean;
	target?: string;
	confirmProduction: boolean;
	backup?: string;
};

export function parseResetArgs(argv: readonly string[]): ResetArgs {
	const args: ResetArgs = { apply: false, confirmProduction: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--apply") args.apply = true;
		else if (arg === "--confirm-production") args.confirmProduction = true;
		else if (arg === "--target" || arg === "--backup") {
			const value = argv[++i];
			if (!value || value.startsWith("--"))
				throw new InitialCatalogResetError(`Falta valor de ${arg}`);
			if (arg === "--target") args.target = value;
			else args.backup = value;
		} else throw new InitialCatalogResetError(`Argumento desconocido: ${arg}`);
	}
	return args;
}

export function assertResetApplyAllowed(
	args: ResetArgs,
	target: string,
	appEnv: string,
) {
	if (!args.apply) return;
	if (args.target !== target)
		throw new InitialCatalogResetError(
			"--apply requiere --target igual al destino inventariado",
		);
	if (!args.backup)
		throw new InitialCatalogResetError(
			"--apply requiere --backup con un respaldo restaurable verificado",
		);
	if (appEnv === "production" && !args.confirmProduction)
		throw new InitialCatalogResetError(
			"APP_ENV=production requiere --confirm-production",
		);
}

export function planInitialCatalogReset(
	catalog: Catalog,
	state: SeedInitState & {
		categories: Array<
			SeedInitState["categories"][number] & { active: boolean }
		>;
	},
	unsettledOutbox: number,
	unsettledPayments: number,
	now: Date,
) {
	const blockers: string[] = [];
	if (
		catalog.source.profile !== "coco-launch" ||
		catalog.source.sha256 !== quintalLaunchSource.sha256 ||
		catalog.products.length !== 27
	)
		blockers.push(
			"El catálogo no es el snapshot de lanzamiento aprobado de 27 productos",
		);
	if (new Date(catalog.source.listDate).getTime() > now.getTime())
		blockers.push("La vigencia del catálogo está en el futuro");
	const suppliers = state.suppliers.filter(
		(s) => s.name === catalog.supplier.name && !s.deleted,
	);
	if (suppliers.length !== 1 || !suppliers[0]?.active)
		blockers.push(
			"Se requiere un único proveedor Quintal activo y no eliminado",
		);
	if (unsettledOutbox > 0)
		blockers.push(
			`Hay ${unsettledOutbox} eventos de outbox pendientes/processing/failed`,
		);
	if (unsettledPayments > 0)
		blockers.push(`Hay ${unsettledPayments} pagos/eventos sin resolver`);
	try {
		const input = toSeedInitCatalog(catalog);
		const required = new Set(input.products.map((p) => p.categoryName));
		for (const category of state.categories)
			if (required.has(category.name) && !category.deleted && !category.active)
				blockers.push(`Categoría inactiva: ${category.name}`);
		planSeedInit(
			input,
			{ ...state, products: [], supplierTerms: [], clientTerms: [] },
			now,
		);
	} catch (error) {
		blockers.push(error instanceof Error ? error.message : String(error));
	}
	return { blockers, productsToCreate: catalog.products.length };
}
