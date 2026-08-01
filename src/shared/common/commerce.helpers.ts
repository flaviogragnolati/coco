import type { CartSnapshot } from "./cart.types";
import type {
	CatalogClientTerms,
	CatalogCurrency,
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

export function formatQuantity(
	value: string | number,
	unit: CatalogProductUnit,
) {
	const amount = toNumber(value);
	const formatted =
		amount === null ? String(value) : quantityFormatter.format(amount);
	return `${formatted} ${productUnitLabelMap[unit]}`;
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

export function getOfferMoqPrice(
	terms: Pick<CatalogClientTerms, "moqPrice" | "discountPercent">,
): number {
	return (toNumber(terms.moqPrice) ?? 0) * getDiscountMultiplier(terms);
}

/**
 * Discounted alongside `moqPrice` and never on its own: discounting only the
 * MOQ block would make the marginal step cost more than the minimum, which is
 * not what any admin means by a percentage off (ADR 0008).
 */
export function getOfferStepPrice(
	terms: Pick<CatalogClientTerms, "stepPrice" | "discountPercent">,
): number | null {
	const stepPrice = toNumber(terms.stepPrice);
	if (stepPrice === null) return null;
	return stepPrice * getDiscountMultiplier(terms);
}

export function getDisplayPrice(terms: CatalogClientTerms) {
	return terms.unitPrice ?? terms.moqPrice;
}

export function getPriceLabel(
	terms: CatalogClientTerms,
	unit: CatalogProductUnit,
) {
	if (terms.unitPrice)
		return `Precio unitario por ${productUnitLabelMap[unit]}`;
	return `Precio MOQ por ${formatQuantity(terms.moq, unit)}`;
}

/**
 * Always the *offer* unit price: both branches apply the discount, so the
 * catalog can never advertise a number the cart will not charge.
 */
export function getPerUnitPrice(
	terms: Pick<
		CatalogClientTerms,
		"unitPrice" | "moqPrice" | "moq" | "discountPercent"
	>,
): number | null {
	const unitPrice = toNumber(terms.unitPrice);
	if (unitPrice !== null) return unitPrice * getDiscountMultiplier(terms);

	const moq = toNumber(terms.moq);
	if (toNumber(terms.moqPrice) === null || moq === null || moq <= 0)
		return null;
	return getOfferMoqPrice(terms) / moq;
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
 * Raised when the terms cannot price the quantity they themselves allow.
 * Callers must not fall back to a partial price: guessing here undercharges.
 */
export class PricingConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PricingConfigurationError";
	}
}

export function calculateLineTotal(
	terms: CatalogClientTerms,
	quantity: string,
) {
	const moqPrice = getOfferMoqPrice(terms);
	const moq = toNumber(terms.moq) ?? 0;
	const step = toNumber(terms.step);
	const stepPrice = getOfferStepPrice(terms);
	const quantityNumber =
		toNumber(normalizeCartQuantity(quantity, terms)) ?? moq;

	if (
		step &&
		step > 0 &&
		stepPrice === null &&
		quantityNumber > moq + epsilon
	) {
		throw new PricingConfigurationError(
			`Los términos definen un step (${step}) sin precio de step, por lo que no se puede calcular el total para la cantidad ${quantityNumber} (MOQ ${moq}).`,
		);
	}

	if (!step || step <= 0 || stepPrice === null || quantityNumber <= moq) {
		return toMoneyString(moqPrice);
	}

	const steps = Math.ceil((quantityNumber - moq - epsilon) / step);
	return toMoneyString(moqPrice + Math.max(0, steps) * stepPrice);
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
