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
	calculateLineTotal,
	normalizeCartQuantity,
	quantitiesEqual,
	toMoneyString,
	toNumber,
	toQuantityString,
} from "~/shared/common/commerce.helpers";
import {
	type CartProductClientTermsRecord,
	type CartRecord,
	createCartItem,
	createCurrentCart,
	findActiveCartItemByTerms,
	findCartById,
	findCurrentCartByUserId,
	findProductClientTermsForCart,
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

function selectProductImage(product: {
	cardImageUrl: string | null;
	cartImageUrl: string | null;
}) {
	return product.cartImageUrl ?? product.cardImageUrl;
}

function termsToClientTerms(
	terms: CartProductClientTermsRecord,
): CatalogClientTerms {
	return {
		id: terms.id,
		moq: terms.moq.toString(),
		moqPrice: terms.moqPrice.toString(),
		step: terms.step?.toString() ?? null,
		stepPrice: terms.stepPrice?.toString() ?? null,
		max: terms.max?.toString() ?? null,
		refPrice: terms.refPrice?.toString() ?? null,
		currency: terms.currency,
		fromDate: terms.fromDate,
		toDate: terms.toDate,
	};
}

function termsCanBeUsed(terms: CartProductClientTermsRecord, now: Date) {
	return (
		terms.active &&
		!terms.deleted &&
		terms.product.active &&
		!terms.product.deleted &&
		terms.fromDate <= now &&
		(terms.toDate === null || terms.toDate >= now)
	);
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
			imageUrl: selectProductImage(terms.product),
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
			imageUrl: selectProductImage(item.productClientTerms.product),
		},
		terms,
	};
}

function mapCart(record: CartRecord | null): CartSnapshot {
	if (!record) return emptyCart();

	const items = record.cartItems.map(toCartItem);
	const totalsByCurrency = new Map<string, number>();
	let totalQuantity = 0;

	for (const item of items) {
		totalQuantity += toNumber(item.quantity) ?? 0;
		totalsByCurrency.set(
			item.terms.currency,
			(totalsByCurrency.get(item.terms.currency) ?? 0) +
				(toNumber(item.lineTotal) ?? 0),
		);
	}

	return {
		id: record.id,
		code: record.code,
		status: record.status,
		items,
		itemCount: items.length,
		totalQuantity: toQuantityString(totalQuantity),
		totals: Array.from(totalsByCurrency.entries()).map(
			([currency, amount]) => ({
				currency: currency as CartSnapshot["totals"][number]["currency"],
				amount: toMoneyString(amount),
			}),
		),
	};
}

async function getOrCreateCurrentCart(
	database: Parameters<CartDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
	userId: string,
) {
	const existing = await findCurrentCartByUserId(database, userId);
	return existing ?? createCurrentCart(database, userId);
}

async function assertUsableTerms(
	database: Parameters<CartDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
	productClientTermsId: number,
) {
	const terms = await findProductClientTermsForCart(
		database,
		productClientTermsId,
	);

	if (!terms || !termsCanBeUsed(terms, new Date())) {
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
) {
	const existing = await findActiveCartItemByTerms(database, cartId, terms.id);

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

async function getCartAfterMutation(
	database: Parameters<CartDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
	cartId: number,
) {
	const record = await findCartById(database, cartId);
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
	const output = await db.$transaction(async (tx) => {
		const existingCart = await findCurrentCartByUserId(tx, userId);

		if (items.length === 0 && !existingCart) {
			return { cart: emptyCart(), warnings: [] };
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

		for (const [productClientTermsId, localQuantity] of localQuantityByTerms) {
			const terms = await findProductClientTermsForCart(
				tx,
				productClientTermsId,
			);

			if (!terms || !termsCanBeUsed(terms, new Date())) {
				warnings.push({
					type: "item_unavailable",
					productClientTermsId,
					message: "Quitamos un producto que ya no esta disponible.",
				});
				continue;
			}

			const existingItem = await findActiveCartItemByTerms(
				tx,
				cart.id,
				productClientTermsId,
			);
			const mergedQuantity =
				(toNumber(existingItem?.quantity.toString()) ?? 0) + localQuantity;
			const normalized = normalizeWithWarning(
				productClientTermsId,
				toQuantityString(mergedQuantity),
				termsToClientTerms(terms),
			);

			if (normalized.warning) warnings.push(normalized.warning);
			await upsertCartItem(tx, cart.id, terms, normalized.quantity);
		}

		return {
			cart: await getCartAfterMutation(tx, cart.id),
			warnings,
		};
	});

	return cartMutationOutputSchema.parse(output);
}

export async function setItemQuantity(
	userId: string,
	input: CartLocalItemInput,
): Promise<CartMutationOutput> {
	const output = await db.$transaction(async (tx) => {
		const cart = await getOrCreateCurrentCart(tx, userId);
		const terms = await assertUsableTerms(tx, input.productClientTermsId);
		const normalized = normalizeWithWarning(
			input.productClientTermsId,
			input.quantity,
			termsToClientTerms(terms),
		);

		await upsertCartItem(tx, cart.id, terms, normalized.quantity);

		return {
			cart: await getCartAfterMutation(tx, cart.id),
			warnings: normalized.warning ? [normalized.warning] : [],
		};
	});

	return cartMutationOutputSchema.parse(output);
}

export async function removeItem(
	userId: string,
	productClientTermsId: number,
): Promise<CartMutationOutput> {
	const output = await db.$transaction(async (tx) => {
		const cart = await findCurrentCartByUserId(tx, userId);
		if (!cart) return { cart: emptyCart(), warnings: [] };

		const item = await findActiveCartItemByTerms(
			tx,
			cart.id,
			productClientTermsId,
		);
		if (item) await softDeleteCartItem(tx, item.id);

		return {
			cart: await getCartAfterMutation(tx, cart.id),
			warnings: [],
		};
	});

	return cartMutationOutputSchema.parse(output);
}

export async function clear(userId: string): Promise<CartMutationOutput> {
	const output = await db.$transaction(async (tx) => {
		const cart = await findCurrentCartByUserId(tx, userId);
		if (!cart) return { cart: emptyCart(), warnings: [] };

		await softDeleteCartItemsByCartId(tx, cart.id);

		return {
			cart: await getCartAfterMutation(tx, cart.id),
			warnings: [],
		};
	});

	return cartMutationOutputSchema.parse(output);
}
