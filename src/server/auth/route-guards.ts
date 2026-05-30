import "server-only";

import { redirect } from "next/navigation";
import {
	type AuthSession,
	type AuthUser,
	assertActiveUser,
	isAdminRole,
} from "~/server/auth/auth.utils";
import { getSession } from "~/server/better-auth/server";

export type AuthenticatedSession = AuthSession & {
	user: AuthUser;
};

export async function requireUser(): Promise<AuthenticatedSession> {
	const session = await getSession();

	if (!session?.user) {
		redirect("/login");
	}

	try {
		assertActiveUser(session.user);
	} catch {
		redirect("/?auth=inactive");
	}

	return {
		...session,
		user: session.user,
	};
}

export async function requireAdmin(): Promise<AuthenticatedSession> {
	const session = await requireUser();

	if (!isAdminRole(session.user.role)) {
		redirect("/");
	}

	return session;
}
