import { z } from "zod";

export const emailRequestSchema = z.object({
	from: z.string().min(1),
	to: z.string().email(),
	subject: z.string().min(1),
	text: z.string().min(1),
	html: z.string().min(1),
});

export type SendResult =
	| { status: "accepted"; providerId: string }
	| { status: "retry"; reason: string; retryAfterMs?: number }
	| { status: "review"; reason: string };

export type EmailRequest = z.infer<typeof emailRequestSchema>;
