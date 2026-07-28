import "server-only";

import { TRPCError } from "@trpc/server";

import { env } from "~/env";
import { Prisma } from "~/prisma/client";
import { cartSnapshotSchema } from "~/schemas/cart.schemas";
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
import { submitOrderForCompletedPayment } from "~/server/services/payments/order-submission.service";
import type { CartItem, CartSnapshot } from "~/shared/common/cart.types";
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
	buildCartSnapshot,
	calculateLineTotal,
	selectProductImage,
} from "~/shared/common/commerce.helpers";
import { termsToClientTerms } from "../_base/client-terms.mapper";
import { isClientTermsUsable } from "../_base/terms-validity";
import { getMercadoPagoConfig } from "../payments/mercadopago/mercadopago-config.service";
import { createMercadoPagoPreference } from "../payments/mercadopago/mercadopago-preference.service";
import {
	type CheckoutAddressRecord,
	type CheckoutCartRecord,
	type CheckoutDbClient,
	type CheckoutPaymentMethodRecord,
	cancelTransaction,
	createCheckoutAddress,
	createCheckoutPaymentMethod,
	createPendingTransaction,
	createUserOrder,
	findCheckoutAddressById,
	findCheckoutCartByUserId,
	findCheckoutPaymentMethodById,
	findLiveOrderByCartId,
	findMercadoPagoPaymentMethod,
	findOrCreateMercadoPagoPaymentMethod,
	findOrderByUserId,
	findTransactionByIdempotencyKey,
	listCheckoutAddresses,
	listCheckoutPaymentMethods,
	listOrdersByUserId,
	type OrderDetailRecord,
	type OrderListRecord,
	updateCartStatus,
	updateCheckoutAddress,
	updateCheckoutPaymentMethod,
	updateOrderStatus,
	updateTransactionFromGateway,
	updateTransactionWithMercadoPagoPreference,
} from "./checkout.data";
import {
	type PaymentGatewayRequest,
	type PaymentGatewayResponse,
	paymentGateway,
} from "./payment-gateway";

const TERMS_TEXT = "lorem ipsum";

type CheckoutCartItemRecord = CheckoutCartRecord["cartItems"][number];

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
			imageUrl: selectProductImage(item.productClientTerms.product, "cart"),
		},
		terms,
	};
}

function mapCart(record: CheckoutCartRecord): CartSnapshot {
	return buildCartSnapshot(record.cartItems.map(toCartItem), {
		id: record.id,
		code: record.code,
		status: record.status,
	});
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
		(item) => !isClientTermsUsable(item.productClientTerms, now),
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
	status:
		| "pending"
		| "inProcess"
		| "completed"
		| "failed"
		| "cancelled"
		| "refunded"
		| "chargedBack",
) {
	if (status === "completed") return "succeeded" as const;
	if (status === "failed" || status === "cancelled") return "failed" as const;
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
			checkoutUrl: input.transaction.checkoutUrl,
			sandboxCheckoutUrl: input.transaction.sandboxCheckoutUrl,
		},
		redirectUrl:
			input.transaction.provider === "mercadopago"
				? input.transaction.providerMode === "sandbox"
					? (input.transaction.sandboxCheckoutUrl ??
						input.transaction.checkoutUrl)
					: (input.transaction.checkoutUrl ??
						input.transaction.sandboxCheckoutUrl)
				: null,
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
		const mercadoPagoConfig = await getMercadoPagoConfig(tx);
		const mercadoPagoMethod = mercadoPagoConfig.enabled
			? await findOrCreateMercadoPagoPaymentMethod(tx, userId)
			: null;
		const checkoutPaymentMethods = filterProductionPaymentMethods(
			mercadoPagoConfig.enabled
				? [
						...(mercadoPagoMethod ? [mercadoPagoMethod] : []),
						...paymentMethods.filter(
							(method) => method.provider !== "mercadopago",
						),
					]
				: paymentMethods,
		);

		return checkoutStateSchema.parse({
			cart: mapCart(checkoutCart),
			addresses: addresses.map(toCheckoutAddress),
			paymentMethods: checkoutPaymentMethods.map(toCheckoutPaymentMethod),
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
		const mercadoPagoConfig = await getMercadoPagoConfig(tx);
		const mercadoPagoMethod = mercadoPagoConfig.enabled
			? await findMercadoPagoPaymentMethod(tx, userId)
			: null;
		const checkoutPaymentMethods = filterProductionPaymentMethods(
			mercadoPagoConfig.enabled
				? [
						...(mercadoPagoMethod ? [mercadoPagoMethod] : []),
						...paymentMethods.filter(
							(method) => method.provider !== "mercadopago",
						),
					]
				: paymentMethods,
		);

		return checkoutStateSchema.parse({
			cart: mapCart(cart),
			addresses: addresses.map(toCheckoutAddress),
			paymentMethods: checkoutPaymentMethods.map(toCheckoutPaymentMethod),
			termsText: TERMS_TEXT,
		});
	});
}

