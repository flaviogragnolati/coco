import type {
	PriceSheetChange,
	PriceSheetPreview,
	PriceSheetPreviewRow,
} from "~/shared/common/admin-crud/price-sheet.types";
import { normalizeLabel, type PriceSheetRow } from "./price-sheet.file";
import {
	centsToDecimalString,
	decimalStringToCents,
	parsePriceCell,
} from "./price-sheet.number";

export const PRICE_SHEET_LARGE_VARIATION_PERCENT = 30;

type CategoryReference = { id: number; name: string };

export type PriceSheetProduct = {
	id: number;
	name: string;
	unitLabel: string;
	deleted: boolean;
	category: CategoryReference | null;
	/** The current client terms the catalog sells from; null when there are none. */
	terms: {
		id: number;
		currency: string;
		unitPrice: string | null;
		moq: string;
		moqPrice: string;
	} | null;
};

/** Every non-deleted category. */
export type PriceSheetCategory = CategoryReference & { active: boolean };

const PRICE_ERROR_BY_REASON = {
	invalid: "no es un número",
	decimals: "tiene más de dos decimales",
	range: "está fuera de rango",
} as const;

export function parsePriceSheetId(cell: PriceSheetRow["id"]) {
	if (!cell) return { ok: false as const, error: "Falta el id del producto" };
	const value = cell.numeric
		? Number(cell.text)
		: /^\d+$/.test(cell.text)
			? Number(cell.text)
			: Number.NaN;
	return Number.isSafeInteger(value) && value > 0
		? { ok: true as const, id: value }
		: { ok: false as const, error: `El id "${cell.text}" no es válido` };
}

type PlanTerms = NonNullable<PriceSheetProduct["terms"]>;

/** Legacy terms have no unit price; their charged price is moqPrice / moq. */
function effectiveUnitCents(terms: PlanTerms) {
	if (terms.unitPrice !== null) return decimalStringToCents(terms.unitPrice);
	const moqPrice = decimalStringToCents(terms.moqPrice);
	const moq = Number(terms.moq);
	return moqPrice === null || !(moq > 0) ? null : Math.round(moqPrice / moq);
}

/** The unit price the terms charge today, as a two-decimal string. */
export function currentUnitPrice(terms: PlanTerms) {
	const cents = effectiveUnitCents(terms);
	return cents === null ? null : centsToDecimalString(cents);
}

function variationPercent(currentCents: number | null, nextCents: number) {
	if (currentCents === null || currentCents <= 0) return null;
	return ((nextCents - currentCents) / currentCents) * 100;
}

function resolveCategory(
	text: string,
	categoriesByLabel: Map<string, PriceSheetCategory[]>,
) {
	const matches = categoriesByLabel.get(normalizeLabel(text)) ?? [];
	const [category] = matches;
	if (!category) {
		return { ok: false as const, error: `No existe la categoría "${text}"` };
	}
	if (matches.length > 1) {
		return {
			ok: false as const,
			error: `Hay más de una categoría llamada "${text}"`,
		};
	}
	if (!category.active) {
		return {
			ok: false as const,
			error: `La categoría "${category.name}" está inactiva`,
		};
	}
	return { ok: true as const, category };
}

/**
 * Turns an uploaded sheet into the preview and the exact edits an apply would
 * write. All or nothing: one row error makes the whole plan unappliable. Rows
 * that change nothing are only counted.
 */
