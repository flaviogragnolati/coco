import { expect, test } from "vitest";
import { homeOfferSchema } from "~/schemas/home.schemas";
import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import { calculateLineTotal } from "~/shared/common/commerce.helpers";
import {
	catalogProductToCartItem,
	describeLocalCartAdditions,
	homeOfferToCartItem,
	mergeCartItems,
} from "./cart-mappers";

test.each([
	{ discountPercent: null, step: null, stepPrice: null, quantity: "3" },
	{ discountPercent: "25", step: null, stepPrice: null, quantity: "3" },
	{ discountPercent: "10", step: "2", stepPrice: "500", quantity: "6" },
])("home and catalog produce identical cart items: %j", ({
	quantity,
	...terms
}) => {
	const product: CatalogProductListItem = {
		id: 7,
		name: "Yerba",
		description: "Caja de yerba",
		unit: "box",
		presentationContainer: "paquete",
		presentationSize: "500 g",
		brand: { id: 2, name: "Coco" },
		category: null,
		imageUrl: "/yerba.jpg",
		createdAt: new Date("2026-06-01"),
		terms: {
			id: 17,
			moq: "3",
			moqPrice: "900",
			max: "15",
			unitPrice: "300",
			marketPrice: "400",
			currency: "ARS",
			fromDate: new Date("2026-06-01"),
			toDate: new Date("2027-06-01"),
			...terms,
		},
	};
	const offer = homeOfferSchema.parse({
		productId: product.id,
		productClientTermsId: product.terms.id,
		productName: product.name,
		productDescription: product.description,
		unit: product.unit,
		presentationContainer: product.presentationContainer,
		presentationSize: product.presentationSize,
		brandName: product.brand?.name,
		imageUrl: product.imageUrl,
		...product.terms,
	});
	expect(homeOfferToCartItem(offer)).toEqual(catalogProductToCartItem(product));
	expect(homeOfferToCartItem(offer, quantity)).toEqual(
		catalogProductToCartItem(product, quantity),
	);
});

function almond(quantity: string, id = 30): CartItem {
	const terms = {
		id,
		moq: "0.5",
		moqPrice: "11300",
		step: "0.5",
		stepPrice: null,
		max: "5",
		unitPrice: "22600",
		marketPrice: null,
		discountPercent: null,
		currency: "ARS" as const,
		fromDate: new Date("2026-06-01"),
		toDate: null,
	};
	return {
		productClientTermsId: id,
		quantity,
		lineTotal: calculateLineTotal(terms, quantity),
		product: {
			id: 1,
			name: "Almendra",
			description: null,
			unit: "kg",
			presentationContainer: null,
			presentationSize: null,
			brandName: null,
			imageUrl: null,
		},
		terms,
	};
}

test("merging adds to a line that is already in the cart", () => {
	const merged = mergeCartItems({ "30": almond("0.5") }, [almond("1")]);

	expect(merged["30"]).toMatchObject({
		quantity: "1.5",
		lineTotal: "33900.00",
	});
});

test("merging inserts a line that is not in the cart yet", () => {
	const merged = mergeCartItems({ "30": almond("0.5") }, [almond("0.7", 31)]);

	expect(merged["30"]?.quantity).toBe("0.5");
	expect(merged["31"]).toMatchObject({ quantity: "1", lineTotal: "22600.00" });
});

test("merging caps the sum at the maximum", () => {
	const merged = mergeCartItems({ "30": almond("4") }, [almond("3")]);

	expect(merged["30"]).toMatchObject({ quantity: "5", lineTotal: "113000.00" });
});

test("local additive feedback reports a cap reached by an existing line", () => {
	expect(
		describeLocalCartAdditions({ "30": almond("4") }, [almond("3")]),
	).toEqual([{ name: "Almendra", outcome: "adjusted" }]);
});

test("local additive feedback reports exact additions without a warning", () => {
	expect(
		describeLocalCartAdditions({ "30": almond("0.5") }, [almond("1")]),
	).toEqual([{ name: "Almendra", outcome: "added" }]);
});

test("local additive feedback tolerates decimal arithmetic without claiming an adjustment", () => {
	const current = almond("0.1");
	const incoming = almond("0.2");
	current.terms = { ...current.terms, moq: "0.1", step: "0.1" };
	incoming.terms = current.terms;
	expect(describeLocalCartAdditions({ "30": current }, [incoming])).toEqual([
		{ name: "Almendra", outcome: "added" },
	]);
});
