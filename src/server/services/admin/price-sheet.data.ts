import type { Prisma } from "~/prisma/client";
import { currentTermsWhere } from "~/server/services/_base/terms-validity";

type AdminDbClient = Prisma.TransactionClient;

const priceSheetTermsSelect = {
	id: true,
	currency: true,
	unitPrice: true,
	moq: true,
	moqPrice: true,
	step: true,
	stepPrice: true,
} satisfies Prisma.ProductClientTermsSelect;

function priceSheetProductSelect(now: Date) {
	return {
		id: true,
		name: true,
		unit: true,
		presentationContainer: true,
		presentationSize: true,
		deleted: true,
		category: { select: { id: true, name: true } },
		// The same pick the catalog sells from (catalog.data.ts).
		productClientTerms: {
			where: currentTermsWhere(now),
			select: priceSheetTermsSelect,
			orderBy: [{ fromDate: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
			take: 1,
		},
	} satisfies Prisma.ProductSelect;
}

export type PriceSheetProductRecord = Prisma.ProductGetPayload<{
	select: ReturnType<typeof priceSheetProductSelect>;
}>;

export type PriceSheetTermsRecord = Prisma.ProductClientTermsGetPayload<{
	select: typeof priceSheetTermsSelect;
}>;

export async function listPriceSheetDownloadProducts(
	db: AdminDbClient,
	now: Date,
) {
	return db.product.findMany({
		where: {
			active: true,
			deleted: false,
			productClientTerms: { some: currentTermsWhere(now) },
		},
		select: priceSheetProductSelect(now),
		orderBy: [
			{ category: { sortOrder: "asc" } },
			{ name: "asc" },
			{ id: "asc" },
		],
	});
}

export async function findPriceSheetProducts(
	db: AdminDbClient,
	ids: number[],
	now: Date,
) {
	return db.product.findMany({
		where: { id: { in: ids } },
		select: priceSheetProductSelect(now),
	});
}

export async function listPriceSheetCategories(db: AdminDbClient) {
	return db.category.findMany({
		where: { deleted: false },
		select: { id: true, name: true, active: true },
	});
}

/**
 * Edits the terms in place, only if they still hold the previewed price and
 * the quantities the derived prices come from. Returns the rows written: 0
 * means someone changed them meanwhile.
 */
export async function updatePriceSheetTermsPrice(
	db: AdminDbClient,
	input: {
		terms: PriceSheetTermsRecord;
		unitPrice: string;
		moqPrice: string;
		stepPrice: string | null;
		now: Date;
	},
) {
	const { count } = await db.productClientTerms.updateMany({
		where: {
			...currentTermsWhere(input.now),
			id: input.terms.id,
			unitPrice: input.terms.unitPrice,
			moq: input.terms.moq,
			step: input.terms.step,
		},
		data: {
			unitPrice: input.unitPrice,
			moqPrice: input.moqPrice,
			stepPrice: input.stepPrice,
		},
	});
	return count;
}

export async function updatePriceSheetProductCategory(
	db: AdminDbClient,
	input: { productId: number; from: number | null; to: number },
) {
	const { count } = await db.product.updateMany({
		where: { id: input.productId, deleted: false, categoryId: input.from },
		data: { categoryId: input.to },
	});
	return count;
}