export function planPriceSheet(
	rows: PriceSheetRow[],
	products: PriceSheetProduct[],
	categories: PriceSheetCategory[],
): PriceSheetPreview {
	const productsById = new Map(
		products.map((product) => [product.id, product]),
	);
	const categoriesByLabel = new Map<string, PriceSheetCategory[]>();
	for (const category of categories) {
		const label = normalizeLabel(category.name);
		categoriesByLabel.set(label, [
			...(categoriesByLabel.get(label) ?? []),
			category,
		]);
	}

	const rowNumbersById = new Map<number, number[]>();
	for (const row of rows) {
		const id = parsePriceSheetId(row.id);
		if (id.ok) {
			rowNumbersById.set(id.id, [
				...(rowNumbersById.get(id.id) ?? []),
				row.rowNumber,
			]);
		}
	}

	const previewRows: PriceSheetPreviewRow[] = [];
	const changes: PriceSheetChange[] = [];
	let unchangedCount = 0;

	for (const row of rows) {
		const errors: string[] = [];
		const id = parsePriceSheetId(row.id);
		if (!id.ok) errors.push(id.error);

		const product = id.ok ? productsById.get(id.id) : undefined;
		if (id.ok && (!product || product.deleted)) {
			errors.push(`No existe un producto con id ${id.id}`);
		}
		const duplicates = id.ok ? (rowNumbersById.get(id.id) ?? []) : [];
		if (id.ok && duplicates.length > 1) {
			errors.push(
				`El id ${id.id} está repetido (filas ${duplicates.join(", ")})`,
			);
		}
		const usable = product && !product.deleted ? product : undefined;

		let price: PriceSheetPreviewRow["price"] = null;
		let priceChange: PriceSheetChange["price"] = null;
		if (row.newPrice) {
			const parsed = parsePriceCell(row.newPrice);
			if (!parsed.ok) {
				errors.push(
					`El precio nuevo "${row.newPrice.text}" ${PRICE_ERROR_BY_REASON[parsed.reason]}`,
				);
			} else if (parsed.cents <= 0) {
				errors.push("El precio nuevo tiene que ser mayor a 0");
			} else if (usable && !usable.terms) {
				errors.push("El producto no tiene términos de cliente vigentes");
			} else if (usable?.terms) {
				const storedCents =
					usable.terms.unitPrice === null
						? null
						: decimalStringToCents(usable.terms.unitPrice);
				if (storedCents !== parsed.cents) {
					const currentCents = effectiveUnitCents(usable.terms);
					const next = centsToDecimalString(parsed.cents);
					price = {
						current:
							currentCents === null ? null : centsToDecimalString(currentCents),
						next,
						variationPercent: variationPercent(currentCents, parsed.cents),
					};
					priceChange = {
						from:
							storedCents === null ? null : centsToDecimalString(storedCents),
						to: next,
					};
				}
			}
		}

		let category: PriceSheetPreviewRow["category"] = null;
		let categoryChange: PriceSheetChange["category"] = null;
		if (row.category) {
			const resolved = resolveCategory(row.category.text, categoriesByLabel);
			if (!resolved.ok) {
				errors.push(resolved.error);
			} else if (usable && usable.category?.id !== resolved.category.id) {
				category = {
					current: usable.category,
					next: { id: resolved.category.id, name: resolved.category.name },
				};
				categoryChange = {
					from: usable.category?.id ?? null,
					to: resolved.category.id,
				};
			}
		}

		const changed = priceChange !== null || categoryChange !== null;
		if (errors.length === 0 && !changed) {
			unchangedCount += 1;
			continue;
		}

		const variation = price?.variationPercent ?? null;
		previewRows.push({
			rowNumber: row.rowNumber,
			productId: id.ok ? id.id : null,
			productName: usable?.name ?? null,
			unitLabel: usable?.unitLabel ?? null,
			currency: usable?.terms?.currency ?? null,
			price:
				price && variation !== null
					? { ...price, variationPercent: Math.round(variation * 10) / 10 }
					: price,
			category,
			largeVariation:
				variation !== null &&
				Math.abs(variation) > PRICE_SHEET_LARGE_VARIATION_PERCENT,
			errors,
		});

		if (errors.length === 0 && usable) {
			changes.push({
				productId: usable.id,
				termsId: priceChange ? (usable.terms?.id ?? null) : null,
				price: priceChange,
				category: categoryChange,
			});
		}
	}

	const errorCount = previewRows.filter((row) => row.errors.length > 0).length;
	return {
		rows: previewRows,
		changes,
		unchangedCount,
		errorCount,
		largeVariationCount: previewRows.filter((row) => row.largeVariation).length,
		canApply: errorCount === 0 && changes.length > 0,
	};
}

function changeKey(change: PriceSheetChange) {
	return JSON.stringify([
		change.termsId,
		change.price?.from ?? null,
		change.price?.to ?? null,
		change.category?.from ?? null,
		change.category?.to ?? null,
	]);
}

/**
 * Products whose edit differs between what the admin previewed and what the
 * same file plans against the data now. Empty means the preview still holds.
 */
export function stalePriceSheetProductIds(
	expected: PriceSheetChange[],
	actual: PriceSheetChange[],
) {
	const expectedByProduct = new Map(
		expected.map((change) => [change.productId, changeKey(change)]),
	);
	const actualByProduct = new Map(
		actual.map((change) => [change.productId, changeKey(change)]),
	);
	const productIds = new Set([
		...expectedByProduct.keys(),
		...actualByProduct.keys(),
	]);
	return [...productIds]
		.filter(
			(productId) =>
				expectedByProduct.get(productId) !== actualByProduct.get(productId),
		)
		.sort((a, b) => a - b);
}
