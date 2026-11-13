import { describe, expect, test } from "vitest";
import {
	type ComposedHomeFeature,
	composeHomeFeatured,
	type HomeComboRecord,
	type HomeFeaturedCuration,
	normalizeComboGroup,
} from "./home-featured";
import { offer } from "./home-test-fixtures";

function curation(
	input: Partial<HomeFeaturedCuration> = {},
): HomeFeaturedCuration {
	return {
		spotlight: input.spotlight ?? null,
		criterion: input.criterion ?? "orderVolume",
		featuredLimit: input.featuredLimit ?? 4,
		fillWithRanking: input.fillWithRanking ?? true,
		list: input.list ?? [],
	};
}

function combo(
	input: Partial<HomeComboRecord> & {
		id: number;
		products: [productId: number, quantity: string][];
	},
): HomeComboRecord {
	return {
		id: input.id,
		name: input.name ?? `Combo ${input.id}`,
		description: input.description ?? null,
		people: input.people ?? null,
		groupName: input.groupName ?? null,
		items: input.products.map(([productId, quantity]) => ({
			productId,
			productName: `Producto ${productId}`,
			quantity,
		})),
	};
}

const product = (productId: number) => ({
	kind: "product" as const,
	productId,
});
const comboTarget = (comboId: number) => ({ kind: "combo" as const, comboId });

function describeFeature(feature: ComposedHomeFeature | null) {
	if (!feature) return null;
	return feature.kind === "product"
		? `product ${feature.offer.productId}`
		: `combo ${feature.combo.options.map((option) => option.comboId).join("+")}`;
}

// Ranked by paid orders: 1 is the top of the ranking, 6 the bottom.
const offers = [1, 2, 3, 4, 5, 6].map((productId) =>
	offer({ productId, paidOrderCount: 10 - productId }),
);

