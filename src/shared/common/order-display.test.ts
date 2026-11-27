import { describe, expect, it, test } from "vitest";
import { formatCurrency } from "./commerce.helpers";
import {
	canRepeatOrder,
	customerOrderStatusView,
	formatOrderLineQuantityPrice,
	type OrderStatus,
	orderStatusFilterLabelMap,
	orderStatusLabelMap,
	selectOrderDisplayAttempt,
} from "./order-display";

test.each<[OrderStatus, boolean]>([
	["pending", false],
	["processing", true],
	["completed", true],
	["cancelled", true],
	["failed", true],
	["refunded", true],
	["chargedBack", true],
])("a %s order can be repeated: %s", (status, expected) => {
	expect(canRepeatOrder(status)).toBe(expected);
});

const almondTerms = {
	id: 5,
	moq: "0.5",
	moqPrice: "11300",
	step: "0.5",
	unitPrice: "22600",
	discountPercent: null,
	currency: "ARS",
};

const almond = {
	quantity: "1.5",
	productSnapshot: { product: { id: 1, name: "Almendra", unit: "kg" } },
	priceSnapshot: { productClientTerms: almondTerms, currency: "ARS" },
};

test("a line sold by weight shows the price per unit of weight", () => {
	expect(formatOrderLineQuantityPrice(almond)).toBe(
		`1,5 kg × ${formatCurrency(22600, "ARS")} / kg`,
	);
	expect(formatOrderLineQuantityPrice(almond)).toMatch(
		/^1,5 kg × \$\s22\.600 \/ kg$/,
	);
});

test("a line sold by the package shows the price of each one", () => {
	expect(
		formatOrderLineQuantityPrice({
			quantity: "2",
			productSnapshot: {
				product: {
					id: 2,
					name: "Miel",
					unit: "piece",
					presentationContainer: "frasco",
					presentationSize: "500 g",
				},
			},
			priceSnapshot: {
				productClientTerms: { ...almondTerms, unitPrice: "6500" },
			},
		}),
	).toMatch(/^2 frascos 500 g × \$\s6\.500 c\/u$/);
});

test("a discounted line shows the price that was charged", () => {
	expect(
		formatOrderLineQuantityPrice({
			...almond,
			priceSnapshot: {
				productClientTerms: { ...almondTerms, discountPercent: "10" },
			},
		}),
	).toMatch(/× \$\s20\.340 \/ kg$/);
});

test("a line whose snapshot froze no terms shows the quantity alone", () => {
	expect(
		formatOrderLineQuantityPrice({
			...almond,
			priceSnapshot: { lineTotal: "33900.00", currency: "ARS" },
		}),
	).toBe("1,5 kg");
});

test("an order shows the attempt that paid it, even when a newer one exists", () => {
	const paid = { id: 1, status: "completed" as const };
	const leftover = { id: 2, status: "cancelled" as const };
	expect(selectOrderDisplayAttempt([leftover, paid])).toBe(paid);
	expect(
		selectOrderDisplayAttempt([
			leftover,
			{ id: 3, status: "inProcess" as const },
		]),
	).toMatchObject({ id: 3 });
	expect(
		selectOrderDisplayAttempt([leftover, { id: 4, status: "failed" as const }]),
	).toBe(leftover);
	expect(selectOrderDisplayAttempt([])).toBeUndefined();
});

describe("customerOrderStatusView", () => {
	const order = (
		status: Parameters<typeof customerOrderStatusView>[0]["status"],
		overrides: Partial<Parameters<typeof customerOrderStatusView>[0]> = {},
	) =>
		customerOrderStatusView({
			status,
			latestTransactionStatus: "pending",
			receiptDeclared: false,
			...overrides,
		});

	it.each([
		["pending", "Esperando tu pago"],
		["processing", "En curso"],
		["completed", "Entregado"],
		["cancelled", "Cancelado"],
		["failed", "Fallido"],
		["refunded", "Reembolsado"],
		["chargedBack", "Contracargo"],
	] as const)("tells the customer a %s order is «%s»", (status, label) => {
		expect(order(status).label).toBe(label);
	});

	it("says a reported transfer is being verified", () => {
		expect(order("pending", { receiptDeclared: true })).toMatchObject({
			key: "verifyingPayment",
			label: "Verificando tu pago",
		});
	});

	it("says a payment the provider is processing is being verified", () => {
		expect(order("pending", { latestTransactionStatus: "inProcess" }).key).toBe(
			"verifyingPayment",
		);
	});

	it("only a pending order can be verifying its payment", () => {
		expect(order("processing", { receiptDeclared: true }).key).toBe(
			"inProgress",
		);
	});

	it("leaves the admin labels as they are", () => {
		expect(orderStatusLabelMap.pending).toBe("Pendiente");
		expect(orderStatusLabelMap.processing).toBe("En procesamiento");
		expect(orderStatusLabelMap.completed).toBe("Completado");
	});

	it("filters delivered orders under «Entregados»", () => {
		expect(orderStatusFilterLabelMap.completed).toBe("Entregados");
	});
});
