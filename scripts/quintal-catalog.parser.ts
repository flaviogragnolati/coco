import { Prisma } from "~/prisma/client";
import type { XlsxSheet } from "./lib/xlsx-reader";
import {
	normalizeText,
	type PriceSource,
	QUINTAL_SHEET_NAME,
	QUINTAL_SUPPLIER_NAME,
	type QuintalCatalog,
	type QuintalNote,
	type QuintalOverrides,
	type QuintalProduct,
	quintalCatalogSchema,
} from "./quintal-catalog.schema";

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export type IssueSeverity = "error" | "warning" | "info";

export type ParseIssue = {
	severity: IssueSeverity;
	row: number | null;
	code: string;
	message: string;
};

export type RowKind =
	| "header"
	| "category"
	| "subcategory"
	| "product"
	| "packVariant"
	| "surcharge"
	| "sideHeading"
	| "sideTier"
	| "footer"
	| "excluded"
	| "stray"
	| "unrecognized";

export type RowLogEntry = {
	row: number;
	part: "main" | "side" | "other";
	kind: RowKind;
};

export type QuintalSource = { fileName: string; sha256: string };

export type QuintalParseResult = {
	/** null whenever an error was raised: an errored parse must never be written. */
	catalog: QuintalCatalog | null;
	issues: ParseIssue[];
	rowLog: RowLogEntry[];
};

type Unit = "kg" | "piece";

type DraftPack = {
	sourceRow: number;
	detail: string;
	unit: Unit;
	quantity: Decimal;
	price: Decimal;
	unitPrice: Decimal;
	priceSource: PriceSource;
	calibre: string | null;
	presentation: string;
};

type DraftListing = {
	category: string;
	subcategory: string | null;
	sourceLabel: string;
	firstRow: number;
	packs: DraftPack[];
};

type DraftSurcharge = {
	sourceRow: number;
	detail: string;
	surchargePerKg: Decimal;
	minimumQuantity: Decimal | null;
};

type DraftTier = {
	sourceRow: number;
	minQuantity: Decimal;
	unitPrice: Decimal;
};

/** Overrides a parse consumed, so a stale entry fails instead of rotting. */
type UsedOverrides = {
	priceResolutions: Set<number>;
	surchargeTargets: Set<number>;
	splitVariants: Set<number>;
	sideTableTargets: Set<string>;
	categoryLabels: Set<string>;
	subcategoryLabels: Set<string>;
	wordSpelling: Set<string>;
	excludedCategories: Set<string>;
};

const MAIN_COLUMNS = ["B", "C", "D", "E"];
const SIDE_COLUMNS = ["H", "I", "J", "K"];
/** A continuation row priced under this share of its product is a surcharge. */
const SURCHARGE_PRICE_SHARE = new Decimal("0.25");
const PRICE_TOLERANCE = new Decimal("0.5");

