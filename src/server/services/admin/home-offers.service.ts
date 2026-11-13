import type { Prisma } from "~/prisma/client";
import {
	homeComboCandidateListOutputSchema,
	homeFeaturedListItemSchema,
	homeFeaturedListOutputSchema,
	homeFeaturedPreviewSchema,
	homeOfferCandidateListOutputSchema,
	homeOfferSettingsSchema,
} from "~/schemas/admin/home-offers.schemas";
import type { db } from "~/server/db";
import type {
	FeaturedTargetInput,
	HomeFeaturedAddInput,
	HomeFeaturedListItem,
	HomeFeaturedRemoveInput,
	HomeFeaturedReorderInput,
	HomeOfferCandidate,
	HomeOfferSetSpotlightInput,
	HomeOfferSettingsUpdateInput,
} from "~/shared/common/admin-crud/home-offers.types";
import {
	getMarketSaving,
	getPerUnitPrice,
} from "~/shared/common/commerce.helpers";
import type { HomeFeature } from "~/shared/common/home.types";
import { countPaidOrdersByProduct } from "../home/home.data";
import { composeCurrentHomeFeatured } from "../home/home.service";
import { comboCardKey } from "../home/home-featured";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { throwConflict, throwNotFound } from "./_base/admin-crud.errors";
import { listCurrentComboTerms } from "./combo.data";
import {
	countCurrentClientTerms,
	createFeaturedItem,
	deleteFeaturedItem,
	findFeaturedItemByTarget,
	findHomeFeaturedCombo,
	findHomeOfferProduct,
	type HomeFeaturedComboRecord,
	type HomeFeaturedItemRecord,
	type HomeOfferCandidateTermsRecord,
	type HomeOfferSettingsRecord,
	listActiveComboGroups,
	listComboCandidates as listComboCandidateRecords,
	listFeaturedItems,
	listHomeOfferCandidateTerms,
	rewriteFeaturedPositions,
	upsertHomeOfferSettings,
} from "./home-offers.data";

type AdminDb = typeof db;

const HOME_OFFER_SETTINGS_ENTITY = "homeOfferSettings";
const HOME_FEATURED_ITEM_ENTITY = "homeFeaturedItem";
const HOME_OFFER_SETTINGS_ENTITY_ID = "1";

function parseSettings(record: HomeOfferSettingsRecord) {
	const spotlight: FeaturedTargetInput | null =
		record.spotlightProductId !== null
			? { kind: "product", productId: record.spotlightProductId }
			: record.spotlightComboId !== null
				? { kind: "combo", comboId: record.spotlightComboId }
				: null;

	return homeOfferSettingsSchema.parse({ ...record, spotlight });
}

function toCandidate(
	record: HomeOfferCandidateTermsRecord,
	paidOrderCount: number,
): HomeOfferCandidate {
	const terms = {
		moq: record.moq.toString(),
		moqPrice: record.moqPrice.toString(),
		unitPrice: record.unitPrice?.toString() ?? null,
		marketPrice: record.marketPrice?.toString() ?? null,
		discountPercent: record.discountPercent?.toString() ?? null,
	};

	return {
		productId: record.product.id,
		name: record.product.name,
		unit: record.product.unit,
		brandName: record.product.brand?.name ?? null,
		currency: record.currency,
		...terms,
		offerUnitPrice: getPerUnitPrice(terms),
		marketSaving: getMarketSaving(terms)?.perBlock ?? null,
		paidOrderCount,
		productClientTermsId: record.id,
		termsFromDate: record.fromDate,
		termsToDate: record.toDate,
	};
}

/**
 * Curation only points at products the home can render: a pick without
 * vigente client terms would be skipped silently by the home.
 */
async function assertOfferable(
	database: Prisma.TransactionClient,
	productId: number,
) {
	const product = await findHomeOfferProduct(database, productId);
	if (!product) throwNotFound("Producto");

	if (!product.active || product.deleted) {
		throwConflict(`${product.name} no está activo, no puede ir al home`);
	}

	const currentTerms = await countCurrentClientTerms(
		database,
		productId,
		new Date(),
	);
	if (currentTerms === 0) {
		throwConflict(
			`${product.name} no tiene términos de cliente vigentes, no se mostraría en el home`,
		);
	}

	return product;
}

async function assertComboActive(
	database: Prisma.TransactionClient,
	comboId: number,
) {
	const combo = await findHomeFeaturedCombo(database, comboId);
	if (!combo || combo.deleted) throwNotFound("Combo");
	if (!combo.active) {
		throwConflict(`${combo.name} está inactivo, no puede ir al home`);
	}
	return combo;
}

async function assertTargetShowable(
	database: Prisma.TransactionClient,
	target: FeaturedTargetInput,
) {
	if (target.kind === "product") {
		await assertOfferable(database, target.productId);
	} else {
		await assertComboActive(database, target.comboId);
	}
}

