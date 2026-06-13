import "server-only";

import type { Prisma } from "~/prisma/client";
import type { db as prismaDb } from "~/server/db";
import { toPrismaInputJson } from "~/server/services/admin/_base/prisma-json";
import type { PaymentListInput } from "~/shared/common/admin-crud/payment.types";

export type PaymentDbClient = typeof prismaDb | Prisma.TransactionClient;

const paymentMethodBriefSelect = {
	id: true,
	type: true,
	label: true,
	provider: true,
} satisfies Prisma.PaymentMethodSelect;

const userBriefSelect = {
	id: true,
	name: true,
	email: true,
} satisfies Prisma.UserSelect;

const userOrderBriefSelect = {
	id: true,
	code: true,
	status: true,
	user: {
		select: userBriefSelect,
	},
} satisfies Prisma.UserOrderSelect;

export const paymentAttemptListSelect = {
	id: true,
	amount: true,
	currency: true,
	status: true,
	provider: true,
	providerMode: true,
	providerPreferenceId: true,
	providerPaymentId: true,
	providerStatus: true,
	providerStatusDetail: true,
	checkoutUrl: true,
	sandboxCheckoutUrl: true,
	expiresAt: true,
	completedAt: true,
	cancelledAt: true,
	createdAt: true,
	updatedAt: true,
	userOrder: {
		select: userOrderBriefSelect,
	},
	paymentMethod: {
		select: paymentMethodBriefSelect,
	},
	_count: {
		select: {
			paymentProviderEvents: true,
		},
	},
} satisfies Prisma.UserTransactionSelect;

export const paymentAttemptDetailSelect = {
	...paymentAttemptListSelect,
	idempotencyKey: true,
	externalTransactionId: true,
	providerMerchantOrderId: true,
	providerOrderId: true,
	failureCode: true,
	failureMessage: true,
	requestSnapshot: true,
	responseSnapshot: true,
	paymentProviderEvents: {
		orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			eventType: true,
			action: true,
			providerResourceType: true,
			providerResourceId: true,
			providerRequestId: true,
			signatureValid: true,
			status: true,
			lastError: true,
			receivedAt: true,
			processedAt: true,
			ignoredAt: true,
		},
	},
} satisfies Prisma.UserTransactionSelect;

export const paymentEventListSelect = {
	id: true,
	provider: true,
	providerMode: true,
	eventType: true,
	action: true,
	providerEventId: true,
	providerResourceType: true,
	providerResourceId: true,
	providerRequestId: true,
	signatureValid: true,
	status: true,
	retryCount: true,
	lastError: true,
	receivedAt: true,
	processedAt: true,
	ignoredAt: true,
	userTransaction: {
		select: {
			id: true,
			status: true,
			userOrder: {
				select: userOrderBriefSelect,
			},
		},
	},
} satisfies Prisma.PaymentProviderEventSelect;

export const paymentEventDetailSelect = {
	...paymentEventListSelect,
	payload: true,
	headers: true,
	query: true,
} satisfies Prisma.PaymentProviderEventSelect;

export type PaymentAttemptListRecord = Prisma.UserTransactionGetPayload<{
	select: typeof paymentAttemptListSelect;
}>;

export type PaymentAttemptDetailRecord = Prisma.UserTransactionGetPayload<{
	select: typeof paymentAttemptDetailSelect;
}>;

export type PaymentEventListRecord = Prisma.PaymentProviderEventGetPayload<{
	select: typeof paymentEventListSelect;
}>;

export type PaymentEventDetailRecord = Prisma.PaymentProviderEventGetPayload<{
	select: typeof paymentEventDetailSelect;
}>;

function buildSearchWhere(
	input: PaymentListInput,
): Prisma.UserTransactionWhereInput {
	const terms = input.search?.trim();

	return {
		provider: input.provider,
		status: input.status,
		...(terms
			? {
					OR: [
						{ providerPreferenceId: { contains: terms, mode: "insensitive" } },
						{ providerPaymentId: { contains: terms, mode: "insensitive" } },
						{ providerStatus: { contains: terms, mode: "insensitive" } },
						{ userOrder: { code: { contains: terms, mode: "insensitive" } } },
						{
							userOrder: {
								user: { email: { contains: terms, mode: "insensitive" } },
							},
						},
					],
				}
			: {}),
	};
}

function buildEventWhere(
	input: PaymentListInput,
): Prisma.PaymentProviderEventWhereInput {
	const terms = input.search?.trim();

	return {
		provider: input.provider,
		status: input.eventStatus,
		...(terms
			? {
					OR: [
						{ providerEventId: { contains: terms, mode: "insensitive" } },
						{ providerResourceId: { contains: terms, mode: "insensitive" } },
						{ providerRequestId: { contains: terms, mode: "insensitive" } },
						{ eventType: { contains: terms, mode: "insensitive" } },
						{ action: { contains: terms, mode: "insensitive" } },
					],
				}
			: {}),
	};
}

