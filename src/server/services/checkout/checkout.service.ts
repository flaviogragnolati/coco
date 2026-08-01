import "server-only";

import { TRPCError } from "@trpc/server";

import { Prisma } from "~/prisma/client";
import { externalPaymentInstructionsSchema } from "~/schemas/admin/payment.schemas";
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
import type {
	ExternalPaymentInstructions,
	ExternalPaymentSettings,
} from "~/shared/common/admin-crud/payment.types";
import type { CartItem, CartSnapshot } from "~/shared/common/cart.types";
import type {
	CheckoutAddress,
	CheckoutAddressCreateInput,
	CheckoutAddressUpdateInput,
	CheckoutConfirmInput,
	CheckoutPaymentMethod,
	CheckoutPaymentResult,
	CheckoutState,
	OrderDeclareReceiptInput,
	OrderDetail,
	OrderExternalPayment,
	OrderListOutput,
} from "~/shared/common/checkout.types";
import {
	buildCartSnapshot,
	calculateLineTotal,
	selectProductImage,
} from "~/shared/common/commerce.helpers";
import { termsToClientTerms } from "../_base/client-terms.mapper";
import { isClientTermsUsable } from "../_base/terms-validity";
import {
	EXTERNAL_PROVIDER,
	getExternalPaymentConfig,
} from "../payments/external/external-payment-config.service";
import { getMercadoPagoConfig } from "../payments/mercadopago/mercadopago-config.service";
import { createMercadoPagoPreference } from "../payments/mercadopago/mercadopago-preference.service";
import {
	type CheckoutAddressRecord,
	type CheckoutCartRecord,
	type CheckoutDbClient,
	type CheckoutPaymentMethodRecord,
	cancelTransaction,
	createCheckoutAddress,
	createPendingTransaction,
	createUserOrder,
	declareTransactionReceipt,
	findCheckoutAddressById,
	findCheckoutCartByUserId,
	findCheckoutPaymentMethodById,
	findExternalPaymentMethod,
	findLiveOrderByCartId,
	findMercadoPagoPaymentMethod,
	findOrCreateExternalPaymentMethod,
	findOrCreateMercadoPagoPaymentMethod,
	findOrderByUserId,
	findTransactionByIdempotencyKey,
	listCheckoutAddresses,
	listOrdersByUserId,
	markTransactionAsExternalPending,
	type OrderDetailRecord,
	type OrderListRecord,
	updateCartStatus,
	updateCheckoutAddress,
	updateOrderStatus,
	updateTransactionWithMercadoPagoPreference,
} from "./checkout.data";
import {
	isCancellablePaymentAttempt,
	isSpentPaymentAttempt,
} from "./payment-attempt.decision";

const TERMS_TEXT = "lorem ipsum";
const HOUR_IN_MS = 60 * 60 * 1000;

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

function toOrderDetail(
	record: OrderDetailRecord,
	externalPayment: OrderExternalPayment | null,
): OrderDetail {
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
		externalPayment,
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
	externalPayment?: ExternalPaymentInstructions | null;
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
		externalPayment: input.externalPayment ?? null,
		shippingAddress: input.shippingAddress,
		paymentMethod: input.paymentMethod,
	});
}

function buildExternalPaymentInstructions(input: {
	settings: ExternalPaymentSettings;
	orderCode: string;
	transaction: Pick<
		OrderDetailRecord["transactions"][number],
		"amount" | "currency" | "expiresAt"
	>;
}): ExternalPaymentInstructions {
	return externalPaymentInstructionsSchema.parse({
		...input.settings,
		amount: input.transaction.amount.toString(),
		currency: input.transaction.currency,
		orderCode: input.orderCode,
		expiresAt: input.transaction.expiresAt,
	});
}

/**
 * Transfer data for an attempt the user still has to pay. A settled, dead or
 * Mercado Pago attempt has nothing to show, so the CBU stops being handed out
 * the moment the attempt leaves `pending` (ADR 0010).
 */
async function loadExternalPaymentInstructions(
	database: CheckoutDbClient,
	input: {
		orderCode: string;
		transaction: OrderDetailRecord["transactions"][number];
	},
) {
	if (input.transaction.provider !== EXTERNAL_PROVIDER) return null;
	if (input.transaction.status !== "pending") return null;

	const config = await getExternalPaymentConfig(database);

	return buildExternalPaymentInstructions({
		settings: config.settings,
		orderCode: input.orderCode,
		transaction: input.transaction,
	});
}

