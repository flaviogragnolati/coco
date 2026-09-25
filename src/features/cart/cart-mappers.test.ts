import { expect, test } from "vitest";
import { homeOfferSchema } from "~/schemas/home.schemas";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import { catalogProductToCartItem, homeOfferToCartItem } from "./cart-mappers";

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
		brand: { id: 2, name: "Coco" },
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
		brandName: product.brand?.name,
		imageUrl: product.imageUrl,
		...product.terms,
	});
	expect(homeOfferToCartItem(offer)).toEqual(catalogProductToCartItem(product));
	expect(homeOfferToCartItem(offer, quantity)).toEqual(
		catalogProductToCartItem(product, quantity),
	);
});
