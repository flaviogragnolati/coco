import { expect, test } from "vitest";

import { orderReturnPath, readExternalReference } from "./mercadopago-return";

test.each([
	["user_transaction:241", "user_transaction:241"],
	[" user_transaction:241 ", "user_transaction:241"],
	[["user_transaction:241", "user_transaction:9"], "user_transaction:241"],
	[undefined, null],
	["", null],
	["   ", null],
	["x".repeat(65), null],
])("reads the reference %j as %j", (value, expected) => {
	expect(readExternalReference(value)).toBe(expected);
});

test("lands on the order with the Mercado Pago arrival", () => {
	expect(orderReturnPath(222)).toBe("/my-orders/222?llegada=mp");
});
