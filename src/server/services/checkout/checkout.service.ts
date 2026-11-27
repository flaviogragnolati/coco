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
import { runSerializable } from "~/server/services/admin/_base/serializable-transaction";
import { enqueueCustomerEmail } from "~/server/services/notifications/customer-email.data";
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
	CheckoutLiveOrder,
	CheckoutPaymentMethod,
	CheckoutPaymentResult,
	CheckoutState,
	OrderDeclareReceiptInput,
	OrderDetail,
	OrderExternalPayment,
	OrderListOutput,
	OrderPaymentReturn,
	OrderPaymentReturnInput,
} from "~/shared/common/checkout.types";
import { CHECKOUT_TERMS } from "~/shared/common/checkout-terms";
import {
	buildCartSnapshot,
	calculateLineTotal,
	formatCurrency,
	selectProductImage,
} from "~/shared/common/commerce.helpers";
import { readPickupPointSnapshot } from "~/shared/common/delivery-display";
import { selectOrderDisplayAttempt } from "~/shared/common/order-display";
import {
	readSnapshotProduct,
	withSnapshotPresentation,
} from "~/shared/common/product-snapshot";
import {
	decideAttemptCharge,
	moneyEquals,
	normalizeTransferDiscountPercent,
} from "~/shared/common/transfer-discount";
import { termsToClientTerms } from "../_base/client-terms.mapper";
import { isClientTermsUsable } from "../_base/terms-validity";
import { appLogger } from "../logging/app-logger.service";
import {
	EXTERNAL_PROVIDER,
	getExternalPaymentConfig,
} from "../payments/external/external-payment-config.service";
import {
	getMercadoPagoConfig,
	preferenceMatchesConfiguredTestSeller,
} from "../payments/mercadopago/mercadopago-config.service";
import { parseMercadoPagoExternalReference } from "../payments/mercadopago/mercadopago-preference.decision";
import {
	createMercadoPagoPreference,
	recoverMercadoPagoPreference,
} from "../payments/mercadopago/mercadopago-preference.service";
import {
	type CheckoutAddressRecord,
	type CheckoutCartRecord,
	type CheckoutDbClient,
	type CheckoutPaymentMethodRecord,
	cancelAbandonableAttempt,
	createCheckoutAddress,
	createPendingTransaction,
	createUserOrder,
	declareTransactionReceipt,
	findCheckoutAddressById,
	findCheckoutCartByUserId,
	findCheckoutPaymentMethodById,
	findCheckoutPickupPointById,
	findExternalPaymentMethod,
	findLiveOrderByCartId,
	findMercadoPagoPaymentMethod,
	findOrCreateExternalPaymentMethod,
	findOrCreateMercadoPagoPaymentMethod,
	findOrderByUserId,
	findOrderIdByTransactionId,
	findTransactionByIdempotencyKey,
	listCheckoutAddresses,
	listCheckoutPickupPoints,
	listOrdersByUserId,
	type OrderDetailRecord,
	type OrderListRecord,
	updateCartStatus,
	updateCheckoutAddress,
	updateOrderDelivery,
	updateTransactionWithMercadoPagoPreference,
} from "./checkout.data";
import {
	type OrderDeliveryColumns,
	resolveCheckoutDelivery,
} from "./checkout-delivery";
import { releaseCheckoutCart } from "./checkout-release";
import {
	checkoutReleaseBlockedMessage,
	decideCheckoutRelease,
} from "./checkout-release.decision";
import { isSpentPaymentAttempt } from "./payment-attempt.decision";
import { decideOpenAttemptHandling } from "./payment-charge.decision";

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
			presentationContainer:
				item.productClientTerms.product.presentationContainer,
			presentationSize: item.productClientTerms.product.presentationSize,
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
			message: "Tu pedido está vacío. Agregá productos para finalizarlo.",
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
				"Uno de los productos de tu pedido ya no está disponible. Revisalo antes de continuar.",
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
			message: "No encontramos tu pedido. Recargá la página.",
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
				"Tu pedido tiene productos en más de una moneda. Por ahora solo confirmamos pedidos en una.",
		});
	}

	const total = cart.totals[0];
	if (!total) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "No encontramos un total válido para tu pedido.",
		});
	}

	return total;
}

