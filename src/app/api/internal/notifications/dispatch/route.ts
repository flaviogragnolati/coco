import { timingSafeEqual } from "node:crypto";
import { env } from "~/env";
import { appLogger } from "~/server/services/logging/app-logger.service";
import { dispatchCustomerEmails } from "~/server/services/notifications/customer-email-dispatcher";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
	const received = Buffer.from(request.headers.get("authorization") ?? "");
	const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
	if (
		!env.CRON_SECRET ||
		received.length !== expected.length ||
		!timingSafeEqual(received, expected)
	) {
		return Response.json({ error: "Unauthorized" }, { status: 401, headers });
	}
	try {
		return Response.json(await dispatchCustomerEmails(), { headers });
	} catch {
		appLogger.error("customerEmailDispatchFailed");
		return Response.json(
			{ error: "Dispatch failed" },
			{ status: 500, headers },
		);
	}
}
