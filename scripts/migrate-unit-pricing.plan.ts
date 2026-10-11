import { Prisma } from "~/prisma/client";
import type { CatalogProductPresentationContainer } from "~/shared/common/catalog.types";
import { inferPresentationFromName } from "./lib/infer-presentation";

/**
 * Decides what `pnpm db:migrate-unit-pricing` changes. Every decision compares
 * the stored value with the target and is dropped when they already agree, so
 * a second run plans nothing.
 *
 * Client terms are edited in place, never closed: closing them would invalidate
 * every open cart and checkout that references them.
 */

type Decimalish = string;
type Flags = { active: boolean; deleted: boolean };

export type MigrationProduct = {
	id: number;
	name: string;
	unit: string;
	description: string | null;
	defaultSupplierId: number | null;
	deleted: boolean;
	presentationContainer: CatalogProductPresentationContainer | null;
	presentationSize: string | null;
};

export type MigrationClientTerms = Flags & {
	id: number;
	productId: number;
	moq: Decimalish;
	moqPrice: Decimalish;
	step: Decimalish | null;
	stepPrice: Decimalish | null;
	unitPrice: Decimalish | null;
	toDate: Date | null;
};

export type MigrationSupplierTerms = Flags & {
	id: number;
	productId: number;
	supplierId: number;
	supplierPresentation: string | null;
	toDate: Date | null;
};

export type UnitPricingState = {
	/** Null when the database has no live Quintal supplier. */
	quintalSupplierId: number | null;
	products: MigrationProduct[];
	clientTerms: MigrationClientTerms[];
	supplierTerms: MigrationSupplierTerms[];
};

type PriceColumns = {
	moq: string;
	step: string | null;
	unitPrice: string;
	moqPrice: string;
	stepPrice: string | null;
};

export type ClientTermsChange = {
	id: number;
	productId: number;
	productName: string;
	reason: "halfKilo" | "derivedPrices";
	before: Omit<PriceColumns, "unitPrice"> & { unitPrice: string | null };
	after: PriceColumns;
};

export type PresentationChange = {
	productId: number;
	productName: string;
	presentationContainer: CatalogProductPresentationContainer;
	presentationSize: string | null;
};

export type DescriptionChange = {
	productId: number;
	productName: string;
	before: string;
	after: string | null;
	supplierPresentation: string;
	/** Supplier terms whose empty supplierPresentation gets the sentence. */
	supplierTermsIds: number[];
};

export type UnitPricingPlan = {
	clientTerms: ClientTermsChange[];
	presentations: PresentationChange[];
	descriptions: DescriptionChange[];
	/** Quintal products sold by the unit whose name names no container. */
	uninferredPresentations: Array<{ productId: number; productName: string }>;
	warnings: string[];
};

const HALF_KILO = "0.5000";
const WEIGHT_UNITS = new Set(["kg", "gr", "lb"]);

const SUPPLIER_SENTENCE = /\s*Presentación del proveedor: (.+?)\.(?=\s|$)/;

function decimal(value: Decimalish) {
	return new Prisma.Decimal(value);
}

function quantityText(value: Prisma.Decimal) {
	return value.toFixed(4);
}

function priceOf(unitPrice: Decimalish, quantity: Decimalish) {
	return decimal(unitPrice)
		.times(quantity)
		.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
		.toFixed(2);
}

function sameDecimal(left: Decimalish | null, right: Decimalish | null) {
	if (left === null || right === null) return left === right;
	return decimal(left).eq(right);
}

function isLive(terms: Flags & { toDate: Date | null }, now: Date) {
	return (
		terms.active &&
		!terms.deleted &&
		(terms.toDate === null || terms.toDate >= now)
	);
}

/** The sentence the Quintal parser used to append, and the text without it. */
export function splitSupplierPresentation(description: string) {
	const match = SUPPLIER_SENTENCE.exec(description);
	if (!match?.[1]) return null;
	const rest = description.replace(SUPPLIER_SENTENCE, "").trim();
	return { supplierPresentation: match[1], description: rest || null };
}

