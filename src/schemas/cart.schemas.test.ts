import { expect, test } from "vitest";
import { cartSetItemQuantityInputSchema } from "./cart.schemas";

test("a half kilo is a valid cart quantity", () => {
	expect(
		cartSetItemQuantityInputSchema.parse({
			productClientTermsId: 1,
			quantity: "0.5",
		}).quantity,
	).toBe("0.5");
});

test("zero and unreadable quantities are refused", () => {
	for (const quantity of ["0", "abc"]) {
		expect(
			cartSetItemQuantityInputSchema.safeParse({
				productClientTermsId: 1,
				quantity,
			}).success,
		).toBe(false);
	}
});