function buildTermsSnapshot(acceptedAt: Date) {
	return {
		source: "checkout",
		version: CHECKOUT_TERMS.version,
		text: CHECKOUT_TERMS.text,
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

function toAttemptTransferDiscount(
	transaction: Pick<
		OrderDetailRecord["transactions"][number],
		"subtotalAmount" | "transferDiscountPercent" | "transferDiscountAmount"
	>,
) {
	return {
		subtotalAmount: transaction.subtotalAmount?.toString() ?? null,
		transferDiscountPercent:
			transaction.transferDiscountPercent?.toString() ?? null,
		transferDiscountAmount:
			transaction.transferDiscountAmount?.toString() ?? null,
	};
}

/**
 * Whether the attempt an order shows is a transfer the customer reported and
 * an admin has not settled yet.
 */
function isReceiptDeclared(
	attempt:
		| { status: string; declaredReceiptReference: string | null }
		| undefined,
) {
	return (
		attempt?.status === "pending" && attempt.declaredReceiptReference !== null
	);
}

function toOrderListItem(record: OrderListRecord) {
	const displayAttempt = selectOrderDisplayAttempt(record.transactions);

	return {
		id: record.id,
		code: record.code,
		status: record.status,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		itemCount: record._count.items,
		itemNames: record.items.map(
			(item) => readSnapshotProduct(item.productSnapshot).name,
		),
		totalAmount: displayAttempt?.amount.toString() ?? "0.00",
		currency: displayAttempt?.currency ?? null,
		latestTransactionStatus: displayAttempt?.status ?? null,
		receiptDeclared: isReceiptDeclared(displayAttempt),
	};
}

function toOrderDetail(
	record: OrderDetailRecord,
	externalPayment: OrderExternalPayment | null,
): OrderDetail {
	const displayAttempt = selectOrderDisplayAttempt(record.transactions);

	return orderDetailSchema.parse({
		id: record.id,
		code: record.code,
		status: record.status,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		itemCount: record.items.length,
		itemNames: record.items.map(
			(item) => readSnapshotProduct(item.productSnapshot).name,
		),
		totalAmount: displayAttempt?.amount.toString() ?? "0.00",
		currency: displayAttempt?.currency ?? null,
		latestTransactionStatus: displayAttempt?.status ?? null,
		receiptDeclared: isReceiptDeclared(displayAttempt),
		cartCode: record.cart.code,
		billingAddressSnapshot: record.billingAddressSnapshot,
		shippingAddressSnapshot: record.shippingAddressSnapshot,
		deliveryPreference: record.deliveryPreference,
		pickupPointSnapshot: readPickupPointSnapshot(record.pickupPointSnapshot)
			? record.pickupPointSnapshot
			: null,
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
			...toAttemptTransferDiscount(transaction),
		})),
	});
}

/**
 * The saved address an order was confirmed with. Null for a pickup-point order,
 * which stores none, and for an address an admin typed for the order alone.
 */
function getAddressFromSnapshot(
	record: OrderDetailRecord,
): CheckoutAddress | null {
	const snapshot = record.shippingAddressSnapshot;

	if (
		typeof snapshot === "object" &&
		snapshot !== null &&
		"address" in snapshot
	) {
		const parsed = checkoutAddressSchema.safeParse(snapshot.address);
		if (parsed.success) return parsed.data;
	}

	if (record.deliveryPreference !== null) return null;

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

async function getPaymentRedirectUrl(
	attempt: OrderDetailRecord["transactions"][number],
) {
	if (
		attempt.provider !== "mercadopago" ||
		attempt.status !== "pending" ||
		attempt.providerPaymentId
	)
		return null;
	if (attempt.providerMode !== "sandbox") {
		return attempt.checkoutUrl ?? attempt.sandboxCheckoutUrl;
	}
	if (attempt.checkoutUrl && attempt.providerPreferenceId) {
		try {
			if (
				await preferenceMatchesConfiguredTestSeller(
					db,
					attempt.id,
					attempt.providerPreferenceId,
				)
			) {
				return attempt.checkoutUrl;
			}
		} catch {
			appLogger.error("mercadopagoCheckoutFailed", {
				attemptId: attempt.id,
				stage: "seller",
			});
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `No pudimos verificar el vendedor de prueba. Volvé a confirmar tu pedido. Referencia #${attempt.id}.`,
			});
		}
	}
	if (attempt.checkoutUrl && !attempt.sandboxCheckoutUrl) {
		appLogger.error("mercadopagoCheckoutFailed", {
			attemptId: attempt.id,
			stage: "redirect",
		});
		throw new TRPCError({
			code: "BAD_GATEWAY",
			message: `No hay un enlace disponible para el vendedor de prueba. Contactá a soporte. Referencia #${attempt.id}.`,
		});
	}
	return attempt.sandboxCheckoutUrl;
}

