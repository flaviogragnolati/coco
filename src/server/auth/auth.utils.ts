import type { Session } from "~/server/better-auth";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";

export type AuthSession = Session;
export type AuthUser = NonNullable<AuthSession["user"]>;
export type AdminRole = "admin" | "superadmin";

export class InactiveUserError extends Error {
	constructor() {
		super("El usuario no está activo");
		this.name = "InactiveUserError";
	}
}

export function isAdminRole(role: unknown): role is AdminRole {
	return role === "admin" || role === "superadmin";
}

export function assertActiveUser(
	user: Pick<AuthUser, "active" | "deleted">,
): asserts user is Pick<AuthUser, "active" | "deleted"> & {
	active: true;
	deleted: false;
} {
	if (user.active !== true || user.deleted !== false) {
		throw new InactiveUserError();
	}
}

export function toAdminActor(
	user: Pick<AuthUser, "id" | "name">,
): AdminMutationActor {
	return {
		id: user.id,
		name: user.name ?? undefined,
	};
}
