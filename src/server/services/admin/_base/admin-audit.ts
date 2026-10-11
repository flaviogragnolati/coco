import type { Prisma } from "~/prisma/client";
import type { UserRole } from "~/shared/common/admin-crud/user.types";

import { toPrismaInputJson } from "./prisma-json";

export type AdminMutationActor = {
	id: string;
	name?: string;
	role: UserRole;
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

function toAuditLogData(input: AuditLogInput) {
	return {
		action: input.action,
		source: "admin" as const,
		actorReference: input.actor.id,
		entityType: input.entityType,
		entityId: input.entityId,
		before:
			input.before === undefined ? undefined : toPrismaInputJson(input.before),
		after:
			input.after === undefined ? undefined : toPrismaInputJson(input.after),
		metadata:
			input.metadata === undefined
				? undefined
				: toPrismaInputJson({
						actorName: input.actor.name,
						...((input.metadata ?? {}) as Record<string, unknown>),
					}),
	} satisfies Prisma.AuditLogUncheckedCreateInput;
}

export async function writeAdminAuditLog(
	db: Prisma.TransactionClient,
	input: AuditLogInput,
) {
	await db.auditLog.create({ data: toAuditLogData(input) });
}

/** One row per input, in a single insert. */
export async function writeAdminAuditLogs(
	db: Prisma.TransactionClient,
	inputs: AuditLogInput[],
) {
	if (inputs.length === 0) return;
	await db.auditLog.createMany({ data: inputs.map(toAuditLogData) });
}
