import { expect, test } from "vitest";

import type { HomeOffer } from "~/shared/common/home.types";
import {
	getOfferBlockPrice,
	getOfferMinimumLabel,
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
	refPrice: "1500",
	currency: "ARS",
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
		getOfferUnitReference({ ...offer, refPrice: null, moqPrice: "20000" }),
	).toBe("≈ $ 2.000 / kg");
});