function planClientTerms(
	terms: MigrationClientTerms,
	product: MigrationProduct,
	isQuintal: boolean,
	warnings: string[],
): ClientTermsChange | null {
	const legacyUnitPrice = decimal(terms.moq).gt(0)
		? decimal(terms.moqPrice)
				.div(terms.moq)
				.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
				.toFixed(2)
		: null;
	const unitPrice = terms.unitPrice ?? (isQuintal ? legacyUnitPrice : null);
	if (unitPrice === null) {
		warnings.push(
			`Términos de cliente #${terms.id} de "${product.name}" no tienen precio por unidad: se cobran a moqPrice / moq y no se tocan.`,
		);
		return null;
	}

	const halfKilo = isQuintal && product.unit === "kg";
	const moq = halfKilo ? HALF_KILO : quantityText(decimal(terms.moq));
	const step = halfKilo
		? HALF_KILO
		: terms.step === null
			? null
			: quantityText(decimal(terms.step));
	const after: PriceColumns = {
		moq,
		step,
		unitPrice,
		moqPrice: priceOf(unitPrice, moq),
		stepPrice: step === null ? null : priceOf(unitPrice, step),
	};

	const unchanged =
		sameDecimal(terms.moq, after.moq) &&
		sameDecimal(terms.step, after.step) &&
		sameDecimal(terms.unitPrice, after.unitPrice) &&
		sameDecimal(terms.moqPrice, after.moqPrice) &&
		sameDecimal(terms.stepPrice, after.stepPrice);
	if (unchanged) return null;

	return {
		id: terms.id,
		productId: product.id,
		productName: product.name,
		reason: halfKilo ? "halfKilo" : "derivedPrices",
		before: {
			moq: terms.moq,
			step: terms.step,
			unitPrice: terms.unitPrice,
			moqPrice: terms.moqPrice,
			stepPrice: terms.stepPrice,
		},
		after,
	};
}

export function planUnitPricing(
	state: UnitPricingState,
	now: Date,
): UnitPricingPlan {
	const warnings: string[] = [];
	const quintalId = state.quintalSupplierId;
	if (quintalId === null) {
		warnings.push(
			"No hay proveedor Quintal vivo: no se migran mínimos de 0,5 kg ni presentaciones.",
		);
	}

	const liveSupplierTerms = state.supplierTerms.filter((terms) =>
		isLive(terms, now),
	);
	const quintalTermsOf = (productId: number) =>
		liveSupplierTerms.filter(
			(terms) =>
				terms.productId === productId && terms.supplierId === quintalId,
		);
	const isQuintalProduct = (product: MigrationProduct) =>
		quintalId !== null &&
		(product.defaultSupplierId === quintalId ||
			quintalTermsOf(product.id).length > 0);

	const productsById = new Map(
		state.products
			.filter((product) => !product.deleted)
			.map((product) => [product.id, product]),
	);

	const clientTerms: ClientTermsChange[] = [];
	for (const terms of state.clientTerms) {
		const product = productsById.get(terms.productId);
		if (!product || !isLive(terms, now)) continue;
		const change = planClientTerms(
			terms,
			product,
			isQuintalProduct(product),
			warnings,
		);
		if (change) clientTerms.push(change);
	}

	const descriptions: DescriptionChange[] = [];
	const supplierPresentationOf = new Map<number, string>();
	for (const product of productsById.values()) {
		const split = product.description
			? splitSupplierPresentation(product.description)
			: null;
		if (!split || !product.description) continue;

		const targets = quintalTermsOf(product.id);
		if (targets.length === 0) {
			warnings.push(
				`"${product.name}" (id ${product.id}) tiene "Presentación del proveedor" en la descripción pero no términos de Quintal vigentes: no se toca.`,
			);
			continue;
		}
		for (const terms of targets) {
			if (
				terms.supplierPresentation !== null &&
				terms.supplierPresentation !== split.supplierPresentation
			) {
				warnings.push(
					`Términos de proveedor #${terms.id} de "${product.name}" ya dicen "${terms.supplierPresentation}"; se conservan y se descarta "${split.supplierPresentation}" de la descripción.`,
				);
			}
		}

		supplierPresentationOf.set(product.id, split.supplierPresentation);
		descriptions.push({
			productId: product.id,
			productName: product.name,
			before: product.description,
			after: split.description,
			supplierPresentation: split.supplierPresentation,
			supplierTermsIds: targets
				.filter((terms) => terms.supplierPresentation === null)
				.map((terms) => terms.id),
		});
	}

	const presentations: PresentationChange[] = [];
	const uninferredPresentations: UnitPricingPlan["uninferredPresentations"] =
		[];
	for (const product of productsById.values()) {
		if (
			!isQuintalProduct(product) ||
			WEIGHT_UNITS.has(product.unit) ||
			product.presentationContainer !== null
		)
			continue;

		const supplierPresentation =
			supplierPresentationOf.get(product.id) ??
			quintalTermsOf(product.id).find((terms) => terms.supplierPresentation)
				?.supplierPresentation ??
			null;
		const inferred = inferPresentationFromName(
			product.name,
			supplierPresentation,
		);
		if (!inferred) {
			uninferredPresentations.push({
				productId: product.id,
				productName: product.name,
			});
			continue;
		}
		presentations.push({
			productId: product.id,
			productName: product.name,
			...inferred,
		});
	}

	return {
		clientTerms,
		presentations,
		descriptions,
		uninferredPresentations,
		warnings,
	};
}

