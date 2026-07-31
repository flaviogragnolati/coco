import { expect, test } from "vitest";
import {
	composeHomeContent,
	type HomeOfferCuration,
	type RankableHomeOffer,
	rankHomeOffers,
} from "./home-ranking";

const defaultFromDate = new Date("2026-06-01T00:00:00.000Z");

function offer(
	input: Partial<RankableHomeOffer> & { productId: number },
): RankableHomeOffer {
	return {
		productId: input.productId,
		productClientTermsId: input.productClientTermsId ?? input.productId,
		productName: input.productName ?? `Producto ${input.productId}`,
		unit: input.unit ?? "kg",
		brandName: input.brandName ?? null,
		imageUrl: input.imageUrl ?? null,
		moq: input.moq ?? "10",
		moqPrice: input.moqPrice ?? "1000",
		unitPrice: input.unitPrice ?? null,
		marketPrice: input.marketPrice ?? null,
		discountPercent: input.discountPercent ?? null,
		currency: input.currency ?? "ARS",
		homeOfferRank: input.homeOfferRank ?? null,
		fromDate: input.fromDate ?? defaultFromDate,
	};
}

function curation(input: Partial<HomeOfferCuration> = {}): HomeOfferCuration {
	return {
		spotlightProductId: input.spotlightProductId ?? null,
		criterion: input.criterion ?? "marketSaving",
		offersLimit: input.offersLimit ?? 4,
	};
}

function productIds(offers: RankableHomeOffer[]) {
	return offers.map((entry) => entry.productId);
}

test("pinned offers come first, in ascending rank order", () => {
	const ranked = rankHomeOffers(
		[
			offer({ productId: 1, marketPrice: "500" }),
			offer({ productId: 2, homeOfferRank: 2 }),
			offer({ productId: 3, homeOfferRank: 1 }),
		],
		"marketSaving",
	);

	expect(productIds(ranked)).toEqual([3, 2, 1]);
});

test("unpinned offers sort by the market saving on the whole MOQ block", () => {
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

test("unpinned offers sort by discount percentage descending", () => {
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

test("the spotlight is resolved from the curation and excluded from the grid", () => {
	const content = composeHomeContent(
		[
			offer({ productId: 1, unitPrice: "100", marketPrice: "500" }),
			offer({ productId: 2 }),
			offer({ productId: 3 }),
		],
		curation({ spotlightProductId: 2 }),
	);

	expect(content.spotlight?.productId).toBe(2);
	expect(productIds(content.offers)).toEqual([1, 3]);
});

test("a spotlight without current terms falls back to the top of the ranking", () => {
	const content = composeHomeContent(
		[
			offer({ productId: 1, unitPrice: "100", marketPrice: "110" }),
			offer({ productId: 2, unitPrice: "100", marketPrice: "500" }),
		],
		curation({ spotlightProductId: 99 }),
	);

	expect(content.spotlight?.productId).toBe(2);
	expect(productIds(content.offers)).toEqual([1]);
});

test("a product with two current terms rows appears once", () => {
	const content = composeHomeContent(
		[
			offer({ productId: 1, productClientTermsId: 11 }),
			offer({ productId: 1, productClientTermsId: 12 }),
			offer({ productId: 2, productClientTermsId: 21 }),
		],
		curation({ spotlightProductId: 1 }),
	);

	expect(content.spotlight?.productClientTermsId).toBe(11);
	expect(productIds(content.offers)).toEqual([2]);
});

test("the grid is truncated to the configured limit", () => {
	const content = composeHomeContent(
		[1, 2, 3, 4, 5].map((productId) => offer({ productId })),
		curation({ offersLimit: 2 }),
	);

	expect(content.offers).toHaveLength(2);
});

test("no current offers leaves the hero and the grid empty", () => {
	const content = composeHomeContent([], curation());

	expect(content.spotlight).toBeNull();
	expect(content.offers).toEqual([]);
});
