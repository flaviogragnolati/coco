import { isTermsWindowCurrent } from "~/server/services/_base/terms-validity";

/**
 * Decides what `db:seed:init` creates. Insert-only by construction: every
 * decision is create, keep or skip, so an admin's edit is never overwritten and
 * a rerun over a loaded database creates nothing.
 *
 * Identity is the product name plus Quintal as default supplier. A product an
 * admin renamed is therefore invisible here and a rerun would create it again;
 * the plan can only point at Quintal products whose names left the catalog.
 */

type Flags = { active: boolean; deleted: boolean };

export type ExistingSupplier = Flags & { id: number; name: string };

export type ExistingProduct = Flags & {
	id: number;
	name: string;
	defaultSupplierId: number | null;
};

export type ExistingTerms = Flags & {
	productId: number;
	fromDate: Date;
	toDate: Date | null;
};

export type ExistingSupplierTerms = ExistingTerms & { supplierId: number };

export type SeedInitState = {
	/** Every supplier named like the catalog's, deleted ones included. */
	suppliers: ExistingSupplier[];
	/** Products named like a catalog product, or defaulting to that supplier. */
	products: ExistingProduct[];
	supplierTerms: ExistingSupplierTerms[];
	clientTerms: ExistingTerms[];
};

export type SeedInitCatalog = {
	supplierName: string;
	listDate: Date;
	products: Array<{ key: string; name: string }>;
};

export type TermsDecision =
	| { action: "create" }
	| { action: "keep" }
	| { action: "skip"; reason: string };

export type ProductDecision =
	| { key: string; name: string; action: "create" }
	| {
			key: string;
			name: string;
			action: "keep";
			productId: number;
			supplierTerms: TermsDecision;
			clientTerms: TermsDecision;
	  }
	| { key: string; name: string; action: "skip"; reason: string };

export type SeedInitPlan = {
	supplier: { action: "create" } | { action: "keep"; id: number };
	products: ProductDecision[];
	warnings: string[];
};

function sameInstant(left: Date, right: Date) {
	return left.getTime() === right.getTime();
}

function resolveSupplier(catalog: SeedInitCatalog, state: SeedInitState) {
	const named = state.suppliers.filter(
		(supplier) => supplier.name === catalog.supplierName,
	);
	const live = named.filter((supplier) => !supplier.deleted);
	if (live.length > 1) {
		throw new Error(
			`Hay ${live.length} proveedores "${catalog.supplierName}" sin eliminar (ids ${live
				.map((supplier) => supplier.id)
				.join(", ")}): unificarlos antes de correr db:seed:init.`,
		);
	}
	// A deleted namesake is reused rather than duplicated: deleting it was an
	// admin decision this seed must not silently route around.
	return live[0] ?? named.sort((left, right) => left.id - right.id)[0] ?? null;
}

function decideTerms(
	terms: ExistingTerms[],
	listDate: Date,
	now: Date,
	label: string,
): TermsDecision {
	if (terms.some((term) => sameInstant(term.fromDate, listDate))) {
		return { action: "keep" };
	}
	if (terms.some((term) => isTermsWindowCurrent(term, now))) {
		return {
			action: "skip",
			reason: `ya tiene ${label} vigentes cargados a mano; no se reemplazan`,
		};
	}
	return { action: "create" };
}

export function planSeedInit(
	catalog: SeedInitCatalog,
	state: SeedInitState,
	now: Date,
): SeedInitPlan {
	const warnings: string[] = [];
	const supplier = resolveSupplier(catalog, state);
	if (supplier?.deleted) {
		warnings.push(
			`El proveedor "${supplier.name}" (id ${supplier.id}) está eliminado: sus productos no se pueden comprar hasta restaurarlo.`,
		);
	} else if (supplier && !supplier.active) {
		warnings.push(
			`El proveedor "${supplier.name}" (id ${supplier.id}) está inactivo: sus productos no se pueden comprar hasta activarlo.`,
		);
	}

	const products = catalog.products.map((product): ProductDecision => {
		const namesakes = state.products.filter(
			(existing) => existing.name === product.name,
		);
		if (namesakes.length === 0) {
			return { key: product.key, name: product.name, action: "create" };
		}

		const own = supplier
			? namesakes.filter(
					(existing) => existing.defaultSupplierId === supplier.id,
				)
			: [];
		const [existing] = own;
		if (own.length !== 1 || !existing || namesakes.length > 1) {
			return {
				key: product.key,
				name: product.name,
				action: "skip",
				reason: `ya existe otro producto con este nombre (ids ${namesakes
					.map((namesake) => namesake.id)
					.join(
						", ",
					)}) que no es de ${catalog.supplierName}; no se crea un duplicado`,
			};
		}
		if (existing.deleted) {
			return {
				key: product.key,
				name: product.name,
				action: "skip",
				reason: `el producto (id ${existing.id}) está eliminado; no se restaura`,
			};
		}

		return {
			key: product.key,
			name: product.name,
			action: "keep",
			productId: existing.id,
			supplierTerms: decideTerms(
				state.supplierTerms.filter(
					(terms) =>
						terms.productId === existing.id &&
						terms.supplierId === supplier?.id,
				),
				catalog.listDate,
				now,
				`términos de ${catalog.supplierName}`,
			),
			clientTerms: decideTerms(
				state.clientTerms.filter((terms) => terms.productId === existing.id),
				catalog.listDate,
				now,
				"términos de cliente",
			),
		};
	});

	if (supplier) {
		const catalogNames = new Set(
			catalog.products.map((product) => product.name),
		);
		for (const existing of state.products) {
			if (
				existing.defaultSupplierId === supplier.id &&
				!existing.deleted &&
				!catalogNames.has(existing.name)
			) {
				warnings.push(
					`"${existing.name}" (id ${existing.id}) es de ${catalog.supplierName} pero su nombre no está en el catálogo: si es un producto del catálogo renombrado, db:seed:init vuelve a crear el original con su nombre de lista.`,
				);
			}
		}
	}

	return {
		supplier: supplier
			? { action: "keep", id: supplier.id }
			: { action: "create" },
		products,
		warnings,
	};
}
