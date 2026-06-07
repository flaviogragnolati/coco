import "server-only";

import { TRPCError } from "@trpc/server";

import {
	checkoutAddressSchema,
	checkoutPaymentMethodSchema,
	checkoutPaymentResultSchema,
	checkoutStateSchema,
	orderDetailSchema,
	orderListOutputSchema,
} from "~/schemas/checkout.schemas";
import { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import type { CartItem, CartSnapshot } from "~/shared/common/cart.types";
import type { CatalogClientTerms } from "~/shared/common/catalog.types";
import type {
	CheckoutAddress,
	CheckoutAddressCreateInput,
	CheckoutAddressUpdateInput,
	CheckoutConfirmInput,
	CheckoutPaymentMethod,
	CheckoutPaymentMethodCreateInput,
	CheckoutPaymentMethodUpdateInput,
	CheckoutPaymentResult,
	CheckoutState,
	OrderDetail,
	OrderListOutput,
} from "~/shared/common/checkout.types";
import {
	calculateLineTotal,
	toMoneyString,
	toNumber,
	toQuantityString,
} from "~/shared/common/commerce.helpers";
import {
	type CheckoutAddressRecord,
	type CheckoutCartRecord,
	type CheckoutDbClient,
	type CheckoutPaymentMethodRecord,
	createCheckoutAddress,
	createCheckoutPaymentMethod,
	createPendingTransaction,
	createUserOrder,
	findCheckoutAddressById,
	findCheckoutCartByUserId,
	findCheckoutPaymentMethodById,
	findOrderByUserId,
	findTransactionByIdempotencyKey,
	listCheckoutAddresses,
	listCheckoutPaymentMethods,
	listOrdersByUserId,
	type OrderDetailRecord,
	type OrderListRecord,
	submitCartItems,
	updateCartStatus,
	updateCheckoutAddress,
	updateCheckoutPaymentMethod,
	updateOrderStatus,
	updateTransactionFromGateway,
} from "./checkout.data";
import {
	type PaymentGatewayRequest,
	type PaymentGatewayResponse,
	paymentGateway,
} from "./payment-gateway";

const TERMS_TEXT = "lorem ipsum";

type CheckoutCartItemRecord = CheckoutCartRecord["cartItems"][number];

function selectProductImage(product: {
	cardImageUrl: string | null;
	cartImageUrl: string | null;
}) {
	return product.cartImageUrl ?? product.cardImageUrl;
}

function termsToClientTerms(
	terms: CheckoutCartItemRecord["productClientTerms"],
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

function termsCanBeUsed(
	terms: CheckoutCartItemRecord["productClientTerms"],
	now: Date,
) {
	return (
		terms.active &&
		!terms.deleted &&
		terms.product.active &&
		!terms.product.deleted &&
		terms.fromDate <= now &&
		(terms.toDate === null || terms.toDate >= now)
	);
}

function toCartItem(item: CheckoutCartItemRecord): CartItem {
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

function mapCart(record: CheckoutCartRecord): CartSnapshot {
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

function toCheckoutAddress(record: CheckoutAddressRecord): CheckoutAddress {
	return checkoutAddressSchema.parse(record);
}

function toCheckoutPaymentMethod(
	record: CheckoutPaymentMethodRecord,
): CheckoutPaymentMethod {
	return checkoutPaymentMethodSchema.parse({
		...record,
		label: record.label || record.details || record.type,
	});
}

function assertCartHasItems(cart: CheckoutCartRecord) {
	if (cart.cartItems.length === 0) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message:
				"Tu carrito está vacío. Agregá productos antes de iniciar checkout.",
		});
	}
}

function assertCartItemsStillValid(cart: CheckoutCartRecord) {
	const now = new Date();
	const invalidItem = cart.cartItems.find(
		(item) => !termsCanBeUsed(item.productClientTerms, now),
	);

	if (invalidItem) {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"Uno de los productos del carrito ya no está disponible. Revisá el carrito antes de continuar.",
		});
	}
}

async function getRequiredCheckoutCart(
	database: CheckoutDbClient,
	userId: string,
) {
	const cart = await findCheckoutCartByUserId(database, userId);

	if (!cart) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "No encontramos un carrito activo para iniciar checkout.",
		});
	}

	assertCartHasItems(cart);
	assertCartItemsStillValid(cart);
	return cart;
}

function assertSingleCurrency(cart: CartSnapshot) {
	if (cart.totals.length !== 1) {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"El checkout de esta versión solo permite carritos con una moneda.",
		});
	}

	const total = cart.totals[0];
	if (!total) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "No encontramos un total válido para el carrito.",
		});
	}

	return total;
}

function buildAddressSnapshot(address: CheckoutAddress) {
	return {
		source: "checkout",
		capturedAt: new Date().toISOString(),
		address,
	};
}

