import "server-only";

import { TRPCError } from "@trpc/server";
import {
	cartMutationOutputSchema,
	cartSnapshotSchema,
} from "~/schemas/cart.schemas";
import { db } from "~/server/db";
import { toPrismaInputJson } from "~/server/services/admin/_base/prisma-json";
import type {
	CartItem,
	CartLocalItemInput,
	CartMutationOutput,
	CartSnapshot,
	CartWarning,
} from "~/shared/common/cart.types";
import type { CatalogClientTerms } from "~/shared/common/catalog.types";
import {
	buildCartSnapshot,
	calculateLineTotal,
	normalizeCartQuantity,
	quantitiesEqual,
	selectProductImage,
	toNumber,
	toQuantityString,
} from "~/shared/common/commerce.helpers";
import { termsToClientTerms } from "../_base/client-terms.mapper";
import { isClientTermsUsable } from "../_base/terms-validity";
import {
	type CartItemMutationRecord,
	type CartProductClientTermsRecord,
	type CartRecord,
	createCartItem,
	createCurrentCart,
	findActiveCartItemByTerms,
	findCartById,
	findCurrentCartByUserId,
	findCurrentCartForMutationByUserId,
	findProductClientTermsForCart,
	listActiveCartItemsByTerms,
	listProductClientTermsForCart,
	softDeleteCartItem,
	softDeleteCartItemsByCartId,
	updateCartItemQuantity,
} from "./cart.data";

type CartDb = typeof db;

function emptyCart(): CartSnapshot {
	return {
		id: null,
		code: null,
		status: null,
		items: [],
		itemCount: 0,
		totalQuantity: "0",
		totals: [],
	};
}

function buildProductSnapshot(terms: CartProductClientTermsRecord) {
	return {
		source: "cart",
		capturedAt: new Date().toISOString(),
		productClientTerms: termsToClientTerms(terms),
		product: {
			id: terms.product.id,
			name: terms.product.name,
			description: terms.product.description,
			unit: terms.product.unit,
			brandName: terms.product.brand?.name ?? null,
			imageUrl: selectProductImage(terms.product, "cart"),
		},
	};
}

function toCartItem(item: CartRecord["cartItems"][number]): CartItem {
	const terms = termsToClientTerms(item.productClientTerms);

	return {
		productClientTermsId: item.productClientTermsId,
		quantity: item.quantity.toString(),
		lineTotal: calculateLineTotal(terms, item.quantity.toString()),
		product: {
			id: item.productClientTerms.product.id,
			name: item.productClientTerms.product.name,
			description: item.productClientTerms.product.description,
			unit: item.productClientTerms.product.unit,
			brandName: item.productClientTerms.product.brand?.name ?? null,
			imageUrl: selectProductImage(item.productClientTerms.product, "cart"),
		},
		terms,
	};
}

function mapCart(record: CartRecord | null): CartSnapshot {
	if (!record) return emptyCart();

	return buildCartSnapshot(record.cartItems.map(toCartItem), {
		id: record.id,
		code: record.code,
		status: record.status,
	});
}

async function getOrCreateCurrentCart(
	database: Parameters<CartDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
	userId: string,
) {
	const existing = await findCurrentCartForMutationByUserId(database, userId);
	return existing ?? createCurrentCart(database, userId);
}

async function assertUsableTerms(
	database: Parameters<CartDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
	productClientTermsId: number,
	now: Date,
) {
	const terms = await findProductClientTermsForCart(
		database,
		productClientTermsId,
	);

	if (!terms || !isClientTermsUsable(terms, now)) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "El producto ya no esta disponible para agregar al carrito",
		});
	}

	return terms;
}

function normalizeWithWarning(
	productClientTermsId: number,
	quantity: string,
	terms: CatalogClientTerms,
): { quantity: string; warning: CartWarning | null } {
	const normalized = normalizeCartQuantity(quantity, terms);

	if (quantitiesEqual(normalized, quantity)) {
		return { quantity: normalized, warning: null };
	}

	return {
		quantity: normalized,
		warning: {
			type: "quantity_adjusted",
			productClientTermsId,
			message: "Ajustamos la cantidad para respetar MOQ, step y maximo.",
		},
	};
}

async function upsertCartItem(
	database: Parameters<CartDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
	cartId: number,
	terms: CartProductClientTermsRecord,
	quantity: string,
	existing: CartItemMutationRecord | null,
) {
	if (existing) {
		return updateCartItemQuantity(database, existing.id, quantity);
	}

	return createCartItem(database, {
		cartId,
		productClientTermsId: terms.id,
		productSnapshot: toPrismaInputJson(buildProductSnapshot(terms)),
		quantity,
	});
}

async function getCartSnapshot(cartId: number) {
	const record = await findCartById(db, cartId);
	return mapCart(record);
}

