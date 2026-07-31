import { beforeAll, expect, test, vi } from "vitest";

// The service is `server-only` and pulls in the Mercado Pago SDK through
// `createMercadoPagoClient`, which reads the access token from the environment.
// Neither is reachable from `buildPreferenceLines`, so both are stubbed rather
// than provisioned.
vi.mock("server-only", () => ({}));
vi.mock("~/lib/mercadopago/client", () => ({
	createMercadoPagoClient: () => {
		throw new Error("not used by buildPreferenceLines");
	},
}));

let buildPreferenceLines: typeof import("./mercadopago-preference.service").buildPreferenceLines;

beforeAll(async () => {
	({ buildPreferenceLines } = await import("./mercadopago-preference.service"));
});

function cart(termsOverrides: Record<string, unknown>) {
	return {
		cartItems: [
			{
				quantity: "100",
				productClientTerms: {
					id: 1,
					moq: "100",
					moqPrice: "500",
					step: null,
					stepPrice: null,
					max: null,
					unitPrice: null,
					marketPrice: null,
					discountPercent: null,
					currency: "ARS",
					fromDate: new Date("2026-01-01T00:00:00.000Z"),
					toDate: null,
					product: { id: 9, name: "Tomate" },
					...termsOverrides,
				},
			},
		],
		// biome-ignore lint/suspicious/noExplicitAny: structural stand-in for the checkout select
	} as any;
}

test("prices a line with no discount at the full amount", () => {
	expect(buildPreferenceLines(cart({}))).toEqual([
		{
			id: "9",
			title: "Tomate",
			requestedQuantity: "100",
			lineTotal: "500.00",
			currency: "ARS",
		},
	]);
});

// The regression this file exists for: the preference used to hand-build its own
// terms literal, so a new pricing field reached the catalog and not the payment.
test("prices a discounted line at the discounted amount", () => {
	const [line] = buildPreferenceLines(cart({ discountPercent: "25" }));

	expect(line?.lineTotal).toBe("375.00");
});

test("discounts steps as well as the minimum block", () => {
	const withSteps = cart({
		step: "10",
		stepPrice: "50",
		discountPercent: "25",
	});
	withSteps.cartItems[0].quantity = "1000";

	expect(buildPreferenceLines(withSteps)[0]?.lineTotal).toBe("3750.00");
});

test("the market price never reaches the amount charged", () => {
	const [line] = buildPreferenceLines(cart({ marketPrice: "9999" }));

	expect(line?.lineTotal).toBe("500.00");
});
