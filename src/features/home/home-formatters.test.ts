import { expect, test } from "vitest";
import type { HomeOffer } from "~/shared/common/home.types";
import {
	getMarketSavingLabel,
	getOfferBlockPrice,
	getOfferBlockStrikethroughPrice,
	getOfferDiscountLabel,
	getOfferHeadlinePrice,
	getOfferMinimumLabel,
	getOfferMinimumTotal,
	getOfferStrikethroughPrice,
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
	expect(getOfferMinimumLabel(offer)).toBe("Mínimo: 10 kg");
	expect(getOfferMinimumTotal(offer)).toBe("Total del mínimo: $ 20.000");
});

test("discount and strike-through apply to the same headline basis", () => {
	const discounted = { ...offer, discountPercent: "25" };
	expect(getOfferHeadlinePrice(discounted).amount).toBe("$ 1.125");
	expect(getOfferStrikethroughPrice(discounted)).toBe("$ 1.500");
	expect(getOfferBlockPrice(discounted)).toBe("$ 15.000");
	expect(getOfferMinimumTotal(discounted)).toBe("Total del mínimo: $ 15.000");
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
	expect(getOfferMinimumTotal(dollars)).toBe("Total del mínimo: US$ 80,00");
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

test("minimum quantities use plural countable units", () => {
	expect(getOfferMinimumLabel({ ...offer, moq: "3", unit: "box" })).toBe(
		"Mínimo: 3 cajas",
	);
	expect(getOfferMinimumLabel({ ...offer, moq: "1", unit: "box" })).toBe(
		"Mínimo: 1 caja",
	);
	expect(
		getOfferHeadlinePrice({
			...offer,
			moq: "3",
			unit: "piece",
			unitPrice: null,
		}).unitLabel,
	).toBe("por 3 unidades");
});
