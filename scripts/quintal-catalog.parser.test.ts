import { describe, expect, it } from "vitest";

import type { XlsxMergeRange, XlsxSheet } from "./lib/xlsx-reader";
import {
	displayLabel,
	parseDetail,
	parseQuintalSheet,
	slugify,
} from "./quintal-catalog.parser";
import type { QuintalOverrides } from "./quintal-catalog.schema";

type Cells = Record<string, string>;

const header: [number, Cells] = [
	7,
	{ B: "Producto", C: "Detalle", D: "Ref. $/Kg", E: "Precio" },
];

const footer: Array<[number, Cells]> = [
	[200, { B: "E-mail: ventas@quintal.com.ar" }],
	[201, { B: "Cel. 1122444079 " }],
	[202, { B: "Forma de Pago: Contado" }],
	[203, { B: "Los precios pueden variar despues de la actualizacion" }],
	[204, { B: "(Los Precios NO incluyen IVA)" }],
];

const baseOverrides: QuintalOverrides = {
	listDate: "2026-07-02T00:00:00-03:00",
	pricing: {
		marginPercent: 0,
		vatPercent: 0,
		freightPerKg: 0,
		freightPerPiece: 0,
		roundUpTo: null,
	},
	clientTerms: { moq: "1", step: "1", max: null },
	clientTermsOverrides: {},
	excludedCategories: [],
	categoryLabels: {
		ALMENDRA: { prefix: "Almendra" },
	},
	subcategoryLabels: {},
	wordSpelling: {},
	nameOverrides: {},
	keyAliases: {},
	splitVariants: {},
	sideTableTargets: {},
	surchargeTargets: {},
	priceResolutions: {},
	supplier: {
		description: "Mayorista de frutos secos.",
		contactName: "Ventas Quintal",
		address: {
			line1: "A confirmar",
			city: "Ciudad Autónoma de Buenos Aires",
			state: "Buenos Aires",
			postalCode: "0000",
			country: "AR",
		},
	},
};

const source = { fileName: "lista.xlsx", sha256: "a".repeat(64) };

function merge(ref: string): XlsxMergeRange {
	const [from = "", to = ""] = ref.split(":");
	const split = (cell: string) => {
		const match = /^([A-Z]+)(\d+)$/.exec(cell);
		return { column: match?.[1] ?? "", row: Number(match?.[2]) };
	};
	return {
		ref,
		startRow: split(from).row,
		endRow: split(to).row,
		startColumn: split(from).column,
		endColumn: split(to).column,
	};
}

function sheetOf(
	body: Array<[number, Cells]>,
	options: { merges?: string[]; withFooter?: Array<[number, Cells]> } = {},
): XlsxSheet {
	return {
		name: "Lista WEB",
		rows: [header, ...body, ...(options.withFooter ?? footer)].map(
			([row, cells]) => ({ row, cells }),
		),
		merges: (options.merges ?? []).map(merge),
	};
}

function parse(
	body: Array<[number, Cells]>,
	options: {
		merges?: string[];
		withFooter?: Array<[number, Cells]>;
		overrides?: Partial<QuintalOverrides>;
	} = {},
) {
	return parseQuintalSheet(
		sheetOf(body, options),
		{ ...baseOverrides, ...options.overrides },
		source,
	);
}

const almendra: Array<[number, Cells]> = [
	[9, { B: "ALMENDRA" }],
	[10, { B: "Non pareil 20/22", C: "Promo x 10kg", D: "19500.0", E: "195000" }],
];

function errorCodes(result: ReturnType<typeof parse>) {
	return result.issues
		.filter((issue) => issue.severity === "error")
		.map((issue) => issue.code);
}

function onlyProduct(result: ReturnType<typeof parse>) {
	expect(errorCodes(result)).toEqual([]);
	const product = result.catalog?.products[0];
	if (!product) throw new Error("no product parsed");
	return product;
}

