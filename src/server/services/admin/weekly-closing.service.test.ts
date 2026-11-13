import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./weekly-closing.data", () => ({
	upsertWeeklyClosingSettings: vi.fn(),
}));

vi.mock("./_base/admin-audit", () => ({
	writeAdminAuditLog: vi.fn(),
}));

import { writeAdminAuditLog } from "./_base/admin-audit";
import * as data from "./weekly-closing.data";
import * as service from "./weekly-closing.service";

const actor = { id: "admin-1", name: "Admin Uno", role: "admin" as const };

const wednesdayNoon = {
	closingWeekday: 3,
	closingHour: 12,
	closingMinute: 0,
	deliveryDaysMin: 7,
	deliveryDaysMax: 10,
	updatedAt: new Date("2026-11-13T12:00:00.000Z"),
};

const thursdayEvening = {
	closingWeekday: 4,
	closingHour: 18,
	closingMinute: 0,
	deliveryDaysMin: 7,
	deliveryDaysMax: 10,
};

function database() {
	const tx = {};
	return {
		tx,
		db: {
			$transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		} as unknown as Parameters<typeof service.updateSettings>[2],
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("weekly closing settings", () => {
	it("writes the row and an audit entry with before and after", async () => {
		const { db, tx } = database();
		const saved = {
			...thursdayEvening,
			updatedAt: new Date("2026-11-13T13:00:00.000Z"),
		};
		vi.mocked(data.upsertWeeklyClosingSettings)
			.mockResolvedValueOnce(wednesdayNoon)
			.mockResolvedValueOnce(saved);

		const result = await service.updateSettings(thursdayEvening, actor, db);

		expect(data.upsertWeeklyClosingSettings).toHaveBeenNthCalledWith(1, tx);
		expect(data.upsertWeeklyClosingSettings).toHaveBeenNthCalledWith(
			2,
			tx,
			thursdayEvening,
		);
		expect(writeAdminAuditLog).toHaveBeenCalledWith(tx, {
			action: "weeklyClosingSettings.update",
			actor,
			entityType: "weeklyClosingSettings",
			entityId: "1",
			before: wednesdayNoon,
			after: saved,
		});
		expect(result).toEqual(saved);
	});
});