export function isEmptyPlan(plan: UnitPricingPlan) {
	return (
		plan.clientTerms.length === 0 &&
		plan.presentations.length === 0 &&
		plan.descriptions.length === 0
	);
}

/** The dry-run report: one line per change, grouped by what it touches. */
export function describePlan(plan: UnitPricingPlan): string[] {
	const lines: string[] = [];
	const show = (value: string | null) => value ?? "—";

	lines.push(`Términos de cliente: ${plan.clientTerms.length} cambios.`);
	for (const change of plan.clientTerms) {
		const label =
			change.reason === "halfKilo"
				? "mínimo y paso 0,5 kg"
				: "precios derivados";
		lines.push(
			`  #${change.id} ${change.productName} (${label}): mínimo ${show(change.before.moq)} → ${change.after.moq}, paso ${show(change.before.step)} → ${show(change.after.step)}, unitario ${show(change.before.unitPrice)} → ${change.after.unitPrice}, precio mínimo ${change.before.moqPrice} → ${change.after.moqPrice}, precio paso ${show(change.before.stepPrice)} → ${show(change.after.stepPrice)}`,
		);
	}

	lines.push(`Presentaciones: ${plan.presentations.length} productos.`);
	for (const change of plan.presentations) {
		lines.push(
			`  #${change.productId} ${change.productName}: ${change.presentationContainer}${change.presentationSize ? ` ${change.presentationSize}` : ""}`,
		);
	}
	if (plan.uninferredPresentations.length > 0) {
		lines.push(
			`Sin presentación inferible (cargarla en el admin): ${plan.uninferredPresentations.length}.`,
		);
		for (const product of plan.uninferredPresentations) {
			lines.push(`  #${product.productId} ${product.productName}`);
		}
	}

	lines.push(
		`Descripciones: ${plan.descriptions.length} pierden "Presentación del proveedor".`,
	);
	for (const change of plan.descriptions) {
		const terms =
			change.supplierTermsIds.length > 0
				? `términos de proveedor ${change.supplierTermsIds.map((id) => `#${id}`).join(", ")}`
				: "términos de proveedor ya cargados";
		lines.push(
			`  #${change.productId} ${change.productName}: "${change.supplierPresentation}" → ${terms}; descripción "${show(change.after)}"`,
		);
	}

	if (plan.warnings.length > 0) {
		lines.push("Avisos:");
		for (const warning of plan.warnings) lines.push(`  - ${warning}`);
	}
	return lines;
}
