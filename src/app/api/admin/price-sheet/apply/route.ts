import { NextResponse } from "next/server";
import { priceSheetExpectedChangesSchema } from "~/schemas/admin/price-sheet.schemas";
import { requireAdminApi } from "~/server/auth/api-route-guards";
import { db } from "~/server/db";
import { applyPriceSheet } from "~/server/services/admin/price-sheet.service";
import {
	priceSheetErrorResponse,
	readPriceSheetUpload,
} from "../price-sheet-route.helpers";

function parseExpected(value: FormDataEntryValue | null) {
	if (typeof value !== "string") return null;
	try {
		const parsed = priceSheetExpectedChangesSchema.safeParse(JSON.parse(value));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export async function POST(request: Request) {
	const auth = await requireAdminApi(request);
	if (!auth.ok) return auth.response;

	const upload = await readPriceSheetUpload(request);
	if (!upload.ok) return upload.response;

	const expected = parseExpected(upload.formData.get("expected"));
	if (!expected) {
		return NextResponse.json(
			{ error: "Falta la vista previa confirmada" },
			{ status: 400 },
		);
	}

	try {
		return NextResponse.json(
			await applyPriceSheet(upload.file, expected, auth.actor, db),
		);
	} catch (error) {
		return priceSheetErrorResponse(error, "No se pudo aplicar la planilla");
	}
}
