import { expect, test } from "vitest";
import {
	getQuantityFieldLabel,
	getQuantitySuffix,
} from "./quantity-stepper.labels";

const jar = {
	presentationContainer: "frasco",
	presentationSize: "370 g",
} as const;

test("the field is named after the plural unit it counts", () => {
	expect(getQuantityFieldLabel("kg")).toBe("Cantidad (kg)");
	expect(getQuantityFieldLabel("piece")).toBe("Cantidad (unidades)");
	expect(getQuantityFieldLabel("piece", jar)).toBe("Cantidad (frascos 370 g)");
	expect(getQuantityFieldLabel("kg", jar)).toBe("Cantidad (kg)");
});

test("the suffix agrees with the typed quantity", () => {
	expect(getQuantitySuffix("1", "2", "piece", jar)).toBe("frasco 370 g");
	expect(getQuantitySuffix("2", "1", "piece", jar)).toBe("frascos 370 g");
	expect(getQuantitySuffix("16", "1", "piece")).toBe("unidades");
	expect(getQuantitySuffix("1,5", "1", "kg")).toBe("kg");
});

test("an unreadable draft keeps the committed quantity's suffix", () => {
	expect(getQuantitySuffix("", "1", "box")).toBe("caja");
	expect(getQuantitySuffix("abc", "3", "box")).toBe("cajas");
});