describe("composeHomeFeatured", () => {
	test("the list keeps its order and mixes combos and products", () => {
		const content = composeHomeFeatured(
			offers,
			[combo({ id: 7, products: [[1, "10"]] })],
			curation({ list: [product(5), comboTarget(7), product(4)] }),
		);

		expect(content.featured.map(describeFeature)).toEqual([
			"product 5",
			"combo 7",
			"product 4",
			"product 2",
		]);
		expect(content.featured.map((feature) => feature.source)).toEqual([
			"list",
			"list",
			"list",
			"ranking",
		]);
	});

	test("the ranking fills up to the limit without repeating the list", () => {
		const content = composeHomeFeatured(
			offers,
			[],
			curation({ list: [product(2)], featuredLimit: 3 }),
		);

		expect(describeFeature(content.spotlight)).toBe("product 1");
		expect(content.featured.map(describeFeature)).toEqual([
			"product 2",
			"product 3",
			"product 4",
		]);
	});

	test("with the ranking off only the list shows, and no band unless chosen", () => {
		const content = composeHomeFeatured(
			offers,
			[],
			curation({ list: [product(6)], fillWithRanking: false }),
		);

		expect(content.spotlight).toBeNull();
		expect(content.featured.map(describeFeature)).toEqual(["product 6"]);
	});

	test("with the ranking off and an empty list the section is empty", () => {
		const content = composeHomeFeatured(
			offers,
			[],
			curation({ fillWithRanking: false }),
		);

		expect(content).toEqual({ spotlight: null, featured: [] });
	});

	test("a listed product without current terms is skipped and the ranking takes its place", () => {
		const content = composeHomeFeatured(
			offers,
			[],
			curation({ list: [product(99), product(5)], featuredLimit: 2 }),
		);

		expect(content.featured.map(describeFeature)).toEqual([
			"product 5",
			"product 2",
		]);
	});

	test("a product with two current terms rows appears once", () => {
		const content = composeHomeFeatured(
			[
				offer({ productId: 1, productClientTermsId: 11 }),
				offer({ productId: 1, productClientTermsId: 12 }),
				offer({ productId: 2, productClientTermsId: 21 }),
			],
			[],
			curation({ spotlight: product(1) }),
		);

		expect(
			content.spotlight?.kind === "product" &&
				content.spotlight.offer.productClientTermsId,
		).toBe(11);
		expect(content.featured.map(describeFeature)).toEqual(["product 2"]);
	});

	describe("combos", () => {
		test("a combo shows only its available products, names the rest and sums the shown ones", () => {
			const content = composeHomeFeatured(
				[
					offer({ productId: 1, moq: "1", step: "1", unitPrice: "100" }),
					offer({ productId: 2, moq: "1", step: "1", unitPrice: "50" }),
				],
				[
					combo({
						id: 7,
						products: [
							[1, "2"],
							[3, "1"],
							[2, "1"],
						],
					}),
				],
				curation({ list: [comboTarget(7)], fillWithRanking: false }),
			);

			const [feature] = content.featured;
			if (feature?.kind !== "combo") throw new Error("expected a combo");
			const [option] = feature.combo.options;
			expect(option?.items.map((item) => item.offer.productId)).toEqual([
				1, 2,
			]);
			expect(option?.unavailableNames).toEqual(["Producto 3"]);
			expect(option?.total).toBe("250.00");
		});

		test("a combo with no available product does not show", () => {
			const content = composeHomeFeatured(
				offers,
				[combo({ id: 7, products: [[99, "1"]] })],
				curation({ list: [comboTarget(7)], fillWithRanking: false }),
			);

			expect(content.featured).toEqual([]);
		});

		test("the total is the sum of each product's line total, discount included", () => {
			const content = composeHomeFeatured(
				[
					// granola: $ 17.000 the kilo with 15 % off
					offer({
						productId: 1,
						moq: "1",
						step: "1",
						unitPrice: "17000",
						discountPercent: "15",
					}),
					offer({ productId: 2, moq: "1", step: "1", unitPrice: "5150" }),
					offer({ productId: 3, moq: "1", step: "1", unitPrice: "7850" }),
				],
				[
					combo({
						id: 7,
						products: [
							[1, "1"],
							[2, "1"],
							[3, "1"],
						],
					}),
				],
				curation({ list: [comboTarget(7)], fillWithRanking: false }),
			);

			const [feature] = content.featured;
			if (feature?.kind !== "combo") throw new Error("expected a combo");
			expect(feature.combo.options[0]?.total).toBe("27450.00");
			expect(
				feature.combo.options[0]?.items.map((item) => item.lineTotal),
			).toEqual(["14450.00", "5150.00", "7850.00"]);
		});

		test("products in different currencies leave the combo out", () => {
			const content = composeHomeFeatured(
				[
					offer({ productId: 1 }),
					offer({ productId: 2, currency: "USD" }),
				],
				[
					combo({
						id: 7,
						products: [
							[1, "10"],
							[2, "10"],
						],
					}),
				],
				curation({ list: [comboTarget(7)], fillWithRanking: false }),
			);

			expect(content.featured).toEqual([]);
		});
	});

	describe("combo groups", () => {
		const breakfast = [
			combo({
				id: 8,
				name: "Desayuno para 2",
				people: 2,
				groupName: "  desayuno ",
				products: [[1, "20"]],
			}),
			combo({
				id: 7,
				name: "Desayuno para 1",
				people: 1,
				groupName: "Desayuno",
				products: [[1, "10"]],
			}),
		];

		test("combos of the same group form one card, options ordered by people", () => {
			const content = composeHomeFeatured(
				offers,
				breakfast,
				curation({ list: [comboTarget(8)], fillWithRanking: false }),
			);

			expect(content.featured).toHaveLength(1);
			const [feature] = content.featured;
			if (feature?.kind !== "combo") throw new Error("expected a combo");
			expect(feature.combo.options.map((option) => option.people)).toEqual([
				1, 2,
			]);
			expect(feature.combo.initialComboId).toBe(8);
		});

		test("a sibling also in the list does not take a second place", () => {
			const content = composeHomeFeatured(
				offers,
				breakfast,
				curation({
					list: [comboTarget(7), comboTarget(8), product(3)],
					fillWithRanking: false,
				}),
			);

			expect(content.featured.map(describeFeature)).toEqual([
				"combo 7+8",
				"product 3",
			]);
			const [feature] = content.featured;
			expect(feature?.kind === "combo" && feature.combo.initialComboId).toBe(
				7,
			);
		});

		test("a combo without a group forms its own card", () => {
			const content = composeHomeFeatured(
				offers,
				[...breakfast, combo({ id: 9, people: 1, products: [[2, "10"]] })],
				curation({
					list: [comboTarget(7), comboTarget(9)],
					fillWithRanking: false,
				}),
			);

			expect(content.featured.map(describeFeature)).toEqual([
				"combo 7+8",
				"combo 9",
			]);
		});

		test("a combo card counts once against the limit", () => {
			const content = composeHomeFeatured(
				offers,
				breakfast,
				curation({ list: [comboTarget(7)], featuredLimit: 2 }),
			);

			expect(content.featured.map(describeFeature)).toEqual([
				"combo 7+8",
				"product 2",
			]);
		});

		test("the group key ignores case and extra spaces", () => {
			expect(normalizeComboGroup("  Desayuno   de campo ")).toBe(
				"desayuno de campo",
			);
		});
	});

	describe("spotlight band", () => {
		test("a chosen combo fills the band with its group, which then stays out of the section", () => {
			const content = composeHomeFeatured(
				offers,
				[
					combo({
						id: 7,
						people: 1,
						groupName: "Desayuno",
						products: [[1, "10"]],
					}),
					combo({
						id: 8,
						people: 2,
						groupName: "Desayuno",
						products: [[1, "20"]],
					}),
				],
				curation({
					spotlight: comboTarget(8),
					list: [comboTarget(7), product(4)],
					featuredLimit: 2,
				}),
			);

			expect(describeFeature(content.spotlight)).toBe("combo 7+8");
			expect(
				content.spotlight?.kind === "combo" &&
					content.spotlight.combo.initialComboId,
			).toBe(8);
			expect(content.featured.map(describeFeature)).toEqual([
				"product 4",
				"product 1",
			]);
		});

		test("a chosen product without terms falls back to the top of the ranking outside the list", () => {
			const content = composeHomeFeatured(
				offers,
				[],
				curation({ spotlight: product(99), list: [product(1)] }),
			);

			expect(describeFeature(content.spotlight)).toBe("product 2");
			expect(content.spotlight?.source).toBe("ranking");
			expect(content.featured.map(describeFeature)).toEqual([
				"product 1",
				"product 3",
				"product 4",
				"product 5",
			]);
		});

		test("a chosen product in the list stays in the band only", () => {
			const content = composeHomeFeatured(
				offers,
				[],
				curation({
					spotlight: product(3),
					list: [product(3), product(5)],
					featuredLimit: 2,
				}),
			);

			expect(describeFeature(content.spotlight)).toBe("product 3");
			expect(content.featured.map(describeFeature)).toEqual([
				"product 5",
				"product 1",
			]);
		});
	});
});
