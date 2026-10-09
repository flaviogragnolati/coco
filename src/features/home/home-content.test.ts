import { describe, expect, it } from "vitest";

import {
	contactItems,
	faqItems,
	getWhatsappContactItem,
	howItWorksSteps,
	WHATSAPP_NUMBER,
} from "./home-content";

describe("WhatsApp contact", () => {
	it("keeps the number as digits only", () => {
		expect(WHATSAPP_NUMBER === null || /^\d+$/.test(WHATSAPP_NUMBER)).toBe(
			true,
		);
	});

	it("derives the link and the visible text from the same digits", () => {
		expect(getWhatsappContactItem("5492901123456")).toMatchObject({
			label: "WhatsApp",
			value: "+5492901123456",
			href: "https://wa.me/5492901123456",
			external: true,
		});
	});

	it("is hidden while there is no number", () => {
		expect(getWhatsappContactItem(null)).toBeNull();
		expect(contactItems.some((item) => item.label === "WhatsApp")).toBe(
			WHATSAPP_NUMBER !== null,
		);
	});
});

describe("FAQ copy", () => {
	it("never says carrito", () => {
		for (const { question, answer } of faqItems) {
			expect(`${question} ${answer}`).not.toMatch(/carrito/i);
		}
	});

	it("explains the delivery choice right after the delivery time", () => {
		const timing = faqItems.findIndex(
			(item) => item.question === "¿Cuánto tarda en llegar mi compra?",
		);

		expect(faqItems[timing + 1]).toEqual({
			question: "¿Cómo retiro mi pedido o lo recibo en casa?",
			answer:
				"Lo elegís al confirmar tu pedido: te lo llevamos a la dirección que cargues o lo retirás en uno de nuestros puntos de retiro, en el horario que indicamos. Las dos opciones cuestan lo mismo.",
		});
	});
});

describe("Cómo funciona", () => {
	it("ends with the delivery the customer chose", () => {
		expect(howItWorksSteps).toHaveLength(5);
		expect(howItWorksSteps.at(-1)).toBe(
			"Al llegar, lo retirás en el punto de retiro que elegiste o te lo llevamos a tu dirección.",
		);
	});
});
