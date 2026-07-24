import { expect, test } from "vitest";

import {
	type CheckoutSelection,
	type CheckoutStepId,
	canConfirm,
	isStepComplete,
	isStepReachable,
	nextStep,
	prevStep,
} from "./checkout-steps";

function makeSelection(
	overrides: Partial<CheckoutSelection> = {},
): CheckoutSelection {
	return {
		hasItems: false,
		addressId: null,
		paymentMethodId: null,
		acceptedTerms: false,
		...overrides,
	};
}

const ALL_STEPS: CheckoutStepId[] = ["order", "shipping", "payment", "review"];

test("empty selection: only order is reachable, nothing complete", () => {
	const selection = makeSelection();
	expect(
		ALL_STEPS.filter((step) => isStepReachable(step, selection)),
	).toStrictEqual(["order"]);
	expect(isStepComplete("order", selection)).toBe(false);
	expect(isStepComplete("shipping", selection)).toBe(false);
	expect(isStepComplete("payment", selection)).toBe(false);
	expect(isStepComplete("review", selection)).toBe(false);
});

test("hasItems=false blocks every step past order", () => {
	const selection = makeSelection({
		addressId: 1,
		paymentMethodId: 2,
		acceptedTerms: true,
	});
	expect(isStepReachable("order", selection)).toBe(true);
	expect(isStepReachable("shipping", selection)).toBe(false);
	expect(isStepReachable("payment", selection)).toBe(false);
	expect(isStepReachable("review", selection)).toBe(false);
	expect(canConfirm(selection)).toBe(false);
});

test("items only: order complete, shipping reachable, payment/review locked", () => {
	const selection = makeSelection({ hasItems: true });
	expect(isStepComplete("order", selection)).toBe(true);
	expect(isStepReachable("shipping", selection)).toBe(true);
	expect(isStepReachable("payment", selection)).toBe(false);
	expect(isStepReachable("review", selection)).toBe(false);
});

test("address selected: payment reachable, review not", () => {
	const selection = makeSelection({ hasItems: true, addressId: 1 });
	expect(isStepComplete("shipping", selection)).toBe(true);
	expect(isStepReachable("payment", selection)).toBe(true);
	expect(isStepReachable("review", selection)).toBe(false);
	expect(canConfirm(selection)).toBe(false);
});

test("address + payment: review reachable but never complete; canConfirm needs terms", () => {
	const selection = makeSelection({
		hasItems: true,
		addressId: 1,
		paymentMethodId: 2,
	});
	expect(isStepComplete("payment", selection)).toBe(true);
	expect(isStepReachable("review", selection)).toBe(true);
	// review is terminal — never reported complete mid-flow
	expect(isStepComplete("review", selection)).toBe(false);
	expect(canConfirm(selection)).toBe(false);
});

test("full selection: canConfirm is true", () => {
	const selection = makeSelection({
		hasItems: true,
		addressId: 1,
		paymentMethodId: 2,
		acceptedTerms: true,
	});
	expect(canConfirm(selection)).toBe(true);
	// review stays non-complete even when everything is selected
	expect(isStepComplete("review", selection)).toBe(false);
	expect(isStepReachable("review", selection)).toBe(true);
});

test("nextStep advances only when the next step is reachable", () => {
	const empty = makeSelection();
	expect(nextStep("order", empty)).toBe(null);

	const items = makeSelection({ hasItems: true });
	expect(nextStep("order", items)).toBe("shipping");
	expect(nextStep("shipping", items)).toBe(null);

	const withAddress = makeSelection({ hasItems: true, addressId: 1 });
	expect(nextStep("shipping", withAddress)).toBe("payment");
	expect(nextStep("payment", withAddress)).toBe(null);

	const withPayment = makeSelection({
		hasItems: true,
		addressId: 1,
		paymentMethodId: 2,
	});
	expect(nextStep("payment", withPayment)).toBe("review");
	expect(nextStep("review", withPayment)).toBe(null);
});

test("prevStep walks backwards positionally regardless of selection", () => {
	expect(prevStep("order")).toBe(null);
	expect(prevStep("shipping")).toBe("order");
	expect(prevStep("payment")).toBe("shipping");
	expect(prevStep("review")).toBe("payment");
});
