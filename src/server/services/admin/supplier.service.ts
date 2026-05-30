import type { db } from "~/server/db";
import {
	supplierDetailSchema,
	supplierListOutputSchema,
	supplierStatsSchema,
} from "~/schemas/admin/supplier.schemas";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	createSupplier,
	findSupplierById,
	getSupplierRelationCounts,
	getSupplierStats,
	hardDeleteSupplier,
	listSuppliers,
	softDeleteSupplier,
	updateSupplier,
	type SupplierDetailRecord,
	type SupplierRelationCountRecord,
} from "./supplier.data";
import type {
	SupplierCreateInput,
	SupplierDeleteInput,
	SupplierDetail,
	SupplierListInput,
	SupplierStats,
	SupplierUpdateInput,
} from "~/shared/common/admin-crud/supplier.types";

type AdminDb = typeof db;

const SUPPLIER_ENTITY = "supplier";

function parseDetail(record: SupplierDetailRecord): SupplierDetail {
	return supplierDetailSchema.parse(record);
}

function buildRelationBlockMessage(record: SupplierRelationCountRecord) {
	const blockingParts = [
		record._count.productSupplierTerms > 0
			? `${record._count.productSupplierTerms} términos de proveedor`
			: null,
		record._count.lots > 0 ? `${record._count.lots} lotes` : null,
		record._count.supplierOrders > 0
			? `${record._count.supplierOrders} órdenes de proveedor`
			: null,
	].filter(Boolean);

	return `No se puede eliminar definitivamente "${record.name}" porque tiene ${blockingParts.join(", ")} relacionados.`;
}

export async function list(input: SupplierListInput, database: AdminDb) {
	const records = await listSuppliers(database, input);
	return supplierListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const supplier = await findSupplierById(database, id);
	if (!supplier) throwNotFound("Proveedor");
	return parseDetail(supplier);
}

export async function getStats(database: AdminDb): Promise<SupplierStats> {
	return supplierStatsSchema.parse(await getSupplierStats(database));
}

export async function create(
	input: SupplierCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const supplier = await createSupplier(tx, input);
		const parsed = parseDetail(supplier);

		await writeAdminAuditLog(tx, {
			action: "supplier.create",
			actor,
			entityType: SUPPLIER_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
		});

		return parsed;
	});
}

export async function update(
	input: SupplierUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findSupplierById(tx, input.id);
		if (!beforeRecord) throwNotFound("Proveedor");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar un proveedor eliminado",
			);
		}

		const supplier = await updateSupplier(tx, input);
		const after = parseDetail(supplier);

		await writeAdminAuditLog(tx, {
			action: "supplier.update",
			actor,
			entityType: SUPPLIER_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: SupplierDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findSupplierById(tx, input.id);
		if (!beforeRecord) throwNotFound("Proveedor");
		const before = parseDetail(beforeRecord);

		const supplier = await softDeleteSupplier(tx, input.id);
		const after = parseDetail(supplier);

		await writeAdminAuditLog(tx, {
			action: "supplier.softDelete",
			actor,
			entityType: SUPPLIER_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: SupplierDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const supplier = await getSupplierRelationCounts(tx, input.id);
		if (!supplier) throwNotFound("Proveedor");

		const hasRestrictiveRelations =
			supplier._count.productSupplierTerms > 0 ||
			supplier._count.lots > 0 ||
			supplier._count.supplierOrders > 0;

		if (hasRestrictiveRelations) {
			throw new AdminCrudError(
				"RELATION_BLOCKED",
				buildRelationBlockMessage(supplier),
			);
		}

		const before = parseDetail(supplier);
		const deleted = await hardDeleteSupplier(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "supplier.hardDelete",
			actor,
			entityType: SUPPLIER_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
