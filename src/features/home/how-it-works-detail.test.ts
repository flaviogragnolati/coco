import { describe, expect, it } from "vitest";

import { DEFAULT_WEEKLY_CLOSING } from "~/shared/common/weekly-closing";
import { getHowItWorksSteps } from "./home-content";
import {
	getHowItWorksDetail,
	getOrderCalendarLegend,
	howItWorksIdea,
	howItWorksPage,
	orderCalendarLabel,
} from "./how-it-works-detail";

const movedSchedule = {
	closingWeekday: 6,
	closingHour: 18,
	closingMinute: 30,
	deliveryDaysMin: 5,
	deliveryDaysMax: 5,
};

function allText(schedule = DEFAULT_WEEKLY_CLOSING) {
	return [
		howItWorksPage.title,
		howItWorksPage.lead,
		...howItWorksIdea,
		...getHowItWorksDetail(schedule).flatMap((step) => [
			step.when,
			step.title,
			...step.paragraphs,
		]),
		orderCalendarLabel(schedule),
		...getOrderCalendarLegend(schedule).map((item) => item.label),
	].join("\n");
}

describe("Cómo funciona page copy", () => {
	it("tells the idea in three paragraphs", () => {
		expect(howItWorksIdea).toHaveLength(3);
	});

	it("reuses the home's when and title for each of the four steps", () => {
		const detail = getHowItWorksDetail(DEFAULT_WEEKLY_CLOSING);
		const steps = getHowItWorksSteps(DEFAULT_WEEKLY_CLOSING);
		expect(detail.map(({ when, title }) => ({ when, title }))).toEqual(
			steps.map(({ when, title }) => ({ when, title })),
		);
		for (const step of detail) {
			expect(step.paragraphs.length).toBeGreaterThan(0);
		}
	});

	it("takes the closing and the lead time from the schedule", () => {
		const [, closing, trip] = getHowItWorksDetail(DEFAULT_WEEKLY_CLOSING);
		expect(closing?.paragraphs[0]).toMatch(
			/^Todos los miércoles a las 12, hora de Argentina,/,
		);
		expect(closing?.paragraphs[1]).toMatch(/del miércoles siguiente\.$/);
		expect(trip?.paragraphs[0]).toMatch(/tarda entre 7 y 10 días desde/);
	});

	it("follows a moved closing and never falls back to the default", () => {
		const text = allText(movedSchedule);
		expect(text).not.toMatch(/miércoles|7 y 10|7 a 10|a las 12\b/);
		const [, closing, trip] = getHowItWorksDetail(movedSchedule);
		expect(closing?.paragraphs[0]).toMatch(/^Todos los sábados a las 18:30,/);
		expect(closing?.paragraphs[1]).toMatch(/del sábado siguiente\.$/);
		expect(trip?.paragraphs[0]).toMatch(/tarda 5 días desde el cierre/);
	});

	it("never says carrito or distribuidora", () => {
		expect(allText()).not.toMatch(/carrito|distribuidora/i);
	});
});

describe("order calendar copy", () => {
	it("describes the whole cycle for screen readers", () => {
		expect(orderCalendarLabel(DEFAULT_WEEKLY_CLOSING)).toBe(
			"Calendario de un pedido: se arma hasta el miércoles a las 12, ese día cerramos y hacemos la compra, y llega entre 7 y 10 días después del cierre.",
		);
	});

	it("names the closing, the shortest trip and the arrival window", () => {
		expect(getOrderCalendarLegend(DEFAULT_WEEKLY_CLOSING)).toEqual([
			{ kind: "closing", label: "Cierre: miércoles a las 12" },
			{ kind: "trip", label: "Viaje: 7 días como mínimo" },
			{ kind: "window", label: "Puede llegar entre el día 7 y el 10" },
		]);
	});

	it("drops the window when the lead time is a single number", () => {
		expect(getOrderCalendarLegend(movedSchedule)).toEqual([
			{ kind: "closing", label: "Cierre: sábado a las 18:30" },
			{ kind: "trip", label: "Viaje: 5 días" },
		]);
	});
});
