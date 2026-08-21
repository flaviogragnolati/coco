import { NextResponse } from "next/server";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";

const STATUS_BY_CODE = {
	BAD_REQUEST: 400,
	NOT_FOUND: 404,
	CONFLICT: 409,
	RELATION_BLOCKED: 412,
} as const;

export function adminRouteErrorResponse(error: unknown) {
	if (error instanceof AdminCrudError) {
		return NextResponse.json(
			{ error: error.message },
			{ status: STATUS_BY_CODE[error.code] },
		);
	}

	return NextResponse.json(
		{ error: "No se pudo procesar la evidencia de QA" },
		{ status: 500 },
	);
}
