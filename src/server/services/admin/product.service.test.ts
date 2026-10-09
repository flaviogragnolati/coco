import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
	BLOB_READ_WRITE_TOKEN: "blob-token" as string | undefined,
}));

vi.mock("server-only", () => ({}));
vi.mock("~/env", () => ({ env: mockEnv }));
vi.mock("@vercel/blob", () => ({ del: vi.fn() }));
vi.mock("~/server/services/logging/app-logger.service", () => ({
	appLogger: { error: vi.fn(), warn: vi.fn() },
}));
vi.mock("./product.data", () => ({
	findOtherProductsUsingImages: vi.fn(),
	findProductById: vi.fn(),
	getProductRelationCounts: vi.fn(),
	hardDeleteProduct: vi.fn(),
	softDeleteProduct: vi.fn(),
	updateProduct: vi.fn(),
}));
vi.mock("./_base/admin-audit", () => ({
	writeAdminAuditLog: vi.fn(),
}));

import { del } from "@vercel/blob";
import { appLogger } from "~/server/services/logging/app-logger.service";
import { writeAdminAuditLog } from "./_base/admin-audit";
import * as data from "./product.data";
import * as service from "./product.service";

const BLOB = "https://abc123.public.blob.vercel-storage.com";
const OLD_CARD = `${BLOB}/products/old-card.png`;
const NEW_CARD = `${BLOB}/products/new-card.png`;
const GALLERY = `${BLOB}/products/gallery.png`;

const actor = { id: "admin-1", name: "Admin Uno", role: "admin" as const };

function product(overrides: Partial<data.ProductDetailRecord> = {}) {
	return {
		id: 5,
		name: "Yerba",
		description: null,
		cartImageUrl: null,
		cardImageUrl: OLD_CARD,
		images: [GALLERY],
		unit: "kg" as const,
		brand: null,
		defaultSupplier: null,
		active: true,
		deleted: false,
		...overrides,
	};
}

const updateInput = {
	id: 5,
	name: "Yerba",
	description: undefined,
	cardImageUrl: NEW_CARD,
	images: [GALLERY],
	unit: "kg" as const,
	brandAssignment: { mode: "none" as const },
	active: true,
};

function database() {
	let committed = false;
	const events: string[] = [];
	const db = {
		$transaction: vi.fn(async (callback: (client: object) => unknown) => {
			const result = await callback({});
			committed = true;
			events.push("commit");
			return result;
		}),
	} as unknown as Parameters<typeof service.update>[2];
	vi.mocked(del).mockImplementation(async () => {
		events.push(committed ? "del after commit" : "del before commit");
	});
	return { db, events };
}

beforeEach(() => {
	vi.clearAllMocks();
	mockEnv.BLOB_READ_WRITE_TOKEN = "blob-token";
	vi.mocked(data.findProductById).mockResolvedValue(product());
	vi.mocked(data.updateProduct).mockResolvedValue(
		product({ cardImageUrl: NEW_CARD }),
	);
	vi.mocked(data.findOtherProductsUsingImages).mockResolvedValue([]);
});

describe("product admin service image cleanup", () => {
	it("deletes the replaced uploaded image once the update commits", async () => {
		const { db, events } = database();

		const result = await service.update(updateInput, actor, db);

		expect(result.cardImageUrl).toBe(NEW_CARD);
		expect(data.findOtherProductsUsingImages).toHaveBeenCalledWith(
			expect.anything(),
			{ excludeId: 5, urls: [OLD_CARD] },
		);
		expect(del).toHaveBeenCalledWith([OLD_CARD], { token: "blob-token" });
		expect(events).toEqual(["commit", "del after commit"]);
	});

	it("keeps an image another product still uses", async () => {
		vi.mocked(data.findOtherProductsUsingImages).mockResolvedValue([
			{ cardImageUrl: null, cartImageUrl: OLD_CARD, images: [] },
		]);
		const { db } = database();

		await service.update(updateInput, actor, db);

		expect(del).not.toHaveBeenCalled();
	});

	it("deletes nothing when the transaction fails", async () => {
		vi.mocked(writeAdminAuditLog).mockRejectedValueOnce(new Error("db down"));
		const { db } = database();

		await expect(service.update(updateInput, actor, db)).rejects.toThrow(
			"db down",
		);
		expect(del).not.toHaveBeenCalled();
	});

	it("logs a Blob failure without failing the save", async () => {
		const { db } = database();
		vi.mocked(del).mockRejectedValue(new Error("blob unavailable"));

		const result = await service.update(updateInput, actor, db);

		expect(result.id).toBe(5);
		expect(appLogger.error).toHaveBeenCalledWith("productImageDeleteFailed", {
			urls: [OLD_CARD],
			error: { message: "blob unavailable", name: "Error" },
		});
	});

	it("logs and skips deletion when the Blob token is missing", async () => {
		mockEnv.BLOB_READ_WRITE_TOKEN = undefined;
		const { db } = database();

		const result = await service.update(updateInput, actor, db);

		expect(result.id).toBe(5);
		expect(del).not.toHaveBeenCalled();
		expect(appLogger.warn).toHaveBeenCalledWith("productImageDeleteSkipped", {
			reason: "missingBlobToken",
			urls: [OLD_CARD],
		});
	});

	it("deletes every uploaded image of a hard-deleted product after commit", async () => {
		vi.mocked(data.getProductRelationCounts).mockResolvedValue({
			...product({ deleted: true, active: false }),
			_count: {
				productClientTerms: 0,
				productSupplierTerms: 0,
				productLocalConstraints: 0,
			},
		});
		vi.mocked(data.hardDeleteProduct).mockResolvedValue({ id: 5 });
		const { db, events } = database();

		await expect(service.hardDelete({ id: 5 }, actor, db)).resolves.toEqual({
			id: 5,
		});
		expect(del).toHaveBeenCalledWith([OLD_CARD, GALLERY], {
			token: "blob-token",
		});
		expect(events).toEqual(["commit", "del after commit"]);
	});

	it("keeps the images of a soft-deleted product so it can be restored", async () => {
		vi.mocked(data.softDeleteProduct).mockResolvedValue(
			product({ deleted: true, active: false }),
		);
		const { db } = database();

		await service.softDelete({ id: 5 }, actor, db);

		expect(del).not.toHaveBeenCalled();
	});
});