describe("parseDetail", () => {
	it.each([
		["Promo x 10kg", "kg", "10", "10 kg"],
		["promo x 7kg", "kg", "7", "7 kg"],
		["Promo x 6,8kg", "kg", "6.8", "6,8 kg"],
		["Caja x 20k", "kg", "20", "caja de 20 kg"],
		["Caja x 22,68k", "kg", "22.68", "caja de 22,68 kg"],
		["Caja x 6KG", "kg", "6", "caja de 6 kg"],
		["Caja x 5 kgs.", "kg", "5", "caja de 5 kg"],
		["Bolsa x 25kgs", "kg", "25", "bolsa de 25 kg"],
		["Bolsa x 22,68kg", "kg", "22.68", "bolsa de 22,68 kg"],
		["Bolson x 15 kgs.", "kg", "15", "bolsón de 15 kg"],
		["Fraccionado x 5 kgs", "kg", "5", "fraccionado de 5 kg"],
		["Fracionado x 5kg", "kg", "5", "fraccionado de 5 kg"],
		["Caja 25 lbs. (11,34kg)", "kg", "11.34", "caja de 25 lb (11,34 kg)"],
		["Calibre 132/154 x 10 kgs.", "kg", "10", "10 kg"],
		["Promo x 16u.", "piece", "16", "16 unidades"],
		["Promo x 36u", "piece", "36", "36 unidades"],
		["Promo 10u. ", "piece", "10", "10 unidades"],
		["Promo x 1u.", "piece", "1", "1 unidad"],
		["Promo x 12", "count", "12", "12 unidades"],
		["12 frascos x 370grs", "piece", "12", "12 frascos de 370 g"],
		["Bolsita 500gr", "piece", "1", "bolsita de 500 g"],
	])("reads %s", (detail, unit, quantity, presentation) => {
		const parsed = parseDetail(detail);

		expect(parsed?.unit).toBe(unit);
		expect(parsed?.quantity.toString()).toBe(quantity);
		expect(parsed?.presentation).toBe(presentation);
	});

	it("keeps the calibre", () => {
		expect(parseDetail("Calibre 88/110 x 5 kgs.")?.calibre).toBe("88/110");
	});

	it("rejects an unknown shape", () => {
		expect(parseDetail("Docena surtida")).toBeNull();
	});
});

describe("displayLabel and slugify", () => {
	it("sentence-cases while keeping codes, grades and spelled words", () => {
		expect(
			displayLabel("Natural W3s BRASIL (partida) C/P AA 0,5L", {
				brasil: "Brasil",
			}),
		).toBe("natural W3s Brasil (partida) C/P AA 0,5L");
	});

	it("slugs without diacritics", () => {
		expect(slugify("CASTAÑAS DE CAJÚ")).toBe("castanas-de-caju");
		expect(slugify("Non pareil 20/22")).toBe("non-pareil-20-22");
	});
});

