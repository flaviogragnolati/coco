import "server-only";

import type { db } from "~/server/db";
import type { SupplierApplicationSubmitInput } from "~/shared/common/supplier-application.types";
import { createSupplierApplication } from "./supplier-application.data";

/**
 * A filled honeypot is answered exactly like a real submission, so a bot
 * cannot tell it was discarded.
 */
export async function submit(
	{ website, ...application }: SupplierApplicationSubmitInput,
	database: typeof db,
) {
	if (website?.trim()) return;
	await createSupplierApplication(database, application);
}
