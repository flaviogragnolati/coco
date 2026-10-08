import type { Prisma } from "~/prisma/client";
import {
	supplierApplicationListItemSchema,
	supplierApplicationListOutputSchema,
} from "~/schemas/admin/supplier-application.schemas";
import type { db } from "~/server/db";
import type {
	SupplierApplicationListInput,
	SupplierApplicationListItem,
	SupplierApplicationMarkContactedInput,
} from "~/shared/common/admin-crud/supplier-application.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError } from "./_base/admin-crud.errors";
import {
	findSupplierApplicationById,
	listSupplierApplications,
	markSupplierApplicationContacted,
} from "./supplier-application.data";

type AdminDb = typeof db;

const SUPPLIER_APPLICATION_ENTITY = "supplierApplication";

// Only the contact state: the sender's personal data stays out of audit_log.
function auditSnapshot(application: SupplierApplicationListItem) {
	return {
		id: application.id,
		contactedAt: application.contactedAt,
		contactedBy: application.contactedBy,
	};
}

async function getRequired(tx: Prisma.TransactionClient, id: number) {
	const record = await findSupplierApplicationById(tx, id);
	if (!record) {
		throw new AdminCrudError(
			"NOT_FOUND",
			"Solicitud de proveedor no encontrada",
		);
	}
	return supplierApplicationListItemSchema.parse(record);
}

export async function list(
	input: SupplierApplicationListInput,
	database: AdminDb,
) {
	return supplierApplicationListOutputSchema.parse(
		await listSupplierApplications(database, input),
	);
}

export async function markContacted(
	input: SupplierApplicationMarkContactedInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const before = await getRequired(tx, input.id);
		const result = await markSupplierApplicationContacted(
			tx,
			input.id,
			actor.id,
		);
		if (result.count !== 1) {
			throw new AdminCrudError(
				"CONFLICT",
				"La solicitud ya estaba marcada como contactada",
			);
		}
		const after = await getRequired(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "supplierApplication.markContacted",
			actor,
			entityType: SUPPLIER_APPLICATION_ENTITY,
			entityId: String(after.id),
			before: auditSnapshot(before),
			after: auditSnapshot(after),
		});

		return after;
	});
}
