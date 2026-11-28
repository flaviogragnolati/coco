import "server-only";

import { Resend } from "resend";
import type { EmailRequest, SendResult } from "./email-transport";

function retryAfterMs(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const delay = /^\d+$/.test(value)
		? Number(value) * 1000
		: Date.parse(value) - Date.now();
	return Number.isFinite(delay) ? Math.max(0, delay) : undefined;
}

export async function sendCustomerEmail(
	apiKey: string,
	id: string,
	request: EmailRequest,
): Promise<SendResult> {
	try {
		const options = {
			idempotencyKey: `coco/email/${id}`,
			signal: AbortSignal.timeout(10_000),
		};
		const { data, error, headers } = await new Resend(apiKey).emails.send(
			request,
			options,
		);
		if (data?.id) return { status: "accepted", providerId: data.id };

		const code = error?.statusCode;
		const reason = code ? `resend_http_${code}` : "resend_unknown_result";
		if (
			!code ||
			code === 408 ||
			code === 429 ||
			code >= 500 ||
			error?.name === "concurrent_idempotent_requests"
		) {
			return {
				status: "retry",
				reason,
				retryAfterMs: retryAfterMs(headers?.["retry-after"]),
			};
		}
		return { status: "review", reason };
	} catch {
		return { status: "retry", reason: "resend_connection" };
	}
}