export function slugify(value: string) {
	return normalizeText(value)
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function cleanLabel(value: string) {
	return value.replace(/\s+/g, " ").trim();
}

function quantityText(value: Decimal) {
	return value.toFixed(4);
}

function moneyText(value: Decimal) {
	return value.toFixed(2);
}

function money(value: Decimal) {
	return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function displayNumber(value: Decimal) {
	return value.toString().replace(".", ",");
}

function parseAmount(raw: string | undefined): Decimal | null | "invalid" {
	if (raw === undefined) return null;
	const text = raw.trim();
	if (!/^-?\d+(?:\.\d+)?(?:E[+-]?\d+)?$/i.test(text)) return "invalid";
	const value = new Decimal(text);
	return value.gt(0) ? value : "invalid";
}

type ParsedDetail = {
	unit: Unit | "count";
	quantity: Decimal;
	calibre: string | null;
	presentation: string;
};

const NUMBER = String.raw`(\d+(?:\.\d+)?)`;
const KG_UNIT = String.raw`(?:kgs?|k)\.?`;

const CONTAINER_NAMES: Record<string, string> = {
	caja: "caja",
	bolsa: "bolsa",
	bolson: "bolsón",
	fraccionado: "fraccionado",
	fracionado: "fraccionado",
};

/**
 * The "Detalle" column grammar. Every presentation drops the supplier's "promo"
 * wording: in this catalog it only means "sold by", never a discount.
 */
export function parseDetail(detail: string): ParsedDetail | null {
	const text = normalizeText(detail).replace(/,/g, ".");
	let match: RegExpExecArray | null;

	match = new RegExp(
		String.raw`^(caja|bolsa)\s*(?:x\s*)?${NUMBER}\s*lbs?\.?\s*\(${NUMBER}\s*${KG_UNIT}\)$`,
	).exec(text);
	if (match?.[1] && match[2] && match[3]) {
		const kg = new Decimal(match[3]);
		return {
			unit: "kg",
			quantity: kg,
			calibre: null,
			presentation: `${match[1]} de ${displayNumber(new Decimal(match[2]))} lb (${displayNumber(kg)} kg)`,
		};
	}

	match = new RegExp(
		String.raw`^calibre\s+(\S+)\s+x\s*${NUMBER}\s*${KG_UNIT}$`,
	).exec(text);
	if (match?.[1] && match[2]) {
		const kg = new Decimal(match[2]);
		return {
			unit: "kg",
			quantity: kg,
			calibre: match[1],
			presentation: `${displayNumber(kg)} kg`,
		};
	}

	match = new RegExp(
		String.raw`^(promo|caja|bolsa|bolson|fraccionado|fracionado)\s*x\s*${NUMBER}\s*${KG_UNIT}$`,
	).exec(text);
	if (match?.[1] && match[2]) {
		const kg = new Decimal(match[2]);
		const container = CONTAINER_NAMES[match[1]];
		return {
			unit: "kg",
			quantity: kg,
			calibre: null,
			presentation: container
				? `${container} de ${displayNumber(kg)} kg`
				: `${displayNumber(kg)} kg`,
		};
	}

	match = /^promo\s*(?:x\s*)?(\d+)\s*u\.?$/.exec(text);
	if (match?.[1]) return pieces(new Decimal(match[1]));

	match = /^promo\s*x\s*(\d+)$/.exec(text);
	if (match?.[1]) {
		return { ...pieces(new Decimal(match[1])), unit: "count" };
	}

	match = new RegExp(
		String.raw`^(\d+)\s*frascos?\s*x\s*${NUMBER}\s*grs?\.?$`,
	).exec(text);
	if (match?.[1] && match[2]) {
		return {
			unit: "piece",
			quantity: new Decimal(match[1]),
			calibre: null,
			presentation: `${match[1]} frascos de ${displayNumber(new Decimal(match[2]))} g`,
		};
	}

	match = new RegExp(String.raw`^bolsita\s*${NUMBER}\s*grs?\.?$`).exec(text);
	if (match?.[1]) {
		return {
			unit: "piece",
			quantity: new Decimal(1),
			calibre: null,
			presentation: `bolsita de ${displayNumber(new Decimal(match[1]))} g`,
		};
	}

	return null;
}

function pieces(quantity: Decimal): ParsedDetail {
	return {
		unit: "piece",
		quantity,
		calibre: null,
		presentation: quantity.eq(1)
			? "1 unidad"
			: `${quantity.toString()} unidades`,
	};
}

/**
 * Sentence case that keeps what a supplier label means verbatim: codes with
 * digits or slashes (20/22, W3s, C/P, 0,5L), short uppercase grades (A, AA) and
 * every word the overrides spell explicitly (accents, proper nouns, brands).
 */
export function displayLabel(
	label: string,
	wordSpelling: Record<string, string>,
	usedSpellings?: Set<string>,
) {
	return cleanLabel(label)
		.split(" ")
		.map((token) => {
			const match = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}%]*)$/u.exec(token);
			const [, lead = "", core = "", trail = ""] = match ?? [];
			const word = core.toLowerCase();
			const spelled = Object.hasOwn(wordSpelling, word)
				? wordSpelling[word]
				: undefined;
			if (spelled !== undefined) {
				usedSpellings?.add(word);
				return `${lead}${spelled}${trail}`;
			}
			if (/[\d/%]/.test(core)) return token;
			if (/^\p{Lu}{1,2}$/u.test(core)) return token;
			return token.toLowerCase();
		})
		.join(" ");
}

function capitalize(value: string) {
	return value.charAt(0).toLocaleUpperCase("es") + value.slice(1);
}

function productName(
	label: string,
	categoryLabel: { prefix: string; stem?: string },
	wordSpelling: Record<string, string>,
	usedSpellings: Set<string>,
) {
	const display = displayLabel(label, wordSpelling, usedSpellings);
	const stem = normalizeText(categoryLabel.stem ?? categoryLabel.prefix);
	const needsPrefix =
		categoryLabel.prefix.length > 0 && !normalizeText(display).includes(stem);
	return capitalize(
		needsPrefix ? `${categoryLabel.prefix} ${display}` : display,
	);
}

function normalizeArgentineMobile(raw: string): string | null {
	const digits = raw.replace(/\D/g, "");
	// Only the Buenos Aires shape the sheet uses: 11 + eight digits. Other area
	// codes vary in length, so guessing their split would invent a number.
	const match = /^11(\d{4})(\d{4})$/.exec(digits);
	if (!match) return null;
	return `+54 9 11 ${match[1]} ${match[2]}`;
}

const FOOTER_PATTERNS = {
	email: /^e-?mail:\s*(\S+@\S+)$/i,
	phone: /^cel\.?\s*([\d\s-]+)$/i,
	paymentTerms: /^forma de pago:\s*(.+)$/i,
	disclaimer: /precios pueden variar/i,
	vat: /precios no incluyen iva/i,
};

class Collector {
	readonly issues: ParseIssue[] = [];
	readonly rowLog: RowLogEntry[] = [];

