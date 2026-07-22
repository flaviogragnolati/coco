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
