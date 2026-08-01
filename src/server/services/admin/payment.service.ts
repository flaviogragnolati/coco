import { TRPCError } from "@trpc/server";

import type { Prisma } from "~/prisma/client";
import {
	externalPaymentConfigSchema,
	paymentAttemptDetailSchema,
	paymentAttemptListOutputSchema,
	paymentEventDetailSchema,
	paymentEventListOutputSchema,
	paymentProviderConfigSchema,
	paymentStatsSchema,
} from "~/schemas/admin/payment.schemas";
import { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import type {
	ExternalPaymentConfigUpdateInput,
	PaymentAttemptRejectInput,
	PaymentAttemptSettleInput,
	PaymentEventIgnoreInput,
	PaymentListInput,
	PaymentProviderConfigUpdateInput,
} from "~/shared/common/admin-crud/payment.types";
import {
	rejectExternalTransaction,
	settleExternalTransaction,
	updateOrderStatus,
} from "../checkout/checkout.data";
import {
	EXTERNAL_PROVIDER,
	getExternalPaymentConfig,
	upsertExternalPaymentConfig,
} from "../payments/external/external-payment-config.service";
import {
	getMercadoPagoConfig,
	upsertMercadoPagoConfig,
} from "../payments/mercadopago/mercadopago-config.service";
import {
	reconcileMercadoPagoAttempt,
	reprocessMercadoPagoEvent,
} from "../payments/mercadopago/mercadopago-reconciliation.service";
import { submitOrderForCompletedPayment } from "../payments/order-submission.service";
import {
	findPaymentAttemptById,
	findPaymentAttemptWithCartById,
	findPaymentEventById,
	getPaymentStats,
	listPaymentAttempts,
	listPaymentEvents,
	updatePaymentProviderEventStatus,
} from "../payments/payment.data";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";

type AdminDb = typeof db;

export async function listAttempts(input: PaymentListInput, database: AdminDb) {
	return paymentAttemptListOutputSchema.parse(
		await listPaymentAttempts(database, input),
	);
}

export async function getAttemptById(id: number, database: AdminDb) {
	const attempt = await findPaymentAttemptById(database, id);
	if (!attempt) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No se encontró el intento de pago.",
		});
	}
	return paymentAttemptDetailSchema.parse({
		...attempt,
		events: attempt.paymentProviderEvents,
	});
}

export async function getAttemptStats(database: AdminDb) {
	return paymentStatsSchema.parse(await getPaymentStats(database));
}

export async function listEvents(input: PaymentListInput, database: AdminDb) {
	return paymentEventListOutputSchema.parse(
		await listPaymentEvents(database, input),
	);
}

export async function getEventById(id: number, database: AdminDb) {
	const event = await findPaymentEventById(database, id);
	if (!event) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No se encontró el evento de proveedor.",
		});
	}
	return paymentEventDetailSchema.parse(event);
}

export async function getProviderConfig(database: AdminDb) {
	return paymentProviderConfigSchema.parse(
		await getMercadoPagoConfig(database),
	);
}

export async function updateProviderConfig(
	input: PaymentProviderConfigUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	if (input.confirmation !== "CONFIRMAR") {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: 'Escribí "CONFIRMAR" para aplicar cambios de configuración.',
		});
	}

	return database.$transaction(async (tx) => {
		const before = await getMercadoPagoConfig(tx);
		const after = await upsertMercadoPagoConfig(tx, input);

		await writeAdminAuditLog(tx, {
			action: "paymentProviderConfig.update",
			actor,
			entityType: "paymentProviderConfig",
			entityId: "mercadopago",
			before,
			after,
		});

		return paymentProviderConfigSchema.parse(after);
	});
}

/**
 * An external payment is settled by hand, so the guard is the only thing
 * standing between a double click and a second submission: only a `pending`
 * attempt of the external provider can be settled or rejected (ADR 0010).
 */
async function readSettleableExternalAttempt(
	tx: Prisma.TransactionClient,
	id: number,
) {
	const attempt = await findPaymentAttemptWithCartById(tx, id);

	if (!attempt) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No se encontró el intento de pago.",
		});
	}

	if (attempt.provider !== EXTERNAL_PROVIDER) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "El intento no corresponde a un pago externo.",
		});
	}

	if (attempt.status !== "pending") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Solo se puede accionar sobre un intento pendiente.",
		});
	}

	return attempt;
}

async function readAttemptDetail(tx: Prisma.TransactionClient, id: number) {
	const attempt = await findPaymentAttemptById(tx, id);

	if (!attempt) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No se encontró el intento de pago.",
		});
	}

	return { ...attempt, events: attempt.paymentProviderEvents };
}

