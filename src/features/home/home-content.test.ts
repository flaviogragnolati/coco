import { describe, expect, it } from "vitest";

import type { FaqPickupPoint } from "~/shared/common/home.types";
import { DEFAULT_WEEKLY_CLOSING } from "~/shared/common/weekly-closing";
import {
	announcementMessage,
	contactItems,
	footerColumns,
	getFaqItems,
	getHowItWorksSteps,
	getWhatsappContactItem,
	heroCopy,
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

const pickupPoint: FaqPickupPoint = {
	name: "CoCo Centro",
	line1: "San Martín 100",
	line2: "Local 2",
	city: "Ushuaia",
	hours: "Lunes a viernes de 10 a 19",
};

const saturdayEvening = {
	...DEFAULT_WEEKLY_CLOSING,
	closingWeekday: 6,
	closingHour: 18,
	closingMinute: 30,
};

describe("hero", () => {
	it("colours the end of the title without changing its text", () => {
		expect(heroCopy.titleAccent).toBe("sale menos.");
		expect(heroCopy.title.endsWith(heroCopy.titleAccent)).toBe(true);
	});

	it("explains the single big purchase without saying wholesale", () => {
		expect(heroCopy.lead).toBe(
			"Juntamos pedidos de toda Ushuaia y hacemos una sola compra grande. Elegís lo que necesitás; de comprarlo y traerlo nos encargamos nosotros.",
		);
	});
});

describe("announcement", () => {
	it("no longer repeats the sign-up note the hero carries", () => {
		expect(announcementMessage).toBe("Compras comunitarias en Ushuaia");
		expect(announcementMessage).not.toMatch(/registr/i);
	});
});

describe("FAQ copy", () => {
	const faq = getFaqItems(DEFAULT_WEEKLY_CLOSING, []);

	it("asks the six questions in the agreed order", () => {
		expect(faq.map((item) => item.question)).toEqual([
			"¿Cuándo cierran los pedidos?",
			"¿Cuánto tarda en llegar mi compra?",
			"¿Cuándo pago mi pedido?",
			"¿Dónde sigo mi pedido?",
			"¿Cómo recibo mi pedido?",
			"¿Cómo conseguimos estos precios?",
		]);
	});

	it("answers the price question with the ticket's text", () => {
		expect(faq[5]?.answer).toBe(
			"Juntamos los pedidos de mucha gente y hacemos una sola compra grande, directo al proveedor. Así pagamos precio mayorista por productos de primera calidad. Si comparás, hacelo con productos de la misma calidad: un aceite de oliva extra virgen no es lo mismo que uno común, aunque los dos sean un litro.",
		);
	});

	it("never says carrito", () => {
		for (const { question, answer } of getFaqItems(DEFAULT_WEEKLY_CLOSING, [
			pickupPoint,
		])) {
			expect(`${question} ${answer}`).not.toMatch(/carrito/i);
		}
	});

	it("derives the closing and the lead time from the schedule", () => {
		expect(faq[0]?.answer).toMatch(
			/^Todos los miércoles a las 12, hora de Argentina\..* en la del miércoles siguiente\./,
		);
		expect(faq[1]?.answer).toMatch(/^Entre 7 y 10 días desde el cierre\./);

		const moved = getFaqItems(
			{ ...saturdayEvening, deliveryDaysMin: 7, deliveryDaysMax: 7 },
			[],
		);
		expect(moved[0]?.answer).toMatch(/^Todos los sábados a las 18:30,/);
		expect(moved[1]?.answer).toMatch(/^7 días desde el cierre\./);
	});

	it("names the pickup points that are active", () => {
		const base =
			"Lo elegís al confirmar el pedido: te lo llevamos a la dirección que cargues o lo retirás en el punto de retiro, en su horario. Las dos opciones cuestan lo mismo.";
		const answer = (points: FaqPickupPoint[]) =>
			getFaqItems(DEFAULT_WEEKLY_CLOSING, points)[4]?.answer;

		expect(answer([])).toBe(base);
		expect(answer([pickupPoint])).toBe(
			`${base} El punto de retiro está en San Martín 100, Local 2, Ushuaia (Lunes a viernes de 10 a 19).`,
		);
		expect(
			answer([
				pickupPoint,
				{ ...pickupPoint, name: "CoCo Sur", line1: "Maipú 50", line2: null },
			]),
		).toBe(
			`${base} Los puntos de retiro son: CoCo Centro, San Martín 100, Ushuaia (Lunes a viernes de 10 a 19); CoCo Sur, Maipú 50, Ushuaia (Lunes a viernes de 10 a 19).`,
		);
	});

	it("drops the questions the new copy replaced", () => {
		const questions = faq.map((item) => item.question);
		expect(questions).not.toContain("¿Necesito una cuenta para ver productos?");
		expect(questions).not.toContain("¿Qué pasa después del pago?");
	});
});

describe("Cómo funciona", () => {
	const steps = getHowItWorksSteps(DEFAULT_WEEKLY_CLOSING);

	it("has four steps tied to the configured closing", () => {
		expect(steps).toHaveLength(4);
		expect(steps[0]?.body).toContain("hasta el miércoles a las 12");
		expect(steps[1]?.title).toBe("Cerramos el miércoles.");
		expect(steps[2]?.body).toContain("tarda entre 7 y 10 días");
	});

	it("never says distribuidora", () => {
		for (const step of steps) {
			expect(`${step.title} ${step.body}`).not.toMatch(/distribuidora/i);
		}
	});

	it("ends with the delivery chosen when confirming the order", () => {
		expect(steps.at(-1)?.body).toMatch(/^Al confirmar el pedido elegís/);
	});

	it("follows another weekday, time and a collapsed range", () => {
		const moved = getHowItWorksSteps({
			...saturdayEvening,
			deliveryDaysMin: 7,
			deliveryDaysMax: 7,
		});
		expect(moved[0]?.body).toContain("hasta el sábado a las 18:30");
		expect(moved[1]?.title).toBe("Cerramos el sábado.");
		expect(moved[2]?.body).toContain("tarda 7 días en llegar");
	});

	it("says when each step happens", () => {
		expect(steps.map((step) => step.when)).toEqual([
			"Hasta el miércoles a las 12",
			"Miércoles",
			"7 a 10 días",
			"Cuando llega",
		]);

		const moved = getHowItWorksSteps({
			...saturdayEvening,
			deliveryDaysMin: 5,
			deliveryDaysMax: 5,
		});
		expect(moved.map((step) => step.when)).toEqual([
			"Hasta el sábado a las 18:30",
			"Sábado",
			"5 días",
			"Cuando llega",
		]);
	});
});

describe("footer", () => {
	const links = footerColumns.flatMap((column) => column.links);

	it("links the step-by-step page from Información", () => {
		const information = footerColumns.find(
			(column) => column.title === "Información",
		);
		expect(information?.links).toContainEqual({
			label: "Paso a paso de un pedido",
			href: "/como-funciona",
		});
	});

	// e2e/home-section-links.spec.ts finds the section link by a substring of
	// its name; a second footer link containing it breaks strict mode.
	it("keeps Cómo funciona as the only link that names it", () => {
		const naming = links.filter((link) => /cómo funciona/i.test(link.label));
		expect(naming).toEqual([
			{ label: "Cómo funciona", href: "/#como-funciona" },
		]);
	});
});