/**
 * Releases a cart from checkout so it becomes editable again, cancelling the
 * live order and its pending attempt.
 *
 * The attempt is cancelled, not erased, because the provider window may still
 * be open: if the user pays the old Mercado Pago preference afterwards,
 * reconciliation recovers it — `shouldApplyMercadoPagoPaymentStatus` lets
 * `cancelled` advance to `completed`, and submission is driven by the order
 * snapshot, so the payment settles against the order it was created for
 * (ADR-0001).
 */
export async function leave(userId: string): Promise<CartSnapshot> {
	const cart = await db.$transaction(async (tx) => {
		const checkoutCart = await findCheckoutCartByUserId(tx, userId);
		if (!checkoutCart) return null;
		if (checkoutCart.status !== "atCheckout") return checkoutCart;

		const liveOrder = await findLiveOrderByCartId(tx, checkoutCart.id);
		const latestAttempt = liveOrder?.transactions[0] ?? null;

		// A settled payment should already have moved the cart out of `atCheckout`;
		// refusing here keeps `leave` from ever cancelling an order that was paid.
		if (latestAttempt && !isCancellablePaymentAttempt(latestAttempt)) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message:
					"Hay un pago en curso para este carrito. Esperá a que el proveedor lo resuelva.",
			});
		}

		if (liveOrder) {
			if (latestAttempt?.status === "pending") {
				await cancelTransaction(tx, latestAttempt.id);
			}
			await updateOrderStatus(tx, liveOrder.id, "cancelled");
		}

		return updateCartStatus(tx, checkoutCart.id, "pending");
	});

	return cartSnapshotSchema.parse(
		cart
			? mapCart(cart)
			: {
					id: null,
					code: null,
					status: null,
					items: [],
					itemCount: 0,
					totalQuantity: "0",
					totals: [],
				},
	);
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

/**
 * User-managed payment methods are all mock-backed
 * (`createCheckoutPaymentMethod` hardcodes `provider: "mock"`), so production
 * must neither mint nor offer them — the mock gateway would approve them for
 * free (finding #26).
 */
function assertPaymentMethodManagementAvailable() {
	if (env.APP_ENV === "production") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Los métodos de pago manuales no están disponibles.",
		});
	}
}

function filterProductionPaymentMethods(
	methods: CheckoutPaymentMethodRecord[],
) {
	if (env.APP_ENV !== "production") return methods;

	return methods.filter((method) => method.provider === "mercadopago");
}

export async function createPaymentMethod(
	userId: string,
	input: CheckoutPaymentMethodCreateInput,
) {
	assertPaymentMethodManagementAvailable();

	return checkoutPaymentMethodSchema.parse(
		await createCheckoutPaymentMethod(db, userId, input),
	);
}

