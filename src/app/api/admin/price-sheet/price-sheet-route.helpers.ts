import { NextResponse } from "next/server";
import { adminRouteErrorResponse } from "~/server/api/_shared/admin-route-response";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import { PRICE_SHEET_MAX_BYTES } from "~/server/services/admin/price-sheet.file";
import type { PriceSheetUpload } from "~/server/services/admin/price-sheet.service";
import { appLogger } from "~/server/services/logging/app-logger.service";

// Room for the multipart envelope and the expected-changes field.
const MAX_REQUEST_BYTES = PRICE_SHEET_MAX_BYTES + 1024 * 1024;

type UploadResult =
	| { ok: true; file: PriceSheetUpload; formData: FormData }
	| { ok: false; response: Response };

function badRequest(error: string, status = 400): UploadResult {
	return { ok: false, response: NextResponse.json({ error }, { status }) };
}

export async function readPriceSheetUpload(
	request: Request,
): Promise<UploadResult> {
	const declaredLength = Number(request.headers.get("content-length"));
	if (declaredLength > MAX_REQUEST_BYTES) {
		return badRequest("El archivo supera el máximo de 2 MB.", 413);
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return badRequest("Se esperaba multipart/form-data");
	}

	const files = formData.getAll("file");
	const [file] = files;
	if (files.length !== 1 || !(file instanceof File)) {
		return badRequest("Enviá exactamente una planilla por solicitud");
	}
	if (file.size === 0) return badRequest("El archivo está vacío.");
	if (file.size > PRICE_SHEET_MAX_BYTES) {
		return badRequest("El archivo supera el máximo de 2 MB.", 413);
	}

	return {
		ok: true,
		file: { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
		formData,
	};
}

export function priceSheetErrorResponse(error: unknown, fallback: string) {
	if (!(error instanceof AdminCrudError)) {
		appLogger.error("priceSheetRequestFailed", {
			error:
				error instanceof Error
					? { message: error.message, name: error.name }
					: { message: String(error) },
		});
	}
	return adminRouteErrorResponse(error, fallback);
}
