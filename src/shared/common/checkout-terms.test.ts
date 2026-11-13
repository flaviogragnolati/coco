import { expect, test } from "vitest";

import { CHECKOUT_TERMS } from "./checkout-terms";

test("checkout terms are versioned past the lorem ipsum of checkout-v1", () => {
	expect(CHECKOUT_TERMS.version).toBe("checkout-v4");
	expect(CHECKOUT_TERMS.text).not.toMatch(/lorem ipsum/i);
	expect(CHECKOUT_TERMS.text.length).toBeGreaterThan(200);
});

test("checkout-v4 states the transfer discount and its rounding", () => {
	expect(CHECKOUT_TERMS.text).toContain("descuento");
	expect(CHECKOUT_TERMS.text).toContain("redondea");
});
