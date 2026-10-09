import "server-only";

import type { db } from "~/server/db";
import type { SupplierApplicationSubmitInput } from "~/shared/common/supplier-application.types";

type SupplierApplicationDb = typeof db;

export async function countSupplierApplicationsSince(
	database: SupplierApplicationDb,
	ipHash: string,
	since: Date,
) {
	return database.supplierApplication.count({
		where: { ipHash, createdAt: { gte: since } },
	});
}

export async function createSupplierApplication(
	database: SupplierApplicationDb,
	input: Omit<SupplierApplicationSubmitInput, "website">,
	ipHash: string | null,
) {
	await database.supplierApplication.create({
		data: {
			contactName: input.contactName,
			companyName: input.companyName,
			email: input.email,
			phone: input.phone,
			offering: input.offering,
			ipHash,
		},
		select: { id: true },
	});
}
