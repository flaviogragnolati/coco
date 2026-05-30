import type { Prisma } from "../../../../../generated/prisma/client";

import { toPrismaInputJson } from "./prisma-json";

export type AdminMutationActor = {
	id: string;
	name?: string;
};

type AuditLogInput = {
	action: string;
	actor: AdminMutationActor;
	entityType: string;
	entityId: string;
	before?: unknown;
	after?: unknown;
	metadata?: unknown;
};

export async function writeAdminAuditLog(
	db: Prisma.TransactionClient,
	input: AuditLogInput,
) {
	await db.auditLog.create({
		data: {
			action: input.action,
			source: "admin",
			actorReference: input.actor.id,
			entityType: input.entityType,
			entityId: input.entityId,
			before:
				input.before === undefined ? undefined : toPrismaInputJson(input.before),
			after: input.after === undefined ? undefined : toPrismaInputJson(input.after),
			metadata:
				input.metadata === undefined
					? undefined
					: toPrismaInputJson({
							actorName: input.actor.name,
							...((input.metadata ?? {}) as Record<string, unknown>),
						}),
		},
	});
}
