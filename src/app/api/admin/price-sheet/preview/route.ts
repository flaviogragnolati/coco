import { NextResponse } from "next/server";
import { requireAdminApi } from "~/server/auth/api-route-guards";
import { db } from "~/server/db";
import { previewPriceSheet } from "~/server/services/admin/price-sheet.service";
import {
	priceSheetErrorResponse,
	readPriceSheetUpload,
} from "../price-sheet-route.helpers";

export async function POST(request: Request) {
	const auth = await requireAdminApi(request);
	if (!auth.ok) return auth.response;

	const upload = await readPriceSheetUpload(request);
	if (!upload.ok) return upload.response;

	try {
		return NextResponse.json(await previewPriceSheet(upload.file, db));
	} catch (error) {
		return priceSheetErrorResponse(error, "No se pudo leer la planilla");
	}
}