export async function listPaymentAttempts(
	db: PaymentDbClient,
	input: PaymentListInput,
) {
	return db.userTransaction.findMany({
		where: buildSearchWhere(input),
		select: paymentAttemptListSelect,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: 100,
	});
}

export async function findPaymentAttemptById(db: PaymentDbClient, id: number) {
	return db.userTransaction.findUnique({
		where: { id },
		select: paymentAttemptDetailSelect,
	});
}

export async function listPaymentEvents(
	db: PaymentDbClient,
	input: PaymentListInput,
) {
	return db.paymentProviderEvent.findMany({
		where: buildEventWhere(input),
		select: paymentEventListSelect,
		orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
		take: 100,
	});
}

export async function findPaymentEventById(db: PaymentDbClient, id: number) {
	return db.paymentProviderEvent.findUnique({
		where: { id },
		select: paymentEventDetailSelect,
	});
}

export async function getPaymentStats(db: PaymentDbClient) {
	const [
		totalAttempts,
		pendingAttempts,
		completedAttempts,
		failedAttempts,
		receivedEvents,
		failedEvents,
	] = await Promise.all([
		db.userTransaction.count({ where: { provider: "mercadopago" } }),
		db.userTransaction.count({
			where: {
				provider: "mercadopago",
				status: { in: ["pending", "inProcess"] },
			},
		}),
		db.userTransaction.count({
			where: { provider: "mercadopago", status: "completed" },
		}),
		db.userTransaction.count({
			where: {
				provider: "mercadopago",
				status: { in: ["failed", "cancelled", "chargedBack"] },
			},
		}),
		db.paymentProviderEvent.count({ where: { provider: "mercadopago" } }),
		db.paymentProviderEvent.count({
			where: { provider: "mercadopago", status: "failed" },
		}),
	]);

	return {
		totalAttempts,
		pendingAttempts,
		completedAttempts,
		failedAttempts,
		receivedEvents,
		failedEvents,
	};
}

export async function createPaymentProviderEvent(
	db: PaymentDbClient,
	input: {
		provider: string;
		providerMode: "sandbox" | "production" | null;
		eventType: string | null;
		action: string | null;
		providerEventId: string | null;
		providerResourceType: string | null;
		providerResourceId: string | null;
		providerRequestId: string | null;
		signatureValid: boolean;
		status: "received" | "processed" | "failed" | "ignored" | "rejected";
		lastError?: string | null;
		payload: unknown;
		headers: unknown;
		query: unknown;
		userTransactionId?: number | null;
		userId?: string | null;
	},
) {
	const data = {
		provider: input.provider,
		providerMode: input.providerMode,
		eventType: input.eventType,
		action: input.action,
		providerEventId: input.providerEventId,
		providerResourceType: input.providerResourceType,
		providerResourceId: input.providerResourceId,
		providerRequestId: input.providerRequestId,
		signatureValid: input.signatureValid,
		status: input.status,
		lastError: input.lastError,
		payload: toPrismaInputJson(input.payload),
		headers: toPrismaInputJson(input.headers),
		query: toPrismaInputJson(input.query),
		userTransactionId: input.userTransactionId ?? undefined,
		userId: input.userId ?? undefined,
	};

	if (input.providerEventId) {
		return db.paymentProviderEvent.upsert({
			where: {
				provider_providerEventId: {
					provider: input.provider,
					providerEventId: input.providerEventId,
				},
			},
			create: data,
			update: {
				retryCount: { increment: 1 },
				lastError: input.lastError,
				headers: toPrismaInputJson(input.headers),
				query: toPrismaInputJson(input.query),
				payload: toPrismaInputJson(input.payload),
			},
			select: paymentEventDetailSelect,
		});
	}

	return db.paymentProviderEvent.create({
		data,
		select: paymentEventDetailSelect,
	});
}

export async function updatePaymentProviderEventStatus(
	db: PaymentDbClient,
	input: {
		id: number;
		status: "received" | "processed" | "failed" | "ignored" | "rejected";
		lastError?: string | null;
		userTransactionId?: number | null;
		processedAt?: Date | null;
		ignoredAt?: Date | null;
	},
) {
	return db.paymentProviderEvent.update({
		where: { id: input.id },
		data: {
			status: input.status,
			lastError: input.lastError,
			userTransactionId: input.userTransactionId,
			processedAt: input.processedAt,
			ignoredAt: input.ignoredAt,
		},
		select: paymentEventDetailSelect,
	});
}
