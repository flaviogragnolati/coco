/**
 * Decides what `db:purge-demo` deletes. Every transactional table is wiped
 * whole; the catalog loses only what is provably demo. Demo means a supplier
 * named like one of `prisma/seed.ts` and the products that default to it; any
 * product or supplier that cannot be proven demo or Quintal is reported as
 * unclassified and kept.
 */

/** Supplier names `prisma/seed.ts` creates. */
export const DEMO_SUPPLIER_NAMES = [
	"Cooperativa Valle Verde",
	"Lacteos del Sur",
	"Pack Norte Mayorista",
	"Frigorifico La Sierra",
	"Distribuidora Rio Parana",
] as const;

/** Child before parent, so no `Restrict` foreign key blocks a delete. */
export const TRANSACTIONAL_DELETE_ORDER = [
	"CartItemTrackingEvent",
	"PackageAllocation",
	"PackageLotItem",
	"Package",
	"Shipment",
	"CarrierOrder",
	"CartItemLotItem",
	"RollOver",
	"LotItem",
	"Lot",
	"Operation",
	"SupplierTransaction",
	"SupplierOrder",
	"PaymentProviderEvent",
	"UserTransaction",
	"UserOrderItem",
	"UserOrder",
	"CartItem",
	"Cart",
] as const;

/** Runs after the transactional wipe, restricted to the demo rows. */
export const CATALOG_DELETE_ORDER = [
	"ProductLocalConstraints",
	"ProductClientTerms",
	"ProductSupplierTerms",
	"Product",
	"Supplier",
	"Brand",
] as const;

/** Never deleted. `HomeOfferSettings` only loses a demo spotlight. */
export const KEPT_MODELS = [
	"User",
	"Session",
	"Account",
	"Verification",
	"Address",
	"PaymentMethod",
	"PaymentProviderConfig",
	"Carrier",
	"PickupPoint",
	"Destination",
	"Channel",
	"HomeOfferSettings",
	"AuditLog",
	"DomainEventOutbox",
	"QaTicket",
	"QaTicketEvidence",
	"GlossaryProposal",
	"SupplierApplication",
] as const;

export type TransactionalModel = (typeof TRANSACTIONAL_DELETE_ORDER)[number];
export type KeptModel = (typeof KEPT_MODELS)[number];

type Flags = { active: boolean; deleted: boolean };

export type PurgeSupplier = Flags & { id: number; name: string };

export type PurgeProduct = Flags & {
	id: number;
	name: string;
	defaultSupplierId: number | null;
	brandId: number | null;
	homeOfferRank: number | null;
};

export type PurgeBrand = { id: number; name: string };

export type PurgeSupplierTerms = {
	id: number;
	productId: number;
	supplierId: number;
};

export type PurgeProductRow = { id: number; productId: number };

export type PurgeCatalogState = {
	suppliers: PurgeSupplier[];
	products: PurgeProduct[];
	brands: PurgeBrand[];
	supplierTerms: PurgeSupplierTerms[];
	clientTerms: PurgeProductRow[];
	localConstraints: PurgeProductRow[];
	spotlightProductId: number | null;
};

export type PurgeIdentity = {
	quintalSupplierName: string;
	demoSupplierNames: readonly string[];
};

export type Unclassified = { id: number; name: string; reason: string };

export type DemoProduct = PurgeProduct & { supplierName: string };

export type DemoPurgePlan = {
	/** Non-empty means `--apply` must refuse. */
	blockers: string[];
	quintal: { suppliers: PurgeSupplier[]; productIds: number[] };
	demo: {
		suppliers: PurgeSupplier[];
		products: DemoProduct[];
		brands: PurgeBrand[];
		clientTermIds: number[];
		supplierTermIds: number[];
		localConstraintIds: number[];
		clearSpotlight: boolean;
	};
	unclassified: { suppliers: Unclassified[]; products: Unclassified[] };
	/** Demo brands that a kept product still uses, so they stay. */
	sharedBrands: Array<PurgeBrand & { keptProductIds: number[] }>;
};

const byId = <T extends { id: number }>(left: T, right: T) =>
	left.id - right.id;

function describeSupplier(supplier: PurgeSupplier | undefined, id: number) {
	return supplier ? `"${supplier.name}" (id ${id})` : `id ${id}`;
}

