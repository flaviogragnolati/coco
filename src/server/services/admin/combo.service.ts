import {
	comboDetailSchema,
	comboGroupOptionsSchema,
	comboListOutputSchema,
	comboProductOptionListSchema,
	comboStatsSchema,
} from "~/schemas/admin/combo.schemas";
import type { db } from "~/server/db";
import type {
	ComboCreateInput,
	ComboDeleteInput,
	ComboDetail,
	ComboListInput,
	ComboListItem,
	ComboStats,
	ComboUpdateInput,
} from "~/shared/common/admin-crud/combo.types";
import { termsToClientTerms } from "../_base/client-terms.mapper";
import { comboCardKey } from "../home/home-featured";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { throwConflict, throwNotFound } from "./_base/admin-crud.errors";
import {
	type ComboDetailRecord,
	type ComboWrite,
	createCombo,
	findComboById,
	getComboStats,
	getHomeVisibility,
	hardDeleteCombo,
	listComboGroupNames,
	listCombos,
	listCurrentComboTerms,
	listGroupSiblings,
	listProductsByIds,
	removeComboFromHome,
	softDeleteCombo,
	updateCombo,
} from "./combo.data";
import {
	type ComboProductTerms,
	normalizeComboGroupName,
	validateComboGroup,
	validateComboItems,
} from "./combo.decision";

type AdminDb = typeof db;
type AdminTx = Parameters<Parameters<AdminDb["$transaction"]>[0]>[0];

const COMBO_ENTITY = "combo";

function parseDetail(record: ComboDetailRecord): ComboDetail {
	return comboDetailSchema.parse({
		...record,
		items: record.items.map((item) => ({
			productId: item.productId,
			productName: item.product.name,
			quantity: item.quantity,
			unit: item.product.unit,
			presentationContainer: item.product.presentationContainer,
			presentationSize: item.product.presentationSize,
		})),
	});
}

/**
 * Shown means the home renders it: active, with a product available today, and
 * reached through the featured list or the band, by itself or by an active
 * sibling of its group whose card it shares.
 */
function buildListItems(
	records: ComboDetailRecord[],
	availableProductIds: ReadonlySet<number>,
	visibleComboIds: ReadonlySet<number>,
): ComboListItem[] {
	const visibleKeys = new Set(
		records
			.filter(
				(record) =>
					record.active && !record.deleted && visibleComboIds.has(record.id),
			)
			.map(comboCardKey),
	);

	return records.map((record) => {
		const unavailableProductNames = record.items
			.filter((item) => !availableProductIds.has(item.productId))
			.map((item) => item.product.name);
		const shownOnHome =
			record.active &&
			!record.deleted &&
			unavailableProductNames.length < record.items.length &&
			visibleKeys.has(comboCardKey(record));

		return {
			id: record.id,
			name: record.name,
			description: record.description,
			people: record.people,
			groupName: record.groupName,
			active: record.active,
			deleted: record.deleted,
			itemCount: record.items.length,
			unavailableProductNames,
			shownOnHome,
			updatedAt: record.updatedAt,
		};
	});
}

async function listWithWarnings(input: ComboListInput, database: AdminDb) {
	const records = await listCombos(database, input);
	const productIds = [
		...new Set(
			records.flatMap((record) => record.items.map((i) => i.productId)),
		),
	];
	const [terms, visibility] = await Promise.all([
		listCurrentComboTerms(database, new Date(), productIds),
		getHomeVisibility(database),
	]);
	const visibleComboIds = new Set(visibility.featuredComboIds);
	if (visibility.spotlightComboId !== null) {
		visibleComboIds.add(visibility.spotlightComboId);
	}

	return buildListItems(records, new Set(terms.keys()), visibleComboIds);
}

export async function list(input: ComboListInput, database: AdminDb) {
	return comboListOutputSchema.parse(await listWithWarnings(input, database));
}

