import type { UserRole } from "~/shared/common/admin-crud/user.types";
import { AdminCrudError } from "./_base/admin-crud.errors";

export const USER_ROLE_RANK: Record<UserRole, number> = {
	user: 0,
	admin: 1,
	superadmin: 2,
};

export function assertCanAssignRole(actorRole: UserRole, nextRole: UserRole) {
	if (USER_ROLE_RANK[nextRole] > USER_ROLE_RANK[actorRole]) {
		throw new AdminCrudError(
			"CONFLICT",
			"No podés asignar un rol superior al tuyo",
		);
	}
}

export function assertCanManageUser(
	actorRole: UserRole,
	target: { role: UserRole },
) {
	if (USER_ROLE_RANK[target.role] > USER_ROLE_RANK[actorRole]) {
		throw new AdminCrudError(
			"CONFLICT",
			"No podés modificar un usuario con un rol superior al tuyo",
		);
	}
}

export function assertNotSelf(actorId: string, targetId: string) {
	if (actorId === targetId) {
		throw new AdminCrudError("CONFLICT", "No podés eliminarte a vos mismo");
	}
}
