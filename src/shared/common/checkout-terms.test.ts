import { expect, test } from "vitest";

import { CHECKOUT_TERMS } from "./checkout-terms";

test("checkout terms are versioned past the lorem ipsum of checkout-v1", () => {
	expect(CHECKOUT_TERMS.version).toBe("checkout-v2");
	expect(CHECKOUT_TERMS.text).not.toMatch(/lorem ipsum/i);
	expect(CHECKOUT_TERMS.text.length).toBeGreaterThan(200);
});
