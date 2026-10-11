import { randomUUID } from "node:crypto";
import {
	priceSheetApplyResultSchema,
	priceSheetPreviewSchema,
} from "~/schemas/admin/price-sheet.schemas";
import type { db } from "~/server/db";
import { writeXlsxSheet } from "~/server/lib/xlsx/xlsx-writer";
import { deriveClientTermsPrices } from "~/server/services/_base/client-terms-prices";
import type {
	PriceSheetApplyResult,
	PriceSheetChange,
	PriceSheetPreview,
} from "~/shared/common/admin-crud/price-sheet.types";
import { formatUnitLabel } from "~/shared/common/commerce.helpers";
import { BUSINESS_TZ } from "~/shared/common/date.helpers";
import {
	type AdminMutationActor,
	writeAdminAuditLogs,
} from "./_base/admin-audit";
import { AdminCrudError } from "./_base/admin-crud.errors";
import {
	findPriceSheetProducts,
	listPriceSheetCategories,
	listPriceSheetDownloadProducts,
	type PriceSheetProductRecord,
	updatePriceSheetProductCategories,
	updatePriceSheetTermsPrice,
} from "./price-sheet.data";
import {
	PRICE_SHEET_COLUMNS,
	type PriceSheetRow,
	readPriceSheet,
} from "./price-sheet.file";
import {
	currentUnitPrice,
	type PriceSheetProduct,
	parsePriceSheetId,
	planPriceSheet,
	stalePriceSheetProductIds,
} from "./price-sheet.plan";

type AdminDb = typeof db;
type AdminDbClient = Parameters<Parameters<AdminDb["$transaction"]>[0]>[0];

export type PriceSheetUpload = { name: string; bytes: Uint8Array };

const STALE_MESSAGE =
	"Los precios o categorías cambiaron desde la vista previa. Volvé a subir la planilla para revisarla.";

function toPlanProduct(record: PriceSheetProductRecord): PriceSheetProduct {
	const [terms] = record.productClientTerms;
	return {
		id: record.id,
		name: record.name,
		unitLabel: formatUnitLabel(1, record.unit, record),
		deleted: record.deleted,
		category: record.category,
		terms: terms
			? {
					id: terms.id,
					currency: terms.currency,
					unitPrice: terms.unitPrice?.toFixed(2) ?? null,
					moq: terms.moq.toString(),
					moqPrice: terms.moqPrice.toFixed(2),
				}
			: null,
	};
}

function readRowsOrThrow(file: PriceSheetUpload) {
	const read = readPriceSheet(file.name, file.bytes);
	if (!read.ok) throw new AdminCrudError("BAD_REQUEST", read.error);
	return read.rows;
}

async function loadPlan(
	database: AdminDbClient,
	rows: PriceSheetRow[],
	now: Date,
) {
	const ids = [
		...new Set(
			rows.flatMap((row) => {
				const id = parsePriceSheetId(row.id);
				return id.ok ? [id.id] : [];
			}),
		),
	];
	const [records, categories] = await Promise.all([
		ids.length > 0 ? findPriceSheetProducts(database, ids, now) : [],
		listPriceSheetCategories(database),
	]);
	return {
		plan: planPriceSheet(rows, records.map(toPlanProduct), categories),
		recordsById: new Map(records.map((record) => [record.id, record])),
	};
}

function sheetDate(now: Date) {
	return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(
		now,
	);
}

export async function buildPriceSheetDownload(
	database: AdminDb,
	now = new Date(),
) {
	const records = await listPriceSheetDownloadProducts(database, now);
	const rows = records.map((record) => {
		const product = toPlanProduct(record);
		const price = product.terms ? currentUnitPrice(product.terms) : null;
		return [
			product.id,
			product.name,
			product.unitLabel,
			product.category?.name ?? null,
			price === null ? null : Number(price),
			null,
		];
	});

	return {
		fileName: `precios-${sheetDate(now)}.xlsx`,
		bytes: writeXlsxSheet({
			sheetName: "Precios",
			headerRow: true,
			columnWidths: [8, 44, 18, 24, 14, 14],
			rows: [[...PRICE_SHEET_COLUMNS], ...rows],
		}),
	};
}

