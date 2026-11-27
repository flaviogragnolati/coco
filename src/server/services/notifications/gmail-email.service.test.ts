import { createTransport } from "nodemailer";
import { beforeEach, expect, it, vi } from "vitest";
import { sendGmail } from "./gmail-email.service";

vi.mock("server-only", () => ({}));
const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({ createTransport: vi.fn(() => ({ sendMail })) }));
const body = {
	from: "CoCo <coco@gmail.com>",
	to: "buyer@example.org",
	subject: "Pedido",
	text: "Tu pedido",
	html: "<p>Tu pedido</p>",
};
const send = () =>
	sendGmail("coco@gmail.com", "app-password", "delivery-1", body);
beforeEach(() => {
	sendMail.mockReset();
});
it("submits both alternatives to the buyer over authenticated TLS", async () => {
	sendMail.mockImplementation(async (mail) => ({
		accepted: [body.to],
		messageId: mail.messageId,
	}));
	const result = await send();
	expect(createTransport).toHaveBeenCalledWith(
		expect.objectContaining({
			host: "smtp.gmail.com",
			port: 465,
			secure: true,
			auth: { user: "coco@gmail.com", pass: "app-password" },
		}),
	);
	expect(sendMail).toHaveBeenCalledWith({
		...body,
		messageId: expect.stringMatching(/^<coco\.[a-f0-9]{64}@gmail\.com>$/),
	});
	expect(result).toEqual({
		status: "accepted",
		providerId: sendMail.mock.calls[0]?.[0].messageId,
	});
});
it.each([
	[451, "retry", "gmail_temporary_rejection"],
	[535, "review", "gmail_smtp_535"],
	[undefined, "review", "gmail_unknown_result"],
] as const)("classifies SMTP response %s", async (responseCode, status, reason) => {
	sendMail.mockRejectedValue({
		responseCode,
		message: "sensitive server text",
	});
	expect(await send()).toEqual({ status, reason });
});

it.each([
	{ code: "EDNS" },
	{ originalCode: "ECONNREFUSED" },
	{ timeoutType: "CONNECT_TIMEOUT" },
	{ timeoutType: "GREETING_TIMEOUT" },
])("retries a failure before submission", async (error) => {
	sendMail.mockRejectedValue(error);
	expect(await send()).toEqual({
		status: "retry",
		reason: "gmail_connection_before_send",
	});
});
it("quarantines a lost socket with an uncertain SMTP outcome", async () => {
	sendMail.mockRejectedValue({
		command: "CONN",
		timeoutType: "SOCKET_TIMEOUT",
	});
	expect(await send()).toEqual({
		status: "review",
		reason: "gmail_unknown_result",
	});
});
