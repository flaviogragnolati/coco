import { beforeAll, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

let service: typeof import("./external-payment-config.service");

beforeAll(async () => {
	service = await import("./external-payment-config.service");
});

function databaseWith(row: { enabled: boolean; settings: unknown } | null) {
	return {
		paymentProviderConfig: { findUnique: vi.fn(async () => row) },
	} as unknown as Parameters<
		typeof service.getPublicTransferDiscountPercent
	>[0];
}

const settings = { accountHolder: "Coco", bankName: "Banco", cbu: "000" };

test("a disabled external provider shows no transfer discount", async () => {
	await expect(
		service.getPublicTransferDiscountPercent(
			databaseWith({
				enabled: false,
				settings: { ...settings, transferDiscountPercent: 10 },
			}),
		),
	).resolves.toBeNull();
});

test("a zero percent shows no transfer discount", async () => {
	await expect(
		service.getPublicTransferDiscountPercent(
			databaseWith({
				enabled: true,
				settings: { ...settings, transferDiscountPercent: 0 },
			}),
		),
	).resolves.toBeNull();
});

test("an enabled provider shows its percent", async () => {
	await expect(
		service.getPublicTransferDiscountPercent(
			databaseWith({
				enabled: true,
				settings: { ...settings, transferDiscountPercent: 10 },
			}),
		),
	).resolves.toBe(10);
});

test("settings saved before the discount existed show none", async () => {
	await expect(
		service.getPublicTransferDiscountPercent(
			databaseWith({ enabled: true, settings }),
		),
	).resolves.toBeNull();
	await expect(
		service.getPublicTransferDiscountPercent(databaseWith(null)),
	).resolves.toBeNull();
});

test("the setting takes up to two decimals and at most 50", () => {
	expect(
		service.parseExternalPaymentSettings({ transferDiscountPercent: 7.55 })
			.transferDiscountPercent,
	).toBe(7.55);
	expect(() =>
		service.parseExternalPaymentSettings({ transferDiscountPercent: 7.555 }),
	).toThrow();
	expect(() =>
		service.parseExternalPaymentSettings({ transferDiscountPercent: 50.01 }),
	).toThrow();
	expect(() =>
		service.parseExternalPaymentSettings({ transferDiscountPercent: -1 }),
	).toThrow();
});
