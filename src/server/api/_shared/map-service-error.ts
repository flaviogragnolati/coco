import { TRPCError } from "@trpc/server";

import type { AdminCrudErrorCode } from "~/server/services/admin/_base/admin-crud.errors";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";

// Exhaustive on purpose: a new AdminCrudErrorCode must become a compile error
// rather than silently collapsing into CONFLICT.
const TRPC_CODE_BY_SERVICE_CODE: Record<AdminCrudErrorCode, TRPCError["code"]> =
	{
		NOT_FOUND: "NOT_FOUND",
		CONFLICT: "CONFLICT",
		RELATION_BLOCKED: "PRECONDITION_FAILED",
	};

export function mapServiceError(error: unknown): never {
	if (error instanceof AdminCrudError) {
		throw new TRPCError({
			code: TRPC_CODE_BY_SERVICE_CODE[error.code],
			message: error.message,
			cause: error,
		});
	}

	throw error;
}