async function buildPaymentResult(input: {
	order: OrderDetailRecord;
	transaction: OrderDetailRecord["transactions"][number];
	paymentMethod: CheckoutPaymentMethod;
	message?: string;
	externalPayment?: ExternalPaymentInstructions | null;
}): Promise<CheckoutPaymentResult> {
	const status = mapTransactionStatusToPaymentStatus(input.transaction.status);
	const message =
		input.message ??
		(status === "succeeded"
			? "Pago aprobado. Tu compra quedó confirmada."
			: status === "failed"
				? (input.transaction.failureMessage ?? "No se pudo procesar el pago.")
				: "El pago quedó pendiente de confirmación.");

	const result = checkoutPaymentResultSchema.parse({
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
			...toAttemptTransferDiscount(input.transaction),
		},
		redirectUrl: await getPaymentRedirectUrl(input.transaction),
		externalPayment: input.externalPayment ?? null,
		deliveryPreference: input.order.deliveryPreference,
		shippingAddress: getAddressFromSnapshot(input.order),
		pickupPoint: readPickupPointSnapshot(input.order.pickupPointSnapshot),
		paymentMethod: input.paymentMethod,
	});
	if (result.redirectUrl) {
		appLogger.info("mercadopagoCheckoutRedirectReady", {
			attemptId: input.transaction.id,
			orderId: input.order.id,
			mode: input.transaction.providerMode,
		});
	} else if (
		input.transaction.provider === "mercadopago" &&
		input.transaction.status === "pending" &&
		!input.transaction.providerPaymentId
	) {
		appLogger.error("mercadopagoCheckoutFailed", {
			attemptId: input.transaction.id,
			stage: "redirect",
		});
		throw new TRPCError({
			code: "BAD_GATEWAY",
			message: `Mercado Pago no devolvió el enlace de pago. Volvé a confirmar para recuperarlo. Referencia #${input.transaction.id}.`,
		});
	}
	return result;
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
 * The delivery an order was confirmed with, in the shape confirming sends. Null
 * for an order paid before the customer could choose, or whose address
 * snapshot does not carry a saved address.
 */
function toLiveOrderDelivery(
	order: OrderDetailRecord,
): CheckoutLiveOrder["delivery"] {
	if (order.deliveryPreference === "pickupPoint") {
		return order.pickupPointId
			? { mode: "pickupPoint", pickupPointId: order.pickupPointId }
			: null;
	}
	if (order.deliveryPreference !== "homeDelivery") return null;

	const snapshot = order.shippingAddressSnapshot;
	if (typeof snapshot !== "object" || snapshot === null) return null;
	if (!("address" in snapshot)) return null;
	const address = checkoutAddressSchema.safeParse(snapshot.address);
	return address.success
		? { mode: "homeDelivery", shippingAddressId: address.data.id }
		: null;
}

/**
 * The order a cart at checkout is waiting on, read inside the caller's
 * transaction. Null for an editable cart, and for a cart an older flow left at
 * checkout with no order, which a cart mutation still releases.
 */
async function loadLiveOrderState(
	database: CheckoutDbClient,
	cart: CheckoutCartRecord,
): Promise<CheckoutLiveOrder | null> {
	if (cart.status !== "atCheckout") return null;

	const order = await findLiveOrderByCartId(database, cart.id);
	if (!order) return null;

	const latestAttempt = order.transactions[0] ?? null;
	const release = decideCheckoutRelease({
		cartStatus: cart.status,
		latestAttempt,
	});

	return {
		id: order.id,
		code: order.code,
		delivery: toLiveOrderDelivery(order),
		paymentMethodId: latestAttempt?.paymentMethod.id ?? null,
		provider: latestAttempt?.provider ?? null,
		// The cart is at checkout, so the decision is never `notAtCheckout`.
		release: release === "notAtCheckout" ? "release" : release,
	};
}

