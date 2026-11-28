/**
 * What a Mercado Pago back URL brings: the preference's external reference,
 * which points at the attempt (ADR 0015). Mercado Pago appends it to the
 * query; anything malformed is no reference, and the server decides whether it
 * is the user's. No React, no I/O.
 */

/** Longest reference CoCo writes: `user_transaction:` plus an `int` id. */
const MAX_REFERENCE_LENGTH = 64;

export function readExternalReference(
	value: string | string[] | undefined,
): string | null {
	const first = Array.isArray(value) ? value[0] : value;
	if (typeof first !== "string") return null;
	const trimmed = first.trim();
	return trimmed.length > 0 && trimmed.length <= MAX_REFERENCE_LENGTH
		? trimmed
		: null;
}

/** Where the customer lands once the order is known. */
export function orderReturnPath(orderId: number) {
	return `/my-orders/${orderId}?llegada=mp`;
}
