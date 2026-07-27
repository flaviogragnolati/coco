/**
 * Exact 4-decimal arithmetic for the confirm dialog's cut preview, on scaled
 * `bigint` rather than `number`: quantities are `Decimal(18,4)` end to end and a
 * float round-trip would desynchronise the preview from what the server plans.
 */

const SCALE = 4;
const SCALE_FACTOR = 10n ** BigInt(SCALE);
const DECIMAL_PATTERN = /^\d+(?:\.\d{1,4})?$/;

export function isQuantityInput(value: string): boolean {
	return DECIMAL_PATTERN.test(value.trim());
}

export function toScaled(value: string): bigint | null {
	const trimmed = value.trim();
	if (!isQuantityInput(trimmed)) return null;

	const [whole = "0", fraction = ""] = trimmed.split(".");
	return BigInt(whole) * SCALE_FACTOR + BigInt(fraction.padEnd(SCALE, "0"));
}

export function fromScaled(scaled: bigint): string {
	const negative = scaled < 0n;
	const absolute = negative ? -scaled : scaled;
	const whole = absolute / SCALE_FACTOR;
	const fraction = (absolute % SCALE_FACTOR)
		.toString()
		.padStart(SCALE, "0")
		.replace(/0+$/, "");

	return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function sumScaled(values: bigint[]): bigint {
	return values.reduce((total, value) => total + value, 0n);
}

export type AbsorptionPreviewEntry = {
	allocationId: number;
	removedQuantity: string;
	remainingQuantity: string;
};

/**
 * Client-side mirror of `planCutAbsorption`'s LIFO walk. Advisory only — the
 * server replans from its own candidates and its plan is the one that lands.
 */
export function previewLifoAbsorption(
	allocations: Array<{ id: number; quantity: string }>,
	cut: bigint,
): AbsorptionPreviewEntry[] {
	let remaining = cut;
	const entries: AbsorptionPreviewEntry[] = [];

	for (const allocation of allocations) {
		if (remaining <= 0n) break;

		const available = toScaled(allocation.quantity) ?? 0n;
		if (available <= 0n) continue;

		const removed = remaining > available ? available : remaining;
		entries.push({
			allocationId: allocation.id,
			removedQuantity: fromScaled(removed),
			remainingQuantity: fromScaled(available - removed),
		});
		remaining -= removed;
	}

	return entries;
}
