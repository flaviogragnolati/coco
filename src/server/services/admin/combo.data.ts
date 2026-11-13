import type { Prisma } from "~/prisma/client";
import type { ComboListInput } from "~/shared/common/admin-crud/combo.types";
import { currentTermsWhere } from "../_base/terms-validity";
import { normalizeComboGroup } from "../home/home-featured";

type AdminDbClient = Prisma.TransactionClient;

const comboItemSelect = {
	productId: true,
	quantity: true,
	sortOrder: true,
	product: {
		select: {
			name: true,
			unit: true,
			presentationContainer: true,
			presentationSize: true,
		},
	},
} satisfies Prisma.ComboItemSelect;

export const comboDetailSelect = {
	id: true,
	name: true,
	description: true,
	people: true,
	groupName: true,
	active: true,
	deleted: true,
	updatedAt: true,
	items: {
		select: comboItemSelect,
		orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
	},
} satisfies Prisma.ComboSelect;

export type ComboDetailRecord = Prisma.ComboGetPayload<{
	select: typeof comboDetailSelect;
}>;

export type ComboWrite = {
	name: string;
	description: string | null;
	people: number | null;
	groupName: string | null;
	active: boolean;
	items: { productId: number; quantity: string }[];
};

function itemRows(items: ComboWrite["items"]) {
	return items.map((item, index) => ({
		productId: item.productId,
		quantity: item.quantity,
		sortOrder: index,
	}));
}

export async function listCombos(db: AdminDbClient, input: ComboListInput) {
	return db.combo.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: comboDetailSelect,
		orderBy: [
			{ deleted: "asc" },
			{ groupName: "asc" },
			{ people: "asc" },
			{ name: "asc" },
		],
	});
}

export async function findComboById(db: AdminDbClient, id: number) {
	return db.combo.findUnique({ where: { id }, select: comboDetailSelect });
}

export async function getComboStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.combo.count(),
		db.combo.count({ where: { active: true, deleted: false } }),
		db.combo.count({ where: { active: false, deleted: false } }),
		db.combo.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createCombo(db: AdminDbClient, input: ComboWrite) {
	const { items, ...combo } = input;
	return db.combo.create({
		data: { ...combo, items: { create: itemRows(items) } },
		select: comboDetailSelect,
	});
}

/** Replaces the whole product list; the caller holds the transaction. */
export async function updateCombo(
	db: AdminDbClient,
	id: number,
	input: ComboWrite,
) {
	const { items, ...combo } = input;
	await db.comboItem.deleteMany({ where: { comboId: id } });
	await db.comboItem.createMany({
		data: itemRows(items).map((row) => ({ ...row, comboId: id })),
	});
	return db.combo.update({
		where: { id },
		data: combo,
		select: comboDetailSelect,
	});
}

export async function softDeleteCombo(db: AdminDbClient, id: number) {
	return db.combo.update({
		where: { id },
		data: { active: false, deleted: true },
		select: comboDetailSelect,
	});
}

export async function hardDeleteCombo(db: AdminDbClient, id: number) {
	return db.combo.delete({ where: { id }, select: { id: true } });
}

/** Takes a combo off the home: its place in the featured list and the band. */
export async function removeComboFromHome(db: AdminDbClient, comboId: number) {
	await db.homeFeaturedItem.deleteMany({ where: { comboId } });
	await db.homeOfferSettings.updateMany({
		where: { spotlightComboId: comboId },
		data: { spotlightComboId: null },
	});
}

export async function listComboGroupNames(db: AdminDbClient) {
	const rows = await db.combo.findMany({
		where: { deleted: false, groupName: { not: null } },
		select: { groupName: true },
		orderBy: [{ groupName: "asc" }, { id: "asc" }],
	});
	const byKey = new Map<string, string>();
	for (const { groupName } of rows) {
		const key = groupName ? normalizeComboGroup(groupName) : "";
		if (groupName && key && !byKey.has(key)) byKey.set(key, groupName);
	}
	return [...byKey.values()];
}

/**
 * The non-deleted combos of a group. Compared in memory with the home's own
 * normalization, so "Desayuno" and " desayuno" are one group; combos are few.
 */
export async function listGroupSiblings(db: AdminDbClient, groupName: string) {
	const key = normalizeComboGroup(groupName);
	const rows = await db.combo.findMany({
		where: { deleted: false, groupName: { not: null } },
		select: { id: true, name: true, people: true, groupName: true },
	});
	return rows.filter(
		(row) => row.groupName && normalizeComboGroup(row.groupName) === key,
	);
}

const comboTermsSelect = {
	id: true,
	moq: true,
	moqPrice: true,
	step: true,
	stepPrice: true,
	max: true,
	unitPrice: true,
	marketPrice: true,
	discountPercent: true,
	currency: true,
	fromDate: true,
	toDate: true,
	product: {
		select: {
			id: true,
			name: true,
			unit: true,
			presentationContainer: true,
			presentationSize: true,
		},
	},
} satisfies Prisma.ProductClientTermsSelect;

export type ComboTermsRecord = Prisma.ProductClientTermsGetPayload<{
	select: typeof comboTermsSelect;
}>;

/**
 * The terms each active product sells under today, the catalog's newest first;
 * only the first row per product counts. Without `productIds`, every product.
 */
export async function listCurrentComboTerms(
	db: AdminDbClient,
	now: Date,
	productIds?: number[],
): Promise<Map<number, ComboTermsRecord>> {
	const records = await db.productClientTerms.findMany({
		where: {
			...currentTermsWhere(now),
			...(productIds ? { productId: { in: productIds } } : {}),
			product: { active: true, deleted: false },
		},
		select: comboTermsSelect,
		orderBy: [{ fromDate: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
	});

	const byProductId = new Map<number, ComboTermsRecord>();
	for (const record of records) {
		if (!byProductId.has(record.product.id)) {
			byProductId.set(record.product.id, record);
		}
	}
	return byProductId;
}

export async function listProductsByIds(db: AdminDbClient, ids: number[]) {
	return db.product.findMany({
		where: { id: { in: ids }, deleted: false },
		select: { id: true, name: true, unit: true, presentationContainer: true },
	});
}

/** Which combos the home curation points at today. */
export async function getHomeVisibility(db: AdminDbClient) {
	const [featured, settings] = await Promise.all([
		db.homeFeaturedItem.findMany({
			where: { comboId: { not: null } },
			select: { comboId: true },
		}),
		db.homeOfferSettings.findUnique({
			where: { id: 1 },
			select: { spotlightComboId: true },
		}),
	]);

	return {
		featuredComboIds: new Set(
			featured.flatMap((row) => (row.comboId === null ? [] : [row.comboId])),
		),
		spotlightComboId: settings?.spotlightComboId ?? null,
	};
}
