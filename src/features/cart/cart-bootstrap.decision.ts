import type { CartBootstrapState } from "./checkout-start-gate.decision";

export type CartBootstrapDecision = "merge" | "adopt" | "discard";

export type CartBootstrapInput = {
	itemCount: number;
	serverCartId: number | null;
	syncedUserId: string | null;
	userId: string;
};

/**
 * `discard` must be tested first: a cart attributed to another user also satisfies
 * both `merge` conditions, so any other ordering silently merges user A's items into
 * user B's server cart (finding #35).
 */
export function decideCartBootstrap(
	input: CartBootstrapInput,
): CartBootstrapDecision {
	if (input.syncedUserId !== null && input.syncedUserId !== input.userId) {
		return "discard";
	}

	if (
		input.itemCount > 0 &&
		(input.serverCartId === null || input.syncedUserId === null)
	) {
		return "merge";
	}

	return "adopt";
}

/**
 * Whether a refused edit may replace the store with the server's order. Not
 * while a blocked merge keeps guest products only in this browser: the server's
 * order lacks them, and replacing the store would drop them unannounced.
 */
export function canRestoreServerCart(bootstrapState: CartBootstrapState) {
	return bootstrapState !== "blocked";
}
