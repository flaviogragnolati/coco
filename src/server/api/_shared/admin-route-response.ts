import { NextResponse } from "next/server";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";

const STATUS_BY_CODE = {
	BAD_REQUEST: 400,
	NOT_FOUND: 404,
	CONFLICT: 409,
	RELATION_BLOCKED: 412,
} as const;

export function adminRouteErrorResponse(
	error: unknown,
	fallbackMessage: string,
) {
	if (error instanceof AdminCrudError) {
		return NextResponse.json(
			{ error: error.message },
			{ status: STATUS_BY_CODE[error.code] },
		);
	}

	return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