export async function getById(id: number, database: AdminDb) {
	const combo = await findComboById(database, id);
	if (!combo) throwNotFound("Combo");
	return parseDetail(combo);
}

export async function getStats(database: AdminDb): Promise<ComboStats> {
	return comboStatsSchema.parse(await getComboStats(database));
}

export async function listProductOptions(database: AdminDb) {
	const terms = await listCurrentComboTerms(database, new Date());
	return comboProductOptionListSchema.parse(
		[...terms.values()]
			.map((record) => ({
				productId: record.product.id,
				name: record.product.name,
				unit: record.product.unit,
				presentationContainer: record.product.presentationContainer,
				presentationSize: record.product.presentationSize,
				moq: record.moq,
				step: record.step,
				max: record.max,
				currency: record.currency,
			}))
			.sort((left, right) => left.name.localeCompare(right.name, "es")),
	);
}

export async function listGroupNames(database: AdminDb) {
	return comboGroupOptionsSchema.parse(await listComboGroupNames(database));
}

/** Validates against the group and today's terms, or throws every error at once. */
async function prepareWrite(
	tx: AdminTx,
	input: ComboCreateInput,
	id?: number,
): Promise<ComboWrite> {
	const groupName = normalizeComboGroupName(input.groupName);
	const productIds = input.items.map((item) => item.productId);
	const [siblings, products, terms] = await Promise.all([
		groupName ? listGroupSiblings(tx, groupName) : Promise.resolve([]),
		listProductsByIds(tx, productIds),
		listCurrentComboTerms(tx, new Date(), productIds),
	]);

	const productsById = new Map<number, ComboProductTerms>(
		products.map((product) => {
			const current = terms.get(product.id);
			return [
				product.id,
				{
					name: product.name,
					unit: product.unit,
					presentationContainer: product.presentationContainer,
					terms: current ? termsToClientTerms(current) : null,
				},
			];
		}),
	);

	const groupError = validateComboGroup(
		{ id, groupName, people: input.people },
		siblings,
	);
	const errors = [
		...(groupError ? [groupError] : []),
		...validateComboItems(input.items, productsById),
	];
	if (errors.length > 0) throwConflict(errors.join(" "));

	return {
		name: input.name,
		description: input.description,
		people: input.people,
		groupName,
		active: input.active,
		items: input.items,
	};
}

export async function create(
	input: ComboCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const combo = parseDetail(
			await createCombo(tx, await prepareWrite(tx, input)),
		);

		await writeAdminAuditLog(tx, {
			action: "combo.create",
			actor,
			entityType: COMBO_ENTITY,
			entityId: String(combo.id),
			after: combo,
		});

		return combo;
	});
}

export async function update(
	input: ComboUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findComboById(tx, input.id);
		if (!beforeRecord) throwNotFound("Combo");
		const before = parseDetail(beforeRecord);
		if (before.deleted) throwConflict("No se puede editar un combo eliminado");

		const after = parseDetail(
			await updateCombo(tx, input.id, await prepareWrite(tx, input, input.id)),
		);

		await writeAdminAuditLog(tx, {
			action: "combo.update",
			actor,
			entityType: COMBO_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: ComboDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findComboById(tx, input.id);
		if (!beforeRecord) throwNotFound("Combo");
		const before = parseDetail(beforeRecord);

		await removeComboFromHome(tx, input.id);
		const after = parseDetail(await softDeleteCombo(tx, input.id));

		await writeAdminAuditLog(tx, {
			action: "combo.softDelete",
			actor,
			entityType: COMBO_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

/** The cascade takes its products and featured entry, and the band falls back. */
export async function hardDelete(
	input: ComboDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findComboById(tx, input.id);
		if (!beforeRecord) throwNotFound("Combo");
		const before = parseDetail(beforeRecord);

		const deleted = await hardDeleteCombo(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "combo.hardDelete",
			actor,
			entityType: COMBO_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
