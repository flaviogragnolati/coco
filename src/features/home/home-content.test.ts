import { describe, expect, it } from "vitest";

import {
	contactItems,
	faqItems,
	getWhatsappContactItem,
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
});
