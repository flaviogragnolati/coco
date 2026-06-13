import "server-only";

import { TRPCError } from "@trpc/server";
import { Payment } from "mercadopago";

import { createMercadoPagoClient } from "~/lib/mercadopago/client";
import type { Prisma } from "~/prisma/client";
import { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import { toPrismaInputJson } from "~/server/services/admin/_base/prisma-json";
import {
	findPaymentAttemptById,
	findPaymentEventById,
	updatePaymentProviderEventStatus,
} from "~/server/services/payments/payment.data";
import { MERCADOPAGO_PROVIDER } from "./mercadopago-config.service";

type PaymentStatus =
	| "pending"
	| "inProcess"
	| "completed"
	| "failed"
	| "cancelled"
	| "refunded"
	| "chargedBack";

type AttemptWithOrder = Prisma.UserTransactionGetPayload<{
	include: {
		userOrder: {
			include: {
				cart: { include: { cartItems: true } };
				items: true;
			};
		};
	};
}>;

function mapProviderStatus(status: string | undefined | null): PaymentStatus {
	switch (status) {
		case "approved":
			return "completed";
		case "in_process":
			return "inProcess";
		case "rejected":
			return "failed";
		case "cancelled":
			return "cancelled";
		case "refunded":
			return "refunded";
		case "charged_back":
			return "chargedBack";
		default:
			return "pending";
	}
}

function shouldApplyStatus(
	current: PaymentStatus,
	next: PaymentStatus,
): boolean {
	if (current === next) return true;
	if (next === "refunded" || next === "chargedBack") return true;
	if (current === "refunded" || current === "chargedBack") return false;
	if (current === "completed") return false;
	if (next === "completed") return true;
	return true;
}

function extractTransactionIdFromReference(reference: unknown) {
	if (typeof reference !== "string") return null;
	const match = /^user_transaction:(\d+)$/.exec(reference);
	if (!match?.[1]) return null;
	return Number(match[1]);
}

function buildSubmittedToOrderEventKey(input: {
	orderId: number;
	transactionId: number;
	cartItemId: number;
}) {
	return `checkout:order:${input.orderId}:transaction:${input.transactionId}:cartItem:${input.cartItemId}:submittedToOrder`;
}

async function findAttemptForPayment(
	tx: Prisma.TransactionClient,
	payment: Awaited<ReturnType<Payment["get"]>>,
) {
	const fromReference = extractTransactionIdFromReference(
		payment.external_reference,
	);

	return tx.userTransaction.findFirst({
		where: {
			OR: [
				fromReference ? { id: fromReference } : undefined,
				payment.id ? { providerPaymentId: String(payment.id) } : undefined,
			].filter(Boolean) as Prisma.UserTransactionWhereInput[],
			provider: MERCADOPAGO_PROVIDER,
		},
		include: {
			userOrder: {
				include: {
					cart: { include: { cartItems: true } },
					items: true,
				},
			},
		},
	});
}

async function submitOrderAfterCompletedPayment(
	tx: Prisma.TransactionClient,
	attempt: AttemptWithOrder,
) {
	if (attempt.completedAt) return;

	await tx.cartItem.updateMany({
		where: {
			cartId: attempt.userOrder.cartId,
			deleted: false,
			status: "inCart",
		},
		data: {
			status: "submitted",
			fulfillmentStatus: "awaitingAggregation",
		},
	});
	await tx.cart.update({
		where: { id: attempt.userOrder.cartId },
		data: { status: "submitted" },
	});
	await tx.userOrder.update({
		where: { id: attempt.userOrderId },
		data: { status: "processing" },
	});

	const orderItemsByCartItemId = new Map(
		attempt.userOrder.items.map((item) => [item.sourceCartItemId, item]),
	);

	await DomainEventPublisher.publishMany(
		tx,
		attempt.userOrder.cart.cartItems.map((cartItem) => {
			const orderItem = orderItemsByCartItemId.get(cartItem.id);

			if (!orderItem) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "No se pudo vincular el item del carrito con el pedido.",
				});
			}

			return {
				type: "cart.item.submittedToOrder",
				eventKey: buildSubmittedToOrderEventKey({
					orderId: attempt.userOrderId,
					transactionId: attempt.id,
					cartItemId: cartItem.id,
				}),
				aggregateType: "CartItem",
				aggregateId: String(cartItem.id),
				actor: {
					source: "system" as const,
					actorReference: MERCADOPAGO_PROVIDER,
				},
				payload: {
					cartItemId: String(cartItem.id),
					cartId: String(attempt.userOrder.cartId),
					orderId: String(attempt.userOrderId),
					userOrderItemId: String(orderItem.id),
					transactionId: String(attempt.id),
					quantity: cartItem.quantity.toString(),
				},
			};
		}),
	);
}

