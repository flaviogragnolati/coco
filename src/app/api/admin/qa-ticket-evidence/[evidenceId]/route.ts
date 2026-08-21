import { NextResponse } from "next/server";
import { qaTicketIdSchema } from "~/schemas/admin/qa-ticket.schemas";
import { adminRouteErrorResponse } from "~/server/api/_shared/admin-route-response";
import { requireAdminApi } from "~/server/auth/api-route-guards";
import { db } from "~/server/db";
import {
	getImageEvidence,
	removeImageEvidence,
} from "~/server/services/admin/qa-ticket.service";

type EvidenceRouteContext = {
	params: Promise<{ evidenceId: string }>;
};

async function parseEvidenceId(context: EvidenceRouteContext) {
	const { evidenceId } = await context.params;
	return qaTicketIdSchema.safeParse(Number(evidenceId));
}

function encodeContentDispositionFileName(fileName: string) {
	return encodeURIComponent(fileName).replace(
		/[!'()*]/g,
		(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
	);
}

export async function GET(request: Request, context: EvidenceRouteContext) {
	const auth = await requireAdminApi(request);
	if (!auth.ok) return auth.response;

	const evidenceId = await parseEvidenceId(context);
	if (!evidenceId.success) {
		return NextResponse.json({ error: "Evidencia inválida" }, { status: 400 });
	}

	try {
		const evidence = await getImageEvidence(evidenceId.data, db);
		const fallbackName = evidence.fileName
			.replace(/[^\x20-\x7e]/g, "_")
			.replace(/["\\]/g, "_");
		return new Response(evidence.bytes, {
			headers: {
				"Cache-Control": "private, no-store",
				"Content-Disposition": `inline; filename="${fallbackName}"; filename*=UTF-8''${encodeContentDispositionFileName(evidence.fileName)}`,
				"Content-Length": String(evidence.byteSize),
				"Content-Type": evidence.mimeType,
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		return adminRouteErrorResponse(error);
	}
}

export async function DELETE(request: Request, context: EvidenceRouteContext) {
	const auth = await requireAdminApi(request);
	if (!auth.ok) return auth.response;

	const evidenceId = await parseEvidenceId(context);
	if (!evidenceId.success) {
		return NextResponse.json({ error: "Evidencia inválida" }, { status: 400 });
	}

	try {
		return NextResponse.json(
			await removeImageEvidence(evidenceId.data, auth.actor, db),
		);
	} catch (error) {
		return adminRouteErrorResponse(error);
	}
}
