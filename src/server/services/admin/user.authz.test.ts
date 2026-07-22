import { describe, expect, test } from "vitest";
import type { UserRole } from "~/shared/common/admin-crud/user.types";
import { AdminCrudError } from "./_base/admin-crud.errors";
import {
	assertCanAssignRole,
	assertCanManageUser,
	assertNotSelf,
} from "./user.authz";

const ROLES: UserRole[] = ["user", "admin", "superadmin"];

function expectConflict(run: () => void) {
	expect(run).toThrow(AdminCrudError);

	try {
		run();
	} catch (error) {
		expect((error as AdminCrudError).code).toBe("CONFLICT");
	}
}

describe("assertCanAssignRole", () => {
	for (const actorRole of ROLES) {
		for (const nextRole of ROLES) {
			const allowed = ROLES.indexOf(nextRole) <= ROLES.indexOf(actorRole);

			test(`${actorRole} assigning ${nextRole} is ${allowed ? "allowed" : "rejected"}`, () => {
				if (allowed) {
					expect(() => assertCanAssignRole(actorRole, nextRole)).not.toThrow();
					return;
				}

				expectConflict(() => assertCanAssignRole(actorRole, nextRole));
			});
		}
	}
});

describe("assertCanManageUser", () => {
	for (const actorRole of ROLES) {
		for (const targetRole of ROLES) {
			const allowed = ROLES.indexOf(targetRole) <= ROLES.indexOf(actorRole);

			test(`${actorRole} managing ${targetRole} is ${allowed ? "allowed" : "rejected"}`, () => {
				if (allowed) {
					expect(() =>
						assertCanManageUser(actorRole, { role: targetRole }),
					).not.toThrow();
					return;
				}

				expectConflict(() =>
					assertCanManageUser(actorRole, { role: targetRole }),
				);
			});
		}
	}
});

describe("assertNotSelf", () => {
	test("rejects acting on yourself", () => {
		expectConflict(() => assertNotSelf("user-1", "user-1"));
	});

	test("allows acting on someone else", () => {
		expect(() => assertNotSelf("user-1", "user-2")).not.toThrow();
	});
});
