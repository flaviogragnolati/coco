import { Prisma } from "~/prisma/client";
import type { XlsxRow, XlsxSheet } from "~/server/lib/xlsx/xlsx-reader";
import { CATALOG_CATEGORY_NAMES } from "./lib/catalog-categories";
import { quintalOverrides } from "./quintal-catalog.overrides";
import type { QuintalParseResult } from "./quintal-catalog.parser";
import {
	type QuintalProduct,
	quintalCatalogSchema,
} from "./quintal-catalog.schema";
import { quintalLaunchSource } from "./quintal-launch-catalog.config";

export const launchHeaders = {
	B: "N°",
	C: "Producto (nombre publicado)",
	D: "Categoría",
	E: "Proveedor",
	F: "Unidad de medida",
	G: "Presentación de la unidad",
	I: "Paso de compra",
	J: "Mínimo de compra por usuario",
	K: "Precio Quintal por unidad ($)",
	Z: "PRECIO PUBLICADO ($ por unidad de medida)",
	AC: "Precio de la compra mínima ($)",
	AD: "Pack del proveedor (interno)",
	AE: "Mínimo del proveedor, en unidades de medida (interno)",
	AF: "Precio Quintal del pack ($) (interno)",
} as const;

const presentations = {
	"botella 0,5 L": {
		presentationContainer: "botella",
		presentationSize: "0,5 L",
	},
	"botella 1 L": { presentationContainer: "botella", presentationSize: "1 L" },
	"bidón 5 L": { presentationContainer: "bidon", presentationSize: "5 L" },
	"frasco 370 g": {
		presentationContainer: "frasco",
		presentationSize: "370 g",
	},
	"bolsa 1 kg": { presentationContainer: "bolsa", presentationSize: "1 kg" },
} as const;

export type LaunchMetadata = {
	fileName: string;
	sha256: string;
	sourceUrl: string;
	sourceModifiedAt: string;
	listDate: string;
};

function text(row: XlsxRow, column: string) {
	const value = row.cells[column]?.trim();
	if (!value || value.startsWith("#"))
		throw new Error(`Falta valor válido/cacheado en ${column}${row.row}`);
	return value;
}

function amount(row: XlsxRow, column: string, scale: number) {
	const raw = text(row, column);
	if (!/^\d+(?:\.\d+)?$/.test(raw))
		throw new Error(`Número inválido en ${column}${row.row}`);
	const value = new Prisma.Decimal(raw);
	if (!value.isPositive() || value.decimalPlaces() > scale)
		throw new Error(`Precisión o cantidad inválida en ${column}${row.row}`);
	return value.toFixed(scale);
}

function productFromRow(row: XlsxRow): QuintalProduct[] {
	const id = new Prisma.Decimal(text(row, "B")).toNumber();
	if (!Number.isInteger(id) || id < 1 || id > 26)
		throw new Error(`N° de producto inválido en fila ${row.row}`);
	const category = text(row, "D");
	if (!(CATALOG_CATEGORY_NAMES as readonly string[]).includes(category))
		throw new Error(`Categoría desconocida en fila ${row.row}`);
	if (text(row, "E") !== "Quintal")
		throw new Error(`Proveedor inválido en fila ${row.row}`);
	const sourceUnit = text(row, "F");
	if (sourceUnit !== "kg" && sourceUnit !== "unidad")
		throw new Error(`Unidad inválida en fila ${row.row}`);
	const unit = sourceUnit === "kg" ? "kg" : "piece";
	const label = text(row, "G");
	const presentation =
		unit === "kg" ? null : presentations[label as keyof typeof presentations];
	if ((unit === "kg" && label !== "kg") || (unit === "piece" && !presentation))
		throw new Error(`Presentación inválida en fila ${row.row}`);
	const step = amount(row, "I", 4),
		moq = amount(row, "J", 4);
	if (
		step !== moq ||
		!["0.5000", "1.0000"].includes(step) ||
		(unit === "piece" && step !== "1.0000")
	)
		throw new Error(`Mínimo/paso inválido en fila ${row.row}`);
	const unitPrice = amount(row, "Z", 2),
		minimumPrice = amount(row, "AC", 2);
	const supplierMoq = amount(row, "AE", 4),
		supplierPrice = amount(row, "AF", 2),
		refPrice = amount(row, "K", 2);
	if (!new Prisma.Decimal(unitPrice).times(moq).eq(minimumPrice))
		throw new Error(`Total mínimo incoherente en fila ${row.row}`);
	if (!new Prisma.Decimal(refPrice).times(supplierMoq).eq(supplierPrice))
		throw new Error(`Precio del pack incoherente en fila ${row.row}`);
	const sourceLabel = text(row, "C");
	if (id === 4 && sourceLabel !== "Castaña de cajú tostada (sin sal o salada)")
		throw new Error("Cambió la fila de cajú que debe separarse");
	const variants =
		id === 4
			? [
					{ suffix: "-sin-sal", name: "Castaña de cajú tostada sin sal" },
					{ suffix: "-salada", name: "Castaña de cajú tostada salada" },
				]
			: [{ suffix: "", name: sourceLabel }];
	return variants.map(({ suffix, name }) => ({
		key: `coco-oct2026--${String(id).padStart(2, "0")}${suffix}`,
		sourceRows: [row.row],
		category,
		subcategory: null,
		sourceLabel,
		name,
		description: `${name}.`,
		unit,
		presentation: presentation ?? null,
		supplierTerms: {
			sourceRow: row.row,
			detail: text(row, "AD"),
			moq: supplierMoq,
			step: supplierMoq,
			moqPrice: supplierPrice,
			stepPrice: supplierPrice,
			refPrice,
			priceSource: "listed",
			supplierPresentation: text(row, "AD"),
		},
		clientTerms: {
			moq,
			step,
			moqPrice: minimumPrice,
			stepPrice: minimumPrice,
			unitPrice,
			max: null,
		},
		alternatePacks: [],
		bulkTiers: [],
		fractionSurcharge: null,
	}));
}

