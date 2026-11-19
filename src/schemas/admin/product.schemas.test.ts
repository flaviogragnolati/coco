import { expect, test } from "vitest";
import {
	PRODUCT_DESCRIPTION_MAX_LENGTH,
	productCreateInputSchema,
	productUpdateInputSchema,
} from "./product.schemas";

const base = {
	name: "Pasta de maní",
	images: [],
	brandAssignment: { mode: "none" },
	categoryId: 1,
};

test("a product sold by the unit takes a container and a size", () => {
	const parsed = productCreateInputSchema.parse({
		...base,
		unit: "piece",
		presentationContainer: "frasco",
		presentationSize: " 370 g ",
	});

	expect(parsed.presentationContainer).toBe("frasco");
	expect(parsed.presentationSize).toBe("370 g");
});

test("the empty select option means no presentation", () => {
	const parsed = productCreateInputSchema.parse({
		...base,
		unit: "piece",
		presentationContainer: "",
		presentationSize: "",
	});

	expect(parsed.presentationContainer).toBeUndefined();
	expect(parsed.presentationSize).toBeUndefined();
});

test.each([
	"kg",
	"gr",
	"lb",
] as const)("a product sold by weight (%s) carries no presentation", (unit) => {
	const result = productCreateInputSchema.safeParse({
		...base,
		unit,
		presentationContainer: "bolsa",
	});

	expect(result.success).toBe(false);
	expect(result.error?.issues[0]?.path).toEqual(["presentationContainer"]);
});

test("a size needs its container", () => {
	const result = productCreateInputSchema.safeParse({
		...base,
		unit: "piece",
		presentationSize: "0,5 L",
	});

	expect(result.success).toBe(false);
});

test("an unknown container is rejected", () => {
	expect(
		productCreateInputSchema.safeParse({
			...base,
			unit: "piece",
			presentationContainer: "caja",
		}).success,
	).toBe(false);
});

test("the description takes up to 200 characters after trimming", () => {
	const parsed = productCreateInputSchema.parse({
		...base,
		unit: "kg",
		description: ` ${"a".repeat(PRODUCT_DESCRIPTION_MAX_LENGTH)} `,
	});
	expect(parsed.description).toHaveLength(200);

	const result = productCreateInputSchema.safeParse({
		...base,
		unit: "kg",
		description: "a".repeat(PRODUCT_DESCRIPTION_MAX_LENGTH + 1),
	});
	expect(result.success).toBe(false);
	expect(result.error?.issues[0]).toMatchObject({
		path: ["description"],
		message: "La descripción no puede superar los 200 caracteres",
	});
});

test("editing a product applies the same description limit", () => {
	const result = productUpdateInputSchema.safeParse({
		...base,
		id: 1,
		unit: "kg",
		description: "a".repeat(PRODUCT_DESCRIPTION_MAX_LENGTH + 1),
	});
	expect(result.success).toBe(false);
	expect(result.error?.issues[0]?.path).toEqual(["description"]);
});

test("a blank description is no description", () => {
	const parsed = productCreateInputSchema.parse({
		...base,
		unit: "kg",
		description: "   ",
	});
	expect(parsed.description).toBeUndefined();
});
