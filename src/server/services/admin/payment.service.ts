import { TRPCError } from "@trpc/server";

import {
	paymentAttemptDetailSchema,
	paymentAttemptListOutputSchema,
	paymentEventDetailSchema,
	paymentEventListOutputSchema,
	paymentProviderConfigSchema,
	paymentStatsSchema,
} from "~/schemas/admin/payment.schemas";
import { db } from "~/server/db";
import type {
	PaymentEventIgnoreInput,
	PaymentListInput,
	PaymentProviderConfigUpdateInput,
} from "~/shared/common/admin-crud/payment.types";
import {
	getMercadoPagoConfig,
	upsertMercadoPagoConfig,
} from "../payments/mercadopago/mercadopago-config.service";
import {
	reconcileMercadoPagoAttempt,
	reprocessMercadoPagoEvent,
} from "../payments/mercadopago/mercadopago-reconciliation.service";
import {
	findPaymentAttemptById,
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
