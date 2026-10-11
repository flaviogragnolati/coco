import { expect, test } from "vitest";
import { productCreateInputSchema } from "./product.schemas";

const base = {
	name: "Pasta de maní",
	images: [],
	brandAssignment: { mode: "none" },
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
