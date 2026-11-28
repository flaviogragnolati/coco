import "server-only";

import { TRPCError } from "@trpc/server";
import { Payment } from "mercadopago";

import { createMercadoPagoClient } from "~/lib/mercadopago/client";
import type { Prisma } from "~/prisma/client";
import { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import { toPrismaInputJson } from "~/server/services/admin/_base/prisma-json";
import { runSerializable } from "~/server/services/admin/_base/serializable-transaction";
import { enqueueCustomerEmail } from "~/server/services/notifications/customer-email.data";
import {
	findPaymentAttemptById,
	findPaymentEventById,
	updatePaymentProviderEventStatus,
} from "~/server/services/payments/payment.data";
import { submitOrderForCompletedPayment } from "../order-submission.service";
import { MERCADOPAGO_PROVIDER } from "./mercadopago-config.service";
import { parseMercadoPagoExternalReference } from "./mercadopago-preference.decision";
import {
	assessMercadoPagoPaymentAmounts,
	isMercadoPagoAmountFailureCode,
	MERCADOPAGO_AMOUNT_FAILURE_CODES,
	mapMercadoPagoPaymentStatus,
	type PaymentStatus,
	shouldApplyMercadoPagoPaymentStatus,
	shouldSubmitOrderAfterMercadoPagoReconciliation,
} from "./mercadopago-reconciliation.decision";

type AttemptWithOrder = Prisma.UserTransactionGetPayload<{
	include: { userOrder: true };
}>;

function formatReconciliationError(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "Error desconocido al reconciliar el pago de Mercado Pago.";
}

async function findAttemptForPayment(
	tx: Prisma.TransactionClient,
	payment: Awaited<ReturnType<Payment["get"]>>,
) {
	const fromReference = parseMercadoPagoExternalReference(
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
		include: { userOrder: true },
	});
}

async function updateAttemptFromPayment(
	tx: Prisma.TransactionClient,
	attempt: AttemptWithOrder,
	payment: Awaited<ReturnType<Payment["get"]>>,
) {
	const nextStatus = mapMercadoPagoPaymentStatus(payment.status);
	const currentStatus = attempt.status as PaymentStatus;
	const appliedStatus = shouldApplyMercadoPagoPaymentStatus(
		currentStatus,
		nextStatus,
	)
		? nextStatus
		: currentStatus;

	const assessment =
		appliedStatus === "completed"
			? assessMercadoPagoPaymentAmounts({
					expectedAmount: attempt.amount.toString(),
					expectedCurrency: attempt.currency,
					transactionAmount: payment.transaction_amount,
					transactionAmountRefunded: payment.transaction_amount_refunded,
					currencyId: payment.currency_id,
				})
			: null;
	const discrepancy = assessment?.kind === "match" ? null : assessment;

	const status = discrepancy ? currentStatus : appliedStatus;
	const completedAt = discrepancy
		? attempt.completedAt
		: status === "completed" && !attempt.completedAt
			? payment.date_approved
				? new Date(payment.date_approved)
				: new Date()
			: attempt.completedAt;
	const cancelledAt =
		status === "cancelled" && !attempt.cancelledAt
			? new Date()
			: attempt.cancelledAt;
	const healsPreviousDiscrepancy =
		!discrepancy && isMercadoPagoAmountFailureCode(attempt.failureCode);

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
			...(discrepancy
				? {
						failureCode: MERCADOPAGO_AMOUNT_FAILURE_CODES[discrepancy.kind],
						failureMessage: discrepancy.detail,
					}
				: healsPreviousDiscrepancy
					? { failureCode: null, failureMessage: null }
					: {}),
			responseSnapshot: toPrismaInputJson({
				source: "mercadopago.payment.get",
				payment,
			}),
		},
	});

	if (
		shouldSubmitOrderAfterMercadoPagoReconciliation({
			completedAt: attempt.completedAt,
			status,
		})
	) {
		await submitOrderForCompletedPayment(tx, {
			orderId: attempt.userOrderId,
			orderStatus: attempt.userOrder.status,
			cartId: attempt.userOrder.cartId,
			transactionId: attempt.id,
			actor: { source: "system", actorReference: MERCADOPAGO_PROVIDER },
		});
	}

	if (
		payment.status === "rejected" &&
		status === "failed" &&
		currentStatus !== "failed" &&
		attempt.userOrder.status === "pending"
	) {
		await enqueueCustomerEmail(
			tx,
			attempt.userOrderId,
			`rejected/${attempt.id}`,
			{
				kind: "rejected",
				attemptId: attempt.id,
			},
		);
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

	return { updated, discrepancy };
}

export async function reconcileMercadoPagoPayment(input: {
	paymentId: string;
	eventId?: number;
}) {
	let shouldDispatchDomainEvents = false;

	let result: Awaited<ReturnType<typeof findPaymentAttemptById>>;

	try {
		const paymentClient = new Payment(createMercadoPagoClient());
		const payment = await paymentClient.get({ id: input.paymentId });

		result = await runSerializable(db, async (tx) => {
			const attempt = await findAttemptForPayment(tx, payment);

			if (!attempt) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message:
						"No se encontró el intento de pago asociado al recurso de Mercado Pago.",
				});
			}

			const wasCompleted = attempt.status === "completed";
			const { updated, discrepancy } = await updateAttemptFromPayment(
				tx,
				attempt,
				payment,
			);
			shouldDispatchDomainEvents =
				!wasCompleted && updated.status === "completed";

			if (input.eventId) {
				await updatePaymentProviderEventStatus(tx, {
					id: input.eventId,
					status: discrepancy ? "failed" : "processed",
					userTransactionId: attempt.id,
					lastError: discrepancy ? discrepancy.detail : null,
					processedAt: discrepancy ? undefined : new Date(),
				});
			}

			return findPaymentAttemptById(tx, attempt.id);
		});
	} catch (error) {
		if (input.eventId) {
			await updatePaymentProviderEventStatus(db, {
				id: input.eventId,
				status: "failed",
				lastError: formatReconciliationError(error),
			});
		}

		throw error;
	}

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
