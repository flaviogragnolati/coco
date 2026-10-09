import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./pickup-point.data", () => ({
	createPickupPoint: vi.fn(),
	findPickupPointById: vi.fn(),
	getPickupPointRelationCounts: vi.fn(),
	getPickupPointStats: vi.fn(),
	hardDeletePickupPoint: vi.fn(),
	listPickupPoints: vi.fn(),
	setPickupPointActive: vi.fn(),
	softDeletePickupPoint: vi.fn(),
	updatePickupPoint: vi.fn(),
}));

vi.mock("./_base/admin-audit", () => ({
	writeAdminAuditLog: vi.fn(),
}));

import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError } from "./_base/admin-crud.errors";
import * as data from "./pickup-point.data";
import * as service from "./pickup-point.service";

const actor = { id: "admin-1", name: "Admin Uno", role: "admin" as const };

function point(overrides: Partial<data.PickupPointDetailRecord> = {}) {
	return {
		id: 3,
		name: "Centro",
		line1: "San Martín 100",
		line2: null,
		city: "Ushuaia",
		state: "Tierra del Fuego",
		postalCode: null,
		country: "AR",
		googleMapsUrl: null,
		hours: "Lun a vie 10 a 18 h",
		instructions: null,
		active: true,
		deleted: false,
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
		} as unknown as Parameters<typeof service.create>[2],
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("pickup point admin service", () => {
	it("lists each point with its pending order count", async () => {
		vi.mocked(data.listPickupPoints).mockResolvedValue([
			{
				...point(),
				updatedAt: new Date("2026-10-09T10:00:00.000Z"),
				_count: { userOrders: 2 },
			},
		]);

		const { db } = database();
		const [item] = await service.list({ includeDeleted: false }, db);

		expect(item).toMatchObject({ id: 3, pendingOrderCount: 2 });
		expect(item).not.toHaveProperty("_count");
	});

	it("deactivates a point and audits the before and after", async () => {
		vi.mocked(data.findPickupPointById).mockResolvedValue(point());
		vi.mocked(data.setPickupPointActive).mockResolvedValue(
			point({ active: false }),
		);

		const { db, tx } = database();
		const result = await service.setActive({ id: 3, active: false }, actor, db);

		expect(result.active).toBe(false);
		expect(data.setPickupPointActive).toHaveBeenCalledWith(tx, 3, false);
		expect(writeAdminAuditLog).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				action: "pickupPoint.setActive",
				entityType: "pickupPoint",
				entityId: "3",
				before: expect.objectContaining({ active: true }),
				after: expect.objectContaining({ active: false }),
			}),
		);
	});

	it("refuses to edit or reactivate a deleted point", async () => {
		vi.mocked(data.findPickupPointById).mockResolvedValue(
			point({ active: false, deleted: true }),
		);
		const { db } = database();

		await expect(
			service.update(
				{
					...point(),
					line2: undefined,
					postalCode: undefined,
					googleMapsUrl: undefined,
					instructions: undefined,
				},
				actor,
				db,
			),
		).rejects.toBeInstanceOf(AdminCrudError);
		await expect(
			service.setActive({ id: 3, active: true }, actor, db),
		).rejects.toBeInstanceOf(AdminCrudError);
		expect(writeAdminAuditLog).not.toHaveBeenCalled();
	});

	it("refuses a hard delete while an order or a shipment references the point", async () => {
		vi.mocked(data.getPickupPointRelationCounts).mockResolvedValue({
			...point(),
			_count: { userOrders: 1, shipments: 2 },
		});
		const { db } = database();

		await expect(service.hardDelete({ id: 3 }, actor, db)).rejects.toThrow(
			'No se puede eliminar definitivamente "Centro" porque lo usan 1 pedido y 2 envíos.',
		);
		expect(data.hardDeletePickupPoint).not.toHaveBeenCalled();
	});

	it("hard deletes an unreferenced point and audits it", async () => {
		vi.mocked(data.getPickupPointRelationCounts).mockResolvedValue({
			...point(),
			_count: { userOrders: 0, shipments: 0 },
		});
		vi.mocked(data.hardDeletePickupPoint).mockResolvedValue({ id: 3 });
		const { db, tx } = database();

		await expect(service.hardDelete({ id: 3 }, actor, db)).resolves.toEqual({
			id: 3,
		});
		expect(writeAdminAuditLog).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				action: "pickupPoint.hardDelete",
				metadata: { hardDelete: true },
			}),
		);
	});
});