async function loadOrderExternalPayment(
	database: CheckoutDbClient,
	order: OrderDetailRecord,
): Promise<OrderExternalPayment | null> {
	const latestTransaction = order.transactions[0];
	if (!latestTransaction) return null;

	const instructions = await loadExternalPaymentInstructions(database, {
		orderCode: order.code,
		transaction: latestTransaction,
	});
	if (!instructions) return null;

	return {
		...instructions,
		declaredReceiptReference: latestTransaction.declaredReceiptReference,
		declaredReceiptAt: latestTransaction.declaredReceiptAt,
	};
}

/**
 * The payment methods checkout offers: one per enabled provider, never a
 * user-minted one. `enabled` on each `payment_provider_config` row is the only
 * switch (ADR 0010).
 */
export async function start(userId: string): Promise<CheckoutState> {
	return db.$transaction(async (tx) => {
		const cart = await getRequiredCheckoutCart(tx, userId);
		const checkoutCart =
			cart.status === "atCheckout"
				? cart
				: await updateCartStatus(tx, cart.id, "atCheckout");
		const [addresses, mercadoPagoConfig, externalConfig] = await Promise.all([
			listCheckoutAddresses(tx, userId),
			getMercadoPagoConfig(tx),
			getExternalPaymentConfig(tx),
		]);

		const paymentMethods: CheckoutPaymentMethodRecord[] = [];
		if (mercadoPagoConfig.enabled) {
			paymentMethods.push(
				await findOrCreateMercadoPagoPaymentMethod(tx, userId),
			);
		}
		if (externalConfig.enabled) {
			paymentMethods.push(await findOrCreateExternalPaymentMethod(tx, userId));
		}

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
		const [addresses, mercadoPagoConfig, externalConfig] = await Promise.all([
			listCheckoutAddresses(tx, userId),
			getMercadoPagoConfig(tx),
			getExternalPaymentConfig(tx),
		]);

		// Unlike `start`, reading the checkout state never mints a payment method.
		const paymentMethods: CheckoutPaymentMethodRecord[] = [];
		if (mercadoPagoConfig.enabled) {
			const method = await findMercadoPagoPaymentMethod(tx, userId);
			if (method) paymentMethods.push(method);
		}
		if (externalConfig.enabled) {
			const method = await findExternalPaymentMethod(tx, userId);
			if (method) paymentMethods.push(method);
		}

		return checkoutStateSchema.parse({
			cart: mapCart(cart),
			addresses: addresses.map(toCheckoutAddress),
			paymentMethods: paymentMethods.map(toCheckoutPaymentMethod),
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
		// refusing here keeps `leave` from ever cancelling an order that was paid,
		// or one whose transfer the user already reported (ADR 0010).
		if (latestAttempt && !isCancellablePaymentAttempt(latestAttempt)) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: latestAttempt.declaredReceiptReference
					? "Ya informaste una transferencia para este pedido. Esperá a que la confirmemos antes de volver al carrito."
					: "Hay un pago en curso para este carrito. Esperá a que el proveedor lo resuelva.",
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
 * The provider that will carry the attempt, resolved from the method the user
 * picked and refused if that provider is off. Anything outside the two offered
 * providers is rejected here: legacy `mock` methods stay in the database
 * (`UserTransaction.paymentMethod` is `onDelete: Restrict`) and remain
 * selectable by id even though checkout no longer lists them (ADR 0010).
 */
async function resolvePaymentProviderConfig(
	database: CheckoutDbClient,
	paymentMethod: CheckoutPaymentMethod,
) {
	if (
		paymentMethod.provider === "mercadopago" ||
		paymentMethod.type === "mercadopago"
	) {
		const config = await getMercadoPagoConfig(database);

		if (!config.enabled) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: "Mercado Pago no está habilitado para checkout.",
			});
		}

		return { provider: "mercadopago" as const, config };
	}

	if (paymentMethod.provider === EXTERNAL_PROVIDER) {
		const config = await getExternalPaymentConfig(database);

		if (!config.enabled) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: "El pago externo no está habilitado para checkout.",
			});
		}

		return { provider: "external" as const, config };
	}

	throw new TRPCError({
		code: "PRECONDITION_FAILED",
		message:
			"Ese método de pago ya no está disponible. Elegí otro para continuar.",
	});
}

