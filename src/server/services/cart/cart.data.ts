import "server-only";

import type { Prisma } from "../../../../generated/prisma/client";

type CartDbClient = Prisma.TransactionClient;

const cartBrandSelect = {
	name: true,
} satisfies Prisma.BrandSelect;

export const cartProductClientTermsSelect = {
	id: true,
	moq: true,
	moqPrice: true,
	step: true,
	stepPrice: true,
	max: true,
	refPrice: true,
	currency: true,
	active: true,
	deleted: true,
	fromDate: true,
	toDate: true,
	product: {
		select: {
			id: true,
			name: true,
			description: true,
			unit: true,
			cardImageUrl: true,
			cartImageUrl: true,
			active: true,
			deleted: true,
			brand: {
				select: cartBrandSelect,
			},
		},
	},
} satisfies Prisma.ProductClientTermsSelect;

const cartItemSelect = {
	id: true,
	productClientTermsId: true,
	quantity: true,
	status: true,
	deleted: true,
	productClientTerms: {
		select: cartProductClientTermsSelect,
	},
} satisfies Prisma.CartItemSelect;

const cartMutationSelect = {
	id: true,
	code: true,
	status: true,
	deleted: true,
} satisfies Prisma.CartSelect;

const cartItemMutationSelect = {
	id: true,
	cartId: true,
	productClientTermsId: true,
	quantity: true,
	status: true,
	deleted: true,
} satisfies Prisma.CartItemSelect;

const cartSelect = {
	id: true,
	code: true,
	status: true,
	deleted: true,
	cartItems: {
		where: { deleted: false, status: "inCart" },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: cartItemSelect,
	},
} satisfies Prisma.CartSelect;

export type CartRecord = Prisma.CartGetPayload<{ select: typeof cartSelect }>;

export type CartMutationRecord = Prisma.CartGetPayload<{
	select: typeof cartMutationSelect;
}>;

export type CartProductClientTermsRecord = Prisma.ProductClientTermsGetPayload<{
	select: typeof cartProductClientTermsSelect;
}>;

export async function findCurrentCartByUserId(
	database: CartDbClient,
	userId: string,
) {
	return database.cart.findFirst({
		where: {
			deleted: false,
			status: { in: ["draft", "pending", "atCheckout"] },
			userId,
		},
		select: cartSelect,
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
	});
}

export async function findCurrentCartForMutationByUserId(
	database: CartDbClient,
	userId: string,
) {
	return database.cart.findFirst({
		where: {
			deleted: false,
			status: { in: ["draft", "pending", "atCheckout"] },
			userId,
		},
		select: cartMutationSelect,
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
	});
}

export async function createCurrentCart(
	database: CartDbClient,
	userId: string,
) {
	return database.cart.create({
		data: {
			code: `CART-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
			deleted: false,
			status: "pending",
			userId,
		},
		select: cartMutationSelect,
	});
}

export async function findProductClientTermsForCart(
	database: CartDbClient,
	productClientTermsId: number,
) {
	return database.productClientTerms.findUnique({
		where: { id: productClientTermsId },
		select: cartProductClientTermsSelect,
	});
}

export async function findActiveCartItemByTerms(
	database: CartDbClient,
	cartId: number,
	productClientTermsId: number,
) {
	return database.cartItem.findFirst({
		where: {
			cartId,
			deleted: false,
			productClientTermsId,
			status: "inCart",
		},
		select: cartItemMutationSelect,
	});
}

export async function createCartItem(
	database: CartDbClient,
	input: {
		cartId: number;
		productClientTermsId: number;
		quantity: string;
		productSnapshot: Prisma.InputJsonValue;
	},
) {
	return database.cartItem.create({
		data: {
			cartId: input.cartId,
			code: `CITEM-${input.cartId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
			deleted: false,
			fulfillmentStatus: "awaitingAggregation",
			productClientTermsId: input.productClientTermsId,
			productSnapshot: input.productSnapshot,
			quantity: input.quantity,
			status: "inCart",
		},
		select: cartItemMutationSelect,
	});
}

export async function updateCartItemQuantity(
	database: CartDbClient,
	id: number,
	quantity: string,
) {
	return database.cartItem.update({
		where: { id },
		data: { quantity },
		select: cartItemMutationSelect,
	});
}

export async function softDeleteCartItem(database: CartDbClient, id: number) {
	return database.cartItem.update({
		where: { id },
		data: {
			deleted: true,
			status: "dropped",
		},
		select: cartItemMutationSelect,
	});
}

export async function softDeleteCartItemsByCartId(
	database: CartDbClient,
	cartId: number,
) {
	return database.cartItem.updateMany({
		where: {
			cartId,
			deleted: false,
			status: "inCart",
		},
		data: {
			deleted: true,
			status: "dropped",
		},
	});
}

export async function findCartById(database: CartDbClient, id: number) {
	return database.cart.findUnique({
		where: { id },
		select: cartSelect,
	});
}
