import type {
	HomeCurrency,
	HomeOffer,
	HomeProductUnit,
} from "~/shared/common/home.types";

export const productUnitLabelMap: Record<HomeProductUnit, string> = {
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

function toNumber(value: string) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function formatCurrency(value: string, currency: HomeCurrency) {
	const amount = toNumber(value);
	if (amount === null) return `${currency} ${value}`;

	return new Intl.NumberFormat("es-AR", {
		currency,
		maximumFractionDigits: currency === "ARS" ? 0 : 2,
		style: "currency",
	}).format(amount);
}

export function formatQuantity(value: string, unit: HomeProductUnit) {
	const amount = toNumber(value);
	const formatted = amount === null ? value : quantityFormatter.format(amount);
	return `${formatted} ${productUnitLabelMap[unit]}`;
}

export function getOfferDisplayPrice(offer: HomeOffer) {
	return formatCurrency(offer.refPrice ?? offer.moqPrice, offer.currency);
}

export function getOfferPriceLabel(offer: HomeOffer) {
	if (offer.refPrice)
		return `Precio ref. por ${productUnitLabelMap[offer.unit]}`;
	return `Precio MOQ por ${formatQuantity(offer.moq, offer.unit)}`;
}
