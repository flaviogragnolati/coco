import { expect, test } from "vitest";
import { deriveClientTermsPrices } from "./client-terms-prices";

test("derives the minimum and step prices from the unit price", () => {
	expect(
		deriveClientTermsPrices({ unitPrice: "19500", moq: "0.5", step: "0.5" }),
	).toEqual({ moqPrice: "9750.00", stepPrice: "9750.00" });
});

test("a fixed quantity has no step price", () => {
	expect(
		deriveClientTermsPrices({ unitPrice: "4900", moq: "12", step: null }),
	).toEqual({ moqPrice: "58800.00", stepPrice: null });
});

test("rounds half a cent up, like the catalog data", () => {
	expect(
		deriveClientTermsPrices({ unitPrice: "763.89", moq: "0.5", step: "1.5" }),
	).toEqual({ moqPrice: "381.95", stepPrice: "1145.84" });
});
