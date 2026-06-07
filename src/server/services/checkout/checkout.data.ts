import "server-only";

import type {
	CheckoutAddressCreateInput,
	CheckoutAddressUpdateInput,
	CheckoutPaymentMethodCreateInput,
	CheckoutPaymentMethodUpdateInput,
} from "~/shared/common/checkout.types";
import type { Prisma } from "../../../../generated/prisma/client";
import { toPrismaInputJson } from "../admin/_base/prisma-json";
import { cartProductClientTermsSelect } from "../cart/cart.data";

export type CheckoutDbClient = Prisma.TransactionClient;

const checkoutCartItemSelect = {
	id: true,
	code: true,
	quantity: true,
	productSnapshot: true,
	productClientTermsId: true,
	productClientTerms: {
		select: cartProductClientTermsSelect,
	},
} satisfies Prisma.CartItemSelect;

export const checkoutCartSelect = {
	id: true,
	code: true,
	status: true,
	deleted: true,
	userId: true,
	cartItems: {
		where: { deleted: false, status: "inCart" },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: checkoutCartItemSelect,
	},
} satisfies Prisma.CartSelect;

export const checkoutAddressSelect = {
	id: true,
	type: true,
	line1: true,
	line2: true,
	city: true,
	state: true,
	postalCode: true,
	country: true,
	active: true,
} satisfies Prisma.AddressSelect;

export const checkoutPaymentMethodSelect = {
	id: true,
	type: true,
	label: true,
	details: true,
	provider: true,
	externalPaymentMethodId: true,
	active: true,
} satisfies Prisma.PaymentMethodSelect;

const orderTransactionSelect = {
	id: true,
	amount: true,
	currency: true,
	status: true,
	provider: true,
	externalTransactionId: true,
	providerStatus: true,
	failureCode: true,
	failureMessage: true,
	createdAt: true,
	paymentMethod: {
		select: checkoutPaymentMethodSelect,
	},
} satisfies Prisma.UserTransactionSelect;

const orderDetailSelect = {
	id: true,
	code: true,
	userId: true,
	status: true,
	billingAddressSnapshot: true,
	shippingAddressSnapshot: true,
	termsSnapshot: true,
	acceptedTermsAt: true,
	createdAt: true,
	updatedAt: true,
	cart: {
		select: {
			code: true,
		},
	},
	items: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			sourceCartItemId: true,
			quantity: true,
			productSnapshot: true,
			priceSnapshot: true,
			createdAt: true,
		},
	},
	transactions: {
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: orderTransactionSelect,
	},
} satisfies Prisma.UserOrderSelect;

const orderListSelect = {
	id: true,
	code: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	_count: {
		select: {
			items: true,
		},
	},
	transactions: {
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			amount: true,
			currency: true,
			status: true,
		},
	},
} satisfies Prisma.UserOrderSelect;

export type CheckoutCartRecord = Prisma.CartGetPayload<{
	select: typeof checkoutCartSelect;
}>;

export type CheckoutAddressRecord = Prisma.AddressGetPayload<{
	select: typeof checkoutAddressSelect;
}>;

export type CheckoutPaymentMethodRecord = Prisma.PaymentMethodGetPayload<{
	select: typeof checkoutPaymentMethodSelect;
}>;

export type OrderDetailRecord = Prisma.UserOrderGetPayload<{
	select: typeof orderDetailSelect;
}>;

export type OrderListRecord = Prisma.UserOrderGetPayload<{
	select: typeof orderListSelect;
}>;

export async function findCheckoutCartByUserId(
	db: CheckoutDbClient,
	userId: string,
) {
	return db.cart.findFirst({
		where: {
			deleted: false,
			status: { in: ["draft", "pending", "atCheckout"] },
			userId,
		},
		select: checkoutCartSelect,
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
	});
}

export async function updateCartStatus(
	db: CheckoutDbClient,
	id: number,
	status: CheckoutCartRecord["status"],
) {
	return db.cart.update({
		where: { id },
		data: { status },
		select: checkoutCartSelect,
	});
}

export async function submitCartItems(db: CheckoutDbClient, cartId: number) {
	return db.cartItem.updateMany({
		where: {
			cartId,
			deleted: false,
			status: "inCart",
		},
		data: {
			status: "submitted",
			fulfillmentStatus: "awaitingAggregation",
		},
	});
}

export async function listCheckoutAddresses(
	db: CheckoutDbClient,
	userId: string,
) {
	return db.address.findMany({
		where: {
			userId,
			active: true,
			deleted: false,
			type: { in: ["all", "shipping"] },
		},
		select: checkoutAddressSelect,
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
	});
}

export async function findCheckoutAddressById(
	db: CheckoutDbClient,
	userId: string,
	id: number,
) {
	return db.address.findFirst({
		where: {
			id,
			userId,
			active: true,
			deleted: false,
			type: { in: ["all", "shipping"] },
		},
		select: checkoutAddressSelect,
	});
}

export async function createCheckoutAddress(
	db: CheckoutDbClient,
	userId: string,
	input: CheckoutAddressCreateInput,
) {
	return db.address.create({
		data: {
			userId,
			type: input.type,
			line1: input.line1,
			line2: input.line2,
			city: input.city,
			state: input.state,
			postalCode: input.postalCode,
			country: input.country,
			active: true,
			deleted: false,
		},
		select: checkoutAddressSelect,
	});
}