function buildReusedAttemptMessage(
	transaction: OrderDetailRecord["transactions"][number],
) {
	if (transaction.status !== "pending") return undefined;

	if (transaction.provider === "mercadopago") {
		return "Ya tenés un pago iniciado para este carrito. Te redirigimos a Mercado Pago para completarlo.";
	}

	if (transaction.provider === EXTERNAL_PROVIDER) {
		return "Ya tenés un pedido esperando tu transferencia. Usá estos datos para completarla.";
	}

	return undefined;
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
		externalPayment: await loadExternalPaymentInstructions(db, {
			orderCode: existing.userOrder.code,
			transaction: existing,
		}),
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
		const providerConfig = await resolvePaymentProviderConfig(
			tx,
			paymentMethod,
		);

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
					externalPayment: await loadExternalPaymentInstructions(tx, {
						orderCode: liveOrder.code,
						transaction: latestAttempt,
					}),
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
				provider: providerConfig.provider,
			},
			provider: providerConfig.provider,
			providerMode:
				providerConfig.provider === "mercadopago"
					? providerConfig.config.mode
					: null,
		});

		return {
			kind: "created" as const,
			address,
			cart,
			order,
			paymentMethod,
			providerConfig,
			transaction,
		};
	});

	if (prepared.kind === "existing") return prepared.result;

	if (prepared.providerConfig.provider === "mercadopago") {
		const mercadoPagoConfig = prepared.providerConfig.config;
		const preference = await createMercadoPagoPreference({
			cart: prepared.cart,
			order: {
				id: prepared.order.id,
				code: prepared.order.code,
				user: prepared.order.user,
			},
			transaction: prepared.transaction,
			config: mercadoPagoConfig,
		});
		const transaction = await updateTransactionWithMercadoPagoPreference(db, {
			id: prepared.transaction.id,
			providerMode: mercadoPagoConfig.mode,
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

	const externalSettings = prepared.providerConfig.config.settings;
	// No provider will ever call back for a transfer, so the attempt is left
	// pending and no domain event is dispatched: only an admin settling it in
	// `/admin/payments` submits the order (ADR 0010).
	const transaction = await markTransactionAsExternalPending(db, {
		id: prepared.transaction.id,
		expiresAt: new Date(
			Date.now() + externalSettings.expiresInHours * HOUR_IN_MS,
		),
		requestSnapshot: {
			idempotencyKey: input.idempotencyKey,
			cart: { id: prepared.cart.id, code: prepared.cart.code },
			order: { id: prepared.order.id, code: prepared.order.code },
			amount: prepared.transaction.amount.toString(),
			currency: prepared.transaction.currency,
			paymentMethod: prepared.paymentMethod,
			provider: EXTERNAL_PROVIDER,
		},
	});

	return buildPaymentResult({
		order: prepared.order,
		transaction,
		shippingAddress: prepared.address,
		paymentMethod: prepared.paymentMethod,
		message:
			"Registramos tu pedido. Hacé la transferencia con estos datos; confirmamos el pedido cuando la verifiquemos.",
		externalPayment: buildExternalPaymentInstructions({
			settings: externalSettings,
			orderCode: prepared.order.code,
			transaction,
		}),
	});
}

export async function listMine(userId: string): Promise<OrderListOutput> {
	const records = await listOrdersByUserId(db, userId);
	return orderListOutputSchema.parse(records.map(toOrderListItem));
}

async function getRequiredOrder(userId: string, orderId: number) {
	const order = await findOrderByUserId(db, userId, orderId);
	if (!order) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No encontramos ese pedido en tu cuenta.",
		});
	}

	return order;
}

export async function getMine(
	userId: string,
	orderId: number,
): Promise<OrderDetail> {
	const order = await getRequiredOrder(userId, orderId);

	return toOrderDetail(order, await loadOrderExternalPayment(db, order));
}

/**
 * Records the transfer reference the user says they sent. It settles nothing:
 * the attempt stays `pending` until an admin verifies the money landed, so no
 * status changes and no domain event is dispatched here (ADR 0010).
 */
export async function declareExternalReceipt(
	userId: string,
	input: OrderDeclareReceiptInput,
): Promise<OrderDetail> {
	const order = await getRequiredOrder(userId, input.orderId);
	const latestAttempt = order.transactions[0];

	if (
		!latestAttempt ||
		latestAttempt.provider !== EXTERNAL_PROVIDER ||
		latestAttempt.status !== "pending"
	) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Este pedido no tiene una transferencia pendiente de informar.",
		});
	}

	if (isSpentPaymentAttempt(latestAttempt, new Date())) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"El plazo para transferir venció. Volvé a confirmar el pedido para obtener datos nuevos.",
		});
	}

	await declareTransactionReceipt(db, {
		id: latestAttempt.id,
		reference: input.reference,
	});

	return getMine(userId, input.orderId);
}
