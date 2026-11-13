import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { toOfferPricing } from "~/features/catalog/purchase-panel";
import { getOfferHeadlinePrice } from "~/features/home/home-formatters";
import { cartSnapshotSchema } from "~/schemas/cart.schemas";
import { catalogProductListOutputSchema } from "~/schemas/catalog.schemas";
import {
	checkoutPaymentResultSchema,
	checkoutStateSchema,
	orderDetailSchema,
	orderListOutputSchema,
} from "~/schemas/checkout.schemas";
import { userOrderItemTimelinesOutputSchema } from "~/schemas/tracking.schemas";
import {
	calculateLineTotal,
	formatCurrency,
} from "~/shared/common/commerce.helpers";
import { describeOrderDelivery } from "~/shared/common/delivery-display";
import { formatOrderLineQuantityPrice } from "~/shared/common/order-display";
import { userTrackingStageKeys } from "~/shared/common/tracking-display";
import { applyTransferDiscount } from "~/shared/common/transfer-discount";
import {
	buildTutorialFixtures,
	TUTORIAL_TRANSFER_DISCOUNT_PERCENT,
} from "./tutorial-fixtures";

const now = new Date("2026-11-06T15:00:00.000Z");
const fixtures = buildTutorialFixtures(now);

/** es-AR currency output separates "$" with a no-break space. */
function plain(text: string) {
	return text.replace(/ /g, " ");
}

describe("tutorial fixtures match the real output schemas", () => {
	it("catalog", () => {
		expect(() =>
			catalogProductListOutputSchema.parse(fixtures.catalogProducts),
		).not.toThrow();
		expect(fixtures.catalogProducts).toHaveLength(6);
	});

	it("carts", () => {
		for (const cart of [
			fixtures.cartAfterFirstAdd,
			fixtures.cart,
			fixtures.checkoutState.cart,
		]) {
			expect(() => cartSnapshotSchema.parse(cart)).not.toThrow();
		}
	});

	it("checkout, payment and orders", () => {
		expect(() =>
			checkoutStateSchema.parse(fixtures.checkoutState),
		).not.toThrow();
		expect(() =>
			checkoutPaymentResultSchema.parse(fixtures.paymentResult),
		).not.toThrow();
		expect(() => orderListOutputSchema.parse(fixtures.orderList)).not.toThrow();
	});

	it.each([
		...userTrackingStageKeys,
		"delivered" as const,
	])("order detail at %s", (journey) => {
		const { order, timelines } = fixtures.orderDetail(journey);
		expect(() => orderDetailSchema.parse(order)).not.toThrow();
		expect(() =>
			userOrderItemTimelinesOutputSchema.parse(timelines),
		).not.toThrow();
	});
});

describe("tutorial fixture amounts", () => {
	it("prices Almendra at its step through the card's own helper", () => {
		const almendra = fixtures.featuredProduct;
		const headline = getOfferHeadlinePrice(
			toOfferPricing(almendra.terms, almendra.unit, almendra),
		);
		expect(plain(headline.amount)).toBe("$ 11.300");
		expect(headline.unitLabel).toBe("por 500 g");
	});

	it("line totals are what the cart computes for each quantity", () => {
		for (const item of fixtures.cart.items) {
			expect(item.lineTotal).toBe(
				calculateLineTotal(item.terms, item.quantity),
			);
		}
	});

	it("the cart totals $ 34.900 and every later record carries that total", () => {
		const [total] = fixtures.cart.totals;
		expect(total).toEqual({ currency: "ARS", amount: "34900.00" });
		expect(plain(formatCurrency(total?.amount ?? "", "ARS"))).toBe("$ 34.900");
		expect(fixtures.checkoutState.cart.totals).toEqual(fixtures.cart.totals);
		expect(fixtures.paymentResult.transaction.amount).toBe("34900.00");
		expect(fixtures.orderList[0]?.totalAmount).toBe("34900.00");
		expect(fixtures.orderDetail("shipping").order.totalAmount).toBe("34900.00");
	});

	it("paying by transfer would cost $ 31.410, while the Mercado Pago payment carries no discount", () => {
		const [total] = fixtures.cart.totals;
		expect(
			applyTransferDiscount({
				subtotal: total?.amount ?? "0",
				percent: TUTORIAL_TRANSFER_DISCOUNT_PERCENT,
				currency: "ARS",
			})?.total,
		).toBe("31410.00");
		expect(fixtures.checkoutState.transferDiscountPercent).toBe(
			TUTORIAL_TRANSFER_DISCOUNT_PERCENT,
		);
		expect(fixtures.paymentResult.transaction).toMatchObject({
			amount: "34900.00",
			transferDiscountAmount: null,
		});
	});

	it("every product image is a file served from public/tutorial", () => {
		for (const product of fixtures.catalogProducts) {
			if (product.imageUrl === null) continue;
			const file = new URL(
				`../../../public${product.imageUrl}`,
				import.meta.url,
			);
			expect(existsSync(file), product.imageUrl).toBe(true);
		}
	});

	it("the first add puts only Almendra in the order", () => {
		expect(
			fixtures.cartAfterFirstAdd.items.map((item) => item.product.name),
		).toEqual(["Almendra Non Pareil"]);
	});

	it("checkout picks home delivery and Mercado Pago, the only path shown", () => {
		expect(fixtures.deliverySelection.mode).toBe("homeDelivery");
		expect(fixtures.paymentMethod.provider).toBe("mercadopago");
		expect(
			fixtures.checkoutState.paymentMethods.map((method) => method.provider),
		).toEqual(["mercadopago", "external"]);
	});

	it("the order detail reads its delivery address and product names", () => {
		const { order, journeyView } = fixtures.orderDetail("shipping");
		expect(describeOrderDelivery(order)?.place).toBe(
			"Av. San Martín 1234 · Ushuaia, Tierra del Fuego 9410",
		);
		expect(journeyView.mode).toBe("unified");
	});

	it("the order detail shows the price each line was charged per kg", () => {
		const [firstLine] = fixtures.orderDetail("shipping").order.items;
		if (!firstLine) throw new Error("Empty tutorial order");
		const label = plain(formatOrderLineQuantityPrice(firstLine));

		expect(label).toContain("× ");
		expect(label).toContain("/ kg");
		expect(label).toBe("0,5 kg × $ 22.600 / kg");
	});
});

describe("tutorial fixture journeys", () => {
	it.each(userTrackingStageKeys)("%s is the one current stage", (journey) => {
		const { journeyView } = fixtures.orderDetail(journey);
		if (journeyView.mode !== "unified") throw new Error(journeyView.mode);

		const current = journeyView.stages.filter(
			(stage) => stage.status === "current",
		);
		expect(current.map((stage) => stage.key)).toEqual([journey]);
	});

	it("delivered completes every stage and the order", () => {
		const { order, journeyView } = fixtures.orderDetail("delivered");
		if (journeyView.mode !== "unified") throw new Error(journeyView.mode);

		expect(
			journeyView.stages.every((stage) => stage.status === "completed"),
		).toBe(true);
		expect(order.status).toBe("completed");
	});

	it("is deterministic for a given now", () => {
		const again = buildTutorialFixtures(now);
		expect(again.orderDetail("packaging").timelines).toEqual(
			fixtures.orderDetail("packaging").timelines,
		);
	});
});
