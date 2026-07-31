import type { Prisma } from "~/prisma/client";
import {
	homeOfferCandidateListOutputSchema,
	homeOfferPinSchema,
	homeOfferSettingsSchema,
} from "~/schemas/admin/home-offers.schemas";
import type { db } from "~/server/db";
import type {
	HomeOfferCandidate,
	HomeOfferSetPinnedRankInput,
	HomeOfferSetSpotlightInput,
	HomeOfferSettingsUpdateInput,
} from "~/shared/common/admin-crud/home-offers.types";
import {
	getMarketSaving,
	getPerUnitPrice,
} from "~/shared/common/commerce.helpers";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { throwConflict, throwNotFound } from "./_base/admin-crud.errors";
import {
	countCurrentClientTerms,
	findHomeOfferProduct,
	type HomeOfferCandidateTermsRecord,
	type HomeOfferPinnedProductRecord,
	type HomeOfferProductRecord,
	type HomeOfferSettingsRecord,
	listHomeOfferCandidateTerms,
	listPinnedProducts,
	setProductHomeOfferRank,
	upsertHomeOfferSettings,
} from "./home-offers.data";

type AdminDb = typeof db;

const HOME_OFFER_SETTINGS_ENTITY = "homeOfferSettings";
const PRODUCT_ENTITY = "product";
const HOME_OFFER_SETTINGS_ENTITY_ID = "1";

function parseSettings(record: HomeOfferSettingsRecord) {
	return homeOfferSettingsSchema.parse(record);
}

function parsePin(record: HomeOfferProductRecord) {
	return homeOfferPinSchema.parse({
		productId: record.id,
		name: record.name,
		pinnedRank: record.homeOfferRank,
	});
}

function toCandidate(
	record: HomeOfferCandidateTermsRecord,
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
		pinnedRank: record.product.homeOfferRank,
		hasCurrentTerms: true,
		currency: record.currency,
		...terms,
		offerUnitPrice: getPerUnitPrice(terms),
		marketSaving: getMarketSaving(terms)?.perBlock ?? null,
		productClientTermsId: record.id,
		termsFromDate: record.fromDate,
		termsToDate: record.toDate,
	};
}

function toStalePinCandidate(
	record: HomeOfferPinnedProductRecord,
): HomeOfferCandidate {
	return {
		productId: record.id,
		name: record.name,
		unit: record.unit,
		brandName: record.brand?.name ?? null,
		pinnedRank: record.homeOfferRank,
		hasCurrentTerms: false,
		currency: null,
		moq: null,
		moqPrice: null,
		unitPrice: null,
		marketPrice: null,
		discountPercent: null,
		offerUnitPrice: null,
		marketSaving: null,
		productClientTermsId: null,
		termsFromDate: null,
		termsToDate: null,
	};
}

/**
 * Curation only ever points at products the home can actually render. A pin or
 * a spotlight on a product without vigente client terms is a silent no-op: the
 * grid skips it and the admin has no way of telling the pin was ignored.
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

export async function getSettings(database: AdminDb) {
	return parseSettings(await upsertHomeOfferSettings(database));
}

export async function listCandidates(database: AdminDb) {
	const [termsRecords, pinnedProducts] = await Promise.all([
		listHomeOfferCandidateTerms(database, new Date()),
		listPinnedProducts(database),
	]);

	// A product can carry more than one vigente terms row; the newest wins, the
	// same way the home dedupes before ranking.
	const byProduct = new Map<number, HomeOfferCandidate>();
	for (const record of termsRecords) {
		if (byProduct.has(record.product.id)) continue;
		byProduct.set(record.product.id, toCandidate(record));
	}

	for (const product of pinnedProducts) {
		if (byProduct.has(product.id)) continue;
		byProduct.set(product.id, toStalePinCandidate(product));
	}

	return homeOfferCandidateListOutputSchema.parse([...byProduct.values()]);
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
		if (input.productId !== null) await assertOfferable(tx, input.productId);

		const before = parseSettings(await upsertHomeOfferSettings(tx));
		const after = parseSettings(
			await upsertHomeOfferSettings(tx, {
				spotlightProductId: input.productId,
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

export async function setPinnedRank(
	input: HomeOfferSetPinnedRankInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		// Unpinning stays available for a product that can no longer be offered:
		// otherwise a stale pin could never be cleaned up.
		const current =
			input.rank === null
				? await findHomeOfferProduct(tx, input.productId)
				: await assertOfferable(tx, input.productId);
		if (!current) throwNotFound("Producto");

		const before = parsePin(current);
		const after = parsePin(
			await setProductHomeOfferRank(tx, input.productId, input.rank),
		);

		await writeAdminAuditLog(tx, {
			action: "product.setHomeOfferRank",
			actor,
			entityType: PRODUCT_ENTITY,
			entityId: String(after.productId),
			before,
			after,
		});

		return after;
	});
}
