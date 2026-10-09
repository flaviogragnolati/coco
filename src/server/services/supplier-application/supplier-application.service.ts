import "server-only";

import { createHmac, hkdfSync } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { env } from "~/env";
import type { db } from "~/server/db";
import { appLogger } from "~/server/services/logging/app-logger.service";
import type { SupplierApplicationSubmitInput } from "~/shared/common/supplier-application.types";
import {
	countSupplierApplicationsSince,
	createSupplierApplication,
} from "./supplier-application.data";

const MAX_APPLICATIONS_PER_IP = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// A purpose-bound key, so the auth secret itself signs nothing outside better-auth.
function hashClientIp(clientIp: string, secret: string) {
	const key = Buffer.from(
		hkdfSync("sha256", secret, "", "supplier-application-ip-hash", 32),
	);
	return createHmac("sha256", key).update(clientIp).digest("hex");
}

/**
 * A filled honeypot is answered exactly like a real submission, so a bot
 * cannot tell it was discarded, and it never counts toward the rate limit.
 *
 * Count and insert are not atomic: concurrent requests from one IP can each
 * pass the check and overshoot the limit by a row or two, acceptable for a
 * spam brake.
 */
export async function submit(
	{ website, ...application }: SupplierApplicationSubmitInput,
	database: typeof db,
	clientIp: string | null,
) {
	if (website?.trim()) return;

	const secret = env.BETTER_AUTH_SECRET;
	const ipHash = clientIp && secret ? hashClientIp(clientIp, secret) : null;

	if (ipHash) {
		const recent = await countSupplierApplicationsSince(
			database,
			ipHash,
			new Date(Date.now() - RATE_LIMIT_WINDOW_MS),
		);
		if (recent >= MAX_APPLICATIONS_PER_IP) {
			throw new TRPCError({
				code: "TOO_MANY_REQUESTS",
				message:
					"Ya recibimos tu solicitud. Si necesitás algo más, escribinos.",
			});
		}
	} else {
		appLogger.debug("supplierApplicationRateLimitSkipped", {
			reason: clientIp ? "missingSecret" : "missingClientIp",
		});
	}

	await createSupplierApplication(database, application, ipHash);
}
