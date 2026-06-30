/**
 * Pure step model for the checkout flow. No React, no I/O — encodes the lock
 * rules for the 4-step flow (Pedido → Envío → Pago → Confirmar) so the stepper
 * and orchestrator can derive completed/active/locked states from a single
 * source of truth. Unit-tested in `checkout-steps.test.ts`.
 *
 * Mirrors the pure-helper shape of `catalog-filtering.ts`.
 */

export type CheckoutStepId = "order" | "shipping" | "payment" | "review";

export type CheckoutStepDefinition = {
	id: CheckoutStepId;
	label: string;
	shortLabel: string;
};

export const CHECKOUT_STEPS: CheckoutStepDefinition[] = [
	{ id: "order", label: "Pedido", shortLabel: "Pedido" },
	{ id: "shipping", label: "Envío", shortLabel: "Envío" },
	{ id: "payment", label: "Pago", shortLabel: "Pago" },
	{ id: "review", label: "Confirmar", shortLabel: "Confirmar" },
];

export type CheckoutSelection = {
	hasItems: boolean;
	addressId: number | null;
	paymentMethodId: number | null;
	acceptedTerms: boolean;
};

/**
 * A step is "complete" when its requirement is satisfied. `review` is the
 * terminal step and is never reported as complete mid-flow, so the stepper
 * never renders a premature green checkmark on the final circle.
 */
export function isStepComplete(
	step: CheckoutStepId,
	selection: CheckoutSelection,
): boolean {
	switch (step) {
		case "order":
			return selection.hasItems;
		case "shipping":
			return selection.addressId !== null;
		case "payment":
			return selection.paymentMethodId !== null;
		case "review":
			return false;
	}
}

/**
 * Reachability is cumulative: a step is reachable only when every prior step is
 * complete. This keeps forward steps locked until prerequisites are met and
 * naturally re-locks everything past `order` if the cart is emptied mid-flow.
 */
export function isStepReachable(
	step: CheckoutStepId,
	selection: CheckoutSelection,
): boolean {
	switch (step) {
		case "order":
			return true;
		case "shipping":
			return isStepComplete("order", selection);
		case "payment":
			return (
				isStepComplete("order", selection) &&
				isStepComplete("shipping", selection)
			);
		case "review":
			return (
				isStepComplete("order", selection) &&
				isStepComplete("shipping", selection) &&
				isStepComplete("payment", selection)
			);
	}
}

/**
 * The next reachable forward step from `current`, or `null` when there is no
 * reachable step ahead (either `current` is incomplete or it is the last step).
 */
export function nextStep(
	current: CheckoutStepId,
	selection: CheckoutSelection,
): CheckoutStepId | null {
	const index = CHECKOUT_STEPS.findIndex((step) => step.id === current);
	if (index === -1) return null;

	for (let next = index + 1; next < CHECKOUT_STEPS.length; next += 1) {
		const candidate = CHECKOUT_STEPS[next];
		if (candidate && isStepReachable(candidate.id, selection)) {
			return candidate.id;
		}
	}

	return null;
}

/** The previous step from `current`, or `null` when `current` is the first. */
export function prevStep(current: CheckoutStepId): CheckoutStepId | null {
	const index = CHECKOUT_STEPS.findIndex((step) => step.id === current);
	if (index <= 0) return null;
	return CHECKOUT_STEPS[index - 1]?.id ?? null;
}

/** Whether the order can be confirmed (all selections present + terms accepted). */
export function canConfirm(selection: CheckoutSelection): boolean {
	return (
		selection.hasItems &&
		selection.addressId !== null &&
		selection.paymentMethodId !== null &&
		selection.acceptedTerms
	);
}
