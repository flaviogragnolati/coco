import { expect, test } from "vitest";

import {
	type CartBootstrapInput,
	decideCartBootstrap,
} from "./cart-bootstrap.decision";

function makeInput(
	overrides: Partial<CartBootstrapInput> = {},
): CartBootstrapInput {
	return {
		itemCount: 0,
		serverCartId: null,
		syncedUserId: null,
		userId: "user-b",
		...overrides,
	};
}

// Finding #35: under the old boolean this merged user A's items into user B's cart.
test("a cart attributed to another user is discarded, never merged", () => {
	expect(
		decideCartBootstrap(
			makeInput({ itemCount: 2, serverCartId: null, syncedUserId: "user-a" }),
		),
	).toBe("discard");
});

test("a cart attributed to another user is discarded even when server-linked", () => {
	expect(
		decideCartBootstrap(
			makeInput({ itemCount: 2, serverCartId: 42, syncedUserId: "user-a" }),
		),
	).toBe("discard");
});

// Guardrail: the guest -> login merge is the whole reason syncLocal exists.
test("an unattributed guest cart still merges on login", () => {
	expect(
		decideCartBootstrap(
			makeInput({ itemCount: 2, serverCartId: null, syncedUserId: null }),
		),
	).toBe("merge");
});

test("the user's own cart merges when it lost its server link", () => {
	expect(
		decideCartBootstrap(
			makeInput({ itemCount: 2, serverCartId: null, syncedUserId: "user-b" }),
		),
	).toBe("merge");
});

test("a cart already synced to this user is adopted", () => {
	expect(
		decideCartBootstrap(
			makeInput({ itemCount: 2, serverCartId: 42, syncedUserId: "user-b" }),
		),
	).toBe("adopt");
});

test("an empty local cart is adopted regardless of attribution", () => {
	expect(decideCartBootstrap(makeInput({ itemCount: 0 }))).toBe("adopt");
	expect(
		decideCartBootstrap(makeInput({ itemCount: 0, syncedUserId: "user-b" })),
	).toBe("adopt");
});
