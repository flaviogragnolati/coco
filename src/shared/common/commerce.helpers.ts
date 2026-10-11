import type { CartSnapshot } from "./cart.types";
import type {
	CatalogClientTerms,
	CatalogCurrency,
	CatalogProductPresentationContainer,
	CatalogProductUnit,
} from "./catalog.types";

export const productUnitLabelMap: Record<CatalogProductUnit, string> = {
	box: "caja",
	gr: "gr",
	kg: "kg",
	lb: "lb",
	other: "unidad",
	piece: "unidad",
};

type CountNoun = { one: string; other: string };

const countableUnitNouns: Partial<Record<CatalogProductUnit, CountNoun>> = {
	box: { one: "caja", other: "cajas" },
	other: { one: "unidad", other: "unidades" },
	piece: { one: "unidad", other: "unidades" },
};

export const productPresentationContainerLabelMap: Record<
	CatalogProductPresentationContainer,
	CountNoun
> = {
	botella: { one: "botella", other: "botellas" },
	bidon: { one: "bidón", other: "bidones" },
	frasco: { one: "frasco", other: "frascos" },
	bolsa: { one: "bolsa", other: "bolsas" },
	paquete: { one: "paquete", other: "paquetes" },
	unidad: { one: "unidad", other: "unidades" },
};

/**
 * The package a customer buys, as stored on the product and copied into the
 * order snapshot. Old snapshots lack both fields, hence optional.
 */
export type ProductPresentation = {
	presentationContainer?: CatalogProductPresentationContainer | null;
	presentationSize?: string | null;
};

/** Sold by weight: these never carry a presentation. */
export function isWeightUnit(unit: CatalogProductUnit) {
	return unit === "kg" || unit === "gr" || unit === "lb";
}

const quantityFormatter = new Intl.NumberFormat("es-AR", {
	maximumFractionDigits: 4,
	minimumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
	maximumFractionDigits: 4,
	minimumFractionDigits: 0,
	useGrouping: false,
});

const moneyValueFormatter = new Intl.NumberFormat("en-US", {
	maximumFractionDigits: 2,
	minimumFractionDigits: 2,
	useGrouping: false,
});

const epsilon = 0.0000001;

