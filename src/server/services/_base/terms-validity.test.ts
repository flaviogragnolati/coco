import { expect, test } from "vitest";
import {
	isClientTermsUsable,
	isSupplierTermsUsable,
	isTermsWindowCurrent,
	type TermsWindow,
} from "./terms-validity";

const now = new Date("2026-06-08T12:00:00.000Z");

function window(input: Partial<TermsWindow> = {}): TermsWindow {
	return {
		active: input.active ?? true,
		deleted: input.deleted ?? false,
		fromDate: input.fromDate ?? new Date("2026-01-01T00:00:00.000Z"),
		toDate: input.toDate === undefined ? null : input.toDate,
	};
}

test("an open-ended window is current", () => {
	expect(isTermsWindowCurrent(window(), now)).toBe(true);
});

test("the lower bound is inclusive", () => {
	expect(isTermsWindowCurrent(window({ fromDate: now }), now)).toBe(true);
});

test("the upper bound is inclusive", () => {
	expect(isTermsWindowCurrent(window({ toDate: now }), now)).toBe(true);
});

test("a window that has not opened yet is not current", () => {
	expect(
		isTermsWindowCurrent(
			window({ fromDate: new Date("2026-06-09T00:00:00.000Z") }),
			now,
		),
	).toBe(false);
});

test("a window that has closed is not current", () => {
	expect(
		isTermsWindowCurrent(
			window({ toDate: new Date("2026-06-07T00:00:00.000Z") }),
			now,
		),
	).toBe(false);
});

test("inactive or deleted terms are not current", () => {
	expect(isTermsWindowCurrent(window({ active: false }), now)).toBe(false);
	expect(isTermsWindowCurrent(window({ deleted: true }), now)).toBe(false);
});

test("client terms require a usable product", () => {
	expect(
		isClientTermsUsable(
			{ ...window(), product: { active: true, deleted: false } },
			now,
		),
	).toBe(true);

	expect(
		isClientTermsUsable(
			{ ...window(), product: { active: false, deleted: false } },
			now,
		),
	).toBe(false);

	expect(
		isClientTermsUsable(
			{ ...window(), product: { active: true, deleted: true } },
			now,
		),
	).toBe(false);
});

test("supplier terms require a usable supplier", () => {
	expect(
		isSupplierTermsUsable(
			{ ...window(), supplier: { active: true, deleted: false } },
			now,
		),
	).toBe(true);

	expect(
		isSupplierTermsUsable(
			{ ...window(), supplier: { active: false, deleted: false } },
			now,
		),
	).toBe(false);

	expect(
		isSupplierTermsUsable(
			{ ...window(), supplier: { active: true, deleted: true } },
			now,
		),
	).toBe(false);
});