/**
 * Prepares what the customer chooses from before confirming. It leaves the
 * cart as it is: only `confirmAndPay` freezes it (ADR 0015). It differs from
 * `getState` in minting the payment methods checkout offers, one per enabled
 * provider, never a user-minted one. `enabled` on each `payment_provider_config`
 * row is the only switch (ADR 0010).
 */
export async function start(userId: string): Promise<CheckoutState> {
	return db.$transaction(async (tx) => {
		const cart = await getRequiredCheckoutCart(tx, userId);
		const addresses = await listCheckoutAddresses(tx, userId);
		const mercadoPagoConfig = await getMercadoPagoConfig(tx);
		const externalConfig = await getExternalPaymentConfig(tx);

		const paymentMethods: CheckoutPaymentMethodRecord[] = [];
		if (mercadoPagoConfig.enabled) {
			paymentMethods.push(
				await findOrCreateMercadoPagoPaymentMethod(tx, userId),
			);
		}
		if (externalConfig.enabled) {
			paymentMethods.push(await findOrCreateExternalPaymentMethod(tx, userId));
		}

		const pickupPoints = await listCheckoutPickupPoints(tx);
		const liveOrder = await loadLiveOrderState(tx, cart);

		return checkoutStateSchema.parse({
			cart: mapCart(cart),
			liveOrder,
			addresses: addresses.map(toCheckoutAddress),
			paymentMethods: paymentMethods.map(toCheckoutPaymentMethod),
			pickupPoints,
			termsText: CHECKOUT_TERMS.text,
			transferDiscountPercent: externalConfig.enabled
				? normalizeTransferDiscountPercent(
						externalConfig.settings.transferDiscountPercent,
					)
				: null,
		});
	});
}

export async function getState(userId: string): Promise<CheckoutState> {
	return db.$transaction(async (tx) => {
		const cart = await getRequiredCheckoutCart(tx, userId);
		const addresses = await listCheckoutAddresses(tx, userId);
		const mercadoPagoConfig = await getMercadoPagoConfig(tx);
		const externalConfig = await getExternalPaymentConfig(tx);

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

		const pickupPoints = await listCheckoutPickupPoints(tx);
		const liveOrder = await loadLiveOrderState(tx, cart);

		return checkoutStateSchema.parse({
			cart: mapCart(cart),
			liveOrder,
			addresses: addresses.map(toCheckoutAddress),
			paymentMethods: paymentMethods.map(toCheckoutPaymentMethod),
			pickupPoints,
			termsText: CHECKOUT_TERMS.text,
			transferDiscountPercent: externalConfig.enabled
				? normalizeTransferDiscountPercent(
						externalConfig.settings.transferDiscountPercent,
					)
				: null,
		});
	});
}

/**
 * Releases a cart from checkout so it becomes editable again, cancelling the
 * live order and its pending attempt. The mechanics live in
 * `releaseCheckoutCart`, shared with the automatic release a cart mutation
 * performs; `leave` is the explicit request, so it surfaces a refusal as an
 * error instead of swallowing it.
 *
 * A settled payment should already have moved the cart out of `atCheckout`;
 * refusing on a blocked decision keeps `leave` from ever cancelling an order
 * that was paid, or one whose transfer the user already reported (ADR 0010).
 */
