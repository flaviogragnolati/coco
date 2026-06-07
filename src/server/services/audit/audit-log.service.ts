import "server-only";

import type { DomainActor } from "~/shared/common/domain-events.types";
import type { Prisma } from "../../../../generated/prisma/client";
import { toPrismaInputJson } from "../admin/_base/prisma-json";

type AuditLogWriteInput = {
	action: string;
	actor?: DomainActor;
	source?: "user" | "admin" | "system" | "supplier" | "carrier";
	entityType?: string;
	entityId?: string;
	before?: unknown;
	after?: unknown;
	metadata?: unknown;
	ipAddress?: string;
	userAgent?: string;
};

function actorUserId(actor: DomainActor | undefined) {
	if (!actor) return undefined;
	if (actor.source !== "user" && actor.source !== "admin") return undefined;
	return actor.actorId;
}

export class AuditLogService {
	static async write(
		db: Prisma.TransactionClient,
		input: AuditLogWriteInput,
	): Promise<void> {
		await db.auditLog.create({
			data: {
				action: input.action,
				source: input.source ?? input.actor?.source ?? "system",
				userId: actorUserId(input.actor),
				actorReference:
					input.actor?.actorReference ?? input.actor?.actorId ?? undefined,
				entityType: input.entityType,
				entityId: input.entityId,
				before:
					input.before === undefined
						? undefined
						: toPrismaInputJson(input.before),
				after:
					input.after === undefined
						? undefined
						: toPrismaInputJson(input.after),
				metadata:
					input.metadata === undefined
						? undefined
						: toPrismaInputJson(input.metadata),
				ipAddress: input.ipAddress,
				userAgent: input.userAgent,
			},
		});
	}

	static async writePermanentListenerFailure(
		db: Prisma.TransactionClient,
		input: {
			eventId: string;
			eventKey: string;
			eventType: string;
			listenerName?: string;
			failureReason: string;
			attempts: number;
		},
	): Promise<void> {
		await AuditLogService.write(db, {
			action: "domainEvent.listenerPermanentFailure",
			source: "system",
			entityType: "DomainEventOutbox",
			entityId: input.eventId,
			metadata: {
				domainEventIds: [input.eventId],
				eventKeys: [input.eventKey],
				eventType: input.eventType,
				listenerName: input.listenerName,
				failureReason: input.failureReason,
				attempts: input.attempts,
			},
		});
	}
}
