import type { Prisma } from "~/prisma/client";
import { SUPPLIER_APPLICATION_LIST_LIMIT } from "~/schemas/admin/supplier-application.schemas";
import type { SupplierApplicationListInput } from "~/shared/common/admin-crud/supplier-application.types";

type AdminDbClient = Prisma.TransactionClient;

export const supplierApplicationListSelect = {
	id: true,
	contactName: true,
	companyName: true,
	email: true,
	phone: true,
	offering: true,
	contactedAt: true,
	contactedBy: { select: { id: true, name: true } },
	createdAt: true,
} satisfies Prisma.SupplierApplicationSelect;

export type SupplierApplicationRecord = Prisma.SupplierApplicationGetPayload<{
	select: typeof supplierApplicationListSelect;
}>;

const contactedAtByStatus = {
	pending: null,
	contacted: { not: null },
	all: undefined,
} satisfies Record<
	SupplierApplicationListInput["status"],
	Prisma.SupplierApplicationWhereInput["contactedAt"]
>;

export async function listSupplierApplications(
	db: AdminDbClient,
	input: SupplierApplicationListInput,
) {
	return db.supplierApplication.findMany({
		where: { contactedAt: contactedAtByStatus[input.status] },
		select: supplierApplicationListSelect,
		orderBy: [
			{ contactedAt: { sort: "desc", nulls: "first" } },
			{ createdAt: "desc" },
		],
		take: SUPPLIER_APPLICATION_LIST_LIMIT,
	});
}

export async function findSupplierApplicationById(
	db: AdminDbClient,
	id: number,
) {
	return db.supplierApplication.findUnique({
		where: { id },
		select: supplierApplicationListSelect,
	});
}

/**
 * Conditioned on `contactedAt: null` so two admins marking the same row at once
 * leave the first one's name, not the last one's.
 */
export async function markSupplierApplicationContacted(
	db: AdminDbClient,
	id: number,
	contactedById: string,
) {
	return db.supplierApplication.updateMany({
		where: { id, contactedAt: null },
		data: { contactedAt: new Date(), contactedById },
	});
}