export function toNumber(value: string | number | null | undefined) {
	if (value === null || value === undefined || value === "") return null;
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function formatCurrency(
	value: string | number,
	currency: CatalogCurrency,
) {
	const amount = toNumber(value);
	if (amount === null) return `${currency} ${value}`;

	return new Intl.NumberFormat("es-AR", {
		currency,
		maximumFractionDigits: currency === "ARS" ? 0 : 2,
		style: "currency",
	}).format(amount);
}

/**
 * The noun a quantity is counted in, agreeing with it in number: "kg",
 * "frasco 370 g" / "frascos 370 g", "unidad" / "unidades". A presentation
 * replaces the unit noun, except on weight units, which never carry one.
 */
export function formatUnitLabel(
	quantity: string | number,
	unit: CatalogProductUnit,
	presentation?: ProductPresentation | null,
) {
	const amount = toNumber(quantity);
	const form =
		amount !== null && Math.abs(amount - 1) < epsilon ? "one" : "other";
	const container = isWeightUnit(unit)
		? null
		: presentation?.presentationContainer;

	if (container) {
		const noun = productPresentationContainerLabelMap[container][form];
		const size = presentation?.presentationSize?.trim();
		return size ? `${noun} ${size}` : noun;
	}

	return countableUnitNouns[unit]?.[form] ?? productUnitLabelMap[unit];
}

export function formatQuantity(
	value: string | number,
	unit: CatalogProductUnit,
	presentation?: ProductPresentation | null,
) {
	const amount = toNumber(value);
	const formatted =
		amount === null ? String(value) : quantityFormatter.format(amount);
	return `${formatted} ${formatUnitLabel(value, unit, presentation)}`;
}

export function toQuantityString(value: number) {
	return decimalFormatter.format(Number(value.toFixed(4)));
}

export function toMoneyString(value: number) {
	return moneyValueFormatter.format(Number(value.toFixed(2)));
}

/**
 * Picks the image a product should render with. The two contexts genuinely
 * disagree on precedence, so it is a required argument: two of the call sites
 * feed the persisted `productSnapshot` JSON, where a silent flip would diverge
 * new rows from existing ones.
 */
export function selectProductImage(
	product: { cardImageUrl: string | null; cartImageUrl: string | null },
	context: "cart" | "catalog",
) {
	return context === "cart"
		? (product.cartImageUrl ?? product.cardImageUrl)
		: (product.cardImageUrl ?? product.cartImageUrl);
}

type DiscountableTerms = Pick<CatalogClientTerms, "discountPercent">;

/**
 * The single interpretation of `discountPercent`. Clamped so a malformed or
 * out-of-range value can only ever make the offer *less* aggressive, never
 * negative and never above the full price.
 */
function getDiscountMultiplier(terms: DiscountableTerms) {
	const percent = toNumber(terms.discountPercent);
	if (percent === null) return 1;
	return 1 - Math.min(Math.max(percent, 0), 100) / 100;
}

/**
 * The charged price per unit, before any discount. Legacy terms saved before
 * the unit price became the only price the admin enters may lack it; for those
 * the minimum block stands in (`moqPrice / moq`), which is exactly what the
 * minimum always cost.
 */
export function getBaseUnitPrice(
	terms: Pick<CatalogClientTerms, "unitPrice" | "moqPrice" | "moq">,
): number | null {
	const unitPrice = toNumber(terms.unitPrice);
	if (unitPrice !== null) return unitPrice;

	const moq = toNumber(terms.moq);
	const moqPrice = toNumber(terms.moqPrice);
	if (moqPrice === null || moq === null || moq <= 0) return null;
	return moqPrice / moq;
}

/**
 * Always the *offer* unit price: the discount comes off the one price every
 * total is built from, so the catalog can never advertise a number the cart
 * will not charge (ADR 0008).
 */
export function getPerUnitPrice(
	terms: Pick<
		CatalogClientTerms,
		"unitPrice" | "moqPrice" | "moq" | "discountPercent"
	>,
): number | null {
	const unitPrice = getBaseUnitPrice(terms);
	if (unitPrice === null) return null;
	return unitPrice * getDiscountMultiplier(terms);
}

/** What the minimum quantity costs at the offer price. */
export function getOfferMoqPrice(
	terms: Pick<
		CatalogClientTerms,
		"unitPrice" | "moqPrice" | "moq" | "discountPercent"
	>,
): number {
	return (getPerUnitPrice(terms) ?? 0) * (toNumber(terms.moq) ?? 0);
}

/**
 * What the customer saves against what other shops charge. `marketPrice` is an
 * unverified admin claim, so this returns `null` rather than a negative saving
 * whenever it fails to beat our own price — a "saving" of less than nothing is
 * not a fact worth rendering.
 */
export function getMarketSaving(
	terms: Pick<
		CatalogClientTerms,
		"unitPrice" | "moqPrice" | "moq" | "discountPercent" | "marketPrice"
	>,
): { perUnit: number; perBlock: number; percent: number } | null {
	const marketPrice = toNumber(terms.marketPrice);
	const offerUnitPrice = getPerUnitPrice(terms);
	if (
		marketPrice === null ||
		marketPrice <= 0 ||
		offerUnitPrice === null ||
		marketPrice <= offerUnitPrice
	)
		return null;

	const perUnit = marketPrice - offerUnitPrice;
	const moq = toNumber(terms.moq) ?? 0;
	return {
		perUnit,
		perBlock: perUnit * moq,
		percent: (perUnit / marketPrice) * 100,
	};
}

function getMaxValidQuantity(terms: CatalogClientTerms) {
	const moq = toNumber(terms.moq) ?? 0;
	const step = toNumber(terms.step);
	const max = toNumber(terms.max);

	if (max === null) return null;
	if (!step || step <= 0 || max <= moq) return max;

	const steps = Math.floor((max - moq + epsilon) / step);
	return moq + steps * step;
}

export function normalizeCartQuantity(
	quantity: string | number,
	terms: CatalogClientTerms,
) {
	const moq = toNumber(terms.moq) ?? 0;
	const step = toNumber(terms.step);
	const maxValid = getMaxValidQuantity(terms);
	const requested = toNumber(quantity) ?? moq;

	let next = Math.max(requested, moq);

	if (!step || step <= 0) {
		next = moq;
	} else if (next > moq) {
		const steps = Math.ceil((next - moq - epsilon) / step);
		next = moq + Math.max(0, steps) * step;
	}

	if (maxValid !== null && next > maxValid) {
		next = maxValid;
	}

	return toQuantityString(next);
}

export function quantitiesEqual(left: string | number, right: string | number) {
	const leftNumber = toNumber(left);
	const rightNumber = toNumber(right);

	if (leftNumber === null || rightNumber === null)
		return String(left) === String(right);
	return Math.abs(leftNumber - rightNumber) < epsilon;
}

export function getNextQuantity(quantity: string, terms: CatalogClientTerms) {
	const moq = toNumber(terms.moq) ?? 0;
	const current = toNumber(quantity) ?? moq;
	const step = toNumber(terms.step);
	const next = step && step > 0 ? current + step : moq;
	return normalizeCartQuantity(next, terms);
}

export function getPreviousQuantity(
	quantity: string,
	terms: CatalogClientTerms,
) {
	const moq = toNumber(terms.moq) ?? 0;
	const current = toNumber(quantity) ?? moq;
	const step = toNumber(terms.step);
	const previous = step && step > 0 ? current - step : moq;
	return normalizeCartQuantity(Math.max(previous, moq), terms);
}

export function canIncrementQuantity(
	quantity: string,
	terms: CatalogClientTerms,
) {
	const current = toNumber(quantity);
	const next = toNumber(getNextQuantity(quantity, terms));
	return current !== null && next !== null && next > current + epsilon;
}

export function canDecrementQuantity(
	quantity: string,
	terms: CatalogClientTerms,
) {
	const current = toNumber(quantity);
	const previous = toNumber(getPreviousQuantity(quantity, terms));
	return current !== null && previous !== null && previous < current - epsilon;
}

/**
 * The MOQ is the only quantity the terms allow: no step, or a max that leaves
 * no step above the MOQ.
 */
export function isFixedQuantity(terms: CatalogClientTerms) {
	return !canIncrementQuantity(normalizeCartQuantity(terms.moq, terms), terms);
}

/**
 * Raised when the terms carry no price the quantity can be multiplied by.
 * Callers must not fall back to a partial price: guessing here undercharges.
 */
export class PricingConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PricingConfigurationError";
	}
}

