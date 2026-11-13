import { expect, test } from "vitest";
import { homeOfferTerms } from "~/features/cart/cart-mappers";
import type { HomeOffer } from "~/shared/common/home.types";
import {
	formatComboForPeople,
	formatComboItemQuantity,
	formatPeopleLabel,
	getMarketSavingLabel,
	getOfferComparisonPrice,
	getOfferDiscountLabel,
	getOfferFixedQuantityLabel,
	getOfferHeadlinePrice,
	getOfferInCartLabel,
	getOfferQuantityLabel,
	getOfferStepLabel,
	getOfferStrikethroughPrice,
	getOfferTotalAmount,
	getOfferTotalLabel,
	selectComboMosaicImages,
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
	presentationContainer: null,
	presentationSize: null,
	brandName: "Coco",
	imageUrl: null,
	photoBackgroundColor: null,
	moq: "10",
	moqPrice: "15000",
	unitPrice: "1500",
	marketPrice: null,
	discountPercent: null,
	currency: "ARS",
};

const halfKilos = { ...offer, moq: "0.5", step: "0.5", unitPrice: "22600" };

test("the headline is the step price, labelled by the step it buys", () => {
	expect(getOfferHeadlinePrice(halfKilos)).toEqual({
		amount: "$ 11.300",
		unitLabel: "por 500 g",
	});
	expect(getOfferHeadlinePrice({ ...offer, step: "1" })).toEqual({
		amount: "$ 1.500",
		unitLabel: "por kg",
	});
	expect(
		getOfferHeadlinePrice({
			...offer,
			step: "1",
			unitPrice: null,
			moqPrice: "20000",
		}),
	).toEqual({ amount: "$ 2.000", unitLabel: "por kg" });
});

test.each([
	["a quarter kilo in grams", { unit: "kg", step: "0.25" }, "por 250 g"],
	["one kilo", { unit: "kg", step: "1" }, "por kg"],
	["more than a kilo", { unit: "kg", step: "1.5" }, "por 1,5 kg"],
	["grams as sold", { unit: "gr", step: "250" }, "por 250 gr"],
	[
		"one jar",
		{
			unit: "piece",
			step: "1",
			presentationContainer: "frasco",
			presentationSize: "370 g",
		},
		"por frasco",
	],
	[
		"one jug",
		{
			unit: "piece",
			step: "1",
			presentationContainer: "bidon",
			presentationSize: "5 L",
		},
		"por bidón",
	],
	[
		"several jars",
		{
			unit: "piece",
			step: "6",
			presentationContainer: "frasco",
			presentationSize: "370 g",
		},
		"por 6 frascos",
	],
	[
		"no step falls back to the fixed minimum",
		{
			unit: "piece",
			step: null,
			moq: "6",
			presentationContainer: "frasco",
			presentationSize: "370 g",
		},
		"por 6 frascos",
	],
] as const)("getOfferStepLabel: %s", (_name, overrides, expected) => {
	expect(getOfferStepLabel({ ...offer, ...overrides })).toBe(expected);
});

test("the comparison price is per kg or litre, and shown even when it equals the step", () => {
	expect(getOfferComparisonPrice(halfKilos)).toEqual({
		amount: "$ 22.600",
		measureLabel: "/ kg",
		spokenLabel: "por kg",
	});
	expect(getOfferComparisonPrice({ ...halfKilos, step: "1" })).toEqual({
		amount: "$ 22.600",
		measureLabel: "/ kg",
		spokenLabel: "por kg",
	});
	expect(
		getOfferComparisonPrice({
			...offer,
			unit: "piece",
			step: "1",
			unitPrice: "16900",
			presentationContainer: "botella",
			presentationSize: "0,5 L",
		}),
	).toEqual({
		amount: "$ 33.800",
		measureLabel: "/ L",
		spokenLabel: "por litro",
	});
	expect(
		getOfferComparisonPrice({
			...offer,
			unit: "piece",
			step: "1",
			presentationContainer: "botella",
			presentationSize: "1 L",
		}),
	).toEqual({
		amount: "$ 1.500",
		measureLabel: "/ L",
		spokenLabel: "por litro",
	});
});