export async function leave(userId: string): Promise<CartSnapshot> {
	const cart = await db.$transaction(async (tx) => {
		const checkoutCart = await findCheckoutCartByUserId(tx, userId);
		if (!checkoutCart) return null;

		const outcome = await releaseCheckoutCart(tx, checkoutCart);
		if (outcome.decision === "notAtCheckout") return checkoutCart;
		if (outcome.decision === "release") return outcome.cart;

		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: checkoutReleaseBlockedMessage(outcome.decision),
		});
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
				message:
					"Mercado Pago no está disponible ahora. Elegí otro medio de pago.",
			});
		}

		return { provider: "mercadopago" as const, config };
	}

	if (paymentMethod.provider === EXTERNAL_PROVIDER) {
		const config = await getExternalPaymentConfig(database);

		if (!config.enabled) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message:
					"La transferencia bancaria no está disponible ahora. Elegí otro medio de pago.",
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

/** Why confirming answered with the attempt that was already open. */
function buildReusedAttemptMessage(
	transaction: OrderDetailRecord["transactions"][number],
) {
	if (transaction.status !== "pending" || transaction.providerPaymentId)
		return undefined;

	if (transaction.provider === "mercadopago") {
		return "Ya tenés un pago iniciado para tu pedido. Te redirigimos a Mercado Pago para completarlo.";
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
				message: "Ya hay un pago en curso para tu pedido. Actualizá la página.",
			});
		}
		throw error;
	});
}

async function loadAndSaveMercadoPagoPreference(
	attemptId: number,
	mode: "sandbox" | "production",
	operation: "create" | "recover",
	load: () => ReturnType<typeof recoverMercadoPagoPreference>,
) {
	let stage: typeof operation | "persist" = operation;
	try {
		const preference = await load();
		stage = "persist";
		return await updateTransactionWithMercadoPagoPreference(db, {
			id: attemptId,
			onlyIfPending: operation === "recover",
			providerMode: mode,
			...preference,
		});
	} catch (error) {
		const status =
			typeof error === "object" && error !== null && "status" in error
				? error.status
				: undefined;
		appLogger.error("mercadopagoCheckoutFailed", {
			attemptId,
			stage,
			httpStatus:
				stage !== "persist" &&
				typeof status === "number" &&
				Number.isInteger(status) &&
				status >= 400 &&
				status <= 599
					? status
					: undefined,
		});
		if (error instanceof TRPCError) {
			throw new TRPCError({
				code: error.code,
				message: `${error.message} Referencia #${attemptId}.`,
			});
		}
		throw new TRPCError({
			code: stage === "persist" ? "INTERNAL_SERVER_ERROR" : "BAD_GATEWAY",
			message: `No pudimos preparar el enlace de Mercado Pago. Volvé a confirmar tu pedido. Referencia #${attemptId}.`,
		});
	}
}

async function buildExistingPaymentResult(
	input: Parameters<typeof buildPaymentResult>[0],
) {
	const attempt = input.transaction;
	if (
		attempt.provider !== "mercadopago" ||
		attempt.status !== "pending" ||
		attempt.providerPaymentId
	) {
		return buildPaymentResult(input);
	}
	if (isSpentPaymentAttempt(attempt, new Date())) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"El pago venció. Volvé a confirmar desde Tu pedido para generar uno nuevo.",
		});
	}
	if (attempt.checkoutUrl || attempt.sandboxCheckoutUrl) {
		return buildPaymentResult(input);
	}
	const transaction = await loadAndSaveMercadoPagoPreference(
		attempt.id,
		attempt.providerMode ?? "sandbox",
		"recover",
		() => recoverMercadoPagoPreference(attempt),
	);
	return buildPaymentResult({ ...input, transaction });
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

	return buildExistingPaymentResult({
		order: existing.userOrder,
		transaction: existing,
		paymentMethod: toCheckoutPaymentMethod(existing.paymentMethod),
		externalPayment: await loadExternalPaymentInstructions(db, {
			orderCode: existing.userOrder.code,
			transaction: existing,
		}),
	});
}

/**
 * The customer's delivery choice, checked against what checkout offers right
 * now: one of their saved addresses, or a point that is still active.
 */
async function resolveRequestedDelivery(
	database: CheckoutDbClient,
	userId: string,
	input: CheckoutConfirmInput,
): Promise<OrderDeliveryColumns> {
	if (input.delivery.mode === "pickupPoint") {
		const pickupPoint = await findCheckoutPickupPointById(
			database,
			input.delivery.pickupPointId,
		);
		if (!pickupPoint) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "El punto de retiro ya no está disponible",
			});
		}

		return resolveCheckoutDelivery({ delivery: input.delivery, pickupPoint });
	}

	const addressRecord = await findCheckoutAddressById(
		database,
		userId,
		input.delivery.shippingAddressId,
	);
	if (!addressRecord) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Seleccioná una dirección de envío válida.",
		});
	}

	return resolveCheckoutDelivery({
		delivery: input.delivery,
		address: toCheckoutAddress(addressRecord),
	});
}

