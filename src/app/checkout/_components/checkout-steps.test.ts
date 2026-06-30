import assert from "node:assert/strict";
import test from "node:test";

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
	assert.deepEqual(
		ALL_STEPS.filter((step) => isStepReachable(step, selection)),
		["order"],
	);
	assert.equal(isStepComplete("order", selection), false);
	assert.equal(isStepComplete("shipping", selection), false);
	assert.equal(isStepComplete("payment", selection), false);
	assert.equal(isStepComplete("review", selection), false);
});

test("hasItems=false blocks every step past order", () => {
	const selection = makeSelection({
		addressId: 1,
		paymentMethodId: 2,
		acceptedTerms: true,
	});
	assert.equal(isStepReachable("order", selection), true);
	assert.equal(isStepReachable("shipping", selection), false);
	assert.equal(isStepReachable("payment", selection), false);
	assert.equal(isStepReachable("review", selection), false);
	assert.equal(canConfirm(selection), false);
});

test("items only: order complete, shipping reachable, payment/review locked", () => {
	const selection = makeSelection({ hasItems: true });
	assert.equal(isStepComplete("order", selection), true);
	assert.equal(isStepReachable("shipping", selection), true);
	assert.equal(isStepReachable("payment", selection), false);
	assert.equal(isStepReachable("review", selection), false);
});

test("address selected: payment reachable, review not", () => {
	const selection = makeSelection({ hasItems: true, addressId: 1 });
	assert.equal(isStepComplete("shipping", selection), true);
	assert.equal(isStepReachable("payment", selection), true);
	assert.equal(isStepReachable("review", selection), false);
	assert.equal(canConfirm(selection), false);
});

test("address + payment: review reachable but never complete; canConfirm needs terms", () => {
	const selection = makeSelection({
		hasItems: true,
		addressId: 1,
		paymentMethodId: 2,
	});
	assert.equal(isStepComplete("payment", selection), true);
	assert.equal(isStepReachable("review", selection), true);
	// review is terminal — never reported complete mid-flow
	assert.equal(isStepComplete("review", selection), false);
	assert.equal(canConfirm(selection), false);
});

test("full selection: canConfirm is true", () => {
	const selection = makeSelection({
		hasItems: true,
		addressId: 1,
		paymentMethodId: 2,
		acceptedTerms: true,
	});
	assert.equal(canConfirm(selection), true);
	// review stays non-complete even when everything is selected
	assert.equal(isStepComplete("review", selection), false);
	assert.equal(isStepReachable("review", selection), true);
});

test("nextStep advances only when the next step is reachable", () => {
	const empty = makeSelection();
	assert.equal(nextStep("order", empty), null);

	const items = makeSelection({ hasItems: true });
	assert.equal(nextStep("order", items), "shipping");
	assert.equal(nextStep("shipping", items), null);

	const withAddress = makeSelection({ hasItems: true, addressId: 1 });
	assert.equal(nextStep("shipping", withAddress), "payment");
	assert.equal(nextStep("payment", withAddress), null);

	const withPayment = makeSelection({
		hasItems: true,
		addressId: 1,
		paymentMethodId: 2,
	});
	assert.equal(nextStep("payment", withPayment), "review");
	assert.equal(nextStep("review", withPayment), null);
});

test("prevStep walks backwards positionally regardless of selection", () => {
	assert.equal(prevStep("order"), null);
	assert.equal(prevStep("shipping"), "order");
	assert.equal(prevStep("payment"), "shipping");
	assert.equal(prevStep("review"), "payment");
});
