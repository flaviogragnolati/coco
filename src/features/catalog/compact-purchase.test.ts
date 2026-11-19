import { expect, test } from "vitest";
import {
	getCartQuantityAnnouncement,
	getCompactPurchaseLabels,
} from "./compact-purchase";

const loose = { presentationContainer: null, presentationSize: null };
const jug = {
	presentationContainer: "bidon",
	presentationSize: "5 L",
} as const;

test("the compact card's controls name the product and the step they move", () => {
	expect(
		getCompactPurchaseLabels(
			"Almendra",
			{ moq: "0.5", step: "0.5" },
			"kg",
			loose,
		),
	).toEqual({
		add: "Sumar Almendra a tu pedido",
		increment: "Sumar 0,5 kg más de Almendra",
		decrement: "Restar 0,5 kg de Almendra",
		remove: "Quitar Almendra de tu pedido",
		removed: "Quitaste Almendra de tu pedido",
	});
	// The container goes without its size, which the product name carries.
	expect(
		getCompactPurchaseLabels(
			"Aceite 5 L",
			{ moq: "1", step: "1" },
			"piece",
			jug,
		),
	).toMatchObject({
		increment: "Sumar 1 bidón más de Aceite 5 L",
		decrement: "Restar 1 bidón de Aceite 5 L",
	});
	// Without a step the MOQ is the only quantity it moves by.
	expect(
		getCompactPurchaseLabels(
			"Aceite 5 L",
			{ moq: "2", step: null },
			"piece",
			jug,
		),
	).toMatchObject({ increment: "Sumar 2 bidones más de Aceite 5 L" });
});

test("the announcement reads the quantity in the order with its unit", () => {
	expect(getCartQuantityAnnouncement("1.5", "kg", loose)).toBe(
		"Tenés 1,5 kg en tu pedido",
	);
	expect(getCartQuantityAnnouncement("2", "piece", jug)).toBe(
		"Tenés 2 bidones 5 L en tu pedido",
	);
});
