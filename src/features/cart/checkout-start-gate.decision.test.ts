import { expect, test } from "vitest";

import {
	type CartBootstrapState,
	canStartCheckout,
} from "./checkout-start-gate.decision";

const ALL_STATES: CartBootstrapState[] = ["idle", "running", "done", "blocked"];

test("nothing starts before the local cart hydrated", () => {
	for (const bootstrapState of ALL_STATES) {
		expect(canStartCheckout({ bootstrapState, hasHydrated: false })).toBe(
			false,
		);
	}
});

// Finding #2: this is the race - hydrated locally, but the guest cart has not
// reached the server yet.
test("a hydrated cart still waits while the bootstrap has not run", () => {
	expect(canStartCheckout({ bootstrapState: "idle", hasHydrated: true })).toBe(
		false,
	);
});

test("a hydrated cart still waits while the bootstrap is running", () => {
	expect(
		canStartCheckout({ bootstrapState: "running", hasHydrated: true }),
	).toBe(false);
});

// Any failure other than a refused merge also lands on "done", so checkout is
// free to start and produce its own error.
test("checkout starts once the bootstrap finished, however it ended", () => {
	expect(canStartCheckout({ bootstrapState: "done", hasHydrated: true })).toBe(
		true,
	);
});

// The server kept its frozen cart and the guest items stayed local; checking
// out the frozen cart would drop them without a word.
test("a refused guest merge keeps checkout closed", () => {
	expect(
		canStartCheckout({ bootstrapState: "blocked", hasHydrated: true }),
	).toBe(false);
});