describe("parseQuintalSheet", () => {
	it("fails without the header row", () => {
		const result = parseQuintalSheet(
			{
				name: "Lista WEB",
				rows: [{ row: 1, cells: { B: "Lista" } }],
				merges: [],
			},
			baseOverrides,
			source,
		);

		expect(result.catalog).toBeNull();
		expect(errorCodes(result)).toEqual(["header-not-found"]);
	});

	it("turns a product row into supplier terms and list-price client terms", () => {
		const product = onlyProduct(parse(almendra));

		expect(product).toMatchObject({
			key: "almendra--non-pareil-20-22",
			name: "Almendra non pareil 20/22",
			unit: "kg",
			category: "ALMENDRA",
			sourceRows: [10],
			supplierTerms: {
				moq: "10.0000",
				moqPrice: "195000.00",
				step: "10.0000",
				stepPrice: "195000.00",
				refPrice: "19500.00",
				priceSource: "listed",
			},
			clientTerms: {
				moq: "1.0000",
				moqPrice: "19500.00",
				step: "1.0000",
				stepPrice: "19500.00",
				max: null,
				unitPrice: "19500.00",
			},
			alternatePacks: [],
			bulkTiers: [],
			fractionSurcharge: null,
		});
		expect(product.description).toBe(
			"Almendra non pareil 20/22. Presentación del proveedor: 10 kg.",
		);
	});

	it("applies freight, VAT, margin and rounding to the client price", () => {
		const product = onlyProduct(
			parse(almendra, {
				overrides: {
					pricing: {
						marginPercent: 10,
						vatPercent: 21,
						freightPerKg: 500,
						freightPerPiece: 0,
						roundUpTo: 100,
					},
				},
			}),
		);

		// (19500 + 500) × 1.21 × 1.10 = 26620 → 26700
		expect(product.clientTerms.unitPrice).toBe("26700.00");
		expect(product.supplierTerms.refPrice).toBe("19500.00");
	});

	it("drops the category prefix when the label already names it", () => {
		const product = onlyProduct(
			parse(
				[
					[9, { B: "ALMENDRA" }],
					[
						10,
						{ B: "Harina de Almenda", C: "Promo x 5kg", D: "6000", E: "30000" },
					],
				],
				{
					overrides: { wordSpelling: { almenda: "almendra" } },
				},
			),
		);

		expect(product.name).toBe("Harina de almendra");
	});

	it("rejects a spelling fix no label uses", () => {
		const result = parse(almendra, {
			overrides: { wordSpelling: { almenda: "almendra" } },
		});

		expect(errorCodes(result)).toEqual(["override-unused"]);
	});

	it("reads a subheading from its B:E merge", () => {
		const result = parse(
			[
				[9, { B: "ALMENDRA" }],
				[10, { B: "PREMIUM" }],
				[11, { B: "Guara", C: "Promo x 10kg", D: "16500", E: "165000" }],
			],
			{
				merges: ["B10:E10"],
				overrides: { subcategoryLabels: { PREMIUM: "Línea premium." } },
			},
		);
		const product = onlyProduct(result);

		expect(product.subcategory).toBe("PREMIUM");
		expect(product.description).toContain("Línea premium.");
	});

	it("requires a label for every subheading", () => {
		const result = parse(
			[
				[9, { B: "ALMENDRA" }],
				[10, { B: "PREMIUM" }],
				[11, { B: "Guara", C: "Promo x 10kg", D: "16500", E: "165000" }],
			],
			{ merges: ["B10:E10"] },
		);

		expect(errorCodes(result)).toContain("subcategory-label-missing");
	});

	it("warns about junk next to a heading", () => {
		const result = parse([
			[9, { B: "ALMENDRA", D: "." }],
			[10, { B: "Guara", C: "Promo x 10kg", D: "16500", E: "165000" }],
		]);

		expect(result.catalog).not.toBeNull();
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				severity: "warning",
				code: "heading-extra-cells",
				row: 9,
			}),
		);
	});

	it("sells by unit under a heading that redefines the columns", () => {
		const product = onlyProduct(
			parse(
				[
					[9, { B: "ACEITE", D: "Unidad", E: "Pack" }],
					[10, { B: "Botella 1L", C: "Promo x 6", D: "19000", E: "114000" }],
				],
				{
					overrides: {
						categoryLabels: { ACEITE: { prefix: "Aceite de oliva" } },
					},
				},
			),
		);

		expect(product.unit).toBe("piece");
		expect(product.supplierTerms.moq).toBe("6.0000");
		expect(product.clientTerms.unitPrice).toBe("19000.00");
	});

	it("rejects a bare count outside a by-unit category", () => {
		const result = parse([
			[9, { B: "ALMENDRA" }],
			[10, { B: "Guara", C: "Promo x 6", D: "19000", E: "114000" }],
		]);

		expect(errorCodes(result)).toEqual(["count-without-unit"]);
	});

	it("keeps continuation packs as alternates and picks the cheapest per unit", () => {
		const product = onlyProduct(
			parse([
				[9, { B: "ALMENDRA" }],
				[10, { B: "Bañadas", C: "Promo x 1kg", D: "24000" }],
				[11, { C: "Promo x 6kg", D: "23000.0", E: "138000" }],
			]),
		);

		expect(product.sourceRows).toEqual([10, 11]);
		expect(product.supplierTerms).toMatchObject({
			sourceRow: 11,
			moq: "6.0000",
			refPrice: "23000.00",
		});
		expect(product.alternatePacks).toEqual([
			{
				sourceRow: 10,
				detail: "Promo x 1kg",
				quantity: "1.0000",
				price: "24000.00",
				unitPrice: "24000.00",
				priceSource: "derived",
			},
		]);
	});

	it("keeps the first pack on a unit-price tie", () => {
		const product = onlyProduct(
			parse([
				[9, { B: "ALMENDRA" }],
				[10, { B: "Guara", C: "Caja x 10kg", D: "16000", E: "160000" }],
				[11, { C: "Caja x 5kg", D: "16000", E: "80000" }],
			]),
		);

		expect(product.supplierTerms.sourceRow).toBe(10);
	});

	it("merges a repeated label in the same category as another pack", () => {
		const result = parse([
			[9, { B: "ALMENDRA" }],
			[10, { B: "Sal Rosada   ", C: "Bolsa x 1kg", D: "3800", E: "3800" }],
			[11, { B: "Sal Rosada", C: "Bolsa x 25kg", D: "2800", E: "70000" }],
		]);
		const product = onlyProduct(result);

		expect(result.catalog?.products).toHaveLength(1);
		expect(product.supplierTerms.refPrice).toBe("2800.00");
		expect(product.alternatePacks.map((pack) => pack.sourceRow)).toEqual([10]);
	});

	it("derives the unit price when D is missing", () => {
		const result = parse([
			[9, { B: "ALMENDRA" }],
			[10, { B: "Bocaditos", C: "Promo x 36u", E: "27500.0" }],
		]);
		const product = onlyProduct(result);

		expect(product.unit).toBe("piece");
		expect(product.supplierTerms).toMatchObject({
			moqPrice: "27500.00",
			refPrice: "763.89",
			priceSource: "derived",
		});
		expect(result.catalog?.notes).toContainEqual(
			expect.objectContaining({ row: 10, code: "unit-price-derived" }),
		);
	});

	it("rejects a pack price that disagrees with D × quantity", () => {
		const result = parse([
			[9, { B: "ALMENDRA" }],
			[10, { B: "Pecan Negro", C: "Bolsita 500gr", D: "14000", E: "13500" }],
		]);

		expect(result.catalog).toBeNull();
		expect(errorCodes(result)).toEqual(["price-mismatch"]);
	});

	it("resolves a disagreement with a priceResolutions entry", () => {
		const result = parse(
			[
				[9, { B: "ALMENDRA" }],
				[10, { B: "Pecan Negro", C: "Bolsita 500gr", D: "14000", E: "13500" }],
			],
			{
				overrides: {
					priceResolutions: {
						10: { use: "pack", reason: "precio de la bolsita" },
					},
				},
			},
		);
		const product = onlyProduct(result);

		expect(product.unit).toBe("piece");
		expect(product.supplierTerms).toMatchObject({
			moq: "1.0000",
			moqPrice: "13500.00",
			refPrice: "13500.00",
			priceSource: "derived",
		});
		expect(result.catalog?.notes).toContainEqual(
			expect.objectContaining({ row: 10, code: "price-resolution" }),
		);
	});

	it("reads pounds as their kilogram equivalent and keeps the calibre", () => {
		const result = parse([
			[9, { B: "ALMENDRA" }],
			[
				10,
				{ B: "Chile", C: "Caja 25 lbs. (11,34kg)", D: "14700", E: "166698" },
			],
			[
				11,
				{ B: "Chica", C: "Calibre 132/154 x 10 kgs.", D: "5000", E: "50000" },
			],
		]);

		expect(errorCodes(result)).toEqual([]);
		const [pounds, calibre] = result.catalog?.products ?? [];
		expect(pounds?.unit).toBe("kg");
		expect(pounds?.supplierTerms.moq).toBe("11.3400");
		expect(calibre?.description).toContain("Calibre 132/154.");
	});

	it("requires explicit targets for a surcharge row", () => {
		const result = parse([
			[9, { B: "ALMENDRA" }],
			[10, { B: "W3s", C: "Caja x 22,68k", D: "14500", E: "328860" }],
			[11, { C: "Adicional x kg fraccionado", D: "500.0", E: "min. 5k" }],
		]);

		expect(errorCodes(result)).toEqual(["surcharge-without-targets"]);
	});

	it("attaches a surcharge to its declared targets without making it a pack", () => {
		const result = parse(
			[
				[9, { B: "ALMENDRA" }],
				[10, { B: "W3s", C: "Caja x 22,68k", D: "14500", E: "328860" }],
				[11, { B: "W4", C: "Caja x 22,68k", D: "13300", E: "301644" }],
				[12, { C: "Adicional x kg fraccionado", D: "500.0", E: "min. 5k" }],
				[13, { B: "Zapallo", C: "Bolsa x 25kg", D: "12800", E: "320000" }],
				[14, { C: "Fraccionado x 5kg", D: "500.0" }],
			],
			{
				overrides: {
					surchargeTargets: {
						12: ["almendra--w3s", "almendra--w4"],
						14: ["almendra--zapallo"],
					},
				},
			},
		);

		expect(errorCodes(result)).toEqual([]);
		const products = result.catalog?.products ?? [];
		expect(products.map((product) => product.fractionSurcharge)).toEqual([
			{
				sourceRow: 12,
				detail: "Adicional x kg fraccionado",
				surchargePerKg: "500.00",
				minimumQuantity: "5.0000",
			},
			expect.objectContaining({ sourceRow: 12 }),
			{
				sourceRow: 14,
				detail: "Fraccionado x 5kg",
				surchargePerKg: "500.00",
				minimumQuantity: "5.0000",
			},
		]);
		expect(
			products.every((product) => product.alternatePacks.length === 0),
		).toBe(true);
	});

	it("splits a row listing variants into products sharing its pack", () => {
		const result = parse(
			[
				[9, { B: "ALMENDRA" }],
				[
					10,
					{
						B: "Tostada Sin Sal / Salada ",
						C: "Bolsa x 5kg",
						D: "14900",
						E: "74500",
					},
				],
			],
			{
				overrides: {
					splitVariants: {
						10: { base: "Tostada", variants: ["sin sal", "salada"] },
					},
				},
			},
		);

		expect(errorCodes(result)).toEqual([]);
		expect(
			result.catalog?.products.map((product) => [
				product.key,
				product.name,
				product.supplierTerms.moqPrice,
			]),
		).toEqual([
			[
				"almendra--tostada-sin-sal-salada--sin-sal",
				"Almendra tostada sin sal",
				"74500.00",
			],
			[
				"almendra--tostada-sin-sal-salada--salada",
				"Almendra tostada salada",
				"74500.00",
			],
		]);
	});

	it("attaches side-table volume tiers to their target as reference", () => {
		const result = parse(
			[
				[9, { B: "ALMENDRA" }],
				[
					10,
					{
						B: "Guara",
						C: "Promo x 10kg",
						D: "16500",
						E: "165000",
						H: "GUARA",
					},
				],
				[11, { H: "X13,6KG", J: "9500.0" }],
				[12, { H: "X 100KG", J: "9300.0" }],
			],
			{
				merges: ["H10:K10", "H11:I11", "J11:K11"],
				overrides: { sideTableTargets: { GUARA: "almendra--guara" } },
			},
		);
		const product = onlyProduct(result);

		expect(product.bulkTiers).toEqual([
			{ sourceRow: 11, minQuantity: "13.6000", unitPrice: "9500.00" },
			{ sourceRow: 12, minQuantity: "100.0000", unitPrice: "9300.00" },
		]);
	});

	it("rejects a volume tier priced above the list", () => {
		const result = parse(
			[
				[9, { B: "ALMENDRA" }],
				[
					10,
					{
						B: "Guara",
						C: "Promo x 10kg",
						D: "16500",
						E: "165000",
						H: "GUARA",
					},
				],
				[11, { H: "X 20KG", J: "17000" }],
			],
			{
				merges: ["H10:K10"],
				overrides: { sideTableTargets: { GUARA: "almendra--guara" } },
			},
		);

		expect(errorCodes(result)).toEqual(["bulk-tier-above-list"]);
	});

	it("requires a target for every side-table heading", () => {
		const result = parse(
			[
				[9, { B: "ALMENDRA" }],
				[
					10,
					{
						B: "Guara",
						C: "Promo x 10kg",
						D: "16500",
						E: "165000",
						H: "GUARA",
					},
				],
				[11, { H: "X 20KG", J: "9000" }],
			],
			{ merges: ["H10:K10"] },
		);

		expect(errorCodes(result)).toEqual(["side-target-missing"]);
	});

	it("warns about a stray marker outside the list", () => {
		const result = parse([
			...almendra,
			[11, { B: "Guara", C: "Promo x 10kg", D: "16500", E: "165000", G: "*" }],
		]);

		expect(result.catalog).not.toBeNull();
		expect(result.catalog?.notes).toContainEqual(
			expect.objectContaining({ row: 11, code: "stray-cell" }),
		);
	});

	it("reads the supplier contact and terms from the footer", () => {
		const result = parse(almendra);

		expect(result.catalog?.supplier.contactInfo).toEqual({
			contactName: "Ventas Quintal",
			email: "ventas@quintal.com.ar",
			phone: "+54 9 11 2244 4079",
		});
		expect(result.catalog?.source).toMatchObject({
			paymentTerms: "Contado",
			pricesIncludeVat: false,
			currency: "ARS",
			listDate: "2026-07-02T03:00:00.000Z",
		});
	});

	it("refuses a list that does not state prices exclude VAT", () => {
		const result = parse(almendra, { withFooter: footer.slice(0, 3) });

		expect(result.catalog).toBeNull();
		expect(errorCodes(result)).toEqual(["footer-vat-missing"]);
	});

	it("rejects an unrecognized row instead of dropping it", () => {
		const result = parse([...almendra, [11, { B: "Consultar stock" }]]);

		expect(result.catalog).toBeNull();
		expect(errorCodes(result)).toEqual(["row-unrecognized"]);
	});

	it("rejects an override that matches nothing", () => {
		const result = parse(almendra, {
			overrides: { nameOverrides: { "almendra--no-existe": "Otra" } },
		});

		expect(errorCodes(result)).toEqual(["override-unused"]);
	});

	it("rejects two products with the same display name", () => {
		const result = parse(
			[
				[9, { B: "ALMENDRA" }],
				[10, { B: "Guara", C: "Promo x 10kg", D: "16500", E: "165000" }],
				[
					11,
					{ B: "Guara partida", C: "Promo x 10kg", D: "16000", E: "160000" },
				],
			],
			{
				overrides: {
					nameOverrides: { "almendra--guara-partida": "almendra GUARA" },
				},
			},
		);

		expect(errorCodes(result)).toEqual(["name-collision"]);
	});

	it("classifies every non-empty row", () => {
		const body: Array<[number, Cells]> = [
			[9, { B: "ALMENDRA" }],
			[
				10,
				{ B: "Guara", C: "Promo x 10kg", D: "16500", E: "165000", H: "GUARA" },
			],
			[11, { C: "Promo x 1kg", D: "17000", H: "X 20KG", J: "16000" }],
			[12, { G: "*" }],
		];
		const result = parse(body, {
			merges: ["H10:K10"],
			overrides: { sideTableTargets: { GUARA: "almendra--guara" } },
		});

		const classified = new Set(result.rowLog.map((entry) => entry.row));
		for (const [row] of [header, ...body, ...footer]) {
			expect(classified.has(row)).toBe(true);
		}
		expect(result.rowLog.some((entry) => entry.kind === "unrecognized")).toBe(
			false,
		);
	});

	it("is deterministic", () => {
		const first = parse(almendra);
		const second = parse(almendra);

		expect(JSON.stringify(second)).toBe(JSON.stringify(first));
	});
});
