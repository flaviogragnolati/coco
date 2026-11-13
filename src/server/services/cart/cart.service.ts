import "server-only";

import { TRPCError } from "@trpc/server";
import {
	cartAddItemsOutputSchema,
	cartMutationOutputSchema,
	cartSnapshotSchema,
} from "~/schemas/cart.schemas";
import { db } from "~/server/db";
import { toPrismaInputJson } from "~/server/services/admin/_base/prisma-json";
import { releaseCheckoutCart } from "~/server/services/checkout/checkout-release";
import { checkoutReleaseBlockedMessage } from "~/server/services/checkout/checkout-release.decision";
import type {
	CartAddedLine,
	CartAddItemInput,
	CartAddItemsOutput,
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
	type CartMutationRecord,
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
	listCurrentClientTermsByProductIds,
	listProductClientTermsForCart,
	softDeleteCartItem,
	softDeleteCartItemsByCartId,
	updateCartItemQuantity,
} from "./cart.data";
import { planCartAdditions } from "./cart-additions.decision";

type CartDb = typeof db;

export type CartTransaction = Parameters<CartDb["$transaction"]>[0] extends (
	tx: infer T,
) => unknown
	? T
	: never;

function emptyCart(): CartSnapshot {
	return {
		id: null,
		code: null,
		status: null,
		items: [],
		itemCount: 0,
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
			presentationContainer: terms.product.presentationContainer,
			presentationSize: terms.product.presentationSize,
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
			presentationContainer:
				item.productClientTerms.product.presentationContainer,
			presentationSize: item.productClientTerms.product.presentationSize,
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

/**
 * Makes a cart editable, or explains why it cannot be.
 *
 * Editing the cart expresses the intent to abandon the checkout it is stuck in,
 * so an abandoned checkout is released here rather than blocking the mutation:
 * without this, a customer who closed the checkout tab keeps a permanently
 * frozen cart. Only a checkout that is genuinely in flight — a payment the
 * provider is holding, or a transfer the customer already reported (ADR 0010) —
 * still refuses, because that cart is a snapshot the order references and must
 * not move under the payment.
 *
 * Runs inside the caller's transaction; every mutation entry point must go
 * through it before touching cart items.
 */
async function ensureCartMutable(
	database: Parameters<CartDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
	cart: CartMutationRecord,
): Promise<CartMutationRecord> {
	if (cart.status !== "atCheckout") return cart;

	const outcome = await releaseCheckoutCart(database, cart);
	if (outcome.decision === "notAtCheckout") return cart;

	// The release only moves the status; the rest of the mutation record still
	// describes the same cart, so there is nothing to re-read.
	if (outcome.decision === "release") return { ...cart, status: "pending" };

	throw new TRPCError({
		code: "PRECONDITION_FAILED",
		message: checkoutReleaseBlockedMessage(outcome.decision),
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
	if (existing) return ensureCartMutable(database, existing);

	return createCurrentCart(database, userId);
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
			message: "El producto ya no está disponible para sumar a tu pedido",
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

		const cart = existingCart
			? await ensureCartMutable(tx, existingCart)
			: await createCurrentCart(tx, userId);
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

/** `name` labels a product that turns out unavailable and has no terms to name it. */
export type CartAddItemRequest = CartAddItemInput & { name?: string };

/**
 * Adds products to the customer's current cart at their current terms, inside
 * the caller's transaction. Additive: a product already in the cart grows by
 * the requested quantity, fitted to the terms. A product with no current terms
 * is reported unavailable and leaves the cart untouched.
 */
export async function addItemsInTransaction(
	tx: CartTransaction,
	userId: string,
	items: CartAddItemRequest[],
	now: Date,
): Promise<{ cartId: number; lines: CartAddedLine[] }> {
	const cart = await getOrCreateCurrentCart(tx, userId);
	const productIds = Array.from(new Set(items.map((item) => item.productId)));
	const termsRecords = await listCurrentClientTermsByProductIds(
		tx,
		productIds,
		now,
	);

	const termsByProductId = new Map<number, CartProductClientTermsRecord>();
	for (const terms of termsRecords) {
		if (!termsByProductId.has(terms.product.id)) {
			termsByProductId.set(terms.product.id, terms);
		}
	}

	const existingItems = await listActiveCartItemsByTerms(
		tx,
		cart.id,
		Array.from(termsByProductId.values(), (terms) => terms.id),
	);
	const existingItemByTermsId = new Map(
		existingItems.map((item) => [item.productClientTermsId, item]),
	);

	const plans = planCartAdditions({
		requests: items,
		termsByProductId: new Map(
			Array.from(termsByProductId, ([productId, terms]) => [
				productId,
				termsToClientTerms(terms),
			]),
		),
		existingQuantityByTermsId: new Map(
			existingItems.map((item) => [
				item.productClientTermsId,
				item.quantity.toString(),
			]),
		),
	});

	const lines: CartAddedLine[] = [];
	for (const plan of plans) {
		const terms = termsByProductId.get(plan.productId);

		if (plan.outcome === "unavailable" || !terms) {
			const requested = items.find((item) => item.productId === plan.productId);
			lines.push({
				productId: plan.productId,
				name: requested?.name ?? "-",
				outcome: "unavailable",
				quantity: null,
			});
			continue;
		}

		await upsertCartItem(
			tx,
			cart.id,
			terms,
			plan.quantity,
			existingItemByTermsId.get(terms.id) ?? null,
		);
		lines.push({
			productId: plan.productId,
			name: terms.product.name,
			outcome: plan.outcome,
			quantity: plan.quantity,
		});
	}

	return { cartId: cart.id, lines };
}

/** Reads the cart back after `addItemsInTransaction` committed. */
export async function readAddItemsOutput(mutation: {
	cartId: number;
	lines: CartAddedLine[];
}): Promise<CartAddItemsOutput> {
	return cartAddItemsOutputSchema.parse({
		cart: await getCartSnapshot(mutation.cartId),
		lines: mutation.lines,
	});
}

/**
 * Adds several products to the current cart at once, by product id. Used by
 * "Repetir pedido" and meant for combos too.
 */
export async function addItems(
	userId: string,
	items: CartAddItemRequest[],
): Promise<CartAddItemsOutput> {
	const now = new Date();
	const mutation = await db.$transaction((tx) =>
		addItemsInTransaction(tx, userId, items, now),
	);
	return readAddItemsOutput(mutation);
}

export async function removeItem(
	userId: string,
	productClientTermsId: number,
): Promise<CartMutationOutput> {
	const mutation = await db.$transaction(async (tx) => {
		const cart = await findCurrentCartForMutationByUserId(tx, userId);
		if (!cart) return { cartId: null };
		await ensureCartMutable(tx, cart);

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
		await ensureCartMutable(tx, cart);

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
