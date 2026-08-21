export type CartBootstrapState = "idle" | "running" | "done";

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
 * forever.
 */
export function canStartCheckout(input: CheckoutStartGateInput) {
	if (!input.hasHydrated) return false;

	return input.bootstrapState === "done";
}