function buildTermsSnapshot(acceptedAt: Date) {
	return {
		source: "checkout",
		version: "checkout-v1",
		text: TERMS_TEXT,
		acceptedAt: acceptedAt.toISOString(),
	};
}

function buildPriceSnapshot(item: CheckoutCartItemRecord) {
	const terms = termsToClientTerms(item.productClientTerms);
	const quantity = item.quantity.toString();

	return {
		source: "checkout",
		capturedAt: new Date().toISOString(),
		productClientTerms: terms,
		quantity,
		lineTotal: calculateLineTotal(terms, quantity),
		currency: terms.currency,
	};
}

function buildOrderCode() {
	return `ORD-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function toOrderListItem(record: OrderListRecord) {
	const latestTransaction = record.transactions[0];

	return {
		id: record.id,
		code: record.code,
		status: record.status,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		itemCount: record._count.items,
		totalAmount: latestTransaction?.amount.toString() ?? "0.00",
		currency: latestTransaction?.currency ?? null,
		latestTransactionStatus: latestTransaction?.status ?? null,
	};
}

function toOrderDetail(record: OrderDetailRecord): OrderDetail {
	const latestTransaction = record.transactions[0];

	return orderDetailSchema.parse({
		id: record.id,
		code: record.code,
		status: record.status,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		itemCount: record.items.length,
		totalAmount: latestTransaction?.amount.toString() ?? "0.00",
		currency: latestTransaction?.currency ?? null,
		latestTransactionStatus: latestTransaction?.status ?? null,
		cartCode: record.cart.code,
		billingAddressSnapshot: record.billingAddressSnapshot,
		shippingAddressSnapshot: record.shippingAddressSnapshot,
		termsSnapshot: record.termsSnapshot,
		acceptedTermsAt: record.acceptedTermsAt,
		items: record.items.map((item) => ({
			...item,
			quantity: item.quantity.toString(),
		})),
		transactions: record.transactions.map((transaction) => ({
			...transaction,
			amount: transaction.amount.toString(),
		})),
	});
}

function getAddressFromSnapshot(record: OrderDetailRecord): CheckoutAddress {
	const snapshot = record.shippingAddressSnapshot;

	if (
		typeof snapshot === "object" &&
		snapshot !== null &&
		"address" in snapshot
	) {
		return checkoutAddressSchema.parse(snapshot.address);
	}

	throw new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "El pedido no tiene una dirección de envío válida.",
	});
}

function mapGatewayStatusToTransactionStatus(
	response: PaymentGatewayResponse,
): "pending" | "completed" | "failed" {
	if (response.status === "succeeded") return "completed";
	if (response.status === "failed") return "failed";
	return "pending";
}

function mapTransactionStatusToPaymentStatus(
	status: "pending" | "completed" | "failed" | "refunded",
) {
	if (status === "completed") return "succeeded" as const;
	if (status === "failed") return "failed" as const;
	return "pending" as const;
}

function buildPaymentResult(input: {
	order: OrderDetailRecord;
	transaction: OrderDetailRecord["transactions"][number];
	shippingAddress: CheckoutAddress;
	paymentMethod: CheckoutPaymentMethod;
	message?: string;
}): CheckoutPaymentResult {
	const status = mapTransactionStatusToPaymentStatus(input.transaction.status);
	const message =
		input.message ??
		(status === "succeeded"
			? "Pago aprobado. Tu compra quedó confirmada."
			: status === "failed"
				? (input.transaction.failureMessage ?? "No se pudo procesar el pago.")
				: "El pago quedó pendiente de confirmación.");

	return checkoutPaymentResultSchema.parse({
		status,
		message,
		order: {
			id: input.order.id,
			code: input.order.code,
			status: input.order.status,
		},
		transaction: {
			id: input.transaction.id,
			status: input.transaction.status,
			amount: input.transaction.amount.toString(),
			currency: input.transaction.currency,
			provider: input.transaction.provider,
			externalTransactionId: input.transaction.externalTransactionId,
			failureCode: input.transaction.failureCode,
			failureMessage: input.transaction.failureMessage,
		},
		shippingAddress: input.shippingAddress,
		paymentMethod: input.paymentMethod,
	});
}

function buildPaymentRequest(input: {
	cart: CheckoutCartRecord;
	order: OrderDetailRecord;
	transaction: OrderDetailRecord["transactions"][number];
	total: CartSnapshot["totals"][number];
	userId: string;
	paymentMethod: CheckoutPaymentMethod;
	idempotencyKey: string;
}): PaymentGatewayRequest {
	return {
		idempotencyKey: input.idempotencyKey,
		userId: input.userId,
		cartId: input.cart.id,
		cartCode: input.cart.code,
		orderId: input.order.id,
		orderCode: input.order.code,
		transactionId: input.transaction.id,
		amount: input.total.amount,
		currency: input.total.currency,
		paymentMethod: {
			id: input.paymentMethod.id,
			type: input.paymentMethod.type,
			label: input.paymentMethod.label,
			details: input.paymentMethod.details,
			provider: input.paymentMethod.provider,
			externalPaymentMethodId: input.paymentMethod.externalPaymentMethodId,
		},
	};
}

function buildSubmittedToOrderEventKey(input: {
	orderId: number;
	transactionId: number;
	cartItemId: number;
}) {
	return `checkout:order:${input.orderId}:transaction:${input.transactionId}:cartItem:${input.cartItemId}:submittedToOrder`;
}

export async function start(userId: string): Promise<CheckoutState> {
	return db.$transaction(async (tx) => {
		const cart = await getRequiredCheckoutCart(tx, userId);
		const checkoutCart =
			cart.status === "atCheckout"
				? cart
				: await updateCartStatus(tx, cart.id, "atCheckout");
		const [addresses, paymentMethods] = await Promise.all([
			listCheckoutAddresses(tx, userId),
			listCheckoutPaymentMethods(tx, userId),
		]);

		return checkoutStateSchema.parse({
			cart: mapCart(checkoutCart),
			addresses: addresses.map(toCheckoutAddress),
			paymentMethods: paymentMethods.map(toCheckoutPaymentMethod),
			termsText: TERMS_TEXT,
		});
	});
}

export async function getState(userId: string): Promise<CheckoutState> {
	return db.$transaction(async (tx) => {
		const cart = await getRequiredCheckoutCart(tx, userId);
		const [addresses, paymentMethods] = await Promise.all([
			listCheckoutAddresses(tx, userId),
			listCheckoutPaymentMethods(tx, userId),
		]);

		return checkoutStateSchema.parse({
			cart: mapCart(cart),
			addresses: addresses.map(toCheckoutAddress),
			paymentMethods: paymentMethods.map(toCheckoutPaymentMethod),
			termsText: TERMS_TEXT,
		});
	});
}

export async function createAddress(
	userId: string,
	input: CheckoutAddressCreateInput,
) {
	return checkoutAddressSchema.parse(
		await createCheckoutAddress(db, userId, input),
	);
}

export async function updateAddress(
	userId: string,
	input: CheckoutAddressUpdateInput,
) {
	const existing = await findCheckoutAddressById(db, userId, input.id);
	if (!existing) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No encontramos esa dirección en tu perfil.",
		});
	}

	return checkoutAddressSchema.parse(await updateCheckoutAddress(db, input));
}

export async function createPaymentMethod(
	userId: string,
	input: CheckoutPaymentMethodCreateInput,
) {
	return checkoutPaymentMethodSchema.parse(
		await createCheckoutPaymentMethod(db, userId, input),
	);
}

export async function updatePaymentMethod(
	userId: string,
	input: CheckoutPaymentMethodUpdateInput,
) {
	const existing = await findCheckoutPaymentMethodById(db, userId, input.id);
	if (!existing) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No encontramos ese método de pago en tu perfil.",
		});
	}

	return checkoutPaymentMethodSchema.parse(
		await updateCheckoutPaymentMethod(db, input),
	);
}

async function getExistingPaymentResult(
	userId: string,
	idempotencyKey: string,
) {
	const existing = await findTransactionByIdempotencyKey(db, idempotencyKey);
	if (!existing) return null;

	if (existing.userOrder.userId !== userId) {
		throw new TRPCError({ code: "FORBIDDEN" });
	}

	return buildPaymentResult({
		order: existing.userOrder,
		transaction: existing,
		shippingAddress: getAddressFromSnapshot(existing.userOrder),
		paymentMethod: toCheckoutPaymentMethod(existing.paymentMethod),
	});
}

export async function confirmAndPay(
	userId: string,
	input: CheckoutConfirmInput,
): Promise<CheckoutPaymentResult> {
	const existingResult = await getExistingPaymentResult(
		userId,
		input.idempotencyKey,
	);
	if (existingResult) return existingResult;

	const prepared = await db.$transaction(async (tx) => {
		const cart = await getRequiredCheckoutCart(tx, userId);
		const cartSnapshot = mapCart(cart);
		const total = assertSingleCurrency(cartSnapshot);
		const [addressRecord, paymentRecord] = await Promise.all([
			findCheckoutAddressById(tx, userId, input.shippingAddressId),
			findCheckoutPaymentMethodById(tx, userId, input.paymentMethodId),
		]);

		if (!addressRecord) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Seleccioná una dirección de envío válida.",
			});
		}

		if (!paymentRecord) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Seleccioná un método de pago válido.",
			});
		}

		const address = toCheckoutAddress(addressRecord);
		const paymentMethod = toCheckoutPaymentMethod(paymentRecord);
		const acceptedAt = new Date();
		const order = await createUserOrder(tx, {
			code: buildOrderCode(),
			userId,
			cartId: cart.id,
			shippingAddressSnapshot: buildAddressSnapshot(address),
			termsSnapshot: buildTermsSnapshot(acceptedAt),
			acceptedTermsAt: acceptedAt,
			items: cart.cartItems.map((item) => ({
				sourceCartItemId: item.id,
				quantity: item.quantity.toString(),
				productSnapshot: item.productSnapshot,
				priceSnapshot: buildPriceSnapshot(item),
			})),
		});
		const transaction = await createPendingTransaction(tx, {
			amount: total.amount,
			currency: total.currency,
			idempotencyKey: input.idempotencyKey,
			paymentMethodId: paymentMethod.id,
			userOrderId: order.id,
			requestSnapshot: {
				idempotencyKey: input.idempotencyKey,
				cart: { id: cart.id, code: cart.code },
				order: { id: order.id, code: order.code },
				amount: total.amount,
				currency: total.currency,
				paymentMethod,
			},
		});

		return {
			address,
			cart,
			order,
			paymentMethod,
			total,
			transaction,
		};
	});

	const gatewayRequest = buildPaymentRequest({
		cart: prepared.cart,
		order: prepared.order,
		transaction: prepared.transaction,
		total: prepared.total,
		userId,
		paymentMethod: prepared.paymentMethod,
		idempotencyKey: input.idempotencyKey,
	});
	const gatewayResponse = await paymentGateway.capturePayment(gatewayRequest);

	const finalized = await db.$transaction(async (tx) => {
		const transaction = await updateTransactionFromGateway(tx, {
			id: prepared.transaction.id,
			status: mapGatewayStatusToTransactionStatus(gatewayResponse),
			provider: gatewayResponse.provider,
			externalTransactionId: gatewayResponse.externalTransactionId,
			providerStatus: gatewayResponse.providerStatus,
			failureCode: gatewayResponse.failureCode,
			failureMessage: gatewayResponse.failureMessage,
			responseSnapshot: {
				request: gatewayRequest,
				response: gatewayResponse.raw,
			},
		});

		if (gatewayResponse.status === "succeeded") {
			await submitCartItems(tx, prepared.cart.id);
			await updateCartStatus(tx, prepared.cart.id, "submitted");
			const order = await updateOrderStatus(
				tx,
				prepared.order.id,
				"processing",
			);
			const orderItemsByCartItemId = new Map(
				order.items.map((item) => [item.sourceCartItemId, item]),
			);

			await DomainEventPublisher.publishMany(
				tx,
				prepared.cart.cartItems.map((item) => {
					const orderItem = orderItemsByCartItemId.get(item.id);
					if (!orderItem) {
						throw new TRPCError({
							code: "INTERNAL_SERVER_ERROR",
							message:
								"No se pudo vincular un item del carrito con el pedido creado.",
						});
					}

					return {
						type: "cart.item.submittedToOrder",
						eventKey: buildSubmittedToOrderEventKey({
							orderId: order.id,
							transactionId: transaction.id,
							cartItemId: item.id,
						}),
						aggregateType: "CartItem",
						aggregateId: String(item.id),
						actor: {
							source: "user",
							actorId: userId,
						},
						payload: {
							cartItemId: String(item.id),
							cartId: String(prepared.cart.id),
							orderId: String(order.id),
							userOrderItemId: String(orderItem.id),
							transactionId: String(transaction.id),
							quantity: item.quantity.toString(),
						},
					};
				}),
			);

			return { order, transaction, shouldDispatchDomainEvents: true };
		}

		if (gatewayResponse.status === "failed") {
			const order = await updateOrderStatus(tx, prepared.order.id, "failed");
			return { order, transaction, shouldDispatchDomainEvents: false };
		}

		return {
			order: prepared.order,
			transaction,
			shouldDispatchDomainEvents: false,
		};
	});

	if (finalized.shouldDispatchDomainEvents) {
		await DomainEventDispatcher.wake();
	}

	return buildPaymentResult({
		order: finalized.order,
		transaction: finalized.transaction,
		shippingAddress: prepared.address,
		paymentMethod: prepared.paymentMethod,
	});
}

export async function listMine(userId: string): Promise<OrderListOutput> {
	const records = await listOrdersByUserId(db, userId);
	return orderListOutputSchema.parse(records.map(toOrderListItem));
}

export async function getMine(
	userId: string,
	orderId: number,
): Promise<OrderDetail> {
	const order = await findOrderByUserId(db, userId, orderId);
	if (!order) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No encontramos ese pedido en tu cuenta.",
		});
	}

	return toOrderDetail(order);
}