test("discount and strike-through apply to the same step basis", () => {
	const discounted = { ...halfKilos, discountPercent: "20" };
	expect(getOfferHeadlinePrice(discounted).amount).toBe("$ 9.040");
	expect(getOfferStrikethroughPrice(discounted)).toBe("$ 11.300");
	expect(getOfferComparisonPrice(discounted)?.amount).toBe("$ 18.080");
	expect(getOfferDiscountLabel(discounted)).toBe("-20%");

	const tens = { ...offer, discountPercent: "25" };
	expect(getOfferTotalLabel(homeOfferTerms(tens), "10")).toBe("Total $ 11.250");
	const legacy = { ...tens, step: "1", unitPrice: null, moqPrice: "20000" };
	expect(getOfferHeadlinePrice(legacy).amount).toBe("$ 1.500");
	expect(getOfferStrikethroughPrice(legacy)).toBe("$ 2.000");
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
		step: "1",
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

test("quantities use plural countable units", () => {
	expect(getOfferQuantityLabel("3", "box")).toBe("3 cajas");
	expect(getOfferQuantityLabel("1", "box")).toBe("1 caja");
	expect(getOfferQuantityLabel("12", "piece")).toBe("12 unidades");
	expect(getOfferQuantityLabel("2.5", "kg")).toBe("2,5 kg");
	expect(
		getOfferHeadlinePrice({
			...offer,
			moq: "3",
			step: "1",
			unit: "piece",
			unitPrice: null,
		}).unitLabel,
	).toBe("por unidad");
});

const stepped = { ...offer, step: "5", stepPrice: "7500", max: "20" };

test("the total is the unit price times the chosen quantity", () => {
	const terms = homeOfferTerms(stepped);
	expect(getOfferTotalLabel(terms, "10")).toBe("Total $ 15.000");
	expect(getOfferTotalLabel(terms, "15")).toBe("Total $ 22.500");
	expect(getOfferTotalLabel(terms, "20")).toBe("Total $ 30.000");
	expect(
		getOfferTotalLabel(
			homeOfferTerms({ ...stepped, discountPercent: "10" }),
			"15",
		),
	).toBe("Total $ 20.250");
});

test("half kilos total at the unit price", () => {
	const halves = homeOfferTerms({
		...offer,
		moq: "0.5",
		step: "0.5",
		unitPrice: "19500",
	});
	expect(getOfferTotalLabel(halves, "1.5")).toBe("Total $ 29.250");
});

test("the total amount is the formatted line total", () => {
	expect(getOfferTotalAmount(homeOfferTerms(stepped), "15")).toBe("$ 22.500");
});

test("a fixed quantity states only the quantity", () => {
	expect(
		getOfferFixedQuantityLabel(
			homeOfferTerms({ ...offer, moq: "12", unit: "piece" }),
			"piece",
		),
	).toBe("12 unidades");
});

test("the in-cart notice names the quantity already in the order", () => {
	expect(getOfferInCartLabel("15", "kg")).toBe("Ya tenés 15 kg en tu pedido");
	expect(getOfferInCartLabel("1", "box")).toBe("Ya tenés 1 caja en tu pedido");
});

test("the people label agrees in number", () => {
	expect(formatPeopleLabel(1)).toBe("1 persona");
	expect(formatPeopleLabel(2)).toBe("2 personas");
	expect(formatComboForPeople(1)).toBe("Para 1 persona");
	expect(formatComboForPeople(2)).toBe("Para 2 personas");
});

test("a combo product's quantity names the kilo or the container, without its size", () => {
	expect(
		formatComboItemQuantity({ offer, quantity: "0.5", lineTotal: "750.00" }),
	).toBe("0,5 kg");
	const jar = {
		...offer,
		unit: "piece" as const,
		presentationContainer: "frasco" as const,
		presentationSize: "370 g",
	};
	expect(
		formatComboItemQuantity({ offer: jar, quantity: "1", lineTotal: "1.00" }),
	).toBe("1 frasco");
	expect(
		formatComboItemQuantity({ offer: jar, quantity: "2", lineTotal: "2.00" }),
	).toBe("2 frascos");
});

test("the combo mosaic takes the first four photos and skips products without one", () => {
	const items = [null, "a.jpg", "b.jpg", null, "c.jpg", "d.jpg", "e.jpg"].map(
		(imageUrl, index) => ({
			offer: {
				...offer,
				imageUrl,
				productName: `P${index}`,
				photoBackgroundColor: index === 1 ? "#e2c8ab" : null,
			},
			quantity: "1",
			lineTotal: "1.00",
		}),
	);

	expect(selectComboMosaicImages(items)).toEqual([
		{ url: "a.jpg", name: "P1", photoBackgroundColor: "#e2c8ab" },
		{ url: "b.jpg", name: "P2", photoBackgroundColor: null },
		{ url: "c.jpg", name: "P4", photoBackgroundColor: null },
		{ url: "d.jpg", name: "P5", photoBackgroundColor: null },
	]);
});
