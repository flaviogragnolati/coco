import { describe, expect, it, vi } from "vitest";

import {
	listSupplierApplications,
	markSupplierApplicationContacted,
} from "./supplier-application.data";

function listDb() {
	const findMany = vi.fn().mockResolvedValue([]);
	return { findMany, db: { supplierApplication: { findMany } } };
}

describe("listSupplierApplications", () => {
	it.each([
		["pending", null],
		["contacted", { not: null }],
		["all", undefined],
	] as const)("filters %s applications by contactedAt", async (status, contactedAt) => {
		const { findMany, db } = listDb();

		await listSupplierApplications(db as never, { status });

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { contactedAt } }),
		);
	});

	it("puts the applications nobody contacted yet first, newest within each group", async () => {
		const { findMany, db } = listDb();

		await listSupplierApplications(db as never, { status: "all" });

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [
					{ contactedAt: { sort: "desc", nulls: "first" } },
					{ createdAt: "desc" },
				],
			}),
		);
	});
});

describe("markSupplierApplicationContacted", () => {
	it("only writes while the application is still pending", async () => {
		const updateMany = vi.fn().mockResolvedValue({ count: 1 });
		const db = { supplierApplication: { updateMany } };

		await markSupplierApplicationContacted(db as never, 7, "admin-1");

		expect(updateMany).toHaveBeenCalledWith({
			where: { id: 7, contactedAt: null },
			data: { contactedAt: expect.any(Date), contactedById: "admin-1" },
		});
	});
});