export async function updateCheckoutAddress(
	db: CheckoutDbClient,
	input: CheckoutAddressUpdateInput,
) {
	return db.address.update({
		where: { id: input.id },
		data: {
			type: input.type,
			line1: input.line1,
			line2: input.line2,
			city: input.city,
			state: input.state,
			postalCode: input.postalCode,
			country: input.country,
			active: true,
		},
		select: checkoutAddressSelect,
	});
}

export async function listCheckoutPaymentMethods(
	db: CheckoutDbClient,
	userId: string,
) {
	return db.paymentMethod.findMany({
		where: {
			userId,
			active: true,
			deleted: false,
		},
		select: checkoutPaymentMethodSelect,
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
	});
}

export async function findCheckoutPaymentMethodById(
	db: CheckoutDbClient,
	userId: string,
	id: number,
) {
	return db.paymentMethod.findFirst({
		where: {
			id,
			userId,
			active: true,
			deleted: false,
		},
		select: checkoutPaymentMethodSelect,
	});
}

export async function createCheckoutPaymentMethod(
	db: CheckoutDbClient,
	userId: string,
	input: CheckoutPaymentMethodCreateInput,
) {
	return db.paymentMethod.create({
		data: {
			userId,
			type: input.type,
			label: input.label,
			details: input.details,
			provider: "mock",
			externalPaymentMethodId: `pm_mock_${crypto.randomUUID()}`,
			active: true,
			deleted: false,
			metadata: toPrismaInputJson({
				source: "checkout",
				tokenized: true,
			}),
		},
		select: checkoutPaymentMethodSelect,
	});
}

export async function updateCheckoutPaymentMethod(
	db: CheckoutDbClient,
	input: CheckoutPaymentMethodUpdateInput,
) {
	return db.paymentMethod.update({
		where: { id: input.id },
		data: {
			type: input.type,
			label: input.label,
			details: input.details,
			active: true,
		},
		select: checkoutPaymentMethodSelect,
	});
}

export async function findTransactionByIdempotencyKey(
	db: CheckoutDbClient,
	idempotencyKey: string,
) {
	return db.userTransaction.findUnique({
		where: { idempotencyKey },
		select: {
			...orderTransactionSelect,
			userOrder: {
				select: orderDetailSelect,
			},
		},
	});
}

export async function createUserOrder(
	db: CheckoutDbClient,
	input: {
		code: string;
		userId: string;
		cartId: number;
		shippingAddressSnapshot: unknown;
		termsSnapshot: unknown;
		acceptedTermsAt: Date;
		items: Array<{
			sourceCartItemId: number;
			quantity: string;
			productSnapshot: unknown;
			priceSnapshot: unknown;
		}>;
	},
) {
	return db.userOrder.create({
		data: {
			code: input.code,
			status: "pending",
			userId: input.userId,
			cartId: input.cartId,
			billingAddressSnapshot: toPrismaInputJson(input.shippingAddressSnapshot),
			shippingAddressSnapshot: toPrismaInputJson(input.shippingAddressSnapshot),
			termsSnapshot: toPrismaInputJson(input.termsSnapshot),
			acceptedTermsAt: input.acceptedTermsAt,
			items: {
				create: input.items.map((item) => ({
					sourceCartItemId: item.sourceCartItemId,
					quantity: item.quantity,
					productSnapshot: toPrismaInputJson(item.productSnapshot),
					priceSnapshot: toPrismaInputJson(item.priceSnapshot),
				})),
			},
		},
		select: orderDetailSelect,
	});
}

export async function createPendingTransaction(
	db: CheckoutDbClient,
	input: {
		amount: string;
		currency: string;
		idempotencyKey: string;
		paymentMethodId: number;
		userOrderId: number;
		requestSnapshot: unknown;
	},
) {
	return db.userTransaction.create({
		data: {
			amount: input.amount,
			currency: input.currency as never,
			status: "pending",
			provider: "mock",
			idempotencyKey: input.idempotencyKey,
			paymentMethodId: input.paymentMethodId,
			userOrderId: input.userOrderId,
			requestSnapshot: toPrismaInputJson(input.requestSnapshot),
		},
		select: orderTransactionSelect,
	});
}

export async function updateTransactionFromGateway(
	db: CheckoutDbClient,
	input: {
		id: number;
		status: "pending" | "completed" | "failed";
		provider: string;
		externalTransactionId: string | null;
		providerStatus: string;
		failureCode: string | null;
		failureMessage: string | null;
		responseSnapshot: unknown;
	},
) {
	return db.userTransaction.update({
		where: { id: input.id },
		data: {
			status: input.status,
			provider: input.provider,
			externalTransactionId: input.externalTransactionId,
			providerStatus: input.providerStatus,
			failureCode: input.failureCode,
			failureMessage: input.failureMessage,
			responseSnapshot: toPrismaInputJson(input.responseSnapshot),
		},
		select: orderTransactionSelect,
	});
}

export async function updateOrderStatus(
	db: CheckoutDbClient,
	id: number,
	status: "pending" | "processing" | "failed",
) {
	return db.userOrder.update({
		where: { id },
		data: { status },
		select: orderDetailSelect,
	});
}

export async function listOrdersByUserId(db: CheckoutDbClient, userId: string) {
	return db.userOrder.findMany({
		where: { userId },
		select: orderListSelect,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
	});
}

export async function findOrderByUserId(
	db: CheckoutDbClient,
	userId: string,
	id: number,
) {
	return db.userOrder.findFirst({
		where: { id, userId },
		select: orderDetailSelect,
	});
}
