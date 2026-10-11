import { describe, expect, it } from "vitest";
import {
	describePlan,
	isEmptyPlan,
	type MigrationClientTerms,
	type MigrationProduct,
	type MigrationSupplierTerms,
	planUnitPricing,
	splitSupplierPresentation,
	type UnitPricingState,
} from "./migrate-unit-pricing.plan";

const QUINTAL = 7;
const now = new Date("2026-10-11T12:00:00.000Z");

function product(
	id: number,
	name: string,
	overrides: Partial<MigrationProduct> = {},
): MigrationProduct {
	return {
		id,
		name,
		unit: "kg",
		description: `${name}. Presentación del proveedor: 10 kg.`,
		defaultSupplierId: QUINTAL,
		deleted: false,
		presentationContainer: null,
		presentationSize: null,
		...overrides,
	};
}

function clientTerms(
	id: number,
	productId: number,
	overrides: Partial<MigrationClientTerms> = {},
): MigrationClientTerms {
	return {
		id,
		productId,
		moq: "1.0000",
		moqPrice: "19500.00",
		step: "1.0000",
		stepPrice: "19500.00",
		unitPrice: "19500.00",
		active: true,
		deleted: false,
		toDate: null,
		...overrides,
	};
}

function supplierTerms(
	id: number,
	productId: number,
	overrides: Partial<MigrationSupplierTerms> = {},
): MigrationSupplierTerms {
	return {
		id,
		productId,
		supplierId: QUINTAL,
		supplierPresentation: null,
		active: true,
		deleted: false,
		toDate: null,
		...overrides,
	};
}

const almendra = product(1, "Almendra non pareil 20/22");
const aceite = product(2, "Aceite de oliva extra virgen botella 0,5 L PET", {
	unit: "piece",
	description:
		"Aceite de oliva extra virgen botella 0,5 L PET. Presentación del proveedor: 12 unidades.",
});
const pasta = product(3, "Pasta de maní Entre Nuts 370 g", {
	unit: "piece",
	description:
		"Pasta de maní Entre Nuts 370 g. Presentación del proveedor: 12 frascos de 370 g.",
});
const maca = product(4, "Maca negra", {
	unit: "piece",
	description: "Maca negra. Presentación del proveedor: 10 unidades.",
});

const state: UnitPricingState = {
	quintalSupplierId: QUINTAL,
	products: [almendra, aceite, pasta, maca],
	clientTerms: [
		clientTerms(11, 1),
		clientTerms(12, 2, {
			moqPrice: "11000.00",
			stepPrice: "11000.00",
			unitPrice: "11000.00",
		}),
	],
	supplierTerms: [
		supplierTerms(21, 1),
		supplierTerms(22, 2),
		supplierTerms(23, 3),
		supplierTerms(24, 4),
	],
};

