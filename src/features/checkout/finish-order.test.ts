import { describe, expect, it } from "vitest";

import type {
	CheckoutAddress,
	CheckoutLiveOrder,
	CheckoutPaymentMethod,
} from "~/shared/common/checkout.types";
import type { PickupPointData } from "~/shared/common/pickup-point-snapshot";
import {
	EMPTY_FINISH_DRAFT,
	type FinishOptions,
	finishBlockers,
	resolveFinishSelection,
	toConfirmInput,
} from "./finish-order";

function address(id: number): CheckoutAddress {
	return {
		id,
		type: "shipping",
		line1: `Calle ${id}`,
		line2: null,
		city: "Ushuaia",
		state: "Tierra del Fuego",
		postalCode: "9410",
		country: "Argentina",
		active: true,
	};
}

function point(id: number): PickupPointData {
	return {
		id,
		name: `Punto ${id}`,
		line1: "San Martín 100",
		line2: null,
		city: "Ushuaia",
		state: "Tierra del Fuego",
		postalCode: null,
		country: "Argentina",
		googleMapsUrl: null,
		hours: "Lun a vie 10 a 18 h",
		instructions: null,
	};
}

const mercadoPago: CheckoutPaymentMethod = {
	id: 1,
	type: "mercadopago",
	label: "Mercado Pago",
	details: "Mercado Pago",
	provider: "mercadopago",
	externalPaymentMethodId: null,
	active: true,
};

const transfer: CheckoutPaymentMethod = {
	id: 2,
	type: "bank_transfer",
	label: "Pago externo",
	details: "Transferencia bancaria",
	provider: "external",
	externalPaymentMethodId: "external_bank_transfer",
	active: true,
};

function options(overrides: Partial<FinishOptions> = {}): FinishOptions {
	return {
		addresses: [address(4), address(5)],
		pickupPoints: [point(3), point(7)],
		paymentMethods: [mercadoPago, transfer],
		liveOrder: null,
		...overrides,
	};
}

function liveOrder(overrides: Partial<CheckoutLiveOrder> = {}) {
	return {
		id: 70,
		code: "ORD-70",
		delivery: { mode: "pickupPoint" as const, pickupPointId: 7 },
		paymentMethodId: transfer.id,
		provider: "external",
		release: "release" as const,
		...overrides,
	};
}

describe("resolveFinishSelection", () => {
	it("starts with home delivery, the first address and the first method", () => {
		expect(resolveFinishSelection(options(), EMPTY_FINISH_DRAFT)).toEqual({
			deliveryMode: "homeDelivery",
			address: address(4),
			pickupPoint: point(3),
			paymentMethod: mercadoPago,
		});
	});

	it("keeps what the customer picked", () => {
		const selection = resolveFinishSelection(options(), {
			deliveryMode: "pickupPoint",
			addressId: 5,
			pickupPointId: 7,
			provider: "external",
		});

		expect(selection).toEqual({
			deliveryMode: "pickupPoint",
			address: address(5),
			pickupPoint: point(7),
			paymentMethod: transfer,
		});
	});

	it("falls back to the first address when the picked one is gone", () => {
		const selection = resolveFinishSelection(options(), {
			...EMPTY_FINISH_DRAFT,
			addressId: 99,
		});

		expect(selection.address).toEqual(address(4));
	});

	it("has no address for a first purchase", () => {
		const selection = resolveFinishSelection(
			options({ addresses: [] }),
			EMPTY_FINISH_DRAFT,
		);

		expect(selection.address).toBeNull();
		expect(finishBlockers(selection, { acceptedTerms: true })).toEqual([
			"address",
		]);
	});

	it("does not offer pickup without an active point", () => {
		const selection = resolveFinishSelection(options({ pickupPoints: [] }), {
			...EMPTY_FINISH_DRAFT,
			deliveryMode: "pickupPoint",
		});

		expect(selection.deliveryMode).toBe("homeDelivery");
		expect(selection.pickupPoint).toBeNull();
	});

	it("starts from the choices of the order the cart is waiting on", () => {
		const selection = resolveFinishSelection(
			options({ liveOrder: liveOrder() }),
			EMPTY_FINISH_DRAFT,
		);

		expect(selection).toMatchObject({
			deliveryMode: "pickupPoint",
			pickupPoint: point(7),
			paymentMethod: transfer,
		});
	});

	it("lets the customer switch the payment of a waiting order", () => {
		const selection = resolveFinishSelection(
			options({ liveOrder: liveOrder() }),
			{ ...EMPTY_FINISH_DRAFT, provider: "mercadopago" },
		);

		expect(selection.paymentMethod).toEqual(mercadoPago);
		expect(selection.pickupPoint).toEqual(point(7));
	});

	it("starts from the address a waiting order was confirmed with", () => {
		const selection = resolveFinishSelection(
			options({
				liveOrder: liveOrder({
					delivery: { mode: "homeDelivery", shippingAddressId: 5 },
				}),
			}),
			EMPTY_FINISH_DRAFT,
		);

		expect(selection.address).toEqual(address(5));
	});

	it("ignores a provider that is no longer offered", () => {
		const selection = resolveFinishSelection(
			options({ paymentMethods: [transfer] }),
			{ ...EMPTY_FINISH_DRAFT, provider: "mercadopago" },
		);

		expect(selection.paymentMethod).toEqual(transfer);
	});
});

describe("finishBlockers", () => {
	it("lists everything missing in the order the panel reads", () => {
		const selection = resolveFinishSelection(
			options({ addresses: [], paymentMethods: [] }),
			EMPTY_FINISH_DRAFT,
		);

		expect(finishBlockers(selection, { acceptedTerms: false })).toEqual([
			"address",
			"payment",
			"terms",
		]);
	});

	it("asks only for the terms once the rest is chosen", () => {
		const selection = resolveFinishSelection(options(), EMPTY_FINISH_DRAFT);

		expect(finishBlockers(selection, { acceptedTerms: false })).toEqual([
			"terms",
		]);
		expect(finishBlockers(selection, { acceptedTerms: true })).toEqual([]);
	});
});

describe("toConfirmInput", () => {
	const ready = { acceptedTerms: true, expectedAmount: "450.00" };
	const key = "00000000-0000-4000-8000-000000000001";

	it("sends the address for home delivery", () => {
		const selection = resolveFinishSelection(options(), {
			...EMPTY_FINISH_DRAFT,
			provider: "external",
		});

		expect(
			toConfirmInput(selection, { ...ready, idempotencyKey: key }),
		).toEqual({
			delivery: { mode: "homeDelivery", shippingAddressId: 4 },
			paymentMethodId: transfer.id,
			acceptedTerms: true,
			idempotencyKey: key,
			expectedAmount: "450.00",
		});
	});

	it("sends the point for pickup", () => {
		const selection = resolveFinishSelection(options(), {
			...EMPTY_FINISH_DRAFT,
			deliveryMode: "pickupPoint",
			pickupPointId: 7,
		});

		expect(
			toConfirmInput(selection, { ...ready, idempotencyKey: key })?.delivery,
		).toEqual({ mode: "pickupPoint", pickupPointId: 7 });
	});

	it("sends nothing while something is missing", () => {
		const selection = resolveFinishSelection(options(), EMPTY_FINISH_DRAFT);

		expect(
			toConfirmInput(selection, {
				...ready,
				acceptedTerms: false,
				idempotencyKey: key,
			}),
		).toBeNull();
	});
});
