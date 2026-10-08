import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { requireAdminApi } from "~/server/auth/api-route-guards";
import { detectedImageMimeType } from "~/server/services/admin/qa-ticket-evidence.validation";
import { appLogger } from "~/server/services/logging/app-logger.service";
import {
	PRODUCT_IMAGE_MAX_BYTES,
	type PRODUCT_IMAGE_MIME_TYPES,
} from "~/shared/common/admin-crud/product-image.constants";

const EXTENSION_BY_MIME_TYPE: Record<
	(typeof PRODUCT_IMAGE_MIME_TYPES)[number],
	string
> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

export async function POST(request: Request) {
	const auth = await requireAdminApi(request);
	if (!auth.ok) return auth.response;

	const token = env.BLOB_READ_WRITE_TOKEN;
	if (!token) {
		return NextResponse.json(
			{
				error:
					"La carga de imágenes no está configurada (falta BLOB_READ_WRITE_TOKEN). Mientras tanto, pegá la URL de la imagen.",
			},
			{ status: 503 },
		);
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return NextResponse.json(
			{ error: "Se esperaba multipart/form-data" },
			{ status: 400 },
		);
	}

	const files = formData.getAll("file");
	if (files.length !== 1 || !(files[0] instanceof File)) {
		return NextResponse.json(
			{ error: "Enviá exactamente una imagen por solicitud" },
			{ status: 400 },
		);
	}
	const file = files[0];
	if (file.size === 0) {
		return NextResponse.json(
			{ error: "La imagen está vacía" },
			{ status: 400 },
		);
	}
	if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
		return NextResponse.json(
			{ error: "La imagen supera el máximo de 4 MiB" },
			{ status: 413 },
		);
	}

	const mimeType = detectedImageMimeType(
		new Uint8Array(await file.arrayBuffer()),
	);
	if (!mimeType || mimeType !== file.type) {
		return NextResponse.json(
			{ error: "La imagen debe ser JPEG, PNG o WebP" },
			{ status: 415 },
		);
	}

	try {
		const blob = await put(
			`products/${crypto.randomUUID()}.${EXTENSION_BY_MIME_TYPE[mimeType]}`,
			file,
			{ access: "public", contentType: mimeType, token },
		);
		return NextResponse.json({ url: blob.url }, { status: 201 });
	} catch (error) {
		appLogger.error("productImageUploadFailed", {
			error:
				error instanceof Error
					? { message: error.message, name: error.name }
					: { message: String(error) },
		});
		return NextResponse.json(
			{ error: "No se pudo subir la imagen. Intentá de nuevo." },
			{ status: 502 },
		);
	}
}