export async function updatePaymentMethod(
	userId: string,
	input: CheckoutPaymentMethodUpdateInput,
) {
	assertPaymentMethodManagementAvailable();

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

/**
 * Whether confirming again should mint a new attempt on the live order. Only a
 * dead attempt qualifies — failed, cancelled, or a pending one whose provider
 * window has closed. Every other state (completed, in process, still-payable
 * pending, refunded, charged back) is answered with the attempt that exists,
 * which is what makes a browser-back re-confirm idempotent.
 */
function isSpentPaymentAttempt(
	transaction: OrderDetailRecord["transactions"][number],
	now: Date,
) {
	if (transaction.status === "failed" || transaction.status === "cancelled") {
		return true;
	}
	if (transaction.status !== "pending") return false;
	return transaction.expiresAt !== null && transaction.expiresAt <= now;
}

/**
 * Whether abandoning the attempt is still the user's call. A payment the
 * provider is holding, or one that already took money, is not.
 */
function isCancellablePaymentAttempt(
	transaction: OrderDetailRecord["transactions"][number],
) {
	return (
		transaction.status === "pending" ||
		transaction.status === "failed" ||
		transaction.status === "cancelled"
	);
}

function buildReusedAttemptMessage(
	transaction: OrderDetailRecord["transactions"][number],
) {
	if (transaction.status !== "pending") return undefined;

	return transaction.provider === "mercadopago"
		? "Ya tenés un pago iniciado para este carrito. Te redirigimos a Mercado Pago para completarlo."
		: undefined;
}

async function createLiveUserOrder(
	tx: CheckoutDbClient,
	input: Parameters<typeof createUserOrder>[1],
) {
	return createUserOrder(tx, input).catch((error: unknown) => {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message:
					"Ya existe un pedido activo para este carrito. Actualizá la página.",
			});
		}
		throw error;
	});
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
		const now = new Date();
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
		const mercadoPagoConfig =
			paymentMethod.provider === "mercadopago" ||
			paymentMethod.type === "mercadopago"
				? await getMercadoPagoConfig(tx)
				: null;

		if (mercadoPagoConfig && !mercadoPagoConfig.enabled) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: "Mercado Pago no está habilitado para checkout.",
			});
		}

		const liveOrder = await findLiveOrderByCartId(tx, cart.id);
		const latestAttempt = liveOrder?.transactions[0] ?? null;

		if (
			liveOrder &&
			latestAttempt &&
			!isSpentPaymentAttempt(latestAttempt, now)
		) {
			return {
				kind: "existing" as const,
				result: buildPaymentResult({
					order: liveOrder,
					transaction: latestAttempt,
					shippingAddress: getAddressFromSnapshot(liveOrder),
					paymentMethod: toCheckoutPaymentMethod(latestAttempt.paymentMethod),
					message: buildReusedAttemptMessage(latestAttempt),
				}),
			};
		}

		if (!liveOrder && cart.status !== "atCheckout") {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message:
					"El checkout no está iniciado. Volvé a la pantalla de checkout.",
			});
		}

		const acceptedAt = new Date();
		const order =
			liveOrder ??
			(await createLiveUserOrder(tx, {
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
			}));

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
				provider: mercadoPagoConfig ? "mercadopago" : "mock",
			},
			provider: mercadoPagoConfig ? "mercadopago" : "mock",
			providerMode: mercadoPagoConfig?.mode ?? null,
		});

		return {
			kind: "created" as const,
			address,
			cart,
			mercadoPagoConfig,
			order,
			paymentMethod,
			total,
			transaction,
		};
	});

	if (prepared.kind === "existing") return prepared.result;

	if (prepared.mercadoPagoConfig) {
		const preference = await createMercadoPagoPreference({
			cart: prepared.cart,
			order: {
				id: prepared.order.id,
				code: prepared.order.code,
				user: prepared.order.user,
			},
			transaction: prepared.transaction,
			config: prepared.mercadoPagoConfig,
		});
		const transaction = await updateTransactionWithMercadoPagoPreference(db, {
			id: prepared.transaction.id,
			providerMode: prepared.mercadoPagoConfig.mode,
			...preference,
		});

		return buildPaymentResult({
			order: prepared.order,
			transaction,
			shippingAddress: prepared.address,
			paymentMethod: prepared.paymentMethod,
			message:
				"Te redirigimos a Mercado Pago. El pedido se confirma cuando el proveedor aprueba el pago.",
		});
	}

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
			const order = await submitOrderForCompletedPayment(tx, {
				orderId: prepared.order.id,
				cartId: prepared.cart.id,
				transactionId: transaction.id,
				actor: { source: "user", actorId: userId },
			});

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
