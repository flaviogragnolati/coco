import { NextResponse } from "next/server";
import { qaTicketIdSchema } from "~/schemas/admin/qa-ticket.schemas";
import { adminRouteErrorResponse } from "~/server/api/_shared/admin-route-response";
import { requireAdminApi } from "~/server/auth/api-route-guards";
import { db } from "~/server/db";
import { addImageEvidence } from "~/server/services/admin/qa-ticket.service";
import { QA_TICKET_IMAGE_MAX_BYTES } from "~/shared/common/admin-crud/qa-ticket-evidence.constants";

export async function POST(
	request: Request,
	context: { params: Promise<{ ticketId: string }> },
) {
	const auth = await requireAdminApi(request);
	if (!auth.ok) return auth.response;

	const { ticketId: rawTicketId } = await context.params;
	const ticketId = qaTicketIdSchema.safeParse(Number(rawTicketId));
	if (!ticketId.success) {
		return NextResponse.json({ error: "Ticket inválido" }, { status: 400 });
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
	if (file.size > QA_TICKET_IMAGE_MAX_BYTES) {
		return NextResponse.json(
			{ error: "La imagen supera el máximo de 2 MiB" },
			{ status: 413 },
		);
	}

	try {
		const metadata = await addImageEvidence(
			{
				qaTicketId: ticketId.data,
				bytes: new Uint8Array(await file.arrayBuffer()),
				fileName: file.name,
				mimeType: file.type,
			},
			auth.actor,
			db,
		);
		return NextResponse.json(metadata, { status: 201 });
	} catch (error) {
		return adminRouteErrorResponse(error);
	}
}