async function updateAttemptFromPayment(
	tx: Prisma.TransactionClient,
	attempt: AttemptWithOrder,
	payment: Awaited<ReturnType<Payment["get"]>>,
) {
	const nextStatus = mapProviderStatus(payment.status);
	const currentStatus = attempt.status as PaymentStatus;
	const status = shouldApplyStatus(currentStatus, nextStatus)
		? nextStatus
		: currentStatus;
	const completedAt =
		status === "completed" && !attempt.completedAt
			? payment.date_approved
				? new Date(payment.date_approved)
				: new Date()
			: attempt.completedAt;
	const cancelledAt =
		status === "cancelled" && !attempt.cancelledAt
			? new Date()
			: attempt.cancelledAt;

	const updated = await tx.userTransaction.update({
		where: { id: attempt.id },
		data: {
			status,
			completedAt,
			cancelledAt,
			providerPaymentId: payment.id
				? String(payment.id)
				: attempt.providerPaymentId,
			externalTransactionId: payment.id
				? String(payment.id)
				: attempt.externalTransactionId,
			providerStatus: payment.status ?? null,
			providerStatusDetail: payment.status_detail ?? null,
			responseSnapshot: toPrismaInputJson({
				source: "mercadopago.payment.get",
				payment,
			}),
		},
	});

	if (status === "completed") {
		await submitOrderAfterCompletedPayment(tx, {
			...attempt,
			completedAt: updated.completedAt,
		});
	}

	if (status === "refunded") {
		await tx.userOrder.update({
			where: { id: attempt.userOrderId },
			data: { status: "refunded" },
		});
	}

	if (status === "chargedBack") {
		await tx.userOrder.update({
			where: { id: attempt.userOrderId },
			data: { status: "chargedBack" },
		});
	}

	return updated;
}

export async function reconcileMercadoPagoPayment(input: {
	paymentId: string;
	eventId?: number;
}) {
	const paymentClient = new Payment(createMercadoPagoClient());
	const payment = await paymentClient.get({ id: input.paymentId });
	let shouldDispatchDomainEvents = false;

	const result = await db.$transaction(async (tx) => {
		const attempt = await findAttemptForPayment(tx, payment);

		if (!attempt) {
			if (input.eventId) {
				await updatePaymentProviderEventStatus(tx, {
					id: input.eventId,
					status: "failed",
					lastError:
						"No se encontró el intento de pago asociado al recurso de Mercado Pago.",
				});
			}

			throw new TRPCError({
				code: "NOT_FOUND",
				message:
					"No se encontró el intento de pago asociado al recurso de Mercado Pago.",
			});
		}

		const wasCompleted = attempt.status === "completed";
		const updated = await updateAttemptFromPayment(tx, attempt, payment);
		shouldDispatchDomainEvents =
			!wasCompleted && updated.status === "completed";

		if (input.eventId) {
			await updatePaymentProviderEventStatus(tx, {
				id: input.eventId,
				status: "processed",
				userTransactionId: attempt.id,
				lastError: null,
				processedAt: new Date(),
			});
		}

		return findPaymentAttemptById(tx, attempt.id);
	});

	if (shouldDispatchDomainEvents) {
		await DomainEventDispatcher.wake();
	}

	return result;
}

export async function reconcileMercadoPagoAttempt(attemptId: number) {
	const attempt = await db.userTransaction.findUnique({
		where: { id: attemptId },
	});

	if (!attempt) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No se encontró el intento de pago.",
		});
	}

	if (!attempt.providerPaymentId) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "El intento todavía no tiene un payment id de Mercado Pago.",
		});
	}

	return reconcileMercadoPagoPayment({ paymentId: attempt.providerPaymentId });
}

export async function reprocessMercadoPagoEvent(eventId: number) {
	const event = await findPaymentEventById(db, eventId);

	if (!event) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No se encontró el evento de proveedor.",
		});
	}

	if (event.provider !== MERCADOPAGO_PROVIDER) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "El evento no pertenece a Mercado Pago.",
		});
	}

	if (event.providerResourceType !== "payment" || !event.providerResourceId) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Solo se pueden reprocesar eventos de pago con recurso asociado.",
		});
	}

	return reconcileMercadoPagoPayment({
		paymentId: event.providerResourceId,
		eventId,
	});
}
