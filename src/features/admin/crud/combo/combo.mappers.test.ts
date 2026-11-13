import { expect, it } from "vitest";
import type { ComboProductOption } from "~/shared/common/admin-crud/combo.types";
import { describeComboQuantityRule } from "./combo.mappers";

const almond: ComboProductOption = {
	productId: 1,
	name: "Almendra",
	unit: "kg",
	presentationContainer: null,
	presentationSize: null,
	moq: "1",
	step: "0.5",
	max: "1",
	currency: "ARS",
};

it("explains a quantity as fixed when its cap leaves no further step", () => {
	expect(describeComboQuantityRule(almond)).toBe("Cantidad fija: 1 kg");
});

it("explains the minimum, step and cap when another quantity is possible", () => {
	expect(describeComboQuantityRule({ ...almond, max: "2" })).toBe(
		"Mínimo 1 kg, de a 0,5 kg, hasta 2 kg",
	);
});