	issue(
		severity: IssueSeverity,
		row: number | null,
		code: string,
		message: string,
	) {
		this.issues.push({ severity, row, code, message });
	}

	error(row: number | null, code: string, message: string) {
		this.issue("error", row, code, message);
	}

	log(row: number, part: RowLogEntry["part"], kind: RowKind) {
		this.rowLog.push({ row, part, kind });
	}

	get hasErrors() {
		return this.issues.some((issue) => issue.severity === "error");
	}
}

function pickCells(cells: Record<string, string>, columns: string[]) {
	const picked: Record<string, string> = {};
	for (const column of columns) {
		const value = cells[column];
		if (value !== undefined && value.trim() !== "") picked[column] = value;
	}
	return picked;
}

function columnIndex(column: string) {
	return [...column].reduce(
		(index, letter) => index * 26 + letter.charCodeAt(0) - 64,
		0,
	);
}

function isHeading(value: string) {
	return /\p{L}/u.test(value) && value === value.toLocaleUpperCase("es");
}

export function parseQuintalSheet(
	sheet: XlsxSheet,
	overrides: QuintalOverrides,
	source: QuintalSource,
): QuintalParseResult {
	const out = new Collector();
	const listings: DraftListing[] = [];
	const surcharges: DraftSurcharge[] = [];
	const tiersByHeading = new Map<string, DraftTier[]>();
	const footer: Partial<Record<keyof typeof FOOTER_PATTERNS, string>> = {};
	const usedOverrides: UsedOverrides = {
		priceResolutions: new Set(),
		surchargeTargets: new Set(),
		splitVariants: new Set(),
		sideTableTargets: new Set(),
		categoryLabels: new Set(),
		subcategoryLabels: new Set(),
		wordSpelling: new Set(),
		excludedCategories: new Set(),
	};

	if (sheet.name !== QUINTAL_SHEET_NAME) {
		out.error(
			null,
			"wrong-sheet",
			`Se esperaba la hoja "${QUINTAL_SHEET_NAME}"`,
		);
	}

	const rows = [...sheet.rows].sort((a, b) => a.row - b.row);
	const headerIndex = rows.findIndex(
		(row) => normalizeText(row.cells.B ?? "") === "producto",
	);
	const header = rows[headerIndex];
	if (
		!header ||
		normalizeText(header.cells.C ?? "") !== "detalle" ||
		!normalizeText(header.cells.D ?? "").startsWith("ref") ||
		normalizeText(header.cells.E ?? "") !== "precio"
	) {
		out.error(
			header?.row ?? null,
			"header-not-found",
			'No se encontró el encabezado "Producto | Detalle | Ref. $/Kg | Precio" en B:E',
		);
		return { catalog: null, issues: out.issues, rowLog: out.rowLog };
	}

	for (const row of rows.slice(0, headerIndex)) {
		out.log(row.row, "main", "unrecognized");
		out.error(
			row.row,
			"before-header",
			"Celdas con datos antes del encabezado",
		);
	}
	out.log(header.row, "main", "header");

	const isMergedAcrossMain = (row: number) =>
		sheet.merges.some(
			(merge) =>
				merge.startRow === row &&
				merge.startColumn === "B" &&
				columnIndex(merge.endColumn) >= columnIndex("E"),
		);
	const isMergedAcrossSide = (row: number) =>
		sheet.merges.some(
			(merge) =>
				merge.startRow === row &&
				merge.startColumn === "H" &&
				columnIndex(merge.endColumn) >= columnIndex("K"),
		);

	let category: { heading: string; unit: Unit; excluded: boolean } | null =
		null;
	let subcategory: string | null = null;
	let lastListing: DraftListing | null = null;
	let sideHeading: string | null = null;

	const parsePack = (
		rowNumber: number,
		cells: Record<string, string>,
		listingUnit: Unit,
	): DraftPack | null => {
		const detail = cleanLabel(cells.C ?? "");
		const parsed = parseDetail(detail);
		if (!parsed) {
			out.error(
				rowNumber,
				"detail-unrecognized",
				`Detalle no reconocido: "${detail}"`,
			);
			return null;
		}

		let unit: Unit;
		if (parsed.unit === "count") {
			if (listingUnit !== "piece") {
				out.error(
					rowNumber,
					"count-without-unit",
					`"${detail}" no indica unidad y la categoría no es por unidad`,
				);
				return null;
			}
			unit = "piece";
		} else {
			unit = parsed.unit;
		}
		if (listingUnit === "piece" && unit === "kg") {
			out.error(
				rowNumber,
				"unit-mismatch",
				`"${detail}" está en kg dentro de una categoría por unidad`,
			);
			return null;
		}

		const unitAmount = parseAmount(cells.D);
		const packAmount = parseAmount(cells.E);
		if (unitAmount === "invalid" || packAmount === "invalid") {
			out.error(
				rowNumber,
				"price-invalid",
				"Precio no numérico o no positivo en D/E",
			);
			return null;
		}

		const quantity = parsed.quantity;
		let unitPrice: Decimal;
		let price: Decimal;
		let priceSource: PriceSource = "listed";

		if (unitAmount && packAmount) {
			const expected = unitAmount.times(quantity);
			if (expected.minus(packAmount).abs().lte(PRICE_TOLERANCE)) {
				unitPrice = money(unitAmount);
				price = money(packAmount);
			} else {
				const resolution = overrides.priceResolutions[rowNumber];
				if (!resolution) {
					out.error(
						rowNumber,
						"price-mismatch",
						`Precio ${packAmount} ≠ ${unitAmount} × ${quantity} y no hay priceResolutions para la fila`,
					);
					return null;
				}
				usedOverrides.priceResolutions.add(rowNumber);
				priceSource = "derived";
				if (resolution.use === "pack") {
					price = money(packAmount);
					unitPrice = money(packAmount.div(quantity));
				} else {
					unitPrice = money(unitAmount);
					price = money(unitAmount.times(quantity));
				}
				out.issue(
					"info",
					rowNumber,
					"price-resolution",
					`D=${unitAmount} y E=${packAmount} no coinciden; se usa ${resolution.use === "pack" ? "E (precio del pack)" : "D (precio unitario)"}: ${resolution.reason}`,
				);
			}
		} else if (unitAmount) {
			unitPrice = money(unitAmount);
			price = money(unitAmount.times(quantity));
			priceSource = "derived";
			out.issue(
				"info",
				rowNumber,
				"pack-price-derived",
				`Sin precio de pack (E): ${unitAmount} × ${quantity} = ${moneyText(price)}`,
			);
		} else if (packAmount) {
			price = money(packAmount);
			unitPrice = money(packAmount.div(quantity));
			priceSource = "derived";
			out.issue(
				"info",
				rowNumber,
				"unit-price-derived",
				`Sin precio unitario (D): ${packAmount} / ${quantity} = ${moneyText(unitPrice)}`,
			);
		} else {
			out.error(
				rowNumber,
				"price-missing",
				"Fila de producto sin precio en D ni E",
			);
			return null;
		}

		return {
			sourceRow: rowNumber,
			detail,
			unit,
			quantity,
			price,
			unitPrice,
			priceSource,
			calibre: parsed.calibre,
			presentation: parsed.presentation,
		};
	};

	const parseSurcharge = (
		rowNumber: number,
		cells: Record<string, string>,
	): DraftSurcharge | null => {
		const amount = parseAmount(cells.D);
		if (!amount || amount === "invalid") {
			out.error(
				rowNumber,
				"surcharge-invalid",
				"Recargo sin monto por kg en D",
			);
			return null;
		}
		const minimumText = normalizeText(cells.E ?? "").replace(/,/g, ".");
		const minimumMatch = new RegExp(
			String.raw`min\.?\s*${NUMBER}\s*${KG_UNIT}`,
		).exec(minimumText);
		const detailQuantity = parseDetail(cells.C ?? "");
		const minimumQuantity = minimumMatch?.[1]
			? new Decimal(minimumMatch[1])
			: detailQuantity?.unit === "kg"
				? detailQuantity.quantity
				: null;
		return {
			sourceRow: rowNumber,
			detail: cleanLabel(cells.C ?? ""),
			surchargePerKg: money(amount),
			minimumQuantity,
		};
	};

	for (const row of rows.slice(headerIndex + 1)) {
		const rowNumber = row.row;
		const main = pickCells(row.cells, MAIN_COLUMNS);
		const side = pickCells(row.cells, SIDE_COLUMNS);
		const other = Object.entries(row.cells).filter(
			([column, value]) =>
				!MAIN_COLUMNS.includes(column) &&
				!SIDE_COLUMNS.includes(column) &&
				value.trim() !== "",
		);

		for (const [column, value] of other) {
			out.log(rowNumber, "other", "stray");
			out.issue(
				"warning",
				rowNumber,
				"stray-cell",
				`Celda ${column}${rowNumber}="${value.trim()}" fuera de la lista; se ignora`,
			);
		}

		if (Object.keys(side).length > 0) {
			const label = cleanLabel(side.H ?? "");
			const tierMatch = /^x\s*(\d+(?:[.,]\d+)?)\s*kgs?$/i.exec(label);
			const tierPrice = parseAmount(side.J);
			if (tierMatch?.[1] && tierPrice && tierPrice !== "invalid") {
				if (!sideHeading) {
					out.log(rowNumber, "side", "unrecognized");
					out.error(
						rowNumber,
						"side-tier-orphan",
						"Escala sin encabezado en H:K",
					);
				} else {
					out.log(rowNumber, "side", "sideTier");
					tiersByHeading.get(sideHeading)?.push({
						sourceRow: rowNumber,
						minQuantity: new Decimal(tierMatch[1].replace(",", ".")),
						unitPrice: money(tierPrice),
					});
				}
			} else if (
				label &&
				!side.J &&
				!side.I &&
				!side.K &&
				isMergedAcrossSide(rowNumber)
			) {
				out.log(rowNumber, "side", "sideHeading");
				sideHeading = label;
				if (tiersByHeading.has(label)) {
					out.error(
						rowNumber,
						"side-heading-duplicate",
						`Encabezado "${label}" repetido`,
					);
				}
				tiersByHeading.set(label, []);
			} else {
				out.log(rowNumber, "side", "unrecognized");
				out.error(
					rowNumber,
					"side-unrecognized",
					`Tabla lateral H:K no reconocida: ${JSON.stringify(side)}`,
				);
			}
		}

		if (Object.keys(main).length === 0) continue;

		const label = main.B !== undefined ? cleanLabel(main.B) : undefined;
		const footerKey = label
			? (
					Object.keys(FOOTER_PATTERNS) as Array<keyof typeof FOOTER_PATTERNS>
				).find((key) => FOOTER_PATTERNS[key].test(label))
			: undefined;

		if (label && footerKey && !main.C && !main.D && !main.E) {
			out.log(rowNumber, "main", "footer");
			footer[footerKey] = FOOTER_PATTERNS[footerKey].exec(label)?.[1] ?? label;
			continue;
		}

		if (label && !main.C) {
			if (!isHeading(label)) {
				out.log(rowNumber, "main", "unrecognized");
				out.error(
					rowNumber,
					"row-unrecognized",
					`Fila no reconocida: "${label}"`,
				);
				continue;
			}
			if (isMergedAcrossMain(rowNumber)) {
				if (!category) {
					out.log(rowNumber, "main", "unrecognized");
					out.error(
						rowNumber,
						"subcategory-orphan",
						"Subcategoría sin categoría",
					);
					continue;
				}
				out.log(rowNumber, "main", "subcategory");
				if (overrides.subcategoryLabels[label] !== undefined) {
					usedOverrides.subcategoryLabels.add(label);
				} else if (!category.excluded) {
					out.error(
						rowNumber,
						"subcategory-label-missing",
						`Subcategoría "${label}" sin entrada en subcategoryLabels`,
					);
				}
				subcategory = label;
				lastListing = null;
				continue;
			}

			out.log(rowNumber, "main", "category");
			let unit: Unit = "kg";
			const unitHeader = main.D !== undefined ? normalizeText(main.D) : "";
			const packHeader = main.E !== undefined ? normalizeText(main.E) : "";
			if (
				unitHeader === "unidad" &&
				(packHeader === "" || packHeader === "pack")
			) {
				unit = "piece";
				out.issue(
					"info",
					rowNumber,
					"category-by-unit",
					`"${label}" redefine las columnas como Unidad/Pack: sus productos se venden por unidad`,
				);
			} else if (main.D !== undefined || main.E !== undefined) {
				out.issue(
					"warning",
					rowNumber,
					"heading-extra-cells",
					`Encabezado "${label}" con celdas extra (D="${main.D ?? ""}", E="${main.E ?? ""}"); se ignoran`,
				);
			}
			const excluded = overrides.excludedCategories.includes(label);
			if (excluded) {
				usedOverrides.excludedCategories.add(label);
			} else {
				if (overrides.categoryLabels[label]) {
					usedOverrides.categoryLabels.add(label);
				} else {
					out.error(
						rowNumber,
						"category-label-missing",
						`Categoría "${label}" sin entrada en categoryLabels`,
					);
				}
			}
			category = { heading: label, unit, excluded };
			subcategory = null;
			lastListing = null;
			continue;
		}

		if (!main.C) {
			out.log(rowNumber, "main", "unrecognized");
			out.error(
				rowNumber,
				"row-unrecognized",
				`Fila sin producto ni detalle: ${JSON.stringify(main)}`,
			);
			continue;
		}

		if (!category) {
			out.log(rowNumber, "main", "unrecognized");
			out.error(
				rowNumber,
				"product-orphan",
				"Producto antes de la primera categoría",
			);
			continue;
		}

		if (category.excluded) {
			out.log(rowNumber, "main", "excluded");
			continue;
		}

		if (!label) {
			if (!lastListing) {
				out.log(rowNumber, "main", "unrecognized");
				out.error(
					rowNumber,
					"continuation-orphan",
					"Fila de continuación sin producto anterior",
				);
				continue;
			}
			const unitAmount = parseAmount(main.D);
			const parentPrice = lastListing.packs[0]?.unitPrice;
			const looksLikeSurcharge =
				/adicional/.test(normalizeText(main.C)) ||
				(unitAmount instanceof Decimal &&
					parentPrice !== undefined &&
					unitAmount.lt(parentPrice.times(SURCHARGE_PRICE_SHARE)));
			const listedAsSurcharge =
				overrides.surchargeTargets[rowNumber] !== undefined;

			if (looksLikeSurcharge || listedAsSurcharge) {
				out.log(rowNumber, "main", "surcharge");
				if (!listedAsSurcharge) {
					out.error(
						rowNumber,
						"surcharge-without-targets",
						`"${cleanLabel(main.C)}" parece un recargo por fraccionado: declarar sus productos en surchargeTargets`,
					);
					continue;
				}
				usedOverrides.surchargeTargets.add(rowNumber);
				const surcharge = parseSurcharge(rowNumber, main);
				if (surcharge) surcharges.push(surcharge);
				continue;
			}

			out.log(rowNumber, "main", "packVariant");
			const pack = parsePack(rowNumber, main, category.unit);
			if (pack) lastListing.packs.push(pack);
			continue;
		}

		out.log(rowNumber, "main", "product");
		const sameLabel = listings.find(
			(listing) =>
				listing.category === category?.heading &&
				normalizeText(listing.sourceLabel) === normalizeText(label),
		);
		const pack = parsePack(rowNumber, main, category.unit);
		if (sameLabel) {
			out.issue(
				"info",
				rowNumber,
				"duplicate-label-merged",
				`"${label}" repite la fila ${sameLabel.firstRow}: se une como otro pack del mismo producto`,
			);
			if (pack) sameLabel.packs.push(pack);
			lastListing = sameLabel;
			continue;
		}
		const listing: DraftListing = {
			category: category.heading,
			subcategory,
			sourceLabel: label,
			firstRow: rowNumber,
			packs: pack ? [pack] : [],
		};
		listings.push(listing);
		lastListing = listing;
	}

	for (const key of Object.keys(FOOTER_PATTERNS) as Array<
		keyof typeof FOOTER_PATTERNS
	>) {
		if (footer[key] === undefined && key !== "disclaimer") {
			out.error(
				null,
				`footer-${key}-missing`,
				`Falta el pie "${FOOTER_PATTERNS[key].source}"`,
			);
		}
	}
	if (footer.disclaimer) {
		out.issue(
			"info",
			null,
			"price-disclaimer",
			`Pie de la lista: "${footer.disclaimer}"`,
		);
	}
	const phone = footer.phone ? normalizeArgentineMobile(footer.phone) : null;
	if (footer.phone && !phone) {
		out.error(
			null,
			"phone-unrecognized",
			`Teléfono "${footer.phone}" no normalizable`,
		);
	}

	const products = buildProducts(
		listings,
		surcharges,
		tiersByHeading,
		overrides,
		out,
		usedOverrides,
	);
	reportUnusedOverrides(overrides, usedOverrides, products, out);

	out.issue(
		"info",
		null,
		"list-date",
		`La planilla no trae fecha: vigencia desde ${overrides.listDate} (fecha de exportación de la lista)`,
	);
	out.issue(
		"info",
		null,
		"supplier-address-placeholder",
		"La planilla no trae dirección del proveedor: se carga la de overrides.supplier.address (a confirmar)",
	);
	out.issue(
		"info",
		null,
		"client-pricing",
		`Precio cliente = precio de lista con margen ${overrides.pricing.marginPercent}%, IVA ${overrides.pricing.vatPercent}%, flete ${overrides.pricing.freightPerKg}/kg y ${overrides.pricing.freightPerPiece}/u, redondeo ${overrides.pricing.roundUpTo ?? "ninguno"}`,
	);

	if (out.hasErrors) {
		return { catalog: null, issues: out.issues, rowLog: out.rowLog };
	}

	const notes: QuintalNote[] = out.issues
		.filter((issue) => issue.severity !== "error")
		.map(({ row, code, message }) => ({ row, code, message }));

	const catalog: QuintalCatalog = {
		source: {
			fileName: source.fileName,
			sha256: source.sha256,
			sheet: QUINTAL_SHEET_NAME,
			listDate: new Date(overrides.listDate).toISOString(),
			pricesIncludeVat: false,
			currency: "ARS",
			paymentTerms: footer.paymentTerms ?? "",
		},
		supplier: {
			name: QUINTAL_SUPPLIER_NAME,
			description: overrides.supplier.description,
			address: { ...overrides.supplier.address },
			contactInfo: {
				contactName: overrides.supplier.contactName,
				email: footer.email,
				phone,
			},
		},
		products,
		notes,
	};

	const validation = quintalCatalogSchema.safeParse(catalog);
	if (!validation.success) {
		for (const issue of validation.error.issues) {
			out.error(null, "schema", `${issue.path.join(".")}: ${issue.message}`);
		}
		return { catalog: null, issues: out.issues, rowLog: out.rowLog };
	}

	return { catalog, issues: out.issues, rowLog: out.rowLog };
}

