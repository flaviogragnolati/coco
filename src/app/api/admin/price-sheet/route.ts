import { requireAdminApi } from "~/server/auth/api-route-guards";
import { db } from "~/server/db";
import { buildPriceSheetDownload } from "~/server/services/admin/price-sheet.service";
import { priceSheetErrorResponse } from "./price-sheet-route.helpers";

export async function GET(request: Request) {
	const auth = await requireAdminApi(request);
	if (!auth.ok) return auth.response;

	try {
		const sheet = await buildPriceSheetDownload(db);
		return new Response(new Uint8Array(sheet.bytes), {
			headers: {
				"Cache-Control": "private, no-store",
				"Content-Disposition": `attachment; filename="${sheet.fileName}"`,
				"Content-Length": String(sheet.bytes.byteLength),
				"Content-Type":
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		return priceSheetErrorResponse(
			error,
			"No se pudo generar la planilla de precios",
		);
	}
}
