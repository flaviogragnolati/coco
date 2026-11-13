import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("../home/home.service", () => ({
	composeCurrentHomeFeatured: vi.fn(),
}));
vi.mock("./home-offers.data", () => ({
	countCurrentClientTerms: vi.fn(),
	createFeaturedItem: vi.fn(),
	deleteFeaturedItem: vi.fn(),
	findFeaturedItemByTarget: vi.fn(),
	findHomeFeaturedCombo: vi.fn(),
	findHomeOfferProduct: vi.fn(),
	listComboCandidates: vi.fn(),
	listFeaturedItems: vi.fn(),
	listHomeOfferCandidateTerms: vi.fn(),
	rewriteFeaturedPositions: vi.fn(),
	upsertHomeOfferSettings: vi.fn(),
}));
vi.mock("./combo.data", () => ({ listCurrentComboTerms: vi.fn() }));
vi.mock("./_base/admin-audit", () => ({ writeAdminAuditLog: vi.fn() }));

import * as data from "./home-offers.data";
import * as service from "./home-offers.service";

const actor = { id: "admin-1", name: "Admin Uno", role: "admin" as const };
const tx = { name: "tx" };
const db = {
	$transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
		callback(tx),
	),
} as unknown as Parameters<typeof service.addFeatured>[2];

function settings(input: Record<string, unknown> = {}) {
	return {
		spotlightProductId: null,
		spotlightComboId: null,
		criterion: "marketSaving",
		offersLimit: 4,
		fillWithRanking: true,
		updatedAt: new Date("2026-11-13T00:00:00.000Z"),
		...input,
	};
}

function combo(
	id: number,
	input: {
		groupName?: string | null;
		active?: boolean;
		products?: number[];
	} = {},
) {
	return {
		id,
		name: `Combo ${id}`,
		active: input.active ?? true,
		deleted: false,
		groupName: input.groupName ?? null,
		items: (input.products ?? [1]).map((productId) => ({ productId })),
	};
}

function comboItem(id: number, comboRecord: ReturnType<typeof combo>) {
	return {
		id,
		position: id,
		productId: null,
		comboId: comboRecord.id,
		product: null,
		combo: comboRecord,
	};
}

function productItem(id: number, productId: number) {
	return {
		id,
		position: id,
		productId,
		comboId: null,
		product: {
			id: productId,
			name: `Producto ${productId}`,
			active: true,
			deleted: false,
		},
		combo: null,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(data.upsertHomeOfferSettings).mockResolvedValue(
		settings() as never,
	);
});

describe("reorderFeatured", () => {
	beforeEach(() => {
		vi.mocked(data.listFeaturedItems).mockResolvedValue([
			productItem(1, 10),
			productItem(2, 20),
		] as never);
	});

	it("rewrites the positions in the given order", async () => {
		await service.reorderFeatured({ ids: [2, 1] }, actor, db);

		expect(data.rewriteFeaturedPositions).toHaveBeenCalledWith(tx, [2, 1]);
	});

	it.each([
		[[1]],
		[[1, 2, 3]],
		[[1, 1]],
	])("refuses a list that is not exactly the current one (%j)", async (ids) => {
		await expect(service.reorderFeatured({ ids }, actor, db)).rejects.toThrow(
			"La lista cambió; recargá la página.",
		);
		expect(data.rewriteFeaturedPositions).not.toHaveBeenCalled();
	});
});

it("refuses to add what is already in the list", async () => {
	vi.mocked(data.findFeaturedItemByTarget).mockResolvedValue({ id: 4 });

	await expect(
		service.addFeatured({ target: { kind: "combo", comboId: 7 } }, actor, db),
	).rejects.toThrow("Ya está en la lista de destacados.");
	expect(data.createFeaturedItem).not.toHaveBeenCalled();
});

it("refuses to add an inactive combo", async () => {
	vi.mocked(data.findFeaturedItemByTarget).mockResolvedValue(null);
	vi.mocked(data.findHomeFeaturedCombo).mockResolvedValue(
		combo(7, { active: false }) as never,
	);

	await expect(
		service.addFeatured({ target: { kind: "combo", comboId: 7 } }, actor, db),
	).rejects.toThrow("Combo 7 está inactivo");
});

it("a combo in the band clears the product that was there", async () => {
	vi.mocked(data.findHomeFeaturedCombo).mockResolvedValue(combo(7) as never);
	vi.mocked(data.upsertHomeOfferSettings).mockResolvedValue(
		settings({ spotlightProductId: 3 }) as never,
	);

	await service.setSpotlight(
		{ target: { kind: "combo", comboId: 7 } },
		actor,
		db,
	);

	expect(data.upsertHomeOfferSettings).toHaveBeenLastCalledWith(tx, {
		spotlightProductId: null,
		spotlightComboId: 7,
	});
});

describe("describeFeaturedItems", () => {
	it("marks a sibling below in the list as sharing the first one's card", () => {
		const items = service.describeFeaturedItems(
			[
				comboItem(1, combo(7, { groupName: "Desayuno" })),
				productItem(2, 2),
				comboItem(3, combo(8, { groupName: " desayuno" })),
			] as never,
			new Set([1, 2]),
			null,
		);

		expect(items.map((item) => [item.status, item.sharedWithName])).toEqual([
			["shown", null],
			["shown", null],
			["sharedCard", "Combo 7"],
		]);
	});

	it("marks a sibling of the band's combo as sharing its card", () => {
		const [item] = service.describeFeaturedItems(
			[comboItem(1, combo(8, { groupName: "Desayuno" }))] as never,
			new Set([1]),
			combo(7, { groupName: "Desayuno" }) as never,
		);

		expect(item?.status).toBe("sharedCard");
		expect(item?.sharedWithName).toBe("Combo 7");
	});

	it("flags products without terms, combos with nothing available and inactive combos", () => {
		const items = service.describeFeaturedItems(
			[
				productItem(1, 5),
				comboItem(2, combo(7, { products: [5] })),
				comboItem(3, combo(8, { active: false })),
			] as never,
			new Set([1]),
			null,
		);

		expect(items.map((item) => item.status)).toEqual([
			"noPrice",
			"noPrice",
			"inactive",
		]);
	});
});
