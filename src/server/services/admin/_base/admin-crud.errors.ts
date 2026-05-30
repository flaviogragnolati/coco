export type AdminCrudErrorCode =
	| "NOT_FOUND"
	| "CONFLICT"
	| "RELATION_BLOCKED";

export class AdminCrudError extends Error {
	readonly code: AdminCrudErrorCode;

	constructor(code: AdminCrudErrorCode, message: string) {
		super(message);
		this.name = "AdminCrudError";
		this.code = code;
	}
}

export function throwNotFound(entityLabel: string): never {
	throw new AdminCrudError("NOT_FOUND", `${entityLabel} no encontrado`);
}