export async function previewPriceSheet(
	file: PriceSheetUpload,
	database: AdminDb,
): Promise<PriceSheetPreview> {
	const rows = readRowsOrThrow(file);
	const { plan } = await loadPlan(database, rows, new Date());
	return priceSheetPreviewSchema.parse(plan);
}

/**
 * Re-plans the uploaded file against the data inside the transaction and
 * writes only if it still matches what the admin previewed. Prices are edited
 * on the current terms in place: closing them would drop every open cart
 * line that references them.
 */
export async function applyPriceSheet(
	file: PriceSheetUpload,
	expected: PriceSheetChange[],
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<PriceSheetApplyResult> {
	const rows = readRowsOrThrow(file);

	return database.$transaction(
		async (tx) => {
			const now = new Date();
			const { plan, recordsById } = await loadPlan(tx, rows, now);

			if (plan.errorCount > 0) {
				throw new AdminCrudError(
					"BAD_REQUEST",
					"La planilla tiene errores. Corregilos y volvé a subirla.",
				);
			}
			if (stalePriceSheetProductIds(expected, plan.changes).length > 0) {
				throw new AdminCrudError("CONFLICT", STALE_MESSAGE);
			}
			if (plan.changes.length === 0) {
				throw new AdminCrudError(
					"BAD_REQUEST",
					"La planilla no tiene cambios para aplicar.",
				);
			}

			const batchId = randomUUID();
			const audits: Parameters<typeof writeAdminAuditLogs>[1] = [];
			let priceCount = 0;
			let categoryCount = 0;
			const categoryMoves = new Map<
				string,
				{ from: number | null; to: number; productIds: number[] }
			>();

			for (const change of plan.changes) {
				const record = recordsById.get(change.productId);
				if (!record) throw new AdminCrudError("CONFLICT", STALE_MESSAGE);
				const metadata = {
					batchId,
					fileName: file.name,
					productId: record.id,
				};

				if (change.price) {
					const [terms] = record.productClientTerms;
					if (!terms || terms.id !== change.termsId) {
						throw new AdminCrudError("CONFLICT", STALE_MESSAGE);
					}
					const derived = deriveClientTermsPrices({
						unitPrice: change.price.to,
						moq: terms.moq,
						step: terms.step,
					});
					const written = await updatePriceSheetTermsPrice(tx, {
						terms,
						unitPrice: change.price.to,
						...derived,
						now,
					});
					if (written !== 1)
						throw new AdminCrudError("CONFLICT", STALE_MESSAGE);

					audits.push({
						action: "productClientTerms.priceSheetUpdate",
						actor,
						entityType: "productClientTerms",
						entityId: String(terms.id),
						before: {
							unitPrice: terms.unitPrice?.toFixed(2) ?? null,
							moqPrice: terms.moqPrice.toFixed(2),
							stepPrice: terms.stepPrice?.toFixed(2) ?? null,
						},
						after: { unitPrice: change.price.to, ...derived },
						metadata,
					});
					priceCount += 1;
				}

				if (change.category) {
					const key = `${change.category.from}:${change.category.to}`;
					const group = categoryMoves.get(key) ?? {
						...change.category,
						productIds: [],
					};
					group.productIds.push(record.id);
					categoryMoves.set(key, group);

					audits.push({
						action: "product.priceSheetUpdate",
						actor,
						entityType: "product",
						entityId: String(record.id),
						before: { categoryId: change.category.from },
						after: { categoryId: change.category.to },
						metadata,
					});
					categoryCount += 1;
				}
			}

			for (const move of categoryMoves.values()) {
				const written = await updatePriceSheetProductCategories(tx, move);
				if (written !== move.productIds.length) {
					throw new AdminCrudError("CONFLICT", STALE_MESSAGE);
				}
			}

			await writeAdminAuditLogs(tx, audits);
			return priceSheetApplyResultSchema.parse({ priceCount, categoryCount });
		},
		// Each price is its own conditional update, so a full sheet can outlast
		// the default 60 s against the remote database.
		{ timeout: 180_000 },
	);
}
