import { expect, test } from "vitest";
import { homeOfferTerms } from "~/features/cart/cart-mappers";
import type { HomeOffer } from "~/shared/common/home.types";
import {
	getMarketSavingLabel,
	getOfferBlockPrice,
	getOfferBlockStrikethroughPrice,
	getOfferDiscountLabel,
	getOfferFixedQuantityLabel,
	getOfferHeadlinePrice,
	getOfferInCartLabel,
	getOfferQuantityLabel,
	getOfferStrikethroughPrice,
	getOfferTotalLabel,
} from "./home-formatters";

const offer: HomeOffer = {
	productId: 3,
	productClientTermsId: 7,
	productName: "Arroz largo fino",
	productDescription: null,
	step: null,
	stepPrice: null,
	max: null,
	fromDate: new Date("2026-06-01"),
	toDate: null,
	unit: "kg",
	brandName: "Coco",
	imageUrl: null,
	moq: "10",
	moqPrice: "20000",
	unitPrice: "1500",
	marketPrice: null,
	discountPercent: null,
	currency: "ARS",
};

test("the headline uses the unit price when supplied and otherwise the MOQ block", () => {
	expect(getOfferHeadlinePrice(offer)).toEqual({
		amount: "$ 1.500",
		unitLabel: "por kg",
	});
	expect(getOfferHeadlinePrice({ ...offer, unitPrice: null })).toEqual({
		amount: "$ 20.000",
		unitLabel: "por 10 kg",
	});
});

test("discount and strike-through apply to the same headline basis", () => {
	const discounted = { ...offer, discountPercent: "25" };
	expect(getOfferHeadlinePrice(discounted).amount).toBe("$ 1.125");
	expect(getOfferStrikethroughPrice(discounted)).toBe("$ 1.500");
	expect(getOfferBlockPrice(discounted)).toBe("$ 15.000");
	expect(getOfferTotalLabel(homeOfferTerms(discounted), "10")).toBe(
		"Total $ 15.000",
	);
	expect(getOfferHeadlinePrice({ ...discounted, unitPrice: null }).amount).toBe(
		"$ 15.000",
	);
	expect(getOfferStrikethroughPrice({ ...discounted, unitPrice: null })).toBe(
		"$ 20.000",
	);
	expect(getOfferDiscountLabel(discounted)).toBe("-25%");
});

test("market saving is per unit and never a strike-through price", () => {
	const market = { ...offer, marketPrice: "2000" };
	expect(getMarketSavingLabel(market)).toBe("Ahorrás $ 500 por kg vs. góndola");
	expect(getMarketSavingLabel({ ...market, discountPercent: "25" })).toBe(
		"Ahorrás $ 875 por kg vs. góndola",
	);
	expect(getOfferStrikethroughPrice(market)).toBeNull();
	expect(getOfferDiscountLabel(market)).toBeNull();
});

test.each([
	null,
	"1200",
	"1500",
])("no savings are claimed without a better market comparison: %s", (marketPrice) => {
	expect(getMarketSavingLabel({ ...offer, marketPrice })).toBeNull();
});

test("prices and savings retain USD currency", () => {
	const dollars = {
		...offer,
		currency: "USD" as const,
		unitPrice: "10",
		moqPrice: "100",
		marketPrice: "15",
		discountPercent: "20",
	};
	expect(getOfferHeadlinePrice(dollars).amount).toBe("US$ 8,00");
	expect(getOfferStrikethroughPrice(dollars)).toBe("US$ 10,00");
	expect(getOfferTotalLabel(homeOfferTerms(dollars), "10")).toBe(
		"Total US$ 80,00",
	);
	expect(getMarketSavingLabel(dollars)).toBe(
		"Ahorrás US$ 7,00 por kg vs. góndola",
	);
});

test("discount labels normalize decimals and hide zero discounts", () => {
	expect(getOfferDiscountLabel({ ...offer, discountPercent: "25.00" })).toBe(
		"-25%",
	);
	expect(getOfferDiscountLabel({ ...offer, discountPercent: "12.50" })).toBe(
		"-12,5%",
	);
	expect(getOfferDiscountLabel({ ...offer, discountPercent: "0" })).toBeNull();
	expect(getOfferStrikethroughPrice(offer)).toBeNull();
});

test("catalog strike-through retains its MOQ price basis", () => {
	expect(
		getOfferBlockStrikethroughPrice({ ...offer, discountPercent: "25" }),
	).toBe("$ 20.000");
	expect(getOfferBlockStrikethroughPrice(offer)).toBeNull();
});

test("quantities use plural countable units", () => {
	expect(getOfferQuantityLabel("3", "box")).toBe("3 cajas");
	expect(getOfferQuantityLabel("1", "box")).toBe("1 caja");
	expect(getOfferQuantityLabel("12", "piece")).toBe("12 unidades");
	expect(getOfferQuantityLabel("2.5", "kg")).toBe("2,5 kg");
	expect(
		getOfferHeadlinePrice({
			...offer,
			moq: "3",
			unit: "piece",
			unitPrice: null,
		}).unitLabel,
	).toBe("por 3 unidades");
});

const stepped = { ...offer, step: "5", stepPrice: "9000", max: "20" };

test("the total follows the chosen quantity in steps above the MOQ", () => {
	const terms = homeOfferTerms(stepped);
	expect(getOfferTotalLabel(terms, "10")).toBe("Total $ 20.000");
	expect(getOfferTotalLabel(terms, "15")).toBe("Total $ 29.000");
	expect(getOfferTotalLabel(terms, "20")).toBe("Total $ 38.000");
	expect(
		getOfferTotalLabel(
			homeOfferTerms({ ...stepped, discountPercent: "10" }),
			"15",
		),
	).toBe("Total $ 26.100");
});

test("a fixed quantity states the only quantity and its total", () => {
	expect(
		getOfferFixedQuantityLabel(
			homeOfferTerms({ ...offer, moq: "12", unit: "piece" }),
			"piece",
		),
	).toBe("12 unidades · Total $ 20.000");
});

test("the in-cart notice names the quantity already in the order", () => {
	expect(getOfferInCartLabel("15", "kg")).toBe("Ya tenés 15 kg en tu pedido");
	expect(getOfferInCartLabel("1", "box")).toBe("Ya tenés 1 caja en tu pedido");
});
