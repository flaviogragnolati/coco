import { expect, test } from "vitest";
import { formatQuantity } from "./commerce.helpers";
import {
	readSnapshotProduct,
	readSnapshotQuantityUnit,
	readSnapshotUnitPrice,
	withSnapshotPresentation,
} from "./product-snapshot";

const legacy = {
	source: "cart",
	product: { id: 3, name: "Aceite", unit: "piece" },
};

test("an old snapshot without presentation falls back to the unit label", () => {
	const { unit, presentation } = readSnapshotQuantityUnit(legacy);

	expect(formatQuantity("16", unit, presentation)).toBe("16 unidades");
});

test("a snapshot with presentation counts in its container", () => {
	const snapshot = withSnapshotPresentation(legacy, {
		presentationContainer: "botella",
		presentationSize: "0,5 L",
	});
	const { unit, presentation } = readSnapshotQuantityUnit(snapshot);

	expect(formatQuantity("2", unit, presentation)).toBe("2 botellas 0,5 L");
	expect(snapshot).toMatchObject({ source: "cart", product: { id: 3 } });
});

test("an unreadable snapshot degrades to a neutral unit", () => {
	expect(readSnapshotQuantityUnit(null)).toEqual({
		unit: "other",
		presentation: { presentationContainer: null, presentationSize: null },
	});
	expect(
		readSnapshotQuantityUnit({
			product: { unit: "kg", presentationContainer: "caja" },
		}).presentation.presentationContainer,
	).toBeNull();
});

test("a snapshot names the product it points at", () => {
	expect(readSnapshotProduct(legacy)).toEqual({ id: 3, name: "Aceite" });
});

test.each([
	{ product: { name: "Aceite" } },
	{ product: { id: "3", name: "Aceite" } },
	{ product: { id: 0, name: "Aceite" } },
	{ product: { id: 2.5, name: "Aceite" } },
])("a snapshot without a usable product id reads as null: %j", (snapshot) => {
	expect(readSnapshotProduct(snapshot)).toEqual({ id: null, name: "Aceite" });
});

test("a snapshot without a product name reads as a dash", () => {
	expect(readSnapshotProduct(null)).toEqual({ id: null, name: "-" });
});

const frozenTerms = {
	id: 5,
	moq: "0.5",
	moqPrice: "11300",
	step: "0.5",
	unitPrice: "22600",
	discountPercent: null,
	currency: "ARS",
};

test("the unit price comes from the frozen client terms", () => {
	expect(
		readSnapshotUnitPrice({ productClientTerms: frozenTerms, currency: "ARS" }),
	).toEqual({ unitPrice: 22600, currency: "ARS" });
});

test("a discounted line reads the offer unit price", () => {
	expect(
		readSnapshotUnitPrice({
			productClientTerms: { ...frozenTerms, discountPercent: "10" },
		}),
	).toEqual({ unitPrice: 20340, currency: "ARS" });
});

test("legacy terms without a unit price fall back to the minimum block", () => {
	expect(
		readSnapshotUnitPrice({
			productClientTerms: { ...frozenTerms, unitPrice: null },
		}),
	).toEqual({ unitPrice: 22600, currency: "ARS" });
});

test("a price snapshot without client terms has no unit price", () => {
	expect(
		readSnapshotUnitPrice({ lineTotal: "11300.00", currency: "ARS" }),
	).toBeNull();
	expect(readSnapshotUnitPrice(null)).toBeNull();
	expect(
		readSnapshotUnitPrice({
			productClientTerms: { ...frozenTerms, unitPrice: null, moqPrice: null },
		}),
	).toBeNull();
});