function clientUnitPrice(
	refPrice: Decimal,
	unit: Unit,
	pricing: QuintalOverrides["pricing"],
) {
	const freight =
		unit === "kg" ? pricing.freightPerKg : pricing.freightPerPiece;
	const price = refPrice
		.plus(freight)
		.times(new Decimal(1).plus(new Decimal(pricing.vatPercent).div(100)))
		.times(new Decimal(1).plus(new Decimal(pricing.marginPercent).div(100)));
	if (pricing.roundUpTo === null) return money(price);
	const step = new Decimal(pricing.roundUpTo);
	return money(price.div(step).ceil().times(step));
}

function buildProducts(
	listings: DraftListing[],
	surcharges: DraftSurcharge[],
	tiersByHeading: Map<string, DraftTier[]>,
	overrides: QuintalOverrides,
	out: Collector,
	usedOverrides: UsedOverrides,
): QuintalProduct[] {
	const products: QuintalProduct[] = [];

	for (const listing of listings) {
		if (listing.packs.length === 0) continue;
		const units = new Set(listing.packs.map((pack) => pack.unit));
		if (units.size > 1) {
			out.error(
				listing.firstRow,
				"pack-unit-mismatch",
				`"${listing.sourceLabel}" mezcla packs en kg y por unidad`,
			);
			continue;
		}

		// Lowest unit price wins; reduce keeps the earlier row on a tie.
		const primary = listing.packs.reduce((best, pack) =>
			pack.unitPrice.lt(best.unitPrice) ? pack : best,
		);
		const alternates = listing.packs.filter((pack) => pack !== primary);
		const unit = primary.unit;
		const categoryLabel = overrides.categoryLabels[listing.category] ?? {
			prefix: "",
		};
		const split = overrides.splitVariants[listing.firstRow];
		if (split) usedOverrides.splitVariants.add(listing.firstRow);
		const variants = split
			? split.variants.map((variant) => ({
					label: `${split.base} ${variant}`,
					suffix: `--${slugify(variant)}`,
				}))
			: [{ label: listing.sourceLabel, suffix: "" }];

		for (const variant of variants) {
			const generatedKey = `${slugify(listing.category)}--${slugify(listing.sourceLabel)}${variant.suffix}`;
			const key = overrides.keyAliases[generatedKey] ?? generatedKey;
			const name =
				overrides.nameOverrides[key] ??
				productName(
					variant.label,
					categoryLabel,
					overrides.wordSpelling,
					usedOverrides.wordSpelling,
				);

			const refPrice = primary.unitPrice;
			const unitPrice = clientUnitPrice(refPrice, unit, overrides.pricing);
			const clientQuantities = {
				...overrides.clientTerms,
				...overrides.clientTermsOverrides[key],
			};

			const descriptionParts = [`${name}.`];
			const subcategoryLabel = listing.subcategory
				? overrides.subcategoryLabels[listing.subcategory]
				: undefined;
			if (subcategoryLabel) descriptionParts.push(subcategoryLabel);
			if (primary.calibre) descriptionParts.push(`Calibre ${primary.calibre}.`);
			descriptionParts.push(
				`Presentación del proveedor: ${primary.presentation}.`,
			);

			products.push({
				key,
				sourceRows: listing.packs.map((pack) => pack.sourceRow),
				category: listing.category,
				subcategory: listing.subcategory,
				sourceLabel: listing.sourceLabel,
				name,
				description: descriptionParts.join(" "),
				unit,
				supplierTerms: {
					sourceRow: primary.sourceRow,
					detail: primary.detail,
					moq: quantityText(primary.quantity),
					moqPrice: moneyText(primary.price),
					step: quantityText(primary.quantity),
					stepPrice: moneyText(primary.price),
					refPrice: moneyText(refPrice),
					priceSource: primary.priceSource,
				},
				clientTerms: {
					moq: quantityText(new Decimal(clientQuantities.moq)),
					moqPrice: moneyText(money(unitPrice.times(clientQuantities.moq))),
					step: quantityText(new Decimal(clientQuantities.step)),
					stepPrice: moneyText(money(unitPrice.times(clientQuantities.step))),
					max:
						clientQuantities.max === null
							? null
							: quantityText(new Decimal(clientQuantities.max)),
					unitPrice: moneyText(unitPrice),
				},
				alternatePacks: alternates.map((pack) => ({
					sourceRow: pack.sourceRow,
					detail: pack.detail,
					quantity: quantityText(pack.quantity),
					price: moneyText(pack.price),
					unitPrice: moneyText(pack.unitPrice),
					priceSource: pack.priceSource,
				})),
				bulkTiers: [],
				fractionSurcharge: null,
			});
		}
	}

	const byKey = new Map<string, QuintalProduct>();
	const byName = new Map<string, string>();
	for (const product of products) {
		if (byKey.has(product.key)) {
			out.error(
				product.sourceRows[0] ?? null,
				"key-collision",
				`Clave repetida "${product.key}"`,
			);
		}
		byKey.set(product.key, product);
		const nameKey = normalizeText(product.name);
		const other = byName.get(nameKey);
		if (other) {
			out.error(
				product.sourceRows[0] ?? null,
				"name-collision",
				`"${product.name}" (${product.key}) repite el nombre de ${other}`,
			);
		}
		byName.set(nameKey, product.key);
	}

	for (const [heading, tiers] of tiersByHeading) {
		const targetKey = overrides.sideTableTargets[heading];
		const firstRow = tiers[0]?.sourceRow ?? null;
		if (!targetKey) {
			out.error(
				firstRow,
				"side-target-missing",
				`Tabla lateral "${heading}" sin sideTableTargets`,
			);
			continue;
		}
		usedOverrides.sideTableTargets.add(heading);
		const product = byKey.get(targetKey);
		if (!product) {
			out.error(
				firstRow,
				"side-target-unknown",
				`sideTableTargets["${heading}"] = "${targetKey}" no existe`,
			);
			continue;
		}
		const primaryPrice = new Decimal(product.supplierTerms.refPrice);
		for (const tier of tiers) {
			if (tier.unitPrice.gt(primaryPrice)) {
				out.error(
					tier.sourceRow,
					"bulk-tier-above-list",
					`Escala ${tier.unitPrice} supera el precio por kg ${primaryPrice} de ${targetKey}`,
				);
			}
		}
		product.bulkTiers = tiers.map((tier) => ({
			sourceRow: tier.sourceRow,
			minQuantity: quantityText(tier.minQuantity),
			unitPrice: moneyText(tier.unitPrice),
		}));
		out.issue(
			"info",
			firstRow,
			"bulk-tiers-reference",
			`Escalas por volumen de "${heading}" asociadas a ${targetKey}: solo referencia, no se cargan como términos`,
		);
	}

	for (const surcharge of surcharges) {
		for (const targetKey of overrides.surchargeTargets[surcharge.sourceRow] ??
			[]) {
			const product = byKey.get(targetKey);
			if (!product) {
				out.error(
					surcharge.sourceRow,
					"surcharge-target-unknown",
					`surchargeTargets apunta a "${targetKey}", que no existe`,
				);
				continue;
			}
			if (product.unit !== "kg" || product.fractionSurcharge) {
				out.error(
					surcharge.sourceRow,
					"surcharge-target-invalid",
					`${targetKey} no es por kg o ya tiene recargo`,
				);
				continue;
			}
			product.fractionSurcharge = {
				sourceRow: surcharge.sourceRow,
				detail: surcharge.detail,
				surchargePerKg: moneyText(surcharge.surchargePerKg),
				minimumQuantity: surcharge.minimumQuantity
					? quantityText(surcharge.minimumQuantity)
					: null,
			};
		}
		out.issue(
			"info",
			surcharge.sourceRow,
			"fraction-surcharge-reference",
			`Recargo por fraccionado "${surcharge.detail}" (${moneyText(surcharge.surchargePerKg)}/kg): solo referencia, no se carga`,
		);
	}

	return products;
}