export async function settleExternalAttempt(
	input: PaymentAttemptSettleInput,
	actor: AdminMutationActor,
) {
	const settled = await db.$transaction(async (tx) => {
		const attempt = await readSettleableExternalAttempt(tx, input.id);
		const before = await readAttemptDetail(tx, input.id);

		await settleExternalTransaction(tx, {
			id: attempt.id,
			receiptReference: input.receiptReference,
			responseSnapshot: {
				source: "admin",
				action: "settle",
				actorId: actor.id,
				actorName: actor.name ?? null,
				receiptReference: input.receiptReference,
				note: input.note,
				at: new Date().toISOString(),
			},
		});

		await submitOrderForCompletedPayment(tx, {
			orderId: attempt.userOrder.id,
			cartId: attempt.userOrder.cartId,
			transactionId: attempt.id,
			actor: { source: "admin", actorId: actor.id },
		});

		const after = await readAttemptDetail(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "paymentAttempt.settleExternal",
			actor,
			entityType: "userTransaction",
			entityId: String(input.id),
			before,
			after,
			metadata: {
				receiptReference: input.receiptReference,
				note: input.note,
			},
		});

		return after;
	});

	// The dispatcher only ever wakes after the commit: waking inside the
	// transaction would hand out events that a rollback leaves phantom.
	await DomainEventDispatcher.wake();

	return paymentAttemptDetailSchema.parse(settled);
}

export async function rejectExternalAttempt(
	input: PaymentAttemptRejectInput,
	actor: AdminMutationActor,
) {
	return db.$transaction(async (tx) => {
		const attempt = await readSettleableExternalAttempt(tx, input.id);
		const before = await readAttemptDetail(tx, input.id);

		await rejectExternalTransaction(tx, {
			id: attempt.id,
			reason: input.reason,
		});
		await updateOrderStatus(tx, attempt.userOrder.id, "failed");

		const after = await readAttemptDetail(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "paymentAttempt.rejectExternal",
			actor,
			entityType: "userTransaction",
			entityId: String(input.id),
			before,
			after,
			metadata: { reason: input.reason },
		});

		return paymentAttemptDetailSchema.parse(after);
	});
}

export async function getExternalConfig(database: AdminDb) {
	return externalPaymentConfigSchema.parse(
		await getExternalPaymentConfig(database),
	);
}

export async function updateExternalConfig(
	input: ExternalPaymentConfigUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const before = await getExternalPaymentConfig(tx);
		const after = await upsertExternalPaymentConfig(tx, input);

		await writeAdminAuditLog(tx, {
			action: "paymentProviderConfig.update",
			actor,
			entityType: "paymentProviderConfig",
			entityId: EXTERNAL_PROVIDER,
			before,
			after,
		});

		return externalPaymentConfigSchema.parse(after);
	});
}

export async function reconcileAttempt(id: number, actor: AdminMutationActor) {
	const result = await reconcileMercadoPagoAttempt(id);

	await db.auditLog.create({
		data: {
			action: "paymentAttempt.reconcile",
			source: "admin",
			actorReference: actor.id,
			entityType: "userTransaction",
			entityId: String(id),
			metadata: { actorName: actor.name },
		},
	});

	return paymentAttemptDetailSchema.parse(
		result ? { ...result, events: result.paymentProviderEvents } : result,
	);
}

export async function reprocessEvent(id: number, actor: AdminMutationActor) {
	const result = await reprocessMercadoPagoEvent(id);

	await db.auditLog.create({
		data: {
			action: "paymentProviderEvent.reprocess",
			source: "admin",
			actorReference: actor.id,
			entityType: "paymentProviderEvent",
			entityId: String(id),
			metadata: { actorName: actor.name },
		},
	});

	return paymentAttemptDetailSchema.parse(
		result ? { ...result, events: result.paymentProviderEvents } : result,
	);
}

export async function ignoreEvent(
	input: PaymentEventIgnoreInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const before = await findPaymentEventById(tx, input.id);
		if (!before) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "No se encontró el evento de proveedor.",
			});
		}

		const after = await updatePaymentProviderEventStatus(tx, {
			id: input.id,
			status: "ignored",
			lastError: input.reason,
			ignoredAt: new Date(),
		});

		await writeAdminAuditLog(tx, {
			action: "paymentProviderEvent.ignore",
			actor,
			entityType: "paymentProviderEvent",
			entityId: String(input.id),
			before,
			after,
			metadata: { reason: input.reason },
		});

		return paymentEventDetailSchema.parse(after);
	});
}