/**
 * Confirms the order and opens a payment attempt for the chosen method. A
 * repeated idempotency key answers with its attempt before anything else, and
 * a cart has at most one live order: confirming again reuses it.
 *
 * The amount depends on the method (ADR 0013): a transfer may carry the
 * discount, Mercado Pago never does. So the live order's open attempt is
 * reused only for the same method and is otherwise replaced while the customer
 * may still abandon it (`decideOpenAttemptHandling`). A new attempt is created
 * only when its amount equals `expectedAmount`, the one the screen showed.
 *
 * The cart may arrive editable: confirming moves it to `atCheckout` in the
 * same transaction that creates the order (ADR 0015).
 */
export async function confirmAndPay(
	userId: string,
	input: CheckoutConfirmInput,
): Promise<CheckoutPaymentResult> {
	const existingResult = await getExistingPaymentResult(
		userId,
		input.idempotencyKey,
	);
	if (existingResult) return existingResult;

	const prepared = await runSerializable(db, async (tx) => {
		const now = new Date();
		const cart = await getRequiredCheckoutCart(tx, userId);
		const cartSnapshot = mapCart(cart);
		const total = assertSingleCurrency(cartSnapshot);
		const delivery = await resolveRequestedDelivery(tx, userId, input);
		const paymentRecord = await findCheckoutPaymentMethodById(
			tx,
			userId,
			input.paymentMethodId,
		);

		if (!paymentRecord) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Seleccioná un método de pago válido.",
			});
		}

		const paymentMethod = toCheckoutPaymentMethod(paymentRecord);
		const providerConfig = await resolvePaymentProviderConfig(
			tx,
			paymentMethod,
		);

		const foundLiveOrder = await findLiveOrderByCartId(tx, cart.id);
		// A live order has no completed payment (one would have moved the cart out
		// of checkout), so the customer's latest choice replaces the earlier one.
		const liveOrder = foundLiveOrder
			? await updateOrderDelivery(tx, foundLiveOrder.id, delivery)
			: null;
		const latestAttempt = liveOrder?.transactions[0] ?? null;
		// Read inside the transaction: the percent in force now is the one the
		// attempt freezes (ADR 0013).
		const charge = decideAttemptCharge({
			provider: providerConfig.provider,
			subtotal: total.amount,
			currency: total.currency,
			transferDiscountPercent:
				providerConfig.provider === "external"
					? providerConfig.config.settings.transferDiscountPercent
					: null,
		});

		const openAttemptHandling =
			liveOrder && latestAttempt && !isSpentPaymentAttempt(latestAttempt, now)
				? decideOpenAttemptHandling({
						attempt: latestAttempt,
						requestedProvider: providerConfig.provider,
					})
				: null;

		// A reused attempt keeps the amount it froze, so it is never compared
		// with the one the screen showed.
		if (liveOrder && latestAttempt && openAttemptHandling === "reuse") {
			return {
				kind: "existing" as const,
				payment: {
					order: liveOrder,
					transaction: latestAttempt,
					paymentMethod: toCheckoutPaymentMethod(latestAttempt.paymentMethod),
					message: buildReusedAttemptMessage(latestAttempt),
					externalPayment: await loadExternalPaymentInstructions(tx, {
						orderCode: liveOrder.code,
						transaction: latestAttempt,
					}),
				},
			};
		}

		if (latestAttempt && openAttemptHandling === "replace") {
			// Guarded on the state the decision read: a receipt declared or a
			// provider update committed meanwhile must not be cancelled over.
			const cancelled = await cancelAbandonableAttempt(tx, latestAttempt.id);
			if (!cancelled) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Tu pago cambió mientras confirmabas. Revisá tu pedido y confirmá de nuevo.",
				});
			}
		}

		// Throwing here rolls back the whole transaction, the cancellation and
		// the delivery change included: nothing is created for a figure the
		// customer did not see.
		if (!moneyEquals(input.expectedAmount, charge.amount)) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `El total cambió: ahora pagás ${formatCurrency(charge.amount, total.currency)}. Revisalo y confirmá de nuevo.`,
			});
		}

		// Confirming is what freezes the cart (ADR 0015): from here on the order
		// snapshot references it. Inside the transaction, so a refusal above
		// leaves it editable.
		if (cart.status !== "atCheckout") {
			await updateCartStatus(tx, cart.id, "atCheckout");
		}

		const acceptedAt = new Date();
		const order =
			liveOrder ??
			(await createLiveUserOrder(tx, {
				code: buildOrderCode(),
				userId,
				cartId: cart.id,
				delivery,
				termsSnapshot: buildTermsSnapshot(acceptedAt),
				acceptedTermsAt: acceptedAt,
				items: cart.cartItems.map((item) => ({
					sourceCartItemId: item.id,
					quantity: item.quantity.toString(),
					productSnapshot: withSnapshotPresentation(
						item.productSnapshot,
						item.productClientTerms.product,
					),
					priceSnapshot: buildPriceSnapshot(item),
				})),
			}));

		const transaction = await createPendingTransaction(tx, {
			amount: charge.amount,
			currency: total.currency,
			idempotencyKey: input.idempotencyKey,
			paymentMethodId: paymentMethod.id,
			userOrderId: order.id,
			requestSnapshot: {
				idempotencyKey: input.idempotencyKey,
				cart: { id: cart.id, code: cart.code },
				order: { id: order.id, code: order.code },
				amount: charge.amount,
				subtotal: total.amount,
				transferDiscount: charge.transferDiscount,
				currency: total.currency,
				paymentMethod,
				provider: providerConfig.provider,
			},
			provider: providerConfig.provider,
			expiresAt: new Date(
				now.getTime() +
					(providerConfig.provider === "mercadopago"
						? providerConfig.config.settings.preferenceExpiresInMinutes * 60_000
						: providerConfig.config.settings.expiresInHours * HOUR_IN_MS),
			),
			providerMode:
				providerConfig.provider === "mercadopago"
					? providerConfig.config.mode
					: null,
			transferDiscount: charge.transferDiscount,
		});

		if (providerConfig.provider === "external") {
			await enqueueCustomerEmail(tx, order.id, `transfer/${transaction.id}`, {
				kind: "transfer",
				attemptId: transaction.id,
			});
		}

		return {
			kind: "created" as const,
			cart,
			order,
			paymentMethod,
			providerConfig,
			transaction,
		};
	});

	if (prepared.kind === "existing")
		return buildExistingPaymentResult(prepared.payment);

	if (prepared.providerConfig.provider === "mercadopago") {
		const mercadoPagoConfig = prepared.providerConfig.config;
		const transaction = await loadAndSaveMercadoPagoPreference(
			prepared.transaction.id,
			mercadoPagoConfig.mode,
			"create",
			() =>
				createMercadoPagoPreference({
					cart: prepared.cart,
					order: {
						id: prepared.order.id,
						code: prepared.order.code,
						user: prepared.order.user,
					},
					transaction: prepared.transaction,
					config: mercadoPagoConfig,
				}),
		);

		return buildPaymentResult({
			order: prepared.order,
			transaction,
			paymentMethod: prepared.paymentMethod,
			message:
				"Te redirigimos a Mercado Pago. El pedido se confirma cuando el proveedor aprueba el pago.",
		});
	}

	const externalSettings = prepared.providerConfig.config.settings;
	const transaction = prepared.transaction;

	return buildPaymentResult({
		order: prepared.order,
		transaction,
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

/**
 * The order a Mercado Pago return points at, read from the external reference
 * the preference carried. Anything that is not one of the user's attempts
 * answers null, so the page cannot tell a stranger's order from a missing one.
 */
export async function resolvePaymentReturn(
	userId: string,
	input: OrderPaymentReturnInput,
): Promise<OrderPaymentReturn> {
	const transactionId = parseMercadoPagoExternalReference(
		input.externalReference,
	);
	if (transactionId === null) return null;

	const orderId = await findOrderIdByTransactionId(db, userId, transactionId);
	return orderId === null ? null : { orderId };
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