function targetWhere(target: FeaturedTargetInput) {
	return target.kind === "product"
		? { productId: target.productId }
		: { comboId: target.comboId };
}

export async function getSettings(database: AdminDb) {
	return parseSettings(await upsertHomeOfferSettings(database));
}

export async function listCandidates(database: AdminDb) {
	const now = new Date();
	const [termsRecords, paidOrderCounts] = await Promise.all([
		listHomeOfferCandidateTerms(database, now),
		countPaidOrdersByProduct(database, now),
	]);

	// A product can carry more than one vigente terms row; the newest wins, the
	// same way the home dedupes before ranking.
	const byProduct = new Map<number, HomeOfferCandidate>();
	for (const record of termsRecords) {
		if (byProduct.has(record.product.id)) continue;
		byProduct.set(
			record.product.id,
			toCandidate(record, paidOrderCounts.get(record.product.id) ?? 0),
		);
	}

	return homeOfferCandidateListOutputSchema.parse([...byProduct.values()]);
}

export async function listComboCandidates(database: AdminDb) {
	const records = await listComboCandidateRecords(database);
	return homeComboCandidateListOutputSchema.parse(
		records.map(({ id, ...combo }) => ({ comboId: id, ...combo })),
	);
}

function itemName(item: HomeFeaturedItemRecord) {
	return item.product?.name ?? item.combo?.name ?? "-";
}

export type FeaturedBand = {
	/** The chosen band product, when it can be shown. */
	productId: number | null;
	/** The chosen band combo, when it is active. */
	combo: HomeFeaturedComboRecord | null;
};

/**
 * What the home does with each entry of the list, in the order it walks it:
 * the same skips `composeHomeFeatured` makes, so the admin sees why an entry
 * takes no place. A combo card shows when any active combo of its group has a
 * product available (`shownGroupKeys`), even if the listed combo has none.
 */
export function describeFeaturedItems(
	items: HomeFeaturedItemRecord[],
	availableProductIds: ReadonlySet<number>,
	shownGroupKeys: ReadonlySet<string>,
	band: FeaturedBand,
): HomeFeaturedListItem[] {
	const shownCardBy = new Map<string, string>();
	if (band.combo && shownGroupKeys.has(comboCardKey(band.combo))) {
		shownCardBy.set(comboCardKey(band.combo), band.combo.name);
	}

	return items.flatMap((item) => {
		const name = itemName(item);
		const base = { id: item.id, position: item.position, name };

		if (item.productId !== null) {
			const product = item.product;
			const showable =
				product?.active &&
				!product.deleted &&
				availableProductIds.has(item.productId);
			return homeFeaturedListItemSchema.parse({
				...base,
				target: { kind: "product", productId: item.productId },
				status: !showable
					? "noPrice"
					: band.productId === item.productId
						? "inBand"
						: "shown",
				sharedWithName: null,
			});
		}

		const combo = item.combo;
		if (item.comboId === null || !combo) return [];
		const target = { kind: "combo", comboId: item.comboId };
		if (!combo.active || combo.deleted) {
			return homeFeaturedListItemSchema.parse({
				...base,
				target,
				status: "inactive",
				sharedWithName: null,
			});
		}

		const key = comboCardKey(combo);
		if (!shownGroupKeys.has(key)) {
			return homeFeaturedListItemSchema.parse({
				...base,
				target,
				status: "noPrice",
				sharedWithName: null,
			});
		}
		const sharedWithName = shownCardBy.get(key) ?? null;
		if (sharedWithName === null) shownCardBy.set(key, combo.name);

		return homeFeaturedListItemSchema.parse({
			...base,
			target,
			status: sharedWithName === null ? "shown" : "sharedCard",
			sharedWithName,
		});
	});
}

export async function listFeatured(database: AdminDb) {
	const [items, settings, activeCombos] = await Promise.all([
		listFeaturedItems(database),
		upsertHomeOfferSettings(database),
		listActiveComboGroups(database),
	]);
	const spotlightCombo =
		settings.spotlightComboId === null
			? null
			: await findHomeFeaturedCombo(database, settings.spotlightComboId);
	const productIds = [
		...new Set([
			...items.flatMap((item) =>
				item.productId === null ? [] : [item.productId],
			),
			...activeCombos.flatMap((combo) =>
				combo.items.map((comboItem) => comboItem.productId),
			),
			...(settings.spotlightProductId === null
				? []
				: [settings.spotlightProductId]),
		]),
	];
	const terms = await listCurrentComboTerms(database, new Date(), productIds);
	const shownGroupKeys = new Set(
		activeCombos
			.filter((combo) =>
				combo.items.some((comboItem) => terms.has(comboItem.productId)),
			)
			.map(comboCardKey),
	);
	const band: FeaturedBand = {
		productId:
			settings.spotlightProductId !== null &&
			terms.has(settings.spotlightProductId)
				? settings.spotlightProductId
				: null,
		combo:
			spotlightCombo?.active && !spotlightCombo.deleted ? spotlightCombo : null,
	};

	return homeFeaturedListOutputSchema.parse(
		describeFeaturedItems(items, new Set(terms.keys()), shownGroupKeys, band),
	);
}

