import { expect, test } from "vitest";

import type { HomeOffer } from "~/shared/common/home.types";
import {
	getMarketComparison,
	getOfferBlockPrice,
	getOfferDiscountLabel,
	getOfferMinimumLabel,
	getOfferStrikethroughPrice,
	getOfferUnitReference,
} from "./home-formatters";

const offer: HomeOffer = {
	productId: 3,
	productClientTermsId: 7,
	productName: "Arroz largo fino",
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

const discountedOffer: HomeOffer = { ...offer, discountPercent: "25" };
const marketOffer: HomeOffer = { ...offer, marketPrice: "2000" };
const discountedMarketOffer: HomeOffer = {
	...offer,
	discountPercent: "25",
	marketPrice: "2000",
};

test("the offer headline always uses the minimum block price", () => {
	expect(getOfferBlockPrice(offer)).toBe("$ 20.000");
});

test("the offer exposes the minimum quantity in plain language", () => {
	expect(getOfferMinimumLabel(offer)).toBe("Cantidad mínima: 10 kg");
});

test("the offer keeps the per-unit price as a secondary reference", () => {
	expect(getOfferUnitReference(offer)).toBe("≈ $ 1.500 / kg");
	expect(
		getOfferUnitReference({ ...offer, unitPrice: null, moqPrice: "20000" }),
	).toBe("≈ $ 2.000 / kg");
});

test("an offer without discount nor market price renders neither treatment", () => {
	expect(getOfferStrikethroughPrice(offer)).toBeNull();
	expect(getOfferDiscountLabel(offer)).toBeNull();
	expect(getMarketComparison(offer)).toBeNull();
});

test("a discount lowers the headline and exposes the previous price", () => {
	expect(getOfferBlockPrice(discountedOffer)).toBe("$ 15.000");
	expect(getOfferStrikethroughPrice(discountedOffer)).toBe("$ 20.000");
	expect(getOfferDiscountLabel(discountedOffer)).toBe("-25%");
	expect(getOfferUnitReference(discountedOffer)).toBe("≈ $ 1.125 / kg");
	expect(getMarketComparison(discountedOffer)).toBeNull();
});

test("a market price renders its own comparison and no strikethrough", () => {
	expect(getMarketComparison(marketOffer)).toBe(
		"En otros comercios ≈ $ 2.000 / kg · ahorrás $ 5.000",
	);
	expect(getOfferStrikethroughPrice(marketOffer)).toBeNull();
	expect(getOfferDiscountLabel(marketOffer)).toBeNull();
	expect(getOfferBlockPrice(marketOffer)).toBe("$ 20.000");
});

test("a discount and a market price render side by side", () => {
	expect(getOfferStrikethroughPrice(discountedMarketOffer)).toBe("$ 20.000");
	expect(getOfferDiscountLabel(discountedMarketOffer)).toBe("-25%");
	expect(getMarketComparison(discountedMarketOffer)).toBe(
		"En otros comercios ≈ $ 2.000 / kg · ahorrás $ 8.750",
	);
});

test("a market price that does not beat ours is never advertised", () => {
	expect(getMarketComparison({ ...offer, marketPrice: "1200" })).toBeNull();
});

test("the discount label drops the decimals a Decimal(5,2) column carries", () => {
	expect(getOfferDiscountLabel({ ...offer, discountPercent: "25.00" })).toBe(
		"-25%",
	);
	expect(getOfferDiscountLabel({ ...offer, discountPercent: "12.50" })).toBe(
		"-12,5%",
	);
	expect(getOfferDiscountLabel({ ...offer, discountPercent: "0" })).toBeNull();
});
