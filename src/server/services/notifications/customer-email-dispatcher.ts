import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { CustomerEmailStatus, Prisma } from "~/prisma/client";
import { db } from "~/server/db";
import { appLogger } from "~/server/services/logging/app-logger.service";
import { buildEmailRequest } from "./customer-email.templates";
import { emailProviderSchema, getEmailConfig } from "./email-config";
import { emailRequestSchema } from "./email-transport";
import { sendGmail } from "./gmail-email.service";
import { sendCustomerEmail } from "./resend-email.service";

const MINUTE = 60_000;
const BATCH_SIZE = 25;
// Resend forgets idempotency keys after 24 hours. Leave room for network and clock skew.
const RETRY_WINDOW = (24 * 60 - 5) * MINUTE;
const RATE_LIMITED = "resend_http_429";

function knownUnsent(reason: string | null) {
	return (
		reason === RATE_LIMITED ||
		reason === "gmail_temporary_rejection" ||
		reason === "gmail_connection_before_send"
	);
}

const storedRequestSchema = emailRequestSchema.extend({
	provider: emailProviderSchema.default("resend"),
	quantityKey: z.string().optional(),
	revision: z.number().int().nonnegative().default(0),
});
const releaseLease = { leaseToken: null, leaseUntil: null };

type EmailConfig = NonNullable<ReturnType<typeof getEmailConfig>>;

function due(
	environment: string,
	now: Date,
): Prisma.CustomerEmailDeliveryWhereInput {
	return {
		environment,
		OR: [
			{ status: "pending", nextAttemptAt: { lte: now } },
			{ status: "processing", leaseUntil: { lte: now } },
		],
	};
}

async function closeBeforeSend(
	tx: Prisma.TransactionClient,
	id: string,
	status: "review" | "skipped",
	lastError: string,
) {
	await tx.customerEmailDelivery.update({
		where: { id },
		data: { status, lastError, ...releaseLease },
	});
	return { status };
}

async function prepare(
	tx: Prisma.TransactionClient,
	id: string,
	priorStatus: CustomerEmailStatus,
	config: EmailConfig,
) {
	const now = new Date();
	const leaseToken = randomUUID();
	const claim = await tx.customerEmailDelivery.updateMany({
		where: { id, status: priorStatus, ...due(config.environment, now) },
		data: {
			status: "processing",
			leaseToken,
			leaseUntil: new Date(now.getTime() + 2 * MINUTE),
		},
	});
	if (!claim.count) return { status: "busy" } as const;

	const row = await tx.customerEmailDelivery.findUniqueOrThrow({
		where: { id },
	});
	const priorSendUncertain =
		row.firstAttemptAt !== null &&
		(priorStatus === "processing" || !knownUnsent(row.lastError));

	try {
		const current = await buildEmailRequest(
			tx,
			row.orderId,
			row.notice,
			config,
		);
		const frozen =
			row.request === null ? null : storedRequestSchema.parse(row.request);
		if (frozen && frozen.provider !== config.provider) {
			return closeBeforeSend(tx, id, "review", "email_provider_changed");
		}
		// SMTP has no idempotency key. An expired lease can hide an accepted send.
		if (config.provider === "gmail" && priorSendUncertain) {
			return closeBeforeSend(tx, id, "review", "gmail_unknown_result");
		}
		if (
			config.provider === "gmail" &&
			frozen &&
			current &&
			frozen.from !== current.from
		) {
			return closeBeforeSend(tx, id, "review", "sender_changed");
		}
		if (!current || (frozen && frozen.to !== current.to)) {
			return closeBeforeSend(
				tx,
				id,
				priorSendUncertain ? "review" : "skipped",
				current ? "recipient_changed" : "notice_obsolete",
			);
		}
		const changed =
			frozen !== null && frozen.quantityKey !== current.quantityKey;
		if (changed && priorSendUncertain) {
			return closeBeforeSend(tx, id, "review", "quantities_changed");
		}
		const windowExpired =
			row.firstAttemptAt !== null &&
			now.getTime() - row.firstAttemptAt.getTime() >= RETRY_WINDOW;
		if (windowExpired && priorSendUncertain) {
			return closeBeforeSend(tx, id, "review", "idempotency_window");
		}
		// Confirmed non-acceptance allows a fresh key after the retry window.
		const rotateKey = changed || windowExpired;
		const revision = (frozen?.revision ?? 0) + (rotateKey ? 1 : 0);
		const firstAttemptAt = rotateKey ? now : (row.firstAttemptAt ?? now);
		// Resend requires the original body for a retry, including after a template change.
		const request = emailRequestSchema.parse(
			frozen && !changed ? frozen : current,
		);
		await tx.customerEmailDelivery.update({
			where: { id },
			data: {
				firstAttemptAt,
				request: {
					...request,
					provider: config.provider,
					revision,
					...(current.quantityKey ? { quantityKey: current.quantityKey } : {}),
				},
				attempts: { increment: 1 },
				lastError: null,
			},
		});
		return {
			status: "ready",
			body: request,
			requestId: revision ? `${id}/${revision}` : id,
			priorSendUncertain,
			leaseToken,
			attempts: row.attempts + 1,
			firstAttemptAt,
		} as const;
	} catch (error) {
		if (!(error instanceof z.ZodError)) throw error;
		return closeBeforeSend(tx, id, "review", "invalid_notice");
	}
}

