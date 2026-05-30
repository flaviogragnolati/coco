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

export function getDisplayPrice(terms: CatalogClientTerms) {
	return terms.refPrice ?? terms.moqPrice;
}

export function getPriceLabel(
	terms: CatalogClientTerms,
	unit: CatalogProductUnit,
) {
	if (terms.refPrice) return `Precio ref. por ${productUnitLabelMap[unit]}`;
	return `Precio MOQ por ${formatQuantity(terms.moq, unit)}`;
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

export function calculateLineTotal(
	terms: CatalogClientTerms,
	quantity: string,
) {
	const moqPrice = toNumber(terms.moqPrice) ?? 0;
	const moq = toNumber(terms.moq) ?? 0;
	const step = toNumber(terms.step);
	const stepPrice = toNumber(terms.stepPrice);
	const quantityNumber =
		toNumber(normalizeCartQuantity(quantity, terms)) ?? moq;

	if (!step || step <= 0 || stepPrice === null || quantityNumber <= moq) {
		return toMoneyString(moqPrice);
	}

	const steps = Math.ceil((quantityNumber - moq - epsilon) / step);
	return toMoneyString(moqPrice + Math.max(0, steps) * stepPrice);
}