export async function getCurrent(userId: string): Promise<CartSnapshot> {
	const cart = await findCurrentCartByUserId(db, userId);
	return cartSnapshotSchema.parse(mapCart(cart));
}

export async function syncLocal(
	userId: string,
	items: CartLocalItemInput[],
): Promise<CartMutationOutput> {
	const now = new Date();

	const mutation = await db.$transaction(async (tx) => {
		const existingCart = await findCurrentCartForMutationByUserId(tx, userId);

		if (items.length === 0 && !existingCart) {
			return { cartId: null, warnings: [] };
		}

		const cart = existingCart ?? (await createCurrentCart(tx, userId));
		const warnings: CartWarning[] = [];
		const localQuantityByTerms = new Map<number, number>();

		for (const item of items) {
			localQuantityByTerms.set(
				item.productClientTermsId,
				(localQuantityByTerms.get(item.productClientTermsId) ?? 0) +
					(toNumber(item.quantity) ?? 0),
			);
		}

		const ids = Array.from(localQuantityByTerms.keys());
		const [termsRecords, existingItems] = await Promise.all([
			listProductClientTermsForCart(tx, ids),
			listActiveCartItemsByTerms(tx, cart.id, ids),
		]);

		const termsById = new Map(termsRecords.map((terms) => [terms.id, terms]));
		const existingItemByTermsId = new Map(
			existingItems.map((item) => [item.productClientTermsId, item]),
		);

		for (const [productClientTermsId, localQuantity] of localQuantityByTerms) {
			const terms = termsById.get(productClientTermsId);

			if (!terms || !isClientTermsUsable(terms, now)) {
				warnings.push({
					type: "item_unavailable",
					productClientTermsId,
					message: "Quitamos un producto que ya no esta disponible.",
				});
				continue;
			}

			const existingItem =
				existingItemByTermsId.get(productClientTermsId) ?? null;
			const mergedQuantity =
				(toNumber(existingItem?.quantity.toString()) ?? 0) + localQuantity;
			const normalized = normalizeWithWarning(
				productClientTermsId,
				toQuantityString(mergedQuantity),
				termsToClientTerms(terms),
			);

			if (normalized.warning) warnings.push(normalized.warning);
			await upsertCartItem(
				tx,
				cart.id,
				terms,
				normalized.quantity,
				existingItem,
			);
		}

		return {
			cartId: cart.id,
			warnings,
		};
	});

	const output = {
		cart: mutation.cartId
			? await getCartSnapshot(mutation.cartId)
			: emptyCart(),
		warnings: mutation.warnings,
	};

	return cartMutationOutputSchema.parse(output);
}

export async function setItemQuantity(
	userId: string,
	input: CartLocalItemInput,
): Promise<CartMutationOutput> {
	const now = new Date();

	const mutation = await db.$transaction(async (tx) => {
		const cart = await getOrCreateCurrentCart(tx, userId);
		const terms = await assertUsableTerms(tx, input.productClientTermsId, now);
		const normalized = normalizeWithWarning(
			input.productClientTermsId,
			input.quantity,
			termsToClientTerms(terms),
		);
		const existing = await findActiveCartItemByTerms(tx, cart.id, terms.id);

		await upsertCartItem(tx, cart.id, terms, normalized.quantity, existing);

		return {
			cartId: cart.id,
			warning: normalized.warning,
		};
	});

	const output = {
		cart: await getCartSnapshot(mutation.cartId),
		warnings: mutation.warning ? [mutation.warning] : [],
	};

	return cartMutationOutputSchema.parse(output);
}

export async function removeItem(
	userId: string,
	productClientTermsId: number,
): Promise<CartMutationOutput> {
	const mutation = await db.$transaction(async (tx) => {
		const cart = await findCurrentCartForMutationByUserId(tx, userId);
		if (!cart) return { cartId: null };

		const item = await findActiveCartItemByTerms(
			tx,
			cart.id,
			productClientTermsId,
		);
		if (item) await softDeleteCartItem(tx, item.id);

		return { cartId: cart.id };
	});

	const output = {
		cart: mutation.cartId
			? await getCartSnapshot(mutation.cartId)
			: emptyCart(),
		warnings: [],
	};

	return cartMutationOutputSchema.parse(output);
}

export async function clear(userId: string): Promise<CartMutationOutput> {
	const mutation = await db.$transaction(async (tx) => {
		const cart = await findCurrentCartForMutationByUserId(tx, userId);
		if (!cart) return { cartId: null };

		await softDeleteCartItemsByCartId(tx, cart.id);

		return { cartId: cart.id };
	});

	const output = {
		cart: mutation.cartId
			? await getCartSnapshot(mutation.cartId)
			: emptyCart(),
		warnings: [],
	};

	return cartMutationOutputSchema.parse(output);
}
