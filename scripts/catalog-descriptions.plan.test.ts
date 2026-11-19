import { describe, expect, it, vi } from "vitest";

import type { ProductDetail } from "~/shared/common/admin-crud/product.types";
import type { CatalogDescription } from "./catalog-descriptions.data";
import {
	applyDescription,
	assertApplyAllowed,
	buildDescriptionUpdate,
	findDuplicateEntries,
	parseDescriptionArgs,
	planDescriptions,
} from "./catalog-descriptions.plan";

const entry: CatalogDescription = {
	productId: 122,
	name: "Aceite de oliva extra virgen 0,5 L",
	description:
		"Extra virgen es la categoría más alta del aceite de oliva. Para usar en crudo, en ensaladas y tostadas, o para cocinar.",
};

function product(overrides: Partial<ProductDetail> = {}): ProductDetail {
	return {
		id: 122,
		name: "Aceite de oliva extra virgen 0,5 L",
		description: "Aceite de oliva extra virgen 0,5 L.",
		cartImageUrl: "https://cdn.example.com/aceite.jpg",
		cardImageUrl: null,
		images: ["https://cdn.example.com/aceite-2.jpg"],
		unit: "piece",
		presentationContainer: "botella",
		presentationSize: "0,5 L",
		brand: { id: 4, name: "Quintal", deleted: false },
		category: { id: 5, name: "Aceites y despensa", deleted: false },
		defaultSupplier: { id: 2, name: "Quintal", deleted: false },
		active: true,
		deleted: false,
		...overrides,
	};
}

describe("buildDescriptionUpdate", () => {
	it("keeps every other field as the product has it", () => {
		const update = buildDescriptionUpdate(product(), entry.description);
		expect(update).toEqual({
			input: {
				id: 122,
				name: "Aceite de oliva extra virgen 0,5 L",
				description: entry.description,
				cartImageUrl: "https://cdn.example.com/aceite.jpg",
				cardImageUrl: undefined,
				images: ["https://cdn.example.com/aceite-2.jpg"],
				unit: "piece",
				presentationContainer: "botella",
				presentationSize: "0,5 L",
				brandAssignment: { mode: "existing", brandId: 4 },
				categoryId: 5,
				defaultSupplierId: 2,
				active: true,
			},
		});
	});

	it("keeps a product without brand or supplier without them", () => {
		const update = buildDescriptionUpdate(
			product({ brand: null, defaultSupplier: null }),
			entry.description,
		);
		expect(update).toMatchObject({
			input: {
				brandAssignment: { mode: "none" },
				defaultSupplierId: undefined,
			},
		});
	});

	it("refuses a save the admin form would normalize", () => {
		expect(
			buildDescriptionUpdate(
				product({ name: "Aceite de oliva extra virgen 0,5 L " }),
				entry.description,
			),
		).toEqual({ problem: "guardar cambiaría también name" });
	});

	it("refuses a product the admin form rejects", () => {
		const update = buildDescriptionUpdate(
			product({ cartImageUrl: "/images/aceite.jpg" }),
			entry.description,
		);
		expect(update).toMatchObject({
			problem: expect.stringMatching(/^el formulario de admin lo rechaza/),
		});
	});

	it("refuses a description over the limit", () => {
		expect(buildDescriptionUpdate(product(), "a".repeat(201))).toMatchObject({
			problem: expect.stringContaining("200 caracteres"),
		});
	});

	it("refuses a product without category", () => {
		expect(
			buildDescriptionUpdate(product({ category: null }), entry.description),
		).toEqual({ problem: "no tiene categoría" });
	});
});

describe("planDescriptions", () => {
	it("changes a product whose description differs and skips one already loaded", () => {
		const loaded = { ...entry, productId: 123, name: "Aceite 1 L" };
		const steps = planDescriptions(
			[entry, loaded],
			[
				product(),
				product({
					id: 123,
					name: "Aceite 1 L",
					description: entry.description,
				}),
			],
		);
		expect(steps).toEqual([
			{
				kind: "change",
				productId: 122,
				name: entry.name,
				before: "Aceite de oliva extra virgen 0,5 L.",
				after: entry.description,
			},
			{
				kind: "skip",
				productId: 123,
				name: "Aceite 1 L",
				description: entry.description,
			},
		]);
	});

	it.each([
		["missing", [], "no existe en esta base"],
		["deleted", [product({ deleted: true })], "está eliminado"],
		[
			"renamed",
			[product({ name: "Aceite de oliva 0,5 L" })],
			'se llama "Aceite de oliva 0,5 L" y el archivo de datos espera "Aceite de oliva extra virgen 0,5 L"',
		],
	])("blocks a %s product", (_case, products, reason) => {
		expect(planDescriptions([entry], products)).toEqual([
			{ kind: "blocked", productId: 122, name: entry.name, reason },
		]);
	});
});

describe("applyDescription", () => {
	it("writes the description through the service", async () => {
		const update = vi.fn().mockResolvedValue(undefined);
		const outcome = await applyDescription(entry, {
			getById: async () => product(),
			update,
		});
		expect(outcome).toEqual({ kind: "applied" });
		expect(update).toHaveBeenCalledOnce();
		expect(update.mock.calls[0]?.[0]).toMatchObject({
			id: 122,
			description: entry.description,
		});
	});

	it("skips a product already up to date", async () => {
		const update = vi.fn();
		const outcome = await applyDescription(entry, {
			getById: async () => product({ description: entry.description }),
			update,
		});
		expect(outcome).toEqual({ kind: "skipped" });
		expect(update).not.toHaveBeenCalled();
	});

	it("does not write a product renamed since the dry run", async () => {
		const update = vi.fn();
		const outcome = await applyDescription(entry, {
			getById: async () => product({ name: "Otro" }),
			update,
		});
		expect(outcome).toMatchObject({ kind: "conflict" });
		expect(update).not.toHaveBeenCalled();
	});
});

describe("findDuplicateEntries", () => {
	it("flags a repeated id or name", () => {
		expect(findDuplicateEntries([entry, { ...entry, name: "Otro" }])).toEqual([
			"#122",
		]);
		expect(findDuplicateEntries([entry, { ...entry, productId: 1 }])).toEqual([
			entry.name,
		]);
	});
});

describe("arguments", () => {
	it("dry-runs by default", () => {
		expect(parseDescriptionArgs([])).toEqual({
			apply: false,
			confirmProduction: false,
			actorEmail: null,
		});
	});

	it("needs an actor to apply", () => {
		expect(() => parseDescriptionArgs(["--apply"])).toThrow(/--actor-email/);
		expect(
			parseDescriptionArgs(["--apply", "--actor-email", "admin@coco.app"]),
		).toMatchObject({ apply: true, actorEmail: "admin@coco.app" });
	});

	it("rejects unknown arguments", () => {
		expect(() => parseDescriptionArgs(["--force"])).toThrow(
			/Argumento desconocido/,
		);
	});

	it("needs a second flag to write to production", () => {
		const apply = parseDescriptionArgs([
			"--apply",
			"--actor-email=admin@coco.app",
		]);
		expect(() => assertApplyAllowed("production", apply)).toThrow(
			/--confirm-production/,
		);
		expect(() =>
			assertApplyAllowed("production", { ...apply, confirmProduction: true }),
		).not.toThrow();
		expect(() => assertApplyAllowed("development", apply)).not.toThrow();
		expect(() =>
			assertApplyAllowed("production", parseDescriptionArgs([])),
		).not.toThrow();
	});
});
