import { describe, expect, it } from "vitest";

import {
	isTutorialInvitationEligible,
	shouldShowTutorialInvitation,
} from "./tutorial-invitation.decision";

const customer = {
	active: true,
	deleted: false,
	tutorialInvitationAnsweredAt: null,
};

describe("isTutorialInvitationEligible", () => {
	it("is eligible while the invitation is unanswered", () => {
		expect(isTutorialInvitationEligible(customer)).toBe(true);
		expect(isTutorialInvitationEligible({ active: true, deleted: false })).toBe(
			true,
		);
	});

	it.each([null, undefined])("is not eligible as a guest (%s)", (user) => {
		expect(isTutorialInvitationEligible(user)).toBe(false);
	});

	it("is not eligible when inactive or deleted", () => {
		expect(isTutorialInvitationEligible({ ...customer, active: false })).toBe(
			false,
		);
		expect(isTutorialInvitationEligible({ ...customer, deleted: true })).toBe(
			false,
		);
	});

	it("is not eligible once answered", () => {
		expect(
			isTutorialInvitationEligible({
				...customer,
				tutorialInvitationAnsweredAt: new Date("2026-11-01T12:00:00Z"),
			}),
		).toBe(false);
	});
});

describe("shouldShowTutorialInvitation", () => {
	const show = (pathname: string, overrides = {}) =>
		shouldShowTutorialInvitation({
			eligible: true,
			answeredLocally: false,
			pathname,
			...overrides,
		});

	it.each([
		"/",
		"/products",
		"/my-orders",
		"/my-orders/3",
		"/cart",
		"/checkoutx",
		"/loginx",
	])("shows on %s", (pathname) => {
		expect(show(pathname)).toBe(true);
	});

	it.each([
		"/login",
		"/login/callback",
		"/checkout",
		"/checkout/mercadopago/success",
		"/checkout/mercadopago/failure",
		"/checkout/mercadopago/pending",
	])("waits on %s", (pathname) => {
		expect(show(pathname)).toBe(false);
	});

	it("hides once answered on this page", () => {
		expect(show("/", { answeredLocally: true })).toBe(false);
	});

	it("never shows to an ineligible user", () => {
		expect(show("/", { eligible: false })).toBe(false);
	});
});
