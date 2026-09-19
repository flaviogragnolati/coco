/**
 * `"blocked"`: the server refused to merge the guest cart because the user's
 * cart is frozen under a payment in flight. The guest items stay local only.
 */
export type CartBootstrapState = "idle" | "running" | "done" | "blocked";

export type CheckoutStartGateInput = {
	bootstrapState: CartBootstrapState;
	hasHydrated: boolean;
};

/**
 * Whether `/checkout` may ask the server to start a checkout yet.
 *
 * Local hydration is not enough: a guest cart only reaches the server through
 * the cart bootstrap, which runs in the navbar, in a sibling of the checkout
 * screen. Starting before it finishes races it, and `checkout.start` answers a
 * cart-less server with "No encontramos un carrito activo para iniciar
 * checkout." (finding #2).
 *
 * `"done"` means the bootstrap finished, not that it succeeded — a failed merge
 * already told the user, and blocking here would leave the screen loading
 * forever. `"blocked"` does not open the gate: the server cart is the frozen
 * one, and checking it out would silently drop the guest items.
 */
export function canStartCheckout(input: CheckoutStartGateInput) {
	if (!input.hasHydrated) return false;

	return input.bootstrapState === "done";
}
