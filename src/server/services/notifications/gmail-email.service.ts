import "server-only";

import { createHash } from "node:crypto";
import { createTransport } from "nodemailer";
import type { EmailRequest, SendResult } from "./email-transport";

export async function sendGmail(
	user: string,
	password: string,
	id: string,
	request: EmailRequest,
): Promise<SendResult> {
	const transport = createTransport({
		host: "smtp.gmail.com",
		port: 465,
		secure: true,
		auth: { user, pass: password },
		connectionTimeout: 10000,
		greetingTimeout: 10000,
		socketTimeout: 10000,
		disableFileAccess: true,
		disableUrlAccess: true,
	});
	const delivery = createHash("sha256").update(id).digest("hex");
	try {
		const result = await transport.sendMail({
			...request,
			messageId: `<coco.${delivery}@${user.split("@")[1]}>`,
		});
		if (result.accepted.length === 1 && result.messageId) {
			return { status: "accepted", providerId: result.messageId };
		}
		return { status: "review", reason: "gmail_unknown_result" };
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			(("code" in error && error.code === "EDNS") ||
				("originalCode" in error && error.originalCode === "ECONNREFUSED") ||
				("timeoutType" in error &&
					(error.timeoutType === "CONNECT_TIMEOUT" ||
						error.timeoutType === "GREETING_TIMEOUT")))
		) {
			return { status: "retry", reason: "gmail_connection_before_send" };
		}
		const code =
			error && typeof error === "object" && "responseCode" in error
				? error.responseCode
				: undefined;
		if (typeof code === "number" && code >= 400 && code < 500)
			return { status: "retry", reason: "gmail_temporary_rejection" };
		return {
			status: "review",
			reason:
				typeof code === "number" && code >= 500 && code < 600
					? `gmail_smtp_${code}`
					: "gmail_unknown_result",
		};
	}
}