describe("planUnitPricing", () => {
	const plan = planUnitPricing(state, now);

	it("moves Quintal kilos to half-kilo minimum and step, priced from the unit price", () => {
		expect(plan.clientTerms).toEqual([
			{
				id: 11,
				productId: 1,
				productName: "Almendra non pareil 20/22",
				reason: "halfKilo",
				before: {
					moq: "1.0000",
					step: "1.0000",
					unitPrice: "19500.00",
					moqPrice: "19500.00",
					stepPrice: "19500.00",
				},
				after: {
					moq: "0.5000",
					step: "0.5000",
					unitPrice: "19500.00",
					moqPrice: "9750.00",
					stepPrice: "9750.00",
				},
			},
		]);
	});

	it("infers the presentation of products sold by the unit and lists the rest", () => {
		expect(plan.presentations).toEqual([
			{
				productId: 2,
				productName: "Aceite de oliva extra virgen botella 0,5 L PET",
				presentationContainer: "botella",
				presentationSize: "0,5 L",
			},
			{
				productId: 3,
				productName: "Pasta de maní Entre Nuts 370 g",
				presentationContainer: "frasco",
				presentationSize: "370 g",
			},
		]);
		expect(plan.uninferredPresentations).toEqual([
			{ productId: 4, productName: "Maca negra" },
		]);
	});

	it("moves the supplier presentation from the description to the supplier terms", () => {
		expect(plan.descriptions[0]).toEqual({
			productId: 1,
			productName: "Almendra non pareil 20/22",
			before: "Almendra non pareil 20/22. Presentación del proveedor: 10 kg.",
			after: "Almendra non pareil 20/22.",
			supplierPresentation: "10 kg",
			supplierTermsIds: [21],
		});
		expect(plan.descriptions).toHaveLength(4);
	});

	it("plans nothing once applied", () => {
		const applied: UnitPricingState = {
			quintalSupplierId: QUINTAL,
			products: [
				{
					...almendra,
					description: "Almendra non pareil 20/22.",
				},
				{
					...aceite,
					description: "Aceite de oliva extra virgen botella 0,5 L PET.",
					presentationContainer: "botella",
					presentationSize: "0,5 L",
				},
				{
					...pasta,
					description: "Pasta de maní Entre Nuts 370 g.",
					presentationContainer: "frasco",
					presentationSize: "370 g",
				},
				{ ...maca, description: "Maca negra." },
			],
			clientTerms: [
				clientTerms(11, 1, {
					moq: "0.5000",
					step: "0.5000",
					moqPrice: "9750.00",
					stepPrice: "9750.00",
				}),
				clientTerms(12, 2, {
					moqPrice: "11000.00",
					stepPrice: "11000.00",
					unitPrice: "11000.00",
				}),
			],
			supplierTerms: [
				supplierTerms(21, 1, { supplierPresentation: "10 kg" }),
				supplierTerms(22, 2, { supplierPresentation: "12 unidades" }),
				supplierTerms(23, 3, { supplierPresentation: "12 frascos de 370 g" }),
				supplierTerms(24, 4, { supplierPresentation: "10 unidades" }),
			],
		};
		const again = planUnitPricing(applied, now);

		expect(isEmptyPlan(again)).toBe(true);
		expect(again.uninferredPresentations).toEqual([
			{ productId: 4, productName: "Maca negra" },
		]);
	});

	it("recomputes stored prices of other live terms from their unit price", () => {
		const demo = product(9, "Tomate", {
			defaultSupplierId: 3,
			description: null,
		});
		const result = planUnitPricing(
			{
				...state,
				products: [demo],
				clientTerms: [
					clientTerms(91, 9, {
						moq: "20.0000",
						moqPrice: "24000.00",
						step: "10.0000",
						stepPrice: "11000.00",
						unitPrice: "1200.00",
					}),
				],
				supplierTerms: [],
			},
			now,
		);

		expect(result.clientTerms).toEqual([
			expect.objectContaining({
				id: 91,
				reason: "derivedPrices",
				after: {
					moq: "20.0000",
					step: "10.0000",
					unitPrice: "1200.00",
					moqPrice: "24000.00",
					stepPrice: "12000.00",
				},
			}),
		]);
	});

	it("leaves terms without a unit price outside Quintal alone, with a warning", () => {
		const demo = product(9, "Tomate", {
			defaultSupplierId: 3,
			description: null,
		});
		const result = planUnitPricing(
			{
				...state,
				products: [demo],
				clientTerms: [clientTerms(91, 9, { unitPrice: null })],
				supplierTerms: [],
			},
			now,
		);

		expect(result.clientTerms).toEqual([]);
		expect(result.warnings).toEqual([expect.stringContaining("#91")]);
	});

	it("derives a missing Quintal unit price from the minimum", () => {
		const result = planUnitPricing(
			{
				...state,
				clientTerms: [clientTerms(11, 1, { unitPrice: null })],
			},
			now,
		);

		expect(result.clientTerms[0]?.after).toMatchObject({
			unitPrice: "19500.00",
			moqPrice: "9750.00",
		});
	});

	it("skips closed, deleted and expired terms", () => {
		const result = planUnitPricing(
			{
				...state,
				clientTerms: [
					clientTerms(11, 1, { active: false }),
					clientTerms(12, 1, { deleted: true }),
					clientTerms(13, 1, { toDate: new Date("2026-01-01T00:00:00Z") }),
				],
			},
			now,
		);

		expect(result.clientTerms).toEqual([]);
	});

	it("keeps an admin-set supplier presentation and warns", () => {
		const result = planUnitPricing(
			{
				...state,
				products: [almendra],
				supplierTerms: [supplierTerms(21, 1, { supplierPresentation: "caja" })],
			},
			now,
		);

		expect(result.descriptions[0]?.supplierTermsIds).toEqual([]);
		expect(result.warnings).toEqual([expect.stringContaining('"caja"')]);
	});

	it("never overwrites a presentation an admin already chose", () => {
		const result = planUnitPricing(
			{
				...state,
				products: [{ ...aceite, presentationContainer: "bidon" }],
			},
			now,
		);

		expect(result.presentations).toEqual([]);
	});

	it("does not touch a description without Quintal terms to receive it", () => {
		const result = planUnitPricing(
			{ ...state, products: [almendra], supplierTerms: [] },
			now,
		);

		expect(result.descriptions).toEqual([]);
		expect(result.warnings).toEqual([
			expect.stringContaining("no términos de Quintal vigentes"),
		]);
	});

	it("reports every change in the dry run", () => {
		const report = describePlan(plan).join("\n");

		expect(report).toContain("Términos de cliente: 1 cambios.");
		expect(report).toContain("mínimo 1.0000 → 0.5000");
		expect(report).toContain("Sin presentación inferible");
		expect(report).toContain("#4 Maca negra");
	});
});

describe("splitSupplierPresentation", () => {
	it.each([
		[
			"Almendra. Presentación del proveedor: caja de 25 lb (11,34 kg).",
			"caja de 25 lb (11,34 kg)",
			"Almendra.",
		],
		[
			"Línea premium. Presentación del proveedor: 10 kg. Ideal para repostería.",
			"10 kg",
			"Línea premium. Ideal para repostería.",
		],
		["Presentación del proveedor: 1 unidad.", "1 unidad", null],
	])("splits %s", (description, supplierPresentation, rest) => {
		expect(splitSupplierPresentation(description)).toEqual({
			supplierPresentation,
			description: rest,
		});
	});

	it("returns null without the sentence", () => {
		expect(splitSupplierPresentation("Almendra non pareil.")).toBeNull();
	});
});