function reportUnusedOverrides(
	overrides: QuintalOverrides,
	used: UsedOverrides,
	products: QuintalProduct[],
	out: Collector,
) {
	const keys = new Set(products.map((product) => product.key));
	const unused: string[] = [];
	const rowsOf = (record: Record<number, unknown>) =>
		Object.keys(record).map(Number);

	for (const row of rowsOf(overrides.priceResolutions)) {
		if (!used.priceResolutions.has(row))
			unused.push(`priceResolutions[${row}]`);
	}
	for (const row of rowsOf(overrides.surchargeTargets)) {
		if (!used.surchargeTargets.has(row))
			unused.push(`surchargeTargets[${row}]`);
	}
	for (const row of rowsOf(overrides.splitVariants)) {
		if (!used.splitVariants.has(row)) unused.push(`splitVariants[${row}]`);
	}
	for (const heading of Object.keys(overrides.sideTableTargets)) {
		if (!used.sideTableTargets.has(heading))
			unused.push(`sideTableTargets["${heading}"]`);
	}
	for (const heading of Object.keys(overrides.categoryLabels)) {
		if (!used.categoryLabels.has(heading))
			unused.push(`categoryLabels["${heading}"]`);
	}
	for (const heading of Object.keys(overrides.subcategoryLabels)) {
		if (!used.subcategoryLabels.has(heading)) {
			unused.push(`subcategoryLabels["${heading}"]`);
		}
	}
	for (const word of Object.keys(overrides.wordSpelling)) {
		if (!used.wordSpelling.has(word)) unused.push(`wordSpelling["${word}"]`);
	}
	for (const heading of overrides.excludedCategories) {
		if (!used.excludedCategories.has(heading)) {
			unused.push(`excludedCategories["${heading}"]`);
		}
	}
	for (const key of Object.keys(overrides.nameOverrides)) {
		if (!keys.has(key)) unused.push(`nameOverrides["${key}"]`);
	}
	for (const key of Object.keys(overrides.clientTermsOverrides)) {
		if (!keys.has(key)) unused.push(`clientTermsOverrides["${key}"]`);
	}
	for (const key of Object.values(overrides.keyAliases)) {
		if (!keys.has(key)) unused.push(`keyAliases → "${key}"`);
	}

	for (const entry of unused) {
		out.error(
			null,
			"override-unused",
			`${entry} no corresponde a ninguna fila o producto de la planilla`,
		);
	}
}