/**
 * Offer unit price × the normalized quantity. The quantity is normalized first,
 * so a total is only ever quoted for a quantity the terms allow.
 */
export function calculateLineTotal(
	terms: CatalogClientTerms,
	quantity: string,
) {
	const unitPrice = getPerUnitPrice(terms);
	if (unitPrice === null) {
		throw new PricingConfigurationError(
			`Los términos #${terms.id} no tienen precio por unidad ni un precio de mínimo del que derivarlo.`,
		);
	}

	const quantityNumber =
		toNumber(normalizeCartQuantity(quantity, terms)) ??
		toNumber(terms.moq) ??
		0;
	return toMoneyString(unitPrice * quantityNumber);
}

// Callers own item ordering: the store sorts by name for display, while the
// services rely on the Prisma `orderBy` that produced the rows.
export function buildCartSnapshot(
	items: CartSnapshot["items"],
	meta: Pick<CartSnapshot, "id" | "code" | "status">,
): CartSnapshot {
	const totalsByCurrency = new Map<CatalogCurrency, number>();

	for (const item of items) {
		totalsByCurrency.set(
			item.terms.currency,
			(totalsByCurrency.get(item.terms.currency) ?? 0) +
				(toNumber(item.lineTotal) ?? 0),
		);
	}

	return {
		id: meta.id,
		code: meta.code,
		status: meta.status,
		items,
		itemCount: items.length,
		totals: Array.from(totalsByCurrency.entries()).map(
			([currency, amount]) => ({
				currency,
				amount: toMoneyString(amount),
			}),
		),
	};
}
