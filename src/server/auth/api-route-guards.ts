import "server-only";

import { NextResponse } from "next/server";
import {
	assertActiveUser,
	isAdminRole,
	toAdminActor,
} from "~/server/auth/auth.utils";
import { auth } from "~/server/better-auth";

export async function requireAdminApi(request: Request) {
	if (request.method !== "GET" && request.method !== "HEAD") {
		const origin = request.headers.get("origin");
		let originAllowed = !origin;
		try {
			originAllowed =
				!origin || new URL(origin).origin === new URL(request.url).origin;
		} catch {
			originAllowed = false;
		}
		if (!originAllowed) {
			return {
				ok: false as const,
				response: NextResponse.json(
					{ error: "Origen de solicitud no permitido" },
					{ status: 403 },
				),
			};
		}
	}

	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return {
			ok: false as const,
			response: NextResponse.json(
				{ error: "Se requiere iniciar sesión" },
				{ status: 401 },
			),
		};
	}

	try {
		assertActiveUser(session.user);
	} catch {
		return {
			ok: false as const,
			response: NextResponse.json(
				{ error: "El usuario no está activo" },
				{ status: 403 },
			),
		};
	}

	if (!isAdminRole(session.user.role)) {
		return {
			ok: false as const,
			response: NextResponse.json(
				{ error: "No tenés permisos de administración" },
				{ status: 403 },
			),
		};
	}

	return {
		ok: true as const,
		session,
		actor: toAdminActor(session.user),
	};
}
