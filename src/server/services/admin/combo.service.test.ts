import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./combo.data", () => ({
	createCombo: vi.fn(),
	findComboById: vi.fn(),
	getComboStats: vi.fn(),
	getHomeVisibility: vi.fn(),
	hardDeleteCombo: vi.fn(),
	listComboGroupNames: vi.fn(),
	listCombos: vi.fn(),
	listCurrentComboTerms: vi.fn(),
	listGroupSiblings: vi.fn(),
	listProductsByIds: vi.fn(),
	removeComboFromHome: vi.fn(),
	softDeleteCombo: vi.fn(),
	updateCombo: vi.fn(),
}));

vi.mock("./_base/admin-audit", () => ({
	writeAdminAuditLog: vi.fn(),
}));

import { AdminCrudError } from "./_base/admin-crud.errors";
import * as data from "./combo.data";
import * as service from "./combo.service";

const actor = { id: "admin-1", name: "Admin Uno", role: "admin" as const };

const tx = { name: "tx" };
const db = {
	$transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
		callback(tx),
	),
} as unknown as Parameters<typeof service.create>[2];

function termsRecord(productId: number, name: string) {
	return {
		id: productId * 10,
		moq: "0.5",
		moqPrice: "500",
		step: "0.5",
		stepPrice: null,
		max: null,
		unitPrice: "1000",
		marketPrice: null,
		discountPercent: null,
		currency: "ARS",
		fromDate: new Date("2026-11-01T00:00:00.000Z"),
		toDate: null,
		product: {
			id: productId,
			name,
			unit: "kg",
			presentationContainer: null,
			presentationSize: null,
		},
	};
}

function comboRecord(
	input: {
		id: number;
		groupName?: string | null;
		people?: number | null;
		active?: boolean;
		products?: [number, string][];
	} & Record<string, unknown>,
) {
	return {
		id: input.id,
		name: `Combo ${input.id}`,
		description: null,
		people: input.people ?? null,
		groupName: input.groupName ?? null,
		active: input.active ?? true,
		deleted: false,
		updatedAt: new Date("2026-11-13T00:00:00.000Z"),
		items: (input.products ?? [[1, "Granola"]]).map(
			([productId, name], index) => ({
				productId,
				quantity: "1",
				sortOrder: index,
				product: {
					name,
					unit: "kg",
					presentationContainer: null,
					presentationSize: null,
				},
			}),
		),
	};
}

const breakfastInput = {
	name: "Combo desayuno",
	description: null,
	people: 1,
	groupName: "  Desayuno ",
	active: true,
	items: [{ productId: 1, quantity: "1" }],
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(data.listProductsByIds).mockResolvedValue([
		{ id: 1, name: "Granola", unit: "kg", presentationContainer: null },
	] as never);
	vi.mocked(data.listCurrentComboTerms).mockResolvedValue(
		new Map([[1, termsRecord(1, "Granola")]]) as never,
	);
	vi.mocked(data.listGroupSiblings).mockResolvedValue([]);
	vi.mocked(data.getHomeVisibility).mockResolvedValue({
		featuredComboIds: new Set(),
		spotlightComboId: null,
	});
});

describe("saving a combo", () => {
	it("refuses a second combo for the same people in a group", async () => {
		vi.mocked(data.listGroupSiblings).mockResolvedValue([
			{ id: 9, name: "Desayuno chico", people: 1, groupName: "desayuno" },
		]);

		await expect(service.create(breakfastInput, actor, db)).rejects.toThrow(
			"En el grupo Desayuno ya hay un combo para 1 persona (Desayuno chico).",
		);
		expect(data.listGroupSiblings).toHaveBeenCalledWith(tx, "Desayuno");
		expect(data.createCombo).not.toHaveBeenCalled();
	});

	it("refuses a quantity the cart would change", async () => {
		const create = service.create(
			{ ...breakfastInput, items: [{ productId: 1, quantity: "0.7" }] },
			actor,
			db,
		);

		await expect(create).rejects.toBeInstanceOf(AdminCrudError);
		await expect(create).rejects.toThrow(
			"La cantidad de Granola tiene que ser 0,5 kg o más, de a 0,5 kg.",
		);
	});

	it("saves the trimmed group name and the products in order", async () => {
		vi.mocked(data.createCombo).mockResolvedValue(
			comboRecord({ id: 7, groupName: "Desayuno", people: 1 }) as never,
		);

		await service.create(breakfastInput, actor, db);

		expect(data.createCombo).toHaveBeenCalledWith(tx, {
			...breakfastInput,
			groupName: "Desayuno",
		});
	});

	it("an edit replaces the product list and does not clash with itself", async () => {
		vi.mocked(data.findComboById).mockResolvedValue(
			comboRecord({ id: 7, groupName: "Desayuno", people: 1 }) as never,
		);
		vi.mocked(data.listGroupSiblings).mockResolvedValue([
			{ id: 7, name: "Combo 7", people: 1, groupName: "Desayuno" },
		]);
		vi.mocked(data.updateCombo).mockResolvedValue(
			comboRecord({ id: 7, groupName: "Desayuno", people: 1 }) as never,
		);

		await service.update(
			{ ...breakfastInput, id: 7, items: [{ productId: 1, quantity: "1.5" }] },
			actor,
			db,
		);

		expect(data.updateCombo).toHaveBeenCalledWith(
			tx,
			7,
			expect.objectContaining({ items: [{ productId: 1, quantity: "1.5" }] }),
		);
	});
});

it("a soft delete takes the combo off the featured list and the band", async () => {
	vi.mocked(data.findComboById).mockResolvedValue(
		comboRecord({ id: 7 }) as never,
	);
	vi.mocked(data.softDeleteCombo).mockResolvedValue({
		...comboRecord({ id: 7 }),
		active: false,
		deleted: true,
	} as never);

	await expect(service.softDelete({ id: 7 }, actor, db)).resolves.toEqual({
		id: 7,
	});
	expect(data.removeComboFromHome).toHaveBeenCalledWith(tx, 7);
});

describe("the list warnings", () => {
	it("a combo shows on the home through a featured sibling of its group", async () => {
		vi.mocked(data.listCombos).mockResolvedValue([
			comboRecord({ id: 7, groupName: "Desayuno", people: 1 }),
			comboRecord({ id: 8, groupName: " desayuno", people: 2 }),
			comboRecord({ id: 9, people: 1 }),
		] as never);
		vi.mocked(data.getHomeVisibility).mockResolvedValue({
			featuredComboIds: new Set([7]),
			spotlightComboId: null,
		});

		const items = await service.list({ includeDeleted: false }, db as never);

		expect(items.map((item) => [item.id, item.shownOnHome])).toEqual([
			[7, true],
			[8, true],
			[9, false],
		]);
	});

	it("names the products without current terms", async () => {
		vi.mocked(data.listCombos).mockResolvedValue([
			comboRecord({
				id: 7,
				products: [
					[1, "Granola"],
					[2, "Pasta de maní"],
				],
			}),
		] as never);
		vi.mocked(data.getHomeVisibility).mockResolvedValue({
			featuredComboIds: new Set(),
			spotlightComboId: 7,
		});

		const [item] = await service.list({ includeDeleted: false }, db as never);

		expect(item?.unavailableProductNames).toEqual(["Pasta de maní"]);
		expect(item?.shownOnHome).toBe(true);
	});
});