export function planDemoPurge(
	identity: PurgeIdentity,
	state: PurgeCatalogState,
): DemoPurgePlan {
	const blockers: string[] = [];
	const suppliersById = new Map(state.suppliers.map((s) => [s.id, s]));
	const demoNames = new Set(identity.demoSupplierNames);

	const quintalSuppliers = state.suppliers
		.filter((supplier) => supplier.name === identity.quintalSupplierName)
		.sort(byId);
	if (quintalSuppliers.length === 0) {
		blockers.push(
			`No hay ningún proveedor "${identity.quintalSupplierName}": sin él no se puede distinguir el catálogo real del demo.`,
		);
	}
	const quintalIds = new Set(quintalSuppliers.map((supplier) => supplier.id));
	const demoCandidates = state.suppliers.filter(
		(supplier) => !quintalIds.has(supplier.id) && demoNames.has(supplier.name),
	);
	const demoCandidateIds = new Set(demoCandidates.map((s) => s.id));

	const termSuppliersByProduct = new Map<number, Set<number>>();
	for (const terms of state.supplierTerms) {
		const set = termSuppliersByProduct.get(terms.productId) ?? new Set();
		set.add(terms.supplierId);
		termSuppliersByProduct.set(terms.productId, set);
	}

	const quintalProductIds: number[] = [];
	const demoProducts: DemoProduct[] = [];
	const unclassifiedProducts: Unclassified[] = [];
	for (const product of [...state.products].sort(byId)) {
		const termSuppliers = [...(termSuppliersByProduct.get(product.id) ?? [])];
		const unclassified = (reason: string) =>
			unclassifiedProducts.push({ id: product.id, name: product.name, reason });

		if (
			(product.defaultSupplierId !== null &&
				quintalIds.has(product.defaultSupplierId)) ||
			termSuppliers.some((id) => quintalIds.has(id))
		) {
			quintalProductIds.push(product.id);
			continue;
		}
		if (product.defaultSupplierId === null) {
			unclassified("no tiene proveedor por defecto");
			continue;
		}
		const supplier = suppliersById.get(product.defaultSupplierId);
		if (!supplier || !demoCandidateIds.has(supplier.id)) {
			unclassified(
				`su proveedor por defecto ${describeSupplier(supplier, product.defaultSupplierId)} no es Quintal ni demo`,
			);
			continue;
		}
		const foreign = termSuppliers.filter((id) => !demoCandidateIds.has(id));
		if (foreign.length > 0) {
			unclassified(
				`tiene términos de un proveedor que no es demo: ${foreign
					.sort((left, right) => left - right)
					.map((id) => describeSupplier(suppliersById.get(id), id))
					.join(", ")}`,
			);
			continue;
		}
		demoProducts.push({ ...product, supplierName: supplier.name });
	}

	const demoProductIds = new Set(demoProducts.map((product) => product.id));
	const keptProducts = state.products.filter(
		(product) => !demoProductIds.has(product.id),
	);

	const demoSuppliers: PurgeSupplier[] = [];
	const unclassifiedSuppliers: Unclassified[] = [];
	for (const supplier of [...state.suppliers].sort(byId)) {
		if (quintalIds.has(supplier.id)) continue;
		if (!demoCandidateIds.has(supplier.id)) {
			unclassifiedSuppliers.push({
				id: supplier.id,
				name: supplier.name,
				reason: "no es Quintal ni un proveedor de prisma/seed.ts",
			});
			continue;
		}
		// Deleting it would null a kept product's default supplier or hit the
		// `Restrict` on a kept product's supplier terms.
		const pinning = new Set([
			...keptProducts
				.filter((product) => product.defaultSupplierId === supplier.id)
				.map((product) => product.id),
			...state.supplierTerms
				.filter(
					(terms) =>
						terms.supplierId === supplier.id &&
						!demoProductIds.has(terms.productId),
				)
				.map((terms) => terms.productId),
		]);
		if (pinning.size > 0) {
			unclassifiedSuppliers.push({
				id: supplier.id,
				name: supplier.name,
				reason: `es demo pero lo usan productos que no se borran (ids ${[
					...pinning,
				]
					.sort((left, right) => left - right)
					.join(", ")})`,
			});
			continue;
		}
		demoSuppliers.push(supplier);
	}

	const demoBrandIds = new Set(
		demoProducts.flatMap((product) =>
			product.brandId === null ? [] : [product.brandId],
		),
	);
	const demoBrands: PurgeBrand[] = [];
	const sharedBrands: DemoPurgePlan["sharedBrands"] = [];
	for (const brand of [...state.brands].sort(byId)) {
		if (!demoBrandIds.has(brand.id)) continue;
		const keptProductIds = keptProducts
			.filter((product) => product.brandId === brand.id)
			.map((product) => product.id)
			.sort((left, right) => left - right);
		if (keptProductIds.length > 0)
			sharedBrands.push({ ...brand, keptProductIds });
		else demoBrands.push(brand);
	}

	const rowsOfDemo = (rows: PurgeProductRow[]) =>
		rows
			.filter((row) => demoProductIds.has(row.productId))
			.map((row) => row.id)
			.sort((left, right) => left - right);

	return {
		blockers,
		quintal: { suppliers: quintalSuppliers, productIds: quintalProductIds },
		demo: {
			suppliers: demoSuppliers,
			products: demoProducts,
			brands: demoBrands,
			clientTermIds: rowsOfDemo(state.clientTerms),
			supplierTermIds: rowsOfDemo(state.supplierTerms),
			localConstraintIds: rowsOfDemo(state.localConstraints),
			clearSpotlight:
				state.spotlightProductId !== null &&
				demoProductIds.has(state.spotlightProductId),
		},
		unclassified: {
			suppliers: unclassifiedSuppliers,
			products: unclassifiedProducts,
		},
		sharedBrands,
	};
}

export type PurgeArgs = { apply: boolean; confirmProduction: boolean };

export function parsePurgeArgs(argv: readonly string[]): PurgeArgs {
	const known = new Set(["--apply", "--confirm-production"]);
	const unknown = argv.filter((arg) => !known.has(arg));
	if (unknown.length > 0) {
		throw new Error(
			`Argumentos desconocidos: ${unknown.join(" ")}. Se aceptan --apply y --confirm-production.`,
		);
	}
	return {
		apply: argv.includes("--apply"),
		confirmProduction: argv.includes("--confirm-production"),
	};
}

/** A production database holds real orders, so wiping it takes a second flag. */
export function assertApplyAllowed(appEnv: string, args: PurgeArgs) {
	if (args.apply && appEnv === "production" && !args.confirmProduction) {
		throw new Error(
			"APP_ENV=production: --apply borra TODOS los pedidos, pagos y envíos. Si es la base correcta, repetir con --apply --confirm-production.",
		);
	}
}
