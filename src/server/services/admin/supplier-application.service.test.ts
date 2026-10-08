import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supplier-application.data", () => ({
	findSupplierApplicationById: vi.fn(),
	listSupplierApplications: vi.fn(),
	markSupplierApplicationContacted: vi.fn(),
}));

vi.mock("./_base/admin-audit", () => ({
	writeAdminAuditLog: vi.fn(),
}));

import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError } from "./_base/admin-crud.errors";
import * as supplierApplicationData from "./supplier-application.data";
import * as supplierApplicationService from "./supplier-application.service";

const receivedAt = new Date("2026-10-08T12:00:00.000Z");
const contactedAt = new Date("2026-10-09T15:30:00.000Z");
const actor = { id: "admin-1", name: "Admin Uno", role: "admin" as const };

function record(
	overrides: Partial<supplierApplicationData.SupplierApplicationRecord> = {},
): supplierApplicationData.SupplierApplicationRecord {
	return {
		id: 7,
		contactName: "Ana Pérez",
		companyName: "Distribuidora Sur",
		email: "ana@distribuidorasur.com.ar",
		phone: null,
		offering: "Yerba por bulto",
		contactedAt: null,
		contactedBy: null,
		createdAt: receivedAt,
		...overrides,
	};
}

function database() {
	const tx = {};
	return {
		tx,
		db: {
			$transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		},
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("supplier application admin service", () => {
	it("marks a pending application as contacted by the acting admin and audits it", async () => {
		const contacted = record({
			contactedAt,
			contactedBy: { id: actor.id, name: actor.name },
		});
		vi.mocked(supplierApplicationData.findSupplierApplicationById)
			.mockResolvedValueOnce(record())
			.mockResolvedValueOnce(contacted);
		vi.mocked(
			supplierApplicationData.markSupplierApplicationContacted,
		).mockResolvedValue({ count: 1 });
		const { db, tx } = database();

		await expect(
			supplierApplicationService.markContacted({ id: 7 }, actor, db as never),
		).resolves.toEqual(contacted);

		expect(
			supplierApplicationData.markSupplierApplicationContacted,
		).toHaveBeenCalledWith(tx, 7, actor.id);
		expect(writeAdminAuditLog).toHaveBeenCalledWith(tx, {
			action: "supplierApplication.markContacted",
			actor,
			entityType: "supplierApplication",
			entityId: "7",
			before: { id: 7, contactedAt: null, contactedBy: null },
			after: {
				id: 7,
				contactedAt,
				contactedBy: { id: actor.id, name: actor.name },
			},
		});
	});

	it("refuses an application someone already marked and writes no audit", async () => {
		vi.mocked(
			supplierApplicationData.findSupplierApplicationById,
		).mockResolvedValue(
			record({ contactedAt, contactedBy: { id: "admin-2", name: "Otra" } }),
		);
		vi.mocked(
			supplierApplicationData.markSupplierApplicationContacted,
		).mockResolvedValue({ count: 0 });
		const { db } = database();

		const error = await supplierApplicationService
			.markContacted({ id: 7 }, actor, db as never)
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(AdminCrudError);
		expect(error).toMatchObject({ code: "CONFLICT" });
		expect(writeAdminAuditLog).not.toHaveBeenCalled();
	});

	it("reports a missing application as not found", async () => {
		vi.mocked(
			supplierApplicationData.findSupplierApplicationById,
		).mockResolvedValue(null);
		const { db } = database();

		await expect(
			supplierApplicationService.markContacted({ id: 99 }, actor, db as never),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "Solicitud de proveedor no encontrada",
		});
		expect(
			supplierApplicationData.markSupplierApplicationContacted,
		).not.toHaveBeenCalled();
	});

	it("lists through the data layer with the requested status", async () => {
		vi.mocked(
			supplierApplicationData.listSupplierApplications,
		).mockResolvedValue([record()]);
		const db = {} as never;

		await expect(
			supplierApplicationService.list({ status: "pending" }, db),
		).resolves.toEqual([record()]);
		expect(
			supplierApplicationData.listSupplierApplications,
		).toHaveBeenCalledWith(db, { status: "pending" });
	});
});