export function parseQuintalLaunchSheet(
	sheet: XlsxSheet,
	criteriaSheet: XlsxSheet,
	metadata: LaunchMetadata,
): QuintalParseResult {
	try {
		if (sheet.name !== "Catalogo" || criteriaSheet.name !== "Criterios")
			throw new Error("Se requieren Catalogo y Criterios");
		if (metadata.sha256 !== quintalLaunchSource.sha256)
			throw new Error(
				"El XLSX no coincide con el snapshot aprobado; revisar cambios antes de importar",
			);
		const headers = sheet.rows.filter((row) => row.cells.B === "N°");
		if (headers.length !== 1) throw new Error("Encabezado ausente o repetido");
		const header = headers[0];
		if (!header) throw new Error("Falta encabezado");
		for (const [column, expected] of Object.entries(launchHeaders)) {
			if (header.cells[column] !== expected)
				throw new Error(
					`Cambió el encabezado ${column}: se esperaba ${expected}`,
				);
		}
		const rows = sheet.rows.filter(
			(row) =>
				row.row > header.row &&
				row.cells.B &&
				/^\d+(?:\.0+)?$/.test(row.cells.B),
		);
		if (
			rows.length !== 26 ||
			new Set(rows.map((row) => Number(row.cells.B))).size !== 26
		)
			throw new Error(
				"Se requieren exactamente los productos 1 a 26, sin duplicados",
			);
		const footer = sheet.rows.find(
			(row) => row.cells.B === "Cómo leer el catálogo",
		);
		if (!footer) throw new Error("Falta el cierre del catálogo");
		const unexpected = sheet.rows.find(
			(row) =>
				row.row > header.row &&
				row.row < footer.row &&
				row.cells.B?.trim() &&
				!rows.includes(row),
		);
		if (unexpected)
			throw new Error(`Fila de producto no reconocida: ${unexpected.row}`);
		if (
			!criteriaSheet.rows.some((row) =>
				Object.values(row.cells).some((value) =>
					value.includes("CRITERIOS DE PRECIO"),
				),
			)
		)
			throw new Error("Faltan criterios de importación");
		for (const row of [...rows, ...criteriaSheet.rows]) {
			if (row.uncachedFormulaColumns?.length)
				throw new Error(`Faltan valores cacheados en fila ${row.row}`);
			if (
				Object.values(row.cells).some((value) =>
					/^#(?:REF!|VALUE!|DIV\/0!|N\/A|NUM!|NAME\?|SPILL!)/.test(value),
				)
			)
				throw new Error(`Error de fórmula en fila ${row.row}`);
		}
		const products = rows.flatMap(productFromRow);
		const reference = (row: XlsxRow) => ({
			row: row.row,
			cells: { ...row.cells },
		});
		const catalog = quintalCatalogSchema.parse({
			source: {
				...metadata,
				profile: "coco-launch",
				sheet: "Catalogo",
				currency: "ARS",
				pricesIncludeVat: false,
				paymentTerms: "Contado, sin IVA",
			},
			importReference: {
				criteriaRows: criteriaSheet.rows.map(reference),
				productRows: rows.map(reference),
			},
			supplier: {
				name: "Quintal",
				description: quintalOverrides.supplier.description,
				address: quintalOverrides.supplier.address,
				contactInfo: {
					contactName: quintalOverrides.supplier.contactName,
					email: "ventas@quintal.com.ar",
					phone: "+54 9 11 2244 4079",
				},
			},
			products,
			notes: rows
				.filter((row) => row.cells.AG?.trim())
				.map((row) => ({
					row: row.row,
					code: "source-note",
					message: row.cells.AG,
				})),
		});
		return {
			catalog,
			issues: [],
			rowLog: rows.map((row) => ({
				row: row.row,
				part: "main",
				kind: "product",
			})),
		};
	} catch (error) {
		return {
			catalog: null,
			issues: [
				{
					severity: "error",
					row: null,
					code: "launch-invalid",
					message: error instanceof Error ? error.message : String(error),
				},
			],
			rowLog: [],
		};
	}
}
