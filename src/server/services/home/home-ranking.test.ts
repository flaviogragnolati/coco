import { expect, test } from "vitest";
import { type RankableHomeOffer, rankHomeOffers } from "./home-ranking";
import { offer } from "./home-test-fixtures";

function productIds(offers: RankableHomeOffer[]) {
	return offers.map((entry) => entry.productId);
}

test("offers sort by the market saving on the whole MOQ block", () => {
	const ranked = rankHomeOffers(
		[
			// 20 saved per unit over 10 kg
			offer({ productId: 1, moq: "10", unitPrice: "100", marketPrice: "120" }),
			// 6 saved per unit over 100 kg
			offer({ productId: 2, moq: "100", unitPrice: "100", marketPrice: "106" }),
			// 50 saved per unit over 10 kg
			offer({ productId: 3, moq: "10", unitPrice: "100", marketPrice: "150" }),
		],
		"marketSaving",
	);

	expect(productIds(ranked)).toEqual([2, 3, 1]);
});

test("the market saving is measured against the discounted unit price", () => {
	const ranked = rankHomeOffers(
		[
			offer({ productId: 1, moq: "10", unitPrice: "100", marketPrice: "120" }),
			offer({
				productId: 2,
				moq: "10",
				unitPrice: "110",
				marketPrice: "120",
				discountPercent: "50",
			}),
		],
		"marketSaving",
	);

	expect(productIds(ranked)).toEqual([2, 1]);
});

test("offers sort by discount percentage descending", () => {
	const ranked = rankHomeOffers(
		[
			offer({ productId: 1, discountPercent: "10" }),
			offer({ productId: 2, discountPercent: "45" }),
			offer({ productId: 3, discountPercent: "30" }),
		],
		"discountPercent",
	);

	expect(productIds(ranked)).toEqual([2, 3, 1]);
});

test("an offer without a market price ranks last under marketSaving", () => {
	const ranked = rankHomeOffers(
		[
			offer({ productId: 1 }),
			offer({ productId: 2, unitPrice: "100", marketPrice: "110" }),
			offer({ productId: 3, discountPercent: "80" }),
		],
		"marketSaving",
	);

	expect(productIds(ranked)).toEqual([2, 3, 1]);
});

test("a market price that fails to beat our own price ranks last", () => {
	const ranked = rankHomeOffers(
		[
			offer({ productId: 1, unitPrice: "100", marketPrice: "90" }),
			offer({ productId: 2, unitPrice: "100", marketPrice: "101" }),
		],
		"marketSaving",
	);

	expect(productIds(ranked)).toEqual([2, 1]);
});

test("an offer without a discount ranks last under discountPercent", () => {
	const ranked = rankHomeOffers(
		[
			offer({ productId: 1, unitPrice: "100", marketPrice: "500" }),
			offer({ productId: 2, discountPercent: "5" }),
		],
		"discountPercent",
	);

	expect(productIds(ranked)).toEqual([2, 1]);
});

test("offers sort by paid orders descending under orderVolume", () => {
	const ranked = rankHomeOffers(
		[
			offer({ productId: 1, paidOrderCount: 3 }),
			offer({ productId: 2, paidOrderCount: 12 }),
			offer({ productId: 3, paidOrderCount: 7 }),
		],
		"orderVolume",
	);

	expect(productIds(ranked)).toEqual([2, 3, 1]);
});

test("an offer without paid orders ranks last under orderVolume, by recency", () => {
	const ranked = rankHomeOffers(
		[
			offer({
				productId: 1,
				discountPercent: "80",
				fromDate: new Date("2026-05-01T00:00:00.000Z"),
			}),
			offer({
				productId: 2,
				fromDate: new Date("2026-06-01T00:00:00.000Z"),
			}),
			offer({ productId: 3, paidOrderCount: 1 }),
		],
		"orderVolume",
	);

	expect(productIds(ranked)).toEqual([3, 2, 1]);
});

test("offers the criterion cannot separate break the tie by fromDate then id", () => {
	const ranked = rankHomeOffers(
		[
			offer({
				productId: 1,
				productClientTermsId: 10,
				fromDate: new Date("2026-05-01T00:00:00.000Z"),
			}),
			offer({
				productId: 2,
				productClientTermsId: 20,
				fromDate: new Date("2026-06-01T00:00:00.000Z"),
			}),
			offer({
				productId: 3,
				productClientTermsId: 30,
				fromDate: new Date("2026-06-01T00:00:00.000Z"),
			}),
		],
		"marketSaving",
	);

	expect(productIds(ranked)).toEqual([3, 2, 1]);
});