async function dispatchOne(
	id: string,
	priorStatus: CustomerEmailStatus,
	config: EmailConfig,
	credential: string,
) {
	const item = await db.$transaction((tx) =>
		prepare(tx, id, priorStatus, config),
	);
	if (item.status !== "ready") return item.status;

	const result =
		Date.now() >= item.firstAttemptAt.getTime() + RETRY_WINDOW
			? { status: "review" as const, reason: "idempotency_window" }
			: config.provider === "gmail"
				? await sendGmail(config.from, credential, item.requestId, item.body)
				: await sendCustomerEmail(credential, item.requestId, item.body);
	let update: Prisma.CustomerEmailDeliveryUpdateManyMutationInput;
	if (result.status === "accepted") {
		update = { status: "accepted", providerId: result.providerId };
	} else if (result.status === "review") {
		update = { status: "review", lastError: result.reason };
	} else {
		const backoff = Math.min(60, 2 ** Math.min(6, item.attempts - 1)) * MINUTE;
		const next = Date.now() + Math.max(backoff, result.retryAfterMs ?? 0);
		const uncertain = item.priorSendUncertain || !knownUnsent(result.reason);
		update =
			uncertain && next >= item.firstAttemptAt.getTime() + RETRY_WINDOW
				? { status: "review", lastError: "idempotency_window" }
				: {
						status: "pending",
						// A later throttle cannot resolve an older timeout or lost lease.
						lastError:
							item.priorSendUncertain && result.reason === RATE_LIMITED
								? "rate_limited_after_unknown_result"
								: result.reason,
						nextAttemptAt: new Date(next),
					};
	}
	const saved = await db.customerEmailDelivery.updateMany({
		where: { id, status: "processing", leaseToken: item.leaseToken },
		data: { ...update, ...releaseLease },
	});
	if (!saved.count) return "busy";
	if (result.status === "accepted") {
		appLogger.info("customerEmailAccepted", {
			id,
			providerId: result.providerId,
		});
	}
	return String(update.status);
}

export async function dispatchCustomerEmails() {
	const config = getEmailConfig();
	if (!config?.dispatch) return { enabled: false, processed: 0 };
	if (!config.credential) throw new Error("Missing email provider credential");
	const deadline = Date.now() + 45_000;
	let processed = 0;
	while (Date.now() < deadline) {
		const rows = await db.customerEmailDelivery.findMany({
			where: due(config.environment, new Date()),
			select: { id: true, status: true, eventKey: true, createdAt: true },
			orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
			take: BATCH_SIZE,
		});
		const before = processed;
		for (const row of rows) {
			if (Date.now() >= deadline) break;
			const status = await dispatchOne(
				row.id,
				row.status,
				config,
				config.credential,
			);
			if (status === "busy") continue;
			processed++;
			appLogger.info("customerEmailDispatch", {
				id: row.id,
				eventKey: row.eventKey,
				status,
				ageMs: Date.now() - row.createdAt.getTime(),
			});
		}
		if (rows.length < BATCH_SIZE || processed === before) break;
	}
	return { enabled: true, processed };
}