export async function updateSettings(
	input: HomeOfferSettingsUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const before = parseSettings(await upsertHomeOfferSettings(tx));
		const after = parseSettings(await upsertHomeOfferSettings(tx, input));

		await writeAdminAuditLog(tx, {
			action: "homeOfferSettings.update",
			actor,
			entityType: HOME_OFFER_SETTINGS_ENTITY,
			entityId: HOME_OFFER_SETTINGS_ENTITY_ID,
			before,
			after,
		});

		return after;
	});
}

export async function setSpotlight(
	input: HomeOfferSetSpotlightInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		if (input.target) await assertTargetShowable(tx, input.target);

		const before = parseSettings(await upsertHomeOfferSettings(tx));
		const after = parseSettings(
			await upsertHomeOfferSettings(tx, {
				spotlightProductId:
					input.target?.kind === "product" ? input.target.productId : null,
				spotlightComboId:
					input.target?.kind === "combo" ? input.target.comboId : null,
			}),
		);

		await writeAdminAuditLog(tx, {
			action: "homeOfferSettings.setSpotlight",
			actor,
			entityType: HOME_OFFER_SETTINGS_ENTITY,
			entityId: HOME_OFFER_SETTINGS_ENTITY_ID,
			before,
			after,
		});

		return after;
	});
}

export async function addFeatured(
	input: HomeFeaturedAddInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const where = targetWhere(input.target);
		if (await findFeaturedItemByTarget(tx, where)) {
			throwConflict("Ya está en la lista de destacados.");
		}
		await assertTargetShowable(tx, input.target);

		const created = await createFeaturedItem(tx, where);
		await writeAdminAuditLog(tx, {
			action: "homeFeaturedItem.add",
			actor,
			entityType: HOME_FEATURED_ITEM_ENTITY,
			entityId: String(created.id),
			after: { ...where, position: created.position },
		});

		return { id: created.id };
	});
}

/** Removing never needs the target to still be showable: stale entries must go. */
export async function removeFeatured(
	input: HomeFeaturedRemoveInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const items = await listFeaturedItems(tx);
		if (!items.some((item) => item.id === input.id)) {
			throwNotFound("Destacado");
		}

		const removed = await deleteFeaturedItem(tx, input.id);
		await writeAdminAuditLog(tx, {
			action: "homeFeaturedItem.remove",
			actor,
			entityType: HOME_FEATURED_ITEM_ENTITY,
			entityId: String(removed.id),
			before: {
				productId: removed.productId,
				comboId: removed.comboId,
				position: removed.position,
			},
		});

		return { id: removed.id };
	});
}

/**
 * The ids must be exactly the current list: an admin working from a stale
 * page (another tab added or removed an entry) gets refused instead of
 * silently dropping or duplicating places.
 */
export async function reorderFeatured(
	input: HomeFeaturedReorderInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const current = await listFeaturedItems(tx);
		const currentIds = current.map((item) => item.id);
		const requested = new Set(input.ids);
		if (
			requested.size !== input.ids.length ||
			requested.size !== currentIds.length ||
			currentIds.some((id) => !requested.has(id))
		) {
			throwConflict("La lista cambió; recargá la página.");
		}

		await rewriteFeaturedPositions(tx, input.ids);
		await writeAdminAuditLog(tx, {
			action: "homeFeaturedItem.reorder",
			actor,
			entityType: HOME_FEATURED_ITEM_ENTITY,
			entityId: "list",
			before: { ids: currentIds },
			after: { ids: input.ids },
		});

		return { ids: input.ids };
	});
}

function previewName(feature: HomeFeature) {
	if (feature.kind === "product") return feature.offer.productName;
	const { combo } = feature;
	const open =
		combo.options.find((option) => option.comboId === combo.initialComboId) ??
		combo.options[0];
	return open?.name ?? "-";
}

/** What the home shows right now, computed by the home itself. */
export async function preview(database: AdminDb) {
	const content = await composeCurrentHomeFeatured(database);
	const entry = (feature: (typeof content.featured)[number]) => ({
		id:
			feature.kind === "product"
				? feature.offer.productId
				: feature.combo.initialComboId,
		kind: feature.kind,
		name: previewName(feature),
		source: feature.source,
	});

	return homeFeaturedPreviewSchema.parse({
		spotlight: content.spotlight ? entry(content.spotlight) : null,
		featured: content.featured.map(entry),
	});
}
